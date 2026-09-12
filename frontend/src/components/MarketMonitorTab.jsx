import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

// Module-level cache to keep market monitor data immediately available across tab switches
let cachedMarketMonitorData = null;
let cachedLimit = null;

export default function MarketMonitorTab() {
  const [data, setData] = useState(() => cachedMarketMonitorData || { summary: {}, daily_data: [] });
  const [loading, setLoading] = useState(() => !cachedMarketMonitorData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(() => cachedLimit || 252);
  const [activeChart, setActiveChart] = useState('daily'); // 'daily', 'trend', or 'heatmap'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(65); // Default: ~3 months (~65 trading days)

  const fetchMarketMonitor = async (selectedLimit, forceRefresh = false) => {
    if (!cachedMarketMonitorData || forceRefresh) {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const url = `${API_BASE}/api/market-monitor?limit=${selectedLimit}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch market monitor data: ${res.statusText}`);
      }
      const result = await res.json();
      cachedMarketMonitorData = result;
      cachedLimit = selectedLimit;
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketMonitor(limit);
  }, [limit]);

  const summary = data.summary || {};
  const dailyData = data.daily_data || [];

  // Helper for regime color & verdict guidance
  const getRegimeDetails = (regimeStr) => {
    const gainers = typeof summary.latest_gainers_4pct === 'number' ? summary.latest_gainers_4pct : 0;
    const losers = typeof summary.latest_losers_4pct === 'number' ? summary.latest_losers_4pct : 0;
    const total = gainers + losers;
    const computedBias = total > 0 ? Math.round((gainers / total) * 100) : 50;

    if (!regimeStr) return { color: '#94a3b8', light: 'YELLOW', badge: 'NEUTRAL', tag: 'STABLE TAPE', stance: 'GATHERING DATA', exposure: '50% Exposure', guidance: 'Gathering market data...', biasPct: 50 };
    if (regimeStr.includes('Bullish')) {
      return {
        color: '#10b981',
        light: 'GREEN',
        badge: 'UPTREND / EXPANSION',
        tag: 'BULLISH TAPE',
        stance: '🟢 GREEN LIGHT: AGGRESSIVE LONG',
        exposure: '100% Position Sizing (Full Risk)',
        guidance: 'Healthy market environment: long momentum setups working cleanly. Stay long and stay selective with breakouts.',
        biasPct: Math.max(50, Math.min(computedBias, 98))
      };
    }
    if (regimeStr.includes('Bearish')) {
      return {
        color: '#f43f5e',
        light: 'RED',
        badge: 'DOWNTREND / CAUTION',
        tag: 'DISTRIBUTION RISK',
        stance: '🔴 RED LIGHT: DEFENSIVE / CASH',
        exposure: '0–25% Sizing (Protect Capital)',
        guidance: 'Market under pressure / distribution: higher breakdown frequency. Reduce position sizes and protect open gains.',
        biasPct: Math.min(50, Math.max(computedBias, 5))
      };
    }
    return {
      color: '#f59e0b',
      light: 'YELLOW',
      badge: 'CONSOLIDATION / MIXED',
      tag: 'MIXED BREADTH',
      stance: '🟡 YELLOW LIGHT: SELECTIVE TRADING',
      exposure: '50% Reduced Position Sizing',
      guidance: 'Mixed or range-bound market tape: selective breakouts working, but watch for sudden pullbacks.',
      biasPct: computedBias
    };
  };

  const regimeInfo = getRegimeDetails(summary.regime);

  // Helper for Kristjan Qullamaggie Market Evaluation
  const kqEval = summary.kq_evaluation || {};
  const getKqDetails = (kq) => {
    const reg = kq?.regime || 'UNKNOWN';
    if (reg === 'BULLISH') {
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        light: 'GREEN',
        badge: '🟢 GREEN LIGHT: AGGRESSIVE LONG',
        title: 'Healthy Expansion: Clean Breakouts',
        stance: '100% Position Sizing (Full Risk)',
        guidance: kq?.guidance || 'Clean healthy market: 10 & 20 EMAs rising above rising 50 SMA. Breakouts succeed smoothly and trend continuation works. Trade full sizes on top-quality setups.'
      };
    }
    if (reg === 'BEARISH') {
      return {
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.35)',
        light: 'RED',
        badge: '🔴 RED LIGHT: DEFENSIVE / CASH',
        title: 'High Risk / Distribution: Breakouts Fail',
        stance: '0–25% Sizing (Move to Cash)',
        guidance: kq?.guidance || 'Hostile market environment: 10/20 EMAs declining below or into rolling 50 SMA. Price action wide and loose; breakouts fail almost immediately. Move to cash and do not force trades.'
      };
    }
    return {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.35)',
      light: 'YELLOW',
      badge: '🟡 YELLOW LIGHT: SELECTIVE TRADING',
      title: 'Caution / Pullback: Slower Follow-Through',
      stance: '25–50% Sizing (Selective)',
      guidance: kq?.guidance || 'Market in consolidation or pulling back toward 10/20 EMA. Slower follow-through; stay selective, trim targets into strength, and maintain tight stops.'
    };
  };

  const kqInfo = getKqDetails(kqEval);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Helper to calculate month separators and date axis labels
  const getMonthSeparators = (chartData, getX) => {
    if (!chartData || chartData.length === 0) return { all: [], visible: [] };
    const all = [];
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      const isFirst = i === 0;
      const prev = i > 0 ? chartData[i - 1] : null;
      const isNewMonth = prev ? d.date.slice(0, 7) !== prev.date.slice(0, 7) : false;
      const isNewYear = prev ? d.date.slice(0, 4) !== prev.date.slice(0, 4) : false;

      if (isFirst || isNewMonth) {
        const x = getX(i);
        const mNum = parseInt(d.date.slice(5, 7), 10) - 1;
        const mName = MONTH_NAMES[mNum] || d.date.slice(5, 7);
        const yShort = d.date.slice(2, 4);
        const label = isNewYear || isFirst ? `${mName} '${yShort}` : mName;
        all.push({
          index: i,
          x,
          date: d.date,
          isFirst,
          isNewMonth,
          isNewYear,
          label
        });
      }
    }

    const visible = [];
    let lastX = -999;
    for (const sep of all) {
      if (sep.x - lastX >= 45) {
        visible.push(sep);
        lastX = sep.x;
      }
    }
    return { all, visible };
  };

  // SVG Chart for Daily 4% UP vs DOWN with Date Axis & Month Separators
  const renderDailyChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse();
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.gainers_4pct, d.losers_4pct, d.ema_13_up, d.ema_13_down)),
      500
    );

    const height = 240;
    const width = 1000;
    const paddingLeft = 45;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 35;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const baselineY = paddingTop + innerHeight;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => paddingLeft + idx * stepX;
    const getY = (val) => baselineY - (val / maxVal) * innerHeight;

    const { all: monthSeparators, visible: visibleSeparators } = getMonthSeparators(chartData, getX);

    const pointsEmaUp = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_up)}`).join(' ');
    const pointsEmaDown = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_down)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
          {/* Horizontal Y-axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = baselineY - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Baseline X-axis line */}
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="rgba(255, 255, 255, 0.18)" />

          {/* Vertical Month Separator Lines across chart */}
          {monthSeparators.map((sep, idx) => {
            if (sep.isFirst) return null;
            return (
              <line
                key={`sep-grid-${idx}`}
                x1={sep.x}
                y1={paddingTop}
                x2={sep.x}
                y2={baselineY}
                stroke={sep.isNewYear ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)'}
                strokeDasharray={sep.isNewYear ? 'none' : '3 3'}
                strokeWidth={sep.isNewYear ? 1.2 : 1}
              />
            );
          })}

          {/* Daily 4% UP / DOWN Bars with hover tooltips */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const yUp = getY(d.gainers_4pct);
            const yDown = getY(d.losers_4pct);
            const barW = Math.max(innerWidth / chartData.length - 1, 1);
            return (
              <g key={i}>
                <title>{`${d.date}: 4% UP=${d.gainers_4pct}, 4% DOWN=${d.losers_4pct} (13 EMA UP=${d.ema_13_up}, DOWN=${d.ema_13_down})`}</title>
                <line x1={x} y1={baselineY} x2={x} y2={yUp} stroke="rgba(16, 185, 129, 0.4)" strokeWidth={barW} />
                <line x1={x} y1={baselineY} x2={x} y2={yDown} stroke="rgba(244, 63, 94, 0.4)" strokeWidth={barW} />
              </g>
            );
          })}

          {/* 13 EMA Polylines */}
          <polyline fill="none" stroke="var(--accent-success)" strokeWidth="2.5" points={pointsEmaUp} />
          <polyline fill="none" stroke="var(--accent-danger)" strokeWidth="2.5" strokeDasharray="3 3" points={pointsEmaDown} />

          {/* Month Separator Ticks and Date Labels */}
          {visibleSeparators.map((sep, idx) => (
            <g key={`sep-lbl-${idx}`}>
              <line
                x1={sep.x}
                y1={baselineY}
                x2={sep.x}
                y2={baselineY + 5}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={1}
              />
              <text
                x={sep.x}
                y={baselineY + 18}
                fill={sep.isNewYear || sep.isFirst ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize="10"
                fontWeight={sep.isNewYear || sep.isFirst ? 700 : 500}
                textAnchor="middle"
              >
                {sep.label}
              </text>
            </g>
          ))}

          {/* Chart Legend */}
          <g transform={`translate(${width - 240}, 15)`}>
            <rect x="0" y="0" width="12" height="12" fill="var(--accent-success)" rx="2" />
            <text x="18" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">4% UP (13 EMA)</text>
            <rect x="120" y="0" width="12" height="12" fill="var(--accent-danger)" rx="2" />
            <text x="138" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">4% DOWN (13 EMA)</text>
          </g>
        </svg>
      </div>
    );
  };

  // SVG Chart for 25% UP vs DOWN Trend with Date Axis & Month Separators
  const renderTrendChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse();
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.up_25pct_1m, d.down_25pct_1m, d.up_25pct_3m, d.down_25pct_3m)),
      300
    );

    const height = 240;
    const width = 1000;
    const paddingLeft = 45;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 35;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const baselineY = paddingTop + innerHeight;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => paddingLeft + idx * stepX;
    const getY = (val) => baselineY - (val / maxVal) * innerHeight;

    const { all: monthSeparators, visible: visibleSeparators } = getMonthSeparators(chartData, getX);

    const points25Up1M = chartData.map((d, i) => `${getX(i)},${getY(d.up_25pct_1m)}`).join(' ');
    const points25Down1M = chartData.map((d, i) => `${getX(i)},${getY(d.down_25pct_1m)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
          {/* Horizontal Y-axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = baselineY - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Baseline X-axis line */}
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="rgba(255, 255, 255, 0.18)" />

          {/* Vertical Month Separator Lines across chart */}
          {monthSeparators.map((sep, idx) => {
            if (sep.isFirst) return null;
            return (
              <line
                key={`trend-sep-grid-${idx}`}
                x1={sep.x}
                y1={paddingTop}
                x2={sep.x}
                y2={baselineY}
                stroke={sep.isNewYear ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)'}
                strokeDasharray={sep.isNewYear ? 'none' : '3 3'}
                strokeWidth={sep.isNewYear ? 1.2 : 1}
              />
            );
          })}

          {/* Trend Polylines */}
          <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points25Up1M} />
          <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={points25Down1M} />

          {/* Month Separator Ticks and Date Labels */}
          {visibleSeparators.map((sep, idx) => (
            <g key={`trend-sep-lbl-${idx}`}>
              <line
                x1={sep.x}
                y1={baselineY}
                x2={sep.x}
                y2={baselineY + 5}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={1}
              />
              <text
                x={sep.x}
                y={baselineY + 18}
                fill={sep.isNewYear || sep.isFirst ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize="10"
                fontWeight={sep.isNewYear || sep.isFirst ? 700 : 500}
                textAnchor="middle"
              >
                {sep.label}
              </text>
            </g>
          ))}

          {/* Chart Legend */}
          <g transform={`translate(${width - 260}, 15)`}>
            <line x1="0" y1="6" x2="16" y2="6" stroke="#10b981" strokeWidth="3" />
            <text x="22" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">25% UP (1 Month)</text>
            <line x1="140" y1="6" x2="156" y2="6" stroke="#f43f5e" strokeWidth="3" />
            <text x="162" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">25% DOWN (1 Month)</text>
          </g>
        </svg>
      </div>
    );
  };


  // EdgeStacker Breadth Heatmap Calendar Grid
  const renderHeatmap = () => {
    if (dailyData.length === 0) return null;
    return (
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Historical Market Expansion (Green = Net 4% Gainers Expansion, Red = Net 4% Losers Contraction)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))', gap: '6px' }}>
          {[...dailyData].reverse().map((d, i) => {
            const isExpansion = d.net_4pct >= 0;
            const intensity = Math.min(Math.abs(d.net_4pct) / 300, 1);
            const bg = isExpansion
              ? `rgba(16, 185, 129, ${0.2 + intensity * 0.7})`
              : `rgba(244, 63, 94, ${0.2 + intensity * 0.7})`;
            return (
              <div
                key={i}
                title={`${d.date}: 4% UP=${d.gainers_4pct}, 4% DOWN=${d.losers_4pct} (Net: ${d.net_4pct >= 0 ? '+' : ''}${d.net_4pct})`}
                style={{
                  height: '28px',
                  borderRadius: '4px',
                  backgroundColor: bg,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {d.date.slice(5)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Top Header */}
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>MARKET RADAR</span>
            <span>•</span>
            <span>BREADTH & REGIME MONITOR</span>
          </div>
          <h1>Stockbee Market Monitor</h1>
          <p>Situational Awareness & Daily Market Breadth Metrics across Entire Listed Market</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sessions:</span>
            <select
              className="select-input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '7px 12px',
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

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchMarketMonitor(limit, true)}
            disabled={loading || refreshing}
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Data'}
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
          {/* EdgeStacker Market Verdict Banner */}
          <div className="glass-card" style={{ marginBottom: '24px', borderLeft: `5px solid ${regimeInfo.color}`, padding: '24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'center', gap: '24px' }}>
              {/* Left Column: Market Tape & Guidance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="pill" style={{ background: `${regimeInfo.color}25`, color: regimeInfo.color, border: `1px solid ${regimeInfo.color}50` }}>
                    {regimeInfo.badge}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>As of {summary.latest_date}</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', margin: 0 }}>Market Tape: {regimeInfo.tag}</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.55', maxWidth: '640px' }}>{regimeInfo.guidance}</p>
              </div>

              {/* Right Column: Visual Traffic Light & Benchmarks */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* Visual Traffic Light Widget */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: `1.5px solid ${regimeInfo.color}70`,
                  borderRadius: '12px',
                  padding: '12px 18px',
                  boxShadow: `0 0 20px ${regimeInfo.color}25`
                }}>
                  {/* Traffic Light Housing */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    background: '#0f172a',
                    padding: '7px 9px',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                  }}>
                    {/* Green Lamp (Top) */}
                    <div
                      title="Green Light: Aggressive Long"
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: regimeInfo.light === 'GREEN' ? '#10b981' : '#334155',
                        boxShadow: regimeInfo.light === 'GREEN' ? '0 0 14px #10b981' : 'none',
                        opacity: regimeInfo.light === 'GREEN' ? 1 : 0.25,
                        transition: 'all 0.3s ease'
                      }}
                    />
                    {/* Yellow Lamp (Middle) */}
                    <div
                      title="Yellow Light: Selective / Cautious"
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: regimeInfo.light === 'YELLOW' ? '#f59e0b' : '#334155',
                        boxShadow: regimeInfo.light === 'YELLOW' ? '0 0 14px #f59e0b' : 'none',
                        opacity: regimeInfo.light === 'YELLOW' ? 1 : 0.25,
                        transition: 'all 0.3s ease'
                      }}
                    />
                    {/* Red Lamp (Bottom) */}
                    <div
                      title="Red Light: Defense / Cash"
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: regimeInfo.light === 'RED' ? '#f43f5e' : '#334155',
                        boxShadow: regimeInfo.light === 'RED' ? '0 0 14px #f43f5e' : 'none',
                        opacity: regimeInfo.light === 'RED' ? 1 : 0.25,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Market Traffic Light
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: regimeInfo.color, marginTop: '2px' }}>
                      {regimeInfo.stance}
                    </span>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Budget: {regimeInfo.exposure}
                    </span>
                  </div>
                </div>

                {/* Index Benchmark Cards (SPY & QQQ) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const spyObj = summary?.benchmarks?.SPY;
                    const spyPct = spyObj?.change_pct;
                    const spyClose = spyObj?.close;
                    const hasPct = typeof spyPct === 'number';
                    const isUp = hasPct && spyPct > 0;
                    const isDown = hasPct && spyPct < 0;
                    const color = isUp ? '#34d399' : (isDown ? '#fb7185' : 'var(--text-secondary)');
                    return (
                      <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', minWidth: '135px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>SPY</span>
                          <span style={{ fontSize: '11.5px', color: color, fontWeight: 700 }}>
                            {hasPct ? (isUp ? `+${spyPct.toFixed(2)}%` : `${spyPct.toFixed(2)}%`) : '-'}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                          {spyClose ? `$${spyClose.toFixed(2)}` : '-'}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const qqqObj = summary?.benchmarks?.QQQ;
                    const qqqPct = qqqObj?.change_pct;
                    const qqqClose = qqqObj?.close;
                    const hasPct = typeof qqqPct === 'number';
                    const isUp = hasPct && qqqPct > 0;
                    const isDown = hasPct && qqqPct < 0;
                    const color = isUp ? '#34d399' : (isDown ? '#fb7185' : 'var(--text-secondary)');
                    return (
                      <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', minWidth: '135px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>QQQ</span>
                          <span style={{ fontSize: '11.5px', color: color, fontWeight: 700 }}>
                            {hasPct ? (isUp ? `+${qqqPct.toFixed(2)}%` : `${qqqPct.toFixed(2)}%`) : '-'}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                          {qqqClose ? `$${qqqClose.toFixed(2)}` : '-'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Kristjan Qullamaggie Market Evaluation Banner */}
          <div className="glass-card" style={{ marginBottom: '24px', borderLeft: `5px solid ${kqInfo.color}`, padding: '22px 28px', background: 'rgba(15, 23, 42, 0.65)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'center', gap: '24px' }}>
              {/* Left Column: Qullamaggie Framework Stance & Execution Guidance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="pill" style={{ background: kqInfo.bg, color: kqInfo.color, border: `1px solid ${kqInfo.border}`, fontWeight: 700, fontSize: '11px', padding: '3px 10px' }}>
                    {kqInfo.badge}
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Nasdaq Composite / QQQ Moving Average Stack
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Qullamaggie Market Evaluation: <span style={{ color: kqInfo.color }}>{kqInfo.title}</span>
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5', maxWidth: '680px' }}>
                  {kqInfo.guidance}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12.5px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Execution Stance:</span>
                  <span style={{ fontWeight: 700, color: kqInfo.color }}>{kqInfo.stance}</span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Stack Alignment: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{kqEval.stack || '-'}</strong></span>
                </div>
              </div>

              {/* Right Column: QQQ Moving Average Stack Matrix */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* QQQ Close */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', minWidth: '110px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>QQQ Close</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    ${kqEval.close ? kqEval.close.toFixed(2) : '-'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: (kqEval.change_pct || 0) >= 0 ? '#34d399' : '#fb7185' }}>
                    {(kqEval.change_pct || 0) >= 0 ? `+${(kqEval.change_pct || 0).toFixed(2)}%` : `${(kqEval.change_pct || 0).toFixed(2)}%`}
                  </span>
                </div>

                {/* 10 EMA */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', minWidth: '110px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>10 EMA</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: kqEval.close >= kqEval.ema_10 ? '#34d399' : '#fb7185', marginTop: '2px' }}>
                    ${kqEval.ema_10 ? kqEval.ema_10.toFixed(2) : '-'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: (kqEval.ema_10_slope || 0) >= 0 ? '#34d399' : '#fb7185' }}>
                    {(kqEval.ema_10_slope || 0) >= 0 ? '↗ Rising' : '↘ Declining'}
                  </span>
                </div>

                {/* 20 EMA */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', minWidth: '110px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>20 EMA</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: kqEval.close >= kqEval.ema_20 ? '#34d399' : '#fb7185', marginTop: '2px' }}>
                    ${kqEval.ema_20 ? kqEval.ema_20.toFixed(2) : '-'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: (kqEval.ema_20_slope || 0) >= 0 ? '#34d399' : '#fb7185' }}>
                    {(kqEval.ema_20_slope || 0) >= 0 ? '↗ Rising' : '↘ Declining'}
                  </span>
                </div>

                {/* 50 SMA */}
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', minWidth: '110px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>50 SMA</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: kqEval.close >= kqEval.sma_50 ? '#34d399' : '#fb7185', marginTop: '2px' }}>
                    ${kqEval.sma_50 ? kqEval.sma_50.toFixed(2) : '-'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: (kqEval.sma_50_slope || 0) >= 0 ? '#34d399' : '#fb7185' }}>
                    {(kqEval.sma_50_slope || 0) >= 0 ? '↗ Rising' : '↘ Rolling Over'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* EdgeStacker Visual Gauge Dashboard */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
            {/* Regime Bias Gauge */}
            <div className="glass-card stat-card">
              <span className="stat-label">Market Momentum Bias</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                <span className="stat-value" style={{ color: regimeInfo.color }}>{regimeInfo.biasPct}%</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bullish</span>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ background: regimeInfo.color, height: '100%', width: `${regimeInfo.biasPct}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Daily 4% Thrust Meter */}
            <div className="glass-card stat-card">
              <span className="stat-label">Daily 4% Thrust (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                <span className="stat-value" style={{ color: 'var(--accent-success)' }}>{summary.latest_gainers_4pct || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/</span>
                <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>{summary.latest_losers_4pct || 0}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                <span style={{ color: summary.latest_ratio_4pct >= 2.0 ? 'var(--accent-success)' : summary.latest_ratio_4pct <= 0.5 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                  1D: {summary.latest_ratio_4pct ?? '-'}x
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: summary.latest_ratio_5d >= 2.0 ? 'var(--accent-success)' : summary.latest_ratio_5d <= 0.5 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                  5D: {summary.latest_ratio_5d ?? '-'}x
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: summary.latest_ratio_10d >= 2.0 ? 'var(--accent-success)' : summary.latest_ratio_10d <= 0.5 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                  10D: {summary.latest_ratio_10d ?? '-'}x
                </span>
              </div>
            </div>

            {/* 1-Month 25% Breadth */}
            <div className="glass-card stat-card">
              <span className="stat-label">1-Month 25% (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                <span className="stat-value" style={{ color: '#10b981' }}>{summary.latest_up_25pct_1m || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/</span>
                <span className="stat-value" style={{ color: '#f43f5e' }}>{summary.latest_down_25pct_1m || 0}</span>
              </div>
              <span className="stat-subtext">20 trading days expansion</span>
            </div>

            {/* 3-Month 25% Breadth */}
            <div className="glass-card stat-card">
              <span className="stat-label">3-Month 25% (UP / DOWN)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                <span className="stat-value" style={{ color: '#10b981' }}>{summary.latest_up_25pct_3m || 0}</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/</span>
                <span className="stat-value" style={{ color: '#f43f5e' }}>{summary.latest_down_25pct_3m || 0}</span>
              </div>
              <span className="stat-subtext">65 trading days trend health</span>
            </div>
          </div>

          {/* Combined Multi-View Visualizer */}
          <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Market Breadth Visualizer & Heatmap</h3>
              <div className="segmented-control">
                <button
                  className={`segmented-item ${activeChart === 'daily' ? 'active' : ''}`}
                  onClick={() => setActiveChart('daily')}
                >
                  4% Thrust & 13 EMA
                </button>
                <button
                  className={`segmented-item ${activeChart === 'trend' ? 'active' : ''}`}
                  onClick={() => setActiveChart('trend')}
                >
                  1-Month 25% Trend Health
                </button>
                <button
                  className={`segmented-item ${activeChart === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setActiveChart('heatmap')}
                >
                  Breadth Heatmap Grid
                </button>
              </div>
            </div>

            {activeChart === 'daily' && renderDailyChart()}
            {activeChart === 'trend' && renderTrendChart()}
            {activeChart === 'heatmap' && renderHeatmap()}
          </div>

          {/* Stockbee Market Monitor Data Table */}
          <div className="glass-card" style={{ padding: '16px' }}>
            {(() => {
              const effectivePageSize = pageSize === 'all' ? dailyData.length || 1 : pageSize;
              const totalPages = Math.ceil(dailyData.length / effectivePageSize);
              const paginatedData = pageSize === 'all'
                ? dailyData
                : dailyData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
                        Daily Market Monitor Data ({dailyData.length} Total Sessions)
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Displaying {paginatedData.length} sessions (Recent 3 months by default)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>Show:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                            setPageSize(val);
                            setCurrentPage(1);
                          }}
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-md)',
                            padding: '5px 10px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={65}>65 Rows (~3 Months)</option>
                          <option value={120}>120 Rows (~6 Months)</option>
                          <option value={252}>252 Rows (1 Year)</option>
                          <option value="all">Show All</option>
                        </select>
                      </div>

                      {pageSize !== 'all' && totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            ← Prev
                          </button>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage >= totalPages}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="data-table compact-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Date</th>
                          <th style={{ textAlign: 'center' }}>KQ Regime</th>
                          <th style={{ textAlign: 'right', color: '#34d399' }}>4% ▲</th>
                          <th style={{ textAlign: 'right', color: '#fb7185' }}>4% ▼</th>
                          <th style={{ textAlign: 'right' }}>Net 4%</th>
                          <th style={{ textAlign: 'right' }}>Ratio</th>
                          <th style={{ textAlign: 'right', color: '#60a5fa' }}>5D Ratio</th>
                          <th style={{ textAlign: 'right', color: '#818cf8' }}>10D Ratio</th>
                          <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#34d399' }}>▲</span> 1M</th>
                          <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#fb7185' }}>▼</span> 1M</th>
                          <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#34d399' }}>▲</span> 3M</th>
                          <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#fb7185' }}>▼</span> 3M</th>
                          <th style={{ textAlign: 'right' }}>50% <span style={{ color: '#34d399' }}>▲</span> 1M</th>
                          <th style={{ textAlign: 'right' }}>50% <span style={{ color: '#34d399' }}>▲</span> 3M</th>
                          <th style={{ textAlign: 'right' }}>13 EMA <span style={{ color: '#34d399' }}>▲</span></th>
                          <th style={{ textAlign: 'right' }}>13 EMA <span style={{ color: '#fb7185' }}>▼</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((row, idx) => {
                          const isStrongUp = row.gainers_4pct >= 300 || row.ratio_4pct >= 2.0;
                          const isStrongDown = row.losers_4pct >= 300 || row.ratio_4pct <= 0.5;

                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</td>

                              {/* KQ Regime */}
                              <td style={{ textAlign: 'center' }}>
                                {row.kq_regime === 'BULLISH' && (
                                  <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                                    🟢 BULLISH
                                  </span>
                                )}
                                {row.kq_regime === 'CAUTION' && (
                                  <span className="pill" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                                    🟡 CAUTION
                                  </span>
                                )}
                                {row.kq_regime === 'BEARISH' && (
                                  <span className="pill" style={{ background: 'rgba(244, 63, 94, 0.18)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                                    🔴 BEARISH
                                  </span>
                                )}
                                {!['BULLISH', 'CAUTION', 'BEARISH'].includes(row.kq_regime) && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                                )}
                              </td>

                              {/* 4% UP */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: isStrongUp ? 700 : 500,
                                  color: isStrongUp ? '#34d399' : 'var(--text-primary)',
                                  backgroundColor: row.gainers_4pct >= 500 ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
                                }}
                              >
                                {row.gainers_4pct.toLocaleString()}
                              </td>

                              {/* 4% DOWN */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: isStrongDown ? 700 : 500,
                                  color: isStrongDown ? '#fb7185' : 'var(--text-primary)',
                                  backgroundColor: row.losers_4pct >= 500 ? 'rgba(244, 63, 94, 0.15)' : 'transparent'
                                }}
                              >
                                {row.losers_4pct.toLocaleString()}
                              </td>

                              {/* Net 4% */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: row.net_4pct > 0 ? '#34d399' : row.net_4pct < 0 ? '#fb7185' : 'var(--text-secondary)'
                                }}
                              >
                                {row.net_4pct > 0 ? `+${row.net_4pct}` : row.net_4pct}
                              </td>

                              {/* Ratio */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: row.ratio_4pct >= 2.0 ? '#34d399' : row.ratio_4pct <= 0.5 ? '#fb7185' : 'var(--text-primary)'
                                }}
                              >
                                {row.ratio_4pct}x
                              </td>

                              {/* 5D Ratio */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: row.ratio_5d >= 2.0 ? '#34d399' : row.ratio_5d <= 0.5 ? '#fb7185' : 'var(--text-primary)'
                                }}
                              >
                                {row.ratio_5d}x
                              </td>

                              {/* 10D Ratio */}
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: row.ratio_10d >= 2.0 ? '#34d399' : row.ratio_10d <= 0.5 ? '#fb7185' : 'var(--text-primary)'
                                }}
                              >
                                {row.ratio_10d}x
                              </td>

                              {/* 25% UP 1M */}
                              <td style={{ textAlign: 'right', color: row.up_25pct_1m > row.down_25pct_1m ? '#34d399' : 'var(--text-primary)' }}>
                                {row.up_25pct_1m.toLocaleString()}
                              </td>

                              {/* 25% DOWN 1M */}
                              <td style={{ textAlign: 'right', color: row.down_25pct_1m > row.up_25pct_1m ? '#fb7185' : 'var(--text-primary)' }}>
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
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                {row.up_50pct_1m.toLocaleString()}
                              </td>

                              {/* 50% UP 3M */}
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                {row.up_50pct_3m.toLocaleString()}
                              </td>

                              {/* 13 EMA UP */}
                              <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 500 }}>
                                {row.ema_13_up}
                              </td>

                              {/* 13 EMA DOWN */}
                              <td style={{ textAlign: 'right', color: '#fb7185', fontWeight: 500 }}>
                                {row.ema_13_down}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {pageSize !== 'all' && totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, dailyData.length)} of {dailyData.length} sessions
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage >= totalPages}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

