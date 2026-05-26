import logging
from typing import Dict, Any, Tuple
from dataclasses import dataclass
import torch
import numpy as np
import pandas as pd
import joblib
import os
import gdown
from PIL import Image
from torchvision import transforms
from medclip import MedCLIPModel
from pytorch_tabnet.tab_model import TabNetClassifier

# Professional Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("MedCancerInference")

@dataclass
class PredictionResult:
    """Structured container for diagnostic predictions."""
    prediction: str
    confidence: float
    probabilities: Dict[str, float]

class MultimodalCancerPredictor:
    """
    Production-grade predictor for Multimodal Breast Cancer Detection.
    Fuses MedCLIP (Imaging) and TabNet (Clinical) features.
    """
    
    def __init__(self, model_dir: str = "models"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Initializing Multimodal Predictor on device: {self.device}")

        # Path configurations
        self.weights_path = os.path.join(model_dir, "model_weights.pth")
        self.scaler_clinical_path = os.path.join(model_dir, "scaler_clinical.joblib")
        self.scaler_image_path = os.path.join(model_dir, "scaler_image.joblib")
        self.tabnet_model_path = os.path.join(model_dir, "tabnet_combined_model.joblib")

        self._ensure_weights_exist()
        self._load_assets()
        
        # Image Pre-processing Pipeline
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
        ])
        
        # Diagnostic Mapping
        self.labels = {0: 'Normal', 1: 'Benign', 2: 'Malignant'}
        logger.info("Model service successfully initialized.")

    def _ensure_weights_exist(self) -> None:
        """Downloads model weights from secure storage if missing."""
        if not os.path.exists(self.weights_path):
            logger.warning("Model weights not found locally. Initiating download...")
            file_id = '1k_3siDeRQd6cgqu1_LzTvh9BM2xpFB3T'
            url = f'https://drive.google.com/uc?id={file_id}'
            try:
                gdown.download(url, self.weights_path, quiet=False)
                logger.info("Weights downloaded successfully.")
            except Exception as e:
                logger.error(f"Failed to download weights: {e}")
                raise RuntimeError("Critical failure: Could not retrieve model weights.")

    def _load_assets(self) -> None:
        """Loads scalers and model architectures into memory."""
        try:
            # Load Scalers
            self.scaler_clinical = joblib.load(self.scaler_clinical_path)
            self.scaler_image = joblib.load(self.scaler_image_path)

            # Load MedCLIP (Image Encoder)
            self.medclip = MedCLIPModel()
            self.medclip.load_state_dict(torch.load(self.weights_path, map_location=self.device))
            self.medclip.to(self.device)
            self.medclip.eval()

            # Load TabNet (Classifier)
            self.tabnet = joblib.load(self.tabnet_model_path)
            
        except FileNotFoundError as e:
            logger.error(f"Missing required model asset: {e}")
            raise RuntimeError(f"Model asset missing: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during asset loading: {e}")
            raise RuntimeError(f"Initialization failed: {e}")

    def preprocess_image(self, image_file) -> np.ndarray:
        """
        Transforms raw image into scaled MedCLIP embeddings.
        
        Args:
            image_file: File-like object or path to image.
        Returns:
            Scaled numpy array of image features.
        """
        try:
            image = Image.open(image_file).convert('RGB')
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                embedding = self.medclip.encode_image(img_tensor)
                embedding_np = embedding.cpu().numpy()
                
            return self.scaler_image.transform(embedding_np)
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise ValueError(f"Invalid image format or corrupted file: {e}")

    def preprocess_clinical(self, data_dict: Dict[str, Any]) -> np.ndarray:
        """
        Transforms clinical data dictionary into scaled feature vector.
        
        Args:
            data_dict: Dictionary containing patient clinical features.
        Returns:
            Scaled numpy array of clinical features.
        """
        try:
            df = pd.DataFrame([data_dict])
            return self.scaler_clinical.transform(df.values)
        except Exception as e:
            logger.error(f"Clinical data preprocessing failed: {e}")
            raise ValueError(f"Invalid clinical data structure: {e}")

    def predict(self, image_file, clinical_data: Dict[str, Any]) -> PredictionResult:
        """
        Executes multimodal late-fusion inference.
        
        Args:
            image_file: Image input.
            clinical_data: Tabular input.
        Returns:
            PredictionResult containing label, confidence, and full probability distribution.
        """
        # 1. Feature Extraction
        img_feats = self.preprocess_image(image_file)
        clin_feats = self.preprocess_clinical(clinical_data)
        
        # 2. Late Fusion (Concatenation)
        X_combined = np.hstack([img_feats, clin_feats])
        
        # 3. Inference
        prediction_idx = self.tabnet.predict(X_combined)[0]
        probabilities = self.tabnet.predict_proba(X_combined)[0]
        
        logger.info(f"Prediction complete. Result: {self.labels[int(prediction_idx)]} (Conf: {np.max(probabilities):.2f})")
        
        return PredictionResult(
            prediction=self.labels[int(prediction_idx)],
            confidence=float(np.max(probabilities)),
            probabilities={self.labels[i]: float(p) for i, p in enumerate(probabilities)}
        )
