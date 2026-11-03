"""Loads the trained models and runs them. The only module that imports torch.

Architectures are rebuilt with torchvision and every state dict is loaded with
strict=True, so a mismatched file fails loudly instead of running on random
weights (the original Space loaded the type classifier with strict=False and
silently fell back to the ultrasound model when the mammogram file failed).
"""
from __future__ import annotations

import io
import json
import logging
import os
from typing import Optional, Protocol

from .fusion import RawOutputs
from .models import CLINICAL_MODEL_ENABLED, MODALITY_ORDER, VERIFIED_SPECIALISTS, clinical_feature_row
from .schemas import ClinicalData, ComponentState

log = logging.getLogger("jvision.predictor")


class Predictor(Protocol):
    def components(self) -> dict[str, ComponentState]: ...

    def run(self, image: bytes, clinical: Optional[ClinicalData]) -> RawOutputs: ...


class TorchPredictor:
    def __init__(self, model_dir: str) -> None:
        import torch
        from torchvision import transforms

        self._torch = torch
        self.device = torch.device("cpu")
        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )
        self._state: dict[str, ComponentState] = {}
        self.type_model = self._try("modality_classifier", lambda: self._load_type_model(model_dir))
        self.specialists = {}
        for name in ("ultrasound", "mammogram"):
            model = self._try(
                f"{name}_model", lambda n=name: self._load_specialist(os.path.join(model_dir, f"specialist_{n}.pth"))
            )
            if model is not None:
                self.specialists[name] = model
                if name not in VERIFIED_SPECIALISTS:
                    self._state[f"{name}_model"] = "disabled"
        self.tabnet = None
        if CLINICAL_MODEL_ENABLED:
            self.tabnet = self._try("clinical_model", lambda: self._load_tabnet(model_dir))
        else:
            self._state["clinical_model"] = "disabled"

    # loading -------------------------------------------------------------

    def _try(self, name: str, load):
        try:
            model = load()
            self._state[name] = "ready"
            log.info("loaded %s", name)
            return model
        except FileNotFoundError as exc:
            self._state[name] = "missing"
            log.warning("%s missing: %s", name, exc)
        except Exception:  # noqa: BLE001 - any load failure must be reported, not raised
            self._state[name] = "failed"
            log.exception("%s failed to load", name)
        return None

    def _read_state(self, path: str):
        if not os.path.isfile(path):
            raise FileNotFoundError(path)
        return self._torch.load(path, map_location=self.device, weights_only=True)

    def _load_type_model(self, model_dir: str):
        torch = self._torch
        from torch import nn
        from torchvision import models

        with open(os.path.join(model_dir, "medclip_type_index.json")) as fh:
            index = {int(k): v for k, v in json.load(fh).items()}
        if tuple(index[i] for i in sorted(index)) != MODALITY_ORDER:
            raise ValueError(f"unexpected modality index {index}")

        class TypeClassifier(nn.Module):
            # MedCLIP's vision encoder is a torchvision ResNet-50 with a 512-d fc.
            def __init__(self) -> None:
                super().__init__()
                self.vision_model = nn.Module()
                self.vision_model.model = models.resnet50(weights=None)
                self.vision_model.model.fc = nn.Linear(2048, 512, bias=False)
                self.type_head = nn.Sequential(nn.Dropout(0.3), nn.Linear(512, len(MODALITY_ORDER)))

            def forward(self, x):
                return self.type_head(self.vision_model.model(x))

        state = self._read_state(os.path.join(model_dir, "medclip_type_classifier.pth"))
        state = {k: v for k, v in state.items() if k.startswith(("vision_model.", "type_head."))}
        model = TypeClassifier()
        model.load_state_dict(state, strict=True)
        return model.eval()

    def _load_specialist(self, path: str):
        from torch import nn
        from torchvision import models

        state = self._read_state(path)
        model = models.efficientnet_b0(weights=None)
        if "classifier.5.weight" in state:  # two-layer head (mammogram file)
            hidden = state["classifier.1.weight"].shape[0]
            model.classifier = nn.Sequential(
                nn.Dropout(0.4), nn.Linear(1280, hidden), nn.BatchNorm1d(hidden),
                nn.ReLU(), nn.Dropout(0.4), nn.Linear(hidden, 3),
            )
        else:
            model.classifier = nn.Sequential(nn.Dropout(0.4), nn.Linear(1280, 3))
        model.load_state_dict(state, strict=True)
        return model.eval()

    def _load_tabnet(self, model_dir: str):
        from pytorch_tabnet.tab_model import TabNetClassifier

        path = os.path.join(model_dir, "tabnet_universal_clinical_model.zip")
        if not os.path.isfile(path):
            raise FileNotFoundError(path)
        clf = TabNetClassifier()
        clf.load_model(path)
        return clf

    # running -------------------------------------------------------------

    def components(self) -> dict[str, ComponentState]:
        return dict(self._state)

    def run(self, image: bytes, clinical: Optional[ClinicalData]) -> RawOutputs:
        from PIL import Image

        torch = self._torch
        raw = RawOutputs()
        tensor = self.transform(Image.open(io.BytesIO(image)).convert("RGB")).unsqueeze(0)

        with torch.no_grad():
            if self.type_model is None:
                raw.errors.append("The image type detector is not loaded, so the image was not scored.")
            else:
                probs = torch.softmax(self.type_model(tensor), dim=1)[0]
                idx = int(probs.argmax())
                raw.modality = MODALITY_ORDER[idx]
                raw.modality_confidence = float(probs[idx])
                model = self.specialists.get(raw.modality)
                if raw.modality in VERIFIED_SPECIALISTS:
                    if model is None:
                        raw.errors.append(f"The {raw.modality} model is not loaded.")
                    else:
                        raw.specialist_probs = torch.softmax(model(tensor), dim=1)[0].tolist()

        if clinical is not None and self.tabnet is not None:
            import numpy as np

            row = np.array([clinical_feature_row(clinical)], dtype=np.float32)
            raw.clinical_probs = self.tabnet.predict_proba(row)[0].tolist()
        return raw
