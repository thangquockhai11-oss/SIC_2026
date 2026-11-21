"""Production Natural Language Inference (NLI) Verification Engine.

Classifies (Claim, Evidence) pairs into:
- 0: ENTAILMENT (SUPPORTED)
- 1: CONTRADICTION (REFUTED)
- 2: NEUTRAL (NOT_ENOUGH_INFORMATION)

Implements multi-faceted consistency checks:
- Lexical & Semantic overlap (BGE-M3 aligned dense projector)
- Negation polarity dissonance
- Numerical parity audit
- Temporal anchor consistency
- Calibrated probabilistic confidence scoring
"""

import json
import logging
import os
import re
from typing import Any
import joblib
import numpy as np
from scipy.sparse import hstack
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC

from app.services.rag.embeddings import BGEM3EmbeddingEngine

logger = logging.getLogger(__name__)

NLI_CLASSES = ["ENTAILMENT", "CONTRADICTION", "NEUTRAL"]
CLASS_TO_IDX = {"ENTAILMENT": 0, "CONTRADICTION": 1, "NEUTRAL": 2}
IDX_TO_CLASS = {0: "ENTAILMENT", 1: "CONTRADICTION", 2: "NEUTRAL"}

MODEL_DIR = os.path.join("ml", "checkpoints", "nli_verifier")
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")


class NLIFeatureExtractor(BaseEstimator):
    """Extracts fine-grained lexical, numerical, temporal, negation and dense semantic features."""

    def __init__(self):
        self.embedding_engine = BGEM3EmbeddingEngine()
        self.negation_words = {
            "không", "chưa", "chẳng", "bác bỏ", "phủ nhận", "sai", "sai sự thật",
            "không phải", "đâu có", "trái ngược", "vô căn cứ", "bịa đặt", "không có",
            "not", "never", "no", "denies", "refutes", "false", "untrue", "neither"
        }

    def fit(self, X, y=None):
        return self

    def _extract_numbers(self, text: str) -> list[float]:
        # Extract numerical digits (percentages, quantities, amounts)
        raw_matches = re.findall(r"(\d+(?:[.,]\d+)?)", text)
        vals = []
        for m in raw_matches:
            try:
                vals.append(float(m.replace(",", ".")))
            except ValueError:
                pass
        return vals

    def _extract_years(self, text: str) -> list[int]:
        raw_matches = re.findall(r"\b(18\d{2}|19\d{2}|20\d{2})\b", text)
        return [int(m) for m in raw_matches]

    def transform(self, pairs: list[tuple[str, str]]) -> np.ndarray:
        feature_matrix = []

        for claim, evidence in pairs:
            c_text = str(claim).strip()
            e_text = str(evidence).strip()

            c_words = set(re.findall(r"\w+", c_text.lower()))
            e_words = set(re.findall(r"\w+", e_text.lower()))

            # 1. Lexical overlaps
            intersection = c_words.intersection(e_words)
            c_coverage = len(intersection) / max(len(c_words), 1)
            e_coverage = len(intersection) / max(len(e_words), 1)
            jaccard = len(intersection) / max(len(c_words.union(e_words)), 1)

            # 2. Negation polarity
            c_neg = any(w in c_words for w in self.negation_words)
            e_neg = any(w in e_words for w in self.negation_words)
            negation_dissonance = 1.0 if (c_neg != e_neg) else 0.0

            # 3. Numerical consistency
            c_nums = self._extract_numbers(c_text)
            e_nums = self._extract_numbers(e_text)
            if c_nums and e_nums:
                # Are any claim numbers found in evidence?
                num_match = 1.0 if any(cn in e_nums for cn in c_nums) else 0.0
                num_conflict = 1.0 if not num_match else 0.0
            elif c_nums and not e_nums:
                num_match = 0.0
                num_conflict = 0.5  # evidence lacks numbers to verify claim numbers
            else:
                num_match = 0.5  # no numbers in claim
                num_conflict = 0.0

            # 4. Temporal consistency
            c_years = self._extract_years(c_text)
            e_years = self._extract_years(e_text)
            if c_years and e_years:
                year_match = 1.0 if any(cy in e_years for cy in c_years) else 0.0
                year_conflict = 1.0 if not year_match else 0.0
            else:
                year_match = 0.5
                year_conflict = 0.0

            # 5. Semantic Cosine via 1024-dim BGE-M3 semantic projector
            c_vec = np.array(self.embedding_engine.embed_text(c_text), dtype=np.float32)
            e_vec = np.array(self.embedding_engine.embed_text(e_text), dtype=np.float32)
            norm_c = np.linalg.norm(c_vec)
            norm_e = np.linalg.norm(e_vec)
            if norm_c > 0 and norm_e > 0:
                semantic_cos = float(np.dot(c_vec, e_vec) / (norm_c * norm_e))
            else:
                semantic_cos = 0.0

            # Vector difference norm
            vec_diff_norm = float(np.linalg.norm(c_vec - e_vec))

            features = [
                c_coverage,
                e_coverage,
                jaccard,
                negation_dissonance,
                num_match,
                num_conflict,
                year_match,
                year_conflict,
                semantic_cos,
                vec_diff_norm,
                min(len(c_text) / 200.0, 2.0),
                min(len(e_text) / 500.0, 2.0),
            ]
            feature_matrix.append(features)

        return np.array(feature_matrix, dtype=np.float32)


class TrustMediaNLIPipeline(BaseEstimator, ClassifierMixin):
    """Calibrated NLI Pipeline combining TF-IDF cross-representation and linguistic consistency."""

    def __init__(self, c_param: float = 1.8):
        self.c_param = c_param
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=16000,
            sublinear_tf=True,
        )
        self.feature_extractor = NLIFeatureExtractor()
        base_svm = LinearSVC(C=self.c_param, class_weight="balanced", random_state=42, max_iter=2500)
        self.classifier = CalibratedClassifierCV(estimator=base_svm, cv=3)

    def _prepare_text_pairs(self, pairs: list[tuple[str, str]]) -> list[str]:
        # Format as cross-text: "Tuyên bố: ... [SEP] Bằng chứng: ..."
        return [f"Tuyên bố: {p[0]} [SEP] Bằng chứng: {p[1]}" for p in pairs]

    def _extract_all(self, pairs: list[tuple[str, str]]):
        texts = self._prepare_text_pairs(pairs)
        X_tfidf = self.vectorizer.transform(texts)
        X_feats = self.feature_extractor.transform(pairs)
        return hstack([X_tfidf, X_feats])

    def fit(self, pairs: list[tuple[str, str]], y: np.ndarray):
        texts = self._prepare_text_pairs(pairs)
        X_tfidf = self.vectorizer.fit_transform(texts)
        X_feats = self.feature_extractor.transform(pairs)
        X_all = hstack([X_tfidf, X_feats])
        self.classifier.fit(X_all, y)
        self.classes_ = self.classifier.classes_
        return self

    def predict(self, pairs: list[tuple[str, str]]) -> np.ndarray:
        X_all = self._extract_all(pairs)
        return self.classifier.predict(X_all)

    def predict_proba(self, pairs: list[tuple[str, str]]) -> np.ndarray:
        X_all = self._extract_all(pairs)
        return self.classifier.predict_proba(X_all)


class NLIVerifierService:
    """Inference service for pairwise Claim-Evidence NLI Verification."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._model = None
            cls._instance._metadata = {}
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        if os.path.exists(MODEL_PATH):
            try:
                self._model = joblib.load(MODEL_PATH)
                logger.info("NLIVerifierService: Loaded checkpoint from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("NLIVerifierService: Failed to load from %s: %s", MODEL_PATH, e)
                self._model = None
        else:
            logger.info("NLIVerifierService: Checkpoint not found at %s. Service ready for training.", MODEL_PATH)

        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception:
                pass

    def is_ready(self) -> bool:
        return self._model is not None

    def verify_pair(self, claim: str, evidence: str) -> dict[str, Any]:
        """Verify relationship between a claim and an evidence snippet."""
        c_clean = claim.strip()
        e_clean = evidence.strip()

        if not c_clean or not e_clean:
            return {
                "label": "NEUTRAL",
                "label_id": 2,
                "confidence": 0.50,
                "probabilities": {"ENTAILMENT": 0.25, "CONTRADICTION": 0.25, "NEUTRAL": 0.50},
                "entailment_score": 0.25,
                "contradiction_score": 0.25,
                "model_name": "TrustMedia-NLI-CalibratedVerifier",
                "model_version": self._metadata.get("model_version", "1.0.0-cpu"),
            }

        if self._model is not None:
            probs = self._model.predict_proba([(c_clean, e_clean)])[0]
            pred_id = int(np.argmax(probs))
            conf = float(probs[pred_id])

            # Epistemic calibration: Require confidence margin over NEUTRAL (index 2)
            # If model is near uniform or margin over NEUTRAL is < 0.05, revert to NEUTRAL
            if pred_id != 2:
                neutral_prob = float(probs[2])
                if conf < 0.45 or (conf - neutral_prob) < 0.05:
                    pred_id = 2
                    conf = neutral_prob

            label_name = NLI_CLASSES[pred_id]
            prob_dict = {NLI_CLASSES[i]: round(float(p), 4) for i, p in enumerate(probs)}
        else:
            # Fallback heuristic
            c_low = c_clean.lower()
            e_low = e_clean.lower()
            overlap = len(set(c_low.split()).intersection(set(e_low.split())))
            if overlap >= 4 and ("không" in e_low and "không" not in c_low):
                label_name = "CONTRADICTION"
                pred_id = 1
                conf = 0.82
            elif overlap >= 4:
                label_name = "ENTAILMENT"
                pred_id = 0
                conf = 0.85
            else:
                label_name = "NEUTRAL"
                pred_id = 2
                conf = 0.65
            prob_dict = {
                "ENTAILMENT": 0.85 if label_name == "ENTAILMENT" else 0.10,
                "CONTRADICTION": 0.82 if label_name == "CONTRADICTION" else 0.10,
                "NEUTRAL": 0.65 if label_name == "NEUTRAL" else 0.05,
            }

        return {
            "label": label_name,
            "label_id": pred_id,
            "confidence": round(conf, 4),
            "probabilities": prob_dict,
            "entailment_score": prob_dict.get("ENTAILMENT", 0.0),
            "contradiction_score": prob_dict.get("CONTRADICTION", 0.0),
            "model_name": "TrustMedia-NLI-CalibratedVerifier",
            "model_version": self._metadata.get("model_version", "1.0.0-cpu"),
        }


nli_verifier_service = NLIVerifierService()
