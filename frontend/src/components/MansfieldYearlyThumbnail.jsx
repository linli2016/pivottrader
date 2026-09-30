import React, { useState, useEffect, useMemo, useRef } from 'react';

// In-memory cache for full historical yearly bars to avoid redundant network round-trips
const yearlyBarsCache = new Map();

/**
 * Aggregates daily or weekly bars into yearly OHLCV bars.
 * Used for instant 0ms rendering and client-side fallback.
 */
export function aggregateBarsToYearly(bars) {
  if (!bars || bars.length === 0) return [];
  const yearlyMap = new Map();

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!bar || bar.close === undefined || bar.close === null) continue;

    let yearStr = '';
    if (typeof bar.time === 'string') {
      yearStr = bar.time.slice(0, 4);
    } else if (bar.time && bar.time.year) {
      yearStr = String(bar.time.year);
    } else if (bar.year) {
      yearStr = String(bar.year);
    } else {
      yearStr = String(bar.time || '').slice(0, 4);
    }

    if (!yearStr || yearStr.length < 4 || isNaN(parseInt(yearStr, 10))) continue;

    const op = bar.open !== undefined && bar.open !== null ? Number(bar.open) : Number(bar.close);
    const hi = bar.high !== undefined && bar.high !== null ? Number(bar.high) : Number(bar.close);
    const lo = bar.low !== undefined && bar.low !== null ? Number(bar.low) : Number(bar.close);
    const cl = Number(bar.close);
    const vol = Number(bar.volume) || 0;

    if (!yearlyMap.has(yearStr)) {
      yearlyMap.set(yearStr, {
        year: yearStr,
        open: op,
        high: hi,
        low: lo,
        close: cl,
        volume: vol,
        barCount: 1,
      });
    } else {
      const yBar = yearlyMap.get(yearStr);
      yBar.high = Math.max(yBar.high, hi);
      yBar.low = Math.min(yBar.low, lo);
      yBar.close = cl;
      yBar.volume += vol;
      yBar.barCount += 1;
    }
  }

  const yearlyBars = Array.from(yearlyMap.values());
  yearlyBars.sort((a, b) => a.year.localeCompare(b.year));
  return yearlyBars;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

function formatPriceTag(p) {
  if (p === null || p === undefined || isNaN(p)) return '';
  if (p >= 1000) return Math.round(p).toString();
  if (p >= 100) return Math.round(p).toString();
  if (p >= 10) return p.toFixed(1);
  return p.toFixed(2);
}

export default function MansfieldYearlyThumbnail({
  data = [],
  symbol = '',
  asOfDate = null,
  currentPrice = null,
  isVisible = true,
  bottom = '32px',
}) {
  const [remoteYearlyBars, setRemoteYearlyBars] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);
  const containerRef = useRef(null);

  // 1. Fetch complete historical yearly bars from the backend whenever symbol changes
  useEffect(() => {
    if (!symbol) {
      setRemoteYearlyBars([]);
      return;
    }

    const sym = symbol.toUpperCase();
    if (yearlyBarsCache.has(sym)) {
      setRemoteYearlyBars(yearlyBarsCache.get(sym));
      return;
    }

    let isMounted = true;
    fetch(`${API_BASE}/api/stocks/${sym}/prices?timeframe=yearly`)
      .then((res) => (res.ok ? res.json() : []))
      .then((json) => {
        if (!isMounted) return;
        if (Array.isArray(json) && json.length > 0) {
          const parsed = json.map((b) => ({
            year: String(b.year || b.time?.slice(0, 4) || ''),
            open: Number(b.open) || 0,
            high: Number(b.high) || 0,
            low: Number(b.low) || 0,
            close: Number(b.close) || 0,
            volume: Number(b.volume) || 0,
          })).filter(b => b.year.length === 4);

          parsed.sort((a, b) => a.year.localeCompare(b.year));
          yearlyBarsCache.set(sym, parsed);
          setRemoteYearlyBars(parsed);
        }
      })
      .catch(() => {
        // Fall back gracefully to client-side aggregation of data
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  // 2. Resolve final yearly bars: prioritize remote complete history, fallback to client-side aggregation
  const allYearlyBars = useMemo(() => {
    if (remoteYearlyBars && remoteYearlyBars.length > 0) {
      return remoteYearlyBars;
    }
    return aggregateBarsToYearly(data);
  }, [remoteYearlyBars, data]);

  // 3. Resolve active current / breakout price
  const activePrice = useMemo(() => {
    if (currentPrice !== null && currentPrice !== undefined && !isNaN(currentPrice)) {
      return Number(currentPrice);
    }
    if (data && data.length > 0) {
      if (asOfDate) {
        const asOfStr = String(asOfDate).slice(0, 10);
        let match = null;
        for (let i = 0; i < data.length; i++) {
          const t = typeof data[i].time === 'string' ? data[i].time : `${data[i].time?.year}-${String(data[i].time?.month).padStart(2, '0')}-${String(data[i].time?.day).padStart(2, '0')}`;
          if (t <= asOfStr) match = data[i];
          else break;
        }
        if (match && match.close !== undefined) return Number(match.close);
      }
      const last = data[data.length - 1];
      if (last && last.close !== undefined) return Number(last.close);
    }
    if (allYearlyBars && allYearlyBars.length > 0) {
      return allYearlyBars[allYearlyBars.length - 1].close;
    }
    return null;
  }, [currentPrice, data, asOfDate, allYearlyBars]);

  // 4. Stan Weinstein Overhead Supply Analysis
  const supplyAnalysis = useMemo(() => {
    if (!allYearlyBars || allYearlyBars.length === 0 || activePrice === null) {
      return null;
    }

    let allTimeHigh = -Infinity;
    let athYear = '';
    const overheadYears = [];

    for (const b of allYearlyBars) {
      if (b.high > allTimeHigh) {
        allTimeHigh = b.high;
        athYear = b.year;
      }
      if (b.high > activePrice + 0.001) {
        overheadYears.push({
          year: b.year,
          high: b.high,
          diffPct: ((b.high - activePrice) / activePrice) * 100,
        });
      }
    }

    const isBlueSky = activePrice >= allTimeHigh - 0.005;
    const distToAthPct = allTimeHigh > 0 ? ((activePrice - allTimeHigh) / allTimeHigh) * 100 : 0;

    return {
      allTimeHigh,
      athYear,
      isBlueSky,
      distToAthPct,
      overheadYears,
      totalYears: allYearlyBars.length,
    };
  }, [allYearlyBars, activePrice]);

  // Keep last 8-10 years for display so bar chart remains sharp and compact
  const displayBars = useMemo(() => {
    if (!allYearlyBars || allYearlyBars.length === 0) return [];
    if (allYearlyBars.length > 9) {
      return allYearlyBars.slice(-9);
    }
    return allYearlyBars;
  }, [allYearlyBars]);

  if (!isVisible || !displayBars || displayBars.length === 0 || activePrice === null) {
    return null;
  }

  // --- Dimensions: Ultra-compact, narrow footprint ---
  const svgWidth = 126;
  const svgHeight = 84;
  const padLeft = 4;
  const padRight = 24; // space for price tag at right
  const padTop = 13;   // space for mini ATH/Blue Sky text at top
  const padBottom = 13; // space for year labels

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Calculate price bounds
  let minP = activePrice;
  let maxP = activePrice;
  for (const b of displayBars) {
    if (b.low < minP) minP = b.low;
    if (b.high > maxP) maxP = b.high;
  }
  const pRange = maxP - minP || 1;
  const boundMin = Math.max(0, minP - pRange * 0.06);
  const boundMax = maxP + pRange * 0.06;
  const effectiveRange = boundMax - boundMin || 1;

  const getY = (price) => {
    return padTop + chartH - ((price - boundMin) / effectiveRange) * chartH;
  };

  const activeY = getY(activePrice);
  const nBars = displayBars.length;
  const slotW = chartW / Math.max(1, nBars);
  const tickLen = Math.max(2, Math.min(3.5, slotW * 0.32));

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: bottom || '32px',
        left: '0px',
        zIndex: 20,
        width: `${svgWidth + 6}px`,
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '5px',
        padding: '3px 3px 2px 3px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ position: 'relative', width: `${svgWidth}px`, height: `${svgHeight}px` }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ overflow: 'visible', display: 'block' }}
          onMouseLeave={() => setHoveredBar(null)}
        >
          {/* Subtle Top Indicator Text (No title bar, just clean data) */}
          <text
            x={padLeft}
            y={9}
            fill="#38bdf8"
            fontSize="7.5px"
            fontWeight="800"
            letterSpacing="0.4px"
          >
            YEARLY
          </text>

          {supplyAnalysis?.isBlueSky ? (
            <text
              x={padLeft + chartW}
              y={9}
              textAnchor="end"
              fill="#34d399"
              fontSize="7.5px"
              fontWeight="800"
            >
              ★ BLUE SKY
            </text>
          ) : (
            <text
              x={padLeft + chartW}
              y={9}
              textAnchor="end"
              fill="#fbbf24"
              fontSize="7px"
              fontWeight="700"
            >
              ATH ${formatPriceTag(supplyAnalysis?.allTimeHigh)} ({supplyAnalysis?.distToAthPct?.toFixed(0)}%)
            </text>
          )}

          {/* Current Breakout Level Reference Line */}
          <line
            x1={padLeft}
            y1={activeY}
            x2={padLeft + chartW}
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="2.5 2"
          />

          {/* Overhead Resistance Zone Shading (above breakout level) */}
          {activeY > padTop && (
            <rect
              x={padLeft}
              y={padTop}
              width={chartW}
              height={activeY - padTop}
              fill="rgba(248, 113, 113, 0.06)"
            />
          )}

          {/* Render OHLC Bar Charts */}
          {displayBars.map((bar, idx) => {
            const xCenter = padLeft + idx * slotW + slotW / 2;
            const yHigh = getY(bar.high);
            const yLow = getY(bar.low);
            const yOpen = getY(bar.open);
            const yClose = getY(bar.close);

            const isUp = bar.close >= bar.open;
            const barColor = isUp ? '#22c55e' : '#ef4444';
            const hasOverhead = bar.high > activePrice + 0.001;
            const isHovered = hoveredBar?.year === bar.year;

            return (
              <g
                key={bar.year}
                onMouseEnter={() => setHoveredBar(bar)}
                style={{ cursor: 'pointer' }}
              >
                {/* Vertical Range Bar (Low to High) */}
                <line
                  x1={xCenter}
                  y1={yHigh}
                  x2={xCenter}
                  y2={yLow}
                  stroke={barColor}
                  strokeWidth={isHovered ? 2.2 : 1.3}
                  strokeLinecap="round"
                />

                {/* Left Tick: Open */}
                <line
                  x1={xCenter - tickLen}
                  y1={yOpen}
                  x2={xCenter}
                  y2={yOpen}
                  stroke={barColor}
                  strokeWidth={isHovered ? 2 : 1.3}
                  strokeLinecap="round"
                />

                {/* Right Tick: Close */}
                <line
                  x1={xCenter}
                  y1={yClose}
                  x2={xCenter + tickLen}
                  y2={yClose}
                  stroke={barColor}
                  strokeWidth={isHovered ? 2 : 1.3}
                  strokeLinecap="round"
                />

                {/* Overhead Resistance Highlight: portion of bar extending above breakout level */}
                {hasOverhead && (
                  <>
                    <line
                      x1={xCenter}
                      y1={yHigh}
                      x2={xCenter}
                      y2={Math.min(activeY, yLow)}
                      stroke="#f87171"
                      strokeWidth={isHovered ? 2.6 : 1.8}
                      strokeLinecap="round"
                    />
                    {/* Small Resistance Cap at Year High */}
                    <line
                      x1={xCenter - 1.5}
                      y1={yHigh}
                      x2={xCenter + 1.5}
                      y2={yHigh}
                      stroke="#fca5a5"
                      strokeWidth="1.2"
                    />
                  </>
                )}

                {/* Year Label */}
                <text
                  x={xCenter}
                  y={svgHeight - 2}
                  textAnchor="middle"
                  fill={hasOverhead ? '#fca5a5' : 'rgba(255, 255, 255, 0.5)'}
                  fontSize="7px"
                  fontWeight={isHovered || hasOverhead ? 700 : 500}
                >
                  '{bar.year.slice(2)}
                </text>
              </g>
            );
          })}

          {/* Current Breakout Price Tag on the Right */}
          <rect
            x={padLeft + chartW + 2}
            y={Math.max(padTop - 2, Math.min(svgHeight - 16, activeY - 5.5))}
            width={padRight - 3}
            height="11"
            fill="#0284c7"
            rx="2"
          />
          <text
            x={padLeft + chartW + 3.5}
            y={Math.max(padTop - 2, Math.min(svgHeight - 16, activeY - 5.5)) + 8}
            fill="#ffffff"
            fontSize="7px"
            fontWeight="700"
          >
            ${formatPriceTag(activePrice)}
          </text>
        </svg>

        {/* Hover Tooltip Popover */}
        {hoveredBar && (
          <div
            style={{
              position: 'absolute',
              top: '-24px',
              left: '0px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: `1px solid ${hoveredBar.high > activePrice ? '#f87171' : '#38bdf8'}`,
              borderRadius: '4px',
              padding: '2px 5px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
              fontSize: '8.5px',
              color: '#ffffff',
              pointerEvents: 'none',
              zIndex: 30,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 800, color: '#38bdf8' }}>'{hoveredBar.year.slice(2)}: </span>
            <span>H ${formatPriceTag(hoveredBar.high)} L ${formatPriceTag(hoveredBar.low)} C ${formatPriceTag(hoveredBar.close)}</span>
            {hoveredBar.high > activePrice && (
              <span style={{ color: '#f87171', fontWeight: 700, marginLeft: '4px' }}>
                (+${formatPriceTag(hoveredBar.high - activePrice)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
