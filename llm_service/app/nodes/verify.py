from langchain_core.messages import SystemMessage, HumanMessage
from app.services.llm_client import get_verifier_llm
from app.nodes._json_utils import parse_llm_json
from app.nodes._dataset_summary import summarize_for_prompt
from app.nodes.state import GraphState


SYSTEM_PROMPT = """You are a grounding verifier. You receive a user question, a dataset
summary (GeoJSON fields + feature sample), and a candidate answer.

Decide whether the answer is grounded in the dataset and relevant to the question.
- "grounded": every concrete claim (numbers, names, locations) is supported by the dataset.
- "relevant": the answer actually addresses the question.
- If the answer honestly says it cannot be answered, that counts as grounded.
- Flag hallucinated fields, fabricated counts, or off-topic content.

Respond with ONLY a JSON object:
{"grounded": true|false, "relevant": true|false, "issues": "<short explanation or empty>"}"""


async def verify_node(state: GraphState) -> GraphState:
    dataset_blob = summarize_for_prompt(state["geojson"], state.get("fields", []))
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
