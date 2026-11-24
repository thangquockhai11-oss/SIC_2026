import sys
from pathlib import Path

# Setup paths
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(backend_dir))

from app.services.fact_checking_agent import fact_checking_agent

text = """
Thay xăng bằng nước lã và rác thải?
CHÍNH PHỦ NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM BÁO ĐIỆN TỬ CHÍNH PHỦ
Trụ sở: 16 Lê Hồng Phong - Ba Đình - Hà Nội
Báo Điện tử Chính phủ Bản quyền thuộc Báo Điện tử Chính phủ
"""

claims, trace = fact_checking_agent.execute_fact_checking(
    text,
    article_title="Thay xăng bằng nước lã và rác thải?",
    source_url="https://baochinhphu.vn/thay-xang-bang-nuoc-la-va-rac-thai.htm",
    source_name="Báo Điện tử Chính phủ",
)

print(f"=== TOTAL CLAIMS EXTRACTED: {len(claims)} ===")
for i, c in enumerate(claims):
    print(f"\n[Luận điểm #{i+1}]")
    print(f"  Claim Text: {c['claim_text']}")
    print(f"  Type: {c.get('claim_type')}")
    print(f"  Verdict: {c['verdict']}")
    print(f"  Evidence: {c.get('evidence_quote')[:140]}...")
    print(f"  Reasoning: {c.get('decisive_reasoning')[:140]}...")

# Assertions
for c in claims:
    ct_low = c["claim_text"].lower()
    assert "chính phủ nước cộng hòa" not in ct_low, f"Masthead extracted: {ct_low}"
    assert "báo điện tử chính phủ" not in ct_low, f"Masthead extracted: {ct_low}"
    assert "trụ sở" not in ct_low, f"Address extracted: {ct_low}"
    assert "bản quyền" not in ct_low, f"Copyright extracted: {ct_low}"
    # Must be related to the title topic
    assert any(term in ct_low for term in ["xăng", "nước lã", "rác thải", "động cơ", "nhiên liệu", "năng lượng", "h2o"]), f"Unrelated claim: {ct_low}"

print("\n>>> ALL RELEVANCE AND BOILERPLATE ASSERTIONS PASSED PERFECTLY! <<<")
