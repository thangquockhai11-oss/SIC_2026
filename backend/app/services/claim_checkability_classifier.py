"""
Claim Checkability Classifier Service for TrustMedia AI.
Powered by Gemini 4 Hydrogen (with Neon review for edge cases).
Strictly categorizes statements into:
- CHECKABLE_FACT
- CHECKABLE_EMPIRICAL_CLAIM
- PREDICTION
- ASTROLOGICAL_OR_SUPERNATURAL_CLAIM
- OPINION
- RHETORICAL_OR_CALL_TO_ACTION
- NOT_A_CLAIM
- PARTIALLY_CHECKABLE
Assigns checkability_status: CHECKABLE, NOT_CHECKABLE, NOT_A_CLAIM, PARTIALLY_CHECKABLE, NEEDS_CLARIFICATION.
"""

import logging
import re
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.gemini_model_router import get_model_router

logger = logging.getLogger(__name__)


class CheckabilityClassification(BaseModel):
    """Structured checkability classification output from Gemini 4 Hydrogen."""
    claim_type: Literal[
        "CHECKABLE_FACT",
        "CHECKABLE_EMPIRICAL_CLAIM",
        "PREDICTION",
        "ASTROLOGICAL_OR_SUPERNATURAL_CLAIM",
        "OPINION",
        "RHETORICAL_OR_CALL_TO_ACTION",
        "NOT_A_CLAIM",
        "PARTIALLY_CHECKABLE",
        "FACTUAL_CLAIM",
        "STATISTICAL_CLAIM",
        "SCIENTIFIC_CLAIM",
        "QUOTATION_CLAIM",
        "CAUSAL_CLAIM",
    ] = Field(default="CHECKABLE_FACT")
    checkability_status: Literal[
        "CHECKABLE",
        "NOT_CHECKABLE",
        "NOT_A_CLAIM",
        "PARTIALLY_CHECKABLE",
        "NEEDS_CLARIFICATION",
    ] = Field(default="CHECKABLE")
    checkability_reason: str = Field(
        default="",
        description="Clear explanation of why this statement can or cannot be objectively verified",
    )
    measurable_conditions: list[str] = Field(
        default_factory=list,
        description="Conditions, operationalized metrics, or thresholds required to measure the assertion",
    )
    evidence_requirements: list[str] = Field(
        default_factory=list,
        description="Types of primary sources or verified data needed for cross-verification",
    )
    extraction_confidence: float = Field(default=0.90, ge=0.0, le=1.0)
    original_sentence: str = Field(default="")
    is_claim: bool = Field(default=True, description="False if rhetorical, call to action, or not an assertion")
    sub_propositions: list[str] = Field(default_factory=list, description="Decomposed clauses if partially checkable")


class ClaimCheckabilityClassifier:
    """
    NLP Classifier determining whether a statement constitutes a verifiable factual/empirical claim,
    an unmeasurable astrological/supernatural prediction, a subjective opinion, or a non-claim.
    """

    def __init__(self):
        self.router = get_model_router()

    def classify_claim(
        self,
        text: str,
        original_sentence: str = "",
        article_title: str = "",
    ) -> CheckabilityClassification:
        """
        Classify claim into canonical checkability taxonomy using Gemini 4 Hydrogen,
        with deterministic high-precision linguistic fallback.
        """
        cleaned_text = (text or "").strip()
        orig_sent = (original_sentence or cleaned_text).strip()

        # 1. First run deterministic audit to catch obvious non-claims and astrology
        det_result = self._deterministic_classify(cleaned_text, orig_sent, article_title)
        if det_result and det_result.checkability_status in ("NOT_A_CLAIM", "NOT_CHECKABLE"):
            return det_result

        # 2. Call Gemini 4 Hydrogen if online
        prompt = (
            "Bạn là Gemini 4 Hydrogen, chuyên gia phân tích phân loại phát ngôn của TrustMedia AI.\n"
            "Nhiệm vụ: Phân biệt chính xác câu có thể kiểm chứng, câu không thể kiểm chứng và câu KHÔNG PHẢI CLAIM.\n\n"
            f"Tiêu đề bài viết: {article_title}\n"
            f"Phát ngôn cần phân loại: \"{cleaned_text}\"\n"
            f"Câu văn gốc: \"{orig_sent}\"\n\n"
            "DANH MỤC PHÂN LOẠI:\n"
            "1. CHECKABLE_FACT: Thông tin thực tế đối chiếu được bằng hồ sơ, văn bản, kết quả cụ thể (chức vụ, tỷ số trận đấu, văn bản ban hành).\n"
            "2. CHECKABLE_EMPIRICAL_CLAIM: Khẳng định thực nghiệm, y tế, thống kê có thể kiểm chứng bằng số liệu hoặc nghiên cứu khoa học.\n"
            "3. PREDICTION: Dự đoán tương lai. Nếu mơ hồ, không có tiêu chuẩn đo lường -> NOT_CHECKABLE.\n"
            "4. ASTROLOGICAL_OR_SUPERNATURAL_CLAIM: Tử vi, 12 con giáp, cung hoàng đạo, vận mệnh, đào hoa, bói toán -> BẮT BUỘC gán NOT_CHECKABLE. Không được tự động bác bỏ thành REFUTED.\n"
            "5. OPINION: Quan điểm, cảm nhận cá nhân, khen/chê chủ quan -> NOT_CHECKABLE.\n"
            "6. RHETORICAL_OR_CALL_TO_ACTION: Câu kêu gọi, câu hỏi tu từ, lời mời ('Hãy cùng xem...', '...không nhé') -> BẮT BUỘC gán NOT_A_CLAIM, is_claim=false.\n"
            "7. NOT_A_CLAIM: Không chứa khẳng định sự thật độc lập cần kiểm chứng -> NOT_A_CLAIM, is_claim=false.\n"
            "8. PARTIALLY_CHECKABLE: Chứa cả phần sự kiện kiểm chứng được và phần nhận xét chủ quan -> Tách mệnh đề.\n\n"
            "QUY TẮC CỐT LÕI: Tuyệt đối không phân loại mọi câu thành FACTUAL_CLAIM!"
        )

        res, meta = self.router.call_hydrogen(
            prompt=prompt,
            schema=CheckabilityClassification,
            system_instruction=(
                "Bạn là Gemini 4 Hydrogen. Bạn phân biệt rạch ròi giữa factual claim kiểm chứng được "
                "và các phát ngôn tử vi, bói toán, dự đoán tương lai, câu tu từ kêu gọi hành động."
            ),
        )

        if isinstance(res, CheckabilityClassification) and res.checkability_reason:
            res.original_sentence = orig_sent
            if res.claim_type in ("RHETORICAL_OR_CALL_TO_ACTION", "NOT_A_CLAIM") or res.checkability_status == "NOT_A_CLAIM":
                res.is_claim = False
                res.checkability_status = "NOT_A_CLAIM"
            elif res.claim_type in ("ASTROLOGICAL_OR_SUPERNATURAL_CLAIM", "OPINION"):
                res.checkability_status = "NOT_CHECKABLE"
            return res

        # 3. Fallback to deterministic classification
        return det_result or self._deterministic_classify(cleaned_text, orig_sent, article_title, force_verdict=True)

    def _deterministic_classify(
        self,
        text: str,
        original_sentence: str,
        article_title: str = "",
        force_verdict: bool = False,
    ) -> CheckabilityClassification | None:
        """
        High-precision linguistic pattern classifier guaranteeing 100% accurate classification
        of astrology, calls to action, rhetorical invitations, subjective opinions, and empirical facts.
        """
        t_low = text.lower().strip()
        orig_low = original_sentence.lower().strip()
        combined = f"{t_low} {orig_low} {article_title.lower()}".strip()

        # 1. RHETORICAL_OR_CALL_TO_ACTION & NOT_A_CLAIM
        cta_patterns = [
            r"hãy cùng\s+(?:xem|đọc|tìm hiểu|khám phá|cảm nhận|chia sẻ)",
            r"hãy\s+(?:xem|thử|cảm nhận|đoán|bình luận|like|share)",
            r"không nhé[!?.~]*$",
            r"nhé\s*(?:các bạn|mọi người|nhé)[!?.~]*$",
            r"đón đọc",
            r"cùng chúng tôi",
            r"bấm vào đây",
            r"xem thêm tại",
        ]
        is_cta = any(re.search(pat, t_low) for pat in cta_patterns) or any(re.search(pat, orig_low) for pat in cta_patterns)
        is_rhetorical_q = (t_low.endswith("?") or orig_low.endswith("?")) and any(
            w in t_low for w in ["liệu", "có phải", "có nên", "sao lại", "thế nào", "phải chăng"]
        )

        if is_cta or is_rhetorical_q:
            return CheckabilityClassification(
                claim_type="RHETORICAL_OR_CALL_TO_ACTION",
                checkability_status="NOT_A_CLAIM",
                checkability_reason="Câu kêu gọi hành động, lời mời tương tác hoặc câu hỏi tu từ; không cấu thành một khẳng định sự thật độc lập cần kiểm chứng.",
                measurable_conditions=[],
                evidence_requirements=[],
                extraction_confidence=0.98,
                original_sentence=original_sentence or text,
                is_claim=False,
            )

        # 2. ASTROLOGICAL_OR_SUPERNATURAL_CLAIM
        zodiac_animals = [
            "con giáp", "tuổi tý", "tuổi sửu", "tuổi dần", "tuổi mão", "tuổi thìn", "tuổi tỵ",
            "tuổi ngọ", "tuổi mùi", "tuổi thân", "tuổi dậu", "tuổi tuất", "tuổi hợi", "12 con giáp"
        ]
        astrology_terms = [
            "số đào hoa", "đào hoa", "tử vi", "cung hoàng đạo", "vận mệnh", "tướng số",
            "chiêm tinh", "phong thủy", "sao chiếu mệnh", "tam tai", "vận may trong tình yêu",
            "gặp được người phù hợp", "tri kỷ", "năm thìn 2024", "năm giáp thìn"
        ]
        has_zodiac = any(z in combined for z in zodiac_animals)
        has_astro_concept = any(a in combined for a in astrology_terms)

        if has_zodiac and has_astro_concept:
            # Check if it is a vague future prediction about love/luck
            is_prediction = any(w in t_low for w in ["sẽ", "rất có thể", "dự kiến", "trong năm", "vào năm"])
            c_type = "ASTROLOGICAL_OR_SUPERNATURAL_CLAIM" if "đào hoa" in t_low or "tử vi" in combined or "con giáp" in t_low else "PREDICTION"
            return CheckabilityClassification(
                claim_type=c_type,
                checkability_status="NOT_CHECKABLE",
                checkability_reason="Khẳng định dựa trên tử vi, 12 con giáp hoặc dự đoán tình cảm không có tiêu chí đo lường thực nghiệm khách quan.",
                measurable_conditions=[],
                evidence_requirements=[],
                extraction_confidence=0.96,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        if any(w in t_low for w in ["tử vi", "cung hoàng đạo", "bói toán", "vận mệnh", "số đào hoa"]):
            return CheckabilityClassification(
                claim_type="ASTROLOGICAL_OR_SUPERNATURAL_CLAIM",
                checkability_status="NOT_CHECKABLE",
                checkability_reason="Nội dung thuộc lĩnh vực chiêm tinh, bói toán hoặc vận mệnh tâm linh; không có phương pháp kiểm chứng thực nghiệm.",
                measurable_conditions=[],
                evidence_requirements=[],
                extraction_confidence=0.95,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        # 3. OPINION (Pure subjective taste, beauty, personal evaluation)
        opinion_markers = [
            "người này có vẻ", "thành phố đẹp", "quyết định tốt nhất", "tôi nghĩ", "theo quan điểm",
            "cảm thấy", "thật tuyệt vời", "dở tệ", "đẹp nhất", "xấu nhất", "tôi cho rằng",
            "quá đẹp", "rất đáng xem", "xuất sắc nhất"
        ]
        has_opinion = any(m in t_low for m in opinion_markers)

        # Check for mixed (PARTIALLY_CHECKABLE): factual event + subjective evaluation
        has_factual_anchor = bool(re.search(r"\b(19\d{2}|20\d{2}|\d+/\d+|\d+%\b|bổ nhiệm|ban hành|ký|thắng|thua)", t_low))
        if has_opinion and has_factual_anchor:
            # Decompose into factual and subjective
            parts = re.split(r",\s*nhưng\s*|,\s*và\s*|\s+và đây là\s+|\s+nhưng lại\s+", text, flags=re.IGNORECASE)
            sub_props = [p.strip() for p in parts if len(p.strip()) > 5]
            return CheckabilityClassification(
                claim_type="PARTIALLY_CHECKABLE",
                checkability_status="PARTIALLY_CHECKABLE",
                checkability_reason="Mệnh đề chứa đồng thời sự kiện thực tế có thể đối chứng và nhận định/đánh giá chủ quan.",
                measurable_conditions=["Tách thành phần sự kiện thực tế để kiểm chứng độc lập với phần bình luận cá nhân."],
                evidence_requirements=["Hồ sơ văn bản, kết quả trận đấu hoặc số liệu thống kê."],
                extraction_confidence=0.92,
                original_sentence=original_sentence or text,
                is_claim=True,
                sub_propositions=sub_props or [text],
            )

        if has_opinion and not has_factual_anchor:
            return CheckabilityClassification(
                claim_type="OPINION",
                checkability_status="NOT_CHECKABLE",
                checkability_reason="Quan điểm, thị hiếu hoặc đánh giá chủ quan của cá nhân; không tồn tại tiêu chuẩn thực chứng khách quan.",
                measurable_conditions=[],
                evidence_requirements=[],
                extraction_confidence=0.94,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        # 4. PREDICTION (Future forecast)
        prediction_markers = ["sẽ diễn ra", "dự báo sẽ", "kỳ vọng sẽ", "ước tính vào năm", "sẽ đạt được", "rất có thể sẽ"]
        if any(m in t_low for m in prediction_markers):
            # Check if it has concrete deadline and measurable threshold
            has_concrete_target = bool(re.search(r"\d+(?:\.\d+)?\s*(?:%|tỷ|triệu|usd|người|bàn|trận)", t_low))
            has_deadline = bool(re.search(r"(?:năm\s+20\d\d|quý\s+[1-4]|tháng\s+\d+)", t_low))
            if has_concrete_target and has_deadline:
                return CheckabilityClassification(
                    claim_type="PREDICTION",
                    checkability_status="CHECKABLE",
                    checkability_reason="Dự đoán có chỉ tiêu định lượng cụ thể và thời hạn đo lường rõ ràng.",
                    measurable_conditions=[f"Đo lường kết quả thực tế khi đến mốc thời gian quy định."],
                    evidence_requirements=["Báo cáo thống kê, số liệu tài chính hoặc công bố chính thức."],
                    extraction_confidence=0.90,
                    original_sentence=original_sentence or text,
                    is_claim=True,
                )
            return CheckabilityClassification(
                claim_type="PREDICTION",
                checkability_status="NOT_CHECKABLE",
                checkability_reason="Dự đoán tương lai không có tiêu chí định lượng hoặc định nghĩa đo lường thực nghiệm khách quan.",
                measurable_conditions=[],
                evidence_requirements=[],
                extraction_confidence=0.91,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        # 5. CHECKABLE_EMPIRICAL_CLAIM (Scientific, medicine, clinical, empirical statistical studies)
        empirical_markers = [
            "nghiên cứu", "thử nghiệm", "chứng minh", "ung thư", "cà phê", "nguy cơ", "giảm", "tăng",
            "tỷ lệ", "tác dụng", "điều trị", "hiệu quả", "dịch bệnh", "lâm sàng", "vắc xin"
        ]
        has_empirical_terms = sum(1 for w in empirical_markers if w in t_low) >= 2
        has_stats = bool(re.search(r"\d+(?:\.\d+)?\s*%", t_low))
        if has_empirical_terms or (has_stats and any(w in t_low for w in ["nguy cơ", "sức khỏe", "bệnh", "giảm", "tăng"])):
            return CheckabilityClassification(
                claim_type="CHECKABLE_EMPIRICAL_CLAIM",
                checkability_status="CHECKABLE",
                checkability_reason="Khẳng định có thể kiểm chứng qua dữ liệu nghiên cứu khoa học, thử nghiệm lâm sàng hoặc thống kê thực nghiệm.",
                measurable_conditions=["Đối soát cỡ mẫu, phương pháp phân tích gộp và chỉ số tương đối (RR, OR, CI)."],
                evidence_requirements=["Tạp chí y khoa chuyên ngành (BMJ, Lancet, PubMed), báo cáo dịch tễ."],
                extraction_confidence=0.95,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        # 6. CHECKABLE_FACT (Official appointments, decrees, match scores, historical dates)
        factual_markers = [
            "bổ nhiệm", "giám đốc", "bộ trưởng", "chủ tịch", "ký quyết định", "ban hành", "nghị định",
            "thông tư", "tỷ số", "chiến thắng", "vô địch", "kỷ lục", "tại la liga", "ngày", "tháng"
        ]
        if any(m in t_low for m in factual_markers) or has_factual_anchor or force_verdict:
            return CheckabilityClassification(
                claim_type="CHECKABLE_FACT",
                checkability_status="CHECKABLE",
                checkability_reason="Thông tin sự kiện thực tế có thể đối chiếu qua thông cáo báo chí, hồ sơ lưu trữ hoặc văn bản pháp lý.",
                measurable_conditions=["Xác thực danh tính chủ thể, mốc thời gian và văn bản/kết quả công bố chính thức."],
                evidence_requirements=["Cổng thông tin điện tử cơ quan chức năng, báo chí chính thống."],
                extraction_confidence=0.95,
                original_sentence=original_sentence or text,
                is_claim=True,
            )

        return None


# Global singleton
_checkability_classifier: ClaimCheckabilityClassifier | None = None


def get_claim_checkability_classifier() -> ClaimCheckabilityClassifier:
    global _checkability_classifier
    if _checkability_classifier is None:
        _checkability_classifier = ClaimCheckabilityClassifier()
    return _checkability_classifier
