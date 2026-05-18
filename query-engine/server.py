"""
server.py
FastAPI application — entry point for the NLQ microservice.
Exposes:
  POST /query     — main pipeline endpoint
  GET  /health    — liveness probe
  GET  /ready     — readiness probe (checks model loaded)
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.pipeline import run_pipeline
from core.schemas import ErrorResponse, QueryRequest, StructuredResponse

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: warm up heavy models on startup ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Warming up pipeline models...")
    t0 = time.perf_counter()
    try:
        # Pre-load intent classifier model so first request isn't slow
        from nodes.classifier import _load_pipeline
        _load_pipeline()
        # Pre-build TF-IDF vectorizer
        from nodes.filter import _build_vectorizer
        _build_vectorizer()
        logger.info("Models ready in %.1fs", time.perf_counter() - t0)
    except Exception as exc:
        logger.warning("Model warm-up failed (non-fatal): %s", exc)
    yield
    logger.info("Shutting down NLQ service.")


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NLQ Geospatial Pipeline",
    description=(
        "Hybrid NLP microservice that converts natural language geospatial "
        "queries into structured JSON for analytics and map visualisation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request timing middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    return response


# ── Exception handler ──────────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health():
    """Liveness probe — always returns 200 if the server is running."""
    return {"status": "ok"}


@app.get("/ready", tags=["ops"])
async def ready():
    """Readiness probe — verifies models are loaded."""
    try:
        from nodes.classifier import _load_pipeline
        from nodes.filter import _build_vectorizer
        _load_pipeline()
        _build_vectorizer()
        return {"status": "ready"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"status": "not_ready", "reason": str(exc)})


@app.post(
    "/query",
    response_model=StructuredResponse,
    responses={
        400: {"description": "Off-topic query", "model": ErrorResponse},
        403: {"description": "Domain not permitted", "model": ErrorResponse},
        422: {"description": "Ambiguous query — clarification needed", "model": ErrorResponse},
        502: {"description": "LLM extraction failed", "model": ErrorResponse},
    },
    tags=["pipeline"],
)
async def process_query(request: QueryRequest) -> StructuredResponse:
    """
    Convert a natural language geospatial query into a structured JSON response.

    **Pipeline stages**:
    1. Language detection (non-LLM)
    2. Topic filter — rejects off-topic queries (non-LLM)
    3. Intent classification — comparison vs aggregation (non-LLM)
    4. Domain routing — safety check (non-LLM)
    5. Semantic extraction + JSON building (LLM — single call)
    6. Geospatial enrichment — CRS, bbox, centroid (non-LLM)
    """
    logger.info("Received query: %r", request.query)
    return run_pipeline(request)
