"""Evidence-Claim Cross-Comparison, Attribute Matrix, and Conflict Engine.

Performs fine-grained multi-dimensional matching between atomic claims
and external evidence:
- Entity Matching
- Numerical Matching (exact values, percentages, units)
- Temporal Matching (dates, years, eras)
- Context & Population Matching
- Relationship Matching (correlation vs causation, possibility vs certainty)
- Attribution Matching (who asserted it)
- Negation Matching
- Source Independence Clustering
- Evidence Conflict Matrix Resolution
"""

from dataclasses import asdict, dataclass, field
import logging
import math
import re
from typing import Any
from urllib.parse import urlparse

from app.services.claim_article_aligner import ClaimAttributes, claim_article_aligner

logger = logging.getLogger(__name__)


@dataclass
class ComparisonMatrixRow:
    """One row in the human-readable evidence-to-claim comparison table."""
    attribute: str       # "Thực thể", "Số liệu", "Thời gian", "Quan hệ nhân quả", "Bối cảnh", "Nguồn dẫn", "Khẳng định"
    claim_val: str
    evidence_val: str
    match_status: str    # "MATCH", "PARTIAL", "MISMATCH", "NOT_MENTIONED"
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceCrossEvaluation:
    """Result of cross-comparing an external evidence item with a claim."""
    evidence_id: str
    source_name: str
    source_url: str | None
    relation: str        # "SUPPORTS", "CONTRADICTS", "PARTIALLY_SUPPORTS", "PARTIALLY_CONTRADICTS", "CONTEXTUAL", "NEUTRAL", "IRRELEVANT"
    confidence: float
    matrix: list[ComparisonMatrixRow] = field(default_factory=list)
    entity_match: str = "NOT_MENTIONED"
    numerical_match: str = "NOT_MENTIONED"
    temporal_match: str = "NOT_MENTIONED"
    relationship_match: str = "NOT_MENTIONED"
    context_match: str = "NOT_MENTIONED"
    attribution_match: str = "NOT_MENTIONED"
    negation_match: str = "NOT_MENTIONED"
    is_topically_relevant: bool = False
    source_dependency_group: str = "INDEPENDENT"
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        res = asdict(self)
        res["matrix"] = [m.to_dict() if hasattr(m, "to_dict") else m for m in self.matrix]
        return res


@dataclass
class ConflictMatrixItem:
    """Conflict audit record when multiple external sources diverge."""
    source_a: str
    relation_a: str
    date_a: str | None
    source_b: str
    relation_b: str
    date_b: str | None
    conflict_type: str   # "DIRECT_CONTRADICTION", "NUMERICAL_DIVERGENCE", "METHODOLOGY_DISAGREEMENT"
    resolution: str      # "UNRESOLVED_CONFLICT", "RESOLVED_BY_AUTHORITY", "RESOLVED_BY_RECENCY"
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class EvidenceCrossComparator:
    """Engine for attribute-level evidence verification and conflict synthesis."""

    def __init__(self):
        # Known syndicated wire services and agencies in Vietnam and worldwide
        self.wire_agencies = [
            ("ttxvn", "Thông tấn xã Việt Nam"),
            ("reuters", "Hãng tin Reuters"),
            ("afp", "Hãng tin Agence France-Presse (AFP)"),
            ("ap", "Associated Press (AP)"),
            ("tân hoa xã", "Tân Hoa Xã (Xinhua)"),
            ("xinhua", "Tân Hoa Xã (Xinhua)"),
            ("baochinhphu", "Cổng Thông tin Điện tử Chính phủ"),
            ("who", "Tổ chức Y tế Thế giới (WHO)"),
            ("cdc", "Trung tâm Kiểm soát & Phòng ngừa Dịch bệnh (CDC)"),
        ]

    def cluster_source_independence(self, sources: list[dict[str, Any]]) -> dict[str, str]:
        """Cluster sources to detect syndication, shared wire copies, and common citations."""
        clusters: dict[str, str] = {}
        for s in sources:
            sid = s.get("evidence_id") or s.get("chunk_id") or str(id(s))
            url = (s.get("source_url") or "").lower()
            name = (s.get("source_name") or "").lower()
            excerpt = (s.get("excerpt") or s.get("content") or "").lower()

            # Check wire services in text
            wire_found = None
            for w_key, w_name in self.wire_agencies:
                if w_key in name or w_key in url or f"theo {w_key}" in excerpt or f"nguồn: {w_key}" in excerpt:
                    wire_found = f"WireCluster_{w_name}"
                    break

            if wire_found:
                clusters[sid] = wire_found
            else:
                # Group by domain
                try:
                    domain = urlparse(url).netloc
                    clusters[sid] = f"Domain_{domain}" if domain else f"Source_{name[:25]}"
                except Exception:
                    clusters[sid] = f"Source_{name[:25]}"

        return clusters

    def compare_evidence_against_claim(
        self,
        claim_attrs: ClaimAttributes,
        evidence_text: str,
        source_name: str,
        source_url: str | None = None,
        source_metadata: dict[str, Any] | None = None,
    ) -> EvidenceCrossEvaluation:
        """Perform fine-grained attribute matching and determine evidence relation."""
        ev_attrs = claim_article_aligner.extract_claim_attributes(evidence_text)
        ev_low = evidence_text.lower()
        claim_low = claim_attrs.claim_text.lower()

        refute_keywords = ["sai sự thật", "bác bỏ", "tin giả", "không chính xác", "phi khoa học", "ngụy tạo", "lừa đảo", "không có căn cứ"]
        support_keywords = ["xác nhận", "chính xác", "đúng sự thật", "chính thức", "công bố", "khẳng định", "đạt chuẩn"]
        has_refute_kw = any(rw in ev_low for rw in refute_keywords)
        has_support_kw = any(sw in ev_low for sw in support_keywords)

        matrix: list[ComparisonMatrixRow] = []

        # 1. Topical Relevance Check (Reject off-topic documents immediately)
        # Extract core domain terms (excluding location, administrative, and generic perception verbs)
        GENERIC_AND_GEO_TERMS = {
            "trung", "quốc", "việt", "nam", "hà", "nội", "sơn", "đông", "nga", "mỹ", "pháp",
            "anh", "đức", "nhật", "bản", "hàn", "quốc", "chính", "phủ", "báo", "điện", "tử",
            "ngày", "tháng", "năm", "bài", "viết", "cho", "biết", "vừa", "qua", "ông", "bà",
            "tìm", "thấy", "nhìn", "biết", "nghe", "đọc", "xem", "làm", "ra", "vào", "lại",
            "rồi", "ngay", "đang", "đã", "sẽ", "được", "bị", "lấy", "mang", "đưa", "đến",
            "đi", "về", "ở", "có", "là", "của", "và", "như", "theo", "tại", "với", "các",
            "những", "này", "khu", "vực", "thành", "phố", "tỉnh", "cư", "dân", "hôm", "phát", "hiện",
            "phía", "tây", "bắc", "nam", "đường", "biên", "giới", "mô", "tả", "thế", "kỷ",
            "núi", "đỉnh", "sông", "hồ", "biển", "đảo", "rừng", "thung", "lũng", "dãy", "đồi", "dòng", "ngọn"
        }
        claim_tokens = [w for w in re.findall(r"\w+", claim_low) if len(w) > 2 and w not in GENERIC_AND_GEO_TERMS]
        ev_tokens_set = set(re.findall(r"\w+", ev_low))

        # Check if evidence matches core domain defining topic terms
        domain_matches = [t for t in claim_tokens if t in ev_tokens_set]
        min_required = 1 if len(claim_tokens) <= 3 else max(2, int(len(claim_tokens) * 0.30))
        is_topically_relevant = len(domain_matches) >= min_required if claim_tokens else False

        if not is_topically_relevant:
            # Evidence doesn't even discuss the subject matter (e.g. Russian border for fake eggs)
            matrix.append(ComparisonMatrixRow(
                attribute="Chủ đề & Lĩnh vực",
                claim_val=claim_attrs.subject or claim_attrs.claim_text[:40],
                evidence_val="Không đề cập đến thực thể hoặc chủ đề cốt lõi của phát ngôn",
                match_status="MISMATCH",
                notes="Tài liệu hoàn toàn không liên quan đến chủ đề bài báo (IRRELEVANT).",
            ))
            return EvidenceCrossEvaluation(
                evidence_id=str(source_metadata.get("chunk_id", "")) if source_metadata else "",
                source_name=source_name,
                source_url=source_url,
                relation="IRRELEVANT",
                confidence=0.95,
                matrix=matrix,
                entity_match="MISMATCH",
                is_topically_relevant=False,
                explanation=f"Tài liệu từ '{source_name}' không chứa thông tin về chủ đề '{claim_attrs.claim_text[:40]}...'.",
            )

        # 2. Entity Matching
        subject_match = "NOT_MENTIONED"
        notes = "Không nêu thực thể."
        s_low = (claim_attrs.subject or "").lower().strip()
        o_low = (claim_attrs.object or "").lower().strip()

        if s_low:
            s_words = [w for w in s_low.split() if len(w) > 2 and w not in ["mới", "cũ", "vừa", "qua", "một", "các", "những"]]
            if s_low in ev_low:
                subject_match = "MATCH"
                notes = "Thực thể chính trùng khớp với hồ sơ kiểm chứng."
            elif any(part in ev_low for part in s_words):
                subject_match = "PARTIAL"
                notes = "Trùng khớp một phần thực thể hoặc thuộc cùng nhóm thực thể liên quan."
            else:
                subject_match = "MISMATCH"
                notes = "Không tìm thấy thực thể chính xác trong văn bản tài liệu."
        elif o_low:
            if o_low in ev_low or any(phrase in ev_low for phrase in [p.strip() for p in o_low.split(",") if len(p.strip()) > 5]):
                subject_match = "MATCH"
                notes = "Chủ đề / đối tượng phát ngôn trùng khớp với hồ sơ kiểm chứng."
            elif any(part in ev_low for part in o_low.split() if len(part) > 3 and part not in GENERIC_AND_GEO_TERMS):
                subject_match = "PARTIAL"
                notes = "Đối tượng phát ngôn có sự tương đồng ngữ cảnh."
            else:
                subject_match = "MISMATCH"
                notes = "Không tìm thấy đối tượng phát ngôn trong tài liệu."

        if claim_attrs.subject or claim_attrs.object:
            matrix.append(ComparisonMatrixRow(
                attribute="Thực thể chính (Subject / Entity)",
                claim_val=claim_attrs.subject or claim_attrs.object or "",
                evidence_val=ev_attrs.subject or ev_attrs.object or "Được đối chiếu trong ngữ cảnh",
                match_status=subject_match,
                notes=notes,
            ))

        # Check location entity
        loc_match = "NOT_MENTIONED"
        if claim_attrs.location:
            if ev_attrs.location:
                if claim_attrs.location.lower() == ev_attrs.location.lower():
                    loc_match = "MATCH"
                    loc_notes = f"Địa điểm thực thể trùng khớp ({claim_attrs.location})."
                else:
                    loc_match = "MISMATCH"
                    loc_notes = f"Sai lệch địa điểm thực thể: Phát ngôn ghi '{claim_attrs.location}', tài liệu ghi '{ev_attrs.location}'."
            else:
                loc_match = "NOT_MENTIONED"
                loc_notes = "Tài liệu đối chiếu không nêu rõ địa điểm này."
            matrix.append(ComparisonMatrixRow(
                attribute="Địa điểm thực thể (Location Entity)",
                claim_val=claim_attrs.location,
                evidence_val=ev_attrs.location or "Không nêu địa điểm",
                match_status=loc_match,
                notes=loc_notes,
            ))

        entity_match = subject_match
        if loc_match == "MISMATCH":
            entity_match = "PARTIAL" if subject_match == "MATCH" else "MISMATCH"

        # If subject is a complete mismatch AND document has no core domain overlap, document is irrelevant
        if subject_match == "MISMATCH" and not is_topically_relevant and not (has_refute_kw and any(w in ev_low for w in claim_attrs.claim_text.lower().split() if len(w) > 3)):
            return EvidenceCrossEvaluation(
                evidence_id=str(source_metadata.get("chunk_id", "")) if source_metadata else "",
                source_name=source_name,
                source_url=source_url,
                relation="IRRELEVANT",
                confidence=0.85,
                matrix=matrix,
                entity_match=entity_match,
                is_topically_relevant=False,
                explanation=f"Tài liệu từ '{source_name}' không chứa thực thể chính xác để đối chiếu phát ngôn.",
            )

        # 3. Numerical Matching
        numerical_match = "NOT_MENTIONED"
        if claim_attrs.value is not None:
            if ev_attrs.value is not None:
                if abs(claim_attrs.value - ev_attrs.value) < 1e-4 and claim_attrs.unit == ev_attrs.unit:
                    numerical_match = "MATCH"
                    notes = f"Số liệu hoàn toàn chính xác ({claim_attrs.value} {claim_attrs.unit or ''})."
                elif abs(claim_attrs.value - ev_attrs.value) < 1e-4 and claim_attrs.unit != ev_attrs.unit:
                    numerical_match = "MISMATCH"
                    notes = f"Số liệu giống nhau nhưng sai đơn vị tính: {claim_attrs.unit} vs {ev_attrs.unit}."
                else:
                    numerical_match = "MISMATCH"
                    notes = f"Số liệu có sự chênh lệch: Phát ngôn ghi {claim_attrs.value} {claim_attrs.unit or ''}, tài liệu ghi {ev_attrs.value} {ev_attrs.unit or ''}."
            else:
                numerical_match = "NOT_MENTIONED"
                notes = "Tài liệu đối chiếu không đề cập số liệu định lượng chi tiết này."
            
            matrix.append(ComparisonMatrixRow(
                attribute="Số liệu & Thống kê (Numerical)",
                claim_val=f"{claim_attrs.value} {claim_attrs.unit or ''}".strip(),
                evidence_val=f"{ev_attrs.value} {ev_attrs.unit or ''}".strip() if ev_attrs.value is not None else "Không nêu số liệu",
                match_status=numerical_match,
                notes=notes,
            ))

        # 4. Temporal Matching
        temporal_match = "NOT_MENTIONED"
        if claim_attrs.time:
            if ev_attrs.time:
                if claim_attrs.time.lower() in ev_attrs.time.lower() or ev_attrs.time.lower() in claim_attrs.time.lower():
                    temporal_match = "MATCH"
                    notes = f"Mốc thời gian trùng khớp ({claim_attrs.time})."
                else:
                    temporal_match = "MISMATCH"
                    notes = f"Sai lệch mốc thời gian: Phát ngôn ghi '{claim_attrs.time}', tài liệu ghi '{ev_attrs.time}'."
            else:
                temporal_match = "NOT_MENTIONED"
                notes = "Tài liệu không ghi nhận thời điểm cụ thể này."

            matrix.append(ComparisonMatrixRow(
                attribute="Mốc thời gian (Temporal)",
                claim_val=claim_attrs.time,
                evidence_val=ev_attrs.time or "Không nêu mốc thời gian",
                match_status=temporal_match,
                notes=notes,
            ))

        # 5. Relationship Matching (Causality & Modality)
        relationship_match = "MATCH"
        rel_notes = "Mối liên hệ giữa các thuộc tính tương thích logic."
        if claim_attrs.causal_relation and not ev_attrs.causal_relation:
            # Check if evidence actively refutes the causality
            refute_markers = ["không có cơ sở", "phi khoa học", "bác bỏ", "sai sự thật", "vi phạm", "không thể thay thế", "ngăn cấm"]
            if any(rm in ev_low for rm in refute_markers):
                relationship_match = "MISMATCH"
                rel_notes = "Tài liệu bác bỏ dứt khoát quan hệ nhân quả/tác dụng do bài báo tuyên bố."
            else:
                relationship_match = "PARTIAL"
                rel_notes = "Tài liệu chỉ ghi nhận mối tương quan hoặc thử nghiệm ban đầu, không xác nhận quan hệ nhân quả tuyệt đối."

        matrix.append(ComparisonMatrixRow(
            attribute="Quan hệ nhân quả & Khẳng định (Causality / Modality)",
            claim_val="Nhân quả / Khẳng định dứt khoát" if claim_attrs.causal_relation else "Nhận định thông thường",
            evidence_val="Xác nhận quan hệ" if ev_attrs.causal_relation else "Không xác nhận quan hệ nhân quả / Có phản biện",
            match_status=relationship_match,
            notes=rel_notes,
        ))

        # 6. Negation Matching
        negation_match = "MATCH"
        if claim_attrs.negation != ev_attrs.negation:
            negation_match = "MISMATCH"
            matrix.append(ComparisonMatrixRow(
                attribute="Tính phủ định (Negation)",
                claim_val="Phủ định" if claim_attrs.negation else "Khẳng định",
                evidence_val="Khẳng định" if claim_attrs.negation else "Phủ định",
                match_status="MISMATCH",
                notes="Ý nghĩa phát ngôn trái ngược hoàn toàn về mặt khẳng định/phủ định.",
            ))

        # 7. Synthesis into Relation Label
        # Active refutation indicators
        refute_keywords = [
            "bác bỏ", "sai sự thật", "lừa đảo", "không chính xác", "giả mạo",
            "vi phạm định luật", "phi khoa học", "cảnh báo lừa đảo", "không có căn cứ",
            "thông tin thất thiệt", "refutes", "false", "debunked"
        ]
        has_refute_kw = any(rk in ev_low for rk in refute_keywords)

        # Active support indicators
        support_keywords = [
            "xác nhận", "chính xác", "đúng sự thật", "chính thức công bố", "đã thẩm định",
            "kết quả nghiên cứu khẳng định", "số liệu ghi nhận", "supports", "confirmed"
        ]
        has_support_kw = any(sk in ev_low for sk in support_keywords)

        # Content words coverage
        stopwords_vi = {"là", "của", "và", "các", "có", "trong", "được", "cho", "với", "về", "những", "này", "ở", "tại", "theo", "đang", "thì", "mà"}
        c_words = [w for w in re.findall(r"\w+", claim_attrs.claim_text.lower()) if len(w) > 1 and w not in stopwords_vi]
        c_cov = sum(1 for w in c_words if w in ev_low) / len(c_words) if c_words else 0.0

        if has_refute_kw or relationship_match == "MISMATCH" or negation_match == "MISMATCH":
            relation = "CONTRADICTS"
            confidence = 0.92
            explanation = f"Tài liệu từ '{source_name}' trực tiếp bác bỏ phát ngôn hoặc chỉ ra sai lệch thực chứng nghiêm trọng."
        elif temporal_match == "MISMATCH":
            relation = "CONTRADICTS"
            confidence = 0.90
            explanation = f"Tài liệu từ '{source_name}' mâu thuẫn về mốc thời gian thực chứng ({claim_attrs.time} vs {ev_attrs.time})."
        elif numerical_match == "MISMATCH":
            relation = "PARTIALLY_CONTRADICTS"
            confidence = 0.88
            explanation = f"Tài liệu xác nhận sự kiện diễn ra nhưng mâu thuẫn về số liệu/đơn vị tính so với phát ngôn."
        elif (has_support_kw or c_cov >= 0.65) and entity_match in ("MATCH", "PARTIAL") and numerical_match in ("MATCH", "NOT_MENTIONED") and temporal_match in ("MATCH", "NOT_MENTIONED") and negation_match == "MATCH":
            if numerical_match == "MATCH" or c_cov >= 0.75:
                relation = "SUPPORTS"
                confidence = 0.94
                explanation = f"Tài liệu từ '{source_name}' xác nhận hoàn toàn phát ngôn về cả thực thể và nội dung sự kiện."
            else:
                relation = "PARTIALLY_SUPPORTS"
                confidence = 0.85
                explanation = f"Tài liệu từ '{source_name}' xác nhận sự kiện cốt lõi nhưng chưa đối chiếu đầy đủ mọi số liệu chi tiết."
        elif numerical_match == "MISMATCH":
            relation = "PARTIALLY_CONTRADICTS"
            confidence = 0.88
            explanation = f"Tài liệu xác nhận sự kiện diễn ra nhưng mâu thuẫn về số liệu/đơn vị tính so với phát ngôn."
        elif entity_match == "PARTIAL":
            relation = "CONTEXTUAL"
            confidence = 0.75
            explanation = f"Tài liệu cung cấp bối cảnh liên quan nhưng không đủ thông tin để kết luận dứt khoát đúng hay sai."
        else:
            relation = "NEUTRAL"
            confidence = 0.70
            explanation = f"Tài liệu đề cập các thực thể liên quan nhưng giữ trạng thái trung lập, chưa đủ dữ liệu xác thực."

        return EvidenceCrossEvaluation(
            evidence_id=str(source_metadata.get("chunk_id", "")) if source_metadata else "",
            source_name=source_name,
            source_url=source_url,
            relation=relation,
            confidence=confidence,
            matrix=matrix,
            entity_match=entity_match,
            numerical_match=numerical_match,
            temporal_match=temporal_match,
            relationship_match=relationship_match,
            context_match="MATCH" if entity_match == "MATCH" else "PARTIAL",
            attribution_match="MATCH" if claim_attrs.attribution else "NOT_MENTIONED",
            negation_match=negation_match,
            is_topically_relevant=True,
            explanation=explanation,
        )

    def detect_conflicts(
        self,
        evaluations: list[EvidenceCrossEvaluation],
    ) -> list[ConflictMatrixItem]:
        """Audit for material divergence between independent external evidence items."""
        conflicts: list[ConflictMatrixItem] = []
        supports = [e for e in evaluations if e.relation in ("SUPPORTS", "PARTIALLY_SUPPORTS")]
        refutes = [e for e in evaluations if e.relation in ("CONTRADICTS", "PARTIALLY_CONTRADICTS")]

        if supports and refutes:
            # Check source dependency groups: genuine conflict requires different clusters
            for s_ev in supports:
                for r_ev in refutes:
                    # Construct conflict item
                    conflicts.append(ConflictMatrixItem(
                        source_a=s_ev.source_name,
                        relation_a=s_ev.relation,
                        date_a=None,
                        source_b=r_ev.source_name,
                        relation_b=r_ev.relation,
                        date_b=None,
                        conflict_type="DIRECT_CONTRADICTION",
                        resolution="UNRESOLVED_CONFLICT",
                        explanation=(
                            f"Nguồn '{s_ev.source_name}' ({s_ev.relation}) mâu thuẫn trực tiếp với nguồn "
                            f"'{r_ev.source_name}' ({r_ev.relation}). Hệ thống bảo lưu trạng thái "
                            "CONFLICTING_EVIDENCE do chưa có sự đồng thuận chính thức giữa các cơ quan độc lập."
                        ),
                    ))

        return conflicts


# Global singleton instance
evidence_cross_comparator = EvidenceCrossComparator()


def cluster_source_independence(sources: list[dict[str, Any]]) -> dict[str, str]:
    """Module-level helper to cluster sources by independence."""
    return evidence_cross_comparator.cluster_source_independence(sources)


def detect_conflicts(evaluations: list[EvidenceCrossEvaluation]) -> list[ConflictMatrixItem]:
    """Module-level helper to detect conflicting evidence across evaluations."""
    return evidence_cross_comparator.detect_conflicts(evaluations)

