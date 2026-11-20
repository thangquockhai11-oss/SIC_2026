"""Test suite for Phase 2 - Task 1: Reader Feedback Collection.
Verifies verified quizzes, reader surveys, idempotent batch ingestion,
and pairwise comment-claim stance analysis.
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
    ReaderSurveyResponse,
    UserComment,
)
from app.api.v1.routes.reader_feedback import (
    get_quiz_questions,
    submit_batch_feedback,
    submit_reader_survey,
    submit_user_comment,
)
from app.schemas.analysis import (
    BatchFeedbackSubmission,
    ReaderSurveyCreate,
    UserCommentCreate,
)


@pytest.fixture
def test_db():
    """Yield a database session for testing."""
    engine = get_engine()
    with Session(engine) as session:
        yield session


@pytest.fixture
def seeded_analysis(test_db: Session):
    """Seed a test analysis with snapshot and claims for testing reader feedback."""
    analysis_id = str(uuid.uuid4())
    snapshot_id = str(uuid.uuid4())

    analysis = Analysis(
        id=analysis_id,
        source_url=f"https://vnexpress.net/thoi-su/du-an-giao-thong-{analysis_id[:8]}.html",
        title="Dự án đường sắt đô thị hoàn thành đúng tiến độ",
        content="UBND Thành phố công bố tuyến metro số 1 đã nghiệm thu an toàn kỹ thuật và chính thức vận hành thương mại vào quý 4.",
        status="COMPLETED",
    )
    test_db.add(analysis)

    snapshot = ArticleSnapshot(
        id=snapshot_id,
        analysis_id=analysis_id,
        version=1,
        source_url=f"https://vnexpress.net/thoi-su/du-an-giao-thong-{analysis_id[:8]}.html",
        title="Dự án đường sắt đô thị hoàn thành đúng tiến độ",
        paragraphs=[
            "UBND Thành phố công bố tuyến metro số 1 đã nghiệm thu an toàn kỹ thuật.",
            "Tuyến chính thức vận hành thương mại phục vụ hành khách vào quý 4.",
        ],
        author="Ban Thời sự",
        content_hash="hash12345",
    )
    test_db.add(snapshot)

    # 2 Claims
    c1 = Claim(
        id=str(uuid.uuid4()),
        analysis_id=analysis_id,
        claim_text="Tuyến metro số 1 đã được nghiệm thu an toàn kỹ thuật",
        verdict="SUPPORTED",
        confidence=0.95,
        reasoning="Đã xác thực từ văn bản nghiệm thu an toàn của cơ quan quản lý.",
    )
    c2 = Claim(
        id=str(uuid.uuid4()),
        analysis_id=analysis_id,
        claim_text="Tuyến metro chính thức vận hành thương mại vào quý 4",
        verdict="SUPPORTED",
        confidence=0.92,
        reasoning="Khớp với mốc tiến độ trong thông cáo chính thức.",
    )
    test_db.add_all([c1, c2])

    # Initial Reception, Trust, and Opinion records in zero-observation state
    rec = InformationReception(
        analysis_id=analysis_id,
        sample_size=0,
        comprehension_score=None,
        comprehension_ratio_str=None,
        data_provenance_type="OBSERVED",
        method_applied="ZERO_OBSERVATION_STATE",
    )
    trust = PublicTrustSurvey(
        analysis_id=analysis_id,
        survey_name="Khảo sát niềm tin độc giả",
        sample_size=0,
        trust_source_score=None,
        data_provenance_type="OBSERVED",
        method_applied="ZERO_OBSERVATION_STATE",
    )
    opinion = PublicOpinion(
        analysis_id=analysis_id,
        topic="Giao thông đô thị",
        sample_size=0,
        stance_support=None,
        stance_oppose=None,
        stance_discuss=None,
        stance_neutral=None,
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


def test_1_quiz_generation_and_verified_options(test_db: Session, seeded_analysis: dict):
    """Verify approved quiz questions are generated and linked to the article."""
    analysis_id = seeded_analysis["analysis_id"]
    quizzes = get_quiz_questions(analysis_id, db=test_db)

    assert len(quizzes) >= 3
    for q in quizzes:
        assert q.analysis_id == analysis_id
        assert len(q.options) >= 2
        assert 0 <= q.correct_option_index < len(q.options)
        assert q.explanation is not None


def test_2_submit_survey_and_verified_scoring(test_db: Session, seeded_analysis: dict):
    """Test reading comprehension scoring against approved answer keys."""
    analysis_id = seeded_analysis["analysis_id"]
    quizzes = get_quiz_questions(analysis_id, db=test_db)
    q1 = quizzes[0]
    q2 = quizzes[1]
    q3 = quizzes[2]

    # Create survey response where 2 out of 3 questions are answered correctly
    answers = {
        q1.id: q1.correct_option_index,  # Correct
        q2.id: q2.correct_option_index,  # Correct
        q3.id: (q3.correct_option_index + 1) % len(q3.options),  # Wrong
    }

    payload = ReaderSurveyCreate(
        trust_outlet_score=85.0,
        claim_trust_ratings={c.id: 90.0 for c in seeded_analysis["claims"]},
        quiz_answers=answers,
        sharing_intention="PROBABLY_SHARE",
        verify_before_sharing=True,
        session_id="user_session_1",
        submission_batch_id="test_batch_1",
    )

    result = submit_reader_survey(analysis_id, payload, db=test_db)
    assert result.correct_count == 2
    assert result.total_questions == len(quizzes)
    assert result.comprehension_score == round((2 / len(quizzes)) * 100, 1)
    assert result.trust_outlet_score == 85.0
    assert result.sharing_intention == "PROBABLY_SHARE"


def test_3_idempotent_batch_and_2_out_of_3_pass_ratio(test_db: Session, seeded_analysis: dict):
    """Nghiệm thu: 3 surveys submitted, 2 correct respondents -> displays 2/3 (66.7%).
    Re-submitting the same batch preserves 2/3.
    """
    analysis_id = seeded_analysis["analysis_id"]
    quizzes = get_quiz_questions(analysis_id, db=test_db)
    quiz_map = {q.id: q.correct_option_index for q in quizzes}

    # Respondent 1: all correct
    s1 = ReaderSurveyCreate(
        trust_outlet_score=90.0,
        claim_trust_ratings={},
        quiz_answers={q.id: q.correct_option_index for q in quizzes},
        sharing_intention="DEFINITELY_SHARE",
        verify_before_sharing=True,
        session_id="respondent_1",
        submission_batch_id="batch_alpha",
    )
    # Respondent 2: all correct
    s2 = ReaderSurveyCreate(
        trust_outlet_score=80.0,
        claim_trust_ratings={},
        quiz_answers={q.id: q.correct_option_index for q in quizzes},
        sharing_intention="PROBABLY_SHARE",
        verify_before_sharing=True,
        session_id="respondent_2",
        submission_batch_id="batch_alpha",
    )
    # Respondent 3: all wrong
    s3 = ReaderSurveyCreate(
        trust_outlet_score=50.0,
        claim_trust_ratings={},
        quiz_answers={q.id: (q.correct_option_index + 1) % len(q.options) for q in quizzes},
        sharing_intention="DO_NOT_SHARE",
        verify_before_sharing=False,
        session_id="respondent_3",
        submission_batch_id="batch_alpha",
    )

    batch_payload = BatchFeedbackSubmission(
        surveys=[s1, s2, s3],
        comments=[],
        batch_id="batch_alpha",
    )

    resp1 = submit_batch_feedback(analysis_id, batch_payload, db=test_db)
    assert resp1.submitted_surveys == 3
    assert resp1.comprehension_ratio_str == "2/3"
    assert resp1.comprehension_score == round(((100.0 + 100.0 + 0.0) / 3), 1)  # 66.7%

    # Re-submitting the exact same batch must be idempotent (no duplication)
    resp2 = submit_batch_feedback(analysis_id, batch_payload, db=test_db)
    assert resp2.submitted_surveys == 0  # Deduplicated
    assert resp2.comprehension_ratio_str == "2/3"  # Still strictly 2/3

    # Check database records directly
    rec = test_db.execute(
        select(InformationReception).where(InformationReception.analysis_id == analysis_id)
    ).scalars().first()
    assert rec.sample_size == 3
    assert rec.comprehension_ratio_str == "2/3"
    assert rec.data_provenance_type == "OBSERVED"


def test_4_pairwise_comment_claim_stance_and_distribution_shift(test_db: Session, seeded_analysis: dict):
    """Nghiệm thu: Each comment is paired with every claim.
    Replacing supportive comments with opposing comments shifts the stance distribution.
    """
    analysis_id = seeded_analysis["analysis_id"]

    # Submit Supportive comments
    support_comments = [
        UserCommentCreate(
            author_name="Độc giả A",
            comment_text="Rất chuẩn xác và hoan nghênh dự án metro hoàn thành đúng tiến độ.",
            submission_batch_id="batch_sup",
        ),
        UserCommentCreate(
            author_name="Độc giả B",
            comment_text="Đồng tình ủng hộ chính quyền thành phố đã nghiệm thu đưa vào vận hành.",
            submission_batch_id="batch_sup",
        ),
    ]

    for c in support_comments:
        submit_user_comment(analysis_id, c, db=test_db)

    # Check pairwise stances created for this analysis
    c_ids = list(test_db.execute(select(UserComment.id).where(UserComment.analysis_id == analysis_id)).scalars().all())
    stances = list(test_db.execute(select(CommentClaimStance).where(CommentClaimStance.comment_id.in_(c_ids))).scalars().all())
    assert len(stances) == 2 * len(seeded_analysis["claims"])  # 2 comments * 2 claims = 4 pairs
    for s in stances:
        assert s.stance in ["SUPPORT", "OPPOSE", "DISCUSS", "NEUTRAL"]
        assert s.reasoning is not None

    op = test_db.execute(select(PublicOpinion).where(PublicOpinion.analysis_id == analysis_id)).scalars().first()
    test_db.refresh(op)
    assert op.sample_size == 2
    assert op.stance_support is not None
    assert op.stance_support > (op.stance_oppose or 0)
    orig_support = op.stance_support

    # Submit Strong Opposing comments
    oppose_comments = [
        UserCommentCreate(
            author_name="Độc giả C",
            comment_text="Hoàn toàn sai sự thật, dự án đã trễ hẹn nhiều năm và bác bỏ thông tin này.",
            submission_batch_id="batch_opp",
        ),
        UserCommentCreate(
            author_name="Độc giả D",
            comment_text="Phản đối tuyên bố này, chất lượng an toàn còn nhiều bất cập chưa giải quyết.",
            submission_batch_id="batch_opp",
        ),
        UserCommentCreate(
            author_name="Độc giả E",
            comment_text="Không đồng ý với bài báo, thông tin không đúng thực tế thi công.",
            submission_batch_id="batch_opp",
        ),
    ]

    for c in oppose_comments:
        submit_user_comment(analysis_id, c, db=test_db)

    test_db.refresh(op)
    assert op.sample_size == 5  # 2 + 3 comments
    # OPPOSE stance must now be significantly higher than before
    assert op.stance_oppose > 0
    assert op.stance_support < orig_support
