"""
nodes/domain_node.py
Non-LLM Node 4 — Domain router.
Rule-based safety and routing check.
Maps the query to a domain label and checks against allow/block lists.
No model, no LLM — pure keyword + heuristic logic.
"""
from __future__ import annotations

import logging
import re

from core.config import get_settings
from core.schemas import DomainResult

logger = logging.getLogger(__name__)

# Domain → keyword signals mapping
_DOMAIN_SIGNALS: dict[str, list[str]] = {
    "geospatial_education": [
        "school", "university", "college", "education", "student",
        "academic", "campus", "special education", "faculty",
    ],
    "geospatial_retail": [
        "restaurant", "mall", "supermarket", "shop", "store",
        "retail", "market", "grocery", "cafe", "food",
    ],
    "geospatial_health": [
        "hospital", "clinic", "pharmacy", "health", "medical",
        "doctor", "nurse", "healthcare", "treatment", "patient",
    ],
    "geospatial_infrastructure": [
        "road", "bridge", "highway", "utility", "power", "water",
        "sewage", "infrastructure", "transport", "metro",
    ],
    "geospatial_general": [
        "mosque", "church", "park", "district", "neighborhood",
        "city", "region", "zone", "location", "area", "population",
        "density", "distribution", "proximity", "map", "coordinate",
    ],
    # Blocked domains — detected but rejected
    "medical_diagnosis": [
        "diagnose", "diagnosis", "disease", "symptom", "treatment plan",
        "prescription", "drug dosage", "surgery",
    ],
    "financial_pii": [
        "bank account", "credit card", "social security", "national id",
        "salary", "income", "tax return", "financial record",
    ],
    "personal_data": [
        "personal information", "home address", "phone number",
        "email address", "private data", "user data",
    ],
}


def _score_domain(query: str, keywords: list[str]) -> float:
    """Count keyword hits normalised by keyword list length."""
    q = query.lower()
    hits = sum(1 for kw in keywords if kw.lower() in q)
    return hits / max(len(keywords), 1)


def route_domain(query: str) -> DomainResult:
    """
    Determine the domain of the query and whether it's allowed.
    Returns DomainResult(domain, allowed, reason).
    """
    cfg = get_settings()
    scores: dict[str, float] = {}

    for domain, keywords in _DOMAIN_SIGNALS.items():
        scores[domain] = _score_domain(query, keywords)

    # Pick highest scoring domain
    best_domain = max(scores, key=lambda d: scores[d])
    best_score  = scores[best_domain]

    # If no signal at all, default to geospatial_general
    if best_score == 0.0:
        best_domain = "geospatial_general"

    # Check against allow/block lists
    if best_domain in cfg.domain_router.blocked_domains:
        logger.warning("Query routed to blocked domain: %s", best_domain)
        return DomainResult(
            domain=best_domain,
            allowed=False,
            reason=f"Domain '{best_domain}' is not permitted.",
        )

    if best_domain not in cfg.domain_router.allowed_domains:
        logger.warning("Domain '%s' not in allowed list, defaulting to geospatial_general.", best_domain)
        best_domain = "geospatial_general"

    logger.debug("Domain resolved: %s (score=%.3f)", best_domain, best_score)
    return DomainResult(domain=best_domain, allowed=True)
