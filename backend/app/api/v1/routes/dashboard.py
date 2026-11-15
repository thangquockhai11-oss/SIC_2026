"""Dashboard analytics endpoints backed by real database models."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim, PublicOpinion
from app.schemas.analysis import DashboardStatsResponse

router = APIRouter(prefix="/dashboard")


@router.get("/stats", response_model=DashboardStatsResponse, summary="Get aggregate research dashboard metrics")
def get_dashboard_stats(db: Session = Depends(get_db_session)) -> DashboardStatsResponse:
    """Compute live dashboard metrics directly from the database."""
    total_analyses = db.query(Analysis).count()
    completed_analyses = db.query(Analysis).filter(Analysis.status == "COMPLETED").count()
    failed_analyses = db.query(Analysis).filter(Analysis.status == "FAILED").count()
    total_claims = db.query(Claim).count()

    # Average confidence score across completed analyses
    avg_conf_row = db.query(func.avg(Analysis.confidence_score)).filter(Analysis.status == "COMPLETED").scalar()
    average_confidence = round(float(avg_conf_row or 0.0), 3)

    # Sentiment distribution aggregated from PublicOpinion records
    opinion_rows = db.query(PublicOpinion).all()
    if opinion_rows:
        pos = sum(o.sentiment_positive for o in opinion_rows) / len(opinion_rows)
        neu = sum(o.sentiment_neutral for o in opinion_rows) / len(opinion_rows)
        neg = sum(o.sentiment_negative for o in opinion_rows) / len(opinion_rows)
        mix = sum(o.sentiment_mixed for o in opinion_rows) / len(opinion_rows)
        sentiment_dist = {
            "Tích cực (Positive)": round(pos * 100, 1),
            "Trung lập (Neutral)": round(neu * 100, 1),
            "Tiêu cực (Negative)": round(neg * 100, 1),
            "Hỗn hợp (Mixed)": round(mix * 100, 1),
        }

        sup = sum(o.stance_support for o in opinion_rows) / len(opinion_rows)
        opp = sum(o.stance_oppose for o in opinion_rows) / len(opinion_rows)
        dis = sum(o.stance_discuss for o in opinion_rows) / len(opinion_rows)
        st_neu = sum(o.stance_neutral for o in opinion_rows) / len(opinion_rows)
        stance_dist = {
            "Ủng hộ (Support)": round(sup * 100, 1),
            "Phản đối (Oppose)": round(opp * 100, 1),
            "Thảo luận (Discuss)": round(dis * 100, 1),
            "Không liên quan (Neutral)": round(st_neu * 100, 1),
        }
    else:
        sentiment_dist = {
            "Tích cực (Positive)": 0.0,
            "Trung lập (Neutral)": 0.0,
            "Tiêu cực (Negative)": 0.0,
            "Hỗn hợp (Mixed)": 0.0,
        }
        stance_dist = {
            "Ủng hộ (Support)": 0.0,
            "Phản đối (Oppose)": 0.0,
            "Thảo luận (Discuss)": 0.0,
            "Không liên quan (Neutral)": 0.0,
        }

    # Recent activities (last 5)
    recent = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(5)
        .all()
    )
    recent_activities = [
        {
            "id": a.id,
            "title": a.title,
            "verdict": a.verdict or "Đang xử lý",
            "status": a.status,
            "confidence": round(a.confidence_score or 0.0, 2),
            "created_at": a.created_at.isoformat(),
        }
        for a in recent
    ]

    # Chart data for trends: count by verdict
    supported_cnt = db.query(Claim).filter(Claim.verdict == "SUPPORTED").count()
    refuted_cnt = db.query(Claim).filter(Claim.verdict == "REFUTED").count()
    insufficient_cnt = db.query(Claim).filter(Claim.verdict == "NOT_ENOUGH_INFORMATION").count()
    not_checkable_cnt = db.query(Claim).filter(Claim.verdict == "NOT_CHECKABLE").count()

    chart_data = [
        {"name": "Bác bỏ (Refuted)", "count": refuted_cnt, "color": "#e05252"},
        {"name": "Xác thực (Supported)", "count": supported_cnt, "color": "#22a06b"},
        {"name": "Thiếu thông tin (Inconclusive)", "count": insufficient_cnt, "color": "#e5a122"},
        {"name": "Không thể kiểm chứng", "count": not_checkable_cnt, "color": "#8898aa"},
    ]

    return DashboardStatsResponse(
        total_analyses=total_analyses,
        completed_analyses=completed_analyses,
        failed_analyses=failed_analyses,
        total_claims=total_claims,
        average_confidence=average_confidence,
        sentiment_distribution=sentiment_dist,
        stance_distribution=stance_dist,
        recent_activities=recent_activities,
        chart_data=chart_data,
    )

