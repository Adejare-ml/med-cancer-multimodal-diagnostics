import hashlib
import logging
import os
import gdown
from pathlib import Path

logger = logging.getLogger("ModelBootstrapper")

# Known secure hash for model_weights.pth
EXPECTED_WEIGHTS_HASH = "beb0bb417224b29b90abe3f717c18c6687138a3ad4abcfb963254ec730327546"  # SHA256

def verify_file_hash(filepath: Path, expected_hash: str) -> bool:
    """Verifies that the file at filepath matches the expected SHA256 hash."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest() == expected_hash


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

            # Verify the file's hash before proceeding
            if not weights_file.exists():
                raise FileNotFoundError("Weights file was not downloaded.")

            if not verify_file_hash(weights_file, EXPECTED_WEIGHTS_HASH):
                # Remove the compromised file
                weights_file.unlink()
                raise ValueError("Downloaded weights file failed hash verification. The file may be compromised.")

            logger.info("Weights successfully bootstrapped and verified.")
        except Exception as e:
            logger.critical(f"Bootstrap Failed: Could not retrieve or verify weights: {e}")
            raise RuntimeError(f"Environment initialization failed: {e}")

    # 2. Verify other assets
    for asset in required_assets:
        if not (model_path / asset).exists():
            logger.error(f"Critical asset missing: {asset}")
            raise FileNotFoundError(f"Required model asset {asset} not found in {model_dir}")

    logger.info("All model assets verified. Environment is ready for inference.")
