"""Background worker and orchestrator for analysis jobs."""

from datetime import datetime, timezone
import logging

from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import (
    AgentExecution,
    Analysis,
    Claim,
    Evidence,
    EvidenceRecord,
    InformationReception,
    MediaCredibility,
    PublicOpinion,
    PublicTrustSurvey,
    gen_uuid,
    utc_now,
)
from app.services.ai_engine import run_multi_agent_analysis

logger = logging.getLogger(__name__)


async def process_analysis_job_async(
    analysis_id: str,
    title: str,
    content: str,
    source_url: str | None,
    language: str,
    scope: str,
) -> None:
    """Run multi-agent analysis and save complete domain models to database."""
    engine = get_engine()
    with Session(engine) as session:
        analysis = session.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            logger.error("Analysis %s not found for processing", analysis_id)
            return

        try:
            analysis.status = "PROCESSING"
            session.commit()

            # Execute AI multi-agent pipeline
            result = await run_multi_agent_analysis(
                title=title,
                content=content,
                source_url=source_url,
                language=language,
                scope=scope,
            )

            # Update analysis root
            analysis.summary = result["summary"]
            analysis.verdict = result["verdict"]
            analysis.confidence_score = result["confidence_score"]
            analysis.ai_provider = result["ai_provider"]
            analysis.status = "COMPLETED"
            analysis.completed_at = utc_now()

            # Save Claims & Evidences
            for c_data in result.get("claims", []):
                claim = Claim(
                    id=c_data.get("claim_id") or gen_uuid(),
                    analysis_id=analysis.id,
                    claim_text=c_data["claim_text"],
                    verdict=c_data["verdict"],
                    confidence=c_data["confidence"],
                    reasoning=c_data["reasoning"],
                    limitations=c_data.get("limitations"),
                    model_name=c_data.get("model_name"),
                    model_version=c_data.get("model_version"),
                    confidence_metric_type=c_data.get("confidence_metric_type", "Calibrated Posterior Probability"),
                    verification_status=c_data.get("verification_status", "VERIFIED"),
                )
                session.add(claim)
                session.flush()

                for e_data in c_data.get("evidences", []):
                    ev_id = e_data.get("id") or gen_uuid()
                    evidence = Evidence(
                        id=ev_id,
                        claim_id=claim.id,
                        source_name=e_data["source_name"],
                        source_url=e_data.get("source_url"),
                        excerpt=e_data["excerpt"],
                        stance=e_data["stance"],
                        reliability_score=e_data["reliability_score"],
                        relevance_score=e_data.get("relevance_score", 0.0),
                        dataset_source=e_data.get("dataset_source"),
                        dataset_record_id=e_data.get("dataset_record_id"),
                        nli_relation=e_data.get("nli_relation"),
                        retrieval_timestamp=e_data.get("retrieval_timestamp", utc_now()),
                    )
                    session.add(evidence)

                    # Also persist into evidence_records for RAG audit and Evidence Explorer
                    ev_rec = EvidenceRecord(
                        id=gen_uuid(),
                        analysis_id=analysis.id,
                        claim_id=claim.id,
                        chunk_id=e_data.get("chunk_id"),
                        claim_text=c_data["claim_text"],
                        query=c_data["claim_text"],
                        relevance_score=float(e_data.get("relevance_score", 0.0)),
                        rerank_score=float(e_data.get("relevance_score", 0.0)),
                        rrf_score=float(e_data.get("rrf_score", 0.0)),
                        retrieval_method=e_data.get("retrieval_method", "hybrid_rrf_rerank"),
                        source_name=e_data["source_name"],
                        source_url=e_data.get("source_url"),
                        dataset_source=e_data.get("dataset_source"),
                        dataset_record_id=e_data.get("dataset_record_id"),
                        excerpt=e_data["excerpt"],
                        created_at=utc_now(),
                    )
                    session.add(ev_rec)

            # Save Media Credibility
            cred_data = result.get("credibility")
            if cred_data:
                cred = MediaCredibility(
                    id=gen_uuid(),
                    analysis_id=analysis.id,
                    source_name=cred_data["source_name"],
                    domain=cred_data.get("domain"),
                    transparency_score=cred_data["transparency_score"],
                    citation_score=cred_data["citation_score"],
                    evidence_score=cred_data["evidence_score"],
                    journalistic_standard_score=cred_data["journalistic_standard_score"],
                    overall_credibility_score=cred_data["overall_credibility_score"],
                    reasoning=cred_data["reasoning"],
                )
                session.add(cred)

            # Save Public Opinion
            op_data = result.get("opinion")
            if op_data:
                opinion = PublicOpinion(
                    id=gen_uuid(),
                    analysis_id=analysis.id,
                    topic=op_data["topic"],
                    sample_size=op_data["sample_size"],
                    sentiment_positive=op_data["sentiment_positive"],
                    sentiment_neutral=op_data["sentiment_neutral"],
                    sentiment_negative=op_data["sentiment_negative"],
                    sentiment_mixed=op_data["sentiment_mixed"],
                    stance_support=op_data["stance_support"],
                    stance_oppose=op_data["stance_oppose"],
                    stance_discuss=op_data["stance_discuss"],
                    stance_neutral=op_data["stance_neutral"],
                    top_emotions=op_data["top_emotions"],
                    discussion_summary=op_data["discussion_summary"],
                    raw_comments_sample=op_data.get("raw_comments_sample"),
                )
                session.add(opinion)

            # Save Public Trust Survey
            survey_data = result.get("survey")
            if survey_data:
                survey = PublicTrustSurvey(
                    id=gen_uuid(),
                    analysis_id=analysis.id,
                    survey_name=survey_data["survey_name"],
                    sample_size=survey_data["sample_size"],
                    methodology=survey_data["methodology"],
                    trust_source_score=survey_data["trust_source_score"],
                    trust_message_score=survey_data["trust_message_score"],
                    trust_evidence_score=survey_data["trust_evidence_score"],
                    demographics_breakdown=survey_data["demographics_breakdown"],
                    findings_summary=survey_data["findings_summary"],
                    limitations=survey_data["limitations"],
                )
                session.add(survey)

            # Save Information Reception
            rec_data = result.get("reception")
            if rec_data:
                reception = InformationReception(
                    id=gen_uuid(),
                    analysis_id=analysis.id,
                    sample_size=rec_data["sample_size"],
                    comprehension_score=rec_data["comprehension_score"],
                    claim_identification_rate=rec_data["claim_identification_rate"],
                    acceptance_rate=rec_data["acceptance_rate"],
                    sharing_intention_high=rec_data["sharing_intention_high"],
                    sharing_intention_medium=rec_data["sharing_intention_medium"],
                    sharing_intention_low=rec_data["sharing_intention_low"],
                    verify_before_sharing_rate=rec_data["verify_before_sharing_rate"],
                    cognitive_resistance_notes=rec_data["cognitive_resistance_notes"],
                )
                session.add(reception)

            # Save Agent Executions
            for a_exec in result.get("agent_executions", []):
                agent_entity = AgentExecution(
                    id=gen_uuid(),
                    analysis_id=analysis.id,
                    execution_id=a_exec.get("execution_id") or gen_uuid(),
                    agent_name=a_exec["agent_name"],
                    agent_role=a_exec["agent_role"],
                    status=a_exec["status"],
                    latency_ms=a_exec["latency_ms"],
                    execution_time_ms=a_exec.get("execution_time_ms", a_exec["latency_ms"]),
                    model_name=a_exec.get("model_name"),
                    model_version=a_exec.get("model_version"),
                    dataset_ids=a_exec.get("dataset_ids"),
                    dataset_versions=a_exec.get("dataset_versions"),
                    evidence_ids=a_exec.get("evidence_ids"),
                    retrieval_count=a_exec.get("retrieval_count", 0),
                    start_time=a_exec.get("start_time"),
                    end_time=a_exec.get("end_time"),
                    result_summary=a_exec.get("result_summary"),
                    disagreement_detected=a_exec.get("disagreement_detected", False),
                    errors=a_exec.get("errors"),
                    output=a_exec.get("output"),
                    details=a_exec.get("details"),
                )
                session.add(agent_entity)

            session.commit()
            logger.info("Analysis %s completed successfully", analysis_id)

        except Exception as e:
            logger.exception("Error during analysis execution for %s: %s", analysis_id, e)
            analysis.status = "FAILED"
            analysis.error_message = str(e)
            session.commit()

