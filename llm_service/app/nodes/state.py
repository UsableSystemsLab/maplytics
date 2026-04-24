from typing import TypedDict, Optional, Any


class GraphState(TypedDict, total=False):
    query: str
    project_id: Optional[str]
    dataset_id: str
    auth_token: str

    geojson: Optional[dict]
    fields: list

    is_on_topic: bool
    geojson_valid: bool
    is_answerable: bool

    answer: Optional[str]
    verification: Optional[dict[str, Any]]

    rejection_stage: Optional[str]
    rejection_reason: Optional[str]

    final_response: dict
