import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import DailyChart from './DailyChart';
import HorizontalSplitter from './HorizontalSplitter';
import BottomCharts from './BottomCharts';

/**
 * MultiTimeframeChart - Manages the multi-timeframe chart layout:
 * When showMultiCharts is true: DailyChart on top, HorizontalSplitter, BottomCharts (Monthly + Weekly) below.
 * When showMultiCharts is false: DailyChart takes 100% of height.
 */
const MultiTimeframeChart = forwardRef(function MultiTimeframeChart({
  data = [],
  symbol = '',
  companyName = '',
  asOfDate = null,
  setupName = null,
  showMultiCharts = true,
  multiChartTopPct = 62,
  onMultiChartTopPctChange = null,
  loadingPrices = false,
  showVolumeProfile = true,
  tradeExecutions = null,
  tradePriceLines = null,
  showScreenshotButton = false,
  onScreenshotSaved = null,
  showYearlyThumbnail = null,
  showRsLine = null,
  showEarnings = null,
  showSymbol = null,
}, ref) {
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const resizeStartYRef = useRef(0);
  const resizeStartTopPctRef = useRef(multiChartTopPct);
  const containerHeightRef = useRef(600);

  const startResizing = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartYRef.current = e.clientY;
      resizeStartTopPctRef.current = multiChartTopPct;
      if (containerRef.current) {
        containerHeightRef.current = containerRef.current.getBoundingClientRect().height;
      }
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [multiChartTopPct]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const deltaY = e.clientY - resizeStartYRef.current;
      const totalH = containerHeightRef.current || 600;
      const deltaPct = (deltaY / totalH) * 100;
      const newPct = Math.max(15, Math.min(85, resizeStartTopPctRef.current + deltaPct));
      onMultiChartTopPctChange?.(newPct);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onMultiChartTopPctChange]);

  const handleResetTopPct = () => {
    onMultiChartTopPctChange?.(62);
  };

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {hasData ? (
        <>
          {showMultiCharts ? (
            <div
              ref={containerRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                minHeight: 0,
              }}
            >
              {/* Top: Daily Chart */}
              <div
                style={{
                  flex: `${multiChartTopPct} 1 0%`,
                  minHeight: '60px',
                  position: 'relative',
                  pointerEvents: isResizing ? 'none' : 'auto',
                }}
              >
                <DailyChart
                  ref={ref}
                  data={data}
                  symbol={symbol}
                  companyName={companyName}
                  asOfDate={asOfDate}
                  setupName={setupName}
                  height="100%"
                  showVolumeProfile={showVolumeProfile}
                  tradeExecutions={tradeExecutions}
                  tradePriceLines={tradePriceLines}
                  showScreenshotButton={showScreenshotButton}
                  onScreenshotSaved={onScreenshotSaved}
                  showYearlyThumbnail={showYearlyThumbnail}
                  showRsLine={showRsLine}
                  showEarnings={showEarnings}
                  showSymbol={showSymbol}
                />
              </div>

              {/* Horizontal Splitter */}
              <HorizontalSplitter
                isResizing={isResizing}
                onMouseDown={startResizing}
                onDoubleClick={handleResetTopPct}
              />

              {/* Bottom Split: Monthly (Left) & Weekly (Right) */}
              <div
                style={{
                  flex: `${100 - multiChartTopPct} 1 0%`,
                  minHeight: '60px',
                  display: 'flex',
                  flexDirection: 'row',
                  width: '100%',
                  pointerEvents: isResizing ? 'none' : 'auto',
                }}
              >
                <BottomCharts
                  data={data}
                  symbol={symbol}
                  companyName={companyName}
                  isResizing={isResizing}
                />
              </div>
            </div>
          ) : (
            <DailyChart
              ref={ref}
              data={data}
              symbol={symbol}
              companyName={companyName}
              asOfDate={asOfDate}
              setupName={setupName}
              height="100%"
              showVolumeProfile={showVolumeProfile}
              tradeExecutions={tradeExecutions}
              tradePriceLines={tradePriceLines}
              showScreenshotButton={showScreenshotButton}
              onScreenshotSaved={onScreenshotSaved}
              showYearlyThumbnail={showYearlyThumbnail}
              showRsLine={showRsLine}
              showEarnings={showEarnings}
              showSymbol={showSymbol}
            />
          )}

          {/* Floating badge when updating prices in background without unmounting */}
          {loadingPrices && (
            <div className="stock-view-updating-badge">
              <span className="spin-icon">⟳</span>
              <span>Updating {symbol}...</span>
            </div>
          )}
        </>
      ) : loadingPrices ? (
        <div
          style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '13px',
            gap: '8px',
          }}
        >
          <span className="spin-icon">⟳</span>
          <span>Loading chart candles for {symbol || 'stock'}...</span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '13px',
          }}
        >
          {symbol ? `No price data available for ${symbol}.` : 'Select a stock to view its candlestick chart.'}
        </div>
      )}
    </div>
  );
});

export default MultiTimeframeChart;

