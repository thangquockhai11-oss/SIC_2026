"""Comprehensive pipeline tests for News Analyzer, Multi-Agent, Security, and Analytics."""

import time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
import httpx


def test_ssrf_protection_rejects_internal_urls(client: TestClient) -> None:
    # 1. Localhost must be rejected
    resp1 = client.post(
        "/api/v1/analyzer/submit",
        json={"source_url": "http://localhost:8080/admin", "language": "vi"},
    )
    assert resp1.status_code == 400
    assert "SSRF" in resp1.json()["detail"] or "forbidden" in resp1.json()["detail"]

    # 2. 127.0.0.1 must be rejected
    resp2 = client.post(
        "/api/v1/analyzer/submit",
        json={"source_url": "http://127.0.0.1/private", "language": "vi"},
    )
    assert resp2.status_code == 400


def test_news_analyzer_and_analytics_pipeline(client: TestClient) -> None:
    # 1. Submit text content for analysis
    sample_text = (
        "Cảnh báo bão số 9 giật cấp 15 đang tiến vào vùng biển miền Trung. "
        "Ban chỉ huy Phòng chống thiên tai khẳng định đã cấm biển từ trưa nay và yêu cầu toàn bộ tàu thuyền vào nơi trú ẩn. "
        "Người dân cần theo dõi thông báo chính thức và dự trữ nhu yếu phẩm cần thiết."
    )
    submit_resp = client.post(
        "/api/v1/analyzer/submit",
        json={
            "title": "Cảnh báo khẩn cấp diễn biến bão số 9",
            "content": sample_text,
            "language": "vi",
            "scope": "full",
        },
    )
    assert submit_resp.status_code == 202
    job_id = submit_resp.json()["id"]
    assert submit_resp.json()["status"] == "PROCESSING"

    # 2. Poll job status
    status_resp = client.get(f"/api/v1/analyzer/jobs/{job_id}")
    assert status_resp.status_code == 200

    # 3. Retrieve full analysis detail
    detail_resp = client.get(f"/api/v1/analyzer/{job_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == job_id
    assert "claims" in detail
    assert "credibility" in detail
    assert "opinion" in detail
    assert "survey" in detail
    assert "reception" in detail
    assert "agent_executions" in detail

    # 4. Check history listing
    history_resp = client.get("/api/v1/history", params={"q": "bão số 9"})
    assert history_resp.status_code == 200
    assert history_resp.json()["total"] >= 1

    # 5. Check dashboard stats
    stats_resp = client.get("/api/v1/dashboard/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_analyses"] >= 1
    assert "sentiment_distribution" in stats
    assert "stance_distribution" in stats
    assert len(stats["chart_data"]) == 4

    # 6. Check evidence explorer
    ev_resp = client.get("/api/v1/evidence")
    assert ev_resp.status_code == 200
    assert "items" in ev_resp.json()

    # 7. Ad-hoc opinion analysis
    op_resp = client.post(
        "/api/v1/opinion/analyze",
        json={
            "topic": "Đánh giá bão số 9",
            "comments": [
                "Mong bão tan nhanh ngoài biển cho bà con đỡ khổ.",
                "Cần chuẩn bị kỹ đèn pin và nước sạch.",
            ],
        },
    )
    assert op_resp.status_code == 200
    assert "sentiment_positive" in op_resp.json()
    assert "stance_oppose" in op_resp.json()

    # 8. Report JSON export
    rep_resp = client.get(f"/api/v1/reports/{job_id}/export", params={"format": "json"})
    assert rep_resp.status_code == 200
    assert rep_resp.json()["report_id"] == job_id


def test_url_extraction_ssl_verification_fallback() -> None:
    from app.services.url_extractor import fetch_and_extract_article

    call_count = 0

    def mock_get(url: str, headers: dict[str, str]) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise httpx.ConnectError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1010)")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.is_redirect = False
        mock_resp.headers = {"content-type": "text/html; charset=utf-8"}
        mock_resp.content = (
            b"<html><head><title>Test Academic Article</title></head>"
            b"<body><h1>Tap chi Khoa hoc Ngoai ngu so 78</h1>"
            b"<p>Day la doan van thu nhat cua bai bao nghien cuu ngon ngu rat chi tiet.</p>"
            b"<p>Day la doan van thu hai mo ta phuong phap giang day va ket qua thuc nghiem.</p></body></html>"
        )
        mock_resp.text = mock_resp.content.decode("utf-8")
        mock_resp.encoding = "utf-8"
        return mock_resp

    with patch("httpx.Client") as mock_client_cls:
        client_instance = MagicMock()
        client_instance.get.side_effect = mock_get
        mock_client_cls.return_value.__enter__.return_value = client_instance

        with patch("app.services.url_extractor.validate_url_safe", return_value="https://tapchikhoahoc.hanu.edu.vn/article/78"):
            title, body = fetch_and_extract_article("https://tapchikhoahoc.hanu.edu.vn/article/78")
            assert call_count == 2
            assert "Tap chi Khoa hoc Ngoai ngu so 78" in title
            assert len(body) > 50


