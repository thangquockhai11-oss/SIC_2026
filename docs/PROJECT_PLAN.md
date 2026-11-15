# TrustMedia AI — Project Plan

## Mục tiêu

Xây dựng nền tảng nghiên cứu truyền thông số có thể tái lập, hỗ trợ phân tích claim/evidence, nguồn và bài viết, ý kiến thể hiện trong tập bình luận, niềm tin đo bằng khảo sát, và khả năng tiếp nhận thông tin. Hệ thống biểu đạt provenance, độ bất định và giới hạn dữ liệu; không coi mạng xã hội là mẫu đại diện dân số.

## Kiến trúc và module

Modular Monolith: FastAPI/Pydantic, SQLAlchemy/PostgreSQL + pgvector, Redis và worker trong một backend; React/TypeScript dùng chung API. Flutter được hoãn tới khi API ổn định. Mô hình và agent được bổ sung theo milestone. Tác vụ AI dài không chạy đồng bộ trong request HTTP.

| Module | Trách nhiệm |
| --- | --- |
| API/core | HTTP contract, validation, settings, logging và readiness |
| Database | PostgreSQL, migrations, quan hệ, indexes và pgvector |
| Dataset registry | Metadata nguồn, phiên bản, giấy phép, ngôn ngữ, labels và preprocessing |
| Articles/retrieval | Trích xuất URL an toàn SSRF, claims, evidence và provenance |
| Agents | Fact-checking, media credibility, public opinion, public trust, information reception |
| Graph/meta-agent | Điều phối, bất đồng, evidence, abstention và consensus |
| Workers | Tác vụ dài, retry giới hạn, trạng thái |
| Frontend | Dashboard, analyzer, evidence, monitor, reports, history, dataset management |
| ML/research | Loaders, baselines, evaluation, calibration, ablation |
| Mobile | Flutter client dùng API chung sau khi contract ổn định |

## Milestones và tiêu chí nghiệm thu

### M0 — Project initialization
- Backend/frontend, environment, Compose, README và tài liệu kiến trúc.
- Health/readiness, registry metadata, dashboard và trang dataset gọi API thật.
- Backend tests và frontend production build chạy được.
- Không tải data tự động, lưu secret trong Git hoặc tạo số liệu AI giả.

### M1 — Database & Dataset Registry
- SQLAlchemy 2.x models, Alembic migrations up/down và ERD.
- CRUD metadata có validation, UUID, UTC timestamps, provenance và chính sách xóa.
- Dataset ở trạng thái UNVERIFIED cho tới khi xác minh license/schema/terms của đúng artifact.
- API/database tests dùng PostgreSQL thực tế.

### M2 — NLP baseline
- Loader/preprocessing có cấu hình; không tải dữ liệu lớn khi setup.
- Baseline fact-checking, sentiment và stance giữ tách biệt.
- Evaluation ghi split, seed, metrics, model/version và config.

### M3 — Specialized agents
- Mỗi agent có input/output schema, nhiệm vụ giới hạn, provenance và tests.
- Public trust chỉ dựa trên survey, không suy đoán từ bình luận.

### M4 — RAG & multi-agent
- Retrieval/reranking có provenance; chống prompt injection và SSRF.
- LangGraph điều phối; meta-agent phát hiện bất đồng/phụ thuộc và có thể abstain.
- EWAC là giả thuyết cho tới khi có thực nghiệm hợp lệ.

### M5 — Backend completion
- Authentication/authorization, worker, report, rate limits, timeouts và structured logging.
- Analysis dài trả HTTP 202 cùng ID; theo dõi trạng thái độc lập.

### M6 — Web application
- Analyzer, evidence explorer, agent monitor, reports, history và settings.
- Có loading/empty/error states; nêu giới hạn và phân biệt demo với kết quả thực.

### M7 — Mobile
- Flutter dùng chung API sau khi contract ổn định.

### M8 — Scientific evaluation
- Benchmark, ablation, cross-domain, robustness, calibration và human evaluation.
- So sánh single-agent, majority, static weights, EWAC và EWAC with abstention.
- Không tuyên bố EWAC tốt hơn nếu chưa có bằng chứng.

### M9 — Deployment & documentation
- CI/CD, security checks, triển khai theo môi trường, tài liệu vận hành và báo cáo khoa học.

## Dependencies

Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, psycopg 3, Alembic và Redis client. Node.js 20.19+, React, TypeScript strict và Vite. Docker Compose, PostgreSQL 18 + pgvector, Redis 8. AI packages được chọn ở milestone tương ứng sau khi xác nhận tương thích và yêu cầu phần cứng.

## Tiêu chí nghiệm thu xuyên suốt

- API schema/status errors có tài liệu và tests.
- Migrations chạy mới và rollback hợp lý trên PostgreSQL.
- Metadata có provenance, license/version/split/preprocessing; không tự xác nhận license.
- Source credibility khác claim correctness; sentiment khác stance; public trust chỉ từ survey.
- Không đưa credentials vào Git; URL fetching phải chống SSRF.
- Metrics nghiên cứu gắn dataset/model/split/config; không bịa benchmark.
- README phản ánh đúng lệnh đã kiểm chứng trên môi trường đích.
