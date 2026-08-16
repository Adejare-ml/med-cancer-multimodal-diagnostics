"""Contract tests for the diagnostic API.

The point of these is narrow and deliberate: the service must never describe
itself as running a model it does not load. The UI states the basis of every
result to the user, and it can only be honest if the API is.
"""
import io as _io_module
import json
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

fastapi_testclient = pytest.importorskip(
    "fastapi.testclient", reason="fastapi is not installed in this environment"
)

import main  # noqa: E402  (path must be set first)


@pytest.fixture(scope="module")
def client():
    # The context manager runs startup, which decides which engine serves.
    with fastapi_testclient.TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="module")
def png_bytes():
    """A small but genuinely valid greyscale PNG the backend can decode."""
    from PIL import Image

    buffer = _io_module.BytesIO()
    Image.new("L", (16, 12), color=128).save(buffer, format="PNG")
    return buffer.getvalue()


CLINICAL = json.dumps(
    {
        "age": 62,
        "birads": 5,
        "shape": "irregular",
        "margin": "spiculated",
        "density": "dense",
        "calcifications": "microcalcifications",
        "lesion_size_mm": 28.0,
        "family_history": "yes",
        "prior_biopsy": "yes",
    }
)

# Named architectures the service must not claim while no model is loaded.
MODEL_CLAIMS = re.compile(
    r"medclip|tabnet|resnet|late fusion|regionprops", re.IGNORECASE
)


def walk_strings(node, path="$"):
    """Yields (json_path, string) for every string value in a response body."""
    if isinstance(node, dict):
        for key, value in node.items():
            yield from walk_strings(value, f"{path}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from walk_strings(value, f"{path}[{index}]")
    elif isinstance(node, str):
        yield path, node


class TestEngineHonesty:
    def test_health_reports_no_trained_model(self, client):
        body = client.get("/health").json()
        assert body["trained_model_loaded"] is False
        assert body["engine_type"] == "rule_based_scoring_function"

    def test_predict_declares_its_engine(self, client):
        body = client.post("/predict", data={"clinical_data": CLINICAL}).json()
        engine = body["engine"]

        assert engine["trained_model_loaded"] is False
        assert engine["image_used_for_scoring"] is False
        assert engine["calibrated"] is False
        # The five fields the scoring function actually reads.
        assert engine["scoring_inputs_used"] == [
            "age", "birads", "shape", "margin", "density"
        ]
        # The four it collects and ignores.
        assert set(engine["inputs_collected_but_unused"]) == {
            "calcifications", "lesion_size_mm", "family_history", "prior_biopsy"
        }

    def test_scoring_and_unused_inputs_are_disjoint_and_complete(self, client):
        engine = client.post("/predict", data={"clinical_data": CLINICAL}).json()["engine"]
        used = set(engine["scoring_inputs_used"])
        unused = set(engine["inputs_collected_but_unused"])

        assert used & unused == set(), "a field cannot be both read and ignored"
        assert len(used | unused) == 9, "every collected field must be accounted for"

    @pytest.mark.parametrize("with_image", [False, True])
    def test_response_never_claims_an_unloaded_model(self, client, png_bytes, with_image):
        """No field may name a model architecture while none is loaded.

        This is the regression guard for a response that reported
        final_diagnosis.mode as "Multimodal MedCLIP + TabNet Late Fusion"
        alongside engine.trained_model_loaded = False.
        """
        files = {"image": ("scan.png", png_bytes, "image/png")} if with_image else None

        body = client.post("/predict", data={"clinical_data": CLINICAL}, files=files).json()
        assert body["engine"]["trained_model_loaded"] is False

        offenders = [
            (path, value)
            for path, value in walk_strings(body)
            if MODEL_CLAIMS.search(value)
        ]
        assert not offenders, (
            "response names a model architecture while trained_model_loaded is False: "
            + "; ".join(f"{p} = {v!r}" for p, v in offenders)
        )


class TestScoringBehaviour:
    def test_ignored_inputs_do_not_move_the_score(self, client):
        """The four unused fields must not change the result.

        If this ever fails, engine.inputs_collected_but_unused is lying and the
        Analysis Basis panel is telling users something false.
        """
        baseline = client.post("/predict", data={"clinical_data": CLINICAL}).json()

        altered = json.loads(CLINICAL)
        altered.update({
            "calcifications": "none",
            "lesion_size_mm": 3.0,
            "family_history": "no",
            "prior_biopsy": "no",
        })
        changed = client.post(
            "/predict", data={"clinical_data": json.dumps(altered)}
        ).json()

        assert baseline["confidence"] == changed["confidence"]
        assert baseline["prediction"] == changed["prediction"]
        assert baseline["probabilities"] == changed["probabilities"]

    def test_image_does_not_move_the_score(self, client, png_bytes):
        """engine.image_used_for_scoring is False, so pixels must not matter."""
        without = client.post("/predict", data={"clinical_data": CLINICAL}).json()

        with_image = client.post(
            "/predict",
            data={"clinical_data": CLINICAL},
            files={"image": ("scan.png", png_bytes, "image/png")},
        ).json()

        assert without["prediction"] == with_image["prediction"]
        assert without["confidence"] == with_image["confidence"]
