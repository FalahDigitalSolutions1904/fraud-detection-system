import streamlit as st
import pandas as pd
import sqlite3
import plotly.express as px
import time

# Configure page settings
st.set_page_config(
    page_title="Production Fraud Monitoring Dashboard",
    page_icon="🛡️",
    layout="wide"
)

DB_PATH = "data/audit_log.db"

def fetch_metrics_data():
    """Fetches real-time transaction logs from the SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        query = "SELECT * FROM transaction_logs ORDER BY timestamp DESC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except Exception:
        # Returns an empty dataframe matching the schema if the DB isn't initialized yet
        return pd.DataFrame(columns=['id', 'timestamp', 'amount', 'v1', 'v2', 'fraud_probability', 'prediction', 'latency_ms'])

st.title("🛡️ Real-Time Fraud Detection System Monitor")
st.markdown("This dashboard monitors system performance, feature distributions, and inference pipeline metrics.")

df = fetch_metrics_data()

if df.empty:
    st.warning("⚠️ Waiting for active traffic... Please send test requests to the Flask API payload endpoint.")
else:
    # --- TOP LEVEL METRICS ---
    total_tx = len(df)
    fraud_cases = int(df['prediction'].sum())
    fraud_rate = (fraud_cases / total_tx) * 100 if total_tx > 0 else 0.0
    avg_latency = df['latency_ms'].mean()

    m1, m2, m3, m4 = st.columns(4)
    m1.metric(label="Total Transactions Processed", value=f"{total_tx:,}")
    m2.metric(label="Flagged Fraud Cases", value=f"{fraud_cases:,}", delta=f"{fraud_rate:.2f}% Rate", delta_color="inverse")
    m3.metric(label="Average API Latency", value=f"{avg_latency:.2f} ms")
    m4.metric(label="Pipeline Status", value="HEALTHY")

    st.markdown("---")

    # --- VISUAL ANALYTICS LAYER ---
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("⏱️ Inference Latency Profile Over Time")
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        # Show only the last 100 tokens to avoid crowding
        fig_latency = px.line(
            df.head(100), x='timestamp', y='latency_ms',
            labels={'latency_ms': 'Latency (ms)', 'timestamp': 'Time'},
            template="plotly_dark"
        )
        st.plotly_chart(fig_latency, use_container_width=True)

    with col2:
        st.subheader("📊 Distribution of Fraud Probabilities")
        fig_dist = px.histogram(
            df, x='fraud_probability', nbins=20,
            labels={'fraud_probability': 'Ensemble Probability Score'},
            color='prediction',
            color_discrete_map={0: '#00CC96', 1: '#EF553B'},
            template="plotly_dark"
        )
        st.plotly_chart(fig_dist, use_container_width=True)

    # --- DRIFT DETECTION / BEHAVIOR TRACKING ---
    st.markdown("---")
    st.subheader("📈 Feature Behavioral Space (Amount vs V1)")
    st.markdown("*Use this scatter plot to look for anomalies or clustering behavior in live transactions.*")
    
    fig_scatter = px.scatter(
        df, x='amount', y='v1', color='prediction',
        color_discrete_map={0: '#00CC96', 1: '#EF553B'},
        labels={'v1': 'PCA Feature V1', 'amount': 'Transaction Value ($)'},
        template="plotly_dark"
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

    # --- RAW AUDIT LOG VIEWER ---
    st.subheader("📋 Recent Live Transaction Stream")
    st.dataframe(df[['timestamp', 'amount', 'fraud_probability', 'prediction', 'latency_ms']].head(10))

# Sleep for 3 seconds before querying database logs again
time.sleep(3)
st.rerun()
