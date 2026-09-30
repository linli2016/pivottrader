import React, { useState, useMemo, useRef } from 'react';

/**
 * MarketPulseDynamicsChart:
 * Visualizes historical CANSLIM / Deepvue Market Pulse dynamics over time:
 * 1. Multi-MA Breadth percentiles (% of universe above 21d EMA, 50d SMA, and 200d SMA).
 * 2. Institutional Distribution Pressure (rolling 25-day institutional selling counts with 5% rally rule).
 * 3. SPY / QQQ benchmark price overlay for divergence & confirmation analysis.
 * 4. Key breadth threshold guides (80% overbought extension, 50% neutral, 20% washout oversold).
 */
export default function MarketPulseDynamicsChart({
  history = [],
  asOfDate = null,
  isEmbedded = false
}) {
  const [timeRange, setTimeRange] = useState('1Y'); // '1M', '3M', '6M', '1Y'
  const [showMa21, setShowMa21] = useState(true);
  const [showMa50, setShowMa50] = useState(true);
  const [showMa200, setShowMa200] = useState(true);
  const [showDistBars, setShowDistBars] = useState(true);
  const [benchmark, setBenchmark] = useState('SPY'); // 'SPY', 'QQQ', 'NONE'
  const [hoverIndex, setHoverIndex] = useState(null);

  const containerRef = useRef(null);

  // Filter history according to selected timeframe
  const filteredData = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];

    let sorted = [...history].sort((a, b) => (a.date > b.date ? 1 : -1));

    // Limit lookback
    const sessionLimits = {
      '1M': 21,
      '3M': 63,
      '6M': 126,
      '1Y': 252
    };
    const maxBars = sessionLimits[timeRange] || 252;
    return sorted.slice(-maxBars);
  }, [history, timeRange]);

  // Chart dimensions & layout
  const width = 860;
  const height = 300;
  const padding = { top: 22, right: benchmark !== 'NONE' ? 52 : 22, bottom: 24, left: 42 };

  // Vertical split between Breadth panel (top) and Distribution histogram (bottom)
  const distPanelHeight = showDistBars ? 52 : 0;
  const gapBetweenPanels = showDistBars ? 12 : 0;
  const breadthPanelHeight = height - padding.top - padding.bottom - distPanelHeight - gapBetweenPanels;

  const breadthTop = padding.top;
  const breadthBottom = breadthTop + breadthPanelHeight;

  const distTop = breadthBottom + gapBetweenPanels;
  const distBottom = distTop + distPanelHeight;

  const plotWidth = width - padding.left - padding.right;

  // Compute X coordinates
  const n = filteredData.length;
  const getX = (index) => {
    if (n <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (n - 1)) * plotWidth;
  };

  // Breadth Y Scale: fixed 0% to 100% for standard breadth indicators
  const getYBreadth = (val) => {
    const clamped = Math.max(0, Math.min(100, Number(val) || 0));
    return breadthBottom - (clamped / 100) * breadthPanelHeight;
  };

  // Benchmark Y Scale: dynamic based on min/max close in window
  const benchmarkStats = useMemo(() => {
    if (benchmark === 'NONE' || n === 0) return { min: 0, max: 1 };
    const key = benchmark === 'QQQ' ? 'qqq_close' : 'spy_close';
    const prices = filteredData.map(d => Number(d[key])).filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.08 || 5;
    return { min: min - pad, max: max + pad };
  }, [filteredData, benchmark, n]);

  const getYBenchmark = (val) => {
    if (benchmarkStats.max <= benchmarkStats.min) return breadthBottom;
    const ratio = (val - benchmarkStats.min) / (benchmarkStats.max - benchmarkStats.min);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return breadthBottom - clampedRatio * breadthPanelHeight;
  };

  // Distribution pressure Y Scale: max of 10 or max in series
  const maxDist = useMemo(() => {
    let max = 6;
    filteredData.forEach(d => {
      const p = Number(d.distribution_pressure) || 0;
      if (p > max) max = p;
    });
    return max;
  }, [filteredData]);

  const getYDist = (val) => {
    const clamped = Math.max(0, Number(val) || 0);
    return distBottom - (clamped / maxDist) * distPanelHeight;
  };

  // Generate SVG Polylines
  const polylineMa21 = useMemo(() => {
    if (!showMa21 || n === 0) return '';
    return filteredData.map((d, i) => `${getX(i).toFixed(1)},${getYBreadth(d.pct_above_21).toFixed(1)}`).join(' ');
  }, [filteredData, showMa21, n]);

  const polylineMa50 = useMemo(() => {
    if (!showMa50 || n === 0) return '';
    return filteredData.map((d, i) => `${getX(i).toFixed(1)},${getYBreadth(d.pct_above_50).toFixed(1)}`).join(' ');
  }, [filteredData, showMa50, n]);

  const polylineMa200 = useMemo(() => {
    if (!showMa200 || n === 0) return '';
    return filteredData.map((d, i) => `${getX(i).toFixed(1)},${getYBreadth(d.pct_above_200).toFixed(1)}`).join(' ');
  }, [filteredData, showMa200, n]);

  const polylineBenchmark = useMemo(() => {
    if (benchmark === 'NONE' || n === 0) return '';
    const key = benchmark === 'QQQ' ? 'qqq_close' : 'spy_close';
    const validPoints = [];
    filteredData.forEach((d, i) => {
      const price = Number(d[key]);
      if (!isNaN(price) && price > 0) {
        validPoints.push(`${getX(i).toFixed(1)},${getYBenchmark(price).toFixed(1)}`);
      }
    });
    return validPoints.join(' ');
  }, [filteredData, benchmark, benchmarkStats, n]);

  // Month boundary ticks for clean timeline labeling
  const monthTicks = useMemo(() => {
    if (n === 0) return [];
    const ticks = [];
    let lastMonth = '';
    filteredData.forEach((d, i) => {
      if (!d.date) return;
      const month = d.date.substring(0, 7); // YYYY-MM
      if (month !== lastMonth) {
        lastMonth = month;
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(m, 10) - 1;
        const label = m === '01' ? `${monthNames[mIdx]} '${year.substring(2)}` : monthNames[mIdx];
        ticks.push({
          x: getX(i),
          date: d.date,
          label
        });
      }
    });
    return ticks;
  }, [filteredData, n]);

  // Mouse interaction for tooltip
  const handleMouseMove = (e) => {
    if (!containerRef.current || n === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    // Find nearest data point
    const relativeX = (svgX - padding.left) / plotWidth;
    const clampedRatio = Math.max(0, Math.min(1, relativeX));
    const index = Math.round(clampedRatio * (n - 1));
    if (index >= 0 && index < n) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div
        style={{
          padding: '30px 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ marginBottom: '6px', fontSize: '18px' }}>📊</div>
        <div>No historical dynamics data recorded for this period.</div>
      </div>
    );
  }

  const activeItem = hoverIndex !== null ? filteredData[hoverIndex] : filteredData[n - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Top Toolbar: Timeframe Selector, Benchmark Selector & Series Toggles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px'
        }}
      >
        {/* Left: Metric Series Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* % > 21d Toggle */}
          <button
            type="button"
            onClick={() => setShowMa21(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1px solid ${showMa21 ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              background: showMa21 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: showMa21 ? '#38bdf8' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '8px', height: '2px', backgroundColor: '#38bdf8' }} />
            <span>% &gt; 21d EMA</span>
          </button>

          {/* % > 50d Toggle */}
          <button
            type="button"
            onClick={() => setShowMa50(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1px solid ${showMa50 ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
              background: showMa50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: showMa50 ? '#10b981' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '8px', height: '2px', backgroundColor: '#10b981' }} />
            <span>% &gt; 50d SMA</span>
          </button>

          {/* % > 200d Toggle */}
          <button
            type="button"
            onClick={() => setShowMa200(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1px solid ${showMa200 ? '#c084fc' : 'rgba(255, 255, 255, 0.1)'}`,
              background: showMa200 ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: showMa200 ? '#c084fc' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '8px', height: '2px', backgroundColor: '#c084fc' }} />
            <span>% &gt; 200d SMA</span>
          </button>

          {/* Distribution Bars Toggle */}
          <button
            type="button"
            onClick={() => setShowDistBars(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1px solid ${showDistBars ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)'}`,
              background: showDistBars ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: showDistBars ? '#f43f5e' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '1px', backgroundColor: '#f43f5e' }} />
            <span>Dist. Bars</span>
          </button>
        </div>

        {/* Right: Benchmark selector & Timeframe Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Benchmark Overlay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Overlay:</span>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="SPY">SPY (S&P 500)</option>
              <option value="QQQ">QQQ (Nasdaq 100)</option>
              <option value="NONE">None</option>
            </select>
          </div>

          {/* Timeframe Buttons */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {['1M', '3M', '6M', '1Y'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                style={{
                  background: timeRange === range ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  border: 'none',
                  color: timeRange === range ? '#38bdf8' : '#94a3b8',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: timeRange === range ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Summary Strip on Hover / Latest */}
      {activeItem && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: '5px 10px',
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '11px',
            color: '#cbd5e1',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>
              📅 {activeItem.date}
            </span>
            {hoverIndex !== null ? (
              <span style={{ color: '#38bdf8', fontSize: '10.5px', fontWeight: 600 }}>• Inspected Session</span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '10.5px' }}>• Latest Session</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {showMa21 && (
              <span>
                <strong style={{ color: '#38bdf8' }}>&gt;21d:</strong> {activeItem.pct_above_21?.toFixed(1)}%
              </span>
            )}
            {showMa50 && (
              <span>
                <strong style={{ color: '#10b981' }}>&gt;50d:</strong> {activeItem.pct_above_50?.toFixed(1)}%
              </span>
            )}
            {showMa200 && (
              <span>
                <strong style={{ color: '#c084fc' }}>&gt;200d:</strong> {activeItem.pct_above_200?.toFixed(1)}%
              </span>
            )}
            {showDistBars && (
              <span>
                <strong style={{ color: activeItem.distribution_pressure >= 5 ? '#ef4444' : activeItem.distribution_pressure >= 3 ? '#f59e0b' : '#34d399' }}>
                  Dist. Pressure:
                </strong>{' '}
                {activeItem.distribution_pressure}{' '}
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  (SPY: {activeItem.spy_dist ?? 0}, QQQ: {activeItem.qqq_dist ?? 0})
                </span>
              </span>
            )}
            {benchmark !== 'NONE' && (
              <span>
                <strong style={{ color: '#f59e0b' }}>{benchmark}:</strong>{' '}
                ${benchmark === 'QQQ' ? activeItem.qqq_close?.toFixed(2) : activeItem.spy_close?.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          position: 'relative',
          cursor: 'crosshair',
          userSelect: 'none'
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            background: 'rgba(0, 0, 0, 0.28)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }}
        >
          <defs>
            {/* Gradient for Overbought / Washout Zones */}
            <linearGradient id="overboughtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="oversoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* 1. Background Grid & Zones for Breadth Panel */}
          {/* Overbought zone: 80% to 100% */}
          <rect
            x={padding.left}
            y={getYBreadth(100)}
            width={plotWidth}
            height={getYBreadth(80) - getYBreadth(100)}
            fill="url(#overboughtGrad)"
          />
          {/* Oversold zone: 0% to 20% */}
          <rect
            x={padding.left}
            y={getYBreadth(20)}
            width={plotWidth}
            height={getYBreadth(0) - getYBreadth(20)}
            fill="url(#oversoldGrad)"
          />

          {/* Reference Lines: 80%, 50%, 20% */}
          {[80, 50, 20].map((level) => {
            const y = getYBreadth(level);
            return (
              <g key={`level-${level}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={level === 50 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)'}
                  strokeDasharray={level === 50 ? '4 4' : '2 3'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Month vertical grid separators */}
          {monthTicks.map((tick, i) => (
            <g key={`month-tick-${i}`}>
              <line
                x1={tick.x}
                y1={breadthTop}
                x2={tick.x}
                y2={showDistBars ? distBottom : breadthBottom}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="2 3"
              />
              <text
                x={tick.x}
                y={height - 8}
                fill="#64748b"
                fontSize="9.5"
                textAnchor="middle"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Right Y-Axis: Benchmark Price scale if active */}
          {benchmark !== 'NONE' && (
            <g>
              {[0.15, 0.5, 0.85].map((ratio, idx) => {
                const val = benchmarkStats.min + ratio * (benchmarkStats.max - benchmarkStats.min);
                const y = getYBenchmark(val);
                return (
                  <text
                    key={`bm-axis-${idx}`}
                    x={width - padding.right + 6}
                    y={y + 3.5}
                    fill="#f59e0b"
                    fontSize="9.5"
                    fontWeight="500"
                    textAnchor="start"
                  >
                    ${val.toFixed(0)}
                  </text>
                );
              })}
            </g>
          )}

          {/* 2. Benchmark Overlay Line (SPY / QQQ) */}
          {benchmark !== 'NONE' && polylineBenchmark && (
            <polyline
              points={polylineBenchmark}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.1"
              strokeDasharray="3 2"
              strokeOpacity="0.8"
            />
          )}

          {/* 3. Breadth Trend Lines */}
          {showMa200 && polylineMa200 && (
            <polyline
              points={polylineMa200}
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.9"
            />
          )}
          {showMa50 && polylineMa50 && (
            <polyline
              points={polylineMa50}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {showMa21 && polylineMa21 && (
            <polyline
              points={polylineMa21}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 4. Lower Panel: Distribution Pressure Histogram */}
          {showDistBars && (
            <g>
              {/* Distribution baseline & divider */}
              <line
                x1={padding.left}
                y1={distTop - gapBetweenPanels / 2}
                x2={width - padding.right}
                y2={distTop - gapBetweenPanels / 2}
                stroke="rgba(255, 255, 255, 0.1)"
              />
              <line
                x1={padding.left}
                y1={distBottom}
                x2={width - padding.right}
                y2={distBottom}
                stroke="rgba(255, 255, 255, 0.1)"
              />

              {/* Threshold 5 Line (Elevated institutional distribution alert) */}
              {maxDist >= 5 && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getYDist(5)}
                    x2={width - padding.right}
                    y2={getYDist(5)}
                    stroke="rgba(239, 68, 68, 0.35)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 6}
                    y={getYDist(5) + 3}
                    fill="#ef4444"
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    5D
                  </text>
                </g>
              )}

              {/* Distribution Bars */}
              {filteredData.map((d, i) => {
                const count = Number(d.distribution_pressure) || 0;
                if (count <= 0) return null;
                const x = getX(i);
                const y = getYDist(count);
                const barHeight = Math.max(2, distBottom - y);
                const barWidth = Math.max(1.8, (plotWidth / n) * 0.7);

                // Color code: >= 5 red, 3-4 amber, 1-2 green
                const color = count >= 5 ? '#ef4444' : count >= 3 ? '#f59e0b' : '#10b981';

                return (
                  <rect
                    key={`dist-bar-${i}`}
                    x={x - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    opacity={hoverIndex === i ? 1 : 0.8}
                    rx="1"
                  />
                );
              })}

              <text
                x={padding.left}
                y={distTop - 3}
                fill="#64748b"
                fontSize="9"
                fontWeight="700"
                letterSpacing="0.04em"
              >
                DISTRIBUTION PRESSURE (SPY & QQQ ROLLING 25-DAY)
              </text>
            </g>
          )}

          {/* 5. Highlight As-Of Date Vertical Indicator */}
          {asOfDate && (
            (() => {
              const asOfIdx = filteredData.findIndex(d => d.date === asOfDate);
              if (asOfIdx >= 0) {
                const asOfX = getX(asOfIdx);
                return (
                  <g key="as-of-marker">
                    <line
                      x1={asOfX}
                      y1={breadthTop}
                      x2={asOfX}
                      y2={showDistBars ? distBottom : breadthBottom}
                      stroke="#38bdf8"
                      strokeWidth="1.1"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={asOfX}
                      cy={breadthTop + 6}
                      r="2.8"
                      fill="#38bdf8"
                    />
                  </g>
                );
              }
              return null;
            })()
          )}

          {/* 6. Hover Crosshair & Data Indicator Dots */}
          {hoverIndex !== null && (
            <g key="hover-crosshair">
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={breadthTop}
                x2={getX(hoverIndex)}
                y2={showDistBars ? distBottom : breadthBottom}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Point on % > 21d */}
              {showMa21 && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getYBreadth(activeItem.pct_above_21)}
                  r="3.2"
                  fill="#38bdf8"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}

              {/* Point on % > 50d */}
              {showMa50 && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getYBreadth(activeItem.pct_above_50)}
                  r="3.2"
                  fill="#10b981"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}

              {/* Point on % > 200d */}
              {showMa200 && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getYBreadth(activeItem.pct_above_200)}
                  r="3.2"
                  fill="#c084fc"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />
              )}

              {/* Point on Benchmark */}
              {benchmark !== 'NONE' && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getYBenchmark(benchmark === 'QQQ' ? activeItem.qqq_close : activeItem.spy_close)}
                  r="2.8"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  strokeWidth="1.0"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Footer Notes & Key Insights */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#64748b',
          padding: '0 2px',
          flexWrap: 'wrap',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            <strong style={{ color: '#ef4444' }}>80%:</strong> Overbought
          </span>
          <span>
            <strong style={{ color: '#94a3b8' }}>50%:</strong> Equilibrium
          </span>
          <span>
            <strong style={{ color: '#10b981' }}>20%:</strong> Washout
          </span>
        </div>
        <div>
          <span>{filteredData.length} sessions</span>
        </div>
      </div>
    </div>
  );
}
