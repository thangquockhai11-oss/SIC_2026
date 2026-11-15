# TrustMedia AI

TrustMedia AI là nền tảng nghiên cứu truyền thông số theo kiến trúc Modular Monolith. Hệ thống phân biệt kiểm chứng claim, độ tin cậy của nguồn và bài viết, ý kiến công chúng trong tập bình luận, niềm tin đo bằng khảo sát và khả năng tiếp nhận thông tin. AI hỗ trợ nghiên cứu; không kết luận tuyệt đối về độ tin cậy của nguồn tin hay cá nhân.

Trạng thái khởi tạo: API health/readiness, registry metadata của 16 dataset, Dashboard và Dataset Management. Chưa tải dữ liệu, chạy mô hình AI hoặc tạo kết quả nghiên cứu.

## Môi trường

- Python 3.12 trở lên.
- Node.js 20.19 trở lên.
- Docker Desktop với Linux containers đang chạy.

Kiểm tra nhanh công cụ bằng lệnh PowerShell: .\scripts\check_environment.cmd

## PostgreSQL và Redis

Tại thư mục gốc trong Windows PowerShell:

1. Sao chép cấu hình local: Copy-Item .env.example .env
2. Khởi chạy dịch vụ: docker compose up -d postgres redis
3. Xem trạng thái: docker compose ps

Credentials trong file mẫu chỉ dành cho phát triển local. Hãy thay đổi trước khi chia sẻ hoặc triển khai.

## Backend

Tại thư mục gốc:

1. Copy-Item backend/.env.example backend/.env
2. Set-Location backend
3. python -m venv .venv
4. .\.venv\Scripts\Activate.ps1
5. python -m pip install --upgrade pip
6. python -m pip install -e '.[dev]'
7. uvicorn app.main:app --reload

API ở http://localhost:8000; OpenAPI ở http://localhost:8000/docs.

- GET /api/v1/health kiểm tra API process.
- GET /api/v1/ready kiểm tra PostgreSQL và Redis; trả HTTP 503 nếu dependency chưa sẵn sàng.
- GET /api/v1/datasets đọc metadata registry, không tải nội dung dataset.

## Frontend

Mở terminal PowerShell khác tại thư mục gốc:

1. Copy-Item frontend/.env.local.example frontend/.env.local
2. Set-Location frontend
3. npm.cmd install
4. npm.cmd run dev

Mở http://localhost:5173. Dashboard và Dataset Management đọc dữ liệu từ API thật. Các số trên Dashboard chỉ đếm metadata, không phải kết quả nghiên cứu.

## Kiểm tra

Backend, từ thư mục backend: python -m pytest -q

Frontend, từ thư mục frontend: npm.cmd run build

Xem docs/PROJECT_PLAN.md và docs/ARCHITECTURE.md để biết module, milestone và tiêu chí nghiệm thu.
