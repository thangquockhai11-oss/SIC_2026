"""Unit tests for TrustMedia AI Dataset Loaders."""

from pathlib import Path
import pytest

from app.services.dataset_loaders import (
    FactCheckingLoader,
    CredibilityLoader,
    OpinionLoader,
    RumourLoader,
)


def test_fact_checking_loader_vifactcheck():
    loader = FactCheckingLoader()
    df = loader._load_vifactcheck()
    assert not df.empty, "ViFactCheck dataset should load from disk"
    assert len(df) >= 5000, f"Expected at least 5000 records, got {len(df)}"
    assert "Statement" in df.columns
    assert "Evidence" in df.columns
    assert "labels" in df.columns

    # Test query search
    results = loader.search_vifactcheck("Chính phủ", max_results=2)
    assert len(results) > 0, "Search for 'Chính phủ' should return results"
    sample = results[0]
    assert "statement" in sample
    assert "verdict" in sample
    assert "relevance_score" in sample


def test_fact_checking_loader_xfact():
    loader = FactCheckingLoader()
    df = loader._load_xfact(max_records=500)
    assert not df.empty, "X-FACT dataset should load from disk"
    assert "claim" in df.columns
    assert "label" in df.columns

    # Test retrieval
    results = loader.search_xfact("government", max_results=1)
    assert isinstance(results, list)


def test_fact_checking_loader_evidence_retrieval():
    loader = FactCheckingLoader()
    evidences = loader.retrieve_evidences_for_claim(
        claim_text="Phó Thủ tướng Trần Hồng Hà chúc mừng truyền hình",
        verdict="SUPPORTED",
        language="vi",
    )
    assert len(evidences) > 0
    assert "source_name" in evidences[0]
    assert "stance" in evidences[0]
    assert "reliability_score" in evidences[0]


def test_credibility_loader():
    loader = CredibilityLoader()

    # Exact domain lookup
    gov = loader.lookup_source("https://baochinhphu.vn/thoi-su.htm")
    assert gov is not None
    assert gov["credibility_class"] == "RELIABLE"
    assert gov["credibility_score"] >= 0.90

    # International domain lookup
    reuters = loader.lookup_source("https://www.reuters.com/world")
    assert reuters is not None
    assert reuters["source_name"] == "Reuters"

    # Evaluation
    eval_res = loader.assess_media_credibility("https://vnexpress.net/tin-tuc", "Nội dung bài viết")
    assert eval_res["overall_credibility_score"] > 0
    assert eval_res["transparency_score"] > 0
    assert eval_res["citation_quality_score"] > 0


def test_opinion_loader_vsmec():
    loader = OpinionLoader()
    emotions = loader.get_vsmec_emotion_distribution()
    assert isinstance(emotions, dict)
    assert len(emotions) >= 7
    assert "Enjoyment" in emotions
    assert "Sadness" in emotions

    analysis = loader.analyze_opinion(
        text="Tôi rất ủng hộ chủ trương này, kết quả thật tuyệt vời!",
        claim_text="Chủ trương phát triển hạ tầng",
        language="vi",
    )
    assert analysis["sentiment"] == "POSITIVE"
    assert analysis["stance"] == "SUPPORT"
    assert "emotion_distribution" in analysis


def test_rumour_loader_pheme():
    loader = RumourLoader()
    summary = loader.get_event_summary()
    assert "total_threads" in summary
    assert summary["total_threads"] == 6425, f"Expected 6425 threads, got {summary['total_threads']}"
    assert "events" in summary
    assert "charliehebdo-all-rnr-threads" in summary["events"]

    # Sample thread
    sample = loader.load_thread_sample("charliehebdo-all-rnr-threads", is_rumour=True)
    assert sample is not None
    assert "thread_id" in sample
    assert sample["is_rumour"] is True

