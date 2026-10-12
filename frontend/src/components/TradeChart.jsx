import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtQty(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Find closest trading date in bars if execution occurred on a weekend/holiday
function findClosestBarTime(targetDateStr, barTimes) {
  if (!targetDateStr || !barTimes.length) return null;
  if (barTimes.includes(targetDateStr)) return targetDateStr;
  
  // Find nearest date
  let closest = barTimes[0];
  let minDiff = Math.abs(new Date(targetDateStr).getTime() - new Date(closest).getTime());
  for (let i = 1; i < barTimes.length; i++) {
    const diff = Math.abs(new Date(targetDateStr).getTime() - new Date(barTimes[i]).getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = barTimes[i];
    }
  }
  return closest;
}

export default function TradeChart({
  symbol,
  trade,
  executions = [],
  currentStop = null,
  onSelectStock = null,
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch daily bars for symbol
  useEffect(() => {
    let cancelled = false;
    async function fetchBars() {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/prices?limit=300&timeframe=daily`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setBars(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchBars();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Construct and render Lightweight Chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || loading || !bars.length) return;

    // Remove any prior chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const width = container.clientWidth || 800;
    const height = 340;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        autoScale: true,
      },
    });

    chartInstanceRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const candleData = bars.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(candleData);

    // 50 SMA line if present in bar data
    const smaData = bars
      .filter((b) => b.sma_50 !== null && b.sma_50 !== undefined)
      .map((b) => ({ time: b.time, value: b.sma_50 }));
    if (smaData.length > 0) {
      const smaSeries = chart.addSeries(LineSeries, {
        color: 'rgba(56, 189, 248, 0.55)',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      smaSeries.setData(smaData);
    }

    // Price lines: Avg Entry, Initial Stop, Avg Exit
    if (trade?.avg_entry) {
      candleSeries.createPriceLine({
        price: trade.avg_entry,
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Entry: $${fmtNum(trade.avg_entry)}`,
      });
    }

    const effectiveStop = currentStop !== null && currentStop !== undefined ? Number(currentStop) : trade?.initial_stop;
    if (effectiveStop && !isNaN(effectiveStop) && effectiveStop > 0) {
      candleSeries.createPriceLine({
        price: effectiveStop,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Stop: $${fmtNum(effectiveStop)}`,
      });
    }

    if (trade?.avg_exit) {
      candleSeries.createPriceLine({
        price: trade.avg_exit,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Exit: $${fmtNum(trade.avg_exit)}`,
      });
    }

    // Build Execution Markers
    const barTimes = bars.map((b) => b.time);
    const rawExecutions = (executions && executions.length > 0) ? executions : (trade?.executions || []);
    
    // Group and sort markers chronologically
    const markers = [];
    const sortedExecs = [...rawExecutions].sort((a, b) => {
      const ta = a.date_time || a.trade_date || '';
      const tb = b.date_time || b.trade_date || '';
      return ta.localeCompare(tb);
    });

    for (const e of sortedExecs) {
      const rawDate = (e.date_time ? e.date_time.slice(0, 10) : e.trade_date) || '';
      const barTime = findClosestBarTime(rawDate, barTimes);
      if (!barTime) continue;

      const isBuy = e.side === 'BUY';
      const label = `${e.side} ${fmtQty(e.quantity)} @ $${fmtNum(e.price)}`;
      
      markers.push({
        time: barTime,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#10b981' : '#f43f5e',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: label,
      });
    }

    // lightweight-charts requires markers to be sorted by time ascending
    markers.sort((a, b) => a.time.localeCompare(b.time));

    if (markers.length > 0) {
      createSeriesMarkers(candleSeries, markers);
    }

    // Auto-focus time range around trade window
    const openDate = trade?.open_date || (sortedExecs[0]?.date_time?.slice(0, 10));
    const closeDate = trade?.close_date || (sortedExecs[sortedExecs.length - 1]?.date_time?.slice(0, 10));

    let openIdx = bars.findIndex((b) => b.time >= (openDate || ''));
    let closeIdx = closeDate ? bars.findIndex((b) => b.time >= closeDate) : bars.length - 1;

    if (openIdx === -1) openIdx = Math.max(0, bars.length - 40);
    if (closeIdx === -1) closeIdx = bars.length - 1;

    const fromIdx = Math.max(0, openIdx - 20);
    const toIdx = Math.min(bars.length - 1, closeIdx + 15);

    if (fromIdx < toIdx && bars[fromIdx] && bars[toIdx]) {
      chart.timeScale().setVisibleRange({
        from: bars[fromIdx].time,
        to: bars[toIdx].time,
      });
    } else {
      chart.timeScale().fitContent();
    }

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      if (!entries.length || !chartInstanceRef.current) return;
      const cr = entries[0].contentRect;
      if (cr.width > 0) {
        chartInstanceRef.current.applyOptions({ width: cr.width });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [bars, loading, trade, executions, currentStop]);

  return (
    <div className="jr-trade-chart-card">
      <div className="jr-trade-chart-header">
        <div className="jr-trade-chart-title-group">
          <span className="jr-trade-chart-title">
            <b>{symbol}</b> Price Chart &amp; Trade Markers
          </span>
          <span className="jr-trade-chart-badges">
            {trade?.direction && (
              <span className={`pill ${trade.direction === 'LONG' ? 'pill-success' : 'pill-danger'}`}>
                {trade.direction}
              </span>
            )}
            {trade?.holding_days !== undefined && trade?.holding_days !== null && (
              <span className="pill pill-secondary">{trade.holding_days}d held</span>
            )}
            {trade?.avg_entry && (
              <span className="jr-chart-legend-badge entry" title="Average Entry Price">
                Entry ${fmtNum(trade.avg_entry)}
              </span>
            )}
            {(currentStop || trade?.initial_stop) && (
              <span className="jr-chart-legend-badge stop" title="Initial Stop Price">
                Stop ${fmtNum(currentStop || trade?.initial_stop)}
              </span>
            )}
            {trade?.avg_exit && (
              <span className="jr-chart-legend-badge exit" title="Average Exit Price">
                Exit ${fmtNum(trade.avg_exit)}
              </span>
            )}
          </span>
        </div>
        {onSelectStock && (
          <button
            type="button"
            className="btn btn-ghost btn-sm jr-trade-chart-open-btn"
            onClick={() => onSelectStock(symbol)}
            title="Open stock in main Chart view"
          >
            ↗ Full Chart
          </button>
        )}
      </div>

      <div className="jr-trade-chart-canvas-wrap">
        {loading && (
          <div className="jr-trade-chart-status">
            <span className="spin-icon">⟳</span> Loading historical daily bars for {symbol}…
          </div>
        )}
        {!loading && error && (
          <div className="jr-trade-chart-status jr-neg">
            Unable to load price history: {error}
          </div>
        )}
        {!loading && !error && bars.length === 0 && (
          <div className="jr-trade-chart-status jr-muted">
            No historical daily bars found for {symbol} in database.
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="jr-trade-chart-canvas"
          style={{ display: loading || error || !bars.length ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}

