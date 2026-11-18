import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import DailyChart from './DailyChart';
import CandlestickChart from '../CandlestickChart';
import HorizontalSplitter from './HorizontalSplitter';
import BottomCharts from './BottomCharts';
import { fetchStockBundle, getCachedStockData } from './stockCache';

/**
 * MultiTimeframeChart - Manages the multi-timeframe chart layout:
 * Supports an optional resizable S&P 500 (SPY) panel above DailyChart,
 * and when showMultiCharts is true, HorizontalSplitter + BottomCharts (Monthly + Weekly) below.
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
  showSpyChart = false,
  onToggleSpyChart = null,
  spyChartPct = 24,
  onSpyChartPctChange = null,
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
  drawings = null,
  onDrawingsChange = null,
}, ref) {
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingSpy, setIsResizingSpy] = useState(false);
  const containerRef = useRef(null);
  const dailyStackRef = useRef(null);
  const resizeStartYRef = useRef(0);
  const resizeStartTopPctRef = useRef(multiChartTopPct);
  const containerHeightRef = useRef(600);

  const resizeSpyStartYRef = useRef(0);
  const resizeSpyStartPctRef = useRef(spyChartPct);
  const dailyStackHeightRef = useRef(400);

  const dailyChartRef = useRef(null);
  const spyChartRef = useRef(null);
  const isSyncingRangeRef = useRef(false);
  const isSyncingCrosshairRef = useRef(false);

  const setDailyChartRef = useCallback(
    (instance) => {
      dailyChartRef.current = instance;
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
    },
    [ref]
  );

  // S&P 500 (SPY) prices state (cached in globalStockDataCache for instant 0ms mount)
  const [spyPrices, setSpyPrices] = useState(() => getCachedStockData('SPY')?.prices || []);

  const effectiveShowSpy = Boolean(showSpyChart && symbol?.toUpperCase() !== 'SPY');

  useEffect(() => {
    if (!effectiveShowSpy) return;
    const cached = getCachedStockData('SPY');
    if (cached?.prices?.length > 0) {
      setSpyPrices(cached.prices);
      return;
    }
    let isMounted = true;
    fetchStockBundle('SPY')
      .then((bundle) => {
        if (isMounted && bundle?.prices?.length > 0) {
          setSpyPrices(bundle.prices);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [effectiveShowSpy]);

  // Synchronize visible logical range and crosshair between DailyChart and SPY panel
  const handleDailyVisibleRangeChange = useCallback((range, dailyLookup) => {
    if (isSyncingRangeRef.current || !spyChartRef.current) return;
    isSyncingRangeRef.current = true;
    try {
      spyChartRef.current.syncVisibleRangeFrom?.(range, dailyLookup);
    } finally {
      isSyncingRangeRef.current = false;
    }
  }, []);

  const handleSpyVisibleRangeChange = useCallback((range, spyLookup) => {
    if (isSyncingRangeRef.current || !dailyChartRef.current) return;
    isSyncingRangeRef.current = true;
    try {
      dailyChartRef.current.syncVisibleRangeFrom?.(range, spyLookup);
    } finally {
      isSyncingRangeRef.current = false;
    }
  }, []);

  const handleDailyCrosshairMove = useCallback((param) => {
    if (isSyncingCrosshairRef.current || !spyChartRef.current) return;
    isSyncingCrosshairRef.current = true;
    try {
      spyChartRef.current.syncCrosshairTime?.(param?.time || null);
    } finally {
      isSyncingCrosshairRef.current = false;
    }
  }, []);

  const handleSpyCrosshairMove = useCallback((param) => {
    if (isSyncingCrosshairRef.current || !dailyChartRef.current) return;
    isSyncingCrosshairRef.current = true;
    try {
      dailyChartRef.current.syncCrosshairTime?.(param?.time || null);
    } finally {
      isSyncingCrosshairRef.current = false;
    }
  }, []);

  // Ensure SPY visible range matches DailyChart when SPY panel opens or stock/asOfDate changes
  useEffect(() => {
    if (!effectiveShowSpy || !spyPrices || spyPrices.length === 0) return;
    const syncNow = () => {
      if (!dailyChartRef.current || !spyChartRef.current || isSyncingRangeRef.current) return;
      const dailyChart = dailyChartRef.current.getChart?.();
      const dailyLookup = dailyChartRef.current.getDataLookup?.();
      const currentRange = dailyChart?.timeScale()?.getVisibleLogicalRange?.();
      if (currentRange && dailyLookup) {
        isSyncingRangeRef.current = true;
        try {
          spyChartRef.current.syncVisibleRangeFrom?.(currentRange, dailyLookup);
        } finally {
          isSyncingRangeRef.current = false;
        }
      }
    };
    syncNow();
    const rafId = requestAnimationFrame(syncNow);
    return () => cancelAnimationFrame(rafId);
  }, [effectiveShowSpy, spyPrices, data, asOfDate]);

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

  const startResizingSpy = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizingSpy(true);
      resizeSpyStartYRef.current = e.clientY;
      resizeSpyStartPctRef.current = spyChartPct;
      if (dailyStackRef.current) {
        dailyStackHeightRef.current = dailyStackRef.current.getBoundingClientRect().height;
      }
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [spyChartPct]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const deltaY = e.clientY - resizeStartYRef.current;
        const totalH = containerHeightRef.current || 600;
        const deltaPct = (deltaY / totalH) * 100;
        const newPct = Math.max(15, Math.min(85, resizeStartTopPctRef.current + deltaPct));
        onMultiChartTopPctChange?.(newPct);
      } else if (isResizingSpy) {
        const deltaY = e.clientY - resizeSpyStartYRef.current;
        const stackH = dailyStackHeightRef.current || 400;
        const deltaPct = (deltaY / stackH) * 100;
        const newPct = Math.max(12, Math.min(55, resizeSpyStartPctRef.current + deltaPct));
        onSpyChartPctChange?.(newPct);
      }
    };

    const handleMouseUp = () => {
      if (isResizing || isResizingSpy) {
        setIsResizing(false);
        setIsResizingSpy(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizing || isResizingSpy) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isResizingSpy, onMultiChartTopPctChange, onSpyChartPctChange]);

  const handleResetTopPct = () => {
    onMultiChartTopPctChange?.(62);
  };

  const handleResetSpyPct = () => {
    onSpyChartPctChange?.(24);
  };

  const hasData = Array.isArray(data) && data.length > 0;
  const hasSpyData = effectiveShowSpy && Array.isArray(spyPrices) && spyPrices.length > 0;
  const anyResizing = isResizing || isResizingSpy;

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
            {/* Top Stack: Optional S&P 500 (SPY) Panel + Primary Daily Chart */}
            <div
              ref={dailyStackRef}
              style={{
                flex: showMultiCharts ? `${multiChartTopPct} 1 0%` : '1 1 0%',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                position: 'relative',
                pointerEvents: anyResizing ? 'none' : 'auto',
              }}
            >
              {hasSpyData && (
                <>
                  <div
                    style={{
                      flex: `${spyChartPct} 1 0%`,
                      minHeight: '55px',
                      position: 'relative',
                    }}
                  >
                    <CandlestickChart
                      ref={spyChartRef}
                      data={spyPrices}
                      symbol="SPY"
                      companyName="S&P 500 ETF"
                      asOfDate={asOfDate}
                      height="100%"
                      timeframe="daily"
                      hideTools={true}
                      hideTimeScale={true}
                      isCompact={true}
                      isSyncedFollower={true}
                      showVolumeProfile={false}
                      showYearlyThumbnail={false}
                      showRsLine={false}
                      showAtrDots={false}
                      showEarnings={false}
                      showSymbol={true}
                      onVisibleLogicalRangeChange={handleSpyVisibleRangeChange}
                      onCrosshairMove={handleSpyCrosshairMove}
                    />
                    {onToggleSpyChart && (
                      <button
                        type="button"
                        onClick={onToggleSpyChart}
                        title="Hide S&P 500 (SPY) Market Panel"
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '75px',
                          zIndex: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          padding: 0,
                          borderRadius: '4px',
                          background: 'rgba(15, 23, 42, 0.78)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          color: '#94a3b8',
                          fontSize: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#f8fafc';
                          e.currentTarget.style.borderColor = 'rgba(248, 250, 252, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <HorizontalSplitter
                    isResizing={isResizingSpy}
                    onMouseDown={startResizingSpy}
                    onDoubleClick={handleResetSpyPct}
                    title="Drag to adjust S&P 500 (SPY) panel height (Double-click to reset)"
                  />
                </>
              )}

              <div
                style={{
                  flex: hasSpyData ? `${100 - spyChartPct} 1 0%` : '1 1 0%',
                  minHeight: '60px',
                  position: 'relative',
                }}
              >
                <DailyChart
                  ref={setDailyChartRef}
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
                  drawings={drawings}
                  onDrawingsChange={onDrawingsChange}
                  onVisibleLogicalRangeChange={handleDailyVisibleRangeChange}
                  onCrosshairMove={handleDailyCrosshairMove}
                />
              </div>
            </div>

            {showMultiCharts && (
              <>
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
                    pointerEvents: anyResizing ? 'none' : 'auto',
                  }}
                >
                  <BottomCharts
                    data={data}
                    symbol={symbol}
                    companyName={companyName}
                    isResizing={anyResizing}
                  />
                </div>
              </>
            )}
          </div>

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

