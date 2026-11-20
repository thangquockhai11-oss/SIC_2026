"""Stage 1 Acceptance Test: Claim Extraction & Evidence Display.

Tests:
1. Exclude publisher masthead, menus, footer, and related stories from claims.
2. Save original sentence and paragraph_id (1-based index).
3. Test with the Vân Nam youth-meeting article:
   - Government masthead must never appear as a claim.
   - Medical evidence must never appear for this diplomatic youth-meeting event.
   - Missing evidence returns NOT_ENOUGH_INFORMATION.
"""

import pytest
from app.services.clause_segmenter import (
    extract_checkable_clauses,
    is_boilerplate_or_masthead,
)
from app.services.fact_checking_agent import fact_checking_agent


VAN_NAM_ARTICLE_TEXT = """
CỔNG THÔNG TIN ĐIỆN TỬ CHÍNH PHỦ
Trang chủ > Thời sự > Hoạt động của lãnh đạo Đảng, Nhà nước

Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc lần thứ 4 tại Vân Nam

Ngày 25/10/2024, chương trình Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc (Vân Nam) lần thứ tư đã chính thức khai mạc tại thành phố Côn Minh, tỉnh Vân Nam.

Đoàn đại biểu gồm 50 đại biểu thanh niên tiêu biểu Việt Nam do anh Nguyễn Minh Triết, Bí thư Trung ương Đoàn TNCS Hồ Chí Minh dẫn đầu đã tham dự sự kiện ý nghĩa này.

Tại buổi gặp gỡ, hai bên nhất trí tiếp tục làm sâu sắc hơn nữa quan hệ đối tác hợp tác chiến lược toàn diện, tăng cường các hoạt động giao lưu hữu nghị thanh niên biên giới và giáo dục truyền thống hữu nghị cho thế hệ trẻ hai nước.

Xem thêm: Hoạt động đối ngoại của Đoàn Thanh niên Việt Nam năm 2024.

Bản quyền thuộc Cổng Thông tin điện tử Chính phủ.
Cơ quan chủ quản: Văn phòng Chính phủ.
Giấy phép số: 137/GP-BTTTT cấp ngày 21/04/2022.
Tổng Biên tập: Nguyễn Hồng Sâm.
Tòa soạn: 16 Lê Hồng Phong, Ba Đình, Hà Nội.
Hotline: 080.44466.
"""


def test_boilerplate_and_masthead_detection():
    """Verify mastheads, breadcrumbs, and footers are correctly identified."""
    assert is_boilerplate_or_masthead("CỔNG THÔNG TIN ĐIỆN TỬ CHÍNH PHỦ") is True
    assert is_boilerplate_or_masthead("Trang chủ > Thời sự > Hoạt động của lãnh đạo") is True
    assert is_boilerplate_or_masthead("Cơ quan chủ quản: Văn phòng Chính phủ.") is True
    assert is_boilerplate_or_masthead("Giấy phép số: 137/GP-BTTTT cấp ngày 21/04/2022.") is True
    assert is_boilerplate_or_masthead("Tổng Biên tập: Nguyễn Hồng Sâm.") is True
    assert is_boilerplate_or_masthead("Hotline: 080.44466.") is True
    assert is_boilerplate_or_masthead("Xem thêm: Hoạt động đối ngoại của Đoàn") is True
    assert is_boilerplate_or_masthead("Bản quyền thuộc Cổng Thông tin điện tử Chính phủ.") is True

    # Real news sentences must NOT be flagged as boilerplate
    assert is_boilerplate_or_masthead(
        "Ngày 25/10/2024, chương trình Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc đã diễn ra."
    ) is False


def test_van_nam_claim_extraction():
    """Verify that masthead, menus, footer are completely excluded and paragraph_id is preserved."""
    clauses = extract_checkable_clauses(VAN_NAM_ARTICLE_TEXT, max_clauses=5)

    assert len(clauses) >= 2, "Should extract at least 2 checkable propositions from body"

    for c in clauses:
        claim_text = c["claim_text"]
        orig_sent = c["original_sentence"]
        p_id = c["paragraph_id"]

        # Masthead and boilerplate must never appear as a claim
        assert "cổng thông tin điện tử" not in claim_text.lower(), f"Masthead leaked: {claim_text}"
        assert "văn phòng chính phủ" not in claim_text.lower(), f"Boilerplate leaked: {claim_text}"
        assert "giấy phép" not in claim_text.lower(), f"Boilerplate leaked: {claim_text}"
        assert "tổng biên tập" not in claim_text.lower(), f"Boilerplate leaked: {claim_text}"
        assert "trang chủ >" not in claim_text.lower(), f"Breadcrumb leaked: {claim_text}"
        assert "hotline" not in claim_text.lower(), f"Boilerplate leaked: {claim_text}"

        # Must have original_sentence and valid paragraph_id
        assert orig_sent, "Missing original_sentence"
        assert p_id > 0, f"Invalid paragraph_id: {p_id}"


def test_van_nam_no_medical_evidence_leakage():
    """Verify fact-checking the Vân Nam youth meeting article.

    Acceptance criteria:
    - Medical evidence (HepG2, thảo dược, ung thư) must NEVER appear for this event.
    - Missing evidence returns NOT_ENOUGH_INFORMATION ("Chưa đủ bằng chứng").
    - evidences list is empty [].
    """
    verified_claims, trace = fact_checking_agent.execute_fact_checking(
        VAN_NAM_ARTICLE_TEXT,
        language="vi",
        article_title="Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc lần thứ 4 tại Vân Nam",
        source_name="Cổng TTĐT Chính phủ",
    )

    assert len(verified_claims) >= 2

    for vc in verified_claims:
        # Check verdict
        assert vc["verdict"] == "NOT_ENOUGH_INFORMATION", (
            f"Expected NOT_ENOUGH_INFORMATION for diplomat meeting without database match, got {vc['verdict']}"
        )
        assert vc["verification_status"] == "INSUFFICIENT_EVIDENCE"
        assert vc["paragraph_id"] > 0

        # Absolutely NO medical evidence leaked
        evidences = vc.get("evidences", [])
        assert len(evidences) == 0, f"Should have 0 evidence records, got {len(evidences)}"

        for ev in evidences:
            ev_text = ev.get("excerpt", "").lower()
            assert "hepg2" not in ev_text, "Medical cell line leaked into youth meeting!"
            assert "ung thư" not in ev_text, "Cancer research leaked into youth meeting!"
            assert "thảo dược" not in ev_text, "Herbal research leaked into youth meeting!"
