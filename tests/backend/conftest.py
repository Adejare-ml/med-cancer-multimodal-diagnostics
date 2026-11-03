import io

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.fusion import RawOutputs
from app.main import create_app


class FakePredictor:
    """Stands in for TorchPredictor so tests need no weights."""

    def __init__(self, raw: RawOutputs | None = None, components=None):
        self.raw = raw or RawOutputs(
            modality="ultrasound", modality_confidence=0.97, specialist_probs=[0.8, 0.15, 0.05]
        )
        self._components = components or {
            "modality_classifier": "ready",
            "ultrasound_model": "ready",
            "mammogram_model": "disabled",
            "clinical_model": "disabled",
        }
        self.calls = []

    def components(self):
        return dict(self._components)

    def run(self, image, clinical):
        self.calls.append((len(image), clinical))
        return self.raw


@pytest.fixture
def settings():
    return Settings(allowed_origins=["http://localhost:5173"], download_weights=False, max_upload_mb=1)


@pytest.fixture
def make_client(settings):
    def make(predictor=None, factory=None):
        f = factory or (lambda s: predictor or FakePredictor())
        return TestClient(create_app(settings, predictor_factory=f, load_in_background=False))

    return make


@pytest.fixture
def png():
    from PIL import Image

    buf = io.BytesIO()
    Image.new("L", (32, 24), color=128).save(buf, format="PNG")
    return buf.getvalue()
