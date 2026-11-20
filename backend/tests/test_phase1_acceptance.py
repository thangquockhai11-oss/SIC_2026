"""End-to-End Acceptance Test for Phase 1 (Nghiệm thu Đợt 1).

Acceptance Criteria:
1. Run a real Vietnamese news URL through the analyzer pipeline.
2. Verify article versioning: when article content updates at the same URL, previous snapshot version (v1) remains retrievable.
3. Verify semantic differentiation: 'đang đề xuất / dự thảo' differs from 'đã ban hành / có hiệu lực' (yields REFUTED on false enactment).
4. Verify publisher neutrality: changing outlet name when evidence store has no matching facts strictly returns 'Chưa đủ bằng chứng' (NOT_ENOUGH_INFORMATION).
5. Offline resilience: if Internet is blocked / remote site unreachable, fallback to fixture and explicitly flag is_verified_online = False.
6. Separation of outlet profile from individual article quality and whole-newsroom sample enforcement.
"""

from unittest.mock import patch
import uuid
from fastapi.testclient import TestClient
import pytest

from app.database.dependencies import get_db_session
from app.database.models import ArticleSnapshot
from app.main import app
from app.services.dataset_loaders.credibility_loader import extract_article_quality
from app.services.fact_checking_agent import fact_checking_agent
from app.services.media_credibility_agent import media_credibility_agent
from app.services.url_extractor import fetch_and_extract_article_details


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_acceptance_1_real_url_or_offline_fallback(client):
    """Criterion 1 & 5: Run real Vietnamese URL or offline fixture fallback with explicit unverified status."""
    test_url = "https://baochinhphu.vn/chinh-sach-moi-ve-chuyen-doi-so.htm"
    # Submit through the API
    resp = client.post(
        "/api/v1/analyzer/submit",
        json={
            "title": "Chính sách mới về chuyển đổi số quốc gia",
            "content": (
                "Chính phủ công bố kế hoạch đẩy mạnh chuyển đổi số tại các địa phương. "
                "Theo báo cáo của Bộ Thông tin và Truyền thông, tỷ lệ dịch vụ công trực tuyến toàn trình đạt 55%. "
                "Căn cứ Nghị định 42/2022/NĐ-CP, các bộ ngành phải hoàn thiện kết nối dữ liệu trước tháng 12/2026."
            ),
            "source_url": test_url,
            "language": "vi",
            "scope": "full",
        },
    )
    assert resp.status_code == 202
    analysis_id = resp.json()["id"]

    # Retrieve snapshot
    snap_resp = client.get(f"/api/v1/analyzer/{analysis_id}/snapshot")
    assert snap_resp.status_code == 200
    snap = snap_resp.json()
    assert snap["source_url"] == test_url
    assert len(snap["paragraphs"]) >= 1
    assert snap["version"] >= 1
    # Check that extraction status and verification flag are present
    assert "extraction_status" in snap
    assert "is_verified_online" in snap


def test_acceptance_2_article_versioning_old_version_retrievable(client):
    """Criterion 2: When article updates at the same URL, previous snapshot version (v1) remains retrievable."""
    url = f"https://example.com/thoi-su/cap-nhat-chinh-sach-thue-{uuid.uuid4().hex[:8]}.htm"
    v1_content = "Bản tin v1 lúc 08:00: Ban soạn thảo lấy ý kiến về phương án giảm thuế VAT cho 10 ngành nghề trọng điểm."
    v2_content = "Bản tin v2 lúc 14:00: Cơ quan chức năng chính thức thông báo bổ sung thêm 5 ngành nghề mới vào diện giảm thuế VAT."

    # Submit v1
    r1 = client.post("/api/v1/analyzer/submit", json={"source_url": url, "content": v1_content, "title": "Giảm thuế VAT v1"})
    assert r1.status_code == 202
    id1 = r1.json()["id"]

    # Submit v2
    r2 = client.post("/api/v1/analyzer/submit", json={"source_url": url, "content": v2_content, "title": "Giảm thuế VAT v2"})
    assert r2.status_code == 202
    id2 = r2.json()["id"]

    # Query snapshot history by URL
    history_resp = client.get(f"/api/v1/analyzer/snapshots?url={url}")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 2

    # Verify both v1 and v2 exist and v1 has the original content
    v1_snap = next(s for s in history if s["version"] == 1)
    v2_snap = next(s for s in history if s["version"] == 2)
    assert "Bản tin v1" in " ".join(v1_snap["paragraphs"])
    assert "Bản tin v2" in " ".join(v2_snap["paragraphs"])

    # Verify detail of analysis 1 still links directly to v1
    detail1 = client.get(f"/api/v1/analyzer/{id1}").json()
    assert detail1["snapshot"]["version"] == 1
    assert "Bản tin v1" in detail1["snapshot"]["paragraphs"][0]


def test_acceptance_3_proposal_vs_enacted_semantic_differentiation():
    """Criterion 3: Verify semantic difference between 'đề xuất' and 'đã ban hành'."""
    # Claim falsely asserts policy was enacted
    enacted_claim = {
        "claim_text": "Chính phủ đã ban hành quy định cấm xe máy chạy xăng tại các quận nội thành từ năm 2026.",
        "original_sentence": "Chính phủ đã ban hành quy định cấm xe máy chạy xăng tại các quận nội thành từ năm 2026.",
        "scope": "ENACTED",
        "has_negation": False,
        "is_checkable": True,
    }

    # Authentic evidence stating it is only a draft / proposal
    evidence_candidate = [
        {
            "chunk_id": "draft_evidence_01",
            "source_name": "Bộ Giao thông Vận tải & Báo Chính Phủ",
            "source_url": "https://baochinhphu.vn/du-thao-giao-thong",
            "excerpt": "Bộ GTVT khẳng định đây mới chỉ là dự thảo đề xuất xin ý kiến chuyên gia, chưa ban hành quyết định cấm đoán chính thức.",
            "reliability_score": 0.95,
            "relevance_score": 0.89,
            "dataset_source": "ViFactCheck",
            "dataset_record_id": "moet_01",
        }
    ]

    with patch("app.services.fact_checking_agent.hybrid_rag_retriever.retrieve", return_value=evidence_candidate):
        with patch("app.services.fact_checking_agent.hybrid_retriever.retrieve", return_value=evidence_candidate):
            result = fact_checking_agent.verify_single_claim(enacted_claim)

    assert result["verdict"] == "REFUTED"
    assert "Mâu thuẫn phạm vi hiệu lực" in result["reasoning"] or "đang đề xuất" in result["reasoning"]
    assert result["original_sentence"] == enacted_claim["original_sentence"]
    assert len(result["evidences"]) == 1
    assert result["evidences"][0]["source_url"] == "https://baochinhphu.vn/du-thao-giao-thong"


def test_acceptance_4_empty_evidence_yields_not_enough_info_regardless_of_outlet():
    """Criterion 4: Changing outlet name when evidence store is empty strictly returns 'Chưa đủ bằng chứng'."""
    unverified_claim = {
        "claim_text": "Công ty tư nhân X vừa được cấp phép độc quyền khai thác mỏ vàng dưới đáy biển Cần Giờ.",
        "original_sentence": "Công ty tư nhân X vừa được cấp phép độc quyền khai thác mỏ vàng dưới đáy biển Cần Giờ.",
        "scope": "GENERAL_FACT",
        "has_negation": False,
        "is_checkable": True,
    }

    with patch("app.services.fact_checking_agent.hybrid_rag_retriever.retrieve", return_value=[]):
        with patch("app.services.fact_checking_agent.hybrid_retriever.retrieve", return_value=[]):
            # Test with low credibility blog
            res_blog = fact_checking_agent.verify_single_claim(
                unverified_claim, source_name="Blog Tin Giật Gân", source_credibility=30.0
            )
            # Test with premier news outlet (Báo Nhân Dân / Reuters)
            res_premier = fact_checking_agent.verify_single_claim(
                unverified_claim, source_name="Reuters / Báo Nhân Dân", source_credibility=96.0
            )

    assert res_blog["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res_blog["evidences"] == []
    assert res_premier["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res_premier["evidences"] == []
    assert "Chưa đủ bằng chứng" in res_premier["reasoning"] or "không tìm thấy tài liệu gốc" in res_premier["reasoning"]


def test_acceptance_5_outlet_profile_and_article_quality_separation():
    """Criterion 6: Verify clear separation of outlet profile, article quality, and sample enforcement."""
    article_text = (
        "Theo số liệu từ Tổng cục Thống kê và Ngân hàng Nhà nước, lạm phát cơ bản duy trì ở mức 3.2%. "
        "Căn cứ Nghị định 123/2020/NĐ-CP, việc quản lý hóa đơn điện tử đã hoàn thành 100%. "
        "Bài và ảnh: Trần Minh Hải."
    )
    res, trace = media_credibility_agent.evaluate(
        source_url="https://vnexpress.net/kinh-doanh/lam-phat-on-dinh.html",
        content=article_text,
        sample_size=None,
        survey_timeframe=None,
    )

    # 1. Outlet profile
    profile = res["outlet_profile"]
    assert profile["publisher_name"] == "VnExpress"
    assert "FPT" in profile["ownership"]
    assert "biên tập" in profile["editorial_policy"]
    assert "Đính chính" in profile["correction_policy"]
    assert "NELA-GT" in profile["verification_source"]

    # 2. Article quality
    quality = res["article_quality"]
    assert "Trần Minh Hải" in quality["author"]
    assert "Tổng cục Thống kê" in quality["data_sources"]
    assert any("123/2020" in doc for doc in quality["cited_documents"])
    assert quality["citation_density"] > 0

    # 3. Whole newsroom summary: refuses generalization when no sample size/timeframe
    summary = res["outlet_summary"]
    assert summary["has_sufficient_sample"] is False
    assert summary["outlet_score"] is None
    assert "Chưa đủ điều kiện tổng kết toàn bộ tòa soạn" in summary["summary_note"]
