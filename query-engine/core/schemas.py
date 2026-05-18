"""
core/schemas.py
Pydantic models for every stage boundary in the pipeline.
"""
from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────
#  Enums
# ─────────────────────────────────────────────

class TaskType(str, Enum):
    comparison  = "comparison"
    aggregation = "aggregation"


class GeometryType(str, Enum):
    point      = "point"
    polygon    = "polygon"
    linestring = "linestring"
    unknown    = "unknown"


# ─────────────────────────────────────────────
#  API request / response
# ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000, description="Natural language query")

    @field_validator("query")
    @classmethod
    def strip_query(cls, v: str) -> str:
        return v.strip()


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    stage: str | None = None   # which pipeline stage raised this


# ─────────────────────────────────────────────
#  Fast-lane outputs (non-LLM nodes)
# ─────────────────────────────────────────────

class LanguageResult(BaseModel):
    lang: str                       # ISO 639-1 code, e.g. "en", "ar"
    confidence: float
    supported: bool


class TopicFilterResult(BaseModel):
    passed: bool
    score: float
    reason: str | None = None


class IntentResult(BaseModel):
    type_hint: TaskType | None      # None when below confidence threshold
    confidence: float
    ambiguous: bool                 # True when confidence < threshold


class DomainResult(BaseModel):
    domain: str
    allowed: bool
    reason: str | None = None


class FastLaneContext(BaseModel):
    """Assembled context passed from the fast lane into the LLM lane."""
    query:        str
    lang:         str
    domain:       str
    type_hint:    TaskType | None
    ambiguous:    bool
    confidence:   float


# ─────────────────────────────────────────────
#  LLM lane outputs
# ─────────────────────────────────────────────

class LLMExtractionResult(BaseModel):
    type:                TaskType
    query:               str
    project_id:          str
    dataset_ids:         list[str]
    clarification_needed: bool = False
    clarification_hint:  str | None = None
    reasoning:           str | None = None   # debug field, stripped from final output


# ─────────────────────────────────────────────
#  Geospatial massager output
# ─────────────────────────────────────────────

class GeoHint(BaseModel):
    crs:           str          = "EPSG:4326"
    geometry_type: GeometryType = GeometryType.point
    bbox:          list[float] | None = None   # [minX, minY, maxX, maxY]
    centroid:      list[float] | None = None   # [lon, lat]
    coord_columns: dict[str, str]  = Field(
        default_factory=lambda: {"longitude": "longitude", "latitude": "latitude"}
    )


# ─────────────────────────────────────────────
#  Final structured response
# ─────────────────────────────────────────────

class StructuredResponse(BaseModel):
    type:       TaskType
    query:      str
    projectId:  str
    datasets:   list[str]
    geo:        GeoHint | None = None

    model_config = {"populate_by_name": True}
