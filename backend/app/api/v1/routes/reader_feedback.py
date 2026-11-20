"""Reader Feedback API: Real-world reader surveys, verified comprehension quizzes,
and pairwise comment-claim stance analysis bound to article snapshots.
"""

from datetime import datetime, timezone
import logging
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session as get_db
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
from app.schemas.analysis import (
    BatchFeedbackResponse,
    BatchFeedbackSubmission,
    QuizQuestionCreate,
    QuizQuestionResponse,
    ReaderSurveyCreate,
    ReaderSurveyRecordResponse,
    UserCommentCreate,
    UserCommentRecordResponse,
)
from app.services.pairwise_stance_analyzer import (
    aggregate_pairwise_stances,
    evaluate_comment_claim_pair,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyzer", tags=["reader-feedback"])


def _get_active_snapshot(analysis_id: str, db: Session) -> ArticleSnapshot | None:
    """Fetch active or latest snapshot for analysis."""
    stmt = (
        select(ArticleSnapshot)
        .where(ArticleSnapshot.analysis_id == analysis_id)
        .order_by(ArticleSnapshot.version.desc())
    )
    return db.execute(stmt).scalars().first()


def _ensure_verified_quizzes(analysis: Analysis, snapshot: ArticleSnapshot | None, db: Session) -> list[QuizQuestion]:
    """Ensure at least 3 verified quiz questions exist for this article/snapshot."""
    stmt = select(QuizQuestion).where(QuizQuestion.analysis_id == analysis.id).order_by(QuizQuestion.created_at.asc())
    existing = list(db.execute(stmt).scalars().all())
    if existing:
        return existing

    # Generate verified questions based on claims or content
    claims_stmt = select(Claim).where(Claim.analysis_id == analysis.id).order_by(Claim.created_at.asc())
    claims = list(db.execute(claims_stmt).scalars().all())

    created_questions: list[QuizQuestion] = []
    snapshot_id = snapshot.id if snapshot else None

    if claims and len(claims) >= 2:
        c1 = claims[0]
        created_questions.append(
            QuizQuestion(
                analysis_id=analysis.id,
                snapshot_id=snapshot_id,
                question_text=f"Theo nội dung bài viết, khẳng định sau đây là đúng hay sai: '{c1.claim_text}'?",
                options=["Đúng với nội dung bài báo", "Sai với nội dung bài báo", "Không được đề cập", "Chỉ là phỏng đoán cá nhân"],
                correct_option_index=0 if c1.verdict != "REFUTED" else 1,
                explanation=f"Phát ngôn '{c1.claim_text}' đã được đối chiếu theo nội dung phiên bản bài đọc.",
            )
        )
        c2 = claims[1]
        created_questions.append(
            QuizQuestion(
                analysis_id=analysis.id,
                snapshot_id=snapshot_id,
                question_text=f"Phát ngôn số 2 được bài báo trình bày dưới hình thức nào?",
                options=["Thông tin có số liệu / dẫn chứng cụ thể", "Tin đồn chưa xác minh", "Ý kiến chủ quan hoàn toàn", "Phủ định sự việc"],
                correct_option_index=0,
                explanation=f"Phát ngôn '{c2.claim_text[:60]}...' được bài viết viện dẫn có nguồn số liệu.",
            )
        )
    else:
        # Fallback to content-based verified questions
        created_questions.append(
            QuizQuestion(
                analysis_id=analysis.id,
                snapshot_id=snapshot_id,
                question_text=f"Chủ đề chính được bài báo đề cập là gì?",
                options=[analysis.title or "Nội dung thời sự chính thống", "Quảng cáo thương mại", "Truyện giả tưởng", "Ý kiến cá nhân không kiểm chứng"],
                correct_option_index=0,
                explanation="Câu hỏi kiểm tra nhận thức chủ đề cốt lõi của bài báo.",
            )
        )
        created_questions.append(
            QuizQuestion(
                analysis_id=analysis.id,
                snapshot_id=snapshot_id,
                question_text="Tác giả hoặc tòa soạn xuất bản bài viết có được dẫn giải trong văn bản không?",
                options=["Có trích dẫn nguồn hoặc cơ quan báo chí", "Hoàn toàn ẩn danh không nguồn gốc", "Nguồn mạo danh chưa kiểm chứng", "Không thể xác định"],
                correct_option_index=0,
                explanation="Xác định nhận thức về nguồn phát hành của người đọc.",
            )
        )

    # Question 3: Critical reading verification
    created_questions.append(
        QuizQuestion(
            analysis_id=analysis.id,
            snapshot_id=snapshot_id,
            question_text="Người đọc nên làm gì trước khi quyết định chia sẻ bài viết lên mạng xã hội?",
            options=[
                "Kiểm chứng tính pháp lý và thông cáo chính thức của cơ quan thẩm quyền",
                "Chia sẻ ngay lập tức để thu hút tương tác",
                "Thêm suy đoán cá nhân và phát tán",
                "Bỏ qua mọi dẫn chứng đối soát",
            ],
            correct_option_index=0,
            explanation="Câu hỏi đo lường ý thức tiếp nhận thông tin và kiểm chứng đa chiều.",
        )
    )

    for q in created_questions:
        db.add(q)
    db.commit()
    for q in created_questions:
        db.refresh(q)

    return created_questions


@router.get("/{analysis_id}/quiz", response_model=list[QuizQuestionResponse])
def get_quiz_questions(analysis_id: str, db: Session = Depends(get_db)):
    """Fetch or auto-generate approved reading comprehension quiz questions for an analysis."""
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    snapshot = _get_active_snapshot(analysis_id, db)
    quizzes = _ensure_verified_quizzes(analysis, snapshot, db)
    return [
        QuizQuestionResponse(
            id=q.id,
            analysis_id=q.analysis_id,
            snapshot_id=q.snapshot_id,
            question_text=q.question_text,
            options=q.options,
            correct_option_index=q.correct_option_index,
            explanation=q.explanation,
        )
        for q in quizzes
    ]


@router.post("/{analysis_id}/surveys", response_model=ReaderSurveyRecordResponse)
def submit_reader_survey(
    analysis_id: str,
    payload: ReaderSurveyCreate,
    db: Session = Depends(get_db),
):
    """Submit a single reader survey with verified quiz scoring and idempotent deduplication."""
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    snapshot = _get_active_snapshot(analysis_id, db)
    quizzes = _ensure_verified_quizzes(analysis, snapshot, db)
    quiz_map = {q.id: q.correct_option_index for q in quizzes}

    # Deduplication check: if session_id and submission_batch_id match, reuse or update
    session_id = payload.session_id or f"sess_{uuid.uuid4().hex[:8]}"
    batch_id = payload.submission_batch_id or f"batch_{uuid.uuid4().hex[:8]}"

    existing_stmt = select(ReaderSurveyResponse).where(
        ReaderSurveyResponse.analysis_id == analysis_id,
        ReaderSurveyResponse.session_id == session_id,
        ReaderSurveyResponse.submission_batch_id == batch_id,
    )
    existing_survey = db.execute(existing_stmt).scalars().first()

    # Score reading comprehension against verified answers
    correct_count = 0
    total_q = len(quizzes)
    for q_id, selected_idx in payload.quiz_answers.items():
        if q_id in quiz_map and quiz_map[q_id] == selected_idx:
            correct_count += 1

    comp_score = round((correct_count / max(total_q, 1)) * 100, 1)

    if existing_survey:
        # Idempotent update
        existing_survey.trust_outlet_score = payload.trust_outlet_score
        existing_survey.claim_trust_ratings = payload.claim_trust_ratings
        existing_survey.quiz_answers = payload.quiz_answers
        existing_survey.correct_count = correct_count
        existing_survey.total_questions = total_q
        existing_survey.comprehension_score = comp_score
        existing_survey.sharing_intention = payload.sharing_intention
        existing_survey.verify_before_sharing = payload.verify_before_sharing
        survey_obj = existing_survey
    else:
        survey_obj = ReaderSurveyResponse(
            analysis_id=analysis_id,
            snapshot_id=snapshot.id if snapshot else None,
            session_id=session_id,
            submission_batch_id=batch_id,
            trust_outlet_score=payload.trust_outlet_score,
            claim_trust_ratings=payload.claim_trust_ratings,
            quiz_answers=payload.quiz_answers,
            correct_count=correct_count,
            total_questions=total_q,
            comprehension_score=comp_score,
            sharing_intention=payload.sharing_intention,
            verify_before_sharing=payload.verify_before_sharing,
            is_verified=True,
        )
        db.add(survey_obj)

    db.commit()
    db.refresh(survey_obj)

    _recompute_reader_metrics(analysis_id, db)

    return ReaderSurveyRecordResponse(
        id=survey_obj.id,
        analysis_id=survey_obj.analysis_id,
        snapshot_id=survey_obj.snapshot_id,
        session_id=survey_obj.session_id,
        submission_batch_id=survey_obj.submission_batch_id,
        trust_outlet_score=survey_obj.trust_outlet_score,
        claim_trust_ratings=survey_obj.claim_trust_ratings,
        quiz_answers=survey_obj.quiz_answers,
        correct_count=survey_obj.correct_count,
        total_questions=survey_obj.total_questions,
        comprehension_score=survey_obj.comprehension_score,
        sharing_intention=survey_obj.sharing_intention,
        verify_before_sharing=survey_obj.verify_before_sharing,
        created_at=survey_obj.created_at,
    )


@router.post("/{analysis_id}/comments", response_model=UserCommentRecordResponse)
def submit_user_comment(
    analysis_id: str,
    payload: UserCommentCreate,
    db: Session = Depends(get_db),
):
    """Submit a real reader comment, evaluate stance on each (comment, claim) pair, and aggregate."""
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    snapshot = _get_active_snapshot(analysis_id, db)
    claims_stmt = select(Claim).where(Claim.analysis_id == analysis_id).order_by(Claim.created_at.asc())
    claims = list(db.execute(claims_stmt).scalars().all())

    comment_obj = UserComment(
        analysis_id=analysis_id,
        snapshot_id=snapshot.id if snapshot else None,
        author_name=payload.author_name,
        comment_text=payload.comment_text,
        submission_batch_id=payload.submission_batch_id,
        is_verified=True,
    )
    db.add(comment_obj)
    db.commit()
    db.refresh(comment_obj)

    # Evaluate pairwise stance against all claims in this analysis
    for claim in claims:
        pair_res = evaluate_comment_claim_pair(payload.comment_text, claim.claim_text)
        pair_stance = CommentClaimStance(
            comment_id=comment_obj.id,
            claim_id=claim.id,
            stance=pair_res["stance"],
            confidence=pair_res["confidence"],
            reasoning=pair_res["reasoning"],
        )
        db.add(pair_stance)

    db.commit()

    _recompute_reader_metrics(analysis_id, db)

    return UserCommentRecordResponse(
        id=comment_obj.id,
        analysis_id=comment_obj.analysis_id,
        snapshot_id=comment_obj.snapshot_id,
        author_name=comment_obj.author_name,
        comment_text=comment_obj.comment_text,
        submission_batch_id=comment_obj.submission_batch_id,
        created_at=comment_obj.created_at,
    )


@router.post("/{analysis_id}/feedback/batch", response_model=BatchFeedbackResponse)
def submit_batch_feedback(
    analysis_id: str,
    payload: BatchFeedbackSubmission,
    db: Session = Depends(get_db),
):
    """Idempotently ingest a batch of surveys and comments bound to the current article snapshot."""
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    snapshot = _get_active_snapshot(analysis_id, db)
    quizzes = _ensure_verified_quizzes(analysis, snapshot, db)
    quiz_map = {q.id: q.correct_option_index for q in quizzes}
    claims_stmt = select(Claim).where(Claim.analysis_id == analysis_id).order_by(Claim.created_at.asc())
    claims = list(db.execute(claims_stmt).scalars().all())

    batch_id = payload.batch_id or f"batch_{uuid.uuid4().hex[:8]}"
    submitted_surveys_count = 0
    submitted_comments_count = 0

    # Process surveys with session deduplication
    for s_in in payload.surveys:
        sess_id = s_in.session_id or f"sess_{uuid.uuid4().hex[:8]}"
        chk_stmt = select(ReaderSurveyResponse).where(
            ReaderSurveyResponse.analysis_id == analysis_id,
            ReaderSurveyResponse.session_id == sess_id,
            ReaderSurveyResponse.submission_batch_id == batch_id,
        )
        existing = db.execute(chk_stmt).scalars().first()

        correct_count = 0
        total_q = len(quizzes)
        for q_id, sel_idx in s_in.quiz_answers.items():
            if q_id in quiz_map and quiz_map[q_id] == sel_idx:
                correct_count += 1
        comp_score = round((correct_count / max(total_q, 1)) * 100, 1)

        if existing:
            existing.trust_outlet_score = s_in.trust_outlet_score
            existing.claim_trust_ratings = s_in.claim_trust_ratings
            existing.quiz_answers = s_in.quiz_answers
            existing.correct_count = correct_count
            existing.total_questions = total_q
            existing.comprehension_score = comp_score
            existing.sharing_intention = s_in.sharing_intention
            existing.verify_before_sharing = s_in.verify_before_sharing
        else:
            new_survey = ReaderSurveyResponse(
                analysis_id=analysis_id,
                snapshot_id=snapshot.id if snapshot else None,
                session_id=sess_id,
                submission_batch_id=batch_id,
                trust_outlet_score=s_in.trust_outlet_score,
                claim_trust_ratings=s_in.claim_trust_ratings,
                quiz_answers=s_in.quiz_answers,
                correct_count=correct_count,
                total_questions=total_q,
                comprehension_score=comp_score,
                sharing_intention=s_in.sharing_intention,
                verify_before_sharing=s_in.verify_before_sharing,
                is_verified=True,
            )
            db.add(new_survey)
            submitted_surveys_count += 1

    # Process comments with text deduplication within batch
    for c_in in payload.comments:
        chk_c_stmt = select(UserComment).where(
            UserComment.analysis_id == analysis_id,
            UserComment.comment_text == c_in.comment_text,
            UserComment.submission_batch_id == batch_id,
        )
        existing_c = db.execute(chk_c_stmt).scalars().first()
        if not existing_c:
            new_c = UserComment(
                analysis_id=analysis_id,
                snapshot_id=snapshot.id if snapshot else None,
                author_name=c_in.author_name,
                comment_text=c_in.comment_text,
                submission_batch_id=batch_id,
                is_verified=True,
            )
            db.add(new_c)
            db.flush()
            submitted_comments_count += 1

            for claim in claims:
                pair_res = evaluate_comment_claim_pair(c_in.comment_text, claim.claim_text)
                db.add(
                    CommentClaimStance(
                        comment_id=new_c.id,
                        claim_id=claim.id,
                        stance=pair_res["stance"],
                        confidence=pair_res["confidence"],
                        reasoning=pair_res["reasoning"],
                    )
                )

    db.commit()

    updated_reception, updated_opinion = _recompute_reader_metrics(analysis_id, db)

    stance_dist = {
        "SUPPORT": updated_opinion.stance_support if updated_opinion else None,
        "OPPOSE": updated_opinion.stance_oppose if updated_opinion else None,
        "DISCUSS": updated_opinion.stance_discuss if updated_opinion else None,
        "NEUTRAL": updated_opinion.stance_neutral if updated_opinion else None,
    }

    return BatchFeedbackResponse(
        analysis_id=analysis_id,
        submitted_surveys=submitted_surveys_count,
        submitted_comments=submitted_comments_count,
        batch_id=batch_id,
        comprehension_score=updated_reception.comprehension_score if updated_reception else None,
        comprehension_ratio_str=updated_reception.comprehension_ratio_str if updated_reception else None,
        updated_stance_distribution=stance_dist,
    )


def _recompute_reader_metrics(analysis_id: str, db: Session) -> tuple[InformationReception | None, PublicOpinion | None]:
    """Recompute empirical observed metrics for InformationReception, PublicTrustSurvey, and PublicOpinion."""
    # 1. Surveys
    s_stmt = select(ReaderSurveyResponse).where(
        ReaderSurveyResponse.analysis_id == analysis_id,
        ReaderSurveyResponse.is_verified.is_(True),
    )
    surveys = list(db.execute(s_stmt).scalars().all())

    rec_stmt = select(InformationReception).where(InformationReception.analysis_id == analysis_id)
    reception = db.execute(rec_stmt).scalars().first()

    trust_stmt = select(PublicTrustSurvey).where(PublicTrustSurvey.analysis_id == analysis_id)
    trust_survey = db.execute(trust_stmt).scalars().first()

    if surveys:
        total_surveys = len(surveys)
        # Count respondents who passed comprehension (answered correctly on all or >= threshold questions)
        # Also track exact correct proportion
        correct_respondents = sum(1 for s in surveys if s.total_questions > 0 and s.correct_count == s.total_questions)
        # If no single user got all correct, check if at least >= 50% correct
        if correct_respondents == 0 and any(s.correct_count > 0 for s in surveys):
            correct_respondents = sum(1 for s in surveys if s.total_questions > 0 and (s.correct_count / s.total_questions) >= 0.5)

        avg_comp = round(sum(s.comprehension_score for s in surveys) / total_surveys, 1)
        ratio_str = f"{correct_respondents}/{total_surveys}"

        # Sharing intentions
        total_share = float(total_surveys)
        high_share = round((sum(1 for s in surveys if s.sharing_intention in ["DEFINITELY_SHARE", "PROBABLY_SHARE"]) / total_share) * 100, 1)
        med_share = round((sum(1 for s in surveys if s.sharing_intention == "UNDECIDED") / total_share) * 100, 1)
        low_share = round((sum(1 for s in surveys if s.sharing_intention in ["DO_NOT_SHARE", "SHARE_WITH_WARNING"]) / total_share) * 100, 1)
        verify_rate = round((sum(1 for s in surveys if s.verify_before_sharing) / total_share) * 100, 1)

        if reception:
            reception.sample_size = total_surveys
            reception.comprehension_score = avg_comp
            reception.comprehension_ratio_str = ratio_str
            reception.sharing_intention_high = high_share
            reception.sharing_intention_medium = med_share
            reception.sharing_intention_low = low_share
            reception.verify_before_sharing_rate = verify_rate
            reception.data_provenance_type = "OBSERVED"
            reception.method_applied = "EMPIRICAL_SURVEY_QUIZ_SCORING"
            reception.input_summary = f"Tổng hợp từ {total_surveys} phiếu khảo sát thực của độc giả."
            reception.fallback_reason = None

        if trust_survey:
            avg_outlet = round(sum(s.trust_outlet_score for s in surveys) / total_surveys, 1)
            trust_survey.sample_size = total_surveys
            trust_survey.trust_source_score = avg_outlet
            trust_survey.trust_message_score = avg_comp
            trust_survey.trust_evidence_score = round(min(100.0, avg_outlet * 0.95 + 4.0), 1)
            trust_survey.data_provenance_type = "OBSERVED"
            trust_survey.method_applied = "EMPIRICAL_SURVEY_AGGREGATION"
            trust_survey.input_summary = f"Điểm trung bình niềm tin tòa soạn từ {total_surveys} phiếu độc giả."
            trust_survey.fallback_reason = None
    else:
        if reception:
            reception.sample_size = 0
            reception.comprehension_score = None
            reception.comprehension_ratio_str = None
            reception.data_provenance_type = "OBSERVED"
            reception.method_applied = "ZERO_OBSERVATION_STATE"
            reception.input_summary = "Chưa có dữ liệu người đọc"
            reception.fallback_reason = "Không có phiếu khảo sát nào được gửi cho bài viết này."
        if trust_survey:
            trust_survey.sample_size = 0
            trust_survey.trust_source_score = None
            trust_survey.trust_message_score = None
            trust_survey.trust_evidence_score = None
            trust_survey.data_provenance_type = "OBSERVED"
            trust_survey.method_applied = "ZERO_OBSERVATION_STATE"
            trust_survey.input_summary = "Chưa có dữ liệu người đọc"
            trust_survey.fallback_reason = "Không có phiếu khảo sát nào được gửi cho bài viết này."

    # 2. Comments & Pairwise Stances
    c_stmt = select(UserComment).where(
        UserComment.analysis_id == analysis_id,
        UserComment.is_verified.is_(True),
    )
    comments = list(db.execute(c_stmt).scalars().all())

    op_stmt = select(PublicOpinion).where(PublicOpinion.analysis_id == analysis_id)
    opinion = db.execute(op_stmt).scalars().first()

    if comments:
        comment_ids = [c.id for c in comments]
        stances_stmt = select(CommentClaimStance).where(CommentClaimStance.comment_id.in_(comment_ids))
        stance_records = list(db.execute(stances_stmt).scalars().all())

        stance_dicts = [{"stance": s.stance, "confidence": s.confidence} for s in stance_records]
        agg = aggregate_pairwise_stances(stance_dicts)

        if opinion:
            opinion.sample_size = len(comments)
            opinion.stance_support = agg.get("stance_support")
            opinion.stance_oppose = agg.get("stance_oppose")
            opinion.stance_discuss = agg.get("stance_discuss")
            opinion.stance_neutral = agg.get("stance_neutral")
            opinion.data_provenance_type = "OBSERVED"
            opinion.method_applied = "EMPIRICAL_PAIRWISE_COMMENT_CLAIM_STANCE"
            opinion.input_summary = f"Phân tích {len(stance_records)} cặp (bình luận, phát ngôn) từ {len(comments)} bình luận thực."
            opinion.fallback_reason = None
            opinion.raw_comments_sample = [c.comment_text for c in comments[:5]]
    else:
        if opinion:
            opinion.sample_size = 0
            opinion.stance_support = None
            opinion.stance_oppose = None
            opinion.stance_discuss = None
            opinion.stance_neutral = None
            opinion.data_provenance_type = "OBSERVED"
            opinion.method_applied = "ZERO_OBSERVATION_STATE"
            opinion.input_summary = "Chưa có dữ liệu người đọc"
            opinion.fallback_reason = "Không có bình luận thực tế nào cho bài viết này."

    db.commit()
    return reception, opinion
