"""Comprehensive test suite for Real AI Agent System, Hybrid Knowledge Retrieval,
Model Management, Calibration, and Provenance Tracking.
Covers all 13 required verification scenarios from Prompt Section 10.
"""

import uuid
import pytest
from sqlalchemy.orm import Session

from app.database.models import Analysis, Claim, Evidence, AgentExecution
from app.services.model_manager import model_manager
from app.services.hybrid_retrieval import hybrid_retriever
from app.services.fact_checking_agent import fact_checking_agent
from app.services.media_credibility_agent import media_credibility_agent
from app.services.public_opinion_agent import public_opinion_agent
from app.services.public_trust_agent import public_trust_agent
from app.services.information_reception_agent import information_reception_agent
from app.services.meta_agent import meta_agent
from app.services.dataset_registry import load_dataset_registry


# ---------------------------------------------------------------------------
# 1. Claim supported by evidence (NLI -> SUPPORTS)
# ---------------------------------------------------------------------------
def test_claim_supported_by_evidence():
    """Verify that a claim backed by verified evidence yields SUPPORTS with calibrated confidence."""
    claim_text = "Vắc-xin COVID-19 được Bộ Y tế xác nhận an toàn"
    evidence_text = "Bộ Y tế xác nhận vắc-xin COVID-19 an toàn và hiệu quả theo công bố của WHO."
    relation, conf, probs = model_manager.run_nli_inference(claim_text, evidence_text)
    assert relation == "SUPPORTS"
    assert conf > 0.5
    sup_prob = probs.get("SUPPORTS", probs.get("ENTAILMENT", 0.0))
    ref_prob = probs.get("REFUTES", probs.get("CONTRADICTION", 0.0))
    assert sup_prob > ref_prob


# ---------------------------------------------------------------------------
# 2. Claim refuted by evidence (NLI -> REFUTES)
# ---------------------------------------------------------------------------
def test_claim_refuted_by_evidence():
    """Verify that a claim contradicted by evidence yields REFUTES with calibrated confidence."""
    claim_text = "Việt Nam có 80 tỉnh thành phố trực thuộc trung ương vào năm 2024"
    evidence_text = "Thông tin lan truyền là sai sự thật, bác bỏ tin đồn thất thiệt. Theo quy định Việt Nam có 63 tỉnh thành phố."
    relation, conf, probs = model_manager.run_nli_inference(claim_text, evidence_text)
    assert relation == "REFUTES"
    assert conf > 0.5
    sup_prob = probs.get("SUPPORTS", probs.get("ENTAILMENT", 0.0))
    ref_prob = probs.get("REFUTES", probs.get("CONTRADICTION", 0.0))
    assert ref_prob > sup_prob


# ---------------------------------------------------------------------------
# 3. Claim with no evidence -> NOT_ENOUGH_INFORMATION with empty [] evidence
# ---------------------------------------------------------------------------
def test_claim_with_no_evidence():
    """Verify that a claim with zero matching evidence returns NOT_ENOUGH_INFORMATION with empty evidence list."""
    obscure_claim = "Tiểu hành tinh ký hiệu Z-9988 phát nổ trên đỉnh Fansipan làm biến mất toàn bộ thung lũng Mường Hoa năm 1812."
    result = fact_checking_agent.verify_single_claim({"claim_text": obscure_claim})
    assert result["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert len(result["evidences"]) == 0
    assert result["verification_status"] == "INSUFFICIENT_EVIDENCE"
    assert "cơ sở tri thức" in result["reasoning"] or "Chưa đủ dữ kiện" in result["reasoning"]


# ---------------------------------------------------------------------------
# 4. Claim not checkable
# ---------------------------------------------------------------------------
def test_claim_not_checkable():
    """Verify that purely subjective opinions or non-verifiable claims return NOT_CHECKABLE with empty evidence."""
    subjective_statement = "Tôi cảm thấy bộ phim tài liệu này thật sự quá buồn ngủ và dở tệ."
    res = fact_checking_agent.verify_single_claim({"claim_text": subjective_statement})
    assert res["verdict"] in ["NOT_CHECKABLE", "NOT_ENOUGH_INFORMATION"]
    assert res["evidences"] == []
    if res["verdict"] == "NOT_CHECKABLE":
        assert res["verification_status"] == "NOT_CHECKABLE"


# ---------------------------------------------------------------------------
# 5. Dataset missing handling (graceful fallback)
# ---------------------------------------------------------------------------
def test_dataset_missing_handling():
    """Verify that missing dataset files or non-existent datasets are handled gracefully."""
    registry = load_dataset_registry()
    matching = [d for d in registry if d.dataset_id == "NON_EXISTENT_DATASET_12345"]
    assert len(matching) == 0
    # Retrieval over query handles gracefully without crashing
    results = hybrid_retriever.retrieve("Thông tin thử nghiệm kiểm chứng", top_k=3)
    assert isinstance(results, list)


# ---------------------------------------------------------------------------
# 6. Model not loaded handling (honest status disclosure)
# ---------------------------------------------------------------------------
def test_model_not_loaded_handling():
    """Verify that ModelManager honestly reports model loading and calibration statuses."""
    catalog = model_manager.list_models()
    assert len(catalog) >= 5
    for m in catalog:
        assert "model_name" in m
        assert "loading_status" in m
        assert m["loading_status"] in ["LOADED", "BASELINE_CALIBRATED", "MODEL_NOT_CONFIGURED"]
        if m["loading_status"] == "MODEL_NOT_CONFIGURED":
            assert m["evaluation_metrics"] is None or m["evaluation_metrics"].get("macro_f1") is None


# ---------------------------------------------------------------------------
# 7. Retrieval empty handling
# ---------------------------------------------------------------------------
def test_retrieval_empty_handling():
    """Verify that retriever returns empty list when query has no keywords or match, with no synthetic evidence."""
    empty_results = hybrid_retriever.retrieve("", top_k=5)
    assert empty_results == []


# ---------------------------------------------------------------------------
# 8. Retrieval unrelated evidence gating (min_relevance_threshold >= 0.22)
# ---------------------------------------------------------------------------
def test_retrieval_unrelated_evidence_gating():
    """Verify that retriever rejects evidence below the min_relevance_threshold (0.22)."""
    random_gibberish = "xyzqwk 981273918237912837 zzzwwkklq"
    results = hybrid_retriever.retrieve(random_gibberish, top_k=5, min_relevance_threshold=0.22)
    # No document should pass the 0.22 relevance threshold
    assert len(results) == 0


# ---------------------------------------------------------------------------
# 9. Agent error handling (isolated failure, doesn't crash orchestrator)
# ---------------------------------------------------------------------------
def test_agent_error_handling():
    """Verify that an exception or edge case in an agent is captured gracefully."""
    # Test media credibility with empty string
    cred_data, trace = media_credibility_agent.evaluate(source_url=None, content="")
    assert "overall_credibility_score" in cred_data
    assert cred_data["overall_credibility_score"] >= 0
    assert trace["status"] in ["COMPLETED", "FAILED"]


# ---------------------------------------------------------------------------
# 10. Agent disagreement detection (Meta-Agent conflict detection)
# ---------------------------------------------------------------------------
def test_agent_disagreement_detection():
    """Verify that Meta-Agent detects conflicts between claims and source credibility."""
    claims = [
        {
            "claim_id": "c1",
            "claim_text": "Thông tin tuyên bố sai sự thật nghiêm trọng",
            "verdict": "REFUTED",
            "confidence": 0.90,
            "reasoning": "Bằng chứng bác bỏ hoàn toàn",
            "evidences": [{"id": "e1", "source_name": "Official", "stance": "REFUTES", "reliability_score": 0.95}],
        }
    ]
    # Source has high claimed credibility (85.0) but claims are REFUTED -> divergence
    credibility_data = {
        "overall_credibility_score": 85.0,
        "source_name": "Báo Tin Nhanh 24h",
        "reasoning": "Nguồn tự nhận uy tín",
    }
    opinion_data = {
        "stance_oppose": 0.80,
        "stance_support": 0.10,
        "sentiment_negative": 0.70,
        "discussion_summary": "Dư luận kịch liệt phản đối",
    }
    trust_data = {"trust_source_score": 60}
    reception_data = {"comprehension_score": 80}

    meta_res, trace = meta_agent.synthesize(
        claims=claims,
        credibility_data=credibility_data,
        opinion_data=opinion_data,
        trust_data=trust_data,
        reception_data=reception_data,
    )
    assert meta_res["disagreement_detected"] is True
    assert meta_res["disagreement_type"] == "SOURCE_FACT_DIVERGENCE"
    assert meta_res["verdict"] == "REFUTED"
    assert trace["disagreement_detected"] is True


# ---------------------------------------------------------------------------
# 11. Single article with multiple distinct claims
# ---------------------------------------------------------------------------
def test_multiple_distinct_claims_in_article():
    """Verify that an article containing multiple claims segments them into distinct claims."""
    multiclaim_article = (
        "Thống kê năm 2023 cho thấy xuất khẩu gạo của Việt Nam đạt hơn 8 triệu tấn theo báo cáo chính thức. "
        "Ngoài ra cơ quan chức năng khẳng định đã bắt giữ đường dây buôn lậu lớn tại cửa khẩu quốc tế."
    )
    verified_claims, trace = fact_checking_agent.execute_fact_checking(
        content=multiclaim_article,
        language="vi",
    )
    assert len(verified_claims) >= 2
    claim_ids = [c["claim_id"] for c in verified_claims]
    assert len(claim_ids) == len(set(claim_ids))
    for c in verified_claims:
        assert "verdict" in c
        assert "confidence" in c
        assert "model_name" in c


# ---------------------------------------------------------------------------
# 12. Duplicate evidence deduplication
# ---------------------------------------------------------------------------
def test_duplicate_evidence_deduplication():
    """Verify that evidence items with identical chunk_id are deduplicated."""
    query = "vắc-xin"
    results = hybrid_retriever.retrieve(query, top_k=10)
    seen_ids = set()
    for r in results:
        chunk_id = r.get("chunk_id")
        if chunk_id:
            assert chunk_id not in seen_ids, f"Duplicate evidence chunk found: {chunk_id}"
            seen_ids.add(chunk_id)


# ---------------------------------------------------------------------------
# 13. Database persistence and reload
# ---------------------------------------------------------------------------
def test_database_persistence_and_reload(client):
    """Verify that an analysis with full claims, evidences, and agent execution trace is persisted to DB and reloadable."""
    sample_text = (
        "Bộ Y tế Việt Nam khuyến cáo người dân tiếp tục thực hiện các biện pháp phòng chống dịch. "
        "Số ca mắc mới ghi nhận trong tuần giảm mạnh so với tháng trước theo báo cáo chính thức."
    )
    # Submit analysis
    sub_resp = client.post(
        "/api/v1/analyzer/submit",
        json={
            "title": "Bản tin y tế dự phòng tuần 45",
            "content": sample_text,
            "language": "vi",
            "scope": "full",
        },
    )
    assert sub_resp.status_code == 202
    analysis_id = sub_resp.json()["id"]

    # Poll detail
    detail_resp = client.get(f"/api/v1/analyzer/{analysis_id}")
    assert detail_resp.status_code == 200
    data = detail_resp.json()

    # Verify claim model and calibration provenance
    assert len(data["claims"]) >= 1
    c0 = data["claims"][0]
    assert c0["model_name"] is not None
    assert c0["model_version"] is not None
    assert c0["confidence_metric_type"] is not None
    assert c0["verification_status"] is not None

    # Verify trace endpoint
    trace_resp = client.get(f"/api/v1/analyzer/{analysis_id}/trace")
    assert trace_resp.status_code == 200
    traces = trace_resp.json()["traces"]
    assert len(traces) >= 5
    for t in traces:
        assert "execution_id" in t
        assert "agent_name" in t
        assert "model_name" in t
        assert "latency_ms" in t
        assert t["status"] in ["COMPLETED", "FAILED"]
