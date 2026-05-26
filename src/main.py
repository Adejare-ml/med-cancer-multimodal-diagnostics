from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference import MultimodalCancerPredictor
import json
import os
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CancerAPI")

app = FastAPI(
    title="Multimodal Breast Cancer Diagnostic API",
    description="Production API for fusing MedCLIP imaging and TabNet clinical features.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model service instance
model_service = None

@app.on_event("startup")
async def startup_event():
    global model_service
    try:
        logger.info("Initializing Multimodal Cancer Predictor service...")
        # Adjusted to use the new professional /models directory
        model_service = MultimodalCancerPredictor(model_dir="models") 
        logger.info("Model service successfully loaded and ready for inference.")
    except Exception as e:
        logger.critical(f"FAILED to load model service: {e}")

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and orchestration."""
    return {"status": "healthy", "service": "Cancer Diagnostic API"}

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    clinical_data: str = Form(...) 
):
    """
    Performs multimodal diagnostic inference.
    - image: Medical scan (PNG/JPG)
    - clinical_data: JSON string of clinical features
    """
    if not model_service:
        raise HTTPException(status_code=503, detail="Model service is initializing or unavailable")

    try:
        # Safe JSON parsing
        try:
            data_dict = json.loads(clinical_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for clinical_data")

        # Professional Inference Call
        result = model_service.predict(image.file, data_dict)
        
        # Convert dataclass to dict for JSON response
        return {
            "prediction": result.prediction,
            "confidence": result.confidence,
            "probabilities": result.probabilities
        }
        
    except ValueError as ve:
        # Handle specific preprocessing errors (e.g. bad image format)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected inference error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during diagnostic processing")
