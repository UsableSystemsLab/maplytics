"""
nodes/llm_node.py
LLM Node — Semantic extractor + JSON builder.
Single API call to DeepSeek (OpenAI-compatible endpoint).
Uses the FastLaneContext assembled by guard nodes to produce
a structured LLMExtractionResult.
"""
from __future__ import annotations

import json
import logging
import re
from textwrap import dedent

from openai import OpenAI

from core.config import get_settings
from core.schemas import FastLaneContext, LLMExtractionResult, TaskType
from core.validators import resolve_registry

logger = logging.getLogger(__name__)


def _build_client() -> OpenAI:
    cfg = get_settings()
    return OpenAI(
        api_key=cfg.llm.api_key,
        base_url=cfg.llm.base_url,
    )


def _build_system_prompt(context: FastLaneContext, project_id: str | None, dataset_ids: list[str]) -> str:
    cfg = get_settings()

    type_instruction = (
        f'The query has been pre-classified as type "{context.type_hint.value}". '
        "Confirm or correct this classification based on the query semantics."
        if context.type_hint
        else
        "The query type is ambiguous. You must determine whether it is 'comparison' or 'aggregation' "
        "based on the query semantics. Use 'comparison' for queries comparing two or more spatial groups, "
        "and 'aggregation' for queries that rank, count, or compute statistics across a dimension."
    )

    registry_block = dedent(f"""
    Resolved registry (do NOT modify these IDs):
      projectId : {project_id or 'UNKNOWN'}
      datasets  : {json.dumps(dataset_ids)}
    """).strip()

    return dedent(f"""
    You are a geospatial analytics query parser. Your job is to extract structured information
    from a natural language query and return a valid JSON object.

    Language detected: {context.lang}
    Domain: {context.domain}
    {type_instruction}

    {registry_block}

    Rules:
    - "type" must be exactly "comparison" or "aggregation".
    - "query" must be the original query text, lightly cleaned (fix obvious typos only).
    - "projectId" and "datasets" must use ONLY the IDs provided above — never invent new UUIDs.
    - If you cannot determine the type with confidence, set "clarification_needed": true and
      provide a short "clarification_hint" question to ask the user.
    - Do NOT include any explanation outside the JSON object.
    - Respond ONLY with a valid JSON object matching this schema:

    {{
      "type": "comparison" | "aggregation",
      "query": "<cleaned query string>",
      "projectId": "<uuid>",
      "datasets": ["<uuid>"],
      "clarification_needed": false,
      "clarification_hint": null,
      "reasoning": "<one sentence explaining your type decision>"
    }}
    """).strip()


def _extract_json(content: str) -> dict:
    """Extract JSON from LLM response, stripping markdown fences if present."""
    # Strip ```json ... ``` fences
    cleaned = re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find a JSON object anywhere in the response
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse JSON from LLM response: {content[:200]}")


def run_llm_extraction(context: FastLaneContext) -> LLMExtractionResult:
    """
    Single LLM call that performs semantic extraction + JSON building.
    The FastLaneContext provides pre-computed hints to reduce LLM reasoning burden.
    Registry IDs are resolved deterministically before the call — LLM cannot hallucinate UUIDs.
    """
    cfg = get_settings()

    # Resolve project + datasets deterministically BEFORE the LLM call
    project_id, dataset_ids = resolve_registry(context.domain, context.query)

    system_prompt = _build_system_prompt(context, project_id, dataset_ids)
    user_message  = context.query

    logger.debug(
        "LLM call: model=%s, type_hint=%s, ambiguous=%s",
        cfg.llm.model, context.type_hint, context.ambiguous,
    )

    client = _build_client()
    response = client.chat.completions.create(
        model=cfg.llm.model,
        max_tokens=cfg.llm.max_tokens,
        temperature=cfg.llm.temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
    )

    raw_content = response.choices[0].message.content or ""
    logger.debug("LLM raw response: %s", raw_content[:300])

    data = _extract_json(raw_content)

    # Enforce registry IDs — override whatever the LLM returned
    data["project_id"]  = project_id or data.get("projectId", "")
    data["dataset_ids"] = dataset_ids or data.get("datasets", [])

    # Normalise field names (LLM may use camelCase)
    if "projectId" in data and "project_id" not in data:
        data["project_id"] = data.pop("projectId")
    if "datasets" in data and "dataset_ids" not in data:
        data["dataset_ids"] = data.pop("datasets")

    return LLMExtractionResult(
        type=TaskType(data.get("type", context.type_hint or TaskType.aggregation)),
        query=data.get("query", context.query),
        project_id=data["project_id"],
        dataset_ids=data["dataset_ids"],
        clarification_needed=data.get("clarification_needed", False),
        clarification_hint=data.get("clarification_hint"),
        reasoning=data.get("reasoning"),
    )
