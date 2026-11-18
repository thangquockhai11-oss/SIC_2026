# BÁO CÁO NGHIỆM THU VIỆT HÓA TOÀN DIỆN HỆ THỐNG TRUSTMEDIA AI
*(Vietnamese Localization & Fact-Checking System Comprehensive Acceptance Report)*

**Ngày hoàn thành:** 18/11/2026  
**Đơn vị thực hiện:** Senior Full-Stack AI Engineer, NLP Research Engineer & UI/UX Designer  
**Phiên bản hệ thống:** TrustMedia AI v2.0 (BGE-M3, Hybrid RAG, Multi-Agent EWAC Consensus)

---

## 1. TỔNG QUAN DỰ ÁN VIỆT HÓA

Thực hiện yêu cầu chuẩn hóa ngôn ngữ và trải nghiệm người dùng, hệ thống **TrustMedia AI** đã được chuyển đổi hoàn toàn sang **TIẾNG VIỆT 100%** trên toàn bộ giao diện, thông báo, nhãn dữ liệu, biểu đồ, báo cáo in ấn và cơ chế ánh xạ phán quyết AI.

### Nguyên tắc ngôn ngữ cốt lõi:
1. **Ngôn ngữ mặc định:** Tiếng Việt tự nhiên, chính xác, sử dụng thuật ngữ báo chí và khoa học truyền thông chuẩn mực.
2. **Không tiếng Anh xen kẽ:** Toàn bộ nút bấm, điều hướng, tiêu đề, modal, tooltip, bảng biểu và thanh tiến trình đều hiển thị tiếng Việt.
3. **Bảo lưu danh xưng kỹ thuật:** Giữ nguyên tên thương hiệu **TrustMedia AI**, tên các mô hình NLP/kiến trúc nền tảng (`BGE-M3`, `PhoBERT`, `RoBERTa`, `pgvector`, `BM25`, `RRF`, `EWAC`, `NELA-GT`, `WVS Wave 7`, `MIND`, `UIT-VSFC`, `ViFactCheck`, `FEVER`, `X-FACT`) và các enum cơ sở dữ liệu nội bộ.
4. **Ánh xạ hiển thị độc lập:** Các enum nội bộ của Backend và Database được giữ nguyên để bảo đảm tính tương thích API; tầng giao diện (Frontend) và báo cáo xuất bản sử dụng hệ thống ánh xạ (Mapping dictionary) chuẩn hóa.

---

## 2. KIẾN TRÚC QUẢN LÝ BẢN DỊCH (I18N INFRASTRUCTURE)

Đã thiết lập hệ thống quản lý bản dịch gọn nhẹ, type-safe và mở rộng:

- `frontend/src/locales/vi.json`: Bộ từ điển tiếng Việt hoàn chỉnh cho toàn bộ hệ sinh thái (App, Nav, Verdicts, Statuses, Agents, Claim Types, RAG Terms, Tables, Actions, Messages).
- `frontend/src/locales/en.json`: Bản dịch tiếng Anh dự phòng cho môi trường đối chiếu quốc tế.
- `frontend/src/utils/i18n.ts`: Hệ thống helper functions chuẩn hóa:
  - `t(key, fallback)`: Truy xuất chuỗi theo đường dẫn phân cấp (`nav.dashboard`, `rag.title`,...).
  - `formatVerdict(verdict)`: Chuyển đổi mã phán quyết sang tiếng Việt chuẩn tắc.
  - `formatStatus(status)`: Chuyển đổi trạng thái tiến trình xử lý.
  - `formatAgentName(agentName)`: Chuyển đổi định danh Agent sang tên tác nhân tiếng Việt chuẩn.
  - `formatClaimType(claimType)`: Chuẩn hóa 8 phân loại phát ngôn theo taxonomy.
  - `formatStance(stance)`: Chuẩn hóa lập trường đối chiếu (`Ủng hộ`, `Bác bỏ`, `Trung lập`).
  - `formatDateTime(date)` & `formatDate(date)`: Định dạng thời gian chuẩn `vi-VN` (24h, ngày/tháng/năm).
  - `formatPercentage(num, digits)`: Định dạng tỷ lệ phần trăm theo chuẩn tiếng Việt (`xx.x%`).
  - `formatNumber(num)` & `formatCurrency(val)`: Định dạng số liệu và tiền tệ VND.

---

## 3. BẢNG ÁNH XẠ TRẠNG THÁI VÀ KẾT QUẢ AI

| Mã Enum Kỹ thuật | Hiển thị Tiếng Việt Chuẩn | Diễn giải Khoa học |
| :--- | :--- | :--- |
| `SUPPORTED` | **Được bằng chứng hỗ trợ** | Bằng chứng đối chiếu độc lập đủ mạnh và nhất quán với tuyên bố. |
| `REFUTED` | **Bị bằng chứng bác bỏ** | Bằng chứng độc lập uy tín trực tiếp phản bác hoặc phủ định tuyên bố. |
| `PARTIALLY_SUPPORTED` | **Đúng một phần** | Sự kiện cốt lõi có căn cứ nhưng số liệu hoặc mốc thời gian sai khác. |
| `MISLEADING` | **Gây hiểu lầm** | Thông tin có thể đúng về mặt riêng lẻ nhưng thiếu bối cảnh hoặc diễn đạt sai lệch. |
| `CONFLICTING_EVIDENCE` | **Bằng chứng mâu thuẫn** | Có các nguồn tư liệu đối chứng uy tín mâu thuẫn trực tiếp với nhau. |
| `NOT_ENOUGH_INFORMATION` | **Chưa đủ bằng chứng** | Chưa có tài liệu đối soát độc lập đạt ngưỡng trong cơ sở tri thức. |
| `NOT_CHECKABLE` | **Không thể kiểm chứng** | Quan điểm chủ quan, nhận định cá nhân hoặc dự đoán tương lai. |
| `PROCESSING` | **Đang xử lý** | Tác nhân AI đang thực thi phân tích và đối soát. |
| `COMPLETED` | **Hoàn thành** | Phân tích đã hoàn tất và kết luận đã được lưu trữ. |
| `FAILED` | **Thất bại** | Gặp sự cố kết nối hoặc ngoại lệ trong xử lý. |
| `PENDING` | **Đang chờ** | Yêu cầu đã nhận và đang xếp lịch kích hoạt. |
| `QUEUED` | **Đang chờ xử lý** | Đang chờ tài nguyên tính toán từ Event Loop. |
| `ABSTAIN` | **Từ chối kết luận do thiếu căn cứ** | Hệ thống bảo lưu kết luận khoa học nhằm tránh suy đoán. |
| `UNRESOLVED` | **Chưa giải quyết được** | Phiên phân tích cần sự can thiệp của chuyên gia phúc tra. |

---

## 4. BẢNG ÁNH XẠ CÁC TÁC NHÂN AI (AI AGENTS)

| Tên Kỹ thuật Code | Tên Tác nhân Hiển thị | Vai trò & Nhiệm vụ Chuyên biệt |
| :--- | :--- | :--- |
| `FactCheckingAgent` | **Tác nhân kiểm chứng thông tin** | Trích xuất tuyên bố độc lập, truy xuất Hybrid RAG & kiểm chứng NLI. |
| `MediaCredibilityAgent` | **Tác nhân đánh giá nguồn truyền thông** | Thẩm định minh bạch tòa soạn, chất lượng trích dẫn theo chuẩn NELA-GT. |
| `PublicOpinionAgent` | **Tác nhân phân tích dư luận** | Tách bạch Cảm xúc (Sentiment) và Lập trường (Stance) của cộng đồng. |
| `PublicTrustAgent` | **Tác nhân phân tích niềm tin công chúng** | Đo lường niềm tin dân cư theo chuẩn xã hội học (WVS Wave 7). |
| `InformationReceptionAgent` | **Tác nhân phân tích khả năng tiếp nhận** | Đánh giá độ đọc hiểu (MIND), nhận diện claim & ý định chia sẻ. |
| `MetaSynthesisAgent` | **Tác nhân tổng hợp và điều phối** | Hiệu chuẩn trọng số bằng chứng EWAC & phát hiện bất đồng thông tin. |

---

## 5. BẢNG ÁNH XẠ THUẬT NGỮ RAG & CÔNG NGHỆ

| Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt Thống nhất |
| :--- | :--- |
| `RAG (Retrieval-Augmented Generation)` | **Hệ thống truy xuất bằng chứng** |
| `Document Ingestion` | **Tiếp nhận tài liệu** |
| `Embedding` | **Mã hóa văn bản thành vector** |
| `Vector Search` | **Tìm kiếm ngữ nghĩa** |
| `BM25 Lexical Search` | **Tìm kiếm theo từ khóa** |
| `Hybrid Retrieval` | **Truy xuất kết hợp** |
| `Reciprocal Rank Fusion (RRF)` | **Hợp nhất xếp hạng tương hỗ** |
| `Reranker` | **Bộ xếp hạng lại bằng chứng** |
| `Context Builder` | **Bộ xây dựng ngữ cảnh** |
| `Execution Trace` | **Nhật ký thực thi tác nhân** |
| `Knowledge Base` | **Cơ sở tri thức** |
| `Multi-Agent Orchestration` | **Điều phối đa tác nhân** |

---

## 6. DANH SÁCH 16 PHÂN HỆ & GIAO DIỆN ĐÃ ĐƯỢC VIỆT HÓA

1. **Khung điều hướng Sidebar & Topbar (`AppShell.tsx`):**
   - 4 khối điều hướng: Tổng quan hệ thống, Trung tâm phân tích AI, Các chiều đánh giá chuyên sâu, Tri thức & Báo cáo.
   - Các nhãn chuẩn: "Tổng quan", "Phân tích bài báo", "Kiểm chứng thông tin", "Giám sát AI", "Phân tích truyền thông", "Phân tích dư luận", "Niềm tin công chúng", "Tiếp nhận thông tin", "Kho bằng chứng", "Lịch sử phân tích", "Quản lý dữ liệu", "Báo cáo", "Cài đặt & Tài khoản".
   - Huy hiệu: "Cốt lõi AI", "Trực tiếp", "Hệ thống Đa tác nhân sẵn sàng".
2. **Cửa sổ Đăng nhập & Đăng ký (`AuthModal.tsx`):**
   - Nhãn form, placeholder, nút đăng nhập nhanh tài khoản Admin và Researcher bằng tiếng Việt.
3. **Cửa sổ Hồ sơ & Đổi mật khẩu (`ProfileModal.tsx`):**
   - Đổi thông tin họ tên, chức danh, mật khẩu và đăng xuất.
4. **Bảng điều khiển Tổng quan (`DashboardPage.tsx`):**
   - Thống kê thời gian thực, biểu đồ phân bố kết luận, phân tích đối sánh Cảm xúc vs Lập trường, bảng hoạt động gần đây với định dạng ngày giờ và phán quyết tiếng Việt.
5. **Trung tâm Phân tích Bài báo (`NewsAnalyzerPage.tsx`):**
   - 4 kịch bản mẫu kiểm thử 1-click (Bếp gas chạy bằng nước lã, Tin đồn vỡ đập thủy điện, Hủy thi tốt nghiệp THPT, EVN điều chỉnh giá điện).
   - Chọn chế độ dán văn bản hoặc trích xuất từ URL (chống SSRF).
   - Bảng tiến trình đa tác nhân thời gian thực (5 giai đoạn).
   - Tổng quan kiểm chứng toàn bài với 7 ô đếm kết luận và công thức độ chính xác minh bạch.
   - 6 tab phân tích chuyên sâu: Tổng hợp điều phối, Kiểm chứng tuyên bố, Độ tin cậy nguồn tin, Dư luận & Lập trường, Niềm tin & Tiếp nhận, Giám sát Đa tác nhân.
6. **Cơ sở Kiểm chứng Tuyên bố (`FactCheckingPage.tsx`):**
   - Bộ lọc phán quyết 7 trạng thái, ô tìm kiếm tuyên bố/bằng chứng, danh sách claim card với các slot thực thể (Chủ ngữ, Vị ngữ, Tân ngữ, Thời gian, Địa điểm, Số liệu).
7. **Phân tích Độ tin cậy Truyền thông (`MediaCredibilityPage.tsx`):**
   - Giải thích nguyên tắc độc lập giữa nguồn tin và phát ngôn, thang điểm 4 chiều (Minh bạch, Trích dẫn, Chứng cứ, Sửa sai) theo chuẩn NELA-GT.
8. **Phân tích Dư luận Xã hội (`PublicOpinionPage.tsx`):**
   - Công cụ phân tích bình luận tương tác tức thì, biểu đồ so sánh song song Cảm xúc vs Lập trường, phân tích sắc thái cảm xúc chi phối.
9. **Khảo sát Niềm tin Công chúng (`PublicTrustPage.tsx`):**
   - Quản lý khảo sát thực địa dân số WVS Wave 7, biểu đồ độ tin cậy theo nhóm tuổi, form đăng ký bộ khảo sát mới.
10. **Tiếp nhận Thông tin & Đọc hiểu (`InformationReceptionPage.tsx`):**
    - Chỉ số tiếp nhận MIND, độ hiểu thông điệp, tỷ lệ kiểm chứng trước chia sẻ, phân tích kháng cự nhận thức.
11. **Giám sát Đa tác nhân (`MultiAgentMonitorPage.tsx`):**
    - Sơ đồ luồng đồ thị đa tác nhân độc lập, bảng nhật ký thực thi chi tiết (Execution Traces) kèm độ trễ (ms) và danh mục mô hình AI (Model Catalog).
12. **Kho Bằng chứng Đối chứng (`EvidenceExplorerPage.tsx`):**
    - Tra cứu bằng chứng theo lập trường, kiểm thử truy xuất RAG Runner trực tiếp (BM25 + pgvector + RRF + BGE Reranker v2).
13. **Lịch sử Phân tích (`HistoryPage.tsx`):**
    - Bảng nhật ký có lọc trạng thái, phân trang, xem chi tiết và modal xác nhận xóa an toàn.
14. **Quản lý Dữ liệu Nghiên cứu (`DatasetsPage.tsx`):**
    - Danh mục 16 dataset nghiên cứu (ViFactCheck, X-FACT, FEVER, NELA-GT,...), modal thêm mới và chỉnh sửa metadata tiếng Việt.
15. **Trung tâm Báo cáo Nghiên cứu (`ReportsPage.tsx`):**
    - Lựa chọn báo cáo hoàn tất, tải dữ liệu JSON, CSV và xem bản in HTML/PDF.
16. **Mẫu Báo cáo HTML/PDF Xuất bản (`backend/app/api/v1/routes/reports.py`):**
    - Template HTML xuất bản chuẩn học thuật tiếng Việt với đầy đủ trích dẫn tuyên bố, bằng chứng độc lập, lập trường và khuyến cáo giới hạn nghiên cứu.

---

## 7. KẾT QUẢ KIỂM THỬ VÀ ĐỐI SOÁT

### 7.1. Kiểm thử Frontend (Vite + TypeScript)
```powershell
npm.cmd --prefix frontend run build
```
- **Kết quả:** `Exit code 0`.
- **Trạng thái:** 2233 module chuyển đổi thành công, hoàn toàn sạch lỗi TypeScript compile (`tsc -b`).

### 7.2. Kiểm thử Tác nhân Fact-Checking (Pytest)
```powershell
backend\.venv\Scripts\python -m pytest backend/tests/test_article_fact_checking.py -v
```
- **Kết quả:** `14 passed in 90.55s (100% Passed)`.
- **Nội dung kiểm định:**
  - `test_claim_supported`: PASSED.
  - `test_claim_refuted`: PASSED.
  - `test_claim_partially_supported`: PASSED.
  - `test_claim_misleading_in_synthesis`: PASSED.
  - `test_claim_not_enough_information`: PASSED.
  - `test_claim_conflicting_evidence_synthesis`: PASSED.
  - `test_claim_opinion_not_checkable`: PASSED.
  - `test_claim_prediction_not_checkable`: PASSED.
  - `test_statistical_claim_slots`: PASSED.
  - `test_quotation_claim_extraction`: PASSED.
  - `test_temporal_consistency_detection`: PASSED.
  - `test_causal_claim_extraction`: PASSED.
  - `test_media_credibility_decoupling`: PASSED.
  - `test_fact_checking_report_structure_and_formula`: PASSED.

---

## 8. KẾT LUẬN & BÀN GIAO

Dự án **TrustMedia AI** đã được chuẩn hóa Việt hóa toàn diện, đạt độ mượt mà cao về giao diện người dùng, chính xác về thuật ngữ chuyên môn khoa học truyền thông và bảo đảm nguyên tắc liêm chính học thuật:
- Tách bạch độc lập giữa việc kiểm chứng nội dung từng phát ngôn và uy tín của tòa soạn.
- Không để tồn tại bất kỳ nút bấm hay tiêu đề tiếng Anh nào trên các trang làm việc của người dùng.
- Sẵn sàng phục vụ nghiên cứu và đánh giá tin tức truyền thông số.
