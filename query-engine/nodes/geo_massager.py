"""
nodes/geo_massager_node.py
Geospatial Massager — pure Python, no LLM.
Enriches the pipeline output with geo metadata needed for map plotting:
  - CRS normalisation
  - Geometry type detection
  - Bounding box and centroid (from dataset registry metadata)
  - Coordinate column name normalisation
"""
from __future__ import annotations

import logging
from typing import Any

from core.config import DatasetEntry, get_settings
from core.schemas import GeoHint, GeometryType, LLMExtractionResult, StructuredResponse, TaskType

logger = logging.getLogger(__name__)

# Common coordinate column name aliases → normalised names
_LON_ALIASES = {"lon", "lng", "longitude", "long", "x", "easting",  "الخط_الطولي"}
_LAT_ALIASES = {"lat", "latitude",          "y",   "northing", "الخط_العرضي"}

# Approximate bounding boxes for known regions [minLon, minLat, maxLon, maxLat]
# Used as fallback when no actual dataset extent is available
_REGION_BBOX: dict[str, list[float]] = {
    "jeddah":   [38.9, 21.2, 39.4, 21.8],
    "riyadh":   [46.5, 24.5, 47.1, 25.0],
    "makkah":   [39.7, 21.2, 40.0, 21.6],
    "medina":   [39.5, 24.3, 39.7, 24.6],
    "ksa":      [34.5, 16.3, 55.7, 32.1],
    "default":  [34.5, 16.3, 55.7, 32.1],
}


def _detect_geometry_type(dataset: DatasetEntry) -> GeometryType:
    try:
        return GeometryType(dataset.geometry_type.lower())
    except ValueError:
        return GeometryType.unknown


def _normalise_coord_columns(dataset: DatasetEntry) -> dict[str, str]:
    """
    Return a mapping of {normalised_name: actual_column_name}.
    In production this would inspect the actual dataset schema;
    here we return the canonical names as defaults.
    """
    return {
        "longitude": "longitude",
        "latitude":  "latitude",
    }


def _infer_bbox(query: str, dataset: DatasetEntry) -> list[float]:
    """Infer a bounding box from the query text using known region hints."""
    q = query.lower()
    for region, bbox in _REGION_BBOX.items():
        if region in q:
            return bbox
    return _REGION_BBOX["default"]


def _compute_centroid(bbox: list[float]) -> list[float]:
    """Compute centroid [lon, lat] from bounding box."""
    lon = (bbox[0] + bbox[2]) / 2
    lat = (bbox[1] + bbox[3]) / 2
    return [round(lon, 6), round(lat, 6)]


def _get_dataset_entry(dataset_id: str) -> DatasetEntry | None:
    cfg = get_settings()
    return next((d for d in cfg.datasets if d.id == dataset_id), None)


def enrich_geo(extraction: LLMExtractionResult) -> StructuredResponse:
    """
    Takes LLMExtractionResult and returns the final StructuredResponse
    with a populated GeoHint block.
    """
    geo_hint: GeoHint | None = None

    if extraction.dataset_ids:
        primary_dataset_id = extraction.dataset_ids[0]
        dataset = _get_dataset_entry(primary_dataset_id)

        if dataset:
            bbox     = _infer_bbox(extraction.query, dataset)
            centroid = _compute_centroid(bbox)
            geo_hint = GeoHint(
                crs=dataset.crs or "EPSG:4326",
                geometry_type=_detect_geometry_type(dataset),
                bbox=bbox,
                centroid=centroid,
                coord_columns=_normalise_coord_columns(dataset),
            )
            logger.debug(
                "Geo hint built: crs=%s, geom=%s, centroid=%s",
                geo_hint.crs, geo_hint.geometry_type, geo_hint.centroid,
            )
        else:
            logger.warning("Dataset %s not found in registry; skipping geo enrichment.", primary_dataset_id)

    return StructuredResponse(
        type=extraction.type,
        query=extraction.query,
        projectId=extraction.project_id,
        datasets=extraction.dataset_ids,
        geo=geo_hint,
    )
