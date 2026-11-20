"""NLP Clause Extractor and Proposition Segmenter.

Preserves:
1. Negations ('không', 'chưa', 'bác bỏ', 'phủ nhận', etc.)
2. Numbers and quantitative metrics ('15 đơn vị', '500 tỷ', '30%')
3. Time expressions ('ngày 15/4', 'năm 2026', 'vừa qua')
4. Modal scope ('đang đề xuất / dự thảo' vs 'đã ban hành / có hiệu lực')
"""

import re
from typing import Any
import uuid


PROPOSAL_MARKERS = [
    "đề xuất", "dự thảo", "kiến nghị", "góp ý", "thí điểm", "nghiên cứu",
    "dự kiến", "phương án", "xin ý kiến", "bàn thảo", "kế hoạch", "đang xem xét",
    "thảo luận", "chưa thông qua", "chưa ban hành", "proposed", "proposal", "draft",
]

ENACTED_MARKERS = [
    "đã ban hành", "đã ký", "chính thức có hiệu lực", "đã quyết định",
    "đã thông qua", "áp dụng chính thức", "bắt buộc thực hiện", "đã có hiệu lực",
    "chính thức ban hành", "ban hành quyết định", "enacted", "adopted", "promulgated",
]

NEGATION_MARKERS = [
    "không", "chưa", "chẳng", "không hề", "không có chuyện", "bác bỏ",
    "phủ nhận", "vô căn cứ", "bịa đặt", "sai sự thật", "chưa từng", "không đúng",
    "hoàn toàn không", "phản bác",
]

SUBJECTIVE_MARKERS = [
    "tôi nghĩ", "theo quan điểm của tôi", "cảm thấy", "thật tuyệt vời", "ước gì",
    "dở tệ", "in my opinion", "i feel", "i hope", "personally", "theo tôi",
]

MASTHEAD_AND_BOILERPLATE_PATTERNS = [
    # Government & official mastheads
    r"^cổng thông tin điện tử",
    r"^báo điện tử",
    r"^thông cáo báo chí",
    r"cơ quan chủ quản\s*:",
    r"văn phòng chính phủ",
    r"giấy phép số\s*:",
    r"tổng biên tập\s*:",
    r"phó tổng biên tập\s*:",
    r"ban biên tập\s*:",
    r"tòa soạn\s*:",
    r"địa chỉ\s*:",
    r"điện thoại\s*:",
    r"đường dây nóng\s*:",
    r"hotline\s*:",
    r"email\s*:",
    # Navigation / menus / breadcrumbs
    r"trang chủ\s*[>/»|]",
    r"^[>/»|]\s*thời sự",
    r"^(trang chủ|thời sự|chính trị|kinh tế|xã hội|thế giới|pháp luật|văn hóa|thể thao|giải trí|khoa học|công nghệ|giáo dục|sức khỏe|bạn đọc|media|video|podcast|ảnh)$",
    # Related stories / widgets
    r"^(xem thêm|tin liên quan|bài viết liên quan|đọc thêm|cùng chuyên mục|tin nổi bật|có thể bạn quan tâm|tin cùng tác giả|tin cùng sự kiện)\s*:",
    # Copyright & footers
    r"^bản quyền thuộc",
    r"^©\s*copyright",
    r"cấm sao chép dưới mọi hình thức",
    r"toàn quyền sở hữu",
    r"ghi rõ nguồn.*khi phát hành lại",
    # Bylines / standalone credits
    r"^(theo|ảnh|nguồn)\s*:\s*[a-zA-Z0-9\s]+$",
    r"^\(ttxvn\)$",
]

CONJUNCTION_SPLITTERS = [
    r";",
    r"\s+-\s+",
    r",\s*(?:nhưng|tuy nhiên|song|trong khi|đồng thời|mặc dù|ngược lại|thay vì|mặt khác)\s+",
]


def clean_text(text: str) -> str:
    """Normalize whitespace and invisible chars."""
    cleaned = re.sub(r"[\r\t\f\v]+", " ", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def extract_numbers(text: str) -> list[str]:
    """Extract quantitative expressions and numerical metrics."""
    matches = re.findall(
        r"\b\d+(?:[.,]\d+)?(?:\s*(?:%|triệu|tỷ|nghìn|đơn vị|cơ quan|người|hộ|km|m3|lít|kg|tấn|đồng|usd)\b|%)?",
        text,
        re.IGNORECASE,
    )
    return [m.strip() for m in matches if m.strip()]


def extract_time_markers(text: str) -> list[str]:
    """Extract temporal markers and calendar references."""
    matches = re.findall(
        r"\b(?:ngày\s+\d{1,2}(?:/\d{1,2}(?:/\d{2,4})?)?|tháng\s+\d{1,2}|năm\s+\d{4}|hôm nay|hôm qua|vừa qua|sáng nay|chiều nay|giai đoạn\s+\d{4}(?:-\d{4})?|quý\s+[1-4])\b",
        text,
        re.IGNORECASE,
    )
    return [m.strip() for m in matches if m.strip()]


def detect_modal_scope(text: str) -> str:
    """Detect whether a statement represents a proposal/draft or an enacted decision."""
    t_lower = text.lower()
    has_enacted = any(m in t_lower for m in ENACTED_MARKERS)
    has_proposal = any(m in t_lower for m in PROPOSAL_MARKERS)

    if has_enacted and not has_proposal:
        return "ENACTED"
    if has_proposal:
        return "PROPOSAL"
    return "GENERAL_FACT"


def has_negation_marker(text: str) -> bool:
    """Check if the text contains explicit negation keywords."""
    t_lower = text.lower()
    return any(re.search(r"\b" + re.escape(neg) + r"\b", t_lower) for neg in NEGATION_MARKERS)


def is_subjective_statement(text: str) -> bool:
    """Check if the sentence is an opinion or subjective sentiment."""
    t_lower = text.lower().strip()
    if t_lower.endswith("?") or any(q in t_lower for q in ["worth it", "có nên", "thế nào", "liệu rằng"]):
        return True
    return any(subj in t_lower for subj in SUBJECTIVE_MARKERS)


def is_boilerplate_or_masthead(text: str) -> bool:
    """Check if the text represents a masthead, navigation menu, footer, copyright, or boilerplate."""
    if not text or not text.strip():
        return True
    t_clean = text.strip()
    t_lower = t_clean.lower()

    # Direct keyword matches
    masthead_indicators = [
        "cổng thông tin điện tử",
        "cơ quan chủ quản",
        "văn phòng chính phủ",
        "giấy phép số",
        "tổng biên tập",
        "phó tổng biên tập",
        "ban biên tập",
        "tòa soạn",
        "đường dây nóng",
        "bản quyền thuộc",
        "cấm sao chép dưới mọi hình thức",
        "toàn quyền sở hữu",
        "ghi rõ nguồn",
        "xem thêm:",
        "tin liên quan:",
        "bài viết liên quan:",
        "đọc thêm:",
        "tin cùng sự kiện:",
        "tin cùng chuyên mục:",
        "có thể bạn quan tâm:",
        "trang chủ >",
        "thời sự >",
        "chia sẻ bài viết",
        "gửi ý kiến",
        "bình luận",
        "liên hệ quảng cáo",
        "hotline:",
    ]
    if any(ind in t_lower for ind in masthead_indicators):
        return True

    for pattern in MASTHEAD_AND_BOILERPLATE_PATTERNS:
        if re.search(pattern, t_lower):
            return True

    # Standalone navigation breadcrumbs (e.g. "Trang chủ > Thời sự > Chính trị")
    if ">" in t_clean and any(k in t_lower for k in ["trang chủ", "thời sự", "tin tức", "chính trị"]):
        return True

    # Very short header/nav tags
    if len(t_clean.split()) <= 3 and any(nav in t_lower for nav in [
        "trang chủ", "thời sự", "chính trị", "kinh tế", "xã hội",
        "thế giới", "pháp luật", "văn hóa", "thể thao", "giải trí"
    ]):
        return True

    return False


def segment_sentences(text: str) -> list[str]:
    """Split text into sentences while preserving sentence boundaries."""
    cleaned = clean_text(text)
    # Split on sentence terminals followed by whitespace
    raw_sentences = re.split(r"(?<=[.!?\n])\s+", cleaned)
    return [s.strip() for s in raw_sentences if len(s.strip()) >= 15]


def extract_checkable_clauses(
    text: str,
    paragraphs: list[str] | None = None,
    max_clauses: int = 5,
) -> list[dict[str, Any]]:
    """Segment Vietnamese text into distinct factual clauses/propositions.

    Preserves:
    - paragraph_id (1-based index of source body paragraph)
    - original_sentence (the full source sentence)
    - claim_text (the extracted clause proposition)
    - negation, numbers, time markers, and modal scope
    Excludes:
    - Publisher masthead, government agency headers
    - Navigation breadcrumbs, menu bars
    - Footers, licenses, editor credits, copyright
    - Related story widgets
    """
    if paragraphs is None:
        # Split text into paragraphs by double newlines or single newlines
        raw_paras = [p.strip() for p in re.split(r"\n\s*\n|\r\n\s*\r\n", text) if p.strip()]
        if not raw_paras and text.strip():
            raw_paras = [p.strip() for p in text.splitlines() if p.strip()]
        candidate_paragraphs = raw_paras
    else:
        candidate_paragraphs = [p.strip() for p in paragraphs if p.strip()]

    # Filter out boilerplate, mastheads, navigation menus and footers
    valid_paragraphs: list[tuple[int, str]] = []
    p_counter = 1
    for p in candidate_paragraphs:
        if is_boilerplate_or_masthead(p):
            continue
        valid_paragraphs.append((p_counter, p))
        p_counter += 1

    clauses: list[dict[str, Any]] = []

    for p_idx, paragraph in valid_paragraphs:
        cleaned_p = clean_text(paragraph)
        raw_sentences = re.split(r"(?<=[.!?])\s+", cleaned_p)
        sentences = [s.strip() for s in raw_sentences if len(s.strip()) >= 15]

        for sentence in sentences:
            if is_boilerplate_or_masthead(sentence) or is_subjective_statement(sentence):
                continue

            # Try splitting into sub-clauses on coordinating conjunctions
            sub_clauses = [sentence]
            for pattern in CONJUNCTION_SPLITTERS:
                new_sub = []
                for sc in sub_clauses:
                    parts = re.split(pattern, sc, flags=re.IGNORECASE)
                    for p in parts:
                        p_clean = p.strip()
                        if len(p_clean) >= 20 and len(p_clean.split()) >= 4:
                            new_sub.append(p_clean)
                        elif new_sub:
                            new_sub[-1] = f"{new_sub[-1]}, {p_clean}"
                        else:
                            new_sub.append(p_clean)
                sub_clauses = new_sub

            for clause_text in sub_clauses:
                clause_clean = clause_text.strip(" ,.-;")
                if len(clause_clean) < 18 or len(clause_clean.split()) < 4:
                    continue
                if is_boilerplate_or_masthead(clause_clean):
                    continue

                scope = detect_modal_scope(clause_clean)
                negation = has_negation_marker(clause_clean)
                nums = extract_numbers(clause_clean)
                times = extract_time_markers(clause_clean)

                clauses.append({
                    "claim_id": str(uuid.uuid4()),
                    "paragraph_id": p_idx,
                    "claim_text": clause_clean,
                    "original_sentence": sentence,
                    "scope": scope,
                    "has_negation": negation,
                    "numbers": nums,
                    "time_markers": times,
                    "is_checkable": True,
                })
                if len(clauses) >= max_clauses:
                    break

            if len(clauses) >= max_clauses:
                break

        if len(clauses) >= max_clauses:
            break

    # Fallback to the first non-boilerplate sentence if no clauses extracted
    if not clauses and valid_paragraphs:
        for p_idx, p_text in valid_paragraphs:
            p_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_text(p_text)) if len(s.strip()) >= 15]
            for first_s in p_sentences:
                if not is_boilerplate_or_masthead(first_s) and not is_subjective_statement(first_s):
                    clauses.append({
                        "claim_id": str(uuid.uuid4()),
                        "paragraph_id": p_idx,
                        "claim_text": first_s,
                        "original_sentence": first_s,
                        "scope": detect_modal_scope(first_s),
                        "has_negation": has_negation_marker(first_s),
                        "numbers": extract_numbers(first_s),
                        "time_markers": extract_time_markers(first_s),
                        "is_checkable": True,
                    })
                    break
            if clauses:
                break

    return clauses
