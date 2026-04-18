🧠 Breast Cancer Detection Web App

We built this project to make breast cancer detection more accessible by combining machine learning with a simple, user-friendly web interface. The goal is to bridge the gap between complex diagnostic models and real-world usability.

🚀 Overview

This application allows users to input medical data or upload relevant information and receive predictions powered by a trained machine learning model.

We focused on:

Making predictions fast and accessible
Keeping the interface simple and intuitive
Building a system that can realistically be extended into real-world healthcare tools
🏗️ System Architecture

Our pipeline is structured end-to-end:

Data Processing
We clean and preprocess medical data to ensure consistency and reliability.
Model Training
We train a classification model to detect the likelihood of breast cancer.
Backend API
We expose the model through an API for real-time predictions.
Frontend Interface
We provide a web interface where users can interact with the system easily.
🧪 Model Details

We experimented with multiple approaches and selected a model based on performance and generalization.

Task: Binary Classification (Benign vs Malignant)
Metrics: Accuracy, Precision, Recall
Focus: Reducing false negatives (critical in medical diagnosis)
💻 Tech Stack

We used tools that allow us to move from experimentation to deployment:

Python for model development
Scikit-learn / PyTorch (depending on your actual model)
Flask / FastAPI for backend API
HTML / CSS / JavaScript for frontend
Docker (if applicable) for containerization
⚙️ Getting Started
1. Clone the repository
git clone https://github.com/Adejare-ml/Breast_cancer_detention_webpage.git
cd Breast_cancer_detention_webpage
2. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
3. Install dependencies
pip install -r requirements.txt
4. Run the application
python app.py
5. Open in browser
http://127.0.0.1:5000
