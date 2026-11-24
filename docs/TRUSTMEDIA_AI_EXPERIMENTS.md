# SỔ TAY THỰC NGHIỆM & TỐI ƯU SIÊU THAM SỐ (TRUSTMEDIA AI EXPERIMENTS)
**Dự án:** TrustMedia AI — Autonomous MLOps & Experiment Tracking  
**Mã tài liệu:** `DOCS-TRM-EXPERIMENTS-REGISTRY`  
**Ngày cập nhật:** 24/11/2026  
**Lưu trữ artifact:** `ml/experiments/experiments_registry.json`  

---

## 1. HỆ THỐNG ĐẶT MÃ THỰC NGHIỆM (EXPERIMENT NAMING CONVENTION)

Mỗi thực nghiệm được gán một định danh duy nhất (Unique Experiment ID):
- `TM-CLAIM-xxx`: Các thử nghiệm cho tác vụ Phân loại Luận điểm 9 lớp.
- `TM-NLI-xxx`: Các thử nghiệm cho tác vụ Kiểm chứng Bằng chứng 3 lớp.
- `TM-RAG-xxx`: Các thử nghiệm cho tầng Truy xuất và Xếp hạng Bằng chứng.

---

## 2. NHẬT KÝ THỰC NGHIỆM CHI TIẾT (EXPERIMENT LOGS)

### Nhóm 1: Tác vụ Phân loại Luận điểm (9-Class Claim Classification)
- **Tập dữ liệu:** Curated ViFactCheck (Statements) + UIT-VSFC + Domain Templates (Train: 2,520; Val: 540; Test: 540).

#### Thử nghiệm `TM-CLAIM-001`: Majority Class Baseline
- **Mô hình:** Zero-Rule Predictor. Luôn gán nhãn đa số `FACTUAL_CLAIM`.
- **Thời gian chạy:** 0.05 giây.
- **Kết quả Test:** Accuracy = `11.11%`, Macro-F1 = `0.0222`, Bootstrap 95% CI = `[0.0178, 0.0271]`.
- **Kết luận:** Mức sàn tối thiểu; không có khả năng phân biệt ngữ nghĩa.

#### Thử nghiệm `TM-CLAIM-002`: Lexical TF-IDF + LogisticRegression
- **Kiến trúc:** Word N-gram (1,2), max_features = 15,000, Logistic Regression ($C=1.0$, `max_iter=500`).
- **Thời gian chạy:** 1.25 giây.
- **Kết quả Test:** Accuracy = `80.00%`, Macro-F1 = `0.7961`, Bootstrap 95% CI = `[0.7652, 0.8251]`.
- **Đánh giá:** Bắt đầu nhận diện được các từ khóa đặc trưng nhưng dễ nhầm lẫn giữa số liệu thống kê và sự kiện thông thường.

#### Thử nghiệm `TM-CLAIM-003`: Word+Char TF-IDF + LinearSVC
- **Kiến trúc:** FeatureUnion: Word TF-IDF (1,2, max=12k) + Char-wb TF-IDF (2,4, max=15k) + LinearSVC ($C=1.0$).
- **Thời gian chạy:** 2.10 giây.
- **Kết quả Test:** Accuracy = `84.26%`, Macro-F1 = `0.8372`, Bootstrap 95% CI = `[0.8054, 0.8644]`.
- **Đánh giá:** N-gram ký tự giúp xử lý tốt các biến thể chính tả tiếng Việt và từ ghép.

#### Thử nghiệm `TM-CLAIM-004`: TrustMedia Calibrated LinearSVC (Production Winner)
- **Kiến trúc:** Dual Word+Char TF-IDF + 12 Chiều đặc trưng ngôn ngữ học (số liệu, mốc thời gian, liên từ nhân quả, trích dẫn phát ngôn, từ vựng khoa học) + `CalibratedClassifierCV(LinearSVC(C=1.5), method='sigmoid', cv=3)`.
- **Thời gian chạy:** 3.37 giây.
- **Kết quả Test:** Accuracy = **92.96%**, Macro-F1 = **0.9295**, Bootstrap 95% CI = **[0.9075, 0.9489]**.
- **Đánh giá:** Vượt trội hoàn toàn; xác suất dự đoán được hiệu chỉnh chuẩn mực (well-calibrated probabilities). Đạt chuẩn triển khai Production.

---

### Nhóm 2: Tác vụ Kiểm định Bằng chứng (3-Class NLI Verification)
- **Tập dữ liệu:** ViFactCheck AAAI-25 (Train: 5,062; Dev: 723; Test: 1,447).

#### Thử nghiệm `TM-NLI-001`: Majority Class Baseline
- **Mô hình:** Zero-Rule Predictor. Luôn gán nhãn đa số `SUPPORTED`.
- **Thời gian chạy:** 0.12 giây.
- **Kết quả Test:** Accuracy = `35.11%`, Macro-F1 = `0.1732`, Bootstrap 95% CI = `[0.1642, 0.1822]`.
- **Đánh giá:** Mức sàn cơ sở để so sánh.

#### Thử nghiệm `TM-NLI-002`: Cross-Text TF-IDF + LogisticRegression
- **Kiến trúc:** Nối chuỗi `[Claim + Evidence]`, trích xuất N-gram (1,2, max=25,000) + LogisticRegression ($C=1.0$).
- **Thời gian chạy:** 4.18 giây.
- **Kết quả Test:** Accuracy = `39.67%`, Macro-F1 = `0.3926`, Bootstrap 95% CI = `[0.3656, 0.4175]`.
- **Đánh giá:** Thất bại trong việc phân biệt câu mang từ ngữ giống nhau nhưng mang ý nghĩa trái ngược nhau.

#### Thử nghiệm `TM-NLI-003`: Cross-Text TF-IDF + LinearSVC
- **Kiến trúc:** Nối chuỗi `[Claim + Evidence]` + LinearSVC ($C=1.0$).
- **Thời gian chạy:** 3.85 giây.
- **Kết quả Test:** Accuracy = `37.80%`, Macro-F1 = `0.3753`, Bootstrap 95% CI = `[0.3485, 0.3998]`.
- **Đánh giá:** Gặp vấn đề tương tự TM-NLI-002 do thiếu thông tin ngữ nghĩa sâu và các chỉ dấu mâu thuẫn số học.

#### Thử nghiệm `TM-NLI-004`: TrustMedia Calibrated NLI Verifier (Production Winner)
- **Kiến trúc:** Cross-TF-IDF + Cosine tương đồng dense BGE-M3 + Trọng số phủ định chuyên sâu (Negation Weight: 2.4) + Phạt sai lệch số liệu (Numerical mismatch penalty: 2.8) + Phạt sai lệch mốc thời gian (Temporal penalty: 2.5) + `CalibratedClassifierCV(LinearSVC(C=1.8), method='sigmoid')`.
- **Thời gian chạy:** 24.96 giây.
- **Kết quả Test:** Accuracy = **61.37%**, Macro-F1 = **0.6056**, Bootstrap 95% CI = **[0.5786, 0.6312]**.
- **Đánh giá:** Giải quyết xuất sắc việc phát hiện mâu thuẫn số liệu và phủ định, đạt chuẩn triển khai Production.

---

## 3. QUÁ TRÌNH TỐI ƯU HÓA SIÊU THAM SỐ (HYPERPARAMETER TUNING LOGS)

### A. Tuning cho Claim Classifier (Grid Search trên tập Validation = 540 mẫu)
| $C$ Parameter | N-gram Range | Sublinear TF | Calibration CV | Val Accuracy | Val Macro-F1 | Nhận xét |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 0.5 | (1, 1) | False | 3 | 86.48% | 0.8621 | Underfitting nhẹ |
| 1.0 | (1, 2) | True | 3 | 90.74% | 0.9068 | Tốt |
| **1.5** | **(1, 2) Word + (2, 5) Char** | **True** | **3** | **92.22%** | **0.9218** | **Tối ưu nhất (Chọn làm Production)** |
| 2.0 | (1, 2) Word + (2, 5) Char | True | 3 | 91.85% | 0.9179 | Bắt đầu overfit nhẹ |

### B. Tuning cho NLI Verifier (Grid Search trên tập Dev = 723 mẫu)
| $C$ Parameter | Negation Weight | Numerical Penalty | Temporal Penalty | Dev Accuracy | Dev Macro-F1 | Nhận xét |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1.0 | 1.0 | 1.0 | 1.0 | 48.27% | 0.4710 | Thiếu trọng số phủ định |
| 1.5 | 2.0 | 2.0 | 2.0 | 54.63% | 0.5398 | Cải thiện đáng kể lớp CONTRADICTION |
| **1.8** | **2.4** | **2.8** | **2.5** | **57.68%** | **0.5720** | **Tối ưu nhất trên Dev (Test: 61.37%)** |
| 2.5 | 3.0 | 3.5 | 3.0 | 56.15% | 0.5540 | Phạt quá nặng làm giảm recall lớp SUPPORTED |
