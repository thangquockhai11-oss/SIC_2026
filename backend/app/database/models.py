"""SQLAlchemy ORM models for TrustMedia AI."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # "user" | "admin"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    source_url = Column(String(2000), nullable=True)
    content = Column(Text, nullable=False)
    language = Column(String(10), nullable=False, default="vi")
    scope = Column(String(50), nullable=False, default="full")  # full, fact_checking, credibility, opinion, trust, reception
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    verdict = Column(String(50), nullable=True)  # SUPPORTED, REFUTED, MIXED, INSUFFICIENT_INFORMATION, CONTROVERSIAL
    confidence_score = Column(Float, nullable=True)
    ai_provider = Column(String(100), nullable=False, default="TrustMedia Baseline Engine")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="analyses")
    claims = relationship("Claim", back_populates="analysis", cascade="all, delete-orphan")
    credibility = relationship("MediaCredibility", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    opinion = relationship("PublicOpinion", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    survey = relationship("PublicTrustSurvey", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    reception = relationship("InformationReception", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    agent_executions = relationship("AgentExecution", back_populates="analysis", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    verdict = Column(String(50), nullable=False)  # SUPPORTED, REFUTED, NOT_ENOUGH_INFORMATION, NOT_CHECKABLE
    confidence = Column(Float, nullable=False, default=0.0)
    reasoning = Column(Text, nullable=False)
    limitations = Column(Text, nullable=True)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    confidence_metric_type = Column(String(100), nullable=False, default="Calibrated Posterior Probability")
    verification_status = Column(String(50), nullable=False, default="VERIFIED")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="claims")
    evidences = relationship("Evidence", back_populates="claim", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False, index=True)
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(2000), nullable=True)
    excerpt = Column(Text, nullable=False)
    stance = Column(String(30), nullable=False)  # SUPPORTS, REFUTES, NEUTRAL
    reliability_score = Column(Float, nullable=False, default=0.0)
    relevance_score = Column(Float, nullable=False, default=0.0)
    dataset_source = Column(String(100), nullable=True)
    dataset_record_id = Column(String(100), nullable=True)
    nli_relation = Column(String(50), nullable=True)
    retrieval_timestamp = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    claim = relationship("Claim", back_populates="evidences")


class MediaCredibility(Base):
    __tablename__ = "media_credibility"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    source_name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True)
    transparency_score = Column(Float, nullable=False, default=0.0)
    citation_score = Column(Float, nullable=False, default=0.0)
    evidence_score = Column(Float, nullable=False, default=0.0)
    journalistic_standard_score = Column(Float, nullable=False, default=0.0)
    overall_credibility_score = Column(Float, nullable=False, default=0.0)
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="credibility")


class PublicOpinion(Base):
    __tablename__ = "public_opinions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True, index=True)
    topic = Column(String(500), nullable=False)
    sample_size = Column(Integer, nullable=False, default=0)
    sentiment_positive = Column(Float, nullable=False, default=0.0)
    sentiment_neutral = Column(Float, nullable=False, default=0.0)
    sentiment_negative = Column(Float, nullable=False, default=0.0)
    sentiment_mixed = Column(Float, nullable=False, default=0.0)
    stance_support = Column(Float, nullable=False, default=0.0)
    stance_oppose = Column(Float, nullable=False, default=0.0)
    stance_discuss = Column(Float, nullable=False, default=0.0)
    stance_neutral = Column(Float, nullable=False, default=0.0)
    top_emotions = Column(JSON, nullable=False, default=dict)
    discussion_summary = Column(Text, nullable=False)
    raw_comments_sample = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="opinion")


class PublicTrustSurvey(Base):
    __tablename__ = "public_trust_surveys"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True, index=True)
    survey_name = Column(String(255), nullable=False)
    sample_size = Column(Integer, nullable=False, default=0)
    methodology = Column(String(500), nullable=False)
    trust_source_score = Column(Float, nullable=False, default=0.0)
    trust_message_score = Column(Float, nullable=False, default=0.0)
    trust_evidence_score = Column(Float, nullable=False, default=0.0)
    demographics_breakdown = Column(JSON, nullable=False, default=dict)
    findings_summary = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="survey")


class InformationReception(Base):
    __tablename__ = "information_receptions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True, index=True)
    sample_size = Column(Integer, nullable=False, default=0)
    comprehension_score = Column(Float, nullable=False, default=0.0)
    claim_identification_rate = Column(Float, nullable=False, default=0.0)
    acceptance_rate = Column(Float, nullable=False, default=0.0)
    sharing_intention_high = Column(Float, nullable=False, default=0.0)
    sharing_intention_medium = Column(Float, nullable=False, default=0.0)
    sharing_intention_low = Column(Float, nullable=False, default=0.0)
    verify_before_sharing_rate = Column(Float, nullable=False, default=0.0)
    cognitive_resistance_notes = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="reception")


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    execution_id = Column(String(36), default=gen_uuid, nullable=False, index=True)
    agent_name = Column(String(100), nullable=False)
    agent_role = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="COMPLETED")  # IDLE, RUNNING, COMPLETED, FAILED
    latency_ms = Column(Integer, nullable=False, default=0)
    execution_time_ms = Column(Integer, nullable=False, default=0)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    dataset_ids = Column(JSON, nullable=True)
    dataset_versions = Column(JSON, nullable=True)
    evidence_ids = Column(JSON, nullable=True)
    retrieval_count = Column(Integer, nullable=False, default=0)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    result_summary = Column(Text, nullable=True)
    disagreement_detected = Column(Boolean, nullable=False, default=False)
    errors = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    analysis = relationship("Analysis", back_populates="agent_executions")


class DatasetItem(Base):
    __tablename__ = "dataset_items"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    dataset_id = Column(String(120), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    source_url = Column(String(2000), nullable=True)
    languages = Column(JSON, nullable=False, default=list)
    intended_tasks = Column(JSON, nullable=False, default=list)
    dataset_version = Column(String(50), nullable=True)
    license = Column(String(100), nullable=True)
    sample_count = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="UNVERIFIED")
    license_status = Column(String(30), nullable=False, default="UNVERIFIED")
    schema_status = Column(String(30), nullable=False, default="UNVERIFIED")
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    doc_type = Column(String(50), nullable=False, default="dataset_excerpt")
    source_url = Column(String(2000), nullable=True)
    source_name = Column(String(255), nullable=False)
    dataset_id = Column(String(100), nullable=True, index=True)
    record_id = Column(String(100), nullable=True)
    language = Column(String(10), nullable=False, default="vi")
    publication_date = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1024), nullable=True)
    token_count = Column(Integer, nullable=False, default=0)
    metadata_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    document = relationship("Document", back_populates="chunks")
    embeddings = relationship("EmbeddingRecord", back_populates="chunk", cascade="all, delete-orphan")
    evidence_records = relationship("EvidenceRecord", back_populates="chunk")


class EmbeddingRecord(Base):
    __tablename__ = "embeddings"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(150), nullable=False, default="BAAI/bge-m3")
    model_version = Column(String(50), nullable=False, default="1.0")
    dimension = Column(Integer, nullable=False, default=1024)
    vector_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    chunk = relationship("DocumentChunk", back_populates="embeddings")


class RetrievalLog(Base):
    __tablename__ = "retrieval_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    query = Column(Text, nullable=False)
    agent_name = Column(String(100), nullable=False)
    dataset_id = Column(String(100), nullable=True)
    top_k = Column(Integer, nullable=False, default=5)
    bm25_count = Column(Integer, nullable=False, default=0)
    vector_count = Column(Integer, nullable=False, default=0)
    hybrid_count = Column(Integer, nullable=False, default=0)
    rerank_count = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Float, nullable=False, default=0.0)
    chosen_evidence_ids = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True, index=True)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=True, index=True)
    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True, index=True)
    claim_text = Column(Text, nullable=False)
    query = Column(Text, nullable=True)
    relevance_score = Column(Float, nullable=False, default=0.0)
    rerank_score = Column(Float, nullable=False, default=0.0)
    rrf_score = Column(Float, nullable=False, default=0.0)
    retrieval_method = Column(String(50), nullable=False, default="hybrid_rrf_rerank")
    source_name = Column(String(255), nullable=True)
    source_url = Column(String(2000), nullable=True)
    dataset_source = Column(String(100), nullable=True)
    dataset_record_id = Column(String(100), nullable=True)
    excerpt = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    chunk = relationship("DocumentChunk", back_populates="evidence_records")


class RAGExecution(Base):
    __tablename__ = "rag_executions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    execution_id = Column(String(36), default=gen_uuid, nullable=False, index=True)
    agent_name = Column(String(100), nullable=False)
    query = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="COMPLETED")
    latency_ms = Column(Integer, nullable=False, default=0)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class RAGModelVersion(Base):
    __tablename__ = "rag_model_versions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    component = Column(String(50), nullable=False)
    model_name = Column(String(150), nullable=False)
    model_version = Column(String(50), nullable=False)
    dimension = Column(Integer, nullable=False, default=1024)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

