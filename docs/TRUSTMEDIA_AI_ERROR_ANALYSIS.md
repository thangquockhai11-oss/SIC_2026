# BÁO CÁO PHÂN TÍCH LỖI VÀ MẪU THẤT BẠI (TRUSTMEDIA AI ERROR ANALYSIS)
**Dự án:** TrustMedia AI — Autonomous Model Diagnostics & Error Taxonomy  
**Mã tài liệu:** `DOCS-TRM-ERROR-ANALYSIS`  
**Ngày thực hiện:** 24/11/2026  
**Dữ liệu phân tích:** `ml/experiments/error_analysis.json`  

---

## 1. TỔNG QUAN LỖI TRÊN TẬP TEST ĐỘC LẬP (TEST SET ERROR OVERVIEW)

| Mô hình kiểm tra | Số mẫu Test | Số mẫu dự đoán sai | Tỷ lệ lỗi (Error Rate) | Độ chính xác (Accuracy) |
| :--- | :---: | :---: | :---: | :---: |
| **TrustMedia-ClaimClassifier-9Class** | 540 | 38 | **7.04%** | **92.96%** |
| **TrustMedia-NLI-CalibratedVerifier** | 1,447 | 559 | **38.63%** | **61.37%** |

---

## 2. PHÂN TÍCH BẢN CHẤT LỖI TÁC VỤ 1: PHÂN LOẠI LUẬN ĐIỂM (CLAIM CLASSIFIER)

Toàn bộ 38 mẫu dự đoán sai được gom thành 3 nhóm lỗi chính:

```text
========================================================================================
PHÂN BỐ CÁC DẠNG LỖI CỦA MÔ HÌNH PHÂN LOẠI LUẬN ĐIỂM (38 LỖI / 540 MẪU)
========================================================================================
Dạng lỗi (Failure Mode)            | Số lượng | Tỷ lệ %   | Đặc điểm nhận dạng
----------------------------------------------------------------------------------------
Numerical/Statistical Ambiguity    | 29       | 76.32%    | Câu chứa chữ số đếm người/năm nhưng bản chất là sự kiện
Semantic Ambiguity                 | 7        | 18.42%    | Ranh giới mờ giữa phát ngôn trích dẫn và nguyên nhân
Negation Complexity                | 2        | 5.26%     | Phủ định lồng ghép phức tạp ("không là... nhưng")
========================================================================================
```

### Các trường hợp sai lệch điển hình (Case Studies):
1. **Trường hợp 1 (Nhầm lẫn số liệu thống kê vs Sự kiện thực tế):**
   - *Văn bản:* `"Bên cạnh ông Nguyễn Văn Đạt, còn có 2 người khác phù trách việc giám sát trực tiếp tại kho xe vi phạm."`
   - *Nhãn thật (Ground Truth):* `STATISTICAL_CLAIM`
   - *Mô hình dự đoán:* `FACTUAL_CLAIM`
   - *Phân tích:* Câu văn nêu một sự kiện thực tế nhưng người gán nhãn dataset coi việc có "2 người khác" là số liệu thống kê. Mô hình ưu tiên ngữ nghĩa sự kiện hơn là số đếm đơn giản.
2. **Trường hợp 2 (Ranh giới giữa Trích dẫn và Quan hệ Nhân quả):**
   - *Văn bản:* `"TikTok ảnh hưởng tiêu cực đến trẻ vị thanh niên như rơi vào trầm cảm, đau khổ, khuyến khích tự tử... đã gián tiếp gây ra cái chết cho một bé gái..."`
   - *Nhãn thật:* `QUOTATION_CLAIM`
   - *Mô hình dự đoán:* `CAUSAL_CLAIM`
   - *Phân tích:* Văn bản không có dấu ngoặc kép hoặc động từ trích dẫn rõ ràng, nhưng chứa các cụm "ảnh hưởng đến", "gây ra", "do trào lưu". Mô hình gán nhãn `CAUSAL_CLAIM` là hoàn toàn hợp lý về mặt logic ngữ nghĩa.

---

## 3. PHÂN TÍCH BẢN CHẤT LỖI TÁC VỤ 2: KIỂM ĐỊNH BẰNG CHỨNG (NLI VERIFIER)

Toàn bộ 559 mẫu dự đoán sai trên tập ViFactCheck Test Set được phân nhóm như sau:

```text
========================================================================================
PHÂN BỐ CÁC DẠNG LỖI CỦA MÔ HÌNH KIỂM CHỨNG BẰNG CHỨNG (559 LỖI / 1,447 MẪU)
========================================================================================
Dạng lỗi (Failure Mode)            | Số lượng | Tỷ lệ %   | Nguyên nhân bản chất
----------------------------------------------------------------------------------------
Semantic Lexical Gap               | 315      | 56.35%    | Diễn đạt khác từ ngữ (Paraphrasing) đòi hỏi tri thức sâu
Spurious Over-Retrieval Correlation| 99       | 17.71%    | Bằng chứng trùng nhiều từ khóa nhưng chưa đủ kết luận
Negation Inversion                 | 83       | 14.85%    | Từ ngữ phủ định tinh vi đảo ngược chiều logic
Numerical Inconsistency Miss       | 62       | 11.09%    | Sai lệch số học vi mô (21 tuổi vs 23 tuổi, 32 vs 35 bàn)
========================================================================================
```

### Các trường hợp sai lệch điển hình (Case Studies):
1. **Trường hợp 1 (Khoảng cách từ vựng - Semantic Lexical Gap):**
   - *Statement:* `"Trong phim Everything Everywhere All at Once diễn viên Quan Kế Huy sinh năm 1890, người giành giải diễn viên nam chính xuất sắc nhất nói lời cảm ơn Viện hàn lâm..."`
   - *Evidence:* `"Diễn viên Quan Kế Huy, người giành giải diễn viên nam phụ xuất sắc nhất trong phim Everything Everywhere All at Once Cảm ơn Viện hàn lâm vì giải thưởng vinh dự này"`
   - *Nhãn thật:* `CONTRADICTION` (do sai "nam chính" vs "nam phụ", và năm sinh 1890)
   - *Mô hình dự đoán:* `NEUTRAL`
   - *Phân tích:* Do tài liệu đối chiếu chỉ nêu "nam phụ" và không đề cập năm sinh, mô hình nghiêng về trạng thái thiếu thông tin (NEUTRAL) thay vì khẳng định mâu thuẫn trực diện.
2. **Trường hợp 2 (Phủ định gián tiếp - Implicit Negation):**
   - *Statement:* `"Giảm nhẹ công tác tuyên truyền về phòng, chống dịch cúm gia cầm..."`
   - *Evidence:* `"Sở Thông tin và Truyền thông chỉ đạo tăng cường công tác tuyên truyền về phòng, chống dịch cúm gia cầm..."`
   - *Nhãn thật:* `CONTRADICTION` ("giảm nhẹ" đối lập với "tăng cường")
   - *Mô hình dự đoán:* `NEUTRAL`
   - *Phân tích:* Cặp từ trái nghĩa "giảm nhẹ" vs "tăng cường" đòi hỏi từ điển đối lập chuyên sâu (Antonym dictionary).

---

## 4. ĐỀ XUẤT NÂNG CẤP HỆ THỐNG TRONG CÁC PHIÊN BẢN TIẾP THEO

1. **Bổ sung Tầng Từ điển Trái nghĩa (Antonym Mapping):**  
   Xây dựng bảng tra cứu các cặp đối lập tiếng Việt thông dụng trong báo chí (`tăng cường` $\leftrightarrow$ `giảm nhẹ`, `bác bỏ` $\leftrightarrow$ `xác nhận`, `an toàn` $\leftrightarrow$ `nguy hiểm`) để hỗ trợ phát hiện mâu thuẫn ngữ nghĩa bề mặt.
2. **Bộ trích xuất số liệu chuẩn xác vi mô (Micro-Numerical Parsing):**  
   Tách toàn bộ các cặp số lượng, phần trăm, năm sinh trong Statement và Evidence; nếu phát hiện lệch quá 1 đơn vị trên cùng một thuộc tính thực thể thì phạt gắt gao chuyển sang `CONTRADICTION`.
3. **Giữ nguyên trạng thái bảo lưu khoa học (Abstention Policy):**  
   Khi mô hình dao động xác suất giữa Contradiction và Neutral, luôn ưu tiên bảo lưu trạng thái `NOT_ENOUGH_INFORMATION` để tuân thủ nguyên tắc IFCN: **Không có bằng chứng chắc chắn thì không được suy diễn kết luận.**
