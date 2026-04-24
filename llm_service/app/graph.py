from langgraph.graph import StateGraph, END
from app.nodes.state import GraphState
from app.nodes.guardrail import guardrail_node
from app.nodes.validate_geojson import validate_geojson_node
from app.nodes.sufficiency import sufficiency_node
from app.nodes.answer import answer_node
from app.nodes.verify import verify_node
from app.nodes.present import present_node


def _after_guardrail(state: GraphState) -> str:
    return "validate_geojson" if state.get("is_on_topic") else "present"


def _after_validate(state: GraphState) -> str:
    return "sufficiency" if state.get("geojson_valid") else "present"


def _after_sufficiency(state: GraphState) -> str:
    return "generate_answer" if state.get("is_answerable") else "present"


def build_graph():
    builder = StateGraph(GraphState)

    builder.add_node("guardrail", guardrail_node)
    builder.add_node("validate_geojson", validate_geojson_node)
    builder.add_node("sufficiency", sufficiency_node)
    builder.add_node("generate_answer", answer_node)
    builder.add_node("verify_answer", verify_node)
    builder.add_node("present", present_node)

    builder.set_entry_point("guardrail")

    builder.add_conditional_edges("guardrail", _after_guardrail, {
        "validate_geojson": "validate_geojson",
        "present": "present",
    })
    builder.add_conditional_edges("validate_geojson", _after_validate, {
        "sufficiency": "sufficiency",
        "present": "present",
    })
    builder.add_conditional_edges("sufficiency", _after_sufficiency, {
        "generate_answer": "generate_answer",
        "present": "present",
    })
    builder.add_edge("generate_answer", "verify_answer")
    builder.add_edge("verify_answer", "present")
    builder.add_edge("present", END)

    return builder.compile()


graph = build_graph()
