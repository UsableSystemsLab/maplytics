import asyncio
from collections import Counter

from app.services.dataset_client import fetch_project_dataset, DatasetFetchError
from app.services.geo_client import count_points_by_boundary, extract_points
from app.nodes.state import GraphState


VALID_GEOMETRY_TYPES = {
    "Point", "MultiPoint", "LineString", "MultiLineString",
    "Polygon", "MultiPolygon", "GeometryCollection",
}


def _validate_structure(geojson: dict) -> tuple[bool, str]:
    if not isinstance(geojson, dict):
        return False, "GeoJSON root is not an object"
    if geojson.get("type") != "FeatureCollection":
        return False, f"Expected type 'FeatureCollection', got {geojson.get('type')!r}"
    features = geojson.get("features")
    if not isinstance(features, list):
        return False, "'features' is missing or not a list"
    if len(features) == 0:
        return False, "FeatureCollection has no features"

    for i, feat in enumerate(features[:50]):
        if not isinstance(feat, dict) or feat.get("type") != "Feature":
            return False, f"features[{i}] is not a Feature"
        geom = feat.get("geometry")
        if geom is None:
            continue
        if not isinstance(geom, dict) or geom.get("type") not in VALID_GEOMETRY_TYPES:
            return False, f"features[{i}].geometry has invalid type {geom.get('type')!r}"
        if "coordinates" not in geom and geom.get("type") != "GeometryCollection":
            return False, f"features[{i}].geometry missing 'coordinates'"
    return True, ""


async def validate_geojson_node(state: GraphState) -> GraphState:
    try:
        data = await fetch_project_dataset(
            state["project_id"], state["dataset_id"], state["auth_token"]
        )
    except DatasetFetchError as e:
        return {
            "geojson_valid": False,
            "rejection_stage": "validate_geojson",
            "rejection_reason": f"Failed to load dataset ({e.status}): {e.message}",
        }

    geojson = data["geojson"]
    ok, reason = _validate_structure(geojson)
    if not ok:
        return {
            "geojson_valid": False,
            "rejection_stage": "validate_geojson",
            "rejection_reason": f"Invalid GeoJSON: {reason}",
        }
    geographic_counts = await _enrich_with_geo(geojson, data.get("fields", []))

    return {
        "geojson": geojson,
        "fields": data.get("fields", []),
        "geojson_valid": True,
        "geographic_counts": geographic_counts,
    }


GEO_FIELDS = ("region", "city", "district")


async def _enrich_with_geo(geojson: dict, fields: list = None) -> dict:
    """Spatially join every Point feature to Saudi region/city/district
    boundaries (via api_server's PostGIS-backed /geo/choropleth endpoint) and:

    1. Stamp every matched feature with `region`, `city`, `district` properties
       so downstream nodes see a fully-joined view of the dataset — the LLM can
       then combine any feature property (price_range, cuisine, …) with any
       geographic level, without guessing boundaries from raw coordinates.
    2. Return aggregate counts per boundary AND cross-tabs between each
       categorical property and each geographic level, so counts-heavy
       questions (e.g. "which district has the most $$$?") can be answered
       from precomputed numbers instead of by counting the feature sample.
    """
    points, feat_indices = extract_points(geojson)
    if not points:
        return {}

    regions, cities, districts = await asyncio.gather(
        count_points_by_boundary(points, "regions"),
        count_points_by_boundary(points, "cities"),
        count_points_by_boundary(points, "districts"),
    )

    _stamp_features(geojson, feat_indices, "region", regions, "name_en")
    _stamp_features(geojson, feat_indices, "city", cities, "name_en")
    _stamp_features(geojson, feat_indices, "district", districts, "name_en")

    features = geojson.get("features") or []

    if fields:
        cat_fields = [
            f["name"] for f in fields
            if f.get("type") not in ("number", "boolean") and f.get("name")
        ]
    else:
        seen = {}
        for feat in features[:50]:
            for key, val in (feat.get("properties") or {}).items():
                if isinstance(val, bool):
                    seen[key] = "boolean"
                elif isinstance(val, (int, float)):
                    seen[key] = "number"
                elif isinstance(val, str):
                    seen[key] = "string"
        cat_fields = [k for k, v in seen.items() if v == "string" and k not in ("region", "city", "district")]

    def _extract_property_counts(boundary_rows: list[dict]):
        for row in boundary_rows:
            counts = {f: Counter() for f in cat_fields}
            for p_idx in row.get("point_indices") or []:
                if not isinstance(p_idx, int) or p_idx < 0 or p_idx >= len(feat_indices):
                    continue
                feat_pos = feat_indices[p_idx]
                if feat_pos >= len(features):
                    continue
                
                props = features[feat_pos].get("properties") or {}
                for f in cat_fields:
                    val = props.get(f)
                    if val is not None and val != "":
                        counts[f][str(val)] += 1
            
            prop_counts = {}
            for f, counter in counts.items():
                if counter:
                    prop_counts[f] = dict(counter.most_common(10))
            
            row["property_counts"] = prop_counts

    if regions:
        _extract_property_counts(regions)
    if cities:
        _extract_property_counts(cities)
    if districts:
        _extract_property_counts(districts)

    out: dict[str, list] = {}
    if regions:
        out["regions"] = [
            {
                "name": r.get("name_en"), 
                "region_id": r.get("region_id"), 
                "count": r.get("count", 0),
                "property_counts": r.get("property_counts", {})
            }
            for r in regions
        ]
    if cities:
        out["cities"] = [
            {
                "name": c.get("name_en"),
                "city_id": c.get("city_id"),
                "region": c.get("region_name"),
                "count": c.get("count", 0),
                "property_counts": c.get("property_counts", {})
            }
            for c in cities
        ]
    if districts:
        out["districts"] = [
            {
                "name": d.get("name_en"),
                "district_id": d.get("district_id"),
                "city": d.get("city_name"),
                "region": d.get("region_name"),
                "count": d.get("count", 0),
                "property_counts": d.get("property_counts", {})
            }
            for d in districts
        ]
    return out


def _stamp_features(
    geojson: dict,
    feat_indices: list[int],
    prop_name: str,
    boundary_rows: list[dict],
    name_field: str,
) -> None:
    """Write `prop_name` onto each Point feature, using the spatial-join result.

    `boundary_rows` comes back from /geo/choropleth; each row carries
    `point_indices` — 0-based indices into the `points` array we sent. We map
    those back to positions in `geojson.features` via `feat_indices`.
    """
    features = geojson.get("features") or []
    for row in boundary_rows:
        label = row.get(name_field)
        if not label:
            continue
        for p_idx in row.get("point_indices") or []:
            if not isinstance(p_idx, int) or p_idx < 0 or p_idx >= len(feat_indices):
                continue
            feat_pos = feat_indices[p_idx]
            if feat_pos >= len(features):
                continue
            feat = features[feat_pos]
            props = feat.get("properties")
            if not isinstance(props, dict):
                props = {}
                feat["properties"] = props
            # Only set if absent — never clobber a real dataset field with the
            # same name.
            props.setdefault(prop_name, label)
