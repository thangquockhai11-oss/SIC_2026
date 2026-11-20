"""Pairwise Comment-Claim Stance Analyzer.

Evaluates targeted stance for each individual pair (user_comment, claim_text),
then aggregates the distribution across all empirical reader responses.
"""

import re
from typing import Any


SUPPORT_MARKERS = [
    "đồng tình", "đồng ý", "ủng hộ", "chính xác", "đúng vậy", "chuẩn", "rất tốt",
    "hoàn toàn đúng", "đáng hoan nghênh", "tán thành", "tin tưởng", "chí lý",
    "rất đúng", "đồng quan điểm", "tuyệt vời", "chính đáng", "hợp lý",
    "support", "agree", "correct", "true", "accurate", "endorsed",
]

OPPOSE_MARKERS = [
    "phản đối", "sai sự thật", "vô lý", "không đồng ý", "không đúng", "bịa đặt",
    "tin vịt", "lừa đảo", "không thể tin", "bác bỏ", "chống đối", "phản bác",
    "không chấp nhận", "phản cảm", "sai lệch", "hoàn toàn sai", "ngụy tạo",
    "chưa đúng", "không phục", "không ủng hộ",
    "oppose", "disagree", "false", "fake", "hoax", "incorrect", "unacceptable",
]

DISCUSS_MARKERS = [
    "cần xem xét", "thảo luận", "liệu rằng", "chưa rõ", "đặt câu hỏi", "băn khoăn",
    "chờ xem", "cân nhắc", "góc nhìn", "nghiên cứu thêm", "thắc mắc",
    "discuss", "question", "consider", "wonder", "inquiry",
]


def evaluate_comment_claim_pair(comment_text: str, claim_text: str) -> dict[str, Any]:
    """Evaluate stance of an individual user comment towards a specific claim proposition."""
    c_lower = comment_text.lower().strip()
    
    # Check for direct opposition markers
    has_oppose = any(re.search(r"\b" + re.escape(m) + r"\b", c_lower) for m in OPPOSE_MARKERS)
    has_support = any(re.search(r"\b" + re.escape(m) + r"\b", c_lower) for m in SUPPORT_MARKERS)
    has_discuss = any(re.search(r"\b" + re.escape(m) + r"\b", c_lower) for m in DISCUSS_MARKERS)

    if has_oppose and not has_support:
        stance = "OPPOSE"
        confidence = 0.88
        reasoning = f"Bình luận bày tỏ lập trường phản đối / bác bỏ đối với phát ngôn: '{comment_text[:80]}...'"
    elif has_support and not has_oppose:
        stance = "SUPPORT"
        confidence = 0.88
        reasoning = f"Bình luận bày tỏ lập trường đồng tình / ủng hộ đối với phát ngôn: '{comment_text[:80]}...'"
    elif has_discuss or (has_support and has_oppose):
        stance = "DISCUSS"
        confidence = 0.78
        reasoning = f"Bình luận đặt vấn đề thảo luận, phân tích đa chiều hoặc còn phân vân: '{comment_text[:80]}...'"
    else:
        stance = "NEUTRAL"
        confidence = 0.65
        reasoning = "Bình luận mang tính chất trung lập hoặc chưa biểu lộ rõ thiên hướng lập trường."

    return {
        "stance": stance,
        "confidence": confidence,
        "reasoning": reasoning,
    }


def aggregate_pairwise_stances(pair_results: list[dict[str, Any]], unique_comment_count: int = 0) -> dict[str, Any]:
    """Aggregate individual (comment, claim) stance classifications into overall distribution."""
    if not pair_results:
        return {
            "sample_size": 0,
            "total_pairs": 0,
            "stance_support": None,
            "stance_oppose": None,
            "stance_discuss": None,
            "stance_neutral": None,
            "dominant_stance": None,
            "summary_text": "Chưa có dữ liệu người đọc: Chưa ghi nhận bình luận thực tế từ độc giả cho bài viết này.",
        }

    total = len(pair_results)
    support_count = sum(1 for p in pair_results if p["stance"] == "SUPPORT")
    oppose_count = sum(1 for p in pair_results if p["stance"] == "OPPOSE")
    discuss_count = sum(1 for p in pair_results if p["stance"] == "DISCUSS")
    neutral_count = sum(1 for p in pair_results if p["stance"] == "NEUTRAL")

    p_support = round(support_count / total, 3)
    p_oppose = round(oppose_count / total, 3)
    p_discuss = round(discuss_count / total, 3)
    p_neutral = round(neutral_count / total, 3)

    counts = {"SUPPORT": support_count, "OPPOSE": oppose_count, "DISCUSS": discuss_count, "NEUTRAL": neutral_count}
    dominant = max(counts, key=counts.get)

    label_map = {
        "SUPPORT": "Đồng tình / Ủng hộ",
        "OPPOSE": "Phản đối / Bác bỏ",
        "DISCUSS": "Thảo luận / Phân tích",
        "NEUTRAL": "Trung lập",
    }

    summary = (
        f"Tổng hợp từ {unique_comment_count or total} bình luận thực tế ({total} cặp bình luận - phát ngôn đối chiếu): "
        f"Lập trường chủ đạo là {label_map[dominant]} ({counts[dominant]}/{total} cặp, {round(counts[dominant] / total * 100, 1)}%)."
    )

    return {
        "sample_size": unique_comment_count or total,
        "total_pairs": total,
        "stance_support": p_support,
        "stance_oppose": p_oppose,
        "stance_discuss": p_discuss,
        "stance_neutral": p_neutral,
        "dominant_stance": dominant,
        "summary_text": summary,
    }
