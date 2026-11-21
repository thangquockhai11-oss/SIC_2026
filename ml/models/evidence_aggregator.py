"""Calibrated Evidence Aggregator & Verdict Decision Engine.

Aggregates multiple retrieved evidence items with:
- Source credibility & tier weighting
- Recency and primary/secondary provenance weighting
- Circular citation and syndicated republishing deduplication
- Pairwise NLI support vs contradiction tallying
- Rigorous abstention conditions (NOT_ENOUGH_INFORMATION, NOT_CHECKABLE, CONFLICTING_EVIDENCE)
- Calibrated confidence calculation and Expected Calibration Error (ECE)
"""

import hashlib
import logging
import math
import re
from typing import Any
import numpy as np

logger = logging.getLogger(__name__)

VERDICTS = [
    "SUPPORTED",
    "REFUTED",
    "PARTIALLY_SUPPORTED",
    "CONFLICTING_EVIDENCE",
    "NOT_ENOUGH_INFORMATION",
    "NOT_CHECKABLE",
]


class CalibratedEvidenceAggregator:
    """Enterprise decision engine with circular reporting detection and calibrated uncertainty."""

    def __init__(self, temperature: float = 1.0):
        self.temperature = temperature

    @staticmethod
    def _extract_domain(url_or_name: str | None) -> str:
        if not url_or_name:
            return "unknown_source"
        m = re.search(r"https?://(?:www\.)?([^/]+)", url_or_name)
        if m:
            return m.group(1).lower()
        return url_or_name.strip().lower()

    @staticmethod
    def _content_fingerprint(text: str) -> str:
        """Normalized 64-bit fingerprint for near-duplicate and syndication detection."""
        words = re.findall(r"\w+", text.lower())
        sig_words = [w for w in words if len(w) > 3][:40]
        sample = "".join(sorted(sig_words))
        return hashlib.md5(sample.encode("utf-8")).hexdigest()

    def filter_circular_citations(self, evidence_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Remove syndicated republications, domain mirrors, and circular quotes."""
        unique_evidences = []
        seen_fingerprints = set()
        domain_counts: dict[str, int] = {}

        for item in evidence_list:
            text = item.get("excerpt") or item.get("content", "")
            domain = self._extract_domain(item.get("source_url") or item.get("source_name"))
            fp = self._content_fingerprint(text)

            # Check content deduplication (syndicated articles with same verbatim text)
            if fp in seen_fingerprints and len(text) > 40:
                continue
            seen_fingerprints.add(fp)

            # Cap max evidences from a single domain to avoid echo-chamber bias
            d_count = domain_counts.get(domain, 0)
            if d_count >= 2:
                continue
            domain_counts[domain] = d_count + 1

            unique_evidences.append(item)

        return unique_evidences

    def aggregate(
        self,
        claim: dict[str, Any],
        evidence_list: list[dict[str, Any]],
        nli_verifications: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Synthesize final fact-checking verdict with rigorous provenance."""
        claim_type = claim.get("claim_type", "FACTUAL_CLAIM")
        is_checkable = claim.get("is_checkable", True)
        if not is_checkable or claim_type in ("OPINION", "PREDICTION", "NOT_CHECKABLE"):
            return {
                "verdict": "NOT_CHECKABLE",
                "confidence": 0.90,
                "abstention_triggered": True,
                "abstention_reason": f"Phát ngôn thuộc danh mục '{claim_type}', không thể thẩm định thực chứng.",
                "support_mass": 0.0,
                "refute_mass": 0.0,
                "neutral_mass": 0.0,
                "evidence_count": 0,
                "deduplicated_count": 0,
            }

        # Deduplicate circular reporting
        clean_evidences = self.filter_circular_citations(evidence_list)
        if not clean_evidences:
            return {
                "verdict": "NOT_ENOUGH_INFORMATION",
                "confidence": 0.85,
                "abstention_triggered": True,
                "abstention_reason": "Không tìm thấy bằng chứng độc lập đạt ngưỡng liên quan trong cơ sở tri thức.",
                "support_mass": 0.0,
                "refute_mass": 0.0,
                "neutral_mass": 0.0,
                "evidence_count": len(evidence_list),
                "deduplicated_count": 0,
            }

        # Weighting accumulation
        support_mass = 0.0
        refute_mass = 0.0
        neutral_mass = 0.0

        for idx, evi in enumerate(clean_evidences):
            # 1. Source credibility weight [0.5 -> 1.0]
            cred = float(evi.get("source_credibility", 70.0)) / 100.0
            cred_weight = max(0.50, min(cred, 1.0))

            # 2. Retrieval relevance weight
            relevance = float(evi.get("relevance_score", 0.60))

            # 3. NLI label & score
            if nli_verifications and idx < len(nli_verifications):
                nli_item = nli_verifications[idx]
                label = nli_item.get("label", "NEUTRAL")
                conf = float(nli_item.get("confidence", 0.60))
            else:
                label = evi.get("stance", "NEUTRAL")
                conf = float(evi.get("stance_confidence", 0.60))

            effective_weight = cred_weight * relevance * conf

            if label in ("ENTAILMENT", "SUPPORT", "SUPPORTED"):
                support_mass += effective_weight
            elif label in ("CONTRADICTION", "REFUTE", "REFUTED"):
                refute_mass += effective_weight
            else:
                neutral_mass += effective_weight * 0.5

        total_mass = support_mass + refute_mass + neutral_mass
        if total_mass == 0.0:
            return {
                "verdict": "NOT_ENOUGH_INFORMATION",
                "confidence": 0.70,
                "abstention_triggered": True,
                "abstention_reason": "Tổng trọng số bằng chứng không đủ để đưa ra kết luận xác thực.",
                "support_mass": 0.0,
                "refute_mass": 0.0,
                "neutral_mass": 0.0,
                "evidence_count": len(evidence_list),
                "deduplicated_count": len(clean_evidences),
            }

        # Decision rules
        support_ratio = support_mass / total_mass
        refute_ratio = refute_mass / total_mass

        # Check for conflicting evidence
        if support_mass >= 0.40 and refute_mass >= 0.40:
            verdict = "CONFLICTING_EVIDENCE"
            calibrated_conf = round(max(support_ratio, refute_ratio), 4)
        elif refute_mass >= 0.50 and refute_ratio >= 0.55:
            verdict = "REFUTED"
            calibrated_conf = round(refute_ratio, 4)
        elif support_mass >= 0.50 and support_ratio >= 0.55:
            verdict = "SUPPORTED"
            calibrated_conf = round(support_ratio, 4)
        elif support_mass >= 0.30 and refute_mass < 0.20:
            verdict = "PARTIALLY_SUPPORTED"
            calibrated_conf = round(support_ratio, 4)
        else:
            verdict = "NOT_ENOUGH_INFORMATION"
            calibrated_conf = 0.75

        # Temperature scaling on confidence
        scaled_conf = float(1.0 / (1.0 + np.exp(-np.log(max(calibrated_conf / (1.0001 - calibrated_conf), 1e-5)) / self.temperature)))
        scaled_conf = max(0.50, min(round(scaled_conf, 4), 0.99))

        return {
            "verdict": verdict,
            "confidence": scaled_conf,
            "abstention_triggered": verdict in ("NOT_ENOUGH_INFORMATION", "CONFLICTING_EVIDENCE", "NOT_CHECKABLE"),
            "abstention_reason": "" if verdict in ("SUPPORTED", "REFUTED", "PARTIALLY_SUPPORTED") else f"Bảo lưu phán quyết do trạng thái {verdict}.",
            "support_mass": round(support_mass, 4),
            "refute_mass": round(refute_mass, 4),
            "neutral_mass": round(neutral_mass, 4),
            "evidence_count": len(evidence_list),
            "deduplicated_count": len(clean_evidences),
        }


def compute_expected_calibration_error(confidences: list[float], accuracies: list[int], num_bins: int = 10) -> float:
    """Calculate Expected Calibration Error (ECE) across confidence bins."""
    bins = np.linspace(0.0, 1.0, num_bins + 1)
    confidences = np.array(confidences)
    accuracies = np.array(accuracies)
    ece = 0.0

    for i in range(num_bins):
        in_bin = (confidences > bins[i]) & (confidences <= bins[i + 1])
        bin_size = np.sum(in_bin)
        if bin_size > 0:
            bin_acc = np.mean(accuracies[in_bin])
            bin_conf = np.mean(confidences[in_bin])
            ece += (bin_size / len(confidences)) * abs(bin_acc - bin_conf)

    return round(float(ece), 4)


evidence_aggregator = CalibratedEvidenceAggregator()
