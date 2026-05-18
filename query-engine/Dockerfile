# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: dependency builder
# Install heavy packages into a virtual env so they can be copied cleanly.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps needed to compile some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libgeos-dev \
        libproj-dev \
        proj-data \
    && rm -rf /var/lib/apt/lists/*

# Create venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install requirements
# Install CPU-only PyTorch first (much smaller image than default CUDA build)
COPY requirements.txt .
RUN pip install --upgrade pip --no-cache-dir && \
    pip install --no-cache-dir \
        torch==2.5.1 \
        --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: model downloader
# Pre-download HuggingFace model so the container is self-contained and
# first-request latency is predictable.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS model-downloader

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV HF_HOME=/models

RUN python -c "\
from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
model_id = 'cross-encoder/nli-MiniLM-L2-v2'; \
AutoTokenizer.from_pretrained(model_id); \
AutoModelForSequenceClassification.from_pretrained(model_id); \
print('Model downloaded successfully.')"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="your-team@example.com"
LABEL description="NLQ Geospatial Pipeline — hybrid NLP microservice"

# Runtime system deps (GEOS/PROJ for shapely/pyproj)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgeos-dev \
        libproj-dev \
        proj-data \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd  --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy venv and pre-downloaded models
COPY --from=builder      /opt/venv  /opt/venv
COPY --from=model-downloader /models /models

ENV PATH="/opt/venv/bin:$PATH"
ENV HF_HOME=/models
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Copy application code
COPY --chown=appuser:appgroup . .

# Drop to non-root
USER appuser

EXPOSE 8000

# Healthcheck — calls the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "server:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--log-level", "info", \
     "--workers", "2"]
