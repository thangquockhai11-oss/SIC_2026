"""Liveness and readiness API tests."""

from fastapi.testclient import TestClient

from app.database.dependencies import get_redis_client
from app.main import app


def test_health_does_not_need_external_services(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "TrustMedia AI API"


def test_ready_reports_both_dependencies(client: TestClient) -> None:
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"postgres": "ok", "redis": "ok"},
    }


def test_ready_returns_503_if_redis_fails(client: TestClient) -> None:
    class OfflineRedis:
        def ping(self) -> bool:
            raise RuntimeError("offline")

    app.dependency_overrides[get_redis_client] = lambda: OfflineRedis()
    response = client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.json()["detail"]["checks"]["redis"] == "unavailable"
