---

# 🩺 Multimodal Breast Cancer Diagnostic Webpage

Welcome! We are proud to present the web-hosting repository for our **Multimodal Breast Cancer Diagnostic System**. This platform serves as the interactive gateway to our late-fusion machine learning models, allowing clinicians and researchers to leverage AI for more accurate diagnostic predictions.

## 🚀 Our Mission
Our goal was to create a seamless, high-performance web interface that integrates both medical imaging and clinical data. By hosting our models through this application, we provide a unified environment where data science meets clinical utility.

## 🛠️ Architecture & Integration
This repository handles the deployment of our dual-modality pipeline:

* **The Frontend:** A responsive, clinician-focused interface designed for easy data entry and image uploads.
* **The Backend:** Powered by **FastAPI**, we’ve optimized the system for low-latency inference and asynchronous handling of medical images.
* **Model Fusion:** The platform integrates our **MedCLIP (ResNet50)** image branch and **TabNet** clinical branch, executing a late-fusion strategy to deliver a final diagnostic result.

## ✨ Key Platform Features
* **Dual-Input Processing:** We’ve built the interface to accept both structured clinical parameters (age, mass shape, etc.) and medical scan uploads simultaneously.
* **Real-Time Inference:** Get immediate diagnostic insights powered by our fine-tuned models.
* **Deployment Ready:** We have structured this repo for easy hosting, ensuring our weight-transfer techniques and "network surgery" results are accessible in a live environment.
* **Flexibility:** While we advocate for multimodal use, we’ve ensured the platform can handle single-modality inputs when necessary.

## 💻 Getting Started

To get our diagnostic tool running in your local or hosted environment, follow these steps:

### 1. Clone the Webpage Repository
```bash
git clone https://github.com/Adejare-ml/Breast_cancer_detention_webpage.git
cd Breast_cancer_detention_webpage
```

### 2. Install Dependencies
We recommend using a virtual environment to keep our workspace clean:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Launch the Application
Start the FastAPI server to host the webpage:
```bash
uvicorn main:app --reload
```

## 🤝 The Team Behind the Project
This platform is the result of our combined efforts in exploring on-device intelligence and multimodal medical AI. We believe in making diagnostic tools more accessible, and this hosted solution is a major step toward that vision.

---
*Developed and maintained by Daniel (Adejare Adelugba) and the Project Team.*
