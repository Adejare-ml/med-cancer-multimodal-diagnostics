"""Deployment settings, read from environment variables.

Model trust decisions are NOT settings. They live in `models.py` as constants
so they can only change in reviewed code, together with a passing probe.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

# The Space commit the weights were probed at (2026-11-03). Changing it means
# re-running scripts/probe_model.py.
DEFAULT_MODEL_REVISION = "937bd46551e789808939a8b127ca9f26b88b4314"


def _list(name: str, default: str) -> list[str]:
    return [p.strip() for p in os.getenv(name, default).split(",") if p.strip()]


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    return default if raw is None else raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    allowed_origins: list[str] = field(
        default_factory=lambda: _list(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
        )
    )
    model_dir: str = field(default_factory=lambda: os.getenv("MODEL_DIR", "models"))
    hf_model_repo: str = field(
        default_factory=lambda: os.getenv("HF_MODEL_REPO", "AdejareworkStudio/Breast_cancer_predictor")
    )
    model_revision: str = field(default_factory=lambda: os.getenv("MODEL_REVISION", DEFAULT_MODEL_REVISION))
    download_weights: bool = field(default_factory=lambda: _bool("DOWNLOAD_WEIGHTS", True))
    max_upload_mb: float = field(default_factory=lambda: float(os.getenv("MAX_UPLOAD_MB", "10")))


@lru_cache
def get_settings() -> Settings:
    return Settings()
