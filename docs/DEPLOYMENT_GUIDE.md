# HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH HỆ THỐNG TRUSTMEDIA AI (DEPLOYMENT GUIDE)
**Tài liệu hướng dẫn cài đặt môi trường, chạy kiểm thử, khởi chạy backend và frontend**

---

## 1. YÊU CẦU HỆ THỐNG (SYSTEM REQUIREMENTS)

- **Hệ điều hành:** Linux (Ubuntu 20.04+ / Debian 11+), macOS (Apple Silicon M-series hoặc Intel), hoặc Windows 10/11 x64.
- **Python:** Python 3.10, 3.11 hoặc 3.12 (khuyến nghị Python 3.12).
- **Node.js:** Node.js v18.0.0+ hoặc v20.0.0+ và npm.
- **Phần cứng:**
  - Tối thiểu: 8 GB RAM, 4 CPU cores, 10 GB dung lượng ổ cứng trống.
  - Khuyến nghị: 16 GB RAM, GPU NVIDIA (VRAM $\ge 6$ GB) hỗ trợ CUDA 12.x để tăng tốc độ inference.

---

## 2. HƯỚNG DẪN CÀI ĐẶT MÔI TRƯỜNG

### 2.1. Backend (Python FastAPI):
```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo và kích hoạt môi trường ảo
python -m venv .venv

# Trên Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Trên Linux/macOS:
source .venv/bin/activate

# Cài đặt các thư viện phụ thuộc
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.2. Frontend (React / Vite / TypeScript):
```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
npm install
```

---

## 3. CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)

Tạo file `.env` tại thư mục gốc `backend/.env` với các tham số mẫu:
```ini
# Backend Environment Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///./trustmedia.db

# LLM & API Keys (Tùy chọn cho phân tích sâu)
GEMINI_API_KEY=your_gemini_api_key_here

# NLP & ML Cache Settings
TRANSFORMERS_CACHE=./.cache/huggingface
TORCH_DEVICE=cuda  # hoặc "cpu" nếu không có GPU NVIDIA
```

---

## 4. CHẠY KIỂM THỬ HỆ THỐNG (TEST SUITE EXECUTION)

Trước khi khởi chạy production, thực thi toàn bộ test suite để đảm bảo không có lỗi hồi quy:

```bash
# Kích hoạt virtualenv
cd backend

# Chạy toàn bộ 38 ca kiểm thử hồi quy và đối chiếu thực nghiệm
.\.venv\Scripts\python.exe -m pytest tests/test_article_fact_checking.py tests/test_cross_verification_benchmark.py tests/test_url_extractor.py tests/test_mandatory_verification_cases.py -v
```

**Kỳ vọng kết quả:** `38 passed in ~13s`.

---

## 5. KHỞI CHẠY DỊCH VỤ (SERVICE STARTUP)

### 5.1. Khởi động Backend API Server:
```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs tương tác: `http://localhost:8000/docs`
- Healthcheck endpoint: `http://localhost:8000/health`

### 5.2. Khởi động Frontend Web Application:
```bash
cd frontend
npm run dev
```
- Ứng dụng web giao diện người dùng: `http://localhost:5173`
- Bản build sản phẩm:
```bash
npm run build
```

---

## 6. KHẮC PHỤC SỰ CỐ PHỔ BIẾN (TROUBLESHOOTING)

1. **Lỗi SSRF / Không lấy được URL bài báo:**
   - Đảm bảo URL bài báo là đường dẫn công khai trên internet.
   - Các địa chỉ nội bộ (`localhost`, `127.0.0.1`, `192.168.x.x`) sẽ bị hệ thống chặn vì lý do bảo mật.
2. **Lỗi `Request failed with status code 400`:**
   - Xảy ra khi URL không thể truy cập hoặc trang web yêu cầu xác thực đăng nhập trả phí (Paywall).
   - Hệ thống hỗ trợ chế độ dán trực tiếp nội dung văn bản (Raw Text Mode) trên giao diện.
3. **Cảnh báo thiếu thư viện trong IDE (VS Code Pylance Red squigglies):**
   - Đã được cấu hình chuẩn tại `.vscode/settings.json` và `pyrightconfig.json` với `extraPaths: ["backend"]`.
   - Đảm bảo đã chọn đúng Python Interpreter tại đường dẫn `backend/.venv/Scripts/python.exe`.

