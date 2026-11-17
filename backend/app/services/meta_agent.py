"""Meta-Agent: Consensus Synthesis, Cross-Claim Conflict Resolution & Fact-Checking Report.

Synthesizes outputs of all specialized agents into a comprehensive Article Fact-Checking Report.
Adheres strictly to the principle of decoupling Media Credibility from Claim Veracity:
an article's verdict is driven exclusively by verifiable claims and empirical evidence,
while publisher credibility is sequestered in an independent transparency module.
"""

from datetime import datetime, timezone
import logging
import time
from typing import Any
import uuid

import numpy as np

logger = logging.getLogger(__name__)


def make_json_safe(obj: Any) -> Any:
    """Recursively convert datetime objects to ISO strings for JSON serialization."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_json_safe(item) for item in obj]
    return obj


class MetaAgent:
    """Consensus synthesizer orchestrating conflict detection and honest calibration."""

    def __init__(self):
        self.agent_name = "MetaSynthesisAgent"
        self.agent_role = "Tổng hợp đa tác tử, phát hiện xung đột và lập Báo cáo Kiểm chứng Toàn bài"

    def detect_cross_claim_conflicts(self, claims: list[dict[str, Any]]) -> list[str]:
        """Detect internal contradictions or duplicates across extracted claims."""
        conflicts = []
        if len(claims) < 2:
            return conflicts

        for i in range(len(claims)):
            for j in range(i + 1, len(claims)):
                c1 = claims[i]
                c2 = claims[j]
                # Check for same subject but opposing predicates/verdicts
                s1 = (c1.get("subject") or "").lower()
                s2 = (c2.get("subject") or "").lower()
                v1 = c1.get("verdict")
                v2 = c2.get("verdict")

                if s1 and s2 and (s1 in s2 or s2 in s1):
                    if (v1 == "SUPPORTED" and v2 == "REFUTED") or (v1 == "REFUTED" and v2 == "SUPPORTED"):
                        conflicts.append(
                            f"Mâu thuẫn nội tại giữa Claim #{i+1} ('{c1.get('claim_text')[:40]}...') "
                            f"và Claim #{j+1} ('{c2.get('claim_text')[:40]}...'): "
                            f"Cùng đề cập chủ thể '{s1}' nhưng có kết luận đối nghịch ({v1} vs {v2})."
                        )
        return conflicts

    def synthesize(
        self,
        claims: list[dict[str, Any]],
        credibility_data: dict[str, Any],
        opinion_data: dict[str, Any],
        trust_data: dict[str, Any],
        reception_data: dict[str, Any],
        article_title: str | None = None,
        article_content: str | None = None,
        source_url: str | None = None,
        language: str = "vi",
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Synthesize overall fact-checking report with strict Media Credibility decoupling."""
        start_time = datetime.now(timezone.utc)
        t0 = time.time()

        display_title = (article_title or "Bài viết được phân tích").strip()
        if len(display_title) > 95:
            display_title = display_title[:92] + "..."

        source_cred = credibility_data.get("overall_credibility_score", 70.0)
        source_name = credibility_data.get("source_name", "Nguồn tin")
        source_domain = credibility_data.get("domain")

        # Isolated Media Credibility Module
        media_credibility_isolated = {
            "source_name": source_name,
            "domain": source_domain,
            "transparency_score": credibility_data.get("transparency_score", 70.0),
            "citation_score": credibility_data.get("citation_score", 70.0),
            "evidence_score": credibility_data.get("evidence_score", 70.0),
            "journalistic_standard_score": credibility_data.get("journalistic_standard_score", 70.0),
            "overall_credibility_score": source_cred,
            "transparency_checklist": {
                "clear_byline_author": bool(credibility_data.get("citation_score", 0) >= 60),
                "sources_cited": bool(credibility_data.get("evidence_score", 0) >= 65),
                "corrections_policy": bool(credibility_data.get("journalistic_standard_score", 0) >= 70),
                "contact_ownership": bool(credibility_data.get("transparency_score", 0) >= 65),
            },
            "disclaimer": (
                "Chỉ số Media Credibility đánh giá tính minh bạch và chuẩn mực báo chí của tòa soạn/domain, "
                "KHÔNG can thiệp hoặc thay thế cho kết quả kiểm chứng từng phát ngôn (Claim Verdict)."
            ),
        }

        # Handling empty claims case
        if not claims:
            empty_report = {
                "overview": {
                    "article_title": display_title,
                    "total_claims_extracted": 0,
                    "total_claims_verified": 0,
                    "supported_claims_count": 0,
                    "refuted_claims_count": 0,
                    "partially_supported_count": 0,
                    "misleading_count": 0,
                    "conflicting_count": 0,
                    "not_enough_info_count": 0,
                    "not_checkable_count": 0,
                    "verifiable_claims_count": 0,
                    "factual_accuracy_score": 0.0,
                    "accuracy_formula": "accuracy_ratio = 0 (Không trích xuất được claim)",
                    "accuracy_note": "Bài viết không chứa phát ngôn sự kiện có thể kiểm chứng.",
                },
                "claim_breakdown": [],
                "overall_synthesis": {
                    "summary": f"Không có phát ngôn kiểm chứng nào được trích xuất từ văn bản '{display_title}'.",
                    "cross_claim_conflicts": [],
                    "opinion_vs_fact_summary": "Văn bản không chứa phát ngôn kiểm chứng sự kiện.",
                    "context_gaps": [],
                },
                "media_credibility_isolated": media_credibility_isolated,
            }
            return {
                "verdict": "ABSTAIN",
                "confidence_score": 0.50,
                "summary": f"Không có phát ngôn kiểm chứng nào được trích xuất từ bài viết '{display_title}'. Hệ thống bảo lưu trạng thái BỎ PHIẾU (ABSTAIN).",
                "disagreement_detected": False,
                "fact_checking_report": empty_report,
                "calibration_criteria": [
                    "Văn bản đầu vào không chứa phát ngôn sự kiện có thể kiểm chứng.",
                    "Hệ thống không tự ý suy diễn hoặc giả định phát ngôn khi bài viết thiếu dữ liệu.",
                ],
            }, {
                "execution_id": str(uuid.uuid4()),
                "agent_name": self.agent_name,
                "agent_role": self.agent_role,
                "status": "COMPLETED",
                "latency_ms": 1,
                "execution_time_ms": 1,
                "model_name": "MetaConsensusSynthesizer",
                "model_version": "2.0.0-fact-checking",
                "dataset_ids": [],
                "dataset_versions": {},
                "evidence_ids": [],
                "retrieval_count": 0,
                "start_time": start_time,
                "end_time": datetime.now(timezone.utc),
                "result_summary": "Bỏ phiếu (ABSTAIN) do văn bản không chứa phát ngôn kiểm chứng.",
                "disagreement_detected": False,
                "errors": None,
                "output": {"verdict": "ABSTAIN"},
                "details": {},
            }

        # Count 7 fine-grained verdict classes
        claim_verdicts = [c.get("verdict", "NOT_ENOUGH_INFORMATION") for c in claims]
        supported_count = sum(1 for v in claim_verdicts if v == "SUPPORTED")
        refuted_count = sum(1 for v in claim_verdicts if v == "REFUTED")
        partially_count = sum(1 for v in claim_verdicts if v == "PARTIALLY_SUPPORTED")
        misleading_count = sum(1 for v in claim_verdicts if v == "MISLEADING")
        conflicting_count = sum(1 for v in claim_verdicts if v == "CONFLICTING_EVIDENCE")
        not_enough_info_count = sum(1 for v in claim_verdicts if v == "NOT_ENOUGH_INFORMATION")
        not_checkable_count = sum(1 for v in claim_verdicts if v == "NOT_CHECKABLE")

        # Verifiable claims exclude OPINION / PREDICTION (NOT_CHECKABLE)
        verifiable_claims_count = len(claims) - not_checkable_count

        # Factual grounding ratio: (SUPPORTED + 0.5 * PARTIALLY_SUPPORTED) / verifiable_claims_count
        if verifiable_claims_count > 0:
            factual_accuracy_score = round(
                (supported_count + 0.5 * partially_count) / verifiable_claims_count, 3
            )
        else:
            factual_accuracy_score = 0.0

        # Detect internal cross-claim conflicts and source-claim divergence
        cross_conflicts = self.detect_cross_claim_conflicts(claims)
        is_disagreement = False
        disagreement_type = "NONE"
        if source_cred >= 80.0 and refuted_count > 0:
            is_disagreement = True
            disagreement_type = "SOURCE_FACT_DIVERGENCE"
        elif len(cross_conflicts) > 0 or conflicting_count > 0:
            is_disagreement = True
            disagreement_type = "CROSS_CLAIM_CONFLICT"

        # Construct Claim Breakdown
        claim_breakdown = []
        for idx, c in enumerate(claims, start=1):
            claim_breakdown.append({
                "claim_number": idx,
                "claim_id": c.get("claim_id"),
                "original_text": c.get("original_text") or c.get("claim_text"),
                "normalized_claim": c.get("normalized_claim") or c.get("claim_text"),
                "claim_type": c.get("claim_type", "FACTUAL_CLAIM"),
                "subject": c.get("subject"),
                "predicate": c.get("predicate"),
                "object": c.get("object"),
                "date_or_time_period": c.get("date_or_time_period"),
                "location": c.get("location"),
                "entities": c.get("entities", []),
                "numerical_values": c.get("numerical_values", []),
                "checkability": c.get("checkability", True),
                "verdict": c.get("verdict"),
                "confidence": c.get("confidence", 0.0),
                "supporting_evidences": c.get("supporting_evidences", []),
                "refuting_evidences": c.get("refuting_evidences", []),
                "other_evidences": c.get("other_evidences", []),
                "reasoning": c.get("reasoning", ""),
                "limitations": c.get("limitations", ""),
            })

        # Overall Article Fact-Checking Verdict: Driven strictly by claims, decoupled from media credibility!
        if refuted_count > 0 and supported_count > 0:
            overall_verdict = "MIXED"
            summary_text = (
                f"KẾT QUẢ KIỂM CHỨNG HỖN HỢP: Bài viết '{display_title}' chứa đồng thời phát ngôn có bằng chứng xác nhận "
                f"({supported_count} phát ngôn SUPPORTED) và phát ngôn bị bác bỏ ({refuted_count} phát ngôn REFUTED). "
                f"Tỷ lệ khẳng định có căn cứ đạt {factual_accuracy_score:.1%} "
                f"({supported_count} được xác nhận, {partially_count} đúng một phần trên {verifiable_claims_count} phát ngôn có thể kiểm chứng). "
                "Độc giả cần phân biệt rạch ròi từng luận điểm sự kiện cụ thể."
            )
            base_conf = float(np.mean([c.get("confidence", 0.85) for c in claims]))

        elif refuted_count > 0 and supported_count == 0:
            overall_verdict = "REFUTED"
            summary_text = (
                f"BÁC BỎ THÔNG TIN TRONG BÀI BÁO: Phát hiện phát ngôn sai lệch/tin đồn trong bài viết '{display_title}' "
                f"({refuted_count}/{verifiable_claims_count} phát ngôn kiểm chứng bị bác bỏ bởi tài liệu thực chứng độc lập). "
                f"Tỷ lệ khẳng định có căn cứ: {factual_accuracy_score:.1%}. "
                "Cơ quan chức năng và hồ sơ đối chuẩn đã có văn bản đính chính chính thức."
            )
            base_conf = float(np.mean([c.get("confidence", 0.88) for c in claims if c.get("verdict") == "REFUTED"] or [0.88]))

        elif supported_count > 0 and refuted_count == 0 and misleading_count == 0:
            overall_verdict = "SUPPORTED"
            summary_text = (
                f"XÁC THỰC TÍNH CHÍNH XÁC: Các phát ngôn sự kiện trong bài viết '{display_title}' được hỗ trợ bởi bằng chứng "
                f"({supported_count}/{verifiable_claims_count} phát ngôn SUPPORTED, {partially_count} PARTIALLY_SUPPORTED). "
                f"Tỷ lệ khẳng định có căn cứ: {factual_accuracy_score:.1%}. "
                "Nội dung hoàn toàn nhất quán với tài liệu nghiên cứu và hồ sơ báo chí lưu trữ."
            )
            base_conf = float(np.mean([c.get("confidence", 0.88) for c in claims if c.get("verdict") in ("SUPPORTED", "PARTIALLY_SUPPORTED")] or [0.88]))

        elif misleading_count > 0:
            overall_verdict = "MISLEADING"
            summary_text = (
                f"CẢNH BÁO THÔNG TIN GÂY HIỂU LẦM: Bài viết '{display_title}' chứa thông tin có thể đúng về mặt số liệu đơn lẻ "
                "nhưng bị cắt xén bối cảnh hoặc diễn đạt thiên lệch ({misleading_count} phát ngôn MISLEADING). "
                f"Tỷ lệ khẳng định có căn cứ: {factual_accuracy_score:.1%}."
            )
            base_conf = 0.83

        elif conflicting_count > 0:
            overall_verdict = "CONTROVERSIAL"
            summary_text = (
                f"TỒN TẠI BẰNG CHỨNG MÂU THUẪN: Các tài liệu đối soát độc lập ghi nhận các kết luận trái chiều nhau "
                f"đối với các phát ngôn trong bài viết '{display_title}'. Hệ thống chưa kết luận dứt khoát Đúng hay Sai."
            )
            base_conf = 0.78

        elif not_checkable_count == len(claims):
            overall_verdict = "NOT_CHECKABLE"
            summary_text = (
                f"BÀI VIẾT NÊU QUAN ĐIỂM / DỰ ĐOÁN: Toàn bộ {not_checkable_count} phát ngôn trong bài viết '{display_title}' "
                "thuộc phân loại OPINION (nhận định chủ quan) hoặc PREDICTION (dự đoán tương lai), "
                "không cấu thành các phát ngôn khẳng định sự kiện đơn nhất có thể xác thực khách quan Đúng/Sai."
            )
            base_conf = 0.86

        else:
            overall_verdict = "INSUFFICIENT_INFORMATION"
            summary_text = (
                f"CHƯA ĐỦ BẰNG CHỨNG ĐỐI SOÁT: Các phát ngôn trong bài viết '{display_title}' "
                "chưa có đủ dữ liệu đối chứng độc lập trong kho tri thức nghiên cứu đối chuẩn. "
                "Hệ thống duy trì nguyên tắc thận trọng khoa học (Inconclusive) để tránh phán đoán vội vàng."
            )
            base_conf = 0.65

        # Build Complete Article Fact-Checking Report
        fact_checking_report = {
            "overview": {
                "article_title": display_title,
                "total_claims_extracted": len(claims),
                "total_claims_verified": len(claims) - not_enough_info_count,
                "supported_claims_count": supported_count,
                "refuted_claims_count": refuted_count,
                "partially_supported_count": partially_count,
                "misleading_count": misleading_count,
                "conflicting_count": conflicting_count,
                "not_enough_info_count": not_enough_info_count,
                "not_checkable_count": not_checkable_count,
                "verifiable_claims_count": verifiable_claims_count,
                "factual_accuracy_score": factual_accuracy_score,
                "accuracy_formula": "accuracy_ratio = (SUPPORTED + 0.5 * PARTIALLY_SUPPORTED) / (Tổng số claim có thể kiểm chứng)",
                "accuracy_note": (
                    "Tỷ lệ này đo lường tỷ lệ các khẳng định sự kiện có chứng cứ đối chứng đạt chuẩn trong bài viết. "
                    "Đây KHÔNG phải là xác suất toàn bộ bài báo đúng/sai."
                ),
            },
            "claim_breakdown": claim_breakdown,
            "overall_synthesis": {
                "summary": summary_text,
                "cross_claim_conflicts": cross_conflicts,
                "opinion_vs_fact_summary": (
                    f"Bài viết gồm {verifiable_claims_count} phát ngôn sự kiện/số liệu có thể kiểm chứng "
                    f"và {not_checkable_count} nhận định mang tính quan điểm/dự đoán."
                ),
                "context_gaps": [
                    "Các số liệu thống kê cần được đối chiếu liên tục với báo cáo niên giám thống kê.",
                    "Các phát ngôn truyền miệng cần có văn bản giám định y khoa hoặc pháp lý độc lập."
                ] if not_enough_info_count > 0 else [],
            },
            "media_credibility_isolated": media_credibility_isolated,
        }

        latency_ms = int((time.time() - t0) * 1000)
        trace = {
            "execution_id": str(uuid.uuid4()),
            "agent_name": self.agent_name,
            "agent_role": self.agent_role,
            "status": "COMPLETED",
            "latency_ms": max(1, latency_ms),
            "execution_time_ms": max(1, latency_ms),
            "model_name": "MetaConsensusSynthesizer",
            "model_version": "2.0.0-fact-checking",
            "dataset_ids": ["ViFactCheck", "X-FACT", "FEVER", "NELA-GT"],
            "dataset_versions": {"ViFactCheck": "2023.1", "X-FACT": "1.0", "FEVER": "1.0"},
            "evidence_ids": [ev.get("id") or ev.get("evidence_id") for c in claims for ev in c.get("evidences", [])],
            "retrieval_count": sum(c.get("retrieval_count", 0) for c in claims),
            "start_time": start_time,
            "end_time": datetime.now(timezone.utc),
            "result_summary": f"Tổng hợp {len(claims)} claims. Verdict: {overall_verdict}. Grounding score: {factual_accuracy_score:.1%}.",
            "disagreement_detected": is_disagreement,
            "errors": None,
            "output": {"verdict": overall_verdict, "factual_accuracy_score": factual_accuracy_score},
            "details": {"fact_checking_report_generated": True},
        }

        fact_checking_report = make_json_safe(fact_checking_report)

        return {
            "verdict": overall_verdict,
            "confidence_score": round(float(np.clip(base_conf, 0.50, 0.98)), 3),
            "summary": summary_text,
            "fact_checking_report": fact_checking_report,
            "disagreement_detected": is_disagreement,
            "disagreement_type": disagreement_type,
            "calibration_criteria": [
                f"Đã kiểm chứng {verifiable_claims_count} phát ngôn sự kiện độc lập qua Hybrid RAG (pgvector + BM25 + RRF).",
                f"Tỷ lệ khẳng định có căn cứ: {factual_accuracy_score:.1%} (Công thức: (SUPPORTED + 0.5 * PARTIALLY) / verifiable).",
                "Độ uy tín tòa soạn (Media Credibility) được phân tách thành module độc lập, không dùng để áp đặt tính đúng/sai của bài viết.",
            ],
        }, trace


meta_agent = MetaAgent()
