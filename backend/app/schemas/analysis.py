"""Schemas for News Analysis, Claims, Credibility, Opinion, Trust, and Dashboard."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AnalysisCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=500)
    source_url: str | None = Field(default=None, max_length=2000)
    content: str | None = Field(default=None, max_length=50000)
    language: str = Field(default="vi", max_length=10)
    scope: str = Field(default="full", max_length=50)


class AnalysisStatusResponse(BaseModel):
    id: str
    status: str
    error_message: str | None = None
    progress_percent: int
    created_at: datetime


class EvidenceResponse(BaseModel):
    id: str
    source_name: str
    source_url: str | None = None
    excerpt: str
    stance: str
    reliability_score: float
    relevance_score: float = 0.0
    dataset_source: str | None = None
    dataset_record_id: str | None = None
    nli_relation: str | None = None
    retrieval_timestamp: datetime


class ClaimResponse(BaseModel):
    id: str
    claim_text: str
    original_sentence: str | None = None
    paragraph_id: int | None = 0
    verdict: str
    confidence: float
    reasoning: str
    limitations: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    confidence_metric_type: str = "Calibrated Posterior Probability"
    verification_status: str = "VERIFIED"
    evidences: list[EvidenceResponse] = []


class OutletProfile(BaseModel):
    publisher_name: str
    ownership: str | None = None
    editorial_policy: str | None = None
    correction_policy: str | None = None
    verification_source: str | None = None


class ArticleQuality(BaseModel):
    author: str | None = None
    data_sources: list[str] = []
    cited_documents: list[str] = []
    citation_density: float = 0.0
    sensationalism_assessment: str | None = None


class OutletSummary(BaseModel):
    has_sufficient_sample: bool = False
    sample_size: int | None = None
    survey_timeframe: str | None = None
    outlet_score: float | None = None
    summary_note: str


class MediaCredibilityResponse(BaseModel):
    id: str
    source_name: str
    domain: str | None = None
    transparency_score: float
    citation_score: float
    evidence_score: float
    journalistic_standard_score: float
    overall_credibility_score: float | None = None
    reasoning: str
    outlet_profile: OutletProfile | None = None
    article_quality: ArticleQuality | None = None
    outlet_summary: OutletSummary | None = None


class PublicOpinionResponse(BaseModel):
    id: str
    topic: str
    sample_size: int
    sentiment_positive: float | None = None
    sentiment_neutral: float | None = None
    sentiment_negative: float | None = None
    sentiment_mixed: float | None = None
    stance_support: float | None = None
    stance_oppose: float | None = None
    stance_discuss: float | None = None
    stance_neutral: float | None = None
    top_emotions: dict[str, float] = {}
    discussion_summary: str | None = None
    raw_comments_sample: list[dict | str] | None = None
    data_provenance_type: str = "OBSERVED"
    input_summary: str | None = None
    method_applied: str | None = None
    fallback_reason: str | None = None


class PublicTrustSurveyResponse(BaseModel):
    id: str
    survey_name: str
    sample_size: int
    methodology: str | None = None
    trust_source_score: float | None = None
    trust_message_score: float | None = None
    trust_evidence_score: float | None = None
    demographics_breakdown: dict = {}
    findings_summary: str | None = None
    limitations: str | None = None
    data_provenance_type: str = "OBSERVED"
    input_summary: str | None = None
    method_applied: str | None = None
    fallback_reason: str | None = None


class InformationReceptionResponse(BaseModel):
    id: str
    sample_size: int
    comprehension_score: float | None = None
    comprehension_ratio_str: str | None = None
    claim_identification_rate: float | None = None
    acceptance_rate: float | None = None
    sharing_intention_high: float | None = None
    sharing_intention_medium: float | None = None
    sharing_intention_low: float | None = None
    verify_before_sharing_rate: float | None = None
    cognitive_resistance_notes: str | None = None
    data_provenance_type: str = "OBSERVED"
    input_summary: str | None = None
    method_applied: str | None = None
    fallback_reason: str | None = None


class QuizQuestionCreate(BaseModel):
    question_text: str
    options: list[str]
    correct_option_index: int
    explanation: str | None = None


class QuizQuestionResponse(BaseModel):
    id: str
    analysis_id: str
    snapshot_id: str | None = None
    question_text: str
    options: list[str]
    correct_option_index: int
    explanation: str | None = None


class ReaderSurveyCreate(BaseModel):
    trust_outlet_score: float = Field(default=80.0, ge=0.0, le=100.0)
    claim_trust_ratings: dict[str, float] = Field(default_factory=dict)
    quiz_answers: dict[str, int] = Field(default_factory=dict)
    sharing_intention: str = Field(default="MEDIUM")
    verify_before_sharing: bool = True
    session_id: str | None = None
    submission_batch_id: str | None = None


class ReaderSurveyRecordResponse(BaseModel):
    id: str
    analysis_id: str
    snapshot_id: str | None = None
    session_id: str | None = None
    submission_batch_id: str | None = None
    trust_outlet_score: float
    claim_trust_ratings: dict[str, float]
    quiz_answers: dict[str, int]
    correct_count: int
    total_questions: int
    comprehension_score: float
    sharing_intention: str
    verify_before_sharing: bool
    created_at: datetime


class UserCommentCreate(BaseModel):
    comment_text: str = Field(min_length=3, max_length=2000)
    author_name: str = "Độc giả"
    submission_batch_id: str | None = None


class UserCommentRecordResponse(BaseModel):
    id: str
    analysis_id: str
    snapshot_id: str | None = None
    author_name: str
    comment_text: str
    stances: list[dict] = []
    created_at: datetime


class BatchFeedbackSubmission(BaseModel):
    surveys: list[ReaderSurveyCreate] = []
    comments: list[UserCommentCreate] = []
    batch_id: str | None = None


class BatchFeedbackResponse(BaseModel):
    analysis_id: str
    submitted_surveys: int
    submitted_comments: int
    batch_id: str | None = None
    comprehension_score: float | None = None
    comprehension_ratio_str: str | None = None
    updated_stance_distribution: dict[str, float | None] = {}


class AgentExecutionResponse(BaseModel):
    id: str
    execution_id: str | None = None
    agent_name: str
    agent_role: str
    status: str
    latency_ms: int
    execution_time_ms: int = 0
    model_name: str | None = None
    model_version: str | None = None
    dataset_ids: list[str] | None = None
    dataset_versions: dict[str, str] | None = None
    evidence_ids: list[str] | None = None
    retrieval_count: int = 0
    start_time: datetime | None = None
    end_time: datetime | None = None
    result_summary: str | None = None
    disagreement_detected: bool = False
    errors: list[str] | dict | None = None
    output: dict | None = None
    details: dict | None = None


class AgentExecutionTraceResponse(BaseModel):
    analysis_id: str
    total_latency_ms: int = 0
    traces: list[AgentExecutionResponse]


class ArticleSnapshotResponse(BaseModel):
    id: str
    analysis_id: str | None = None
    source_url: str
    final_url: str | None = None
    title: str
    author: str | None = None
    published_date: str | None = None
    extraction_status: str = "SUCCESS"  # SUCCESS, PAYWALL_DETECTED, TITLE_ONLY_EXTRACTED, FIXTURE_FALLBACK
    paragraphs: list[str] = []
    source_links: list[dict] = []
    version: int = 1
    is_verified_online: bool = True
    created_at: datetime


class AnalysisDetailResponse(BaseModel):
    id: str
    user_id: str | None = None
    title: str
    source_url: str | None = None
    content: str
    language: str
    scope: str
    status: str
    error_message: str | None = None
    summary: str | None = None
    verdict: str | None = None
    confidence_score: float | None = None
    ai_provider: str
    created_at: datetime
    completed_at: datetime | None = None
    claims: list[ClaimResponse] = []
    credibility: MediaCredibilityResponse | None = None
    opinion: PublicOpinionResponse | None = None
    survey: PublicTrustSurveyResponse | None = None
    reception: InformationReceptionResponse | None = None
    agent_executions: list[AgentExecutionResponse] = []
    snapshot: ArticleSnapshotResponse | None = None
    snapshots: list[ArticleSnapshotResponse] = []


class AnalysisListItem(BaseModel):
    id: str
    title: str
    source_url: str | None = None
    verdict: str | None = None
    confidence_score: float | None = None
    status: str
    ai_provider: str
    created_at: datetime
    claims_count: int = 0


class AnalysisListResponse(BaseModel):
    items: list[AnalysisListItem]
    total: int
    page: int
    page_size: int


class DashboardStatsResponse(BaseModel):
    total_analyses: int
    completed_analyses: int
    failed_analyses: int
    total_claims: int
    average_confidence: float
    sentiment_distribution: dict[str, float]
    stance_distribution: dict[str, float]
    recent_activities: list[dict]
    chart_data: list[dict]


class OpinionAnalyzeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: str | None = Field(default="Thảo luận người dùng", max_length=200)
    comments: list[str] = Field(min_length=1, max_length=200)


class SurveyCreateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    survey_name: str = Field(min_length=3, max_length=255)
    sample_size: int = Field(ge=10, le=1000000)
    methodology: str = Field(min_length=10, max_length=500)
    trust_source_score: float = Field(ge=0.0, le=100.0)
    trust_message_score: float = Field(ge=0.0, le=100.0)
    trust_evidence_score: float = Field(ge=0.0, le=100.0)
    demographics_breakdown: dict = Field(default_factory=dict)
    findings_summary: str = Field(min_length=10)
    limitations: str = Field(min_length=5)

