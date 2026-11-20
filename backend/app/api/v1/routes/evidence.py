"""Evidence Explorer & Ingestion endpoints."""

from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim, Document, DocumentChunk, Evidence
from app.services.evidence_library_service import evidence_library_service

router = APIRouter(prefix="/evidence")


class EvidenceImportRequest(BaseModel):
    url: str | None = None
    title: str | None = None
    content: str | None = None
    publisher: str | None = None
    original_source: str | None = None
    publication_date: str | None = None
    document_version: str = "1.0"


class FindReferencesRequest(BaseModel):
    target_url: str | None = None


class RerunVerificationRequest(BaseModel):
    new_source_url: str | None = None
    new_source_text: str | None = None


@router.get("", summary="Explore verified claims and associated evidence with provenance")
def list_evidences(
    q: str | None = Query(default=None, max_length=100),
    verdict: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> dict:
    """List claims, retrieved evidence excerpts, source URLs, and stance classifications."""
    query = db.query(Claim).options(joinedload(Claim.evidences), joinedload(Claim.analysis))

    if verdict:
        query = query.filter(Claim.verdict == verdict.upper())
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(
            (Claim.claim_text.ilike(needle))
            | (Claim.reasoning.ilike(needle))
            | (Claim.evidences.any(Evidence.source_name.ilike(needle)))
            | (Claim.evidences.any(Evidence.excerpt.ilike(needle)))
        )

    total = query.count()
    claims = (
        query.order_by(Claim.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c in claims:
        items.append({
            "id": c.id,
            "analysis_id": c.analysis_id,
            "analysis_title": c.analysis.title if c.analysis else "Không xác định",
            "claim_text": c.claim_text,
            "original_sentence": c.original_sentence,
            "paragraph_id": getattr(c, "paragraph_id", 0),
            "verdict": c.verdict,
            "confidence": c.confidence,
            "confidence_metric_type": getattr(c, "confidence_metric_type", "CALIBRATED_NLI_POSTERIOR"),
            "verification_status": getattr(c, "verification_status", None),
            "model_name": getattr(c, "model_name", "TrustMedia-NLI-HybridVerifier"),
            "model_version": getattr(c, "model_version", "1.2"),
            "reasoning": c.reasoning,
            "limitations": c.limitations,
            "created_at": c.created_at.isoformat(),
            "evidences": [
                {
                    "id": e.id,
                    "source_name": e.source_name,
                    "source_url": e.source_url,
                    "excerpt": e.excerpt,
                    "stance": e.stance,
                    "reliability_score": e.reliability_score,
                    "relevance_score": getattr(e, "relevance_score", None),
                    "dataset_source": getattr(e, "dataset_source", None),
                    "dataset_record_id": getattr(e, "dataset_record_id", None),
                    "nli_relation": getattr(e, "nli_relation", None),
                    "retrieval_timestamp": e.retrieval_timestamp.isoformat(),
                }
                for e in c.evidences
            ],
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/import", summary="Import a document into the Evidence Library (URL, PDF, or text)")
async def import_document(
    payload: EvidenceImportRequest | None = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Ingest a document from URL or direct content, storing publisher, dispatch origin, and passages."""
    if not payload:
        raise HTTPException(status_code=400, detail="Dữ liệu nạp tài liệu không hợp lệ.")

    try:
        res = evidence_library_service.import_document(
            title=payload.title,
            content=payload.content,
            source_url=payload.url,
            publisher=payload.publisher,
            original_source=payload.original_source,
            publication_date=payload.publication_date,
            document_version=payload.document_version,
            db=db,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload", summary="Upload a document file (PDF / Text) into Evidence Library")
async def upload_document_file(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    publisher: str | None = Form(default=None),
    original_source: str | None = Form(default=None),
    publication_date: str | None = Form(default=None),
    document_version: str = Form(default="1.0"),
    db: Session = Depends(get_db_session),
) -> dict:
    """Upload and process PDF or TXT file into Evidence Library passages."""
    file_bytes = await file.read()
    try:
        res = evidence_library_service.import_document(
            title=title or file.filename,
            source_url=None,
            publisher=publisher or "Tài liệu tải lên",
            original_source=original_source,
            publication_date=publication_date,
            document_version=document_version,
            file_bytes=file_bytes,
            file_name=file.filename,
            db=db,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/documents", summary="List all ingested documents in Evidence Library")
def list_library_documents(
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> dict:
    """List documents in Evidence Library with metadata, original sources, and chunk counts."""
    query = db.query(Document).options(joinedload(Document.chunks))
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter((Document.title.ilike(needle)) | (Document.source_name.ilike(needle)))

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for d in docs:
        meta = d.metadata_json or {}
        items.append({
            "id": d.id,
            "title": d.title,
            "publisher": d.source_name,
            "original_source": meta.get("original_source") or d.source_name,
            "publication_date": d.publication_date.isoformat() if d.publication_date else None,
            "retrieval_date": meta.get("retrieval_date") or d.created_at.isoformat(),
            "document_version": meta.get("document_version", "1.0"),
            "source_url": d.source_url,
            "chunks_count": len(d.chunks),
            "created_at": d.created_at.isoformat(),
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/claims/{claim_id}/find-references", summary="Find matching passages for claim with 5D comparison")
def find_claim_references_endpoint(
    claim_id: str,
    payload: FindReferencesRequest | None = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Find references, perform 5D entity comparison, group syndicated copies, detect conflicts."""
    target_url = payload.target_url if payload else None
    try:
        return evidence_library_service.find_claim_references(claim_id=claim_id, db=db, target_url=target_url)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/claims/{claim_id}/rerun", summary="Rerun verification for a claim with optional new source")
def rerun_claim_verification_endpoint(
    claim_id: str,
    payload: RerunVerificationRequest | None = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Rerun claim verification with an additional source."""
    new_url = payload.new_source_url if payload else None
    new_text = payload.new_source_text if payload else None
    try:
        return evidence_library_service.rerun_claim_verification(
            claim_id=claim_id,
            new_source_url=new_url,
            new_source_text=new_text,
            db=db,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
