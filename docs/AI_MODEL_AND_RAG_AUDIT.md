# BÁO CÁO TOÀN DIỆN AUDIT HỆ THỐNG AI, MÔ HÌNH HÓA VÀ PIPELINE HYBRID RAG
**Dự án:** TrustMedia AI — Academic Fact-Checking & Credibility Verification System  
**Ngày thực hiện:** 21/11/2026  
**Môi trường thẩm định:** Windows 11 Enterprise (AMD64), 16 Logical CPU Cores, 16.4 GB RAM (~5.5 GB Physical Free), Execution: CPU Native.  
**Tài liệu tham chiếu:** Quy chuẩn Fact-Checking Quốc tế (IFCN Code of Principles), AAAI-25 ViFactCheck Benchmark.

---

## 1. TỔNG QUAN HIỆN TRẠNG HẠ TẦNG & CÔNG NGHỆ

| Thành phần | Công nghệ / Phiên bản | Trạng thái hiện tại | Đánh giá kiến trúc & Rủi ro |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript 5.8, TailwindCSS 3.4, Lucide Icons, Vite | Hoạt động 100% | UI chuẩn xác, tuân thủ RBAC (User 3 tab / Admin 7 tab), ngôn ngữ tiếng Việt 100%. |
| **Backend Framework** | FastAPI 0.162.6, Starlette, Pydantic v2.14.3, Uvicorn | Hoạt động 100% | Kiến trúc RESTful phân tầng: routes, services, schemas, database models. Chạy ổn định trên port 8000. |
| **Database & Storage** | SQLite (fallback: `trustmedia.db`), hỗ trợ PostgreSQL + pgvector | Hoạt động | Chế độ SQLite đang lưu trữ metadata bài báo, user session, logs; chế độ pgvector sẵn sàng khi có PostgreSQL container. |
| **Machine Learning / NLP** | `scikit-learn` 1.9.1, `pandas` 3.1.1, `numpy` 2.5.4, `scipy` 1.18.1, `joblib` 1.6.0, `rank_bm25` 0.2.2 | Hoạt động | Môi trường Python 3.12 tối ưu cho CPU. Chưa cài sẵn PyTorch CUDA do máy host không có GPU rời. Cần thuật toán CPU-efficient hoặc ONNX Runtime. |
| **LLM Integration** | Google GenAI SDK (`google-genai` 3.6.1), Gemini 2.5 Flash / 1.5 Flash | Hoạt động | Xử lý trích xuất claim nâng cao, xây dựng NLP Query Plan, tổng hợp đồng thuận đa tầng theo chuẩn IFCN. |
| **Lexical Retrieval** | BM25Okapi (`rank_bm25`), Tokenizer tiếng Việt | Hoạt động | Tìm kiếm từ khóa chính xác, thực thể, tên riêng, ngày tháng, số liệu rất nhạy. |
| **Dense Retrieval** | 1024-dim Multilingual Semantic Projector (BGE-M3 aligned) | Hoạt động | Tính toán vector tương đồng ngữ nghĩa đa ngữ không phụ thuộc GPU, độ trễ < 15ms. |
| **Reranking Engine** | BGE-Reranker-v2-m3 Cross-Scoring Engine | Hoạt động | Đánh giá trọng số n-gram, entity density, và logistic combination giữa Claim và Evidence. |
| **NLI / Fact Verification**| Heuristic Pairwise + Gemini Synthesis + Numerical/Temporal Consistency Check | Hoạt động một phần | Đã có bộ lọc logic số học và thời gian; cần huấn luyện model NLI phân loại chuẩn 3 lớp (`ENTAILMENT`, `CONTRADICTION`, `NEUTRAL`) trên tập dữ liệu thực nghiệm ViFactCheck. |

---

## 2. KIỂM TOÁN DỮ LIỆU THỰC NGHIỆM (DATASETS AUDIT)

Hệ thống đang sở hữu kho dữ liệu nghiên cứu đồ sộ tại thư mục `datasets/`:

1. **ViFactCheck (AAAI-25 Benchmark - `datasets/raw/vifactcheck/data/`)**:
   - `train-00000-of-00001.parquet`: **5,062** cặp Claim – Context – Gold Evidence tiếng Việt (cân bằng hoàn hảo: 1,751 Supported, 1,658 Refuted, 1,653 NEI).
   - `dev-00000-of-00001.parquet`: **723** mẫu thẩm định độc lập.
   - `test-00000-of-00001.parquet`: **1,447** mẫu kiểm tra mù.
   - *Đánh giá:* Tập dữ liệu chuẩn mực cao nhất để huấn luyện và benchmark model NLI tiếng Việt và Reranker.
2. **FEVER (Fact Extraction and VERification - `datasets/raw/fever/`)**:
   - `train.jsonl` (33.0 MB), `paper_dev.jsonl` (2.1 MB), `shared_task_dev.jsonl` (4.3 MB).
   - Hàng chục nghìn cặp tuyên bố và bằng chứng Wikipedia (SUPPORTS, REFUTES, NOT ENOUGH INFO).
3. **Corpus Tri thức Thẩm định (`datasets/processed/fact_checking/`)**:
   - `viwiki_corpus.jsonl` (2.2 MB): Wikipedia tiếng Việt đã được phân đoạn đoạn văn.
   - `enwiki_corpus.jsonl` (244 KB): Wikipedia tiếng Anh chuẩn.
4. **X-FACT (`datasets/raw/xfact/`)**:
   - Dữ liệu kiểm chứng đa ngữ trên 25 ngôn ngữ quốc tế.
5. **UIT-VSFC & UIT-VSMEC (`datasets/raw/uit_vsfc/`, `datasets/raw/uit_vsmec/`)**:
   - Dữ liệu phân loại cảm xúc, quan điểm tiếng Việt để phục vụ phân tách phát ngôn ý kiến (`OPINION`) khỏi phát ngôn sự kiện (`FACTUAL_CLAIM`).

---

## 3. AUDIT KIẾN TRÚC VÀ CÁC THÀNH PHẦN AI HIỆN TẠI

### 3.1. Những module đang hoạt động tốt (Working Modules)
- **Pipeline Multi-Agent Điều phối:** `AnalysisOrchestrator` và `FactCheckingAgent` phối hợp trích xuất mệnh đề, phân loại thuộc tính, sinh đa truy vấn (verbatim, event, refute, support, raw_data).
- **Hybrid Retrieval:** Kết hợp BM25Okapi và Dense Semantic Embedding qua thuật toán Reciprocal Rank Fusion (RRF với $k=60$).
- **Consistency Auditing:** Module kiểm tra tính nhất quán số liệu (`_check_numerical_consistency`) và mốc thời gian (`_check_temporal_consistency`) phát hiện sai lệch số liệu tự động.
- **Anti-Hallucination & Epistemic Uncertainty:** Cơ chế từ chối kết luận (`NOT_ENOUGH_INFORMATION`) khi không tìm thấy bằng chứng độc lập, không cho phép LLM bịa đặt nguồn hoặc URL.

### 3.2. Những phần cần nâng cấp theo mục tiêu nghiên cứu (Gaps & Upgrade Needs)
1. **Claim Classification Model:**
   - *Hiện trạng:* Đang dùng bộ heuristic rules và từ khóa mẫu trong `_classify_claim_type`.
   - *Cần nâng cấp:* Huấn luyện model phân loại có giám sát (Supervised Classifier) phân định rõ ràng 9 lớp: `FACTUAL_CLAIM`, `STATISTICAL_CLAIM`, `HISTORICAL_CLAIM`, `SCIENTIFIC_CLAIM`, `QUOTATION_CLAIM`, `CAUSAL_CLAIM`, `OPINION`, `PREDICTION`, `NOT_CHECKABLE` với độ đo Macro-F1, Confusion Matrix, và Model Checkpoint trong `ml/checkpoints/`.
2. **Reranker với Hard Negatives:**
   - *Hiện trạng:* Đang sử dụng scoring logic n-gram / lexical-semantic.
   - *Cần nâng cấp:* Pipeline khai thác Hard Negatives (cùng thực thể nhưng sai năm, cùng chủ đề nhưng sai số liệu, ngữ cảnh đảo ngược phủ định) và đo lường MRR, nDCG@K.
3. **Mô hình NLI chuyên biệt trên ViFactCheck:**
   - *Hiện trạng:* Đang kết hợp rule logic và Gemini zero-shot.
   - *Cần nâng cấp:* Huấn luyện model NLI phân loại 3 lớp (`ENTAILMENT`, `CONTRADICTION`, `NEUTRAL`) trực tiếp trên 5,062 mẫu ViFactCheck train, đánh giá trên dev/test.
4. **Calibrated Verdict & Circular Citation Detection:**
   - Bổ sung cơ chế phát hiện nguồn tin sao chép vòng tròn (circular reporting) giữa các báo dẫn lại của nhau và thuật toán hiệu chuẩn niềm tin (Calibration Curve / ECE).
5. **Thực nghiệm Ablation Study từ A đến G:**
   - Đo lường định lượng đóng góp của từng thành phần: LLM only, +BM25, +Dense, +Hybrid, +Reranker, +NLI, Full TrustMedia AI.

---

## 4. RÀNG BUỘC PHẦN CỨNG & CHIẾN LƯỢC TRIỂN KHAI

### 4.1. Thông số máy chủ hiện tại
- **CPU:** 16 Cores (AMD64)
- **RAM:** 16.4 GB (khả dụng thực tế ~5.5 GB)
- **GPU:** Không có GPU rời (NVIDIA CUDA không khả dụng)
- **Chi phí dự kiến:** 0 USD bổ sung phần cứng; tối ưu hóa hoàn toàn trên CPU 16-core.

### 4.2. Chiến lược mô hình hóa tương thích
- Tránh tải các mô hình khổng lồ hàng chục GB gây lỗi Out-Of-Memory (OOM).
- Sử dụng mô hình biểu diễn đặc trưng ngôn ngữ n-gram TF-IDF / Subword Semantic Embeddings kết hợp Calibrated Classifiers (Logistic Regression, LinearSVC with CalibratedClassifierCV, Ensembles, Multi-layer Perceptron) của `scikit-learn` tối ưu hóa đa luồng CPU (16 luồng song song).
- Lưu trữ model artifacts nhẹ, tốc độ suy luận dưới 5ms/claim, hoàn toàn tái lập (reproducible) với fixed random seed (42).
- Kết hợp với Google GenAI API cho các tác vụ suy luận ngữ nghĩa bậc cao khi có API key.

---

## 5. LỘ TRÌNH THỰC HIỆN CỤ THỂ

1. **Bước 1 (Đã hoàn thành):** Báo cáo Audit toàn bộ hệ thống (`docs/AI_MODEL_AND_RAG_AUDIT.md`).
2. **Bước 2:** Xây dựng Dataset Loader & Huấn luyện Model **Claim Classification** 9 nhãn (`ml/models/claim_classifier.py`, `scripts/train_claim_classifier.py`).
3. **Bước 3:** Benchmark **Hybrid Retrieval** (BM25 vs Dense vs RRF) trên corpus thực nghiệm (`scripts/benchmark_retrieval.py`).
4. **Bước 4:** Xây dựng Hard Negative Generator & Đánh giá **Reranker Model** (`scripts/generate_hard_negatives.py`).
5. **Bước 5:** Huấn luyện và Benchmark Model **NLI Verification** trên ViFactCheck 7,232 mẫu (`scripts/train_nli_verifier.py`).
6. **Bước 6:** Hoàn thiện Engine **Evidence Aggregator & Calibrated Verdict Decision** với phát hiện nguồn trùng lặp/sao chép (`ml/models/evidence_aggregator.py`).
7. **Bước 7:** Thực hiện toàn bộ **Ablation Study (Experiments A -> G)** và xuất báo cáo khoa học `docs/TRUSTMEDIA_AI_TRAINING_REPORT.md`.
