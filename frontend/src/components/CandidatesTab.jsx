import React from 'react';
import StockView from './stock-view';
import GroupStageChart from './GroupStageChart';
import ExpressionCheatSheet from './ExpressionCheatSheet';
import StockBrandIcon from './StockBrandIcon';
import { getLocalDateStr } from '../utils/dateUtils';

const SETUP_COLORS = {
  // Folders
  daily: '#38bdf8',
  weekly: '#a855f7',
  short: '#f43f5e',
  others: '#94a3b8',
  // Daily Setups
  power_play: '#38bdf8',
  breakout: '#f59e0b',
  breakouts: '#f59e0b',
  qm_breakouts: '#f59e0b',
  standard: '#f59e0b',
  episodic_pivot: '#ec4899',
  ep_9_million: '#f43f5e',
  parabolic: '#ef4444',
  parabolic_short: '#ef4444',
  cup_and_handle: '#10b981',
  cheat: '#eab308',
  low_cheat: '#f97316',
  // Short Setups
  weinstein_breakdown: '#f43f5e',
  weinstein_pullback: '#fb7185',
  stage4_continuation: '#e11d48',
  gap_breakdown: '#be123c',
  // Weekly Setups
  momentum: '#a855f7',
  leaders: '#a855f7',
  gainers: '#ec4899',
  '1m': '#38bdf8',
  '3m': '#818cf8',
  '6m': '#06b6d4',
  ipo_base: '#06b6d4',
  trend_1m: '#34d399',
  trend_1_4m: '#10b981',
  trend_5m: '#059669',
  // Others
  stage2: '#10b981',
  all: '#64748b',
  vcp: '#10b981',
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
  setupsConfig = { folders: [], setups: [], filters: {} },
  activeFolderId = 'daily',
  onSelectFolder = () => { },
  activeScreenerId = 'power_play',
  onSelectScreener = () => { },
  activeSetupKey = 'power_play',
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
  const [targetWatchlistId, setTargetWatchlistId] = React.useState(null);
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showCheatSheet, setShowCheatSheet] = React.useState(false);
  const [showExpressionSection, setShowExpressionSection] = React.useState(false);
  const [exprValidation, setExprValidation] = React.useState({ valid: true, error: null });
  const [selectedIndustry, setSelectedIndustry] = React.useState('ALL');
  const [stage2OnlyFilter, setStage2OnlyFilter] = React.useState(false);
  const [previewGroupModal, setPreviewGroupModal] = React.useState(null);
  const [sortBy, setSortBy] = React.useState('rs_rank');

  const priceCacheRef = React.useRef(new Map());
  const pendingRequestsRef = React.useRef(new Map());
  const abortControllerRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const selectedItemRef = React.useRef(null);
  const selectedSymbolRef = React.useRef(null);
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

  // Industry/Group Breakdown and Filtering
  const industryCounts = React.useMemo(() => {
    const counts = {};
    (filteredCandidates || []).forEach(c => {
      const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [filteredCandidates]);

  const displayedCandidates = React.useMemo(() => {
    let list = filteredCandidates || [];
    if (selectedIndustry && selectedIndustry !== 'ALL') {
      list = list.filter(c => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return ind === selectedIndustry;
      });
    }
    if (stage2OnlyFilter) {
      list = list.filter(c => c.industry_stage_num === 2 || (typeof c.group_stage_badge === 'string' && c.group_stage_badge.includes('Stage 2')));
    }
    const copy = [...list];
    switch (sortBy) {
      case 'symbol':
        return copy.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
      case 'symbol_desc':
        return copy.sort((a, b) => (b.symbol || '').localeCompare(a.symbol || ''));
      case 'rs_line':
        return copy.sort((a, b) => {
          const valB = b.normalized_rs !== undefined && b.normalized_rs !== null ? b.normalized_rs : b.rs_line;
          const valA = a.normalized_rs !== undefined && a.normalized_rs !== null ? a.normalized_rs : a.rs_line;
          return (valB ?? -999999) - (valA ?? -999999);
        });
      case 'rs_line_asc':
        return copy.sort((a, b) => {
          const valB = b.normalized_rs !== undefined && b.normalized_rs !== null ? b.normalized_rs : b.rs_line;
          const valA = a.normalized_rs !== undefined && a.normalized_rs !== null ? a.normalized_rs : a.rs_line;
          return (valA ?? 999999) - (valB ?? 999999);
        });
      case 'rs_rank':
        return copy.sort((a, b) => (b.rs_rank ?? -999) - (a.rs_rank ?? -999));
      case 'rs_rank_asc':
        return copy.sort((a, b) => (a.rs_rank ?? 999) - (b.rs_rank ?? 999));
      case 'chg_pct_desc':
        return copy.sort((a, b) => ((b.today_pct ?? b.chg_pct) ?? -999) - ((a.today_pct ?? a.chg_pct) ?? -999));
      case 'chg_pct_asc':
        return copy.sort((a, b) => ((a.today_pct ?? a.chg_pct) ?? 999) - ((b.today_pct ?? b.chg_pct) ?? 999));
      default:
        return copy;
    }
  }, [filteredCandidates, selectedIndustry, stage2OnlyFilter, sortBy]);

  // Reset selected industry if no longer present in candidates list
  React.useEffect(() => {
    if (selectedIndustry !== 'ALL' && !industryCounts.some(ic => ic.industry === selectedIndustry)) {
      setSelectedIndustry('ALL');
    }
  }, [industryCounts, selectedIndustry]);

  // Keep browseIndex within bounds when list changes
  React.useEffect(() => {
    if (browseIndex >= displayedCandidates.length && displayedCandidates.length > 0) {
      setBrowseIndex(0);
    }
  }, [displayedCandidates.length, browseIndex]);

  const currentCandidate = displayedCandidates[browseIndex] || null;

  React.useEffect(() => {
    if (currentCandidate?.symbol) {
      selectedSymbolRef.current = currentCandidate.symbol;
    }
  }, [currentCandidate?.symbol]);

  React.useEffect(() => {
    if (selectedSymbolRef.current && displayedCandidates.length > 0) {
      const idx = displayedCandidates.findIndex(c => c.symbol === selectedSymbolRef.current);
      if (idx !== -1 && idx !== browseIndex) {
        setBrowseIndex(idx);
      }
    }
  }, [displayedCandidates]);

  const curFolder = React.useMemo(() => {
    return (setupsConfig?.folders || []).find(f => f.id === activeFolderId) || (setupsConfig?.folders || [])[0] || null;
  }, [setupsConfig, activeFolderId]);

  const curScreener = React.useMemo(() => {
    if (curFolder?.screeners) {
      const match = curFolder.screeners.find(s => s.id === activeScreenerId);
      if (match) return match;
    }
    // Search across all folders
    for (const f of (setupsConfig?.folders || [])) {
      const match = f.screeners?.find(s => s.id === activeScreenerId);
      if (match) return match;
    }
    // Fallback search in legacy setups
    return (setupsConfig?.setups || []).find(s => s.id === activeScreenerId || s.id === activeSetupKey) || null;
  }, [setupsConfig, curFolder, activeScreenerId, activeSetupKey]);

  const currentSetup = curScreener;

  const activeSetupName = React.useMemo(() => {
    if (curScreener?.name || curScreener?.label) {
      return curScreener.name || curScreener.label;
    }
    if (currentCandidate?.pp_is_setup) return 'Power Play';
    if (currentCandidate?.breakout_is_setup) return 'QM Breakout';
    if (currentCandidate?.ep_is_setup) return 'Episodic Pivot';
    if (currentCandidate?.parabolic_short_is_setup) return 'Parabolic Short';
    if (currentCandidate?.vcp_is_setup) return 'Cup and Handle';
    if (currentCandidate?.cheat_is_setup) return 'Cheat';
    if (currentCandidate?.low_cheat_is_setup) return 'Low Cheat';
    if (currentCandidate?.ipo_days_count !== undefined && currentCandidate?.ipo_days_count <= 350) return 'IPO Base';
    return 'General';
  }, [curScreener, currentCandidate]);

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
    const dt = currentCandidate?.next_earnings_date;
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
  }, [currentCandidate?.next_earnings_date]);

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

  const fetchBrowsePrices = React.useCallback(async (symbol) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase();

    // 1. Check in-memory cache for instant 0ms load
    if (priceCacheRef.current.has(sym)) {
      setBrowsePrices(priceCacheRef.current.get(sym));
      setLoadingBrowsePrices(false);
      return;
    }

    // 2. Abort previous in-flight direct fetch to prevent out-of-order responses and thread stalls
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingBrowsePrices(true);
    try {
      let promise;
      if (pendingRequestsRef.current.has(sym)) {
        promise = pendingRequestsRef.current.get(sym);
      } else {
        promise = (async () => {
          const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=750`, {
            signal: controller.signal
          });
          if (res.ok) {
            return await res.json();
          }
          return [];
        })();
        pendingRequestsRef.current.set(sym, promise);
      }

      const data = await promise;
      if (Array.isArray(data) && data.length > 0) {
        priceCacheRef.current.set(sym, data);
        setBrowsePrices(data);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Error fetching browse prices:", e);
      }
    } finally {
      pendingRequestsRef.current.delete(sym);
      setLoadingBrowsePrices(false);
    }
  }, [API_BASE]);

  const prefetchSymbols = React.useCallback((symbols) => {
    if (!symbols || symbols.length === 0) return;
    symbols.forEach(s => {
      if (!s) return;
      const sym = s.toUpperCase();
      if (!priceCacheRef.current.has(sym) && !pendingRequestsRef.current.has(sym)) {
        const reqPromise = (async () => {
          try {
            const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=750`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                priceCacheRef.current.set(sym, data);
                return data;
              }
            }
          } catch (err) {
            // Ignore prefetch network errors
          } finally {
            pendingRequestsRef.current.delete(sym);
          }
          return [];
        })();
        pendingRequestsRef.current.set(sym, reqPromise);
      }
    });
  }, [API_BASE]);

  React.useEffect(() => {
    if (currentCandidate) {
      fetchBrowsePrices(currentCandidate.symbol);
    }
    // Prefetch surrounding candidate stocks for buttery-smooth keyboard flipping
    if (displayedCandidates.length > 1) {
      const symbolsToPrefetch = [];
      if (browseIndex + 1 < displayedCandidates.length) symbolsToPrefetch.push(displayedCandidates[browseIndex + 1]?.symbol);
      if (browseIndex + 2 < displayedCandidates.length) symbolsToPrefetch.push(displayedCandidates[browseIndex + 2]?.symbol);
      if (browseIndex + 3 < displayedCandidates.length) symbolsToPrefetch.push(displayedCandidates[browseIndex + 3]?.symbol);
      if (browseIndex > 0) symbolsToPrefetch.push(displayedCandidates[browseIndex - 1]?.symbol);

      const timer = setTimeout(() => {
        prefetchSymbols(symbolsToPrefetch);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [browseIndex, currentCandidate?.symbol, displayedCandidates, fetchBrowsePrices, prefetchSymbols]);

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
    link.download = `PivotTrader_Watchlist_${getLocalDateStr()}.txt`;
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
          {/* Level 1: Folder Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '2px' }}>
              Folder:
            </span>
            {(setupsConfig?.folders && setupsConfig.folders.length > 0) ? (
              setupsConfig.folders.filter(f => f.visible !== false).map((folder) => {
                const isSelected = activeFolderId === folder.id;
                const color = SETUP_COLORS[folder.id] || '#38bdf8';
                const screenerCount = folder.screeners?.filter(s => s.visible !== false)?.length ?? (folder.screeners?.length || 0);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => onSelectFolder(folder.id)}
                    title={folder.description || ''}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: isSelected ? '700' : '600',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isSelected ? `1.5px solid ${color}` : '1px solid rgba(255, 255, 255, 0.12)',
                      background: isSelected ? `${color}25` : 'rgba(15, 23, 42, 0.55)',
                      color: isSelected ? color : 'var(--text-secondary)',
                      boxShadow: isSelected ? `0 2px 8px ${color}35` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{folder.icon ? `${folder.icon} ` : ''}{folder.name}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: isSelected ? `${color}35` : 'rgba(255, 255, 255, 0.08)',
                      color: isSelected ? color : 'var(--text-muted)',
                    }}>
                      {screenerCount}
                    </span>
                  </button>
                );
              })
            ) : (
              (setupsConfig?.setups || []).filter(s => s.visible !== false).map((setup) => {
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
              })
            )}
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

        {/* Level 2: Screener Subview Bar (Permanently visible for active folder) */}
        {curFolder?.screeners && curFolder.screeners.length > 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '7px 12px',
            background: activeFolderId === 'daily' 
              ? 'rgba(56, 189, 248, 0.08)' 
              : activeFolderId === 'weekly' 
                ? 'rgba(168, 85, 247, 0.08)' 
                : activeFolderId === 'short'
                  ? 'rgba(244, 63, 94, 0.08)'
                  : 'rgba(148, 163, 184, 0.08)',
            border: activeFolderId === 'daily' 
              ? '1px solid rgba(56, 189, 248, 0.25)' 
              : activeFolderId === 'weekly' 
                ? '1px solid rgba(168, 85, 247, 0.25)' 
                : activeFolderId === 'short'
                  ? '1px solid rgba(244, 63, 94, 0.25)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '8px',
            marginTop: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {(curFolder.screeners || []).filter(s => s.visible !== false).map((screener) => {
                const isActive = activeScreenerId === screener.id || (activeExpression && screener.expression?.trim() === activeExpression?.trim());
                const screenerColor = SETUP_COLORS[screener.id] || (activeFolderId === 'daily' ? '#38bdf8' : (activeFolderId === 'weekly' ? '#a855f7' : (activeFolderId === 'short' ? '#f43f5e' : '#94a3b8')));

                return (
                  <button
                    key={screener.id}
                      onClick={() => onSelectScreener(screener.id, screener.expression)}
                      title={screener.description || screener.expression || ''}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: isActive ? '700' : '500',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isActive ? `1px solid ${screenerColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isActive ? `${screenerColor}33` : 'rgba(15, 23, 42, 0.45)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isActive ? `0 2px 6px ${screenerColor}30` : 'none'
                      }}
                    >
                      {screener.icon ? `${screener.icon} ` : ''}{screener.name || screener.label}
                    </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Legacy fallback sub-bar */
          currentSetup?.sub_setups && currentSetup.sub_setups.length > 0 && (
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
                {(currentSetup.sub_setups || []).filter(s => s.visible !== false).map(sub => {
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
          )
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
          <p>No candidates found in industry/group <strong>"{selectedIndustry}"</strong>.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIndustry('ALL')} style={{ marginTop: '10px' }}>
            Show All Industry Groups ({filteredCandidates.length})
          </button>
        </div>
      ) : (
        <div className="browse-split-container">
                    {/* Main Browse Column (Left) with Unified StockView */}
          <div className="browse-main-col" style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
            <StockView
              ref={chartComponentRef}
              stock={currentCandidate}
              prices={browsePrices}
              loadingPrices={loadingBrowsePrices}
              setupName={activeSetupName}
              asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
              watchlists={watchlists}
              targetWatchlistId={targetWatchlistId}
              onTargetWatchlistChange={setTargetWatchlistId}
              onToggleWatchlist={handleToggleWatchlist}
              onSelectGroup={(type, name) => setPreviewGroupModal({ groupType: type, groupName: name })}
              onSelectStock={(stk) => {
                if (!stk?.symbol) return;
                const idx = displayedCandidates.findIndex(c => c.symbol.toUpperCase() === stk.symbol.toUpperCase());
                if (idx !== -1) {
                  setBrowseIndex(idx);
                } else if (handleSelectStock) {
                  handleSelectStock(stk);
                }
              }}
            />
          </div>

{/* Candidate List Ribbon (Right Column) */}
          <div className="glass-card browse-side-col" style={{ flex: '0 0 clamp(290px, 22vw, 380px)', minWidth: '290px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0 }}>
                Total ({displayedCandidates.length}{selectedIndustry !== 'ALL' ? ` / ${filteredCandidates.length}` : ''})
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

            {/* Industry/Group Filter & Weinstein Stage 2 Quick Filter */}
            <div style={{ marginBottom: '8px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <select
                value={selectedIndustry}
                onChange={(e) => {
                  setSelectedIndustry(e.target.value);
                  setBrowseIndex(0);
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  color: selectedIndustry !== 'ALL' ? '#38bdf8' : 'var(--text-primary)',
                  border: selectedIndustry !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: selectedIndustry !== 'ALL' ? '600' : '400',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Filter candidates by industry/group"
              >
                <option value="ALL">All Industry Groups ({filteredCandidates.length})</option>
                {industryCounts.map(({ industry, count }) => (
                  <option key={industry} value={industry}>
                    {industry} ({count})
                  </option>
                ))}
              </select>

              {/* Stan Weinstein Stage 2 Group Toggle */}
              <button
                type="button"
                onClick={() => {
                  setStage2OnlyFilter((prev) => !prev);
                  setBrowseIndex(0);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: stage2OnlyFilter ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${stage2OnlyFilter ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: stage2OnlyFilter ? '#10b981' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Stan Weinstein Rule: Only show candidates whose industry is in Stage 2 (Advancing Markup)"
              >
                <span>🟩 Stage 2 Groups Only</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>
                  {stage2OnlyFilter ? 'ACTIVE ✓' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Screener Result Stocks Table */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2
                  }}>
                    <th
                      style={{ textAlign: 'left', padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSortBy(sortBy === 'symbol' ? 'symbol_desc' : 'symbol')}
                    >
                      Symbol {sortBy === 'symbol' ? '↑' : sortBy === 'symbol_desc' ? '↓' : ''}
                    </th>
                    <th
                      style={{ textAlign: 'right', padding: '6px 6px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSortBy(sortBy === 'chg_pct_desc' ? 'chg_pct_asc' : 'chg_pct_desc')}
                    >
                      Today {sortBy === 'chg_pct_desc' ? '↓' : sortBy === 'chg_pct_asc' ? '↑' : ''}
                    </th>
                    <th
                      style={{ textAlign: 'center', padding: '6px 6px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSortBy(sortBy === 'rs_rank' ? 'rs_rank_asc' : 'rs_rank')}
                      title="IBD Relative Strength Rank (1–99). Click to sort."
                    >
                      RS {sortBy === 'rs_rank' ? '↓' : sortBy === 'rs_rank_asc' ? '↑' : ''}
                    </th>
                    <th
                      style={{ textAlign: 'right', padding: '6px 6px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSortBy(sortBy === 'rs_line' ? 'rs_line_asc' : 'rs_line')}
                      title="Normalized Relative Strength Line vs SPY [-1.00 to +1.00] (matching stock chart). Click to sort by strength."
                    >
                      RS Line {sortBy === 'rs_line' ? '↓' : sortBy === 'rs_line_asc' ? '↑' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No candidates found.
                      </td>
                    </tr>
                  ) : (
                    displayedCandidates.map((c, idx) => {
                      const isSelected = idx === browseIndex;
                      const isItemSaved = activeWatchlistSymbols.has(c.symbol.toUpperCase());
                      const chg = c.today_pct !== undefined ? c.today_pct : c.chg_pct;
                      const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;
                      const rsVal = c.rs_rank;
                      const normRsRaw = c.normalized_rs !== null && c.normalized_rs !== undefined ? Number(c.normalized_rs) : null;
                      const normRs = normRsRaw !== null ? (Math.abs(normRsRaw) < 0.0001 ? 0 : normRsRaw) : null;
                      const rsColor = normRs === null ? 'var(--text-muted)' : normRs > 0 ? '#34d399' : normRs < 0 ? '#fb7185' : 'var(--text-secondary)';

                      return (
                        <tr
                          key={c.symbol}
                          ref={isSelected ? selectedItemRef : null}
                          onClick={() => setBrowseIndex(idx)}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                            borderLeft: isSelected ? '3px solid #38bdf8' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'background 0.1s ease'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <StockBrandIcon symbol={c.symbol} size={18} />
                              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>{c.symbol}</span>
                              {isItemSaved && (
                                <span
                                  style={{ fontSize: '11px', cursor: 'pointer' }}
                                  title="In active watchlist (click to toggle)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleWatchlist(c.symbol);
                                  }}
                                >
                                  ⭐️
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 700, color: chg === null || chg === undefined ? 'var(--text-muted)' : isPositive ? '#34d399' : '#fb7185' }}>
                            {chg !== null && chg !== undefined ? `${isPositive ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                          </td>

                          <td style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 800, color: rsVal >= 70 ? '#34d399' : rsVal <= 30 ? '#fb7185' : 'var(--text-secondary)' }}>
                            {rsVal !== null && rsVal !== undefined ? rsVal : '—'}
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: rsColor }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                              <span>
                                {normRs !== null
                                  ? `${normRs > 0 ? '+' : ''}${normRs.toFixed(2)}`
                                  : (c.rs_line !== null && c.rs_line !== undefined ? Number(c.rs_line).toFixed(2) : '—')}
                              </span>
                              {(c.is_rs_blue_dot || c.setups?.includes('RS Blue Dot')) && (
                                <span title="RS Blue Dot (RS line at 52-week high)" style={{ fontSize: '10px' }}>🔵</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Stan Weinstein Industry Stage Chart Preview */}
      {previewGroupModal && (
        <div
          className="full-page-modal-backdrop"
          onClick={() => setPreviewGroupModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '940px',
              maxWidth: '96vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#0e1422',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.75)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    STAN WEINSTEIN INDUSTRY CONFIRMATION
                  </span>
                  <span className="badge badge-outline" style={{ fontSize: '10px' }}>
                    Forest to Tree Check
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
                  🏭 {previewGroupModal.groupName}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewGroupModal(null)}
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                ✕ Close
              </button>
            </div>

            <GroupStageChart
              groupType={previewGroupModal.groupType}
              groupName={previewGroupModal.groupName}
              onSelectStock={(sym) => {
                setPreviewGroupModal(null);
                handleSelectStock(sym);
              }}
              height={440}
              isCompact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
