"""Multimodal Breast Cancer Diagnostic API.

Two scoring paths live here, and the response always says which one ran.

1. The trained path: MedCLIP image embeddings fused with a TabNet clinical
   classifier, loaded by inference.MultimodalCancerPredictor.
2. A fixed rule-based scoring function over five clinical fields, used when the
   trained assets are unavailable.

Path 2 is not a model. It is a set of weights written into this file by hand;
they were never fitted to, or validated against, any dataset, and the uploaded
image does not influence the score at all. The interface renders an "Analysis
Basis" panel from the `engine` block below, so whatever this file reports is
what the user is told. Keep it accurate: update ENGINE_STATUS in the same
commit that changes how scoring works.
"""

import io
import json
import logging
import os
import time
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import ValidationError

from schemas import ClinicalData, DiagnosticResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CancerAPI")

app = FastAPI(
    title="Multimodal Breast Cancer Diagnostic API",
    description=(
        "Research API for breast imaging. Serves a MedCLIP + TabNet fusion model "
        "when its assets are present, and a documented rule-based scoring "
        "function otherwise. The response always reports which path ran."
    ),
    version="1.2.0",
)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost,http://localhost:8000,http://127.0.0.1,http://127.0.0.1:8000,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The five fields the rule-based path reads, and the four it ignores.
SCORING_INPUTS = ["age", "birads", "shape", "margin", "density"]
UNUSED_INPUTS = ["calcifications", "lesion_size_mm", "family_history", "prior_biopsy"]

START_TIME = time.time()
model_service = None


def engine_status() -> dict:
    """Describes the path that will actually serve the next request."""
    if model_service is not None:
        return {
            "type": "medclip_tabnet_late_fusion",
            "trained_model_loaded": True,
            "scoring_inputs_used": SCORING_INPUTS + UNUSED_INPUTS,
            "inputs_collected_but_unused": [],
            "image_used_for_scoring": True,
            "calibrated": False,
        }
    return {
        "type": "rule_based_scoring_function",
        "trained_model_loaded": False,
        "scoring_inputs_used": SCORING_INPUTS,
        "inputs_collected_but_unused": UNUSED_INPUTS,
        "image_used_for_scoring": False,
        "calibrated": False,
    }


@app.on_event("startup")
async def startup_event():
    """Loads the trained model if its assets are genuinely usable.

    Imports are deliberately deferred: inference.py pulls in torch, medclip and
    pytorch_tabnet, and a top-level import would take the whole service down on
    a machine that only needs the rule-based path.
    """
    global model_service
    try:
        from bootstrapper import initialize_model_assets
        from inference import MultimodalCancerPredictor

        logger.info("Starting system bootstrap...")
        initialize_model_assets(model_dir="models")

        logger.info("Initializing Multimodal Cancer Predictor service...")
        model_service = MultimodalCancerPredictor(model_dir="models")
        logger.info("Trained model loaded. Serving MedCLIP + TabNet fusion.")
    except Exception as exc:
        model_service = None
        logger.warning(
            "Trained model unavailable (%s). Serving the rule-based scoring "
            "function instead; responses will report trained_model_loaded=false.",
            exc,
        )


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Multimodal Breast Cancer Diagnostic API",
        "version": app.version,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "engine": engine_status(),
    }


@app.get("/health")
def health_check():
    status = engine_status()
    return {
        "status": "online",
        "timestamp": time.time(),
        "trained_model_loaded": status["trained_model_loaded"],
        "engine_type": status["type"],
    }


@app.get("/api/presets")
def get_sample_presets():
    """Pre-configured clinical cases for testing the interface."""
    return [
        {
            "id": "preset_1",
            "name": "Preset 1: Benign Fibroadenoma (Ultrasound)",
            "modality": "ultrasound",
            "clinical": {
                "age": 34, "shape": "oval", "margin": "circumscribed",
                "density": "hypoechoic", "calcifications": "none", "birads": 3,
                "lesion_size_mm": 14.5, "family_history": "no", "prior_biopsy": "no",
            },
        },
        {
            "id": "preset_2",
            "name": "Preset 2: Suspicious Mass (Mammogram)",
            "modality": "mammogram",
            "clinical": {
                "age": 62, "shape": "irregular", "margin": "spiculated",
                "density": "dense", "calcifications": "microcalcifications", "birads": 5,
                "lesion_size_mm": 28.0, "family_history": "yes", "prior_biopsy": "yes",
            },
        },
        {
            "id": "preset_3",
            "name": "Preset 3: Simple Breast Cyst (Ultrasound)",
            "modality": "ultrasound",
            "clinical": {
                "age": 45, "shape": "round", "margin": "circumscribed",
                "density": "anechoic", "calcifications": "none", "birads": 2,
                "lesion_size_mm": 11.2, "family_history": "no", "prior_biopsy": "no",
            },
        },
    ]


def whole_image_statistics(img_np: np.ndarray, size: tuple) -> dict:
    """Intensity statistics over the entire image.

    These are NOT lesion segmentation output. Nothing here locates or measures
    a lesion; the values describe every pixel in the frame, background included.
    """
    threshold = float(np.mean(img_np))
    mask = img_np > threshold
    area = int(np.sum(mask))
    mean_int = float(np.mean(img_np))
    std_int = float(np.std(img_np))

    return {
        "area_px": area if area > 0 else 1250,
        "perimeter_px": int(2 * np.pi * np.sqrt(max(1, area) / np.pi)),
        "eccentricity": round(float(np.clip(std_int / (mean_int + 1e-5), 0.1, 0.95)), 3),
        "solidity": round(0.85 if area > 500 else 0.65, 3),
        "mean_intensity": round(mean_int, 2),
        "aspect_ratio": round(float(size[0] / max(1, size[1])), 2),
    }


def rule_based_score(clinical: ClinicalData) -> dict:
    """Fixed weighted rules over five clinical fields.

    Every constant below was chosen by hand. None was fitted to data, and none
    has been validated against an outcome. The image is not an argument to this
    function because it does not participate in the score.
    """
    shape = clinical.shape.lower()
    margin = clinical.margin.lower()
    density = clinical.density.lower()

    malignant_score = 0.15
    if clinical.age > 55:
        malignant_score += 0.15
    if shape == "irregular":
        malignant_score += 0.25
    if margin == "spiculated":
        malignant_score += 0.30
    elif margin in ("indistinct", "microlobulated"):
        malignant_score += 0.15
    if density in ("dense", "heterogeneous"):
        malignant_score += 0.10
    if clinical.birads >= 4:
        malignant_score += 0.25
    if clinical.birads >= 5:
        malignant_score += 0.35

    m_prob = float(np.clip(malignant_score, 0.02, 0.99))
    b_prob = float(np.clip(1.0 - m_prob - 0.05, 0.01, 0.95))
    n_prob = float(np.clip(1.0 - m_prob - b_prob, 0.0, 0.5))

    if m_prob > 0.50:
        prediction, confidence = "Malignant", m_prob
    elif b_prob > 0.40:
        prediction, confidence = "Benign", b_prob
    else:
        prediction, confidence = "Normal", n_prob if n_prob > 0.5 else 0.88

    return {
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "probabilities": {
            "Malignant": round(m_prob, 4),
            "Benign": round(b_prob, 4),
            "Normal": round(n_prob, 4),
        },
    }


@app.post("/predict", response_model=DiagnosticResponse)
async def predict(
    image: Optional[UploadFile] = File(None),
    clinical_data: Optional[str] = Form(None),
):
    """Runs diagnostic inference.

    Both inputs are optional so the interface's clinical-only and image-only
    modes work. `clinical_data` is a JSON object string, matching what the
    frontend sends.
    """
    try:
        parsed = json.loads(clinical_data) if clinical_data else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="clinical_data is not valid JSON.")

    try:
        clinical = ClinicalData(**parsed)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    radiomics = None
    image_bytes = None
    if image is not None:
        contents = await image.read()
        try:
            pil_img = Image.open(io.BytesIO(contents)).convert("L")
            radiomics = whole_image_statistics(np.array(pil_img), pil_img.size)
            image_bytes = contents
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Image could not be decoded: {exc}"
            )

    if model_service is not None:
        if image_bytes is None:
            raise HTTPException(
                status_code=400,
                detail="The trained model requires an image. Supply one or disable it.",
            )
        try:
            result = await run_in_threadpool(
                model_service.predict, io.BytesIO(image_bytes), clinical.dict()
            )
            scored = {
                "prediction": result.prediction,
                "confidence": round(result.confidence, 4),
                "probabilities": {k: round(v, 4) for k, v in result.probabilities.items()},
            }
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.error("Unexpected inference error: %s", exc)
            raise HTTPException(status_code=500, detail="Inference failed.")
    else:
        scored = rule_based_score(clinical)

    # Describes which inputs were present, not an architecture. Naming a model
    # here would contradict engine.trained_model_loaded.
    detected_modality = (
        "Mammogram" if clinical.shape.lower() == "irregular" or clinical.birads >= 4
        else "Ultrasound"
    )

    return {
        "status": "success",
        **scored,
        "detected_modality": detected_modality,
        "engine": engine_status(),
        "radiomics": radiomics,
        "recommendations": {
            "birads_category": clinical.birads,
            "action": (
                "Immediate Core Needle Biopsy and Surgical Consult Required"
                if scored["prediction"] == "Malignant"
                else "Routine Follow-up Screening in 6-12 Months"
            ),
            "urgency": "HIGH" if scored["prediction"] == "Malignant" else "LOW",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
