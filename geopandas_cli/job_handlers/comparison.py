import os
import json
import pandas as pd
import geopandas as gpd

from job_handlers.utils import fetch_dataset_from_s3, parse_to_geodataframe, upload_json
from utils.api_client import ApiClient
from utils.location_parser import parse_comparison_query
from utils.feature_filter import filter_by_feature_query
from utils.comparison_slicer import (
    from_admin_response,
    try_property_fallback,
    slice_features,
)
from utils.errors import ComparisonError, LocationResolutionError, QueryParseError

S3_BUCKET = os.environ.get("S3_BUCKET_NAME", "datasets")

COLOR_A = "#dc2626"
COLOR_B = "#2563eb"

LOCATION_PROPERTY_KEYS = ["district", "city", "region", "district_name", "city_name", "region_name"]


def _load_and_merge(datasets):
    frames = []
    for ds in datasets:
        s3_key = ds.get("s3Key")
        file_format = (ds.get("fileFormat") or "").lower()
        if not s3_key:
            continue
        try:
            content = fetch_dataset_from_s3(s3_key)
            gdf = parse_to_geodataframe(content, file_format)
            if gdf is None or gdf.empty:
                continue
            gdf["_dataset_id"] = ds.get("datasetId") or ds.get("name") or s3_key
            frames.append(gdf)
        except Exception as e:
            print(f"Skipping dataset {s3_key}: {e}")
            continue
    if not frames:
        raise ComparisonError("no_features", "No features could be loaded from selected datasets.")
    merged = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs="EPSG:4326")
    return merged


def _side_payload(match, gdf, color, level):
    if gdf is None or len(gdf) == 0:
        empty = {"type": "FeatureCollection", "features": []}
        return {
            "name": match.name_en,
            "level": level,
            "count": 0,
            "color": color,
            "geojson": empty,
            "boundary": match.boundary,
        }
    return {
        "name": match.name_en,
        "level": level,
        "count": int(len(gdf)),
        "color": color,
        "geojson": json.loads(gdf.to_json()),
        "boundary": match.boundary,
    }


def _assert_filtered_side_outputs(filtered, feature_filter, side_frames):
    """Guard against returning unfiltered location slices as side GeoJSON."""
    if not feature_filter.get("applied"):
        return

    filtered_index = set(filtered.index.tolist()) if filtered is not None else set()
    for side_name, side_gdf in side_frames:
        side_index = set(side_gdf.index.tolist()) if side_gdf is not None else set()
        if not side_index.issubset(filtered_index):
            raise ComparisonError(
                "feature_filter_invariant_failed",
                f"{side_name} contains features that were not produced by the requested POI filter.",
            )


def _likely_covered_locations(gdf):
    covered = {}
    if gdf is None or gdf.empty:
        return covered
    for key in LOCATION_PROPERTY_KEYS:
        if key not in gdf.columns:
            continue
        values = gdf[key].dropna().astype(str).map(str.strip)
        values = sorted(v for v in values.unique().tolist() if v)
        if values:
            covered[key] = values[:25]
    return covered


def _validation_report(
    merged,
    filtered,
    side_a_all,
    side_b_all,
    side_a_filtered,
    side_b_filtered,
    parsed_query,
    feature_filter,
    resolved,
):
    requested_feature = bool(parsed_query.feature_query)
    total_features = int(len(merged)) if merged is not None else 0
    filtered_features = int(len(filtered)) if filtered is not None else 0
    side_a_total = int(len(side_a_all)) if side_a_all is not None else 0
    side_b_total = int(len(side_b_all)) if side_b_all is not None else 0
    side_a_count = int(len(side_a_filtered)) if side_a_filtered is not None else 0
    side_b_count = int(len(side_b_filtered)) if side_b_filtered is not None else 0
    searchable_fields = feature_filter.get("searchableFields", [])

    reason_code = "ok"
    comparable = True

    if side_a_total == 0 and side_b_total == 0:
        reason_code = "dataset_outside_requested_locations"
        comparable = False
    elif requested_feature and not searchable_fields:
        reason_code = "missing_feature_fields"
        comparable = False
    elif requested_feature and filtered_features == 0:
        reason_code = "feature_type_not_found"
        comparable = False
    elif side_a_count == 0 and side_b_count == 0:
        reason_code = "both_sides_empty"
        comparable = False
    elif side_a_count == 0 or side_b_count == 0:
        reason_code = "one_side_empty"
        comparable = "partial"

    return {
        "locationsRecognized": True,
        "resolvedLevel": resolved.level,
        "locationSource": resolved.via,
        "comparable": comparable,
        "reasonCode": reason_code,
        "totalSelectedFeatures": total_features,
        "filteredFeatureCount": filtered_features,
        "requestedFeature": parsed_query.feature_query,
        "featureValidation": {
            "requested": requested_feature,
            "terms": feature_filter.get("terms", []),
            "searchableFields": searchable_fields,
            "usedFields": feature_filter.get("usedFields", []),
            "usedNameFallback": feature_filter.get("usedNameFallback", False),
            "matchedFields": feature_filter.get("matchedFields", []),
            "matchedValues": feature_filter.get("matchedValues", []),
            "inputCount": feature_filter.get("inputCount", total_features),
            "filteredCount": feature_filter.get("filteredCount", filtered_features),
        },
        "coverage": {
            "beforeFeatureFilter": {
                "sideA": side_a_total,
                "sideB": side_b_total,
            },
            "afterFeatureFilter": {
                "sideA": side_a_count,
                "sideB": side_b_count,
            },
            "likelyCoveredLocations": _likely_covered_locations(merged),
        },
    }


def process(job):
    job_id = job["jobId"]
    project_id = job["projectId"]
    query = job.get("query", "")
    datasets = job.get("datasets", [])

    if not datasets:
        raise ComparisonError("no_features", "No datasets provided.")

    # 1. Load + merge
    merged = _load_and_merge(datasets)

    # 2. Parse query and filter by requested feature type before spatial slicing.
    parsed_query = parse_comparison_query(query)
    name_a = parsed_query.location_a
    name_b = parsed_query.location_b
    filtered, feature_filter = filter_by_feature_query(merged, parsed_query.feature_query)

    # 3. Resolve via official boundaries, then fall back to location columns in the dataset.
    api = ApiClient()
    resolved = None
    try:
        payload = api.resolve_locations([name_a, name_b])
        resolved = from_admin_response(payload)
    except LocationResolutionError:
        # 422: names not found in official boundary tables. Try the dataset itself.
        resolved = try_property_fallback(merged, [name_a, name_b])
    except Exception as e:
        # Connection error, 5xx, timeout, etc. — still try the dataset before giving up.
        print(f"Official boundary lookup failed ({e}); trying property fallback.")
        resolved = try_property_fallback(merged, [name_a, name_b])

    if resolved is None:
        raise ComparisonError(
            "location_unresolved",
            f"Could not match '{name_a}' or '{name_b}' against official boundaries or dataset properties.",
        )

    # 4. Slice both before and after feature filtering so empty results can be explained.
    side_a_all, side_b_all = slice_features(merged, resolved)
    side_a_gdf, side_b_gdf = slice_features(filtered, resolved)
    _assert_filtered_side_outputs(
        filtered,
        feature_filter,
        [("sideA", side_a_gdf), ("sideB", side_b_gdf)],
    )

    validation = _validation_report(
        merged,
        filtered,
        side_a_all,
        side_b_all,
        side_a_gdf,
        side_b_gdf,
        parsed_query,
        feature_filter,
        resolved,
    )
    warning = None if validation["reasonCode"] == "ok" else validation["reasonCode"]

    # 5. Build result
    result = {
        "sideA": _side_payload(resolved.matches[0], side_a_gdf, COLOR_A, resolved.level),
        "sideB": _side_payload(resolved.matches[1], side_b_gdf, COLOR_B, resolved.level),
        "metadata": {
            "query": query,
            "featureQuery": parsed_query.feature_query,
            "featureFilter": feature_filter,
            "warning": warning,
            "validation": validation,
            "datasetIds": [d.get("datasetId") for d in datasets if d.get("datasetId")],
            "resolvedVia": resolved.via,
            "locationSource": resolved.via,
            "level": resolved.level,
        },
    }

    # 6. Upload
    key = f"projects/{project_id}/nlq_results/{job_id}_comparison.json"
    return upload_json(S3_BUCKET, key, result)
