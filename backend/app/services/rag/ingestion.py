"""Document Ingestion Pipeline for TrustMedia AI Advanced Hybrid RAG.

Handles parsing, cleaning, chunking, and database ingestion for:
- Supported formats: TXT, JSON, JSONL, CSV, HTML, PDF
- Research Datasets: ViFactCheck, X-FACT, FEVER, NELA-GT, TweetEval, PHEME
- User-submitted articles and research papers
- Generates 1024-dim BGE-M3 embeddings and stores in PostgreSQL pgvector.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import re
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import Document, DocumentChunk, EmbeddingRecord, gen_uuid, utc_now
from app.services.rag.embeddings import embedding_engine

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[4]
RAW_DATASETS_DIR = ROOT_DIR / "datasets" / "raw"


class TextChunker:
    """Configurable semantic & sentence-aware sliding window chunker."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 60):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> list[str]:
        """Split text into coherent chunks respecting sentence delimiters."""
        clean = re.sub(r"\s+", " ", text).strip()
        if not clean:
            return []
        if len(clean) <= self.chunk_size:
            return [clean]

        # Break into sentences
        sentences = re.split(r"(?<=[.!?\n])\s+", clean)
        chunks: list[str] = []
        current_chunk: list[str] = []
        current_len = 0

        for sentence in sentences:
            s_len = len(sentence)
            if current_len + s_len > self.chunk_size and current_chunk:
                chunk_str = " ".join(current_chunk).strip()
                if chunk_str:
                    chunks.append(chunk_str)
                # Overlap: keep trailing sentences that fit into chunk_overlap
                overlap_chunk: list[str] = []
                overlap_len = 0
                for s in reversed(current_chunk):
                    if overlap_len + len(s) <= self.chunk_overlap:
                        overlap_chunk.insert(0, s)
                        overlap_len += len(s)
                    else:
                        break
                current_chunk = overlap_chunk
                current_len = overlap_len

            current_chunk.append(sentence)
            current_len += s_len

        if current_chunk:
            final_str = " ".join(current_chunk).strip()
            if final_str and (not chunks or final_str != chunks[-1]):
                chunks.append(final_str)

        return chunks


class DocumentIngestionPipeline:
    """Document Ingestion & Indexing Pipeline."""

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
        self.chunker = TextChunker(chunk_size=500, chunk_overlap=60)

    @staticmethod
    def clean_text(raw_text: str) -> str:
        """Strip HTML tags, control codes, and normalize whitespace."""
        # Strip script and style tags
        no_scripts = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw_text, flags=re.DOTALL | re.IGNORECASE)
        # Strip HTML tags
        no_html = re.sub(r"<[^>]+>", " ", no_scripts)
        # Strip non-printable control characters except standard whitespace
        no_ctrl = "".join(ch for ch in no_html if ch == "\n" or ch == "\t" or ord(ch) >= 32)
        # Normalize excessive whitespace
        return re.sub(r"\s+", " ", no_ctrl).strip()

    def ingest_document(
        self,
        title: str,
        content: str,
        source_name: str,
        source_url: str | None = None,
        dataset_id: str | None = None,
        record_id: str | None = None,
        language: str = "vi",
        doc_type: str = "article",
        metadata: dict[str, Any] | None = None,
        db_session: Session | None = None,
    ) -> dict[str, Any]:
        """Ingest single text document into DB with chunking and embeddings."""
        cleaned_content = self.clean_text(content)
        if not cleaned_content:
            raise ValueError("Nội dung tài liệu sau khi làm sạch rỗng")

        meta = metadata or {}
        chunks_text = self.chunker.split_text(cleaned_content)
        if not chunks_text:
            chunks_text = [cleaned_content]

        own_session = False
        if db_session is None:
            engine = get_engine()
            session = Session(engine)
            own_session = True
        else:
            session = db_session

        try:
            doc_id = gen_uuid()
            doc = Document(
                id=doc_id,
                title=title[:500],
                content=cleaned_content,
                doc_type=doc_type,
                source_url=source_url,
                source_name=source_name,
                dataset_id=dataset_id,
                record_id=record_id,
                language=language,
                metadata_json=meta,
                created_at=utc_now(),
            )
            session.add(doc)
            session.flush()

            # Batch embed all chunks
            embeddings = embedding_engine.embed_batch(chunks_text)
            created_chunks = []

            for idx, (c_text, emb) in enumerate(zip(chunks_text, embeddings)):
                chunk_id = gen_uuid()
                v_hash = hashlib.sha256(c_text.encode("utf-8")).hexdigest()
                c_meta = {
                    "source_name": source_name,
                    "source_url": source_url,
                    "dataset_id": dataset_id,
                    "record_id": record_id,
                    "language": language,
                    "doc_title": title,
                }
                chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=doc_id,
                    chunk_index=idx,
                    content=c_text,
                    embedding=emb,
                    token_count=len(c_text.split()),
                    metadata_json=c_meta,
                    created_at=utc_now(),
                )
                session.add(chunk)

                emb_record = EmbeddingRecord(
                    id=gen_uuid(),
                    chunk_id=chunk_id,
                    model_name=embedding_engine.model_name,
                    model_version=embedding_engine.model_version,
                    dimension=embedding_engine.dimension,
                    vector_hash=v_hash,
                    created_at=utc_now(),
                )
                session.add(emb_record)
                created_chunks.append({"chunk_id": chunk_id, "index": idx, "chars": len(c_text)})

            session.commit()
            logger.info("Ingested document %s (%s) with %d chunks.", doc_id, title[:50], len(chunks_text))
            return {
                "document_id": doc_id,
                "title": title,
                "chunks_count": len(chunks_text),
                "chunks": created_chunks,
                "embedding_model": embedding_engine.model_name,
                "dimension": embedding_engine.dimension,
            }
        except Exception as e:
            session.rollback()
            logger.error("Failed to ingest document %s: %s", title[:40], e)
            raise e
        finally:
            if own_session:
                session.close()

    def seed_baseline_datasets_to_pgvector(self, max_samples_per_dataset: int = 150) -> dict[str, int]:
        """Seed research datasets (ViFactCheck, X-FACT, FEVER) from disk into PostgreSQL."""
        engine = get_engine()
        with Session(engine) as session:
            existing_count = session.query(Document).filter(Document.dataset_id != None).count()
            if existing_count >= 50:
                logger.info("Knowledge base already contains %d dataset documents. Skipping re-seed.", existing_count)
                return {"status": "skipped", "existing_documents": existing_count}

            logger.info("Seeding research datasets into PostgreSQL + pgvector (limit %d/dataset)...", max_samples_per_dataset)
            stats = {"ViFactCheck": 0, "X-FACT": 0, "FEVER": 0}

            # 1. ViFactCheck
            vifactcheck_dir = RAW_DATASETS_DIR / "vifactcheck" / "data"
            if vifactcheck_dir.exists():
                for pfile in vifactcheck_dir.glob("*.parquet"):
                    try:
                        df = pd.read_parquet(pfile)
                        for _, row in df.head(max_samples_per_dataset).iterrows():
                            stmt = str(row.get("Statement", "")).strip()
                            ev = str(row.get("Evidence", "")).strip()
                            if not ev or ev.lower() == "nan" or ev == "None":
                                ev = str(row.get("Context", ""))[:400]
                            if not stmt or not ev:
                                continue

                            full_doc = f"PHÁT NGÔN / CLAIM: {stmt}\n\nBẰNG CHỨNG ĐỐI CHIỂU: {ev}"
                            lbl = row.get("labels", 2)
                            verdict_map = {0: "SUPPORTED", 1: "REFUTED", 2: "NOT_ENOUGH_INFORMATION"}
                            verdict = verdict_map.get(lbl, "NOT_ENOUGH_INFORMATION")

                            self.ingest_document(
                                title=f"ViFactCheck: {stmt[:120]}",
                                content=full_doc,
                                source_name=str(row.get("Author") or "Báo Chính Phủ / Thông Tấn Xã"),
                                source_url=str(row.get("Url") or "https://baochinhphu.vn"),
                                dataset_id="ViFactCheck",
                                record_id=str(row.get("annotation_id", "")),
                                language="vi",
                                doc_type="fact_check_benchmark",
                                metadata={"baseline_verdict": verdict, "topic": str(row.get("Topic", "Thời sự"))},
                                db_session=session,
                            )
                            stats["ViFactCheck"] += 1
                        break  # 1 parquet split is sufficient for baseline
                    except Exception as e:
                        logger.warning("ViFactCheck seed error: %s", e)

            # 2. X-FACT
            xfact_file = RAW_DATASETS_DIR / "xfact" / "all_languages" / "train-00000-of-00001.csv"
            if xfact_file.exists():
                try:
                    df_xfact = pd.read_csv(xfact_file, nrows=max_samples_per_dataset * 2)
                    count_xfact = 0
                    for _, row in df_xfact.iterrows():
                        claim = str(row.get("claim", "")).strip()
                        ev = str(row.get("evidence_1", "")).strip()
                        if not claim or not ev or ev.lower() == "nan":
                            continue
                        lbl_str = str(row.get("label", "")).lower()
                        verdict = "REFUTED" if any(f in lbl_str for f in ["false", "pants on fire", "incorrect"]) else "SUPPORTED"

                        full_doc = f"CLAIM: {claim}\n\nFACT-CHECK EVIDENCE: {ev}"
                        self.ingest_document(
                            title=f"X-FACT: {claim[:120]}",
                            content=full_doc,
                            source_name=str(row.get("site") or "X-FACT International Fact-Checking"),
                            source_url=str(row.get("link_1") or "https://factcheck.org"),
                            dataset_id="X-FACT",
                            record_id=str(row.get("claim_id", "")),
                            language="en",
                            doc_type="multilingual_fact_check",
                            metadata={"baseline_verdict": verdict, "claimant": str(row.get("claimant", ""))},
                            db_session=session,
                        )
                        count_xfact += 1
                        if count_xfact >= max_samples_per_dataset:
                            break
                    stats["X-FACT"] = count_xfact
                except Exception as e:
                    logger.warning("X-FACT seed error: %s", e)

            # 3. FEVER
            fever_file = RAW_DATASETS_DIR / "fever" / "train.jsonl"
            if fever_file.exists():
                try:
                    count_fever = 0
                    with open(fever_file, "r", encoding="utf-8") as f:
                        for line in f:
                            if not line.strip():
                                continue
                            item = json.loads(line)
                            claim = item.get("claim", "").strip()
                            label = item.get("label", "NOT ENOUGH INFO")
                            if not claim:
                                continue
                            verdict = "SUPPORTED" if label == "SUPPORTS" else ("REFUTED" if label == "REFUTES" else "NOT_ENOUGH_INFORMATION")
                            doc_text = f"FEVER BENCHMARK CLAIM: {claim}\n\nVERIFICATION STATUS: {label}"

                            self.ingest_document(
                                title=f"FEVER: {claim[:120]}",
                                content=doc_text,
                                source_name="FEVER Knowledge Corpus (Wikipedia)",
                                source_url="https://fever.ai",
                                dataset_id="FEVER",
                                record_id=str(item.get("id", "")),
                                language="en",
                                doc_type="benchmark_corpus",
                                metadata={"baseline_verdict": verdict},
                                db_session=session,
                            )
                            count_fever += 1
                            if count_fever >= max_samples_per_dataset:
                                break
                    stats["FEVER"] = count_fever
                except Exception as e:
                    logger.warning("FEVER seed error: %s", e)

            return stats


# Global singleton instance
ingestion_pipeline = DocumentIngestionPipeline()

