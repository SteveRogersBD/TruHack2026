from __future__ import annotations

import os
from pathlib import Path
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def _load_env() -> None:
    # Load repo-root .env (BackEnd/db.py -> repo root is two levels up)
    repo_root = Path(__file__).resolve().parents[1]
    dotenv_path = repo_root / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path=str(dotenv_path), override=True)


def get_database_url() -> str:
    _load_env()

    # Prefer DB_URL if present (some Supabase pooler URLs use different usernames/hosts).
    url = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Missing DATABASE_URL (or DB_URL) in environment.")

    # SQLAlchemy defaults to psycopg2 when the driver isn't specified.
    # We use psycopg v3, so normalize the scheme.
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]

    return url


_engine: Optional[Engine] = None
SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_database_url(),
            pool_pre_ping=True,
            echo=False,
        )
        SessionLocal.configure(bind=_engine)
    return _engine


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.
    """
    get_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
