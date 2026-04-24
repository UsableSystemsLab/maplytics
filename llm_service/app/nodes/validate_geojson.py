from app.services.dataset_client import fetch_project_dataset, DatasetFetchError
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

    return {
        "geojson": geojson,
        "fields": data.get("fields", []),
        "geojson_valid": True,
    }
