"""Production Claim Classification Model & Inference Service.

Handles 9 canonical claim categories:
- FACTUAL_CLAIM
- STATISTICAL_CLAIM
- HISTORICAL_CLAIM
- SCIENTIFIC_CLAIM
- QUOTATION_CLAIM
- CAUSAL_CLAIM
- OPINION
- PREDICTION
- NOT_CHECKABLE

Supports calibrated class probabilities, feature extraction, and lightweight CPU inference.
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

logger = logging.getLogger(__name__)

CLAIM_CLASSES = [
    "FACTUAL_CLAIM",
    "STATISTICAL_CLAIM",
    "HISTORICAL_CLAIM",
    "SCIENTIFIC_CLAIM",
    "QUOTATION_CLAIM",
    "CAUSAL_CLAIM",
    "OPINION",
    "PREDICTION",
    "NOT_CHECKABLE",
]

MODEL_DIR = os.path.join("ml", "checkpoints", "claim_classifier")
MODEL_PATH = os.path.join(MODEL_DIR, "model.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")


class LinguisticFeatureExtractor(BaseEstimator):
    """Extracts dense domain-specific linguistic signals for claim taxonomy."""

    def fit(self, X, y=None):
        return self

    def transform(self, X) -> np.ndarray:
        features = []
        for text in X:
            t_lower = str(text).lower()
            t_len = len(text)

            has_numbers = 1.0 if re.search(r"\d+", t_lower) else 0.0
            has_percent = 1.0 if re.search(r"(\d+(?:[.,]\d+)?\s*%)|(phần trăm)", t_lower) else 0.0
            has_currency = 1.0 if re.search(r"(triệu|tỷ|nghìn|usd|đồng|vnđ|euro|\$)", t_lower) else 0.0
            has_historical_year = 1.0 if re.search(r"\b(18\d{2}|19\d{2}|200\d|201\d)\b", t_lower) else 0.0
            has_future_year = 1.0 if re.search(r"\b(202[7-9]|20[3-9]\d)\b", t_lower) else 0.0

            has_quote = 1.0 if ('"' in text or "“" in text or "”" in text or "cho biết" in t_lower or "tuyên bố" in t_lower or "khẳng định" in t_lower) else 0.0
            has_opinion = 1.0 if re.search(r"(tôi nghĩ|theo tôi|cảm thấy|tuyệt vời|dở tệ|tồi tệ|thực sự đẹp|theo quan điểm)", t_lower) else 0.0
            has_question = 1.0 if ("?" in text or "liệu rằng" in t_lower or "có nên" in t_lower) else 0.0
            has_causal = 1.0 if re.search(r"(do đó|bởi vì|khiến cho|dẫn đến|gây ra|làm cho|hậu quả là|nguyên nhân là)", t_lower) else 0.0
            has_scientific = 1.0 if re.search(r"(khoa học|y tế|bệnh|virus|vắc xin|gen|vật lý|hóa học|nhiệt độ|khí quyển|sinh học|nguyên tử)", t_lower) else 0.0
            has_prediction = 1.0 if re.search(r"(dự kiến|dự báo|kỳ vọng|ước tính|trong tương lai|hướng tới năm)", t_lower) else 0.0

            features.append([
                has_numbers,
                has_percent,
                has_currency,
                has_historical_year,
                has_future_year,
                has_quote,
                has_opinion,
                has_question,
                has_causal,
                has_scientific,
                has_prediction,
                min(t_len / 200.0, 2.0),
            ])
        return np.array(features, dtype=np.float32)


class TrustMediaClaimPipeline(BaseEstimator, ClassifierMixin):
    """Full hybrid pipeline: TF-IDF n-grams + Linguistic Signals + Calibrated Classifier."""

    def __init__(self, c_param: float = 1.5):
        self.c_param = c_param
        self.word_vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=12000,
            sublinear_tf=True,
            strip_accents=None,
        )
        self.char_vectorizer = TfidfVectorizer(
            ngram_range=(3, 5),
            analyzer="char_wb",
            max_features=8000,
            sublinear_tf=True,
        )
        self.feature_extractor = LinguisticFeatureExtractor()
        base_svm = LinearSVC(C=self.c_param, class_weight="balanced", random_state=42, max_iter=2500)
        self.classifier = CalibratedClassifierCV(estimator=base_svm, cv=3)

    def _extract_all(self, X):
        X_word = self.word_vectorizer.transform(X)
        X_char = self.char_vectorizer.transform(X)
        X_ling = self.feature_extractor.transform(X)
        return hstack([X_word, X_char, X_ling])

    def fit(self, X, y):
        X_word = self.word_vectorizer.fit_transform(X)
        X_char = self.char_vectorizer.fit_transform(X)
        X_ling = self.feature_extractor.transform(X)
        X_all = hstack([X_word, X_char, X_ling])
        self.classifier.fit(X_all, y)
        self.classes_ = self.classifier.classes_
        return self

    def predict(self, X):
        X_all = self._extract_all(X)
        return self.classifier.predict(X_all)

    def predict_proba(self, X):
        X_all = self._extract_all(X)
        return self.classifier.predict_proba(X_all)


class ClaimClassifierService:
    """Inference service with lazy loading and singleton caching."""

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
                logger.info("ClaimClassifierService: Successfully loaded model checkpoint from %s", MODEL_PATH)
            except Exception as e:
                logger.warning("Failed to load model from %s: %s", MODEL_PATH, e)
                self._model = None
        else:
            logger.info("ClaimClassifierService: No saved checkpoint found at %s. Service ready for training.", MODEL_PATH)

        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception:
                pass

    def is_ready(self) -> bool:
        return self._model is not None

    def classify(self, text: str) -> dict[str, Any]:
        """Classify a single claim string and return rich taxonomy metadata."""
        cleaned = text.strip()
        if not cleaned:
            return {
                "claim_type": "NOT_CHECKABLE",
                "confidence": 0.50,
                "is_checkable": False,
                "probabilities": {},
                "model_version": self._metadata.get("model_version", "1.0.0"),
            }

        if self._model is not None:
            pred_idx = int(self._model.predict([cleaned])[0])
            probs = self._model.predict_proba([cleaned])[0]
            claim_type = CLAIM_CLASSES[pred_idx]
            conf = float(probs[pred_idx])
            prob_dict = {CLAIM_CLASSES[i]: round(float(p), 4) for i, p in enumerate(probs)}
        else:
            # Fallback heuristic if not yet trained
            claim_type = "FACTUAL_CLAIM"
            t_low = cleaned.lower()
            if any(m in t_low for m in ["tôi nghĩ", "theo quan điểm", "thật tuyệt", "dở tệ"]):
                claim_type = "OPINION"
            elif any(m in t_low for m in ["sẽ", "dự kiến", "kỳ vọng", "dự báo"]):
                claim_type = "PREDICTION"
            elif re.search(r"(\d+(?:[.,]\d+)?\s*%)|(tỷ|triệu|nghìn\s+đồng)", t_low):
                claim_type = "STATISTICAL_CLAIM"
            conf = 0.85
            prob_dict = {claim_type: conf}

        is_checkable = claim_type not in ("OPINION", "PREDICTION", "NOT_CHECKABLE")

        return {
            "claim_type": claim_type,
            "confidence": round(conf, 4),
            "is_checkable": is_checkable,
            "probabilities": prob_dict,
            "model_name": "TrustMedia-ClaimTaxonomy-CalibratedSVM",
            "model_version": self._metadata.get("model_version", "1.0.0-cpu"),
        }


claim_classifier_service = ClaimClassifierService()

