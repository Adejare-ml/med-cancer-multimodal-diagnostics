"""Contract tests for the Jvision API, run against a fake predictor."""
import json

from conftest import FakePredictor

from app.fusion import RawOutputs

CLINICAL = {
    "age": 58, "birads": 4, "shape": "irregular", "margin": "spiculated", "density": "heterogeneous",
    "calcifications": True, "lesion_size_mm": 24, "family_history": True, "prior_biopsy": False,
}


def post(client, png, clinical=None, content_type="image/png"):
    files = {"image": ("case.png", png, content_type)} if png is not None else None
    data = {"clinical_data": json.dumps(clinical)} if clinical is not None else None
    return client.post("/predict", files=files, data=data)


def test_health_ok_when_required_models_ready(make_client):
    with make_client() as c:
        body = c.get("/health").json()
    assert body["status"] == "ok"
    assert body["components"]["clinical_model"] == "disabled"
    assert len(body["model_revision"]) == 40


def test_health_degraded_when_loading_fails(make_client):
    def boom(_settings):
        raise RuntimeError("weights unavailable")

    with make_client(factory=boom) as c:
        body = c.get("/health").json()
        assert c.post("/predict").status_code == 503
    assert body["status"] == "degraded"
    assert "weights unavailable" in body["detail"]


def test_health_degraded_when_ultrasound_model_missing(make_client):
    p = FakePredictor(components={"modality_classifier": "ready", "ultrasound_model": "missing"})
    with make_client(p) as c:
        assert c.get("/health").json()["status"] == "degraded"


def test_ultrasound_image_gives_result(make_client, png):
    with make_client() as c:
        body = post(c, png).json()
    assert body["result"]["prediction"] == "Benign"
    assert body["result"]["basis"] == ["ultrasound"]
    assert body["modality"] == {"detected": "ultrasound", "confidence": 0.97, "specialist": "ultrasound"}
    assert abs(sum(body["result"]["probabilities"].values()) - 1) < 1e-3


def test_unverified_mammogram_gives_no_result(make_client, png):
    p = FakePredictor(RawOutputs(modality="mammogram", modality_confidence=0.9))
    with make_client(p) as c:
        body = post(c, png).json()
    assert body["result"] is None
    assert body["experts"] == []
    assert body["modality"]["specialist"] is None
    assert any("mammogram" in w for w in body["warnings"])


def test_overconfident_expert_is_flagged(make_client, png):
    p = FakePredictor(
        RawOutputs(modality="ultrasound", modality_confidence=1.0, specialist_probs=[0.0, 0.995, 0.005])
    )
    with make_client(p) as c:
        body = post(c, png).json()
    assert body["experts"][0]["overconfident"] is True
    assert any("not trustworthy" in w for w in body["warnings"])


def test_clinical_data_is_validated_but_not_used(make_client, png):
    p = FakePredictor()
    with make_client(p) as c:
        body = post(c, png, CLINICAL).json()
    assert body["clinical_received"] is True
    assert body["clinical_used"] is False
    assert p.calls[0][1].shape.value == "irregular"


def test_image_is_required(make_client):
    with make_client() as c:
        r = post(c, None, CLINICAL)
    assert r.status_code == 400
    assert "image is required" in r.json()["detail"]


def test_bad_clinical_values_rejected(make_client, png):
    with make_client() as c:
        assert post(c, png, {**CLINICAL, "shape": "spiky"}).status_code == 422
        assert post(c, png, {**CLINICAL, "birads": 9}).status_code == 422
        assert post(c, png, {**CLINICAL, "extra": 1}).status_code == 422
        r = c.post("/predict", files={"image": ("a.png", png, "image/png")}, data={"clinical_data": "{oops"})
        assert r.status_code == 400


def test_wrong_type_size_and_garbage_rejected(make_client, png):
    with make_client() as c:
        assert post(c, png, content_type="application/pdf").status_code == 415
        assert post(c, b"x" * (1024 * 1024 + 10)).status_code == 413
        assert post(c, b"not an image at all").status_code == 400


def test_cors_allows_only_configured_origin(make_client):
    with make_client() as c:
        ok = c.options("/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
        bad = c.options("/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
