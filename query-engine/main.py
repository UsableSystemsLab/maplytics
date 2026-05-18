"""
main.py
Direct entrypoint — use this for local development:
  python main.py
In production the Dockerfile runs uvicorn directly.
"""
import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        log_level=os.getenv("LOG_LEVEL", "info"),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )
