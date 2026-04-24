from langchain_core.messages import SystemMessage, HumanMessage
from app.services.llm_client import get_verifier_llm
from app.nodes._json_utils import parse_llm_json
from app.nodes._dataset_summary import summarize_for_prompt
from app.nodes.state import GraphState


SYSTEM_PROMPT = """You are a grounding verifier. You receive a user question, a dataset
summary, and a candidate answer.

The dataset summary contains:
- `total_features`: exact count of all features
- `authoritative_counts`: exact per-value counts for every categorical property,
  computed deterministically over the full dataset
- `geographic_counts` (optional): exact point counts per Saudi region, city,
  and district, computed by a PostGIS spatial join. Each item also includes
  `property_counts` showing the exact cross-tab breakdown by feature category.
  When present, these are authoritative for any city/region/district question
  (including questions about categories within a district) — do NOT second-guess
  them even if the dataset's own `district` property says something else.
- `features`: a truncated sample (only for context; NOT authoritative for counts)

To verify:
- "grounded": every concrete claim (numbers, names, locations) must be supported
  by `authoritative_counts`, `geographic_counts` (including its `property_counts`),
  `total_features`, or clearly visible in the sample.
  For counts, check against the exact counts provided — do NOT try to recount the
  `features` list (it may be truncated). For sums (e.g. grouping totals),
  verify the arithmetic matches the numbers.
- "relevant": the answer actually addresses the question.
- If the answer honestly says it cannot be answered, that counts as grounded.
- Flag hallucinated fields, fabricated counts, or off-topic content.

Respond with ONLY a JSON object:
{"grounded": true|false, "relevant": true|false, "issues": "<short explanation or empty>"}"""


async def verify_node(state: GraphState) -> GraphState:
    dataset_blob = summarize_for_prompt(
        state["geojson"], state.get("fields", []), state.get("geographic_counts"),
    )
    llm = get_verifier_llm()

    response = await llm.ainvoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f"Question: {state['query']}\n\n"
                f"Dataset summary:\n{dataset_blob}\n\n"
                f"Candidate answer:\n{state.get('answer', '')}"
            )
        ),
    ])

    try:
        parsed = parse_llm_json(response.content)
        verification = {
            "grounded": bool(parsed.get("grounded")),
            "relevant": bool(parsed.get("relevant")),
            "issues": parsed.get("issues", ""),
        }
    except Exception as e:
        verification = {
            "grounded": False,
            "relevant": False,
            "issues": f"verifier parse error: {e}",
        }

    return {"verification": verification}
