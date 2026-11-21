"""Dataset registry endpoints with metadata query and CRUD management."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_optional_current_user
from app.database.dependencies import get_db_session
from app.database.models import DatasetItem, User, gen_uuid
from app.schemas.datasets import (
    DatasetCategory,
    DatasetCreate,
    DatasetListResponse,
    DatasetRecord,
    DatasetUpdate,
    VerificationStatus,
)
from app.services.dataset_registry import load_dataset_registry

router = APIRouter()


@router.get("/datasets", response_model=DatasetListResponse, summary="List dataset metadata")
def list_datasets(
    category: DatasetCategory | None = None,
    status: VerificationStatus | None = None,
    language: str | None = Query(default=None, min_length=2, max_length=20),
    q: str | None = Query(default=None, min_length=1, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db_session),
) -> DatasetListResponse:
    """Filter and paginate metadata without downloading dataset contents."""
    records = list(load_dataset_registry())

    # Merge dynamic user-added dataset items from DB if any
    try:
        db_items = db.query(DatasetItem).all()
        existing_ids = {r.dataset_id for r in records}
        for d in db_items:
            if d.dataset_id not in existing_ids:
                records.append(
                    DatasetRecord(
                        dataset_id=d.dataset_id,
                        name=d.name,
                        category=DatasetCategory(d.category),
                        source_url=d.source_url,
                        languages=d.languages or [],
                        intended_tasks=d.intended_tasks or [],
                        dataset_version=d.dataset_version,
                        license=d.license,
                        label_schema=[],
                        license_status=VerificationStatus(d.license_status),
                        schema_status=VerificationStatus(d.schema_status),
                        status=VerificationStatus(d.status),
                        last_downloaded_at=None,
                        preprocessing_configuration={},
                        split_configuration={},
                        notes=d.notes or "",
                    )
                )
    except Exception:
        # Fallback to pure checked-in registry if DB is in mock test mode
        pass

    if category is not None:
        records = [item for item in records if item.category == category]
    if status is not None:
        records = [item for item in records if item.status == status]
    if language is not None:
        wanted = language.casefold()
        records = [
            item for item in records
            if any(wanted in value.casefold() for value in item.languages)
        ]
    if q is not None:
        needle = q.casefold()
        records = [
            item for item in records
            if needle in item.name.casefold()
            or needle in item.dataset_id.casefold()
            or any(needle in task.casefold() for task in item.intended_tasks)
        ]

    total = len(records)
    start = (page - 1) * page_size
    return DatasetListResponse(
        items=records[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/datasets", response_model=DatasetRecord, status_code=status.HTTP_201_CREATED, summary="Create a new dataset entry")
def create_dataset(
    data: DatasetCreate,
    db: Session = Depends(get_db_session),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> DatasetRecord:
    """Register a new research dataset in the database."""
    if current_user and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Hội đồng Khoa học (Admin) mới có quyền tạo tập dữ liệu mới",
        )

    existing = db.query(DatasetItem).filter(DatasetItem.dataset_id == data.dataset_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dataset ID already exists")

    item = DatasetItem(
        id=gen_uuid(),
        dataset_id=data.dataset_id,
        name=data.name,
        category=data.category.value,
        source_url=data.source_url,
        languages=data.languages,
        intended_tasks=data.intended_tasks,
        dataset_version=data.dataset_version,
        license=data.license,
        sample_count=data.sample_count,
        status="UNVERIFIED",
        license_status="UNVERIFIED",
        schema_status="UNVERIFIED",
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return DatasetRecord(
        dataset_id=item.dataset_id,
        name=item.name,
        category=DatasetCategory(item.category),
        source_url=item.source_url,
        languages=item.languages or [],
        intended_tasks=item.intended_tasks or [],
        dataset_version=item.dataset_version,
        license=item.license,
        label_schema=[],
        license_status=VerificationStatus.UNVERIFIED,
        schema_status=VerificationStatus.UNVERIFIED,
        status=VerificationStatus.UNVERIFIED,
        last_downloaded_at=None,
        preprocessing_configuration={},
        split_configuration={},
        notes=item.notes or "",
    )


@router.put("/datasets/{dataset_id}", response_model=DatasetRecord, summary="Update dataset metadata")
def update_dataset(
    dataset_id: str,
    data: DatasetUpdate,
    db: Session = Depends(get_db_session),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> DatasetRecord:
    """Update dataset metadata attributes."""
    if current_user and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Hội đồng Khoa học (Admin) mới có quyền cập nhật tập dữ liệu",
        )

    item = db.query(DatasetItem).filter(DatasetItem.dataset_id == dataset_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Dataset not found in database")

    if data.name is not None:
        item.name = data.name
    if data.category is not None:
        item.category = data.category.value
    if data.source_url is not None:
        item.source_url = data.source_url
    if data.languages is not None:
        item.languages = data.languages
    if data.intended_tasks is not None:
        item.intended_tasks = data.intended_tasks
    if data.dataset_version is not None:
        item.dataset_version = data.dataset_version
    if data.license is not None:
        item.license = data.license
    if data.sample_count is not None:
        item.sample_count = data.sample_count
    if data.status is not None:
        item.status = data.status.value
    if data.license_status is not None:
        item.license_status = data.license_status.value
    if data.schema_status is not None:
        item.schema_status = data.schema_status.value
    if data.notes is not None:
        item.notes = data.notes

    db.commit()
    db.refresh(item)

    return DatasetRecord(
        dataset_id=item.dataset_id,
        name=item.name,
        category=DatasetCategory(item.category),
        source_url=item.source_url,
        languages=item.languages or [],
        intended_tasks=item.intended_tasks or [],
        dataset_version=item.dataset_version,
        license=item.license,
        label_schema=[],
        license_status=VerificationStatus(item.license_status),
        schema_status=VerificationStatus(item.schema_status),
        status=VerificationStatus(item.status),
        last_downloaded_at=None,
        preprocessing_configuration={},
        split_configuration={},
        notes=item.notes or "",
    )


@router.delete("/datasets/{dataset_id}", summary="Delete dataset entry")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db_session),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> dict[str, str]:
    """Remove a dataset entry from the database."""
    if current_user and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Hội đồng Khoa học (Admin) mới có quyền xóa tập dữ liệu",
        )

    item = db.query(DatasetItem).filter(DatasetItem.dataset_id == dataset_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Dataset not found in database")

    db.delete(item)
    db.commit()
    return {"status": "ok", "message": f"Dataset {dataset_id} deleted successfully"}
