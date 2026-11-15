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
    verdict: str
    confidence: float
    reasoning: str
    limitations: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    confidence_metric_type: str = "Calibrated Posterior Probability"
    verification_status: str = "VERIFIED"
    evidences: list[EvidenceResponse] = []


class MediaCredibilityResponse(BaseModel):
    id: str
    source_name: str
    domain: str | None = None
    transparency_score: float
    citation_score: float
    evidence_score: float
    journalistic_standard_score: float
    overall_credibility_score: float
    reasoning: str


class PublicOpinionResponse(BaseModel):
    id: str
    topic: str
    sample_size: int
    sentiment_positive: float
    sentiment_neutral: float
    sentiment_negative: float
    sentiment_mixed: float
    stance_support: float
    stance_oppose: float
    stance_discuss: float
    stance_neutral: float
    top_emotions: dict[str, float]
    discussion_summary: str
    raw_comments_sample: list[dict] | None = None


class PublicTrustSurveyResponse(BaseModel):
    id: str
    survey_name: str
    sample_size: int
    methodology: str
    trust_source_score: float
    trust_message_score: float
    trust_evidence_score: float
    demographics_breakdown: dict
    findings_summary: str
    limitations: str


class InformationReceptionResponse(BaseModel):
    id: str
    sample_size: int
    comprehension_score: float
    claim_identification_rate: float
    acceptance_rate: float
    sharing_intention_high: float
    sharing_intention_medium: float
    sharing_intention_low: float
    verify_before_sharing_rate: float
    cognitive_resistance_notes: str


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

