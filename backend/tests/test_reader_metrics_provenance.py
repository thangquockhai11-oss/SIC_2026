"""Test suite for Phase 2 - Task 2: Reader Metrics & Provenance.
Verifies removal of synthetic/hash-based stats, enforcement of 'Chưa có dữ liệu người đọc',
empty comprehension scores when unobserved, and explicit provenance tracking.
"""

import uuid
import pytest
from app.services.public_trust_agent import public_trust_agent
from app.services.information_reception_agent import information_reception_agent
from app.services.public_opinion_agent import public_opinion_agent
from app.services.meta_agent import meta_agent


def test_1_zero_observation_state_for_url_only():
    """Verify that when only content/URL is submitted without reader responses,
    all three agents return sample_size = 0, comprehension_score = None,
    and message 'Chưa có dữ liệu người đọc'.
    """
    content = "Thành phố Hồ Chí Minh công bố điều chỉnh đồ án quy hoạch phân khu tỷ lệ 1/2000."
    title = "Điều chỉnh quy hoạch đô thị"

    # 1. Public Trust
    trust_data, trust_trace = public_trust_agent.evaluate(content, article_title=title, reader_surveys=None)
    assert trust_data["sample_size"] == 0
    assert trust_data["trust_source_score"] is None
    assert trust_data["findings_summary"] == "Chưa có dữ liệu người đọc"
    assert trust_data["data_provenance_type"] == "OBSERVED"
    assert trust_data["method_applied"] == "ZERO_OBSERVATION_STATE"
    assert "chưa có dữ liệu" in trust_data["fallback_reason"].lower()
    assert trust_trace["status"] == "COMPLETED"

    # 2. Information Reception
    rec_data, rec_trace = information_reception_agent.evaluate(content, article_title=title, reader_surveys=None)
    assert rec_data["sample_size"] == 0
    assert rec_data["comprehension_score"] is None
    assert rec_data["comprehension_ratio_str"] is None
    assert rec_data["cognitive_resistance_notes"] == "Chưa có dữ liệu người đọc"
    assert rec_data["data_provenance_type"] == "OBSERVED"
    assert rec_data["method_applied"] == "ZERO_OBSERVATION_STATE"
    assert "chưa có bài làm khảo sát" in rec_data["fallback_reason"].lower()

    # 3. Public Opinion
    op_data, op_trace = public_opinion_agent.analyze(content, article_title=title, comments=None)
    assert op_data["sample_size"] == 0
    assert op_data["stance_support"] is None
    assert op_data["stance_oppose"] is None
    assert op_data["discussion_summary"] == "Chưa có dữ liệu người đọc"
    assert op_data["data_provenance_type"] == "OBSERVED"
    assert op_data["method_applied"] == "ZERO_OBSERVATION_STATE"
    assert op_data["raw_comments_sample"] == []

    # 4. Meta Agent Synthesis with zero reader data
    claims = [
        {
            "id": "c1",
            "claim_text": "Điều chỉnh quy hoạch đô thị theo quyết định 123",
            "verdict": "SUPPORTED",
            "confidence": 0.92,
        }
    ]
    cred_data = {"overall_credibility_score": 85.0, "source_name": "Tuổi Trẻ"}
    meta_res, meta_tr = meta_agent.synthesize(
        claims=claims,
        credibility_data=cred_data,
        opinion_data=op_data,
        trust_data=trust_data,
        reception_data=rec_data,
        article_title=title,
    )
    assert meta_res["verdict"] == "SUPPORTED"
    # Ensure calibration criteria highlights zero reader data
    criteria_text = " ".join(meta_res["calibration_criteria"])
    assert "Chưa có dữ liệu người đọc" in criteria_text


def test_2_empirical_observation_state_with_surveys_and_comments():
    """Verify that when real surveys and comments are provided,
    agents calculate strictly empirical values with method provenance.
    """
    content = "Thành phố Hồ Chí Minh công bố điều chỉnh đồ án quy hoạch phân khu."
    title = "Điều chỉnh quy hoạch đô thị"

    # 3 Surveys: 2 correct comprehension, 1 wrong
    surveys = [
        {
            "trust_outlet_score": 90.0,
            "claim_trust_ratings": {"c1": 95.0},
            "total_questions": 3,
            "correct_count": 3,
            "comprehension_score": 100.0,
            "sharing_intention": "PROBABLY_SHARE",
            "verify_before_sharing": True,
            "is_verified": True,
        },
        {
            "trust_outlet_score": 80.0,
            "claim_trust_ratings": {"c1": 85.0},
            "total_questions": 3,
            "correct_count": 3,
            "comprehension_score": 100.0,
            "sharing_intention": "DEFINITELY_SHARE",
            "verify_before_sharing": True,
            "is_verified": True,
        },
        {
            "trust_outlet_score": 60.0,
            "claim_trust_ratings": {"c1": 50.0},
            "total_questions": 3,
            "correct_count": 0,
            "comprehension_score": 0.0,
            "sharing_intention": "DO_NOT_SHARE",
            "verify_before_sharing": False,
            "is_verified": True,
        },
    ]

    trust_data, _ = public_trust_agent.evaluate(content, article_title=title, reader_surveys=surveys)
    assert trust_data["sample_size"] == 3
    assert trust_data["trust_source_score"] == round((90 + 80 + 60) / 3, 1)  # 76.7
    assert trust_data["data_provenance_type"] == "OBSERVED"
    assert trust_data["method_applied"] == "EMPIRICAL_SURVEY_AGGREGATION"
    assert trust_data["fallback_reason"] is None

    rec_data, _ = information_reception_agent.evaluate(content, article_title=title, reader_surveys=surveys)
    assert rec_data["sample_size"] == 3
    assert rec_data["comprehension_ratio_str"] == "2/3"
    assert rec_data["comprehension_score"] == round((100 + 100 + 0) / 3, 1)  # 66.7
    assert rec_data["data_provenance_type"] == "OBSERVED"
    assert rec_data["method_applied"] == "EMPIRICAL_SURVEY_QUIZ_SCORING"

    # Comments
    comments = [
        "Hoàn toàn nhất trí và ủng hộ chủ trương điều chỉnh quy hoạch đúng đắn.",
        "Đồng tình với phương án phê duyệt của UBND Thành phố.",
    ]
    claims = [{"claim_text": "Điều chỉnh quy hoạch đô thị theo quyết định 123"}]
    op_data, _ = public_opinion_agent.analyze(content, claims=claims, comments=comments, article_title=title)
    assert op_data["sample_size"] == 2
    assert op_data["stance_support"] == 1.0
    assert op_data["stance_oppose"] == 0.0
    assert op_data["data_provenance_type"] == "OBSERVED"
    assert op_data["method_applied"] == "EMPIRICAL_PAIRWISE_COMMENT_CLAIM_STANCE"
