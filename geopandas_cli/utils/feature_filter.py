import re

FILTER_FIELDS = ["category", "type", "amenity", "class", "subtype", "name"]
FEATURE_STOP_WORDS = {
    "all", "any", "feature", "features", "location", "locations",
    "place", "places", "poi", "pois", "the",
}

SYNONYMS = {
    "clinic": ["clinic", "medical", "healthcare", "health care", "doctor", "hospital"],
    "restaurant": ["restaurant", "food", "dining", "eatery"],
    "cafe": ["cafe", "coffee", "coffee shop"],
    "school": ["school", "education", "educational"],
    "bakery": ["bakery", "bakeshop"],
    "pharmacy": ["pharmacy", "drugstore"],
    "hotel": ["hotel", "lodging"],
    "park": ["park", "garden"],
}


def _normalize(value):
    text = str(value or "").lower()
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    words = []
    for word in text.split():
        if len(word) > 3 and word.endswith("ies"):
            word = f"{word[:-3]}y"
        elif len(word) > 3 and word.endswith("s"):
            word = word[:-1]
        words.append(word)
    return " ".join(words).strip()


def _terms(feature_query):
    normalized = _normalize(feature_query)
    if not normalized:
        return []
    normalized = " ".join(
        word for word in normalized.split() if word not in FEATURE_STOP_WORDS
    )
    if not normalized:
        return []
    terms = {normalized}
    terms.update(SYNONYMS.get(normalized, []))
    return sorted({_normalize(term) for term in terms if _normalize(term)})


def searchable_feature_fields(gdf):
    """Return feature-type fields that exist and contain at least one value."""
    if gdf is None or gdf.empty:
        return []
    fields = []
    for field in FILTER_FIELDS:
        if field not in gdf.columns:
            continue
        values = gdf[field].dropna().astype(str).map(str.strip)
        if values.ne("").any():
            fields.append(field)
    return fields


def filter_by_feature_query(gdf, feature_query):
    """Filter features by a requested POI/entity type.

    Returns (filtered_gdf, metadata). If there is no feature query, the original
    GeoDataFrame is returned and no filter is applied.
    """
    if not feature_query:
        return gdf, {
            "applied": False,
            "matchedFields": [],
            "matchedValues": [],
            "searchableFields": searchable_feature_fields(gdf),
            "input": None,
        }

    terms = _terms(feature_query)
    searchable_fields = searchable_feature_fields(gdf)
    if gdf is None:
        return None, {
            "applied": True,
            "matchedFields": [],
            "matchedValues": terms,
            "searchableFields": [],
            "input": feature_query,
        }
    if gdf.empty or not terms:
        return gdf.iloc[0:0].copy(), {
            "applied": True,
            "matchedFields": [],
            "matchedValues": terms,
            "searchableFields": searchable_fields,
            "input": feature_query,
        }

    mask = None
    matched_fields = []
    matched_values = set()
    for field in FILTER_FIELDS:
        if field not in gdf.columns:
            continue
        normalized_col = gdf[field].astype(str).map(_normalize)
        field_mask = normalized_col.apply(
            lambda value: any(term == value or term in value.split() or term in value for term in terms)
        )
        if field_mask.any():
            matched_fields.append(field)
            for value in normalized_col[field_mask].dropna().unique().tolist():
                matched_values.add(value)
        mask = field_mask if mask is None else (mask | field_mask)

    if mask is None:
        filtered = gdf.iloc[0:0].copy()
    else:
        filtered = gdf[mask].copy()

    return filtered, {
        "applied": True,
        "matchedFields": matched_fields,
        "matchedValues": sorted(matched_values or set(terms)),
        "searchableFields": searchable_fields,
        "input": feature_query,
    }
