# DATASET-GROUNDED RAG DESIGN & PROVENANCE SPECIFICATION
## THIẾT KẾ DATASET RAG THUẦN TỪ ĐIỂN & TRUY NGUYÊN NGUỒN GỐC HỌC THUẬT

> **Module thực thi:** `backend/app/services/dataset_rag_service.py`  
> **Kho dữ liệu chuẩn:** `ViFactCheck`, `ViWiki`, `X-FACT`, `FEVER`  
> **Chính sách công nghệ:** Sử dụng 100% thuật toán lập chỉ mục từ vựng (BM25Okapi + TF-IDF), **TUYỆT ĐỐI KHÔNG SỬ DỤNG BẤT KỲ MÔ HÌNH VECTOR EMBEDDING BÊN THỨ BA NÀO (No BGE, No Sentence Transformers, No PhoBERT)**.

---

## 1. NGUYÊN LÝ HOẠT ĐỘNG VÀ VAI TRÒ CỦA DATASET RAG

Trong **TrustMedia AI**, Dataset RAG **KHÔNG PHẢI LÀ NƠI TRÍCH XUẤT BẰNG CHỨNG THỰC TẾ CHO BÀI BÁO MỚI**.
Nhiệm vụ duy nhất của Dataset RAG là cung cấp **Mẫu đối chuẩn căn chuẩn phân loại (Few-shot Taxonomy Calibration Examples)** để mô hình `gemini-4-hydrogen` và `gemini-4-neon`:
1. Hiểu cách gán nhãn chuẩn học thuật (`SUPPORTED`, `REFUTED`, `NOT_ENOUGH_INFORMATION`).
2. Nhận biết các ranh giới suy luận ngụy biện tinh vi trong các bộ benchmark uy tín.
3. Đồng bộ hóa tiêu chuẩn đánh giá theo chuẩn IFCN.

---

## 2. QUY CHUẨN TRUY NGUYÊN NGUỒN GỐC (PROVENANCE METADATA)

Mỗi bản ghi được truy xuất qua BM25 đều gắn kèm metadata chứng thực nguồn gốc:
```json
{
  "dataset_id": "ViFactCheck",
  "dataset_version": "v1.0",
  "sample_id": "vifactcheck_4591",
  "claim_text": "Phát ngôn mẫu kiểm nghiệm",
  "evidence_text": "Đoạn trích đối chứng học thuật",
  "label": "SUPPORTED",
  "retrieval_score": 0.8924,
  "retrieved_timestamp": "2026-11-24T14:40:00Z",
  "source_name": "Cơ quan báo chí chính thống"
}
```

---

## 3. KHUYẾN CÁO VÀ CHẾ TÀI BẮT BUỘC TRONG PROMPT CONTEXT

Để ngăn chặn triệt để hiện tượng mô hình AI nhầm lẫn giữa dữ liệu lịch sử và sự kiện thời sự mới, prompt được chèn cảnh báo cô lập:

```markdown
### [HƯỚNG DẪN CĂN CHUẨN ĐỊNH LƯỢNG TỪ KHO DATASET HỌC THUẬT (DATASET RAG)]
QUY TẮC BẮT BUỘC: Các mẫu dưới đây trích xuất từ ViFactCheck / X-FACT / FEVER / ViWiki chỉ dùng để 
học cách phân loại quan hệ (SUPPORTED / REFUTED / NOT_ENOUGH_INFORMATION) và tiêu chuẩn đối chuẩn ngữ nghĩa.
TUYỆT ĐỐI KHÔNG sử dụng các đoạn trích này làm bằng chứng thực tế cho phát ngôn mới nếu không cùng thực thể và sự kiện.
```
