import logging
import os
import gdown
from pathlib import Path

logger = logging.getLogger("ModelBootstrapper")

def initialize_model_assets(model_dir: str = "models"):
    """
    Bootstraps the environment by ensuring all necessary model weights 
    and scalers are present before the API starts.
    """
    model_path = Path(model_dir)
    weights_file = model_path / "model_weights.pth"
    
    # Required assets checklist
    required_assets = [
        "scaler_clinical.joblib",
        "scaler_image.joblib",
        "tabnet_combined_model.joblib"
    ]

    # 1. Handle Weights Download
    if not weights_file.exists():
        logger.warning("Model weights missing. Initiating secure download...")
        file_id = '1k_3siDeRQd6cgqu1_LzTvh9BM2xpFB3T'
        url = f'https://drive.google.com/uc?id={file_id}'
        try:
            gdown.download(url, str(weights_file), quiet=False)
            logger.info("Weights successfully bootstrapped.")
        except Exception as e:
            logger.critical(f"Bootstrap Failed: Could not retrieve weights: {e}")
            raise RuntimeError("Environment initialization failed: Weights unreachable.")

    # 2. Verify other assets
    for asset in required_assets:
        if not (model_path / asset).exists():
            logger.error(f"Critical asset missing: {asset}")
            raise FileNotFoundError(f"Required model asset {asset} not found in {model_dir}")

    logger.info("All model assets verified. Environment is ready for inference.")
