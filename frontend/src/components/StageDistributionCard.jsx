import React, { useState, useMemo, useRef, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export const STAGE_META = {
  1: {
    stage: 1,
    name: 'Stage 1: Basing',
    short: 'Stage 1',
    label: 'Basing Area',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    bias: 'Neutral • Base Accumulation',
    desc: '30W MA flat. Price oscillating in trading range after prior decline.'
  },
  2: {
    stage: 2,
    name: 'Stage 2: Advancing',
    short: 'Stage 2',
    label: 'Advancing Markup',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    bias: 'Bullish • Markup & Expansion',
    desc: 'Price > rising 30W MA. Higher highs & higher lows. Prime buying zone.'
  },
  3: {
    stage: 3,
    name: 'Stage 3: Topping',
    short: 'Stage 3',
    label: 'Top Distribution',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    bias: 'Caution • Top Distribution',
    desc: '30W MA flattens/rolls. Volatile churning near highs. Take profits.'
  },
  4: {
    stage: 4,
    name: 'Stage 4: Declining',
    short: 'Stage 4',
    label: 'Declining Markdown',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
    bias: 'Bearish • Markdown & Defense',
    desc: 'Price < falling 30W MA. Lower highs & lower lows. Cash & capital preservation.'
  }
};

export const STAGE_1_2_META = {
  name: 'Stage 1+2: Basing + Advancing',
  short: 'Stage 1+2',
  label: 'Basing & Advancing (Cumulative)',
  color: '#c084fc',
  bg: 'rgba(192, 132, 252, 0.12)',
  border: 'rgba(192, 132, 252, 0.35)',
  bias: 'Accumulation + Markup Cycle',
  desc: 'Combined breadth of Stage 1 (basing/accumulation) and Stage 2 (markup/uptrend) stocks.'
};

/**
 * StageDistributionCard:
 * Visualizes market-wide Stan Weinstein 4-Stage stock categorization:
 * 1. Current stock counts & percentages in Stage 1, 2, 3, and 4
 * 2. Visual stacked proportion bar
 * 3. Historical dynamics graph (1M, 3M, 6M, 1Y) with % share or count modes
 * 4. SPY benchmark overlay for cyclical divergence & stage expansion tracking
 */
export default function StageDistributionCard({
  stageDistribution = null,
  dailyData = [],
  asOfDate = null,
  isEmbedded = false,
  onNavigateToStage = null
}) {
  const [fetchedData, setFetchedData] = useState(null);
  const [timeRange, setTimeRange] = useState('6M'); // '1M', '3M', '6M', '1Y'
  const [viewMode, setViewMode] = useState('percent'); // 'percent', 'count'
  const [chartType, setChartType] = useState('stacked'); // 'stacked', 'lines'
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showStage12, setShowStage12] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);

  const containerRef = useRef(null);

  // If stageDistribution or dailyData is missing, fetch from API
  useEffect(() => {
    if (!stageDistribution || !dailyData || dailyData.length === 0) {
      const dateParam = asOfDate ? `?date=${asOfDate}` : '';
      fetch(`${API_BASE}/api/market/stages${dateParam}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.summary) {
            setFetchedData(data);
          }
        })
        .catch(err => console.error('Error fetching market stage distribution:', err));
    }
  }, [stageDistribution, dailyData, asOfDate]);

  const summary = stageDistribution || fetchedData?.summary;

  // Build chronological history array
  const rawHistory = useMemo(() => {
    if (dailyData && dailyData.length > 0) {
      // dailyData from /api/market-monitor is descending (latest first)
      const valid = dailyData.filter(d => d.stage1_count !== undefined || d.stage_total_count !== undefined);
      if (valid.length > 0) {
        return [...valid].reverse();
      }
    }
    if (fetchedData && Array.isArray(fetchedData.history)) {
      return fetchedData.history;
    }
    return [];
  }, [dailyData, fetchedData]);

  // Filter history based on selected timeRange
  const filteredHistory = useMemo(() => {
    if (!rawHistory || rawHistory.length === 0) return [];
    const limits = { '1M': 21, '3M': 63, '6M': 126, '1Y': 252 };
    const maxBars = limits[timeRange] || 126;
    return rawHistory.slice(-maxBars);
  }, [rawHistory, timeRange]);

  const n = filteredHistory.length;

  // Compute SVG layout dimensions
  const width = 940;
  const height = 280;
  const padding = { top: 22, right: showBenchmark ? 56 : 24, bottom: 26, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (i) => {
    if (n <= 1) return padding.left + plotWidth / 2;
    return padding.left + (i / (n - 1)) * plotWidth;
  };

  // Percent Y Scale (0% to 100%)
  const getYPercent = (pct) => {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    return padding.top + plotHeight - (clamped / 100) * plotHeight;
  };

  // Max count for count view mode
  const maxStockCount = useMemo(() => {
    if (viewMode !== 'count' || n === 0) return 5000;
    let m = 0;
    filteredHistory.forEach(d => {
      const tot = (d.stage1_count || 0) + (d.stage2_count || 0) + (d.stage3_count || 0) + (d.stage4_count || 0);
      if (tot > m) m = tot;
    });
    return Math.max(m, 1000);
  }, [filteredHistory, viewMode, n]);

  const getYCount = (cnt) => {
    const clamped = Math.max(0, Number(cnt) || 0);
    return padding.top + plotHeight - (clamped / maxStockCount) * plotHeight;
  };

  // Benchmark stats & Y Scale
  const benchmarkStats = useMemo(() => {
    if (!showBenchmark || n === 0) return { min: 0, max: 1 };
    const prices = filteredHistory.map(d => Number(d.spy_close)).filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.08 || 5;
    return { min: min - pad, max: max + pad };
  }, [filteredHistory, showBenchmark, n]);

  const getYBenchmark = (price) => {
    if (benchmarkStats.max <= benchmarkStats.min) return padding.top + plotHeight;
    const ratio = (price - benchmarkStats.min) / (benchmarkStats.max - benchmarkStats.min);
    return padding.top + plotHeight - Math.max(0, Math.min(1, ratio)) * plotHeight;
  };

  const polylineBenchmark = useMemo(() => {
    if (!showBenchmark || n === 0) return '';
    const points = [];
    filteredHistory.forEach((d, i) => {
      const p = Number(d.spy_close);
      if (!isNaN(p) && p > 0) {
        points.push(`${getX(i).toFixed(1)},${getYBenchmark(p).toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [filteredHistory, showBenchmark, benchmarkStats, n]);

  // Stage 1+2 Cumulative Line (Sum of Stage 1 Basing + Stage 2 Advancing)
  const polylineStage12 = useMemo(() => {
    if (!showStage12 || n === 0) return '';
    const isPct = viewMode === 'percent';
    const yFn = isPct ? getYPercent : getYCount;
    const points = [];
    filteredHistory.forEach((d, i) => {
      const s1 = isPct ? (d.stage1_pct ?? 0) : (d.stage1_count ?? 0);
      const s2 = isPct ? (d.stage2_pct ?? 0) : (d.stage2_count ?? 0);
      const val = (Number(s1) || 0) + (Number(s2) || 0);
      points.push(`${getX(i).toFixed(1)},${yFn(val).toFixed(1)}`);
    });
    return points.join(' ');
  }, [filteredHistory, showStage12, viewMode, maxStockCount, n]);

  // Stacked Area Paths (bottom to top: Stage 4 -> Stage 3 -> Stage 1 -> Stage 2)
  const stackedAreaPaths = useMemo(() => {
    if (chartType !== 'stacked' || n === 0) return null;

    // We stack:
    // Base 0 -> S4
    // S4 -> S4 + S3
    // S4 + S3 -> S4 + S3 + S1
    // S4 + S3 + S1 -> S4 + S3 + S1 + S2 (100%)
    const pts0 = [];
    const pts4 = [];
    const pts43 = [];
    const pts431 = [];
    const ptsTotal = [];

    const isPct = viewMode === 'percent';

    filteredHistory.forEach((d, i) => {
      const x = getX(i);
      const s1 = isPct ? (d.stage1_pct ?? 0) : (d.stage1_count ?? 0);
      const s2 = isPct ? (d.stage2_pct ?? 0) : (d.stage2_count ?? 0);
      const s3 = isPct ? (d.stage3_pct ?? 0) : (d.stage3_count ?? 0);
      const s4 = isPct ? (d.stage4_pct ?? 0) : (d.stage4_count ?? 0);

      const yFn = isPct ? getYPercent : getYCount;

      const y0 = yFn(0);
      const y4 = yFn(s4);
      const y43 = yFn(s4 + s3);
      const y431 = yFn(s4 + s3 + s1);
      const yTot = yFn(s4 + s3 + s1 + s2);

      pts0.push({ x, y: y0 });
      pts4.push({ x, y: y4 });
      pts43.push({ x, y: y43 });
      pts431.push({ x, y: y431 });
      ptsTotal.push({ x, y: yTot });
    });

    const buildPath = (bottomPts, topPts) => {
      const forward = topPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
      const backward = [...bottomPts].reverse().map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
      return `M ${forward} L ${backward} Z`;
    };

    return {
      stage4: buildPath(pts0, pts4),
      stage3: buildPath(pts4, pts43),
      stage1: buildPath(pts43, pts431),
      stage2: buildPath(pts431, ptsTotal),
      line2: ptsTotal.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      line4: pts4.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    };
  }, [filteredHistory, chartType, viewMode, n]);

  // Line paths for line mode
  const linePaths = useMemo(() => {
    if (chartType !== 'lines' || n === 0) return null;
    const isPct = viewMode === 'percent';
    const yFn = isPct ? getYPercent : getYCount;

    const s1Pts = filteredHistory.map((d, i) => `${getX(i).toFixed(1)},${yFn(isPct ? d.stage1_pct : d.stage1_count).toFixed(1)}`).join(' ');
    const s2Pts = filteredHistory.map((d, i) => `${getX(i).toFixed(1)},${yFn(isPct ? d.stage2_pct : d.stage2_count).toFixed(1)}`).join(' ');
    const s3Pts = filteredHistory.map((d, i) => `${getX(i).toFixed(1)},${yFn(isPct ? d.stage3_pct : d.stage3_count).toFixed(1)}`).join(' ');
    const s4Pts = filteredHistory.map((d, i) => `${getX(i).toFixed(1)},${yFn(isPct ? d.stage4_pct : d.stage4_count).toFixed(1)}`).join(' ');

    return { s1: s1Pts, s2: s2Pts, s3: s3Pts, s4: s4Pts };
  }, [filteredHistory, chartType, viewMode, n]);

  // Month boundary ticks
  const monthTicks = useMemo(() => {
    if (n === 0) return [];
    const ticks = [];
    let lastMonth = '';
    filteredHistory.forEach((d, i) => {
      if (!d.date) return;
      const month = d.date.substring(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(m, 10) - 1;
        const label = m === '01' ? `${monthNames[mIdx]} '${year.substring(2)}` : monthNames[mIdx];
        ticks.push({ x: getX(i), label });
      }
    });
    return ticks;
  }, [filteredHistory, n]);

  // Mouse interaction
  const handleMouseMove = (e) => {
    if (!containerRef.current || n === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
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

  const activeItem = hoverIndex !== null ? filteredHistory[hoverIndex] : filteredHistory[n - 1];

  const s1 = summary?.stage1 || { count: 0, pct: 0 };
  const s2 = summary?.stage2 || { count: 0, pct: 0 };
  const s3 = summary?.stage3 || { count: 0, pct: 0 };
  const s4 = summary?.stage4 || { count: 0, pct: 0 };
  const totalStocks = summary?.total_stocks || (s1.count + s2.count + s3.count + s4.count) || 1;
  const netExp = summary?.net_expansion ?? (s2.pct - s4.pct);

  const netBiasLabel = netExp >= 15
    ? 'Bullish Expansion (Stage 2 Dominant)'
    : netExp <= -15
      ? 'Bearish Contraction (Stage 4 Dominant)'
      : 'Rotational / Transition Phase';
  const netBiasColor = netExp >= 15 ? '#10b981' : netExp <= -15 ? '#f43f5e' : '#f59e0b';

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.45)',
        position: 'relative'
      }}
    >
      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="cockpit-card-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              STAN WEINSTEIN CYCLE FRAMEWORK
            </span>
            <span className="badge badge-outline" style={{ fontSize: '10.5px' }}>
              {totalStocks.toLocaleString()} Stocks Categorized
            </span>
            {asOfDate && (
              <span className="badge badge-outline" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                • As of {asOfDate}
              </span>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚖️ Stan Weinstein 4-Stage Market Distribution</span>
          </h2>
        </div>

        {/* Right Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Stage 1+2 Summary Badge */}
          <div
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              background: 'rgba(192, 132, 252, 0.08)',
              border: '1px solid rgba(192, 132, 252, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px'
            }}
            title="Stan Weinstein Bullish Foundation: Sum of Stage 1 (Basing) and Stage 2 (Advancing) stocks"
          >
            <span style={{ color: 'var(--text-muted)' }}>Stage 1+2:</span>
            <strong style={{ color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
              {((s1.pct || 0) + (s2.pct || 0)).toFixed(1)}%
            </strong>
            <span style={{ fontSize: '11px', color: '#c084fc', opacity: 0.85 }}>
              ({((s1.count || 0) + (s2.count || 0)).toLocaleString()})
            </span>
          </div>

          {/* Net Cycle Bias Badge */}
          <div
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${netBiasColor}40`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px'
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Net Expansion (S2 - S4):</span>
            <strong style={{ color: netBiasColor, fontFamily: 'var(--font-mono)' }}>
              {netExp >= 0 ? `+${netExp.toFixed(1)}%` : `${netExp.toFixed(1)}%`}
            </strong>
            <span style={{ fontSize: '11px', color: netBiasColor, fontWeight: 600 }}>
              ({netBiasLabel})
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowGraph(prev => !prev)}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            {showGraph ? '▲ Hide Graph' : '▼ Show History Graph'}
          </button>
        </div>
      </div>

      {/* 2. 4 Stage Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        {/* Stage 1: Basing */}
        <div
          style={{
            background: STAGE_META[1].bg,
            border: `1px solid ${STAGE_META[1].border}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: STAGE_META[1].color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🟦 Stage 1: Basing
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Accumulation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {s1.count.toLocaleString()}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: STAGE_META[1].color }}>
              ({s1.pct.toFixed(1)}%)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, flex: 1 }}>
              {STAGE_META[1].desc}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToStage) {
                  onNavigateToStage('stage1');
                } else {
                  window.dispatchEvent(new CustomEvent('pt-navigate-radar', { detail: { stageFilter: 'stage1', activeTab: 'industries' } }));
                  const radarNavBtn = document.querySelector('[title*="Industry Radar"]');
                  if (radarNavBtn) radarNavBtn.click();
                }
              }}
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.18)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
              className="hover-brighten"
              title="Inspect Stage 1 Basing groups in Industry Radar"
            >
              Scan Groups ↗
            </button>
          </div>
        </div>

        {/* Stage 2: Advancing */}
        <div
          style={{
            background: STAGE_META[2].bg,
            border: `1px solid ${STAGE_META[2].border}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: s2.pct >= 30 ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: STAGE_META[2].color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🟩 Stage 2: Advancing
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Markup</span>
              {summary?.delta_5d_stage2_pct !== undefined && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: summary.delta_5d_stage2_pct >= 0 ? '#34d399' : '#fb7185',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                  title="Change in Stage 2 % over past 5 sessions"
                >
                  {summary.delta_5d_stage2_pct >= 0 ? `+${summary.delta_5d_stage2_pct}%` : `${summary.delta_5d_stage2_pct}%`} 5d
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {s2.count.toLocaleString()}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: STAGE_META[2].color }}>
              ({s2.pct.toFixed(1)}%)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, flex: 1 }}>
              {STAGE_META[2].desc}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToStage) {
                  onNavigateToStage('stage2');
                } else {
                  window.dispatchEvent(new CustomEvent('pt-navigate-radar', { detail: { stageFilter: 'stage2', activeTab: 'industries' } }));
                  const radarNavBtn = document.querySelector('[title*="Industry Radar"]');
                  if (radarNavBtn) radarNavBtn.click();
                }
              }}
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
              className="hover-brighten"
              title="Inspect Stage 2 Advancing groups in Industry Radar"
            >
              Scan Groups ↗
            </button>
          </div>
        </div>

        {/* Stage 3: Topping */}
        <div
          style={{
            background: STAGE_META[3].bg,
            border: `1px solid ${STAGE_META[3].border}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: STAGE_META[3].color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🟨 Stage 3: Topping
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Distribution</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {s3.count.toLocaleString()}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: STAGE_META[3].color }}>
              ({s3.pct.toFixed(1)}%)
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            {STAGE_META[3].desc}
          </p>
        </div>

        {/* Stage 4: Declining */}
        <div
          style={{
            background: STAGE_META[4].bg,
            border: `1px solid ${STAGE_META[4].border}`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: s4.pct >= 40 ? '0 0 16px rgba(244, 63, 94, 0.2)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: STAGE_META[4].color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🟥 Stage 4: Declining
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Markdown</span>
              {summary?.delta_5d_stage4_pct !== undefined && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: summary.delta_5d_stage4_pct <= 0 ? '#34d399' : '#fb7185',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                  title="Change in Stage 4 % over past 5 sessions"
                >
                  {summary.delta_5d_stage4_pct >= 0 ? `+${summary.delta_5d_stage4_pct}%` : `${summary.delta_5d_stage4_pct}%`} 5d
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {s4.count.toLocaleString()}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: STAGE_META[4].color }}>
              ({s4.pct.toFixed(1)}%)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, flex: 1 }}>
              {STAGE_META[4].desc}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToStage) {
                  onNavigateToStage('stage4');
                } else {
                  window.dispatchEvent(new CustomEvent('pt-navigate-radar', { detail: { stageFilter: 'stage4', activeTab: 'industries' } }));
                  const radarNavBtn = document.querySelector('[title*="Industry Radar"]');
                  if (radarNavBtn) radarNavBtn.click();
                }
              }}
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#f43f5e',
                background: 'rgba(244, 63, 94, 0.18)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
              className="hover-brighten"
              title="Inspect Stage 4 Declining groups in Industry Radar"
            >
              Scan Groups ↗
            </button>
          </div>
        </div>
      </div>

      {/* 3. Combined Horizontal Proportion Bar */}
      <div style={{ marginBottom: showGraph ? '18px' : '0px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
          <span>Overall Market Proportions</span>
          <span>
            <strong style={{ color: '#c084fc', marginRight: '8px' }}>
              🟣 Stage 1+2: {((s1.pct || 0) + (s2.pct || 0)).toFixed(1)}% ({((s1.count || 0) + (s2.count || 0)).toLocaleString()})
            </strong>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)', marginRight: '8px' }}>•</span>
            <strong style={{ color: '#10b981' }}>{s2.pct.toFixed(1)}% Stage 2 Advancing</strong> vs <strong style={{ color: '#f43f5e' }}>{s4.pct.toFixed(1)}% Stage 4 Declining</strong>
          </span>
        </div>
        <div
          style={{
            height: '10px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '999px',
            overflow: 'hidden',
            display: 'flex',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ width: `${s2.pct}%`, background: STAGE_META[2].color, transition: 'width 0.3s ease' }} title={`Stage 2: ${s2.pct}%`} />
          <div style={{ width: `${s1.pct}%`, background: STAGE_META[1].color, transition: 'width 0.3s ease' }} title={`Stage 1: ${s1.pct}%`} />
          <div style={{ width: `${s3.pct}%`, background: STAGE_META[3].color, transition: 'width 0.3s ease' }} title={`Stage 3: ${s3.pct}%`} />
          <div style={{ width: `${s4.pct}%`, background: STAGE_META[4].color, transition: 'width 0.3s ease' }} title={`Stage 4: ${s4.pct}%`} />
        </div>
      </div>

      {/* 4. Historical Dynamics Graph */}
      {showGraph && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Graph Toolbar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '11.5px'
            }}
          >
            {/* Left: Legend Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                Stage Trajectory:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_META[2].color }} />
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Stage 2 (Advancing)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_META[1].color }} />
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Stage 1 (Basing)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_META[3].color }} />
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Stage 3 (Topping)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_META[4].color }} />
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Stage 4 (Declining)</span>
              </div>
              {showStage12 && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px', cursor: 'pointer' }}
                  onClick={() => setShowStage12(prev => !prev)}
                  title="Click to toggle Stage 1+2 cumulative line"
                >
                  <span style={{ width: '12px', height: '2.5px', background: '#c084fc', borderRadius: '1px' }} />
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>Stage 1+2 (Sum)</span>
                </div>
              )}
              {showBenchmark && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px', cursor: 'pointer' }}
                  onClick={() => setShowBenchmark(prev => !prev)}
                  title="Click to toggle SPY line"
                >
                  <span style={{ width: '12px', height: '2px', background: '#e2e8f0', borderTop: '1px dashed #ffffff' }} />
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>SPY Close</span>
                </div>
              )}
            </div>

            {/* Right: Controls (Chart Type, Mode, Benchmark & Timeframe) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Stacked vs Lines Toggle */}
              <div className="segmented-control" style={{ transform: 'scale(0.92)' }}>
                <button
                  type="button"
                  className={`segmented-item ${chartType === 'stacked' ? 'active' : ''}`}
                  onClick={() => setChartType('stacked')}
                >
                  Stacked Area
                </button>
                <button
                  type="button"
                  className={`segmented-item ${chartType === 'lines' ? 'active' : ''}`}
                  onClick={() => setChartType('lines')}
                >
                  Lines
                </button>
              </div>

              {/* % vs # Mode */}
              <div className="segmented-control" style={{ transform: 'scale(0.92)' }}>
                <button
                  type="button"
                  className={`segmented-item ${viewMode === 'percent' ? 'active' : ''}`}
                  onClick={() => setViewMode('percent')}
                >
                  %
                </button>
                <button
                  type="button"
                  className={`segmented-item ${viewMode === 'count' ? 'active' : ''}`}
                  onClick={() => setViewMode('count')}
                >
                  #
                </button>
              </div>

              {/* Stage 1+2 Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowStage12(prev => !prev)}
                className={`btn btn-xs ${showStage12 ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  backgroundColor: showStage12 ? 'rgba(192, 132, 252, 0.25)' : undefined,
                  color: showStage12 ? '#c084fc' : undefined,
                  borderColor: showStage12 ? 'rgba(192, 132, 252, 0.5)' : undefined
                }}
                title="Toggle Stage 1 + Stage 2 (Basing + Advancing sum) line"
              >
                Stage 1+2 {showStage12 ? '✓' : ''}
              </button>

              {/* SPY Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowBenchmark(prev => !prev)}
                className={`btn btn-xs ${showBenchmark ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
                title="Toggle SPY benchmark price overlay line"
              >
                SPY {showBenchmark ? '✓' : ''}
              </button>

              {/* Timeframe Selector */}
              <div className="segmented-control" style={{ transform: 'scale(0.92)' }}>
                {['1M', '3M', '6M', '1Y'].map(tf => (
                  <button
                    key={tf}
                    type="button"
                    className={`segmented-item ${timeRange === tf ? 'active' : ''}`}
                    onClick={() => setTimeRange(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ width: '100%', position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="gradStage2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="gradStage1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="gradStage3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="gradStage4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Background grid horizontal guidelines */}
              {[0, 25, 50, 75, 100].map(val => {
                const y = viewMode === 'percent' ? getYPercent(val) : getYCount((val / 100) * maxStockCount);
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + plotWidth}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeWidth="1"
                      strokeDasharray={val === 50 ? '3 3' : undefined}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      fill="#64748b"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                      textAnchor="end"
                    >
                      {viewMode === 'percent' ? `${val}%` : Math.round((val / 100) * maxStockCount)}
                    </text>
                  </g>
                );
              })}

              {/* Right Y-Axis: SPY benchmark price */}
              {showBenchmark && benchmarkStats.max > benchmarkStats.min && (
                <>
                  {[0, 0.5, 1].map((pct, idx) => {
                    const price = benchmarkStats.min + pct * (benchmarkStats.max - benchmarkStats.min);
                    const y = getYBenchmark(price);
                    return (
                      <text
                        key={idx}
                        x={padding.left + plotWidth + 8}
                        y={y + 3.5}
                        fill="#94a3b8"
                        fontSize="9.5"
                        fontFamily="var(--font-mono)"
                        textAnchor="start"
                      >
                        ${price.toFixed(0)}
                      </text>
                    );
                  })}
                </>
              )}

              {/* Month Vertical Dividers & Labels */}
              {monthTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={tick.x}
                    y1={padding.top}
                    x2={tick.x}
                    y2={padding.top + plotHeight}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="1"
                  />
                  <text
                    x={tick.x}
                    y={padding.top + plotHeight + 16}
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="var(--font-sans)"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Stacked Area Mode Paths */}
              {chartType === 'stacked' && stackedAreaPaths && (
                <>
                  {/* Stage 4 Area (Bottom) */}
                  <path d={stackedAreaPaths.stage4} fill="url(#gradStage4)" />
                  {/* Stage 3 Area */}
                  <path d={stackedAreaPaths.stage3} fill="url(#gradStage3)" />
                  {/* Stage 1 Area */}
                  <path d={stackedAreaPaths.stage1} fill="url(#gradStage1)" />
                  {/* Stage 2 Area (Top) */}
                  <path d={stackedAreaPaths.stage2} fill="url(#gradStage2)" />
                </>
              )}

              {/* Line Mode Polylines */}
              {chartType === 'lines' && linePaths && (
                <>
                  <polyline points={linePaths.s4} fill="none" stroke={STAGE_META[4].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={linePaths.s3} fill="none" stroke={STAGE_META[3].color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={linePaths.s1} fill="none" stroke={STAGE_META[1].color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={linePaths.s2} fill="none" stroke={STAGE_META[2].color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {/* Stage 1+2 Cumulative Line Overlay */}
              {showStage12 && polylineStage12 && (
                <polyline
                  points={polylineStage12}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.95"
                />
              )}

              {/* SPY Benchmark Dashed Line Overlay */}
              {showBenchmark && polylineBenchmark && (
                <polyline
                  points={polylineBenchmark}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
              )}

              {/* Hover Cursor Vertical Line */}
              {hoverIndex !== null && (
                <>
                  <line
                    x1={getX(hoverIndex)}
                    y1={padding.top}
                    x2={getX(hoverIndex)}
                    y2={padding.top + plotHeight}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  {/* Circle dot for SPY benchmark if active */}
                  {showBenchmark && activeItem?.spy_close && (
                    <circle
                      cx={getX(hoverIndex)}
                      cy={getYBenchmark(Number(activeItem.spy_close))}
                      r="4"
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  )}
                  {/* Circle dot for Stage 1+2 if active */}
                  {showStage12 && activeItem && (
                    <circle
                      cx={getX(hoverIndex)}
                      cy={
                        viewMode === 'percent'
                          ? getYPercent((Number(activeItem.stage1_pct) || 0) + (Number(activeItem.stage2_pct) || 0))
                          : getYCount((Number(activeItem.stage1_count) || 0) + (Number(activeItem.stage2_count) || 0))
                      }
                      r="4.5"
                      fill="#c084fc"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
            </svg>

            {/* Hover Floating Tooltip */}
            {hoverIndex !== null && activeItem && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: getX(hoverIndex) > width * 0.65 ? `${(getX(hoverIndex) / width) * 100 - 24}%` : `${(getX(hoverIndex) / width) * 100 + 2}%`,
                  transform: getX(hoverIndex) > width * 0.65 ? 'translateX(-100%)' : 'none',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '11.5px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  minWidth: '210px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '5px', marginBottom: '6px' }}>
                  <strong style={{ color: '#ffffff' }}>{activeItem.date}</strong>
                  {activeItem.spy_close && (
                    <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      SPY: ${Number(activeItem.spy_close).toFixed(2)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c084fc', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '3px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700 }}>🟣 Stage 1+2 (Sum):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {((Number(activeItem.stage1_pct) || 0) + (Number(activeItem.stage2_pct) || 0)).toFixed(1)}% ({((Number(activeItem.stage1_count) || 0) + (Number(activeItem.stage2_count) || 0)).toLocaleString()})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: STAGE_META[2].color }}>
                    <span>🟩 Stage 2 Advancing:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {(activeItem.stage2_pct ?? 0).toFixed(1)}% ({(activeItem.stage2_count ?? 0).toLocaleString()})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: STAGE_META[1].color }}>
                    <span>🟦 Stage 1 Basing:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {(activeItem.stage1_pct ?? 0).toFixed(1)}% ({(activeItem.stage1_count ?? 0).toLocaleString()})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: STAGE_META[3].color }}>
                    <span>🟨 Stage 3 Topping:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {(activeItem.stage3_pct ?? 0).toFixed(1)}% ({(activeItem.stage3_count ?? 0).toLocaleString()})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: STAGE_META[4].color }}>
                    <span>🟥 Stage 4 Declining:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {(activeItem.stage4_pct ?? 0).toFixed(1)}% ({(activeItem.stage4_count ?? 0).toLocaleString()})
                    </strong>
                  </div>

                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Net Expansion (S2 - S4):</span>
                    <strong style={{ color: (activeItem.stage_net_pct ?? 0) >= 0 ? '#34d399' : '#fb7185', fontFamily: 'var(--font-mono)' }}>
                      {(activeItem.stage_net_pct ?? 0) >= 0 ? `+${(activeItem.stage_net_pct ?? 0).toFixed(1)}%` : `${(activeItem.stage_net_pct ?? 0).toFixed(1)}%`}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
