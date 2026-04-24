import json
from collections import Counter
from app.config import MAX_FEATURES_IN_CONTEXT


MAX_GROUPS_PER_FIELD = 50


def summarize_for_prompt(geojson: dict, fields: list) -> str:
    """Build a compact textual representation of the dataset for the LLM prompt.

    Qwen 9B has a bounded context AND is unreliable at counting items in a list.
    We therefore include:
      - total feature count (authoritative)
      - pre-computed group-by counts for every categorical property
        (so the LLM reads exact totals instead of estimating)
      - a truncated set of features so the model can still see concrete examples
    """
    features = geojson.get("features", [])
    total = len(features)
    sample = features[:MAX_FEATURES_IN_CONTEXT]

    field_summary = (
        [{"name": f.get("name"), "type": f.get("type")} for f in fields]
        if fields
        else _infer_fields(sample)
    )

    group_counts = _compute_group_counts(features, field_summary)
    compact_features = [_compact_feature(f) for f in sample]

    payload = {
        "total_features": total,
        "features_included": len(compact_features),
        "truncated": total > len(compact_features),
        "fields": field_summary,
        "authoritative_counts": group_counts,
        "features": compact_features,
    }
    return json.dumps(payload, ensure_ascii=False)


def _compact_feature(feature: dict) -> dict:
    geom = feature.get("geometry") or {}
    return {
        "properties": feature.get("properties", {}),
        "geometry_type": geom.get("type"),
        "coordinates": geom.get("coordinates"),
    }


def _infer_fields(features: list) -> list:
    seen: dict[str, str] = {}
    for feat in features:
        props = feat.get("properties") or {}
        for key, value in props.items():
            if key in seen:
                continue
            if isinstance(value, bool):
                seen[key] = "boolean"
            elif isinstance(value, (int, float)):
                seen[key] = "number"
            else:
                seen[key] = "string"
    return [{"name": k, "type": v} for k, v in seen.items()]


def _compute_group_counts(features: list, field_summary: list) -> dict:
    """For each non-numeric property, return {value: count} over ALL features.

    These are computed deterministically in Python so the LLM never has to count
    items manually — it just reads the totals.
    """
    categorical = [
        f["name"] for f in field_summary
        if f.get("type") not in ("number", "boolean") and f.get("name")
    ]

    out: dict[str, dict] = {}
    for field in categorical:
        counter: Counter = Counter()
        for feat in features:
            props = feat.get("properties") or {}
            value = props.get(field)
            if value is None or value == "":
                continue
            counter[str(value)] += 1
        if not counter:
            continue
        top = counter.most_common(MAX_GROUPS_PER_FIELD)
        out[field] = {
            "unique_values": len(counter),
            "counts": {k: v for k, v in top},
            "truncated": len(counter) > MAX_GROUPS_PER_FIELD,
        }
    return out
