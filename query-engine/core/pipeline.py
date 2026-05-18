"""
core/pipeline.py
Main pipeline orchestrator.
Chains all nodes in order, propagates context between stages,
and raises typed HTTPExceptions at each guard point.
"""
from __future__ import annotations

import logging
import time

from fastapi import HTTPException

from core.schemas import (
    FastLaneContext,
    QueryRequest,
    StructuredResponse,
)
from nodes.classifier import classify_intent
from nodes.domain import route_domain
from nodes.filter import filter_topic
from nodes.geo_massager import enrich_geo
from nodes.language import detect_language
from nodes.llm import run_llm_extraction

logger = logging.getLogger(__name__)


def run_pipeline(request: QueryRequest) -> StructuredResponse:
    """
    Full hybrid pipeline:

    Fast lane (non-LLM):
      1. Language detection
      2. Topic filter
      3. Intent classifier
      4. Domain router

    LLM lane (single call):
      5. Semantic extraction + JSON building

    Post-processing (pure Python):
      6. Data wrangling
    """
    query = request.query
    t0 = time.perf_counter()

    # ──────────────────────────────────────────
    # Stage 1: Language detection
    # ──────────────────────────────────────────
    lang_result = detect_language(query)
    logger.info("[1/6] Language: %s (supported=%s)", lang_result.lang, lang_result.supported)

    # ──────────────────────────────────────────
    # Stage 2: Topic filter
    # ──────────────────────────────────────────
    topic_result = filter_topic(query)
    logger.info("[2/6] Topic filter: passed=%s, score=%.3f", topic_result.passed, topic_result.score)

    if not topic_result.passed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "off_topic",
                "message": "Query does not appear to be a geospatial analytics question.",
                "reason": topic_result.reason,
                "stage": "topic_filter",
            },
        )

    # ──────────────────────────────────────────
    # Stage 3: Intent classification
    # ──────────────────────────────────────────
    intent_result = classify_intent(query)
    logger.info(
        "[3/6] Intent: type_hint=%s, confidence=%.2f, ambiguous=%s",
        intent_result.type_hint, intent_result.confidence, intent_result.ambiguous,
    )

    # ──────────────────────────────────────────
    # Stage 4: Domain routing
    # ──────────────────────────────────────────
    domain_result = route_domain(query)
    logger.info("[4/6] Domain: %s, allowed=%s", domain_result.domain, domain_result.allowed)

    if not domain_result.allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "domain_not_allowed",
                "message": domain_result.reason or "Query domain is not permitted.",
                "stage": "domain_router",
            },
        )

    # ──────────────────────────────────────────
    # Assemble fast-lane context for LLM
    # ──────────────────────────────────────────
    context = FastLaneContext(
        query=query,
        lang=lang_result.lang,
        domain=domain_result.domain,
        type_hint=intent_result.type_hint,
        ambiguous=intent_result.ambiguous,
        confidence=intent_result.confidence,
    )

    # ──────────────────────────────────────────
    # Stage 5: LLM extraction (single call)
    # ──────────────────────────────────────────
    try:
        extraction = run_llm_extraction(context)
    except Exception as exc:
        logger.error("[5/6] LLM extraction failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "llm_extraction_failed",
                "message": str(exc),
                "stage": "llm",
            },
        )

    logger.info(
        "[5/6] LLM: type=%s, clarification_needed=%s",
        extraction.type, extraction.clarification_needed,
    )

    if extraction.clarification_needed:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "clarification_needed",
                "message": "Query is ambiguous. Please clarify.",
                "hint": extraction.clarification_hint,
                "stage": "llm",
            },
        )

    # ──────────────────────────────────────────
    # Stage 6: Geospatial massager
    # ──────────────────────────────────────────
    result = enrich_geo(extraction)
    elapsed = (time.perf_counter() - t0) * 1000
    logger.info("[6/6] Pipeline complete in %.1fms — type=%s", elapsed, result.type)

    return result
