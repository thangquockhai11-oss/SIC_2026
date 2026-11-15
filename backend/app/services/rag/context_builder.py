"""RAG Context Builder with strict Prompt Injection Defenses & Token Budgeting.

Packages retrieved evidence chunks into structured XML contexts for AI Agents,
preventing adversarial jailbreaks and context window exhaustion.
"""

import html
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|the\s+)?(previous|prior|above)\s+instructions",
    r"system\s*prompt\s*:",
    r"you\s+are\s+now\s+(an?\s+)?(unrestricted|jailbroken|new)\s+ai",
    r"forget\s+(your\s+)?(rules|guidelines|identity|restrictions)",
    r"bypass\s+safety",
    r"dan\s+mode",
    r"developer\s+mode\s+enabled",
    r"\[\s*system\s*override\s*\]",
    r"<\s*/?\s*system\s*>",
    r"<\s*/?\s*instruction\s*>",
]


class RAGContextBuilder:
    """Builder for hardened, structured RAG contexts for LLMs and AI Agents."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, max_context_chars: int = 7500):
        if self._initialized:
            return
        self._initialized = True
        self.max_context_chars = max_context_chars

    @staticmethod
    def sanitize_text(text: str) -> str:
        """Neutralize prompt injection attempts and escape sensitive delimiters."""
        sanitized = text
        for pat in INJECTION_PATTERNS:
            sanitized = re.sub(pat, "[FILTERED_SECURITY_NOTICE]", sanitized, flags=re.IGNORECASE)

        # Disarm Markdown fence injections that attempt to break system instructions
        sanitized = sanitized.replace("```system", "'''system").replace("```prompt", "'''prompt")
        return sanitized.strip()

    def build_fact_checking_context(
        self,
        claim_text: str,
        evidences: list[dict[str, Any]],
        article_title: str | None = None,
    ) -> dict[str, Any]:
        """Build a hardened context for Fact-Checking Agent."""
        safe_claim = self.sanitize_text(claim_text)
        safe_title = self.sanitize_text(article_title or "")

        context_parts = [
            "<knowledge_evidence_context verified='true'>",
            f"  <target_claim>{html.escape(safe_claim)}</target_claim>",
        ]
        if safe_title:
            context_parts.append(f"  <article_context>{html.escape(safe_title)}</article_context>")

        context_parts.append("  <retrieved_evidence_pool>")

        total_chars = sum(len(p) for p in context_parts)
        used_evidences = []

        for idx, ev in enumerate(evidences):
            chunk_id = ev.get("chunk_id", f"ev_{idx}")
            src_name = self.sanitize_text(ev.get("source_name", "Nguồn kiểm chứng"))
            src_url = ev.get("source_url", "")
            d_source = ev.get("dataset_source", "KnowledgeCorpus")
            rel_score = ev.get("relevance_score", 0.0)
            baseline = ev.get("baseline_verdict", "INCONCLUSIVE")
            raw_excerpt = self.sanitize_text(ev.get("excerpt", ""))

            chunk_xml = (
                f"    <evidence_chunk id=\"{html.escape(chunk_id)}\" dataset=\"{html.escape(d_source)}\" "
                f"source=\"{html.escape(src_name)}\" url=\"{html.escape(src_url)}\" "
                f"relevance_score=\"{rel_score:.3f}\" baseline_stance=\"{html.escape(baseline)}\">\n"
                f"      <![CDATA[{raw_excerpt}]]>\n"
                f"    </evidence_chunk>"
            )

            if total_chars + len(chunk_xml) > self.max_context_chars and used_evidences:
                break

            context_parts.append(chunk_xml)
            total_chars += len(chunk_xml)
            used_evidences.append(ev)

        context_parts.append("  </retrieved_evidence_pool>")
        context_parts.append("</knowledge_evidence_context>")

        full_context_str = "\n".join(context_parts)
        return {
            "context_str": full_context_str,
            "evidence_count": len(used_evidences),
            "evidences": used_evidences,
            "char_count": len(full_context_str),
            "token_estimate": len(full_context_str.split()),
        }

    def build_agent_context(
        self,
        agent_role: str,
        query: str,
        evidences: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generic hardened context builder for other agents."""
        safe_q = self.sanitize_text(query)
        context_parts = [
            f"<agent_retrieval_context role='{html.escape(agent_role)}'>",
            f"  <query>{html.escape(safe_q)}</query>",
            "  <evidence_items>",
        ]
        total_chars = sum(len(p) for p in context_parts)
        used = []

        for idx, ev in enumerate(evidences):
            cid = ev.get("chunk_id", f"ev_{idx}")
            s_name = self.sanitize_text(ev.get("source_name", ""))
            s_text = self.sanitize_text(ev.get("excerpt", ""))
            item_xml = (
                f"    <item id='{html.escape(cid)}' source='{html.escape(s_name)}'>\n"
                f"      <![CDATA[{s_text}]]>\n"
                f"    </item>"
            )
            if total_chars + len(item_xml) > self.max_context_chars and used:
                break
            context_parts.append(item_xml)
            total_chars += len(item_xml)
            used.append(ev)

        context_parts.append("  </evidence_items>")
        context_parts.append("</agent_retrieval_context>")

        full_str = "\n".join(context_parts)
        return {
            "context_str": full_str,
            "evidence_count": len(used),
            "evidences": used,
            "char_count": len(full_str),
            "token_estimate": len(full_str.split()),
        }


context_builder = RAGContextBuilder()

