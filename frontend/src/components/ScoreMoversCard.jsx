import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

/**
 * Renders an SVG sparkline showing historical score trajectory (0-100 scale).
 */
const renderScoreSparkline = (sparklineScores, isGain) => {
  const width = 64;
  const height = 28;
  const padY = 3;

  if (!sparklineScores || sparklineScores.length < 2) {
    return <div style={{ width, height }} />;
  }

  const minVal = 0;
  const maxVal = 100;
  const range = maxVal - minVal;

  const points = sparklineScores.map((val, idx) => {
    const x = (idx / (sparklineScores.length - 1)) * width;
    const norm = Math.max(0, Math.min(100, val));
    // Higher score = closer to top (lower y)
    const y = height - padY - ((norm - minVal) / range) * (height - 2 * padY);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  const strokeColor = isGain ? '#10b981' : '#f43f5e';
  const fillColor = isGain ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'hidden', flexShrink: 0 }}>
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function ScoreMoversCard({
  latestDate,
  onSelectStock,
  onNavigateLeaderboard
}) {
  const [timeframe, setTimeframe] = useState('1d'); // '1d', '5d', '20d'
  const [moversData, setMoversData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/score-movers?timeframe=${timeframe}${latestDate ? `&date=${latestDate}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMoversData(data);
      } else {
        setError(`Failed to load score movers (${res.status})`);
      }
    } catch (err) {
      console.error('Error loading score movers:', err);
      setError('Network error loading score movers');
    } finally {
      setLoading(false);
    }
  }, [timeframe, latestDate]);

  useEffect(() => {
    fetchMovers();
  }, [fetchMovers]);

  const gains = moversData?.biggest_gains || [];
  const drops = moversData?.biggest_drops || [];
  const asOfDate = moversData?.as_of_date || latestDate || '';

  const timeframeLabels = {
    '1d': '1D Daily Shift',
    '5d': '5D Weekly Shift',
    '20d': '20D Monthly Shift'
  };

  const renderStockRow = (stock, isGain) => {
    const deltaStr = stock.delta > 0 ? `+${stock.delta}` : `${stock.delta}`;
    const arrow = isGain ? '▲' : '▼';
    const deltaColor = isGain ? '#10b981' : '#f43f5e';

    return (
      <div
        key={stock.symbol}
        className="score-mover-row"
        onClick={() => onSelectStock && onSelectStock(stock)}
        title={`${stock.symbol} - ${stock.name}\nPrice: $${stock.close?.toFixed(2) || '-'} (${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct?.toFixed(2) || 0}%)\nADR: ${stock.adr_20d?.toFixed(1) || '-'}%\nSector: ${stock.sector || 'N/A'}\nClick to inspect chart`}
      >
        {/* Symbol */}
        <div className="score-mover-sym-col">
          <span className="score-mover-sym">{stock.symbol}</span>
        </div>

        {/* Company Name */}
        <div className="score-mover-name-col">
          <span className="score-mover-name">{stock.name}</span>
        </div>

        {/* Sparkline */}
        <div className="score-mover-sparkline-col">
          {renderScoreSparkline(stock.sparkline, isGain)}
        </div>

        {/* Score & Delta */}
        <div className="score-mover-score-col">
          <div className="score-mover-score-val">
            Pivot {stock.score}
          </div>
          <div className="score-mover-delta-val" style={{ color: deltaColor }}>
            <span>{arrow}</span>
            <span>{deltaStr}</span>
            <span>Δ</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card score-movers-card">
      {/* Card Header */}
      <div className="score-movers-header">
        <div className="score-movers-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="score-movers-title">Pivot Score Movers</h3>
            <span className="score-movers-badge">
              {timeframeLabels[timeframe] || 'Daily Shift'}
            </span>
          </div>
          <div className="score-movers-subtitle">
            Scores as of {asOfDate} • Tracking universe velocity & score momentum shifts
            {onNavigateLeaderboard && (
              <span
                className="score-movers-upgrade-link"
                onClick={onNavigateLeaderboard}
                role="button"
                tabIndex={0}
              >
                View Leaderboard ↗
              </span>
            )}
          </div>
        </div>

        {/* Right Controls: Timeframe Selector */}
        <div className="score-movers-controls">
          <div className="segmented-control" style={{ padding: '2px' }}>
            <button
              className={`segmented-item ${timeframe === '1d' ? 'active' : ''}`}
              onClick={() => setTimeframe('1d')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              1D
            </button>
            <button
              className={`segmented-item ${timeframe === '5d' ? 'active' : ''}`}
              onClick={() => setTimeframe('5d')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              5D
            </button>
            <button
              className={`segmented-item ${timeframe === '20d' ? 'active' : ''}`}
              onClick={() => setTimeframe('20d')}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              20D
            </button>
          </div>
        </div>
      </div>

      {/* Content: Two-Column Grid */}
      {loading && !moversData ? (
        <div className="cockpit-loading-placeholder" style={{ padding: '24px 0' }}>
          <span className="spin-icon">⟳</span> Calculating score movers...
        </div>
      ) : error ? (
        <div className="cockpit-empty-state" style={{ color: '#f43f5e' }}>{error}</div>
      ) : (
        <div className="score-movers-grid">
          {/* Column 1: Biggest Gains */}
          <div className="score-movers-col">
            <div className="score-movers-col-header">
              <span className="score-movers-col-title">Biggest gains</span>
              <span className="score-movers-count-badge gain">
                {gains.length}
              </span>
            </div>

            <div className="score-movers-list">
              {gains.length === 0 ? (
                <div className="score-movers-empty">No positive movers found</div>
              ) : (
                gains.map((s) => renderStockRow(s, true))
              )}
            </div>
          </div>

          {/* Column 2: Biggest Drops */}
          <div className="score-movers-col">
            <div className="score-movers-col-header">
              <span className="score-movers-col-title">Biggest drops</span>
              <span className="score-movers-count-badge drop">
                {drops.length}
              </span>
            </div>

            <div className="score-movers-list">
              {drops.length === 0 ? (
                <div className="score-movers-empty">No negative movers found</div>
              ) : (
                drops.map((s) => renderStockRow(s, false))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

