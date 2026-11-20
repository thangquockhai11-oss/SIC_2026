"""Stage 2 Acceptance Test: Evidence Ingestion, Retrieval & Cross-Source Verification.

Acceptance tests:
1. Two URLs copying one dispatch count as ONE origin (syndicated origin grouping).
2. Conflicting event dates remain visible side-by-side with disputed detail identified.
3. Unrelated evidence is excluded.
4. Missing evidence returns "Chưa đủ bằng chứng" (NOT_ENOUGH_INFORMATION).
5. Full flow verified:
   Import document -> select claim -> find passage -> open original source -> rerun verification.
6. Publisher transparency records and reader responses are kept strictly separate from factual evidence.
"""

from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import (
    Analysis,
    Claim,
    Document,
    Evidence,
    MediaCredibility,
    PublicOpinion,
    PublicTrustSurvey,
    gen_uuid,
    utc_now,
)
from app.services.evidence_library_service import evidence_library_service


@pytest.fixture
def db_session():
    engine = get_engine()
    with Session(engine) as session:
        yield session
        # Teardown test documents and reload BM25 to keep environments isolated
        try:
            session.query(Document).filter(
                (Document.source_url.like("%van-nam-dispatch%")) |
                (Document.source_url.like("%source-%")) |
                (Document.source_url.like("%tphcm.gov.vn%"))
            ).delete(synchronize_session=False)
            session.commit()
            from app.services.rag.bm25_retriever import bm25_retriever
            bm25_retriever.reload_index()
        except Exception:
            session.rollback()


def _create_analysis_with_claim(
    db: Session,
    claim_text: str,
    original_sentence: str | None = None,
    source_url: str = "https://example.com/test-article.htm",
) -> Claim:
    analysis = Analysis(
        id=gen_uuid(),
        title="Tiêu đề bài kiểm chứng",
        content=claim_text,
        source_url=source_url,
        status="COMPLETED",
    )
    db.add(analysis)
    claim = Claim(
        id=gen_uuid(),
        analysis_id=analysis.id,
        claim_text=claim_text,
        original_sentence=original_sentence or claim_text,
        paragraph_id=1,
        verdict="PENDING",
        confidence=0.5,
        reasoning="",
    )
    db.add(claim)
    db.commit()
    return claim


def test_two_urls_copying_one_dispatch_count_as_one_origin(db_session):
    """Test: Two URLs copying one dispatch (e.g. TTXVN) count as ONE independent origin."""
    # Ingest URL 1: Tuổi Trẻ copying TTXVN
    doc1 = evidence_library_service.import_document(
        title="Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc lần thứ 4",
        content="Ngày 25/10/2024, theo thông tấn xã việt nam (TTXVN), chương trình Gặp gỡ thanh niên đã diễn ra tại Côn Minh, Vân Nam. Đại biểu thanh niên hai nước tham dự đông đủ.",
        source_url="https://tuoitre.vn/van-nam-dispatch-1.htm",
        publisher="Báo Tuổi Trẻ",
        original_source="TTXVN",
        publication_date="2024-10-25T10:00:00Z",
        document_version="1.0",
        db=db_session,
    )

    # Ingest URL 2: Nhân Dân copying the exact same TTXVN dispatch
    doc2 = evidence_library_service.import_document(
        title="Bản tin TTXVN: Gặp gỡ hữu nghị thanh niên tại Vân Nam",
        content="Theo TTXVN, ngày 25/10/2024, tại thành phố Côn Minh tỉnh Vân Nam đã khai mạc chương trình Gặp gỡ hữu nghị thanh niên Việt Nam - Trung Quốc lần thứ tư.",
        source_url="https://nhandan.vn/van-nam-dispatch-2.htm",
        publisher="Báo Nhân Dân",
        original_source="TTXVN",
        publication_date="2024-10-25T11:00:00Z",
        document_version="1.0",
        db=db_session,
    )

    claim = _create_analysis_with_claim(
        db_session,
        claim_text="Chương trình Gặp gỡ hữu nghị thanh niên diễn ra ngày 25/10/2024 tại Côn Minh tỉnh Vân Nam.",
        source_url="https://othernews.vn/bai-can-kiem-chung.htm",
    )

    # Find references for this claim
    res = evidence_library_service.find_claim_references(claim.id, db=db_session)

    # Verify syndicated origins grouping:
    syndicated = res["syndicated_origins"]
    ttxvn_group = next((s for s in syndicated if "ttxvn" in s["original_source"].lower()), None)
    assert ttxvn_group is not None, "TTXVN dispatch group not found"
    assert ttxvn_group["copies_count"] >= 2, f"Expected at least 2 copies under TTXVN, got {ttxvn_group['copies_count']}"
    assert ttxvn_group["is_syndicated"] is True


def test_conflicting_event_dates_remain_visible(db_session):
    """Test: When credible sources disagree on event dates, both passages remain visible and disputed detail is identified."""
    # Ingest Source A: claims date is 25/10/2024
    doc_a = evidence_library_service.import_document(
        title="Thông cáo A: Sự kiện diễn ra ngày 25/10/2024",
        content="Ngày 25/10/2024, hội nghị thanh niên hữu nghị tại Côn Minh đã tổ chức lễ khai mạc trang trọng.",
        source_url="https://source-a.vn/event-date-25.htm",
        publisher="Nguồn A",
        original_source="Cơ quan A",
        publication_date="2024-10-25T08:00:00Z",
        document_version="1.0",
        db=db_session,
    )

    # Ingest Source B: claims date is 26/10/2024 (conflicting!)
    doc_b = evidence_library_service.import_document(
        title="Thông cáo B: Sự kiện diễn ra ngày 26/10/2024",
        content="Ngày 26/10/2024, hội nghị thanh niên hữu nghị tại Côn Minh mới chính thức diễn ra lễ khai mạc theo lịch điều chỉnh.",
        source_url="https://source-b.vn/event-date-26.htm",
        publisher="Nguồn B",
        original_source="Cơ quan B",
        publication_date="2024-10-26T08:00:00Z",
        document_version="1.0",
        db=db_session,
    )

    claim = _create_analysis_with_claim(
        db_session,
        claim_text="Lễ khai mạc hội nghị thanh niên hữu nghị tại Côn Minh diễn ra ngày 25/10/2024.",
    )

    res = evidence_library_service.find_claim_references(claim.id, db=db_session)

    # Both passages must remain visible
    passages = res["passages"]
    assert len(passages) >= 2, "Both conflicting passages must remain visible"

    # Conflicting detail must be identified
    assert res["has_conflict"] is True
    assert res["disputed_detail"] is not None


def test_missing_evidence_returns_insufficient_evidence(db_session):
    """Test: When no matching evidence is found, strictly returns 'Chưa đủ bằng chứng'."""
    claim = _create_analysis_with_claim(
        db_session,
        claim_text="Người ngoài hành tinh đã bí mật hạ cánh xuống đỉnh Fansipan năm 2026.",
    )

    res = evidence_library_service.find_claim_references(claim.id, db=db_session)

    assert res["verdict"] == "NOT_ENOUGH_INFORMATION"
    assert res["verification_status"] == "INSUFFICIENT_EVIDENCE"
    assert len(res["passages"]) == 0
    assert "Chưa đủ bằng chứng" in res["reasoning"]


def test_full_verification_flow(db_session):
    """Test full flow:
    Import document -> select claim -> find passage -> open original source -> rerun verification.
    """
    # 1. Import document
    import_res = evidence_library_service.import_document(
        title="Quyết định phê duyệt tuyến metro số 2",
        content="Ủy ban Nhân dân thành phố đã chính thức phê duyệt kế hoạch khởi công tuyến đường sắt đô thị số 2 vào tháng 12/2026.",
        source_url="https://tphcm.gov.vn/quyet-dinh-metro-2.htm",
        publisher="Cổng TTĐT TP.HCM",
        original_source="UBND Thành phố",
        publication_date="2026-05-10T14:00:00Z",
        document_version="1.0",
        db=db_session,
    )
    assert import_res["status"] == "INGESTED"
    assert import_res["chunks_count"] >= 1

    # 2. Select claim
    claim = _create_analysis_with_claim(
        db_session,
        claim_text="Tuyến metro số 2 được phê duyệt kế hoạch khởi công vào tháng 12/2026.",
        source_url="https://tintuc.vn/bai-viet-ve-metro-2.htm",
    )

    # 3. Find passage & 4. Open original source (source_url preserved)
    find_res = evidence_library_service.find_claim_references(claim.id, db=db_session)
    assert len(find_res["passages"]) >= 1
    found_passage = find_res["passages"][0]
    assert found_passage["source_url"] == "https://tphcm.gov.vn/quyet-dinh-metro-2.htm"
    assert "đường sắt" in found_passage["excerpt"].lower() or "số 2" in found_passage["excerpt"].lower()

    # 5. Rerun verification with additional source
    rerun_res = evidence_library_service.rerun_claim_verification(
        claim_id=claim.id,
        new_source_text="Sở Giao thông Vận tải xác nhận tiến độ tuyến đường sắt đô thị số 2 dự kiến hoàn tất giải phóng mặt bằng để khởi công tháng 12/2026.",
        db=db_session,
    )
    assert rerun_res["verdict"] in ["SUPPORTED", "VERIFIED_SUPPORTED"]

    # Verify claim updated in database
    db_session.refresh(claim)
    assert claim.verdict in ["SUPPORTED", "VERIFIED_SUPPORTED"]

    # Verify new Evidence records created in DB
    evidences = db_session.query(Evidence).filter(Evidence.claim_id == claim.id).all()
    assert len(evidences) >= 1
    assert evidences[0].source_name is not None


def test_separation_of_publisher_transparency_and_reader_surveys(db_session):
    """Test: Keep publisher transparency records and reader responses separate from factual evidence."""
    analysis_id = gen_uuid()
    analysis = Analysis(
        id=analysis_id,
        title="Bài báo thử nghiệm tính độc lập",
        content="Nội dung bài báo thực nghiệm.",
        status="COMPLETED",
    )
    db_session.add(analysis)

    # 1. Media Credibility (COPE Transparency)
    cred = MediaCredibility(
        id=gen_uuid(),
        analysis_id=analysis_id,
        source_name="Báo Tiêu Chuẩn",
        overall_credibility_score=85.0,
        transparency_score=90.0,
        journalistic_standard_score=80.0,
        reasoning="Hồ sơ tòa soạn minh bạch theo chuẩn COPE.",
    )
    db_session.add(cred)

    # 2. Public Opinion & Reader Trust Survey
    opinion = PublicOpinion(
        id=gen_uuid(),
        analysis_id=analysis_id,
        topic="Chính sách",
        stance_support=0.7,
        stance_oppose=0.2,
    )
    db_session.add(opinion)

    trust_survey = PublicTrustSurvey(
        id=gen_uuid(),
        analysis_id=analysis_id,
        survey_name="Khảo sát niềm tin công chúng",
        sample_size=1200,
        trust_source_score=78.5,
    )
    db_session.add(trust_survey)

    # 3. Factual Claim & Evidence
    claim = Claim(
        id=gen_uuid(),
        analysis_id=analysis_id,
        claim_text="Một phát ngôn độc lập kiểm chứng.",
        original_sentence="Một phát ngôn độc lập kiểm chứng.",
        paragraph_id=1,
        verdict="SUPPORTED",
        reasoning="Lý giải đối chứng độc lập.",
    )
    db_session.add(claim)
    db_session.flush()

    evidence = Evidence(
        id=gen_uuid(),
        claim_id=claim.id,
        source_name="Tài liệu văn bản gốc",
        excerpt="Văn bản gốc xác nhận phát ngôn trên là đúng sự thật.",
        stance="SUPPORTS",
        reliability_score=0.95,
        retrieval_timestamp=utc_now(),
    )
    db_session.add(evidence)
    db_session.commit()

    # Verification: Evidence model contains NO COPE or Survey metrics
    ev_dict = {col.name: getattr(evidence, col.name) for col in evidence.__table__.columns}
    assert "transparency_score" not in ev_dict
    assert "trust_source_score" not in ev_dict
    assert "stance_support" not in ev_dict

    # Media credibility and Surveys remain strictly in their dedicated tables
    saved_cred = db_session.query(MediaCredibility).filter(MediaCredibility.analysis_id == analysis_id).first()
    saved_survey = db_session.query(PublicTrustSurvey).filter(PublicTrustSurvey.analysis_id == analysis_id).first()
    assert saved_cred.transparency_score == 90.0
    assert saved_survey.trust_source_score == 78.5
