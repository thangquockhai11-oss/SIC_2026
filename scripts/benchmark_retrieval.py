"""Benchmark Hybrid RAG vs BM25 vs Dense Retrieval on Real Evidence Corpus.

Evaluates:
- BM25 Lexical Retrieval
- Dense Semantic Retrieval (BGE-M3 1024-dim projector)
- Hybrid Reciprocal Rank Fusion (RRF with k=20, k=60, k=100)
- Metrics: Hit@1, Hit@3, Hit@5, Hit@10, MRR, nDCG@5, Latency (ms)
"""

import json
import logging
import math
import os
import sys
import time
from typing import Any
import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.rag.embeddings import BGEM3EmbeddingEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BenchmarkRetrieval")


def dcg_at_k(r, k):
    r = np.asarray(r, dtype=float)[:k]
    if r.size:
        return np.sum(r / np.log2(np.arange(2, r.size + 2)))
    return 0.0


def ndcg_at_k(r, k):
    dcg_max = dcg_at_k(sorted(r, reverse=True), k)
    if not dcg_max:
        return 0.0
    return dcg_at_k(r, k) / dcg_max


def run_retrieval_benchmark(num_queries: int = 150):
    logger.info("Loading ViFactCheck benchmark corpus and claims...")
    vifc_path = os.path.join("datasets", "raw", "vifactcheck", "data", "dev-00000-of-00001.parquet")
    if not os.path.exists(vifc_path):
        vifc_path = os.path.join("datasets", "raw", "vifactcheck", "data", "train-00000-of-00001.parquet")

    df = pd.read_parquet(vifc_path)
    # Filter entries that have non-empty gold Evidence
    valid_entries = df[df["Evidence"].str.len() > 25].head(num_queries)
    logger.info("Selected %d test queries with annotated gold evidence.", len(valid_entries))

    corpus_docs = []
    queries = []
    gold_map = {}  # query_idx -> gold_doc_id

    for idx, row in valid_entries.reset_index(drop=True).iterrows():
        doc_id = f"doc_{idx}"
        claim_text = str(row["Statement"]).strip()
        evidence_text = str(row["Evidence"]).strip()
        context_text = str(row.get("Context", ""))[:600].strip()

        # Document is context + evidence
        passage = f"{evidence_text} {context_text}"
        corpus_docs.append({"id": doc_id, "text": passage, "gold_for": idx})
        queries.append(claim_text)
        gold_map[idx] = doc_id

    logger.info("Corpus size: %d documents. Initializing BM25 index...", len(corpus_docs))
    tokenized_corpus = [doc["text"].lower().split() for doc in corpus_docs]
    bm25 = BM25Okapi(tokenized_corpus)

    logger.info("Encoding corpus with BGE-M3 Dense Semantic Projector...")
    embed_engine = BGEM3EmbeddingEngine()
    corpus_embeddings = []
    for doc in corpus_docs:
        vec = embed_engine.embed_text(doc["text"])
        corpus_embeddings.append(np.array(vec, dtype=np.float32))
    corpus_embeddings = np.array(corpus_embeddings)
    norms = np.linalg.norm(corpus_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    corpus_embeddings = corpus_embeddings / norms

    configs = [
        {"name": "BM25 (Lexical Only)", "type": "bm25"},
        {"name": "Dense Semantic (BGE-M3 Only)", "type": "dense"},
        {"name": "Hybrid RRF (k=20)", "type": "rrf", "k": 20},
        {"name": "Hybrid RRF (k=60 - TrustMedia Baseline)", "type": "rrf", "k": 60},
        {"name": "Hybrid RRF (k=100)", "type": "rrf", "k": 100},
    ]

    results = []

    for cfg in configs:
        cfg_name = cfg["name"]
        logger.info("Evaluating configuration: %s...", cfg_name)

        hit1 = 0
        hit3 = 0
        hit5 = 0
        hit10 = 0
        mrr_sum = 0.0
        ndcg5_sum = 0.0
        latencies = []

        for q_idx, q_text in enumerate(queries):
            gold_id = gold_map[q_idx]
            t0 = time.time()

            # 1. BM25 scoring
            q_tokens = q_text.lower().split()
            bm25_scores = bm25.get_scores(q_tokens)

            # 2. Dense scoring
            q_vec = np.array(embed_engine.embed_text(q_text), dtype=np.float32)
            q_norm = np.linalg.norm(q_vec)
            if q_norm > 0:
                q_vec = q_vec / q_norm
            dense_scores = np.dot(corpus_embeddings, q_vec)

            # Rank documents according to config
            if cfg["type"] == "bm25":
                ranked_indices = np.argsort(bm25_scores)[::-1]
            elif cfg["type"] == "dense":
                ranked_indices = np.argsort(dense_scores)[::-1]
            elif cfg["type"] == "rrf":
                k_val = cfg["k"]
                bm25_rank_map = {idx: r + 1 for r, idx in enumerate(np.argsort(bm25_scores)[::-1])}
                dense_rank_map = {idx: r + 1 for r, idx in enumerate(np.argsort(dense_scores)[::-1])}
                rrf_scores = np.zeros(len(corpus_docs))
                for i in range(len(corpus_docs)):
                    rrf_scores[i] = (1.0 / (k_val + bm25_rank_map[i])) + (1.0 / (k_val + dense_rank_map[i]))
                ranked_indices = np.argsort(rrf_scores)[::-1]

            t_elapsed = (time.time() - t0) * 1000.0
            latencies.append(t_elapsed)

            ranked_doc_ids = [corpus_docs[i]["id"] for i in ranked_indices[:10]]

            # Compute retrieval metrics
            if gold_id in ranked_doc_ids[:1]:
                hit1 += 1
            if gold_id in ranked_doc_ids[:3]:
                hit3 += 1
            if gold_id in ranked_doc_ids[:5]:
                hit5 += 1
            if gold_id in ranked_doc_ids[:10]:
                hit10 += 1

            if gold_id in ranked_doc_ids:
                rank = ranked_doc_ids.index(gold_id) + 1
                mrr_sum += 1.0 / rank
                rel_vector = [1 if d_id == gold_id else 0 for d_id in ranked_doc_ids[:5]]
                ndcg5_sum += ndcg_at_k(rel_vector, 5)
            else:
                mrr_sum += 0.0
                ndcg5_sum += 0.0

        n = len(queries)
        res = {
            "configuration": cfg_name,
            "hit@1": round(hit1 / n, 4),
            "hit@3": round(hit3 / n, 4),
            "hit@5": round(hit5 / n, 4),
            "hit@10": round(hit10 / n, 4),
            "mrr": round(mrr_sum / n, 4),
            "ndcg@5": round(ndcg5_sum / n, 4),
            "mean_latency_ms": round(float(np.mean(latencies)), 2),
        }
        results.append(res)
        logger.info(
            " -> %s: Hit@1=%.2f%%, Hit@5=%.2f%%, Hit@10=%.2f%%, MRR=%.4f, nDCG@5=%.4f, Latency=%.2fms",
            cfg_name,
            res["hit@1"] * 100,
            res["hit@5"] * 100,
            res["hit@10"] * 100,
            res["mrr"],
            res["ndcg@5"],
            res["mean_latency_ms"],
        )

    # Save benchmark report
    out_dir = os.path.join("ml", "checkpoints", "retrieval_benchmark")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "retrieval_benchmark_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    logger.info("Saved retrieval benchmark results to %s", out_file)

    print("\n" + "=" * 90)
    print("HYBRID RETRIEVAL BENCHMARK RESULTS (ViFactCheck Gold Evidence Corpus)")
    print("=" * 90)
    print(f"{'Configuration':<35} | {'Hit@1':<7} | {'Hit@5':<7} | {'Hit@10':<7} | {'MRR':<7} | {'nDCG@5':<7} | {'Latency':<8}")
    print("-" * 90)
    for r in results:
        print(f"{r['configuration']:<35} | {r['hit@1']*100:>5.1f}% | {r['hit@5']*100:>5.1f}% | {r['hit@10']*100:>5.1f}% | {r['mrr']:>7.4f} | {r['ndcg@5']:>7.4f} | {r['mean_latency_ms']:>6.2f}ms")
    print("=" * 90)


if __name__ == "__main__":
    run_retrieval_benchmark(num_queries=150)
