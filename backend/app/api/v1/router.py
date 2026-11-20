"""Version 1 API router registering all modular domain endpoints."""

from fastapi import APIRouter

from app.api.v1.routes.analyzer import get_analysis_trace, router as analyzer_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.datasets import router as datasets_router
from app.api.v1.routes.evidence import router as evidence_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.history import router as history_router
from app.api.v1.routes.opinion import router as opinion_router
from app.api.v1.routes.rag import router as rag_router
from app.api.v1.routes.reader_feedback import router as reader_feedback_router
from app.api.v1.routes.reception import router as reception_router
from app.api.v1.routes.reports import router as reports_router
from app.api.v1.routes.trust import router as trust_router

router = APIRouter()
router.include_router(health_router, tags=["system"])
router.include_router(auth_router, tags=["auth"])
router.include_router(analyzer_router, tags=["analyzer"])
router.include_router(reader_feedback_router, tags=["reader-feedback"])
router.add_api_route("/analysis/{analysis_id}/trace", get_analysis_trace, methods=["GET"], tags=["analyzer"])
router.include_router(history_router, tags=["history"])
router.include_router(dashboard_router, tags=["dashboard"])
router.include_router(evidence_router, tags=["evidence"])
router.include_router(opinion_router, tags=["opinion"])
router.include_router(trust_router, tags=["trust"])
router.include_router(reception_router, tags=["reception"])
router.include_router(reports_router, tags=["reports"])
router.include_router(datasets_router, tags=["datasets"])
router.include_router(rag_router, tags=["rag"])
