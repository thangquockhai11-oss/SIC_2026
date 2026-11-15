"""Analysis History endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_optional_current_user
from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim, User
from app.schemas.analysis import AnalysisListItem, AnalysisListResponse

router = APIRouter(prefix="/history")


@router.get("", response_model=AnalysisListResponse, summary="List past analyses with filtering and search")
def list_history(
    q: str | None = Query(default=None, max_length=100),
    status_filter: str | None = Query(default=None, alias="status"),
    scope: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> AnalysisListResponse:
    """Search and filter analysis history."""
    query = db.query(Analysis)

    if status_filter:
        query = query.filter(Analysis.status == status_filter.upper())
    if scope:
        query = query.filter(Analysis.scope == scope)
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(
            (Analysis.title.ilike(needle))
            | (Analysis.content.ilike(needle))
            | (Analysis.source_url.ilike(needle))
            | (Analysis.summary.ilike(needle))
        )

    total = query.count()
    records = (
        query.order_by(Analysis.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for r in records:
        claims_count = db.query(Claim).filter(Claim.analysis_id == r.id).count()
        items.append(
            AnalysisListItem(
                id=r.id,
                title=r.title,
                source_url=r.source_url,
                verdict=r.verdict,
                confidence_score=r.confidence_score,
                status=r.status,
                ai_provider=r.ai_provider,
                created_at=r.created_at,
                claims_count=claims_count,
            )
        )

    return AnalysisListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{analysis_id}", summary="Delete an analysis record")
def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db_session),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> dict[str, str]:
    """Delete an analysis. Requires owner or admin privilege."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    if current_user and current_user.role != "admin" and analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this record",
        )

    db.delete(analysis)
    db.commit()
    return {"status": "ok", "message": f"Analysis {analysis_id} deleted successfully"}

