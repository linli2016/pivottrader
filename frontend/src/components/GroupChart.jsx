import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  PriceScaleMode,
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

export default function GroupChart({
  groupType = 'industries',
  groupName = '',
  date = null,
  onSelectStock = () => {},
  height = 420,
  showHeader = true,
  showGroupName = false,
  showStageBadge = true,
  showStageBias = false,
  isCompact = false,
  onDataLoaded = null,
  children = null
}) {
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' (Stan Weinstein standard) | 'daily'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Fetch group bars whenever groupName, groupType, date, or timeframe changes
  useEffect(() => {
    if (!groupName) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const limit = timeframe === 'weekly' ? 160 : 300;
    const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
    const url = `${API_BASE}/api/groups/bars?type=${encodeURIComponent(groupType)}&name=${encodeURIComponent(groupName)}&timeframe=${timeframe}&limit=${limit}${dateParam}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          if (onDataLoaded) {
            onDataLoaded(json);
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
  }, [groupType, groupName, timeframe, date]);

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

    const isLogScale = (() => {
      try {
        localStorage.removeItem('pt_chart_scale_mode');
        const saved = localStorage.getItem('pt_chart_scale_mode_v2');
        if (saved !== null) return saved === 'log';
        return true;
      } catch {
        return true;
      }
    })();

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
        mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
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
        short: 'Stage 1',
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
      short: cfg.short || badge,
      label: cfg.label,
      accent: cfg.accent,
      bg: cfg.bg,
      border: cfg.border,
      bias: data.stage_summary.bias || cfg.bias
    };
  }, [data]);

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
      {showHeader && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: isCompact ? 'wrap' : 'nowrap',
            gap: isCompact ? '6px' : '12px',
            padding: isCompact ? '6px 10px' : '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
            {showGroupName && groupName && (
              <h3 style={{ margin: 0, fontSize: isCompact ? '12px' : '14px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
                {groupName}
              </h3>
            )}
            {showStageBadge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: isCompact ? '2px 8px' : '3px 10px',
                  borderRadius: '12px',
                  background: stageInfo.bg,
                  color: stageInfo.accent,
                  border: `1px solid ${stageInfo.border}`,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                title={stageInfo.label}
              >
                {isCompact ? (stageInfo.short || stageInfo.badge || stageInfo.label) : stageInfo.label}
              </span>
            )}
            {showStageBias && !isCompact && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {stageInfo.bias}
              </span>
            )}
          </div>

          {/* Timeframe Switcher (Weekly vs Daily) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {!isCompact && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '4px' }}>Timeframe:</span>
            )}
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
                  padding: isCompact ? '2px 7px' : '3px 9px',
                  fontSize: isCompact ? '10px' : '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Stan Weinstein canonical 40-week Stage Analysis"
              >
                {isCompact ? 'Weekly (40w)' : 'Weekly (40w SMA)'}
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('daily')}
                style={{
                  background: timeframe === 'daily' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: timeframe === 'daily' ? '#38bdf8' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: isCompact ? '2px 7px' : '3px 9px',
                  fontSize: isCompact ? '10px' : '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Daily 200-day SMA inflection timing"
              >
                {isCompact ? 'Daily' : 'Daily (200d SMA)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Chart Viewport */}
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
            fontSize: isCompact ? '9.5px' : '10.5px',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {isCompact
            ? 'Mansfield RS vs SPY'
            : 'Mansfield Relative Strength vs S&P 500 (Zero line = market parity)'}
        </div>
      </div>

      {/* 5. Custom children (e.g. Constituent Leaders Row) */}
      {children}
    </div>
  );
}
