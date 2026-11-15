"""Dataset registry response schemas."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class DatasetCategory(StrEnum):
    FACT_CHECKING = "fact_checking"
    MEDIA_CREDIBILITY = "media_credibility"
    PUBLIC_OPINION = "public_opinion"
    PUBLIC_TRUST = "public_trust"
    INFORMATION_RECEPTION = "information_reception"


class VerificationStatus(StrEnum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"


class DatasetRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    category: DatasetCategory
    source_url: str | None = None
    languages: list[str] = Field(default_factory=list)
    intended_tasks: list[str] = Field(default_factory=list)
    dataset_version: str | None = None
    license: str | None = None
    label_schema: list[str] = Field(default_factory=list)
    license_status: VerificationStatus = VerificationStatus.UNVERIFIED
    schema_status: VerificationStatus = VerificationStatus.UNVERIFIED
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    last_downloaded_at: datetime | None = None
    preprocessing_configuration: dict[str, object] = Field(default_factory=dict)
    split_configuration: dict[str, object] = Field(default_factory=dict)
    notes: str


class DatasetListResponse(BaseModel):
    items: list[DatasetRecord]
    total: int
    page: int
    page_size: int


class DatasetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    category: DatasetCategory
    source_url: str | None = None
    languages: list[str] = Field(default_factory=list)
    intended_tasks: list[str] = Field(default_factory=list)
    dataset_version: str | None = None
    license: str | None = None
    sample_count: int = Field(default=0, ge=0)
    notes: str = Field(default="")


class DatasetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: DatasetCategory | None = None
    source_url: str | None = None
    languages: list[str] | None = None
    intended_tasks: list[str] | None = None
    dataset_version: str | None = None
    license: str | None = None
    sample_count: int | None = Field(default=None, ge=0)
    status: VerificationStatus | None = None
    license_status: VerificationStatus | None = None
    schema_status: VerificationStatus | None = None
    notes: str | None = None
