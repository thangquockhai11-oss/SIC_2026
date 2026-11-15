"""
TrustMedia AI Dataset Loaders.
Connects verified research datasets to AI Agents for retrieval,
baseline calibration, and benchmark evaluation.
"""

from .fact_checking_loader import FactCheckingLoader, fact_checking_loader
from .credibility_loader import CredibilityLoader, credibility_loader
from .opinion_loader import OpinionLoader, opinion_loader
from .rumour_loader import RumourLoader, rumour_loader

__all__ = [
    "FactCheckingLoader",
    "fact_checking_loader",
    "CredibilityLoader",
    "credibility_loader",
    "OpinionLoader",
    "opinion_loader",
    "RumourLoader",
    "rumour_loader",
]
