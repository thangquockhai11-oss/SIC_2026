import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir / "backend"))
sys.path.insert(0, str(root_dir))

from app.services.fact_checking_agent import fact_checking_agent

content = (
    "Một quả trứng gà giả vừa được một cư dân ở tỉnh Sơn Đông, Trung Quốc phát hiện hôm 9/2. "
    "Khi nhìn thấy dấu tích xanh bên cạnh VnExpress là đã hoàn thành."
)
title = "Tìm thấy trứng gà giả ở phía đông Trung Quốc"

claims, trace = fact_checking_agent.execute_fact_checking(content, article_title=title)

print(f"\n=== TOTAL CLAIMS EXTRACTED: {len(claims)} ===")
for i, c in enumerate(claims):
    fid = c.get("article_fidelity", {})
    matrix = c.get("comparison_matrix", [])
    print(f"\n[Claim #{i+1}]")
    print(f"  Text: {c['claim_text']}")
    print(f"  Verdict: {c['verdict']}")
    print(f"  Fidelity: {fid.get('fidelity_status')} (Score: {fid.get('fidelity_score')})")
    print(f"  Comparison Matrix Rows: {len(matrix)}")
    for r in matrix:
        print(f"    - [{r.get('match_status')}] {r.get('attribute')}: {r.get('notes')}")
    print(f"  Evidence: {c.get('evidence_source')} | {c.get('evidence_quote')[:100]}...")

print("\n=== ARTICLE LEVEL REPORT ===")
rep = trace.get("article_level_report", {})
for k, v in rep.items():
    print(f"  {k}: {v}")
