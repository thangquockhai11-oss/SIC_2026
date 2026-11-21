"""News Analyzer endpoints: submit, polling, and results."""

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_optional_current_user
from app.database.dependencies import get_db_session
from app.database.models import (
    Analysis,
    Claim,
    Evidence,
    InformationReception,
    MediaCredibility,
    PublicOpinion,
    PublicTrustSurvey,
    User,
    gen_uuid,
)
from app.schemas.analysis import (
    AgentExecutionResponse,
    AnalysisCreate,
    AnalysisDetailResponse,
    AnalysisStatusResponse,
    ClaimResponse,
    EvidenceResponse,
    InformationReceptionResponse,
    MediaCredibilityResponse,
    PublicOpinionResponse,
    PublicTrustSurveyResponse,
)
from app.services.analysis_orchestrator import process_analysis_job_async
from app.services.url_extractor import fetch_and_extract_article

router = APIRouter(prefix="/analyzer")
logger = logging.getLogger(__name__)


@router.post(
    "/submit",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=AnalysisStatusResponse,
    summary="Submit article or URL for asynchronous multi-agent analysis",
)
def submit_analysis(
    data: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> AnalysisStatusResponse:
    """Validate article inputs, create database analysis entity, and enqueue background AI processing."""
    title = data.title.strip() if data.title else None
    content = data.content.strip() if data.content else None
    source_url = data.source_url.strip() if data.source_url else None

    # If URL is provided, fetch and extract safely if content or title is missing
    if source_url and (not content or not title):
        try:
            extracted_title, extracted_body = fetch_and_extract_article(source_url)
            if not title:
                title = extracted_title
            if not content:
                content = extracted_body
        except ValueError as e:
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"URL Extraction Error: {str(e)}",
                ) from e

    if not content or len(content) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nội dung bài viết tối thiểu 5 ký tự hoặc cần cung cấp URL bài báo hợp lệ.",
        )

    if not title:
        title = content[:80] + ("..." if len(content) > 80 else "")

    analysis = Analysis(
        id=gen_uuid(),
        user_id=current_user.id if current_user else None,
        title=title,
        source_url=source_url,
        content=content,
        language=data.language,
        scope=data.scope,
        status="PENDING",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Queue background processing
    background_tasks.add_task(
        process_analysis_job_async,
        analysis.id,
        title,
        content,
        source_url,
        data.language,
        data.scope,
    )

    return AnalysisStatusResponse(
        id=analysis.id,
        status="PROCESSING",
        error_message=None,
        progress_percent=15,
        created_at=analysis.created_at,
    )


@router.get(
    "/jobs/{analysis_id}",
    response_model=AnalysisStatusResponse,
    summary="Poll status of analysis job",
)
def get_analysis_status(
    analysis_id: str,
    db: Annotated[Session, Depends(get_db_session)],
) -> AnalysisStatusResponse:
    """Poll job status for non-blocking UI tracking."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found",
        )

    progress = 100 if analysis.status == "COMPLETED" else 10 if analysis.status == "PENDING" else 65
    if analysis.status == "FAILED":
        progress = 100

    return AnalysisStatusResponse(
        id=analysis.id,
        status=analysis.status,
        error_message=analysis.error_message,
        progress_percent=progress,
        created_at=analysis.created_at,
    )


@router.get(
    "/{analysis_id}",
    response_model=AnalysisDetailResponse,
    summary="Get complete analysis report",
)
def get_analysis_detail(
    analysis_id: str,
    db: Annotated[Session, Depends(get_db_session)],
) -> AnalysisDetailResponse:
    """Return full analysis results across all specialized agents."""
    analysis = (
        db.query(Analysis)
        .options(
            joinedload(Analysis.claims).joinedload(Claim.evidences),
            joinedload(Analysis.credibility),
            joinedload(Analysis.opinion),
            joinedload(Analysis.survey),
            joinedload(Analysis.reception),
            joinedload(Analysis.agent_executions),
        )
        .filter(Analysis.id == analysis_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    fc_claims_map: dict[str, Any] = {}
    if analysis.fact_checking_report:
        report_data = analysis.fact_checking_report
        if isinstance(report_data, str):
            try:
                report_data = json.loads(report_data)
            except Exception:
                report_data = {}
        if isinstance(report_data, dict):
            for rc in report_data.get("claims", []) or report_data.get("verified_claims", []):
                key = rc.get("claim_id") or rc.get("claim_text")
                if key:
                    fc_claims_map[key] = rc

    claims_resp = []
    for c in analysis.claims:
        evs = [
            EvidenceResponse(
                id=e.id,
                source_name=e.source_name,
                source_url=e.source_url,
                excerpt=e.excerpt,
                stance=e.stance,
                evidence_type=getattr(e, "evidence_type", "DIRECT") or "DIRECT",
                publication_date=getattr(e, "publication_date", None),
                provenance=getattr(e, "provenance", None),
                reliability_score=e.reliability_score,
                relevance_score=getattr(e, "relevance_score", 0.0) or 0.0,
                dataset_source=getattr(e, "dataset_source", None),
                dataset_record_id=getattr(e, "dataset_record_id", None),
                nli_relation=getattr(e, "nli_relation", None),
                retrieval_timestamp=e.retrieval_timestamp,
            )
            for e in c.evidences
        ]

        rich_info = fc_claims_map.get(c.id) or fc_claims_map.get(c.claim_text) or {}
        if not rich_info.get("evidence_gap"):
            from app.services.gemini_nlp_service import gemini_nlp_service
            synthesis = gemini_nlp_service.align_and_synthesize(
                claim_text=c.claim_text,
                candidates=[{"excerpt": e.excerpt, "source_name": e.source_name, "source_url": e.source_url} for e in c.evidences],
                article_title=analysis.title or "",
                article_content=analysis.content or "",
                claim_type=getattr(c, "claim_type", "FACTUAL_CLAIM"),
            )
            rich_info = {
                "article_quote": synthesis.article_quote,
                "article_highlight": synthesis.article_highlight,
                "article_quote_highlight": synthesis.article_highlight,
                "evidence_quote": synthesis.evidence_quote,
                "evidence_highlight": synthesis.evidence_highlight,
                "evidence_quote_highlight": synthesis.evidence_highlight,
                "evidence_source": synthesis.evidence_source,
                "evidence_url": synthesis.evidence_url,
                "protocol_standard": synthesis.protocol_standard,
                "compatibility_score": synthesis.compatibility_score,
                "decisive_reasoning": synthesis.decisive_reasoning,
                "evidence_gap": {
                    "t1_title": synthesis.gap_t1_title,
                    "t1_desc": synthesis.gap_t1_desc,
                    "t1_status": synthesis.gap_t1_status,
                    "t2_title": synthesis.gap_t2_title,
                    "t2_desc": synthesis.gap_t2_desc,
                    "t2_status": synthesis.gap_t2_status,
                    "t3_title": synthesis.gap_t3_title,
                    "t3_desc": synthesis.gap_t3_desc,
                    "t3_status": synthesis.gap_t3_status,
                    "t4_desc": synthesis.gap_t4_desc,
                    "claim_verdict": synthesis.gap_t4_status,
                },
                "review_board": {
                    "classification": synthesis.classification,
                    "classification_desc": synthesis.classification_desc,
                    "harm_level": synthesis.harm_level,
                    "harm_desc": synthesis.harm_desc,
                    "signatories": "Hội đồng Thẩm định Báo chí TrustMedia",
                },
            }

        claims_resp.append(
            ClaimResponse(
                id=c.id,
                claim_text=c.claim_text,
                original_text=getattr(c, "original_text", c.claim_text),
                normalized_claim=getattr(c, "normalized_claim", c.claim_text),
                claim_type=getattr(c, "claim_type", "FACTUAL_CLAIM") or "FACTUAL_CLAIM",
                subject=getattr(c, "subject", None),
                predicate=getattr(c, "predicate", None),
                object=getattr(c, "object", None),
                date_or_time_period=getattr(c, "date_or_time_period", None),
                location=getattr(c, "location", None),
                entities=getattr(c, "entities", None),
                numerical_values=getattr(c, "numerical_values", None),
                checkability=getattr(c, "checkability", True) if getattr(c, "checkability", None) is not None else True,
                verdict=c.verdict,
                confidence=c.confidence,
                reasoning=rich_info.get("decisive_reasoning") or c.reasoning,
                limitations=c.limitations,
                model_name=getattr(c, "model_name", None),
                model_version=getattr(c, "model_version", None),
                confidence_metric_type=getattr(c, "confidence_metric_type", "Calibrated Posterior Probability"),
                verification_status=getattr(c, "verification_status", "VERIFIED"),
                evidences=evs,
                article_quote=rich_info.get("article_quote") or c.claim_text,
                article_highlight=rich_info.get("article_highlight") or c.claim_text[:35],
                article_quote_highlight=rich_info.get("article_quote_highlight") or c.claim_text[:35],
                evidence_quote=rich_info.get("evidence_quote") or (evs[0].excerpt if evs else "Chưa có bằng chứng độc lập."),
                evidence_highlight=rich_info.get("evidence_highlight") or (evs[0].excerpt[:35] if evs else ""),
                evidence_quote_highlight=rich_info.get("evidence_quote_highlight") or (evs[0].excerpt[:35] if evs else ""),
                evidence_source=rich_info.get("evidence_source") or (evs[0].source_name if evs else "Hệ thống đối chuẩn TrustMedia"),
                evidence_url=rich_info.get("evidence_url") or (evs[0].source_url if evs else None),
                protocol_standard=rich_info.get("protocol_standard") or "IFCN Standard v2.4",
                compatibility_score=rich_info.get("compatibility_score") or f"{int(c.confidence*100)}%",
                decisive_reasoning=rich_info.get("decisive_reasoning") or c.reasoning,
                evidence_gap=rich_info.get("evidence_gap"),
                review_board=rich_info.get("review_board"),
            )
        )

    cred_resp = None
    if analysis.credibility:
        cred_resp = MediaCredibilityResponse(
            id=analysis.credibility.id,
            source_name=analysis.credibility.source_name,
            domain=analysis.credibility.domain,
            transparency_score=analysis.credibility.transparency_score,
            citation_score=analysis.credibility.citation_score,
            evidence_score=analysis.credibility.evidence_score,
            journalistic_standard_score=analysis.credibility.journalistic_standard_score,
            overall_credibility_score=analysis.credibility.overall_credibility_score,
            reasoning=analysis.credibility.reasoning,
        )

    opinion_resp = None
    if analysis.opinion:
        opinion_resp = PublicOpinionResponse(
            id=analysis.opinion.id,
            topic=analysis.opinion.topic,
            sample_size=analysis.opinion.sample_size,
            sentiment_positive=analysis.opinion.sentiment_positive,
            sentiment_neutral=analysis.opinion.sentiment_neutral,
            sentiment_negative=analysis.opinion.sentiment_negative,
            sentiment_mixed=analysis.opinion.sentiment_mixed,
            stance_support=analysis.opinion.stance_support,
            stance_oppose=analysis.opinion.stance_oppose,
            stance_discuss=analysis.opinion.stance_discuss,
            stance_neutral=analysis.opinion.stance_neutral,
            top_emotions=analysis.opinion.top_emotions or {},
            discussion_summary=analysis.opinion.discussion_summary,
            raw_comments_sample=analysis.opinion.raw_comments_sample,
        )

    survey_resp = None
    if analysis.survey:
        survey_resp = PublicTrustSurveyResponse(
            id=analysis.survey.id,
            survey_name=analysis.survey.survey_name,
            sample_size=analysis.survey.sample_size,
            methodology=analysis.survey.methodology,
            trust_source_score=analysis.survey.trust_source_score,
            trust_message_score=analysis.survey.trust_message_score,
            trust_evidence_score=analysis.survey.trust_evidence_score,
            demographics_breakdown=analysis.survey.demographics_breakdown or {},
            findings_summary=analysis.survey.findings_summary,
            limitations=analysis.survey.limitations,
        )

    reception_resp = None
    if analysis.reception:
        reception_resp = InformationReceptionResponse(
            id=analysis.reception.id,
            sample_size=analysis.reception.sample_size,
            comprehension_score=analysis.reception.comprehension_score,
            claim_identification_rate=analysis.reception.claim_identification_rate,
            acceptance_rate=analysis.reception.acceptance_rate,
            sharing_intention_high=analysis.reception.sharing_intention_high,
            sharing_intention_medium=analysis.reception.sharing_intention_medium,
            sharing_intention_low=analysis.reception.sharing_intention_low,
            verify_before_sharing_rate=analysis.reception.verify_before_sharing_rate,
            cognitive_resistance_notes=analysis.reception.cognitive_resistance_notes,
        )

    agent_executions_resp = [
        AgentExecutionResponse(
            id=a.id,
            execution_id=getattr(a, "execution_id", a.id),
            agent_name=a.agent_name,
            agent_role=a.agent_role,
            status=a.status,
            latency_ms=a.latency_ms,
            execution_time_ms=getattr(a, "execution_time_ms", a.latency_ms),
            model_name=getattr(a, "model_name", None),
            model_version=getattr(a, "model_version", None),
            dataset_ids=getattr(a, "dataset_ids", None),
            dataset_versions=getattr(a, "dataset_versions", None),
            evidence_ids=getattr(a, "evidence_ids", None),
            retrieval_count=getattr(a, "retrieval_count", 0) or 0,
            start_time=getattr(a, "start_time", None),
            end_time=getattr(a, "end_time", None),
            result_summary=a.result_summary,
            disagreement_detected=a.disagreement_detected,
            errors=getattr(a, "errors", None),
            output=getattr(a, "output", None),
            details=a.details,
        )
        for a in analysis.agent_executions
    ]

    return AnalysisDetailResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        title=analysis.title,
        source_url=analysis.source_url,
        content=analysis.content,
        language=analysis.language,
        scope=analysis.scope,
        status=analysis.status,
        error_message=analysis.error_message,
        summary=analysis.summary,
        verdict=analysis.verdict,
        confidence_score=analysis.confidence_score,
        fact_checking_report=getattr(analysis, "fact_checking_report", None),
        ai_provider=analysis.ai_provider,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
        claims=claims_resp,
        credibility=cred_resp,
        opinion=opinion_resp,
        survey=survey_resp,
        reception=reception_resp,
        agent_executions=agent_executions_resp,
    )


@router.get(
    "/{analysis_id}/trace",
    summary="Get detailed agent execution traces and model provenance",
)
def get_analysis_trace(
    analysis_id: str,
    db: Annotated[Session, Depends(get_db_session)],
) -> dict:
    """Retrieve full execution audit trace for all agents that ran for this analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID {analysis_id} not found",
        )

    traces = [
        {
            "id": a.id,
            "execution_id": getattr(a, "execution_id", a.id),
            "agent_name": a.agent_name,
            "agent_role": a.agent_role,
            "status": a.status,
            "latency_ms": a.latency_ms,
            "execution_time_ms": getattr(a, "execution_time_ms", a.latency_ms),
            "model_name": getattr(a, "model_name", None),
            "model_version": getattr(a, "model_version", None),
            "dataset_ids": getattr(a, "dataset_ids", None) or [],
            "dataset_versions": getattr(a, "dataset_versions", None) or {},
            "evidence_ids": getattr(a, "evidence_ids", None) or [],
            "retrieval_count": getattr(a, "retrieval_count", 0) or 0,
            "start_time": a.start_time.isoformat() if getattr(a, "start_time", None) else None,
            "end_time": a.end_time.isoformat() if getattr(a, "end_time", None) else None,
            "result_summary": a.result_summary,
            "disagreement_detected": a.disagreement_detected,
            "errors": getattr(a, "errors", None),
            "output": getattr(a, "output", None),
        }
        for a in analysis.agent_executions
    ]

    total_time = sum(t["execution_time_ms"] for t in traces)

    return {
        "analysis_id": analysis.id,
        "total_latency_ms": total_time,
        "traces": traces,
    }


@router.get(
    "/models/catalog",
    summary="Get registered AI models, versions, and loading statuses",
)
def get_model_catalog() -> list[dict]:
    """Return model registry catalog with training provenance and metrics."""
    from app.services.model_manager import model_manager
    return model_manager.list_models()


@router.get(
    "/analysis/{analysis_id}/evidence",
    summary="Get all retrieved evidence records and provenance for an analysis",
)
def get_analysis_evidence(
    analysis_id: str,
    db: Session = Depends(get_db_session),
) -> dict:
    """Return verified evidence records with source URL, stance, and dataset provenance."""
    analysis = (
        db.query(Analysis)
        .options(joinedload(Analysis.claims).joinedload(Claim.evidences))
        .filter(Analysis.id == analysis_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy bài phân tích ID: {analysis_id}",
        )

    evidences_list = []
    for c in analysis.claims:
        for ev in c.evidences:
            evidences_list.append({
                "id": ev.id,
                "claim_id": c.id,
                "claim_text": c.claim_text,
                "claim_verdict": c.verdict,
                "source_name": ev.source_name,
                "source_url": ev.source_url,
                "excerpt": ev.excerpt,
                "stance": ev.stance,
                "reliability_score": ev.reliability_score,
                "relevance_score": ev.relevance_score,
                "dataset_source": ev.dataset_source,
                "dataset_record_id": ev.dataset_record_id,
                "nli_relation": ev.nli_relation,
                "retrieval_timestamp": ev.retrieval_timestamp.isoformat() if ev.retrieval_timestamp else None,
            })

    return {
        "analysis_id": analysis.id,
        "title": analysis.title,
        "total_claims": len(analysis.claims),
        "total_evidences": len(evidences_list),
        "evidences": evidences_list,
    }


