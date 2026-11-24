"""Autonomous AI Multi-Model Training, Benchmarking, Bootstrap Validation, and Error Analysis Engine.

Covers:
- Task 1: 9-Class Claim Classification (Candidates: Majority, TF-IDF+LogReg, TF-IDF+LinearSVC, Calibrated Ensemble)
- Task 2: 3-Class NLI Verification (Candidates: Majority, Cross-TF-IDF+LogReg, Cross-TF-IDF+LinearSVC, Calibrated Multi-Feature NLI)
- 1000-sample Bootstrap Confidence Intervals (95% CI)
- Systematic Failure Mode Analysis
- Experiment Registry Generation
"""

import json
import logging
import os
import sys
import time
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, classification_report, confusion_matrix

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from ml.dataset_loaders.claim_loader import get_train_val_test_splits, CLAIM_CLASSES
from ml.models.claim_classifier import TrustMediaClaimPipeline, LinguisticFeatureExtractor
from ml.models.nli_verifier import TrustMediaNLIPipeline, NLI_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AutonomousTrainingEngine")


# -----------------------------------------------------------------------------
# Bootstrap Confidence Interval Helper (1,000 resamples)
# -----------------------------------------------------------------------------
def compute_bootstrap_ci(y_true, y_pred, n_bootstraps=1000, alpha=0.05, seed=42):
    rng = np.random.RandomState(seed)
    n = len(y_true)
    f1_scores = []
    acc_scores = []
    
    for _ in range(n_bootstraps):
        indices = rng.choice(n, size=n, replace=True)
        bs_true = y_true[indices]
        bs_pred = y_pred[indices]
        acc_scores.append(accuracy_score(bs_true, bs_pred))
        f1_scores.append(f1_score(bs_true, bs_pred, average="macro", zero_division=0))
        
    lower_f1 = np.percentile(f1_scores, 100 * (alpha / 2))
    upper_f1 = np.percentile(f1_scores, 100 * (1 - alpha / 2))
    lower_acc = np.percentile(acc_scores, 100 * (alpha / 2))
    upper_acc = np.percentile(acc_scores, 100 * (1 - alpha / 2))
    
    return {
        "macro_f1_mean": round(float(np.mean(f1_scores)), 4),
        "macro_f1_std": round(float(np.std(f1_scores)), 4),
        "macro_f1_ci95": [round(float(lower_f1), 4), round(float(upper_f1), 4)],
        "accuracy_mean": round(float(np.mean(acc_scores)), 4),
        "accuracy_std": round(float(np.std(acc_scores)), 4),
        "accuracy_ci95": [round(float(lower_acc), 4), round(float(upper_acc), 4)],
    }


# -----------------------------------------------------------------------------
# Baseline Majority Predictor
# -----------------------------------------------------------------------------
class MajorityClassBaseline(BaseEstimator, ClassifierMixin):
    def __init__(self):
        self.majority_class_ = 0
        
    def fit(self, X, y):
        vals, counts = np.unique(y, return_counts=True)
        self.majority_class_ = vals[np.argmax(counts)]
        return self
        
    def predict(self, X):
        return np.full(len(X), self.majority_class_)
        
    def predict_proba(self, X):
        probs = np.zeros((len(X), 9))
        probs[:, self.majority_class_] = 1.0
        return probs


# -----------------------------------------------------------------------------
# Run Autonomous Experiments
# -----------------------------------------------------------------------------
def run_autonomous_experiments():
    os.makedirs(os.path.join(ROOT_DIR, "ml", "experiments"), exist_ok=True)
    experiments_registry = []
    
    # =========================================================================
    # PART 1: TASK-01 (9-Class Claim Classification)
    # =========================================================================
    logger.info("=== STARTING TASK-01: 9-CLASS CLAIM CLASSIFICATION CANDIDATES ===")
    train_df, val_df, test_df = get_train_val_test_splits(target_per_class=400)
    X_train, y_train = train_df["text"].tolist(), train_df["label"].to_numpy()
    X_val, y_val = val_df["text"].tolist(), val_df["label"].to_numpy()
    X_test, y_test = test_df["text"].tolist(), test_df["label"].to_numpy()
    
    claim_candidates = [
        ("TM-CLAIM-001", "Majority Class Baseline", "Zero-Rule Majority Predictor", MajorityClassBaseline(), {}),
        (
            "TM-CLAIM-002",
            "Lexical TF-IDF + LogisticRegression",
            "Word TF-IDF (1,2) + LogisticRegression(C=1.0, max_iter=500)",
            None,
            {"model_type": "tfidf_logreg", "C": 1.0}
        ),
        (
            "TM-CLAIM-003",
            "Word+Char TF-IDF + LinearSVC",
            "Dual TF-IDF (Word 1,2 + Char 2,5) + LinearSVC(C=1.0)",
            None,
            {"model_type": "tfidf_linearsvc", "C": 1.0}
        ),
        (
            "TM-CLAIM-004",
            "TrustMedia Calibrated LinearSVC (Production Winner)",
            "Dual TF-IDF + 12D Linguistic Signals + CalibratedLinearSVC(C=1.5, cv=3)",
            TrustMediaClaimPipeline(c_param=1.5),
            {"c_param": 1.5, "calibrated": True}
        ),
    ]
    
    for exp_id, model_name, desc, model_obj, cfg in claim_candidates:
        logger.info(f"Training and Evaluating {exp_id}: {model_name}...")
        t_start = time.time()
        
        if cfg.get("model_type") == "tfidf_logreg":
            vec = TfidfVectorizer(ngram_range=(1, 2), max_features=15000)
            X_tr_v = vec.fit_transform(X_train)
            X_te_v = vec.transform(X_test)
            clf = LogisticRegression(C=cfg["C"], max_iter=500, random_state=42)
            clf.fit(X_tr_v, y_train)
            y_pred = clf.predict(X_te_v)
        elif cfg.get("model_type") == "tfidf_linearsvc":
            from sklearn.pipeline import FeatureUnion
            word_v = TfidfVectorizer(ngram_range=(1, 2), max_features=12000)
            char_v = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=15000)
            union = FeatureUnion([("word", word_v), ("char", char_v)])
            X_tr_v = union.fit_transform(X_train)
            X_te_v = union.transform(X_test)
            clf = LinearSVC(C=cfg["C"], random_state=42)
            clf.fit(X_tr_v, y_train)
            y_pred = clf.predict(X_te_v)
        else:
            model_obj.fit(X_train, y_train)
            y_pred = model_obj.predict(X_test)
            
        dur = round(time.time() - t_start, 2)
        
        acc = round(float(accuracy_score(y_test, y_pred)), 4)
        macro_f1 = round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4)
        weighted_f1 = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        prec = round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4)
        rec = round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4)
        
        ci = compute_bootstrap_ci(y_test, y_pred)
        
        entry = {
            "experiment_id": exp_id,
            "task": "Claim Classification (9-Class)",
            "model_name": model_name,
            "description": desc,
            "duration_seconds": dur,
            "accuracy": acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "precision": prec,
            "recall": rec,
            "bootstrap_ci95": ci,
            "status": "COMPLETED",
        }
        experiments_registry.append(entry)
        logger.info(f" -> {exp_id} Finished: Acc={acc*100:.2f}%, Macro-F1={macro_f1:.4f}, CI95={ci['macro_f1_ci95']}")
        
    # =========================================================================
    # PART 2: TASK-02 (3-Class NLI Evidence Verification)
    # =========================================================================
    logger.info("\n=== STARTING TASK-02: 3-CLASS NLI EVIDENCE VERIFICATION CANDIDATES ===")
    from scripts.train_nli_verifier import load_vifactcheck_split
    train_pairs, y_train_nli = load_vifactcheck_split("train-00000-of-00001.parquet")
    dev_pairs, y_dev_nli = load_vifactcheck_split("dev-00000-of-00001.parquet")
    test_pairs, y_test_nli = load_vifactcheck_split("test-00000-of-00001.parquet")
    
    nli_candidates = [
        ("TM-NLI-001", "Majority Class Baseline", "Zero-Rule Predictor (Always ENTAILMENT)", MajorityClassBaseline(), {}),
        (
            "TM-NLI-002",
            "Cross-Text TF-IDF + LogisticRegression",
            "Joint Text TF-IDF + LogisticRegression(C=1.0)",
            None,
            {"model_type": "cross_logreg", "C": 1.0}
        ),
        (
            "TM-NLI-003",
            "Cross-Text TF-IDF + LinearSVC",
            "Joint Text TF-IDF + LinearSVC(C=1.0)",
            None,
            {"model_type": "cross_svc", "C": 1.0}
        ),
        (
            "TM-NLI-004",
            "TrustMedia Calibrated NLI Verifier (Production Winner)",
            "Cross-TF-IDF + Dense Cosine + Negation/Numerical/Temporal Penalties + CalibratedLinearSVC(C=1.8)",
            TrustMediaNLIPipeline(c_param=1.8),
            {"c_param": 1.8, "calibrated": True}
        ),
    ]
    
    for exp_id, model_name, desc, model_obj, cfg in nli_candidates:
        logger.info(f"Training and Evaluating {exp_id}: {model_name}...")
        t_start = time.time()
        
        if cfg.get("model_type") in ("cross_logreg", "cross_svc"):
            joint_train = [f"Câu khẳng định: {p[0]} Bằng chứng: {p[1]}" for p in train_pairs]
            joint_test = [f"Câu khẳng định: {p[0]} Bằng chứng: {p[1]}" for p in test_pairs]
            vec = TfidfVectorizer(ngram_range=(1, 2), max_features=25000)
            X_tr_v = vec.fit_transform(joint_train)
            X_te_v = vec.transform(joint_test)
            
            if cfg["model_type"] == "cross_logreg":
                clf = LogisticRegression(C=cfg["C"], max_iter=300, random_state=42)
            else:
                clf = LinearSVC(C=cfg["C"], random_state=42)
            clf.fit(X_tr_v, y_train_nli)
            y_pred = clf.predict(X_te_v)
        else:
            model_obj.fit(train_pairs, y_train_nli)
            y_pred = model_obj.predict(test_pairs)
            
        dur = round(time.time() - t_start, 2)
        acc = round(float(accuracy_score(y_test_nli, y_pred)), 4)
        macro_f1 = round(float(f1_score(y_test_nli, y_pred, average="macro", zero_division=0)), 4)
        weighted_f1 = round(float(f1_score(y_test_nli, y_pred, average="weighted", zero_division=0)), 4)
        prec = round(float(precision_score(y_test_nli, y_pred, average="macro", zero_division=0)), 4)
        rec = round(float(recall_score(y_test_nli, y_pred, average="macro", zero_division=0)), 4)
        
        ci = compute_bootstrap_ci(y_test_nli, y_pred)
        
        entry = {
            "experiment_id": exp_id,
            "task": "NLI Evidence Verification (3-Class)",
            "model_name": model_name,
            "description": desc,
            "duration_seconds": dur,
            "accuracy": acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "precision": prec,
            "recall": rec,
            "bootstrap_ci95": ci,
            "status": "COMPLETED",
        }
        experiments_registry.append(entry)
        logger.info(f" -> {exp_id} Finished: Acc={acc*100:.2f}%, Macro-F1={macro_f1:.4f}, CI95={ci['macro_f1_ci95']}")

    # Save complete experiments registry
    registry_file = os.path.join(ROOT_DIR, "ml", "experiments", "experiments_registry.json")
    with open(registry_file, "w", encoding="utf-8") as f:
        json.dump(experiments_registry, f, indent=2, ensure_ascii=False)
    logger.info(f"\nSaved {len(experiments_registry)} experiments to {registry_file}")
    
    # =========================================================================
    # PART 3: DETAILED ERROR ANALYSIS ON PRODUCTION WINNERS
    # =========================================================================
    logger.info("\n=== RUNNING SYSTEMATIC ERROR ANALYSIS ON TEST SET ERRORS ===")
    
    # Error analysis for Claim Classifier Winner (TM-CLAIM-004)
    winner_claim_pipe = TrustMediaClaimPipeline(c_param=1.5)
    winner_claim_pipe.fit(X_train, y_train)
    y_claim_pred = winner_claim_pipe.predict(X_test)
    
    claim_errors = []
    for idx, (true_lbl, pred_lbl, text) in enumerate(zip(y_test, y_claim_pred, X_test)):
        if true_lbl != pred_lbl:
            # Diagnose failure mode
            failure_mode = "Semantic Ambiguity"
            t_low = text.lower()
            if any(c.isdigit() for c in text):
                failure_mode = "Numerical/Statistical Ambiguity"
            elif any(w in t_low for w in ["không", "chưa", "chẳng", "đâu có"]):
                failure_mode = "Negation Complexity"
            elif any(w in t_low for w in ["theo tôi", "tôi nghĩ", "có lẽ", "quan điểm"]):
                failure_mode = "Subjective Boundary"
                
            claim_errors.append({
                "index": idx,
                "text": text,
                "true_label": CLAIM_CLASSES[true_lbl],
                "pred_label": CLAIM_CLASSES[pred_lbl],
                "failure_mode": failure_mode,
            })
            
    logger.info(f"Total Claim Classifier Test Errors: {len(claim_errors)} / {len(X_test)} ({len(claim_errors)/len(X_test)*100:.2f}%)")
    
    # Error analysis for NLI Verifier Winner (TM-NLI-004)
    winner_nli_pipe = TrustMediaNLIPipeline(c_param=1.8)
    winner_nli_pipe.fit(train_pairs, y_train_nli)
    y_nli_pred = winner_nli_pipe.predict(test_pairs)
    
    nli_errors = []
    for idx, (true_lbl, pred_lbl, (stmt, evi)) in enumerate(zip(y_test_nli, y_nli_pred, test_pairs)):
        if true_lbl != pred_lbl:
            failure_mode = "Semantic Lexical Gap"
            s_nums = set([w for w in stmt.split() if any(c.isdigit() for c in w)])
            e_nums = set([w for w in evi.split() if any(c.isdigit() for c in w)])
            if s_nums and e_nums and not s_nums.intersection(e_nums):
                failure_mode = "Numerical Inconsistency Miss"
            elif any(neg in stmt.lower() for neg in ["không", "chưa", "bác bỏ", "sai"]):
                failure_mode = "Negation Inversion"
            elif true_lbl == 2:  # NEUTRAL
                failure_mode = "Spurious Over-Retrieval Correlation"
                
            nli_errors.append({
                "index": idx,
                "statement": stmt,
                "evidence": evi[:200] + ("..." if len(evi) > 200 else ""),
                "true_label": NLI_CLASSES[true_lbl],
                "pred_label": NLI_CLASSES[pred_lbl],
                "failure_mode": failure_mode,
            })
            
    logger.info(f"Total NLI Verifier Test Errors: {len(nli_errors)} / {len(test_pairs)} ({len(nli_errors)/len(test_pairs)*100:.2f}%)")
    
    # Save Error Analysis Artifact
    error_artifact = {
        "claim_classifier_errors": {
            "total_errors": len(claim_errors),
            "error_rate": round(len(claim_errors) / len(X_test), 4),
            "failure_mode_breakdown": pd.Series([e["failure_mode"] for e in claim_errors]).value_counts().to_dict(),
            "samples": claim_errors[:20],
        },
        "nli_verifier_errors": {
            "total_errors": len(nli_errors),
            "error_rate": round(len(nli_errors) / len(test_pairs), 4),
            "failure_mode_breakdown": pd.Series([e["failure_mode"] for e in nli_errors]).value_counts().to_dict(),
            "samples": nli_errors[:25],
        }
    }
    error_file = os.path.join(ROOT_DIR, "ml", "experiments", "error_analysis.json")
    with open(error_file, "w", encoding="utf-8") as f:
        json.dump(error_artifact, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved Error Analysis breakdown to {error_file}")
    
    return experiments_registry, error_artifact

if __name__ == "__main__":
    run_autonomous_experiments()
