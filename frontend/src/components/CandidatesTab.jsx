import React from 'react';
import CandlestickChart from './CandlestickChart';
import ExpressionCheatSheet from './ExpressionCheatSheet';

const SETUP_COLORS = {
  power_play: '#38bdf8',
  breakout: '#f59e0b',
  breakouts: '#f59e0b',
  episodic_pivot: '#ec4899',
  momentum: '#a855f7',
  parabolic: '#ef4444',
  ipo_base: '#06b6d4',
  vcp: '#10b981',
  low_cheat: '#f97316',
  cheat: '#eab308',
  cup_and_handle: '#10b981',
};

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
  setupsConfig = { setups: [], filters: {} },
  activeSetupKey = 'breakouts',
  onSelectSetup = () => { },
  activeExpression = '',
  onExpressionChange = () => { },
  onResetExpression = () => { },
  handleTriggerLiveQuotesSync = () => { },
  syncStatus = {},
  handleSelectStock = () => { },
}) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const latestDbDate = tradingDates && tradingDates.length > 0 ? tradingDates[0] : todayStr;
  const maxSelectableDate = (latestDbDate && latestDbDate > todayStr)
    ? latestDbDate
    : new Date(Date.now() + 86400000 * 7).toLocaleDateString('en-CA');

  const curDateStr = (selectedDate && selectedDate !== 'latest') ? selectedDate : latestDbDate;

  // Helper to check if a date YYYY-MM-DD falls on Saturday (6) or Sunday (0)
  const isWeekend = React.useCallback((dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    return day === 0 || day === 6;
  }, []);

  // Helper to step to previous weekday (skips Saturday and Sunday)
  const getPrevWeekday = React.useCallback((dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Mon -> Fri (sub 3), Sun -> Fri (sub 2), Sat -> Fri (sub 1), others sub 1
    const daysBack = dayOfWeek === 1 ? 3 : dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 1 : 1;
    dt.setDate(dt.getDate() - daysBack);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper to step to next weekday (skips Saturday and Sunday)
  const getNextWeekday = React.useCallback((dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Fri -> Mon (add 3), Sat -> Mon (add 2), Sun -> Mon (add 1), others add 1
    const daysForward = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : dayOfWeek === 0 ? 1 : 1;
    dt.setDate(dt.getDate() + daysForward);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const prevDate = React.useMemo(() => {
    if (!curDateStr) return null;

    // 1. Try to find the closest preceding trading date from DB that is not a weekend
    if (tradingDates && tradingDates.length > 0) {
      const prevTrading = tradingDates.find(d => d < curDateStr && !isWeekend(d));
      if (prevTrading) return prevTrading;
    }

    // 2. Fallback: previous weekday (skips Saturday and Sunday)
    return getPrevWeekday(curDateStr);
  }, [curDateStr, tradingDates, isWeekend, getPrevWeekday]);

  const nextDate = React.useMemo(() => {
    if (!curDateStr) return null;

    // 1. Try to find the closest next trading date from DB that is not a weekend
    if (tradingDates && tradingDates.length > 0) {
      const newerTrading = tradingDates.filter(d => d > curDateStr && !isWeekend(d));
      if (newerTrading.length > 0) {
        return newerTrading[newerTrading.length - 1];
      }
    }

    // 2. Fallback: next weekday (skips Saturday and Sunday)
    return getNextWeekday(curDateStr);
  }, [curDateStr, tradingDates, isWeekend, getNextWeekday]);

  const canGoPrev = Boolean(prevDate);
  const canGoNext = Boolean(nextDate && (!maxSelectableDate || nextDate <= maxSelectableDate));

  const handlePrevDay = () => {
    if (canGoPrev && prevDate) {
      setSelectedDate(prevDate);
    }
  };

  const handleNextDay = () => {
    if (canGoNext && nextDate) {
      setSelectedDate(nextDate);
    }
  };

  // Stock Browse Mode (Chart Flip) states
  const [browseIndex, setBrowseIndex] = React.useState(0);
  const [browsePrices, setBrowsePrices] = React.useState([]);
  const [browseDetail, setBrowseDetail] = React.useState(null);
  const [targetWatchlistId, setTargetWatchlistId] = React.useState(null);
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showCheatSheet, setShowCheatSheet] = React.useState(false);
  const [showExpressionSection, setShowExpressionSection] = React.useState(false);
  const [exprValidation, setExprValidation] = React.useState({ valid: true, error: null });
  const [selectedSector, setSelectedSector] = React.useState('ALL');

  const textareaRef = React.useRef(null);
  const selectedItemRef = React.useRef(null);
  const chartComponentRef = React.useRef(null);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  React.useEffect(() => {
    if (!activeExpression || !activeExpression.trim()) {
      setExprValidation({ valid: true, error: null });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/setups/validate-expression`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expression: activeExpression })
        });
        if (res.ok) {
          const data = await res.json();
          setExprValidation(data);
        }
      } catch (e) {
        // ignore network error
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeExpression]);

  const handleInsertVariable = (sym) => {
    if (!textareaRef.current) {
      onExpressionChange((activeExpression ? activeExpression + ' ' : '') + sym);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart ?? activeExpression.length;
    const end = el.selectionEnd ?? activeExpression.length;
    const text = activeExpression || '';

    let insertText = sym;
    const prevChar = text.charAt(start - 1);
    const nextChar = text.charAt(end);
    if (prevChar && prevChar !== ' ' && prevChar !== '(') {
      insertText = ' ' + insertText;
    }
    if (nextChar && nextChar !== ' ' && nextChar !== ')') {
      insertText = insertText + ' ';
    }

    const updated = text.substring(0, start) + insertText + text.substring(end);
    onExpressionChange(updated);

    setTimeout(() => {
      if (el) {
        el.focus();
        const newPos = start + insertText.length;
        el.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Sector Breakdown and Filtering
  const sectorCounts = React.useMemo(() => {
    const counts = {};
    (filteredCandidates || []).forEach(c => {
      const s = c.sector && c.sector.trim() !== '' ? c.sector.trim() : 'Unclassified';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
  }, [filteredCandidates]);

  const displayedCandidates = React.useMemo(() => {
    if (!selectedSector || selectedSector === 'ALL') {
      return filteredCandidates;
    }
    return filteredCandidates.filter(c => {
      const s = c.sector && c.sector.trim() !== '' ? c.sector.trim() : 'Unclassified';
      return s === selectedSector;
    });
  }, [filteredCandidates, selectedSector]);

  // Reset selected sector if no longer present in candidates list
  React.useEffect(() => {
    if (selectedSector !== 'ALL' && !sectorCounts.some(sc => sc.sector === selectedSector)) {
      setSelectedSector('ALL');
    }
  }, [sectorCounts, selectedSector]);

  // Keep browseIndex within bounds when list changes
  React.useEffect(() => {
    if (browseIndex >= displayedCandidates.length && displayedCandidates.length > 0) {
      setBrowseIndex(0);
    }
  }, [displayedCandidates.length, browseIndex]);

  const currentCandidate = displayedCandidates[browseIndex] || null;

  const currentSetup = React.useMemo(() => {
    return (setupsConfig?.setups || []).find(s => s.id === activeSetupKey) || null;
  }, [setupsConfig, activeSetupKey]);

  const activeSetupName = React.useMemo(() => {
    if (currentSetup?.sub_setups && activeExpression) {
      const activeSub = currentSetup.sub_setups.find(s => s.expression?.trim() === activeExpression?.trim());
      if (activeSub?.label || activeSub?.name) return activeSub.label || activeSub.name;
    }
    if (currentSetup?.name) return currentSetup.name;
    if (currentCandidate?.pp_is_setup) return 'Power Play';
    if (currentCandidate?.breakout_is_setup) return 'QM Breakout';
    if (currentCandidate?.ep_is_setup) return 'Episodic Pivot';
    if (currentCandidate?.parabolic_short_is_setup) return 'Parabolic Short';
    if (currentCandidate?.vcp_is_setup) return 'Cup and Handle';
    if (currentCandidate?.cheat_is_setup) return 'Cheat';
    if (currentCandidate?.low_cheat_is_setup) return 'Low Cheat';
    if (currentCandidate?.ipo_days_count !== undefined && currentCandidate?.ipo_days_count <= 350) return 'IPO Base';
    return 'General';
  }, [currentSetup, currentCandidate, activeSetupKey, activeExpression]);

  const currentHasBlueDot = React.useMemo(() => {
    if (currentCandidate?.is_rs_blue_dot) return true;
    if (currentCandidate?.setups && currentCandidate.setups.includes('RS Blue Dot')) return true;
    if (browsePrices && browsePrices.length > 0) {
      const recent = browsePrices.slice(-5);
      return recent.some(b => b.is_rs_blue_dot);
    }
    return false;
  }, [currentCandidate, browsePrices]);

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

  // Auto-scroll selected candidate stock into view in the Filtered Candidates list
  React.useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [browseIndex, displayedCandidates.length]);

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
    if (displayedCandidates.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.min(prev + 1, displayedCandidates.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedCandidates.length]);

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

  const [isProcessingAll, setIsProcessingAll] = React.useState(false);
  const [batchFeedback, setBatchFeedback] = React.useState(null);

  const allDisplayedAreAdded = React.useMemo(() => {
    if (!displayedCandidates || displayedCandidates.length === 0) return false;
    return displayedCandidates.every(c => c.symbol && activeWatchlistSymbols.has(c.symbol.toUpperCase()));
  }, [displayedCandidates, activeWatchlistSymbols]);

  const handleToggleAllWatchlist = async () => {
    if (displayedCandidates.length === 0) {
      alert("No candidate stocks to process.");
      return;
    }
    const symbols = displayedCandidates.map(c => c.symbol).filter(Boolean);
    if (symbols.length === 0) return;

    let wlId = targetWatchlistId;
    if (!wlId) {
      if (watchlists && watchlists.length > 0) {
        wlId = watchlists[0].id;
        setTargetWatchlistId(wlId);
      } else {
        try {
          const createRes = await fetch(`${API_BASE}/api/watchlists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Screen Candidates' })
          });
          if (createRes.ok) {
            const created = await createRes.json();
            wlId = created.id;
            setTargetWatchlistId(wlId);
            if (fetchWatchlists) fetchWatchlists();
          } else {
            alert("Please create a watchlist first.");
            return;
          }
        } catch (e) {
          console.error("Error creating watchlist:", e);
          alert("Please create a watchlist first.");
          return;
        }
      }
    }

    const wlObj = (watchlists || []).find(w => w.id === wlId);
    const wlName = wlObj ? wlObj.name : 'Watchlist';

    if (allDisplayedAreAdded) {
      const confirmRemove = window.confirm(
        `Remove all ${symbols.length} candidate stocks from '${wlName}'?`
      );
      if (!confirmRemove) return;

      setIsProcessingAll(true);
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/${wlId}/items/remove-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          symbols.forEach(s => nextSet.delete(s.toUpperCase()));
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
          setBatchFeedback(`✓ Removed`);
          setTimeout(() => setBatchFeedback(null), 2500);
        } else {
          alert("Failed to batch remove candidates from watchlist.");
        }
      } catch (e) {
        console.error("Error removing candidates from watchlist:", e);
        alert(`Error: ${e.message}`);
      } finally {
        setIsProcessingAll(false);
      }
    } else {
      setIsProcessingAll(true);
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/${wlId}/items/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          symbols.forEach(s => nextSet.add(s.toUpperCase()));
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
          setBatchFeedback(`✓ Added`);
          setTimeout(() => setBatchFeedback(null), 2500);
        } else {
          alert("Failed to batch add candidates to watchlist.");
        }
      } catch (e) {
        console.error("Error adding all candidates to watchlist:", e);
        alert(`Error: ${e.message}`);
      } finally {
        setIsProcessingAll(false);
      }
    }
  };

  const handleExportTradingView = () => {
    if (displayedCandidates.length === 0) {
      alert("No candidates to export!");
      return;
    }
    const content = displayedCandidates.map(c => {
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
    <div className="stock-screen-container">
      {/* Interactive Strategy & Filter controls */}
      <div className="glass-card" style={{ marginBottom: '10px', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {/* Top Integrated Header: Strategy Buttons + Right Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Strategy Selector (Left Side: Setup Buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {(setupsConfig?.setups || []).map((setup) => {
              const isSelected = activeSetupKey === setup.id;
              const color = SETUP_COLORS[setup.id] || '#38bdf8';
              return (
                <button
                  key={setup.id}
                  type="button"
                  onClick={() => {
                    if (setup.default_sub_id && setup.sub_setups?.length > 0) {
                      const defSub = setup.sub_setups.find(s => s.id === setup.default_sub_id);
                      onSelectSetup(setup.id, defSub?.expression || setup.expression);
                    } else {
                      onSelectSetup(setup.id, setup.expression);
                    }
                  }}
                  title={setup.description || ''}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? `${color}33` : 'rgba(15, 23, 42, 0.5)',
                    color: isSelected ? color : 'var(--text-secondary)',
                    boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none'
                  }}
                >
                  {setup.icon ? `${setup.icon} ` : ''}{setup.name}
                </button>
              );
            })}
          </div>

          {/* Right Action Controls: Standalone Date Picker & Rules/Sliders Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Date Navigation & Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePrevDay}
                disabled={!canGoPrev}
                title={prevDate ? `Previous Day (${prevDate})` : 'No earlier trading date'}
                aria-label="Previous Day"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: canGoPrev ? '#f8fafc' : 'rgba(255, 255, 255, 0.3)',
                  cursor: canGoPrev ? 'pointer' : 'not-allowed',
                  opacity: canGoPrev ? 1 : 0.45,
                  flexShrink: 0,
                  lineHeight: 1
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <input
                type="date"
                value={curDateStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={maxSelectableDate}
                title="Select As-of Date"
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  height: '28px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  colorScheme: 'dark',
                  boxSizing: 'border-box'
                }}
              />

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleNextDay}
                disabled={!canGoNext}
                title={nextDate ? `Next Day (${nextDate})` : 'No later trading date'}
                aria-label="Next Day"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: canGoNext ? '#f8fafc' : 'rgba(255, 255, 255, 0.3)',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.45,
                  flexShrink: 0,
                  lineHeight: 1
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerLiveQuotesSync}
              disabled={syncStatus?.status === 'running' || loadingCandidates}
              title={syncStatus?.status === 'running' ? "Refreshing Live Quotes..." : "Sync Live Market Quotes (<3s)"}
              style={{
                padding: '5px 10px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: syncStatus?.status === 'running' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                border: syncStatus?.status === 'running' ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                cursor: syncStatus?.status === 'running' ? 'not-allowed' : 'pointer',
                lineHeight: 1
              }}
            >
              <span className={syncStatus?.status === 'running' ? "spin-icon" : ""}>⚡</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExpressionSection(!showExpressionSection)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: showExpressionSection ? 'rgba(56, 189, 248, 0.18)' : undefined,
                borderColor: showExpressionSection ? '#38bdf8' : undefined,
                color: showExpressionSection ? '#38bdf8' : undefined,
                whiteSpace: 'nowrap'
              }}
            >
              ⚙️ {showExpressionSection ? 'Expression ▲' : 'Expression ▼'}
            </button>

          </div>
        </div>

        {/* Dynamic Sub-Bar for Any Setup defining sub_setups (e.g., Breakouts, Momentum, VCP) */}
        {currentSetup?.sub_setups && currentSetup.sub_setups.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '8px 12px',
            background: activeSetupKey === 'momentum' ? 'rgba(168, 85, 247, 0.08)' : (activeSetupKey === 'vcp' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)'),
            border: activeSetupKey === 'momentum' ? '1px solid rgba(168, 85, 247, 0.25)' : (activeSetupKey === 'vcp' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)'),
            borderRadius: '8px',
            marginTop: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '700',
                color: activeSetupKey === 'momentum' ? '#c084fc' : (activeSetupKey === 'vcp' ? '#34d399' : '#38bdf8'),
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {currentSetup.sub_title || `${currentSetup.name} Presets:`}
              </span>
              {currentSetup.sub_setups.map(sub => {
                const isActive = activeExpression?.trim() === sub.expression?.trim();
                const activeThemeColor = activeSetupKey === 'momentum' ? '#a855f7' : (activeSetupKey === 'vcp' ? '#10b981' : '#38bdf8');
                const activeBg = activeSetupKey === 'momentum' ? 'rgba(168, 85, 247, 0.3)' : (activeSetupKey === 'vcp' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)');

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      if (sub.expression) {
                        onExpressionChange(sub.expression);
                      }
                    }}
                    title={sub.expression || ''}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '700' : '500',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isActive ? `1px solid ${activeThemeColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isActive ? activeBg : 'rgba(15, 23, 42, 0.4)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {sub.label || sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expression Input Bar */}
        {showExpressionSection && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '4px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#38bdf8' }}>⚙️</span> Expression
                </span>
                {/* Validation Status Indicator */}
                {activeExpression && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: exprValidation.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: exprValidation.valid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                    color: exprValidation.valid ? '#34d399' : '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {exprValidation.valid ? '✓ Syntax Valid' : `⚠ ${exprValidation.error}`}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCheatSheet(!showCheatSheet)}
                  style={{
                    fontSize: '11.5px',
                    padding: '3px 10px',
                    background: showCheatSheet ? 'rgba(56, 189, 248, 0.2)' : undefined,
                    borderColor: showCheatSheet ? '#38bdf8' : undefined,
                    color: showCheatSheet ? '#38bdf8' : 'var(--text-secondary)'
                  }}
                >
                  📚 {showCheatSheet ? 'Cheat Sheet ▲' : 'Cheat Sheet ▼'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onResetExpression}
                  title="Reset formula to setup default"
                  style={{
                    fontSize: '11.5px',
                    padding: '3px 10px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ↺ Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => fetchCandidates && fetchCandidates()}
                  disabled={loadingCandidates || !exprValidation.valid}
                  style={{
                    fontSize: '11.5px',
                    padding: '3px 12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {loadingCandidates ? <span className="spin-icon">↻</span> : '▶'} Run Scan
                </button>
              </div>
            </div>

            {/* Monospace Formula Input Box */}
            <div style={{ position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={activeExpression || ''}
                onChange={(e) => onExpressionChange(e.target.value)}
                placeholder="e.g. C >= 15 AND C > AVGC50 AND V > 100000 AND STAGE2 AND (C - C1) / C1 * 100 >= 3"
                rows={2}
                spellCheck="false"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(10, 15, 29, 0.85)',
                  border: exprValidation.valid ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(239, 68, 68, 0.6)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  color: '#38bdf8',
                  resize: 'vertical',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  if (exprValidation.valid) {
                    e.target.style.borderColor = '#38bdf8';
                  }
                }}
                onBlur={(e) => {
                  if (exprValidation.valid) {
                    e.target.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (fetchCandidates && exprValidation.valid) {
                      fetchCandidates();
                    }
                  }
                }}
              />
            </div>

            {/* Variable Cheat Sheet Drawer */}
            {showCheatSheet && (
              <div style={{ marginTop: '4px' }}>
                <ExpressionCheatSheet
                  onInsert={handleInsertVariable}
                  onClose={() => setShowCheatSheet(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock Browse Mode Content */}
      {filteredCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          {loadingCandidates ? 'Loading candidates...' : 'No candidate stocks match your current active filters.'}
        </div>
      ) : displayedCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          <p>No candidates found in sector <strong>"{selectedSector}"</strong>.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSector('ALL')} style={{ marginTop: '10px' }}>
            Show All Sectors ({filteredCandidates.length})
          </button>
        </div>
      ) : (
        <div className="browse-split-container">
          {/* Main Browse Column (Left) */}
          <div className="browse-main-col">
            {/* Header Bar for Selected Stock */}
            <div className="glass-card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              {/* Top Row: Symbol + Company Name (Left) & Watchlist Quick Action (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
                    {currentCandidate?.symbol}
                  </h2>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                      {currentCandidate?.name || currentCandidate?.symbol || ''}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
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
                      padding: '5px 8px',
                      fontSize: '11.5px',
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
                          width: '28px',
                          height: '28px',
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </button>
                    );
                  })()}


                  {/* Header Quick Screenshot Action Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => chartComponentRef.current?.saveScreenshot()}
                    disabled={!currentCandidate || loadingBrowsePrices || browsePrices.length === 0}
                    title={`Take chart screenshot and store in ./charts/${activeSetupName}/${currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : 'date')}_${currentCandidate?.symbol || 'STOCK'}.png`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-secondary)',
                      cursor: (!currentCandidate || browsePrices.length === 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Badges Group (Left) & Stock Position Count (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Left: Badges Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                  <span className="pill pill-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                    RS: {currentCandidate?.rs_rank ?? 'N/A'}
                  </span>

                  {currentHasBlueDot && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.45)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="RS Blue Dot: Relative Strength vs SPY hit a new 52-week high before price breakout (institutional accumulation)"
                    >
                      🔵 RS Blue Dot
                    </span>
                  )}


                  {currentCandidate?.adr_20d !== null && currentCandidate?.adr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '11px', padding: '3px 8px', background: currentCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)', color: currentCandidate.adr_20d >= 5.0 ? '#f59e0b' : '#60a5fa', border: currentCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 700 }}>
                      ADR%: {currentCandidate.adr_20d.toFixed(2)}%
                    </span>
                  ) : currentCandidate?.atr_20d !== null && currentCandidate?.atr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                      ADTR: {currentCandidate.atr_20d.toFixed(2)}%
                    </span>
                  ) : null}

                  {currentCandidate?.ti_65 !== null && currentCandidate?.ti_65 !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
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

                  {!((currentCandidate?.asset_type === 'ETF') || (currentCandidate?.asset_type && currentCandidate.asset_type.toUpperCase().includes('ETF'))) && (
                    currentCandidate?.inst_holders_count !== null && currentCandidate?.inst_holders_count !== undefined ? (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: (currentCandidate.sponsorship_streak >= 2 || (currentCandidate.inst_holders_qoq_change > 0)) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.18)',
                          color: (currentCandidate.sponsorship_streak >= 2 || (currentCandidate.inst_holders_qoq_change > 0)) ? '#22c55e' : '#38bdf8',
                          border: (currentCandidate.sponsorship_streak >= 2 || (currentCandidate.inst_holders_qoq_change > 0)) ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                          fontWeight: 700
                        }}
                        title={`Institutional Sponsorship: ${currentCandidate.inst_holders_count.toLocaleString()} funds${currentCandidate.inst_holders_qoq_change !== null && currentCandidate.inst_holders_qoq_change !== undefined ? ` (${currentCandidate.inst_holders_qoq_change >= 0 ? '+' : ''}${currentCandidate.inst_holders_qoq_change} QoQ)` : ''}${currentCandidate.sponsorship_streak >= 1 ? `, Streak: ${currentCandidate.sponsorship_streak}Q` : ''}`}
                      >
                        🏛️ Inst: {currentCandidate.inst_holders_count.toLocaleString()} {currentCandidate.inst_holders_qoq_change !== null && currentCandidate.inst_holders_qoq_change !== undefined ? `(${currentCandidate.inst_holders_qoq_change >= 0 ? '+' : ''}${currentCandidate.inst_holders_qoq_change} QoQ)` : ''}{currentCandidate.sponsorship_streak >= 2 ? ` 🔥 +${currentCandidate.sponsorship_streak}Q` : ''}
                      </span>
                    ) : currentCandidate?.sponsorship_streak >= 1 ? (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: currentCandidate.sponsorship_streak >= 2 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                          color: currentCandidate.sponsorship_streak >= 2 ? '#22c55e' : '#60a5fa',
                          border: currentCandidate.sponsorship_streak >= 2 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700
                        }}
                        title={`Institutional Sponsorship: ${currentCandidate.sponsorship_streak} consecutive quarters increasing fund count`}
                      >
                        🏛️ {currentCandidate.sponsorship_streak >= 2 ? '🔥 ' : ''}+{currentCandidate.sponsorship_streak}Q Inst
                      </span>
                    ) : (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontWeight: 500
                        }}
                        title="Institutional Sponsorship not synced for this stock yet. Check 'Sync Institutional Sponsorship' on Dashboard."
                      >
                        🏛️ Inst: Unsynced
                      </span>
                    )
                  )}

                  {currentCandidate?.ret_1m !== null && currentCandidate?.ret_1m !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(59, 130, 246, 0.18)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        fontWeight: 600
                      }}
                      title={`1-Month Return: ${currentCandidate.ret_1m.toFixed(1)}%`}
                    >
                      1M: {currentCandidate.ret_1m >= 0 ? '+' : ''}{currentCandidate.ret_1m.toFixed(1)}%
                    </span>
                  )}

                  {currentCandidate?.ret_3m !== null && currentCandidate?.ret_3m !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(168, 85, 247, 0.18)',
                        color: '#c084fc',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        fontWeight: 600
                      }}
                      title={`3-Month Return: ${currentCandidate.ret_3m.toFixed(1)}%`}
                    >
                      3M: {currentCandidate.ret_3m >= 0 ? '+' : ''}{currentCandidate.ret_3m.toFixed(1)}%
                    </span>
                  )}

                  {currentCandidate?.ret_6m !== null && currentCandidate?.ret_6m !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(236, 72, 153, 0.18)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        fontWeight: 600
                      }}
                      title={`6-Month Return: ${currentCandidate.ret_6m.toFixed(1)}%`}
                    >
                      6M: {currentCandidate.ret_6m >= 0 ? '+' : ''}{currentCandidate.ret_6m.toFixed(1)}%
                    </span>
                  )}

                  {/* Next Earnings Date Badge */}
                  {browseEarningsBadge ? (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
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
                        fontSize: '11px',
                        padding: '3px 8px',
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
                </div>

                {/* Stock Position Count on Far Bottom Right */}
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                  Stock {browseIndex + 1} of {displayedCandidates.length}
                </span>
              </div>
            </div>

            {/* Candlestick Chart Container - Fills 100% of remaining vertical height */}
            <div className="glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <CandlestickChart
                ref={chartComponentRef}
                data={browsePrices}
                symbol={currentCandidate?.symbol}
                companyName={currentCandidate?.name}
                setupName={activeSetupName}
                asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
                height="100%"
                showScreenshotButton={false}
              />
            </div>
          </div>

          {/* Candidate List Ribbon (Right Column) */}
          <div className="glass-card browse-side-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0 }}>
                Total ({displayedCandidates.length}{selectedSector !== 'ALL' ? ` / ${filteredCandidates.length}` : ''})
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleToggleAllWatchlist}
                  disabled={displayedCandidates.length === 0 || isProcessingAll}
                  title={allDisplayedAreAdded
                    ? `Remove all ${displayedCandidates.length} candidate stocks from '${watchlists.find(w => w.id === targetWatchlistId)?.name || 'Watchlist'}'`
                    : `Add all ${displayedCandidates.length} candidate stocks into '${watchlists.find(w => w.id === targetWatchlistId)?.name || 'Watchlist'}'`
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    height: '26px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    cursor: (displayedCandidates.length > 0 && !isProcessingAll) ? 'pointer' : 'not-allowed',
                    opacity: (displayedCandidates.length > 0 && !isProcessingAll) ? 1 : 0.4,
                    background: batchFeedback 
                      ? 'rgba(16, 185, 129, 0.25)' 
                      : (allDisplayedAreAdded ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)'),
                    border: batchFeedback 
                      ? '1px solid #10b981' 
                      : (allDisplayedAreAdded ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)'),
                    color: batchFeedback 
                      ? '#34d399' 
                      : (allDisplayedAreAdded ? '#fb7185' : '#38bdf8'),
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isProcessingAll ? (
                    '...'
                  ) : batchFeedback ? (
                    batchFeedback
                  ) : allDisplayedAreAdded ? (
                    <><span>⭐️-</span> Remove All</>
                  ) : (
                    <><span>⭐️+</span> Add All</>
                  )}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportTradingView}
                  disabled={displayedCandidates.length === 0}
                  title="Export to TradingView watchlist (.txt)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    padding: 0,
                    borderRadius: '6px',
                    cursor: displayedCandidates.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: displayedCandidates.length > 0 ? 1 : 0.4,
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
            </div>

            {/* Sector Filter Dropdown */}
            <div style={{ marginBottom: '8px', flexShrink: 0 }}>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setBrowseIndex(0);
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  color: selectedSector !== 'ALL' ? '#38bdf8' : 'var(--text-primary)',
                  border: selectedSector !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: selectedSector !== 'ALL' ? '600' : '400',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Filter candidates by sector"
              >
                <option value="ALL">All Sectors ({filteredCandidates.length})</option>
                {sectorCounts.map(({ sector, count }) => (
                  <option key={sector} value={sector}>
                    {sector} ({count})
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minHeight: 0,
                paddingRight: '2px'
              }}
            >
              {displayedCandidates.map((c, idx) => {
                const isSelected = idx === browseIndex;
                const isItemSaved = activeWatchlistSymbols.has(c.symbol.toUpperCase());
                return (
                  <div
                    key={c.symbol}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => setBrowseIndex(idx)}
                    style={{
                      padding: '7px 10px',
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
                      {c.sponsorship_streak >= 2 && (
                        <span
                          className="pill"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            fontWeight: 700,
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.4)'
                          }}
                          title={`Institutional Sponsorship: ${c.sponsorship_streak} consecutive quarters increasing fund count`}
                        >
                          +{c.sponsorship_streak}Q
                        </span>
                      )}
                      {(c.is_rs_blue_dot || c.setups?.includes('RS Blue Dot')) && (
                        <span
                          className="pill"
                          style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            fontWeight: 700,
                            background: 'rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.4)'
                          }}
                          title="RS Blue Dot setup"
                        >
                          🔵
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
