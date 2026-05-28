# Real-Time Fraud Detection System

A complete, production-ready machine learning pipeline for detecting fraudulent transactions in real-time.

## Components
1. **Inference API (`app.py`)**: A Flask-based REST API that hosts an ensemble of XGBoost and LightGBM models for real-time scoring.
2. **Monitoring Dashboard (`dashboard.py`)**: A Streamlit web dashboard providing live tracking of API latency, prediction distributions, and system health metrics.
3. **Training Pipeline (`src/train.py`)**: Automated script to retrain the models and save artifacts.

## Getting Started
1. Install dependencies: `pip install -r requirements.txt`
2. Start the API: `python app.py`
3. Start the dashboard: `streamlit run dashboard.py`