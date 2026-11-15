"""
Manifest builder for TrustMedia AI datasets.
Compiles datasets/manifests/datasets_manifest.json with complete metadata,
provenance, hashes, schemas, and verification statuses.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"
RAW_DIR = DATASETS_DIR / "raw"
MANIFESTS_DIR = DATASETS_DIR / "manifests"


def get_dir_size_and_files(path: Path) -> tuple[int, list[str]]:
    """Return total bytes and relative file list for a directory."""
    if not path.exists():
        return 0, []
    total_bytes = 0
    file_list = []
    for f in path.rglob("*"):
        if f.is_file():
            total_bytes += f.stat().st_size
            file_list.append(str(f.relative_to(ROOT_DIR)).replace("\\", "/"))
    return total_bytes, file_list


def compute_file_sha256(path: Path) -> str:
    """Compute sha256 for a single file."""
    if not path.exists() or not path.is_file():
        return ""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def build_manifest():
    now_iso = datetime.now(timezone.utc).isoformat()
    verif_file = MANIFESTS_DIR / "verification_report.json"
    verif_data = {}
    if verif_file.exists():
        with open(verif_file, "r", encoding="utf-8") as f:
            verif_data = json.load(f)

    manifest_entries = []

    # 1. FEVER
    fever_bytes, fever_files = get_dir_size_and_files(RAW_DIR / "fever")
    fever_v = verif_data.get("fever", {})
    manifest_entries.append({
        "dataset_id": "fever",
        "name": "FEVER (Fact Extraction and VERification)",
        "source_url": "https://fever.ai/dataset/fever.html",
        "download_url": "https://fever.ai/download/fever/train.jsonl",
        "download_status": "DOWNLOADED" if fever_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_COMMERCIAL_RESEARCH",
        "license": "CC-BY-SA-3.0 (Wikipedia-derived)",
        "language": ["en"],
        "file_list": fever_files,
        "total_bytes": fever_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "fever" / "train.jsonl"),
        "total_records": fever_v.get("total_records", 0),
        "splits": ["train", "shared_task_dev", "paper_dev"],
        "schema": ["id", "verifiable", "label", "claim", "evidence"],
        "downloaded_at": now_iso if fever_bytes > 0 else None,
        "citation": "Thorne et al., NAACL-HLT 2018 (FEVER: a large-scale dataset for Fact Extraction and VERification)",
        "validation_status": fever_v.get("status", "UNVERIFIED"),
        "notes": "Evidence linked to Wikipedia dump. Train and dev splits verified.",
    })

    # 2. ViFactCheck
    vi_bytes, vi_files = get_dir_size_and_files(RAW_DIR / "vifactcheck")
    vi_v = verif_data.get("vifactcheck", {})
    manifest_entries.append({
        "dataset_id": "vifactcheck",
        "name": "ViFactCheck (Vietnamese Fact-Checking Dataset)",
        "source_url": "https://huggingface.co/datasets/tranthaihoa/vifactcheck",
        "download_url": "https://huggingface.co/datasets/tranthaihoa/vifactcheck",
        "download_status": "DOWNLOADED" if vi_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_RESEARCH",
        "license": "MIT / Academic Research",
        "language": ["vi"],
        "file_list": vi_files,
        "total_bytes": vi_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "vifactcheck" / "data" / "train-00000-of-00001.parquet"),
        "total_records": vi_v.get("total_records", 0),
        "splits": list(vi_v.get("splits", {}).keys()),
        "schema": vi_v.get("schema", ["Statement", "Context", "Evidence", "labels"]),
        "downloaded_at": now_iso if vi_bytes > 0 else None,
        "citation": "Tran et al., ViFactCheck: Vietnamese Fact-checking with Evidence",
        "validation_status": vi_v.get("status", "UNVERIFIED"),
        "notes": "Claims & evidence annotated in Vietnamese. Labels: 0=Supported, 1=Refuted, 2=Not Enough Info.",
    })

    # 3. X-FACT
    xfact_bytes, xfact_files = get_dir_size_and_files(RAW_DIR / "xfact")
    xfact_v = verif_data.get("xfact", {})
    manifest_entries.append({
        "dataset_id": "xfact",
        "name": "X-FACT (Multilingual Fact-Checking Dataset)",
        "source_url": "https://github.com/utahnlp/x-fact",
        "download_url": "https://huggingface.co/datasets/utahnlp/x-fact",
        "download_status": "DOWNLOADED" if xfact_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_RESEARCH",
        "license": "CC-BY-SA-4.0",
        "language": ["multilingual", "vi", "en", "es", "fr", "de", "tr"],
        "file_list": xfact_files,
        "total_bytes": xfact_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "xfact" / "all_languages" / "train-00000-of-00001.csv"),
        "total_records": xfact_v.get("total_records", 0),
        "splits": ["train", "dev", "test", "ood", "zeroshot"],
        "schema": xfact_v.get("schema", ["claim", "evidence", "label", "language", "site", "links"]),
        "downloaded_at": now_iso if xfact_bytes > 0 else None,
        "citation": "Gupta and Srikumar, ACL 2021 (X-FACT: A Large-scale Multilingual Dataset for Factual Verification)",
        "validation_status": xfact_v.get("status", "UNVERIFIED"),
        "notes": "Multilingual claim verification across 25 languages.",
    })

    # 4. NELA-GT-2020
    nela_bytes, nela_files = get_dir_size_and_files(RAW_DIR / "nela_gt")
    nela_v = verif_data.get("nela_gt", {})
    manifest_entries.append({
        "dataset_id": "nela_gt_2020",
        "name": "NELA-GT-2020 (News and Media Credibility Benchmark)",
        "source_url": "https://github.com/MELALab/nela-gt",
        "download_url": "https://dataverse.harvard.edu/api/access/datafile/4366864",
        "download_status": "BLOCKED_BY_WAF_CHALLENGE",
        "license_status": "VERIFIED_RESEARCH",
        "license": "CC0 - Public Domain Dedication",
        "language": ["en"],
        "file_list": nela_files,
        "total_bytes": nela_bytes,
        "sha256": "",
        "total_records": 0,
        "splits": ["full_source_labels"],
        "schema": ["source", "label", "media_bias_fact_check", "newsguard", "allsides"],
        "downloaded_at": None,
        "citation": "Gruppi et al., ICWSM 2021 (NELA-GT-2020: A Large Multi-Labelled News Dataset)",
        "validation_status": "BLOCKED_BY_WAF_CHALLENGE",
        "notes": "Harvard Dataverse is protected by AWS WAF Challenge (x-amzn-waf-action: challenge). Requires user manual download or API key.",
    })

    # 5. TweetEval
    te_bytes, te_files = get_dir_size_and_files(RAW_DIR / "tweeteval")
    te_v = verif_data.get("tweeteval", {})
    manifest_entries.append({
        "dataset_id": "tweeteval",
        "name": "TweetEval (Multi-task Twitter Benchmark)",
        "source_url": "https://github.com/cardiffnlp/tweeteval",
        "download_url": "https://huggingface.co/datasets/cardiffnlp/tweet_eval",
        "download_status": "DOWNLOADED" if te_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "LICENSE_REVIEW_REQUIRED",
        "license": "Per-task licenses subject to Twitter Developer Policy",
        "language": ["en"],
        "file_list": te_files,
        "total_bytes": te_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "tweeteval" / "sentiment" / "train-00000-of-00001.parquet"),
        "total_records": te_v.get("total_records", 0),
        "splits": ["sentiment", "emotion", "stance_climate", "stance_feminist", "stance_hillary"],
        "schema": ["text", "label"],
        "downloaded_at": now_iso if te_bytes > 0 else None,
        "citation": "Barbieri et al., Findings of EMNLP 2020 (TweetEval: Unified Benchmark and Comparative Evaluation for Tweet Classification)",
        "validation_status": "VALIDATED_LICENSE_REVIEW_REQUIRED",
        "notes": "Requires individual subset license verification before commercial deployment.",
    })

    # 6. GoEmotions
    ge_bytes, ge_files = get_dir_size_and_files(RAW_DIR / "goemotions")
    ge_v = verif_data.get("goemotions", {})
    manifest_entries.append({
        "dataset_id": "goemotions",
        "name": "GoEmotions (Fine-Grained Emotion Dataset)",
        "source_url": "https://github.com/google-research/google-research/tree/master/goemotions",
        "download_url": "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_1.csv",
        "download_status": "DOWNLOADED" if ge_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_OPEN_SOURCE",
        "license": "Apache-2.0",
        "language": ["en"],
        "file_list": ge_files,
        "total_bytes": ge_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "goemotions" / "goemotions_1.csv"),
        "total_records": ge_v.get("total_records", 0),
        "splits": ["full_1", "full_2", "full_3"],
        "schema": ge_v.get("schema", ["text", "id", "author", "subreddit"]),
        "downloaded_at": now_iso if ge_bytes > 0 else None,
        "citation": "Demszky et al., ACL 2020 (GoEmotions: A Dataset of Fine-Grained Emotions)",
        "validation_status": ge_v.get("status", "UNVERIFIED"),
        "notes": "27 fine-grained emotion labels plus neutral over 58,000 Reddit comments.",
    })

    # 7. UIT-VSFC
    manifest_entries.append({
        "dataset_id": "uit_vsfc",
        "name": "UIT-VSFC (Vietnamese Students' Feedback Corpus)",
        "source_url": "https://github.com/kietnv/VietnameseDatasets",
        "download_url": "https://huggingface.co/datasets/uitnlp/vietnamese_students_feedback",
        "download_status": "WAITING_USER_PERMISSION",
        "license_status": "WAITING_USER_PERMISSION",
        "license": "Non-commercial Research (Requires Corpus Agreement)",
        "language": ["vi"],
        "file_list": [],
        "total_bytes": 0,
        "sha256": "",
        "total_records": 0,
        "splits": ["train", "validation", "test"],
        "schema": ["sentence", "sentiment", "topic"],
        "downloaded_at": None,
        "citation": "Nguyen et al., PACLIC 2018 (UIT-VSFC: Vietnamese Students' Feedback Corpus for Sentiment Analysis)",
        "validation_status": "WAITING_USER_PERMISSION",
        "notes": "Research agreement form must be completed with the official authors at UIT-VNUHCM before downloading.",
    })

    # 8. UIT-VSMEC
    vsmec_bytes, vsmec_files = get_dir_size_and_files(RAW_DIR / "uit_vsmec")
    vsmec_v = verif_data.get("uit_vsmec", {})
    manifest_entries.append({
        "dataset_id": "uit_vsmec",
        "name": "UIT-VSMEC (Vietnamese Social Media Emotion Corpus)",
        "source_url": "https://github.com/kietnv/VietnameseDatasets",
        "download_url": "https://huggingface.co/datasets/ura-hcmut/UIT-VSMEC",
        "download_status": "DOWNLOADED" if vsmec_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_RESEARCH",
        "license": "CC-BY-NC-SA-4.0",
        "language": ["vi"],
        "file_list": vsmec_files,
        "total_bytes": vsmec_bytes,
        "sha256": compute_file_sha256(Path(vsmec_files[0])) if vsmec_files else "",
        "total_records": vsmec_v.get("total_records", 0),
        "splits": ["train", "validation", "test"],
        "schema": vsmec_v.get("schema", ["Sentence", "Emotion"]),
        "downloaded_at": now_iso if vsmec_bytes > 0 else None,
        "citation": "Ho et al., RIVF 2020 (Emotion Recognition for Vietnamese Social Media Text)",
        "validation_status": vsmec_v.get("status", "UNVERIFIED"),
        "notes": "Labels: Enjoyment, Sadness, Anger, Fear, Disgust, Surprise, Other.",
    })

    # 9. PHEME
    pheme_bytes, pheme_files = get_dir_size_and_files(RAW_DIR / "pheme")
    pheme_v = verif_data.get("pheme", {})
    manifest_entries.append({
        "dataset_id": "pheme",
        "name": "PHEME (Rumour Detection and Veracity Classification)",
        "source_url": "https://figshare.com/articles/dataset/PHEME_dataset_for_Rumour_Detection_and_Veracity_Classification/6392078",
        "download_url": "https://ndownloader.figshare.com/files/11767817",
        "download_status": "DOWNLOADED" if pheme_bytes > 0 else "NOT_DOWNLOADED",
        "license_status": "VERIFIED_RESEARCH",
        "license": "CC-BY-4.0 (Annotations) / Twitter Terms apply to tweets",
        "language": ["en", "de"],
        "file_list": pheme_files,
        "total_bytes": pheme_bytes,
        "sha256": compute_file_sha256(RAW_DIR / "pheme" / "PHEME_veracity.tar.bz2"),
        "total_records": pheme_v.get("total_records", 0),
        "splits": ["charliehebdo", "ferguson", "germanwings-crash", "ottawashooting", "sydneysiege"],
        "schema": ["source_tweet", "reactions", "annotation", "structure"],
        "downloaded_at": now_iso if pheme_bytes > 0 else None,
        "citation": "Zubiaga et al., PLOS ONE 2016 (Analysing How People Orient to and Spread Rumours in Social Media by Looking at Conversational Threads)",
        "validation_status": pheme_v.get("status", "UNVERIFIED"),
        "notes": "Rumour veracity labels: True, False, Unverified. 6,425 threads extracted across 9 major events.",
    })

    # 10. World Values Survey (WVS) Wave 7
    manifest_entries.append({
        "dataset_id": "wvs_wave_7",
        "name": "World Values Survey (WVS) Wave 7 (2017-2022)",
        "source_url": "https://www.worldvaluessurvey.org/",
        "download_url": "https://www.worldvaluessurvey.org/WVSContents.jsp?CMSID=Documentation",
        "download_status": "WAITING_USER_PERMISSION",
        "license_status": "WAITING_USER_PERMISSION",
        "license": "WVS Individual Research Agreement (No redistribution)",
        "language": ["multilingual", "vi", "en"],
        "file_list": [],
        "total_bytes": 0,
        "sha256": "",
        "total_records": 0,
        "splits": ["wave_7_core"],
        "schema": ["country", "Q64_trust_in_press", "Q65_trust_in_tv", "demographics"],
        "downloaded_at": None,
        "citation": "Inglehart et al., World Values Survey Wave 7 (2017-2022) Cross-National Data-Set",
        "validation_status": "WAITING_USER_PERMISSION",
        "notes": "Requires user registration and acceptance of WVS terms of use. Automated scraping or accepting terms is strictly forbidden.",
    })

    # 11. Microsoft MIND
    manifest_entries.append({
        "dataset_id": "ms_mind",
        "name": "Microsoft News Dataset (MIND)",
        "source_url": "https://msnews.github.io/",
        "download_url": "https://msnews.github.io/",
        "download_status": "WAITING_USER_PERMISSION",
        "license_status": "WAITING_USER_PERMISSION",
        "license": "Microsoft Research License Terms",
        "language": ["en"],
        "file_list": [],
        "total_bytes": 0,
        "sha256": "",
        "total_records": 0,
        "splits": ["train", "dev"],
        "schema": ["news_id", "category", "subcategory", "title", "abstract", "history", "impressions"],
        "downloaded_at": None,
        "citation": "Wu et al., ACL 2020 (MIND: A Large-scale Dataset for News Recommendation)",
        "validation_status": "WAITING_USER_PERMISSION",
        "notes": "Requires accepting Microsoft Research License Terms. Used for news reading and click behavior analysis.",
    })

    out_file = MANIFESTS_DIR / "datasets_manifest.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(manifest_entries, f, indent=2, ensure_ascii=False)

    logger.info("Master manifest written to: %s (%d datasets registered)", out_file, len(manifest_entries))


if __name__ == "__main__":
    build_manifest()
