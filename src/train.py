import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, average_precision_score, confusion_matrix
from data_pipeline import load_and_prepare_data, robust_split_and_sample

def train_ensemble(X_train, y_train):
    """Trains an ensemble of XGBoost and LightGBM models."""
    print("🚀 Training XGBoost model...")
    # scale_pos_weight gives extra attention to the minority class
    xgb_model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=9,  # Complements SMOTE for imbalanced tree learning
        random_state=42,
        eval_metric="logloss",
        n_jobs=-1
    )
    xgb_model.fit(X_train, y_train)

    print("🚀 Training LightGBM model...")
    lgbm_model = LGBMClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=9,
        random_state=42,
        n_jobs=-1,
        verbose=-1
    )
    lgbm_model.fit(X_train, y_train)

    return xgb_model, lgbm_model

def evaluate_ensemble(xgb_model, lgbm_model, X_test, y_test, xgb_weight=0.5):
    """Evaluates the soft-voting ensemble using production-grade fraud metrics."""
    print("📊 Evaluating Ensemble Model on clean test data...")
    
    # Get probability predictions from both models
    xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
    lgbm_probs = lgbm_model.predict_proba(X_test)[:, 1]
    
    # Combine predictions via weighted average
    ensemble_probs = (xgb_weight * xgb_probs) + ((1 - xgb_weight) * lgbm_probs)
    
    # Convert probabilities to binary outcomes (Threshold default = 0.5)
    # In production, you'd optimize this threshold based on cost of fraud vs cost of false alarms
    preds = (ensemble_probs >= 0.5).astype(int)
    
    # Calculate PR-AUC (The gold standard for highly imbalanced data)
    pr_auc = average_precision_score(y_test, ensemble_probs)
    
    print("\n--- PERFORMANCE METRICS ---")
    print(f"🥇 Precision-Recall AUC (PR-AUC): {pr_auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, preds))
    
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, preds)
    print(f"   True Negatives (Legit caught): {cm[0][0]}")
    print(f"   False Positives (Legit flagged): {cm[0][1]}")
    print(f"   False Negatives (Fraud missed): {cm[1][0]}  <-- CRITICAL TO MINIMIZE")
    print(f"   True Positives (Fraud caught): {cm[1][1]}")
    
    return ensemble_probs

def save_models(xgb_model, lgbm_model, output_dir="models"):
    """Saves model artifacts to disk."""
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(xgb_model, os.path.join(output_dir, "xgb_model.pkl"))
    joblib.dump(lgbm_model, os.path.join(output_dir, "lgbm_model.pkl"))
    print(f"💾 Models successfully saved to the '{output_dir}/' directory.")

if __name__ == "__main__":
    DATA_PATH = "data/creditcard.csv"
    
    # 1. Fetch data from pipeline
    X, y = load_and_prepare_data(DATA_PATH)
    X_train, X_test, y_train, y_test = robust_split_and_sample(X, y)
    
    # 2. Train the ensemble
    xgb_mdl, lgbm_mdl = train_ensemble(X_train, y_train)
    
    # 3. Evaluate
    evaluate_ensemble(xgb_mdl, lgbm_mdl, X_test, y_test, xgb_weight=0.5)
    
    # 4. Save artifacts for the API layer
    save_models(xgb_mdl, lgbm_mdl)
