"""Lazy PostgreSQL and Redis dependencies."""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


import logging

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Create the SQLAlchemy engine with automatic SQLite fallback if PostgreSQL is unavailable."""
    db_url = get_settings().database_url
    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 2},
        )
        # Test connection immediately
        with engine.connect() as conn:
            pass
        return engine
    except Exception as exc:
        logger.warning(
            "Primary database (%s) unreachable (%s). Seamlessly falling back to local SQLite engine (trustmedia.db)",
            db_url,
            exc,
        )
        sqlite_engine = create_engine(
            "sqlite:///./trustmedia.db",
            connect_args={"check_same_thread": False},
        )
        try:
            from app.database.models import Base
            Base.metadata.create_all(bind=sqlite_engine)
        except Exception as init_err:
            logger.warning("Could not pre-create tables on fallback SQLite: %s", init_err)
        return sqlite_engine


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped SQLAlchemy session."""
    with Session(get_engine()) as session:
        yield session


@lru_cache(maxsize=1)
def get_redis_client():
    """Return a lazily connected Redis client."""
    from redis import Redis

    return Redis.from_url(
        get_settings().redis_url, socket_connect_timeout=2, socket_timeout=2
    )
