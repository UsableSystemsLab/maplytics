from pydantic import BaseModel, Field
from typing import Optional, Any


class QueryRequest(BaseModel):
    project_id: Optional[str] = Field(default=None, description="Project ID if the dataset is plotted in a project context")
    dataset_id: str = Field(..., description="Dataset ID to analyze")
    query: str = Field(..., min_length=1, description="Natural-language question about the dataset")


class QueryResponse(BaseModel):
    status: str
    stage: str
    answer: Optional[str] = None
    reason: Optional[str] = None
    verification: Optional[dict[str, Any]] = None
