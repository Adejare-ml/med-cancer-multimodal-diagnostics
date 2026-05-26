# 🩺 med-cancer-multimodal-diagnostics
**Late-Fusion Multimodal Architecture for Breast Cancer Detection**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009685?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496EF?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)

## 🔬 Project Overview
This system implements a state-of-the-art **late-fusion multimodal pipeline** designed to improve the diagnostic accuracy of breast cancer detection by combining medical imaging and structured clinical data. 

Conventional systems often rely on a single modality; this project fuses visual features from medical scans with tabular clinical markers to provide a more holistic diagnostic perspective.

### 🏗️ Technical Architecture
The system utilizes a dual-branch architecture:
1.  **Imaging Branch (MedCLIP/ResNet50):** Extracts high-level semantic features from breast ultrasound/mammography images.
2.  **Clinical Branch (TabNet):** Processes structured patient data (age, mass shape, density) using a TabNet architecture to capture complex non-linear relationships in tabular data.
3.  **Fusion Layer:** A late-fusion strategy where the outputs of both branches are concatenated and passed through a final classification head to produce the diagnostic result.

**Performance:** Achieved a **0.91 AUC**, demonstrating superior robustness over single-modality baselines.

---

## 📂 Repository Structure
```text
├── backend/
│   ├── main.py             # FastAPI application entry point
│   ├── inference.py        # Model loading and prediction logic
│   ├── requirements.txt    # Production dependencies
│   ├── Dockerfile         # Containerization config
│   └── results/            # Serialized model weights (.joblib)
├── frontend/
│   ├── index.html          # Clinician-facing UI
│   ├── script.js           # API integration & state management
│   └── style.css           # Professional medical UI styling
└── notebooks/
    ├── medclip_training.ipynb       # Image branch training pipeline
    └── project_text_progress.ipynb   # Tabular branch experimentation
```

---

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/Adejare-ml/med-cancer-multimodal-diagnostics.git
cd med-cancer-multimodal-diagnostics
```

### 2. Backend Deployment
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Access
Open `frontend/index.html` in any modern browser to interact with the diagnostic system.

---

## 🛠️ Engineering Specifications
- **API Framework:** FastAPI (Asynchronous inference)
- **Model Serialization:** Joblib
- **Frontend:** Vanilla JS/CSS (Optimized for clinical low-latency)
- **Deployment:** Docker-ready for scalable healthcare environments.

---
*Developed by Adelugba Adejare*
