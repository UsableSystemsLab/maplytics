"""Attribute resolution: parse 'by X' token to a column, or pick numeric columns."""
import pandas as pd
import geopandas as gpd

ID_LIKE = {"id", "feature_id", "uuid", "_id", "fid"}


def expand_properties(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Promote each key in the `properties` JSON column to its own column."""
    if "properties" not in gdf.columns:
        return gdf
    props = pd.json_normalize(gdf["properties"].fillna({}).to_list())
    out = gdf.drop(columns=["properties"]).reset_index(drop=True)
    out = pd.concat([out, props.reset_index(drop=True)], axis=1)
    return gpd.GeoDataFrame(out, geometry=gdf.geometry.values, crs=gdf.crs)


def _columns_union(gdfs):
    cols = set()
    for g in gdfs:
        if "properties" in g.columns:
            for record in g["properties"].dropna():
                if isinstance(record, dict):
                    cols.update(record.keys())
        else:
            cols.update(g.columns)
    return cols


def resolve_attribute(token, gdfs):
    """Match a parsed 'by X' token to an actual column name (case-insensitive).

    Returns the canonical column name or None.
    """
    if not token:
        return None
    cols = _columns_union(gdfs)
    lower_map = {c.lower(): c for c in cols}
    return lower_map.get(token.lower())


def pick_numeric_attributes(gdfs, cap: int = 6):
    """Return numeric, non-ID-like, non-near-constant columns (capped)."""
    expanded = [g if "properties" not in g.columns else expand_properties(g) for g in gdfs]
    selected = []
    seen = set()
    for g in expanded:
        for col in g.columns:
            if col in seen or col == "geometry" or col.lower() in ID_LIKE:
                continue
            series = g[col]
            if not pd.api.types.is_numeric_dtype(series):
                continue
            if series.nunique(dropna=True) <= 1:
                continue
            seen.add(col)
            selected.append(col)
            if len(selected) >= cap:
                return selected
    return selected
