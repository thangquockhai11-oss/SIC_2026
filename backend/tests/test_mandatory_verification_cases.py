"""
TrustMedia AI — Mandatory Verification Test Suite (PHASE 8 Specification)
Verifies the 7 essential core verification test cases:
- Test 1: Irrelevant evidence rejection (Simeone win record vs Tebas Barcelona scandal -> IRRELEVANT, NOT_ENOUGH_INFORMATION)
- Test 2: Fine-grained claim scope decoupling (Simeone is coach vs Simeone sets win record)
- Test 3: Numerical mismatch detection (50% reduction vs 20% reduction -> MISMATCH)
- Test 4: Causal distortion detection (Correlation misrepresented as Causation -> MISLEADING)
- Test 5: Temporal mismatch detection (Effective year 2025 vs 2026 -> MISMATCH)
- Test 6: Negation reversal detection (No evidence vs Direct evidence -> CONTRADICTION / REFUTES)
- Test 7: Grounding abstention (Zero evidence -> NOT_ENOUGH_INFORMATION, zero hallucinated citations)
"""

import pytest
from app.services.claim_article_aligner import ClaimArticleAligner
from app.services.evidence_cross_comparator import EvidenceCrossComparator
from app.services.fact_checking_agent import FactCheckingAgent


class TestMandatoryVerificationCases:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.aligner = ClaimArticleAligner()
        self.comparator = EvidenceCrossComparator()
        self.agent = FactCheckingAgent()

    # --- TEST 1: Irrelevant evidence rejection ---
    def test_01_irrelevant_evidence_rejection(self, monkeypatch):
        """
        Claim: 'Diego Simeone vượt Luis Aragonés về số trận thắng tại La Liga.'
        Evidence: 'Nội dung về phát biểu của Javier Tebas liên quan vụ bê bối Barcelona.'
        Expected: IRRELEVANT, must NOT be SUPPORTED, yields NOT_ENOUGH_INFORMATION when ungrounded.
        """
        claim_text = "Diego Simeone vượt Luis Aragonés về số trận thắng tại La Liga."
        evidence_text = (
            "Chủ tịch La Liga, Javier Tebas, đã đưa ra phát biểu đanh thép liên quan "
            "đến cuộc điều tra các khoản thanh toán của Barcelona cho cựu phó chủ tịch hội đồng trọng tài."
        )
        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        cross_eval = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Tạp chí Thể thao Tây Ban Nha",
        )

        assert cross_eval.relation == "IRRELEVANT"
        assert cross_eval.is_topically_relevant is False
        assert cross_eval.relation != "SUPPORTS"

        # Mock out external live web search to test ungrounded abstention strictly against the pool
        monkeypatch.setattr(
            "app.services.fact_checking_agent.live_evidence_retriever.retrieve_for_claim",
            lambda **kw: [],
        )
        monkeypatch.setattr(
            "app.services.fact_checking_agent.hybrid_retriever.retrieve",
            lambda **kw: [],
        )

        # Verify through fact_checking_agent pipeline: ungrounded claim must abstain to NOT_ENOUGH_INFORMATION
        result = self.agent.verify_single_claim(
            claim={"claim_text": claim_text, "checkability": True},
            article_title="Kỷ lục huấn luyện viên La Liga",
            story_evidence_pool=[{
                "excerpt": evidence_text,
                "source_name": "Tạp chí Thể thao Tây Ban Nha",
                "source_url": "https://example.com/sports/tebas",
            }]
        )
        assert result["verdict"] in ("NOT_ENOUGH_INFORMATION", "MISLEADING")
        assert result["verdict"] != "SUPPORTED"

    # --- TEST 2: Fine-grained scope decoupling ---
    def test_02_fine_grained_scope_decoupling(self):
        """
        Claim A: 'Diego Simeone là huấn luyện viên của Atletico Madrid.'
        Claim B: 'Diego Simeone phá kỷ lục 345 trận thắng của Luis Aragonés.'
        Evidence: 'Nguồn chỉ xác nhận Simeone dẫn dắt Atletico Madrid.'
        Expected: Supports Claim A, but CANNOT support Claim B.
        """
        evidence_text = "Diego Simeone hiện đang là huấn luyện viên trưởng phụ trách dẫn dắt đội bóng Atletico Madrid tại giải La Liga."
        
        # Test Claim A (identity/role)
        claim_a = "Diego Simeone là huấn luyện viên của Atletico Madrid."
        attrs_a = self.aligner.extract_claim_attributes(claim_a)
        eval_a = self.comparator.compare_evidence_against_claim(
            claim_attrs=attrs_a,
            evidence_text=evidence_text,
            source_name="Báo Thể thao",
        )
        assert eval_a.entity_match in ("MATCH", "PARTIAL")
        assert eval_a.relation in ("SUPPORTS", "PARTIALLY_SUPPORTS", "CONTEXTUAL")

        # Test Claim B (specific statistical record)
        claim_b = "Diego Simeone vượt Luis Aragonés lập kỷ lục 345 trận thắng tại giải La Liga."
        attrs_b = self.aligner.extract_claim_attributes(claim_b)
        eval_b = self.comparator.compare_evidence_against_claim(
            claim_attrs=attrs_b,
            evidence_text=evidence_text,
            source_name="Báo Thể thao",
        )
        # Evidence has no numerical data about 345 wins or Luis Aragones
        assert eval_b.numerical_match in ("MISMATCH", "NOT_MENTIONED")
        assert eval_b.relation != "SUPPORTS"

    # --- TEST 3: Numerical mismatch ---
    def test_03_numerical_mismatch(self):
        """
        Claim: 'Giảm 50% nguy cơ.'
        Evidence: 'Giảm 20% nguy cơ.'
        Expected: Numerical mismatch detected, relation is CONTRADICTS or PARTIALLY_CONTRADICTS.
        """
        claim_text = "Phương pháp điều trị mới giúp giảm 50% nguy cơ tái phát bệnh."
        evidence_text = "Kết quả theo dõi sau can thiệp ghi nhận phương pháp giúp giảm 20% nguy cơ tái phát bệnh."
        
        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        cross_eval = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Tạp chí Y học Lâm sàng",
        )

        assert cross_eval.numerical_match == "MISMATCH"
        assert cross_eval.relation in ("CONTRADICTS", "PARTIALLY_CONTRADICTS")
        num_rows = [r for r in cross_eval.matrix if "Số liệu" in r.attribute]
        assert len(num_rows) > 0
        assert num_rows[0].match_status == "MISMATCH"

    # --- TEST 4: Causal distortion (Correlation -> Causation) ---
    def test_04_causal_distortion(self):
        """
        Claim: 'Nghiên cứu chứng minh X gây ra Y (Uống cà phê chữa khỏi bệnh X).'
        Evidence: 'Nghiên cứu quan sát cho thấy X có tương quan với Y.'
        Expected: Detect causal mismatch, consider MISLEADING.
        """
        article_sent = "Nghiên cứu quan sát trên 10.000 người ghi nhận mối liên hệ tương quan giữa thói quen uống cà phê và giảm nguy cơ mắc bệnh X."
        distorted_claim = "Nghiên cứu chứng minh việc uống cà phê mỗi ngày gây ra việc phòng ngừa dứt điểm bệnh X."

        # Fidelity check
        fidelity = self.aligner.verify_article_fidelity(article_sent, distorted_claim)
        assert fidelity.distortion_detected is True
        assert "CAUSAL_DISTORTION" in fidelity.distortion_type

        # Evidence cross-comparison
        claim_attrs = self.aligner.extract_claim_attributes(distorted_claim)
        cross_eval = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=article_sent,
            source_name="Tạp chí Y khoa Quốc tế",
        )
        causal_rows = [r for r in cross_eval.matrix if "nhân quả" in r.attribute.lower()]
        assert len(causal_rows) > 0
        assert causal_rows[0].match_status in ("MISMATCH", "PARTIAL")

    # --- TEST 5: Temporal mismatch ---
    def test_05_temporal_mismatch(self):
        """
        Claim: 'Chính sách có hiệu lực năm 2025.'
        Evidence: 'Tài liệu nói chính sách có hiệu lực năm 2026.'
        Expected: Temporal mismatch detected.
        """
        claim_text = "Nghị định mới về chính sách thuế suất ưu đãi chính thức có hiệu lực từ năm 2025."
        evidence_text = "Theo văn bản hướng dẫn của cơ quan quản lý, chính sách thuế suất ưu đãi sẽ có hiệu lực thi hành kể từ ngày 01 tháng 01 năm 2026."

        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        cross_eval = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Cổng thông tin Pháp luật",
        )

        assert cross_eval.temporal_match == "MISMATCH"
        time_rows = [r for r in cross_eval.matrix if "thời gian" in r.attribute.lower() or "temporal" in r.attribute.lower()]
        assert len(time_rows) > 0
        assert time_rows[0].match_status == "MISMATCH"

    # --- TEST 6: Negation reversal ---
    def test_06_negation_reversal(self):
        """
        Claim: 'Không có bằng chứng cho thấy virus X lây truyền qua không khí.'
        Evidence: 'Nghiên cứu công bố có bằng chứng trực tiếp cho thấy virus X lây truyền qua không khí.'
        Expected: Negation mismatch detected, relation CONTRADICTS.
        """
        claim_text = "Không có bằng chứng cho thấy virus X lây truyền qua không khí."
        evidence_text = "Cơ quan y tế công bố các nghiên cứu đã phát hiện bằng chứng trực tiếp chứng minh virus X lây truyền qua các hạt khí dung trong không khí."

        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        cross_eval = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Tổ chức Y tế Thế giới (WHO)",
        )

        assert cross_eval.relation in ("CONTRADICTS", "PARTIALLY_CONTRADICTS")
        assert cross_eval.negation_match == "MISMATCH"
        neg_rows = [r for r in cross_eval.matrix if "phủ định" in r.attribute.lower()]
        assert len(neg_rows) > 0
        assert neg_rows[0].match_status == "MISMATCH"

    # --- TEST 7: Zero evidence abstention ---
    def test_07_zero_evidence_abstention(self):
        """
        Claim with zero matching evidence.
        Expected: NOT_ENOUGH_INFORMATION, zero hallucinated citations, empty evidence list.
        """
        obscure_claim = "Thiên thạch bí ẩn ký hiệu Omega-X999 rơi xuống đỉnh núi Fansipan làm bốc hơi toàn bộ thung lũng vào năm 1742."
        result = self.agent.verify_single_claim(
            claim={"claim_text": obscure_claim, "checkability": True},
            article_title="Thiên thạch Fansipan 1742",
        )

        assert result["verdict"] == "NOT_ENOUGH_INFORMATION"
        assert result["verification_status"] == "INSUFFICIENT_EVIDENCE"
        assert result["confidence"] <= 0.70
        assert len(result["supporting_evidences"]) == 0
        assert len(result["refuting_evidences"]) == 0
        assert result["evidence_url"] is None
