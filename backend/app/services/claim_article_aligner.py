"""Claim-Article Alignment and Fidelity Verifier.

Audits whether an extracted atomic claim faithfully represents what the
original article actually stated, detecting semantic distortions, dropped
qualifiers, modified numbers, exaggerated modality, and causal shifts.
"""

from dataclasses import asdict, dataclass, field
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ClaimAttributes:
    """Structured representation of an atomic check-worthy claim."""
    claim_text: str
    subject: str | None = None
    predicate: str | None = None
    object: str | None = None
    value: float | None = None
    unit: str | None = None
    time: str | None = None
    location: str | None = None
    population: str | None = None
    conditions: str | None = None
    modality: str = "asserted"  # "asserted", "possible", "reported", "hypothetical"
    causal_relation: bool = False
    attribution: str | None = None
    claim_type: str = "FACTUAL_CLAIM"
    negation: bool = False
    qualifiers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FidelityReport:
    """Detailed audit report on article-to-claim extraction fidelity."""
    fidelity_status: str  # "FAITHFUL", "DISTORTED", "OVERGENERALIZED", "EXTRAPOLATED"
    fidelity_score: float  # 0.0 to 1.0
    distortion_detected: bool
    distortion_type: str | None  # "CAUSAL_DISTORTION", "NUMERICAL_DISTORTION", "MODALITY_EXAGGERATION", etc.
    distortion_reasons: list[str] = field(default_factory=list)
    entity_consistency: bool = True
    numerical_consistency: bool = True
    temporal_consistency: bool = True
    causal_consistency: bool = True
    modality_consistency: bool = True
    negation_consistency: bool = True
    attribution_consistency: bool = True
    qualification_consistency: bool = True
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ClaimArticleAligner:
    """Analyzes and enforces semantic fidelity between original article and atomic claims."""

    def __init__(self):
        # Modality lexical indicators
        self.possibility_words = [
            "có thể", "khả năng", "dự kiến", "dự báo", "nghi ngờ", "ước tính",
            "tiềm năng", "bước đầu", "thử nghiệm", "chưa khẳng định", "dường như",
            "might", "could", "may", "possible", "potential", "preliminary"
        ]
        self.assertive_words = [
            "khẳng định", "chắc chắn", "đã chứng minh", "hoàn toàn", "chính thức",
            "tuyệt đối", "đạt được", "thành công", "phát hiện", "đã", "kết luận",
            "proven", "confirmed", "definitely", "guaranteed"
        ]
        
        # Causal lexical indicators
        self.causal_words = [
            "gây ra", "dẫn đến", "làm cho", "chữa khỏi", "ngăn ngừa", "triệt tiêu",
            "khiến", "tạo thành", "tạo nên", "hậu quả", "nguyên nhân", "trị dứt điểm",
            "causes", "leads to", "cures", "prevents", "results in"
        ]
        self.associational_words = [
            "liên quan", "liên hệ", "mối liên hệ", "mối liên quan", "gắn liền", "song hành",
            "đi kèm", "tương quan", "ghi nhận cùng", "xuất hiện ở", "kết hợp",
            "associated with", "correlated with", "linked to"
        ]

        # Negation indicators
        self.negation_words = [
            "không", "chưa", "chẳng", "không phải", "chưa hề", "không thể",
            "bác bỏ", "phủ nhận", "vô hiệu", "not", "never", "no", "unproven"
        ]

        # Common qualifiers / conditions
        self.qualifier_patterns = [
            r"ở chuột\b", r"trên chuột\b", r"chuột bạch\b", r"trong phòng thí nghiệm\b", r"trên động vật\b",
            r"ở quy mô hẹp\b", r"ở một số trường hợp\b", r"giai đoạn \d+\b",
            r"chỉ áp dụng\b", r"với điều kiện\b", r"tùy thuộc\b",
            r"in[- ]vitro\b", r"in[- ]vivo\b", r"ống nghiệm\b", r"preclinical\b"
        ]

    def extract_claim_attributes(self, text: str, claim_type: str = "FACTUAL_CLAIM") -> ClaimAttributes:
        """Extract structured factual dimensions from a sentence or claim text."""
        t_low = text.lower().strip()

        # 1. Modality detection
        is_possible = any(pw in t_low for pw in self.possibility_words)
        is_asserted = any(aw in t_low for aw in self.assertive_words)
        if is_possible:
            modality = "possible"
        elif is_asserted:
            modality = "asserted"
        else:
            modality = "reported"

        # 2. Causal vs Associational
        has_causality = any(cw in t_low for cw in self.causal_words)

        # 3. Negation (exclude non-negation compound nouns like 'không khí', 'hàng không', 'khoảng không')
        t_neg_clean = re.sub(r"\b(không khí|hàng không|khoảng không|chân không|hư không|khí quyển)\b", " ", t_low)
        has_negation = any(re.search(rf"\b{nw}\b", t_neg_clean) for nw in self.negation_words)

        # 4. Numerical values and units
        num_val, unit = self._extract_first_numerical(text)

        # 5. Temporal expressions
        time_expr = self._extract_time(text)

        # 6. Locations
        location = self._extract_location(text)

        # 7. Attribution
        attribution = self._extract_attribution(text)

        # 8. Qualifiers
        qualifiers = [qp for qp in self.qualifier_patterns if re.search(qp, t_low)]

        # 9. Syntactic subject & predicate rough slots
        subject, predicate, obj = self._extract_slots(text)

        return ClaimAttributes(
            claim_text=text,
            subject=subject,
            predicate=predicate,
            object=obj,
            value=num_val,
            unit=unit,
            time=time_expr,
            location=location,
            modality=modality,
            causal_relation=has_causality,
            attribution=attribution,
            claim_type=claim_type,
            negation=has_negation,
            qualifiers=qualifiers,
        )

    def verify_article_fidelity(
        self,
        original_sentence: str,
        atomic_claim: str,
        article_context: str | None = None,
    ) -> FidelityReport:
        """Evaluate whether atomic_claim faithfully preserves the original sentence's semantics."""
        orig_attrs = self.extract_claim_attributes(original_sentence)
        claim_attrs = self.extract_claim_attributes(atomic_claim)

        distortions: list[str] = []
        distortion_reasons: list[str] = []
        fidelity_score = 1.0

        # 1. Negation Consistency (Critical)
        negation_consistent = (orig_attrs.negation == claim_attrs.negation)
        if not negation_consistent:
            distortions.append("NEGATION_REVERSAL")
            if orig_attrs.negation and not claim_attrs.negation:
                distortion_reasons.append("Bỏ sót từ phủ định trong câu gốc, biến nhận định phủ định thành khẳng định.")
            else:
                distortion_reasons.append("Thêm từ phủ định vào luận điểm mà câu gốc không nêu.")
            fidelity_score -= 0.50

        # 2. Causal Distortion (Correlation -> Causation or introducing unsolicited causation)
        orig_low = original_sentence.lower()
        claim_low = atomic_claim.lower()
        has_orig_associational = any(aw in orig_low for aw in self.associational_words)
        has_claim_causal = any(cw in claim_low for cw in self.causal_words)
        has_orig_causal = any(cw in orig_low for cw in self.causal_words)

        causal_consistent = True
        if has_claim_causal and not has_orig_causal:
            causal_consistent = False
            distortions.append("CAUSAL_DISTORTION")
            if has_orig_associational:
                distortion_reasons.append(
                    "Biến mối quan hệ liên hệ/tương quan (association/correlation) thành quan hệ nhân quả tuyệt đối (causation)."
                )
            else:
                distortion_reasons.append(
                    "Gán ghép quan hệ nhân quả hoặc tác dụng chữa trị/ngăn ngừa mà câu gốc không hề khẳng định."
                )
            fidelity_score -= 0.35

        # 3. Modality Exaggeration (Possibility -> Certainty)
        modality_consistent = True
        if orig_attrs.modality == "possible" and claim_attrs.modality == "asserted":
            modality_consistent = False
            distortions.append("MODALITY_EXAGGERATION")
            distortion_reasons.append(
                "Thổi phồng mức độ chắc chắn: Câu gốc chỉ nêu khả năng/dự kiến, nhưng luận điểm trích xuất lại khẳng định dứt khoát."
            )
            fidelity_score -= 0.25

        # 4. Numerical Consistency
        numerical_consistent = True
        if orig_attrs.value is not None:
            if claim_attrs.value is None:
                numerical_consistent = False
                distortions.append("NUMERICAL_OMISSION")
                distortion_reasons.append(f"Bỏ sót số liệu quan trọng ({orig_attrs.value} {orig_attrs.unit or ''}) của câu gốc.")
                fidelity_score -= 0.20
            elif abs(orig_attrs.value - claim_attrs.value) > 1e-4 or orig_attrs.unit != claim_attrs.unit:
                numerical_consistent = False
                distortions.append("NUMERICAL_DISTORTION")
                distortion_reasons.append(
                    f"Sai lệch số liệu hoặc đơn vị tính: Câu gốc nêu {orig_attrs.value} {orig_attrs.unit or ''}, "
                    f"nhưng luận điểm lại ghi {claim_attrs.value} {claim_attrs.unit or ''}."
                )
                fidelity_score -= 0.40

        # 5. Temporal Consistency
        temporal_consistent = True
        if orig_attrs.time and claim_attrs.time and orig_attrs.time != claim_attrs.time:
            temporal_consistent = False
            distortions.append("TEMPORAL_DISTORTION")
            distortion_reasons.append(
                f"Thay đổi mốc thời gian: Câu gốc ghi '{orig_attrs.time}', luận điểm ghi '{claim_attrs.time}'."
            )
            fidelity_score -= 0.25

        # 6. Qualification & Condition Dropping (Overgeneralization)
        qualification_consistent = True
        if orig_attrs.qualifiers and not claim_attrs.qualifiers:
            qualification_consistent = False
            distortions.append("OVERGENERALIZATION")
            distortion_reasons.append(
                f"Loại bỏ điều kiện thử nghiệm/giới hạn bối cảnh quan trọng: '{', '.join(orig_attrs.qualifiers)}'."
            )
            fidelity_score -= 0.30

        # 7. Entity Consistency
        entity_consistent = True
        if orig_attrs.location and claim_attrs.location and orig_attrs.location != claim_attrs.location:
            entity_consistent = False
            distortions.append("ENTITY_LOCATION_MISMATCH")
            distortion_reasons.append(
                f"Sai lệch địa điểm thực thể: Câu gốc nêu '{orig_attrs.location}', luận điểm ghi '{claim_attrs.location}'."
            )
            fidelity_score -= 0.25

        # 8. Attribution Consistency
        attribution_consistent = True
        if orig_attrs.attribution and not claim_attrs.attribution and ("theo" in orig_low or "cho biết" in orig_low):
            attribution_consistent = False
            distortions.append("ATTRIBUTION_OMISSION")
            distortion_reasons.append(
                f"Bỏ qua chủ thể phát ngôn/nguồn tin dẫn chứng: '{orig_attrs.attribution}', "
                "dẫn đến biến ý kiến cá nhân/nhận định thành tuyên bố sự thật khách quan."
            )
            fidelity_score -= 0.15

        fidelity_score = max(0.0, round(fidelity_score, 2))

        # Determine overall status
        if not distortions:
            fidelity_status = "FAITHFUL"
            explanation = "Luận điểm trích xuất trung thực, bảo toàn nguyên vẹn ngữ nghĩa, số liệu, mốc thời gian và điều kiện của bài báo gốc."
        elif "OVERGENERALIZATION" in distortions:
            fidelity_status = "OVERGENERALIZED"
            explanation = "Luận điểm khái quát hóa quá đà, lược bỏ các điều kiện ràng buộc hoặc mẫu số hạn chế của bài báo."
        elif any(d in distortions for d in ["CAUSAL_DISTORTION", "NUMERICAL_DISTORTION", "NEGATION_REVERSAL"]):
            fidelity_status = "DISTORTED"
            explanation = f"Phát hiện sai lệch ngữ nghĩa quan trọng so với câu gốc: {'; '.join(distortion_reasons)}"
        else:
            fidelity_status = "EXTRAPOLATED"
            explanation = f"Luận điểm có sự suy diễn hoặc thêm bớt chi tiết: {'; '.join(distortion_reasons)}"

        return FidelityReport(
            fidelity_status=fidelity_status,
            fidelity_score=fidelity_score,
            distortion_detected=len(distortions) > 0,
            distortion_type=distortions[0] if distortions else None,
            distortion_reasons=distortion_reasons,
            entity_consistency=entity_consistent,
            numerical_consistency=numerical_consistent,
            temporal_consistency=temporal_consistent,
            causal_consistency=causal_consistent,
            modality_consistency=modality_consistent,
            negation_consistency=negation_consistent,
            attribution_consistency=attribution_consistent,
            qualification_consistency=qualification_consistent,
            explanation=explanation,
        )

    def _extract_first_numerical(self, text: str) -> tuple[float | None, str | None]:
        """Extract first prominent number and unit (%, tỷ, triệu, km, etc.)."""
        # Match percentages
        pct_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(%|phần trăm)", text, re.IGNORECASE)
        if pct_match:
            val = float(pct_match.group(1).replace(",", "."))
            return val, "%"

        # Match currency/quantity units
        units_pattern = r"(tỷ đồng|triệu đồng|tỷ|triệu|nghìn|ngàn|usd|đô la|tấn|kg|km|năm|tháng|ngày|người|ca|bệnh nhân|lượt)"
        match = re.search(rf"(\d+(?:[.,]\d+)?)\s*{units_pattern}\b", text, re.IGNORECASE)
        if match:
            val = float(match.group(1).replace(",", "."))
            unit = match.group(2).lower()
            return val, unit

        # Match standalone number
        standalone = re.search(r"\b(\d+(?:[.,]\d+)?)\b", text)
        if standalone:
            try:
                val = float(standalone.group(1).replace(",", "."))
                return val, None
            except ValueError:
                pass
        return None, None

    def _extract_time(self, text: str) -> str | None:
        """Extract date, year, or temporal period."""
        # Match dd/mm/yyyy
        d_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b", text)
        if d_match:
            return d_match.group(1)
        # Match year (e.g. năm 2024, năm 2025)
        y_match = re.search(r"\b(năm\s+\d{4}|\d{4})\b", text, re.IGNORECASE)
        if y_match:
            return y_match.group(1)
        # Match month/year
        m_match = re.search(r"\b(tháng\s+\d{1,2}(?:/\d{4})?)\b", text, re.IGNORECASE)
        if m_match:
            return m_match.group(1)
        return None

    def _extract_location(self, text: str) -> str | None:
        """Extract recognized country, province, or city."""
        loc_patterns = [
            "việt nam", "trung quốc", "hà nội", "tp.hcm", "đà nẵng", "sơn đông",
            "hưng yên", "hải phòng", "cần thơ", "quảng ninh", "bình dương",
            "đồng nai", "nghệ an", "thanh hóa", "huế",
            "hoa kỳ", "mỹ", "nga", "nhật bản", "hàn quốc", "pháp", "anh", "đức",
            "bắc kinh", "quảng châu", "thượng hải", "thái lan", "singapore"
        ]
        t_low = text.lower()
        for loc in loc_patterns:
            if re.search(rf"\b{re.escape(loc)}\b", t_low):
                return loc.title()
        return None

    def _extract_attribution(self, text: str) -> str | None:
        """Extract speaker or publishing agency attribution."""
        attr_patterns = [
            r"theo\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)(?:,\s*|:\s*|\s+cho biết|\s+khẳng định|\s+thông báo)",
            r"được\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)\s+công bố",
            r"([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)\s+cho rằng",
            r"([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)\s+tuyên bố",
        ]
        for pat in attr_patterns:
            m = re.search(pat, text)
            if m:
                cand = m.group(1).strip()
                if len(cand) > 3 and len(cand.split()) <= 6:
                    return cand
        return None

    def _extract_slots(self, text: str) -> tuple[str | None, str | None, str | None]:
        """Rough slot tagging for Subject, Predicate, Object."""
        # Strip leading perception/reporting verbs if present
        clean_text = text.strip()
        for lead in ["phát hiện", "tìm thấy", "ghi nhận", "báo cáo", "xuất hiện"]:
            if clean_text.lower().startswith(lead):
                clean_text = clean_text[len(lead):].strip(" :,.-")
                break

        split_verbs = ["là", "đã", "đang", "sẽ", "được", "bị", "có thể", "khiến", "làm"]
        words = clean_text.split()
        if len(words) < 3:
            return clean_text, None, None
        
        for sv in split_verbs:
            if sv in words:
                idx = words.index(sv)
                subj = " ".join(words[:idx]).strip(" ,.-")
                pred = words[idx]
                obj = " ".join(words[idx+1:]).strip(" ,.-")
                return subj or None, pred, obj or None
        
        return " ".join(words[:3]), " ".join(words[3:5]), " ".join(words[5:])


# Global singleton
claim_article_aligner = ClaimArticleAligner()
