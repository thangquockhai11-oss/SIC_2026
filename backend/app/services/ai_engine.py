"""TrustMedia Multi-Agent Scientific Analysis Pipeline.

Coordinates specialized agents: FactChecker (Hybrid Retrieval + NLI),
MediaCredibility, PublicOpinion, PublicTrust, InformationReception,
and MetaConsensusSynthesizer with full execution tracing and provenance.
"""

from datetime import datetime, timezone
import logging
import time
from typing import Any

from app.core.config import get_settings
from app.services.fact_checking_agent import fact_checking_agent
from app.services.information_reception_agent import information_reception_agent
from app.services.media_credibility_agent import media_credibility_agent
from app.services.meta_agent import meta_agent
from app.services.model_manager import model_manager
from app.services.public_opinion_agent import public_opinion_agent
from app.services.public_trust_agent import public_trust_agent

logger = logging.getLogger(__name__)


async def run_multi_agent_analysis(
    title: str,
    content: str,
    source_url: str | None = None,
    language: str = "vi",
    scope: str = "full",
) -> dict[str, Any]:
    """Execute complete Multi-Agent collaborative analysis pipeline.

    Orchestrates real NLP execution across all 5 specialized agents and the Meta-Agent.
    Every agent records its own execution trace, model versions, and provenance.
    """
    settings = get_settings()
    t_start = time.time()
    agent_executions: list[dict[str, Any]] = []

    # 1. Media Credibility Agent (Independent Source & Journalistic Integrity evaluated first)
    credibility_data, cred_trace = media_credibility_agent.evaluate(source_url, content)
    agent_executions.append(cred_trace)
    source_name = credibility_data.get("source_name", "Nguồn tin")
    source_cred = credibility_data.get("overall_credibility_score", 70.0)

    # 2. Fact-Checking Agent (Hybrid Retrieval + NLI Verification with source attribution)
    claims, fact_trace = fact_checking_agent.execute_fact_checking(
        content,
        language=language,
        source_url=source_url,
        source_name=source_name,
        source_credibility=source_cred,
        article_title=title,
    )
    agent_executions.append(fact_trace)

    # 3. Public Opinion Agent (Dual-Aspect Sentiment vs Stance with topical comments)
    primary_claim_text = claims[0]["claim_text"] if claims else title
    opinion_data, op_trace = public_opinion_agent.analyze(
        content,
        claim_text=primary_claim_text,
        language=language,
        article_title=title,
    )
    agent_executions.append(op_trace)

    # 4. Public Trust Agent (Survey-grounded polling metrics calibrated to topic & source)
    trust_data, trust_trace = public_trust_agent.evaluate(
        content,
        source_name=source_name,
        source_credibility=source_cred,
        article_title=title,
    )
    agent_executions.append(trust_trace)

    # 5. Information Reception Agent (Comprehension & Cognitive Resistance)
    reception_data, rec_trace = information_reception_agent.evaluate(
        content,
        source_name=source_name,
        article_title=title,
    )
    agent_executions.append(rec_trace)

    # 6. Meta-Agent Consensus Synthesis & Conflict Resolution
    meta_result, meta_trace = meta_agent.synthesize(
        claims=claims,
        credibility_data=credibility_data,
        opinion_data=opinion_data,
        trust_data=trust_data,
        reception_data=reception_data,
        article_title=title,
        article_content=content,
        source_url=source_url,
        language=language,
    )
    agent_executions.append(meta_trace)

    total_latency_ms = int((time.time() - t_start) * 1000)

    ai_provider = (
        f"Google Gemini ({settings.ai_model}) + TrustMedia Multi-Agent Engine v1.2"
        if settings.gemini_api_key
        else "TrustMedia Multi-Agent Scientific Engine (Calibrated NLP & Hybrid Retrieval)"
    )

    return {
        "summary": meta_result["summary"],
        "verdict": meta_result["verdict"],
        "confidence_score": meta_result["confidence_score"],
        "fact_checking_report": meta_result.get("fact_checking_report"),
        "ai_provider": ai_provider,
        "claims": claims,
        "credibility": credibility_data,
        "opinion": opinion_data,
        "survey": trust_data,
        "reception": reception_data,
        "agent_executions": agent_executions,
        "total_latency_ms": total_latency_ms,
        "disagreement_detected": meta_result.get("disagreement_detected", False),
        "calibration_criteria": meta_result.get("calibration_criteria", []),
    }
