# 🩺 Med-Cancer Multimodal Diagnostics
**Late-Fusion Multimodal Architecture for High-Precision Breast Cancer Detection**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009685?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496EF?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## 🔬 Executive Summary
This project implements a production-grade **late-fusion multimodal diagnostic pipeline** designed to increase the sensitivity and specificity of breast cancer detection. By synthesizing high-dimensional visual features from medical imaging with structured clinical markers, the system overcomes the limitations of single-modality analysis.

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

**Engineering Metric:** Achieved a **0.91 AUC**, significantly outperforming baseline single-modality models in robustness and generalization.

---

## 📂 Repository Engineering
The repository is organized following professional software engineering patterns to ensure scalability and maintainability.

```text
├── src/                    # Core Application Logic
│   ├── main.py             # Asynchronous FastAPI entry point
│   ├── inference.py        # Model orchestration and prediction engine
│   ├── requirements.txt    # Production dependency manifest
│   └── Dockerfile          # Multi-stage build for deployment
├── models/                 # Model Artifacts (Binary)
│   ├── tabnet_combined_model.joblib # Fusion model weights
│   ├── scaler_clinical.joblib       # Tabular feature scaling
│   └── scaler_image.joblib          # Imaging feature scaling
├── frontend/               # Clinician Interface
│   ├── index.html          # Low-latency diagnostic dashboard
│   ├── script.js          # API integration and state management
│   └── style.css           # Clinical-grade UI styling
└── notebooks/              # Research & Validation
    ├── medclip_training.ipynb       # Visual feature training logs
    ├── multimodal_fusion_analysis.ipynb # Fusion performance benchmarks
    └── project_text_progress.ipynb  # Clinical data processing pipeline
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

### 3. Clinician Dashboard
The frontend is designed for zero-config deployment. Open `frontend/index.html` in a modern web browser to begin real-time multimodal inference.

---

## 🛠️ Engineering Stack
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **API** | FastAPI | High-performance asynchronous inference |
| **ML Framework** | PyTorch / TabNet | Deep Learning & Attentive Tabular Learning |
| **Vision** | MedCLIP | Medical semantic imaging extraction |
| **Serialization** | Joblib | Efficient binary model persistence |
| **Containerization**| Docker | Reproducible clinical environment |
| **Frontend** | Vanilla JS/CSS | Low-latency, zero-dependency clinician UI |

---
**Maintainer:** [Adelugba Adejare](https://github.com/Adejare-ml)
