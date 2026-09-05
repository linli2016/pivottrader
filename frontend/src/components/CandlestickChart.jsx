import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
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

// Calculate responsive visible bars based on container width
// 1 trading month ~ 21 trading days (bars).
// For laptop screens (~700-900px): ~147 bars (7 months).
// For larger monitors (>1200px): scales smoothly up to ~252 bars (>9-12 months).
function getResponsiveVisibleBars(containerWidth) {
  const w = containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
  const bars = Math.round(w / 5.4);
  return Math.max(147, Math.min(252, bars));
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

function drawCanvasRoundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function compositeChartScreenshot(rawChartCanvas, { symbol, setupName, date, bar, prevBar }) {
  // Target native balanced resolution (~1100px width) for ultra-compact file size (~50-80KB) while preserving sharp detail
  const maxTargetWidth = 1100;
  const srcWidth = rawChartCanvas.width || 1100;
  const srcHeight = rawChartCanvas.height || 600;
  let outWidth = srcWidth;
  let outHeight = srcHeight;

  if (srcWidth > maxTargetWidth) {
    outWidth = maxTargetWidth;
    outHeight = Math.round(srcHeight * (maxTargetWidth / srcWidth));
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = outWidth;
  exportCanvas.height = outHeight;
  const ctx = exportCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw raw lightweight-chart canvas scaled cleanly
  ctx.drawImage(rawChartCanvas, 0, 0, outWidth, outHeight);

  // Compute scale based on rendered width vs display container width
  const scale = outWidth / (rawChartCanvas.clientWidth || 700) || 1;
  const padX = 14 * scale;
  const padY = 10 * scale;

  // 2. Draw Top-Left OHLC Header Badge
  const open = Number(bar?.open ?? 0);
  const high = Number(bar?.high ?? 0);
  const low = Number(bar?.low ?? 0);
  const close = Number(bar?.close ?? 0);
  const volume = bar?.volume ?? bar?.value ?? 0;
  const prevClose = prevBar ? Number(prevBar.close) : open;
  const change = close - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const isUp = change >= 0;
  const isCandleGreen = close >= open;

  const ohlcColor = isCandleGreen ? '#34d399' : '#f87171';
  const changeColor = isUp ? '#34d399' : '#f87171';
  const changeSign = isUp ? '+' : '';
  const volFormatted = formatVolume(volume);

  const fontSize = Math.max(11 * scale, 12);
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  const bannerTextParts = [
    { text: symbol ? `${symbol}` : '', color: '#f8fafc', bold: true },
    { text: date ? `(${date})` : '', color: '#94a3b8' },
    { text: '  O', color: '#94a3b8' },
    { text: open.toFixed(2), color: ohlcColor },
    { text: 'H', color: '#94a3b8' },
    { text: high.toFixed(2), color: ohlcColor },
    { text: 'L', color: '#94a3b8' },
    { text: low.toFixed(2), color: ohlcColor },
    { text: 'C', color: '#94a3b8' },
    { text: close.toFixed(2), color: ohlcColor },
    { text: `${changeSign}${change.toFixed(2)} (${changeSign}${changePct.toFixed(2)}%)`, color: changeColor, bold: true },
    { text: 'Vol', color: '#94a3b8' },
    { text: volFormatted, color: '#38bdf8', bold: true }
  ].filter(p => p.text);

  let bannerWidth = 16 * scale;
  for (const part of bannerTextParts) {
    if (part.bold) ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    else ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    bannerWidth += ctx.measureText(part.text + ' ').width;
  }

  const bannerHeight = 28 * scale;
  drawCanvasRoundRect(ctx, padX, padY, bannerWidth, bannerHeight, 6 * scale);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  let curX = padX + 10 * scale;
  const textY = padY + (bannerHeight / 2) + (fontSize * 0.35);

  for (const part of bannerTextParts) {
    if (part.bold) ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    else ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = part.color;
    ctx.fillText(part.text, curX, textY);
    curX += ctx.measureText(part.text + ' ').width;
  }

  return exportCanvas;
}



const CandlestickChart = forwardRef(function CandlestickChart({
  data,
  height = 280,
  asOfDate = null,
  symbol = null,
  setupName = null,
  companyName = null,
  showScreenshotButton = false,
  onScreenshotSaved = null
}, ref) {
  const rootContainerRef = useRef(null);
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersPluginRef = useRef(null);
  const verticalLineRef = useRef(null);
  const legendRef = useRef(null);
  const dataLookupRef = useRef({ timeMap: new Map(), data: [], defaultBar: null, defaultPrevBar: null, symbol: null });
  const lastCancelTimestampRef = useRef(0);

  const [savingScreenshot, setSavingScreenshot] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // TradingView-style Measurement Tool ("Ruler") State
  const [measureState, setMeasureState] = useState(null);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isMeasureModeActive, setIsMeasureModeActive] = useState(false);
  const [rangeUpdateTick, setRangeUpdateTick] = useState(0);
  const measureStateRef = useRef(null);
  measureStateRef.current = measureState;

  // Global Shift and Escape key listeners for TradingView measurement workflow
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftDown(true);
      }
      if (e.key === 'Escape') {
        setMeasureState(null);
        setIsMeasureModeActive(false);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Suppress browser context menu unconditionally when cancelling measurement via right-click
  useEffect(() => {
    const container = rootContainerRef.current;
    if (!container) return;

    const handleRootContextMenu = (e) => {
      if (measureStateRef.current || isMeasureModeActive || (Date.now() - lastCancelTimestampRef.current < 1000)) {
        e.preventDefault();
        e.stopPropagation();
        setMeasureState(null);
        setIsMeasureModeActive(false);
      }
    };

    container.addEventListener('contextmenu', handleRootContextMenu, { capture: true });
    return () => {
      container.removeEventListener('contextmenu', handleRootContextMenu, { capture: true });
    };
  }, [isMeasureModeActive]);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

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
        ${symbolStr ? `<span style="font-weight: 700; color: #f8fafc; margin-right: 2px;">${symbolStr}</span>` : ''}
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">O</span><span style="color: ${ohlcColor}; font-weight: 600;">${open.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">H</span><span style="color: ${ohlcColor}; font-weight: 600;">${high.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">L</span><span style="color: ${ohlcColor}; font-weight: 600;">${low.toFixed(2)}</span></span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">C</span><span style="color: ${ohlcColor}; font-weight: 600;">${close.toFixed(2)}</span></span>
        <span style="color: ${changeColor}; font-weight: 700;">${changeSign}${change.toFixed(2)} (${changeSign}${changePct.toFixed(2)}%)</span>
        <span><span style="color: #94a3b8; font-weight: 600; margin-right: 3px;">Vol</span><span style="color: #38bdf8; font-weight: 600;">${volFormatted}</span></span>
      </div>
    `;
  };

  const handleSaveScreenshot = async (overrideParams = {}) => {
    if (!chartRef.current || !data || data.length === 0 || savingScreenshot) return;

    setSavingScreenshot(true);
    setScreenshotSuccess(false);

    try {
      // 1. Take lightweight-charts screenshot canvas with primitives
      const rawCanvas = chartRef.current.takeScreenshot(true);
      if (!rawCanvas) {
        throw new Error('Could not capture chart canvas');
      }

      const { defaultBar, defaultPrevBar } = dataLookupRef.current;
      const targetSymbol = overrideParams.symbol || symbol || 'STOCK';
      const targetSetup = overrideParams.setupName || setupName || 'General';
      const targetDate = overrideParams.asOfDate || asOfDate || defaultBar?.time || (data && data.length > 0 ? data[data.length - 1].time : null) || new Date().toISOString().slice(0, 10);
      const dateStr = typeof targetDate === 'string' ? targetDate : (targetDate?.year ? `${targetDate.year}-${String(targetDate.month).padStart(2, '0')}-${String(targetDate.day).padStart(2, '0')}` : String(targetDate));

      // 2. Composite header and indicator overlay onto export canvas
      const compositedCanvas = compositeChartScreenshot(rawCanvas, {
        symbol: targetSymbol,
        setupName: targetSetup,
        date: dateStr,
        bar: defaultBar,
        prevBar: defaultPrevBar,
        companyName: companyName
      });

      const dataUrl = compositedCanvas.toDataURL('image/png');

      // 3. Save to backend ./charts/{setup_name}/{symbol}_{date}.png
      const res = await fetch(`${API_BASE}/api/charts/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: targetSymbol,
          setup_name: targetSetup,
          date: dateStr,
          image_base64: dataUrl,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      const result = await res.json();
      setScreenshotSuccess(true);
      setToastMessage(`Saved to ${result.file_path}`);

      if (onScreenshotSaved) {
        onScreenshotSaved(result);
      }

      setTimeout(() => {
        setScreenshotSuccess(false);
      }, 2500);

      setTimeout(() => {
        setToastMessage(null);
      }, 3500);

      return result;
    } catch (err) {
      console.error('Error saving chart screenshot:', err);
      setToastMessage(`Error saving: ${err.message}`);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } finally {
      setSavingScreenshot(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveScreenshot: handleSaveScreenshot,
    getChart: () => chartRef.current,
  }));

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
      // Subscribe to Logical Range Changes for Measurement Overlay Re-projection
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        setRangeUpdateTick((t) => t + 1);
      });

      // Clicking chart background without Shift dismisses pinned measurement
      chart.subscribeClick(() => {
        if (measureStateRef.current?.isPinned) {
          setMeasureState(null);
        }
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
      // Reset measure state when stock or data changes
      setMeasureState(null);
      setIsMeasureModeActive(false);

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

            const currentWidth = chartContainerRef.current?.clientWidth || targetWidth;
            const visibleBars = getResponsiveVisibleBars(currentWidth);
            const fromIndex = Math.max(0, toIndex - visibleBars);
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
  }, [data, height, asOfDate, symbol, setupName]);

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
          const currentRange = chartRef.current.timeScale().getVisibleLogicalRange();
          if (currentRange && dataLookupRef.current?.data?.length > 0) {
            const visibleBars = getResponsiveVisibleBars(newWidth);
            chartRef.current.timeScale().setVisibleLogicalRange({
              from: Math.max(0, currentRange.to - visibleBars),
              to: currentRange.to,
            });
          }
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

  // Measurement tool coordinate resolver & mouse event handlers
  const getPointFromEvent = (e) => {
    if (!chartContainerRef.current || !chartRef.current || !seriesRef.current?.candlestickSeries) return null;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current.candlestickSeries;

    const logical = timeScale.coordinateToLogical(x);
    const price = series.coordinateToPrice(y);

    if (logical === null || price === null || isNaN(price)) return null;

    const curData = dataLookupRef.current.data || [];
    const index = Math.max(0, Math.min(curData.length - 1, Math.round(logical)));
    const time = curData[index]?.time || null;

    return { x, y, logical, price, index, time };
  };

  const handleContextMenu = (e) => {
    if (measureState || isMeasureModeActive || (Date.now() - lastCancelTimestampRef.current < 1000)) {
      e.preventDefault();
      e.stopPropagation();
      setMeasureState(null);
      setIsMeasureModeActive(false);
    }
  };

  const handleMouseDown = (e) => {
    // Right mouse click cancels active or pinned measurement
    if (e.button === 2) {
      if (measureState || isMeasureModeActive) {
        e.preventDefault();
        e.stopPropagation();
        lastCancelTimestampRef.current = Date.now();
        setMeasureState(null);
        setIsMeasureModeActive(false);
      }
      return;
    }

    if (e.button !== 0) return;

    // 1. If currently measuring, ANY second left-click locks and pins the measurement
    if (measureState?.isMeasuring) {
      e.preventDefault();
      e.stopPropagation();

      const pt = getPointFromEvent(e);
      if (pt) {
        setMeasureState((prev) => (prev ? {
          ...prev,
          isMeasuring: false,
          isPinned: true,
          isDragging: false,
          current: pt,
        } : null));
      } else {
        setMeasureState((prev) => (prev ? {
          ...prev,
          isMeasuring: false,
          isPinned: true,
          isDragging: false,
        } : null));
      }
      setIsMeasureModeActive(false);
      return;
    }

    // 2. If measurement is already pinned, clicking without Shift removes it from the chart
    if (measureState?.isPinned) {
      if (!e.shiftKey && !isMeasureModeActive) {
        e.preventDefault();
        e.stopPropagation();
        setMeasureState(null);
        return;
      }
    }

    // 3. First click with Shift or Measure Tool active: start new measurement
    if (e.shiftKey || isMeasureModeActive) {
      e.preventDefault();
      e.stopPropagation();

      const pt = getPointFromEvent(e);
      if (!pt) return;

      setMeasureState({
        isMeasuring: true,
        isPinned: false,
        isDragging: true,
        start: pt,
        current: pt,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!measureState?.isMeasuring) return;
    const pt = getPointFromEvent(e);
    if (!pt) return;
    setMeasureState((prev) => (prev ? { ...prev, current: pt } : null));
  };

  const handleMouseUp = (e) => {
    if (measureState?.isMeasuring && measureState.isDragging) {
      const pt = getPointFromEvent(e);
      const startPt = measureState.start;
      if (pt && startPt) {
        const dx = Math.abs(pt.x - startPt.x);
        const dy = Math.abs(pt.y - startPt.y);
        if (dx > 6 || dy > 6) {
          // If user dragged with mouse down, lock and pin on mouse release
          setMeasureState((prev) => (prev ? {
            ...prev,
            isMeasuring: false,
            isPinned: true,
            isDragging: false,
            current: pt,
          } : null));
          setIsMeasureModeActive(false);
        } else {
          // User single-clicked: stay in measuring mode and wait for the second click
          setMeasureState((prev) => (prev ? {
            ...prev,
            isDragging: false,
          } : null));
        }
      }
    }
  };

  // Re-project measurement coordinates dynamically on zoom/pan/render
  let measureRender = null;
  if (measureState && chartRef.current && seriesRef.current?.candlestickSeries) {
    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current.candlestickSeries;

    const x1 = timeScale.logicalToCoordinate(measureState.start.logical);
    const y1 = series.priceToCoordinate(measureState.start.price);

    let x2 = null;
    let y2 = null;
    if (measureState.isMeasuring && measureState.current.x !== undefined && measureState.current.y !== undefined) {
      x2 = measureState.current.x;
      y2 = measureState.current.y;
    } else {
      x2 = timeScale.logicalToCoordinate(measureState.current.logical);
      y2 = series.priceToCoordinate(measureState.current.price);
    }

    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      const startPrice = measureState.start.price;
      const curPrice = measureState.current.price;
      const deltaPrice = curPrice - startPrice;
      const deltaPct = startPrice !== 0 ? (deltaPrice / startPrice) * 100 : 0;
      const isUp = deltaPrice >= 0;
      const sign = isUp ? '+' : '';

      const startIdx = measureState.start.index;
      const endIdx = measureState.current.index;
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const barsCount = Math.abs(endIdx - startIdx) + 1;

      const curData = dataLookupRef.current.data || [];
      let totalVolume = 0;
      for (let i = minIdx; i <= maxIdx && i < curData.length; i++) {
        totalVolume += Number(curData[i]?.volume || curData[i]?.value || 0);
      }

      let daysCount = 0;
      if (curData[minIdx]?.time && curData[maxIdx]?.time) {
        const t1 = new Date(curData[minIdx].time).getTime();
        const t2 = new Date(curData[maxIdx].time).getTime();
        if (!isNaN(t1) && !isNaN(t2)) {
          daysCount = Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
        }
      }

      const boxX = Math.min(x1, x2);
      const boxY = Math.min(y1, y2);
      const boxW = Math.max(Math.abs(x2 - x1), 1);
      const boxH = Math.max(Math.abs(y2 - y1), 1);

      measureRender = {
        x1, y1, x2, y2,
        boxX, boxY, boxW, boxH,
        isUp,
        sign,
        deltaPrice,
        deltaPct,
        barsCount,
        daysCount,
        totalVolume,
        isPinned: measureState.isPinned,
        isMeasuring: measureState.isMeasuring,
      };
    }
  }

  return (
    <div
      ref={rootContainerRef}
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
          maxWidth: 'calc(100% - 150px)',
        }}
      />

      {/* Top-Right Chart Action Overlay (Measure & Screenshot Buttons) */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* TradingView Measure Tool Toggle Button */}
        <button
          type="button"
          onClick={() => {
            setIsMeasureModeActive((prev) => !prev);
            if (!isMeasureModeActive) {
              setMeasureState(null);
            }
          }}
          title={isMeasureModeActive ? 'Measuring Mode Active (Click to disable, or hold Shift + Click chart)' : 'Measure Distance (Hold Shift + Left Click)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            padding: 0,
            background: isMeasureModeActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: isMeasureModeActive ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.2)',
            color: isMeasureModeActive ? '#c084fc' : '#94a3b8',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          📐
        </button>

        {showScreenshotButton && (
          <button
            type="button"
            onClick={() => handleSaveScreenshot()}
            disabled={savingScreenshot || !data || data.length === 0}
            title={`Take screenshot and store to ./charts/${setupName || 'Setup'}/${asOfDate || 'date'}_${symbol || 'SYMBOL'}.png`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              padding: 0,
              background: screenshotSuccess ? 'rgba(16, 185, 129, 0.35)' : 'rgba(15, 23, 42, 0.82)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: screenshotSuccess ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
              color: screenshotSuccess ? '#34d399' : '#f8fafc',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: (savingScreenshot || !data || data.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {savingScreenshot ? (
              <span className="spin-icon" style={{ fontSize: '12px' }}>🔄</span>
            ) : screenshotSuccess ? (
              <span style={{ fontSize: '14px', fontWeight: 700 }}>✓</span>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Floating Toast Notification Overlay */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #10b981',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <span>📸</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Measurement SVG Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 6,
          pointerEvents: (isShiftDown || isMeasureModeActive || measureState?.isMeasuring || measureState?.isPinned) ? 'auto' : 'none',
          cursor: (isShiftDown || isMeasureModeActive || measureState?.isMeasuring) ? 'crosshair' : 'default',
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {measureRender && (
          <>
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* Shaded Measurement Bounding Box */}
              <rect
                x={measureRender.boxX}
                y={measureRender.boxY}
                width={measureRender.boxW}
                height={measureRender.boxH}
                fill={measureRender.isUp ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)'}
                stroke={measureRender.isUp ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)'}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                rx="4"
              />
              {/* Connecting Line from Start to Current */}
              <line
                x1={measureRender.x1}
                y1={measureRender.y1}
                x2={measureRender.x2}
                y2={measureRender.y2}
                stroke={measureRender.isUp ? '#10b981' : '#ef4444'}
                strokeWidth="1.5"
              />
              {/* Start Point Circle */}
              <circle
                cx={measureRender.x1}
                cy={measureRender.y1}
                r="3.5"
                fill={measureRender.isUp ? '#10b981' : '#ef4444'}
                stroke="#0f172a"
                strokeWidth="1"
              />
              {/* End Point Circle */}
              <circle
                cx={measureRender.x2}
                cy={measureRender.y2}
                r="3.5"
                fill={measureRender.isUp ? '#10b981' : '#ef4444'}
                stroke="#0f172a"
                strokeWidth="1"
              />
            </svg>

            {/* Floating Measurement Stat Pill */}
            <div
              style={{
                position: 'absolute',
                left: `${Math.max(10, Math.min((measureRender.x1 + measureRender.x2) / 2 - 110, (chartContainerRef.current?.clientWidth || 600) - 240))}px`,
                top: `${measureRender.isUp ? Math.max(10, measureRender.boxY - 32) : Math.min((chartContainerRef.current?.clientHeight || 280) - 38, measureRender.boxY + measureRender.boxH + 8)}px`,
                zIndex: 8,
                background: measureRender.isUp ? 'rgba(6, 78, 59, 0.94)' : 'rgba(127, 29, 29, 0.94)',
                border: `1px solid ${measureRender.isUp ? '#10b981' : '#ef4444'}`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontVariantNumeric: 'tabular-nums',
                pointerEvents: measureRender.isPinned ? 'auto' : 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontWeight: 700, color: measureRender.isUp ? '#34d399' : '#fca5a5' }}>
                {measureRender.sign}{measureRender.deltaPrice.toFixed(2)} ({measureRender.sign}{measureRender.deltaPct.toFixed(2)}%)
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>|</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                {measureRender.barsCount} bar{measureRender.barsCount > 1 ? 's' : ''}{measureRender.daysCount > 0 ? ` (${measureRender.daysCount}d)` : ''}
              </span>
              {measureRender.totalVolume > 0 && (
                <>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>|</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    Vol {formatVolume(measureRender.totalVolume)}
                  </span>
                </>
              )}
              {measureRender.isPinned && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMeasureState(null);
                  }}
                  title="Close measurement (or press Esc)"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    padding: '0 0 0 4px',
                    fontSize: '12px',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </>
        )}
      </div>

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
});

export default CandlestickChart;

