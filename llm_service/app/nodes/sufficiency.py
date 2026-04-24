from langchain_core.messages import SystemMessage, HumanMessage
from app.services.llm_client import get_primary_llm
from app.nodes._json_utils import parse_llm_json
from app.nodes._dataset_summary import summarize_for_prompt
from app.nodes.state import GraphState


SYSTEM_PROMPT = """You are a scope filter for a geospatial analytics assistant.
You receive a user query and a summary of a GeoJSON dataset (fields + sample
features). Decide whether the query is in-scope for this dataset.

DEFAULT TO `answerable: true`. Only return `false` when the query is about a
topic that has NOTHING to do with the dataset's contents — e.g. dataset of
restaurants + question about stock prices, or dataset of bus stops + question
about recipes.

Specifically, you MUST return `answerable: true` when:
- The dataset has geometry (points/lines/polygons) and the query asks about
  locations, areas, cities, regions, districts, distributions, clusters,
  proximity, counts-per-area, or any spatial pattern — even if no field named
  "city" or "region" exists. Coordinates + any place-name field are enough;
  the assistant can reason spatially from them.
- The dataset has properties related to the query's subject (price, rating,
  category, time, etc.), even partially. Partial answers count as answerable.
- You are unsure. When in doubt, say `true`.

Respond with ONLY a JSON object, no prose:
{"answerable": true|false, "reason": "<one short sentence>"}"""


async def sufficiency_node(state: GraphState) -> GraphState:
    dataset_blob = summarize_for_prompt(state["geojson"], state.get("fields", []))
    llm = get_primary_llm()

    response = await llm.ainvoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Query: {state['query']}\n\nDataset summary:\n{dataset_blob}"),
    ])

    # Default to answerable on any parse failure or ambiguous response — the
    # answer and verifier nodes are the real quality gates.
    try:
        parsed = parse_llm_json(response.content)
        raw = parsed.get("answerable")
        answerable = True if raw is None else bool(raw)
        reason = parsed.get("reason", "")
    except Exception:
        answerable = True
        reason = ""

    out: GraphState = {"is_answerable": answerable}
    if not answerable:
        out["rejection_stage"] = "sufficiency"
        out["rejection_reason"] = reason or "Query appears unrelated to the dataset's domain."
    return out
