"""Liveness and infrastructure readiness endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.dependencies import get_db_session, get_redis_client
from app.schemas.health import HealthResponse, ReadinessResponse
from app.services.gemini_model_router import get_model_router

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthResponse, summary="Check API process health")
def health() -> HealthResponse:
    """Report process liveness without external dependencies."""
    settings = get_settings()
    return HealthResponse(status="ok", service=settings.app_name, version="0.1.0")


@router.get("/ready", response_model=ReadinessResponse, summary="Check PostgreSQL and Redis")
def readiness(
    session: Session = Depends(get_db_session),
    redis_client=Depends(get_redis_client),
) -> ReadinessResponse:
    """Report ready only when PostgreSQL and Redis both respond."""
    checks: dict[str, str] = {}
    try:
        session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception:
        logger.exception("PostgreSQL readiness probe failed")
        checks["postgres"] = "unavailable"

    try:
        redis_client.ping()
        checks["redis"] = "ok"
    except Exception:
        logger.exception("Redis readiness probe failed")
        checks["redis"] = "unavailable"

    if any(value != "ok" for value in checks.values()):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "checks": checks},
        )
    return ReadinessResponse(status="ready", checks=checks)


@router.get("/gemini", summary="Check Gemini 4 Hydrogen and Neon dual-model routing status")
def gemini_routing_health():
    """Report status of Gemini 4 Hydrogen (Primary) and Gemini 4 Neon (Critic)."""
    router_svc = get_model_router()
    return router_svc.get_routing_status()
