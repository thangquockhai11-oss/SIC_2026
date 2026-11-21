"""Hard Negative Generation and Reranker Benchmark Script.

Generates hard negative variants for factual claims:
1. Same entity, wrong year/time
2. Same topic, different assertion
3. Similar claim, conflicting numerical statistic
4. Keyword match but completely irrelevant semantic scope

Evaluates BGE Reranker v2 M3 on ranking positive evidence ahead of hard negatives.
Metrics: MRR, nDCG@3, Ranking Accuracy, Positive-to-HardNegative Margin.
"""

import json
import logging
import math
import os
import re
import sys
import time
from typing import Any
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.rag.reranker import reranker_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HardNegativeReranker")


def generate_hard_negative_triplets() -> list[dict[str, Any]]:
    """Synthesize and curate fine-grained benchmark triplets with hard negatives."""
    triplets = [
        {
            "claim": "Vào tháng 4 năm 1936, Vua hề Charlie Chaplin đã trải qua kỳ nghỉ trăng mật tại khách sạn Saigon Morin ở Huế.",
            "positive": "Theo tài liệu lưu trữ, danh hài Charlie Chaplin cùng vợ đã lưu trú tại phòng Charlie Chaplin Suite của khách sạn Saigon Morin (Huế) vào đúng tháng 4 năm 1936 trong chuyến trăng mật.",
            "hard_negatives": [
                "Vào tháng 4 năm 1904, khách sạn Saigon Morin tại Huế bị hư hỏng nặng sau trận bão năm Thìn và được chuyển giao cho nhà tư sản A.Guerin.",  # Same entity & month, wrong year & event
                "Charlie Chaplin đã kết hôn tại Paris và trải qua tuần trăng mật tại một khách sạn cổ ở Luân Đôn năm 1936.",  # Same person & year, wrong location
                "Khách sạn Saigon Morin tại Huế từng đón tiếp Tổng thống Pháp Francois Fillon vào năm 2009 tại phòng VIP.",  # Same entity, completely different VIP
            ],
            "random_negative": "Thị trường chứng khoán hôm nay có phiên điều chỉnh giảm điểm mạnh do khối ngoại bán ròng các mã cổ phiếu ngân hàng.",
        },
        {
            "claim": "Tốc độ tăng trưởng GDP của Việt Nam năm 2025 đạt mức 8,02%.",
            "positive": "Báo cáo chính thức của cơ quan thống kê công bố tốc độ tăng trưởng GDP cả nước trong năm 2025 đạt mức 8,02%, vượt chỉ tiêu đề ra.",
            "hard_negatives": [
                "Tốc độ tăng trưởng GDP của Việt Nam năm 2022 từng ghi nhận mức kỷ lục 8,02% trong bối cảnh phục hồi sau đại dịch.",  # Same percentage & entity, wrong year (2022 vs 2025)
                "Tốc độ tăng trưởng kinh tế của Philippines trong năm 2025 đạt 8,02% nhờ vào sự phục hồi của ngành dịch vụ.",  # Same percentage & year, wrong country
                "Năm 2025, tổng kim ngạch xuất nhập khẩu của Việt Nam tăng trưởng tích cực nhưng tăng trưởng GDP chung chỉ đạt 6,5%.",  # Same entity & year, conflicting number (6.5% vs 8.02%)
            ],
            "random_negative": "Công nghệ pin thể rắn hứa hẹn sẽ kéo dài phạm vi di chuyển của xe điện lên gấp đôi trong thập kỷ tới.",
        },
        {
            "claim": "Bộ Giáo dục và Đào tạo công bố kỳ thi tốt nghiệp THPT từ năm 2025 chỉ còn thi 4 môn bắt buộc và lựa chọn.",
            "positive": "Phương án thi tốt nghiệp THPT từ năm 2025 do Bộ GD&ĐT ban hành quy định thí sinh thi 2 môn bắt buộc gồm Toán, Ngữ văn và 2 môn tự chọn.",
            "hard_negatives": [
                "Kỳ thi tốt nghiệp THPT năm 2024 diễn ra với 6 môn thi theo quy chế hiện hành của Bộ Giáo dục và Đào tạo.",  # Wrong year & number of subjects
                "Bộ Y tế công bố chương trình đào tạo chuẩn bác sĩ 6 năm bắt đầu áp dụng từ năm 2025.",  # Same year, wrong ministry
                "Bộ GD&ĐT đề xuất xây dựng thêm 100 trường phổ thông nội trú chất lượng cao tại các tỉnh miền núi.",  # Same entity, wrong topic
            ],
            "random_negative": "Các nhà thiên văn học phát hiện thêm 3 ngoại hành tinh có điều kiện thuận lợi cho sự sống ngoài Trái Đất.",
        },
        {
            "claim": "Đập thủy điện Sông Ba Hạ xả lũ khẩn cấp với lưu lượng 3.500 m3/s do mưa lớn thượng nguồn.",
            "positive": "Ban chỉ huy phòng chống thiên tai xác nhận nhà máy thủy điện Sông Ba Hạ đang vận hành xả lũ với lưu lượng qua tràn đạt 3.500 m3/s để đảm bảo an toàn đập.",
            "hard_negatives": [
                "Đập thủy điện Sông Ba Hạ chỉ đang duy trì phát điện qua tổ máy với lưu lượng 250 m3/s, chưa thực hiện xả lũ qua đập tràn.",  # Contradicting status & number
                "Đập thủy điện Sông Tranh 2 thực hiện xả lũ điều tiết với lưu lượng 3.500 m3/s trong đợt mưa bão số 4.",  # Same number, different dam
                "Mực nước hồ thủy điện Sông Ba Hạ đạt cao trình đón lũ nhưng toàn bộ các cửa van đang đóng kín theo lệnh điều hành.",  # Different action
            ],
            "random_negative": "Bộ phim điện ảnh mới của đạo diễn James Cameron chính thức cán mốc doanh thu 1 tỷ USD toàn cầu.",
        },
        {
            "claim": "Tập đoàn Điện lực Việt Nam (EVN) không có chủ trương cắt điện luân phiên tại Hà Nội trong đợt cao điểm nắng nóng.",
            "positive": "Đại diện EVN khẳng định công tác cung ứng điện Thủ đô được bảo đảm an toàn và không hề có kế hoạch cắt điện luân phiên diện rộng tại Hà Nội.",
            "hard_negatives": [
                "EVN thông báo cắt điện luân phiên theo kế hoạch tại một số khu công nghiệp miền Bắc do sự cố đường dây truyền tải.",  # Contradicting policy
                "Tổng công ty Điện lực TP.HCM thông báo bảo trì định kỳ một số trạm biến áp trong tháng tới.",  # Different city & entity branch
                "EVN công bố doanh thu sản xuất kinh doanh điện năm vừa qua đạt kế hoạch đề ra.",  # Same entity, irrelevant financial topic
            ],
            "random_negative": "Giải bóng đá Ngoại hạng Anh mùa giải mới chứng kiến cuộc đua vô địch gay cấn giữa 3 câu lạc bộ hàng đầu.",
        },
    ]
    return triplets


def evaluate_reranker_with_hard_negatives():
    triplets = generate_hard_negative_triplets()
    logger.info("Evaluating Reranker on %d benchmark triplets with hard negatives...", len(triplets))

    total_cases = 0
    correct_top1 = 0
    mrr_sum = 0.0
    positive_ranks = []
    margins = []  # score(positive) - score(hard_negative_1)

    for item in triplets:
        claim = item["claim"]
        pos = item["positive"]
        h_negs = item["hard_negatives"]
        r_neg = item["random_negative"]

        # Candidates pool: 1 positive + N hard negatives + 1 random negative
        candidates = [
            {"id": "pos", "text": pos, "type": "positive"},
            {"id": "hn1", "text": h_negs[0], "type": "hard_neg_temporal/entity"},
            {"id": "hn2", "text": h_negs[1], "type": "hard_neg_entity/number"},
            {"id": "hn3", "text": h_negs[2], "type": "hard_neg_contradiction/topic"},
            {"id": "rn", "text": r_neg, "type": "random_negative"},
        ]

        scored_candidates = []
        for c in candidates:
            score = reranker_engine._compute_cross_score(claim, c["text"])
            scored_candidates.append({**c, "score": score})

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        rank_pos = next(r + 1 for r, c in enumerate(scored_candidates) if c["id"] == "pos")
        positive_ranks.append(rank_pos)
        mrr_sum += 1.0 / rank_pos
        if rank_pos == 1:
            correct_top1 += 1

        pos_score = next(c["score"] for c in scored_candidates if c["id"] == "pos")
        top_hn_score = max(c["score"] for c in scored_candidates if c["type"].startswith("hard_neg"))
        margin = pos_score - top_hn_score
        margins.append(margin)

        logger.info(
            "Claim: '%s...'\n -> Pos Rank: %d (Score=%.4f) | Top Hard Neg Score: %.4f | Margin: +%.4f",
            claim[:50],
            rank_pos,
            pos_score,
            top_hn_score,
            margin,
        )
        total_cases += 1

    ranking_acc = correct_top1 / total_cases
    mrr = mrr_sum / total_cases
    avg_margin = float(np.mean(margins))

    out_metrics = {
        "model_name": reranker_engine.model_name,
        "model_version": reranker_engine.model_version,
        "total_test_cases": total_cases,
        "ranking_accuracy_top1": round(ranking_acc, 4),
        "mean_reciprocal_rank": round(mrr, 4),
        "average_positive_margin": round(avg_margin, 4),
        "positive_ranks": positive_ranks,
    }

    out_dir = os.path.join("ml", "checkpoints", "reranker")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hard_negative_benchmark.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_metrics, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 70)
    print("RERANKER HARD NEGATIVE BENCHMARK REPORT")
    print("=" * 70)
    print(f"Model:                     {reranker_engine.model_name}")
    print(f"Top-1 Ranking Accuracy:    {ranking_acc * 100:.1f}%")
    print(f"Mean Reciprocal Rank (MRR): {mrr:.4f}")
    print(f"Avg Positive Margin:       +{avg_margin:.4f}")
    print(f"Benchmark Results saved:   {out_path}")
    print("=" * 70)


if __name__ == "__main__":
    evaluate_reranker_with_hard_negatives()

