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
  minDollarVolFilter = 5000000.0,
  setMinDollarVolFilter = () => { },
  minRsFilter,
  setMinRsFilter,
  minEpsGrowthFilter,
  setMinEpsGrowthFilter,
  enforceStage2,
  setEnforceStage2,
  enablePowerPlay,
  setEnablePowerPlay,
  enableIpoBase,
  setEnableIpoBase,
  enableVcpSetup,
  setEnableVcpSetup,
  enableNewLeaders,
  setEnableNewLeaders,
  enableQullamaggieBreakout,
  setEnableQullamaggieBreakout,
  enableQullamaggieMomentum,
  setEnableQullamaggieMomentum,
  qmSubview = 'all',
  setQmSubview = () => { },
  qmTopN = 75,
  setQmTopN = () => { },
  minAdrFilter = 4.0,
  setMinAdrFilter = () => { },
  enableAdr = false,
  setEnableAdr = () => { },
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
  enableRs,
  setEnableRs,
  enableRsNewHigh,
  setEnableRsNewHigh,
  enableTi65,
  setEnableTi65,
  minTi65Filter,
  setMinTi65Filter,
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
  _handleSelectStock,
}) {
  const isParabolicActive = enableParabolicClimax || enableParabolicShort || enableParabolicLong;

  // Stock Browse Mode (Chart Flip) states
  const [browseIndex, setBrowseIndex] = React.useState(0);
  const [browsePrices, setBrowsePrices] = React.useState([]);
  const [browseDetail, setBrowseDetail] = React.useState(null);
  const [targetWatchlistId, setTargetWatchlistId] = React.useState(null);
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showFiltersSection, setShowFiltersSection] = React.useState(false);

  const selectedItemRef = React.useRef(null);
  const leftColRef = React.useRef(null);
  const [leftColHeight, setLeftColHeight] = React.useState(null);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  const currentCandidate = filteredCandidates[browseIndex] || null;

  const browseEarningsBadge = React.useMemo(() => {
    const dt = currentCandidate?.next_earnings_date || browseDetail?.next_earnings_date || browseDetail?.metadata?.next_earnings_date;
    if (!dt) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dt + 'T00:00:00');
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let badgeSub = '';
      let isUrgent = false;

      if (diffDays === 0) {
        badgeSub = 'Today';
        isUrgent = true;
      } else if (diffDays === 1) {
        badgeSub = 'Tomorrow';
        isUrgent = true;
      } else if (diffDays > 1) {
        badgeSub = `in ${diffDays}d`;
        if (diffDays <= 7) isUrgent = true;
      } else {
        badgeSub = `${Math.abs(diffDays)}d ago`;
      }

      return {
        dateStr: dt,
        badgeSub,
        diffDays,
        isUrgent,
        displayText: `Earning ${badgeSub}`,
        fullDisplay: `${dt} (${badgeSub})`
      };
    } catch (e) {
      return { dateStr: dt, badgeSub: dt, displayText: `Earning ${dt}`, fullDisplay: dt, isUrgent: false };
    }
  }, [currentCandidate?.next_earnings_date, browseDetail?.next_earnings_date, browseDetail?.metadata?.next_earnings_date]);

  // Dynamically measure and match left column height
  React.useLayoutEffect(() => {
    if (leftColRef.current) {
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
  }, [currentCandidate?.symbol]);

  // Auto-scroll selected candidate stock into view in the Filtered Candidates list
  React.useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [browseIndex, filteredCandidates.length]);

  React.useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists]);

  const fetchBrowsePrices = async (symbol) => {
    if (!symbol) return;
    setLoadingBrowsePrices(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/api/stocks/${symbol}/prices`),
        fetch(`${API_BASE}/api/stocks/${symbol}`)
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setBrowsePrices(data);
      }
      if (dRes.ok) {
        const detail = await dRes.json();
        setBrowseDetail(detail);
      }
      // If symbol doesn't have next_earnings_date cached, trigger background financials fetch
      if (!currentCandidate?.next_earnings_date) {
        fetch(`${API_BASE}/api/stocks/${symbol}/financials`)
          .then(res => res.json())
          .then(fData => {
            if (fData?.next_earnings_date) {
              setBrowseDetail(prev => prev ? { ...prev, next_earnings_date: fData.next_earnings_date } : prev);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error("Error fetching browse prices and details:", e);
    } finally {
      setLoadingBrowsePrices(false);
    }
  };


  React.useEffect(() => {
    if (currentCandidate) {
      fetchBrowsePrices(currentCandidate.symbol);
    }
  }, [browseIndex, currentCandidate?.symbol]);

  // Keyboard Arrow Navigation Listener for Browse Mode (Up/Down or Left/Right)
  React.useEffect(() => {
    if (filteredCandidates.length === 0) return;
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
  }, [filteredCandidates.length]);

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
      {/* Interactive Strategy & Filter controls */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Top Integrated Header: Strategy Checkboxes + Right Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Strategy Selector (Left Side: Mutually Exclusive Setup Buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Momentum Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enableQullamaggieMomentum;
                setEnableQullamaggieMomentum(next);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(4.0);
                  if (setEnableAdr) setEnableAdr(true);
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
                }
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: enableQullamaggieMomentum ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                background: enableQullamaggieMomentum ? 'rgba(168, 85, 247, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: enableQullamaggieMomentum ? '#c084fc' : 'var(--text-secondary)',
                boxShadow: enableQullamaggieMomentum ? '0 2px 8px rgba(168, 85, 247, 0.25)' : 'none'
              }}
            >
              ⚡ Momentum
            </button>

            {/* Power Play Button */}
            <button
              type="button"
              onClick={() => {
                const next = !enablePowerPlay;
                setEnablePowerPlay(next);
                if (setEnableQullamaggieMomentum) setEnableQullamaggieMomentum(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(4.0);
                  if (setEnableAdr) setEnableAdr(false);
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
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
                if (setEnableQullamaggieMomentum) setEnableQullamaggieMomentum(false);
                setEnablePowerPlay(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(4.0);
                  if (setEnableAdr) setEnableAdr(true);
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
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
                if (setEnableQullamaggieMomentum) setEnableQullamaggieMomentum(false);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(4.0);
                  if (setEnableAdr) setEnableAdr(false);
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
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
              ⚡ Episodic Pivot
            </button>

            {/* Parabolic Climax Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isParabolicActive;
                if (setEnableParabolicClimax) setEnableParabolicClimax(next);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                if (setEnableQullamaggieMomentum) setEnableQullamaggieMomentum(false);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                setEnableIpoBase(false);
                setEnableVcpSetup(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(4.0);
                  if (setEnableAdr) setEnableAdr(false);
                  setEnforceStage2(false);
                  setEnableRs(false);
                  if (setEnablePivotTightness) setEnablePivotTightness(false);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
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
                if (setEnableQullamaggieMomentum) setEnableQullamaggieMomentum(false);
                setEnablePowerPlay(false);
                setEnableQullamaggieBreakout(false);
                setEnableEpisodicPivot(false);
                if (setEnableParabolicClimax) setEnableParabolicClimax(false);
                if (setEnableParabolicShort) setEnableParabolicShort(false);
                if (setEnableParabolicLong) setEnableParabolicLong(false);
                setEnableIpoBase(false);
                setEnableNewLeaders(false);
                if (next) {
                  setMinPriceFilter(5.00);
                  setMinVolFilter(100000);
                  setMinAdrFilter(2.5);
                  if (setEnableAdr) setEnableAdr(false);
                  setEnforceStage2(true);
                  setEnableRs(true);
                  setMinRsFilter(70);
                  if (setEnablePivotTightness) setEnablePivotTightness(true);
                } else {
                  if (setEnableAdr) setEnableAdr(false);
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
              <span>{loadingCandidates ? "Loading" : "Rescan"}</span>
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
              ⚙️ {showFiltersSection ? 'Filters ▲' : 'Filters ▼'}
            </button>
          </div>
        </div>

        {/* Momentum Sub-Bar (Subviews & Top N Selector) */}
        {enableQullamaggieMomentum && showFiltersSection && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '8px',
            marginTop: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔍 Momentum View:
              </span>
              {[
                { id: 'all', label: `🎯 All Combined (~${qmTopN} Each, Deduped)` },
                { id: '1m', label: `⚡ 1-Month Gainers (Top ${qmTopN})` },
                { id: '3m', label: `🚀 3-Month Gainers (Top ${qmTopN})` },
                { id: '6m', label: `🌊 6-Month Gainers (Top ${qmTopN})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQmSubview(tab.id)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '11.5px',
                    fontWeight: qmSubview === tab.id ? '700' : '500',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: qmSubview === tab.id ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: qmSubview === tab.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(15, 23, 42, 0.4)',
                    color: qmSubview === tab.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Top N limit selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>Top per scan:</span>
              {[50, 75, 100].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQmTopN(n)}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: qmTopN === n ? '700' : '500',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: qmTopN === n ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: qmTopN === n ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: qmTopN === n ? '#38bdf8' : 'var(--text-secondary)'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

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

              {/* Min Daily Dollar Volume (50d) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  💵 Min Daily Dollar Vol (${((minDollarVolFilter || 0) / 1000000).toFixed(1)}M):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="500000"
                    max="50000000"
                    step="500000"
                    value={minDollarVolFilter || 5000000}
                    onChange={(e) => setMinDollarVolFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="1000000000"
                    step="500000"
                    value={minDollarVolFilter || 0}
                    onChange={(e) => setMinDollarVolFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* ADR% (Average Daily Range 20d) (Volatility Filter) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableAdr ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableAdr}
                    onChange={(e) => setEnableAdr(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  ⚡ Min ADR% (20d) ({minAdrFilter.toFixed(1)}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.1"
                    value={minAdrFilter}
                    disabled={!enableAdr}
                    onChange={(e) => setMinAdrFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableAdr ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={minAdrFilter}
                    disabled={!enableAdr}
                    onChange={(e) => setMinAdrFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
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
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 70)}
                    style={{ flex: 1, cursor: enableRs ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={minRsFilter}
                    disabled={!enableRs}
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 70)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Stockbee Trend Intensity (TI65) Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableTi65 ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableTi65}
                    onChange={(e) => setEnableTi65(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  ⚡ Trend Intensity TI65 ({minTi65Filter ? minTi65Filter.toFixed(2) : '1.05'}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0.80"
                    max="1.50"
                    step="0.01"
                    value={minTi65Filter}
                    disabled={!enableTi65}
                    onChange={(e) => setMinTi65Filter(parseFloat(e.target.value) || 1.05)}
                    style={{ flex: 1, cursor: enableTi65 ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0.50"
                    max="2.00"
                    step="0.01"
                    value={minTi65Filter}
                    disabled={!enableTi65}
                    onChange={(e) => setMinTi65Filter(parseFloat(e.target.value) || 1.05)}
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
                      {enableVcpPattern ? '🌀 2~6 Troughs (Final ≤12%)' : '⚪ Pattern Rule Waived'}
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

      {/* Stock Browse Mode Content */}
      {filteredCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          {loadingCandidates ? 'Loading candidates...' : 'No candidate stocks match your current active filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', alignItems: 'flex-start' }}>
          {/* Main Browse Column (Left) */}
          <div ref={leftColRef} style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Bar for Selected Stock */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Top Row: Symbol + Company Name (Left) & Watchlist Quick Action (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
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

                {/* Top Right: Add to Watchlist Quick Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
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
                        title={isCurrentSaved ? 'Saved in Watchlist (Click to remove)' : `Save ${currentCandidate?.symbol || 'stock'} to Watchlist`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          padding: 0,
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          background: isCurrentSaved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          color: isCurrentSaved ? '#34d399' : 'var(--text-secondary)',
                          border: isCurrentSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: currentCandidate ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {isCurrentSaved ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Row: Badges Group (Left) & Stock Position Count (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Left: Badges Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="pill pill-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    RS: {currentCandidate?.rs_rank ?? 'N/A'}
                  </span>

                  {currentCandidate?.adr_20d !== null && currentCandidate?.adr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '12px', padding: '4px 10px', background: currentCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)', color: currentCandidate.adr_20d >= 5.0 ? '#f59e0b' : '#60a5fa', border: currentCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 700 }}>
                      ADR%: {currentCandidate.adr_20d.toFixed(2)}%
                    </span>
                  ) : currentCandidate?.atr_20d !== null && currentCandidate?.atr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                      ADTR: {currentCandidate.atr_20d.toFixed(2)}%
                    </span>
                  ) : null}

                  {currentCandidate?.ti_65 !== null && currentCandidate?.ti_65 !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        background: currentCandidate.ti_65 >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : currentCandidate.ti_65 < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                        color: currentCandidate.ti_65 >= 1.05 ? '#34d399' : currentCandidate.ti_65 < 0.95 ? '#f87171' : 'var(--text-secondary)',
                        border: currentCandidate.ti_65 >= 1.05 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 600
                      }}
                      title={`Stockbee Trend Intensity (TI65): ${currentCandidate.ti_65.toFixed(2)}${currentCandidate.ti_65 >= 1.05 ? ' (Bullish Uptrend)' : currentCandidate.ti_65 < 0.95 ? ' (Bearish Trend)' : ' (Neutral)'}`}
                    >
                      TI65: {currentCandidate.ti_65.toFixed(2)}
                    </span>
                  )}

                  {/* Next Earnings Date Badge */}
                  {browseEarningsBadge ? (
                    <span
                      className="pill"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        fontWeight: '700',
                        background: browseEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        color: browseEarningsBadge.isUrgent ? '#f87171' : '#c084fc',
                        border: `1px solid ${browseEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`
                      }}
                      title={`Next Earnings Date: ${browseEarningsBadge.dateStr}`}
                    >
                      {browseEarningsBadge.displayText}
                    </span>
                  ) : (
                    <span
                      className="pill"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        fontWeight: '500',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                      title="Next Earnings Date: Not Scheduled or Unannounced"
                    >
                      Earning: {loadingBrowsePrices ? 'Checking...' : 'Unscheduled'}
                    </span>
                  )}

                  {/* Minervini VCP Footprint Badge */}
                  {browseDetail?.vcp_footprint?.footprint_str ? (
                    <span
                      className="pill pill-primary"
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
                      title="Minervini Volatility Contraction Pattern (VCP) Footprint: Base Weeks, Contraction Depths %, and Troughs Count"
                    >
                      🌀 {browseDetail.vcp_footprint.footprint_str}
                    </span>
                  ) : currentCandidate?.vcp_depths && currentCandidate?.vcp_troughs ? (
                    <span
                      className="pill pill-primary"
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
                      title="Minervini Volatility Contraction Pattern (VCP) Footprint"
                    >
                      🌀 {currentCandidate.vcp_depths.split(',').map(d => Math.round(parseFloat(d))).join('/')} {currentCandidate.vcp_troughs}T
                    </span>
                  ) : null}
                </div>

                {/* Stock Position Count on Far Bottom Right */}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                  Stock {browseIndex + 1} of {filteredCandidates.length}
                </span>
              </div>
            </div>

            {/* Candlestick Chart Container */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <CandlestickChart
                data={browsePrices}
                asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
                height={540}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0 }}>
                Filtered Candidates ({filteredCandidates.length})
              </h4>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportTradingView}
                disabled={filteredCandidates.length === 0}
                title="Export to TradingView watchlist (.txt)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  borderRadius: '6px',
                  cursor: filteredCandidates.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: filteredCandidates.length > 0 ? 1 : 0.4,
                  flexShrink: 0
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {c.ti_65 !== null && c.ti_65 !== undefined && (
                        <span
                          className="pill"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            fontWeight: 600,
                            background: c.ti_65 >= 1.05 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: c.ti_65 >= 1.05 ? '#34d399' : 'var(--text-secondary)'
                          }}
                          title={`Trend Intensity: ${c.ti_65.toFixed(2)}`}
                        >
                          TI {c.ti_65.toFixed(2)}
                        </span>
                      )}
                      <span className="pill pill-success" style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 600 }}>
                        RS {c.rs_rank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
