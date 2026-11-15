"""Evidence Explorer endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim, Evidence
from app.schemas.analysis import ClaimResponse, EvidenceResponse

router = APIRouter(prefix="/evidence")


@router.get("", summary="Explore verified claims and associated evidence with provenance")
def list_evidences(
    q: str | None = Query(default=None, max_length=100),
    verdict: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> dict:
    """List claims, retrieved evidence excerpts, source URLs, and stance classifications."""
    query = db.query(Claim).options(joinedload(Claim.evidences), joinedload(Claim.analysis))

    if verdict:
        query = query.filter(Claim.verdict == verdict.upper())
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(
            (Claim.claim_text.ilike(needle))
            | (Claim.reasoning.ilike(needle))
            | (Claim.evidences.any(Evidence.source_name.ilike(needle)))
            | (Claim.evidences.any(Evidence.excerpt.ilike(needle)))
        )

    total = query.count()
    claims = (
        query.order_by(Claim.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c in claims:
        items.append({
            "id": c.id,
            "analysis_id": c.analysis_id,
            "analysis_title": c.analysis.title if c.analysis else "Không xác định",
            "claim_text": c.claim_text,
            "verdict": c.verdict,
            "confidence": c.confidence,
            "confidence_metric_type": getattr(c, "confidence_metric_type", "CALIBRATED_NLI_POSTERIOR"),
            "verification_status": getattr(c, "verification_status", None),
            "model_name": getattr(c, "model_name", "TrustMedia-NLI-HybridVerifier"),
            "model_version": getattr(c, "model_version", "1.2"),
            "reasoning": c.reasoning,
            "limitations": c.limitations,
            "created_at": c.created_at.isoformat(),
            "evidences": [
                {
                    "id": e.id,
                    "source_name": e.source_name,
                    "source_url": e.source_url,
                    "excerpt": e.excerpt,
                    "stance": e.stance,
                    "reliability_score": e.reliability_score,
                    "relevance_score": getattr(e, "relevance_score", None),
                    "dataset_source": getattr(e, "dataset_source", None),
                    "dataset_record_id": getattr(e, "dataset_record_id", None),
                    "nli_relation": getattr(e, "nli_relation", None),
                    "retrieval_timestamp": e.retrieval_timestamp.isoformat(),
                }
                for e in c.evidences
            ],
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

