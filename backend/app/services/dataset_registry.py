"""Read and validate the metadata-only dataset catalog."""

import json
from functools import lru_cache
from pathlib import Path

from app.schemas.datasets import DatasetRecord


@lru_cache(maxsize=1)
def load_dataset_registry() -> tuple[DatasetRecord, ...]:
    """Load the checked-in registry once per process."""
    path = Path(__file__).resolve().parents[1] / "data" / "datasets.json"
    raw_records = json.loads(path.read_text(encoding="utf-8"))
    return tuple(DatasetRecord.model_validate(item) for item in raw_records)
