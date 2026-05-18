"""
core/validators.py
Deterministic registry lookups — the LLM never generates UUIDs.
Given a domain and extracted keywords, return the correct projectId + datasetIds.
"""
from __future__ import annotations

import logging
from difflib import SequenceMatcher

from core.config import DatasetEntry, ProjectEntry, Settings, get_settings

logger = logging.getLogger(__name__)


def _keyword_score(keywords: list[str], text: str) -> float:
    """Simple keyword overlap score between registry entry keywords and query text."""
    text_lower = text.lower()
    hits = sum(1 for kw in keywords if kw.lower() in text_lower)
    return hits / max(len(keywords), 1)


def resolve_project(domain: str, query: str, settings: Settings | None = None) -> ProjectEntry | None:
    """Return the best-matching project for a given domain + query text."""
    cfg = settings or get_settings()
    candidates = [p for p in cfg.projects if domain in p.domains]

    if not candidates:
        # Fallback: any project with keyword overlap
        candidates = cfg.projects

    scored = sorted(candidates, key=lambda p: _keyword_score(p.keywords, query), reverse=True)
    if not scored:
        return None

    best = scored[0]
    logger.debug("Resolved project: %s (score=%.2f)", best.name, _keyword_score(best.keywords, query))
    return best


def resolve_datasets(project_id: str, query: str, settings: Settings | None = None) -> list[DatasetEntry]:
    """Return datasets for a project ranked by keyword relevance to the query."""
    cfg = settings or get_settings()
    project_datasets = [d for d in cfg.datasets if d.project_id == project_id]

    if not project_datasets:
        logger.warning("No datasets found for project_id=%s", project_id)
        return []

    scored = sorted(
        project_datasets,
        key=lambda d: _keyword_score(d.keywords, query),
        reverse=True,
    )
    # Return top-1 dataset; extend to top-N if your use case needs multiple
    return scored[:1]


def resolve_registry(domain: str, query: str) -> tuple[str | None, list[str]]:
    """
    One-call helper used by the LLM lane.
    Returns (project_id, [dataset_id, ...]) deterministically.
    """
    cfg = get_settings()
    project = resolve_project(domain, query, cfg)
    if not project:
        logger.error("Could not resolve project for domain=%s", domain)
        return None, []

    datasets = resolve_datasets(project.id, query, cfg)
    dataset_ids = [d.id for d in datasets]
    return project.id, dataset_ids
