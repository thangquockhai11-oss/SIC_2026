"""
Test Suite: Gemini 4 Hydrogen + Gemini 4 Neon Claim-Evidence Verification Pipeline.
Covers the 10 mandatory verification challenges with 15-Dimension Matrix validation,
Dataset RAG provenance, and Gemini 4 Neon adversarial critic escalation.
"""

import pytest

from app.services.dataset_rag_service import get_dataset_rag_service
from app.services.gemini_claim_service import HydrogenClaimCandidate, get_gemini_claim_service
from app.services.gemini_cross_verifier import get_gemini_cross_verifier
from app.services.gemini_model_router import GeminiTaskType, get_model_router


@pytest.fixture
def model_router():
    return get_model_router()


@pytest.fixture
def claim_service():
    return get_gemini_claim_service()


@pytest.fixture
def cross_verifier():
    return get_gemini_cross_verifier()


@pytest.fixture
def rag_service():
    return get_dataset_rag_service()


# ============================================================================
# ARCHITECTURE & ROUTING TESTS
# ============================================================================

def test_exclusive_dual_model_routing(model_router):
    """Verify that routing strictly chooses between Gemini 4 Hydrogen and Neon."""
    assert model_router.hydrogen_model == "gemini-4-hydrogen"
    assert model_router.neon_model == "gemini-4-neon"

    # Routine & Extraction tasks -> Hydrogen
    assert model_router.get_model_for_task(GeminiTaskType.CLAIM_EXTRACTION) == "gemini-4-hydrogen"
    assert model_router.get_model_for_task(GeminiTaskType.DATASET_RAG) == "gemini-4-hydrogen"
    assert model_router.get_model_for_task(GeminiTaskType.INITIAL_VERIFICATION) == "gemini-4-hydrogen"

    # Complex & Critic tasks -> Neon
    assert model_router.get_model_for_task(GeminiTaskType.CONFLICTING_EVIDENCE) == "gemini-4-neon"
    assert model_router.get_model_for_task(GeminiTaskType.CAUSAL_DISTORTION_REVIEW) == "gemini-4-neon"
    assert model_router.get_model_for_task(GeminiTaskType.LOGICAL_AUDIT) == "gemini-4-neon"


def test_dataset_rag_provenance_and_no_third_party_embeddings(rag_service):
    """Verify dataset RAG uses pure BM25/lexical indexing with provenance metadata."""
    stats = rag_service.get_dataset_provenance_stats()
    assert "No 3rd-party vector models" in stats["indexing_engine"]

    examples = rag_service.retrieve_calibration_examples("vỡ đập thủy điện", top_k=2)
    assert len(examples) > 0
    for ex in examples:
        assert ex.dataset_id in ["ViFactCheck", "X-FACT", "FEVER", "ViWiki"]
        assert ex.sample_id
        assert ex.retrieval_score >= 0.0

    prompt_context = rag_service.format_rag_prompt_context("vỡ đập thủy điện", top_k=2)
    assert "DATASET RAG" in prompt_context
    assert "TUYỆT ĐỐI KHÔNG sử dụng các đoạn trích này làm bằng chứng thực tế" in prompt_context


# ============================================================================
# 10 MANDATORY VERIFICATION CHALLENGES
# ============================================================================

def test_challenge_1_diego_simeone_vs_javier_tebas_attribution(cross_verifier):
    """Challenge 1: Attribution / Entity Mismatch (Diego Simeone vs Javier Tebas)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_simeone",
        claim_text="Diego Simeone tuyên bố giải La Liga đang bị thao túng bởi các quyết định bất công.",
        original_sentence="Diego Simeone tuyên bố giải La Liga đang bị thao túng bởi các quyết định bất công.",
        subject="Diego Simeone",
        predicate="tuyên bố",
        attribution="Diego Simeone",
    )
    evidence = [{
        "source_name": "Marca & Reuters",
        "content": "Chủ tịch La Liga Javier Tebas phát biểu giải đấu luôn minh bạch, phủ nhận tin đồn thao túng. Diego Simeone không đưa ra phát ngôn nào về việc thao túng.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["REFUTED", "MISLEADING"]
    assert res.matrix_15d.attribution.match_status == "MISMATCH" or res.matrix_15d.entity.match_status == "MISMATCH"


def test_challenge_2_numerical_discrepancy(cross_verifier):
    """Challenge 2: Numerical Mismatch (50% vs 20%)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_num",
        claim_text="Uống cà phê giúp giảm 50% nguy cơ mắc bệnh tim mạch.",
        original_sentence="Uống cà phê giúp giảm 50% nguy cơ mắc bệnh tim mạch.",
        numerical_value=50.0,
        unit="%",
    )
    evidence = [{
        "source_name": "Tạp chí Y học New England",
        "content": "Nghiên cứu dịch tễ ghi nhận mức giảm 20% nguy cơ tim mạch ở nhóm người tiêu thụ cà phê điều độ.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["REFUTED", "MISLEADING"]
    assert res.matrix_15d.number.match_status == "MISMATCH"


def test_challenge_3_temporal_discrepancy(cross_verifier):
    """Challenge 3: Temporal Mismatch (2024 vs 2021)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_date",
        claim_text="Hiệp định thương mại toàn diện được hai nước chính thức ký kết vào năm 2024.",
        original_sentence="Hiệp định thương mại toàn diện được hai nước chính thức ký kết vào năm 2024.",
        date_time="2024",
    )
    evidence = [{
        "source_name": "Cổng thông tin Bộ Ngoại giao",
        "content": "Lễ ký kết hiệp định thương mại đã diễn ra thành công vào năm 2021 tại thủ đô.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["REFUTED", "MISLEADING"]
    assert res.matrix_15d.date.match_status == "MISMATCH"


def test_challenge_4_unit_discrepancy(cross_verifier):
    """Challenge 4: Unit Mismatch (500 g vs 500 mg)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_unit",
        claim_text="Liều dùng khuyến nghị hàng ngày của hoạt chất là 500 g.",
        original_sentence="Liều dùng khuyến nghị hàng ngày của hoạt chất là 500 g.",
        numerical_value=500.0,
        unit="g",
    )
    evidence = [{
        "source_name": "Dược thư Quốc gia",
        "content": "Liều tối đa an toàn trong 24 giờ của dược chất là 500 mg, dùng quá liều có thể gây ngộ độc gan cấp tính.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["REFUTED", "MISLEADING"]
    assert res.matrix_15d.unit.match_status == "MISMATCH"


def test_challenge_5_causal_distortion_triggers_neon(cross_verifier):
    """Challenge 5: Causal Distortion (Correlation vs Causation) escalates to Gemini 4 Neon."""
    claim = HydrogenClaimCandidate(
        claim_id="c_causal",
        claim_text="Uống trà xanh chữa khỏi hoàn toàn bệnh tiểu đường.",
        original_sentence="Các nhà khoa học phát hiện mối liên quan giữa việc uống trà xanh và chỉ số đường huyết ổn định.",
        causal_assertion="CAUSATION",
        modality_certainty="CERTAIN",
        fidelity_status="DISTORTED",
    )
    evidence = [{
        "source_name": "Viện Dinh dưỡng",
        "content": "Nghiên cứu chỉ ra mối liên quan và tương quan thống kê nhẹ, hoàn toàn chưa có cơ sở kết luận trà xanh chữa khỏi bệnh.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["MISLEADING", "REFUTED"]
    assert res.matrix_15d.causality.match_status == "MISMATCH"
    assert res.neon_review is not None
    assert res.neon_review.neon_invoked is True
    assert res.neon_review.causal_distortion_flag is True


def test_challenge_6_negation_reversal(cross_verifier):
    """Challenge 6: Negation Polarity Mismatch."""
    claim = HydrogenClaimCandidate(
        claim_id="c_neg",
        claim_text="Bộ Y tế đã chính thức cấp phép lưu hành vắc-xin X.",
        original_sentence="Bộ Y tế đã chính thức cấp phép lưu hành vắc-xin X.",
        negation=False,
    )
    evidence = [{
        "source_name": "Thông cáo Cục Quản lý Dược - Bộ Y tế",
        "content": "Hồ sơ vắc-xin X chưa được cấp phép lưu hành, hiện vẫn đang trong giai đoạn thẩm định hồ sơ kỹ thuật.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict == "REFUTED"
    assert res.matrix_15d.negation.match_status == "MISMATCH"


def test_challenge_7_partial_support(cross_verifier):
    """Challenge 7: Partial Support (in-vitro vs clinical)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_part",
        claim_text="Hợp chất tự nhiên tiêu diệt tế bào ung thư trong thử nghiệm lâm sàng.",
        original_sentence="Hợp chất tự nhiên tiêu diệt tế bào ung thư trong thử nghiệm lâm sàng.",
    )
    evidence = [{
        "source_name": "Viện Hóa học & Dược liệu",
        "content": "Hợp chất ức chế tế bào trong ống nghiệm (in-vitro) ở phòng thí nghiệm, chưa tiến hành thử nghiệm lâm sàng trên người.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict in ["PARTIALLY_SUPPORTED", "MISLEADING", "REFUTED"]


def test_challenge_8_direct_refutation(cross_verifier):
    """Challenge 8: Direct Refutation (Water-burning stove scam)."""
    claim = HydrogenClaimCandidate(
        claim_id="c_bep",
        claim_text="Bếp gas chạy bằng nước lã tiết kiệm 100% nhiên liệu.",
        original_sentence="Bếp gas chạy bằng nước lã tiết kiệm 100% nhiên liệu.",
        numerical_value=100.0,
        unit="%",
    )
    evidence = [{
        "source_name": "Hội đồng Khoa học Vật liệu",
        "content": "Nước không thể tự cháy. Đây là trò lừa đảo sử dụng đất đèn sinh khí acetylen nguy hiểm, hoàn toàn sai sự thật.",
    }]

    res = cross_verifier.verify_claim(claim, evidence)
    assert res.final_verdict == "REFUTED"


def test_challenge_9_conflicting_evidence_neon_review(cross_verifier):
    """Challenge 9: Conflicting Evidence triggers Gemini 4 Neon adversarial critique."""
    claim = HydrogenClaimCandidate(
        claim_id="c_conflict",
        claim_text="Sự cố rò rỉ tại nhà máy đã được kiểm soát hoàn toàn.",
        original_sentence="Sự cố rò rỉ tại nhà máy đã được kiểm soát hoàn toàn.",
    )
    evidences = [
        {
            "source_name": "Báo cáo Ban Quản lý",
            "content": "Sự cố kỹ thuật đã được khắc phục và kiểm soát chính xác 100%, không còn nguy hiểm.",
        },
        {
            "source_name": "Đội Quan sát Độc lập",
            "content": "Bác bỏ tuyên bố kiểm soát an toàn, hiện trường vẫn ghi nhận chỉ số sai sự thật và nguy cơ rò rỉ tiếp diễn.",
        },
    ]

    res = cross_verifier.verify_claim(claim, evidences)
    assert res.has_conflicts is True
    assert res.final_verdict in ["CONFLICTING_EVIDENCE", "MISLEADING"]
    assert res.neon_review is not None
    assert res.neon_review.neon_invoked is True


def test_challenge_10_grounding_abstention(cross_verifier):
    """Challenge 10: Conservative Abstention when no external evidence is present."""
    claim = HydrogenClaimCandidate(
        claim_id="c_unprovable",
        claim_text="Người ngoài hành tinh đã bí mật viếng thăm trạm khí tượng trên đỉnh Fansipan.",
        original_sentence="Người ngoài hành tinh đã bí mật viếng thăm trạm khí tượng trên đỉnh Fansipan.",
    )

    # Empty evidence list
    res = cross_verifier.verify_claim(claim, external_evidences=[])
    assert res.final_verdict == "NOT_ENOUGH_INFORMATION"
    assert res.matrix_15d.entity.match_status == "UNKNOWN"
    assert "Không tìm thấy bằng chứng độc lập" in res.decisive_reasoning
