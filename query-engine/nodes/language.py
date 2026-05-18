"""
nodes/language_node.py
Non-LLM Node 1 — Language detection.
Uses langdetect (lightweight, no network call).
Attaches lang code and supported flag to context.
"""
from __future__ import annotations

import logging

from langdetect import LangDetectException, detect_langs

from core.config import get_settings
from core.schemas import LanguageResult

logger = logging.getLogger(__name__)


def detect_language(query: str) -> LanguageResult:
    """
    Detect the language of the query.
    Returns a LanguageResult with lang code, confidence, and supported flag.
    """
    cfg = get_settings()

    try:
        results = detect_langs(query)
        # detect_langs returns list of Language objects sorted by probability
        top = results[0]
        lang = top.lang
        confidence = float(top.prob)
    except LangDetectException as exc:
        logger.warning("Language detection failed: %s. Defaulting to 'en'.", exc)
        lang = "en"
        confidence = 0.0

    supported = lang in cfg.language.supported

    if not supported:
        if cfg.language.strict:
            logger.warning("Unsupported language detected: %s", lang)
        else:
            logger.info("Unsupported language '%s' — continuing (strict=false).", lang)

    logger.debug("Language detected: %s (confidence=%.2f, supported=%s)", lang, confidence, supported)

    return LanguageResult(lang=lang, confidence=confidence, supported=supported)
