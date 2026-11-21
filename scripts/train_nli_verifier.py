"""Training and Evaluation Script for NLI / Evidence Verification Model.

Trained on official AAAI-25 ViFactCheck Benchmark (5,062 Train, 723 Dev, 1,447 Test).
Labels:
  0: ENTAILMENT (Supported)
  1: CONTRADICTION (Refuted)
  2: NEUTRAL (Not Enough Information)
"""

import json
import logging
import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score, precision_score, recall_score

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.models.nli_verifier import TrustMediaNLIPipeline, NLI_CLASSES, MODEL_DIR, MODEL_PATH, METRICS_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainNLIVerifier")


def load_vifactcheck_split(filename: str) -> tuple[list[tuple[str, str]], np.ndarray]:
    """Load (Statement, Evidence/Context) pairs and labels from ViFactCheck parquet."""
    path = os.path.join("datasets", "raw", "vifactcheck", "data", filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"ViFactCheck parquet not found at {path}")

    df = pd.read_parquet(path)
    logger.info("Loaded %s: shape=%s", filename, df.shape)

    pairs: list[tuple[str, str]] = []
    labels: list[int] = []

    for _, row in df.iterrows():
        stmt = str(row.get("Statement", "")).strip()
        evi = str(row.get("Evidence", "")).strip()
        ctx = str(row.get("Context", "")).strip()
        lbl = row.get("labels")

        if pd.isna(lbl):
            continue

        label_id = int(lbl)
        if label_id not in (0, 1, 2):
            continue

        # If evidence is absent or too short, use excerpt from context
        passage = evi if len(evi) >= 20 else ctx[:400]
        if not stmt or not passage:
            continue

        pairs.append((stmt, passage))
        labels.append(label_id)

    return pairs, np.array(labels, dtype=np.int32)


def main():
    logger.info("=== STEP 1: LOADING VIFACTCHECK DATASET ===")
    t0 = time.time()
    train_pairs, y_train = load_vifactcheck_split("train-00000-of-00001.parquet")
    dev_pairs, y_dev = load_vifactcheck_split("dev-00000-of-00001.parquet")
    test_pairs, y_test = load_vifactcheck_split("test-00000-of-00001.parquet")

    logger.info(
        "Data loading completed in %.2fs: Train=%d, Dev=%d, Test=%d (Total=%d)",
        time.time() - t0,
        len(train_pairs),
        len(dev_pairs),
        len(test_pairs),
        len(train_pairs) + len(dev_pairs) + len(test_pairs),
    )

    logger.info("Train label distribution: %s", {NLI_CLASSES[i]: int(np.sum(y_train == i)) for i in range(3)})
    logger.info("Dev label distribution:   %s", {NLI_CLASSES[i]: int(np.sum(y_dev == i)) for i in range(3)})
    logger.info("Test label distribution:  %s", {NLI_CLASSES[i]: int(np.sum(y_test == i)) for i in range(3)})

    # Step 2: Model Training
    logger.info("=== STEP 2: TRAINING CALIBRATED NLI PIPELINE ===")
    t_train = time.time()
    pipeline = TrustMediaNLIPipeline(c_param=1.8)
    pipeline.fit(train_pairs, y_train)
    train_duration = time.time() - t_train
    logger.info("Pipeline training completed in %.2f seconds.", train_duration)

    # Step 3: Dev Evaluation
    y_dev_pred = pipeline.predict(dev_pairs)
    dev_acc = accuracy_score(y_dev, y_dev_pred)
    dev_macro_f1 = f1_score(y_dev, y_dev_pred, average="macro")
    logger.info("Dev Performance: Accuracy=%.4f (%.2f%%), Macro-F1=%.4f", dev_acc, dev_acc * 100, dev_macro_f1)

    # Step 4: Final Test Evaluation
    logger.info("=== STEP 4: FINAL TEST EVALUATION (%d samples) ===", len(test_pairs))
    y_test_pred = pipeline.predict(test_pairs)
    y_test_probs = pipeline.predict_proba(test_pairs)

    test_acc = accuracy_score(y_test, y_test_pred)
    test_macro_f1 = f1_score(y_test, y_test_pred, average="macro")
    test_weighted_f1 = f1_score(y_test, y_test_pred, average="weighted")
    test_precision = precision_score(y_test, y_test_pred, average="macro")
    test_recall = recall_score(y_test, y_test_pred, average="macro")

    logger.info("=== TEST BENCHMARK RESULTS ===")
    logger.info("Accuracy:    %.4f (%.2f%%)", test_acc, test_acc * 100)
    logger.info("Macro-F1:    %.4f", test_macro_f1)
    logger.info("Weighted-F1: %.4f", test_weighted_f1)
    logger.info("Precision:   %.4f", test_precision)
    logger.info("Recall:      %.4f", test_recall)

    report_dict = classification_report(y_test, y_test_pred, target_names=NLI_CLASSES, output_dict=True)
    conf_mat = confusion_matrix(y_test, y_test_pred).tolist()

    print("\nDetailed Test Classification Report:")
    print(classification_report(y_test, y_test_pred, target_names=NLI_CLASSES))

    # Step 5: Save Model & Metadata
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info("Saved model artifact to %s", MODEL_PATH)

    metrics_payload = {
        "model_name": "TrustMedia-NLI-CalibratedVerifier",
        "model_version": "1.0.0-calibrated",
        "benchmark_dataset": "ViFactCheck (AAAI-25)",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "architecture": "Cross-Text TF-IDF + BGE-M3 Dense Cosine + Negation/Numerical/Temporal Features + CalibratedLinearSVC",
        "train_samples": len(train_pairs),
        "dev_samples": len(dev_pairs),
        "test_samples": len(test_pairs),
        "training_time_seconds": round(train_duration, 2),
        "dev_accuracy": round(float(dev_acc), 4),
        "dev_macro_f1": round(float(dev_macro_f1), 4),
        "test_accuracy": round(float(test_acc), 4),
        "test_macro_f1": round(float(test_macro_f1), 4),
        "test_weighted_f1": round(float(test_weighted_f1), 4),
        "test_precision": round(float(test_precision), 4),
        "test_recall": round(float(test_recall), 4),
        "classes": NLI_CLASSES,
        "per_class_metrics": {
            cls_name: {
                "precision": round(float(report_dict[cls_name]["precision"]), 4),
                "recall": round(float(report_dict[cls_name]["recall"]), 4),
                "f1-score": round(float(report_dict[cls_name]["f1-score"]), 4),
                "support": int(report_dict[cls_name]["support"]),
            }
            for cls_name in NLI_CLASSES
        },
        "confusion_matrix": conf_mat,
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2, ensure_ascii=False)
    logger.info("Saved NLI metrics to %s", METRICS_PATH)

    # Step 6: Qualitative Verification
    logger.info("=== STEP 6: VERIFICATION ON FACT-CHECK CASES ===")
    test_cases = [
        (
            "Vào tháng 4.1936, Vua hề Charlie Chaplin và vợ từng nghỉ trăng mật tại khách sạn Saigon Morin.",
            "Trong số đó, có vua hề Charlie Chaplin (vua hề Sác lô) và vợ từng trải qua kỳ nghỉ trăng mật vào tháng 4.1936 tại phòng Charlie Chaplin Suite khách sạn Saigon Morin.",
            "ENTAILMENT",
        ),
        (
            "GDP của Việt Nam năm 2025 tăng trưởng 12,5%.",
            "Báo cáo của Tổng cục Thống kê khẳng định tốc độ tăng trưởng GDP Việt Nam năm 2025 chỉ đạt 7,02%, không có số liệu nào ghi nhận mức 12,5%.",
            "CONTRADICTION",
        ),
        (
            "Chính phủ ban hành chính sách mới về trợ cấp nông nghiệp.",
            "Giá xăng dầu hôm nay tiếp tục xu hướng biến động trên thị trường thế giới và không có thông tin về nông nghiệp.",
            "NEUTRAL",
        ),
    ]

    for c, e, expected in test_cases:
        pred_idx = pipeline.predict([(c, e)])[0]
        probs = pipeline.predict_proba([(c, e)])[0]
        predicted_label = NLI_CLASSES[pred_idx]
        conf = probs[pred_idx] * 100
        print(f"\n[Test Case] Expected: {expected}")
        print(f" Claim:    '{c}'")
        print(f" Evidence: '{e}'")
        print(f" => Predicted: [{predicted_label}] (Confidence: {conf:.1f}%)")


if __name__ == "__main__":
    main()
