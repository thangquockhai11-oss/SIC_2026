# BÁO CÁO TOÀN DIỆN KIỂM TOÁN HỆ THỐNG NLP & KIẾN TRÚC TRUSTMEDIA AI
**Tài liệu chuẩn hóa kiểm toán kỹ thuật — TrustMedia AI**
**Ngày lập:** 24/11/2026 | **Phiên bản:** v2.4-Production

---

## 1. TỔNG QUAN HỆ THỐNG VÀ BẢNG PHÂN LOẠI CÔNG NGHỆ CÁC MODULE

Bảng dưới đây thống kê và phân loại thực trạng kỹ thuật của từng module trong toàn bộ hệ sinh thái TrustMedia AI theo chuẩn phân loại nghiêm ngặt:

| Module | Công nghệ cốt lõi | Model / Thuật toán hiện tại | Trạng thái kỹ thuật | Đánh giá & Rủi ro |
|---|---|---|---|---|
| **Claim Extraction** | Spacy Tiếng Việt + Phân tích Cú pháp Regex nâng cao + Phân giải quan hệ | Hybrid (Rule + Regex 11 slots + PhoBERT Intent) | `REAL_MODEL_INTEGRATED` | Trích xuất chuẩn xác 11 thuộc tính, lọc triệt để boilerplate, liên kết anchor tiêu đề. |
| **Claim Type Classification** | PhoBERT Multi-class Fine-tuned & Epistemic Classifier | `vinai/phobert-base-v2` fine-tuned (checkpoint `ml/weights/claim_classifier_best.pt`) | `REAL_MODEL_INTEGRATED` | Phân loại 7 nhãn claim taxonomy, tách bạch ý kiến (Opinion) và sự kiện kiểm chứng. |
| **Article Fidelity Alignment** | Semantic Vector Cosine + 8 Distortion Detectors | Cross-Attribute Comparator + SentenceTransformer | `REAL_MODEL_INTEGRATED` | Phát hiện 8 dạng sai lệch: số liệu, đơn vị, thời gian, thực thể, nhân quả, phủ định, cường điệu. |
| **Evidence Query Planner** | Dual-perspective Query Generation + Gemini 2.5 Flash | Multi-query Planner (Verbatim, Support, Refute, Event, Raw data) | `API_MODEL_INTEGRATED` | Tự động tạo truy vấn đối lập để tìm kiếm cả chứng cứ phản bác lẫn ủng hộ. |
| **Hybrid Evidence Retrieval** | BM25 Okapi + Dense Vector Search + pgvector | `bkai-foundation-models/vietnamese-bi-encoder` + SQLite/PGVector FTS | `REAL_MODEL_INTEGRATED` | Truy xuất đa tầng, tính hợp song song từ ViFactCheck, ViWiki, X-FACT, FEVER và Web live. |
| **Neural Evidence Reranking** | Cross-Encoder Deep Scoring | `BAAI/bge-reranker-v2-m3` | `REAL_MODEL_INTEGRATED` | Tính điểm cross-attention thực tế giữa claim và chứng cứ, triệt tiêu false positives. |
| **Claim-Evidence Cross-Verification** | 15-Dimension Fine-grained Cross-Comparator | `evidence_cross_comparator.py` (Subject, Numbers, Time, Negation, Causality...) | `REAL_MODEL_INTEGRATED` | Lập ma trận đối chiếu 15 chiều, không dựa vào keyword similarity đơn thuần. |
| **NLI & Stance Verifier** | DeBERTa-v3 / PhoBERT Cross-Stance Inference | Fine-tuned NLI Engine (`vinai/phobert-base-v2`) | `REAL_MODEL_INTEGRATED` | Suy luận 3 nhãn SUPPORTS / REFUTES / NOT_ENOUGH_INFORMATION, hiệu chuẩn nhiệt độ. |
| **Source Independence Clustering** | Graph & Content Fingerprinting + Domain Analysis | MinHash / URL Syndication Clustering | `REAL_MODEL_INTEGRATED` | Phát hiện bài viết lấy lại từ thông tấn xã (AP, AFP, TTXVN), gom cụm chống đếm trùng. |
| **Verdict Synthesis & IFCN Gap** | 7-Label Epistemic Decision Engine | Decisive Rule + Gemini NLP Bayesian Posterior | `REAL_MODEL_INTEGRATED` | Tổng hợp phán quyết 7 nhãn, bảo lưu CHƯA ĐỦ THÔNG TIN khi không có chứng cứ thực nghiệm. |
| **Article URL Web Scraper** | Trafilatura + BeautifulSoup4 + Anti-Bot SSRF Guard | Multi-engine Extractor + MSN SPA Syndication recovery | `REAL_MODEL_INTEGRATED` | Trích xuất sạch nội dung bài báo, chặn IP nội bộ/SSRF, trả lỗi tiếng Việt sư phạm. |

---

## 2. KHOẢNG CÁCH GIỮA CODE TRUYỀN THỐNG VÀ MÔ HÌNH NLP THỰC TẾ

1. **Trước khi nâng cấp:**
   - Việc kiểm tra claim từng phụ thuộc vào việc tìm kiếm từ khóa tương đồng (keyword match) hoặc tính độ tương đồng cosine giữa vector embedding toàn câu bài báo.
   - Dẫn đến lỗi nghiêm trọng: Tài liệu nhắc đến cùng địa danh (ví dụ "Đỉnh Fansipan") hoặc nhân vật thể thao (ví dụ "Javier Tebas") bị model kết luận là "ỦNG HỘ" cho claim (ví dụ "Simeone lập kỷ lục" hoặc "Người ngoài hành tinh đổ bộ").
2. **Sau khi tái cấu trúc NLP Foundation:**
   - Tách rời hoàn toàn **Độ tương đồng ngữ nghĩa (Semantic Similarity)** khỏi **Xác thực chân lý thực tế (Fact-Checking Grounding)**.
   - Thẩm định 2 pha độc lập:
     - **Pha A (Article Fidelity):** Kiểm tra claim bóc tách có trung thực với ngữ cảnh bài báo gốc không.
     - **Pha B (External Evidence Cross-Verification):** Kiểm tra claim bài báo có được tài liệu độc lập chứng minh không.
   - Triệt để loại bỏ bằng chứng lạc đề (`IRRELEVANT`), không đếm số lượng tài liệu copy lại từ một hãng tin, và bắt buộc trả về `NOT_ENOUGH_INFORMATION` nếu không có tài liệu đối chứng.

---

## 3. CHỈ TIÊU KHOA HỌC VÀ AN TOÀN ĐƯỢC BẢO ĐẢM

- **Chống ảo giác (Anti-Hallucination):** Không bịa đặt đường dẫn trích dẫn (`evidence_url = None` khi thiếu chứng cứ).
- **Phân định rõ ràng:** Quan hệ nhân quả (Causation) không được đánh tráo với tương quan thống kê (Correlation).
- **Phân tách thực thể:** Phát hiện sai lệch số liệu (50% vs 20%), thời gian (2025 vs 2026), và phủ định (Không có bằng chứng vs Có bằng chứng).

