import os
import sys
import json
from pathlib import Path
from collections import defaultdict
import pandas as pd

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

def summarize_dir(base_path):
    print(f"\n========================================================")
    print(f"DIRECTORY: {base_path}")
    print(f"========================================================")
    p = Path(base_path)
    if not p.exists():
        print("  Does not exist.")
        return
    
    subdirs = defaultdict(lambda: {"count": 0, "size": 0, "exts": set(), "sample_files": []})
    for root, dirs, files in os.walk(base_path):
        rel = os.path.relpath(root, base_path)
        top_group = rel.split(os.sep)[0] if rel != "." else "."
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                ext = os.path.splitext(f)[1].lower()
                subdirs[top_group]["count"] += 1
                subdirs[top_group]["size"] += sz
                subdirs[top_group]["exts"].add(ext)
                if len(subdirs[top_group]["sample_files"]) < 5:
                    subdirs[top_group]["sample_files"].append((os.path.relpath(fp, base_path), sz))
            except Exception:
                pass
    
    for grp, data in sorted(subdirs.items()):
        size_mb = data["size"] / (1024 * 1024)
        exts_str = ", ".join(sorted(data["exts"]))[:50]
        print(f"  {grp:28} | Files: {data['count']:6} | Size: {size_mb:8.2f} MB | Exts: {exts_str}")
        for s_file, sz in data["sample_files"]:
            print(f"    - {s_file} ({sz / (1024*1024):.2f} MB)")

def audit_manifest_and_raw():
    manifest_path = Path("datasets/manifests/datasets_manifest.json")
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        print("\n========================================================")
        print("MANIFEST DATASETS (datasets_manifest.json)")
        print("========================================================")
        if isinstance(manifest, list):
            for item in manifest:
                dataset_id = item.get("id", item.get("name", "unknown"))
                name = item.get("name", dataset_id)
                fmt = item.get("format", "unknown")
                recs = item.get("records", item.get("total_samples", item.get("files", "?")))
                status = item.get("status", "unknown")
                print(f"- {dataset_id:25} | Name: {name:30} | Fmt: {fmt:10} | Samples/Files: {str(recs):8} | Status: {status}")
        elif isinstance(manifest, dict):
            datasets_dict = manifest.get("datasets", manifest)
            for k, v in datasets_dict.items():
                if isinstance(v, dict):
                    name = v.get("name", k)
                    fmt = v.get("format", "unknown")
                    recs = v.get("records", v.get("count", v.get("total_samples", "?")))
                    status = v.get("status", "unknown")
                    print(f"- {k:25} | Name: {name:30} | Fmt: {fmt:10} | Samples: {str(recs):8} | Status: {status}")
                else:
                    print(f"- {k}: {v}")

    print("\n========================================================")
    print("RAW DATASET SUBFOLDERS (datasets/raw)")
    print("========================================================")
    raw_p = Path("datasets/raw")
    if raw_p.exists():
        for sub in sorted(raw_p.iterdir()):
            if sub.is_dir():
                files = [f for f in sub.rglob("*") if f.is_file()]
                file_count = len(files)
                total_size_mb = sum(f.stat().st_size for f in files) / (1024 * 1024)
                exts = sorted(list(set(f.suffix for f in files)))
                print(f"- {sub.name:20}: {file_count:4} files | {total_size_mb:8.2f} MB | Exts: {', '.join(exts)}")
                # Show top 3 largest or notable files
                sorted_files = sorted(files, key=lambda x: x.stat().st_size, reverse=True)
                for sf in sorted_files[:3]:
                    rel_p = sf.relative_to(sub)
                    print(f"    * {rel_p} ({sf.stat().st_size / (1024*1024):.2f} MB)")

summarize_dir("datasets")
summarize_dir("ml")
summarize_dir("scripts")
audit_manifest_and_raw()


