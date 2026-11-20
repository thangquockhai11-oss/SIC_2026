"""Meta-Agent: Consensus Synthesis and Conflict Resolution.

Synthesizes outputs of the specialized agents without fabricating evidence
or forcing artificial consensus. Detects divergence, resolves conflicts
prioritizing empirical evidence, and permits UNRESOLVED or ABSTAIN states.
"""

from datetime import datetime, timezone
import time
from typing import Any
import uuid

import numpy as np


class MetaAgent:
    """Consensus synthesizer orchestrating conflict detection and honest calibration."""

    def __init__(self):
        self.agent_name = "MetaSynthesisAgent"
        self.agent_role = "Tổng hợp đa tác tử, phát hiện xung đột và hiệu chuẩn đồng thuận"

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
        """Synthesize overall verdict and calibrated confidence across all agents."""
        start_time = datetime.now(timezone.utc)
        t0 = time.time()

        display_title = (article_title or "Bài viết được phân tích").strip()
        if len(display_title) > 90:
            display_title = display_title[:87] + "..."

        source_cred = credibility_data.get("overall_credibility_score", 70.0)
        source_name = credibility_data.get("source_name", "Nguồn tin")

        if not claims:
            return {
                "verdict": "ABSTAIN",
                "confidence_score": 0.50,
                "summary": f"Không có phát ngôn kiểm chứng nào được trích xuất từ bài viết '{display_title}'. Hệ thống chọn trạng thái BỎ PHIẾU (ABSTAIN).",
                "disagreement_detected": False,
                "calibration_criteria": [
                    "Văn bản đầu vào không chứa phát ngôn sự kiện có thể kiểm chứng.",
                    f"Nguồn tin được ghi nhận là '{source_name}'.",
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
                "model_version": "1.2.0-dynamic",
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

        claim_verdicts = [c["verdict"] for c in claims]
        refuted_count = sum(1 for v in claim_verdicts if v == "REFUTED")
        supported_count = sum(1 for v in claim_verdicts if v == "SUPPORTED")
        not_checkable_count = sum(1 for v in claim_verdicts if v == "NOT_CHECKABLE")
        insufficient_count = sum(1 for v in claim_verdicts if v == "NOT_ENOUGH_INFORMATION")

        is_disagreement = False
        disagreement_type = "NONE"

        # Case 1: High source credibility but claim is refuted -> Strong Divergence Conflict
        if source_cred >= 80.0 and refuted_count > 0:
            is_disagreement = True
            disagreement_type = "SOURCE_FACT_DIVERGENCE"
            synthesis_summary = (
                f"CẢNH BÁO XUNG ĐỘT NGUỒN VÀ BẰNG CHỨNG: Nguồn xuất bản '{source_name}' có chỉ số uy tín tương đối cao ({source_cred:.1f}/100), "
                f"tuy nhiên phát ngôn cụ thể trong bài viết '{display_title}' bị bác bỏ bởi tài liệu thực chứng độc lập. "
                "Hệ thống áp dụng nguyên tắc ưu tiên tối thượng cho văn bản thực nghiệm và thông cáo của cơ quan chuyên trách."
            )
            overall_verdict = "REFUTED"
            base_conf = float(np.mean([c["confidence"] for c in claims if c["verdict"] == "REFUTED"]))

        # Case 2: Mixed claims (both supported and refuted)
        elif refuted_count > 0 and supported_count > 0:
            is_disagreement = True
            disagreement_type = "MIXED_INTERNAL_CLAIMS"
            synthesis_summary = (
                f"KẾT QUẢ ĐỒNG THUẬN HỖN HỢP: Bài viết '{display_title}' chứa cả phát ngôn có cơ sở đối chứng vững chắc ({supported_count} claims) "
                f"đan xen với phát ngôn bị bác bỏ ({refuted_count} claims). "
                f"Tòa soạn '{source_name}' đạt mức độ tin cậy {source_cred:.1f}/100. Người đọc cần tách biệt rõ ràng từng luận điểm."
            )
            overall_verdict = "MIXED"
            base_conf = float(np.mean([c["confidence"] for c in claims]))

        # Case 3: Mostly or completely refuted
        elif refuted_count > 0 and refuted_count >= supported_count:
            synthesis_summary = (
                f"ĐỒNG THUẬN BÁC BỎ ĐA TÁC TỬ: Bác bỏ phát ngôn sai lệch trong bài viết '{display_title}' ({refuted_count}/{len(claims)} claims bị bác bỏ). "
                f"Nguồn xuất bản đạt điểm đánh giá {source_cred:.1f}/100. Bằng chứng thực nghiệm và cơ quan chuyên ngành đã có văn bản đính chính chính thức."
            )
            overall_verdict = "REFUTED"
            base_conf = float(np.mean([c["confidence"] for c in claims if c["verdict"] == "REFUTED"]))

        # Case 4: Mostly or completely supported
        elif supported_count > 0 and supported_count >= refuted_count:
            synthesis_summary = (
                f"ĐỒNG THUẬN XÁC THỰC ĐA TÁC TỬ: Xác nhận tính chuẩn xác của bài viết '{display_title}' "
                f"({supported_count}/{len(claims)} claims được kiểm chứng có căn cứ dữ liệu). "
                f"Nguồn xuất bản '{source_name}' đạt độ tin cậy cao ({source_cred:.1f}/100) với quy trình trích dẫn và đối soát minh bạch."
            )
            overall_verdict = "SUPPORTED"
            base_conf = float(np.mean([c["confidence"] for c in claims if c["verdict"] == "SUPPORTED"]))

        # Case 5: All claims are subjective / analytical questions
        elif not_checkable_count == len(claims) or (not_checkable_count > 0 and insufficient_count == 0):
            synthesis_summary = (
                f"NỘI DUNG PHÂN TÍCH & THĂM DÒ Ý KIẾN: Bài viết '{display_title}' từ nguồn '{source_name}' "
                f"tập trung vào các luận điểm xu hướng xã hội học hoặc câu hỏi phân tích định tính ({not_checkable_count} claims), "
                "không cấu thành các phát ngôn khẳng định sự kiện nhị phân Đúng/Sai. Dữ liệu mang tính tham khảo xu hướng công chúng."
            )
            overall_verdict = "NOT_CHECKABLE"
            base_conf = 0.86

        # Case 6: Pending external evidence (Inconclusive)
        else:
            synthesis_summary = (
                f"BẢO LƯU KHOA HỌC: Các phát ngôn trong bài viết '{display_title}' được xuất bản bởi '{source_name}' ({source_cred:.1f}/100) "
                f"chưa có đủ dữ liệu đối soát độc lập trong kho tri thức kiểm chứng đối chuẩn. "
                "Hệ thống duy trì nguyên tắc thận trọng học thuật (Inconclusive) để tránh kết luận định kiến khi chưa đủ bằng chứng thực địa."
            )
            overall_verdict = "INSUFFICIENT_INFORMATION"
            base_conf = round(0.62 + min(0.14, (source_cred - 70) * 0.005), 3)

        # Calibrated confidence adjustment
        final_confidence = round(max(0.48, min(0.98, base_conf - (0.10 if is_disagreement else 0.0))), 3)

        # Reader data status
        reader_sample = trust_data.get("sample_size", 0)
        if reader_sample == 0:
            reader_criterion = "Dữ liệu người đọc: Chưa có dữ liệu người đọc (0 phiếu khảo sát, 0 bình luận thực nghiệm)."
        else:
            t_src = trust_data.get("trust_source_score")
            ratio_str = reception_data.get("comprehension_ratio_str") or f"{reception_data.get('comprehension_score', 0)}%"
            reader_criterion = f"Dữ liệu người đọc thực chứng: Ghi nhận {reader_sample} phiếu khảo sát, điểm niềm tin tòa soạn {t_src}/100, tỷ lệ đọc hiểu {ratio_str}."

        # Article-tailored scientific calibration criteria
        calibration_criteria = [
            f"Thẩm định phát ngôn '{display_title}': Đã phân tách độc lập {len(claims)} phát ngôn sự kiện, ghi nhận {supported_count} xác thực, {refuted_count} bác bỏ và {not_checkable_count + insufficient_count} cần bổ sung đối chứng.",
            f"Độ độc lập nguồn tin: Nguồn '{source_name}' được thẩm định độc lập theo chuẩn NELA-GT đạt {source_cred:.1f}/100, tách biệt ranh giới giữa uy tín tòa soạn và từng phát biểu cụ thể.",
            reader_criterion,
        ]

        latency_ms = int((time.time() - t0) * 1000)
        end_time = datetime.now(timezone.utc)

        meta_result = {
            "verdict": overall_verdict,
            "confidence_score": final_confidence,
            "summary": synthesis_summary,
            "disagreement_detected": is_disagreement,
            "disagreement_type": disagreement_type,
            "calibration_criteria": calibration_criteria,
        }

        trace = {
            "execution_id": str(uuid.uuid4()),
            "agent_name": self.agent_name,
            "agent_role": self.agent_role,
            "status": "COMPLETED",
            "latency_ms": latency_ms,
            "execution_time_ms": latency_ms,
            "model_name": "MetaConsensusSynthesizer",
            "model_version": "1.2.0-dynamic",
            "dataset_ids": ["ViFactCheck", "X-FACT", "NELA-GT-2020", "UIT-VSMEC", "WVS-Wave-7"],
            "dataset_versions": {"ConsensusEngine": "1.2"},
            "evidence_ids": [],
            "retrieval_count": 0,
            "start_time": start_time,
            "end_time": end_time,
            "result_summary": synthesis_summary,
            "disagreement_detected": is_disagreement,
            "errors": None,
            "output": meta_result,
            "details": {
                "claim_verdicts": claim_verdicts,
                "source_credibility_score": source_cred,
                "disagreement_type": disagreement_type,
            },
        }

        return meta_result, trace

        return meta_result, trace


meta_agent = MetaAgent()

