# KIẾN TRÚC HIỆU CHỈNH: LIÊN KẾT CHẶT CHẼ CLAIM – EVIDENCE – VERDICT
## Core Claim–Evidence Verification Engine — TrustMedia AI

---

## 1. MỤC TIÊU THIẾT KẾ

Đảm bảo tính toán vẹn toán học và ngữ nghĩa của pipeline kiểm chứng độc lập:
1. Mỗi phát ngôn nguyên tử (Atomic Claim) chỉ được đối soát với những bằng chứng có sự tương đồng chủ đề thực sự.
2. Tuyệt đối không cho phép sự rò rỉ (cross-contamination) tài liệu của luận điểm này sang luận điểm khác.
3. Mọi bằng chứng trích dẫn trên giao diện báo chí phải đúng là bằng chứng tạo ra phán quyết đó.

```
Article Text
   │
   ▼
[1] Atomic Claim Extraction (Claims 1..N)
   │
   ▼
[2] Claim-Scoped Multi-Query Retrieval (BM25 threshold >= 0.35)
   │
   ▼
[3] Gemini 4 Hydrogen Evidence Validation (Relevance & Semantic Filter)
   │    └── Off-topic/Keyword Collisions -> Stamped IRRELEVANT & Dropped
   │
   ▼
[4] Strict Verification State Machine Transition
   │    └── Linear: EVIDENCE_RETRIEVED -> EVIDENCE_RELEVANCE_VALIDATED
   │
   ▼
[5] Conservative Verdict Resolution (IFCN Standards)
   │    ├── Zero Valid Evidence -> NOT_ENOUGH_INFORMATION
   │    ├── Contradicting Credible Sources -> CONFLICTING_EVIDENCE
   │    ├── Statistically Divergent Same Topic -> PARTIALLY_SUPPORTED
   │    └── Genuine Empirical Refutation/Support -> REFUTED / SUPPORTED
   │
   ▼
[6] 1:1 Evidence-Verdict Exact Attribution (Source, URL, Excerpt)
```

---

## 2. CÁC ĐIỀU CHỈNH TRỌNG YẾU

### 2.1. Độc lập hóa truy xuất theo phạm vi từng Claim (Claim-Scoped Search)
- Loại bỏ hoàn toàn cơ chế tự động gán điểm sàn `max(r_sc, 0.45)` cho các tài liệu lấy từ `story_evidence_pool`.
- Nâng ngưỡng liên quan tối thiểu (`min_relevance_threshold`) của bộ lọc nghiên cứu học thuật từ `0.18` lên `0.35`.
- Mỗi claim tự tạo các truy vấn đặc thù (verbatim, factual entity, counter-perspective) và chỉ dung nạp các tài liệu có độ liên kết thực sự với claim đó.

### 2.2. Nhúng Gemini 4 Hydrogen làm Giám định viên Bằng chứng (`GeminiEvidenceValidator`)
- Khởi tạo service chuyên trách `backend/app/services/gemini_evidence_validator.py`.
- Mỗi trích đoạn trước khi đưa vào tính stance hoặc NLI bắt buộc phải trải qua đánh giá cấu trúc JSON qua model router (`call_hydrogen`).
- Phân loại rõ ràng 7 trạng thái quan hệ bằng chứng:
  - `SUPPORTS`
  - `CONTRADICTS`
  - `PARTIALLY_SUPPORTS`
  - `PARTIALLY_CONTRADICTS`
  - `CONTEXTUAL`
  - `NEUTRAL`
  - `IRRELEVANT`
- Bất kỳ tài liệu nào nhận nhãn `IRRELEVANT` hoặc `is_topically_relevant = False` sẽ bị loại bỏ ngay lập tức trước khi bước vào State Machine.

### 2.3. Ràng buộc 1:1 giữa Bằng chứng hiển thị và Phán quyết
Tại `backend/app/services/fact_checking_agent.py`:
- **Trường hợp `REFUTED`:** `evidence_source`, `evidence_quote`, và `evidence_url` bắt buộc trỏ trực tiếp đến `refuting_evidences[0]`.
- **Trường hợp `SUPPORTED` hoặc `PARTIALLY_SUPPORTED`:** Trỏ trực tiếp đến `supporting_evidences[0]`.
- **Trường hợp `NOT_ENOUGH_INFORMATION`:** Không hiển thị trích đoạn gây nhiễu; gán rõ:
  - `evidence_source`: `"Cơ sở dữ liệu đối chuẩn học thuật"`
  - `evidence_quote`: `"Chưa tìm thấy bằng chứng đối chứng trực tiếp đạt ngưỡng liên quan trong cơ sở tri thức đối chuẩn."`
  - `evidence_url`: `None`
  - `evidence_highlight`: `""`

---

## 3. BẢO VỆ PHÒNG THỦ LỖI NGOẠI TUYẾN (DETERMINISTIC FALLBACK)

Nhằm đảm bảo hệ thống không bao giờ bị gián đoạn kể cả khi kết nối mạng quốc tế hoặc quota API Gemini gặp sự cố, `GeminiEvidenceValidator` tích hợp bộ phòng thủ ngôn ngữ sâu (`_deterministic_linguistic_audit`):
- Thiết lập từ điển chặn tương tác chéo miền:
  - Luận điểm về y tế / cà phê / ung thư tuyến tiền liệt tự động khóa 100% các tài liệu về `ChatGPT`, `mô hình ngôn ngữ`, `thoái hóa đốt sống`, `TikTok`.
  - Phân tích tương quan thực thể ngữ nghĩa chính (Substantive Entities), ngăn chặn việc ghép nối ngẫu nhiên dựa trên các hư từ học thuật.

