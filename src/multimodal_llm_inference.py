import logging
import os
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from PIL import Image

logger = logging.getLogger("UnifiedMultimodalLLM")

@dataclass
class LLMDiagnosticResult:
    """Structured container for LLM multimodal diagnostic predictions."""
    prediction: str
    confidence: float
    reasoning: str
    recommendations: str

class UnifiedMultimodalLLMPredictor:
    """
    Next-Generation Unified Multimodal Predictor for Breast Cancer Diagnostics.
    Processes medical image (mammogram/ultrasound) and clinical data simultaneously
    using unified multimodal vision-language models.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = "gemini-1.5-pro-latest"
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY found. Unified Multimodal LLM running in dry-run/mock mode.")
            self.client = None
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
            self.client = True
            logger.info(f"Initialized Unified Multimodal VLM: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Generative AI client: {e}")
            self.client = None

    def predict(self, image_file, clinical_data: Dict[str, Any]) -> LLMDiagnosticResult:
        """Executes unified multimodal vision-text reasoning."""
        # Standardize clinical text representation
        clinical_summary = "\n".join([f"- {k.replace('_', ' ').title()}: {v}" for k, v in clinical_data.items()])
        
        prompt = f"""
        You are an expert diagnostic assistant specializing in multimodal oncology.
        Analyze the provided mammogram/ultrasound image alongside the following clinical parameters:
        
        CLINICAL PARAMETERS:
        {clinical_summary}
        
        Provide your diagnosis strictly in valid JSON format with the following keys:
        - "prediction": Exactly one of ["Normal", "Benign", "Malignant"]
        - "confidence": Float between 0.0 and 1.0 representing confidence
        - "reasoning": Concise medical justification referencing image markers and clinical risk factors
        - "recommendations": Suggested clinical next steps (e.g., follow-up BI-RADS assessment, biopsy, or routine screening)
        """

        if not self.client:
            # Fallback mock execution for offline testing
            logger.info("Executing mock unified LLM inference (Offline mode)")
            return LLMDiagnosticResult(
                prediction="Benign",
                confidence=0.88,
                reasoning="Mock Reasoning: Well-circumscribed calcification in lower quadrant with low clinical risk factors.",
                recommendations="6-month follow-up ultrasound."
            )

        try:
            image = Image.open(image_file).convert('RGB')
            response = self.model.generate_content([prompt, image])
            raw_text = response.text.strip()
            
            # Clean JSON markdown if wrapped in ```json ... ```
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            
            data = json.loads(raw_text.strip())
            return LLMDiagnosticResult(
                prediction=data.get("prediction", "Unknown"),
                confidence=float(data.get("confidence", 0.0)),
                reasoning=data.get("reasoning", ""),
                recommendations=data.get("recommendations", "")
            )
        except Exception as e:
            logger.error(f"Unified Multimodal LLM inference failed: {e}")
            return LLMDiagnosticResult(
                prediction="Error",
                confidence=0.0,
                reasoning=f"Inference error: {str(e)}",
                recommendations="Manual clinical review required."
            )
