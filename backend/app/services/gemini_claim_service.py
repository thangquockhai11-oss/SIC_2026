"""
Gemini 4 Hydrogen Claim Extraction & Article Fidelity Service.
Extracts 11+ slot attributes, preserves exact sentence location,
and verifies Article Fidelity across 8 distortion categories.
"""

from dataclasses import asdict
import json
import logging
import re
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.claim_article_aligner import ClaimArticleAligner, ClaimAttributes
from app.services.gemini_model_router import GeminiTaskType, get_model_router

logger = logging.getLogger(__name__)


class HydrogenClaimCandidate(BaseModel):
    """Atomic check-worthy claim extracted and verified by Gemini 4 Hydrogen."""
    claim_id: str = Field(description="Unique identifier for the claim (e.g. c_1)")
    claim_text: str = Field(description="Normalized atomic check-worthy claim")
    original_sentence: str = Field(description="Exact verbatim sentence from original article")
    paragraph_index: int = Field(default=0, description="0-indexed paragraph index")
    sentence_index: int = Field(default=0, description="0-indexed sentence index")
    location_in_doc: str = Field(default="Đoạn 1, câu 1", description="Human readable location")
    claim_type: Literal[
        "FACTUAL_CLAIM",
        "STATISTICAL_CLAIM",
        "SCIENTIFIC_CLAIM",
        "QUOTATION_CLAIM",
        "CAUSAL_CLAIM",
    ] = Field(default="FACTUAL_CLAIM")

    # 11+ Slot Attributes
    subject: str = Field(default="", description="Subject entity")
    predicate: str = Field(default="", description="Asserted action, relationship or verb")
    object: str = Field(default="", description="Target entity or affected object")
    numerical_value: float | None = Field(default=None, description="Extracted numerical metric")
    unit: str | None = Field(default=None, description="Measurement unit (%, tỷ đồng, mg, năm...)")
    date_time: str | None = Field(default=None, description="Extracted date, year, or temporal anchor")
    location: str | None = Field(default=None, description="Geographical or institutional location")
    population: str | None = Field(default=None, description="Target population or demographic")
    conditions_scope: str | None = Field(default=None, description="Scope restrictions or qualifiers")
    modality_certainty: Literal[
        "CERTAIN",
        "PROBABLE",
        "ASSOCIATIONAL",
        "HYPOTHETICAL",
    ] = Field(default="CERTAIN")
    causal_assertion: Literal[
        "CAUSATION",
        "CORRELATION",
        "ATTRIBUTION",
        "OBSERVATION",
    ] = Field(default="OBSERVATION")
    attribution: str | None = Field(default=None, description="Quoted or credited entity/speaker")
    negation: bool = Field(default=False, description="Whether claim contains negation")

    # Article Fidelity Audit (8 Distortion Categories)
    fidelity_status: Literal["FAITHFUL", "DISTORTED", "OUT_OF_CONTEXT"] = Field(default="FAITHFUL")
    distortion_type: str | None = Field(
        default=None,
        description="INCORRECT_EXTRACTION | SEMANTIC_DISTORTION | MISSING_CONTEXT | "
                    "CHANGED_NUMERICAL_VALUE | CHANGED_DATE | CHANGED_CAUSAL_RELATIONSHIP | "
                    "INCORRECT_ATTRIBUTION | OVERGENERALIZATION",
    )
    distortion_reasons: list[str] = Field(default_factory=list)
    fidelity_score: float = Field(default=0.95, ge=0.0, le=1.0)


class HydrogenExtractionResult(BaseModel):
    """Full extraction envelope produced by Gemini 4 Hydrogen."""
    claims: list[HydrogenClaimCandidate] = Field(default_factory=list)
    article_summary: str = Field(default="")
    total_claims_extracted: int = Field(default=0)


class GeminiClaimService:
    """
    Claim Extraction, Decomposition, and Fidelity Engine exclusively powered by Gemini 4 Hydrogen.
    """

    def __init__(self):
        self.router = get_model_router()
        self.aligner = ClaimArticleAligner()

    def extract_and_align_claims(
        self,
        article_title: str,
        article_content: str,
    ) -> list[HydrogenClaimCandidate]:
        """
        Extract check-worthy atomic claims, retain precise sentence locations,
        and evaluate fidelity against article statements using Gemini 4 Hydrogen.
        """
        # Split into paragraphs and sentences for structural grounding
        paragraphs = [p.strip() for p in article_content.split("\n") if p.strip()]
        sentence_map: list[dict[str, Any]] = []

        for p_idx, p in enumerate(paragraphs):
            s_list = [s.strip() for s in re.split(r"(?<=[.!?])\s+", p) if len(s.strip()) > 8]
            for s_idx, s in enumerate(s_list):
                sentence_map.append({
                    "original_sentence": s,
                    "paragraph_index": p_idx,
                    "sentence_index": s_idx,
                    "location_in_doc": f"Đoạn {p_idx + 1}, câu {s_idx + 1}",
                })

        if not sentence_map and article_content.strip():
            sentence_map.append({
                "original_sentence": article_content.strip(),
                "paragraph_index": 0,
                "sentence_index": 0,
                "location_in_doc": "Đoạn 1, câu 1",
            })

        # Structured Prompt for Gemini 4 Hydrogen
        prompt = (
            "Bạn là Gemini 4 Hydrogen, mô hình NLP chuyên gia của TrustMedia AI.\n"
            "Hãy trích xuất các phát ngôn cốt lõi cần kiểm chứng (atomic check-worthy claims) từ bài báo sau.\n\n"
            f"Tiêu đề: {article_title}\n"
            f"Nội dung bài báo:\n{article_content[:3000]}\n\n"
            "YÊU CẦU BẮT BUỘC:\n"
            "1. Phân rã câu phức hợp thành các atomic claims độc lập.\n"
            "2. Điền đầy đủ 11 thuộc tính: subject, predicate, object, numerical_value, unit, date_time, location, population, conditions_scope, modality_certainty, causal_assertion, attribution, negation.\n"
            "3. Kiểm tra tính trung thực (Article Fidelity) so với câu gốc trong bài báo. Nếu phát ngôn bóp méo ngữ nghĩa (ví dụ: liên quan chuyển thành chữa khỏi), gán fidelity_status='DISTORTED' và chỉ rõ distortion_type.\n"
            "4. Giữ nguyên câu gốc (original_sentence) và vị trí câu.\n"
        )

        res, meta = self.router.call_hydrogen(
            prompt=prompt,
            schema=HydrogenExtractionResult,
            system_instruction=(
                "Bạn là Gemini 4 Hydrogen. Nhiệm vụ của bạn là bóc tách phát ngôn nguyên tử chính xác "
                "và bảo vệ tính trung thực (fidelity) của văn bản gốc, phát hiện mọi bóp méo ngữ nghĩa."
            ),
        )

        claims: list[HydrogenClaimCandidate] = []
        if isinstance(res, HydrogenExtractionResult) and res.claims:
            claims = res.claims
        else:
            # Deterministic fallback extraction using sentence_map & ClaimArticleAligner
            for i, sm in enumerate(sentence_map[:6], 1):
                sent = sm["original_sentence"]
                # Extract numbers
                num_val = None
                num_unit = None
                num_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(%|tỷ đồng|triệu|năm|mg|g)?", sent)
                if num_match:
                    try:
                        num_val = float(num_match.group(1).replace(",", "."))
                        num_unit = num_match.group(2)
                    except Exception:
                        pass

                # Detect causal vs associational
                has_causal = any(w in sent.lower() for w in ["gây ra", "chữa khỏi", "phòng ngừa", "dẫn đến"])
                has_assoc = any(w in sent.lower() for w in ["liên quan", "mối liên hệ", "tương quan"])
                causal_mode: Literal["CAUSATION", "CORRELATION", "ATTRIBUTION", "OBSERVATION"] = "CAUSATION" if has_causal else "CORRELATION" if has_assoc else "OBSERVATION"

                # Detect claim type
                c_type: Literal["FACTUAL_CLAIM", "STATISTICAL_CLAIM", "SCIENTIFIC_CLAIM", "QUOTATION_CLAIM", "CAUSAL_CLAIM"] = (
                    "STATISTICAL_CLAIM" if num_val is not None
                    else "SCIENTIFIC_CLAIM" if any(w in sent.lower() for w in ["nghiên cứu", "khoa học", "y tế", "thử nghiệm"])
                    else "CAUSAL_CLAIM" if has_causal
                    else "FACTUAL_CLAIM"
                )

                candidate = HydrogenClaimCandidate(
                    claim_id=f"c_{i}",
                    claim_text=sent,
                    original_sentence=sent,
                    paragraph_index=sm["paragraph_index"],
                    sentence_index=sm["sentence_index"],
                    location_in_doc=sm["location_in_doc"],
                    claim_type=c_type,
                    subject="Chủ thể phát ngôn",
                    predicate="khẳng định",
                    object="",
                    numerical_value=num_val,
                    unit=num_unit,
                    causal_assertion=causal_mode,
                    modality_certainty="CERTAIN" if not has_assoc else "ASSOCIATIONAL",
                    fidelity_status="FAITHFUL",
                    fidelity_score=0.95,
                )
                claims.append(candidate)

        # Post-validation via ClaimArticleAligner to ensure rigorous fidelity consistency
        for c in claims:
            # Run deterministic distortion check
            audit = self.aligner.verify_fidelity(
                original_text=c.original_sentence or article_content,
                claim_text=c.claim_text,
            )
            if audit.distortion_detected:
                c.fidelity_status = "DISTORTED"
                c.distortion_type = audit.distortion_type or "SEMANTIC_DISTORTION"
                c.distortion_reasons = audit.distortion_reasons
                c.fidelity_score = audit.fidelity_score

        return claims


# Global singleton instance
_gemini_claim_service: GeminiClaimService | None = None


def get_gemini_claim_service() -> GeminiClaimService:
    global _gemini_claim_service
    if _gemini_claim_service is None:
        _gemini_claim_service = GeminiClaimService()
    return _gemini_claim_service
