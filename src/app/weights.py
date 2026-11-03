"""Fetches model weights from the Hugging Face Space repo, pinned to one revision."""
from __future__ import annotations

import logging
import os

from .config import Settings
from .models import WEIGHT_FILES

log = logging.getLogger("jvision.weights")


def ensure_weights(settings: Settings) -> None:
    """Download any missing weight file into MODEL_DIR. Files already there win."""
    missing = [f for f in WEIGHT_FILES if not os.path.isfile(os.path.join(settings.model_dir, f))]
    if not missing:
        return
    if not settings.download_weights:
        log.warning("weights missing and DOWNLOAD_WEIGHTS is off: %s", missing)
        return
    from huggingface_hub import snapshot_download

    log.info("downloading %s from %s@%s", missing, settings.hf_model_repo, settings.model_revision[:8])
    snapshot_download(
        repo_id=settings.hf_model_repo,
        repo_type="space",
        revision=settings.model_revision,
        allow_patterns=missing,
        local_dir=settings.model_dir,
    )
