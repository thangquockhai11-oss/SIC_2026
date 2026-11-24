"""
Verification State Machine for TrustMedia AI.
Enforces strict transitions and conservative abstention rules:
PENDING -> ARTICLE_EXTRACTED -> CLAIMS_EXTRACTED -> CLAIM_FIDELITY_CHECKED
-> EVIDENCE_RETRIEVED -> EVIDENCE_RELEVANCE_VALIDATED -> CROSS_VERIFICATION_COMPLETED -> VERDICT_READY.
"""

from datetime import datetime, timezone
from enum import Enum
import logging
from typing import Any, Literal

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class VerificationStage(str, Enum):
    PENDING = "PENDING"
    ARTICLE_EXTRACTED = "ARTICLE_EXTRACTED"
    CLAIMS_EXTRACTED = "CLAIMS_EXTRACTED"
    CLAIM_FIDELITY_CHECKED = "CLAIM_FIDELITY_CHECKED"
    EVIDENCE_RETRIEVED = "EVIDENCE_RETRIEVED"
    EVIDENCE_RELEVANCE_VALIDATED = "EVIDENCE_RELEVANCE_VALIDATED"
    CROSS_VERIFICATION_COMPLETED = "CROSS_VERIFICATION_COMPLETED"
    VERDICT_READY = "VERDICT_READY"
    FAILED = "FAILED"


# Legal linear state transitions
VALID_TRANSITIONS: dict[VerificationStage, set[VerificationStage]] = {
    VerificationStage.PENDING: {VerificationStage.ARTICLE_EXTRACTED, VerificationStage.FAILED},
    VerificationStage.ARTICLE_EXTRACTED: {VerificationStage.CLAIMS_EXTRACTED, VerificationStage.FAILED},
    VerificationStage.CLAIMS_EXTRACTED: {VerificationStage.CLAIM_FIDELITY_CHECKED, VerificationStage.FAILED},
    VerificationStage.CLAIM_FIDELITY_CHECKED: {VerificationStage.EVIDENCE_RETRIEVED, VerificationStage.FAILED},
    VerificationStage.EVIDENCE_RETRIEVED: {VerificationStage.EVIDENCE_RELEVANCE_VALIDATED, VerificationStage.FAILED},
    VerificationStage.EVIDENCE_RELEVANCE_VALIDATED: {VerificationStage.CROSS_VERIFICATION_COMPLETED, VerificationStage.FAILED},
    VerificationStage.CROSS_VERIFICATION_COMPLETED: {VerificationStage.VERDICT_READY, VerificationStage.FAILED},
    VerificationStage.VERDICT_READY: set(),
    VerificationStage.FAILED: set(),
}


class StateTransitionEvent(BaseModel):
    from_stage: VerificationStage
    to_stage: VerificationStage
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reason: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClaimVerificationStateMachine:
    """
    Manages the lifecycle of a claim verification pipeline.
    Prevents premature verdicts or unvalidated evidence from polluting fact-checking results.
    """

    def __init__(self, claim_id: str, claim_text: str):
        self.claim_id = claim_id
        self.claim_text = claim_text
        self.current_stage = VerificationStage.PENDING
        self.history: list[StateTransitionEvent] = []
        self.final_verdict: str | None = None
        self.confidence: float = 0.0
        self.abstention_reason: str | None = None

    def transition_to(self, target_stage: VerificationStage, reason: str = "", metadata: dict[str, Any] | None = None) -> bool:
        """Attempt to transition to next stage. Enforces state graph validity."""
        allowed = VALID_TRANSITIONS.get(self.current_stage, set())
        if target_stage not in allowed:
            err_msg = (
                f"Invalid state transition for claim {self.claim_id}: "
                f"Cannot jump from {self.current_stage} to {target_stage}. "
                f"Allowed transitions: {allowed}"
            )
            logger.error(err_msg)
            self.history.append(
                StateTransitionEvent(
                    from_stage=self.current_stage,
                    to_stage=VerificationStage.FAILED,
                    reason=err_msg,
                )
            )
            self.current_stage = VerificationStage.FAILED
            return False

        event = StateTransitionEvent(
            from_stage=self.current_stage,
            to_stage=target_stage,
            reason=reason,
            metadata=metadata or {},
        )
        self.history.append(event)
        self.current_stage = target_stage
        return True

    def resolve_conservative_verdict(
        self,
        valid_evidences: list[dict[str, Any]],
        conflicts: list[Any],
        has_support: bool,
        has_refute: bool,
        has_partial: bool = False,
        support_conf: float = 0.85,
        refute_conf: float = 0.85,
    ) -> tuple[str, float, str]:
        """
        Enforce Section E conservative rules:
        1. Evidence retrieval failure / empty: NOT_ENOUGH_INFORMATION
        2. No relevant evidence / only IRRELEVANT: NOT_ENOUGH_INFORMATION
        3. Relevant but insufficient strength: NOT_ENOUGH_INFORMATION
        4. Substantial conflicts: CONFLICTING_EVIDENCE
        5. Genuine support: SUPPORTED
        6. Genuine refutation: REFUTED
        """
        if self.current_stage != VerificationStage.CROSS_VERIFICATION_COMPLETED:
            raise ValueError(
                f"Cannot generate verdict in stage '{self.current_stage}'. "
                f"Must reach '{VerificationStage.CROSS_VERIFICATION_COMPLETED}' first."
            )

        # Rule 1 & 2: Zero or only irrelevant evidence -> Abstain
        if not valid_evidences:
            verdict = "NOT_ENOUGH_INFORMATION"
            conf = 0.85
            reason = (
                f"Chưa tìm thấy bằng chứng đối chứng trực tiếp đạt ngưỡng liên quan tối thiểu "
                f"cho phát ngôn '{self.claim_text[:60]}...'. Hệ thống tuân thủ nguyên tắc khoa học: "
                "bảo lưu trạng thái Chưa đủ thông tin (NOT_ENOUGH_INFORMATION) theo chuẩn IFCN."
            )
            self.abstention_reason = "NO_RELEVANT_EVIDENCE"
            self.final_verdict = verdict
            self.confidence = conf
            self.transition_to(VerificationStage.VERDICT_READY, reason="Abstained due to no relevant evidence")
            return verdict, conf, reason

        # Rule 4: Substantial conflict between credible sources
        if conflicts or (has_support and has_refute):
            verdict = "CONFLICTING_EVIDENCE"
            conf = 0.85
            reason = (
                "Phát hiện BẰNG CHỨNG MÂU THUẪN (CONFLICTING_EVIDENCE): Các nguồn báo chí và công bố độc lập "
                "đưa ra thông tin trái ngược nhau về sự kiện hoặc chỉ số này."
            )
            self.final_verdict = verdict
            self.confidence = conf
            self.transition_to(VerificationStage.VERDICT_READY, reason="Conflicting evidence between independent sources")
            return verdict, conf, reason

        # Rule 5 & 6: Genuine refutation or support
        if has_refute and not has_support:
            verdict = "REFUTED"
            conf = min(0.98, max(0.80, refute_conf))
            refuting_src = valid_evidences[0].get("source_name", "Nguồn kiểm chứng độc lập")
            reason = (
                f"Phát ngôn bị BÁC BỎ (REFUTED) bởi bằng chứng đã thẩm định liên quan từ '{refuting_src}'. "
                "Nội dung phát ngôn mâu thuẫn trực tiếp với hồ sơ thực chứng."
            )
            self.final_verdict = verdict
            self.confidence = conf
            self.transition_to(VerificationStage.VERDICT_READY, reason="Refuted by validated relevant evidence")
            return verdict, conf, reason

        if has_support and not has_refute:
            if has_partial:
                verdict = "PARTIALLY_SUPPORTED"
                conf = 0.84
                supporting_src = valid_evidences[0].get("source_name", "Nguồn kiểm chứng độc lập")
                reason = (
                    f"Phát ngôn ĐÚNG MỘT PHẦN (PARTIALLY_SUPPORTED) theo tài liệu từ '{supporting_src}', "
                    "tuy nhiên phát hiện sự khác biệt về số liệu chi tiết hoặc phạm vi thử nghiệm."
                )
            else:
                verdict = "SUPPORTED"
                conf = min(0.98, max(0.80, support_conf))
                supporting_src = valid_evidences[0].get("source_name", "Nguồn kiểm chứng độc lập")
                reason = (
                    f"Phát ngôn ĐÃ ĐƯỢC XÁC THỰC (SUPPORTED) bởi tài liệu đối chứng liên quan từ '{supporting_src}'. "
                    "Bằng chứng hoàn toàn hỗ trợ nội dung khẳng định."
                )
            self.final_verdict = verdict
            self.confidence = conf
            self.transition_to(VerificationStage.VERDICT_READY, reason="Supported by validated relevant evidence")
            return verdict, conf, reason

        # Rule 3: Relevant evidence exists, but only contextual/neutral -> Abstain
        verdict = "NOT_ENOUGH_INFORMATION"
        conf = 0.70
        reason = (
            f"Đã đối soát với {len(valid_evidences)} tài liệu bối cảnh liên quan. "
            "Tuy nhiên các tài liệu này chỉ phản ánh thông tin diện rộng, chưa có tài liệu giám định dứt điểm riêng cho chi tiết phát ngôn này. "
            "Hệ thống bảo lưu trạng thái Chưa đủ thông tin (NOT_ENOUGH_INFORMATION) để đảm bảo tính khách quan."
        )
        self.abstention_reason = "EVIDENCE_INSUFFICIENT_FOR_DETERMINATION"
        self.final_verdict = verdict
        self.confidence = conf
        self.transition_to(VerificationStage.VERDICT_READY, reason="Relevant evidence insufficient for definitive verdict")
        return verdict, conf, reason
