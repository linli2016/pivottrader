import React from 'react';
import CandlestickChart from './CandlestickChart';

export default function CandidatesTab({
  watchlists = [],
  fetchWatchlists,
  candidates = [],
  loadingCandidates = false,
  fetchCandidates,
  filteredCandidates = [],
  tradingDates = [],
  selectedDate = 'latest',
  setSelectedDate = () => { },
  minPriceFilter,

  setMinPriceFilter,
  minVolFilter,
  setMinVolFilter,
  minRsFilter,
  setMinRsFilter,
  minEpsGrowthFilter,
  setMinEpsGrowthFilter,
  minAtrFilter,
  setMinAtrFilter,
  enforceStage2,
  setEnforceStage2,
  enablePowerPlay,
  setEnablePowerPlay,
  enableIpoBase,
  setEnableIpoBase,
  enableVcpSetup,
  setEnableVcpSetup,
  enableDarvasBox,
  setEnableDarvasBox,
  enableNewLeaders,
  setEnableNewLeaders,
  enableQullamaggieBreakout,
  setEnableQullamaggieBreakout,
  enableEpisodicPivot,
  setEnableEpisodicPivot,
  enableParabolicClimax,
  setEnableParabolicClimax,
  enableParabolicShort,
  setEnableParabolicShort,
  enableParabolicLong,
  setEnableParabolicLong,
  min1mRetFilter,
  setMin1mRetFilter,
  enable1mRet,
  setEnable1mRet,
  enableEmaSurfing,
  setEnableEmaSurfing,
  minEpGapFilter,
  setMinEpGapFilter,
  enableEpGap,
  setEnableEpGap,
  minEpRelVolFilter,
  setMinEpRelVolFilter,
  enableEpRelVol,
  setEnableEpRelVol,
  enableEpFlag,
  setEnableEpFlag,
  minParabolicRunupFilter,
  setMinParabolicRunupFilter,
  enableParabolicRunup,
  setEnableParabolicRunup,
  minParabolicEmaDistFilter,
  setMinParabolicEmaDistFilter,
  enableParabolicEmaDist,
  setEnableParabolicEmaDist,
  minParabolicUpDaysFilter,
  setMinParabolicUpDaysFilter,
  enableParabolicUpDays,
  setEnableParabolicUpDays,
  minPpRunupFilter,
  setMinPpRunupFilter,
  maxPpDrawdownFilter,
  setMaxPpDrawdownFilter,
  minPpDaysSincePeakFilter,
  setMinPpDaysSincePeakFilter,
  maxPpVolRatioFilter,
  setMaxPpVolRatioFilter,
  maxIpoAgeFilter,
  setMaxIpoAgeFilter,
  maxIpoDistFilter,
  setMaxIpoDistFilter,
  maxIpoDepthFilter,
  setMaxIpoDepthFilter,
  maxDarvasWidthFilter,
  setMaxDarvasWidthFilter,
  max52wDistFilter,
  setMax52wDistFilter,
  minSurgeOffLowFilter,
  setMinSurgeOffLowFilter,
  minNewLeadersRsFilter,
  setMinNewLeadersRsFilter,
  // Optional checkbox states & setters
  enablePpRunup,
  setEnablePpRunup,
  enablePpDrawdown,
  setEnablePpDrawdown,
  enablePpDaysSincePeak,
  setEnablePpDaysSincePeak,
  enablePpVolRatio,
  setEnablePpVolRatio,
  enableIpoAge,
  setEnableIpoAge,
  enableIpoDist,
  setEnableIpoDist,
  enableIpoDepth,
  setEnableIpoDepth,
  enableVcpEpsGrowth,
  setEnableVcpEpsGrowth,
  enableVcpPattern,
  setEnableVcpPattern,
  enableDarvasPattern,
  setEnableDarvasPattern,
  enableDarvasWidth,
  setEnableDarvasWidth,
  enableRs,
  setEnableRs,
  enableRsNewHigh,
  setEnableRsNewHigh,
  enableAtr,
  setEnableAtr,
  enablePivotTightness,
  setEnablePivotTightness,
  maxPivotSpreadFilter,
  setMaxPivotSpreadFilter,
  maxPivotClusteringFilter,
  setMaxPivotClusteringFilter,
  maxPivotVolRatioFilter,
  setMaxPivotVolRatioFilter,
  enable52wDist,
  setEnable52wDist,
  enableSurgeOffLow,
  setEnableSurgeOffLow,
  enableNewLeadersRs,
  setEnableNewLeadersRs,
  enableNewLeaders52wHigh,
  setEnableNewLeaders52wHigh,
  enableNewLeadersBase,
  setEnableNewLeadersBase,
  handleSelectStock,
}) {
  const isParabolicActive = enableParabolicClimax || enableParabolicShort || enableParabolicLong;

  // Stock Browse Mode (Chart Flip) states
  const [viewMode, setViewMode] = React.useState('browse'); // 'browse' or 'table'
  const [browseIndex, setBrowseIndex] = React.useState(0);
  const [browsePrices, setBrowsePrices] = React.useState([]);
  const [targetWatchlistId, setTargetWatchlistId] = React.useState(null);
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showFiltersSection, setShowFiltersSection] = React.useState(false);

  const selectedItemRef = React.useRef(null);
  const leftColRef = React.useRef(null);
  const [leftColHeight, setLeftColHeight] = React.useState(null);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  const currentCandidate = filteredCandidates[browseIndex] || null;

  // Dynamically measure and match left column height
  React.useLayoutEffect(() => {
    if (viewMode === 'browse' && leftColRef.current) {
      const updateHeight = () => {
        if (leftColRef.current) {
          setLeftColHeight(leftColRef.current.offsetHeight);
        }
      };
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(leftColRef.current);
      return () => observer.disconnect();
    }
  }, [viewMode, currentCandidate?.symbol]);

  // Auto-scroll selected candidate stock into view in the Filtered Candidates list
  React.useEffect(() => {
    if (viewMode === 'browse' && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [browseIndex, viewMode, filteredCandidates.length]);

  React.useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists]);

  const fetchBrowsePrices = async (symbol) => {
    if (!symbol) return;
    setLoadingBrowsePrices(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/${symbol}/prices`);
      if (res.ok) {
        const data = await res.json();
        setBrowsePrices(data);
      }
    } catch (e) {
      console.error("Error fetching browse prices:", e);
    } finally {
      setLoadingBrowsePrices(false);
    }
  };

  React.useEffect(() => {
    if (viewMode === 'browse' && currentCandidate) {
      fetchBrowsePrices(currentCandidate.symbol);
    }
  }, [viewMode, browseIndex, currentCandidate?.symbol]);

  // Keyboard Arrow Navigation Listener for Browse Mode (Up/Down or Left/Right)
  React.useEffect(() => {
    if (viewMode !== 'browse' || filteredCandidates.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.min(prev + 1, filteredCandidates.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, filteredCandidates.length]);

  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = React.useState(new Set());

  const fetchTargetWatchlistItems = async (watchlistId) => {
    if (!watchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${watchlistId}/items`);
      if (res.ok) {
        const data = await res.json();
        const symSet = new Set(data.map(item => item.symbol.toUpperCase()));
        setActiveWatchlistSymbols(symSet);
      }
    } catch (e) {
      console.error("Error fetching target watchlist items:", e);
    }
  };

  React.useEffect(() => {
    if (targetWatchlistId) {
      fetchTargetWatchlistItems(targetWatchlistId);
    }
  }, [targetWatchlistId, watchlists]);

  const handleToggleWatchlist = async (symbol) => {
    if (!targetWatchlistId || !symbol) return;
    const symUpper = symbol.toUpperCase();
    const isSaved = activeWatchlistSymbols.has(symUpper);

    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items/${symbol}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.delete(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      } else {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.add(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      }
    } catch (e) {
      console.error(`Error toggling watchlist item: ${e.message}`);
    }
  };

  const handleExportTradingView = () => {
    if (filteredCandidates.length === 0) {
      alert("No candidates to export!");
      return;
    }
    const content = filteredCandidates.map(c => {
      const exchange = c.exchange ? `${c.exchange}:` : '';
      return `${exchange}${c.symbol}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PivotTrader_Watchlist_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>STOCKS • 1D SCANNER</span>
            <span>•</span>
            <span>REALTIME FILTERS</span>
          </div>
          <h1>Candidates Screen</h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* View Mode Segmented Control */}
          <div className="segmented-control">
            <button
              className={`segmented-item ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Table View
            </button>
            <button
              className={`segmented-item ${viewMode === 'browse' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('browse');
                if (browseIndex >= filteredCandidates.length) setBrowseIndex(0);
              }}
            >
              ⚡ Stock Browse Mode
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExportTradingView}
            disabled={filteredCandidates.length === 0}
          >
            Export to TradingView
          </button>
        </div>
      </div>

      {/* Interactive Strategy & Filter controls */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Top Integrated Header: Strategy Checkboxes + Right Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Strategy Selector (Left Side: Mutually Exclusive Setup Buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Power Play Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enablePowerPlay;
                setEnablePowerPlay(next);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
                if (next) {
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: enablePowerPlay ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                background: enablePowerPlay ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: enablePowerPlay ? '#38bdf8' : 'var(--text-secondary)',
                boxShadow: enablePowerPlay ? '0 2px 8px rgba(56, 189, 248, 0.25)' : 'none'
              }}
            >
              🚀 Power Play
            </button>

            {/* Breakout Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enableQullamaggieBreakout;
                setEnableQullamaggieBreakout(next);
                setEnablePowerPlay(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
                if (next) {
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: enableQullamaggieBreakout ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                background: enableQullamaggieBreakout ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: enableQullamaggieBreakout ? '#f59e0b' : 'var(--text-secondary)',
                boxShadow: enableQullamaggieBreakout ? '0 2px 8px rgba(245, 158, 11, 0.25)' : 'none'
              }}
            >
              🎯 Breakout
            </button>

            {/* Episodic Pivot Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enableEpisodicPivot;
                setEnableEpisodicPivot(next);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
                if (next) {
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: enableEpisodicPivot ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.12)',
                background: enableEpisodicPivot ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: enableEpisodicPivot ? '#ec4899' : 'var(--text-secondary)',
                boxShadow: enableEpisodicPivot ? '0 2px 8px rgba(236, 72, 153, 0.25)' : 'none'
              }}
            >
              ⚡ Episodic Pivot (EP)
            </button>

            {/* Parabolic Climax Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isParabolicActive;
                if (setEnableParabolicClimax) setEnableParabolicClimax(next);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
                if (next) {
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: isParabolicActive ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isParabolicActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: isParabolicActive ? '#ef4444' : 'var(--text-secondary)',
                boxShadow: isParabolicActive ? '0 2px 8px rgba(239, 68, 68, 0.25)' : 'none'
              }}
            >
              🌋 Parabolic Climax
            </button>

            {/* VCP Pattern Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enableVcpSetup;
                setEnableVcpSetup(next);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
                if (next) {
                  setEnforceStage2(true);
                  setEnableRs(true);
                  setMinRsFilter(70);
                  if (setEnablePivotTightness) setEnablePivotTightness(true);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: enableVcpSetup ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                background: enableVcpSetup ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: enableVcpSetup ? '#10b981' : 'var(--text-secondary)',
                boxShadow: enableVcpSetup ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
              }}
            >
              🌀 VCP Pattern
            </button>
          </div>

          {/* Right Action Controls: Standalone Date Picker & Rules/Sliders Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* HTML5 Graphical Date Picker Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={selectedDate || new Date().toLocaleDateString('en-CA')}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toLocaleDateString('en-CA')}
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchCandidates && fetchCandidates(selectedDate)}
              disabled={loadingCandidates}
              title="Rescan and evaluate stock setups for current date"
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <span className={loadingCandidates ? "spin-icon" : ""}>🔄</span>
              <span>{loadingCandidates ? "Screening..." : "Rescan"}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFiltersSection(!showFiltersSection)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: showFiltersSection ? 'rgba(255, 255, 255, 0.12)' : undefined,
                whiteSpace: 'nowrap'
              }}
            >
              ⚙️ {showFiltersSection ? 'Hide Filters ▲' : 'Filters ▼'}
            </button>
          </div>
        </div>

        {/* Collapsible Section for Rules & Sliders */}
        {showFiltersSection && (
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            {/* Dynamic Parameter Sliders / Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {/* ========================================== */}
              {/* 1. Stage 2 Baseline (Mandatory Inputs) */}
              {/* ========================================== */}

              {/* Min Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  📌 Min Stock Price (${minPriceFilter.toFixed(2)}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={minPriceFilter}
                    onChange={(e) => setMinPriceFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={minPriceFilter}
                    onChange={(e) => setMinPriceFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Min 50d Volume MA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  📊 Min 50d Vol MA ({(minVolFilter / 1000).toFixed(0)}k):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="50000"
                    max="2000000"
                    step="50000"
                    value={minVolFilter}
                    onChange={(e) => setMinVolFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="10000000"
                    value={minVolFilter}
                    onChange={(e) => setMinVolFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Min Relative Strength (RS Rank) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableRs ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableRs}
                    onChange={(e) => setEnableRs(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  🏆 Min RS Rank ({minRsFilter}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    step="1"
                    value={minRsFilter}
                    disabled={!enableRs}
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableRs ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={minRsFilter}
                    disabled={!enableRs}
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Daily ATR (Optional Global/Stage 2 filter) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableAtr ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableAtr}
                    onChange={(e) => setEnableAtr(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min ADTR (20d) ({minAtrFilter.toFixed(1)}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={minAtrFilter}
                    disabled={!enableAtr}
                    onChange={(e) => setMinAtrFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableAtr ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={minAtrFilter}
                    disabled={!enableAtr}
                    onChange={(e) => setMinAtrFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* RS Ranking at New High (Global Filter) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableRsNewHigh ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableRsNewHigh}
                    onChange={(e) => setEnableRsNewHigh(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  RS Ranking at New High
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: enableRsNewHigh ? 'var(--accent-success)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '38px',
                  boxSizing: 'border-box'
                }}>
                  {enableRsNewHigh ? '📈 RS Rank at 252-day High' : '⚪ New High Waived'}
                </div>
              </div>

              {/* Stage 2 Trend Template (Global Filter) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enforceStage2 ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enforceStage2}
                    onChange={(e) => setEnforceStage2(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  📈 Stage 2 Trend
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: enforceStage2 ? 'var(--accent-success)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '38px',
                  boxSizing: 'border-box'
                }}>
                  {enforceStage2 ? '⚡ Close > 50 > 150 > 200 (SMA200 ↗ (1M), 52w Hi ≤25%, Lo ≥30%)' : '⚪ Stage 2 Trend Waived'}
                </div>
              </div>

              {/* Pivot Tightness & Volume Dry-Up (VDU) Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePivotTightness ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePivotTightness}
                    onChange={(e) => setEnablePivotTightness(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  🎯 Pivot Tightness (3d):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Metric 1: Max Price Spread (3d) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="3-Day High-Low price spread / Close price (Price Tightness)">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '95px' }}>Max Spread:</span>
                    <input
                      type="range"
                      min="1.0"
                      max="15.0"
                      step="0.5"
                      value={maxPivotSpreadFilter}
                      disabled={!enablePivotTightness}
                      onChange={(e) => setMaxPivotSpreadFilter(parseFloat(e.target.value) || 0)}
                      style={{ flex: 1, cursor: enablePivotTightness ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '42px', textAlign: 'right' }}>
                      &le;{maxPivotSpreadFilter.toFixed(1)}%
                    </span>
                  </div>

                  {/* Metric 2: Close Clustering (3d) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="3-Day Close Clustering: (Highest Close - Lowest Close) / Close over last 3 days">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '95px' }}>Close Clust:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="10.0"
                      step="0.1"
                      value={maxPivotClusteringFilter}
                      disabled={!enablePivotTightness}
                      onChange={(e) => setMaxPivotClusteringFilter(parseFloat(e.target.value) || 0)}
                      style={{ flex: 1, cursor: enablePivotTightness ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '42px', textAlign: 'right' }}>
                      &le;{maxPivotClusteringFilter.toFixed(1)}%
                    </span>
                  </div>

                  {/* Metric 3: Volume Dry-Up (VDU) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="Volume Dry-Up: Day Volume / 50-DMA Volume">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '95px' }}>Vol Dry-Up:</span>
                    <input
                      type="range"
                      min="0.10"
                      max="1.50"
                      step="0.05"
                      value={maxPivotVolRatioFilter}
                      disabled={!enablePivotTightness}
                      onChange={(e) => setMaxPivotVolRatioFilter(parseFloat(e.target.value) || 0)}
                      style={{ flex: 1, cursor: enablePivotTightness ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '42px', textAlign: 'right' }}>
                      &le;{maxPivotVolRatioFilter.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================== */}
              {/* 2. Power Play Sliders (Visible if selected) */}
              {/* ========================================== */}
              {enablePowerPlay && (
                <>
                  {/* Min Power Play Run-up */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpRunup ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enablePpRunup}
                        onChange={(e) => setEnablePpRunup(e.target.checked)}
                        style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                      />
                      Min 8w Run-up ({minPpRunupFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="5"
                        value={minPpRunupFilter}
                        disabled={!enablePpRunup}
                        onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enablePpRunup ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                      />
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={minPpRunupFilter}
                        disabled={!enablePpRunup}
                        onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Max Power Play Drawdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpDrawdown ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enablePpDrawdown}
                        onChange={(e) => setEnablePpDrawdown(e.target.checked)}
                        style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                      />
                      Max Drawdown ({maxPpDrawdownFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="10"
                        max="40"
                        step="1"
                        value={maxPpDrawdownFilter}
                        disabled={!enablePpDrawdown}
                        onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enablePpDrawdown ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                      />
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={maxPpDrawdownFilter}
                        disabled={!enablePpDrawdown}
                        onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Min Days Since Peak (Consolidation Age) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpDaysSincePeak ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enablePpDaysSincePeak}
                        onChange={(e) => setEnablePpDaysSincePeak(e.target.checked)}
                        style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                      />
                      Min Days Since Peak ({minPpDaysSincePeakFilter}d):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="1"
                        max="40"
                        step="1"
                        value={minPpDaysSincePeakFilter}
                        disabled={!enablePpDaysSincePeak}
                        onChange={(e) => setMinPpDaysSincePeakFilter(parseInt(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enablePpDaysSincePeak ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={minPpDaysSincePeakFilter}
                        disabled={!enablePpDaysSincePeak}
                        onChange={(e) => setMinPpDaysSincePeakFilter(parseInt(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Max Volume Contraction */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpVolRatio ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enablePpVolRatio}
                        onChange={(e) => setEnablePpVolRatio(e.target.checked)}
                        style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                      />
                      Max Base Vol ({maxPpVolRatioFilter.toFixed(2)}x):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="0.2"
                        max="1.5"
                        step="0.05"
                        value={maxPpVolRatioFilter}
                        disabled={!enablePpVolRatio}
                        onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enablePpVolRatio ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                      />
                      <input
                        type="number"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={maxPpVolRatioFilter}
                        disabled={!enablePpVolRatio}
                        onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ========================================== */}
              {/* 3. Breakout Sliders (Visible if selected)  */}
              {/* ========================================== */}
              {enableQullamaggieBreakout && (
                <>
                  {/* Min 1-Month Return */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enable1mRet ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enable1mRet}
                        onChange={(e) => setEnable1mRet(e.target.checked)}
                        style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                      />
                      Min 1-Month Return ({min1mRetFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={min1mRetFilter}
                        disabled={!enable1mRet}
                        onChange={(e) => setMin1mRetFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enable1mRet ? 'pointer' : 'not-allowed', accentColor: '#f59e0b' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={min1mRetFilter}
                        disabled={!enable1mRet}
                        onChange={(e) => setMin1mRetFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* EMA Surfing Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableEmaSurfing ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableEmaSurfing}
                        onChange={(e) => setEnableEmaSurfing(e.target.checked)}
                        style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                      />
                      EMA 10 / 20 Surfing Rule
                    </label>
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: enableEmaSurfing ? '#f59e0b' : 'var(--text-secondary)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '38px',
                      boxSizing: 'border-box'
                    }}>
                      {enableEmaSurfing ? '🌊 Surfing 10/20 EMA Active' : '⚪ EMA Rule Waived'}
                    </div>
                  </div>
                </>
              )}

              {/* ========================================== */}
              {/* 4. Episodic Pivot Sliders (Visible if selected) */}
              {/* ========================================== */}
              {enableEpisodicPivot && (
                <>
                  {/* Min Gap % */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableEpGap ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableEpGap}
                        onChange={(e) => setEnableEpGap(e.target.checked)}
                        style={{ accentColor: '#ec4899', cursor: 'pointer' }}
                      />
                      Min Gap Up ({minEpGapFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="4"
                        max="30"
                        step="1"
                        value={minEpGapFilter}
                        disabled={!enableEpGap}
                        onChange={(e) => setMinEpGapFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableEpGap ? 'pointer' : 'not-allowed', accentColor: '#ec4899' }}
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={minEpGapFilter}
                        disabled={!enableEpGap}
                        onChange={(e) => setMinEpGapFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Min 50d Relative Volume */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableEpRelVol ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableEpRelVol}
                        onChange={(e) => setEnableEpRelVol(e.target.checked)}
                        style={{ accentColor: '#ec4899', cursor: 'pointer' }}
                      />
                      Min Relative Volume ({minEpRelVolFilter.toFixed(1)}x):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="1.0"
                        max="10.0"
                        step="0.5"
                        value={minEpRelVolFilter}
                        disabled={!enableEpRelVol}
                        onChange={(e) => setMinEpRelVolFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableEpRelVol ? 'pointer' : 'not-allowed', accentColor: '#ec4899' }}
                      />
                      <input
                        type="number"
                        min="0.5"
                        max="20.0"
                        step="0.5"
                        value={minEpRelVolFilter}
                        disabled={!enableEpRelVol}
                        onChange={(e) => setMinEpRelVolFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ========================================== */}
              {/* 5. Parabolic Climax Sliders (Visible if selected) */}
              {/* ========================================== */}
              {isParabolicActive && (
                <>
                  {/* Min Parabolic Run-up % */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableParabolicRunup ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableParabolicRunup}
                        onChange={(e) => setEnableParabolicRunup(e.target.checked)}
                        style={{ accentColor: '#ef4444', cursor: 'pointer' }}
                      />
                      Min Parabolic Runup ({minParabolicRunupFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="20"
                        max="150"
                        step="5"
                        value={minParabolicRunupFilter}
                        disabled={!enableParabolicRunup}
                        onChange={(e) => setMinParabolicRunupFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableParabolicRunup ? 'pointer' : 'not-allowed', accentColor: '#ef4444' }}
                      />
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={minParabolicRunupFilter}
                        disabled={!enableParabolicRunup}
                        onChange={(e) => setMinParabolicRunupFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Min 10 EMA Distance % */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableParabolicEmaDist ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableParabolicEmaDist}
                        onChange={(e) => setEnableParabolicEmaDist(e.target.checked)}
                        style={{ accentColor: '#ef4444', cursor: 'pointer' }}
                      />
                      Min 10 EMA Dist ({minParabolicEmaDistFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="1"
                        value={minParabolicEmaDistFilter}
                        disabled={!enableParabolicEmaDist}
                        onChange={(e) => setMinParabolicEmaDistFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableParabolicEmaDist ? 'pointer' : 'not-allowed', accentColor: '#ef4444' }}
                      />
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={minParabolicEmaDistFilter}
                        disabled={!enableParabolicEmaDist}
                        onChange={(e) => setMinParabolicEmaDistFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* Min Parabolic Up Days */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableParabolicUpDays ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableParabolicUpDays}
                        onChange={(e) => setEnableParabolicUpDays(e.target.checked)}
                        style={{ accentColor: '#ef4444', cursor: 'pointer' }}
                      />
                      Min Consecutive Up Days (&ge; {minParabolicUpDaysFilter}d):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={minParabolicUpDaysFilter}
                        disabled={!enableParabolicUpDays}
                        onChange={(e) => setMinParabolicUpDaysFilter(parseInt(e.target.value, 10) || 1)}
                        style={{ flex: 1, cursor: enableParabolicUpDays ? 'pointer' : 'not-allowed', accentColor: '#ef4444' }}
                      />
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={minParabolicUpDaysFilter}
                        disabled={!enableParabolicUpDays}
                        onChange={(e) => setMinParabolicUpDaysFilter(parseInt(e.target.value, 10) || 1)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ========================================== */}
              {/* 6. VCP Setup Sliders (Visible if selected) */}
              {/* ========================================== */}
              {enableVcpSetup && (
                <>
                  {/* VCP Contraction Pattern Rule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpPattern ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableVcpPattern}
                        onChange={(e) => setEnableVcpPattern(e.target.checked)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      VCP Contraction Pattern
                    </label>
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: enableVcpPattern ? '#10b981' : 'var(--text-secondary)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '38px',
                      boxSizing: 'border-box'
                    }}>
                      {enableVcpPattern ? '🌀 2-4 Troughs (Final ≤12%)' : '⚪ Pattern Rule Waived'}
                    </div>
                  </div>

                  {/* Min QoQ EPS Growth */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpEpsGrowth ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableVcpEpsGrowth}
                        onChange={(e) => setEnableVcpEpsGrowth(e.target.checked)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      Min QoQ EPS Growth ({minEpsGrowthFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={minEpsGrowthFilter}
                        disabled={!enableVcpEpsGrowth}
                        onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableVcpEpsGrowth ? 'pointer' : 'not-allowed', accentColor: '#10b981' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={minEpsGrowthFilter}
                        disabled={!enableVcpEpsGrowth}
                        onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Candidates View Mode Switcher: Browse Mode vs Datatable */}
      {viewMode === 'browse' ? (
        filteredCandidates.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
            {loadingCandidates ? 'Loading candidates...' : 'No candidate stocks match your current active filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px', marginTop: '20px', alignItems: 'flex-start' }}>
            {/* Main Browse Column (Left) */}
            <div ref={leftColRef} style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Bar for Selected Stock */}
              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Top Row: Symbol + Company Name (Left) & Stock Position Count (Far Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
                      {currentCandidate?.symbol}
                    </h2>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                        {currentCandidate?.name || currentCandidate?.symbol || ''}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {currentCandidate?.exchange || ''} • {currentCandidate?.sector || 'Sector'} ({currentCandidate?.industry || 'Industry'})
                      </div>
                    </div>
                  </div>

                  {/* Stock Position Count on Far Top Right */}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                    Stock {browseIndex + 1} of {filteredCandidates.length}
                  </span>
                </div>

                {/* Bottom Row: Badges & Watchlist Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="pill pill-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    RS Rank: {currentCandidate?.rs_rank ?? 'N/A'}
                  </span>

                  {currentCandidate?.atr_20d !== null && currentCandidate?.atr_20d !== undefined && (
                    <span className="pill" style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                      ADTR: {currentCandidate.atr_20d.toFixed(2)}% {currentCandidate.close ? `($${(currentCandidate.close * (currentCandidate.atr_20d / 100)).toFixed(2)})` : ''}
                    </span>
                  )}

                  {currentCandidate?.pivot_spread_pct !== null && currentCandidate?.pivot_spread_pct !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        background: 'rgba(16, 185, 129, 0.18)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontWeight: 600
                      }}
                      title="Max Price Spread (3d), Close Clustering (3d), and Volume Dry-Up ratio"
                    >
                      🎯 Spread: {currentCandidate.pivot_spread_pct.toFixed(1)}% | Clust: {currentCandidate.pivot_close_clustering_pct !== null && currentCandidate.pivot_close_clustering_pct !== undefined ? `${currentCandidate.pivot_close_clustering_pct.toFixed(1)}%` : 'N/A'} {currentCandidate.volume && currentCandidate.vol_50d_ma ? `| VDU: ${(currentCandidate.volume / currentCandidate.vol_50d_ma).toFixed(2)}x` : ''}
                    </span>
                  )}

                  {/* As of Date Badge */}
                  {(currentCandidate?.screen_date || (selectedDate && selectedDate !== 'latest')) && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        background: 'rgba(56, 189, 248, 0.18)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      📅 As of: {currentCandidate?.screen_date || selectedDate}
                    </span>
                  )}

                  {/* Add to Watchlist Quick Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={targetWatchlistId || ''}
                      onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {watchlists.map((w) => (
                        <option key={w.id} value={w.id}>
                          ⭐️ {w.name}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const isCurrentSaved = currentCandidate && activeWatchlistSymbols.has(currentCandidate.symbol.toUpperCase());
                      return (
                        <button
                          className={`btn ${isCurrentSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                          onClick={() => handleToggleWatchlist(currentCandidate?.symbol)}
                          disabled={!currentCandidate}
                          style={{
                            padding: '6px 14px',
                            transition: 'all 0.2s ease',
                            background: isCurrentSaved ? 'rgba(16, 185, 129, 0.2)' : undefined,
                            color: isCurrentSaved ? '#34d399' : undefined,
                            border: isCurrentSaved ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
                            fontWeight: 600
                          }}
                        >
                          {isCurrentSaved ? '★ Saved in Watchlist' : '+ Save to Watchlist'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Candlestick Chart Container */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <CandlestickChart
                  data={browsePrices}
                  asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
                  height={480}
                />
              </div>
            </div>

            {/* Candidate List Ribbon (Right Column) */}
            <div
              className="glass-card"
              style={{
                flex: '0 0 280px',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                height: leftColHeight ? `${leftColHeight}px` : '650px',
                boxSizing: 'border-box'
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '8px', flexShrink: 0 }}>
                Filtered Candidates ({filteredCandidates.length})
              </h4>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minHeight: 0
                }}
              >
                {filteredCandidates.map((c, idx) => {
                  const isSelected = idx === browseIndex;
                  const isItemSaved = activeWatchlistSymbols.has(c.symbol.toUpperCase());
                  return (
                    <div
                      key={c.symbol}
                      ref={isSelected ? selectedItemRef : null}
                      onClick={() => setBrowseIndex(idx)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition-smooth)',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: idx === browseIndex ? '#34d399' : '#ffffff' }}>
                          {c.symbol}
                        </span>
                        {isItemSaved && <span style={{ fontSize: '11px' }} title="Saved in active watchlist">⭐️</span>}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          ${c.close?.toFixed(2)}
                        </span>
                      </div>
                      <span className="pill pill-success" style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 600 }}>
                        RS {c.rs_rank}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Candidates Table View (Classic) */}
          {selectedDate && selectedDate !== 'latest' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(30, 41, 59, 0.85) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              padding: '12px 18px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🔬</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8' }}>
                    Point-in-Time Backtest Mode: <span style={{ color: '#ffffff', background: 'rgba(56, 189, 248, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{selectedDate}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Screening candidates as of <strong>{selectedDate}</strong>. Entry price is Next Day Open ($T+1$). Post-screening outcomes (+5D and +20D returns & runups) are calculated below.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDate('latest')}
                style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', padding: '6px 12px' }}
              >
                Reset to Latest Date 🔄
              </button>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Sector / Industry</th>
                  <th>Price</th>
                  <th>1M Ret %</th>
                  <th>Vol 50d MA</th>
                  <th>RelVol</th>
                  <th>RS Score</th>
                  <th>RS Percentile</th>
                  <th>ADTR (20d)</th>
                  <th>EPS QoQ Growth</th>
                  <th>Report Qtr</th>
                  {enablePowerPlay && (
                    <>
                      <th>Run Up %</th>
                      <th>Drawdown %</th>
                      <th>Vol vs SMA</th>
                    </>
                  )}
                  {enableIpoBase && (
                    <>
                      <th>IPO Age</th>
                      <th>Dist from High</th>
                      <th>Base Depth</th>
                    </>
                  )}
                  {enableNewLeaders && (
                    <>
                      <th>52w High Dist</th>
                      <th>Surge off Low</th>
                      <th>52w High Status</th>
                    </>
                  )}
                  {(enablePivotTightness || enableVcpSetup) && (
                    <>
                      <th title="3-Day High-Low price spread / Close price (Max Price Spread)">3D Spread %</th>
                      <th title="3-Day Close Clustering: (Highest Close - Lowest Close) / Close">Close Clust %</th>
                      <th title="Volume Dry-Up ratio: Day Volume / 50-DMA Volume">VDU Ratio</th>
                    </>
                  )}
                  <th>Setups & Patterns</th>
                  {(selectedDate !== 'latest' || filteredCandidates.some(c => c.entry_price !== null && c.entry_price !== undefined)) && (
                    <>
                      <th style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderBottom: '2px solid #38bdf8' }}>Entry (Open T+1)</th>
                      <th style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderBottom: '2px solid #38bdf8' }}>+5D Return %</th>
                      <th style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderBottom: '2px solid #38bdf8' }}>5D Peak / Drawdown</th>
                      <th style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderBottom: '2px solid #38bdf8' }}>+20D Return %</th>
                      <th style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderBottom: '2px solid #38bdf8' }}>20D Peak / Drawdown</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c, i) => (
                  <tr key={i} onClick={() => handleSelectStock(c, filteredCandidates)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{c.symbol}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.sector ? `${c.sector}${c.sector_rank ? ` (${c.sector_rank})` : ''}` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>{c.industry || 'N/A'}</span>
                    </td>
                    <td>${c.close.toFixed(2)}</td>
                    <td style={{ color: c.ret_1m !== null && c.ret_1m !== undefined ? (c.ret_1m >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)', fontWeight: '600' }}>
                      {c.ret_1m !== null && c.ret_1m !== undefined ? `${c.ret_1m >= 0 ? '+' : ''}${c.ret_1m.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td>{c.vol_50d_ma.toLocaleString()}</td>
                    <td style={{ color: c.rel_vol_50d >= 2.5 ? 'var(--accent-success)' : 'var(--text-primary)', fontWeight: c.rel_vol_50d >= 2.5 ? 'bold' : 'normal' }}>
                      {c.rel_vol_50d !== null && c.rel_vol_50d !== undefined ? `${c.rel_vol_50d.toFixed(1)}x` : '1.0x'}
                    </td>
                    <td>{c.rs_score ? c.rs_score.toFixed(4) : 'N/A'}</td>
                    <td>
                      <span className="pill pill-success">{c.rs_rank}</span>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      {c.atr_20d !== null && c.atr_20d !== undefined ? `${c.atr_20d.toFixed(2)}%` : 'N/A'}
                    </td>
                    <td style={{ color: c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined ? (c.eps_qoq_growth >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)' }}>
                      {c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined ? `${c.eps_qoq_growth >= 0 ? '+' : ''}${c.eps_qoq_growth.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td>
                      {c.fiscal_quarter ? (
                        <span className="pill pill-primary">{c.fiscal_quarter}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                      )}
                    </td>
                    {enablePowerPlay && (
                      <>
                        <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                          +{c.pp_runup_pct !== null && c.pp_runup_pct !== undefined ? c.pp_runup_pct.toFixed(0) : '0'}%
                        </td>
                        <td style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>
                          -{c.pp_drawdown_pct !== null && c.pp_drawdown_pct !== undefined ? c.pp_drawdown_pct.toFixed(1) : '0'}%
                        </td>
                        <td style={{ color: c.volume / c.vol_50d_ma < 0.6 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                          {c.volume && c.vol_50d_ma ? `${(c.volume / c.vol_50d_ma).toFixed(2)}x` : 'N/A'}
                        </td>
                      </>
                    )}
                    {enableIpoBase && (
                      <>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {c.ipo_days_count} days
                        </td>
                        <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                          {c.ipo_drawdown_from_high !== null && c.ipo_drawdown_from_high !== undefined ? `${c.ipo_drawdown_from_high.toFixed(1)}%` : '0%'}
                        </td>
                        <td style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>
                          -{c.ipo_base_depth !== null && c.ipo_base_depth !== undefined ? `${c.ipo_base_depth.toFixed(1)}%` : '0%'}
                        </td>
                      </>
                    )}
                    {enableNewLeaders && (
                      <>
                        <td style={{ color: c.dist_from_52w_high !== null && c.dist_from_52w_high <= 15 ? 'var(--accent-success)' : 'var(--text-primary)', fontWeight: '600' }}>
                          {c.dist_from_52w_high !== null && c.dist_from_52w_high !== undefined ? `${c.dist_from_52w_high.toFixed(1)}%` : '0%'}
                        </td>
                        <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                          +{c.surge_off_low_pct !== null && c.surge_off_low_pct !== undefined ? `${c.surge_off_low_pct.toFixed(1)}%` : '0%'}
                        </td>
                        <td>
                          {c.is_52w_high ? (
                            <span className="pill pill-success" style={{ fontWeight: 'bold' }}>🔥 52w High</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Near High</span>
                          )}
                        </td>
                      </>
                    )}
                    {(enablePivotTightness || enableVcpSetup) && (
                      <>
                        <td style={{ fontWeight: '600', color: c.pivot_spread_pct !== null && c.pivot_spread_pct <= maxPivotSpreadFilter ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                          {c.pivot_spread_pct !== null && c.pivot_spread_pct !== undefined ? `${c.pivot_spread_pct.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td style={{ fontWeight: '600', color: c.pivot_close_clustering_pct !== null && c.pivot_close_clustering_pct <= maxPivotClusteringFilter ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                          {c.pivot_close_clustering_pct !== null && c.pivot_close_clustering_pct !== undefined ? `${c.pivot_close_clustering_pct.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td style={{ color: (c.volume && c.vol_50d_ma && (c.volume / c.vol_50d_ma) <= maxPivotVolRatioFilter) ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                          {c.volume && c.vol_50d_ma ? `${(c.volume / c.vol_50d_ma).toFixed(2)}x` : 'N/A'}
                        </td>
                      </>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {c.ep_is_setup && (
                          <span className="pill" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.4)', fontWeight: 'bold' }}>
                            ⚡ EP (+{c.ep_gap_pct?.toFixed(1)}%, {c.ep_rel_vol?.toFixed(1)}x)
                          </span>
                        )}
                        {c.parabolic_short_is_setup && (
                          <span className="pill" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 'bold' }}>
                            📉 Para Climax (Short +{c.parabolic_runup_pct?.toFixed(0)}%{c.parabolic_up_days ? `, ${c.parabolic_up_days}d up` : ''})
                          </span>
                        )}
                        {c.parabolic_long_is_setup && (
                          <span className="pill" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)', fontWeight: 'bold' }}>
                            📈 Para Climax (Long {c.parabolic_runup_pct?.toFixed(0)}%, {c.dist_ema10_pct?.toFixed(0)}% EMA)
                          </span>
                        )}
                        {c.vcp_is_setup && (
                          <span className="pill pill-success" style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                            🌀 VCP {c.vcp_troughs}T ({c.vcp_depths?.replace(/,/g, ' / ') + '%'})
                          </span>
                        )}
                        {c.darvas_is_setup && (
                          <span className="pill pill-success" style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                            📦 Box (${c.darvas_box_bottom?.toFixed(2)}-${c.darvas_box_top?.toFixed(2)})
                          </span>
                        )}
                        {!c.ep_is_setup && !c.parabolic_short_is_setup && !c.parabolic_long_is_setup && !c.vcp_is_setup && !c.darvas_is_setup && (
                          <span style={{ color: 'var(--text-secondary)' }}>Stage 2 Base</span>
                        )}
                      </div>
                    </td>
                    {(selectedDate !== 'latest' || filteredCandidates.some(c => c.entry_price !== null && c.entry_price !== undefined)) && (
                      <>
                        <td style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
                          {c.entry_price !== null && c.entry_price !== undefined ? (
                            <div>
                              <span style={{ fontWeight: '700', color: '#e2e8f0' }}>${c.entry_price.toFixed(2)}</span>
                              <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-secondary)' }}>{c.entry_date}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Pending T+1</span>
                          )}
                        </td>

                        <td style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
                          {c.return_5d !== null && c.return_5d !== undefined ? (
                            <span className={`pill ${c.return_5d >= 0 ? 'pill-success' : 'pill-danger'}`} style={{ fontWeight: 'bold' }}>
                              {c.return_5d >= 0 ? '+' : ''}{c.return_5d.toFixed(1)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>N/A</span>
                          )}
                        </td>

                        <td style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
                          {c.max_runup_5d !== null && c.max_runup_5d !== undefined ? (
                            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>▲ +{c.max_runup_5d.toFixed(1)}%</span>
                              <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>▼ {c.max_drawdown_5d.toFixed(1)}%</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>N/A</span>
                          )}
                        </td>

                        <td style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
                          {c.return_20d !== null && c.return_20d !== undefined ? (
                            <span className={`pill ${c.return_20d >= 0 ? 'pill-success' : 'pill-danger'}`} style={{ fontWeight: 'bold' }}>
                              {c.return_20d >= 0 ? '+' : ''}{c.return_20d.toFixed(1)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>N/A</span>
                          )}
                        </td>

                        <td style={{ background: 'rgba(56, 189, 248, 0.03)' }}>
                          {c.max_runup_20d !== null && c.max_runup_20d !== undefined ? (
                            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>▲ +{c.max_runup_20d.toFixed(1)}%</span>
                              <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>▼ {c.max_drawdown_20d.toFixed(1)}%</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>N/A</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={12 + (enablePowerPlay ? 3 : 0) + (enableIpoBase ? 3 : 0) + (enableNewLeaders ? 3 : 0) + ((enablePivotTightness || enableVcpSetup) ? 3 : 0) + ((selectedDate !== 'latest' || filteredCandidates.some(c => c.entry_price !== null && c.entry_price !== undefined)) ? 5 : 0)} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No candidates matching current config rules found in database cache. Run "Sync Database Tickers" to evaluate stocks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
