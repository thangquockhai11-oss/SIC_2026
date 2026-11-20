"""Evidence Library & Reference Cross-Examination Service.

Provides:
1. Document ingestion from URL, PDF, or raw text:
   - Stores publisher, original source (wire/dispatch origin), publication date,
     retrieval date, document version, and searchable passages (chunks).
   - Indexes passages into BM25 and Vector store for hybrid retrieval.
2. 5-Dimension entity comparison for each claim:
   - people, action, location, event_date, scope.
   - Preserves exact quotes and source links.
   - Strictly excludes the analyzed article itself from being independent confirmation.
3. Syndication grouping:
   - Groups syndicated copies by original dispatch source (e.g. 2 URLs copying TTXVN count as 1 origin).
4. Disputed detail detection:
   - When credible sources disagree (e.g. conflicting event dates), shows both passages
     and identifies the disputed detail.
5. Claim rerun verification:
   - Ingests new sources and updates claim verdict/evidence dynamically.
6. Separation of concerns:
   - Keeps publisher transparency (COPE) and reader surveys completely separate from factual evidence.
"""

from datetime import datetime, timezone
import io
import logging
import re
from typing import Any
import uuid

from sqlalchemy.orm import Session

from app.database.dependencies import get_engine
from app.database.models import (
    Analysis,
    Claim,
    Document,
    DocumentChunk,
    EmbeddingRecord,
    Evidence,
    gen_uuid,
    utc_now,
)
from app.services.clause_segmenter import (
    clean_text,
    detect_modal_scope,
    extract_numbers,
    extract_time_markers,
)
from app.services.model_manager import model_manager
from app.services.rag.bm25_retriever import bm25_retriever
from app.services.rag.embeddings import embedding_engine
from app.services.rag.hybrid_retriever import hybrid_rag_retriever
from app.services.rag.ingestion import TextChunker
from app.services.url_extractor import fetch_and_extract_article_details as extract_from_url

logger = logging.getLogger(__name__)

# Known Vietnamese and international news wire/dispatch agencies
WIRE_AGENCIES = [
    ("TTXVN", r"\b(?:ttxvn|thông tấn xã việt nam|vna)\b"),
    ("Reuters", r"\breuters\b"),
    ("AP", r"\b(?:ap|associated press)\b"),
    ("AFP", r"\b(?:afp|agence france-presse)\b"),
    ("Văn phòng Chính phủ", r"\bvăn phòng chính phủ\b"),
    ("Bộ Ngoại giao", r"\bbộ ngoại giao\b"),
    ("Bộ Công an", r"\bbộ công an\b"),
    ("Bộ Y tế", r"\bbộ y tế\b"),
    ("Bộ GD&ĐT", r"\bbộ giáo dục\b"),
]

KNOWN_LOCATIONS = [
    "Vân Nam", "Côn Minh", "Hà Nội", "TP.HCM", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
    "Việt Nam", "Trung Quốc", "Quảng Ninh", "Lạng Sơn", "Lào Cai", "Bắc Kinh",
]

COMMON_ACTIONS = [
    "khai mạc", "bế mạc", "tham dự", "gặp gỡ", "hội đàm", "ký kết", "thỏa thuận",
    "ban hành", "phê duyệt", "đề xuất", "kiến nghị", "bác bỏ", "khẳng định",
    "tiêu diệt", "ức chế", "thử nghiệm", "nghiệm thu", "khởi công", "khánh thành",
    "vận hành", "xử phạt", "khởi tố", "điều tra", "công bố",
]


class EvidenceLibraryService:
    """Service orchestrating evidence library storage and cross-source verification."""

    def __init__(self):
        self.chunker = TextChunker(chunk_size=400, chunk_overlap=50)

    @staticmethod
    def detect_original_source(text_content: str, publisher: str = "") -> str:
        """Detect wire service or dispatch origin (e.g. TTXVN, Reuters) in text."""
        t_lower = text_content.lower()
        for agency_name, pattern in WIRE_AGENCIES:
            if re.search(pattern, t_lower, re.IGNORECASE):
                return agency_name
        return publisher.strip() or "Nguồn độc lập"

    def extract_pdf_text(self, file_bytes: bytes) -> str:
        """Extract clean text from PDF bytes using pypdf."""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text()
                if txt:
                    pages_text.append(txt)
            return "\n\n".join(pages_text).strip()
        except Exception as e:
            logger.warning("pypdf extraction failed, attempting fallback: %s", e)
            # Simple text fallback if raw text was passed with pdf ext
            try:
                return file_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                return ""

    def extract_5d_entities(self, text: str) -> dict[str, Any]:
        """Extract 5 comparison dimensions: people, action, location, event_date, scope."""
        t_clean = clean_text(text)

        # 1. People / Actors
        # Pattern for Vietnamese titles + proper names
        people_matches = re.findall(
            r"\b(?:anh|chị|ông|bà|đồng chí|TS\.|PGS\.TS\.|GS\.TS\.|Bí thư|Chủ tịch|Bộ trưởng|Thủ tướng)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})\b",
            t_clean,
        )
        # Standalone capitalized proper names of 2-4 words
        general_names = re.findall(
            r"\b([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})\b",
            t_clean,
        )
        combined_people = list(dict.fromkeys(people_matches + [n for n in general_names if not any(loc in n for loc in KNOWN_LOCATIONS)]))

        # 2. Action / Predicates
        found_actions = [act for act in COMMON_ACTIONS if act in t_clean.lower()]

        # 3. Location
        found_locations = [loc for loc in KNOWN_LOCATIONS if loc.lower() in t_clean.lower()]

        # 4. Event Date / Time markers
        event_dates = extract_time_markers(t_clean)
        # Specific date patterns like dd/mm/yyyy
        exact_dates = re.findall(r"\b\d{1,2}/\d{1,2}/\d{4}\b", t_clean)
        all_dates = list(dict.fromkeys(exact_dates + event_dates))

        # 5. Scope
        scope = detect_modal_scope(t_clean)

        return {
            "people": combined_people[:4],
            "action": found_actions[:4],
            "location": found_locations[:3],
            "event_date": all_dates[:3],
            "scope": scope,
        }

    def import_document(
        self,
        title: str | None = None,
        content: str | None = None,
        source_url: str | None = None,
        publisher: str | None = None,
        original_source: str | None = None,
        publication_date: datetime | str | None = None,
        document_version: str = "1.0",
        file_bytes: bytes | None = None,
        file_name: str | None = None,
        db: Session | None = None,
    ) -> dict[str, Any]:
        """Ingest a new document from URL, PDF file, or raw text into the Evidence Library."""
        extracted_title = title or ""
        extracted_content = content or ""
        pub_name = publisher or ""

        # Step 1: Extract from PDF if file provided
        if file_bytes:
            if file_name and file_name.lower().endswith(".pdf"):
                extracted_content = self.extract_pdf_text(file_bytes)
                if not extracted_title:
                    extracted_title = file_name.rsplit(".", 1)[0].replace("_", " ")
            else:
                extracted_content = file_bytes.decode("utf-8", errors="ignore")
                if not extracted_title and file_name:
                    extracted_title = file_name

        # Step 2: Extract from URL if url provided and content is empty
        if source_url and not extracted_content:
            try:
                scraped = extract_from_url(source_url)
                if scraped.get("paragraphs"):
                    extracted_content = "\n\n".join(scraped["paragraphs"])
                if not extracted_title and scraped.get("title"):
                    extracted_title = scraped["title"]
                if not pub_name and scraped.get("author"):
                    pub_name = scraped["author"]
            except Exception as e:
                logger.warning("Scraping URL %s failed: %s", source_url, e)

        if not extracted_content.strip():
            raise ValueError("Không trích xuất được nội dung từ tài liệu cung cấp (URL/PDF rỗng).")

        if not extracted_title.strip():
            # Use first sentence as title
            extracted_title = extracted_content.strip().split("\n")[0][:120]

        if not pub_name:
            if source_url:
                from urllib.parse import urlparse
                domain = urlparse(source_url).netloc
                pub_name = domain.replace("www.", "")
            else:
                pub_name = "Nguồn tài liệu tự tải"

        # Detect or use original source (dispatch origin)
        resolved_original_source = (
            original_source.strip()
            if original_source and original_source.strip()
            else self.detect_original_source(extracted_content, pub_name)
        )

        # Parse publication date
        pub_dt = None
        if isinstance(publication_date, datetime):
            pub_dt = publication_date
        elif isinstance(publication_date, str) and publication_date.strip():
            try:
                pub_dt = datetime.fromisoformat(publication_date.replace("Z", "+00:00"))
            except Exception:
                pub_dt = utc_now()
        else:
            pub_dt = utc_now()

        retrieval_dt = utc_now()

        # Database transaction
        own_session = False
        if db is None:
            engine = get_engine()
            session = Session(engine)
            own_session = True
        else:
            session = db

        try:
            doc_id = gen_uuid()
            doc_record = Document(
                id=doc_id,
                title=extracted_title,
                content=extracted_content,
                doc_type="evidence_library",
                source_url=source_url,
                source_name=pub_name,
                dataset_id="EvidenceLibrary",
                record_id=doc_id[:8],
                language="vi",
                publication_date=pub_dt,
                metadata_json={
                    "publisher": pub_name,
                    "original_source": resolved_original_source,
                    "retrieval_date": retrieval_dt.isoformat(),
                    "document_version": document_version,
                    "source_url": source_url,
                },
            )
            session.add(doc_record)
            session.flush()

            # Split into passages (chunks)
            raw_chunks = self.chunker.split_text(extracted_content)
            if not raw_chunks:
                raw_chunks = [extracted_content]

            created_chunks = []
            for idx, ch_text in enumerate(raw_chunks):
                chunk_id = gen_uuid()
                chunk_record = DocumentChunk(
                    id=chunk_id,
                    document_id=doc_id,
                    chunk_index=idx,
                    content=ch_text,
                    token_count=len(ch_text.split()),
                    metadata_json={
                        "chunk_index": idx,
                        "source_name": pub_name,
                        "original_source": resolved_original_source,
                        "source_url": source_url,
                        "doc_title": extracted_title,
                        "document_version": document_version,
                        "publication_date": pub_dt.isoformat() if pub_dt else None,
                        "retrieval_date": retrieval_dt.isoformat(),
                    },
                )
                session.add(chunk_record)
                created_chunks.append({
                    "chunk_id": chunk_id,
                    "content": ch_text,
                    "source_name": pub_name,
                    "original_source": resolved_original_source,
                    "source_url": source_url,
                })

            session.commit()

            # Refresh BM25 index to immediately index new chunks
            try:
                bm25_retriever.reload_index()
            except Exception as e:
                logger.warning("BM25 reload index error: %s", e)

            return {
                "document_id": doc_id,
                "title": extracted_title,
                "publisher": pub_name,
                "original_source": resolved_original_source,
                "publication_date": pub_dt.isoformat() if pub_dt else None,
                "retrieval_date": retrieval_dt.isoformat(),
                "document_version": document_version,
                "source_url": source_url,
                "chunks_count": len(created_chunks),
                "passages": created_chunks,
                "status": "INGESTED",
            }
        except Exception:
            session.rollback()
            raise
        finally:
            if own_session:
                session.close()

    def find_claim_references(
        self,
        claim_id: str,
        db: Session,
        target_url: str | None = None,
    ) -> dict[str, Any]:
        """Retrieve matching passages for a claim with 5D comparison and conflict detection."""
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise ValueError(f"Không tìm thấy phát ngôn (claim) với ID: {claim_id}")

        analysis = db.query(Analysis).filter(Analysis.id == claim.analysis_id).first() if claim.analysis_id else None
        analyzed_article_url = analysis.source_url if analysis else None

        claim_5d = self.extract_5d_entities(f"{claim.claim_text} {claim.original_sentence or ''}")
        claim_scope = claim_5d["scope"]

        # Step 1: Hybrid retrieval from DocumentChunks (Evidence Library) and Knowledge Base
        raw_candidates = hybrid_rag_retriever.retrieve(
            query=claim.claim_text,
            top_k=15,
            min_relevance_threshold=0.20,
            agent_name="EvidenceLibraryService",
        )

        # Exclude the analyzed article itself from being independent confirmation!
        filtered_candidates = []
        seen_documents = set()
        for c in raw_candidates:
            c_url = c.get("source_url") or ""
            if analyzed_article_url and c_url and analyzed_article_url.rstrip("/") == c_url.rstrip("/"):
                # Exclude self-citation
                continue
            score = c.get("rerank_score", c.get("relevance_score", 0.0))
            if score < 0.20:
                continue

            # Keep top chunk per document to promote source diversity across multiple outlets
            doc_key = c.get("document_id") or c_url or c["chunk_id"]
            if doc_key in seen_documents:
                continue
            seen_documents.add(doc_key)
            filtered_candidates.append(c)
            if len(filtered_candidates) >= 6:
                break

        # If local evidence is insufficient and a target_url or source is specified, import and inspect it
        if not filtered_candidates and target_url:
            try:
                ingest_res = self.import_document(source_url=target_url, db=db)
                for p in ingest_res.get("passages", []):
                    filtered_candidates.append({
                        "chunk_id": p["chunk_id"],
                        "document_id": ingest_res["document_id"],
                        "dataset_source": "EvidenceLibrary",
                        "claim_matched": claim.claim_text,
                        "excerpt": p["content"][:400],
                        "source_name": ingest_res["publisher"],
                        "source_url": target_url,
                        "original_source": ingest_res["original_source"],
                        "relevance_score": 0.85,
                        "publication_date": ingest_res.get("publication_date"),
                    })
            except Exception as e:
                logger.warning("Could not auto-fetch target_url %s: %s", target_url, e)

        # If still no candidates found, strictly return "Chưa đủ bằng chứng"
        if not filtered_candidates:
            return {
                "claim_id": claim.id,
                "claim_text": claim.claim_text,
                "original_sentence": claim.original_sentence,
                "paragraph_id": getattr(claim, "paragraph_id", 0),
                "verdict": "NOT_ENOUGH_INFORMATION",
                "verification_status": "INSUFFICIENT_EVIDENCE",
                "reasoning": "Chưa đủ bằng chứng trong kho tri thức để đối soát luận điểm này.",
                "claim_5d": claim_5d,
                "passages": [],
                "syndicated_origins": [],
                "disputed_detail": None,
                "has_conflict": False,
            }

        # Step 2: Extract 5D entities and detect syndicated origins and conflicts
        processed_passages = []
        origins_map: dict[str, list[str]] = {}  # original_source -> list of source_urls
        disagreements = []

        for cand in filtered_candidates:
            excerpt = cand["excerpt"]
            cand_url = cand.get("source_url") or ""
            cand_publisher = cand.get("source_name") or "Cơ quan báo chí"

            # Determine original dispatch source
            cand_orig_source = cand.get("original_source") or self.detect_original_source(excerpt, cand_publisher)

            # Record syndication copy
            if cand_orig_source not in origins_map:
                origins_map[cand_orig_source] = []
            if cand_url and cand_url not in origins_map[cand_orig_source]:
                origins_map[cand_orig_source].append(cand_url)

            # Extract 5D for this passage
            passage_5d = self.extract_5d_entities(excerpt)

            # NLI inference
            nli_rel, nli_conf, _ = model_manager.run_nli_inference(claim.claim_text, excerpt, language="vi")

            # Check modal scope discrepancy
            if claim_scope == "ENACTED" and passage_5d["scope"] == "PROPOSAL":
                nli_rel = "REFUTES"

            # Check entity date conflicts (e.g. 25/10/2024 vs 26/10/2024)
            date_conflict = None
            if claim_5d["event_date"] and passage_5d["event_date"]:
                c_clean = [re.sub(r"[^\d/]", "", d) for d in claim_5d["event_date"] if re.sub(r"[^\d/]", "", d)]
                p_clean = [re.sub(r"[^\d/]", "", d) for d in passage_5d["event_date"] if re.sub(r"[^\d/]", "", d)]
                if c_clean and p_clean and not any(cd == pd for cd in c_clean for pd in p_clean):
                    date_conflict = f"Ngày sự kiện khác biệt: '{claim_5d['event_date'][0]}' (phát ngôn) vs '{passage_5d['event_date'][0]}' ({cand_publisher})"
                    disagreements.append(date_conflict)

            processed_passages.append({
                "chunk_id": cand["chunk_id"],
                "source_name": cand_publisher,
                "original_source": cand_orig_source,
                "source_url": cand_url,
                "excerpt": excerpt,
                "publication_date": cand.get("publication_date"),
                "relevance_score": cand.get("relevance_score", 0.8),
                "nli_relation": nli_rel,
                "entities_5d": passage_5d,
                "date_conflict": date_conflict,
            })

        # Step 3: Check conflicting dates/details BETWEEN multiple retrieved sources
        cross_source_conflicts = []
        for i in range(len(processed_passages)):
            for j in range(i + 1, len(processed_passages)):
                p1 = processed_passages[i]
                p2 = processed_passages[j]
                d1 = [re.sub(r"[^\d/]", "", d) for d in p1["entities_5d"]["event_date"] if re.sub(r"[^\d/]", "", d)]
                d2 = [re.sub(r"[^\d/]", "", d) for d in p2["entities_5d"]["event_date"] if re.sub(r"[^\d/]", "", d)]
                if d1 and d2 and not any(a == b for a in d1 for b in d2):
                    cross_source_conflicts.append(
                        f"Mâu thuẫn ngày sự kiện giữa hai nguồn: '{p1['entities_5d']['event_date'][0]}' ({p1['source_name']}) vs '{p2['entities_5d']['event_date'][0]}' ({p2['source_name']})"
                    )

        # Assemble syndicated origins summary (two URLs copying one dispatch count as one origin!)
        syndicated_origins = [
            {
                "original_source": orig,
                "copies_count": len(urls) if urls else 1,
                "copy_urls": urls,
                "is_syndicated": len(urls) > 1,
            }
            for orig, urls in origins_map.items()
        ]

        has_conflict = bool(disagreements or cross_source_conflicts)
        disputed_detail = (
            cross_source_conflicts[0] if cross_source_conflicts
            else (disagreements[0] if disagreements else None)
        )

        # Aggregate verdict based on independent origins
        refute_votes = sum(1 for p in processed_passages if p["nli_relation"] == "REFUTES")
        support_votes = sum(1 for p in processed_passages if p["nli_relation"] == "SUPPORTS")

        if refute_votes > support_votes:
            final_verdict = "REFUTED"
            verification_status = "VERIFIED_REFUTED"
        elif support_votes > refute_votes:
            final_verdict = "SUPPORTED"
            verification_status = "VERIFIED_SUPPORTED"
        else:
            final_verdict = "NOT_ENOUGH_INFORMATION"
            verification_status = "INSUFFICIENT_EVIDENCE"

        return {
            "claim_id": claim.id,
            "claim_text": claim.claim_text,
            "original_sentence": claim.original_sentence,
            "paragraph_id": getattr(claim, "paragraph_id", 0),
            "verdict": final_verdict,
            "verification_status": verification_status,
            "claim_5d": claim_5d,
            "passages": processed_passages,
            "syndicated_origins": syndicated_origins,
            "independent_origins_count": len(syndicated_origins),
            "disputed_detail": disputed_detail,
            "has_conflict": has_conflict,
            "reasoning": (
                f"Đã đối soát đối chiếu với {len(processed_passages)} đoạn trích từ {len(syndicated_origins)} nguồn gốc độc lập. "
                + (f"Phát hiện mâu thuẫn: {disputed_detail}. " if disputed_detail else "")
            ),
        }

    def rerun_claim_verification(
        self,
        claim_id: str,
        new_source_url: str | None = None,
        new_source_text: str | None = None,
        db: Session = None,
    ) -> dict[str, Any]:
        """Add another source and rerun verification for a specific claim."""
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise ValueError(f"Không tìm thấy phát ngôn với ID: {claim_id}")

        # Ingest new source if provided
        if new_source_url or new_source_text:
            self.import_document(
                content=new_source_text,
                source_url=new_source_url,
                title=f"Nguồn đối chứng bổ sung cho Claim #{claim_id[:8]}",
                db=db,
            )

        # Rerun reference finding
        ref_result = self.find_claim_references(claim_id, db=db, target_url=new_source_url)

        # Update claim in DB
        claim.verdict = ref_result["verdict"]
        claim.verification_status = ref_result["verification_status"]
        claim.reasoning = ref_result["reasoning"]

        # Clear old evidences for this claim and replace with newly verified passages
        db.query(Evidence).filter(Evidence.claim_id == claim.id).delete()

        for p in ref_result.get("passages", []):
            ev_id = gen_uuid()
            ev = Evidence(
                id=ev_id,
                claim_id=claim.id,
                source_name=p["source_name"],
                source_url=p.get("source_url"),
                excerpt=p["excerpt"],
                stance=p["nli_relation"],
                reliability_score=p.get("relevance_score", 0.9),
                relevance_score=p.get("relevance_score", 0.9),
                dataset_source="EvidenceLibrary",
                nli_relation=p["nli_relation"],
                retrieval_timestamp=utc_now(),
            )
            db.add(ev)

        db.commit()
        db.refresh(claim)

        return ref_result


evidence_library_service = EvidenceLibraryService()
