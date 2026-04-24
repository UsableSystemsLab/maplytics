import logging
import os
import traceback

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.graph import graph
from app.schemas import QueryRequest, QueryResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm_service")

app = FastAPI(title="Maplytics LLM Service", version="0.1.0")

_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    logger.exception("Unhandled error in %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "stage": "server",
            "reason": f"{type(exc).__name__}: {exc}",
            "trace": traceback.format_exc().splitlines()[-5:],
        },
    )


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/llm/query", response_model=QueryResponse)
async def query(req: QueryRequest, authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()

    initial_state = {
        "query": req.query,
        "project_id": req.project_id or None,
        "dataset_id": req.dataset_id,
        "auth_token": token,
    }

    result = await graph.ainvoke(initial_state)
    final = result.get("final_response") or {
        "status": "error",
        "stage": "unknown",
        "reason": "pipeline returned no final_response",
    }
    return final
