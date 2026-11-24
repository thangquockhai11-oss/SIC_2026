# BÁO CÁO TOÀN DIỆN AUDIT DỰ ÁN VÀ DATASET HUẤN LUYỆN
## DỰ ÁN TRUSTMEDIA AI — HỆ THỐNG KIỂM CHỨNG BÁO CHÍ THỰC NGHIỆM

*Ngày lập báo cáo: 24/11/2026*  
*Người thực hiện: Antigravity AI Engineering Team*  
*Mã hệ thống: `TM-AUDIT-2026.11`*

---

## 1. TỔNG QUAN HIỆN TRẠNG & KIẾN TRÚC DỰ ÁN

Hệ thống **TrustMedia AI** được phát triển nhằm phân tích, bóc tách và đối chứng thông tin báo chí đa chiều theo chuẩn IFCN (International Fact-Checking Network).

### 1.1. Cấu trúc mã nguồn
- **Backend (`backend/`):**
  - **Framework:** FastAPI (Python 3.12.10, Uvicorn, Pydantic v2).
  - **Database:** PostgreSQL / pgvector (`psycopg3`, `SQLAlchemy 2.1.8`, `alembic`), SQLite fallback (`trustmedia.db`).
  - **Dịch vụ AI & RAG (`backend/app/services/`):**
    - `fact_checking_agent.py`: Trích xuất claim, neo mỏ tiêu đề bài báo, hybrid retrieval (BM25 + TF-IDF/Vector), lọc chủ đề và NLI verification.
    - `media_credibility_agent.py`: Đánh giá uy tín nguồn xuất bản theo chuẩn COPE và IFCN.
    - `public_opinion_agent.py`: Đo lường thái độ và lập trường dư luận độc lập với fact-check.
    - `public_trust_agent.py`: Đánh giá niềm tin xã hội học dựa trên khung khảo sát WVS Wave 7.
    - `information_reception_agent.py`: Đo lường mức độ tiếp nhận và kháng cự nhận thức.
    - `meta_agent.py`: Tổng hợp đồng thuận đa tác tử (Multi-Agent Consensus Synthesis).
    - `gemini_nlp_service.py`: Tích hợp Google Gemini (`google-genai` SDK) cho trích xuất sâu và tổng hợp luận cứ khi có API key, kết hợp động cơ heuristic NLP nội bộ khi offline.
    - `url_extractor.py`: Thu thập bài báo từ URL với cơ chế SSRF-protection và lọc triệt để rác chân trang (boilerplate/footer).
- **Frontend (`frontend/`):**
  - **Framework:** React 19, TypeScript, Vite 8, TailwindCSS.
  - **Giao diện:** Đã chuẩn hóa hiển thị đầy đủ tỷ lệ % đối soát, khuyến nghị tin cậy rõ ràng (*"CHƯA NÊN VỘI TIN"*, *"NÊN TIN CẬY"*, *"KHÔNG NÊN TIN CẬY"*), bảo đảm Luận điểm #01 là Tiêu đề bài báo và các luận điểm tiếp theo bám sát chủ đề tiêu đề.
- **Machine Learning & Pipeline (`ml/` & `scripts/`):**
  - `ml/dataset_loaders/claim_loader.py`: Nạp và chuẩn hóa dữ liệu phân loại 9 nhóm claim.
  - `ml/models/claim_classifier.py`: Pipeline phân loại 9 loại phát ngôn (TF-IDF đa từ/ký tự + 12 đặc trưng ngôn ngữ + Calibrated Classifier). Checkpoint hiện hành: `ml/checkpoints/claim_classifier/model.joblib`.
  - `ml/models/nli_verifier.py`: Pipeline kiểm chứng NLI 3 nhãn (ENTAILMENT, CONTRADICTION, NEUTRAL) với phân tích số liệu, mốc thời gian, độ phủ từ vựng và mâu thuẫn từ phủ định. Checkpoint hiện hành: `ml/checkpoints/nli_verifier/model.joblib`.
  - `ml/models/evidence_aggregator.py`: Tổng hợp và hợp nhất đa nguồn chứng cứ.
  - `ml/models/citation_validator.py`: Thẩm tra tính chính xác và nguồn gốc của trích dẫn.

---

## 2. PHẦN CỨNG & MÔI TRƯỜNG THỰC TẾ

| Thành phần | Thông số thực tế | Đánh giá & Ràng buộc huấn luyện |
| :--- | :--- | :--- |
| **Hệ điều hành** | Windows 11 Home Single Language 64-bit | Môi trường PowerShell / cmd, đường dẫn tập tin Windows |
| **CPU** | **13th Gen Intel(R) Core(TM) i5-13500H** (12 nhân vật lý, 16 luồng logic) | Rất mạnh cho xử lý song song, CPU-bound machine learning và feature engineering |
| **RAM** | **16.0 GB** (~16.4 GB tổng, khả dụng ~2.3 GB - 5.0 GB tùy tải) | Đủ để huấn luyện các mô hình Machine Learning / Calibrated Ensembles, Vectorizer n-gram lớn. Cần kiểm soát batch size và tránh tải mô hình LLM 7B+ vào RAM |
| **GPU / VRAM** | `nvidia-smi not available` (Không có GPU NVIDIA rời / Không hỗ trợ CUDA) | **Ràng buộc quan trọng:** Không khả dụng CUDA/GPU để huấn luyện full weights Deep Transformer (như fine-tuning PhoBERT/XLM-R từ đầu). **Giải pháp tối ưu:** Huấn luyện mô hình Hybrid Calibrated Ensembles hiệu năng cao kết hợp trích xuất đặc trưng ngôn ngữ và ngữ nghĩa chuyên sâu, hoặc tối ưu hóa lightweight fine-tuning trên CPU |
| **Dung lượng ổ đĩa** | Ổ D: **121.7 GB trống** (Không gian làm việc `D:\HOC\SIC`) | Dư dả để lưu trữ dataset, checkpoints, cache và artifacts |
| **Python Version** | Python 3.12.10 (AMD64) | Tương thích cao với scikit-learn 1.9.1, pandas 3.1.1, pyarrow 26.0.1, datasets 5.2.0 |

---

## 3. AUDIT VÀ THỐNG KÊ TOÀN BỘ DATASET HIỆN CÓ

Hệ thống lưu trữ tổng cộng **1.5 GB dữ liệu thô và bán cấu trúc** tại thư mục `datasets/`. Dưới đây là kết quả thống kê định lượng chi tiết:

### 3.1. ViFactCheck (Vietnamese Fact-Checking Benchmark — AAAI-2025 Standard)
- **Đường dẫn:** `datasets/raw/vifactcheck/data/`
- **Định dạng:** Apache Parquet (`.parquet`), bảng nén cột hiệu năng cao.
- **Tổng số mẫu:** **7,232 mẫu đối chứng song ngữ/tiếng Việt thực tế**.
- **Cấu trúc tập chia (Splits):**
  - **Train:** 5,062 mẫu (`train-00000-of-00001.parquet`, 7.70 MB)
    - Nhãn 0 (*SUPPORTED / ENTAILMENT*): 1,751 mẫu (34.6%)
    - Nhãn 1 (*REFUTED / CONTRADICTION*): 1,658 mẫu (32.8%)
    - Nhãn 2 (*NEI / NEUTRAL*): 1,653 mẫu (32.6%)
    - **Độ cân bằng nhãn:** Hoàn hảo (~1:1:1), không bị mất cân bằng lớp (class imbalance).
  - **Dev (Validation):** 723 mẫu (`dev-00000-of-00001.parquet`, 1.17 MB)
    - SUPPORTED: 256 | REFUTED: 244 | NEI: 223.
  - **Test:** 1,447 mẫu (`test-00000-of-00001.parquet`, 2.37 MB)
    - SUPPORTED: 508 | NEI: 471 | REFUTED: 468.
- **Schema:**
  - `Statement`: Chuỗi văn bản phát ngôn cần kiểm chứng (Độ dài TB: 161.4 ký tự).
  - `Evidence`: Đoạn văn bằng chứng xác thực hoặc phản bác (Độ dài TB: 196.8 ký tự).
  - `Context`: Bối cảnh bài báo mở rộng chứa phát ngôn.
  - `labels`: Nhãn phân loại thực chứng [0, 1, 2].
  - `Topic`, `Author`, `Url`, `annotation_id`: Siêu dữ liệu xuất xứ (Provenance).
- **Chất lượng dữ liệu & Rò rỉ (Leakage Audit):**
  - Tỷ lệ thiếu dữ liệu (Null Evidence): 0.0%.
  - Trùng lặp phát ngôn (Duplicates): Chỉ 2 mẫu trên tập Train, 0 mẫu trên tập Dev và Test.
  - Các phát ngôn độc lập hoàn toàn giữa Train và Test theo `annotation_id`.

### 3.2. FEVER (Fact Extraction and VERification Benchmark)
- **Đường dẫn:** `datasets/raw/fever/`
- **Định dạng:** JSON Lines (`.jsonl`).
- **Tổng số mẫu:** **175,446 mẫu**.
  - `train.jsonl` (31.49 MB): 145,449 mẫu (SUPPORTS: 80,035, REFUTES: 29,775, NOT ENOUGH INFO: 35,639).
  - `shared_task_dev.jsonl` (4.15 MB): 19,998 mẫu (6,666 mẫu/nhãn, cân bằng hoàn hảo).
  - `paper_dev.jsonl` (2.07 MB): 9,999 mẫu (3,333 mẫu/nhãn).
- **Mục đích sử dụng:** Cung cấp tri thức kiểm chứng tổng quát và chuẩn đối sánh quốc tế cho module NLI và Retrieval.

### 3.3. X-FACT (Multilingual Fact-Checking Dataset)
- **Đường dẫn:** `datasets/raw/xfact/`
- **Định dạng:** CSV (`.csv`), gồm 57 tập tin, tổng dung lượng 121.42 MB.
- **Tổng số mẫu:** Hơn 31,000 phát ngôn đa ngôn ngữ từ các trang kiểm chứng sự thật độc lập (PolitiFact, Snopes, Chequeado, v.v.).
- **Schema:** `claim`, `claimant`, `claimDate`, `reviewDate`, `label`, `evidence_1..5`, `link_1..5`.
- **Nhãn:** `true`, `mostly true`, `partly true/misleading`, `mostly false`, `false`, `complicated`, `other`.

### 3.4. UIT-VSFC & UIT-VSMEC (Ý kiến & Cảm xúc Tiếng Việt)
- **Đường dẫn:** `datasets/raw/uit_vsfc/` và `datasets/raw/uit_vsmec/`
- **Định dạng:** CSV (`.csv`), tổng dung lượng 1.93 MB.
- **Quy mô:**
  - UIT-VSFC: 15,833 mẫu phát ngôn đánh giá, chia làm `positive` (8,024), `negative` (6,989), `neutral` (820).
  - UIT-VSMEC: 6,927 mẫu phân loại 7 sắc thái cảm xúc xã hội (`Sadness`, `Surprise`, `Disgust`, `Fear`, `Anger`, `Other`, `Enjoyment`).
- **Mục đích sử dụng:** Huấn luyện bộ lọc phân định giữa phát ngôn thực chứng có thể kiểm chứng (`FACTUAL_CLAIM`, `SCIENTIFIC_CLAIM`) và nhận định chủ quan (`OPINION`, `PREDICTION`).

### 3.5. World Values Survey (WVS) Wave 7 (Khảo sát Niềm tin Công chúng)
- **Đường dẫn:** `datasets/raw/wvs/`
- **Định dạng:** Apache Parquet (`wvs_train.parquet`: 374.93 MB, `wvs_test.parquet`: 11.51 MB).
- **Quy mô:** **439,608 phản hồi khảo sát đại diện nhân khẩu học**.
- **Mục đích sử dụng:** Cung cấp dữ liệu thực chứng cho `PublicTrustAgent` đánh giá niềm tin xã hội học theo tiêu chuẩn quốc tế.

### 3.6. Kho ngữ liệu Bách khoa toàn thư Wikipedia Tiếng Việt (ViWiki Corpus)
- **Đường dẫn:** `datasets/processed/fact_checking/viwiki_corpus.jsonl`
- **Quy mô:** 3,850 bài viết bách khoa chuẩn hóa (2.11 MB) được lập chỉ mục trực tiếp cho BM25 và Vector Retriever.

---

## 4. XÁC ĐỊNH CÁC TÁC VỤ AI (AI TASKS) PHÙ HỢP

Dựa trên cấu trúc dataset thực tế và năng lực phần cứng CPU 12-core, hệ thống xác định 4 tác vụ AI cốt lõi:

| STT | Tác vụ AI | Dataset sử dụng | Mục tiêu mô hình | Độ tương thích phần cứng |
| :---: | :--- | :--- | :--- | :--- |
| **Task A** | **Claim Classification (Phân loại 9 nhóm phát ngôn)** | ViFactCheck + UIT-VSFC + Kho mẫu phân tầng | Phân loại chính xác 9 nhóm: `FACTUAL`, `STATISTICAL`, `HISTORICAL`, `SCIENTIFIC`, `QUOTATION`, `CAUSAL`, `OPINION`, `PREDICTION`, `NOT_CHECKABLE` | Hoàn toàn khả thi trên CPU (thời gian huấn luyện < 30s) |
| **Task B** | **Evidence Verification / NLI (Kiểm chứng suy luận NLI 3 nhãn)** | ViFactCheck (7,232 cặp chuẩn) | Phân loại quan hệ `(Claim, Evidence)` thành `ENTAILMENT` (Supported), `CONTRADICTION` (Refuted), `NEUTRAL` (Not Enough Information) | Hoàn toàn khả thi trên CPU với Calibrated Ensemble (thời gian huấn luyện < 60s) |
| **Task C** | **Evidence Retrieval (Truy xuất chứng cứ Hybrid RAG)** | ViFactCheck + ViWiki + FEVER | Kết hợp BM25 Okapi từ vựng và Vector Cosine Similarity với Reciprocal Rank Fusion (RRF) | Độ trễ truy xuất < 45ms trên CPU |
| **Task D** | **Evidence Reranking (Xếp hạng & Khai phá Hard Negatives)** | Cặp thực chứng ViFactCheck + 8 kịch bản Hard Negatives | Xếp hạng chứng cứ liên quan cao hơn các đoạn văn gây nhiễu cùng thực thể nhưng sai mốc thời gian/số liệu | Đạt độ chính xác xếp hạng nDCG@3 cao |

---

## 5. LỰA CHỌN MÔ HÌNH VÀ CHIẾN LƯỢC HUẤN LUYỆN

### 5.1. Ràng buộc phần cứng và quyết định kiến trúc
Do môi trường không có GPU NVIDIA CUDA khả dụng:
1. **Không sử dụng:** Huấn luyện Full Deep Transformer 100M+ tham số từ scratch trên CPU (vì thời gian mỗi epoch có thể mất hàng giờ, gây tràn RAM và nghẽn tiến trình).
2. **Kiến trúc tối ưu được chọn:**
   - **Đặc trưng ngôn ngữ & Ngữ nghĩa cao cấp (Feature Engineering):**
     - Bộ vector hóa đa từ và ký tự (Word $1-3$ gram, Char $2-5$ gram) với `sublinear_tf=True`.
     - 12 chỉ báo ngôn ngữ chuyên sâu (Linguistic Signals): số liệu, tỷ lệ phần trăm, đơn vị tiền tệ, mốc lịch sử quá khứ, mốc dự báo tương lai, trích dẫn trực tiếp, liên từ nhân quả, từ khóa khoa học/y sinh, từ khóa nhận định chủ quan.
     - Kiểm toán tính nhất quán số học (Numerical Parity Audit), đối soát mốc thời gian (Temporal Anchor Matching) và độ lệch cực tính từ phủ định (Negation Dissonance).
   - **Bộ phân loại Calibrated Ensemble:**
     - Mô hình phân loại tuyến tính hiệu năng cao (`LinearSVC` kết hợp `CalibratedClassifierCV` hoặc `LogisticRegression`) xuất xác suất hậu nghiệm (Posterior Probabilities) được hiệu chuẩn chuẩn xác.
     - Khả năng suy luận siêu tốc (< 1.5ms mỗi phát ngôn trên CPU), tiêu thụ RAM < 150MB, hoàn toàn không gây nghẽn tài nguyên.

---

## 6. KẾ HOẠCH TRIỂN KHAI THEO CÁC PHASE TIẾP THEO

1. **Phase 3 — Data Preparation:** Tạo pipeline tiền xử lý chuẩn hóa, bảo lưu 100% số liệu và thực thể, tạo split manifest không rò rỉ.
2. **Phase 5 — Establish Baselines:** Thiết lập baseline ban đầu (Majority class, Simple TF-IDF) để so sánh định lượng.
3. **Phase 7 & 9 — Actual Training & Hyperparameter Tuning:** Thực hiện huấn luyện thực tế, tối ưu tham số $C$, $n$-grams, class weights trên tập Train và kiểm tra trên tập Validation.
4. **Phase 8 & 12 — Evaluation & Benchmark:** Đánh giá trên tập Test độc lập (Accuracy, Macro-F1, Confusion Matrix, Per-class metrics, Latency).
5. **Phase 10 & 11 — Model Registry & Integration:** Lưu trữ checkpoint phiên bản mới vào `ml/checkpoints/` và tích hợp trực tiếp vào `fact_checking_agent.py` và `model_manager.py`.
6. **Phase 13 — Final Report:** Lập báo cáo tổng kết thực nghiệm hoàn chỉnh tại `docs/TRUSTMEDIA_AI_TRAINING_REPORT.md`.
