import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers, CrosshairMode } from 'lightweight-charts';

// Helper to calculate Simple Moving Average (SMA)
function calculateSMA(data, period) {
  if (!data || data.length < period) return [];
  const smaData = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
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

// Helper to resolve the matching time bar in data
function resolveAsOfTime(data, targetDate) {
  if (!data || data.length === 0 || !targetDate || targetDate === 'latest') return null;
  const exact = data.find(d => d.time === targetDate);
  if (exact) return exact.time;

  let best = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i].time <= targetDate) {
      best = data[i].time;
    } else {
      break;
    }
  }
  return best;
}

export default function CandlestickChart({ data, height = 280, asOfDate = null }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersPluginRef = useRef(null);
  const verticalLineRef = useRef(null);

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
        ema10Series,
        ema20Series,
        sma50Series,
        sma150Series,
        sma220Series,
      };
    }

    // Always update height and container width
    const currentContainerHeight = chartContainerRef.current.clientHeight;
    const targetHeight = typeof height === 'number' ? height : (currentContainerHeight > 0 ? currentContainerHeight : 280);
    chartRef.current.applyOptions({
      height: targetHeight,
      width: chartContainerRef.current.clientWidth || 700,
    });

    // Populate or update series data whenever data prop is available
    if (data && data.length > 0 && seriesRef.current) {
      const {
        candlestickSeries,
        volumeSeries,
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
      candlestickSeries.setData(data);
      ema10Series.setData(calculateEMA(data, 10));
      ema20Series.setData(calculateEMA(data, 20));
      sma50Series.setData(calculateSMA(data, 50));
      sma150Series.setData(calculateSMA(data, 150));
      sma220Series.setData(calculateSMA(data, 220));

      // Resolve and apply As-of Date vertical line (without text label)
      const resolvedTime = resolveAsOfTime(data, asOfDate);
      if (markersPluginRef.current) {
        markersPluginRef.current.setMarkers([]);
      }
      if (resolvedTime && verticalLineRef.current) {
        verticalLineRef.current.updateTime(resolvedTime);
      } else {
        if (verticalLineRef.current) verticalLineRef.current.updateTime(null);
      }

      chartRef.current.timeScale().fitContent();
      if (data.length > 189) {
        requestAnimationFrame(() => {
          if (chartRef.current && data && data.length > 189) {
            try {
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: data.length - 189,
                to: data.length - 1,
              });
            } catch (err) {
              console.warn('Error setting 9-month logical range:', err);
            }
          }
        });
      }
    }
  }, [data, height, asOfDate]);

  // Clean up chart instance on component unmount & handle container resize
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current && container) {
        const newWidth = entries[0].contentRect?.width || container.clientWidth;
        const containerH = container.clientHeight || entries[0].contentRect?.height;
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
      ref={chartContainerRef}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : (height || '100%'),
        minHeight: typeof height === 'number' ? `${height}px` : '280px',
        position: 'relative',
        flex: 1
      }}
    />
  );
}

