"""
tests/test_query_builders.py
End-to-end and unit tests for the hybrid NLQ pipeline.
Run with: pytest tests/ -v
"""
from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch

import pytest

# ── Fixtures & helpers ─────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    """Ensure env vars are set for all tests without a real .env."""
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key-12345")
    monkeypatch.setenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    monkeypatch.setenv("DEEPSEEK_MODEL",    "deepseek-chat")


# ── Language detection ─────────────────────────────────────────────────────

class TestLanguageNode:
    def test_english_detected(self):
        from nodes.language import detect_language
        result = detect_language("compare restaurants between west and east of jeddah")
        assert result.lang == "en"
        assert result.confidence > 0.5

    def test_arabic_detected(self):
        from nodes.language import detect_language
        result = detect_language("قارن المطاعم بين شرق وغرب جدة")
        assert result.lang == "ar"

    def test_supported_flag_en(self):
        from nodes.language import detect_language
        result = detect_language("schools near the city center")
        assert result.supported is True


# ── Topic filter ───────────────────────────────────────────────────────────

class TestTopicFilter:
    def test_geospatial_query_passes(self):
        from nodes.filter import filter_topic
        result = filter_topic("compare restaurants between west and east of jeddah")
        assert result.passed is True

    def test_education_query_passes(self):
        from nodes.filter import filter_topic
        result = filter_topic("Which cities have the highest density of special education schools?")
        assert result.passed is True

    def test_off_topic_rejected(self):
        from nodes.filter import filter_topic
        result = filter_topic("write me a poem about the ocean")
        assert result.passed is False

    def test_cooking_rejected(self):
        from nodes.filter import filter_topic
        result = filter_topic("what is the best recipe for chocolate cake")
        assert result.passed is False

    def test_score_is_float(self):
        from nodes.filter import filter_topic
        result = filter_topic("hospital density across riyadh districts")
        assert isinstance(result.score, float)


# ── Intent classifier ──────────────────────────────────────────────────────

class TestIntentClassifier:
    def test_comparison_signals(self):
        from nodes.classifier import classify_intent
        result = classify_intent("compare restaurants between west and east of jeddah")
        # Rule-based should catch this
        assert result.type_hint is not None or result.ambiguous is True

    def test_aggregation_signals(self):
        from nodes.classifier import classify_intent
        result = classify_intent("which cities have the highest density of schools")
        assert result.type_hint is not None or result.ambiguous is True

    def test_confidence_is_float(self):
        from nodes.classifier import classify_intent
        result = classify_intent("compare hospitals north vs south")
        assert 0.0 <= result.confidence <= 1.0


# ── Domain router ──────────────────────────────────────────────────────────

class TestDomainRouter:
    def test_education_domain(self):
        from nodes.domain import route_domain
        result = route_domain("special education schools density per city")
        assert result.allowed is True
        assert "education" in result.domain

    def test_retail_domain(self):
        from nodes.domain import route_domain
        result = route_domain("compare restaurants east and west jeddah")
        assert result.allowed is True

    def test_blocked_medical_diagnosis(self):
        from nodes.domain import route_domain
        result = route_domain("diagnose my symptoms and recommend treatment plan")
        assert result.allowed is False

    def test_blocked_financial_pii(self):
        from nodes.domain import route_domain
        result = route_domain("show all bank account and credit card records")
        assert result.allowed is False


# ── Registry validator ─────────────────────────────────────────────────────

class TestRegistryValidator:
    def test_resolve_education_project(self):
        from core.validators import resolve_registry
        project_id, dataset_ids = resolve_registry("geospatial_education", "special education schools")
        assert project_id is not None
        assert len(dataset_ids) > 0

    def test_resolve_retail_project(self):
        from core.validators import resolve_registry
        project_id, dataset_ids = resolve_registry("geospatial_retail", "restaurants in jeddah")
        assert project_id is not None
        assert len(dataset_ids) > 0

    def test_ids_are_strings(self):
        from core.validators import resolve_registry
        pid, dids = resolve_registry("geospatial_general", "park distribution across districts")
        if pid:
            assert isinstance(pid, str)
        assert isinstance(dids, list)


# ── LLM node (mocked) ──────────────────────────────────────────────────────

MOCK_LLM_COMPARISON = {
    "type": "comparison",
    "query": "compare restaurants between west and east of jeddah",
    "projectId": "a2770045-0dca-4583-ba33-a846d80836d8",
    "datasets": ["02dbd891-42db-4661-a51c-329399c64696"],
    "clarification_needed": False,
    "clarification_hint": None,
    "reasoning": "Query explicitly compares two spatial areas (west vs east).",
}

MOCK_LLM_AGGREGATION = {
    "type": "aggregation",
    "query": "Which cities have the highest density of special education schools relative to population size?",
    "projectId": "a2770045-0dca-4583-fdsdf-dsfdsfdsfe3",
    "datasets": ["02dbd891-42db-4661-a51c-329399c64644"],
    "clarification_needed": False,
    "clarification_hint": None,
    "reasoning": "Query ranks cities by a density metric — aggregation.",
}


def _make_mock_response(data: dict) -> MagicMock:
    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = json.dumps(data)
    return mock_resp


class TestLLMNode:
    def test_comparison_extraction(self):
        from core.schemas import FastLaneContext, TaskType
        from nodes.llm import run_llm_extraction

        context = FastLaneContext(
            query="compare restaurants between west and east of jeddah",
            lang="en",
            domain="geospatial_retail",
            type_hint=TaskType.comparison,
            ambiguous=False,
            confidence=0.91,
        )

        with patch("nodes.llm._build_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = \
                _make_mock_response(MOCK_LLM_COMPARISON)
            result = run_llm_extraction(context)

        assert result.type == TaskType.comparison
        assert result.clarification_needed is False
        assert result.project_id is not None
        assert len(result.dataset_ids) > 0

    def test_aggregation_extraction(self):
        from core.schemas import FastLaneContext, TaskType
        from nodes.llm import run_llm_extraction

        context = FastLaneContext(
            query="Which cities have the highest density of special education schools relative to population size?",
            lang="en",
            domain="geospatial_education",
            type_hint=TaskType.aggregation,
            ambiguous=False,
            confidence=0.88,
        )

        with patch("nodes.llm._build_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = \
                _make_mock_response(MOCK_LLM_AGGREGATION)
            result = run_llm_extraction(context)

        assert result.type == TaskType.aggregation
        assert result.clarification_needed is False


# ── Geo massager ───────────────────────────────────────────────────────────

class TestGeoMassager:
    def test_geo_hint_attached(self):
        from core.schemas import LLMExtractionResult, TaskType
        from nodes.geo_massager import enrich_geo

        extraction = LLMExtractionResult(
            type=TaskType.comparison,
            query="compare restaurants between west and east of jeddah",
            project_id="a2770045-0dca-4583-ba33-a846d80836d8",
            dataset_ids=["02dbd891-42db-4661-a51c-329399c64696"],
        )
        result = enrich_geo(extraction)
        assert result.geo is not None
        assert result.geo.crs == "EPSG:4326"
        assert result.geo.geometry_type.value == "point"
        assert result.geo.centroid is not None
        assert len(result.geo.centroid) == 2

    def test_bbox_inferred_for_jeddah(self):
        from core.schemas import LLMExtractionResult, TaskType
        from nodes.geo_massager import enrich_geo

        extraction = LLMExtractionResult(
            type=TaskType.aggregation,
            query="school density in jeddah",
            project_id="a2770045-0dca-4583-ba33-a846d80836d8",
            dataset_ids=["02dbd891-42db-4661-a51c-329399c64696"],
        )
        result = enrich_geo(extraction)
        assert result.geo.bbox is not None
        assert len(result.geo.bbox) == 4


# ── Full pipeline integration (LLM mocked) ────────────────────────────────

class TestPipelineIntegration:
    """
    End-to-end pipeline tests with the LLM call mocked.
    These validate stage wiring, schema propagation, and error paths.
    """

    def _run(self, query: str, llm_mock_data: dict) -> dict:
        from core.pipeline import run_pipeline
        from core.schemas import QueryRequest

        with patch("nodes.llm._build_client") as mock_client:
            mock_client.return_value.chat.completions.create.return_value = \
                _make_mock_response(llm_mock_data)
            result = run_pipeline(QueryRequest(query=query))
        return result

    def test_example_query_1_comparison(self):
        result = self._run(
            "compare restaurants between west and east of jeddah",
            MOCK_LLM_COMPARISON,
        )
        assert result.type.value == "comparison"
        assert result.projectId is not None
        assert len(result.datasets) > 0
        assert result.geo is not None

    def test_example_query_2_aggregation(self):
        result = self._run(
            "Which cities have the highest density of special education schools relative to population size?",
            MOCK_LLM_AGGREGATION,
        )
        assert result.type.value == "aggregation"
        assert result.geo.crs == "EPSG:4326"

    def test_off_topic_raises_400(self):
        from fastapi import HTTPException
        from core.pipeline import run_pipeline
        from core.schemas import QueryRequest
        with pytest.raises(HTTPException) as exc_info:
            run_pipeline(QueryRequest(query="write me a poem about autumn leaves"))
        assert exc_info.value.status_code == 400

    def test_blocked_domain_raises_403(self):
        from fastapi import HTTPException
        from core.pipeline import run_pipeline
        from core.schemas import QueryRequest
        with pytest.raises(HTTPException) as exc_info:
            run_pipeline(QueryRequest(query="diagnose my symptoms and give me a treatment plan"))
        assert exc_info.value.status_code in (400, 403)
