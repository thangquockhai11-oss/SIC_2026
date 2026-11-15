"""Vector Store Service executing genuine pgvector similarity queries on PostgreSQL."""

import json
import logging
from typing import Any

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import Document, DocumentChunk
from app.services.rag.embeddings import embedding_engine

logger = logging.getLogger(__name__)


class PGVectorStore:
    """Production PostgreSQL + pgvector search engine."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

    def search_vector(
        self,
        query_text: str,
        top_k: int = 10,
        dataset_filter: str | None = None,
        min_similarity: float = 0.0,
        db_session: Session | None = None,
    ) -> list[dict[str, Any]]:
        """Perform exact or HNSW-accelerated cosine similarity search using pgvector."""
        query_vec = embedding_engine.embed_text(query_text)
        vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vec) + "]"

        own_session = False
        if db_session is None:
            engine = get_engine()
            session = Session(engine)
            own_session = True
        else:
            session = db_session

        try:
            # Check if engine is PostgreSQL
            if session.bind.dialect.name == "postgresql":
                sql = """
                    SELECT
                        dc.id AS chunk_id,
                        dc.document_id,
                        dc.content,
                        dc.metadata_json,
                        d.title AS doc_title,
                        d.source_name,
                        d.source_url,
                        d.dataset_id,
                        d.record_id,
                        d.language,
                        1 - (dc.embedding <=> CAST(:vec_param AS vector)) AS cosine_similarity
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    WHERE dc.embedding IS NOT NULL
                """
                params: dict[str, Any] = {"vec_param": vec_str, "top_k": top_k}
                if dataset_filter:
                    sql += " AND d.dataset_id = :dataset_id"
                    params["dataset_id"] = dataset_filter

                sql += " ORDER BY dc.embedding <=> CAST(:vec_param AS vector) LIMIT :top_k;"

                rows = session.execute(text(sql), params).fetchall()
                results = []
                for row in rows:
                    sim = float(row.cosine_similarity)
                    if sim < min_similarity:
                        continue
                    results.append({
                        "chunk_id": str(row.chunk_id),
                        "document_id": str(row.document_id),
                        "content": str(row.content),
                        "doc_title": str(row.doc_title or ""),
                        "source_name": str(row.source_name or "Nguồn tri thức"),
                        "source_url": str(row.source_url or ""),
                        "dataset_id": str(row.dataset_id or ""),
                        "record_id": str(row.record_id or ""),
                        "language": str(row.language or "vi"),
                        "similarity_score": round(sim, 4),
                        "metadata": row.metadata_json if isinstance(row.metadata_json, dict) else {},
                    })
                return results

            # Fallback for SQLite in unit tests
            chunks = (
                session.query(DocumentChunk, Document)
                .join(Document, DocumentChunk.document_id == Document.id)
                .all()
            )
            q_vec_np = np.array(query_vec, dtype=np.float32)
            scored = []
            for chunk, doc in chunks:
                if chunk.embedding is not None:
                    c_emb = np.array(chunk.embedding, dtype=np.float32)
                    sim = float(np.dot(q_vec_np, c_emb))
                    if dataset_filter and doc.dataset_id != dataset_filter:
                        continue
                    if sim >= min_similarity:
                        scored.append((sim, chunk, doc))

            scored.sort(key=lambda x: x[0], reverse=True)
            results = []
            for sim, chunk, doc in scored[:top_k]:
                results.append({
                    "chunk_id": str(chunk.id),
                    "document_id": str(doc.id),
                    "content": str(chunk.content),
                    "doc_title": str(doc.title or ""),
                    "source_name": str(doc.source_name or "Nguồn tri thức"),
                    "source_url": str(doc.source_url or ""),
                    "dataset_id": str(doc.dataset_id or ""),
                    "record_id": str(doc.record_id or ""),
                    "language": str(doc.language or "vi"),
                    "similarity_score": round(sim, 4),
                    "metadata": chunk.metadata_json if isinstance(chunk.metadata_json, dict) else {},
                })
            return results
        except Exception as e:
            logger.error("Error executing vector search on pgvector: %s", e)
            return []
        finally:
            if own_session:
                session.close()


vector_store = PGVectorStore()
