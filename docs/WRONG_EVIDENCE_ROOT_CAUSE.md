# BÁO CÁO TRUY VẾT NGUYÊN NHÂN GỐC: SAI LỆCH BẰNG CHỨNG & PHÁN QUYẾT
## Core Claim–Evidence Verification Engine — TrustMedia AI

---

## 1. THÔNG TIN CASE BỊ LỖI ĐƯỢC TRUY VẾT

- **Mã hồ sơ bài báo (Analysis ID):** `5df16bc2-d316-4767-ab48-849ddf2065ca`
- **Đường dẫn thẩm định:** `/fact-checking?id=5df16bc2-d316-4767-ab48-849ddf2065ca`
- **Tiêu đề bài viết:** *"Cà phê có thể giảm nguy cơ ung thư tuyến tiền liệt"* (Nguồn: Báo điện tử VnExpress)
- **Luận điểm phát ngôn #02 (Claim ID `62085792-f072-4f27-af89-80e814aec121`):**
  > *"Uống mỗi tách cà phê hằng ngày có thể giảm 1% nguy cơ ung thư tuyến tiền liệt, theo phân tích dữ liệu từ 16 nghiên cứu tại Mỹ, Nhật, châu Âu."*
- **Triệu chứng lỗi trên giao diện:**
  1. **Bằng chứng đối chiếu:** Trích dẫn nội dung từ Báo Thanh Niên (ViFactCheck) bàn về *"Gen Z viết bài tiểu luận nhanh hơn nhờ ChatGPT... ChatGPT có thể hỗ trợ nghiên cứu và tổng hợp tài liệu khoa học..."*.
  2. **Phán quyết hiển thị (Verdict):** `REFUTED — BỊ BÁC BỎ` (Độ tin cậy 0.78).
  3. **Lý giải mâu thuẫn:** Text giải thích lại ghi nhận phát ngôn bị bác bỏ bởi tài liệu kiểm chứng từ *Báo Dân Trí* (thực chất là bài viết về *thoái hóa đốt sống cổ gây liệt vận động*).
  4. **Evidence Gap:** Tầng 3 hiển thị *"Mô hình NLI & BGE Reranker — CHỜ PHÚC TRA"*.

---

## 2. NGUYÊN NHÂN GỐC (ROOT CAUSES)

Sau khi truy vấn trực tiếp vào PostgreSQL engine (`postgresql+psycopg://trustmedia:***@127.0.0.1:5432/trustmedia`) và phân tích log pipeline, 4 nguyên nhân gốc cốt lõi được xác định:

### 2.1. Trùng lặp từ khóa từ vựng trong bộ truy xuất lai (Lexical Keyword Collisions in BM25)
- Ngưỡng truy xuất tối thiểu ban đầu đặt quá thấp (`min_relevance_threshold = 0.18`).
- Luận điểm #02 chứa các thuật ngữ học thuật phổ biến: `"nghiên cứu"`, `"phân tích"`, `"dữ liệu"`, `"khoa học"`.
- Thuật toán BM25 và Sparse Retrieval ghép các token này với các bản tin công nghệ trong tập dữ liệu ViFactCheck bàn về sinh viên ứng dụng **ChatGPT** để phân tích tài liệu và nghiên cứu khoa học.
- Đồng thời, các từ ngữ như `"ngày"`, `"nguy cơ"`, `"liệt"` (trong "ung thư tuyến tiền **liệt**") lại trùng với bài báo sức khỏe của Dân Trí về *"thoái hóa đốt sống... ảnh hưởng sinh hoạt hàng **ngày**... nguy cơ **liệt** vận động"*.
- Do thiếu bộ lọc ngữ nghĩa thực thể cấp cao, các đoạn văn phi chủ đề này đã lọt qua vòng sơ loại.

### 2.2. Kiểm tra tương thích số liệu lộn ngược bản chất thành Bác bỏ (Numerical Consistency Inversion)
- Tại `fact_checking_agent.py` (dòng 1160-1178 trước khi sửa):
  ```python
  if nli_rel == "SUPPORTS":
      if not num_ok or not temp_ok:
          stance = "REFUTES"
          nli_conf = 0.90
  ```
- Bài báo Dân Trí về thoái hóa đốt sống hoàn toàn không chứa chỉ số `"1%"`. Khi hàm `_check_numerical_consistency` chạy, nó trả về `num_ok = False`.
- Logic cũ đã tự động coi sự vắng mặt của con số `"1%"` trong một bài viết hoàn toàn lạc đề là bằng chứng để gán nhãn `stance = "REFUTES"`.
- Do danh sách `refuting_evidences` có chứa bài báo Dân Trí, state machine sơ khai kích hoạt nhánh `final_verdict = "REFUTED"`.

### 2.3. Tách rời giữa Bằng chứng hiển thị và Bằng chứng sinh Phán quyết (Evidence-Verdict Decoupling)
- Đoạn trích dẫn hiển thị trên UI được lấy từ `processed_evidences[0]`, vốn có điểm BM25 cao nhất là bài viết Thanh Niên (ChatGPT).
- Trong khi đó, biến `refuting_evidences[0]` lại trỏ vào bài Dân Trí (thoái hóa đốt sống).
- Hậu quả: Báo cáo đưa ra phán quyết "Bác bỏ bởi Dân Trí", nhưng khung trích dẫn bằng chứng lại in nguyên văn đoạn trích "ChatGPT hỗ trợ viết tiểu luận của Thanh Niên".

### 2.4. Thiếu State Machine bắt buộc và thiếu nguyên tắc bảo lưu (Abstention Policy)
- Pipeline không tuân thủ nguyên tắc bảo lưu của IFCN: Khi không tìm thấy tài liệu thực chứng nào liên quan trực tiếp đến quan hệ nhân quả/tương quan giữa cà phê và ung thư tuyến tiền liệt, hệ thống thay vì kết luận `NOT_ENOUGH_INFORMATION` lại ép ra kết luận `REFUTED` từ các dữ liệu rác.

---

## 3. TÁC ĐỘNG VÀ BIỆN PHÁP KHẮC PHỤC TRIỆT ĐỂ

| Vấn đề | Cơ chế cũ (Gây lỗi) | Cơ chế mới (Đã chuẩn hóa) |
| :--- | :--- | :--- |
| **Lọc bằng chứng rác** | Dựa trên BM25 threshold 0.18 | Nhúng **Gemini 4 Hydrogen** (`GeminiEvidenceValidator`) phân tích thực thể & ngữ cảnh; loại bỏ 100% bằng chứng `IRRELEVANT`. |
| **Bảo lưu phán quyết** | Cố ép verdict `REFUTED` | Tuân thủ `ClaimVerificationStateMachine`: Nếu 0 bằng chứng hợp lệ -> Bắt buộc ra `NOT_ENOUGH_INFORMATION`. |
| **Xung đột số liệu** | Thiếu số liệu -> Đổi thành `REFUTES` | Sai khác định lượng trên cùng chủ đề -> `PARTIALLY_SUPPORTED`. Không cùng chủ đề -> `IRRELEVANT`. |
| **Liên kết hiển thị** | `processed_evidences[0]` ngẫu nhiên | Bằng chứng hiển thị (`evidence_quote`, `evidence_source`, `evidence_url`) gắn chặt chẽ 1:1 với tài liệu quyết định phán quyết. |

