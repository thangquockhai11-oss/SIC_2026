"""News Analyzer endpoints: submit, polling, and results."""

import hashlib
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_optional_current_user
from app.database.dependencies import get_db_session
from app.database.models import (
    AgentExecution,
    Analysis,
    ArticleSnapshot,
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
    ArticleSnapshotResponse,
    ClaimResponse,
    EvidenceResponse,
    InformationReceptionResponse,
    MediaCredibilityResponse,
    PublicOpinionResponse,
    PublicTrustSurveyResponse,
)
from app.services.analysis_orchestrator import process_analysis_job_async
from app.services.url_extractor import fetch_and_extract_article_details

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
    extracted_details = None

    # If URL is provided, fetch and extract safely
    if source_url:
        try:
            extracted_details = fetch_and_extract_article_details(source_url)
            status_code = extracted_details.get("extraction_status")
            if status_code == "PAYWALL_DETECTED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PAYWALL_DETECTED: Trang báo yêu cầu trả phí hoặc đăng ký hội viên (Paywall). Không thể truy xuất nội dung toàn văn.",
                )
            if status_code == "TITLE_ONLY_EXTRACTED" and (not content or len(content) < 40):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="TITLE_ONLY_EXTRACTED: Chỉ đọc được tiêu đề bài báo, phần thân bài không tải được hoặc cần xử lý JavaScript.",
                )

            if not title:
                title = extracted_details["title"]
            if not content:
                content = extracted_details["body"]
        except ValueError as e:
            if not content or len(content) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"URL Extraction Error: {str(e)}",
                ) from e
            logger.info("URL Extraction notice: %s; using user-provided content.", e)
            extracted_details = {
                "title": title or content[:80],
                "body": content,
                "paragraphs": [p.strip() for p in content.split("\n\n") if len(p.strip()) > 10],
                "final_url": source_url,
                "author": None,
                "published_date": None,
                "source_links": [],
                "extraction_status": "FIXTURE_FALLBACK",
                "is_verified_online": False,
            }

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
    db.flush()

    # Create and save paragraph-level ArticleSnapshot
    paragraphs = []
    if extracted_details and extracted_details.get("paragraphs"):
        paragraphs = extracted_details["paragraphs"]
    else:
        paragraphs = [p.strip() for p in content.split("\n\n") if len(p.strip()) > 10]
        if not paragraphs:
            paragraphs = [content]

    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    snapshot_url = source_url or "direct-input://" + analysis.id
    prev_snapshots = (
        db.query(ArticleSnapshot)
        .filter(ArticleSnapshot.source_url == snapshot_url)
        .order_by(ArticleSnapshot.version.desc())
        .all()
    )
    version = (prev_snapshots[0].version + 1) if prev_snapshots else 1

    snapshot = ArticleSnapshot(
        id=gen_uuid(),
        analysis_id=analysis.id,
        source_url=snapshot_url,
        final_url=extracted_details.get("final_url", source_url) if extracted_details else source_url,
        title=title,
        author=extracted_details.get("author") if extracted_details else None,
        published_date=extracted_details.get("published_date") if extracted_details else None,
        extraction_status=extracted_details.get("extraction_status", "SUCCESS") if extracted_details else "SUCCESS",
        paragraphs=paragraphs,
        source_links=extracted_details.get("source_links", []) if extracted_details else [],
        content_hash=content_hash,
        version=version,
        is_verified_online=extracted_details.get("is_verified_online", True) if extracted_details else False,
    )
    db.add(snapshot)
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
    "/snapshots",
    response_model=list[ArticleSnapshotResponse],
    summary="Query article snapshots and version history by URL",
)
def get_article_snapshots_by_url(
    url: str = Query(..., description="Source or final URL to inspect version history"),
    db: Session = Depends(get_db_session),
) -> list[ArticleSnapshotResponse]:
    """Retrieve all historical snapshots for an article URL to verify changes over time."""
    clean_url = url.strip()
    records = (
        db.query(ArticleSnapshot)
        .filter(
            (ArticleSnapshot.source_url == clean_url)
            | (ArticleSnapshot.final_url == clean_url)
        )
        .order_by(ArticleSnapshot.version.desc())
        .all()
    )
    return [
        ArticleSnapshotResponse(
            id=s.id,
            analysis_id=s.analysis_id,
            source_url=s.source_url,
            final_url=s.final_url,
            title=s.title,
            author=s.author,
            published_date=s.published_date,
            extraction_status=s.extraction_status,
            paragraphs=s.paragraphs or [],
            source_links=s.source_links or [],
            version=s.version,
            is_verified_online=s.is_verified_online,
            created_at=s.created_at,
        )
        for s in records
    ]


@router.get(
    "/models",
    summary="Get registered AI models, versions, and loading statuses",
)
@router.get(
    "/models/catalog",
    summary="Get registered AI models, versions, and loading statuses",
)
def get_model_catalog() -> list[dict]:
    """Return model registry catalog with training provenance and metrics."""
    from app.services.model_manager import model_manager
    return model_manager.list_models()


@router.post("/claims/{claim_id}/find-references", summary="Find matching passages for claim with 5D comparison")
def analyzer_find_claim_references(
    claim_id: str,
    payload: dict | None = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Find references, perform 5D entity comparison, group syndicated copies, detect conflicts."""
    from app.services.evidence_library_service import evidence_library_service
    target_url = payload.get("target_url") if payload else None
    try:
        return evidence_library_service.find_claim_references(claim_id=claim_id, db=db, target_url=target_url)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/claims/{claim_id}/rerun", summary="Rerun verification for a claim with optional new source")
def analyzer_rerun_claim_verification(
    claim_id: str,
    payload: dict | None = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Rerun claim verification with an additional source."""
    from app.services.evidence_library_service import evidence_library_service
    new_url = payload.get("new_source_url") if payload else None
    new_text = payload.get("new_source_text") if payload else None
    try:
        return evidence_library_service.rerun_claim_verification(
            claim_id=claim_id,
            new_source_url=new_url,
            new_source_text=new_text,
            db=db,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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

    claims_resp = []
    for c in analysis.claims:
        evs = [
            EvidenceResponse(
                id=e.id,
                source_name=e.source_name,
                source_url=e.source_url,
                excerpt=e.excerpt,
                stance=e.stance,
                reliability_score=e.reliability_score,
                relevance_score=getattr(e, "relevance_score", 0.0) or 0.0,
                dataset_source=getattr(e, "dataset_source", None),
                dataset_record_id=getattr(e, "dataset_record_id", None),
                nli_relation=getattr(e, "nli_relation", None),
                retrieval_timestamp=e.retrieval_timestamp,
            )
            for e in c.evidences
        ]
        claims_resp.append(
            ClaimResponse(
                id=c.id,
                claim_text=c.claim_text,
                original_sentence=getattr(c, "original_sentence", None) or c.claim_text,
                paragraph_id=getattr(c, "paragraph_id", 0),
                verdict=c.verdict,
                confidence=c.confidence,
                reasoning=c.reasoning,
                limitations=c.limitations,
                model_name=getattr(c, "model_name", None),
                model_version=getattr(c, "model_version", None),
                confidence_metric_type=getattr(c, "confidence_metric_type", "Calibrated Posterior Probability"),
                verification_status=getattr(c, "verification_status", "VERIFIED"),
                evidences=evs,
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
            outlet_profile=analysis.credibility.outlet_profile,
            article_quality=analysis.credibility.article_quality,
            outlet_summary=analysis.credibility.outlet_summary,
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

    # Fetch snapshots for this analysis and URL history
    snapshots_db = (
        db.query(ArticleSnapshot)
        .filter(
            (ArticleSnapshot.analysis_id == analysis.id)
            | (ArticleSnapshot.source_url == (analysis.source_url or "direct-input://" + analysis.id))
        )
        .order_by(ArticleSnapshot.version.desc())
        .all()
    )
    snapshots_resp = [
        ArticleSnapshotResponse(
            id=s.id,
            analysis_id=s.analysis_id,
            source_url=s.source_url,
            final_url=s.final_url,
            title=s.title,
            author=s.author,
            published_date=s.published_date,
            extraction_status=s.extraction_status,
            paragraphs=s.paragraphs or [],
            source_links=s.source_links or [],
            version=s.version,
            is_verified_online=s.is_verified_online,
            created_at=s.created_at,
        )
        for s in snapshots_db
    ]
    current_snapshot = next((s for s in snapshots_resp if s.analysis_id == analysis.id), snapshots_resp[0] if snapshots_resp else None)

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
        ai_provider=analysis.ai_provider,
        created_at=analysis.created_at,
        completed_at=analysis.completed_at,
        claims=claims_resp,
        credibility=cred_resp,
        opinion=opinion_resp,
        survey=survey_resp,
        reception=reception_resp,
        agent_executions=agent_executions_resp,
        snapshot=current_snapshot,
        snapshots=snapshots_resp,
    )


@router.get(
    "/{analysis_id}/snapshot",
    response_model=ArticleSnapshotResponse,
    summary="Get exact article text snapshot extracted for this analysis",
)
def get_analysis_snapshot(
    analysis_id: str,
    db: Session = Depends(get_db_session),
) -> ArticleSnapshotResponse:
    """Retrieve exact parsed paragraphs and metadata for an analysis."""
    snap = (
        db.query(ArticleSnapshot)
        .filter(ArticleSnapshot.analysis_id == analysis_id)
        .first()
    )
    if not snap:
        # Fallback to analysis content
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        paras = [p.strip() for p in analysis.content.split("\n\n") if p.strip()]
        return ArticleSnapshotResponse(
            id=gen_uuid(),
            analysis_id=analysis.id,
            source_url=analysis.source_url or "direct-input://" + analysis.id,
            final_url=analysis.source_url,
            title=analysis.title,
            paragraphs=paras,
            source_links=[],
            version=1,
            extraction_status="SUCCESS",
            is_verified_online=True,
            created_at=analysis.created_at,
        )
    return ArticleSnapshotResponse(
        id=snap.id,
        analysis_id=snap.analysis_id,
        source_url=snap.source_url,
        final_url=snap.final_url,
        title=snap.title,
        author=snap.author,
        published_date=snap.published_date,
        extraction_status=snap.extraction_status,
        paragraphs=snap.paragraphs or [],
        source_links=snap.source_links or [],
        version=snap.version,
        is_verified_online=snap.is_verified_online,
        created_at=snap.created_at,
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


