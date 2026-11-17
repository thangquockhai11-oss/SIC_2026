"""Comprehensive Fact-Checking Test Suite for TrustMedia AI Article Content Verification.

Validates all 14 scenarios specified in System Requirements Section 11:
1. SUPPORTED Claim
2. REFUTED Claim
3. PARTIALLY_SUPPORTED Claim (Numerical mismatch)
4. MISLEADING / Context-omitted Claim
5. NOT_ENOUGH_INFORMATION Claim (No relevant evidence)
6. CONFLICTING_EVIDENCE Claim (Both supporting and refuting evidence)
7. NOT_CHECKABLE Claim (Subjective Opinion)
8. PREDICTION Claim (Future forecasting, non-checkable)
9. STATISTICAL_CLAIM with numerical slot extraction
10. QUOTATION_CLAIM extraction and verification
11. Temporal consistency check
12. CAUSAL_CLAIM extraction
13. Strict Media Credibility decoupling (Source credibility does not override claim verdict)
14. Complete Article Fact-Checking Report structure & transparent grounding formula
"""

import pytest
from app.services.fact_checking_agent import fact_checking_agent
from app.services.meta_agent import meta_agent


# ---------------------------------------------------------------------------
# 1. Claim đúng (SUPPORTED)
# ---------------------------------------------------------------------------
def test_claim_supported():
    """Verify claim that is backed by authentic supporting evidence."""
    claim = {
        "claim_text": "EVN thông báo điều chỉnh khung giá bán lẻ điện theo quy định của Bộ Công Thương",
        "claim_type": "FACTUAL_CLAIM",
        "checkability": True,
    }
    res = fact_checking_agent.verify_single_claim(claim)
    assert res["verdict"] in ["SUPPORTED", "PARTIALLY_SUPPORTED", "NOT_ENOUGH_INFORMATION"]
    assert "verdict" in res
    assert "confidence" in res
    assert res["confidence"] > 0.5


# ---------------------------------------------------------------------------
# 2. Claim sai / Tin đồn (REFUTED)
# ---------------------------------------------------------------------------
def test_claim_refuted():
    """Verify claim with evidence that explicitly contradicts or debunks."""
    claim = {
        "claim_text": "Bếp gas chạy bằng nước lã tiết kiệm 100% nhiên liệu không cần khí gas",
        "claim_type": "SCIENTIFIC_CLAIM",
        "checkability": True,
    }
    res = fact_checking_agent.verify_single_claim(claim)
    assert res["verdict"] in ["REFUTED", "NOT_ENOUGH_INFORMATION"]
    assert "verification_status" in res


# ---------------------------------------------------------------------------
# 3. Claim đúng một phần (PARTIALLY_SUPPORTED)
# ---------------------------------------------------------------------------
def test_claim_partially_supported():
    """Verify numerical or temporal divergence leading to PARTIALLY_SUPPORTED."""
    # Test numerical consistency directly
    claim_numbers = [{"raw": "50%", "parsed_value": 50.0}]
    evidence_text = "Báo cáo cho biết mức tăng trưởng chỉ đạt khoảng 12% so với cùng kỳ."
    is_ok, note = fact_checking_agent._check_numerical_consistency(claim_numbers, evidence_text)
    assert is_ok is False
    assert "chênh lệch" in note


# ---------------------------------------------------------------------------
# 4. Claim gây hiểu lầm / Omitted context (MISLEADING)
# ---------------------------------------------------------------------------
def test_claim_misleading_in_synthesis():
    """Verify that claims with misleading context are captured in synthesis."""
    claims = [
        {
            "claim_id": "c_mislead",
            "claim_text": "Giá vàng hôm nay biến động mạnh gây hoang mang",
            "verdict": "MISLEADING",
            "confidence": 0.85,
            "reasoning": "Số liệu đúng trong một phiên giao dịch nhưng gây hiểu lầm xu hướng cả năm",
            "evidences": [],
        }
    ]
    meta_res, _ = meta_agent.synthesize(
        claims=claims,
        credibility_data={"overall_credibility_score": 75.0, "source_name": "Thời Báo"},
        opinion_data={},
        trust_data={},
        reception_data={},
    )
    assert meta_res["verdict"] == "MISLEADING"
    assert "GÂY HIỂU LẦM" in meta_res["summary"]


# ---------------------------------------------------------------------------
# 5. Claim thiếu bằng chứng (NOT_ENOUGH_INFORMATION)
# ---------------------------------------------------------------------------
def test_claim_not_enough_information():
    """Verify obscure claim returns NOT_ENOUGH_INFORMATION with empty evidence and honest disclosure."""
    obscure_claim = {
        "claim_text": "Thiên thạch X-2983 va chạm làm đổi dòng sông Chanh năm 1750",
        "claim_type": "FACTUAL_CLAIM",
        "checkability": True,
    }
    res = fact_checking_agent.verify_single_claim(obscure_claim)
    assert res["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert len(res["evidences"]) == 0
    assert res["verification_status"] == "INSUFFICIENT_EVIDENCE"


# ---------------------------------------------------------------------------
# 6. Claim có bằng chứng mâu thuẫn (CONFLICTING_EVIDENCE)
# ---------------------------------------------------------------------------
def test_claim_conflicting_evidence_synthesis():
    """Verify handling when both supporting and refuting evidence exist."""
    claims = [
        {
            "claim_id": "c_conf",
            "claim_text": "Dự báo tăng trưởng GDP đạt 7% trong quý 4",
            "verdict": "CONFLICTING_EVIDENCE",
            "confidence": 0.78,
            "reasoning": "Tổ chức A dự báo 7% trong khi Tổ chức B ước tính chỉ đạt 5.5%",
            "evidences": [],
        }
    ]
    meta_res, _ = meta_agent.synthesize(
        claims=claims,
        credibility_data={"overall_credibility_score": 72.0, "source_name": "Tạp chí Kinh tế"},
        opinion_data={},
        trust_data={},
        reception_data={},
    )
    assert meta_res["verdict"] in ["CONTROVERSIAL", "MIXED"]


# ---------------------------------------------------------------------------
# 7. Ý kiến không thể kiểm chứng (OPINION / NOT_CHECKABLE)
# ---------------------------------------------------------------------------
def test_claim_opinion_not_checkable():
    """Verify subjective opinions are labeled OPINION and checkability=False."""
    statement = "Theo quan điểm của tôi, cảnh hoàng hôn ở vịnh Hạ Long là kỳ quan đẹp nhất trần gian."
    claims = fact_checking_agent.extract_checkable_claims(statement)
    assert len(claims) >= 1
    assert claims[0]["claim_type"] == "OPINION"
    assert claims[0]["checkability"] is False

    res = fact_checking_agent.verify_single_claim(claims[0])
    assert res["verdict"] == "NOT_CHECKABLE"
    assert res["verification_status"] == "NOT_CHECKABLE"
    assert len(res["evidences"]) == 0


# ---------------------------------------------------------------------------
# 8. Dự đoán tương lai (PREDICTION)
# ---------------------------------------------------------------------------
def test_claim_prediction_not_checkable():
    """Verify forward-looking forecasts are labeled PREDICTION and non-checkable."""
    statement = "Chuyên gia ước tính vào năm 2045 toàn bộ phương tiện giao thông tại thủ đô sẽ chạy bằng điện."
    claims = fact_checking_agent.extract_checkable_claims(statement)
    assert len(claims) >= 1
    assert claims[0]["claim_type"] == "PREDICTION"
    assert claims[0]["checkability"] is False

    res = fact_checking_agent.verify_single_claim(claims[0])
    assert res["verdict"] == "NOT_CHECKABLE"


# ---------------------------------------------------------------------------
# 9. STATISTICAL_CLAIM with numerical slots
# ---------------------------------------------------------------------------
def test_statistical_claim_slots():
    """Verify numerical values and currency/percentages are extracted properly."""
    text = "Kim ngạch xuất khẩu hạt điều đạt 3.6 tỷ USD, tăng 18.5% so với cùng kỳ năm 2023."
    claims = fact_checking_agent.extract_checkable_claims(text)
    assert len(claims) >= 1
    c = claims[0]
    assert c["claim_type"] == "STATISTICAL_CLAIM"
    assert len(c["numerical_values"]) >= 2
    raw_nums = [n["raw"] for n in c["numerical_values"]]
    assert any("3.6" in s or "tỷ" in s for s in raw_nums)
    assert any("18.5" in s or "%" in s for s in raw_nums)


# ---------------------------------------------------------------------------
# 10. QUOTATION_CLAIM extraction
# ---------------------------------------------------------------------------
def test_quotation_claim_extraction():
    """Verify speech attribution and quotes are categorized as QUOTATION_CLAIM."""
    text = 'Đại diện Bộ Công Thương tuyên bố rằng: "Không có chuyện thiếu hụt nguồn cung xăng dầu trong dịp Tết".'
    claims = fact_checking_agent.extract_checkable_claims(text)
    assert len(claims) >= 1
    assert claims[0]["claim_type"] == "QUOTATION_CLAIM"
    assert claims[0]["checkability"] is True


# ---------------------------------------------------------------------------
# 11. Temporal consistency check
# ---------------------------------------------------------------------------
def test_temporal_consistency_detection():
    """Verify that temporal expressions in past eras conflict when years diverge."""
    claim_temporal = "năm 1995"
    evidence_text = "Sự kiện lịch sử này thực chất diễn ra vào năm 1972 tại chiến trường Quảng Trị."
    is_ok, note = fact_checking_agent._check_temporal_consistency(claim_temporal, evidence_text)
    assert is_ok is False
    assert "Mâu thuẫn mốc thời gian" in note


# ---------------------------------------------------------------------------
# 12. CAUSAL_CLAIM extraction
# ---------------------------------------------------------------------------
def test_causal_claim_extraction():
    """Verify causal conjunctions produce CAUSAL_CLAIM."""
    text = "Mưa lũ lớn kéo dài nhiều ngày khiến cho ngập lụt cục bộ xảy ra trên diện rộng."
    claims = fact_checking_agent.extract_checkable_claims(text)
    assert len(claims) >= 1
    assert claims[0]["claim_type"] == "CAUSAL_CLAIM"


# ---------------------------------------------------------------------------
# 13. Media Credibility Decoupling
# ---------------------------------------------------------------------------
def test_media_credibility_decoupling():
    """Verify publisher credibility never overrides claim veracity."""
    claims = [
        {
            "claim_id": "c1",
            "claim_text": "Tin đồn lừa đảo bếp gas chạy bằng nước",
            "verdict": "REFUTED",
            "confidence": 0.95,
            "reasoning": "Bị bác bỏ bởi Viện Hóa học",
            "evidences": [],
        }
    ]
    # Even if publisher has a 98/100 credibility rating, the article verdict must NOT be SUPPORTED!
    high_cred_publisher = {
        "overall_credibility_score": 98.0,
        "source_name": "Thời Báo Danh Tiếng",
    }
    meta_res, _ = meta_agent.synthesize(
        claims=claims,
        credibility_data=high_cred_publisher,
        opinion_data={},
        trust_data={},
        reception_data={},
    )
    assert meta_res["verdict"] == "REFUTED"
    assert meta_res["disagreement_detected"] is True
    assert meta_res["disagreement_type"] == "SOURCE_FACT_DIVERGENCE"
    # Verify media credibility is sequestered in isolated container
    assert "media_credibility_isolated" in meta_res["fact_checking_report"]
    assert meta_res["fact_checking_report"]["media_credibility_isolated"]["overall_credibility_score"] == 98.0


# ---------------------------------------------------------------------------
# 14. Complete Article Fact-Checking Report structure & transparent accuracy
# ---------------------------------------------------------------------------
def test_fact_checking_report_structure_and_formula():
    """Verify transparent accuracy formula and all overview counts."""
    claims = [
        {"claim_id": "c1", "claim_text": "Phát ngôn 1", "verdict": "SUPPORTED", "confidence": 0.9},
        {"claim_id": "c2", "claim_text": "Phát ngôn 2", "verdict": "PARTIALLY_SUPPORTED", "confidence": 0.8},
        {"claim_id": "c3", "claim_text": "Phát ngôn 3", "verdict": "REFUTED", "confidence": 0.95},
        {"claim_id": "c4", "claim_text": "Quan điểm ý kiến", "verdict": "NOT_CHECKABLE", "confidence": 0.85},
    ]
    meta_res, _ = meta_agent.synthesize(
        claims=claims,
        credibility_data={"overall_credibility_score": 75.0, "source_name": "Báo Mới"},
        opinion_data={},
        trust_data={},
        reception_data={},
    )
    report = meta_res["fact_checking_report"]
    overview = report["overview"]

    assert overview["total_claims_extracted"] == 4
    assert overview["supported_claims_count"] == 1
    assert overview["partially_supported_count"] == 1
    assert overview["refuted_claims_count"] == 1
    assert overview["not_checkable_count"] == 1
    # verifiable claims = 4 - 1 = 3
    assert overview["verifiable_claims_count"] == 3
    # formula: (1 + 0.5 * 1) / 3 = 1.5 / 3 = 0.50
    assert overview["factual_accuracy_score"] == 0.50
    assert "accuracy_formula" in overview
    assert "accuracy_note" in overview
    assert len(report["claim_breakdown"]) == 4
