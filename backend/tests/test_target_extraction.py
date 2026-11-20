"""Unit and integration test suite for Task 1: Target Page Extraction and Versioning.

Verifies:
1. URL safe validation (SSRF defense, localhost blocking, public IP).
2. Metadata extraction (title, author, published date, final URL, source links).
3. Limited JS-rendered fallback (JSON-LD articleBody, Next.js hydration).
4. Paywall detection and Title-only status reporting.
5. Paragraph-level snapshot versioning (opening old versions when content changes).
"""

import uuid
from fastapi.testclient import TestClient
import pytest

from app.database.dependencies import get_db_session
from app.database.models import ArticleSnapshot
from app.main import app
from app.services.url_extractor import (
    detect_paywall,
    fetch_and_extract_article_details,
    parse_html_content,
    validate_url_safe,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_1_ssrf_safety_validation():
    """Verify that private, loopback, and internal IPs/protocols are strictly blocked."""
    with pytest.raises(ValueError, match="internal host address|forbidden private"):
        validate_url_safe("http://localhost:8000/api/v1/health")
    with pytest.raises(ValueError, match="internal host address|forbidden private"):
        validate_url_safe("http://127.0.0.1:5432")
    with pytest.raises(ValueError, match="Invalid URL protocol"):
        validate_url_safe("ftp://example.com/file.txt")


def test_2_parse_html_metadata_and_paragraphs():
    """Verify title, author, date, source links and paragraph breakdown from HTML."""
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Nghiên cứu an toàn hồ đập năm 2026</title>
        <meta name="author" content="Nguyễn Văn A">
        <meta property="article:published_time" content="2026-05-20T09:00:00+07:00">
    </head>
    <body>
        <main>
            <h1>Nghiên cứu an toàn hồ đập năm 2026</h1>
            <p>Hệ thống hồ chứa thủy điện miền Trung đang được kiểm soát kỹ thuật nghiêm ngặt theo quy chuẩn quốc gia.</p>
            <p>Các cảm biến quan trắc áp lực thân đập và lưu lượng xả lũ hoạt động liên tục 24/7 nhằm bảo đảm an toàn tuyệt đối cho người dân.</p>
            <p>Chi tiết báo cáo được đăng tải trên <a href="https://vkhthuyloi.vn/bao-cao-2026.pdf">Viện Khoa học Thủy lợi</a> để công chúng theo dõi.</p>
        </main>
    </body>
    </html>
    """
    parsed = parse_html_content(sample_html, "https://baochinhphu.vn/an-toan-dap.html")
    assert parsed["extraction_status"] == "SUCCESS"
    assert "Nghiên cứu an toàn hồ đập" in parsed["title"]
    assert parsed["author"] == "Nguyễn Văn A"
    assert parsed["published_date"] == "2026-05-20T09:00:00+07:00"
    assert len(parsed["paragraphs"]) >= 3
    assert len(parsed["source_links"]) == 1
    assert parsed["source_links"][0]["url"] == "https://vkhthuyloi.vn/bao-cao-2026.pdf"


def test_3_limited_js_rendered_fallback_json_ld():
    """Verify fallback extraction from JSON-LD schema when main DOM body is blank."""
    spa_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tin tức SPA chưa kết xuất</title>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": "Tiêu đề trích từ JSON-LD",
            "author": {"@type": "Person", "name": "Trần Thị B"},
            "datePublished": "2026-06-01T10:00:00Z",
            "articleBody": "Đoạn văn thứ nhất được khôi phục từ schema JSON-LD cho các trang Single Page Application.\\n\\nĐoạn văn thứ hai mô tả chi tiết nội dung phân tích mà JavaScript chưa kịp hiển thị trong mã HTML tĩnh ban đầu."
        }
        </script>
    </head>
    <body>
        <div id="root"></div>
    </body>
    </html>
    """
    parsed = parse_html_content(spa_html, "https://example.com/spa-post")
    assert parsed["extraction_status"] == "SUCCESS"
    assert "JSON-LD" in parsed["title"] or "SPA" in parsed["title"]
    assert parsed["author"] == "Trần Thị B"
    assert len(parsed["paragraphs"]) >= 2
    assert "Single Page Application" in parsed["body"]


def test_4_paywall_and_title_only_status():
    """Verify that paywall indicators and title-only states are correctly classified."""
    paywall_html = """
    <html>
    <head><title>Báo cáo kinh tế độc quyền</title></head>
    <body>
        <h1>Báo cáo kinh tế độc quyền</h1>
        <div class="paywall-overlay">
            <p>Bài viết dành riêng cho thành viên gói hội viên. Vui lòng đăng ký để đọc tiếp toàn bộ nội dung nghiên cứu.</p>
        </div>
    </body>
    </html>
    """
    parsed = parse_html_content(paywall_html, "https://example.com/premium-report")
    assert parsed["extraction_status"] == "PAYWALL_DETECTED"

    title_only_html = """
    <html>
    <head><title>Chỉ có tiêu đề bài báo</title></head>
    <body>
        <h1>Chỉ có tiêu đề bài báo</h1>
        <div id="ad-container"></div>
    </body>
    </html>
    """
    parsed_title = parse_html_content(title_only_html, "https://example.com/empty-article")
    assert parsed_title["extraction_status"] == "TITLE_ONLY_EXTRACTED"


def test_5_article_versioning_and_opening_old_version(client):
    """
    Verify that when article content is updated at the same URL:
    1. A new version snapshot (v2) is generated and saved.
    2. The previous snapshot (v1) remains intact and queryable via snapshots endpoint.
    """
    test_url = f"https://example.com/thoi-su/chinh-sach-moi-{uuid.uuid4().hex[:8]}.html"
    v1_text = (
        "Phiên bản ban đầu v1: Ban soạn thảo công bố dự thảo điều chỉnh khung giờ làm việc thử nghiệm. "
        "Số lượng cơ quan tham gia thí điểm là 15 đơn vị trong đợt đầu tiên."
    )
    # Submit v1
    resp1 = client.post(
        "/api/v1/analyzer/submit",
        json={
            "title": "Chính sách giờ làm việc (Bản v1)",
            "content": v1_text,
            "source_url": test_url,
            "language": "vi",
            "scope": "fact_checking",
        },
    )
    assert resp1.status_code == 202
    analysis_1_id = resp1.json()["id"]

    # Submit v2 (updated content at the same URL)
    v2_text = (
        "Phiên bản cập nhật v2: Cơ quan thẩm quyền chính thức công bố mở rộng phạm vi áp dụng cho 45 cơ quan. "
        "Các quy định mới về giám sát kỹ thuật đã được bổ sung hoàn chỉnh so với bản v1."
    )
    resp2 = client.post(
        "/api/v1/analyzer/submit",
        json={
            "title": "Chính sách giờ làm việc (Bản cập nhật v2)",
            "content": v2_text,
            "source_url": test_url,
            "language": "vi",
            "scope": "fact_checking",
        },
    )
    assert resp2.status_code == 202
    analysis_2_id = resp2.json()["id"]

    # Retrieve all snapshots for this URL
    snapshots_resp = client.get(f"/api/v1/analyzer/snapshots?url={test_url}")
    assert snapshots_resp.status_code == 200
    snaps = snapshots_resp.json()
    assert len(snaps) >= 2

    # Verify versions exist and old version v1 has its original text
    versions = [s["version"] for s in snaps]
    assert 1 in versions
    assert 2 in versions

    snap_v1 = next(s for s in snaps if s["version"] == 1)
    snap_v2 = next(s for s in snaps if s["version"] == 2)
    assert "Phiên bản ban đầu v1" in " ".join(snap_v1["paragraphs"])
    assert "Phiên bản cập nhật v2" in " ".join(snap_v2["paragraphs"])

    # Verify detail endpoint of analysis 1 still opens the exact v1 snapshot
    detail_1 = client.get(f"/api/v1/analyzer/{analysis_1_id}").json()
    assert detail_1["snapshot"] is not None
    assert detail_1["snapshot"]["version"] == 1
    assert "v1" in detail_1["snapshot"]["paragraphs"][0]
