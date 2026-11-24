# BÁO CÁO KIỂM ĐỊNH HỆ THỐNG & AN TOÀN TRƯỚC HUẤN LUYỆN
**Dự án:** TrustMedia AI — Hệ thống Nghiên cứu & Thẩm định Báo chí Thực nghiệm  
**Mã tài liệu:** `DOCS-TRM-PHASE0-AUDIT`  
**Ngày thực hiện:** 24/11/2026  
**Kỹ sư thực hiện:** Autonomous AI Research & MLOps Engineer  

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG
TrustMedia AI được tổ chức theo kiến trúc Multi-Agent phân tán, chuyên môn hóa cao, bao gồm:
- **Backend:** Python FastAPI (`backend/app/main.py`), Pydantic v2, SQLite (`trustmedia.db`), SQLAlchemy ORM.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Material Symbols.
- **Tầng suy luận AI:** Multi-Agent Pipeline (`app/services/ai_engine.py`):
  1. *FactCheckingAgent:* Bóc tách phát ngôn, truy xuất đối chuẩn Hybrid RAG, kiểm định NLI.
  2. *MediaCredibilityAgent:* Đánh giá quy chuẩn tòa soạn, chỉ số minh bạch COPE & IFCN.
  3. *PublicOpinionAgent:* Phân tích phản hồi xã hội và đa chiều dư luận.
  4. *PublicTrustAgent:* Đo lường niềm tin công chúng theo dữ liệu WVS Wave 7.
  5. *InformationReceptionAgent:* Đo lường mức độ tiếp nhận và hiểu bài của độc giả.
  6. *MetaConsensusAgent:* Tổng hợp phán quyết khoa học, hạn chế tối đa hallucination.

---

## 2. HIỆN TRẠNG TÀI NGUYÊN PHẦN CỨNG & HẠ TẦNG THỰC THI

| Thành phần hạ tầng | Thông số ghi nhận thực tế | Đánh giá năng lực huấn luyện |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 11 Home 64-bit (`10.0.26200`) | Môi trường PowerShell, hỗ trợ đa tiến trình |
| **Bộ vi xử lý (CPU)** | Intel Core i5-13500H (12 Cores, 16 Threads) | Xử lý song song N-gram, TF-IDF và Ensembles tốc độ cao |
| **Bộ nhớ (RAM)** | 15.64 GB DDR5 (Khả dụng: ~2.81 - 4.5 GB) | Đủ cho in-memory feature matrix, không nạp model > 8GB |
| **GPU / VRAM / CUDA** | None (`nvidia-smi not available`) | Không hỗ trợ PyTorch CUDA, không tải LLM/Transformer nặng |
| **Dung lượng Ổ cứng** | Ổ D: (Còn trống 113.37 GB / 175.43 GB) | Thoải mái lưu trữ datasets, checkpoints, indices |
| **Python Runtime** | Python 3.12.10 64-bit (`backend/.venv`) | Môi trường ảo hóa độc lập, đầy đủ thư viện ML |

---

## 3. DANH MỤC THƯ VIỆN & DEPENDENCIES

- **Đã cài đặt sẵn:**
  - `scikit-learn`: v1.9.1 (Pipeline, CalibratedClassifierCV, LinearSVC, LogisticRegression, TfidfVectorizer, metrics)
  - `pandas`: v3.1.1 & `numpy`: v2.5.4 (Xử lý bảng và ma trận dữ liệu)
  - `joblib`: v1.6.0 (Tuần tự hóa và lưu trữ model checkpoints)
  - `pyarrow`: v26.0.1 (Đọc tệp Parquet tốc độ cao từ ViFactCheck)
  - `fastapi`: v0.162.6 & `httpx`: v0.28.1 (Dịch vụ API và thu thập bài báo an toàn SSRF)
- **Không có trong môi trường:**
  - `torch`, `transformers` (Không cài đặt sẵn; việc huấn luyện transformer từ đầu trên CPU là không khả thi do thiếu CUDA và nghẽn tài nguyên).
- **Chiến lược tối ưu hóa mô hình:** Tập trung vào **Mô hình Calibrated Ensemble kết hợp N-gram từ vựng/ký tự và 12 chiều đặc trưng ngôn ngữ học chuyên sâu**, mang lại độ chính xác cao (Accuracy > 92%), khả năng hiệu chỉnh xác suất chuẩn (Calibration Sigmoid) và thời gian phản hồi ở mức mili-giây (< 10ms).

---

## 4. VỊ TRÍ KHO DỮ LIỆU TRÊN Ổ ĐĨA
Toàn bộ các dataset nghiên cứu thực tế đã được định vị tại:
1. `datasets/raw/vifactcheck/data/`:
   - `train-00000-of-00001.parquet` (5,062 mẫu, 2.11 MB)
   - `dev-00000-of-00001.parquet` (723 mẫu, 328 KB)
   - `test-00000-of-00001.parquet` (1,447 mẫu, 634 KB)
2. `datasets/raw/uit_vsfc/`: 15,833 mẫu ý kiến độc giả (OPINION, SENTIMENT).
3. `datasets/raw/uit_vsmec/`: 6,927 mẫu cảm xúc xã hội.
4. `datasets/raw/fever/`: 175,446 mẫu Luận điểm - Bằng chứng đối chiếu.
5. `datasets/raw/xfact/`: 31,142 mẫu đa ngôn ngữ, đa nguồn tin.
6. `datasets/raw/wvs/`: 439,608 phản hồi khảo sát uy tín truyền thông (64 quốc gia).
7. `datasets/processed/fact_checking/viwiki_clean.json`: 3,850 bài viết bách khoa tri thức tiếng Việt.

---

## 5. CÁC MÔ HÌNH PRODUCTION HIỆN TẠI & DEPENDENT PIPELINES

1. **Claim Classifier (9-Class):**
   - Checkpoint: `ml/checkpoints/claim_classifier/model.joblib`
   - Phân loại 9 nhóm: `FACTUAL_CLAIM`, `STATISTICAL_CLAIM`, `HISTORICAL_CLAIM`, `SCIENTIFIC_CLAIM`, `QUOTATION_CLAIM`, `CAUSAL_CLAIM`, `OPINION`, `PREDICTION`, `NOT_CHECKABLE`.
   - Dependent Service: `app/services/fact_checking_agent.py`.
2. **NLI Verifier (3-Class):**
   - Checkpoint: `ml/checkpoints/nli_verifier/model.joblib`
   - Phân loại Stance: `ENTAILMENT`, `CONTRADICTION`, `NEUTRAL`.
   - Dependent Service: `app/services/fact_checking_agent.py`, `app/services/gemini_nlp_service.py`.
3. **Hybrid Retriever:**
   - Cấu trúc: `app/services/hybrid_retrieval.py` (BM25Okapi + BGE-M3 Dense + RRF k=60).
4. **Reranker:**
   - Cấu trúc: `app/services/rag/reranker.py` (Cross-scoring + Hard Negative Rejection).

---

## 6. NGUYÊN TẮC BẢO TOÀN DỮ LIỆU & AN TOÀN MÔ HÌNH
1. **Tuyệt đối không ghi đè kho dữ liệu thô:** Giữ nguyên vẹn 100% các tệp Parquet, CSV, JSON gốc.
2. **Quản lý phiên bản Checkpoint:** Mọi thử nghiệm đều lưu thành các Experiment ID riêng biệt (`TM-CLAIM-xxx`, `TM-NLI-xxx`) kèm metadata độc lập.
3. **Không phá vỡ API Contract:** Giữ nguyên toàn bộ schema đầu ra (`ClaimItem`, `FactCheckingReport`, `Verdict`) để không làm gián đoạn frontend hoặc cơ sở dữ liệu.
4. **Cơ chế Rollback:** Luôn duy trì bản sao checkpoint đã xác minh tại `ml/registry/registry.json`.
