from app.fusion import RawOutputs, build_response
from app.models import CLINICAL_MODEL_ENABLED, VERIFIED_SPECIALISTS, clinical_feature_row
from app.schemas import ClinicalData

REV = "a" * 40


def test_trust_constants_match_probe_record():
    # Changing either needs a new probe record in .10x/reviews/.
    assert VERIFIED_SPECIALISTS == {"ultrasound"}
    assert CLINICAL_MODEL_ENABLED is False


def test_two_experts_are_averaged():
    raw = RawOutputs(
        modality="ultrasound", modality_confidence=0.9,
        specialist_probs=[0.6, 0.3, 0.1], clinical_probs=[0.2, 0.7, 0.1],
    )
    r = build_response(raw, clinical_received=True, model_revision=REV)
    assert r.result.basis == ["ultrasound", "clinical"]
    assert r.result.probabilities == {"Benign": 0.4, "Malignant": 0.5, "Normal": 0.1}
    assert r.result.prediction == "Malignant"


def test_errors_surface_as_warnings_without_a_result():
    raw = RawOutputs(errors=["The image type detector is not loaded, so the image was not scored."])
    r = build_response(raw, clinical_received=False, model_revision=REV)
    assert r.result is None and r.modality is None
    assert r.warnings == raw.errors


def test_feature_row_order_and_encoding():
    row = clinical_feature_row(
        ClinicalData(
            age=50, birads=5, shape="irregular", margin="spiculated", density="dense",
            calcifications=True, lesion_size_mm=30, family_history=False, prior_biopsy=True,
        )
    )
    assert row == [50.0, 5.0, 2.0, 2.0, 3.0, 1.0, 30.0, 0.0, 1.0]
