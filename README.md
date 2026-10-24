# 🩺 Med-Cancer Multimodal Diagnostics
**Experimental Late-Fusion Multimodal Classification Research**

> **Research and education only.** This repository does not document clinical validation. It is not a clinically validated diagnostic tool; do not use its outputs for diagnosis, treatment, triage, or other patient-care decisions.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009685?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496EF?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## 🔬 Executive Summary
This repository is an experimental research prototype for late-fusion classification of breast ultrasound images with structured features. It explores whether image and tabular inputs provide complementary signals; it does not establish diagnostic accuracy or clinical benefit.

The architecture utilizes a complementary approach: **MedCLIP (ResNet50)** for semantic visual feature extraction and **TabNet** for capturing complex non-linear dependencies in tabular clinical data.

### 🏗️ Technical Architecture
The system operates on a dual-stream inference pipeline:

1.  **Imaging Stream (Computer Vision):** 
    - **Backbone:** MedCLIP (Contrastive Language-Image Pre-training for Medical Imaging).
    - **Role:** Extracts latent semantic representations from breast ultrasound/mammography scans.
2.  **Clinical Stream (Tabular Learning):**
    - **Backbone:** TabNet (Attentive Interpretable Tabular Learning).
    - **Role:** Processes structured patient records (e.g., age, mass shape, breast density) utilizing sequential attention to select the most relevant clinical features.
3.  **Late Fusion Layer:** 
    - The feature vectors from both streams are concatenated into a joint representation space.
    - A final classification head performs a softmax operation to output the final diagnostic probability.

**Reported project metric:** AUC **0.91** on the project data. This experimental result is not evidence of clinical performance or generalization to patients outside the evaluation data.

---

## 📂 Repository Engineering
The repository is organized following professional software engineering patterns to ensure scalability and maintainability.

```text
├── src/                    # Core Application Logic
│   ├── main.py             # Asynchronous FastAPI entry point
│   ├── inference.py        # Model orchestration and prediction engine
│   ├── requirements.txt    # Python dependency manifest
│   └── Dockerfile          # Multi-stage build for deployment
├── models/                 # Model Artifacts (Binary)
│   ├── tabnet_combined_model.joblib # Fusion model weights
│   ├── scaler_clinical.joblib       # Tabular feature scaling
│   └── scaler_image.joblib          # Imaging feature scaling
├── frontend/               # Model demo interface
│   ├── index.html          # Demo dashboard
│   ├── script.js          # API integration and state management
│   └── style.css           # Demo dashboard styling
└── notebooks/              # Research & Validation
    ├── medclip_training.ipynb       # Visual feature training logs
    ├── multimodal_fusion_analysis.ipynb # Fusion performance benchmarks
    └── project_text_progress.ipynb  # Research data processing pipeline
```

---

## 🚀 Deployment & Integration

### 1. Environment Setup
```bash
git clone https://github.com/Adejare-ml/med-cancer-multimodal-diagnostics.git
cd med-cancer-multimodal-diagnostics
```

### 2. Backend Orchestration
The backend is optimized for asynchronous inference via FastAPI.
```bash
cd src
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Demo Dashboard
The frontend is designed for zero-config deployment. Open `frontend/index.html` in a modern web browser to begin real-time multimodal inference.

### 4. Test & CI Checks
Run the browser-facing Vitest suite from the repository root:
```bash
npm ci
npm test
```

Run the backend contract tests with the lightweight API dependencies:
```bash
python -m pip install pytest httpx fastapi python-multipart pillow numpy pydantic
python -m pytest
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs both suites on pushes and pull requests to `main`.

---

## 🛠️ Engineering Stack
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **API** | FastAPI | High-performance asynchronous inference |
| **ML Framework** | PyTorch / TabNet | Deep Learning & Attentive Tabular Learning |
| **Vision** | MedCLIP | Medical semantic imaging extraction |
| **Serialization** | Joblib | Efficient binary model persistence |
| **Containerization**| Docker | Reproducible container environment |
| **Frontend** | Vanilla JS/CSS | Low-latency, zero-dependency demo UI |

---
**Maintainer:** [Adelugba Adejare](https://github.com/Adejare-ml)
