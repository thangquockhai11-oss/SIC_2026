# TRUSTMEDIA AI — CROSS-VERIFICATION ERROR ANALYSIS & TAXONOMY

## 1. Executive Overview

Báo cáo phân tích chuyên sâu các dạng lỗi tiềm ẩn (Error Taxonomy), nguyên nhân gốc rễ (Root Causes) và giải pháp phòng ngừa trong toàn bộ chu trình **Article Claim vs External Evidence Cross-Verification**.

Tài liệu này được biên soạn nhằm đóng vai trò kim chỉ nam vận hành (Operational Guidelines) và bảo trì mô hình trong môi trường Production.

---

## 2. Taxonomy of Cross-Verification Failure Modes

```
                                      CROSS-VERIFICATION FAILURE MODES
                                                     │
         ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
         │                                           │                                           │
  1. EXTRACTION ERRORS                        2. RETRIEVAL ERRORS                         3. REASONING ERRORS
  ├── Boilerplate leakage                     ├── Off-topic BM25 matches                  ├── False contradictions
  ├── Non-factual claim extraction            ├── Raw markup/infobox leakage              ├── Temporal misalignment
  ├── Semantic causality distortion           ├── Wire service overcounting               ├── Metric/unit mismatch
  └── Qualifier & context dropping            └── Knowledge base sparsity                 └── False consensus hallucination
```

---

## 3. Detailed Failure Mode Analysis & Implemented Mitigations

### 3.1. Boilerplate & Administrative Text Leakage
- **Biểu hiện lỗi:** Các câu chỉ dẫn giao diện báo chí (`"Khi nhìn thấy dấu tích xanh bên cạnh VnExpress là đã hoàn thành"`, `"Bấm theo dõi kênh Google News"`, `"Địa chỉ tòa soạn: 16 Lê Hồng Phong..."`) bị bóc tách nhầm thành luận điểm số #01 hoặc #02 cần kiểm chứng.
- **Nguyên nhân gốc rễ:** Mô hình phân tách câu đơn thuần dựa vào dấu chấm câu mà không có bộ lọc nhận diện văn bản hành chính; các câu này chứa từ vựng trùng ngẫu nhiên với câu đầu bài.
- **Giải pháp đã triển khai:**
  - Triển khai `FactCheckingAgent.is_boilerplate_or_administrative`: Nhận diện toàn diện hơn 35 mẫu văn bản hành chính, giấy phép xuất bản, tổng biên tập, dấu tích xanh, thông tin liên hệ và bản quyền báo chí.
  - Kiểm tra độ tương đồng với tiêu đề (`Title Anchor Filtering`): Câu văn nếu không có bất kỳ từ khóa chuyên môn cốt lõi nào thuộc tiêu đề bài báo sẽ bị loại bỏ ngay từ đầu vào.

### 3.2. Off-Topic Document Retrieval (Wikitext / Geographic Token Trap)
- **Biểu hiện lỗi:** Bài báo viết về "Trứng gà giả ở Sơn Đông, Trung Quốc", nhưng hệ thống lại kéo về tài liệu Wikipedia về "Biên giới Nga–Trung Quốc" với nội dung bảng biểu `| territory2 = | length = 4.209,3 km...`, sau đó kết luận mâu thuẫn bằng chứng.
- **Nguyên nhân gốc rễ:**
  - Thuật toán BM25 cho trọng số cao vào các từ như "Trung Quốc", "phía đông" (đông), "tỉnh" vì chúng xuất hiện nhiều lần trong tài liệu bách khoa toàn thư.
  - Không có bước làm sạch mã MediaWiki trước khi tính toán độ tương đồng hoặc đưa vào prompt NLI.
- **Giải pháp đã triển khai:**
  - Hàm `clean_wikitext`: Xử lý regex đa tầng bóc tách sạch 100% các thẻ `{{...}}`, `{|...|}`, `<ref>...</ref>`.
  - Bộ lọc dừng địa danh (`GENERIC_AND_GEO_TERMS`): Loại bỏ các từ định danh địa lý chung chung khỏi danh sách token đánh giá chủ đề.
  - Cổng kiểm soát chủ đề bắt buộc (`Topic Domain Gating`): Bắt buộc tài liệu phải có ít nhất `max(2, int(len(tokens) * 0.30))` từ khóa chuyên môn thì mới được xem xét.

### 3.3. Wire Service Overcounting (Fake Multi-Source Consensus)
- **Biểu hiện lỗi:** Hệ thống báo cáo có "5 cơ quan báo chí độc lập xác nhận thông tin", tạo cảm giác độ tin cậy tuyệt đối, trong khi thực tế cả 5 bài báo đều sao chép y nguyên thông cáo từ Thông tấn xã Việt Nam (TTXVN) hoặc Reuters.
- **Nguyên nhân gốc rễ:** Hệ thống đếm theo URL hoặc Domain của các trang báo mạng mà không phân tích dòng ghi chú nguồn tin (attribution line / byline).
- **Giải pháp đã triển khai:**
  - Module `cluster_source_independence`: Quét toàn văn và metadata để nhận diện cụm nguồn tin (`wire_agencies`).
  - Mọi bài viết có chứa `"Theo TTXVN"`, `"Nguồn: TTXVN"`, `"Reuters đưa tin"` đều được gom về cùng một nhóm phụ thuộc (`WireCluster_Thông tấn xã Việt Nam`), chỉ tính là 1 phiếu biểu quyết độc lập.

### 3.4. Overgeneralization & Missing Qualifiers in Scientific News
- **Biểu hiện lỗi:** Bài báo khoa học gốc ghi nhận *"Chiết xuất từ cây X tiêu diệt tế bào ác tính trong mô hình ống nghiệm in-vitro trên chuột bạch"*, nhưng bài báo mạng giật tít *"Cây X chữa dứt điểm bệnh ung thư ở người"*.
- **Nguyên nhân gốc rễ:** Quá trình tóm tắt thông tin của phóng viên lược bỏ các trạng từ giới hạn (qualifiers) và điều kiện thử nghiệm.
- **Giải pháp đã triển khai:**
  - Trích xuất tự động `ClaimAttributes.qualifiers`: Quét các cụm từ `"in vitro"`, `"in vivo"`, `"ống nghiệm"`, `"chuột bạch"`, `"trên động vật"`.
  - Nếu câu gốc có điều kiện hạn chế nhưng luận điểm trích xuất lại thiếu hoặc gán cho đối tượng người bệnh (`"người"`, `"bệnh nhân"`): Hệ thống lập tức đánh cờ **`OVERGENERALIZATION`**, trừ 0.30 điểm tin cậy và hiển thị cảnh báo khoảng trống thực chứng (Evidence Gap).

### 3.5. Correlation-to-Causation Distortion
- **Biểu hiện lỗi:** Một nghiên cứu quan sát ghi nhận mối liên hệ tương quan (`associated with`, `tương quan`) giữa uống cà phê và giảm nhẹ nguy cơ tim mạch, nhưng bị trích dẫn thành nguyên nhân điều trị (`causes`, `chữa dứt điểm`).
- **Nguyên nhân gốc rễ:** Mô hình NLI chuẩn chỉ phân loại nhãn nhị phân (Entailment/Contradiction) mà không phân biệt mức độ nhân quả.
- **Giải pháp đã triển khai:**
  - Bổ sung bộ từ khóa phân loại hai nhóm: Nhóm liên kết (`self.associational_words`) và Nhóm nhân quả (`self.causal_words`).
  - Bất kỳ bước chuyển nào từ nhóm tương quan sang nhóm nhân quả tuyệt đối mà không có thử nghiệm ngẫu nhiên có đối chứng (RCT) đều bị phân loại là **`CAUSAL_DISTORTION`**.

---

## 4. Operational Recommendations for Production Deployment

1. **Nguyên tắc Thận trọng Khoa học (Epistemic Humility):** Khi độ liên quan của tài liệu kiểm chứng thấp hơn 0.35, hệ thống luôn ưu tiên xuất ra **`CHƯA ĐỦ CHỨNG CỨ (NOT_ENOUGH_INFORMATION)`**, tuyệt đối không suy đoán hoặc suy luận bắc cầu.
2. **Minh bạch Thuộc tính Đối soát:** Luôn hiển thị đầy đủ Ma trận Đối soát 7 chiều (Bảng đối chiếu chéo) trên giao diện Frontend để chuyên gia kiểm chứng và độc giả có thể trực tiếp giám định từng tham số.
3. **Cơ chế Kháng rác định kỳ:** Định kỳ cập nhật danh mục từ khóa lọc giao diện báo chí và danh mục cơ quan thông tấn trong `FactCheckingAgent` và `EvidenceCrossComparator` theo các biến thể mới của các tòa soạn.
