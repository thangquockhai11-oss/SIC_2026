"""FastAPI router for Advanced Hybrid RAG operations."""

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim, Document, DocumentChunk, Evidence, EvidenceRecord, RAGExecution, RetrievalLog
from app.schemas.rag import (
    RAGDocumentDetailResponse,
    RAGDocumentItem,
    RAGHealthResponse,
    RAGIngestRequest,
    RAGIngestResponse,
    RAGRetrieveRequest,
    RAGRetrieveResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResultItem,
    RAGStatsResponse,
)
from app.services.rag.bm25_retriever import bm25_retriever
from app.services.rag.context_builder import context_builder
from app.services.rag.embeddings import embedding_engine
from app.services.rag.hybrid_retriever import hybrid_rag_retriever
from app.services.rag.ingestion import ingestion_pipeline
from app.services.rag.reranker import reranker_engine
from app.services.rag.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/ingest", response_model=RAGIngestResponse, summary="Ingest document into Hybrid RAG with BGE-M3 embeddings")
def ingest_document(
    payload: RAGIngestRequest,
    db: Session = Depends(get_db_session),
):
    """Ingest, clean, chunk, embed, and store document in PostgreSQL + pgvector."""
    try:
        res = ingestion_pipeline.ingest_document(
            title=payload.title,
            content=payload.content,
            source_name=payload.source_name,
            source_url=payload.source_url,
            dataset_id=payload.dataset_id,
            record_id=payload.record_id,
            language=payload.language,
            doc_type=payload.doc_type,
            metadata=payload.metadata,
            db_session=db,
        )
        # Reload BM25 index to immediately index new chunks
        bm25_retriever.reload_index()
        return RAGIngestResponse(
            document_id=res["document_id"],
            title=res["title"],
            chunks_count=res["chunks_count"],
            embedding_model=res["embedding_model"],
            dimension=res["dimension"],
            status="COMPLETED",
        )
    except Exception as e:
        logger.error("Ingestion failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi nạp tài liệu vào RAG: {str(e)}",
        )


@router.post("/search", response_model=RAGSearchResponse, summary="Search Knowledge Base using Hybrid RRF or Vector Search")
def search_rag(payload: RAGSearchRequest):
    """Search knowledge base using chosen retrieval paradigm (hybrid, vector, bm25)."""
    t0 = time.time()
    method = payload.method.lower()

    if method == "bm25":
        raw_items = bm25_retriever.search_bm25(
            query=payload.query,
            top_k=payload.top_k,
            dataset_filter=payload.dataset_filter,
        )
        results = [
            RAGSearchResultItem(
                chunk_id=r["chunk_id"],
                document_id=r.get("document_id"),
                doc_title=r["doc_title"],
                content=r["content"],
                source_name=r["source_name"],
                source_url=r.get("source_url"),
                relevance_score=r["bm25_score"],
                bm25_score=r["bm25_score"],
                dataset_id=r.get("dataset_id"),
            )
            for r in raw_items
        ]
    elif method == "vector":
        raw_items = vector_store.search_vector(
            query_text=payload.query,
            top_k=payload.top_k,
            dataset_filter=payload.dataset_filter,
        )
        results = [
            RAGSearchResultItem(
                chunk_id=r["chunk_id"],
                document_id=r.get("document_id"),
                doc_title=r["doc_title"],
                content=r["content"],
                source_name=r["source_name"],
                source_url=r.get("source_url"),
                relevance_score=r["similarity_score"],
                vector_similarity=r["similarity_score"],
                dataset_id=r.get("dataset_id"),
            )
            for r in raw_items
        ]
    else:
        # Default: Hybrid RRF + Reranker
        raw_items = hybrid_rag_retriever.retrieve(
            query=payload.query,
            top_k=payload.top_k,
            dataset_filter=payload.dataset_filter,
            use_reranker=payload.use_reranker,
        )
        results = [
            RAGSearchResultItem(
                chunk_id=r["chunk_id"],
                document_id=r.get("document_id"),
                doc_title=r.get("claim_matched", ""),
                content=r.get("excerpt", ""),
                source_name=r.get("source_name", ""),
                source_url=r.get("source_url"),
                relevance_score=r.get("relevance_score", 0.0),
                bm25_score=r.get("bm25_score"),
                vector_similarity=r.get("vector_similarity"),
                rrf_score=r.get("rrf_score"),
                dataset_id=r.get("dataset_source"),
            )
            for r in raw_items
        ]

    latency = round((time.time() - t0) * 1000, 2)
    return RAGSearchResponse(
        query=payload.query,
        total_results=len(results),
        method=method,
        latency_ms=latency,
        results=results,
    )


@router.post("/retrieve", response_model=RAGRetrieveResponse, summary="Retrieve and build hardened agent context")
def retrieve_agent_context(payload: RAGRetrieveRequest):
    """Retrieve evidence and format into prompt-injection protected XML context for LLM/Agents."""
    target_claim = payload.claim_text or payload.query
    hits = hybrid_rag_retriever.retrieve(
        query=target_claim,
        top_k=payload.top_k,
        dataset_filter=payload.dataset_filter,
        use_reranker=True,
    )
    ctx = context_builder.build_fact_checking_context(
        claim_text=target_claim,
        evidences=hits,
    )
    return RAGRetrieveResponse(
        query=payload.query,
        context_str=ctx["context_str"],
        evidence_count=ctx["evidence_count"],
        char_count=ctx["char_count"],
        token_estimate=ctx["token_estimate"],
        evidences=ctx["evidences"],
    )


@router.get("/documents", summary="List indexed documents in knowledge base")
def list_rag_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    dataset_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
) -> dict[str, Any]:
    """List documents with chunk counts, datasets, and provenance."""
    query = db.query(Document)
    if dataset_id:
        query = query.filter(Document.dataset_id == dataset_id)
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter((Document.title.ilike(needle)) | (Document.source_name.ilike(needle)))

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for d in docs:
        c_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).count()
        items.append({
            "id": d.id,
            "title": d.title,
            "doc_type": d.doc_type,
            "source_name": d.source_name,
            "source_url": d.source_url,
            "dataset_id": d.dataset_id,
            "language": d.language,
            "chunks_count": c_count,
            "created_at": d.created_at.isoformat(),
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }


@router.get("/documents/{doc_id}", response_model=RAGDocumentDetailResponse, summary="Get document detail with chunks")
def get_rag_document(doc_id: str, db: Session = Depends(get_db_session)):
    """Fetch single document and its embedded chunks."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong kho RAG")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.chunk_index).all()
    chunk_list = [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "token_count": c.token_count,
            "has_embedding": c.embedding is not None,
            "created_at": c.created_at.isoformat(),
        }
        for c in chunks
    ]

    return RAGDocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        source_name=doc.source_name,
        source_url=doc.source_url,
        dataset_id=doc.dataset_id,
        record_id=doc.record_id,
        language=doc.language,
        metadata_json=doc.metadata_json if isinstance(doc.metadata_json, dict) else {},
        chunks=chunk_list,
        created_at=doc.created_at.isoformat(),
    )


@router.get("/executions/{exec_id}", summary="Get RAG execution trace")
def get_rag_execution(exec_id: str, db: Session = Depends(get_db_session)):
    """Fetch execution trace and configuration for a specific retrieval call."""
    execution = db.query(RAGExecution).filter(
        (RAGExecution.id == exec_id) | (RAGExecution.execution_id == exec_id)
    ).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi thực thi RAG")

    return {
        "id": execution.id,
        "execution_id": execution.execution_id,
        "agent_name": execution.agent_name,
        "query": execution.query,
        "status": execution.status,
        "latency_ms": execution.latency_ms,
        "config": execution.config,
        "created_at": execution.created_at.isoformat(),
    }


@router.get("/stats", response_model=RAGStatsResponse, summary="Get RAG knowledge base statistics")
def get_rag_stats(db: Session = Depends(get_db_session)):
    """Return overall document counts, vector dimensions, and latency metrics."""
    doc_count = db.query(Document).count()
    chunk_count = db.query(DocumentChunk).count()

    # Dataset breakdown
    ds_rows = (
        db.query(Document.dataset_id, func.count(Document.id))
        .filter(Document.dataset_id != None)
        .group_by(Document.dataset_id)
        .all()
    )
    breakdown = {r[0]: r[1] for r in ds_rows}

    # Average latency from logs
    avg_latency = db.query(func.avg(RetrievalLog.latency_ms)).scalar() or 25.0

    return RAGStatsResponse(
        total_documents=doc_count,
        total_chunks=chunk_count,
        embedding_dimension=embedding_engine.dimension,
        embedding_model=embedding_engine.model_name,
        reranker_model=reranker_engine.model_name,
        avg_retrieval_latency_ms=round(float(avg_latency), 2),
        datasets_breakdown=breakdown,
    )


@router.get("/health", response_model=RAGHealthResponse, summary="Check RAG services health")
def get_rag_health(db: Session = Depends(get_db_session)):
    """Check pgvector connectivity, embedding engine, and index health."""
    pgvector_ok = False
    try:
        if db.bind.dialect.name == "postgresql":
            res = db.execute(text("SELECT extversion FROM pg_extension WHERE extname = 'vector';")).fetchone()
            pgvector_ok = bool(res)
        else:
            pgvector_ok = True  # In-memory vector support
    except Exception:
        pgvector_ok = False

    return RAGHealthResponse(
        status="HEALTHY" if pgvector_ok else "DEGRADED",
        pgvector_active=pgvector_ok,
        embedding_engine=embedding_engine.model_name,
        dimension=embedding_engine.dimension,
        bm25_corpus_size=bm25_retriever.corpus_size,
        reranker_active=reranker_engine._enabled,
    )

