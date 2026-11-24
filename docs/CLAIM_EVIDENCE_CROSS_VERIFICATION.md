# CLAIM–EVIDENCE CROSS-VERIFICATION SPECIFICATION
## ĐỘNG CƠ ĐỐI CHUẨN MA TRẬN 15 CHIỀU & NGUYÊN TẮC BẢO LƯU BẢO THỦ

> **Module thực thi:** `backend/app/services/gemini_cross_verifier.py`  
> **Hỗ trợ:** `backend/app/services/evidence_cross_comparator.py`  
> **Mô hình phối hợp:** `gemini-4-hydrogen` (Thẩm định sơ bộ) + `gemini-4-neon` (Phản biện độc lập)

---

## 1. MA TRẬN THUỘC TÍNH 15 CHIỀU (15-DIMENSION ATTRIBUTE MATRIX)

| Chiều kiểm chứng (Dimension) | Thuộc tính đối chiếu | Thuật toán kiểm tra | Trạng thái có thể có |
| :--- | :--- | :--- | :--- |
| **1. Thực thể (Entity)** | Danh tính tổ chức / cá nhân | So khớp danh xưng & thực thể NER | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **2. Chủ thể (Subject)** | Chủ thể thực hiện hành động | So khớp cú pháp chủ vị | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **3. Vị ngữ (Predicate)** | Động từ hành động / kết luận | Phân tích quan hệ ngữ nghĩa | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **4. Số liệu (Number)** | Con số định lượng thống kê | Regex bóc tách số học + sai số toán học | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **5. Đơn vị (Unit)** | Đơn vị đo lường (%, g, mg, tỷ) | Regex ranh giới từ vựng (Word Boundaries) | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **6. Thời gian (Date)** | Năm, tháng, ngày diễn ra sự kiện | Regex trích xuất mốc năm 4 chữ số | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **7. Địa điểm (Location)** | Địa bàn, quốc gia, khu vực | So khớp phạm vi địa lý | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **8. Quần thể (Population)** | Đối tượng thử nghiệm / khảo sát | Đối chiếu mẫu in-vitro vs in-vivo vs người | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **9. Điều kiện (Conditions)** | Rào cản, tiền đề, điều kiện tiên quyết | Giám sát các mệnh đề điều kiện biên | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **10. Nhân quả (Causality)** | Quan hệ nhân quả vs tương quan | Phân biệt Causation vs Correlation | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **11. Nguồn dẫn (Attribution)** | Ai là người thực sự đưa ra phát ngôn | Đối soát trích dẫn trực tiếp và gián tiếp | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **12. Phủ định (Negation)** | Tính khẳng định hay phủ định | Phân tích cực tính (Polarity) qua từ phủ định | `MATCH`, `MISMATCH`, `UNKNOWN` |
| **13. Ngữ cảnh (Context)** | Bối cảnh học thuật vs thời sự | So sánh trường nghĩa và ngữ cảnh gốc | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **14. Phạm vi (Scope)** | Cục bộ hay phổ quát | Đánh giá mức độ khái quát hóa | `MATCH`, `MISMATCH`, `PARTIAL_MATCH`, `UNKNOWN` |
| **15. Mức độ (Modality)** | Khả năng (might) vs Chắc chắn (certain) | Giám sát các trợ từ tình thái nhận thức | `MATCH`, `MISMATCH`, `UNKNOWN` |

---

## 2. NGUYÊN TẮC BẢO LƯU BẢO THỦ (CONSERVATIVE ABSTENTION)

Một trong những yêu cầu nghiêm ngặt nhất của TrustMedia AI là: **AI không được đoán mò hoặc tự suy diễn khi thiếu bằng chứng.**
- Nếu không tìm thấy bằng chứng ngoài độc lập: Hệ thống gán ngay phán quyết `NOT_ENOUGH_INFORMATION`.
- Nếu tài liệu tìm thấy không liên quan (`IRRELEVANT`): Hệ thống từ chối đưa ra kết luận khẳng định/bác bỏ, bảo lưu ở mức `NOT_ENOUGH_INFORMATION`.
- Độ tin cậy cho phán quyết bảo lưu được neo ở mức cao (>= 0.85) để ghi nhận rằng sự thiếu hụt thông tin là một phát hiện khách quan.
