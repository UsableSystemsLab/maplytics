"""
nodes/filter_node.py
Non-LLM Node 2 — Topic filter.
Uses TF-IDF cosine similarity against a geospatial corpus + keyword allow-list.
Rejects clearly off-topic queries before any LLM call.
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from core.config import get_settings
from core.schemas import TopicFilterResult

logger = logging.getLogger(__name__)

# Corpus of geospatial analytical sentences used to build the TF-IDF space
_GEO_CORPUS = [
    "compare restaurants between west and east of jeddah",
    "which cities have the highest density of schools relative to population",
    "show the distribution of hospitals across regions",
    "find the nearest pharmacy to each neighborhood",
    "aggregate the number of schools per district",
    "compare health facilities between north and south zones",
    "what is the spatial distribution of mosques in riyadh",
    "how many parks are there in each district",
    "rank neighborhoods by school density",
    "which areas have the most universities",
    "map all clinics in the eastern province",
    "find districts with highest population density",
    "compare educational infrastructure between cities",
    "show proximity of hospitals to residential zones",
    "count the number of special education facilities per city",
    "which region has the highest coverage of healthcare facilities",
    "aggregate supermarkets by zone in jeddah",
    "distribution of mosques relative to population in medina",
    "compare the number of malls east versus west",
    "locate all government schools in makkah",
]


@lru_cache(maxsize=1)
def _build_vectorizer() -> tuple[TfidfVectorizer, np.ndarray]:
    """Build TF-IDF vectorizer fitted on geospatial corpus. Cached after first call."""
    cfg = get_settings()
    # Enrich corpus with config keywords as short documents
    keyword_docs = [" ".join(cfg.topic_filter.allowed_keywords[i:i+5])
                    for i in range(0, len(cfg.topic_filter.allowed_keywords), 5)]
    corpus = _GEO_CORPUS + keyword_docs

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        stop_words="english",
        sublinear_tf=True,
    )
    corpus_matrix = vectorizer.fit_transform(corpus)
    return vectorizer, corpus_matrix


def _has_keyword_hit(query: str, keywords: list[str]) -> bool:
    """Quick keyword check — fast pre-filter before cosine similarity."""
    query_lower = query.lower()
    return any(kw.lower() in query_lower for kw in keywords)


def filter_topic(query: str) -> TopicFilterResult:
    """
    Returns TopicFilterResult with passed=True if the query is geo-analytical.
    Decision logic:
      1. Keyword hit → immediate pass (cheap path).
      2. TF-IDF cosine similarity ≥ threshold → pass.
      3. Otherwise → reject.
    """
    cfg = get_settings()

    # Fast path: keyword match
    if _has_keyword_hit(query, cfg.topic_filter.allowed_keywords):
        logger.debug("Topic filter: keyword hit, passing query.")
        return TopicFilterResult(passed=True, score=1.0, reason="keyword match")

    # TF-IDF cosine similarity path
    vectorizer, corpus_matrix = _build_vectorizer()
    query_vec = vectorizer.transform([query])
    sims = cosine_similarity(query_vec, corpus_matrix)
    max_score = float(np.max(sims))

    passed = max_score >= cfg.topic_filter.similarity_threshold
    reason = "tfidf similarity" if passed else f"score {max_score:.3f} below threshold {cfg.topic_filter.similarity_threshold}"

    logger.debug(
        "Topic filter: score=%.3f, threshold=%.3f, passed=%s",
        max_score, cfg.topic_filter.similarity_threshold, passed,
    )
    return TopicFilterResult(passed=passed, score=max_score, reason=reason)
