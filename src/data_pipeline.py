import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
import joblib
import os
import urllib.request

def load_and_prepare_data(data_path):
    """Loads the dataset and separates features from the target variable."""
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Downloading from Hugging Face mirror (this may take a minute)...")
        url = "https://huggingface.co/datasets/JEFFREY-VERDIERE/Creditcard/resolve/main/creditcard.csv"
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        urllib.request.urlretrieve(url, data_path)
        print("✅ Download complete!")
    
    print("📦 Loading dataset...")
    df = pd.read_csv(data_path)
    
    # 'Time' is usually just an offset; 'Amount' needs scaling.
    # V1-V28 are already PCA-transformed features.
    X = df.drop(columns=['Class', 'Time'])
    y = df['Class']
    
    return X, y

def robust_split_and_sample(X, y):
    """
    Splits data into train/test sets and applies SMOTE *only* to training data
    to strictly prevent data leakage.
    """
    print("🔀 Splitting data into Train (80%) and Test (20%) sets...")
    # stratify=y ensures both sets have the exact same proportion of fraud (~0.17%)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print(u"⚖️ Handling class imbalance with SMOTE on Training data...")
    print(f"   Before SMOTE - Training class distribution: {np.bincount(y_train)}")
    
    # Initialize SMOTE (sampling_strategy=0.1 brings fraud up to 10% of majority class, 
    # which is often better/faster for tree models than a pure 50/50 split)
    smote = SMOTE(sampling_strategy=0.1, random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    
    print(f"   After SMOTE  - Training class distribution: {np.bincount(y_train_resampled)}")
    
    return X_train_resampled, X_test, y_train_resampled, y_test

if __name__ == "__main__":
    # Quick sanity check run
    DATA_PATH = "data/creditcard.csv"
    
    try:
        X, y = load_and_prepare_data(DATA_PATH)
        X_train, X_test, y_train, y_test = robust_split_and_sample(X, y)
        print("✅ Data pipeline script verified successfully!")
    except Exception as e:
        print(f"❌ Error occurred: {e}")
