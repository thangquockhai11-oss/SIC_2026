"""
Extraction script for archive datasets (e.g., PHEME tar.bz2 / zip).
Extracts archives to datasets/extracted/ keeping raw files intact.
"""

import logging
from pathlib import Path
import tarfile
import zipfile

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"
RAW_DIR = DATASETS_DIR / "raw"
EXTRACTED_DIR = DATASETS_DIR / "extracted"


def extract_pheme() -> bool:
    tar_path = RAW_DIR / "pheme" / "PHEME_veracity.tar.bz2"
    zip_path = RAW_DIR / "pheme" / "pheme.zip"
    dest_dir = EXTRACTED_DIR / "pheme"
    dest_dir.mkdir(parents=True, exist_ok=True)

    if tar_path.exists():
        logger.info("Extracting PHEME archive: %s -> %s", tar_path, dest_dir)
        try:
            with tarfile.open(tar_path, "r:*") as tf:
                tf.extractall(dest_dir)
            total_files = sum(1 for _ in dest_dir.rglob("*") if _.is_file())
            logger.info("PHEME archive extraction complete: %d files extracted.", total_files)
            return True
        except Exception as e:
            logger.error("Error extracting PHEME archive: %s", e)
            return False
    elif zip_path.exists():
        logger.info("Extracting PHEME zip: %s -> %s", zip_path, dest_dir)
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(dest_dir)
            total_files = sum(1 for _ in dest_dir.rglob("*") if _.is_file())
            logger.info("PHEME zip extraction complete: %d files extracted.", total_files)
            return True
        except Exception as e:
            logger.error("Error extracting PHEME: %s", e)
            return False
    else:
        logger.warning("PHEME archive not found at %s or %s", tar_path, zip_path)
        return False


def main():
    logger.info("=== Extracting Downloaded Archives ===")
    extract_pheme()


if __name__ == "__main__":
    main()

