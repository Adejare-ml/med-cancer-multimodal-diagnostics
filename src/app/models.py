"""What each model is, and whether it is trusted to score.

Trust is decided here, in code, from probe results, never by an environment
variable. To change a status, run `scripts/probe_model.py`, record the result
in `.10x/reviews/`, and change the constant in the same commit.
"""
from __future__ import annotations

from .schemas import ClinicalData

# Output order of every classifier head, from the Space's inference.py.
# Confirmed for the ultrasound specialist by the 2026-11-03 BUSI probe.
CLASS_ORDER = ("Benign", "Malignant", "Normal")

# Order of the modality classifier's outputs (medclip_type_index.json).
MODALITY_ORDER = ("mammogram", "ultrasound")

# Specialists allowed to score an image. Probe notes, 2026-11-03:
#   ultrasound: 10/12 BUSI images classified as labelled (images may overlap
#               its training data, so this is a sanity check, not accuracy).
#   mammogram:  never loaded on the Space (head shape mismatch), so its output
#               has never been checked. Not trusted until probed.
VERIFIED_SPECIALISTS: frozenset[str] = frozenset({"ultrasound"})

# The clinical TabNet is disabled. Probes on 2026-11-03: it never predicted
# Malignant; BI-RADS 2 oval and BI-RADS 6 irregular inputs both returned the
# same class at 1.0, so no relabelling can make it right. Retrain before use.
CLINICAL_MODEL_ENABLED = False

OVERCONFIDENT_AT = 0.99

WEIGHT_FILES = (
    "medclip_type_classifier.pth",
    "medclip_type_index.json",
    "specialist_ultrasound.pth",
    "specialist_mammogram.pth",
    "tabnet_universal_clinical_model.zip",
)

# Encodings the clinical model was built with (from the Space's inference.py).
SHAPE_CODES = {
    "round": 0, "oval": 1, "lobular": 1,
    "irregular": 2, "architectural_distortion": 2,
    "unknown": 3,
}
MARGIN_CODES = {
    "circumscribed": 0,
    "microlobulated": 1, "obscured": 1, "indistinct": 1,
    "spiculated": 2,
    "unknown": 3,
}
DENSITY_CODES = {
    "anechoic": 0, "fatty": 0,
    "hypoechoic": 1, "scattered": 1,
    "isoechoic": 2, "heterogeneous": 2,
    "hyperechoic": 3, "dense": 3,
    "unknown": 3,
}


def clinical_feature_row(data: ClinicalData) -> list[float]:
    """The 9-number row in the order the TabNet model was trained on."""
    return [
        float(data.age),
        float(data.birads),
        float(SHAPE_CODES[data.shape.value]),
        float(MARGIN_CODES[data.margin.value]),
        float(DENSITY_CODES[data.density.value]),
        float(data.calcifications),
        float(data.lesion_size_mm),
        float(data.family_history),
        float(data.prior_biopsy),
    ]
