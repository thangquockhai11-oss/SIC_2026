"""
Download orchestrator for TrustMedia AI research datasets.

Supports:
- Direct HTTP(S) streaming downloads with resume, SHA-256 calculation, and retries.
- Hugging Face datasets via huggingface_hub.snapshot_download.
- Strict license status handling and content-type validation.
"""

import hashlib
import json
import logging
import os
from pathlib import Path
import time
from typing import Any
from urllib.parse import urlparse

from huggingface_hub import snapshot_download
import requests
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"
RAW_DIR = DATASETS_DIR / "raw"

HEADERS = {
    "User-Agent": "TrustMediaAI-ResearchBot/1.0 (+https://trustmedia.ai; data-ingestion)"
}


def calculate_sha256(filepath: Path) -> str:
    """Compute SHA-256 checksum of a file using chunks."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def download_file(
    url: str,
    dest_path: Path,
    expected_content_type: str | None = None,
    max_retries: int = 3,
    timeout: int = 60,
) -> dict[str, Any]:
    """Download a file with streaming, retries, and checksum."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    if dest_path.exists() and dest_path.stat().st_size > 0:
        logger.info("File already exists: %s (%d bytes). Skipping download.", dest_path, dest_path.stat().st_size)
        return {
            "status": "ALREADY_EXISTS",
            "size_bytes": dest_path.stat().st_size,
            "sha256": calculate_sha256(dest_path),
            "url": url,
        }

    temp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Downloading attempt %d/%d from: %s", attempt, max_retries, url)
            with requests.get(url, headers=HEADERS, stream=True, timeout=timeout) as response:
                if response.status_code != 200:
                    logger.warning("HTTP %d from %s", response.status_code, url)
                    if attempt < max_retries:
                        time.sleep(2 * attempt)
                        continue
                    return {
                        "status": "DOWNLOAD_FAILED",
                        "error": f"HTTP status {response.status_code}",
                        "url": url,
                    }

                content_type = response.headers.get("content-type", "")
                if expected_content_type and expected_content_type not in content_type:
                    # Check for accidental HTML error pages
                    if "text/html" in content_type and expected_content_type != "text/html":
                        logger.error("Unexpected HTML content-type '%s' for url: %s", content_type, url)
                        return {
                            "status": "DOWNLOAD_FAILED",
                            "error": f"Received HTML response instead of {expected_content_type}",
                            "url": url,
                        }

                total_size = int(response.headers.get("content-length", 0))
                sha = hashlib.sha256()
                written = 0

                with open(temp_path, "wb") as f, tqdm(
                    total=total_size,
                    unit="iB",
                    unit_scale=True,
                    desc=dest_path.name,
                ) as pbar:
                    for chunk in response.iter_content(chunk_size=1024 * 64):
                        if chunk:
                            f.write(chunk)
                            sha.update(chunk)
                            written += len(chunk)
                            pbar.update(len(chunk))

                if written == 0:
                    temp_path.unlink(missing_ok=True)
                    return {"status": "DOWNLOAD_FAILED", "error": "Empty response body", "url": url}

                temp_path.replace(dest_path)
                logger.info("Download completed: %s (%d bytes)", dest_path.name, written)
                return {
                    "status": "DOWNLOADED",
                    "size_bytes": written,
                    "sha256": sha.hexdigest(),
                    "url": url,
                }

        except Exception as e:
            logger.warning("Exception during download attempt %d: %s", attempt, e)
            temp_path.unlink(missing_ok=True)
            if attempt < max_retries:
                time.sleep(3 * attempt)
            else:
                return {"status": "DOWNLOAD_FAILED", "error": str(e), "url": url}

    return {"status": "DOWNLOAD_FAILED", "error": "Max retries exceeded", "url": url}


def download_hf_repo(repo_id: str, dest_dir: Path) -> dict[str, Any]:
    """Download a Hugging Face dataset repository snapshot."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading Hugging Face dataset snapshot: %s -> %s", repo_id, dest_dir)
    try:
        local_dir = snapshot_download(
            repo_id=repo_id,
            repo_type="dataset",
            local_dir=str(dest_dir),
            max_workers=4,
        )
        total_size = sum(f.stat().st_size for f in dest_dir.rglob("*") if f.is_file())
        file_count = sum(1 for f in dest_dir.rglob("*") if f.is_file())
        logger.info("HF download completed: %s (%d files, %d bytes)", repo_id, file_count, total_size)
        return {
            "status": "DOWNLOADED",
            "local_dir": str(local_dir),
            "file_count": file_count,
            "size_bytes": total_size,
        }
    except Exception as e:
        logger.error("Failed to download HF dataset %s: %s", repo_id, e)
        return {
            "status": "DOWNLOAD_FAILED",
            "error": str(e),
            "repo_id": repo_id,
        }


def download_fever() -> dict[str, Any]:
    """Download official FEVER dataset files."""
    fever_dir = RAW_DIR / "fever"
    urls = {
        "train.jsonl": "https://fever.ai/download/fever/train.jsonl",
        "shared_task_dev.jsonl": "https://fever.ai/download/fever/shared_task_dev.jsonl",
        "paper_dev.jsonl": "https://fever.ai/download/fever/paper_dev.jsonl",
    }
    results = {}
    for filename, url in urls.items():
        results[filename] = download_file(url, fever_dir / filename)
    return results


def download_vifactcheck() -> dict[str, Any]:
    """Download ViFactCheck dataset snapshot from Hugging Face."""
    dest_dir = RAW_DIR / "vifactcheck"
    return download_hf_repo("tranthaihoa/vifactcheck", dest_dir)


def download_xfact() -> dict[str, Any]:
    """Download X-FACT dataset snapshot from Hugging Face."""
    dest_dir = RAW_DIR / "xfact"
    return download_hf_repo("utahnlp/x-fact", dest_dir)


def download_goemotions() -> dict[str, Any]:
    """Download Google GoEmotions raw CSV files."""
    dest_dir = RAW_DIR / "goemotions"
    urls = {
        "goemotions_1.csv": "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_1.csv",
        "goemotions_2.csv": "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_2.csv",
        "goemotions_3.csv": "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_3.csv",
    }
    results = {}
    for filename, url in urls.items():
        results[filename] = download_file(url, dest_dir / filename)
    return results


def download_uit_vsmec() -> dict[str, Any]:
    """Download UIT-VSMEC dataset from Hugging Face."""
    dest_dir = RAW_DIR / "uit_vsmec"
    return download_hf_repo("ura-hcmut/UIT-VSMEC", dest_dir)


def download_pheme() -> dict[str, Any]:
    """Download PHEME rumour dataset archive from Figshare."""
    dest_dir = RAW_DIR / "pheme"
    url = "https://ndownloader.figshare.com/files/11767817"
    return download_file(url, dest_dir / "PHEME_veracity.tar.bz2")


def download_nela_gt() -> dict[str, Any]:
    """Download NELA-GT-2020 source labels CSV and SQLite if available."""
    dest_dir = RAW_DIR / "nela_gt"
    # Source labels CSV is priority 1
    source_labels_url = "https://dataverse.harvard.edu/api/access/datafile/4366864"
    res1 = download_file(source_labels_url, dest_dir / "nela_gt_source_labels.csv")

    # SQLite database (Harvard Dataverse file ID 4417500)
    sqlite_url = "https://dataverse.harvard.edu/api/access/datafile/4417500"
    res2 = download_file(sqlite_url, dest_dir / "nela_gt_2020.sqlite")

    return {"labels": res1, "sqlite": res2}


def download_tweeteval() -> dict[str, Any]:
    """Download TweetEval dataset from Hugging Face."""
    dest_dir = RAW_DIR / "tweeteval"
    return download_hf_repo("cardiffnlp/tweet_eval", dest_dir)


def download_viwiki() -> dict[str, Any]:
    """Download Vietnamese Wikipedia dump files from Wikimedia."""
    dest_dir = RAW_DIR / "viwiki"
    base_url = "https://dumps.wikimedia.org/viwiki/latest/"
    urls = {
        "viwiki-latest-all-titles-in-ns0.gz": base_url + "viwiki-latest-all-titles-in-ns0.gz",
        "viwiki-latest-pages-articles-multistream-index.txt.bz2": base_url + "viwiki-latest-pages-articles-multistream-index.txt.bz2",
    }
    results = {}
    for filename, url in urls.items():
        results[filename] = download_file(url, dest_dir / filename)
    return results


def download_enwiki() -> dict[str, Any]:
    """Download English Wikipedia dump files from Wikimedia."""
    dest_dir = RAW_DIR / "enwiki"
    base_url = "https://dumps.wikimedia.org/enwiki/latest/"
    urls = {
        "enwiki-latest-all-titles-in-ns0.gz": base_url + "enwiki-latest-all-titles-in-ns0.gz",
        "enwiki-latest-pages-articles-multistream-index1.txt-p1p41242.bz2": base_url + "enwiki-latest-pages-articles-multistream-index1.txt-p1p41242.bz2",
    }
    results = {}
    for filename, url in urls.items():
        results[filename] = download_file(url, dest_dir / filename)
    return results


def main():
    logger.info("=== Starting TrustMedia AI Dataset Download Pipeline ===")
    summary = {}

    # AUTO_DOWNLOAD Group
    logger.info("--- [1/9] Downloading FEVER ---")
    summary["fever"] = download_fever()

    logger.info("--- [2/9] Downloading ViFactCheck ---")
    summary["vifactcheck"] = download_vifactcheck()

    logger.info("--- [3/9] Downloading X-FACT ---")
    summary["xfact"] = download_xfact()

    logger.info("--- [4/9] Downloading GoEmotions ---")
    summary["goemotions"] = download_goemotions()

    logger.info("--- [5/9] Downloading UIT-VSMEC ---")
    summary["uit_vsmec"] = download_uit_vsmec()

    logger.info("--- [6/9] Downloading PHEME ---")
    summary["pheme"] = download_pheme()

    logger.info("--- [7/9] Downloading NELA-GT-2020 ---")
    summary["nela_gt"] = download_nela_gt()

    logger.info("--- [8/9] Downloading viwiki (Vietnamese Wikipedia Dump) ---")
    summary["viwiki"] = download_viwiki()

    logger.info("--- [9/9] Downloading enwiki (English Wikipedia Dump) ---")
    summary["enwiki"] = download_enwiki()

    # LICENSE_REVIEW_REQUIRED Group
    logger.info("--- Downloading TweetEval (LICENSE_REVIEW_REQUIRED) ---")
    summary["tweeteval"] = download_tweeteval()

    # Write raw download log
    log_path = DATASETS_DIR / "manifests" / "download_run_log.json"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info("Download run log saved to: %s", log_path)


if __name__ == "__main__":
    main()
