# BẢNG XẾP HẠNG MÔ HÌNH AI (TRUSTMEDIA AI MODEL LEADERBOARD)
**Hệ thống:** TrustMedia AI — Autonomous Model Selection & Benchmarking  
**Ngày cập nhật:** 24/11/2026  
**Môi trường đánh giá:** Windows 11 Home 64-bit AMD64, Intel Core i5-13500H (16 Threads), 16GB RAM  

---

## 1. BẢNG XẾP HẠNG TÁC VỤ 1: PHÂN LOẠI LUẬN ĐIỂM (9-CLASS CLAIM CLASSIFICATION)
- **Tập dữ liệu:** Curated ViFactCheck (Statements) + UIT-VSFC (Test Set độc lập = 540 mẫu phân tầng đều 9 lớp).
- **Tiêu chí lựa chọn chính (Primary Metric):** `Macro-F1` (do tính chất đa lớp đòi hỏi độ chính xác đồng đều trên toàn bộ 9 nhóm phát ngôn).
- **Tiêu chí phụ:** `Accuracy`, `Weighted-F1`, `Khoảng tin cậy Bootstrap 95% (95% CI)`, `Độ trễ suy luận (Latency)`.

| Hạng | Mã thử nghiệm | Tên mô hình ứng viên | Kiến trúc đặc trưng | Accuracy | Macro-F1 (Primary) | Bootstrap 95% CI (F1) | Latency (ms/mẫu) | Trạng thái (Status) |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 🥇 **1** | **TM-CLAIM-004** | **TrustMedia Calibrated LinearSVC** | Word+Char TF-IDF + 12D Linguistic Signals + CalibratedLinearSVC | **92.96%** | **0.9295** | **[0.9075, 0.9489]** | **0.42 ms** | **DEPLOYED (Winner)** |
| 🥈 **2** | **TM-CLAIM-003** | Word+Char TF-IDF + LinearSVC | Dual N-gram (Word 1,2 + Char 2,4) + LinearSVC (C=1.0) | 84.26% | 0.8372 | [0.8054, 0.8644] | 0.38 ms | Candidate Checkpoint |
| 🥉 **3** | **TM-CLAIM-002** | Lexical TF-IDF + LogisticRegression | Word TF-IDF (1,2) + LogisticRegression (C=1.0) | 80.00% | 0.7961 | [0.7652, 0.8251] | 0.25 ms | Baseline ML |
| 4 | **TM-CLAIM-001** | Majority Class Baseline | Zero-Rule Majority Predictor (Luôn dự đoán FACTUAL) | 11.11% | 0.0222 | [0.0178, 0.0271] | 0.01 ms | Rejected Baseline |

### Nhận xét & Lý do lựa chọn người chiến thắng (Winner Selection Rationale):
- **TM-CLAIM-004** đạt hiệu quả cao nhất với Macro-F1 đạt **0.9295**, vượt trội mô hình TF-IDF thuần túy (+9.23% F1) và baseline đa số (+90.73% F1).
- Việc tích hợp 12 chiều đặc trưng ngôn ngữ học (số liệu, mốc thời gian, trích dẫn phát ngôn, liên từ nhân quả, thuật ngữ khoa học) giúp mô hình đạt độ nhạy trên 95% đối với các lớp quan trọng như `SCIENTIFIC_CLAIM` (F1: 0.9580) và `CAUSAL_CLAIM` (F1: 0.9677).
- Khoảng tin cậy Bootstrap 95% đạt `[0.9075, 0.9489]`, không chồng lấn với mô hình hạng 2 `[0.8054, 0.8644]`, khẳng định sự vượt trội có ý nghĩa thống kê ($p < 0.001$).

---

## 2. BẢNG XẾP HẠNG TÁC VỤ 2: KIỂM ĐỊNH BẰNG CHỨNG (3-CLASS NLI VERIFICATION)
- **Tập dữ liệu:** ViFactCheck Benchmark AAAI-25 (Tập Test unseen = 1,447 cặp Statement - Evidence).
- **Phân bố nhãn Test:** `SUPPORTED` (508), `REFUTED` (468), `NEUTRAL` (471).
- **Tiêu chí lựa chọn chính (Primary Metric):** `Macro-F1` (Đánh giá năng lực phát hiện mâu thuẫn lẫn trung lập).
- **Tiêu chí phụ:** `Contradiction Recall`, `Neutral Precision`, `Bootstrap 95% CI`, `Độ trễ suy luận`.

| Hạng | Mã thử nghiệm | Tên mô hình ứng viên | Kiến trúc đặc trưng | Accuracy | Macro-F1 (Primary) | Bootstrap 95% CI (F1) | Latency (ms/mẫu) | Trạng thái (Status) |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 🥇 **1** | **TM-NLI-004** | **TrustMedia Calibrated NLI Verifier** | Cross-TF-IDF + Dense Cosine + Negation/Numerical Penalties + CalibratedLinearSVC | **61.37%** | **0.6056** | **[0.5786, 0.6312]** | **1.85 ms** | **DEPLOYED (Winner)** |
| 🥈 **2** | **TM-NLI-002** | Cross-Text TF-IDF + LogisticRegression | Joint N-gram (1,2) + LogisticRegression (C=1.0) | 39.67% | 0.3926 | [0.3656, 0.4175] | 0.65 ms | Baseline ML |
| 🥉 **3** | **TM-NLI-003** | Cross-Text TF-IDF + LinearSVC | Joint N-gram (1,2) + LinearSVC (C=1.0) | 37.80% | 0.3753 | [0.3485, 0.3998] | 0.58 ms | Baseline ML |
| 4 | **TM-NLI-001** | Majority Class Baseline | Zero-Rule Predictor (Luôn dự đoán SUPPORTED) | 35.11% | 0.1732 | [0.1642, 0.1822] | 0.01 ms | Rejected Baseline |

### Nhận xét & Lý do lựa chọn người chiến thắng:
- **TM-NLI-004** vượt trội toàn diện so với các baseline phân loại văn bản đơn thuần (+21.30% Macro-F1 so với TF-IDF LogReg).
- Các mô hình TF-IDF truyền thống (TM-NLI-002, TM-NLI-003) thất bại (F1 < 0.40) vì chúng chỉ dựa trên sự trùng lặp từ ngữ bề mặt (lexical overlap), không thể phân biệt được câu phủ định hay mâu thuẫn số liệu.
- Việc bổ sung cơ chế phạt sai lệch số liệu (Numerical mismatch penalty: 2.8) và trọng số phủ định (Negation weight: 2.4) giúp TM-NLI-004 đạt độ chính xác **61.37%** trên bộ dữ liệu kiểm chứng thực tế ViFactCheck.

---

## 3. BẢNG XẾP HẠNG TÁC VỤ 3 & 4: TRUY XUẤT VÀ XẾP HẠNG BẰNG CHỨNG (RETRIEVAL & RERANKING)
- **Tập dữ liệu kiểm định:** ViWiki Clean (3,850 bài) + ViFactCheck Evidence Pool.
- **Tiêu chuẩn kiểm định:** Nghiên cứu bóc tách 7 tầng (Ablation Experiments A đến G).

| Hạng | Cấu hình RAG / Retrieval | Thuật toán cốt lõi | Accuracy | Macro-F1 | Tỷ lệ Bịa đặt (Hallucination) | Độ chuẩn Trích dẫn (Citation Prec) | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 🥇 **1** | **Hybrid RAG + BGE-Reranker** | BM25Okapi + BGE-M3 Dense + RRF k=60 + Cross-Encoder Rerank | **100.00%** | **1.0000** | **0.00%** | **100.00%** | **DEPLOYED (Production)** |
| 🥈 **2** | Hybrid RAG (BM25 + Dense) | BM25Okapi + BGE-M3 Cosine + Reciprocal Rank Fusion | 100.00% | 1.0000 | 0.83% | 99.17% | Active Component |
| 🥉 **3** | BM25 Sparse Search | Okapi BM25 với tách âm tiết tiếng Việt | 100.00% | 1.0000 | 0.83% | 99.17% | Fallback Engine |
| 4 | Dense Retrieval | BGE-M3 1024-dim Vector Cosine Similarity | 99.17% | 0.9905 | 1.67% | 98.33% | Component Engine |
| 5 | LLM Only (Closed-Book) | Không có bằng chứng (Zero-Shot Generation) | 36.67% | 0.2671 | 100.00% | 0.00% | **REJECTED (Cấm sử dụng)** |

---

## 4. TỔNG HỢP DANH MỤC MÔ HÌNH PRODUCTION ĐƯỢC CHỌN (WINNER REGISTRY)

| Tác vụ cốt lõi | Mô hình chiến thắng (Winner Model) | Phiên bản | Vị trí Checkpoint | Tiêu chí tuyển chọn |
| :--- | :--- | :--- | :--- | :--- |
| **Phân loại luận điểm** | `TrustMedia-ClaimClassifier-9Class` | `1.2.0-calibrated` | `ml/checkpoints/claim_classifier/model.joblib` | Macro-F1 = 0.9295, Bootstrap CI95 [0.9075, 0.9489] |
| **Kiểm chứng bằng chứng** | `TrustMedia-NLI-CalibratedVerifier` | `1.2.0-calibrated` | `ml/checkpoints/nli_verifier/model.joblib` | Macro-F1 = 0.6056, Bootstrap CI95 [0.5786, 0.6312] |
| **Truy xuất bằng chứng** | `TrustMedia-Hybrid-Retriever-BM25-Dense` | `1.2.0` | `backend/app/services/hybrid_retrieval.py` | Recall@10 = 0.9625, MRR = 0.9167 |
| **Xếp hạng & Lọc âm tính** | `TrustMedia-BGE-CrossEncoder-Reranker` | `1.2.0` | `backend/app/services/rag/reranker.py` | NDCG@5 = 0.9542, Rejection Rate = 98.5% |
