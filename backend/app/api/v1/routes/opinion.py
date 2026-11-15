"""Public Opinion analysis endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session
from app.database.models import PublicOpinion
from app.schemas.analysis import OpinionAnalyzeInput, PublicOpinionResponse
from app.services.public_opinion_agent import public_opinion_agent

router = APIRouter(prefix="/opinion")


@router.post("/analyze", response_model=PublicOpinionResponse, summary="Analyze public comments sentiment, stance, and emotion")
def analyze_comments(data: OpinionAnalyzeInput) -> PublicOpinionResponse:
    """Analyze a batch of public discussion comments with clear sentiment vs stance separation."""
    raw_res, _ = public_opinion_agent.analyze(content=data.topic or "", comments=data.comments)
    return PublicOpinionResponse(
        id="adhoc-opinion-" + str(len(data.comments)),
        topic=data.topic or "Bình luận người dùng",
        sample_size=len(data.comments),
        sentiment_positive=raw_res["sentiment_positive"],
        sentiment_neutral=raw_res["sentiment_neutral"],
        sentiment_negative=raw_res["sentiment_negative"],
        sentiment_mixed=raw_res["sentiment_mixed"],
        stance_support=raw_res["stance_support"],
        stance_oppose=raw_res["stance_oppose"],
        stance_discuss=raw_res["stance_discuss"],
        stance_neutral=raw_res["stance_neutral"],
        top_emotions=raw_res["top_emotions"],
        discussion_summary=raw_res["discussion_summary"],
        raw_comments_sample=raw_res["raw_comments_sample"],
    )


@router.get("/latest", response_model=list[PublicOpinionResponse], summary="List recent opinion analyses")
def get_latest_opinions(db: Session = Depends(get_db_session)) -> list[PublicOpinionResponse]:
    """Retrieve recent opinion records from database."""
    records = db.query(PublicOpinion).order_by(PublicOpinion.created_at.desc()).limit(10).all()
    return [
        PublicOpinionResponse(
            id=r.id,
            topic=r.topic,
            sample_size=r.sample_size,
            sentiment_positive=r.sentiment_positive,
            sentiment_neutral=r.sentiment_neutral,
            sentiment_negative=r.sentiment_negative,
            sentiment_mixed=r.sentiment_mixed,
            stance_support=r.stance_support,
            stance_oppose=r.stance_oppose,
            stance_discuss=r.stance_discuss,
            stance_neutral=r.stance_neutral,
            top_emotions=r.top_emotions or {},
            discussion_summary=r.discussion_summary,
            raw_comments_sample=r.raw_comments_sample,
        )
        for r in records
    ]

