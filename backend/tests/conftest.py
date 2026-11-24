"""Shared API test fixtures."""

import sys
from pathlib import Path

# Ensure project root (SIC) and backend are in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent
for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.dependencies import get_db_session, get_redis_client
from app.database.models import Base
from app.main import app

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=test_engine)


def override_db_session():
    with Session(test_engine) as session:
        yield session


class FakeRedis:
    def ping(self) -> bool:
        return True


@pytest.fixture
def client(monkeypatch) -> TestClient:
    """Use in-memory SQLite and fake Redis client for tests."""
    monkeypatch.setattr("app.database.dependencies.get_engine", lambda: test_engine)
    monkeypatch.setattr("app.services.analysis_orchestrator.get_engine", lambda: test_engine)
    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_redis_client] = lambda: FakeRedis()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
