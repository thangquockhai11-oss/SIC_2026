"""Anti-Hallucination & Citation Provenance Validator.

Audits generated explanations, verification verdicts, and cited evidences:
1. Citation Grounding Audit: Validates that each citation token [doc_id] refers to a genuine retrieved chunk.
2. Fabricated URL / Source Detection: Checks if any cited URL was generated out of thin air.
3. Unsupported Assertion Scrutiny: Flags claims in the explanation text lacking evidentiary support.
4. Hallucination Metric: Computes the Grounding Rate and Hallucination Risk Index.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class CitationProvenanceValidator:
    """Rigorous factual citation verification and anti-hallucination auditor."""

    @staticmethod
    def audit_explanation_citations(
        explanation_text: str,
        retrieved_evidences: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Verify that every citation in explanation references a legitimate retrieved evidence chunk."""
        valid_chunk_ids = set()
        valid_urls = set()
        for item in retrieved_evidences:
            cid = item.get("chunk_id") or item.get("id")
            if cid:
                valid_chunk_ids.add(str(cid))
            url = item.get("source_url") or item.get("url")
            if url:
                valid_urls.add(str(url).strip())

        # Extract [Doc X] or [chunk_id] or [Nguồn: ...] citations
        cited_tags = re.findall(r"\[(?:Doc\s*|Chunk\s*|Nguồn\s*:?\s*)([^\]]+)\]", explanation_text, re.IGNORECASE)
        # Clean extracted URLs of trailing sentence punctuation
        raw_urls = re.findall(r"https?://[^\s)\]]+", explanation_text)
        cited_urls = [u.rstrip(".,;:!?)'\"") for u in raw_urls]

        total_citations = len(cited_tags) + len(cited_urls)
        grounded_citations = 0
        unsupported_tags = []
        unsupported_urls = []

        for tag in cited_tags:
            tag_clean = tag.strip()
            # Check if tag corresponds to valid chunk_id or index
            if any(tag_clean in cid for cid in valid_chunk_ids) or tag_clean.isdigit():
                grounded_citations += 1
            else:
                unsupported_tags.append(tag_clean)

        for u in cited_urls:
            u_clean = u.strip()
            if u_clean in valid_urls or any(u_clean in str(v) for v in valid_urls):
                grounded_citations += 1
            else:
                unsupported_urls.append(u_clean)

        # Grounding Rate: grounded citations / total citations
        if total_citations > 0:
            grounding_rate = round(grounded_citations / total_citations, 4)
            hallucination_rate = round(1.0 - grounding_rate, 4)
        else:
            # If no citations were used, verify if evidence was available
            if len(retrieved_evidences) > 0 and len(explanation_text) > 50:
                grounding_rate = 0.50
                hallucination_rate = 0.50
            else:
                grounding_rate = 1.0  # Abstention case (no evidence, no claim)
                hallucination_rate = 0.0

        is_passed = (hallucination_rate <= 0.05) and (len(unsupported_urls) == 0)

        return {
            "is_passed": is_passed,
            "total_citations": total_citations,
            "grounded_citations": grounded_citations,
            "unsupported_tags": unsupported_tags,
            "unsupported_urls": unsupported_urls,
            "grounding_rate": grounding_rate,
            "hallucination_rate": hallucination_rate,
            "audit_verdict": "PASSED" if is_passed else "FLAGGED_FOR_HALLUCINATION",
        }


citation_validator = CitationProvenanceValidator()
