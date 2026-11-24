# GEMINI DUAL-MODEL ROUTING SPECIFICATION
## CHIẾN LƯỢC ĐỊNH TUYẾN CHUYÊN BIỆT GIỮA GEMINI 4 HYDROGEN VÀ GEMINI 4 NEON

> **Mô hình AI:** Gemini 4 Hydrogen (`gemini-4-hydrogen`) & Gemini 4 Neon (`gemini-4-neon`)  
> **Module thực thi:** `backend/app/services/gemini_model_router.py`  
> **Endpoint kiểm tra trạng thái:** `GET /api/v1/health/gemini`

---

## 1. NGUYÊN TẮC PHÂN CÔNG TÁC NHÂN (ROUTING MATRIX)

| Tác vụ (Task Type) | Mô hình đảm nhiệm | Lý do kiến trúc & Ưu tiên |
| :--- | :--- | :--- |
| **Phân tích bài viết & Bóc tách câu** | `gemini-4-hydrogen` | Tốc độ cao, tối ưu phân tích cấu trúc cú pháp văn bản. |
| **Trích xuất phát ngôn (Claim Extraction)** | `gemini-4-hydrogen` | Lập chỉ mục 11+ thuộc tính định lượng với độ chính xác cao. |
| **Bảo vệ tính trung thực (Article Fidelity)** | `gemini-4-hydrogen` | Phát hiện 8 dạng bóp méo ngữ nghĩa so với câu gốc trong bài báo. |
| **Lập kế hoạch truy vấn (Query Planning)** | `gemini-4-hydrogen` | Sinh truy vấn kép (khẳng định & phản chứng) cho tìm kiếm. |
| **Truy xuất căn chuẩn (Dataset RAG)** | `gemini-4-hydrogen` | Phân tích mẫu căn chuẩn từ ViFactCheck, X-FACT, FEVER. |
| **Đối soát ban đầu (Initial Verification)** | `gemini-4-hydrogen` | Kiểm tra sơ bộ 15 chiều thuộc tính với tài liệu bằng chứng. |
| **Xử lý bằng chứng mâu thuẫn (`has_conflicts=True`)** | `gemini-4-neon` | Suy luận phản biện chuyên sâu khi các nguồn tin độc lập đối đầu. |
| **Phúc tra ngụy biện nhân quả (`causal_distortion`)** | `gemini-4-neon` | Bóc trần ngụy biện tương quan thành nhân quả (Correlation vs Causation). |
| **Phúc tra độ tin cậy thấp (`confidence < 0.75`)** | `gemini-4-neon` | Thẩm định lại các trường hợp ranh giới ngữ nghĩa mơ hồ. |
| **Phúc tra sai lệch số liệu & thời gian** | `gemini-4-neon` | Kiểm toán logic các ca mâu thuẫn định lượng phức tạp. |

---

## 2. ĐIỀU KIỆN KÍCH HOẠT GEMINI 4 NEON (DECISION LOGIC)

Mô hình `gemini-4-neon` không được gọi một cách lãng phí cho các tác vụ thường quy. Nó chỉ được kích hoạt khi hàm `should_invoke_neon(...)` trả về `True` dựa trên 4 điều kiện khắt khe:

```python
def should_invoke_neon(
    task_type: GeminiTaskType | str | None = None,
    confidence: float = 1.0,
    has_conflicts: bool = False,
    causal_distortion_risk: bool = False,
    numerical_discrepancy: bool = False,
    temporal_discrepancy: bool = False,
) -> bool:
    # 1. Tác vụ đặc thù được chỉ định trực tiếp cho Neon
    if task_type in NEON_TASKS:
        return True
    
    # 2. Điểm tin cậy sơ bộ của Hydrogen dưới ngưỡng an toàn
    if confidence < 0.75:
        return True
        
    # 3. Xuất hiện mâu thuẫn giữa các cơ quan báo chí độc lập
    if has_conflicts:
        return True
        
    # 4. Nguy cơ ngụy biện tương quan / bóp méo nhân quả
    if causal_distortion_risk:
        return True
        
    # 5. Phát hiện sai lệch số liệu hoặc mốc thời gian
    if numerical_discrepancy or temporal_discrepancy:
        return True

    return False
```

---

## 3. CƠ CHẾ DỰ PHÒNG CẤU TRÚC ĐỊNH HÌNH (DETERMINISTIC FALLBACK)

Khi hệ thống chạy trong môi trường offline, CI/CD, hoặc khi `GEMINI_API_KEY` chưa được cấp phát, hệ thống tự động kích hoạt `OFFLINE_STRUCTURED`:
- Thực thi ma trận kiểm chứng 15 chiều bằng thuật toán regex và luật suy diễn tất định (Deterministic Logic).
- Đảm bảo 100% các trường dữ liệu tuân thủ schema Pydantic, không xảy ra ngoại lệ Null hoặc sập tiến trình.
- Cung cấp lý giải phản biện chi tiết, đầy đủ căn cứ khoa học.
