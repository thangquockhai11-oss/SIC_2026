import sys
from pathlib import Path

# Add root directory to path for ml and backend
project_root = Path(__file__).resolve().parent.parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(backend_dir))

from app.services.fact_checking_agent import fact_checking_agent

title = "Thay xăng bằng nước lã và rác thải?"
content = """
Nhiều ngày qua, trên mạng xã hội lan truyền thông tin về một sáng chế có thể thay thế xăng bằng nước lã và rác thải để vận hành xe máy và ô tô.
Người sáng chế khẳng định động cơ chạy được hơn 100km chỉ với 1 lít nước lã và một lượng nhỏ rác thải hữu cơ.
Tuy nhiên, các nhà khoa học cảnh báo đây là điều không tưởng và vi phạm các định luật nhiệt động lực học cơ bản.
© BÁO ĐIỆN TỬ CỦA CHÍNH PHỦ NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Trụ sở: 16 Lê Hồng Phong – Ba Đình – Hà Nội; Điện thoại: Văn phòng: 080.43162; Fax: 080.48924; Email: thongtinchinhphu@chinhphu.vn
BÁO ĐIỆN TỬ CHÍNH PHỦ Bản quyền thuộc Báo Điện tử Chính phủ – Cục Thông tin và Truyền thông Chính phủ.
"""

claims, trace = fact_checking_agent.execute_fact_checking(
    content,
    article_title=title,
    source_url="https://baochinhphu.vn/thay-xang-bang-nuoc-la-va-rac-thai.htm",
    source_name="Báo Điện tử Chính phủ",
)

print(f"=== TOTAL CLAIMS EXTRACTED: {len(claims)} ===")
for i, c in enumerate(claims):
    print(f"\n[Luận điểm #{i+1}]")
    print(f"  Gốc: {c['original_text']}")
    print(f"  Chuẩn hóa: {c['normalized_claim']}")
    print(f"  Chủ chốt: {c.get('is_key_claim')}")
    print(f"  Phân loại: {c.get('claim_type')}")
    print(f"  Kết luận (Verdict): {c['verdict']}")
    print(f"  Độ tin cậy: {c.get('confidence')}")
    print(f"  Nguồn bằng chứng: {c.get('evidence_source')}")
    print(f"  Trích dẫn bằng chứng: {c.get('evidence_quote')[:140]}...")
    print(f"  Giải thích quyết định: {c.get('decisive_reasoning')[:140]}...")

# Assertions
assert len(claims) >= 2, "Must extract at least 2 claims"
assert claims[0]["is_key_claim"] is True, "Claim 1 must be key claim"
assert "thay" in claims[0]["original_text"].lower() and "xăng" in claims[0]["original_text"].lower(), "Claim 1 must be about the title"
for c in claims:
    assert "trụ sở" not in c["original_text"].lower(), "Boilerplate 'Trụ sở' must not be in claims"
    assert "bản quyền" not in c["original_text"].lower(), "Boilerplate 'Bản quyền' must not be in claims"
    assert "guihaumé" not in (c.get("evidence_quote") or "").lower(), "French ambassador evidence must NOT be retrieved"

print("\n>>> ALL TITLE-ANCHORED ASSERTIONS PASSED PERFECTLY! <<<")
