import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers, CrosshairMode } from 'lightweight-charts';

// Helper to calculate Simple Moving Average (SMA)
function calculateSMA(data, period, key = 'close') {
  if (!data || data.length < period) return [];
  const smaData = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const val = Number(data[i][key]) || 0;
    sum += val;
    if (i >= period) {
      sum -= Number(data[i - period][key]) || 0;
    }
    if (i >= period - 1) {
      smaData.push({
        time: data[i].time,
        value: sum / period
      });
    }
  }
  return smaData;
}

// Helper to calculate Exponential Moving Average (EMA)
function calculateEMA(data, period) {
  if (!data || data.length < period) return [];
  const emaData = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  emaData.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const currentClose = data[i].close;
    const currentEma = (currentClose - prevEma) * multiplier + prevEma;
    emaData.push({ time: data[i].time, value: currentEma });
    prevEma = currentEma;
  }
  return emaData;
}

// Custom Primitive to draw a vertical dashed line for As-of Date
class VerticalLinePrimitive {
  constructor(time, options = {}) {
    this._time = time;
    this._options = options;
    this._chart = null;
    this._series = null;
    this._requestUpdate = () => {};
    this._paneView = {
      renderer: () => ({
        draw: (target) => this._draw(target),
        drawBackground: (target) => this._draw(target),
      }),
      zOrder: () => 'top',
    };
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = () => {};
  }

  updateTime(time) {
    this._time = time;
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  paneViews() {
    return [this._paneView];
  }

  _draw(target) {
    if (!this._chart || !this._series || !this._time) return;
    const timeScale = this._chart.timeScale();
    const x = timeScale.timeToCoordinate(this._time);
    if (x === null || x < 0) return;

    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio, bitmapSize }) => {
      const pixelX = Math.round(x * horizontalPixelRatio);
      if (pixelX < 0 || pixelX > bitmapSize.width) return;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3 * horizontalPixelRatio, 3 * horizontalPixelRatio]);
      ctx.strokeStyle = this._options.color || 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1 * horizontalPixelRatio;
      ctx.moveTo(pixelX, 0);
      ctx.lineTo(pixelX, bitmapSize.height);
      ctx.stroke();
      ctx.restore();
    });
  }
}

// Helper to resolve the matching time bar index in data
function resolveAsOfIndex(data, targetDate) {
  if (!data || data.length === 0 || !targetDate || targetDate === 'latest') return -1;
  const exact = data.findIndex(d => d.time === targetDate);
  if (exact !== -1) return exact;

  let best = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].time <= targetDate) {
      best = i;
    } else {
      break;
    }
  }
  return best;
}

function formatVolume(vol) {
  if (vol === null || vol === undefined || isNaN(vol)) return '0';
  const num = Number(vol);
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

export default function CandlestickChart({ data, height = 280, asOfDate = null, symbol = null }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersPluginRef = useRef(null);
  const verticalLineRef = useRef(null);
  const legendRef = useRef(null);
  const dataLookupRef = useRef({ timeMap: new Map(), data: [], defaultBar: null, defaultPrevBar: null, symbol: null });

  const renderLegend = (bar, prevBar, symbolStr) => {
    if (!legendRef.current) return;
    if (!bar) {
      legendRef.current.innerHTML = '';
      legendRef.current.style.display = 'none';
      return;
    }

    legendRef.current.style.display = 'block';

    const open = Number(bar.open ?? 0);
    const high = Number(bar.high ?? 0);
    const low = Number(bar.low ?? 0);
    const close = Number(bar.close ?? 0);
    const volume = bar.volume ?? bar.value ?? 0;

    const prevClose = prevBar ? Number(prevBar.close) : open;
    const change = close - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const isUp = change >= 0;
    const isCandleGreen = close >= open;

    const ohlcColor = isCandleGreen ? '#34d399' : '#f87171';
    const changeColor = isUp ? '#34d399' : '#f87171';
    const changeSign = isUp ? '+' : '';
    const volFormatted = formatVolume(volume);

    legendRef.current.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-variant-numeric: tabular-nums; line-height: 1.2;">
        ${symbolStr ? `<span style="font-weight: 700; color: #f8fafc; margin-right: 2px;">${symbolStr} · 1D</span>` : ''}
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">O</span><span style="color: ${ohlcColor}; font-weight: 600;">${open.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">H</span><span style="color: ${ohlcColor}; font-weight: 600;">${high.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">L</span><span style="color: ${ohlcColor}; font-weight: 600;">${low.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">C</span><span style="color: ${ohlcColor}; font-weight: 600;">${close.toFixed(2)}</span></span>
        <span style="color: ${changeColor}; font-weight: 700;">${changeSign}${change.toFixed(2)} (${changeSign}${changePct.toFixed(2)}%)</span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">Vol</span><span style="color: #38bdf8; font-weight: 600;">${volFormatted}</span></span>
      </div>
    `;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart if it doesn't exist yet
    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#161e2f' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        timeScale: {
          rightOffset: 3,
          fixRightEdge: false,
        },
        width: chartContainerRef.current.clientWidth || 700,
        height: height,
      });

      // Configure main price scale with logarithmic scale (mode: 1) and bottom margin for volume
      chart.priceScale('right').applyOptions({
        mode: 1, // Logarithmic price scale
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      });

      // Add Volume Histogram Series at the bottom 20%
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      const volumeMa50Series = chart.addSeries(LineSeries, {
        color: 'rgba(255, 255, 0, 0.5)',
        lineWidth: 1,
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
        visible: false,
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      const ema10Series = chart.addSeries(LineSeries, {
        color: 'rgb(255, 152, 0)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const ema20Series = chart.addSeries(LineSeries, {
        color: 'rgb(189, 15, 15)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const sma50Series = chart.addSeries(LineSeries, {
        color: 'rgb(255, 235, 59)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const sma150Series = chart.addSeries(LineSeries, {
        color: 'rgb(0, 255, 255)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const sma220Series = chart.addSeries(LineSeries, {
        color: '#dfe9df',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      // Attach Markers Plugin and Vertical Line Primitive
      const markersPlugin = createSeriesMarkers(candlestickSeries, []);
      markersPluginRef.current = markersPlugin;

      const vertLinePrimitive = new VerticalLinePrimitive(null, { color: 'rgba(56, 189, 248, 0.45)', lineWidth: 1 });
      candlestickSeries.attachPrimitive(vertLinePrimitive);
      verticalLineRef.current = vertLinePrimitive;

      chartRef.current = chart;
      seriesRef.current = {
        candlestickSeries,
        volumeSeries,
        volumeMa50Series,
        ema10Series,
        ema20Series,
        sma50Series,
        sma150Series,
        sma220Series,
      };

      // Subscribe to Crosshair Movement for Interactive OHLC + Volume Legend
      chart.subscribeCrosshairMove((param) => {
        const { timeMap, data: currentData, defaultBar, defaultPrevBar, symbol: curSymbol } = dataLookupRef.current;
        if (!param || !param.time || !param.seriesData || !seriesRef.current?.candlestickSeries) {
          renderLegend(defaultBar, defaultPrevBar, curSymbol);
          return;
        }

        const candle = param.seriesData.get(seriesRef.current.candlestickSeries);
        if (!candle || candle.close === undefined) {
          renderLegend(defaultBar, defaultPrevBar, curSymbol);
          return;
        }

        const tKey = typeof param.time === 'string' ? param.time : (param.time?.year ? `${param.time.year}-${String(param.time.month).padStart(2, '0')}-${String(param.time.day).padStart(2, '0')}` : String(param.time));
        const idx = timeMap.get(tKey);
        const prevBar = idx !== undefined && idx > 0 ? currentData[idx - 1] : null;
        const volData = seriesRef.current.volumeSeries ? param.seriesData.get(seriesRef.current.volumeSeries) : null;
        const volume = volData?.value ?? (idx !== undefined ? currentData[idx]?.volume : 0);

        const bar = {
          time: param.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: volume,
        };

        renderLegend(bar, prevBar, curSymbol);
      });
    }

    // Always update height and container width
    const currentContainerWidth = chartContainerRef.current.clientWidth;
    const currentContainerHeight = chartContainerRef.current.clientHeight;
    const targetHeight = typeof height === 'number' ? height : (currentContainerHeight > 0 ? currentContainerHeight : 280);
    const targetWidth = currentContainerWidth > 0 ? currentContainerWidth : 700;

    chartRef.current.applyOptions({
      height: targetHeight,
      width: targetWidth,
    });

    // Populate or update series data whenever data prop is available
    if (data && data.length > 0 && seriesRef.current) {
      const {
        candlestickSeries,
        volumeSeries,
        volumeMa50Series,
        ema10Series,
        ema20Series,
        sma50Series,
        sma150Series,
        sma220Series,
      } = seriesRef.current;

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: (d.close >= d.open) ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }));

      volumeSeries.setData(volumeData);
      volumeMa50Series.setData(calculateSMA(data, 50, 'volume'));
      candlestickSeries.setData(data);
      ema10Series.setData(calculateEMA(data, 10));
      ema20Series.setData(calculateEMA(data, 20));
      sma50Series.setData(calculateSMA(data, 50));
      sma150Series.setData(calculateSMA(data, 150));
      sma220Series.setData(calculateSMA(data, 220));

      // Resolve and apply As-of Date vertical line
      const asOfIdx = resolveAsOfIndex(data, asOfDate);
      const resolvedTime = asOfIdx !== -1 ? data[asOfIdx].time : null;
      if (markersPluginRef.current) {
        markersPluginRef.current.setMarkers([]);
      }
      if (resolvedTime && verticalLineRef.current) {
        verticalLineRef.current.updateTime(resolvedTime);
      } else {
        if (verticalLineRef.current) verticalLineRef.current.updateTime(null);
      }

      // Prepare data lookup for fast crosshair legend updates
      const timeMap = new Map();
      data.forEach((d, i) => {
        const tKey = typeof d.time === 'string' ? d.time : (d.time?.year ? `${d.time.year}-${String(d.time.month).padStart(2, '0')}-${String(d.time.day).padStart(2, '0')}` : String(d.time));
        timeMap.set(tKey, i);
      });

      const defaultIdx = (asOfIdx !== -1) ? asOfIdx : (data.length - 1);
      const defaultBar = defaultIdx >= 0 ? data[defaultIdx] : null;
      const defaultPrevBar = defaultIdx > 0 ? data[defaultIdx - 1] : null;

      dataLookupRef.current = {
        timeMap,
        data: data,
        defaultBar,
        defaultPrevBar,
        symbol,
      };

      // Render default (latest or as-of date) bar stats in legend
      renderLegend(defaultBar, defaultPrevBar, symbol);

      const RIGHT_MARGIN_BARS = 3;
      const POST_AS_OF_BARS = 40; // Position the As-of Date bar with ~40 bars on its right to the border

      chartRef.current.timeScale().applyOptions({
        rightOffset: RIGHT_MARGIN_BARS,
      });

      requestAnimationFrame(() => {
        if (chartRef.current && data && data.length > 0) {
          try {
            let toIndex = data.length - 1 + RIGHT_MARGIN_BARS;
            if (asOfIdx !== -1) {
              const targetTo = asOfIdx + POST_AS_OF_BARS;
              if (targetTo < toIndex) {
                toIndex = targetTo;
              }
            }

            const fromIndex = Math.max(0, toIndex - 189);
            chartRef.current.timeScale().setVisibleLogicalRange({
              from: fromIndex,
              to: toIndex,
            });
          } catch (err) {
            console.warn('Error setting visible logical range with as-of date:', err);
          }
        }
      });
    } else {
      renderLegend(null, null, symbol);
    }
  }, [data, height, asOfDate, symbol]);

  // Clean up chart instance on component unmount & handle container resize
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current && container) {
        const newWidth = Math.floor(entries[0].contentRect?.width || container.clientWidth);
        const containerH = Math.floor(container.clientHeight || entries[0].contentRect?.height);
        const newHeight = typeof height === 'number' ? height : (containerH > 0 ? containerH : 280);
        if (newWidth > 0 && newHeight > 0) {
          chartRef.current.applyOptions({ width: newWidth, height: newHeight });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        markersPluginRef.current = null;
        verticalLineRef.current = null;
      }
    };
  }, [height]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : (height || '100%'),
        minHeight: typeof height === 'number' ? `${height}px` : '240px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* TradingView-style OHLC + Daily Changes + Volume Legend Overlay */}
      <div
        ref={legendRef}
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          zIndex: 5,
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          padding: '4px 10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
          maxWidth: 'calc(100% - 24px)',
        }}
      />

      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          position: 'relative',
        }}
      />
    </div>
  );
}

