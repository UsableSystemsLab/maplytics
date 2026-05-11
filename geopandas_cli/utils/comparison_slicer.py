import re
from dataclasses import dataclass
from typing import List, Optional
from shapely.geometry import shape

NOISE_TOKENS = {"al", "district", "dist"}
PROPERTY_KEYS = ["district", "city", "region", "district_name", "city_name", "region_name"]


@dataclass
class Match:
    input: str
    name_en: str
    boundary: Optional[dict] = None
    property_key: Optional[str] = None


@dataclass
class ResolvedLocations:
    level: str           # "district" | "city" | "region" | "property"
    matches: List[Match]
    via: str             # "official_boundary_database" | "dataset_properties"


def _normalize(text):
    if text is None:
        return ""
    s = str(text).lower()
    s = re.sub(r"[^a-z0-9\s']", " ", s)
    parts = [p for p in s.split() if p and p not in NOISE_TOKENS]
    return " ".join(parts).strip()


def from_admin_response(payload):
    """Build a ResolvedLocations from the /locations/resolve JSON response."""
    matches = [
        Match(input=m["input"], name_en=m["name_en"], boundary=m.get("boundary"))
        for m in payload["matches"]
    ]
    return ResolvedLocations(
        level=payload["level"],
        matches=matches,
        via="official_boundary_database",
    )


def try_property_fallback(gdf, names):
    """Strict fallback: scan well-known property columns for both names."""
    if gdf is None or gdf.empty:
        return None
    norm_a = _normalize(names[0])
    norm_b = _normalize(names[1])
    if not norm_a or not norm_b:
        return None
    for key in PROPERTY_KEYS:
        if key not in gdf.columns:
            continue
        col_norm = gdf[key].astype(str).map(_normalize)
        if (col_norm == norm_a).any() and (col_norm == norm_b).any():
            matches = [
                Match(input=names[0], name_en=names[0], property_key=key),
                Match(input=names[1], name_en=names[1], property_key=key),
            ]
            return ResolvedLocations(level="property", matches=matches, via="dataset_properties")
    return None


def slice_features(gdf, resolved):
    """Return (side_a_gdf, side_b_gdf)."""
    if resolved.via in ("official_boundary_database", "admin_table"):
        return _slice_by_boundaries(gdf, resolved.matches)
    return _slice_by_property(gdf, resolved.matches)


def _slice_by_boundaries(gdf, matches):
    poly_a = shape(matches[0].boundary)
    poly_b = shape(matches[1].boundary)
    side_a = gdf[gdf.geometry.within(poly_a)].copy()
    side_b = gdf[gdf.geometry.within(poly_b)].copy()
    return side_a, side_b


def _slice_by_property(gdf, matches):
    key = matches[0].property_key
    norm_a = _normalize(matches[0].name_en)
    norm_b = _normalize(matches[1].name_en)
    col_norm = gdf[key].astype(str).map(_normalize)
    side_a = gdf[col_norm == norm_a].copy()
    side_b = gdf[col_norm == norm_b].copy()
    return side_a, side_b
