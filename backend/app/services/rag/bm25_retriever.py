"""BM25 Keyword & Lexical Retrieval Service.

Supports Vietnamese and English tokenization, stopword pruning, and
dynamic corpus indexing from PostgreSQL DocumentChunks.
"""

import logging
import re
from typing import Any

import numpy as np
from rank_bm25 import BM25Okapi
from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import Document, DocumentChunk

logger = logging.getLogger(__name__)

STOPWORDS = {
    # Vietnamese common stopwords
    "và", "là", "của", "có", "trong", "cho", "được", "với", "các", "những", "này", "khi",
    "đã", "sẽ", "đang", "về", "như", "tại", "đến", "từ", "ở", "ra", "lại", "thì", "mà",
    "một", "hai", "ba", "người", "nhưng", "được", "làm", "đó", "do", "bởi", "vì",
    # English common stopwords
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at", "by",
    "for", "with", "about", "against", "between", "into", "through", "during", "before",
    "after", "above", "below", "to", "from", "up", "down", "of", "off", "over", "under",
}


class BM25Retriever:
    """Production BM25 Keyword Search Engine over indexed Document Chunks."""

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
        self.chunk_records: list[dict[str, Any]] = []
        self.bm25_model: BM25Okapi | None = None
        self.corpus_size: int = 0
        self.reload_index()

    @staticmethod
    def tokenize(text: str) -> list[str]:
        """Tokenize Vietnamese and English words, strip stopwords and single chars."""
        words = re.findall(r"\w+", text.lower())
        return [w for w in words if len(w) > 1 and w not in STOPWORDS]

    def reload_index(self) -> int:
        """Fetch all chunks from database and rebuild the BM25 index."""
        try:
            engine = get_engine()
            with Session(engine) as session:
                rows = (
                    session.query(
                        DocumentChunk.id.label("chunk_id"),
                        DocumentChunk.document_id,
                        DocumentChunk.content,
                        DocumentChunk.metadata_json,
                        Document.title.label("doc_title"),
                        Document.source_name,
                        Document.source_url,
                        Document.dataset_id,
                        Document.record_id,
                        Document.language,
                    )
                    .join(Document, DocumentChunk.document_id == Document.id)
                    .all()
                )

                records = []
                tokenized_corpus = []

                for r in rows:
                    doc_title = str(r.doc_title or "")
                    c_text = str(r.content or "")
                    combined_text = f"{doc_title} {c_text}"
                    tokens = self.tokenize(combined_text)

                    records.append({
                        "chunk_id": str(r.chunk_id),
                        "document_id": str(r.document_id),
                        "content": c_text,
                        "doc_title": doc_title,
                        "source_name": str(r.source_name or ""),
                        "source_url": str(r.source_url or ""),
                        "dataset_id": str(r.dataset_id or ""),
                        "record_id": str(r.record_id or ""),
                        "language": str(r.language or "vi"),
                        "metadata": r.metadata_json if isinstance(r.metadata_json, dict) else {},
                    })
                    tokenized_corpus.append(tokens)

                self.chunk_records = records
                self.corpus_size = len(records)

                if tokenized_corpus:
                    self.bm25_model = BM25Okapi(tokenized_corpus)
                    # Clamp non-positive IDFs to avoid negative BM25 scores on small corpora
                    for term, val in self.bm25_model.idf.items():
                        if val <= 0.0:
                            self.bm25_model.idf[term] = 0.25
                    logger.info("BM25 index built with %d documents.", self.corpus_size)
                else:
                    self.bm25_model = None

                return self.corpus_size
        except Exception as exc:
            logger.warning("Failed to reload BM25 index from DB: %s", exc)
            self.chunk_records = []
            self.corpus_size = 0
            self.bm25_model = None
            return 0

    def search_bm25(
        self,
        query: str,
        top_k: int = 10,
        dataset_filter: str | None = None,
        min_score: float = 0.0,
    ) -> list[dict[str, Any]]:
        """Search BM25 inverted index for query keywords."""
        if not self.bm25_model or not self.chunk_records or not query.strip():
            # If index is empty, attempt a reload
            if not self.chunk_records:
                self.reload_index()
            if not self.bm25_model or not self.chunk_records:
                return []

        tokens = self.tokenize(query)
        if not tokens:
            return []

        raw_scores = np.array(self.bm25_model.get_scores(tokens))
        if len(raw_scores) == 0:
            return []

        # Normalization with query IDF sum
        query_idf = sum(self.bm25_model.idf.get(t, 0.5) for t in tokens)
        max_possible_score = max(query_idf * 2.0, 1.0)
        norm_scores = np.clip(raw_scores / max_possible_score, 0.0, 1.0)

        # Candidate indices sorted descending
        top_indices = np.argsort(norm_scores)[::-1]
        results = []

        for idx in top_indices:
            score = float(norm_scores[idx])
            raw_sc = float(raw_scores[idx])
            if score < min_score or raw_sc <= 0.0:
                continue

            rec = self.chunk_records[idx]
            if dataset_filter and rec.get("dataset_id") != dataset_filter:
                continue

            results.append({
                "chunk_id": rec["chunk_id"],
                "document_id": rec["document_id"],
                "content": rec["content"],
                "doc_title": rec["doc_title"],
                "source_name": rec["source_name"],
                "source_url": rec["source_url"],
                "dataset_id": rec["dataset_id"],
                "record_id": rec["record_id"],
                "language": rec["language"],
                "bm25_score": round(score, 4),
                "raw_bm25_score": round(raw_sc, 2),
                "metadata": rec["metadata"],
            })

            if len(results) >= top_k:
                break

        return results


bm25_retriever = BM25Retriever()

