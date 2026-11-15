"""Public Trust survey management and analysis endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session
from app.database.models import PublicTrustSurvey, gen_uuid
from app.schemas.analysis import PublicTrustSurveyResponse, SurveyCreateInput

router = APIRouter(prefix="/trust")


@router.get("/surveys", response_model=list[PublicTrustSurveyResponse], summary="List public trust survey studies")
def list_surveys(db: Session = Depends(get_db_session)) -> list[PublicTrustSurveyResponse]:
    """Retrieve verified survey dataset records for public trust analysis."""
    records = db.query(PublicTrustSurvey).order_by(PublicTrustSurvey.created_at.desc()).all()
    return [
        PublicTrustSurveyResponse(
            id=r.id,
            survey_name=r.survey_name,
            sample_size=r.sample_size,
            methodology=r.methodology,
            trust_source_score=r.trust_source_score,
            trust_message_score=r.trust_message_score,
            trust_evidence_score=r.trust_evidence_score,
            demographics_breakdown=r.demographics_breakdown or {},
            findings_summary=r.findings_summary,
            limitations=r.limitations,
        )
        for r in records
    ]


@router.post("/surveys", response_model=PublicTrustSurveyResponse, summary="Register a new empirical trust survey")
def create_survey(
    data: SurveyCreateInput,
    db: Session = Depends(get_db_session),
) -> PublicTrustSurveyResponse:
    """Add a new surveyed empirical public trust study with demographic breakdowns."""
    survey = PublicTrustSurvey(
        id=gen_uuid(),
        survey_name=data.survey_name,
        sample_size=data.sample_size,
        methodology=data.methodology,
        trust_source_score=data.trust_source_score,
        trust_message_score=data.trust_message_score,
        trust_evidence_score=data.trust_evidence_score,
        demographics_breakdown=data.demographics_breakdown,
        findings_summary=data.findings_summary,
        limitations=data.limitations,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    return PublicTrustSurveyResponse(
        id=survey.id,
        survey_name=survey.survey_name,
        sample_size=survey.sample_size,
        methodology=survey.methodology,
        trust_source_score=survey.trust_source_score,
        trust_message_score=survey.trust_message_score,
        trust_evidence_score=survey.trust_evidence_score,
        demographics_breakdown=survey.demographics_breakdown or {},
        findings_summary=survey.findings_summary,
        limitations=survey.limitations,
    )

