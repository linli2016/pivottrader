import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import StockChartPane from './StockChartPane';
import VerticalSplitter from './VerticalSplitter';
import StockDetailPanel from './StockDetailPanel';
import { fetchStockBundle, getCachedStockData } from './stockCache';
import './StockView.css';

/**
 * StockView - Unified, standalone & embedded stock viewer component.
 * Brings together StockChartPane (StockInfo + MultiTimeframeChart),
 * VerticalSplitter, and collapsible StockDetailPanel.
 */
const StockView = forwardRef(function StockView({
  // Stock identity
  stock = null,
  prices: externalPrices = null,
  detail: externalDetail = null,
  peersData: externalPeersData = null,
  loadingPrices: externalLoadingPrices = null,
  loadingDetail: externalLoadingDetail = null,
  // Callbacks
  onSelectStock = null,
  onSelectGroup = null,
  // Watchlist props
  watchlists = [],
  targetWatchlistId: propTargetWatchlistId = null,
  targetWatchlistSymbols: propTargetWatchlistSymbols = null,
  onTargetWatchlistChange = null,
  onToggleWatchlist = null,
  isWatchlistSaved: propIsWatchlistSaved = null,
  // Setup & regime props
  asOfDate = null,
  setupName = null,
  marketRegime = null,
  // Optional extra header elements (non-counter)
  headerExtra = null,
  showEarningsBadge = true,
  // Chart props
  tradeExecutions = null,
  tradePriceLines = null,
  showVolumeProfile = true,
  showScreenshotButton = false,
  onScreenshotSaved = null,
  showYearlyThumbnail = null,
  showRsLine = null,
  showEarnings = null,
  showSymbol = null,
  className = '',
  style = {},
}, ref) {
  const symbol = useMemo(() => {
    if (!stock) return '';
    return (stock.symbol || stock.ticker || (typeof stock === 'string' ? stock : '')).toUpperCase().trim();
  }, [stock]);

  // Initial data check from cache for instant 0ms mount
  const cachedBundle = useMemo(() => (symbol ? getCachedStockData(symbol) : null), [symbol]);

  // Data states (fallback to internal if external not provided)
  const [internalPrices, setInternalPrices] = useState(() => externalPrices || cachedBundle?.prices || []);
  const [internalDetail, setInternalDetail] = useState(() => externalDetail || cachedBundle?.detail || null);
  const [internalPeersData, setInternalPeersData] = useState(() => externalPeersData || cachedBundle?.peersData || null);
  const [internalLoadingPrices, setInternalLoadingPrices] = useState(false);
  const [internalLoadingDetail, setInternalLoadingDetail] = useState(false);

  // Sync external props if provided
  useEffect(() => {
    if (externalPrices !== null) setInternalPrices(externalPrices);
  }, [externalPrices]);

  useEffect(() => {
    if (externalDetail !== null) setInternalDetail(externalDetail);
  }, [externalDetail]);

  useEffect(() => {
    if (externalPeersData !== null) setInternalPeersData(externalPeersData);
  }, [externalPeersData]);

  // Auto-fetch data if symbol changes and external prices/detail are omitted
  useEffect(() => {
    if (!symbol) {
      setInternalPrices([]);
      setInternalDetail(null);
      setInternalPeersData(null);
      return;
    }

    const needsPrices = externalPrices === null;
    const needsDetail = externalDetail === null;

    if (!needsPrices && !needsDetail) return;

    const cached = getCachedStockData(symbol);
    if (cached) {
      if (needsPrices) setInternalPrices(cached.prices || []);
      if (needsDetail) {
        setInternalDetail(cached.detail || null);
        setInternalPeersData(cached.peersData || null);
      }
      return;
    }

    if (needsPrices) setInternalLoadingPrices(true);
    if (needsDetail) setInternalLoadingDetail(true);

    let isMounted = true;
    fetchStockBundle(symbol)
      .then((bundle) => {
        if (!isMounted) return;
        if (needsPrices) {
          setInternalPrices(bundle.prices || []);
          setInternalLoadingPrices(false);
        }
        if (needsDetail) {
          setInternalDetail(bundle.detail || null);
          setInternalPeersData(bundle.peersData || null);
          setInternalLoadingDetail(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        if (needsPrices) setInternalLoadingPrices(false);
        if (needsDetail) setInternalLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [symbol, externalPrices, externalDetail]);

  const prices = externalPrices !== null ? externalPrices : internalPrices;
  const detail = externalDetail !== null ? externalDetail : internalDetail;
  const peersData = externalPeersData !== null ? externalPeersData : internalPeersData;
  const loadingPrices = externalLoadingPrices !== null ? externalLoadingPrices : internalLoadingPrices;

  // View state 1: Multi-charts (Daily vs 3-charts)
  const [showMultiCharts, setShowMultiCharts] = useState(() => {
    try {
      const saved = localStorage.getItem('pivot_watchlist_multicharts');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMultiCharts = useCallback(() => {
    setShowMultiCharts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pivot_watchlist_multicharts', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // View state 2: Horizontal split percentage between Daily and Bottom charts
  const [multiChartTopPct, setMultiChartTopPct] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_markets_multichart_top_pct');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 15 && val <= 85) return val;
      }
    } catch (_) {}
    return 62;
  });

  const handleMultiChartTopPctChange = useCallback((newPct) => {
    setMultiChartTopPct(newPct);
    try {
      localStorage.setItem('pt_markets_multichart_top_pct', String(newPct));
    } catch (_) {}
  }, []);

  // View state 3: Collapsible Inspector / Stock Detail Panel
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('pivot_watchlist_right_panel_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleDetail = useCallback(() => {
    setIsDetailCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pivot_watchlist_right_panel_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // View state 4: Detail Panel Width
  const [detailWidth, setDetailWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_watchlist_stock_detail_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 320 && val <= 700) return val;
      }
    } catch (_) {}
    return 380;
  });

  // Vertical Resizing Splitter Logic
  const [isResizingDetail, setIsResizingDetail] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(380);

  const startResizingDetail = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizingDetail(true);
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = detailWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [detailWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingDetail) return;
      const delta = resizeStartXRef.current - e.clientX;
      const newWidth = Math.max(320, Math.min(650, resizeStartWidthRef.current + delta));
      setDetailWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingDetail) {
        setIsResizingDetail(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_watchlist_stock_detail_width', String(detailWidth));
        } catch (_) {}
      }
    };

    if (isResizingDetail) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingDetail, detailWidth]);

  // Target watchlist state
  const [internalTargetWatchlistId, setInternalTargetWatchlistId] = useState(propTargetWatchlistId);
  const [internalTargetSymbols, setInternalTargetSymbols] = useState(() => new Set());

  useEffect(() => {
    if (propTargetWatchlistId !== null) {
      setInternalTargetWatchlistId(propTargetWatchlistId);
    }
  }, [propTargetWatchlistId]);

  const targetWatchlistId = propTargetWatchlistId !== null ? propTargetWatchlistId : internalTargetWatchlistId;

  // Auto-fetch symbols for target watchlist when not supplied via propTargetWatchlistSymbols
  useEffect(() => {
    if (propTargetWatchlistSymbols) return;
    if (!targetWatchlistId) {
      setInternalTargetSymbols(new Set());
      return;
    }
    let cancelled = false;
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setInternalTargetSymbols(new Set(data.map((i) => (i.symbol || '').toUpperCase())));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targetWatchlistId, propTargetWatchlistSymbols]);

  const handleTargetWatchlistChange = useCallback(
    (newId) => {
      setInternalTargetWatchlistId(newId);
      onTargetWatchlistChange?.(newId);
    },
    [onTargetWatchlistChange]
  );

  const isWatchlistSaved = useMemo(() => {
    if (!symbol || !targetWatchlistId) return false;
    if (propIsWatchlistSaved !== null && propIsWatchlistSaved !== undefined) {
      return Boolean(propIsWatchlistSaved);
    }
    const cleanSym = symbol.toUpperCase().trim();
    const symSet = propTargetWatchlistSymbols || internalTargetSymbols;
    if (symSet) {
      if (typeof symSet.has === 'function') {
        return symSet.has(cleanSym);
      }
      if (Array.isArray(symSet)) {
        return symSet.some((s) => (s?.symbol || s).toUpperCase() === cleanSym);
      }
    }
    return false;
  }, [symbol, targetWatchlistId, propIsWatchlistSaved, propTargetWatchlistSymbols, internalTargetSymbols]);

  const handleToggleWatchlistAction = useCallback(
    (sym) => {
      if (!sym) return;
      const cleanSym = sym.toUpperCase().trim();
      if (!propTargetWatchlistSymbols) {
        setInternalTargetSymbols((prev) => {
          const next = new Set(prev);
          if (next.has(cleanSym)) next.delete(cleanSym);
          else next.add(cleanSym);
          return next;
        });
      }
      onToggleWatchlist?.(sym);
    },
    [propTargetWatchlistSymbols, onToggleWatchlist]
  );

  const handleInspectTicker = useCallback(
    (targetSymbol) => {
      if (!targetSymbol) return;
      const cleanSym = targetSymbol.toUpperCase().trim();
      if (onSelectStock) {
        onSelectStock({ symbol: cleanSym });
      }
    },
    [onSelectStock]
  );

  return (
    <div
      className={`stock-view-root ${className}`}
      style={style}
    >
      {/* Primary Chart Area */}
      <StockChartPane
        ref={ref}
        stock={stock}
        stockDetail={detail}
        stockPrices={prices}
        loadingPrices={loadingPrices}
        asOfDate={asOfDate}
        setupName={setupName}
        marketRegime={marketRegime}
        watchlists={watchlists}
        targetWatchlistId={targetWatchlistId}
        onTargetWatchlistChange={handleTargetWatchlistChange}
        onToggleWatchlist={handleToggleWatchlistAction}
        isWatchlistSaved={isWatchlistSaved}
        showMultiCharts={showMultiCharts}
        onToggleMultiCharts={handleToggleMultiCharts}
        multiChartTopPct={multiChartTopPct}
        onMultiChartTopPctChange={handleMultiChartTopPctChange}
        isDetailCollapsed={isDetailCollapsed}
        onToggleDetail={handleToggleDetail}
        onSelectGroup={onSelectGroup}
        headerExtra={headerExtra}
        showEarningsBadge={showEarningsBadge}
        tradeExecutions={tradeExecutions}
        tradePriceLines={tradePriceLines}
        showVolumeProfile={showVolumeProfile}
        showScreenshotButton={showScreenshotButton}
        onScreenshotSaved={onScreenshotSaved}
        showYearlyThumbnail={showYearlyThumbnail}
        showRsLine={showRsLine}
        showEarnings={showEarnings}
        showSymbol={showSymbol}
      />

      {/* Vertical Splitter */}
      {!isDetailCollapsed && symbol && (
        <VerticalSplitter
          isResizing={isResizingDetail}
          onMouseDown={startResizingDetail}
        />
      )}

      {/* Collapsible Stock Detail Inspector Panel */}
      {!isDetailCollapsed && symbol && (
        <StockDetailPanel
          stock={stock}
          stockDetail={detail}
          peersData={peersData}
          width={detailWidth}
          onClose={() => handleToggleDetail()}
          onSelectStock={onSelectStock}
          onInspectTicker={handleInspectTicker}
        />
      )}
    </div>
  );
});

export default StockView;

