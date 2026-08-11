import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function MarketMonitorTab() {
  const [data, setData] = useState({ summary: {}, daily_data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(252);
  const [activeChart, setActiveChart] = useState('daily'); // 'daily' or 'trend'

  const fetchMarketMonitor = async (selectedLimit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/market-monitor?limit=${selectedLimit}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch market monitor data: ${res.statusText}`);
      }
      const result = await res.json();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketMonitor(limit);
  }, [limit]);

  const summary = data.summary || {};
  const dailyData = data.daily_data || [];

  // Helper for regime color
  const getRegimeColor = (regimeStr) => {
    if (!regimeStr) return 'var(--text-secondary)';
    if (regimeStr.includes('Bullish')) return 'var(--accent-success)';
    if (regimeStr.includes('Bearish')) return 'var(--accent-danger)';
    return 'var(--accent-warning)';
  };

  // Helper SVG Chart generator for Daily 4% UP vs DOWN
  const renderDailyChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse(); // Chronological order
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.gainers_4pct, d.losers_4pct, d.ema_13_up, d.ema_13_down)),
      500
    );

    const height = 220;
    const width = 1000;
    const padding = 40;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => padding + idx * stepX;
    const getY = (val) => height - padding - (val / maxVal) * innerHeight;

    // Generate paths for 13 EMA lines
    const pointsEmaUp = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_up)}`).join(' ');
    const pointsEmaDown = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_down)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(11, 15, 25, 0.4)', borderRadius: '12px' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = height - padding - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="var(--text-secondary)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars / Lines for gainers_4pct and losers_4pct */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const yUp = getY(d.gainers_4pct);
            const yDown = getY(d.losers_4pct);
            return (
              <g key={i}>
                <line x1={x} y1={height - padding} x2={x} y2={yUp} stroke="rgba(16, 185, 129, 0.4)" strokeWidth={Math.max(innerWidth / chartData.length - 1, 1)} />
                <line x1={x} y1={height - padding} x2={x} y2={yDown} stroke="rgba(239, 68, 68, 0.4)" strokeWidth={Math.max(innerWidth / chartData.length - 1, 1)} />
              </g>
            );
          })}

          {/* 13 EMA lines */}
          <polyline fill="none" stroke="var(--accent-success)" strokeWidth="2" points={pointsEmaUp} />
          <polyline fill="none" stroke="var(--accent-danger)" strokeWidth="2" strokeDasharray="3 3" points={pointsEmaDown} />

          {/* Legend */}
          <g transform={`translate(${width - 240}, 20)`}>
            <rect x="0" y="0" width="12" height="12" fill="var(--accent-success)" rx="2" />
            <text x="18" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="500">4% UP (13 EMA)</text>
            <rect x="120" y="0" width="12" height="12" fill="var(--accent-danger)" rx="2" />
            <text x="138" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="500">4% DOWN (13 EMA)</text>
          </g>
        </svg>
      </div>
    );
  };

  // Helper SVG Chart generator for 25% UP vs DOWN Trend (1 Month)
  const renderTrendChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse();
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.up_25pct_1m, d.down_25pct_1m, d.up_25pct_3m, d.down_25pct_3m)),
      300
    );

    const height = 220;
    const width = 1000;
    const padding = 40;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => padding + idx * stepX;
    const getY = (val) => height - padding - (val / maxVal) * innerHeight;

    const points25Up1M = chartData.map((d, i) => `${getX(i)},${getY(d.up_25pct_1m)}`).join(' ');
    const points25Down1M = chartData.map((d, i) => `${getX(i)},${getY(d.down_25pct_1m)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(11, 15, 25, 0.4)', borderRadius: '12px' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = height - padding - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="var(--text-secondary)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points25Up1M} />
          <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" points={points25Down1M} />

          <g transform={`translate(${width - 260}, 20)`}>
            <line x1="0" y1="6" x2="16" y2="6" stroke="#10b981" strokeWidth="3" />
            <text x="22" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="500">25% UP (1 Month)</text>
            <line x1="140" y1="6" x2="156" y2="6" stroke="#ef4444" strokeWidth="3" />
            <text x="162" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="500">25% DOWN (1 Month)</text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div>
      {/* Top Header */}
      <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📊</span> Stockbee Market Monitor
          </h1>
          <p>Situational Awareness & Daily Market Breadth Metrics across Entire Listed Market</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Trading Sessions:</span>
            <select
              className="select-input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '8px 14px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value={60}>Last 60 Days</option>
              <option value={120}>Last 120 Days</option>
              <option value={252}>Last 252 Days (1 Year)</option>
              <option value={500}>All Available Days</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={() => fetchMarketMonitor(limit)} disabled={loading}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Evaluating market breadth across 1.8M price records...
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Market Status Overview Cards */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '28px' }}>
            {/* Regime Card */}
            <div className="glass-card stat-card" style={{ borderLeft: `4px solid ${getRegimeColor(summary.regime)}` }}>
              <span className="stat-label">Current Market Regime</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: getRegimeColor(summary.regime), marginTop: '4px' }}>
                {summary.regime || 'N/A'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                As of {summary.latest_date}
              </span>
            </div>

            {/* Daily 4% Thrust */}
            <div className="glass-card stat-card">
              <span className="stat-label">Daily 4% Thrust (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>{summary.latest_gainers_4pct || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/</span>
                <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>{summary.latest_losers_4pct || 0}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: summary.latest_ratio_4pct >= 2.0 ? 'var(--accent-success)' : summary.latest_ratio_4pct <= 0.5 ? 'var(--accent-danger)' : 'var(--text-secondary)', marginTop: '4px' }}>
                Ratio: {summary.latest_ratio_4pct}x
              </span>
            </div>

            {/* 5-Day Net 4% Sum */}
            <div className="glass-card stat-card">
              <span className="stat-label">5-Day Cumulative Net 4%</span>
              <span className="stat-value" style={{ color: summary.sum_5d_net_4pct >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: '4px' }}>
                {summary.sum_5d_net_4pct >= 0 ? `+${summary.sum_5d_net_4pct}` : summary.sum_5d_net_4pct}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>5-session net momentum</span>
            </div>

            {/* 1-Month 25% Breadth */}
            <div className="glass-card stat-card">
              <span className="stat-label">1-Month 25% (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span className="stat-value" style={{ color: '#10b981' }}>{summary.latest_up_25pct_1m || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{summary.latest_down_25pct_1m || 0}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>20 trading days performance</span>
            </div>

            {/* 3-Month 25% Breadth */}
            <div className="glass-card stat-card">
              <span className="stat-label">3-Month 25% (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span className="stat-value" style={{ color: '#10b981' }}>{summary.latest_up_25pct_3m || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{summary.latest_down_25pct_3m || 0}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>65 trading days trend health</span>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="glass-card" style={{ marginBottom: '28px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Market Breadth Visualizer</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${activeChart === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={() => setActiveChart('daily')}
                >
                  Daily 4% Thrust & 13 EMA
                </button>
                <button
                  className={`btn ${activeChart === 'trend' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={() => setActiveChart('trend')}
                >
                  1-Month 25% Trend Health
                </button>
              </div>
            </div>

            {activeChart === 'daily' ? renderDailyChart() : renderTrendChart()}
          </div>

          {/* Stockbee Market Monitor Data Table */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Daily Market Monitor Data ({dailyData.length} Trading Sessions)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Entire Market Universe (No Filters)
              </span>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="candidates-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)' }}>4% UP</th>
                    <th style={{ textAlign: 'right', background: 'rgba(239, 68, 68, 0.1)' }}>4% DOWN</th>
                    <th style={{ textAlign: 'right' }}>Net 4%</th>
                    <th style={{ textAlign: 'right' }}>Ratio</th>
                    <th style={{ textAlign: 'right' }}>25% UP 1M</th>
                    <th style={{ textAlign: 'right' }}>25% DOWN 1M</th>
                    <th style={{ textAlign: 'right' }}>25% UP 3M</th>
                    <th style={{ textAlign: 'right' }}>25% DOWN 3M</th>
                    <th style={{ textAlign: 'right' }}>50% UP 1M</th>
                    <th style={{ textAlign: 'right' }}>50% UP 3M</th>
                    <th style={{ textAlign: 'right' }}>50% DOWN 3M</th>
                    <th style={{ textAlign: 'right' }}>13 EMA UP</th>
                    <th style={{ textAlign: 'right' }}>13 EMA DOWN</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((row, idx) => {
                    const isStrongUp = row.gainers_4pct >= 300 || row.ratio_4pct >= 2.0;
                    const isStrongDown = row.losers_4pct >= 300 || row.ratio_4pct <= 0.5;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</td>

                        {/* 4% UP */}
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: isStrongUp ? 700 : 500,
                            color: isStrongUp ? '#10b981' : 'var(--text-primary)',
                            backgroundColor: row.gainers_4pct >= 500 ? 'rgba(16, 185, 129, 0.15)' : row.gainers_4pct >= 300 ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                          }}
                        >
                          {row.gainers_4pct.toLocaleString()}
                        </td>

                        {/* 4% DOWN */}
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: isStrongDown ? 700 : 500,
                            color: isStrongDown ? '#ef4444' : 'var(--text-primary)',
                            backgroundColor: row.losers_4pct >= 500 ? 'rgba(239, 68, 68, 0.15)' : row.losers_4pct >= 300 ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
                          }}
                        >
                          {row.losers_4pct.toLocaleString()}
                        </td>

                        {/* Net 4% */}
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: row.net_4pct > 0 ? '#10b981' : row.net_4pct < 0 ? '#ef4444' : 'var(--text-secondary)'
                          }}
                        >
                          {row.net_4pct > 0 ? `+${row.net_4pct}` : row.net_4pct}
                        </td>

                        {/* Ratio */}
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: row.ratio_4pct >= 2.0 ? '#10b981' : row.ratio_4pct <= 0.5 ? '#ef4444' : 'var(--text-primary)'
                          }}
                        >
                          {row.ratio_4pct}x
                        </td>

                        {/* 25% UP 1M */}
                        <td style={{ textAlign: 'right', color: row.up_25pct_1m > row.down_25pct_1m ? '#10b981' : 'var(--text-primary)' }}>
                          {row.up_25pct_1m.toLocaleString()}
                        </td>

                        {/* 25% DOWN 1M */}
                        <td style={{ textAlign: 'right', color: row.down_25pct_1m > row.up_25pct_1m ? '#ef4444' : 'var(--text-primary)' }}>
                          {row.down_25pct_1m.toLocaleString()}
                        </td>

                        {/* 25% UP 3M */}
                        <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                          {row.up_25pct_3m.toLocaleString()}
                        </td>

                        {/* 25% DOWN 3M */}
                        <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                          {row.down_25pct_3m.toLocaleString()}
                        </td>

                        {/* 50% UP 1M */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {row.up_50pct_1m.toLocaleString()}
                        </td>

                        {/* 50% UP 3M */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {row.up_50pct_3m.toLocaleString()}
                        </td>

                        {/* 50% DOWN 3M */}
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {row.down_50pct_3m.toLocaleString()}
                        </td>

                        {/* 13 EMA UP */}
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 500 }}>
                          {row.ema_13_up}
                        </td>

                        {/* 13 EMA DOWN */}
                        <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                          {row.ema_13_down}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
