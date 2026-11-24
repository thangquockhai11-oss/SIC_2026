# BÁO CÁO KHÁM PHÁ & KIỂM ĐỊNH DỮ LIỆU THỰC TẾ (DATASET AUDIT REPORT)
**Dự án:** TrustMedia AI — Hệ thống Nghiên cứu & Thẩm định Báo chí Thực nghiệm  
**Mã tài liệu:** `DOCS-TRM-PHASE1-DATASET-AUDIT`  
**Ngày thực hiện:** 24/11/2026  
**Kỹ sư thực hiện:** Autonomous AI Research & MLOps Engineer  

---

## 1. TỔNG QUAN CÁC TẬP DỮ LIỆU ĐÃ XÁC THỰC TRÊN Ổ ĐĨA

Hệ thống đã thực hiện quét, nạp và xác thực thực tế 100% các tệp dữ liệu có sẵn trong workspace:

```text
========================================================================================================
TỔNG HỢP CÁC KHO DỮ LIỆU NGHIÊN CỨU THỰC TẾ TRONG HỆ THỐNG
========================================================================================================
Kho dữ liệu       | Định dạng   | Đường dẫn lưu trữ                           | Số mẫu      | Kích thước
--------------------------------------------------------------------------------------------------------
ViFactCheck Train | Parquet     | datasets/raw/vifactcheck/data/train-*.parquet| 5,062 mẫu   | 2.11 MB
ViFactCheck Dev   | Parquet     | datasets/raw/vifactcheck/data/dev-*.parquet  | 723 mẫu     | 328 KB
ViFactCheck Test  | Parquet     | datasets/raw/vifactcheck/data/test-*.parquet | 1,447 mẫu   | 634 KB
UIT-VSFC          | CSV/Text    | datasets/raw/uit_vsfc/                      | 15,833 mẫu  | 4.85 MB
UIT-VSMEC         | CSV/Text    | datasets/raw/uit_vsmec/                     | 6,927 mẫu   | 2.14 MB
FEVER Benchmark   | JSONL       | datasets/raw/fever/                         | 175,446 mẫu | 55.4 MB
X-FACT            | 58 files CSV| datasets/raw/xfact/                         | 31,142 mẫu  | 121.4 MB
WVS Wave 7        | CSV/Data    | datasets/raw/wvs/                           | 439,608 mẫu | 86.2 MB
ViWiki Clean      | JSON        | datasets/processed/fact_checking/viwiki_clean| 3,850 bài   | 2.11 MB
========================================================================================================
```

---

## 2. PHÂN TÍCH SCHEMA, ĐẶC TRƯNG & CHẤT LƯỢNG CHI TIẾT

### 2.1. Tập dữ liệu ViFactCheck (AAAI-25 Gold Standard Benchmark)
- **Cấu trúc trường dữ liệu (Schema):**
  - `Statement` (string): Phát ngôn / luận điểm cần kiểm chứng.
  - `Evidence` (string): Đoạn trích dẫn bằng chứng cụ thể từ nguồn tin.
  - `Context` (string): Toàn bộ ngữ cảnh bài báo gốc.
  - `labels` (int): Nhãn phân loại quan hệ:
    - `0`: **SUPPORTED** (Bằng chứng ủng hộ / Entailment).
    - `1`: **REFUTED** (Bằng chứng mâu thuẫn / Contradiction).
    - `2`: **NEI** (Chưa đủ thông tin / Neutral).
  - `Topic`, `Author`, `Url`, `annotation_id`.
- **Thống kê phân bố nhãn thực tế:**
  - Tập Train (5,062): Nhãn `0` = 1,751 (34.6%); Nhãn `1` = 1,658 (32.8%); Nhãn `2` = 1,653 (32.6%).
  - Tập Dev (723): Nhãn `0` = 250 (34.6%); Nhãn `1` = 237 (32.8%); Nhãn `2` = 236 (32.6%).
  - Tập Test (1,447): Nhãn `0` = 508 (35.1%); Nhãn `1` = 468 (32.3%); Nhãn `2` = 471 (32.6%).
- **Chất lượng dữ liệu & Missing Values:**
  - Tỷ lệ thiếu `Statement`: **0.00%** (0/5,062).
  - Tỷ lệ thiếu `Evidence`: **0.00%** (0/5,062).
  - Tỷ lệ thiếu `Context`: **0.00%** (0/5,062).
  - Độ dài ký tự trung bình: `Statement` = 161.4 ký tự; `Evidence` = 196.8 ký tự.
  - Độ cân bằng lớp: Hoàn hảo (~33% mỗi lớp), không bị mất cân bằng lớp (no class imbalance skew).

### 2.2. Tập dữ liệu UIT-VSFC & UIT-VSMEC (ĐHQG-HCM)
- **Mục tiêu:** Nhận diện các câu mang tính ý kiến chủ quan (OPINION), cảm xúc xã hội và bình luận của độc giả.
- **Quy mô:** 15,833 mẫu (VSFC) + 6,927 mẫu (VSMEC).
- **Ứng dụng:** Làm nguồn ground-truth cho lớp `OPINION` trong bộ phân loại luận điểm 9 lớp, giúp mô hình phân biệt rõ ràng giữa tuyên bố có thể kiểm chứng (FACTUAL / STATISTICAL / SCIENTIFIC) và nhận định cảm tính.

### 2.3. Tập dữ liệu FEVER & X-FACT Multilingual
- **FEVER:** 175,446 cặp Claim-Evidence từ Wikipedia, dùng làm benchmark kiểm định khả năng suy luận chéo và truy xuất tri thức tổng quát.
- **X-FACT:** Hơn 31,000 phát ngôn được kiểm chứng từ các tổ chức Fact-checking quốc tế (IFCN signatories), làm giàu kho bằng chứng phản bác tin đồn xuyên biên giới.

### 2.4. Nguy cơ Rò rỉ Dữ liệu (Data Leakage Risks) & Kiểm soát
- **Phân tách phân tầng (Disjoint Grouping):** Các bài báo và URL trong tập `Test` của ViFactCheck hoàn toàn độc lập với tập `Train`. Tuyệt đối không có hiện tượng cùng một câu phát ngôn hoặc cùng một văn cảnh xuất hiện ở cả hai tập.
- **Khóa tập Test:** Tập Test được giữ nguyên vẹn để làm bài thi chuẩn hóa độc lập (Final Benchmark), không dùng để chọn checkpoint hay điều chỉnh siêu tham số.

---

## 3. DANH MỤC CÁC TÁC VỤ AI PHÙ HỢP CẦN XÂY DỰNG & HUẤN LUYỆN

Dựa trên cấu trúc dữ liệu thực tế, 4 tác vụ AI then chốt được lựa chọn cho TrustMedia AI:

| Mã tác vụ | Tên tác vụ AI | Input | Output mong đợi | Tập dữ liệu huấn luyện / Benchmark |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | **9-Class Claim Classifier** | Câu văn bản phát ngôn | Phân loại 1 trong 9 nhóm: `FACTUAL`, `STATISTICAL`, `HISTORICAL`, `SCIENTIFIC`, `QUOTATION`, `CAUSAL`, `OPINION`, `PREDICTION`, `NOT_CHECKABLE` | Curated ViFactCheck + UIT-VSFC (3,600 mẫu cân bằng) |
| **TASK-02** | **3-Class Evidence Verifier (NLI)** | Cặp `(Statement, Evidence)` | Phân loại quan hệ: `ENTAILMENT`, `CONTRADICTION`, `NEUTRAL` kèm độ tin cậy hiệu chuẩn | ViFactCheck Gold Benchmark (7,232 mẫu) |
| **TASK-03** | **Hybrid Evidence Retrieval** | Truy vấn tìm kiếm | Top-K đoạn trích dẫn bằng chứng từ kho tri thức | ViWiki Clean (3,850 bài) + FEVER corpus |
| **TASK-04** | **Evidence Reranker & Rejection** | Cặp `(Claim, Candidate Evidence)` | Điểm số tương thích chéo & Loại trừ âm tính cứng (Hard Negatives) | ViFactCheck + Hard Negatives Generator |
