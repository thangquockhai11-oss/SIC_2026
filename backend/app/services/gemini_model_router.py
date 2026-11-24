"""
Gemini Model Router Service: Exclusive Dual-Model Architecture.
Routes strictly between Gemini 4 Hydrogen (Primary) and Gemini 4 Neon (Critic / Advanced Reasoning).
"""

from datetime import datetime, timezone
from enum import Enum
import json
import logging
import os
from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class GeminiTaskType(str, Enum):
    # Routine & Extraction tasks -> Gemini 4 Hydrogen
    ROUTINE_TASK = "routine_task"
    CLAIM_EXTRACTION = "claim_extraction"
    CLAIM_DECOMPOSITION = "claim_decomposition"
    CLAIM_CLASSIFICATION = "claim_classification"
    ENTITY_EXTRACTION = "entity_extraction"
    NUMBER_DATE_EXTRACTION = "number_date_extraction"
    CONTEXT_EXTRACTION = "context_extraction"
    ATTRIBUTION_EXTRACTION = "attribution_extraction"
    CAUSAL_ANALYSIS = "causal_analysis"
    QUERY_GENERATION = "query_generation"
    DATASET_RAG = "dataset_rag"
    INITIAL_VERIFICATION = "initial_verification"
    ARTICLE_FIDELITY = "article_fidelity"

    # Complex & Adversarial Review tasks -> Gemini 4 Neon
    COMPLEX_REASONING = "complex_reasoning"
    CONFLICTING_EVIDENCE = "conflicting_evidence"
    LOW_CONFIDENCE_REVIEW = "low_confidence_review"
    CAUSAL_DISTORTION_REVIEW = "causal_distortion_review"
    NUMERICAL_DISCREPANCY_REVIEW = "numerical_discrepancy_review"
    TEMPORAL_DISCREPANCY_REVIEW = "temporal_discrepancy_review"
    LOGICAL_AUDIT = "logical_audit"


class GeminiModelRouter:
    """
    Intelligent router enforcing the two-model architecture:
    - Primary: Gemini 4 Hydrogen (gemini-4-hydrogen)
    - Critic & Advanced Reasoning: Gemini 4 Neon (gemini-4-neon)
    """

    def __init__(self):
        self.settings = get_settings()
        self.hydrogen_model = (
            os.environ.get("GEMINI_HYDROGEN_MODEL")
            or os.environ.get("TRUSTMEDIA_GEMINI_HYDROGEN_MODEL")
            or getattr(self.settings, "gemini_hydrogen_model", "gemini-4-hydrogen")
        )
        self.neon_model = (
            os.environ.get("GEMINI_NEON_MODEL")
            or os.environ.get("TRUSTMEDIA_GEMINI_NEON_MODEL")
            or getattr(self.settings, "gemini_neon_model", "gemini-4-neon")
        )
        self.api_key = (
            os.environ.get("GEMINI_API_KEY")
            or os.environ.get("TRUSTMEDIA_GEMINI_API_KEY")
            or self.settings.gemini_api_key
        )
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key.strip():
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key.strip())
                logger.info(
                    "Gemini Model Router initialized with google-genai. Hydrogen: %s, Neon: %s",
                    self.hydrogen_model,
                    self.neon_model,
                )
            except Exception as e:
                logger.warning("Could not initialize google-genai Client: %s", e)
                self.client = None
        else:
            logger.info("No GEMINI_API_KEY detected. Running in deterministic structured offline simulation mode.")

    def get_model_for_task(self, task_type: GeminiTaskType | str) -> str:
        """Resolve model ID according to task priority."""
        neon_tasks = {
            GeminiTaskType.COMPLEX_REASONING,
            GeminiTaskType.CONFLICTING_EVIDENCE,
            GeminiTaskType.LOW_CONFIDENCE_REVIEW,
            GeminiTaskType.CAUSAL_DISTORTION_REVIEW,
            GeminiTaskType.NUMERICAL_DISCREPANCY_REVIEW,
            GeminiTaskType.TEMPORAL_DISCREPANCY_REVIEW,
            GeminiTaskType.LOGICAL_AUDIT,
            "complex_reasoning",
            "conflicting_evidence",
            "low_confidence_review",
            "causal_distortion_review",
            "numerical_discrepancy_review",
            "temporal_discrepancy_review",
            "logical_audit",
        }
        if task_type in neon_tasks:
            return self.neon_model
        return self.hydrogen_model

    def should_invoke_neon(
        self,
        task_type: GeminiTaskType | str | None = None,
        confidence: float = 1.0,
        has_conflicts: bool = False,
        causal_distortion_risk: bool = False,
        numerical_discrepancy: bool = False,
        temporal_discrepancy: bool = False,
    ) -> bool:
        """
        Decision rule to invoke Gemini 4 Neon:
        - Specific complex task assigned
        - Confidence score is below threshold (< 0.75)
        - Conflicting evidence found among reliable sources
        - Causal distortion or entity attribution anomaly flagged
        - Numerical or date mismatch detected
        """
        if task_type:
            model = self.get_model_for_task(task_type)
            if model == self.neon_model:
                return True

        if confidence < 0.75:
            return True
        if has_conflicts:
            return True
        if causal_distortion_risk:
            return True
        if numerical_discrepancy or temporal_discrepancy:
            return True

        return False

    def call_model(
        self,
        model_name: str,
        prompt: str,
        schema: type[T] | None = None,
        system_instruction: str | None = None,
        temperature: float = 0.1,
    ) -> tuple[T | dict[str, Any] | str, dict[str, Any]]:
        """
        Execute call to either Gemini 4 Hydrogen or Gemini 4 Neon.
        Returns: (result_data, metadata)
        """
        meta = {
            "model_used": model_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "execution_mode": "LIVE_API" if self.client else "OFFLINE_STRUCTURED",
        }

        if self.client:
            try:
                from google.genai import types
                config_kwargs: dict[str, Any] = {
                    "temperature": temperature,
                }
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction
                if schema:
                    config_kwargs["response_mime_type"] = "application/json"
                    config_kwargs["response_schema"] = schema

                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
                if response.text:
                    if schema:
                        parsed_json = json.loads(response.text)
                        return schema.model_validate(parsed_json), meta
                    return response.text, meta
            except Exception as e:
                logger.warning(
                    "Call to %s failed (%s). Falling back to structured deterministic execution.",
                    model_name,
                    e,
                )
                meta["api_fallback_reason"] = str(e)
                meta["execution_mode"] = "FALLBACK_STRUCTURED"

        # Offline / Fallback handling
        return self._fallback_response(model_name, prompt, schema), meta

    def call_hydrogen(
        self,
        prompt: str,
        schema: type[T] | None = None,
        system_instruction: str | None = None,
        temperature: float = 0.1,
    ) -> tuple[T | dict[str, Any] | str, dict[str, Any]]:
        """Execute routine or extraction task via Gemini 4 Hydrogen."""
        return self.call_model(
            model_name=self.hydrogen_model,
            prompt=prompt,
            schema=schema,
            system_instruction=system_instruction or "Bạn là Gemini 4 Hydrogen, mô hình NLP chuyên gia trích xuất và phân tích phát ngôn cốt lõi.",
            temperature=temperature,
        )

    def call_neon(
        self,
        prompt: str,
        schema: type[T] | None = None,
        system_instruction: str | None = None,
        temperature: float = 0.1,
    ) -> tuple[T | dict[str, Any] | str, dict[str, Any]]:
        """Execute complex reasoning or adversarial critic review via Gemini 4 Neon."""
        return self.call_model(
            model_name=self.neon_model,
            prompt=prompt,
            schema=schema,
            system_instruction=system_instruction or "Bạn là Gemini 4 Neon, mô hình AI phản biện độc lập và thẩm định suy luận nhân quả khắt khe.",
            temperature=temperature,
        )

    def _fallback_response(
        self,
        model_name: str,
        prompt: str,
        schema: type[T] | None,
    ) -> Any:
        """Provide a schema-compliant mock object when offline or API is unavailable."""
        if schema is None:
            return f"[{model_name} response placeholder]"

        # If schema is requested, instantiate default fields
        field_values = {}
        for field_name, field_info in schema.model_fields.items():
            default = field_info.default
            if default is not None and default != Ellipsis:
                field_values[field_name] = default
            else:
                annotation = str(field_info.annotation)
                if "int" in annotation:
                    field_values[field_name] = 0
                elif "float" in annotation:
                    field_values[field_name] = 0.85
                elif "bool" in annotation:
                    field_values[field_name] = False
                elif "list" in annotation:
                    field_values[field_name] = []
                elif "dict" in annotation:
                    field_values[field_name] = {}
                else:
                    field_values[field_name] = ""
        return schema.model_validate(field_values)

    def check_hydrogen_health(self) -> dict[str, Any]:
        """Verify Gemini 4 Hydrogen availability and configuration."""
        return {
            "model_id": self.hydrogen_model,
            "role": "PRIMARY_ENGINE",
            "has_api_key": bool(self.api_key),
            "status": "READY" if self.client else "OFFLINE_STRUCTURED",
            "supported_tasks": [
                "claim_extraction",
                "claim_decomposition",
                "entity_extraction",
                "dataset_rag",
                "initial_verification",
                "article_fidelity",
            ],
        }

    def check_neon_health(self) -> dict[str, Any]:
        """Verify Gemini 4 Neon availability and configuration."""
        return {
            "model_id": self.neon_model,
            "role": "ADVERSARIAL_CRITIC_ENGINE",
            "has_api_key": bool(self.api_key),
            "status": "READY" if self.client else "OFFLINE_STRUCTURED",
            "supported_tasks": [
                "complex_reasoning",
                "conflicting_evidence",
                "causal_distortion_review",
                "low_confidence_review",
                "logical_audit",
            ],
        }

    def get_routing_status(self) -> dict[str, Any]:
        """Full status of the dual-model routing ecosystem."""
        return {
            "active_models": {
                "primary": self.hydrogen_model,
                "critic": self.neon_model,
            },
            "hydrogen": self.check_hydrogen_health(),
            "neon": self.check_neon_health(),
            "routing_rules": {
                "confidence_threshold": 0.75,
                "escalate_on_conflicts": True,
                "escalate_on_causal_distortion": True,
            },
        }


# Global singleton instance
_model_router: GeminiModelRouter | None = None


def get_model_router() -> GeminiModelRouter:
    """Retrieve shared GeminiModelRouter singleton."""
    global _model_router
    if _model_router is None:
        _model_router = GeminiModelRouter()
    return _model_router
