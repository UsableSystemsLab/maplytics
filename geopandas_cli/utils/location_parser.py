import re
from dataclasses import dataclass
from typing import Optional

from .errors import QueryParseError

STOP = {
    "compare", "contrast", "differentiate",
    "between", "and", "vs", "versus",
    "of", "in", "the", "by",
}


VERBS_RE = r"(?:compare|contrast|differentiate|difference|comparison)"
CONNECTOR_RE = r"\s+(?:and|vs|versus)\s+"


@dataclass
class ComparisonQuery:
    feature_query: Optional[str]
    location_a: str
    location_b: str


def _clean_phrase(value):
    value = re.sub(r"\s+", " ", str(value or "")).strip(" ,.;:?!")
    return value or None


def _strip_verb(value):
    return re.sub(rf"^\s*{VERBS_RE}\b\s*", "", value, flags=re.IGNORECASE).strip()


def _split_locations(value):
    parts = re.split(CONNECTOR_RE, value, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) != 2:
        raise QueryParseError("Could not find two locations in query.")
    location_a = _clean_phrase(parts[0])
    location_b = _clean_phrase(parts[1])
    if not location_a or not location_b:
        raise QueryParseError("Could not find two locations in query.")
    return location_a, location_b


def parse_comparison_query(query):
    """Extract feature intent and two location phrases from a comparison query."""
    query = _clean_phrase(query)
    if not query:
        raise QueryParseError("Empty query.")

    body = _strip_verb(query)
    if not body:
        raise QueryParseError("Could not parse comparison query.")

    between_match = re.search(r"\bbetween\b", body, flags=re.IGNORECASE)
    if between_match:
        feature_query = _clean_phrase(body[:between_match.start()])
        location_text = body[between_match.end():]
        location_a, location_b = _split_locations(location_text)
        return ComparisonQuery(feature_query, location_a, location_b)

    in_match = re.search(r"\bin\b", body, flags=re.IGNORECASE)
    if in_match:
        feature_query = _clean_phrase(body[:in_match.start()])
        location_text = body[in_match.end():]
        location_a, location_b = _split_locations(location_text)
        return ComparisonQuery(feature_query, location_a, location_b)

    location_a, location_b = _split_locations(body)
    return ComparisonQuery(None, location_a, location_b)


def parse_two_names(query):
    parsed = parse_comparison_query(query)
    return parsed.location_a, parsed.location_b
