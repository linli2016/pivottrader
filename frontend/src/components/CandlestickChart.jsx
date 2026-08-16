import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

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

export default function CandlestickChart({ data, height = 280 }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

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
      });

      const ema20Series = chart.addSeries(LineSeries, {
        color: 'rgb(189, 15, 15)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const sma50Series = chart.addSeries(LineSeries, {
        color: 'rgb(255, 235, 59)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const sma150Series = chart.addSeries(LineSeries, {
        color: 'rgb(0, 255, 255)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const sma220Series = chart.addSeries(LineSeries, {
        color: '#dfe9df',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

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
    chartRef.current.applyOptions({
      height: height,
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
  }, [data, height]);

  // Clean up chart instance on component unmount & handle container resize
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && entries[0].contentRect && chartRef.current) {
        const newWidth = entries[0].contentRect.width;
        if (newWidth > 0) {
          chartRef.current.applyOptions({ width: newWidth });
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
      }
    };
  }, []);

  return <div ref={chartContainerRef} style={{ width: '100%', minHeight: `${height}px`, position: 'relative' }} />;
}
