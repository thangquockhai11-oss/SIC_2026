"""Unit & Integration Tests for Task 2: NLP Clause Segmentation & Grounded Verification.

Verifies:
1. NLP Clause segmentation preserves negations, numbers, time markers, and original sentences.
2. Semantic distinction between 'đề xuất' (proposal/draft) and 'đã ban hành' (enacted).
3. Publisher name change on empty/irrelevant evidence store strictly yields 'Chưa đủ bằng chứng' (NOT_ENOUGH_INFORMATION).
4. No fabricated evidence or domain bias: verified conclusions contain original_sentence, evidence_url, exact excerpt, and reasoning.
"""

from unittest.mock import patch
import pytest

from app.services.clause_segmenter import (
    detect_modal_scope,
    extract_checkable_clauses,
    extract_numbers,
    extract_time_markers,
    has_negation_marker,
)
from app.services.fact_checking_agent import fact_checking_agent


def test_1_nlp_clause_segmentation_preserves_attributes():
    """Verify that NLP segmentation preserves negations, numbers, time markers, and original sentence."""
    text = (
        "Ban soạn thảo không đồng ý phương án tăng thuế VAT lên 12% vào ngày 15/4/2026, "
        "nhưng đang xem xét đề xuất thí điểm tại 5 địa phương trong năm 2027. "
        "Theo tôi thì giải pháp này rất tuyệt vời và đáng hoan nghênh."
    )
    clauses = extract_checkable_clauses(text, max_clauses=5)

    assert len(clauses) >= 2

    c1 = clauses[0]
    # Verify original sentence is preserved
    assert "Ban soạn thảo không đồng ý" in c1["original_sentence"]
    # Verify negation is preserved
    assert c1["has_negation"] is True
    # Verify numbers extracted
    assert any("12%" in n for n in c1["numbers"])
    # Verify time extracted
    assert any("15/4/2026" in t for t in c1["time_markers"])

    c2 = clauses[1]
    assert c2["scope"] == "PROPOSAL"
    assert any("5" in n for n in c2["numbers"])
    assert any("2027" in t for t in c2["time_markers"])

    # Verify subjective opinion sentence was filtered out
    for c in clauses:
        assert "Theo tôi thì giải pháp này rất tuyệt vời" not in c["claim_text"]


def test_2_modal_scope_proposal_vs_enacted_detection():
    """Verify detection of modal status: proposal/draft vs enacted/promulgated."""
    proposal_text = "Bộ Giao thông Vận tải đang đề xuất lấy ý kiến dự thảo quy chế phân làn xe buýt."
    enacted_text = "Thủ tướng Chính phủ đã chính thức ban hành quyết định áp dụng tiêu chuẩn khí thải mới."

    assert detect_modal_scope(proposal_text) == "PROPOSAL"
    assert detect_modal_scope(enacted_text) == "ENACTED"


def test_3_semantic_mismatch_proposal_vs_enacted_yields_refuted():
    """Verify that claiming 'đã ban hành' when evidence states 'đang đề xuất' yields REFUTED."""
    # Claim falsely asserts the policy has been enacted
    claim = {
        "claim_text": "Chính phủ đã chính thức ban hành quy định cấm xe máy chạy xăng từ năm 2026.",
        "original_sentence": "Chính phủ đã chính thức ban hành quy định cấm xe máy chạy xăng từ năm 2026.",
        "scope": "ENACTED",
        "has_negation": False,
        "is_checkable": True,
    }

    # Authentic evidence stating it is only an initial proposal/draft
    mock_candidates = [
        {
            "chunk_id": "chunk_draft_01",
            "source_name": "Cổng Thông tin điện tử Chính phủ",
            "source_url": "https://chinhphu.vn/thong-cao/du-thao-giao-thong",
            "excerpt": (
                "Văn phòng Chính phủ cho biết Bộ GTVT đang đề xuất lấy ý kiến dự thảo về lộ trình chuyển đổi phương tiện, "
                "chưa ban hành bất kỳ quyết định cấm đoán bắt buộc nào đối với xe máy cá nhân."
            ),
            "reliability_score": 0.96,
            "relevance_score": 0.88,
            "dataset_source": "ViFactCheck",
            "dataset_record_id": "rec_001",
        }
    ]

    with patch.object(fact_checking_agent, "verify_single_claim", wraps=fact_checking_agent.verify_single_claim):
        with patch("app.services.fact_checking_agent.hybrid_rag_retriever.retrieve", return_value=mock_candidates):
            with patch("app.services.fact_checking_agent.hybrid_retriever.retrieve", return_value=mock_candidates):
                res = fact_checking_agent.verify_single_claim(claim)

    assert res["verdict"] == "REFUTED"
    assert res["original_sentence"] == claim["original_sentence"]
    assert "Mâu thuẫn phạm vi hiệu lực" in res["reasoning"] or "đang đề xuất" in res["reasoning"]
    assert len(res["evidences"]) == 1
    assert res["evidences"][0]["source_url"] == "https://chinhphu.vn/thong-cao/du-thao-giao-thong"
    assert "Chính phủ" in res["evidences"][0]["source_name"]


def test_4_empty_evidence_store_yields_not_enough_info_regardless_of_publisher():
    """Verify that changing publisher name on empty evidence store strictly yields NOT_ENOUGH_INFORMATION."""
    claim = {
        "claim_text": "Doanh nghiệp ABC vừa phát minh loại pin năng lượng chạy vĩnh cửu không cần sạc.",
        "original_sentence": "Doanh nghiệp ABC vừa phát minh loại pin năng lượng chạy vĩnh cửu không cần sạc.",
        "scope": "GENERAL_FACT",
        "has_negation": False,
        "is_checkable": True,
    }

    # Simulate empty knowledge store / no relevant candidates found
    with patch("app.services.fact_checking_agent.hybrid_rag_retriever.retrieve", return_value=[]):
        with patch("app.services.fact_checking_agent.hybrid_retriever.retrieve", return_value=[]):
            # Test with low credibility tabloid
            res_tabloid = fact_checking_agent.verify_single_claim(
                claim,
                source_name="Trang tin lá cải",
                source_credibility=35.0,
            )
            # Test with top tier prestigious publisher (Reuters / Báo Chính Phủ)
            res_reuters = fact_checking_agent.verify_single_claim(
                claim,
                source_name="Reuters / Báo điện tử Chính phủ",
                source_credibility=96.0,
            )

    # Both MUST return NOT_ENOUGH_INFORMATION ("Chưa đủ bằng chứng")
    assert res_tabloid["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res_tabloid["evidences"] == []
    assert res_tabloid["retrieval_count"] == 0

    assert res_reuters["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res_reuters["evidences"] == []
    assert res_reuters["retrieval_count"] == 0

    # Ensure no fabricated domain-bias citations
    assert "không tìm thấy tài liệu gốc" in res_reuters["reasoning"].lower() or "chưa đủ bằng chứng" in res_reuters["reasoning"].lower()


def test_5_supported_claim_includes_original_sentence_and_exact_excerpt():
    """Verify that supported claims include original sentence, genuine source URL, exact excerpt, and reasoning."""
    claim = {
        "claim_text": "Bộ Tài chính công bố số thu ngân sách nhà nước năm qua đạt vượt dự toán.",
        "original_sentence": "Bộ Tài chính công bố số thu ngân sách nhà nước năm qua đạt vượt dự toán 8.5%.",
        "scope": "GENERAL_FACT",
        "has_negation": False,
        "is_checkable": True,
    }

    mock_candidates = [
        {
            "chunk_id": "mof_tax_01",
            "source_name": "Bộ Tài chính & Thời báo Tài chính",
            "source_url": "https://mof.gov.vn/webcenter/portal/btcvn/tin-tuc-su-kien",
            "excerpt": "Bộ Tài chính chính thức xác nhận tổng thu ngân sách nhà nước cả năm đạt vượt 8.5% so với dự toán pháp lệnh được giao.",
            "reliability_score": 0.95,
            "relevance_score": 0.92,
            "dataset_source": "ViFactCheck",
            "dataset_record_id": "mof_budget_2025",
        }
    ]

    with patch("app.services.fact_checking_agent.hybrid_rag_retriever.retrieve", return_value=mock_candidates):
        with patch("app.services.fact_checking_agent.hybrid_retriever.retrieve", return_value=mock_candidates):
            res = fact_checking_agent.verify_single_claim(claim)

    assert res["verdict"] == "SUPPORTED"
    assert res["original_sentence"] == "Bộ Tài chính công bố số thu ngân sách nhà nước năm qua đạt vượt dự toán 8.5%."
    assert len(res["evidences"]) >= 1
    ev = res["evidences"][0]
    assert ev["source_url"] == "https://mof.gov.vn/webcenter/portal/btcvn/tin-tuc-su-kien"
    assert "tổng thu ngân sách nhà nước" in ev["excerpt"]
    assert "XÁC NHẬN" in res["reasoning"] or "thống nhất" in res["reasoning"]
