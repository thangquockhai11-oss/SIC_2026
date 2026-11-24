"""
Unit tests for Claim Checkability Classifier and Astrology/Entertainment handling.
Verifies the 8 checkability taxonomy classes, 5 checkability statuses, and zero fake evidence for non-checkable content.
"""

import pytest

from app.services.claim_checkability_classifier import get_claim_checkability_classifier
from app.services.fact_checking_agent import fact_checking_agent


@pytest.fixture
def classifier():
    return get_claim_checkability_classifier()


class TestClaimCheckabilityTaxonomy:
    """Tests covering all 10 canonical categories specified in the Master Implementation Prompt."""

    def test_01_checkable_fact(self, classifier):
        text = "Diego Simeone vượt người thầy cũ Luis Aragonés để trở thành HLV thắng nhiều trận nhất lịch sử La Liga."
        res = classifier.classify_claim(text, text, article_title="Simeone phá kỷ lục thắng tồn tại 22 năm ở La Liga")
        assert res.claim_type == "CHECKABLE_FACT"
        assert res.checkability_status == "CHECKABLE"
        assert res.is_claim is True

    def test_02_checkable_statistical_claim(self, classifier):
        text = "Tỷ lệ thất nghiệp quý 3 giảm 1.5% so với cùng kỳ năm trước."
        res = classifier.classify_claim(text, text)
        assert res.claim_type in ("CHECKABLE_EMPIRICAL_CLAIM", "CHECKABLE_FACT")
        assert res.checkability_status == "CHECKABLE"
        assert res.is_claim is True

    def test_03_checkable_scientific_empirical_claim(self, classifier):
        text = "Uống mỗi tách cà phê hàng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt theo nghiên cứu BMJ."
        res = classifier.classify_claim(text, text, article_title="Cà phê có thể giảm nguy cơ ung thư tuyến tiền liệt")
        assert res.claim_type == "CHECKABLE_EMPIRICAL_CLAIM"
        assert res.checkability_status == "CHECKABLE"
        assert res.is_claim is True
        assert len(res.measurable_conditions) > 0
        assert len(res.evidence_requirements) > 0

    def test_04_astrological_claim_not_checkable(self, classifier):
        text = "5 con giáp có số đào hoa trong năm 2024"
        res = classifier.classify_claim(text, text, article_title="5 con giáp có số đào hoa trong năm 2024")
        assert res.claim_type == "ASTROLOGICAL_OR_SUPERNATURAL_CLAIM"
        assert res.checkability_status == "NOT_CHECKABLE"
        assert res.is_claim is True

    def test_05_vague_prediction_not_checkable(self, classifier):
        text = "Tuổi Tý rất có thể sẽ gặp được người phù hợp vào năm Thìn."
        res = classifier.classify_claim(text, text, article_title="5 con giáp có số đào hoa trong năm 2024")
        assert res.claim_type in ("PREDICTION", "ASTROLOGICAL_OR_SUPERNATURAL_CLAIM")
        assert res.checkability_status == "NOT_CHECKABLE"

    def test_06_concrete_prediction_checkable(self, classifier):
        text = "Doanh thu tập đoàn dự báo sẽ đạt 500 tỷ vào quý 4 năm 2025."
        res = classifier.classify_claim(text, text)
        assert res.claim_type == "PREDICTION"
        assert res.checkability_status == "CHECKABLE"

    def test_07_subjective_opinion_not_checkable(self, classifier):
        text = "Đây là thành phố đẹp và đáng sống nhất Việt Nam theo quan điểm của tôi."
        res = classifier.classify_claim(text, text)
        assert res.claim_type == "OPINION"
        assert res.checkability_status == "NOT_CHECKABLE"

    def test_08_rhetorical_invitation_not_a_claim(self, classifier):
        text = "Hãy cùng xem và cảm nhận mình có phải người đào hoa không nhé!"
        res = classifier.classify_claim(text, text, article_title="5 con giáp có số đào hoa trong năm 2024")
        assert res.claim_type == "RHETORICAL_OR_CALL_TO_ACTION"
        assert res.checkability_status == "NOT_A_CLAIM"
        assert res.is_claim is False

    def test_09_rhetorical_question_not_a_claim(self, classifier):
        text = "Liệu chúng ta có nên tiếp tục tin vào những lời hứa hẹn này không?"
        res = classifier.classify_claim(text, text)
        assert res.claim_type == "RHETORICAL_OR_CALL_TO_ACTION"
        assert res.checkability_status == "NOT_A_CLAIM"
        assert res.is_claim is False

    def test_10_partially_checkable_mixed_claim(self, classifier):
        text = "Bộ trưởng đã ký ban hành nghị định vào năm 2024, và đây là quyết định tốt nhất từ trước đến nay."
        res = classifier.classify_claim(text, text)
        assert res.claim_type == "PARTIALLY_CHECKABLE"
        assert res.checkability_status == "PARTIALLY_CHECKABLE"
        assert len(res.sub_propositions) >= 2


class TestAstrologyArticleEndToEnd:
    """Verifies the exact target article '5 con giáp có số đào hoa trong năm 2024'."""

    ARTICLE_TITLE = "5 con giáp có số đào hoa trong năm 2024"
    ARTICLE_BODY = (
        "Hãy cùng xem và cảm nhận mình có phải người đào hoa không nhé!\n\n"
        "Vào năm Thìn 2024, người tuổi Tý sẽ rất may mắn trong tình yêu.\n\n"
        "Tuổi Tý rất có thể sẽ gặp được người phù hợp vào năm Thìn.\n\n"
        "Năm 2024, tuổi Tý sẽ gặp nhiều hạnh phúc và tri kỷ."
    )

    def test_astrology_claim_extraction(self):
        claims = fact_checking_agent.extract_checkable_claims(
            self.ARTICLE_BODY,
            max_claims=5,
            article_title=self.ARTICLE_TITLE,
        )
        assert len(claims) == 5

        # Claim 1: Title
        assert claims[0]["checkability_status"] == "NOT_CHECKABLE"
        assert claims[0]["claim_type"] == "ASTROLOGICAL_OR_SUPERNATURAL_CLAIM"

        # Claim 2: Call to action
        assert claims[1]["checkability_status"] == "NOT_A_CLAIM"
        assert claims[1]["is_claim"] is False

        # Claims 3, 4, 5: Predictions / Astrology
        for c in claims[2:]:
            assert c["checkability_status"] == "NOT_CHECKABLE"

    def test_astrology_fact_checking_pipeline_verdict_and_report(self):
        verified_claims, trace = fact_checking_agent.execute_fact_checking(
            content=self.ARTICLE_BODY,
            article_title=self.ARTICLE_TITLE,
        )

        assert len(verified_claims) == 5

        # All claims must skip retrieval: retrieval_count == 0 and evidences == []
        for c in verified_claims:
            assert c["verdict"] in ("NOT_CHECKABLE", "NOT_A_CLAIM")
            assert c["evidences"] == []
            assert c["retrieval_count"] == 0
            # Evidence gap stages 2 & 3 must be KHÔNG ÁP DỤNG
            gap = c["evidence_gap"]
            assert gap["t2_status"] == "KHÔNG ÁP DỤNG"
            assert gap["t3_status"] == "KHÔNG ÁP DỤNG"

        # Article-level report must declare NOT_CHECKABLE without fake refutation
        report = trace["article_level_report"]
        assert trace["output"]["primary_verdict"] == "NOT_CHECKABLE"
        assert report["checkable_claims_count"] == 0
        assert report["non_checkable_claims_count"] == 4
        assert report["not_a_claim_count"] == 1
        assert report["supported_count"] == 0
        assert report["refuted_count"] == 0
        assert report["article_consistency_score"] is None
        assert "giải trí" in report["entertainment_notice"]
