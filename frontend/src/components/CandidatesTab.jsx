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
  setSelectedDate = () => {},
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
  enableVcpRsPercentile,
  setEnableVcpRsPercentile,
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
  const [showSetupGuideModal, setShowSetupGuideModal] = React.useState(false);
  const [activeGuideTab, setActiveGuideTab] = React.useState('qullamaggie_breakout');

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
                setEnablePowerPlay(true);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
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
                setEnableQullamaggieBreakout(true);
                setEnablePowerPlay(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
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
                setEnableEpisodicPivot(true);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
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
                if (setEnableParabolicClimax) setEnableParabolicClimax(true);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
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
                setEnableVcpSetup(true);
                setEnforceStage2(true);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                setEnableParabolicShort(false);
                setEnableIpoBase(false);
                setEnableDarvasBox(false);
                setEnableNewLeaders(false);
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
              ⚙️ {showFiltersSection ? 'Hide Rules ▲' : 'Rules & Sliders ▼'}
            </button>
          </div>
        </div>

        {/* Collapsible Section for Rules & Sliders */}
        {showFiltersSection && (
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            {/* Currently Selected Setup Criteria Text Section */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 Currently Selected Setup Criteria
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => {
                      if (enableVcpSetup) setActiveGuideTab('vcp');
                      else if (enableQullamaggieBreakout) setActiveGuideTab('qullamaggie_breakout');
                      else if (enableEpisodicPivot) setActiveGuideTab('episodic_pivot');
                      else if (isParabolicActive) setActiveGuideTab('parabolic_climax');
                      else if (enablePowerPlay) setActiveGuideTab('power_play');
                      else setActiveGuideTab('stage2');
                      setShowSetupGuideModal(true);
                    }}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 12px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#f59e0b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    📖 Setup Guide & Rules
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {enablePowerPlay ? '🚀 Power Play' : enableQullamaggieBreakout ? '🎯 Breakout' : enableEpisodicPivot ? '⚡ Episodic Pivot (EP)' : isParabolicActive ? '🌋 Parabolic Climax' : enableVcpSetup ? '🌀 VCP Pattern' : enforceStage2 ? '📈 Stage 2 Trend Baseline' : '🌐 Baseline'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {loadingCandidates && <span className="spin-icon">⟳</span>}
                    {`Showing ${filteredCandidates.length.toLocaleString()} matching stocks`}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                {enablePowerPlay && 'Screening for high-velocity momentum stocks undergoing shallow high-level consolidations after a massive price expansion.'}
                {enableQullamaggieBreakout && 'Screening for Kristjan Qullamaggie\'s classic Momentum Breakout—top 1-month & 3-month performance leaders consolidating tightly while surfing the rising 10/20 EMA.'}
                {enableEpisodicPivot && 'Screening for Kristjan Qullamaggie\'s Episodic Pivots (EP)—game-changing fundamental gap-ups (>=10%) on massive relative volume (>=2.5x) breaking out of long bases.'}
                {isParabolicActive && 'Screening for Kristjan Qullamaggie\'s Parabolic Climax setups—both short-side overextended tops (+40%+ runup, >=18% above 10 EMA) and long-side oversold bottoms (<= -30% drop, <= -18% below 10 EMA) merged together.'}
                {enableVcpSetup && 'Screening for Mark Minervini\'s Volatility Contraction Pattern (VCP)—successive price contractions with tightening depth before explosive breakouts.'}
                {!enablePowerPlay && !enableQullamaggieBreakout && !enableEpisodicPivot && !isParabolicActive && !enableVcpSetup && (enforceStage2 ? 'Screening for classic Minervini Stage 2 uptrend stocks in confirmed institutional mark-up phases.' : 'Screening all universe stocks meeting basic price and volume baseline criteria.')}
              </p>

              {enablePowerPlay ? (
                <ol style={{ margin: '4px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  <li>
                    <strong>Explosive Price Move:</strong> An explosive price move commences on huge volume that shoots the stock price up 100 percent or more in less than eight weeks. <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>(Active Filter: &ge; {minPpRunupFilter}% run-up{enablePpRunup ? '' : ' - Disabled'})</span>
                  </li>
                  <li>
                    <strong>Tight Consolidation:</strong> The stock price then moves sideways in a relatively tight range (&le;25% depth, &ge;10 trading days). <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>(Active Filter: &le; {maxPpDrawdownFilter}% drawdown, peak &ge; {minPpDaysSincePeakFilter} trading days prior{enablePpDrawdown && enablePpDaysSincePeak ? '' : ' - Partially Disabled'})</span>
                  </li>
                  <li>
                    <strong>Volume Contraction:</strong> Base volume contracts considerably before breakout. <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{enablePpVolRatio ? `(Active Filter: \u2264 ${maxPpVolRatioFilter.toFixed(2)}x 50d Vol MA)` : '(Filter Disabled)'}</span>
                  </li>
                </ol>
              ) : enableQullamaggieBreakout ? (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <li><strong>1-Month Momentum Leader:</strong> 1-month gain &ge; {min1mRetFilter}% {enable1mRet ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>EMA Surfing:</strong> Price holding above/near 10-day & 20-day EMAs {enableEmaSurfing ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Stage 2 Trend:</strong> {enforceStage2 ? 'Enforced (Close > SMA50 > SMA150 > SMA200)' : 'Optional (Waived)'}</li>
                </ul>
              ) : enableEpisodicPivot ? (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <li><strong>Fundamental Gap-Up:</strong> Opening gap &ge; {minEpGapFilter}% {enableEpGap ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Relative Volume:</strong> 50d Relative Volume &ge; {minEpRelVolFilter}x {enableEpRelVol ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Stage 2 Trend:</strong> {enforceStage2 ? 'Enforced (Close > SMA50 > SMA150 > SMA200)' : 'Optional (Waived)'}</li>
                </ul>
              ) : isParabolicActive ? (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <li><strong>Short Climax (Overextended Top):</strong> Rapid run-up &ge; {minParabolicRunupFilter}% over 3-10 days {enableParabolicRunup ? '(Active)' : '(Disabled)'}, &ge;{minParabolicUpDaysFilter} up days {enableParabolicUpDays ? '(Active)' : '(Disabled)'}, 10 EMA dist &ge; {minParabolicEmaDistFilter}% {enableParabolicEmaDist ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Long Climax (Oversold Bottom):</strong> Rapid drop &le; -30% over 3-10 days, 10 EMA dist &le; -18%</li>
                  <li><strong>Merged Table:</strong> Result table contains both short-side breakdown candidates & long-side oversold bounce candidates.</li>
                  <li><strong>Stage 2 Trend:</strong> {enforceStage2 ? 'Enforced (Close > SMA50 > SMA150 > SMA200)' : 'Optional (Waived)'}</li>
                </ul>
              ) : enableVcpSetup ? (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <li><strong>Stage 2 Trend Template:</strong> Required (Close &gt; SMA50 &gt; SMA150 &gt; SMA200)</li>
                  <li><strong>VCP Contraction Pattern:</strong> Successive price contractions (2–4 troughs) with final tight contraction &le;12% depth {enableVcpPattern ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Min RS Percentile:</strong> RS Rank &ge; {minRsFilter} percentile {enableVcpRsPercentile ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>QoQ EPS Growth:</strong> Quarterly EPS growth &ge; {minEpsGrowthFilter}% {enableVcpEpsGrowth ? '(Active)' : '(Disabled)'}</li>
                </ul>
              ) : (
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <li><strong>Moving Average Alignment:</strong> Close &gt; SMA(50) &gt; SMA(150) &gt; SMA(200) {enforceStage2 ? '(Enforced)' : '(Disabled / Optional)'}</li>
                  <li><strong>Liquidity Baseline:</strong> Min stock price &ge; ${minPriceFilter.toFixed(2)} and 50d Volume MA &ge; {minVolFilter.toLocaleString()}</li>
                  <li><strong>Relative Strength:</strong> {enableRs ? `RS Rank ≥ ${minRsFilter}` : enableRsNewHigh ? 'Must be making a 52-week RS Rank High' : 'RS Rank calculated dynamically'}</li>
                  {enableAtr && <li><strong>Daily ATR:</strong> &ge; {minAtrFilter.toFixed(1)}%</li>}
                </ul>
              )}
            </div>

            {/* Active Strategy Rules Description Box */}
            <div style={{
              padding: '16px',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(148, 163, 184, 0.2)',
              borderRadius: '8px'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Screening Filters
              </h4>
              <div style={{ display: 'flex', gap: '12px 24px', flexWrap: 'wrap', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent-color)' }}>📈</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Price:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>&ge; ${minPriceFilter.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent-color)' }}>📊</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Vol SMA (50d):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>&ge; {minVolFilter.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: enforceStage2 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>⚡</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Trend Template:</span>
                  <strong style={{ color: enforceStage2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {enforceStage2 ? 'SMA(50) > SMA(150) > SMA(200)' : 'Optional (Disabled)'}
                  </strong>
                </div>
                {enableRs && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-color)' }}>🏆</span>
                    <span style={{ color: 'var(--text-secondary)' }}>RS Rank:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&ge; {minRsFilter}</strong>
                  </div>
                )}
                {enableAtr && (
                  <span className="pill pill-secondary" style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Daily ADTR:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&ge; {minAtrFilter.toFixed(1)}%</strong>
                  </span>
                )}
                {enableRsNewHigh && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>📈</span>
                    <span style={{ color: 'var(--text-secondary)' }}>RS Rank:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>New High</strong>
                  </div>
                )}
                {enablePowerPlay && (
                  <>
                    {enablePpRunup && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#38bdf8' }}>🚀</span>
                        <span style={{ color: 'var(--text-secondary)' }}>8w Run-up:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minPpRunupFilter}%</strong>
                      </div>
                    )}
                    {enablePpDrawdown && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--accent-danger)' }}>📉</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Max Drawdown:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&le; {maxPpDrawdownFilter}%</strong>
                      </div>
                    )}
                  </>
                )}
                {enableQullamaggieBreakout && (
                  <>
                    {enable1mRet && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#f59e0b' }}>🎯</span>
                        <span style={{ color: 'var(--text-secondary)' }}>1m Gain:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {min1mRetFilter}%</strong>
                      </div>
                    )}
                    {enableEmaSurfing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#f59e0b' }}>🌊</span>
                        <span style={{ color: 'var(--text-secondary)' }}>EMA Surfing:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>10/20 EMA</strong>
                      </div>
                    )}
                  </>
                )}
                {enableEpisodicPivot && (
                  <>
                    {enableEpGap && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ec4899' }}>⚡</span>
                        <span style={{ color: 'var(--text-secondary)' }}>EP Gap:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minEpGapFilter}%</strong>
                      </div>
                    )}
                    {enableEpRelVol && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ec4899' }}>📊</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Rel Vol:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minEpRelVolFilter}x</strong>
                      </div>
                    )}
                  </>
                )}
                {isParabolicActive && (
                  <>
                    {enableParabolicRunup && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ef4444' }}>📈</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Run-up:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minParabolicRunupFilter}%</strong>
                      </div>
                    )}
                    {enableParabolicEmaDist && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ef4444' }}>📉</span>
                        <span style={{ color: 'var(--text-secondary)' }}>10 EMA Dist:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minParabolicEmaDistFilter}%</strong>
                      </div>
                    )}
                    {enableParabolicUpDays && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ef4444' }}>🔥</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Up Days:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>&ge; {minParabolicUpDaysFilter} consecutive</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

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
                  {enforceStage2 ? '⚡ SMA(50) > SMA(150) > SMA(200)' : '⚪ Stage 2 Trend Waived'}
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

                  {/* Min RS Percentile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpRsPercentile ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableVcpRsPercentile}
                        onChange={(e) => setEnableVcpRsPercentile(e.target.checked)}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      Min RS Percentile ({minRsFilter}):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="50"
                        max="99"
                        step="1"
                        value={minRsFilter}
                        disabled={!enableVcpRsPercentile}
                        onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                        style={{ flex: 1, cursor: enableVcpRsPercentile ? 'pointer' : 'not-allowed', accentColor: '#10b981' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={minRsFilter}
                        disabled={!enableVcpRsPercentile}
                        onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
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
                  <td colSpan={12 + (enablePowerPlay ? 3 : 0) + (enableIpoBase ? 3 : 0) + (enableNewLeaders ? 3 : 0) + ((selectedDate !== 'latest' || filteredCandidates.some(c => c.entry_price !== null && c.entry_price !== undefined)) ? 5 : 0)} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No candidates matching current config rules found in database cache. Run "Sync Database Tickers" to evaluate stocks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Setup Strategy Guide Modal */}
      {showSetupGuideModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}
          onClick={() => setShowSetupGuideModal(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(30, 41, 59, 0.6)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📖 Setup Strategy Guide & Execution Rules
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Comprehensive breakdown of quantitative filters, trading rules, and original strategy rationale.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href="https://qullamaggie.com/my-3-timeless-setups-that-have-made-me-tens-of-millions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '6px 12px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#f59e0b',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🌐 Qullamaggie Original Blog Post ↗
                </a>

                <button
                  onClick={() => setShowSetupGuideModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '22px',
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Sub-Header Navigation Tabs */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '12px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.8)',
            }}>
              {[
                { id: 'power_play', label: '🚀 Power Play', color: '#38bdf8' },
                { id: 'qullamaggie_breakout', label: '🎯 Breakout', color: '#f59e0b' },
                { id: 'episodic_pivot', label: '⚡ Episodic Pivot (EP)', color: '#ec4899' },
                { id: 'parabolic_climax', label: '🌋 Parabolic Climax', color: '#ef4444' },
                { id: 'stage2', label: '📈 Stage 2 Baseline', color: '#94a3b8' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGuideTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: activeGuideTab === tab.id ? `1px solid ${tab.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: activeGuideTab === tab.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                    color: activeGuideTab === tab.id ? tab.color : 'var(--text-secondary)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Scrollable Content */}
            <div style={{
              padding: '24px',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              color: '#f8fafc',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              {/* General Qullamaggie Risk & Sizing Rules Banner */}
              {['qullamaggie_breakout', 'episodic_pivot', 'parabolic_climax', 'parabolic_short'].includes(activeGuideTab) && (
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    💡 Kristjan Qullamaggie's Position Sizing & Risk Rules
                  </h4>
                  <blockquote style={{ margin: '4px 0 0 0', paddingLeft: '12px', borderLeft: '3px solid #f59e0b', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '12px' }}>
                    "I don't believe you should ever have more than 30% of your account overnight in any stock or ETF. Most of my positions are 10-20% of account size. My risk on most trades is usually 0.25-1%. I rarely risk more than 1% of my account on any trade."
                  </blockquote>
                </div>
              )}

              {/* Tab 1: Qullamaggie Breakout */}
              {activeGuideTab === 'qullamaggie_breakout' && (
                <>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', margin: '0 0 8px 0' }}>
                      🎯 Breakouts (High-Tight Flag / Momentum Consolidation)
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <em>"If you study thousands of the biggest winning stocks over the past 100 years they tend to move in stair steps. Meaning they will make a 20-50%+ move, pull back and go sideways for a while, then make another move."</em>
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#38bdf8', marginTop: 0 }}>Step 1: Finding Leading Stocks</h4>
                    <p style={{ margin: 0 }}>
                      Scan for the top 1% or 2% of stocks that are up the most over 3 timeframes: <strong>1-Month</strong>, <strong>3-Month</strong>, and <strong>6-Month</strong>.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#38bdf8', marginTop: 0 }}>The 3 Steps to the Setup</h4>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>Big Expansion Leg:</strong> A massive move higher (+30% to +100%+) within the prior 1-3 months.</li>
                      <li><strong>Orderly Pullback:</strong> An orderly pullback/consolidation with higher lows and tightening range (2 weeks to 2 months), while "surfing" the rising 10-day and 20-day EMAs.</li>
                      <li><strong>Range Expansion:</strong> A breakout out of the tight consolidation level.</li>
                    </ol>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <h4 style={{ color: '#f59e0b', marginTop: 0 }}>Trade Execution & Rules</h4>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>Watchlist & Alerts:</strong> Prepare watchlist before open, calculate exact share count based on risk (0.25-1% of account).</li>
                      <li><strong>Entry Trigger:</strong> Enter on Opening Range Highs (1-min, 5-min, or 60-min ORH, or daily breakout).</li>
                      <li><strong>Stop Loss:</strong> Stop is ALWAYS Low of Day (LOD). Stop must NOT be wider than 1 ATR or ADR of the stock.</li>
                      <li><strong>Profit Taking & Trailing Exit:</strong> Sell 1/3 to 1/2 of position after 3-5 days. Move stop to break-even. Trail the rest with the 10-day EMA (exit on first daily CLOSE below 10 EMA).</li>
                    </ol>
                  </div>
                </>
              )}

              {/* Tab 2: Episodic Pivot */}
              {activeGuideTab === 'episodic_pivot' && (
                <>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ec4899', margin: '0 0 8px 0' }}>
                      ⚡ The Episodic Pivot (EP)
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <em>"The Episodic Pivot is triggered by unexpected positive news that creates a significant shift in market perception. When unexpected good news hits a stock—particularly one that has been previously neglected—it acts as a catalyst for substantial, prolonged price moves that can last for months or even years."</em>
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#ec4899', marginTop: 0 }}>Key Characteristics of an EP</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>The Fundamental Catalyst:</strong> Blockbuster quarterly earnings/revenue beat, massive guidance raise, FDA drug approval, or major contract win.</li>
                      <li><strong>Explosive Opening Gap:</strong> Price gaps up <strong>&ge; 8% to 15%+</strong> at market open.</li>
                      <li><strong>Volume Explosion:</strong> Day-1 volume explodes to <strong>&ge; 2.5x to 5.0x+</strong> the 50-day average volume.</li>
                      <li><strong>Multi-Month Prior Base:</strong> Emerging out of a sideways, multi-month neglected base pattern.</li>
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(236, 72, 153, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <h4 style={{ color: '#ec4899', marginTop: 0 }}>Trade Execution</h4>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>Entry:</strong> Buy at the open or on Opening Range High (ORH) of the first 1-min / 5-min candle.</li>
                      <li><strong>Stop Loss:</strong> Set stop at Low of Day (LOD) or VWAP failure.</li>
                      <li><strong>Exit:</strong> Take partial profits after 3-5 days, trail remaining position with 10-day / 20-day EMA.</li>
                    </ol>
                  </div>
                </>
              )}

              {/* Tab 3: Parabolic Climax */}
              {(activeGuideTab === 'parabolic_climax' || activeGuideTab === 'parabolic_short') && (
                <>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', margin: '0 0 8px 0' }}>
                      🌋 The Parabolic Climax Setup (Short & Long)
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <em>"The Parabolic Climax is a high-risk, high-reward strategy based on the concept that stocks stretched too far, too fast become like 'stretched rubber bands' prone to powerful snapbacks. This setup screens both overextended short setups and oversold long bounce setups."</em>
                    </p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 style={{ color: '#ef4444', marginTop: 0 }}>1. Parabolic Short (Overextended Top)</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>Vertical Acceleration:</strong> +40% to +100%+ run-up over 3–10 days without consolidation.</li>
                      <li><strong>Consecutive Up Days:</strong> Stock is up <strong>&ge; 3 to 5+ days in a row</strong> (consecutive higher closes).</li>
                      <li><strong>EMA Extension:</strong> Price extended <strong>&ge; 18% to 25%+</strong> above its rising 10-day EMA.</li>
                      <li><strong>Short Trigger:</strong> Wait for momentum exhaustion—first red day, breaking previous day low, or 5-min VWAP breakdown.</li>
                      <li><strong>Stop & Target:</strong> Stop is strictly set at High of Day (HOD). Cover target is mean-reversion to 10 EMA & 20 EMA.</li>
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <h4 style={{ color: '#22c55e', marginTop: 0 }}>2. Parabolic Long (Oversold Bounce)</h4>
                    <p style={{ margin: 0 }}>
                      After a stock collapses <strong>&le; -30% over 3–10 days</strong> and extends <strong>&le; -18% below its 10-day EMA</strong>, look for an entry on Opening Range Highs (ORH) for a fast mean-reversion bounce back to the moving averages.
                    </p>
                  </div>
                </>
              )}

              {/* Tab 4: Power Play */}
              {activeGuideTab === 'power_play' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', margin: '0 0 8px 0' }}>🚀 Power Play (High Tight Flag)</h3>
                  <p>Minervini's most explosive setup: stock shoots up 100%+ in less than 8 weeks, followed by a tight high-level consolidation (&le;25% depth) for at least 12 trading days while volume contracts heavily.</p>
                </>
              )}

              {/* Tab 5: VCP Setup */}
              {activeGuideTab === 'vcp' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', margin: '0 0 8px 0' }}>⚡ Volatility Contraction Pattern (VCP)</h3>
                  <p>Minervini's signature pattern: supply dries up through contracting swings (T1 &gt; T2 &gt; T3) near 52-week highs with final contraction &le; 10-12% and RS Rank &ge; 70.</p>
                </>
              )}

              {/* Tab 6: Darvas Box */}
              {activeGuideTab === 'darvas' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#8b5cf6', margin: '0 0 8px 0' }}>📦 Nicolas Darvas Box Setup</h3>
                  <p>Stock consolidates in a well-defined rectangular price box (unbreached 3-day top & bottom, box width &le; 25%) during a confirmed Stage 2 uptrend.</p>
                </>
              )}

              {/* Tab 7: New Leaders */}
              {activeGuideTab === 'new_leaders' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eab308', margin: '0 0 8px 0' }}>🌟 New Leaders (Market Low Turn)</h3>
                  <p>Stocks demonstrating resilience during market corrections: trading near 52-week highs (&le;25%), surging sharply off market lows (&ge;20%), and leading with top RS rank (&ge;80).</p>
                </>
              )}

              {/* Tab 8: IPO Base */}
              {activeGuideTab === 'ipo_base' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#06b6d4', margin: '0 0 8px 0' }}>📅 IPO Base Setup</h3>
                  <p>Recently listed companies (10 to 350 trading days age) building their first primary base within 25% of all-time highs.</p>
                </>
              )}

              {/* Tab 9: Stage 2 Baseline */}
              {activeGuideTab === 'stage2' && (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8', margin: '0 0 8px 0' }}>📈 Stage 2 Trend Baseline</h3>
                  <p>Minervini Trend Template: Stock Price &gt; 50d SMA &gt; 150d SMA &gt; 200d SMA with 200d SMA trending upward for at least 1 month.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
