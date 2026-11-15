"""PHEME Rumour and Veracity Dataset Loader.

Provides access to 6,425 conversational threads and veracity annotations
from the PHEME dataset for rumour detection, reaction stance patterns,
and multi-agent veracity assessment.
"""

import json
import logging
from pathlib import Path
import re
from typing import Any

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[4]
EXTRACTED_DIR = ROOT_DIR / "datasets" / "extracted" / "pheme" / "all-rnr-annotated-threads"


class RumourLoader:
    """Manages extracted PHEME conversational threads and veracity annotations."""

    def __init__(self, threads_dir: Path | None = None):
        self.threads_dir = threads_dir or EXTRACTED_DIR
        self._event_cache: dict[str, Any] | None = None

    def get_event_summary(self) -> dict[str, Any]:
        """Summarize rumour and non-rumour threads across all 9 PHEME events."""
        if not self.threads_dir.exists():
            return {"error": "PHEME threads directory not found", "events": {}}

        events = {}
        total_threads = 0
        total_rumours = 0
        total_non_rumours = 0

        for ev in self.threads_dir.iterdir():
            if not ev.is_dir() or ev.name.startswith("."):
                continue

            rumour_dir = ev / "rumours"
            non_rumour_dir = ev / "non-rumours"

            r_count = len([d for d in rumour_dir.iterdir() if d.is_dir()]) if rumour_dir.exists() else 0
            nr_count = len([d for d in non_rumour_dir.iterdir() if d.is_dir()]) if non_rumour_dir.exists() else 0
            ev_total = r_count + nr_count

            total_threads += ev_total
            total_rumours += r_count
            total_non_rumours += nr_count

            events[ev.name] = {
                "rumours": r_count,
                "non_rumours": nr_count,
                "total": ev_total,
            }

        return {
            "total_threads": total_threads,
            "total_rumours": total_rumours,
            "total_non_rumours": total_non_rumours,
            "events": events,
            "benchmark": "PHEME (Zubiaga et al., 2016)",
        }

    def load_thread_sample(self, event_name: str, is_rumour: bool = True) -> dict[str, Any] | None:
        """Load a sample thread with its source tweet and annotations."""
        ev_dir = self.threads_dir / event_name
        if not ev_dir.exists():
            return None

        cat_dir = ev_dir / ("rumours" if is_rumour else "non-rumours")
        if not cat_dir.exists():
            return None

        thread_dirs = [d for d in cat_dir.iterdir() if d.is_dir()]
        if not thread_dirs:
            return None

        sample_thread = thread_dirs[0]
        result = {"thread_id": sample_thread.name, "event": event_name, "is_rumour": is_rumour}

        # Source tweet
        src_dir = sample_thread / "source-tweets"
        if src_dir.exists():
            tweets = list(src_dir.glob("*.json"))
            if tweets:
                try:
                    with open(tweets[0], "r", encoding="utf-8") as f:
                        result["source_tweet"] = json.load(f)
                except Exception as e:
                    result["source_tweet_error"] = str(e)

        # Annotation
        ann_file = sample_thread / "annotation.json"
        if ann_file.exists():
            try:
                with open(ann_file, "r", encoding="utf-8") as f:
                    result["annotation"] = json.load(f)
            except Exception as e:
                result["annotation_error"] = str(e)

        return result


rumour_loader = RumourLoader()

