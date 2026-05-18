# NLQ Geospatial Pipeline

NLP microservice that converts natural language geospatial queries into structured JSON for analytics and map visualisat0585
ion.

## Architecture

```
POST /query
     │
     ▼ ─────────── FAST LANE (non-LLM) ──────────────────────────────
     │
     ├─ [1] Language detection     langdetect
     ├─ [2] Topic filter           TF-IDF + keywords   ~5ms   → 400 if off-topic
     ├─ [3] Intent classifier      zero-shot NLI       ~50ms  → type_hint + confidence
     ├─ [4] Domain router          rule-based          ~1ms   → 403 if blocked
     │
     ▼ ─────────── LLM LANE (single call) ───────────────────────────
     │
     ├─ [5] Semantic extractor     DeepSeek API        ~800ms → structured JSON
     │       + JSON builder         (OpenAI-compatible)        → 422 if ambiguous
     │
     ▼ ─────────── POST-PROCESSING (pure Python) ─────────────────────
     │
     └─ [6] Geospatial massager    shapely + pyproj    ~1ms   → geo enriched response
```

## Quickstart

### Prerequisites
- Docker + Docker Compose
- DeepSeek API key (or any OpenAI-compatible API)

### 1. Configure environment
```bash
cp .env.example .env
# Edit .env and set DEEPSEEK_API_KEY
```

### 2. Build and run
```bash
docker compose up --build
```

The service starts on `http://localhost:8000`.
Swagger UI: `http://localhost:8000/docs`

### 3. Query the pipeline
```bash
# Example 1 — comparison
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "compare restaurants between west and east of jeddah"}'

# Example 2 — aggregation
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Which cities have the highest density of special education schools relative to population size?"}'
```

### Expected response shape
```json
{
  "type": "comparison",
  "query": "compare restaurants between west and east of jeddah",
  "projectId": "a2770045-0dca-4583-ba33-a846d80836d8",
  "datasets": ["02dbd891-42db-4661-a51c-329399c64696"],
  "geo": {
    "crs": "EPSG:4326",
    "geometry_type": "point",
    "bbox": [38.9, 21.2, 39.4, 21.8],
    "centroid": [39.15, 21.5],
    "coord_columns": {"longitude": "longitude", "latitude": "latitude"}
  }
}
```

## Local development (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env   # fill in your key
python main.py
```

## Running tests

```bash
pytest tests/ -v
```

## Configuration

Edit `config/settings.yaml` to:
- Add projects and datasets to the registry
- Tune `intent_classifier.confidence_threshold` (default: 0.75)
- Adjust `topic_filter.similarity_threshold` (default: 0.18)
- Add/remove allowed keywords and domains

## Endpoints

| Method | Path     | Description              |
|--------|----------|--------------------------|
| POST   | /query   | Run the pipeline         |
| GET    | /health  | Liveness probe           |
| GET    | /ready   | Readiness probe          |
| GET    | /docs    | Swagger UI               |

## Error codes

| Code | Meaning                          | Stage         |
|------|----------------------------------|---------------|
| 400  | Off-topic query                  | topic_filter  |
| 403  | Domain not permitted             | domain_router |
| 422  | Ambiguous query (clarify needed) | llm_node      |
| 502  | LLM API error                    | llm_node      |
