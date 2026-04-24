import httpx
import logging
from app.config import API_SERVER_URL

logger = logging.getLogger(__name__)


async def count_points_by_boundary(points: list[list[float]], level: str) -> list[dict]:
    """Call POST /api/geo/choropleth to count points per boundary at the given
    level ('regions' | 'cities' | 'districts'). Returns a list of feature
    property dicts (geometry stripped) including `count`, `point_indices`
    (0-based indices into the input `points` array), and the boundary's
    name/id fields. Non-fatal: on any error returns [].

    `points` is a list of [lng, lat] pairs.
    """
    if not points:
        return []

    url = f"{API_SERVER_URL}/api/geo/choropleth"
    payload = {"points": points, "level": level}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            logger.warning("choropleth %s failed %s: %s", level, resp.status_code, resp.text[:200])
            return []
        data = resp.json()
    except Exception as e:
        logger.warning("choropleth %s errored: %s", level, e)
        return []

    features = data.get("features", []) if isinstance(data, dict) else []
    rows = []
    for feat in features:
        props = feat.get("properties") or {}
        count = props.get("count", 0)
        if not count:
            continue
        rows.append(props)
    return rows


def extract_points(geojson: dict) -> tuple[list[list[float]], list[int]]:
    """Pull out [lng, lat] pairs from every Point feature in a FeatureCollection.

    Returns (points, feature_indices) where feature_indices[i] is the position
    of points[i] in the original `features` array. The caller uses this mapping
    to translate `point_indices` from the choropleth response back to features.
    """
    pts: list[list[float]] = []
    idxs: list[int] = []
    for i, feat in enumerate(geojson.get("features", [])):
        geom = feat.get("geometry") or {}
        if geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates")
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        lng, lat = coords[0], coords[1]
        if isinstance(lng, (int, float)) and isinstance(lat, (int, float)):
            pts.append([float(lng), float(lat)])
            idxs.append(i)
    return pts, idxs
