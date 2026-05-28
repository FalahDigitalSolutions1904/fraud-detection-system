import time
import requests
import pandas as pd
import json

def simulate():
    print("Loading dataset...")
    df = pd.read_csv('data/creditcard.csv')
    
    # Let's get some fraud and some normal
    fraud = df[df['Class'] == 1].sample(5, replace=True)
    normal = df[df['Class'] == 0].sample(20, replace=True)
    
    # Combine and shuffle
    sample = pd.concat([fraud, normal]).sample(frac=1).reset_index(drop=True)
    
    print(f"Sending {len(sample)} test requests to the API...")
    url = 'http://localhost:5000/predict'
    
    for idx, row in sample.iterrows():
        # The API expects Amount, then V1 to V28
        features = [row['Amount']] + row[['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 
                                         'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20', 
                                         'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28']].tolist()
        
        payload = {"features": features}
        
        try:
            response = requests.post(url, json=payload)
            print(f"Sent tx {idx+1}: True Class={int(row['Class'])} | API Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")
            
        # Wait a little bit to simulate real-time traffic
        time.sleep(1)
        
    print("Simulation complete! Check your dashboard.")

if __name__ == '__main__':
    simulate()
