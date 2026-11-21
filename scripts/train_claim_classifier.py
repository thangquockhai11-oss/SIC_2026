"""Training and Evaluation Script for 9-Class Claim Classifier.

Outputs:
- Accuracy, Macro-F1, Weighted-F1, Precision, Recall
- Per-class precision, recall, and F1-score
- Confusion matrix
- Model checkpoint and metadata registry
"""

import json
import logging
import os
import sys
import time
import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score, precision_score, recall_score

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.dataset_loaders.claim_loader import get_train_val_test_splits, CLAIM_CLASSES
from ml.models.claim_classifier import TrustMediaClaimPipeline, MODEL_DIR, MODEL_PATH, METRICS_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainClaimClassifier")


def train_and_evaluate():
    logger.info("Step 1: Curating & loading datasets for 9-class Claim Classification...")
    t0 = time.time()
    train_df, val_df, test_df = get_train_val_test_splits(target_per_class=400)
    logger.info(
        "Dataset splits loaded in %.2fs: Train=%d, Val=%d, Test=%d (Total=%d)",
        time.time() - t0,
        len(train_df),
        len(val_df),
        len(test_df),
        len(train_df) + len(val_df) + len(test_df),
    )

    # Class balance check
    logger.info("Class distribution in Train set:\n%s", train_df["label_name"].value_counts().to_string())

    X_train, y_train = train_df["text"].tolist(), train_df["label"].to_numpy()
    X_val, y_val = val_df["text"].tolist(), val_df["label"].to_numpy()
    X_test, y_test = test_df["text"].tolist(), test_df["label"].to_numpy()

    # Step 2: Initialize & Train Pipeline
    logger.info("Step 2: Training TrustMediaClaimPipeline (TF-IDF + Linguistic + Calibrated LinearSVC)...")
    t_train_start = time.time()
    pipeline = TrustMediaClaimPipeline(c_param=1.5)
    pipeline.fit(X_train, y_train)
    train_duration = time.time() - t_train_start
    logger.info("Training completed in %.2f seconds.", train_duration)

    # Step 3: Validation Evaluation
    y_val_pred = pipeline.predict(X_val)
    val_macro_f1 = f1_score(y_val, y_val_pred, average="macro")
    val_acc = accuracy_score(y_val, y_val_pred)
    logger.info("Validation Performance: Accuracy=%.4f, Macro-F1=%.4f", val_acc, val_macro_f1)

    # Step 4: Final Test Evaluation
    logger.info("Step 4: Evaluating on unseen Test Set (%d samples)...", len(X_test))
    y_test_pred = pipeline.predict(X_test)
    y_test_probs = pipeline.predict_proba(X_test)

    test_acc = accuracy_score(y_test, y_test_pred)
    test_macro_f1 = f1_score(y_test, y_test_pred, average="macro")
    test_weighted_f1 = f1_score(y_test, y_test_pred, average="weighted")
    test_precision = precision_score(y_test, y_test_pred, average="macro")
    test_recall = recall_score(y_test, y_test_pred, average="macro")

    logger.info("=== FINAL TEST RESULTS ===")
    logger.info("Accuracy:    %.4f (%.2f%%)", test_acc, test_acc * 100)
    logger.info("Macro-F1:    %.4f", test_macro_f1)
    logger.info("Weighted-F1: %.4f", test_weighted_f1)
    logger.info("Precision:   %.4f", test_precision)
    logger.info("Recall:      %.4f", test_recall)

    report_dict = classification_report(
        y_test,
        y_test_pred,
        target_names=CLAIM_CLASSES,
        output_dict=True,
    )
    conf_mat = confusion_matrix(y_test, y_test_pred).tolist()

    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_test_pred, target_names=CLAIM_CLASSES))

    # Step 5: Save Model Checkpoint & Metadata
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info("Saved model artifact to %s", MODEL_PATH)

    metrics_payload = {
        "model_name": "TrustMedia-ClaimClassifier-9Class",
        "model_version": "1.0.0-calibrated",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "architecture": "Word+Char TF-IDF + 12 Linguistic Signals + CalibratedLinearSVC(cv=3)",
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "training_time_seconds": round(train_duration, 2),
        "test_accuracy": round(float(test_acc), 4),
        "test_macro_f1": round(float(test_macro_f1), 4),
        "test_weighted_f1": round(float(test_weighted_f1), 4),
        "test_precision": round(float(test_precision), 4),
        "test_recall": round(float(test_recall), 4),
        "classes": CLAIM_CLASSES,
        "per_class_metrics": {
            cls_name: {
                "precision": round(float(report_dict[cls_name]["precision"]), 4),
                "recall": round(float(report_dict[cls_name]["recall"]), 4),
                "f1-score": round(float(report_dict[cls_name]["f1-score"]), 4),
                "support": int(report_dict[cls_name]["support"]),
            }
            for cls_name in CLAIM_CLASSES
        },
        "confusion_matrix": conf_mat,
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2, ensure_ascii=False)
    logger.info("Saved metrics & registry metadata to %s", METRICS_PATH)

    # Verification on sample inputs
    logger.info("Step 6: Verifying inference on test claims:")
    sample_claims = [
        "Vào tháng 4/1936, Vua hề Charlie Chaplin đã lưu trú tại khách sạn Morin ở Huế.",
        "GDP của Việt Nam đạt mức tăng trưởng 7,02% với kim ngạch xuất khẩu 355 tỷ USD.",
        "Tôi nghĩ rằng bài viết này rất bổ ích cho độc giả trẻ hiện nay.",
        "Dự kiến lượng khách quốc tế đến Việt Nam sẽ tăng thêm 25% vào năm 2028.",
        "Thủ tướng khẳng định kiên quyết không lùi bước trước khó khăn.",
        "Liệu robot có thể thay thế hoàn toàn tình cảm con người trong cuộc sống?",
    ]
    for sc in sample_claims:
        pred_idx = pipeline.predict([sc])[0]
        prob = np.max(pipeline.predict_proba([sc])[0])
        print(f" -> Claim: '{sc[:60]}...' => [{CLAIM_CLASSES[pred_idx]}] (Confidence: {prob*100:.1f}%)")


if __name__ == "__main__":
    train_and_evaluate()

