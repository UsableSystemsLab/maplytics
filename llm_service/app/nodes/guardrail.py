from langchain_core.messages import SystemMessage, HumanMessage
from app.services.llm_client import get_primary_llm
from app.nodes._json_utils import parse_llm_json
from app.nodes.state import GraphState


SYSTEM_PROMPT = """You are a topic classifier for a geospatial analytics assistant.
The assistant answers questions about geospatial datasets (points, regions, spatial patterns,
distributions, counts within areas, proximity, demographics tied to locations, etc.).

Classify the user query as on-topic or off-topic.
- On-topic: any question that could plausibly be answered from a geospatial dataset.
- Off-topic: small talk, general knowledge, coding help, personal questions, politics,
  or anything unrelated to analyzing a geographic dataset.

Respond with ONLY a JSON object:
{"on_topic": true|false, "reason": "<short explanation>"}"""


async def guardrail_node(state: GraphState) -> GraphState:
    llm = get_primary_llm()
    response = await llm.ainvoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Query: {state['query']}"),
    ])

    try:
        parsed = parse_llm_json(response.content)
        on_topic = bool(parsed.get("on_topic"))
        reason = parsed.get("reason", "")
    except Exception as e:
        on_topic = False
        reason = f"classifier parse error: {e}"

    out: GraphState = {"is_on_topic": on_topic}
    if not on_topic:
        out["rejection_stage"] = "guardrail"
        out["rejection_reason"] = reason or "Query is outside the geospatial-analysis scope."
    return out
