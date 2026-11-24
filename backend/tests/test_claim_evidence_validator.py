"""
Mandatory Verification Suite for TrustMedia AI Claim-Evidence Engine.
Covers Section H requirements:
1. Coffee claim vs ChatGPT evidence -> IRRELEVANT, verdict NOT_ENOUGH_INFORMATION
2. Coffee claim vs Genuine coffee study -> Genuine semantic match
3. Same topic, numerical mismatch (50% vs 20%) -> PARTIALLY_SUPPORTED
4. Causal claim vs observational study -> MISLEADING
5. Verdict attempted while NLI/validation is PENDING -> Rejects invalid transition
6. Verdict for Claim A mapped to evidence of Claim B -> Rejects cross-contamination
"""

import pytest

from app.services.gemini_evidence_validator import (
    GeminiEvidenceValidator,
    get_gemini_evidence_validator,
)
from app.services.verification_state_machine import (
    ClaimVerificationStateMachine,
    VerificationStage,
)


def test_coffee_claim_vs_chatgpt_evidence_irrelevant():
    """Test 1: Coffee claim vs ChatGPT evidence must be classified as IRRELEVANT and abstain to NOT_ENOUGH_INFORMATION."""
    validator = get_gemini_evidence_validator()
    claim_text = (
        "Uống mỗi tách cà phê hằng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt, "
        "theo phân tích dữ liệu từ 16 nghiên cứu tại Mỹ, Nhật, châu Âu."
    )
    chatgpt_evidence = (
        "Theo anh Thống, ChatGPT có thể hỗ trợ nghiên cứu, phân tích và tổng hợp tài liệu khoa học "
        "rất nhanh chóng, sinh viên có thể dùng để viết tiểu luận."
    )
    report = validator.validate_evidence(
        claim_text=claim_text,
        evidence_text=chatgpt_evidence,
        source_name="Thanh Niên (ViFactCheck)",
        article_title="Cà phê có thể giảm nguy cơ ung thư tuyến tiền liệt",
    )
    assert not report.is_topically_relevant, "ChatGPT evidence must NOT be topically relevant to coffee/prostate claim"
    assert report.relation == "IRRELEVANT", f"Expected IRRELEVANT, got {report.relation}"

    # State machine must abstain if only irrelevant evidence is present
    sm = ClaimVerificationStateMachine(claim_id="c-coffee-01", claim_text=claim_text)
    sm.transition_to(VerificationStage.ARTICLE_EXTRACTED)
    sm.transition_to(VerificationStage.CLAIMS_EXTRACTED)
    sm.transition_to(VerificationStage.CLAIM_FIDELITY_CHECKED)
    sm.transition_to(VerificationStage.EVIDENCE_RETRIEVED)
    sm.transition_to(VerificationStage.EVIDENCE_RELEVANCE_VALIDATED)
    sm.transition_to(VerificationStage.CROSS_VERIFICATION_COMPLETED)

    verdict, conf, reason = sm.resolve_conservative_verdict(
        valid_evidences=[],
        conflicts=[],
        has_support=False,
        has_refute=False,
    )
    assert verdict == "NOT_ENOUGH_INFORMATION"
    assert sm.current_stage == VerificationStage.VERDICT_READY


def test_coffee_claim_vs_genuine_coffee_study():
    """Test 2: Coffee claim vs Genuine coffee study must be recognized as relevant."""
    validator = get_gemini_evidence_validator()
    claim_text = "Uống mỗi tách cà phê hằng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt."
    genuine_study_evidence = (
        "Theo phân tích gộp 16 nghiên cứu thuần tập được công bố trên tạp chí y khoa BMJ, "
        "uống mỗi tách cà phê hằng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt ở nam giới."
    )
    report = validator.validate_evidence(
        claim_text=claim_text,
        evidence_text=genuine_study_evidence,
        source_name="Tạp chí Y học BMJ",
        article_title="Cà phê có thể giảm nguy cơ ung thư tuyến tiền liệt",
    )
    assert report.is_topically_relevant, "Genuine coffee study must be recognized as topically relevant"
    assert report.relation in ("SUPPORTS", "PARTIALLY_SUPPORTS", "CONTEXTUAL")


def test_same_topic_numerical_mismatch():
    """Test 3: Same topic with numerical discrepancy must yield PARTIALLY_SUPPORTED, not REFUTED."""
    claim_text = "Uống cà phê mỗi ngày giúp giảm 50% nguy cơ mắc bệnh."
    sm = ClaimVerificationStateMachine(claim_id="c-stat-01", claim_text=claim_text)
    sm.transition_to(VerificationStage.ARTICLE_EXTRACTED)
    sm.transition_to(VerificationStage.CLAIMS_EXTRACTED)
    sm.transition_to(VerificationStage.CLAIM_FIDELITY_CHECKED)
    sm.transition_to(VerificationStage.EVIDENCE_RETRIEVED)
    sm.transition_to(VerificationStage.EVIDENCE_RELEVANCE_VALIDATED)
    sm.transition_to(VerificationStage.CROSS_VERIFICATION_COMPLETED)

    valid_evidence = [{
        "source_name": "Viện Nghiên cứu Dịch tễ học",
        "excerpt": "Nghiên cứu xác nhận cà phê có tác dụng giảm nguy cơ mắc bệnh, tuy nhiên tỷ lệ giảm là 20% chứ không phải 50%.",
        "stance": "PARTIALLY_SUPPORTED",
        "numerical_consistency": False,
    }]

    verdict, conf, reason = sm.resolve_conservative_verdict(
        valid_evidences=valid_evidence,
        conflicts=[],
        has_support=True,
        has_refute=False,
        has_partial=True,
    )
    assert verdict == "PARTIALLY_SUPPORTED"
    assert "PARTIALLY_SUPPORTED" in verdict


def test_causal_claim_vs_observational_study_misleading():
    """Test 4: Exaggerating correlational findings into definitive causality triggers MISLEADING."""
    from app.services.claim_article_aligner import ClaimArticleAligner

    aligner = ClaimArticleAligner()
    original_sentence = (
        "Các nhà khoa học quan sát thấy mối liên hệ tương quan giữa người uống cà phê và nguy cơ ung thư thấp hơn."
    )
    distorted_claim = "Uống cà phê dẫn đến điều trị và gây ra khỏi ung thư."

    fidelity = aligner.verify_article_fidelity(
        original_sentence=original_sentence,
        atomic_claim=distorted_claim,
    )
    assert fidelity.distortion_detected, "Must detect distortion when correlation is exaggerated into causation"
    assert fidelity.distortion_type in ("CAUSAL_DISTORTION", "MODALITY_EXAGGERATION")


def test_verdict_attempted_while_pending_rejected():
    """Test 5: State machine must reject transition to VERDICT_READY when stages are skipped."""
    sm = ClaimVerificationStateMachine(claim_id="c-skip-01", claim_text="Phát ngôn thử nghiệm")
    assert sm.current_stage == VerificationStage.PENDING

    # Attempting to jump directly to VERDICT_READY must fail
    success = sm.transition_to(VerificationStage.VERDICT_READY)
    assert not success
    assert sm.current_stage == VerificationStage.FAILED

    # Calling resolve_conservative_verdict while not in CROSS_VERIFICATION_COMPLETED raises ValueError
    sm2 = ClaimVerificationStateMachine(claim_id="c-skip-02", claim_text="Phát ngôn thử nghiệm 2")
    with pytest.raises(ValueError):
        sm2.resolve_conservative_verdict(valid_evidences=[], conflicts=[], has_support=False, has_refute=False)


def test_verdict_claim_evidence_cross_contamination_rejected():
    """Test 6: Verify evidence isolation - Claim A must never inherit unrelated evidence from Claim B."""
    from app.services.fact_checking_agent import fact_checking_agent

    claim_a = {
        "claim_id": "c-alpha",
        "claim_text": "Uống mỗi tách cà phê hằng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt.",
        "claim_type": "STATISTICAL_CLAIM",
        "numerical_values": ["1%"],
    }
    # If the story pool has a TikTok or spinal degeneration item from Claim B
    unrelated_story_pool = [
        {
            "chunk_id": "b-tiktok",
            "source_name": "Tuổi Trẻ",
            "source_url": "https://tuoitre.vn/tiktok-cong-bo-ke-hoach-an-ninh-du-lieu-tai-chau-au",
            "excerpt": "TikTok đang chịu áp lực ở Mỹ và châu Âu về mối liên hệ an ninh dữ liệu...",
            "reliability_score": 0.88,
        },
        {
            "chunk_id": "b-spine",
            "source_name": "Dân Trí",
            "source_url": "https://dantri.com.vn/suc-khoe/dau-dau-te-moi-tay-chan-coi-chung-moi-hoa-thoai-hoa-dot-song",
            "excerpt": "Nếu không được phát hiện sớm và điều trị kịp thời, thoái hóa đốt sống có thể gây liệt vận động...",
            "reliability_score": 0.90,
        },
    ]

    res = fact_checking_agent.verify_single_claim(
        claim=claim_a,
        article_title="Cà phê có thể giảm nguy cơ ung thư tuyến tiền liệt",
        story_evidence_pool=unrelated_story_pool,
    )

    # Claim A must NOT adopt TikTok or spinal degeneration as its evidence!
    for ev in res.get("evidences", []):
        excerpt = ev.get("excerpt", "").lower()
        assert "tiktok" not in excerpt, "TikTok evidence must not contaminate coffee claim"
        assert "thoái hóa đốt sống" not in excerpt, "Spine evidence must not contaminate coffee claim"

    # Verdict must be NOT_ENOUGH_INFORMATION since no relevant evidence exists
    assert res["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res["evidence_source"] == "Cơ sở dữ liệu đối chuẩn học thuật"
    assert res["evidence_url"] is None
