"""
nodes/classifier_node.py
Non-LLM Node 3 — Intent classifier.
Uses HuggingFace zero-shot cross-encoder to classify comparison vs aggregation.
Outputs a confidence score that gates whether the LLM gets a pre-filled type hint.

Model: cross-encoder/nli-MiniLM-L2-v2
  ~80MB, CPU-friendly, no GPU required.
  Downloads automatically on first run and is cached by HuggingFace.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from core.config import get_settings
from core.schemas import IntentResult, TaskType

logger = logging.getLogger(__name__)

# Rule-based keyword hints used to quickly boost classification confidence
_COMPARISON_SIGNALS = [
    "compare", "comparison", "versus", "vs", "difference", "between",
    "east vs west", "north vs south", "contrast", "relative to each other",
]
_AGGREGATION_SIGNALS = [
    "highest", "lowest", "most", "least", "average", "total", "count",
    "density", "distribution", "rank", "aggregate", "sum", "how many",
    "which cities", "which areas", "which regions", "per capita",
    "relative to population",
]


def _rule_based_hint(query: str) -> tuple[TaskType | None, float]:
    """
    Fast heuristic: count signal words to get a soft hint before the model runs.
    Returns (type, boosted_confidence) or (None, 0.0).
    """
    q = query.lower()
    comp_hits = sum(1 for s in _COMPARISON_SIGNALS if s in q)
    agg_hits  = sum(1 for s in _AGGREGATION_SIGNALS if s in q)

    if comp_hits == 0 and agg_hits == 0:
        return None, 0.0

    if comp_hits > agg_hits:
        return TaskType.comparison, min(0.65 + 0.05 * comp_hits, 0.85)
    elif agg_hits > comp_hits:
        return TaskType.aggregation, min(0.65 + 0.05 * agg_hits, 0.85)
    else:
        return None, 0.0   # tie — defer to model


@lru_cache(maxsize=1)
def _load_pipeline():
    """Load zero-shot classifier pipeline. Cached after first load (~2-3s cold start)."""
    from transformers import pipeline as hf_pipeline
    cfg = get_settings()
    logger.info("Loading intent classifier model: %s", cfg.intent.model_name)
    return hf_pipeline(
        "zero-shot-classification",
        model=cfg.intent.model_name,
        device=-1,          # CPU
    )


def classify_intent(query: str) -> IntentResult:
    """
    Classify the query as 'comparison' or 'aggregation'.
    Strategy:
      1. Rule-based keyword heuristic (fast, ~0ms).
      2. If hint confidence >= threshold, return immediately.
      3. Otherwise run the NLI zero-shot model for a robust classification.
    """
    cfg = get_settings()
    threshold = cfg.intent.confidence_threshold

    # Step 1: rule-based hint
    hint_type, hint_conf = _rule_based_hint(query)
    if hint_conf >= threshold:
        logger.debug(
            "Intent resolved by rules: %s (confidence=%.2f)", hint_type, hint_conf
        )
        return IntentResult(
            type_hint=hint_type,
            confidence=hint_conf,
            ambiguous=False,
        )

    # Step 2: zero-shot NLI model
    try:
        classifier = _load_pipeline()
        result = classifier(
            query,
            candidate_labels=cfg.intent.candidate_labels,
            hypothesis_template="This query is a {} task.",
        )
        top_label = result["labels"][0]
        top_score = float(result["scores"][0])

        task_type  = TaskType(top_label)
        ambiguous  = top_score < threshold

        # Blend with rule hint if available
        if hint_type is not None and hint_type == task_type:
            top_score = min(top_score + 0.08, 1.0)   # small boost for agreement
            ambiguous = top_score < threshold

        logger.debug(
            "Intent classifier (model): %s (confidence=%.2f, ambiguous=%s)",
            task_type, top_score, ambiguous,
        )
        return IntentResult(
            type_hint=None if ambiguous else task_type,
            confidence=top_score,
            ambiguous=ambiguous,
        )

    except Exception as exc:
        logger.warning("Intent classifier model failed (%s), falling back to rules.", exc)
        if hint_type:
            return IntentResult(type_hint=hint_type, confidence=hint_conf, ambiguous=hint_conf < threshold)
        return IntentResult(type_hint=None, confidence=0.0, ambiguous=True)
