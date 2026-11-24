import os
import sys
import json
import glob
from pathlib import Path
import pandas as pd
import numpy as np

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

analysis_results = {}

print("=== 1. AUDITING VIFACTCHECK DATASET ===")
vfc_dir = Path("datasets/raw/vifactcheck/data")
vfc_stats = {}
if vfc_dir.exists():
    for f in sorted(vfc_dir.glob("*.parquet")):
        df = pd.read_parquet(f)
        split_name = f.stem.split("-")[0]
        label_dist = df["labels"].value_counts(dropna=False).to_dict()
        label_map = {0: "SUPPORTED (Entailment)", 1: "REFUTED (Contradiction)", 2: "NEI (Neutral)"}
        mapped_dist = {label_map.get(k, str(k)): int(v) for k, v in label_dist.items()}
        
        # Check text lengths
        stmt_lens = df["Statement"].astype(str).str.len()
        evi_lens = df["Evidence"].dropna().astype(str).str.len()
        
        vfc_stats[split_name] = {
            "samples": len(df),
            "columns": list(df.columns),
            "label_distribution": mapped_dist,
            "null_evidence_ratio": float(df["Evidence"].isna().mean()),
            "avg_statement_chars": float(stmt_lens.mean()),
            "avg_evidence_chars": float(evi_lens.mean()) if len(evi_lens) > 0 else 0.0,
            "duplicate_statements": int(df.duplicated(subset=["Statement"]).sum()),
        }
        print(f"Split {split_name}: {len(df)} samples, labels: {mapped_dist}")
analysis_results["vifactcheck"] = vfc_stats

print("\n=== 2. AUDITING FEVER DATASET ===")
fever_dir = Path("datasets/raw/fever")
fever_stats = {}
if fever_dir.exists():
    for f in sorted(fever_dir.glob("*.jsonl")):
        count = 0
        labels = {}
        with open(f, "r", encoding="utf-8") as jf:
            for line in jf:
                if not line.strip(): continue
                count += 1
                try:
                    d = json.loads(line)
                    lbl = d.get("label", "UNKNOWN")
                    labels[lbl] = labels.get(lbl, 0) + 1
                except Exception:
                    pass
        fever_stats[f.name] = {
            "samples": count,
            "labels": labels,
            "size_mb": round(f.stat().st_size / (1024*1024), 2)
        }
        print(f"{f.name}: {count} samples, labels: {labels}")
analysis_results["fever"] = fever_stats

print("\n=== 3. AUDITING X-FACT DATASET ===")
xfact_dir = Path("datasets/raw/xfact")
xfact_stats = {}
if xfact_dir.exists():
    csv_files = list(xfact_dir.rglob("*.csv"))
    total_csv_size = sum(f.stat().st_size for f in csv_files) / (1024*1024)
    main_train = xfact_dir / "all_languages" / "train-00000-of-00001.csv"
    if main_train.exists():
        df_x = pd.read_csv(main_train, nrows=10000)
        sample_cols = list(df_x.columns)
        sample_labels = df_x["label"].value_counts().to_dict() if "label" in df_x.columns else {}
    else:
        sample_cols, sample_labels = [], {}
    xfact_stats = {
        "total_csv_files": len(csv_files),
        "total_size_mb": round(total_csv_size, 2),
        "main_train_columns": sample_cols,
        "sample_label_distribution": sample_labels
    }
    print(f"X-FACT: {len(csv_files)} csv files, main train columns: {sample_cols[:6]}")
analysis_results["xfact"] = xfact_stats

print("\n=== 4. AUDITING UIT-VSFC & UIT-VSMEC (OPINIONS & EMOTIONS) ===")
uit_stats = {}
for ds_name, p in [("uit_vsfc", Path("datasets/raw/uit_vsfc")), ("uit_vsmec", Path("datasets/raw/uit_vsmec"))]:
    if p.exists():
        files = list(p.glob("*.csv"))
        ds_info = {}
        for f in files:
            try:
                df = pd.read_csv(f)
                ds_info[f.name] = {
                    "samples": len(df),
                    "columns": list(df.columns),
                    "labels": df.iloc[:, -1].value_counts().to_dict() if len(df.columns) > 1 else {}
                }
            except Exception as e:
                ds_info[f.name] = f"Error: {e}"
        uit_stats[ds_name] = ds_info
        print(f"{ds_name}: {list(ds_info.keys())}")
analysis_results["uit"] = uit_stats

print("\n=== 5. AUDITING WVS (WORLD VALUES SURVEY) ===")
wvs_dir = Path("datasets/raw/wvs")
wvs_stats = {}
if wvs_dir.exists():
    for f in wvs_dir.glob("*.parquet"):
        df = pd.read_parquet(f)
        wvs_stats[f.name] = {
            "samples": len(df),
            "columns_count": len(df.columns),
            "size_mb": round(f.stat().st_size / (1024*1024), 2)
        }
        print(f"{f.name}: {len(df)} samples, {len(df.columns)} columns")
analysis_results["wvs"] = wvs_stats

# Save audit results
out_json = Path("docs/dataset_audit_metrics.json")
out_json.parent.mkdir(exist_ok=True)
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(analysis_results, f, ensure_ascii=False, indent=2)

print("\n>>> DATASET AUDIT METRICS SAVED TO docs/dataset_audit_metrics.json <<<")

