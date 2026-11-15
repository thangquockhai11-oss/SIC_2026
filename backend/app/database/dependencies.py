"""Lazy PostgreSQL and Redis dependencies."""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Create the SQLAlchemy engine when a database probe is requested."""
    db_url = get_settings().database_url
    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )
    return create_engine(
        db_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 3},
    )


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
