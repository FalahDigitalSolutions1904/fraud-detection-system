import time
import joblib
import numpy as np
from flask import Flask, request, jsonify
from src.database import init_db, log_transaction

app = Flask(__name__)

# Initialize the database on startup
init_db()

# Load model artifacts globally to minimize prediction latency
try:
    XGB_MODEL = joblib.load("models/xgb_model.pkl")
    LGBM_MODEL = joblib.load("models/lgbm_model.pkl")
    print("✅ Ensemble models loaded into memory successfully.")
except FileNotFoundError:
    print("❌ Error: Saved model files not found. Please run src/train.py first.")
    exit(1)

@app.route("/predict", methods=["POST"])
def predict():
    start_time = time.time()
    
    try:
        # Extract features from JSON payload
        data = request.get_json(force=True)
        features = data.get("features")
        
        if not features or len(features) != 29:
            return jsonify({"error": "Invalid input. Expected an array of 29 features (Amount + V1 to V28)"}), 400
        
        # Convert to numpy array and reshape for single-instance inference
        input_data = np.array(features).reshape(1, -1)
        
        # 1. Soft-voting Ensemble Probability Inference
        xgb_prob = XGB_MODEL.predict_proba(input_data)[0, 1]
        lgbm_prob = LGBM_MODEL.predict_proba(input_data)[0, 1]
        
        # 50/50 weighted average match from src/train.py
        ensemble_prob = float((0.5 * xgb_prob) + (0.5 * lgbm_prob))
        prediction = 1 if ensemble_prob >= 0.5 else 0
        
        # Calculate endpoint latency in milliseconds
        latency_ms = (time.time() - start_time) * 1000
        
        # 2. Async-ready DB logging (capturing context for Step 4 Dashboard)
        # Logging Amount (index 0), V1 (index 1), V2 (index 2) along with output
        log_transaction(
            amount=float(features[0]),
            v1=float(features[1]),
            v2=float(features[2]),
            prob=ensemble_prob,
            pred=prediction,
            latency=latency_ms
        )
        
        # 3. Return client response
        return jsonify({
            "status": "success",
            "fraud_probability": round(ensemble_prob, 4),
            "prediction": prediction,
            "latency_ms": round(latency_ms, 2)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Inference processing failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint for monitoring uptime/CI/CD verification."""
    return jsonify({"status": "healthy", "timestamp": time.time()}), 200

if __name__ == "__main__":
    # In production, this would be served via gunicorn/uWSGI
    app.run(host="0.0.0.0", port=5000, debug=False)
