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

    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio, verticalPixelRatio, bitmapSize }) => {
      const pixelX = Math.round(x * horizontalPixelRatio);
      if (pixelX < 0 || pixelX > bitmapSize.width) return;

      const vRatio = verticalPixelRatio || horizontalPixelRatio || 1;
      const hRatio = horizontalPixelRatio || 1;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3 * vRatio, 3 * vRatio]);
      ctx.strokeStyle = this._options.color || 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = Math.max(1, Math.round(1 * hRatio));
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
  const targetStr = typeof targetDate === 'string'
    ? targetDate.trim()
    : (targetDate?.year ? `${targetDate.year}-${String(targetDate.month).padStart(2, '0')}-${String(targetDate.day).padStart(2, '0')}` : String(targetDate).slice(0, 10));

  const exact = data.findIndex(d => {
    const t = typeof d.time === 'string' ? d.time : (d.time?.year ? `${d.time.year}-${String(d.time.month).padStart(2, '0')}-${String(d.time.day).padStart(2, '0')}` : String(d.time));
    return t === targetStr;
  });
  if (exact !== -1) return exact;

  let best = -1;
  for (let i = 0; i < data.length; i++) {
    const t = typeof data[i].time === 'string' ? data[i].time : (data[i].time?.year ? `${data[i].time.year}-${String(data[i].time.month).padStart(2, '0')}-${String(data[i].time.day).padStart(2, '0')}` : String(data[i].time));
    if (t <= targetStr) {
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

function measureTextWidth(text, font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif') {
  if (!text) return 0;
  if (typeof document === 'undefined') return text.length * 7.5;
  if (!measureTextWidth._canvas) {
    measureTextWidth._canvas = document.createElement('canvas');
  }
  const ctx = measureTextWidth._canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

function compositeChartScreenshot(rawChartCanvas, {
  symbol,
  setupName: _setupName,
  date,
  bar,
  prevBar,
  companyName: _companyName,
  drawings = [],
  earnings = [],
  showEarnings = true,
  containerWidth = 700,
  containerHeight = 400,
  timeScale = null,
  series = null,
  dataLookup = null,
}) {
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
  const cWidth = containerWidth > 0 ? containerWidth : (rawChartCanvas.clientWidth || 700);
  const cHeight = containerHeight > 0 ? containerHeight : (rawChartCanvas.clientHeight || 400);
  const scaleX = outWidth / cWidth;
  const scaleY = outHeight / cHeight;
  const scale = outWidth / (cWidth || 700) || 1;
  const padX = 14 * scale;
  const padY = 10 * scale;

  // 2. Draw user drawings (straight lines in white color, 1 pixel thin, and text annotations)
  if (drawings && drawings.length > 0 && timeScale && series) {
    for (const item of drawings) {
      if (item.type === 'line' && item.p1 && item.p2) {
        let log1 = item.p1.logical;
        if (typeof log1 !== 'number' && item.p1.time && dataLookup?.timeMap) {
          const tKey = typeof item.p1.time === 'string' ? item.p1.time : (item.p1.time?.year ? `${item.p1.time.year}-${String(item.p1.time.month).padStart(2, '0')}-${String(item.p1.time.day).padStart(2, '0')}` : String(item.p1.time));
          const idx = dataLookup.timeMap.get(tKey);
          if (idx !== undefined) log1 = idx + (item.p1.offsetFromBar || 0);
        }
        let log2 = item.p2.logical;
        if (typeof log2 !== 'number' && item.p2.time && dataLookup?.timeMap) {
          const tKey = typeof item.p2.time === 'string' ? item.p2.time : (item.p2.time?.year ? `${item.p2.time.year}-${String(item.p2.time.month).padStart(2, '0')}-${String(item.p2.time.day).padStart(2, '0')}` : String(item.p2.time));
          const idx = dataLookup.timeMap.get(tKey);
          if (idx !== undefined) log2 = idx + (item.p2.offsetFromBar || 0);
        }

        let x1 = typeof log1 === 'number' ? timeScale.logicalToCoordinate(log1) : null;
        if ((x1 === null || isNaN(x1)) && item.p1.time) x1 = timeScale.timeToCoordinate(item.p1.time);
        const y1 = series.priceToCoordinate(item.p1.price);

        let x2 = typeof log2 === 'number' ? timeScale.logicalToCoordinate(log2) : null;
        if ((x2 === null || isNaN(x2)) && item.p2.time) x2 = timeScale.timeToCoordinate(item.p2.time);
        const y2 = series.priceToCoordinate(item.p2.price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#ffffff';
          // 1 pixel thin straight line
          ctx.lineWidth = 1;
          ctx.lineCap = 'round';
          ctx.moveTo(Math.round(x1 * scaleX) + 0.5, Math.round(y1 * scaleY) + 0.5);
          ctx.lineTo(Math.round(x2 * scaleX) + 0.5, Math.round(y2 * scaleY) + 0.5);
          ctx.stroke();
          ctx.restore();
        }
      } else if (item.type === 'text' && item.p && item.text) {
        let log = item.p.logical;
        if (typeof log !== 'number' && item.p.time && dataLookup?.timeMap) {
          const tKey = typeof item.p.time === 'string' ? item.p.time : (item.p.time?.year ? `${item.p.time.year}-${String(item.p.time.month).padStart(2, '0')}-${String(item.p.time.day).padStart(2, '0')}` : String(item.p.time));
          const idx = dataLookup.timeMap.get(tKey);
          if (idx !== undefined) log = idx + (item.p.offsetFromBar || 0);
        }

        let x = typeof log === 'number' ? timeScale.logicalToCoordinate(log) : null;
        if ((x === null || isNaN(x)) && item.p.time) x = timeScale.timeToCoordinate(item.p.time);
        const y = series.priceToCoordinate(item.p.price);

        if (x !== null && y !== null) {
          ctx.save();
          const fontSize = Math.max(11, Math.round((item.fontSize || 12) * scale));
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const textMetrics = ctx.measureText(item.text);
          const pX = 6 * scale;
          const pY = 3 * scale;
          const badgeW = textMetrics.width + pX * 2;
          const badgeH = fontSize + pY * 2;
          const badgeX = x * scaleX;
          const badgeY = y * scaleY - (fontSize + pY);

          drawCanvasRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4 * scale);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(item.text, badgeX + pX, badgeY + pY + fontSize - 1);
          ctx.restore();
        }
      }
    }
  }

  // 2.5 Draw Earnings Date [E] icons at bottom of chart
  if (showEarnings && earnings && earnings.length > 0 && timeScale) {
    const badgeRadius = 7.5 * scale;
    const badgeY = outHeight - (28 * scaleY);
    for (const item of earnings) {
      const targetDate = item.date;
      let idx = dataLookup?.timeMap?.get(targetDate);
      const curData = dataLookup?.data || [];
      if (item.time_of_day === 'amc' && idx !== undefined && idx + 1 < curData.length) {
        idx = idx + 1;
      }
      if (idx === undefined && curData.length > 0) {
        const found = curData.findIndex((b) => {
          const bDate = typeof b.time === 'string' ? b.time : `${b.time.year}-${String(b.time.month).padStart(2, '0')}-${String(b.time.day).padStart(2, '0')}`;
          return bDate >= targetDate;
        });
        if (found !== -1) idx = found;
      }
      if (typeof idx !== 'number') continue;
      const rawX = timeScale.logicalToCoordinate(idx);
      if (rawX === null || isNaN(rawX)) continue;
      const x = rawX * scaleX;
      if (x < 0 || x > outWidth) continue;

      const isBeat = item.surprise_pct > 0;
      const isMiss = item.surprise_pct < 0;

      // Draw [E] circle badge
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isBeat ? 'rgba(6, 78, 59, 0.95)' : (isMiss ? 'rgba(127, 29, 29, 0.95)' : 'rgba(13, 148, 136, 0.95)');
      ctx.fill();
      ctx.strokeStyle = isBeat ? '#10b981' : (isMiss ? '#ef4444' : '#14b8a6');
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Draw 'E' text
      ctx.font = `800 ${Math.round(9 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = isBeat ? '#34d399' : (isMiss ? '#fca5a5' : '#2dd4bf');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', x, badgeY);
      ctx.restore();
    }
  }

  // 3. Draw Top-Left OHLC Header Badge
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
  onScreenshotSaved = null,
  earnings = null,
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
  const asOfIdxRef = useRef(-1);
  const isUserPannedRef = useRef(false);
  const userPanCheckTimeoutRef = useRef(null);

  const [savingScreenshot, setSavingScreenshot] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // TradingView-style Earnings Date Markers State
  const [fetchedEarnings, setFetchedEarnings] = useState([]);
  const [showEarnings, setShowEarnings] = useState(true);
  const [hoveredEarnings, setHoveredEarnings] = useState(null); // { record, x, y }

  const fetchedEarningsRef = useRef(fetchedEarnings);
  fetchedEarningsRef.current = fetchedEarnings;

  const showEarningsRef = useRef(showEarnings);
  showEarningsRef.current = showEarnings;

  // Fetch earnings data for symbol if not explicitly provided
  useEffect(() => {
    if (earnings && Array.isArray(earnings)) {
      setFetchedEarnings(earnings);
      return;
    }
    if (!symbol) {
      setFetchedEarnings([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/api/stocks/${symbol}/earnings`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setFetchedEarnings(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol, earnings]);

  // TradingView-style Measurement Tool ("Ruler") State
  const [measureState, setMeasureState] = useState(null);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isMeasureModeActive, setIsMeasureModeActive] = useState(false);
  const [, setRangeUpdateTick] = useState(0);
  const measureStateRef = useRef(null);
  measureStateRef.current = measureState;

  // Interactive Drawing Tools (Straight Line in white 1px, Text) State
  const [drawingsBySymbol, setDrawingsBySymbol] = useState({});
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'line' | 'text' | 'measure'
  const [lineDraft, setLineDraft] = useState(null); // { start: pt, current: pt, isDragging: boolean }
  const [textInputState, setTextInputState] = useState(null); // { x, y, logical, price, time, offsetFromBar, value, isEditingId }
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [dragState, setDragState] = useState(null); // { drawingId, handle, startPt, original }

  const drawingsBySymbolRef = useRef(drawingsBySymbol);
  drawingsBySymbolRef.current = drawingsBySymbol;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const lineDraftRef = useRef(lineDraft);
  lineDraftRef.current = lineDraft;

  const textInputStateRef = useRef(textInputState);
  textInputStateRef.current = textInputState;

  const selectedDrawingIdRef = useRef(selectedDrawingId);
  selectedDrawingIdRef.current = selectedDrawingId;

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const handleDragMoveRef = useRef(null);

  const curSymbolKey = symbol || 'DEFAULT';
  const currentDrawings = drawingsBySymbol[curSymbolKey] || [];

  const handleDeleteSelectedDrawing = () => {
    const idToDelete = selectedDrawingIdRef.current;
    if (!idToDelete) return;
    const curKey = symbol || 'DEFAULT';
    setDrawingsBySymbol((prev) => {
      const list = prev[curKey] || [];
      return {
        ...prev,
        [curKey]: list.filter((d) => d.id !== idToDelete),
      };
    });
    setSelectedDrawingId(null);
  };

  const handleUndo = () => {
    const curKey = symbol || 'DEFAULT';
    setDrawingsBySymbol((prev) => {
      const list = prev[curKey] || [];
      if (list.length === 0) return prev;
      return {
        ...prev,
        [curKey]: list.slice(0, -1),
      };
    });
    setSelectedDrawingId(null);
  };

  const handleDeleteSelectedDrawingRef = useRef(handleDeleteSelectedDrawing);
  handleDeleteSelectedDrawingRef.current = handleDeleteSelectedDrawing;

  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;

  const handleClearAllDrawings = () => {
    const curKey = symbol || 'DEFAULT';
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [curKey]: [],
    }));
    setSelectedDrawingId(null);
    setLineDraft(null);
    setTextInputState(null);
  };

  const shiftPoint = (origPt, dLog, dPrice) => {
    if (!origPt) return origPt;
    const newLogical = (typeof origPt.logical === 'number' ? origPt.logical : 0) + dLog;
    const newPrice = origPt.price + dPrice;

    const curData = dataLookupRef.current?.data || [];
    let newTime = origPt.time;
    let newOffset = origPt.offsetFromBar || 0;
    if (curData.length > 0) {
      const clampedIdx = Math.max(0, Math.min(curData.length - 1, Math.round(newLogical)));
      if (curData[clampedIdx]?.time) {
        newTime = curData[clampedIdx].time;
        newOffset = newLogical - clampedIdx;
      }
    }

    return {
      ...origPt,
      logical: newLogical,
      price: newPrice,
      time: newTime,
      offsetFromBar: newOffset,
    };
  };

  const projectDrawingPoint = (p) => {
    if (!chartRef.current || !seriesRef.current?.candlestickSeries || !p) return null;
    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current.candlestickSeries;

    let logical = p.logical;
    if (typeof logical !== 'number' && p.time && dataLookupRef.current?.timeMap) {
      const tKey = typeof p.time === 'string' ? p.time : (p.time?.year ? `${p.time.year}-${String(p.time.month).padStart(2, '0')}-${String(p.time.day).padStart(2, '0')}` : String(p.time));
      const idx = dataLookupRef.current.timeMap.get(tKey);
      if (idx !== undefined) {
        logical = idx + (typeof p.offsetFromBar === 'number' ? p.offsetFromBar : 0);
      }
    }

    let x = null;
    if (typeof logical === 'number') {
      x = timeScale.logicalToCoordinate(logical);
    }
    if ((x === null || isNaN(x)) && p.time) {
      x = timeScale.timeToCoordinate(p.time);
    }

    const y = series.priceToCoordinate(p.price);
    if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
    return { x, y };
  };

  const getEarningsBarCoordinate = (item) => {
    if (!chartRef.current || !dataLookupRef.current?.timeMap || !item?.date) return null;
    const timeScale = chartRef.current.timeScale();
    const curData = dataLookupRef.current.data || [];
    const timeMap = dataLookupRef.current.timeMap;

    const targetDate = item.date;
    let idx = timeMap.get(targetDate);

    // If report was After Market Close (amc), the market reaction occurred on the next trading session
    if (item.time_of_day === 'amc') {
      if (idx !== undefined && idx + 1 < curData.length) {
        idx = idx + 1;
      } else if (idx === undefined) {
        const found = curData.findIndex((b) => {
          const bDate = typeof b.time === 'string' ? b.time : `${b.time.year}-${String(b.time.month).padStart(2, '0')}-${String(b.time.day).padStart(2, '0')}`;
          return bDate > targetDate;
        });
        if (found !== -1) idx = found;
      }
    }

    // If still not found (e.g. weekend or holiday report), find next available trading bar
    if (idx === undefined) {
      const found = curData.findIndex((b) => {
        const bDate = typeof b.time === 'string' ? b.time : `${b.time.year}-${String(b.time.month).padStart(2, '0')}-${String(b.time.day).padStart(2, '0')}`;
        return bDate >= targetDate;
      });
      if (found !== -1) idx = found;
    }

    if (idx === undefined) {
      // Future earnings date estimation beyond current bars
      const lastBar = curData[curData.length - 1];
      if (lastBar) {
        const lastDateStr = typeof lastBar.time === 'string' ? lastBar.time : `${lastBar.time.year}-${String(lastBar.time.month).padStart(2, '0')}-${String(lastBar.time.day).padStart(2, '0')}`;
        if (targetDate > lastDateStr) {
          const diffDays = Math.round((new Date(targetDate) - new Date(lastDateStr)) / (1000 * 60 * 60 * 24));
          const estBars = Math.max(1, Math.round(diffDays * (5 / 7)));
          idx = (curData.length - 1) + estBars;
        }
      }
    }

    if (typeof idx !== 'number') return null;
    const x = timeScale.logicalToCoordinate(idx);
    if (x === null || isNaN(x)) return null;

    return { x, idx };
  };

  const commitLine = (p1, p2) => {
    const curKey = symbol || 'DEFAULT';
    const newLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'line',
      p1: {
        logical: p1.logical,
        price: p1.price,
        time: p1.time,
        offsetFromBar: p1.offsetFromBar || 0,
      },
      p2: {
        logical: p2.logical,
        price: p2.price,
        time: p2.time,
        offsetFromBar: p2.offsetFromBar || 0,
      },
      color: '#ffffff',
      width: 1,
    };
    setDrawingsBySymbol((prev) => {
      const list = prev[curKey] || [];
      return { ...prev, [curKey]: [...list, newLine] };
    });
    setSelectedDrawingId(newLine.id);
  };

  const handleCommitText = () => {
    const currentState = textInputStateRef.current;
    if (!currentState) return;
    const curKey = symbol || 'DEFAULT';
    const val = (currentState.value || '').trim();

    if (currentState.isEditingId) {
      if (val) {
        setDrawingsBySymbol((prev) => {
          const list = prev[curKey] || [];
          return {
            ...prev,
            [curKey]: list.map((d) => d.id === currentState.isEditingId ? { ...d, text: val } : d),
          };
        });
      } else {
        setDrawingsBySymbol((prev) => {
          const list = prev[curKey] || [];
          return {
            ...prev,
            [curKey]: list.filter((d) => d.id !== currentState.isEditingId),
          };
        });
      }
    } else if (val) {
      const newText = {
        id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'text',
        p: {
          logical: currentState.logical,
          price: currentState.price,
          time: currentState.time,
          offsetFromBar: currentState.offsetFromBar || 0,
        },
        text: val,
        color: '#ffffff',
        fontSize: 12,
      };
      setDrawingsBySymbol((prev) => {
        const list = prev[curKey] || [];
        return { ...prev, [curKey]: [...list, newText] };
      });
      setSelectedDrawingId(newText.id);
    }

    setTextInputState(null);
    setActiveTool('none');
  };

  // Global Shift, Escape, Delete, Undo key listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          setTextInputState(null);
          setActiveTool('none');
        }
        return;
      }

      if (e.key === 'Shift') {
        setIsShiftDown(true);
      }
      if (e.key === 'Escape') {
        setMeasureState(null);
        setIsMeasureModeActive(false);
        setLineDraft(null);
        setTextInputState(null);
        setSelectedDrawingId(null);
        setActiveTool('none');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDrawingIdRef.current && handleDeleteSelectedDrawingRef.current) {
          handleDeleteSelectedDrawingRef.current();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (handleUndoRef.current) {
          handleUndoRef.current();
        }
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

  // Window listeners for smooth dragging of drawings anywhere on screen
  useEffect(() => {
    if (!dragState) return;

    const onWindowMouseMove = (e) => {
      handleDragMoveRef.current?.(e);
    };

    const onWindowMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [dragState]);

  // Suppress browser context menu unconditionally when cancelling drawing/measurement via right-click
  useEffect(() => {
    const container = rootContainerRef.current;
    if (!container) return;

    const handleRootContextMenu = (e) => {
      if (
        measureStateRef.current ||
        isMeasureModeActive ||
        activeToolRef.current !== 'none' ||
        lineDraftRef.current ||
        textInputStateRef.current ||
        selectedDrawingIdRef.current ||
        (Date.now() - lastCancelTimestampRef.current < 1000)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setMeasureState(null);
        setIsMeasureModeActive(false);
        setLineDraft(null);
        setTextInputState(null);
        setSelectedDrawingId(null);
        setActiveTool('none');
      }
    };

    container.addEventListener('contextmenu', handleRootContextMenu, { capture: true });
    return () => {
      container.removeEventListener('contextmenu', handleRootContextMenu, { capture: true });
    };
  }, [isMeasureModeActive]);

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

      const curKey = symbol || 'DEFAULT';
      const curDrawings = drawingsBySymbolRef.current[curKey] || [];

      // 2. Composite header, indicator overlay, drawings, and earnings onto export canvas
      const compositedCanvas = compositeChartScreenshot(rawCanvas, {
        symbol: targetSymbol,
        setupName: targetSetup,
        date: dateStr,
        bar: defaultBar,
        prevBar: defaultPrevBar,
        companyName: companyName,
        drawings: curDrawings,
        earnings: fetchedEarningsRef.current,
        showEarnings: showEarningsRef.current,
        containerWidth: chartContainerRef.current?.clientWidth || 700,
        containerHeight: chartContainerRef.current?.clientHeight || 400,
        timeScale: chartRef.current?.timeScale(),
        series: seriesRef.current?.candlestickSeries,
        dataLookup: dataLookupRef.current,
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
    getDrawings: () => drawingsBySymbolRef.current[symbol || 'DEFAULT'] || [],
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

      // Clicking chart background without Shift dismisses pinned measurement or selected drawing
      chart.subscribeClick(() => {
        if (measureStateRef.current?.isPinned) {
          setMeasureState(null);
        }
        if (selectedDrawingIdRef.current) {
          setSelectedDrawingId(null);
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
      // Reset measure state and active drawing when stock or data changes
      setMeasureState(null);
      setIsMeasureModeActive(false);
      setLineDraft(null);
      setTextInputState(null);
      setSelectedDrawingId(null);
      setActiveTool('none');

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
      asOfIdxRef.current = asOfIdx;
      isUserPannedRef.current = false;
      if (userPanCheckTimeoutRef.current) clearTimeout(userPanCheckTimeoutRef.current);

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

      const applyTargetRange = (containerWidth) => {
        if (!chartRef.current || !data || data.length === 0) return;
        try {
          const cWidth = containerWidth || chartContainerRef.current?.clientWidth || targetWidth;
          const visibleBars = getResponsiveVisibleBars(cWidth);

          let toIndex = data.length - 1 + RIGHT_MARGIN_BARS;
          if (asOfIdx !== -1) {
            const targetTo = asOfIdx + POST_AS_OF_BARS;
            if (targetTo < toIndex) {
              toIndex = targetTo;
            }
          }

          const fromIndex = Math.max(0, toIndex - visibleBars);
          chartRef.current.timeScale().setVisibleLogicalRange({
            from: fromIndex,
            to: toIndex,
          });
        } catch (err) {
          console.warn('Error setting visible logical range with as-of date:', err);
        }
      };

      applyTargetRange(targetWidth);
      requestAnimationFrame(() => applyTargetRange());
      const t1 = setTimeout(() => applyTargetRange(), 50);
      const t2 = setTimeout(() => {
        applyTargetRange();
        userPanCheckTimeoutRef.current = setTimeout(() => {}, 0);
      }, 200);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
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
          if (dataLookupRef.current?.data?.length > 0) {
            const currentData = dataLookupRef.current.data;
            const asOf = asOfIdxRef.current;
            const visibleBars = getResponsiveVisibleBars(newWidth);

            if (!isUserPannedRef.current && asOf !== -1) {
              const targetTo = asOf + 40;
              const toIndex = Math.min(currentData.length - 1 + 3, targetTo);
              const fromIndex = Math.max(0, toIndex - visibleBars);
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: fromIndex,
                to: toIndex,
              });
            } else {
              const currentRange = chartRef.current.timeScale().getVisibleLogicalRange();
              if (currentRange) {
                chartRef.current.timeScale().setVisibleLogicalRange({
                  from: Math.max(0, currentRange.to - visibleBars),
                  to: currentRange.to,
                });
              }
            }
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

  // Coordinate resolver & mouse event handlers for Drawing Tools and Measurement Tool
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
    const offsetFromBar = logical - index;

    return { x, y, logical, price, index, time, offsetFromBar };
  };

  const handleContextMenu = (e) => {
    if (
      measureState ||
      isMeasureModeActive ||
      activeTool !== 'none' ||
      lineDraft ||
      textInputState ||
      selectedDrawingId ||
      (Date.now() - lastCancelTimestampRef.current < 1000)
    ) {
      e.preventDefault();
      e.stopPropagation();
      setMeasureState(null);
      setIsMeasureModeActive(false);
      setLineDraft(null);
      setTextInputState(null);
      setSelectedDrawingId(null);
      setActiveTool('none');
    }
  };

  const handleMouseDown = (e) => {
    // Right mouse click cancels active or pinned measurement and active tools
    if (e.button === 2) {
      if (
        measureState ||
        isMeasureModeActive ||
        activeTool !== 'none' ||
        lineDraft ||
        textInputState ||
        selectedDrawingId
      ) {
        e.preventDefault();
        e.stopPropagation();
        lastCancelTimestampRef.current = Date.now();
        setMeasureState(null);
        setIsMeasureModeActive(false);
        setLineDraft(null);
        setTextInputState(null);
        setSelectedDrawingId(null);
        setActiveTool('none');
      }
      return;
    }

    if (e.button !== 0) return;

    // 1. Text Tool placement
    if (activeTool === 'text') {
      e.preventDefault();
      e.stopPropagation();
      const pt = getPointFromEvent(e);
      if (!pt) return;
      setTextInputState({
        x: pt.x,
        y: pt.y,
        logical: pt.logical,
        price: pt.price,
        time: pt.time,
        offsetFromBar: pt.offsetFromBar,
        value: '',
        isEditingId: null,
      });
      return;
    }

    // 2. Line Tool drawing
    if (activeTool === 'line') {
      e.preventDefault();
      e.stopPropagation();
      const pt = getPointFromEvent(e);
      if (!pt) return;

      if (!lineDraft) {
        setLineDraft({
          start: pt,
          current: pt,
          isDragging: true,
        });
      } else {
        commitLine(lineDraft.start, pt);
        setLineDraft(null);
        setActiveTool('none');
      }
      return;
    }

    // 3. If currently measuring, second click locks and pins
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

    // 4. If measurement is already pinned, clicking without Shift removes it from the chart
    if (measureState?.isPinned) {
      if (!e.shiftKey && !isMeasureModeActive) {
        e.preventDefault();
        e.stopPropagation();
        setMeasureState(null);
        return;
      }
    }

    // 5. Shift or Measure Tool active: start new measurement
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
      return;
    }

    // 6. If clicking chart background with no active tool, deselect drawing
    if (selectedDrawingId) {
      setSelectedDrawingId(null);
    }
  };

  const handleDragMove = (e) => {
    if (!dragStateRef.current) return;
    const pt = getPointFromEvent(e);
    if (!pt) return;
    const { drawingId, handle, startPt, original } = dragStateRef.current;
    const curKey = symbol || 'DEFAULT';
    setDrawingsBySymbol((prev) => {
      const list = prev[curKey] || [];
      return {
        ...prev,
        [curKey]: list.map((d) => {
          if (d.id !== drawingId) return d;
          if (d.type === 'line') {
            if (handle === 'p1') {
              return {
                ...d,
                p1: { logical: pt.logical, price: pt.price, time: pt.time, offsetFromBar: pt.offsetFromBar },
              };
            }
            if (handle === 'p2') {
              return {
                ...d,
                p2: { logical: pt.logical, price: pt.price, time: pt.time, offsetFromBar: pt.offsetFromBar },
              };
            }
            if (handle === 'body') {
              const dLog = pt.logical - startPt.logical;
              const dPrice = pt.price - startPt.price;
              return {
                ...d,
                p1: shiftPoint(original.p1, dLog, dPrice),
                p2: shiftPoint(original.p2, dLog, dPrice),
              };
            }
          } else if (d.type === 'text') {
            const dLog = pt.logical - startPt.logical;
            const dPrice = pt.price - startPt.price;
            return {
              ...d,
              p: shiftPoint(original.p, dLog, dPrice),
            };
          }
          return d;
        }),
      };
    });
  };
  handleDragMoveRef.current = handleDragMove;

  const handleMouseMove = (e) => {
    // If dragging an existing drawing or handle, handled globally by window listener
    if (dragState) {
      return;
    }

    // If drafting a line
    if (lineDraft) {
      const pt = getPointFromEvent(e);
      if (pt) {
        setLineDraft((prev) => (prev ? { ...prev, current: pt } : null));
      }
      return;
    }

    // If measuring
    if (measureState?.isMeasuring) {
      const pt = getPointFromEvent(e);
      if (!pt) return;
      setMeasureState((prev) => (prev ? { ...prev, current: pt } : null));
    }
  };

  const handleMouseUp = (e) => {
    if (dragState) {
      setDragState(null);
      return;
    }

    if (lineDraft && lineDraft.isDragging) {
      const pt = getPointFromEvent(e);
      const startPt = lineDraft.start;
      if (pt && startPt) {
        const dist = Math.hypot(pt.x - startPt.x, pt.y - startPt.y);
        if (dist > 6) {
          commitLine(startPt, pt);
          setLineDraft(null);
          setActiveTool('none');
        } else {
          setLineDraft((prev) => (prev ? { ...prev, isDragging: false } : null));
        }
      }
      return;
    }

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

  const handleDrawingMouseDown = (e, drawing, handle) => {
    if (activeTool !== 'none' && activeTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedDrawingId(drawing.id);
    const pt = getPointFromEvent(e);
    if (pt) {
      setDragState({
        drawingId: drawing.id,
        handle,
        startPt: pt,
        original: JSON.parse(JSON.stringify(drawing)),
      });
    }
  };

  const handleTextDoubleClick = (e, drawing) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = projectDrawingPoint(drawing.p);
    setTextInputState({
      x: pt ? pt.x : 50,
      y: pt ? pt.y : 50,
      logical: drawing.p.logical,
      price: drawing.p.price,
      time: drawing.p.time,
      offsetFromBar: drawing.p.offsetFromBar,
      value: drawing.text,
      isEditingId: drawing.id,
    });
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

      {/* Top-Right Chart Action Overlay (Drawing Tools, Measure & Screenshot Buttons) */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(15, 23, 42, 0.82)',
          padding: '3px 5px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Straight Line Tool (White, 1px) */}
        <button
          type="button"
          onClick={() => {
            const next = activeTool === 'line' ? 'none' : 'line';
            setActiveTool(next);
            setLineDraft(null);
            setTextInputState(null);
            if (next === 'line') {
              setMeasureState(null);
              setIsMeasureModeActive(false);
            }
          }}
          title={activeTool === 'line' ? "Line Tool Active (Click to cancel, or press Esc)" : "Draw Straight Line (1px White) - Click to activate"}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            padding: 0,
            background: activeTool === 'line' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTool === 'line' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
            color: activeTool === 'line' ? '#38bdf8' : '#e2e8f0',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="20" x2="20" y2="4" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="4" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* Text Tool Button */}
        <button
          type="button"
          onClick={() => {
            const next = activeTool === 'text' ? 'none' : 'text';
            setActiveTool(next);
            setLineDraft(null);
            setTextInputState(null);
            if (next === 'text') {
              setMeasureState(null);
              setIsMeasureModeActive(false);
            }
          }}
          title={activeTool === 'text' ? "Text Tool Active (Click on chart to place text, or press Esc)" : "Add Text Note - Click chart to add text"}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            padding: 0,
            background: activeTool === 'text' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTool === 'text' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
            color: activeTool === 'text' ? '#38bdf8' : '#e2e8f0',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="8" y1="20" x2="16" y2="20" />
          </svg>
        </button>

        {/* TradingView Measure Tool Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const next = !isMeasureModeActive;
            setIsMeasureModeActive(next);
            setActiveTool(next ? 'measure' : 'none');
            setLineDraft(null);
            setTextInputState(null);
            if (!next) {
              setMeasureState(null);
            }
          }}
          title={isMeasureModeActive ? 'Measuring Mode Active (Click to disable, or hold Shift + Click chart)' : 'Measure Distance (Hold Shift + Left Click)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            padding: 0,
            background: isMeasureModeActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.05)',
            border: isMeasureModeActive ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
            color: isMeasureModeActive ? '#c084fc' : '#94a3b8',
            borderRadius: '5px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          📐
        </button>

        {/* Earnings Dates Toggle Button */}
        <button
          type="button"
          onClick={() => setShowEarnings((prev) => !prev)}
          title={showEarnings ? 'Hide Earnings Date Icons (E)' : 'Show Earnings Date Icons (E)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            padding: 0,
            background: showEarnings ? 'rgba(13, 148, 136, 0.35)' : 'rgba(255, 255, 255, 0.05)',
            border: showEarnings ? '1px solid #14b8a6' : '1px solid rgba(255, 255, 255, 0.15)',
            color: showEarnings ? '#2dd4bf' : '#94a3b8',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          E
        </button>

        {/* Undo and Clear buttons if drawings exist for current symbol */}
        {currentDrawings.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleUndo}
              title="Undo last drawing (Ctrl+Z)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                padding: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleClearAllDrawings}
              title="Clear all drawings on this chart"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                padding: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ef4444',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </>
        )}

        {/* Divider if screenshot button is shown */}
        {showScreenshotButton && (
          <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
        )}

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
              width: '26px',
              height: '26px',
              padding: 0,
              background: screenshotSuccess ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.05)',
              border: screenshotSuccess ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
              color: screenshotSuccess ? '#34d399' : '#f8fafc',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: (savingScreenshot || !data || data.length === 0) ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {savingScreenshot ? (
              <span className="spin-icon" style={{ fontSize: '12px' }}>🔄</span>
            ) : screenshotSuccess ? (
              <span style={{ fontSize: '14px', fontWeight: 700 }}>✓</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Interactive Drawing & Measurement Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 6,
          pointerEvents: (
            isShiftDown ||
            isMeasureModeActive ||
            measureState?.isMeasuring ||
            measureState?.isPinned ||
            activeTool === 'line' ||
            activeTool === 'text' ||
            lineDraft ||
            dragState ||
            textInputState
          ) ? 'auto' : 'none',
          cursor: (
            activeTool === 'line' || lineDraft || isShiftDown || isMeasureModeActive || measureState?.isMeasuring
              ? 'crosshair'
              : activeTool === 'text'
                ? 'text'
                : dragState
                  ? 'move'
                  : 'default'
          ),
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
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
          {/* 0. TradingView-style Earnings Date Markers */}
          {showEarnings && fetchedEarnings.map((item, idx) => {
            const coord = getEarningsBarCoordinate(item);
            if (!coord) return null;
            const { x } = coord;
            const containerW = chartContainerRef.current?.clientWidth || 600;
            if (x < -20 || x > containerW + 20) return null;

            const containerH = chartContainerRef.current?.clientHeight || 280;
            const badgeY = containerH - 32;
            const isBeat = item.surprise_pct > 0;
            const isMiss = item.surprise_pct < 0;
            const isUpcoming = item.eps_actual === null;

            const badgeStroke = isBeat ? '#10b981' : (isMiss ? '#ef4444' : (isUpcoming ? '#38bdf8' : '#14b8a6'));
            const badgeFill = isBeat ? 'rgba(6, 78, 59, 0.95)' : (isMiss ? 'rgba(127, 29, 29, 0.95)' : (isUpcoming ? 'rgba(12, 74, 110, 0.95)' : 'rgba(13, 148, 136, 0.95)'));
            const textFill = isBeat ? '#34d399' : (isMiss ? '#fca5a5' : (isUpcoming ? '#7dd3fc' : '#2dd4bf'));
            const isHovered = hoveredEarnings?.record?.date === item.date;

            return (
              <g
                key={`earnings_${item.date}_${idx}`}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredEarnings({ record: item, x, y: badgeY })}
                onMouseLeave={() => setHoveredEarnings(null)}
              >
                {/* Circular [E] badge */}
                <circle
                  cx={x}
                  cy={badgeY}
                  r={isHovered ? 10 : 8.5}
                  fill={badgeFill}
                  stroke={isHovered ? '#ffffff' : badgeStroke}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                {/* "E" letter */}
                <text
                  x={x}
                  y={badgeY + 3.5}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : textFill}
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  style={{ userSelect: 'none' }}
                >
                  E
                </text>
              </g>
            );
          })}

          {/* 1. Rendered User Drawings (Straight Lines & Text) */}
          {currentDrawings.map((drawing) => {
            const isSelected = selectedDrawingId === drawing.id;
            if (drawing.type === 'line') {
              const p1 = projectDrawingPoint(drawing.p1);
              const p2 = projectDrawingPoint(drawing.p2);
              if (!p1 || !p2) return null;
              return (
                <g key={drawing.id} style={{ pointerEvents: 'auto' }}>
                  {/* Invisible hit area for clicking and dragging */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="transparent"
                    strokeWidth="14"
                    style={{ cursor: isSelected ? 'move' : 'pointer' }}
                    onMouseDown={(e) => handleDrawingMouseDown(e, drawing, 'body')}
                  />
                  {/* Visible 1px white straight line */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={drawing.color || '#ffffff'}
                    strokeWidth={drawing.width || 1}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Selection handles */}
                  {isSelected && (
                    <>
                      <circle
                        cx={p1.x}
                        cy={p1.y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        style={{ cursor: 'move', pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleDrawingMouseDown(e, drawing, 'p1')}
                      />
                      <circle
                        cx={p2.x}
                        cy={p2.y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        style={{ cursor: 'move', pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleDrawingMouseDown(e, drawing, 'p2')}
                      />
                    </>
                  )}
                </g>
              );
            }

            if (drawing.type === 'text') {
              const pt = projectDrawingPoint(drawing.p);
              if (!pt) return null;
              const textWidth = measureTextWidth(drawing.text, '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
              const padX = 6;
              const padY = 3;
              const boxW = textWidth + padX * 2;
              const boxH = 12 + padY * 2;
              const boxX = pt.x;
              const boxY = pt.y - 14;

              return (
                <g
                  key={drawing.id}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={(e) => handleDrawingMouseDown(e, drawing, 'text')}
                  onDoubleClick={(e) => handleTextDoubleClick(e, drawing)}
                >
                  <rect
                    x={boxX}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    rx="4"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={isSelected ? '#38bdf8' : 'none'}
                    strokeWidth={isSelected ? '1' : '0'}
                  />
                  <text
                    x={boxX + padX}
                    y={boxY + 13}
                    fill={drawing.color || '#ffffff'}
                    fontSize="12"
                    fontWeight="600"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    style={{ userSelect: 'none' }}
                  >
                    {drawing.text}
                  </text>
                </g>
              );
            }

            return null;
          })}

          {/* 2. Line Drafting Live Preview */}
          {lineDraft && (() => {
            const p1 = projectDrawingPoint(lineDraft.start);
            const p2 = lineDraft.current?.x !== undefined ? { x: lineDraft.current.x, y: lineDraft.current.y } : projectDrawingPoint(lineDraft.current);
            if (!p1 || !p2) return null;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
                <circle cx={p1.x} cy={p1.y} r="3" fill="#ffffff" />
                <circle cx={p2.x} cy={p2.y} r="3" fill="#ffffff" />
              </g>
            );
          })()}

          {/* 3. TradingView Measurement Rendering */}
          {measureRender && (
            <>
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
            </>
          )}
        </svg>

        {/* Selected Drawing Floating Action Menu (Delete & Edit) */}
        {selectedDrawingId && (() => {
          const selDrawing = currentDrawings.find((d) => d.id === selectedDrawingId);
          if (!selDrawing) return null;

          let posX = 0;
          let posY = 0;
          if (selDrawing.type === 'line') {
            const p1 = projectDrawingPoint(selDrawing.p1);
            const p2 = projectDrawingPoint(selDrawing.p2);
            if (!p1 || !p2) return null;
            posX = (p1.x + p2.x) / 2;
            posY = Math.min(p1.y, p2.y) - 28;
          } else if (selDrawing.type === 'text') {
            const pt = projectDrawingPoint(selDrawing.p);
            if (!pt) return null;
            posX = pt.x + 10;
            posY = pt.y - 32;
          }

          const containerW = chartContainerRef.current?.clientWidth || 600;
          const containerH = chartContainerRef.current?.clientHeight || 300;
          posX = Math.max(10, Math.min(posX - 24, containerW - 70));
          posY = Math.max(10, Math.min(posY, containerH - 35));

          return (
            <div
              style={{
                position: 'absolute',
                left: `${posX}px`,
                top: `${posY}px`,
                zIndex: 22,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '2px 4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {selDrawing.type === 'text' && (
                <button
                  type="button"
                  onClick={(e) => handleTextDoubleClick(e, selDrawing)}
                  title="Edit text (or double click)"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ✏️
                </button>
              )}
              <button
                type="button"
                onClick={handleDeleteSelectedDrawing}
                title="Delete drawing (or press Delete/Backspace)"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🗑️
              </button>
            </div>
          );
        })()}

        {/* Inline Text Input Popover */}
        {textInputState && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(10, Math.min(textInputState.x, (chartContainerRef.current?.clientWidth || 600) - 230))}px`,
              top: `${Math.max(10, Math.min(textInputState.y - 38, (chartContainerRef.current?.clientHeight || 300) - 50))}px`,
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              padding: '4px 6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={textInputState.value}
              onChange={(e) => setTextInputState((prev) => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommitText();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setTextInputState(null);
                  setActiveTool('none');
                }
              }}
              placeholder="Type note (e.g. Pivot)..."
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                color: '#ffffff',
                padding: '3px 8px',
                fontSize: '12px',
                outline: 'none',
                width: '160px',
              }}
            />
            <button
              type="button"
              onClick={handleCommitText}
              title="Save text note (Enter)"
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setTextInputState(null);
                setActiveTool('none');
              }}
              title="Cancel (Esc)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '4px',
                padding: '3px 6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Measurement Stat Pill */}
        {measureRender && (
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
        )}

        {/* Floating Earnings Hover Tooltip Popover */}
        {hoveredEarnings && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(10, Math.min(hoveredEarnings.x - 90, (chartContainerRef.current?.clientWidth || 600) - 220))}px`,
              bottom: `${(chartContainerRef.current?.clientHeight || 280) - hoveredEarnings.y + 16}px`,
              zIndex: 35,
              background: 'rgba(15, 23, 42, 0.96)',
              border: `1px solid ${hoveredEarnings.record.surprise_pct > 0 ? '#10b981' : (hoveredEarnings.record.surprise_pct < 0 ? '#ef4444' : '#38bdf8')}`,
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: '12px',
              minWidth: '180px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: '#f8fafc' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: hoveredEarnings.record.surprise_pct > 0 ? '#064e3b' : (hoveredEarnings.record.surprise_pct < 0 ? '#450a0a' : '#0c4a6e'),
                  color: hoveredEarnings.record.surprise_pct > 0 ? '#34d399' : (hoveredEarnings.record.surprise_pct < 0 ? '#fca5a5' : '#7dd3fc'),
                  fontSize: '9.5px',
                  fontWeight: 800
                }}>E</span>
                {hoveredEarnings.record.eps_actual !== null ? 'Earnings Report' : 'Upcoming Earnings'}
              </span>
              {hoveredEarnings.record.time_of_day && (
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {hoveredEarnings.record.time_of_day === 'amc' ? 'After Close' : (hoveredEarnings.record.time_of_day === 'bmo' ? 'Pre-Market' : hoveredEarnings.record.time_of_day)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Date:</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{hoveredEarnings.record.date}</span>
              </div>
              {hoveredEarnings.record.eps_actual !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Reported EPS:</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>${hoveredEarnings.record.eps_actual.toFixed(2)}</span>
                </div>
              )}
              {hoveredEarnings.record.eps_estimate !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Consensus Est:</span>
                  <span style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>${hoveredEarnings.record.eps_estimate.toFixed(2)}</span>
                </div>
              )}
              {hoveredEarnings.record.surprise_pct !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', paddingTop: '3px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                  <span>Surprise:</span>
                  <span style={{
                    fontWeight: 700,
                    color: hoveredEarnings.record.surprise_pct > 0 ? '#34d399' : (hoveredEarnings.record.surprise_pct < 0 ? '#f87171' : '#cbd5e1')
                  }}>
                    {hoveredEarnings.record.surprise_pct > 0 ? '+' : ''}{hoveredEarnings.record.surprise_pct.toFixed(2)}%
                    {hoveredEarnings.record.surprise_pct > 0 ? ' (Beat)' : (hoveredEarnings.record.surprise_pct < 0 ? ' (Miss)' : '')}
                  </span>
                </div>
              )}
            </div>
          </div>
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

