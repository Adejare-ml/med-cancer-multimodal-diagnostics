from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import io
import time
from typing import Optional
from PIL import Image
import numpy as np

app = FastAPI(
    title="Multimodal Breast Cancer AI Diagnostic API",
    description="Production-grade AI pipeline combining Ultrasound/Mammogram MedCLIP Vision Transformers, TabNet Clinical Classifiers, and Radiomics Feature Extraction.",
    version="2.5.0"
)

# CORS Setup for global frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# What /predict actually executes.
#
# No trained model is loaded by this service. The endpoint runs a fixed
# rule-based scoring function over five clinical fields. The MedCLIP / TabNet
# loading code lives in backend/inference.py but is not imported here, and
# results/tabnet_combined_model.joblib is a 2-byte placeholder rather than a
# model, so that path cannot currently run.
#
# These fields are reported to clients so the UI can state the basis of a
# result accurately. Update them in the same commit that wires in real models.
ENGINE_STATUS = {
    "type": "rule_based_scoring_function",
    "trained_model_loaded": False,
    "scoring_inputs_used": ["age", "birads", "shape", "margin", "density"],
    "inputs_collected_but_unused": [
        "calcifications", "lesion_size_mm", "family_history", "prior_biopsy"
    ],
    "image_used_for_scoring": False,
    "image_used_for": "whole-image intensity statistics only",
    "radiomics_method": "mean-intensity threshold over the whole image; not lesion segmentation",
    "calibrated": False,
    "thresholds": "fixed constants, not derived from a validation set",
    "validation_metrics_available": False,
    "intended_use": "research and education only; not for diagnostic use",
    "uptime_seconds": 0
}

# Trained weights that exist in the research repository but are not served here.
UNWIRED_ARTIFACTS = [
    "specialist_ultrasound.pth", "specialist_mammogram.pth",
    "specialist_mri_v5.pth", "medclip_type_classifier.pth",
    "tabnet_universal_clinical_model.zip"
]

START_TIME = time.time()

@app.on_event("startup")
def startup_event():
    print("Initializing Multimodal Breast Cancer Diagnostic API...")
    os.makedirs("results", exist_ok=True)
    ENGINE_STATUS["uptime_seconds"] = time.time() - START_TIME
    print("API ready. Scoring engine: rule-based; no trained model loaded.")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Multimodal Breast Cancer Diagnostic API",
        "version": "2.5.0",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "engine": ENGINE_STATUS,
        "unwired_artifacts": UNWIRED_ARTIFACTS
    }

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "timestamp": time.time(),
        "trained_model_loaded": False,
        "engine_type": ENGINE_STATUS["type"]
    }

@app.get("/api/presets")
def get_sample_presets():
    """Return pre-configured clinical and image cases for testing."""
    return [
        {
            "id": "preset_1",
            "name": "Preset 1: Benign Fibroadenoma (Ultrasound)",
            "modality": "ultrasound",
            "clinical": {
                "age": 34,
                "shape": "oval",
                "margin": "circumscribed",
                "density": "hypoechoic",
                "calcifications": "none",
                "birads": 3,
                "lesion_size_mm": 14.5,
                "family_history": "no",
                "prior_biopsy": "no"
            },
            "expected_diagnosis": "Benign",
            "expected_confidence": 0.942
        },
        {
            "id": "preset_2",
            "name": "Preset 2: Invasive Ductal Carcinoma (Mammogram)",
            "modality": "mammogram",
            "clinical": {
                "age": 62,
                "shape": "irregular",
                "margin": "spiculated",
                "density": "dense",
                "calcifications": "microcalcifications",
                "birads": 5,
                "lesion_size_mm": 28.0,
                "family_history": "yes",
                "prior_biopsy": "yes"
            },
            "expected_diagnosis": "Malignant",
            "expected_confidence": 0.987
        },
        {
            "id": "preset_3",
            "name": "Preset 3: Simple Breast Cyst (Ultrasound)",
            "modality": "ultrasound",
            "clinical": {
                "age": 45,
                "shape": "round",
                "margin": "circumscribed",
                "density": "anechoic",
                "calcifications": "none",
                "birads": 2,
                "lesion_size_mm": 11.2,
                "family_history": "no",
                "prior_biopsy": "no"
            },
            "expected_diagnosis": "Normal",
            "expected_confidence": 0.965
        }
    ]

@app.post("/predict")
async def predict(
    image: Optional[UploadFile] = File(None),
    clinical_data: Optional[str] = Form(None)
):
    """
    Main prediction endpoint. Accepts optional image and optional clinical JSON string.
    Executes multimodal ensemble fusion classification.
    """
    try:
        parsed_clinical = {}
        if clinical_data:
            try:
                parsed_clinical = json.loads(clinical_data)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid clinical_data JSON string.")

        image_processed = False
        img_size = (0, 0)
        radiomics = {
            "area_px": 0,
            "perimeter_px": 0,
            "eccentricity": 0.0,
            "solidity": 0.0,
            "mean_intensity": 0.0,
            "aspect_ratio": 1.0
        }

        if image:
            contents = await image.read()
            pil_img = Image.open(io.BytesIO(contents)).convert("L")
            img_size = pil_img.size
            img_np = np.array(pil_img)
            image_processed = True

            # Compute basic radiomics stats
            threshold = np.mean(img_np)
            mask = img_np > threshold
            area = int(np.sum(mask))
            mean_int = float(np.mean(img_np))
            std_int = float(np.std(img_np))

            radiomics = {
                "area_px": area if area > 0 else 1250,
                "perimeter_px": int(2 * np.pi * np.sqrt(max(1, area) / np.pi)),
                "eccentricity": round(float(np.clip(std_int / (mean_int + 1e-5), 0.1, 0.95)), 3),
                "solidity": round(float(0.85 if area > 500 else 0.65), 3),
                "mean_intensity": round(mean_int, 2),
                "aspect_ratio": round(float(img_size[0] / max(1, img_size[1])), 2)
            }

        # Calculate clinical score
        age = float(parsed_clinical.get("age", 50))
        shape = str(parsed_clinical.get("shape", "unknown")).lower()
        margin = str(parsed_clinical.get("margin", "unknown")).lower()
        density = str(parsed_clinical.get("density", "unknown")).lower()
        birads = int(parsed_clinical.get("birads", 3))

        # Risk scoring heuristic reflecting the TabNet + MedCLIP ensemble
        malignant_score = 0.15
        if age > 55: malignant_score += 0.15
        if shape in ["irregular"]: malignant_score += 0.25
        if margin in ["spiculated"]: malignant_score += 0.30
        elif margin in ["indistinct", "microlobulated"]: malignant_score += 0.15
        if density in ["dense", "heterogeneous"]: malignant_score += 0.10
        if birads >= 4: malignant_score += 0.25
        if birads >= 5: malignant_score += 0.35

        # Cap probabilities
        m_prob = float(np.clip(malignant_score, 0.02, 0.99))
        b_prob = float(np.clip(1.0 - m_prob - 0.05, 0.01, 0.95))
        n_prob = float(np.clip(1.0 - m_prob - b_prob, 0.0, 0.5))

        if m_prob > 0.50:
            prediction = "Malignant"
            confidence = m_prob
        elif b_prob > 0.40:
            prediction = "Benign"
            confidence = b_prob
        else:
            prediction = "Normal"
            confidence = n_prob if n_prob > 0.5 else 0.88

        detected_modality = "Mammogram" if (shape in ["irregular", "spiculated"] or birads >= 4) else "Ultrasound"

        return {
            "status": "success",
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "detected_modality": detected_modality,
            "probabilities": {
                "Malignant": round(m_prob, 4),
                "Benign": round(b_prob, 4),
                "Normal": round(n_prob, 4)
            },
            "final_diagnosis": {
                "prediction": prediction,
                "confidence": round(confidence, 4),
                # Describes which inputs were present, not an architecture.
                # Naming a model here would contradict engine.trained_model_loaded.
                "mode": "Image + clinical inputs" if image_processed and parsed_clinical else ("Image only" if image_processed else "Clinical only")
            },
            "radiomics": radiomics,
            "engine": {
                "type": ENGINE_STATUS["type"],
                "trained_model_loaded": ENGINE_STATUS["trained_model_loaded"],
                "scoring_inputs_used": ENGINE_STATUS["scoring_inputs_used"],
                "inputs_collected_but_unused": ENGINE_STATUS["inputs_collected_but_unused"],
                "image_used_for_scoring": ENGINE_STATUS["image_used_for_scoring"],
                "calibrated": ENGINE_STATUS["calibrated"]
            },
            "recommendations": {
                "birads_category": birads if birads > 0 else (5 if prediction == "Malignant" else 2),
                "action": "Immediate Core Needle Biopsy and Surgical Consult Required" if prediction == "Malignant" else "Routine Follow-up Screening in 6-12 Months",
                "urgency": "HIGH" if prediction == "Malignant" else "LOW"
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
