"""
Dataset-Grounded RAG Service.
Provides few-shot taxonomy calibration examples from ViFactCheck, ViWiki, X-FACT, and FEVER
using pure BM25 and lexical indexing without any 3rd-party vector embedding models.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Any

from pydantic import BaseModel, Field

from app.services.hybrid_retrieval import HybridKnowledgeRetriever

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[3]
MANIFEST_PATH = ROOT_DIR / "datasets" / "manifests" / "datasets_manifest.json"


class DatasetCalibrationExample(BaseModel):
    """Few-shot taxonomy guidance sample retrieved from gold standard datasets."""
    dataset_id: str
    dataset_version: str = "v1.0"
    sample_id: str
    claim_text: str
    evidence_text: str
    label: str  # SUPPORTED | REFUTED | NOT_ENOUGH_INFORMATION
    retrieval_score: float
    retrieved_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source_name: str
    topic: str | None = None


class DatasetRAGService:
    """
    RAG service for Gemini 4 Hydrogen / Neon reasoning calibration.
    Enforces that dataset retrieval provides few-shot guidance rather than fabricated evidence.
    """

    def __init__(self):
        self.retriever = HybridKnowledgeRetriever()
        self.manifest_data = self._load_manifest()

    def _load_manifest(self) -> dict[str, Any]:
        if MANIFEST_PATH.exists():
            try:
                with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    if isinstance(raw, list):
                        indexed = {}
                        for item in raw:
                            did = item.get("dataset_id") or item.get("id") or ""
                            if did:
                                indexed[did.lower()] = item
                                indexed[did] = item
                        return indexed
                    if isinstance(raw, dict):
                        return raw
            except Exception as e:
                logger.warning("Could not read datasets manifest: %s", e)
        return {}

    def retrieve_calibration_examples(
        self,
        query: str,
        top_k: int = 3,
    ) -> list[DatasetCalibrationExample]:
        """
        Retrieve high-relevance benchmark samples using pure BM25 / lexical scoring.
        Zero 3rd-party embedding models are invoked.
        """
        raw_results = self.retriever.retrieve(query, top_k=top_k)
        examples: list[DatasetCalibrationExample] = []

        for r in raw_results:
            ex = DatasetCalibrationExample(
                dataset_id=r.get("dataset_id") or "ViFactCheck",
                dataset_version=self.manifest_data.get(r.get("dataset_id", ""), {}).get("version", "v1.0"),
                sample_id=r.get("chunk_id") or r.get("record_id") or "sample_unk",
                claim_text=r.get("claim_text") or "",
                evidence_text=r.get("evidence_text") or r.get("excerpt") or "",
                label=r.get("baseline_verdict") or "SUPPORTED",
                retrieval_score=round(float(r.get("score", 0.85)), 4),
                source_name=r.get("source_name") or "Kho dữ liệu kiểm chứng chuẩn",
                topic=r.get("topic"),
            )
            examples.append(ex)

        return examples

    def format_rag_prompt_context(
        self,
        claim_text: str,
        top_k: int = 3,
    ) -> str:
        """
        Format retrieved dataset calibration examples into an explicit prompt section
        with mandatory disclaimers separating dataset calibration from new external evidence.
        """
        examples = self.retrieve_calibration_examples(claim_text, top_k=top_k)
        if not examples:
            return ""

        lines = [
            "### [HƯỚNG DẪN CĂN CHUẨN ĐỊNH LƯỢNG TỪ KHO DATASET HỌC THUẬT (DATASET RAG)]",
            "QUY TẮC BẮT BUỘC: Các mẫu dưới đây trích xuất từ ViFactCheck / X-FACT / FEVER / ViWiki chỉ dùng để "
            "học cách phân loại quan hệ (SUPPORTED / REFUTED / NOT_ENOUGH_INFORMATION) và tiêu chuẩn đối chuẩn ngữ nghĩa.",
            "TUYỆT ĐỐI KHÔNG sử dụng các đoạn trích này làm bằng chứng thực tế cho phát ngôn mới nếu không cùng thực thể và sự kiện.\n",
        ]

        for i, ex in enumerate(examples, 1):
            lines.append(
                f"--- Mẫu đối chuẩn #{i} [Dataset: {ex.dataset_id} | Bản ghi: {ex.sample_id} | Độ tương đồng BM25: {ex.retrieval_score}] ---"
            )
            lines.append(f"- Tuyên bố mẫu: {ex.claim_text}")
            lines.append(f"- Bằng chứng mẫu: {ex.evidence_text[:250]}...")
            lines.append(f"- Nhãn phân loại chuẩn (Gold Label): {ex.label}")
            lines.append(f"- Nguồn dữ liệu: {ex.source_name}\n")

        lines.append("### [KẾT THÚC DỮ LIỆU CĂN CHUẨN RAG]\n")
        return "\n".join(lines)

    def get_dataset_provenance_stats(self) -> dict[str, Any]:
        """Return dataset registry stats and indexing details."""
        return {
            "total_chunks_indexed": len(self.retriever.chunks),
            "indexing_engine": "BM25Okapi + TF-IDF Lexical (No 3rd-party vector models)",
            "supported_datasets": ["ViFactCheck", "X-FACT", "FEVER", "ViWiki"],
            "manifest_records": len(self.manifest_data),
        }


# Global singleton instance
_dataset_rag_service: DatasetRAGService | None = None


def get_dataset_rag_service() -> DatasetRAGService:
    global _dataset_rag_service
    if _dataset_rag_service is None:
        _dataset_rag_service = DatasetRAGService()
    return _dataset_rag_service
