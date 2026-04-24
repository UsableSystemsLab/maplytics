import json
import re


def parse_llm_json(text: str) -> dict:
    """Extract a JSON object from an LLM response. Tolerates ```json fences and leading prose."""
    if not text:
        raise ValueError("empty LLM response")

    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        return json.loads(fence.group(1))

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"no JSON object in response: {text[:200]}")
    return json.loads(text[start : end + 1])
