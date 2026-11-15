"""Information Reception research endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.dependencies import get_db_session
from app.database.models import InformationReception
from app.schemas.analysis import InformationReceptionResponse

router = APIRouter(prefix="/reception")


@router.get("/tests", response_model=list[InformationReceptionResponse], summary="List reception evaluation records")
def list_reception_tests(db: Session = Depends(get_db_session)) -> list[InformationReceptionResponse]:
    """Retrieve comprehension and sharing intention evaluation records."""
    records = db.query(InformationReception).order_by(InformationReception.created_at.desc()).all()
    return [
        InformationReceptionResponse(
            id=r.id,
            sample_size=r.sample_size,
            comprehension_score=r.comprehension_score,
            claim_identification_rate=r.claim_identification_rate,
            acceptance_rate=r.acceptance_rate,
            sharing_intention_high=r.sharing_intention_high,
            sharing_intention_medium=r.sharing_intention_medium,
            sharing_intention_low=r.sharing_intention_low,
            verify_before_sharing_rate=r.verify_before_sharing_rate,
            cognitive_resistance_notes=r.cognitive_resistance_notes,
        )
        for r in records
    ]

