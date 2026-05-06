"""SQLAlchemy engine singleton for the comparison worker."""
import os
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

_engine: Engine | None = None


def get_engine() -> Engine:
    """Return a process-wide SQLAlchemy engine.

    Reads POSTGRES_URL if present, otherwise builds it from
    POSTGRES_HOST/PORT/DB/USER/PASSWORD env vars.
    """
    global _engine
    if _engine is None:
        url = os.environ.get("POSTGRES_URL")
        if not url:
            host = os.environ["POSTGRES_HOST"]
            port = os.environ.get("POSTGRES_PORT", "5432")
            db = os.environ["POSTGRES_DB"]
            user = os.environ["POSTGRES_USER"]
            pw = os.environ["POSTGRES_PASSWORD"]
            url = f"postgresql+psycopg2://{user}:{pw}@{host}:{port}/{db}"
        _engine = create_engine(url, pool_pre_ping=True, pool_size=4, max_overflow=4)
    return _engine
