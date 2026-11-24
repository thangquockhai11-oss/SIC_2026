# GEMINI 4 HYDROGEN & NEON ERROR ANALYSIS & EDGE CASES
## PHÂN TÍCH CÁC TRƯỜNG HỢP BIÊN, SAI LỆCH NGỮ NGHĨA & BIỆN PHÁP KHẮC PHỤC

> **Mục tiêu:** Nhận diện và làm rõ các lỗi suy luận phổ biến trong xử lý thông tin báo chí và cách hệ thống kép giải quyết triệt để.

---

## 1. PHÂN TÍCH CÁC TRƯỜNG HỢP BIÊN (EDGE CASES) ĐẶC THÙ

### Ca 1: Ngụy biện "Tương quan ngộ nhận là Nhân quả" (Correlation as Causation)
- **Kịch bản sai lệch:** Bài báo khoa học gốc ghi nhận: *"Nghiên cứu quan sát trên 5.000 người cho thấy những người uống cà phê có tỷ lệ mắc bệnh tim thấp hơn 20% (p < 0.05)."* Bài báo truyền thông viết: *"Cà phê là thần dược chữa khỏi và phòng chống triệt để bệnh tim mạch."*
- **Rủi ro nếu dùng mô hình đơn:** Mô hình thông thường sẽ thấy cả hai bài đều nói về "cà phê" và "bệnh tim" nên dễ dãi gán nhãn `SUPPORTED`.
- **Cơ chế hóa giải của TrustMedia AI:**
  1. `gemini-4-hydrogen` bóc tách `causal_assertion="CAUSATION"` ở bài báo nhưng ghi nhận `causal_assertion="CORRELATION"` ở tài liệu y khoa.
  2. Kích hoạt cờ `causal_distortion_risk=True` và triệu tập `gemini-4-neon`.
  3. `gemini-4-neon` thực hiện phản biện: *"Correlation does not imply causation. Bằng chứng dịch tễ học chỉ chứng minh mối tương quan, việc ngoại suy thành tác dụng chữa khỏi là ngụy biện nghiêm trọng."* -> Gán nhãn `MISLEADING`.

### Ca 2: Đánh tráo chủ thể phát ngôn (Attribution Swapping)
- **Kịch bản sai lệch:** Nhân vật A trả lời phỏng vấn, nhưng bài viết giật tít gán phát ngôn gây sốc cho Nhân vật B (như vụ việc Diego Simeone vs Javier Tebas).
- **Cơ chế hóa giải:**
  - Kiểm tra thực thể tại chiều thứ 1 (Entity) và chiều thứ 11 (Attribution) trong ma trận 15 chiều. Nếu tài liệu chứng minh nhân vật B không phát ngôn, hệ thống lập tức đánh cờ `MISMATCH` và bác bỏ phát ngôn (`REFUTED`).

### Ca 3: Nhầm lẫn đơn vị đo lường (Unit Discrepancy)
- **Kịch bản sai lệch:** Nhầm lẫn giữa gam (g) và miligam (mg). 500 g hoạt chất tương đương 500.000 mg (gấp 1.000 lần liều an toàn).
- **Cơ chế hóa giải:**
  - Sử dụng thuật toán regex ranh giới từ vựng nghiêm ngặt `\b\d+\s*g\b` vs `\b\d+\s*mg\b`. Không bao giờ kiểm tra dạng substring thông thường (tránh việc chữ cái "g" nằm trong từ khác như "giờ", "gan", "mg").

---

## 2. NGUYÊN TẮC PHÒNG NGỪA ẢO GIÁC TRÍCH DẪN (ZERO HALLUCINATION POLICY)

1. **Không cho phép mô hình tự sinh trích dẫn:** Mọi trích dẫn hiển thị trên giao diện (`evidence_quote`) phải là một chuỗi con thực tế (substring) được trích xuất nguyên vẹn từ các tài liệu tìm kiếm hoặc từ kho dataset.
2. **Neon không được bịa đặt tài liệu đối chứng:** Khi phản biện, `gemini-4-neon` chỉ được phép sử dụng các sự kiện logic được cung cấp trong ngữ cảnh bằng chứng của lượt thẩm định.
3. **Cơ chế bảo lưu khi thiếu dữ kiện:** Thay vì cố gắng phỏng đoán, hệ thống luôn ưu tiên dừng lại ở `NOT_ENOUGH_INFORMATION`.
