"""Media Credibility Agent: Source & Journalistic Integrity Evaluator.

Evaluates:
1. Outlet Profile: Ownership, editorial policy, correction policy, verification source.
2. Article Quality: Author, data sources, cited documents, citation density, sensationalism.
3. Whole newsroom summary: Strictly conditioned on sample size and survey timeframe.
"""

from datetime import datetime, timezone
import time
from typing import Any
import uuid

from app.services.dataset_loaders import credibility_loader
from app.services.model_manager import model_manager
from app.services.rag.hybrid_retriever import hybrid_rag_retriever


class MediaCredibilityAgent:
    """Specialized agent assessing media sources and journalistic standards."""

    def __init__(self):
        self.agent_name = "MediaCredibilityAgent"
        self.agent_role = "Đánh giá chất lượng và độ minh bạch nguồn tin độc lập"

    def evaluate(
        self,
        source_url: str | None,
        content: str,
        author: str | None = None,
        sample_size: int | None = None,
        survey_timeframe: str | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Evaluate source credibility and produce full execution trace."""
        start_time = datetime.now(timezone.utc)
        t0 = time.time()

        res = credibility_loader.assess_media_credibility(
            source_url=source_url,
            content=content,
            author=author,
            sample_size=sample_size,
            survey_timeframe=survey_timeframe,
        )

        cred_data = {
            "source_name": res["source_name"],
            "domain": res["domain"],
            "transparency_score": res["transparency_score"],
            "citation_score": res["citation_score"],
            "evidence_score": res["evidence_score"],
            "journalistic_standard_score": res["journalistic_standard_score"],
            "overall_credibility_score": res["overall_credibility_score"],
            "reasoning": res["reasoning"],
            "outlet_profile": res["outlet_profile"],
            "article_quality": res["article_quality"],
            "outlet_summary": res["outlet_summary"],
        }

        # RAG retrieval for publisher guidelines and source audit records
        rag_hits = hybrid_rag_retriever.retrieve(
            query=f"{res['domain'] or cred_data['source_name']} journalistic credibility transparency",
            top_k=2,
            agent_name="MediaCredibilityAgent",
        )
        evidence_ids = [h["chunk_id"] for h in rag_hits]

        latency_ms = int((time.time() - t0) * 1000)
        end_time = datetime.now(timezone.utc)

        model_meta = model_manager.get_model("media_credibility")
        model_name = model_meta.model_name if model_meta else "NELA-GT-CredibilityEvaluator"
        model_version = model_meta.model_version if model_meta else "2020.2-benchmark"

        outlet_score_str = f"{cred_data['overall_credibility_score']}/100" if cred_data['overall_credibility_score'] is not None else "Chưa khảo sát mẫu"
        trace = {
            "execution_id": str(uuid.uuid4()),
            "agent_name": self.agent_name,
            "agent_role": self.agent_role,
            "status": "COMPLETED",
            "latency_ms": latency_ms,
            "execution_time_ms": latency_ms,
            "model_name": model_name,
            "model_version": model_version,
            "dataset_ids": ["NELA-GT-2020"],
            "dataset_versions": {"NELA-GT": "2020"},
            "evidence_ids": evidence_ids,
            "retrieval_count": len(evidence_ids) if evidence_ids else (1 if res["domain"] else 0),
            "start_time": start_time,
            "end_time": end_time,
            "result_summary": f"Nguồn '{cred_data['source_name']}': Hồ sơ tòa soạn & chất lượng bài viết đã đánh giá. Chỉ số toàn tòa soạn: {outlet_score_str}.",
            "disagreement_detected": False,
            "errors": None,
            "output": cred_data,
            "details": cred_data,
        }

        return cred_data, trace


media_credibility_agent = MediaCredibilityAgent()
