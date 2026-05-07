"""Comparison NLQ pipeline.

Reads a validated comparison payload from Redis, uses PostGIS/GeoPandas to
prepare district-filtered features, and stores one GeoJSON FeatureCollection
for the frontend to render as interactive Leaflet maps.
"""
import logging
import math
from collections import Counter

import geopandas as gpd
import pandas as pd
from sqlalchemy import text

from utils.db import get_engine
from utils.storage import upload_geojson
from utils.attribute_resolver import expand_properties, resolve_attribute

logger = logging.getLogger(__name__)

COLOR_A = "#134565"
COLOR_B = "#13B38D"
FALLBACK_MESSAGE = (
    "No categorical comparison field was found. The result uses feature count "
    "and spatial distribution."
)

FIELD_PRIORITY = [
    "review_category",
    "category",
    "reviews_category",
    "rating",
    "sentiment",
    "type",
    "class",
    "status",
]

VALUE_COLORS = [
    "#22c55e",
    "#f97316",
    "#8b5cf6",
    "#06b6d4",
    "#eab308",
    "#ec4899",
    "#14b8a6",
    "#64748b",
    "#84cc16",
    "#f43f5e",
]

FEATURE_SQL = text("""
    SELECT f.feature_id,
           fp.properties,
           f.geometry
    FROM "Feature" f
    JOIN "Feature_Property" fp ON fp.feature_id = f.feature_id
    JOIN districts d ON ST_Contains(ST_MakeValid(d.boundaries), f.geometry)
    WHERE f.dataset_id = :dataset_id
      AND d.district_id = :district_id
""")

BOUNDARY_SQL = text("""
    SELECT d.district_id,
           d.name_en,
           d.name_ar,
           ST_MakeValid(d.boundaries) AS geometry
    FROM districts d
    WHERE d.district_id = :district_id
""")


def _load_district_features(dataset_id, district_id):
    gdf = gpd.read_postgis(
        FEATURE_SQL,
        get_engine(),
        params={"dataset_id": dataset_id, "district_id": district_id},
        geom_col="geometry",
    )
    return gdf.set_crs("EPSG:4326", allow_override=True)


def _load_district_boundary(district_id):
    gdf = gpd.read_postgis(
        BOUNDARY_SQL,
        get_engine(),
        params={"district_id": district_id},
        geom_col="geometry",
    )
    return gdf.set_crs("EPSG:4326", allow_override=True)


def _json_safe(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    return str(value)


def _label(field):
    if not field:
        return None
    return " ".join(part.capitalize() for part in str(field).replace("_", " ").split())


def _feature_properties(row):
    props = {}
    raw_props = row.get("properties")
    if isinstance(raw_props, dict):
        props.update(raw_props)

    for key, value in row.items():
        if key in {"geometry", "properties"}:
            continue
        props[key] = value

    return {str(k): _json_safe(v) for k, v in props.items()}


def _as_feature(geometry, properties):
    return {
        "type": "Feature",
        "geometry": geometry.__geo_interface__ if geometry is not None else None,
        "properties": properties,
    }


def _boundary_feature(boundary_gdf, side, district, color):
    if boundary_gdf.empty:
        return None
    geometry = boundary_gdf.iloc[0].geometry
    return _as_feature(
        geometry,
        {
            "comparisonRole": "district-boundary",
            "comparisonSide": side,
            "districtId": str(district["district_id"]),
            "districtName": district["name_en"],
            "strokeColor": color,
            "fillColor": color,
        },
    )


def _expanded_pair(gdf_a, gdf_b):
    return [
        expand_properties(gdf_a) if "properties" in gdf_a.columns else gdf_a,
        expand_properties(gdf_b) if "properties" in gdf_b.columns else gdf_b,
    ]


def _column_exists(gdfs, field):
    lower = str(field).lower()
    for gdf in gdfs:
        for column in gdf.columns:
            if str(column).lower() == lower:
                return column
    return None


def _pick_priority_field(expanded_gdfs):
    for field in FIELD_PRIORITY:
        matched = _column_exists(expanded_gdfs, field)
        if matched:
            return matched
    return None


def _value_counts(gdf, field):
    if not field or field not in gdf.columns:
        return Counter()
    values = [_json_safe(v) for v in gdf[field].tolist()]
    return Counter(str(v) if v is not None and v != "" else "Unknown" for v in values)


def _build_legend(counts_a, counts_b, comparison_field, count_a, count_b):
    if not comparison_field:
        return [
            {"value": "District A features", "color": COLOR_A, "countA": count_a, "countB": 0},
            {"value": "District B features", "color": COLOR_B, "countA": 0, "countB": count_b},
        ], {}

    values = sorted(
        set(counts_a.keys()) | set(counts_b.keys()),
        key=lambda v: (-(counts_a.get(v, 0) + counts_b.get(v, 0)), str(v)),
    )
    color_map = {value: VALUE_COLORS[i % len(VALUE_COLORS)] for i, value in enumerate(values)}
    legend = []
    for value in values:
        a_count = counts_a.get(value, 0)
        b_count = counts_b.get(value, 0)
        legend.append({
            "value": value,
            "color": color_map[value],
            "countA": a_count,
            "countB": b_count,
            "shareA": round((a_count / count_a) * 100, 1) if count_a else 0,
            "shareB": round((b_count / count_b) * 100, 1) if count_b else 0,
        })
    return legend, color_map


def _top_value(counts):
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def _biggest_difference(counts_a, counts_b):
    values = set(counts_a.keys()) | set(counts_b.keys())
    if not values:
        return None
    return max(values, key=lambda value: abs(counts_a.get(value, 0) - counts_b.get(value, 0)))


def _dataset_features(gdf, expanded_gdf, side, district, district_color, comparison_field, color_map):
    features = []
    for position, (_, row) in enumerate(gdf.iterrows()):
        props = _feature_properties(row)
        comparison_value = None
        marker_color = district_color

        if comparison_field and comparison_field in expanded_gdf.columns:
            raw_value = _json_safe(expanded_gdf.iloc[position][comparison_field])
            comparison_value = str(raw_value) if raw_value is not None and raw_value != "" else "Unknown"
            marker_color = color_map.get(comparison_value, district_color)

        props.update({
            "comparisonRole": "dataset-feature",
            "comparisonSide": side,
            "districtId": str(district["district_id"]),
            "districtName": district["name_en"],
            "comparisonField": comparison_field,
            "comparisonValue": comparison_value,
            "markerColor": marker_color,
        })
        features.append(_as_feature(row.geometry, props))
    return features


def process(job):
    job_id = job["jobId"]
    project_id = job["projectId"]
    dataset_id = job["datasetId"]
    dataset_name = job.get("datasetName", "dataset")
    district_a = job["districtA"]
    district_b = job["districtB"]
    attribute_token = job.get("attributeToken")
    query = job["query"]

    logger.info("Comparison job %s loading features and boundaries", job_id)
    gdf_a = _load_district_features(dataset_id, district_a["district_id"])
    gdf_b = _load_district_features(dataset_id, district_b["district_id"])
    boundary_a = _load_district_boundary(district_a["district_id"])
    boundary_b = _load_district_boundary(district_b["district_id"])

    expanded_a, expanded_b = _expanded_pair(gdf_a, gdf_b)
    explicit_field = resolve_attribute(attribute_token, [expanded_a, expanded_b])
    comparison_field = explicit_field or _pick_priority_field([expanded_a, expanded_b])
    messages = []
    if not comparison_field:
        messages.append(FALLBACK_MESSAGE)

    count_a = int(len(gdf_a))
    count_b = int(len(gdf_b))
    counts_a = _value_counts(expanded_a, comparison_field)
    counts_b = _value_counts(expanded_b, comparison_field)
    legend, color_map = _build_legend(counts_a, counts_b, comparison_field, count_a, count_b)
    biggest_value = _biggest_difference(counts_a, counts_b)

    features = [
        _boundary_feature(boundary_a, "A", district_a, COLOR_A),
        _boundary_feature(boundary_b, "B", district_b, COLOR_B),
    ]
    features.extend(_dataset_features(
        gdf_a, expanded_a, "A", district_a, COLOR_A, comparison_field, color_map,
    ))
    features.extend(_dataset_features(
        gdf_b, expanded_b, "B", district_b, COLOR_B, comparison_field, color_map,
    ))

    result = {
        "type": "FeatureCollection",
        "properties": {
            "resultType": "comparison_geojson",
            "jobId": job_id,
            "query": query,
            "dataset": {
                "id": dataset_id,
                "name": dataset_name,
            },
            "comparisonField": comparison_field,
            "comparisonFieldLabel": _label(comparison_field),
            "districtA": {
                "id": str(district_a["district_id"]),
                "name": district_a["name_en"],
                "color": COLOR_A,
                "count": count_a,
            },
            "districtB": {
                "id": str(district_b["district_id"]),
                "name": district_b["name_en"],
                "color": COLOR_B,
                "count": count_b,
            },
            "metrics": {
                "countDifference": count_a - count_b,
                "topValueA": _top_value(counts_a),
                "topValueB": _top_value(counts_b),
                "biggestDifferenceValue": biggest_value,
                "biggestDifference": (
                    {
                        "value": biggest_value,
                        "countA": counts_a.get(biggest_value, 0),
                        "countB": counts_b.get(biggest_value, 0),
                        "difference": counts_a.get(biggest_value, 0) - counts_b.get(biggest_value, 0),
                    }
                    if biggest_value is not None else None
                ),
            },
            "legend": legend,
            "messages": messages,
        },
        "features": [feature for feature in features if feature is not None],
    }

    key = f"projects/{project_id}/nlq_results/{job_id}_comparison.geojson"
    upload_geojson(result, key)
    logger.info("Comparison job %s uploaded GeoJSON to %s", job_id, key)
    return key
