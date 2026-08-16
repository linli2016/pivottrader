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

// --- Price Chart Component ---
export default function CandlestickChart({ data, height = 280 }) {
  const chartContainerRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#161e2f' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
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
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: false,
    });

    const volumeData = data.map(d => ({
      time: d.time,
      value: d.volume || 0,
      color: (d.close >= d.open) ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
    volumeSeries.setData(volumeData);

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(data);

    // 1. EMA 10 Line (rgb(255, 152, 0), width 1)
    const ema10Series = chart.addSeries(LineSeries, {
      color: 'rgb(255, 152, 0)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema10Series.setData(calculateEMA(data, 10));

    // 2. EMA 20 Line (rgb(189, 15, 15), width 1)
    const ema20Series = chart.addSeries(LineSeries, {
      color: 'rgb(189, 15, 15)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema20Series.setData(calculateEMA(data, 20));

    // 3. SMA 50 Line (rgb(255, 235, 59), width 1)
    const sma50Series = chart.addSeries(LineSeries, {
      color: 'rgb(255, 235, 59)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma50Series.setData(calculateSMA(data, 50));

    // 4. SMA 150 Line (rgb(0, 255, 255), width 1)
    const sma150Series = chart.addSeries(LineSeries, {
      color: 'rgb(0, 255, 255)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma150Series.setData(calculateSMA(data, 150));

    // 5. SMA 220 Line (#dfe9df, width 1)
    const sma220Series = chart.addSeries(LineSeries, {
      color: '#dfe9df',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    sma220Series.setData(calculateSMA(data, 220));

    // Show recent 9 months (~189 trading days) by default
    chart.timeScale().fitContent();
    if (data.length > 189) {
      chart.timeScale().setVisibleLogicalRange({
        from: data.length - 189,
        to: data.length - 1,
      });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div ref={chartContainerRef} style={{ width: '100%', position: 'relative' }} />;
}
