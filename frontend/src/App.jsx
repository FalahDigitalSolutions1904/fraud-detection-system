import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ScatterChart,
  Scatter, ZAxis
} from 'recharts';
import {
  ShieldAlert, Activity, Clock, DollarSign, TrendingUp,
  AlertTriangle, Zap, Database, RefreshCw, Radio
} from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:5000';
const POLL_INTERVAL = 3000;

/* ── Custom Tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label, valueLabel, valueFormat }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div className="value" key={i} style={{ color: p.color }}>
          {p.name}: {valueFormat ? valueFormat(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

/* ── Main App ───────────────────────────────── */
export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/metrics`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMetrics(data.metrics || []);
      setIsLive(true);
      setLastUpdate(new Date());
      setCountdown(POLL_INTERVAL / 1000);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, POLL_INTERVAL);
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? POLL_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchMetrics]);

  /* ── Derived stats ────────────────────────── */
  const totalTx = metrics.length;
  const fraudCount = metrics.filter(m => m.prediction === 1).length;
  const fraudRate = totalTx > 0 ? ((fraudCount / totalTx) * 100).toFixed(2) : '0.00';
  const avgLatency = totalTx > 0
    ? (metrics.reduce((s, m) => s + (m.latency_ms || 0), 0) / totalTx).toFixed(1)
    : '0.0';
  const avgAmount = totalTx > 0
    ? (metrics.reduce((s, m) => s + Math.abs(m.amount || 0), 0) / totalTx).toFixed(2)
    : '0.00';

  /* ── Chart data: Fraud probability over time (latest 50) ─── */
  const probData = [...metrics]
    .reverse()
    .slice(-50)
    .map((m, i) => ({
      index: i + 1,
      probability: +(m.fraud_probability * 100).toFixed(2),
      label: `Tx #${i + 1}`
    }));

  /* ── Chart data: Latency over time (latest 50) ─── */
  const latencyData = [...metrics]
    .reverse()
    .slice(-50)
    .map((m, i) => ({
      index: i + 1,
      latency: +m.latency_ms.toFixed(2),
      label: `Tx #${i + 1}`
    }));

  /* ── Chart data: Amount distribution (last 30) ─── */
  const amountData = [...metrics]
    .reverse()
    .slice(-30)
    .map((m, i) => ({
      index: i + 1,
      amount: +Math.abs(m.amount).toFixed(2),
      isFraud: m.prediction === 1
    }));

  /* ── Chart data: Scatter (amount vs probability) ─── */
  const scatterData = [...metrics]
    .slice(0, 100)
    .map(m => ({
      amount: +Math.abs(m.amount).toFixed(2),
      probability: +(m.fraud_probability * 100).toFixed(2),
      isFraud: m.prediction === 1
    }));

  /* ── Loading ──────────────────────────────── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Connecting to Fraud Detection API...</div>
      </div>
    );
  }

  /* ── Empty State ──────────────────────────── */
  if (totalTx === 0) {
    return (
      <div className="app-container">
        <Header isLive={isLive} countdown={countdown} lastUpdate={lastUpdate} />
        <div className="empty-state">
          <Database size={56} />
          <h2>No Transactions Detected</h2>
          <p>
            The monitoring dashboard is connected to the API but hasn't received any
            transaction data yet. Send requests to the <code>POST /predict</code> endpoint
            to begin tracking.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Run <code>python simulate_traffic.py</code> to generate sample traffic.
          </p>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────── */
  return (
    <div className="app-container">
      <Header isLive={isLive} countdown={countdown} lastUpdate={lastUpdate} />

      {/* ── KPI Cards ─────────────────────────── */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Transactions"
          value={totalTx.toLocaleString()}
          sub="All processed requests"
          icon={<Activity size={18} />}
          colorClass="cyan"
        />
        <MetricCard
          label="Fraud Detected"
          value={fraudCount.toLocaleString()}
          sub={`${fraudRate}% of total`}
          icon={<ShieldAlert size={18} />}
          colorClass="red"
        />
        <MetricCard
          label="Avg Latency"
          value={`${avgLatency}ms`}
          sub="Inference response time"
          icon={<Clock size={18} />}
          colorClass="green"
        />
        <MetricCard
          label="Avg Amount"
          value={`$${parseFloat(avgAmount).toLocaleString()}`}
          sub="Mean transaction value"
          icon={<DollarSign size={18} />}
          colorClass="purple"
        />
      </div>

      {/* ── Charts Row 1 ──────────────────────── */}
      <div className="charts-grid">
        {/* Fraud Probability Timeline */}
        <div className="chart-panel">
          <div className="chart-title">
            <TrendingUp size={16} /> Fraud Probability Timeline
          </div>
          <div style={{ height: 240, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={probData}>
                <defs>
                  <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="index"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip content={<ChartTooltip valueFormat={v => `${v}%`} />} />
                <Area
                  type="monotone"
                  dataKey="probability"
                  name="Fraud %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#probGrad)"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: '#0a0a0f' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Monitor */}
        <div className="chart-panel">
          <div className="chart-title">
            <Zap size={16} /> Inference Latency Monitor
          </div>
          <div style={{ height: 240, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="index"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                  tickFormatter={v => `${v}ms`}
                />
                <Tooltip content={<ChartTooltip valueFormat={v => `${v}ms`} />} />
                <Area
                  type="monotone"
                  dataKey="latency"
                  name="Latency"
                  stroke="#00f0ff"
                  strokeWidth={2}
                  fill="url(#latGrad)"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#00f0ff', strokeWidth: 2, fill: '#0a0a0f' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ──────────────────────── */}
      <div className="charts-grid">
        {/* Amount Distribution */}
        <div className="chart-panel">
          <div className="chart-title">
            <DollarSign size={16} /> Transaction Amounts
          </div>
          <div style={{ height: 240, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={amountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="index"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip content={<ChartTooltip valueFormat={v => `$${v}`} />} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {amountData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isFraud ? '#ef4444' : 'rgba(59, 130, 246, 0.6)'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter: Amount vs Probability */}
        <div className="chart-panel">
          <div className="chart-title">
            <AlertTriangle size={16} /> Risk Distribution
          </div>
          <div style={{ height: 240, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="amount"
                  name="Amount"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <YAxis
                  dataKey="probability"
                  name="Fraud %"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#4a5568', fontSize: 11 }}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                />
                <ZAxis range={[30, 120]} />
                <Tooltip content={<ChartTooltip />} />
                <Scatter
                  name="Legit"
                  data={scatterData.filter(d => !d.isFraud)}
                  fill="rgba(59, 130, 246, 0.7)"
                />
                <Scatter
                  name="Fraud"
                  data={scatterData.filter(d => d.isFraud)}
                  fill="#ef4444"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Transaction Log ────────────────────── */}
      <div className="full-width-panel">
        <div className="chart-title">
          <Database size={16} /> Recent Transaction Audit Log
        </div>
        <div className="table-container">
          <table className="tx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Amount</th>
                <th>Fraud Probability</th>
                <th>Verdict</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(0, 20).map((m, i) => {
                const prob = +(m.fraud_probability * 100).toFixed(2);
                const isFraud = m.prediction === 1;
                return (
                  <tr key={m.id || i}>
                    <td style={{ color: 'var(--text-muted)' }}>{m.id || i + 1}</td>
                    <td>{m.timestamp || '—'}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      ${Math.abs(m.amount).toFixed(2)}
                    </td>
                    <td>
                      <div className="prob-bar-cell">
                        <span style={{ color: prob > 50 ? '#ef4444' : '#10b981', fontWeight: 600, minWidth: 42 }}>
                          {prob}%
                        </span>
                        <div className="prob-bar-track">
                          <div
                            className="prob-bar-fill"
                            style={{
                              width: `${Math.min(prob, 100)}%`,
                              background: prob > 50
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : 'linear-gradient(90deg, #10b981, #059669)'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-fraud ${isFraud ? 'danger' : 'safe'}`}>
                        {isFraud ? '⚠ Fraud' : '✓ Legit'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {m.latency_ms?.toFixed(1)}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Header Component ───────────────────────── */
function Header({ isLive, countdown, lastUpdate }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-icon">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="header-title">Fraud Monitor</h1>
          <p className="header-subtitle">Real-Time ML Inference Dashboard</p>
        </div>
      </div>
      <div className="header-right">
        <span className="refresh-timer">
          <RefreshCw size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {countdown}s
        </span>
        <div className={`status-badge ${isLive ? 'live' : 'offline'}`}>
          <span className="status-dot" />
          {isLive ? 'Live' : 'Offline'}
        </div>
      </div>
    </header>
  );
}

/* ── Metric Card Component ──────────────────── */
function MetricCard({ label, value, sub, icon, colorClass }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <div className={`metric-icon ${colorClass}`}>{icon}</div>
      </div>
      <div className={`metric-value ${colorClass}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}
