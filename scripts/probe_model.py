"""Sanity probes for the Jvision models. Run before changing any trust constant.

    python scripts/probe_model.py --images path/to/labelled/images

Image files are labelled by their name prefix: benign_*, malignant_*, normal_*
(BUSI-style ultrasound) and ood_* for images that are not breast scans.
Clinical reference cases are built in. The clinical model is loaded here even
though the API keeps it disabled, so its behaviour can be re-checked.

This is a sanity check, not an accuracy measurement: public images may overlap
the data the models were trained on.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app.config import get_settings  # noqa: E402
from app.models import CLASS_ORDER, MODALITY_ORDER, clinical_feature_row  # noqa: E402
from app.schemas import ClinicalData  # noqa: E402
from app.weights import ensure_weights  # noqa: E402

CLINICAL_CASES = [
    ("low risk: BI-RADS 2, oval, circumscribed", "low",
     dict(age=35, birads=2, shape="oval", margin="circumscribed", density="fatty", lesion_size_mm=8)),
    ("low risk: BI-RADS 3, round, circumscribed", "low",
     dict(age=45, birads=3, shape="round", margin="circumscribed", density="scattered", lesion_size_mm=12)),
    ("high risk: BI-RADS 4, irregular, spiculated", "high",
     dict(age=58, birads=4, shape="irregular", margin="spiculated", density="heterogeneous",
          calcifications=True, lesion_size_mm=24, family_history=True)),
    ("high risk: BI-RADS 5, irregular, spiculated", "high",
     dict(age=67, birads=5, shape="irregular", margin="spiculated", density="dense",
          calcifications=True, lesion_size_mm=40, family_history=True, prior_biopsy=True)),
    ("proven: BI-RADS 6, irregular, indistinct", "high",
     dict(age=70, birads=6, shape="irregular", margin="indistinct", density="hypoechoic",
          calcifications=True, lesion_size_mm=30, prior_biopsy=True)),
]


def fmt(probs) -> str:
    return "  ".join(f"{n[:3]} {p:5.1%}" for n, p in zip(CLASS_ORDER, probs))


def probe_images(predictor, folder: Path) -> bool:
    import torch
    from PIL import Image

    hits = total = 0
    for path in sorted(folder.glob("*.png")) + sorted(folder.glob("*.jpg")):
        label = path.name.split("_")[0].lower()
        tensor = predictor.transform(Image.open(path).convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            mprobs = torch.softmax(predictor.type_model(tensor), dim=1)[0]
            modality = MODALITY_ORDER[int(mprobs.argmax())]
            line = f"{path.name:24} type {modality:10} {float(mprobs.max()):5.1%}"
            for name, model in predictor.specialists.items():
                probs = torch.softmax(model(tensor), dim=1)[0].tolist()
                top = CLASS_ORDER[max(range(3), key=probs.__getitem__)].lower()
                mark = ""
                if label in {"benign", "malignant", "normal"} and name == "ultrasound":
                    total += 1
                    hits += top == label
                    mark = "ok" if top == label else "MISS"
                line += f" | {name[:5]} {fmt(probs)} {mark}"
        print(line)
    if total:
        print(f"\nultrasound specialist: {hits}/{total} labelled images match")
    return total == 0 or hits / total >= 0.75


def probe_clinical(model_dir: str) -> bool:
    import numpy as np
    from pytorch_tabnet.tab_model import TabNetClassifier

    clf = TabNetClassifier()
    clf.load_model(os.path.join(model_dir, "tabnet_universal_clinical_model.zip"))
    malignant = CLASS_ORDER.index("Malignant")
    scores = {"low": [], "high": []}
    for name, risk, fields in CLINICAL_CASES:
        probs = clf.predict_proba(np.array([clinical_feature_row(ClinicalData(**fields))], dtype=np.float32))[0]
        scores[risk].append(probs[malignant])
        print(f"{name:44} {fmt(probs)}")
    ok = min(scores["high"]) > max(scores["low"])
    print(f"\nclinical model: every high-risk case scores higher for Malignant than every low-risk case: {ok}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--images", type=Path, help="folder of labelled probe images")
    args = parser.parse_args()

    settings = get_settings()
    ensure_weights(settings)
    from app.predictor import TorchPredictor

    predictor = TorchPredictor(settings.model_dir)
    print("components:", predictor.components(), "\n")
    passed = True
    if args.images:
        passed &= probe_images(predictor, args.images)
        print()
    passed &= probe_clinical(settings.model_dir)
    print("\nPASS" if passed else "\nFAIL")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
