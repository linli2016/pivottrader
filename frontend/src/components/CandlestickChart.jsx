import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

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
    chart.timeScale().fitContent();

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(data);

    // 1. Add SMA 50 Line Series
    const sma50Series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1.5,
      title: 'SMA 50',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma50Data = calculateSMA(data, 50);
    sma50Series.setData(sma50Data);

    // 2. Add SMA 150 Line Series
    const sma150Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1.5,
      title: 'SMA 150',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma150Data = calculateSMA(data, 150);
    sma150Series.setData(sma150Data);

    // 3. Add SMA 200 Line Series
    const sma200Series = chart.addSeries(LineSeries, {
      color: '#ec4899',
      lineWidth: 2,
      title: 'SMA 200',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const sma200Data = calculateSMA(data, 200);
    sma200Series.setData(sma200Data);

    // 4. Add RS Rank Line Series (on a separate left scale to avoid scale distortion)
    const rsRankSeries = chart.addSeries(LineSeries, {
      color: '#a855f7', // Violet/purple
      lineWidth: 2,
      title: 'RS Rank',
      priceLineVisible: false,
      lastValueVisible: true,
      priceScaleId: 'left',
    });

    chart.priceScale('left').applyOptions({
      visible: true,
      title: 'RS Rank',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    const rsRankData = data
      .filter(d => d.rs_rank !== null && d.rs_rank !== undefined)
      .map(d => ({
        time: d.time,
        value: d.rs_rank
      }));
    rsRankSeries.setData(rsRankData);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return <div ref={chartContainerRef} style={{ width: '100%', position: 'relative' }} />;
}
