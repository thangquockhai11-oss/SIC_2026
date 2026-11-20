"""Unit & Integration Tests for Task 3: Media Credibility Separation.

Verifies:
1. Separation of outlet profile (ownership, editorial policy, correction policy, verification source) from article quality.
2. Article-level quality extraction: author, data sources, cited documents, citation density, and sensationalism.
3. Strict enforcement: Whole newsroom summary is ONLY provided when article sample size and survey timeframe are explicitly specified.
"""

from app.services.dataset_loaders.credibility_loader import extract_article_quality
from app.services.media_credibility_agent import media_credibility_agent


def test_1_outlet_profile_metadata_separation():
    """Verify outlet profile contains ownership, editorial policy, correction policy, and verification source."""
    sample_content = "Nội dung bài viết báo cáo tiến độ kinh tế quý 1."
    res, trace = media_credibility_agent.evaluate(
        source_url="https://baochinhphu.vn/kinh-te/tang-truong-gdp.htm",
        content=sample_content,
    )

    profile = res.get("outlet_profile")
    assert profile is not None
    assert profile["publisher_name"] == "Báo điện tử Chính phủ"
    assert "Chính phủ" in profile["ownership"]
    assert profile["editorial_policy"] is not None and len(profile["editorial_policy"]) > 10
    assert profile["correction_policy"] is not None and len(profile["correction_policy"]) > 10
    assert "NELA-GT" in profile["verification_source"] or "Bộ TT&TT" in profile["verification_source"]


def test_2_article_level_quality_author_data_sources_and_cited_documents():
    """Verify article-level extraction of author, cited statistics/regulatory bodies, and official documents."""
    article_text = (
        "Theo thông báo của Tổng cục Thống kê và Bộ Tài chính, thu ngân sách nhà nước tăng trưởng ổn định. "
        "Căn cứ Nghị định 15/2020/NĐ-CP và Quyết định 88/QĐ-TTg, các bộ ngành đã ban hành kế hoạch cụ thể. "
        "Bài và ảnh: Nguyễn Văn An."
    )
    quality = extract_article_quality(article_text)

    # Verify author
    assert "Nguyễn Văn An" in quality["author"]

    # Verify data sources identified
    assert "Tổng cục Thống kê" in quality["data_sources"]
    assert "Bộ Tài chính" in quality["data_sources"]

    # Verify cited documents extracted
    assert any("15/2020" in doc for doc in quality["cited_documents"])
    assert any("88/QĐ-TTg" in doc for doc in quality["cited_documents"])

    # Verify citation density
    assert quality["citation_density"] > 0.0

    # Verify sensationalism is objective
    assert "trung lập" in quality["sensationalism_assessment"].lower()


def test_3_outlet_summary_refuses_generalization_without_sample_and_timeframe():
    """Verify that analyzing an isolated article WITHOUT sample size/timeframe does NOT score the whole outlet."""
    content = "Một bài viết đơn lẻ phản ánh tình hình giao thông tại đô thị."
    res, trace = media_credibility_agent.evaluate(
        source_url="https://vnexpress.net/thoi-su/giao-thong-ha-noi.html",
        content=content,
        sample_size=None,
        survey_timeframe=None,
    )

    summary = res["outlet_summary"]
    assert summary["has_sufficient_sample"] is False
    assert summary["outlet_score"] is None
    assert "Chưa đủ điều kiện tổng kết toàn bộ tòa soạn" in summary["summary_note"]
    assert "mẫu bài và khung thời gian" in summary["summary_note"]


def test_4_outlet_summary_provides_score_when_sample_and_timeframe_specified():
    """Verify that whole-outlet summary is computed when explicit sample size and observation timeframe are provided."""
    content = "Khảo sát chuyên đề về chuyển đổi số ngành thuế."
    res, trace = media_credibility_agent.evaluate(
        source_url="https://vnexpress.net/so-hoa/chuyen-doi-so.html",
        content=content,
        sample_size=120,
        survey_timeframe="2024-2026",
    )

    summary = res["outlet_summary"]
    assert summary["has_sufficient_sample"] is True
    assert summary["sample_size"] == 120
    assert summary["survey_timeframe"] == "2024-2026"
    assert summary["outlet_score"] is not None
    assert summary["outlet_score"] >= 80.0
    assert res["overall_credibility_score"] == summary["outlet_score"]
    assert "120 bài báo" in summary["summary_note"]
    assert "2024-2026" in summary["summary_note"]
