"""
TrustMedia AI — Benchmark Test Suite for Article Claim vs External Evidence Cross-Verification
Covers the 12 Critical Challenge Subsets:
1. Numerical Mismatch
2. Entity Mismatch
3. Temporal Mismatch
4. Causal Distortion (Correlation -> Causation)
5. Modality Exaggeration (Possibility -> Absolute certainty)
6. Missing Context / Dropped Qualifiers (In-vitro / preclinical -> General population)
7. Attribution Mismatch / Omission
8. Negation Reversal
9. Conflicting Evidence Resolution
10. Evidence Insufficiency (Abstention / NOT_ENOUGH_INFORMATION)
11. Source Dependency Clustering (Wire service copy detection)
12. Wikitext Sanitization (Infobox, pipe, ref removal)
"""

import pytest
from app.services.claim_article_aligner import ClaimArticleAligner, ClaimAttributes
from app.services.evidence_cross_comparator import (
    EvidenceCrossComparator,
    EvidenceCrossEvaluation,
    ConflictMatrixItem,
    cluster_source_independence,
    detect_conflicts,
)
from app.services.hybrid_retrieval import clean_wikitext
from app.services.fact_checking_agent import FactCheckingAgent


class TestCrossVerificationBenchmark:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.aligner = ClaimArticleAligner()
        self.comparator = EvidenceCrossComparator()

    # --- CHALLENGE 1: Numerical Mismatch ---
    def test_challenge_01_numerical_mismatch(self):
        article_sent = "Tổng kim ngạch xuất khẩu của cả nước năm 2024 đạt 385 tỷ USD."
        distorted_claim = "Tổng kim ngạch xuất khẩu của Việt Nam đạt 500 tỷ USD năm 2024."
        fidelity = self.aligner.verify_article_fidelity(article_sent, distorted_claim)
        
        assert fidelity.distortion_detected is True
        assert "NUMERICAL_DISTORTION" in fidelity.distortion_type

        # Cross-comparison with external evidence stating 385.3 tỷ USD
        claim_attrs = self.aligner.extract_claim_attributes(distorted_claim)
        eval_res = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text="Theo Tổng cục Thống kê, kim ngạch xuất khẩu năm 2024 đạt 385,3 tỷ USD.",
            source_name="Tổng cục Thống kê",
        )
        num_rows = [r for r in eval_res.matrix if "Số liệu" in r.attribute]
        assert len(num_rows) > 0
        assert num_rows[0].match_status == "MISMATCH"
        assert eval_res.relation in ("CONTRADICTS", "PARTIALLY_CONTRADICTS")

    # --- CHALLENGE 2: Entity Mismatch ---
    def test_challenge_02_entity_mismatch(self):
        claim_text = "Phát hiện ổ dịch cúm gia cầm bùng phát tại Hà Nội."
        evidence_text = "Chi cục Thú y xác nhận phát hiện ổ dịch cúm gia cầm bùng phát tại tỉnh Hưng Yên."
        
        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        eval_res = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Chi cục Thú y",
        )
        entity_rows = [r for r in eval_res.matrix if "Thực thể" in r.attribute or "Địa điểm" in r.attribute]
        assert len(entity_rows) > 0
        assert any(r.match_status in ("MISMATCH", "PARTIAL") for r in entity_rows)

    # --- CHALLENGE 3: Temporal Mismatch ---
    def test_challenge_03_temporal_mismatch(self):
        claim_text = "Chính phủ đã ban hành nghị định sửa đổi thuế tiêu thụ đặc biệt vào năm 2026."
        evidence_text = "Chính phủ đã ban hành Nghị định quy định chi tiết về thuế tiêu thụ đặc biệt vào tháng 6 năm 2022."
        
        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        eval_res = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Cổng thông tin Chính phủ",
        )
        temp_rows = [r for r in eval_res.matrix if "thời gian" in r.attribute.lower() or "temporal" in r.attribute.lower()]
        assert len(temp_rows) > 0
        assert temp_rows[0].match_status == "MISMATCH"

    # --- CHALLENGE 4: Causal Distortion (Correlation -> Causation) ---
    def test_challenge_04_causal_distortion(self):
        article_sent = "Các nhà khoa học ghi nhận mối liên hệ tương quan giữa việc uống cà phê và giảm nhẹ nguy cơ mắc một số bệnh tim mạch."
        distorted_claim = "Uống cà phê là nguyên nhân chữa dứt điểm bệnh tim mạch."
        
        fidelity = self.aligner.verify_article_fidelity(article_sent, distorted_claim)
        assert fidelity.distortion_detected is True
        assert "CAUSAL_DISTORTION" in fidelity.distortion_type
        assert fidelity.fidelity_status == "DISTORTED"

    # --- CHALLENGE 5: Modality Exaggeration (Possibility -> Absolute) ---
    def test_challenge_05_modality_exaggeration(self):
        article_sent = "Hợp chất mới có triển vọng tiềm năng, có thể được thử nghiệm lâm sàng trong giai đoạn tiếp theo."
        exaggerated_claim = "Hợp chất mới chắc chắn 100% đặc trị ung thư."
        
        fidelity = self.aligner.verify_article_fidelity(article_sent, exaggerated_claim)
        assert fidelity.distortion_detected is True
        assert "MODALITY_EXAGGERATION" in fidelity.distortion_type

    # --- CHALLENGE 6: Missing Context / Dropped Qualifiers ---
    def test_challenge_06_dropped_qualifiers(self):
        article_sent = "Hoạt chất tiêu diệt 95% tế bào ác tính trong mô hình ống nghiệm in-vitro trên chuột bạch."
        overgeneralized_claim = "Hoạt chất tiêu diệt 95% tế bào ung thư ở người bệnh."
        
        fidelity = self.aligner.verify_article_fidelity(article_sent, overgeneralized_claim)
        assert fidelity.distortion_detected is True
        assert "OVERGENERALIZATION" in fidelity.distortion_type

    # --- CHALLENGE 7: Attribution Mismatch ---
    def test_challenge_07_attribution_mismatch(self):
        claim_text = "WHO tuyên bố dịch bệnh đã hoàn toàn biến mất trên toàn cầu."
        evidence_text = "Tổ chức Y tế Thế giới (WHO) khuyến cáo dịch bệnh vẫn đang lây lan và bác bỏ tin đồn biến mất."
        
        claim_attrs = self.aligner.extract_claim_attributes(claim_text)
        eval_res = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text=evidence_text,
            source_name="Tổ chức Y tế Thế giới (WHO)",
        )
        assert eval_res.relation in ("CONTRADICTS", "PARTIALLY_CONTRADICTS")

    # --- CHALLENGE 8: Negation Reversal ---
    def test_challenge_08_negation_reversal(self):
        article_sent = "Bộ Y tế khẳng định không có việc thiếu thuốc điều trị sởi tại các bệnh viện công lập."
        inverted_claim = "Bộ Y tế có việc thiếu thuốc điều trị sởi tại các bệnh viện."
        
        fidelity = self.aligner.verify_article_fidelity(article_sent, inverted_claim)
        assert fidelity.distortion_detected is True
        assert "NEGATION_REVERSAL" in fidelity.distortion_type

    # --- CHALLENGE 9: Conflicting Evidence Resolution ---
    def test_challenge_09_conflicting_evidence_resolution(self):
        eval_1 = EvidenceCrossEvaluation(
            evidence_id="doc1",
            source_name="Viện Dược liệu Quốc gia",
            source_url="http://vienduoclieu.gov.vn/1",
            relation="SUPPORTS",
            confidence=0.9,
            matrix=[],
        )
        eval_2 = EvidenceCrossEvaluation(
            evidence_id="doc2",
            source_name="Cục Quản lý Dược",
            source_url="http://dav.gov.vn/2",
            relation="CONTRADICTS",
            confidence=0.92,
            matrix=[],
        )
        conflicts = detect_conflicts([eval_1, eval_2])
        assert len(conflicts) > 0
        assert conflicts[0].conflict_type == "DIRECT_CONTRADICTION"
        assert "Viện Dược liệu Quốc gia" in conflicts[0].source_a
        assert "Cục Quản lý Dược" in conflicts[0].source_b

    # --- CHALLENGE 10: Evidence Insufficiency (Abstention) ---
    def test_challenge_10_evidence_insufficiency_abstention(self):
        # When an off-topic or empty evidence is provided
        claim_attrs = self.aligner.extract_claim_attributes("Người ngoài hành tinh đã đổ bộ xuống đỉnh núi Fansipan sáng nay.")
        eval_res = self.comparator.compare_evidence_against_claim(
            claim_attrs=claim_attrs,
            evidence_text="Đỉnh Fansipan là đỉnh núi cao nhất Việt Nam thuộc dãy Hoàng Liên Sơn.",
            source_name="Địa lý Việt Nam",
        )
        # Off-topic evidence without alien/đổ bộ should be rejected
        assert eval_res.is_topically_relevant is False
        assert eval_res.relation == "IRRELEVANT"

    # --- CHALLENGE 11: Source Dependency Clustering (Wire Copy) ---
    def test_challenge_11_source_clustering_wire_copy(self):
        candidates = [
            {"evidence_id": "c1", "source_name": "VnExpress (TTXVN)", "source_url": "http://vnexpress.net", "excerpt": "Theo TTXVN, kim ngạch xuất khẩu đạt đỉnh."},
            {"evidence_id": "c2", "source_name": "Tuổi Trẻ", "source_url": "http://tuoitre.vn", "excerpt": "nguồn: ttxvn đưa tin kim ngạch xuất khẩu đạt đỉnh."},
            {"evidence_id": "c3", "source_name": "Báo Lao Động", "source_url": "http://laodong.vn", "excerpt": "theo ttxvn, kinh tế tiếp tục tăng trưởng."},
            {"evidence_id": "c4", "source_name": "World Bank Report", "source_url": "http://worldbank.org", "excerpt": "Independent economic monitoring shows Vietnam export growth."},
        ]
        clusters = cluster_source_independence(candidates)
        # c1, c2, c3 should share the TTXVN wire cluster
        assert clusters["c1"] == clusters["c2"] == clusters["c3"]
        assert "Thông tấn xã Việt Nam" in clusters["c1"]
        # c4 has an independent domain cluster
        assert clusters["c4"] != clusters["c1"]

    # --- CHALLENGE 12: Wikitext Sanitization Verification ---
    def test_challenge_12_wikitext_sanitization(self):
        raw_wikitext = """
        {{Thông tin biên giới
        | territory1 = [[Trung Quốc]]
        | territory2 = [[Nga]]
        | length = 4.209,3 km (2.615,5 mi)
        | established = Thế kỷ 17, 1991
        }}
        == Lịch sử ==
        Biên giới Nga–Trung Quốc có lịch sử đàm phán lâu dài.<ref>{{cite web|url=http://example.com}}</ref>
        """
        cleaned = clean_wikitext(raw_wikitext)
        # Ensure pipes, infobox keys, ref tags are completely stripped
        assert "| territory2" not in cleaned
        assert "| length = 4.209,3 km" not in cleaned
        assert "<ref>" not in cleaned
        assert "{{" not in cleaned
        assert "Biên giới Nga–Trung Quốc có lịch sử đàm phán lâu dài." in cleaned

    def test_boilerplate_filtering(self):
        # Newspaper UI boilerplate phrases must never be extracted as factual claims
        boilerplate_1 = "Khi nhìn thấy dấu tích xanh bên cạnh VnExpress là đã hoàn thành."
        boilerplate_2 = "Trụ sở: 16 Lê Hồng Phong - Ba Đình - Hà Nội; Điện thoại: Văn phòng: 080.43162"
        boilerplate_3 = "© BÁO ĐIỆN TỬ CỦA CHÍNH PHỦ NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        boilerplate_4 = "Bấm theo dõi kênh Google News của báo để nhận tin nhanh nhất."
        
        assert FactCheckingAgent.is_boilerplate_or_administrative(boilerplate_1) is True
        assert FactCheckingAgent.is_boilerplate_or_administrative(boilerplate_2) is True
        assert FactCheckingAgent.is_boilerplate_or_administrative(boilerplate_3) is True
        assert FactCheckingAgent.is_boilerplate_or_administrative(boilerplate_4) is True
