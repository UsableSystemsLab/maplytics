from app.nodes.state import GraphState


async def present_node(state: GraphState) -> GraphState:
    stage = state.get("rejection_stage")
    if stage:
        return {
            "final_response": {
                "status": "rejected",
                "stage": stage,
                "reason": state.get("rejection_reason", ""),
            }
        }

    verification = state.get("verification") or {}
    grounded = verification.get("grounded", False)
    relevant = verification.get("relevant", False)
    status = "ok" if grounded and relevant else "unverified"

    return {
        "final_response": {
            "status": status,
            "stage": "present",
            "answer": state.get("answer"),
            "verification": verification,
        }
    }
