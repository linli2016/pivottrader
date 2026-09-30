import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle
} from 'lightweight-charts';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export const STAGE_CONFIG = {
  'Stage 2': {
    label: 'Stage 2: Advancing Phase',
    short: 'Stage 2',
    accent: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    bias: 'Bullish - Strong group confirmation for new long positions'
  },
  'Stage 1': {
    label: 'Stage 1: Basing Area',
    short: 'Stage 1',
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    bias: 'Neutral - Accumulation & base building after prior decline'
  },
  'Stage 3': {
    label: 'Stage 3: Top / Distribution',
    short: 'Stage 3',
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    bias: 'Caution - Moving average flattening. Take profits, avoid new longs'
  },
  'Stage 4': {
    label: 'Stage 4: Declining Phase',
    short: 'Stage 4',
    accent: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
    bias: 'Bearish - Group in downtrend. Avoid buying, tighten stops / short'
  }
};

export default function GroupStageChart({
  groupType = 'industries',
  groupName = '',
  onSelectStock = () => {},
  height = 420,
  isCompact = false
}) {
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' (Stan Weinstein standard) | 'daily'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverBar, setHoverBar] = useState(null);

  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Fetch group bars whenever groupName, groupType, or timeframe changes
  useEffect(() => {
    if (!groupName) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const limit = timeframe === 'weekly' ? 160 : 300;
    const url = `${API_BASE}/api/groups/bars?type=${encodeURIComponent(groupType)}&name=${encodeURIComponent(groupName)}&timeframe=${timeframe}&limit=${limit}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          const bars = json.bars || [];
          if (bars.length > 0) {
            setHoverBar(bars[bars.length - 1]);
          } else {
            setHoverBar(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load group chart');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [groupType, groupName, timeframe]);

  // Construct chart using lightweight-charts
  useEffect(() => {
    if (!containerRef.current || !data || !data.bars || data.bars.length === 0) return;

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = containerRef.current;
    const chartHeight = height || 420;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: chartHeight,
      layout: {
        background: { color: '#0d131f' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b'
        },
        horzLine: {
          color: 'rgba(56, 189, 248, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b'
        }
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.05,
          bottom: 0.32
        },
        borderVisible: false,
        textColor: '#94a3b8'
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartInstanceRef.current = chart;

    // 1. Candlestick Series (Synthetic Group Price)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'custom',
        formatter: (p) => Number(p).toFixed(2)
      }
    });

    // 2. Volume Series (Histogram in bottom background)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.65,
        bottom: 0.33
      },
      visible: false
    });

    // 3. Weinstein 40-Week (or 200-Day) Moving Average Line (Primary Stage Anchor)
    const primaryMaSeries = chart.addSeries(LineSeries, {
      color: '#dfe9df',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: ''
    });

    // 4. Secondary 10-Week (or 50-Day) Moving Average Line (Trend Crosses)
    const secondaryMaSeries = chart.addSeries(LineSeries, {
      color: 'rgb(255, 152, 0)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: ''
    });

    // 5. Mansfield Relative Strength Sub-Pane (Oscillator vs SPY with 0 baseline)
    const mansfieldSeries = chart.addSeries(LineSeries, {
      color: '#38bdf8', // Cyan
      lineWidth: 1,
      priceScaleId: 'mansfield',
      priceLineVisible: false,
      lastValueVisible: false,
      title: ''
    });

    chart.priceScale('mansfield').applyOptions({
      scaleMargins: {
        top: 0.74,
        bottom: 0.02
      },
      borderVisible: true,
      textColor: '#38bdf8'
    });

    // Zero-line benchmark baseline on Mansfield RS scale
    mansfieldSeries.createPriceLine({
      price: 0,
      color: 'rgba(255, 255, 255, 0.25)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: ''
    });

    // Feed data to chart series
    const bars = data.bars || [];
    const candleData = [];
    const volData = [];
    const primaryMaData = [];
    const secondaryMaData = [];
    const mansfieldData = [];

    const maKey = timeframe === 'weekly' ? 'sma_40w' : 'sma_200d';
    const fastMaKey = timeframe === 'weekly' ? 'sma_10w' : 'sma_50d';

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const timeVal = b.date;

      candleData.push({
        time: timeVal,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close
      });

      const isUp = b.close >= b.open;
      volData.push({
        time: timeVal,
        value: b.volume || 0,
        color: isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'
      });

      if (b[maKey] !== null && b[maKey] !== undefined) {
        primaryMaData.push({
          time: timeVal,
          value: b[maKey]
        });
      }

      if (b[fastMaKey] !== null && b[fastMaKey] !== undefined) {
        secondaryMaData.push({
          time: timeVal,
          value: b[fastMaKey]
        });
      }

      if (b.mansfield_rs !== null && b.mansfield_rs !== undefined) {
        mansfieldData.push({
          time: timeVal,
          value: b.mansfield_rs
        });
      }
    }

    candleSeries.setData(candleData);
    volumeSeries.setData(volData);
    primaryMaSeries.setData(primaryMaData);
    secondaryMaSeries.setData(secondaryMaData);
    mansfieldSeries.setData(mansfieldData);

    // Initial view range: fit visible bars nicely
    chart.timeScale().fitContent();

    // Crosshair hover synchronization
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        if (bars.length > 0) {
          setHoverBar(bars[bars.length - 1]);
        }
        return;
      }
      const found = bars.find((b) => b.date === param.time);
      if (found) {
        setHoverBar(found);
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartInstanceRef.current) return;
      const { width: newWidth } = entries[0].contentRect;
      if (newWidth > 0) {
        chartInstanceRef.current.applyOptions({ width: newWidth });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [data, height, timeframe]);

  // Stage details resolution
  const stageInfo = useMemo(() => {
    if (!data || !data.stage_summary) {
      return {
        badge: 'Stage 1',
        label: 'Stage 1: Basing Area',
        accent: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.35)',
        bias: 'Analyzing group metrics...'
      };
    }
    const badge = data.stage_summary.stage_badge || 'Stage 1';
    const cfg = STAGE_CONFIG[badge] || STAGE_CONFIG['Stage 1'];
    return {
      badge,
      label: cfg.label,
      accent: cfg.accent,
      bg: cfg.bg,
      border: cfg.border,
      bias: data.stage_summary.bias || cfg.bias
    };
  }, [data]);

  const activeBar = hoverBar || (data?.bars && data.bars.length > 0 ? data.bars[data.bars.length - 1] : null);
  const breadth = data?.breadth || null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#0d131f',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* 1. Header Toolbar & Weinstein Stage Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                {groupName}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: stageInfo.bg,
                  color: stageInfo.accent,
                  border: `1px solid ${stageInfo.border}`
                }}
              >
                {stageInfo.label}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
              {stageInfo.bias}
            </div>
          </div>
        </div>

        {/* Timeframe Switcher (Weekly vs Daily) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '4px' }}>Timeframe:</span>
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <button
              type="button"
              onClick={() => setTimeframe('weekly')}
              style={{
                background: timeframe === 'weekly' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: timeframe === 'weekly' ? '#38bdf8' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Stan Weinstein canonical 40-week Stage Analysis"
            >
              Weekly (40w SMA)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('daily')}
              style={{
                background: timeframe === 'daily' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: timeframe === 'daily' ? '#38bdf8' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Daily 200-day SMA inflection timing"
            >
              Daily (200d SMA)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar (MA Slope, Mansfield RS, % > 200d MA, % Stage 2) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '11.5px',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>{timeframe === 'weekly' ? '40w MA' : '200d MA'}: </span>
          <span style={{ color: '#dfe9df', fontWeight: 600 }}>
            {data?.stage_summary?.ma_val ? Number(data.stage_summary.ma_val).toFixed(2) : '--'}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-secondary)' }}>MA Slope: </span>
          <span
            style={{
              fontWeight: 700,
              color: (data?.stage_summary?.ma_slope_pct || 0) > 0 ? '#34d399' : '#f87171'
            }}
          >
            {(data?.stage_summary?.ma_slope_pct || 0) >= 0 ? '+' : ''}
            {Number(data?.stage_summary?.ma_slope_pct || 0).toFixed(2)}%
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Mansfield RS: </span>
          <span
            style={{
              fontWeight: 700,
              color: (data?.stage_summary?.mansfield_rs || 0) >= 0 ? '#38bdf8' : '#f87171'
            }}
          >
            {(data?.stage_summary?.mansfield_rs || 0) >= 0 ? '+' : ''}
            {Number(data?.stage_summary?.mansfield_rs || 0).toFixed(2)}
          </span>
        </div>

        {breadth && (
          <>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Stocks &gt; 200d MA: </span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>
                {breadth.pct_above_200d}%
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10.5px', marginLeft: '4px' }}>
                ({breadth.above_200d_count}/{breadth.total_stocks})
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Stocks in Stage 2: </span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                {breadth.pct_in_stage2}%
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10.5px', marginLeft: '4px' }}>
                ({breadth.stage2_count}/{breadth.total_stocks})
              </span>
            </div>
          </>
        )}
      </div>

      {/* 3. Real-time Crosshair HUD info */}
      {activeBar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 16px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(255, 255, 255, 0.015)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Date: {activeBar.date}</span>
          <span>O: <strong style={{ color: '#e2e8f0' }}>{Number(activeBar.open).toFixed(2)}</strong></span>
          <span>H: <strong style={{ color: '#e2e8f0' }}>{Number(activeBar.high).toFixed(2)}</strong></span>
          <span>L: <strong style={{ color: '#e2e8f0' }}>{Number(activeBar.low).toFixed(2)}</strong></span>
          <span>C: <strong style={{ color: '#e2e8f0' }}>{Number(activeBar.close).toFixed(2)}</strong></span>
          {activeBar[timeframe === 'weekly' ? 'sma_10w' : 'sma_50d'] !== undefined && activeBar[timeframe === 'weekly' ? 'sma_10w' : 'sma_50d'] !== null && (
            <span style={{ color: 'rgb(255, 152, 0)' }}>
              {timeframe === 'weekly' ? '10w' : '50d'}: {Number(activeBar[timeframe === 'weekly' ? 'sma_10w' : 'sma_50d']).toFixed(2)}
            </span>
          )}
          {activeBar[timeframe === 'weekly' ? 'sma_40w' : 'sma_200d'] !== undefined && activeBar[timeframe === 'weekly' ? 'sma_40w' : 'sma_200d'] !== null && (
            <span style={{ color: '#dfe9df' }}>
              {timeframe === 'weekly' ? '40w' : '200d'}: {Number(activeBar[timeframe === 'weekly' ? 'sma_40w' : 'sma_200d']).toFixed(2)}
            </span>
          )}
          {activeBar.mansfield_rs !== undefined && (
            <span style={{ color: activeBar.mansfield_rs >= 0 ? '#38bdf8' : '#f87171' }}>
              MRS: {activeBar.mansfield_rs >= 0 ? '+' : ''}{Number(activeBar.mansfield_rs).toFixed(2)}
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
            Bar Stage: <strong style={{ color: activeBar.stage?.includes('Stage 2') ? '#10b981' : activeBar.stage?.includes('Stage 4') ? '#f43f5e' : '#38bdf8' }}>{activeBar.stage || '--'}</strong>
          </span>
        </div>
      )}

      {/* 4. Chart Viewport */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(13, 19, 31, 0.8)',
              zIndex: 10,
              color: 'var(--text-muted)'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '12px' }}>Calculating synthetic {groupName} stage bars...</div>
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(13, 19, 31, 0.9)',
              zIndex: 10,
              color: '#f87171',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend Overlay on Sub-Pane */}
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '12px',
            fontSize: '10.5px',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)'
          }}
        >
          Mansfield Relative Strength vs S&P 500 (Zero line = market parity)
        </div>
      </div>

      {/* 5. Constituent Leaders Row */}
      {breadth && breadth.leaders && breadth.leaders.length > 0 && !isCompact && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Top Group Leaders & Breakouts (Click to inspect stock)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {breadth.leaders.map((stk) => (
              <button
                key={stk.symbol}
                type="button"
                onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-brighten"
                title={`${stk.name} - RS Rank: ${stk.rs_rank}`}
              >
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{stk.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                  ${Number(stk.close).toFixed(2)}
                </span>
                {stk.dist_sma200_pct !== undefined && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: stk.dist_sma200_pct >= 0 ? '#34d399' : '#f87171'
                    }}
                  >
                    {stk.dist_sma200_pct >= 0 ? '+' : ''}{stk.dist_sma200_pct}%
                  </span>
                )}
                {stk.stage2_days > 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontWeight: 700
                    }}
                  >
                    Stage 2
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
