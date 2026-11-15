"""RAG Evaluation Suite for Precision, Recall, MRR, nDCG, and Latency Benchmarking.

Compares retrieval paradigms:
1. BM25 Lexical Search
2. Vector Similarity Search (PostgreSQL pgvector)
3. Hybrid Retrieval (RRF)
4. Hybrid Retrieval + Cross-Encoder Reranker
"""

import logging
import math
import time
from typing import Any

from app.services.rag.bm25_retriever import bm25_retriever
from app.services.rag.embeddings import embedding_engine
from app.services.rag.hybrid_retriever import hybrid_rag_retriever
from app.services.rag.reranker import reranker_engine
from app.services.rag.vector_store import vector_store

logger = logging.getLogger(__name__)


class RAGEvaluator:
    """Scientific evaluation suite for Information Retrieval & Evidence Grounding."""

    @staticmethod
    def calculate_metrics_at_k(retrieved_ids: list[str], ground_truth_ids: list[str], k: int = 5) -> dict[str, float]:
        """Compute Precision@K, Recall@K, MRR, and nDCG@K."""
        if not ground_truth_ids:
            return {"precision@k": 0.0, "recall@k": 0.0, "mrr": 0.0, "ndcg@k": 0.0}

        retrieved_k = retrieved_ids[:k]
        gt_set = set(ground_truth_ids)

        # Precision@K
        hits = sum(1 for cid in retrieved_k if cid in gt_set)
        precision_k = hits / k if k > 0 else 0.0

        # Recall@K
        recall_k = hits / len(ground_truth_ids) if len(ground_truth_ids) > 0 else 0.0

        # Mean Reciprocal Rank (MRR)
        mrr = 0.0
        for rank, cid in enumerate(retrieved_ids, 1):
            if cid in gt_set:
                mrr = 1.0 / rank
                break

        # nDCG@K
        dcg = 0.0
        for rank, cid in enumerate(retrieved_k, 1):
            rel = 1.0 if cid in gt_set else 0.0
            dcg += rel / math.log2(rank + 1)

        idcg = sum(1.0 / math.log2(r + 1) for r in range(1, min(len(gt_set), k) + 1))
        ndcg_k = (dcg / idcg) if idcg > 0 else 0.0

        return {
            "precision@k": round(precision_k, 4),
            "recall@k": round(recall_k, 4),
            "mrr": round(mrr, 4),
            "ndcg@k": round(ndcg_k, 4),
        }

    def benchmark_query(self, query: str, top_k: int = 5) -> dict[str, Any]:
        """Execute and benchmark latency across all 4 retrieval paradigms for a query."""
        results: dict[str, Any] = {}

        # 1. BM25 Alone
        t0 = time.time()
        bm25_res = bm25_retriever.search_bm25(query, top_k=top_k)
        bm25_time = round((time.time() - t0) * 1000, 2)
        results["bm25"] = {
            "latency_ms": bm25_time,
            "results_count": len(bm25_res),
            "top_ids": [r["chunk_id"] for r in bm25_res],
            "top_scores": [r.get("bm25_score", 0.0) for r in bm25_res[:3]],
        }

        # 2. Vector Search Alone (PostgreSQL pgvector)
        t0 = time.time()
        t_embed_0 = time.time()
        q_vec = embedding_engine.embed_text(query)
        embed_time = round((time.time() - t_embed_0) * 1000, 2)

        vec_res = vector_store.search_vector(query, top_k=top_k)
        vec_time = round((time.time() - t0) * 1000, 2)
        results["vector_search"] = {
            "latency_ms": vec_time,
            "embedding_latency_ms": embed_time,
            "results_count": len(vec_res),
            "top_ids": [r["chunk_id"] for r in vec_res],
            "top_scores": [r.get("similarity_score", 0.0) for r in vec_res[:3]],
        }

        # 3. Hybrid RRF (without Reranker)
        t0 = time.time()
        hybrid_res = hybrid_rag_retriever.retrieve(query, top_k=top_k, use_reranker=False)
        hybrid_time = round((time.time() - t0) * 1000, 2)
        results["hybrid_rrf"] = {
            "latency_ms": hybrid_time,
            "results_count": len(hybrid_res),
            "top_ids": [r["chunk_id"] for r in hybrid_res],
            "top_scores": [r.get("relevance_score", 0.0) for r in hybrid_res[:3]],
        }

        # 4. Hybrid RRF + Cross-Encoder Reranker
        t0 = time.time()
        full_res = hybrid_rag_retriever.retrieve(query, top_k=top_k, use_reranker=True)
        full_time = round((time.time() - t0) * 1000, 2)
        results["hybrid_reranked"] = {
            "latency_ms": full_time,
            "results_count": len(full_res),
            "top_ids": [r["chunk_id"] for r in full_res],
            "top_scores": [r.get("relevance_score", 0.0) for r in full_res[:3]],
        }

        # Speed and Coverage Comparison
        results["summary"] = {
            "query": query,
            "total_documents_searched": bm25_retriever.corpus_size,
            "fastest_method": min(["bm25", "vector_search", "hybrid_rrf", "hybrid_reranked"], key=lambda k: results[k]["latency_ms"]),
            "most_comprehensive": "hybrid_reranked",
        }
        return results


rag_evaluator = RAGEvaluator()

