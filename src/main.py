from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from inference import MultimodalCancerPredictor
from schemas import ClinicalData, DiagnosticResponse
from bootstrapper import initialize_model_assets
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CancerAPI")

app = FastAPI(
    title="Multimodal Breast Cancer Diagnostic API",
    description="Production API for fusing MedCLIP imaging and TabNet clinical features.",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = None

@app.on_event("startup")
async def startup_event():
    global model_service
    try:
        logger.info("Starting system bootstrap...")
        # Separate bootstrapper handles I/O and weight verification
        initialize_model_assets(model_dir="models")
        
        logger.info("Initializing Multimodal Cancer Predictor service...")
        model_service = MultimodalCancerPredictor(model_dir="models") 
        logger.info("System fully operational.")
    except Exception as e:
        logger.critical(f"SYSTEM CRITICAL FAILURE: {e}")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Cancer Diagnostic API"}

@app.post("/predict", response_model=DiagnosticResponse)
async def predict(
    image: UploadFile = File(...),
    clinical_data: ClinicalData = Form(...) # Pydantic automatic validation
):
    """
    Performs multimodal diagnostic inference.
    - image: Medical scan (PNG/JPG)
    - clinical_data: Validated clinical features schema
    """
    if not model_service:
        raise HTTPException(status_code=503, detail="Model service is initializing or unavailable")

    try:
        # Offload heavy CPU/GPU inference to a threadpool to avoid blocking the event loop
        result = await run_in_threadpool(
            model_service.predict, 
            image.file, 
            clinical_data.dict()
        )
        
        return result
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected inference error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during diagnostic processing")
