"""Phase 2 Comprehensive Acceptance Test Suite for TrustMedia AI (SIC_2026).

Directly validates all user acceptance criteria for Phase 2:
1. Chỉ nhập URL → 0 phiếu khảo sát, điểm đọc hiểu để trống (None).
2. Nhập 3 phiếu hợp lệ, 2 người trả lời đúng → hiển thị '2/3' (66.7%).
3. Nhập lại cùng lô → vẫn strictly '2/3' (Idempotency / không đội cỡ mẫu).
4. Thay nhóm bình luận ủng hộ bằng nhóm phản đối → phân bố lập trường thay đổi rõ rệt.
"""

import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import (
    Analysis,
    ArticleSnapshot,
    Claim,
    CommentClaimStance,
    InformationReception,
    PublicOpinion,
    PublicTrustSurvey,
    QuizQuestion,
    UserComment,
)
from app.api.v1.routes.reader_feedback import (
    get_quiz_questions,
    submit_batch_feedback,
    submit_user_comment,
)
from app.schemas.analysis import (
    BatchFeedbackSubmission,
    ReaderSurveyCreate,
    UserCommentCreate,
)


@pytest.fixture
def test_db():
    """Yield a database session for acceptance testing."""
    engine = get_engine()
    with Session(engine) as session:
        yield session


@pytest.fixture
def acceptance_analysis(test_db: Session):
    """Seed clean analysis with snapshot, claims, and zero-observation metrics."""
    analysis_id = str(uuid.uuid4())
    snapshot_id = str(uuid.uuid4())

    analysis = Analysis(
        id=analysis_id,
        title="Nghiệm thu kỹ thuật tuyến đường sắt đô thị số 1",
        content="Tuyến đường sắt đô thị số 1 đã nghiệm thu an toàn và chuẩn bị vận hành thương mại.",
        source_url=f"https://vnexpress.net/thoi-su/nghiem-thu-metro-acceptance-{analysis_id[:8]}.html",
        status="COMPLETED",
    )
    test_db.add(analysis)

    snapshot = ArticleSnapshot(
        id=snapshot_id,
        analysis_id=analysis_id,
        version=1,
        title=analysis.title,
        source_url=analysis.source_url,
        final_url=analysis.source_url,
        paragraphs=[
            "Tuyến đường sắt đô thị số 1 Bến Thành - Suối Tiên đã hoàn tất kiểm tra an toàn.",
            "Hội đồng thẩm định quốc gia chấp thuận cho phép vận hành thương mại từ quý 4 năm 2024.",
        ],
        source_links=[],
        extraction_status="SUCCESS",
        is_verified_online=True,
    )
    test_db.add(snapshot)

    c1 = Claim(
        id=str(uuid.uuid4()),
        analysis_id=analysis_id,
        claim_text="Tuyến đường sắt đô thị số 1 hoàn tất kiểm tra an toàn kỹ thuật",
        verdict="SUPPORTED",
        confidence=0.95,
        reasoning="Biên bản nghiệm thu kỹ thuật xác nhận đạt tiêu chuẩn an toàn.",
    )
    c2 = Claim(
        id=str(uuid.uuid4()),
        analysis_id=analysis_id,
        claim_text="Tuyến đường sắt vận hành thương mại từ quý 4 năm 2024",
        verdict="SUPPORTED",
        confidence=0.92,
        reasoning="Kế hoạch khai thác thương mại bắt đầu từ quý 4/2024.",
    )
    test_db.add_all([c1, c2])

    rec = InformationReception(
        analysis_id=analysis_id,
        sample_size=0,
        comprehension_score=None,
        comprehension_ratio_str=None,
        cognitive_resistance_notes="Chưa có dữ liệu người đọc",
        data_provenance_type="OBSERVED",
        method_applied="ZERO_OBSERVATION_STATE",
    )
    trust = PublicTrustSurvey(
        analysis_id=analysis_id,
        survey_name="Khảo sát niềm tin độc giả",
        sample_size=0,
        trust_source_score=None,
        findings_summary="Chưa có dữ liệu người đọc",
        data_provenance_type="OBSERVED",
        method_applied="ZERO_OBSERVATION_STATE",
    )
    opinion = PublicOpinion(
        analysis_id=analysis_id,
        topic="Giao thông công cộng",
        sample_size=0,
        stance_support=None,
        stance_oppose=None,
        stance_discuss=None,
        stance_neutral=None,
        discussion_summary="Chưa có dữ liệu người đọc",
        data_provenance_type="OBSERVED",
        method_applied="ZERO_OBSERVATION_STATE",
    )
    test_db.add_all([rec, trust, opinion])
    test_db.commit()

    return {
        "analysis_id": analysis_id,
        "snapshot_id": snapshot_id,
        "claims": [c1, c2],
    }


def test_phase2_complete_acceptance_flow(test_db: Session, acceptance_analysis: dict):
    """End-to-End Acceptance Test for Phase 2."""
    analysis_id = acceptance_analysis["analysis_id"]

    # =========================================================================
    # Nghiệm thu 1: Chỉ nhập URL -> 0 phiếu, điểm đọc hiểu để trống (None)
    # =========================================================================
    rec = test_db.execute(
        select(InformationReception).where(InformationReception.analysis_id == analysis_id)
    ).scalars().first()
    assert rec.sample_size == 0
    assert rec.comprehension_score is None
    assert rec.comprehension_ratio_str is None
    assert rec.cognitive_resistance_notes == "Chưa có dữ liệu người đọc"
    assert rec.data_provenance_type == "OBSERVED"

    trust = test_db.execute(
        select(PublicTrustSurvey).where(PublicTrustSurvey.analysis_id == analysis_id)
    ).scalars().first()
    assert trust.sample_size == 0
    assert trust.trust_source_score is None
    assert trust.findings_summary == "Chưa có dữ liệu người đọc"

    op = test_db.execute(
        select(PublicOpinion).where(PublicOpinion.analysis_id == analysis_id)
    ).scalars().first()
    assert op.sample_size == 0
    assert op.stance_support is None or op.stance_support == 0.0
    assert op.discussion_summary == "Chưa có dữ liệu người đọc"

    # =========================================================================
    # Nghiệm thu 2: Nhập 3 phiếu hợp lệ, 2 người trả lời đúng -> hiển thị '2/3' (66.7%)
    # =========================================================================
    quizzes = get_quiz_questions(analysis_id, db=test_db)
    assert len(quizzes) >= 2

    # Respondent 1: Trả lời đúng toàn bộ câu hỏi (100% -> Pass)
    s1 = ReaderSurveyCreate(
        trust_outlet_score=90.0,
        claim_trust_ratings={},
        quiz_answers={q.id: q.correct_option_index for q in quizzes},
        sharing_intention="DEFINITELY_SHARE",
        verify_before_sharing=True,
        session_id=f"acc_user_1_{uuid.uuid4().hex[:6]}",
        submission_batch_id="acceptance_batch_001",
    )
    # Respondent 2: Trả lời đúng toàn bộ câu hỏi (100% -> Pass)
    s2 = ReaderSurveyCreate(
        trust_outlet_score=85.0,
        claim_trust_ratings={},
        quiz_answers={q.id: q.correct_option_index for q in quizzes},
        sharing_intention="PROBABLY_SHARE",
        verify_before_sharing=True,
        session_id=f"acc_user_2_{uuid.uuid4().hex[:6]}",
        submission_batch_id="acceptance_batch_001",
    )
    # Respondent 3: Trả lời sai toàn bộ (0% -> Fail)
    s3 = ReaderSurveyCreate(
        trust_outlet_score=40.0,
        claim_trust_ratings={},
        quiz_answers={q.id: (q.correct_option_index + 1) % len(q.options) for q in quizzes},
        sharing_intention="DO_NOT_SHARE",
        verify_before_sharing=False,
        session_id=f"acc_user_3_{uuid.uuid4().hex[:6]}",
        submission_batch_id="acceptance_batch_001",
    )

    batch_submission = BatchFeedbackSubmission(
        surveys=[s1, s2, s3],
        comments=[],
        batch_id="acceptance_batch_001",
    )

    batch_resp1 = submit_batch_feedback(analysis_id, batch_submission, db=test_db)
    assert batch_resp1.submitted_surveys == 3
    assert batch_resp1.comprehension_ratio_str == "2/3"
    assert pytest.approx(batch_resp1.comprehension_score, rel=1e-2) == 66.7

    # Kiểm tra database sau nghiệm thu 2
    test_db.refresh(rec)
    assert rec.sample_size == 3
    assert rec.comprehension_ratio_str == "2/3"
    assert pytest.approx(rec.comprehension_score, rel=1e-2) == 66.7
    assert rec.data_provenance_type == "OBSERVED"

    # =========================================================================
    # Nghiệm thu 3: Nhập lại cùng lô -> vẫn 2/3 (Idempotency)
    # =========================================================================
    batch_resp2 = submit_batch_feedback(analysis_id, batch_submission, db=test_db)
    assert batch_resp2.submitted_surveys == 0  # Toàn bộ phiếu trong lô đã tồn tại, được deduplicate
    assert batch_resp2.comprehension_ratio_str == "2/3"
    assert pytest.approx(batch_resp2.comprehension_score, rel=1e-2) == 66.7

    test_db.refresh(rec)
    assert rec.sample_size == 3  # Không bị cộng dồn thành 6
    assert rec.comprehension_ratio_str == "2/3"

    # =========================================================================
    # Nghiệm thu 4: Thay nhóm bình luận ủng hộ bằng nhóm phản đối -> phân bố lập trường thay đổi
    # =========================================================================
    # Bước 4.1: Nhập 2 bình luận ỦNG HỘ
    sup1 = UserCommentCreate(
        author_name="Kỹ sư Metro",
        comment_text="Rất chuẩn xác, tôi hoàn toàn ủng hộ thông tin tuyến metro đã hoàn thành đúng hạn.",
        submission_batch_id="batch_sup_acc",
    )
    sup2 = UserCommentCreate(
        author_name="Cư dân TP",
        comment_text="Đồng tình và hoan nghênh nỗ lực nghiệm thu của các bên liên quan.",
        submission_batch_id="batch_sup_acc",
    )
    submit_user_comment(analysis_id, sup1, db=test_db)
    submit_user_comment(analysis_id, sup2, db=test_db)

    test_db.refresh(op)
    assert op.sample_size == 2
    assert op.stance_support is not None
    assert op.stance_support > (op.stance_oppose or 0.0)
    initial_support = op.stance_support

    # Bước 4.2: Nhập thêm 3 bình luận PHẢN ĐỐI mạnh mẽ
    opp1 = UserCommentCreate(
        author_name="Độc giả phản biện 1",
        comment_text="Thông tin này hoàn toàn sai sự thật, tôi kịch liệt bác bỏ và phản đối.",
        submission_batch_id="batch_opp_acc",
    )
    opp2 = UserCommentCreate(
        author_name="Độc giả phản biện 2",
        comment_text="Phản đối kết luận trên, thực tế thi công còn dở dang nhiều chỗ nguy hiểm.",
        submission_batch_id="batch_opp_acc",
    )
    opp3 = UserCommentCreate(
        author_name="Độc giả phản biện 3",
        comment_text="Không đúng thực tế, đây chỉ là số liệu quảng cáo dối trá, tôi phản đối hoàn toàn.",
        submission_batch_id="batch_opp_acc",
    )
    submit_user_comment(analysis_id, opp1, db=test_db)
    submit_user_comment(analysis_id, opp2, db=test_db)
    submit_user_comment(analysis_id, opp3, db=test_db)

    test_db.refresh(op)
    assert op.sample_size == 5
    assert op.stance_oppose is not None
    assert op.stance_oppose > 0.0
    # Tỷ lệ ủng hộ giảm đáng kể so với ban đầu
    assert op.stance_support < initial_support
    # Tỷ lệ phản đối tăng vọt lên vị trí dẫn đầu
    assert op.stance_oppose > op.stance_support
