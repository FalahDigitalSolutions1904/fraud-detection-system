import sqlite3
import os

DB_PATH = "data/audit_log.db"

def init_db():
    """Creates the audit log table if it doesn't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transaction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            amount REAL,
            v1 REAL,
            v2 REAL,
            fraud_probability REAL,
            prediction INTEGER,
            latency_ms REAL
        )
    ''')
    conn.commit()
    conn.close()

def log_transaction(amount, v1, v2, prob, pred, latency):
    """Logs an incoming transaction and its prediction metrics."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transaction_logs (amount, v1, v2, fraud_probability, prediction, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (amount, v1, v2, prob, pred, latency))
    conn.commit()
    conn.close()

def fetch_metrics(limit=500):
    """Fetches the latest transaction metrics for the dashboard."""
    try:
        conn = sqlite3.connect(DB_PATH)
        # using row_factory to get dicts
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM transaction_logs ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        return []

if __name__ == "__main__":
    init_db()
    print("🗄️ Audit log database initialized successfully!")
