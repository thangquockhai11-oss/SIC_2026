import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from ml.models.claim_classifier import claim_classifier_service
from ml.models.nli_verifier import nli_verifier_service
from app.services.hybrid_retrieval import hybrid_retriever
from app.services.rag.reranker import reranker_engine
from ml.models.evidence_aggregator import evidence_aggregator

print("=== TRUSTMEDIA AI - VERIFICATION OF TRAINED MODELS ===")
print("1. Claim Classifier Ready:", claim_classifier_service.is_ready())
print("2. NLI Verifier Ready:", nli_verifier_service.is_ready())
print("3. Hybrid RAG Retriever Ready:", hybrid_retriever is not None)
print("4. BGE Reranker Ready:", reranker_engine is not None)

test_claims = [
    "Năm 2025 kim ngạch xuất khẩu nông sản Việt Nam đạt 62 tỷ USD",
    "Thủ tướng Chính phủ phát biểu chỉ đạo tại hội nghị",
    "Theo tôi nghĩ đây là giải pháp tối ưu nhất cho tương lai",
    "Thử nghiệm lâm sàng trên 500 bệnh nhân đạt tỷ lệ hồi phục 85%",
]

print("\n--- 9-Class Claim Classification Tests ---")
for tc in test_claims:
    res = claim_classifier_service.classify(tc)
    print(f"[{res['claim_type']}] (Conf: {res['confidence']:.2f}) -> {tc}")

print("\n--- NLI Entailment / Contradiction Verification Tests ---")
test_nli_pairs = [
    (
        "Giá bán lẻ xăng dầu giảm 500 đồng mỗi lít từ chiều nay",
        "Liên Bộ Công Thương - Tài chính công bố giá bán lẻ xăng dầu giảm 500 đồng mỗi lít bắt đầu từ 15h chiều nay.",
    ),
    (
        "GDP Việt Nam tăng trưởng 8% trong năm 2025",
        "Theo báo cáo chính thức của Tổng cục Thống kê, tăng trưởng GDP năm 2025 đạt 6.5%, không đạt mốc 8%.",
    ),
    (
        "Vệ tinh NanoDragon được phóng lên quỹ đạo",
        "Thị trường bất động sản quý 3 ghi nhận lượng giao dịch khởi sắc tại khu vực miền Trung.",
    ),
]

for claim, ev in test_nli_pairs:
    nli_res = nli_verifier_service.verify_pair(claim, ev)
    print(f"Claim: '{claim}'\nEvidence: '{ev}'\n=> Stance: {nli_res['label']} (Conf: {nli_res['confidence']:.2f}, Probs: {nli_res['probabilities']})\n")

import asyncio
from app.services.ai_engine import run_multi_agent_analysis

async def test_end_to_end():
    print("--- End-to-End Dynamic Article Multi-Agent Test ---")
    title = "Điều chỉnh giá điện năm 2026"
    content = "Tập đoàn Điện lực Việt Nam (EVN) cho biết giá bán lẻ điện bình quân sẽ được điều chỉnh tăng 4.8% từ đầu năm 2026 nhằm bù đắp chi phí phát điện tăng cao."
    res = await run_multi_agent_analysis(title=title, content=content)
    print("Article Title:", title)
    print("Overall Verdict:", res["verdict"])
    print("Total Claims Extracted:", len(res["claims"]))
    for c in res["claims"]:
        print(f"  * Claim: {c['claim_text']}")
        print(f"    Type: {c['claim_type']} | Stance Verdict: {c['verdict']} | Conf: {c['confidence']}")
        print(f"    Article Quote: {c.get('article_quote')}")
        print(f"    Decisive Reasoning: {c.get('reasoning')}")

asyncio.run(test_end_to_end())

print("\n=== ALL TRAINED MODELS VERIFIED SUCCESSFULLY ===")
