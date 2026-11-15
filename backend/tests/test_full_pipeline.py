"""Comprehensive pipeline tests for News Analyzer, Multi-Agent, Security, and Analytics."""

import time
from fastapi.testclient import TestClient


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

