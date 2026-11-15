"""Pydantic schemas for Advanced Hybrid RAG APIs."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class RAGIngestRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=500, description="Tiêu đề tài liệu")
    content: str = Field(..., min_length=10, description="Nội dung văn bản cần nạp vào RAG")
    source_name: str = Field(..., min_length=1, max_length=255, description="Tên nguồn xuất bản")
    source_url: str | None = Field(default=None, max_length=2000, description="URL bài báo hoặc tài liệu")
    dataset_id: str | None = Field(default=None, max_length=100, description="Định danh dataset nghiên cứu")
    record_id: str | None = Field(default=None, max_length=100, description="ID bản ghi trong dataset")
    language: str = Field(default="vi", max_length=10, description="Ngôn ngữ chính (vi hoặc en)")
    doc_type: str = Field(default="article", max_length=50, description="Loại tài liệu")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata bổ sung")


class RAGIngestResponse(BaseModel):
    document_id: str
    title: str
    chunks_count: int
    embedding_model: str
    dimension: int
    status: str = "COMPLETED"


class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Từ khóa hoặc Claim cần tra cứu")
    top_k: int = Field(default=5, ge=1, le=50, description="Số lượng bằng chứng trả về")
    dataset_filter: str | None = Field(default=None, description="Lọc theo dataset_id cụ thể")
    method: str = Field(default="hybrid", description="Phương thức: hybrid | vector | bm25")
    use_reranker: bool = Field(default=True, description="Kích hoạt BGE-Reranker v2 M3")


class RAGSearchResultItem(BaseModel):
    chunk_id: str
    document_id: str | None = None
    doc_title: str
    content: str
    source_name: str
    source_url: str | None = None
    relevance_score: float
    bm25_score: float | None = None
    vector_similarity: float | None = None
    rrf_score: float | None = None
    dataset_id: str | None = None


class RAGSearchResponse(BaseModel):
    query: str
    total_results: int
    method: str
    latency_ms: float
    results: list[RAGSearchResultItem]


class RAGRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    claim_text: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)
    dataset_filter: str | None = None
    agent_role: str = Field(default="Fact-Checking")


class RAGRetrieveResponse(BaseModel):
    query: str
    context_str: str
    evidence_count: int
    char_count: int
    token_estimate: int
    evidences: list[dict[str, Any]]


class RAGDocumentItem(BaseModel):
    id: str
    title: str
    doc_type: str
    source_name: str
    source_url: str | None = None
    dataset_id: str | None = None
    language: str
    chunks_count: int
    created_at: str


class RAGDocumentDetailResponse(BaseModel):
    id: str
    title: str
    content: str
    doc_type: str
    source_name: str
    source_url: str | None = None
    dataset_id: str | None = None
    record_id: str | None = None
    language: str
    metadata_json: dict[str, Any]
    chunks: list[dict[str, Any]]
    created_at: str


class RAGStatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    embedding_dimension: int
    embedding_model: str
    reranker_model: str
    avg_retrieval_latency_ms: float
    datasets_breakdown: dict[str, int]


class RAGHealthResponse(BaseModel):
    status: str
    pgvector_active: bool
    embedding_engine: str
    dimension: int
    bm25_corpus_size: int
    reranker_active: bool

