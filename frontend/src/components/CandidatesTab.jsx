import React from 'react';
import StockView from './stock-view';
import { globalStockDataCache } from './stock-view/stockCache';
import StockList, { StockListSplitter, useStockListResize } from './stock-list';
import GroupStageChart from './GroupStageChart';
import ExpressionCheatSheet from './ExpressionCheatSheet';
import StockBrandIcon from './StockBrandIcon';
import { getLocalDateStr } from '../utils/dateUtils';
import { FLAG_COLORS } from '../utils/flagConstants';

const SETUP_COLORS = {
  // Folders
  action: '#f59e0b',
  daily: '#38bdf8',
  weekly: '#a855f7',
  dan_zanger: '#f59e0b',
  short: '#f43f5e',
  others: '#94a3b8',
  archive: '#64748b',
  // Action Setups
  vdu_coils: '#10b981',
  zanger_breakout: '#ec4899',
  // Dan Zanger Setups
  zanger_monster_growth: '#f59e0b',
  zanger_hyper_growth: '#fbbf24',
  zanger_zvr_breakout: '#ec4899',
  zanger_bull_flag: '#38bdf8',
  zanger_stage2_base: '#10b981',
  // Daily Setups
  buyable: '#38bdf8',
  watchlist_rvol: '#10b981',
  power_play: '#38bdf8',
  breakout: '#f59e0b',
  breakouts: '#f59e0b',
  qm_breakouts: '#f59e0b',
  standard: '#f59e0b',
  episodic_pivot: '#ec4899',
  ep_9_million: '#f43f5e',
  parabolic: '#ef4444',
  parabolic_short: '#ef4444',
  parabolic_long: '#10b981',
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
  stage2_bases: '#10b981',
  gainers: '#ec4899',
  '1m': '#38bdf8',
  '3m': '#818cf8',
  '6m': '#06b6d4',
  ipo_base: '#06b6d4',
  lead: '#10b981',
  mediocre: '#f59e0b',
  lag: '#f43f5e',
  pullback_10ema: '#38bdf8',
  reset_20ema: '#818cf8',
  high_tight_breakout: '#f59e0b',
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
  activeFolderId = 'action',
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
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showCheatSheet, setShowCheatSheet] = React.useState(false);
  const [showExpressionSection, setShowExpressionSection] = React.useState(false);
  const [exprValidation, setExprValidation] = React.useState({ valid: true, error: null });
  const [selectedIndustry, setSelectedIndustry] = React.useState('ALL');
  
  // Exclude Biotech Filter: Defaults ON for all screeners, persisted in localStorage
  const [excludeBiotech, setExcludeBiotech] = React.useState(() => {
    try {
      const saved = localStorage.getItem('pt_exclude_biotech');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('pt_exclude_biotech', String(excludeBiotech));
    } catch {}
  }, [excludeBiotech]);

  // Exclude In Watchlist Filter: Excludes candidates that are already in any user watchlist
  const [excludeInWatchlist, setExcludeInWatchlist] = React.useState(false);
  const [allWatchlistSymbols, setAllWatchlistSymbols] = React.useState(new Set());

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  const fetchAllWatchlistSymbols = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/symbols`);
      if (res.ok) {
        const data = await res.json();
        setAllWatchlistSymbols(new Set(data.map((s) => String(s).toUpperCase())));
      }
    } catch (e) {
      console.error('Error fetching all watchlist symbols:', e);
    }
  }, [API_BASE]);

  React.useEffect(() => {
    fetchAllWatchlistSymbols();
  }, [fetchAllWatchlistSymbols, watchlists]);

  const [previewGroupModal, setPreviewGroupModal] = React.useState(null);
  const [sortBy, setSortBy] = React.useState(() => activeScreenerId === 'watchlist_rvol' ? 'proj_rvol' : 'rs_rank');
  const [isLiveSyncing, setIsLiveSyncing] = React.useState(false);

  // Sync default state when folder or screener changes
  const prevScreenerRef = React.useRef({ folder: activeFolderId, screener: activeScreenerId });
  React.useEffect(() => {
    if (
      prevScreenerRef.current.folder !== activeFolderId ||
      prevScreenerRef.current.screener !== activeScreenerId
    ) {
      prevScreenerRef.current = { folder: activeFolderId, screener: activeScreenerId };
      if (activeScreenerId === 'watchlist_rvol' || activeScreenerId === 'zanger_zvr_breakout') {
        if (activeScreenerId === 'watchlist_rvol') setExcludeInWatchlist(false);
        setSortBy('proj_rvol');
      } else if (activeScreenerId === 'zanger_monster_growth' || activeScreenerId === 'zanger_hyper_growth') {
        setSortBy('eps_growth');
      } else if (
        sortBy === 'proj_rvol' ||
        sortBy === 'proj_rvol_asc' ||
        sortBy === 'eps_growth' ||
        sortBy === 'eps_growth_asc' ||
        sortBy === 'sales_growth' ||
        sortBy === 'sales_growth_asc'
      ) {
        setSortBy('rs_rank');
      }
    }
  }, [activeFolderId, activeScreenerId, sortBy]);

  // Top setup selection section collapse state with localStorage persistence
  const [isSetupSectionCollapsed, setIsSetupSectionCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('pt_screen_setup_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSetupCollapse = React.useCallback(() => {
    setIsSetupSectionCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pt_screen_setup_collapsed', String(next));
      } catch {}
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return next;
    });
  }, []);

  // Keyboard shortcut: Alt + S or Cmd/Ctrl + Shift + S to toggle setup selection collapse
  React.useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if ((e.altKey && (e.key === 's' || e.key === 'S')) || ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        toggleSetupCollapse();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleSetupCollapse]);

  const priceCacheRef = React.useRef(new Map());
  const pendingRequestsRef = React.useRef(new Map());
  const abortControllerRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const selectedItemRef = React.useRef(null);
  const selectedSymbolRef = React.useRef(null);
  const chartComponentRef = React.useRef(null);

  const {
    panelWidth: sidePanelWidth,
    isResizing: isResizingSidePanel,
    startResizing: startResizingSidePanel,
  } = useStockListResize({
    storageKey: 'pt_screener_side_panel_width',
    defaultWidth: 380,
    minWidth: 260,
  });

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

  // Helper to identify biotech and pharmaceutical stocks
  const isBiotechCandidate = React.useCallback((stock) => {
    if (!stock) return false;
    const ind = (stock.industry || stock.group_name || '').toLowerCase();
    const sec = (stock.sector || '').toLowerCase();
    return (
      ind.includes('biotech') ||
      ind.includes('pharmaceutical') ||
      ind.includes('pharma') ||
      sec.includes('biotech')
    );
  }, []);

  // Filter candidates before industry breakdown if excludeBiotech or excludeInWatchlist is active
  const isWatchlistQuery = React.useMemo(() => {
    return activeScreenerId === 'watchlist_rvol' || /\b(IN_WATCHLIST|WATCHLIST)\b/i.test(activeExpression || '');
  }, [activeScreenerId, activeExpression]);

  const isProjRvolActive = React.useMemo(() => {
    return activeScreenerId === 'watchlist_rvol' || /\bPROJ_RVOL\b/i.test(activeExpression || '');
  }, [activeScreenerId, activeExpression]);

  const isFundamentalGrowthActive = React.useMemo(() => {
    return (
      activeFolderId === 'dan_zanger' ||
      /\b(EPS_GROWTH|EPS_YOY|EPS_GROWTH_YOY|EPS_GROWTH_QOQ|SALES_GROWTH|SALES_YOY|REV_GROWTH|REV_YOY|SCREENER_ZANGER_)\b/i.test(activeExpression || '')
    );
  }, [activeFolderId, activeExpression]);

  const candidateTableColumns = React.useMemo(() => {
    if (isFundamentalGrowthActive && isProjRvolActive) {
      return ['symbol', 'proj_rvol', 'eps_growth', 'sales_growth', 'rs_rank'];
    }
    if (isFundamentalGrowthActive) {
      return ['symbol', 'eps_growth', 'sales_growth', 'rs_rank', 'ext_atr_50'];
    }
    if (isProjRvolActive) {
      return ['symbol', 'proj_rvol', 'rs_rank', 'ext_atr_50', 'rs_line'];
    }
    return ['symbol', 'rs_rank', 'ext_atr_50', 'rs_line'];
  }, [isFundamentalGrowthActive, isProjRvolActive]);

  const baseCandidates = React.useMemo(() => {
    let list = filteredCandidates || [];
    if (excludeBiotech) {
      list = list.filter((c) => !isBiotechCandidate(c));
    }
    if (excludeInWatchlist && !isWatchlistQuery) {
      list = list.filter((c) => !allWatchlistSymbols.has(c.symbol?.toUpperCase()));
    }
    return list;
  }, [filteredCandidates, excludeBiotech, isBiotechCandidate, excludeInWatchlist, isWatchlistQuery, allWatchlistSymbols]);

  // Industry/Group Breakdown and Filtering
  const industryCounts = React.useMemo(() => {
    const counts = {};
    baseCandidates.forEach((c) => {
      const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [baseCandidates]);

  const displayedCandidates = React.useMemo(() => {
    let list = baseCandidates;
    if (selectedIndustry && selectedIndustry !== 'ALL') {
      list = list.filter((c) => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return ind === selectedIndustry;
      });
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
      case 'proj_rvol':
        return copy.sort((a, b) => ((b.proj_rvol ?? b.rel_vol_50d) ?? -999) - ((a.proj_rvol ?? a.rel_vol_50d) ?? -999));
      case 'proj_rvol_asc':
        return copy.sort((a, b) => ((a.proj_rvol ?? a.rel_vol_50d) ?? 999) - ((b.proj_rvol ?? b.rel_vol_50d) ?? 999));
      case 'eps_growth':
        return copy.sort((a, b) => (b.eps_qoq_growth ?? -999999) - (a.eps_qoq_growth ?? -999999));
      case 'eps_growth_asc':
        return copy.sort((a, b) => (a.eps_qoq_growth ?? 999999) - (b.eps_qoq_growth ?? 999999));
      case 'sales_growth':
        return copy.sort((a, b) => (b.sales_yoy_growth ?? -999999) - (a.sales_yoy_growth ?? -999999));
      case 'sales_growth_asc':
        return copy.sort((a, b) => (a.sales_yoy_growth ?? 999999) - (b.sales_yoy_growth ?? 999999));
      case 'ext_atr_50_desc':
        return copy.sort((a, b) => (Number(b.ext_atr_50) || -999) - (Number(a.ext_atr_50) || -999));
      case 'ext_atr_50_asc':
        return copy.sort((a, b) => (Number(a.ext_atr_50) || 999) - (Number(b.ext_atr_50) || 999));
      case 'chg_pct_desc':
        return copy.sort((a, b) => ((b.today_pct ?? b.chg_pct) ?? -999) - ((a.today_pct ?? a.chg_pct) ?? -999));
      case 'chg_pct_asc':
        return copy.sort((a, b) => ((a.today_pct ?? a.chg_pct) ?? 999) - ((b.today_pct ?? b.chg_pct) ?? 999));
      default:
        return copy;
    }
  }, [baseCandidates, selectedIndustry, sortBy]);

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
  const currentCandidateRef = React.useRef(currentCandidate);
  React.useEffect(() => {
    currentCandidateRef.current = currentCandidate;
  }, [currentCandidate]);

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

  const activeScreenerTag = React.useMemo(() => {
    return curScreener?.tag || (activeFolderId === 'short' ? 'SHORT' : null);
  }, [curScreener, activeFolderId]);

  const activeTagConfig = React.useMemo(() => {
    if (!activeScreenerTag || !setupsConfig?.tags) return null;
    return setupsConfig.tags[activeScreenerTag] || null;
  }, [activeScreenerTag, setupsConfig]);

  const activeSetupName = React.useMemo(() => {
    if (curScreener?.name || curScreener?.label) {
      return curScreener.name || curScreener.label;
    }
    if (currentCandidate?.pp_is_setup) return 'Power Play';
    if (currentCandidate?.breakout_is_setup) return 'QM Breakout';
    if (currentCandidate?.ep_is_setup) return 'Episodic Pivot';
    if (currentCandidate?.parabolic_short_is_setup) return 'Parabolic Short';
    if (currentCandidate?.parabolic_long_is_setup) return 'Parabolic Long';
    if (currentCandidate?.vcp_is_setup) return 'Cup and Handle';
    if (currentCandidate?.cheat_is_setup) return 'Cheat';
    if (currentCandidate?.low_cheat_is_setup) return 'Low Cheat';
    if (currentCandidate?.ipo_days_count !== undefined && currentCandidate?.ipo_days_count <= 350) return 'IPO Base';
    return 'General';
  }, [curScreener, currentCandidate]);

  const activeScreenerColor = React.useMemo(() => {
    if (curScreener?.id && SETUP_COLORS[curScreener.id]) return SETUP_COLORS[curScreener.id];
    if (activeFolderId && SETUP_COLORS[activeFolderId]) return SETUP_COLORS[activeFolderId];
    return '#38bdf8';
  }, [curScreener, activeFolderId]);

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

  const fetchBrowsePrices = React.useCallback(async (symbol) => {
    if (!symbol) return;
    const sym = symbol.toUpperCase();

    // 1. Check in-memory caches for instant 0ms load
    if (globalStockDataCache.has(sym)) {
      const cached = globalStockDataCache.get(sym);
      if (Array.isArray(cached?.prices) && cached.prices.length > 0) {
        priceCacheRef.current.set(sym, cached.prices);
        setBrowsePrices(cached.prices);
        setLoadingBrowsePrices(false);
        return;
      }
    }
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
          const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=3500`, {
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
        if (globalStockDataCache.has(sym)) {
          const existing = globalStockDataCache.get(sym);
          globalStockDataCache.set(sym, { ...existing, prices: data });
        } else {
          globalStockDataCache.set(sym, { prices: data, detail: null, peersData: null });
        }
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
      if (!priceCacheRef.current.has(sym) && !globalStockDataCache.has(sym) && !pendingRequestsRef.current.has(sym)) {
        const reqPromise = (async () => {
          try {
            const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=3500`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                priceCacheRef.current.set(sym, data);
                if (globalStockDataCache.has(sym)) {
                  const existing = globalStockDataCache.get(sym);
                  globalStockDataCache.set(sym, { ...existing, prices: data });
                } else {
                  globalStockDataCache.set(sym, { prices: data, detail: null, peersData: null });
                }
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

  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = React.useState(new Set());
  const [watchlistFlags, setWatchlistFlags] = React.useState(new Map());
  const [watchlistToast, setWatchlistToast] = React.useState(null);

  const triggerToast = React.useCallback((msg) => {
    setWatchlistToast(msg);
    setTimeout(() => setWatchlistToast(null), 2200);
  }, []);

  const fetchWatchlistItems = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/items`);
      if (res.ok) {
        const data = await res.json();
        const symSet = new Set();
        const flagsMap = new Map();
        (data || []).forEach((item) => {
          const s = (item.symbol || '').toUpperCase();
          if (s) {
            symSet.add(s);
            if (item.flag_color) {
              flagsMap.set(s, item.flag_color);
            }
          }
        });
        setActiveWatchlistSymbols(symSet);
        setAllWatchlistSymbols(symSet);
        setWatchlistFlags(flagsMap);
      }
    } catch (e) {
      console.error("Error fetching watchlist items:", e);
    }
  }, [API_BASE]);

  React.useEffect(() => {
    fetchWatchlistItems();
  }, [fetchWatchlistItems]);

  const handleToggleWatchlist = React.useCallback(async (symbol, flagColor = undefined) => {
    if (!symbol) return;
    const symUpper = symbol.toUpperCase();
    const isSaved = activeWatchlistSymbols.has(symUpper);

    // Explicit remove action requested from popup
    if (flagColor === 'REMOVE') {
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/items/${encodeURIComponent(symUpper)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setActiveWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symUpper);
            return next;
          });
          setAllWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symUpper);
            return next;
          });
          setWatchlistFlags((prev) => {
            const next = new Map(prev);
            next.delete(symUpper);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
          triggerToast(`Removed ${symUpper} from Watchlist`);
        }
      } catch (e) {
        console.error(`Error removing watchlist item: ${e.message}`);
      }
      return;
    }

    // If stock is already saved and flagColor is provided (color string or null to unflag): update flag
    if (isSaved && flagColor !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/items/${encodeURIComponent(symUpper)}/flag`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flag_color: flagColor }),
        });
        if (res.ok) {
          setWatchlistFlags((prev) => {
            const next = new Map(prev);
            if (flagColor) next.set(symUpper, flagColor);
            else next.delete(symUpper);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
          const flagDef = flagColor ? FLAG_COLORS[flagColor] : null;
          triggerToast(flagDef ? `Flagged ${symUpper} as ${flagDef.label}` : `Unflagged ${symUpper}`);
        }
      } catch (e) {
        console.error(`Error updating watchlist flag: ${e.message}`);
      }
      return;
    }

    // Toggle behavior (called by W button or hotkey without flagColor)
    try {
      if (isSaved && flagColor === undefined) {
        const res = await fetch(`${API_BASE}/api/watchlists/items/${encodeURIComponent(symUpper)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setActiveWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symUpper);
            return next;
          });
          setAllWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symUpper);
            return next;
          });
          setWatchlistFlags((prev) => {
            const next = new Map(prev);
            next.delete(symUpper);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
          triggerToast(`Removed ${symUpper} from Watchlist`);
        }
      } else {
        // Add to watchlist (without flag if flagColor is null/undefined, or with selected flagColor)
        const targetColor = flagColor || null;
        const res = await fetch(`${API_BASE}/api/watchlists/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: symUpper, flag_color: targetColor }),
        });
        if (res.ok) {
          setActiveWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.add(symUpper);
            return next;
          });
          setAllWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.add(symUpper);
            return next;
          });
          setWatchlistFlags((prev) => {
            const next = new Map(prev);
            if (targetColor) next.set(symUpper, targetColor);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
          const flagDef = targetColor ? FLAG_COLORS[targetColor] : null;
          triggerToast(
            flagDef
              ? `⭐️ Added ${symUpper} as ${flagDef.label} to Watchlist`
              : `⭐️ Added ${symUpper} to Watchlist`
          );
        }
      }
    } catch (e) {
      console.error(`Error toggling watchlist item: ${e.message}`);
    }
  }, [API_BASE, activeWatchlistSymbols, fetchWatchlists, triggerToast]);

  const handleToggleWatchlistRef = React.useRef(handleToggleWatchlist);
  React.useEffect(() => {
    handleToggleWatchlistRef.current = handleToggleWatchlist;
  }, [handleToggleWatchlist]);

  // Keyboard Navigation across candidates and Watchlist Shortcut (W or S)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
        const sym = currentCandidateRef.current?.symbol;
        if (sym) {
          e.preventDefault();
          handleToggleWatchlistRef.current?.(sym);
        }
        return;
      }

      if (displayedCandidates.length === 0) return;
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

    if (allDisplayedAreAdded) {
      const confirmRemove = window.confirm(
        `Remove all ${symbols.length} candidate stocks from Watchlist?`
      );
      if (!confirmRemove) return;

      setIsProcessingAll(true);
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/items/remove-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          symbols.forEach(s => nextSet.delete(s.toUpperCase()));
          setActiveWatchlistSymbols(nextSet);
          setAllWatchlistSymbols(nextSet);
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
      const confirmAdd = window.confirm(
        `Add all ${symbols.length} candidate stocks into Watchlist?`
      );
      if (!confirmAdd) return;

      setIsProcessingAll(true);
      try {
        const res = await fetch(`${API_BASE}/api/watchlists/items/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          symbols.forEach(s => nextSet.add(s.toUpperCase()));
          setActiveWatchlistSymbols(nextSet);
          setAllWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
          setBatchFeedback(`✓ Added ${symbols.length}`);
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

  const handleExportTradingView = async () => {
    const targetSymbols = (isSelectMode && selectedSymbols && selectedSymbols.size > 0)
      ? Array.from(selectedSymbols).map((s) => String(s).toUpperCase())
      : displayedCandidates.map((c) => (c.symbol || '').toUpperCase()).filter(Boolean);

    if (targetSymbols.length === 0) {
      triggerToast("No candidates to copy");
      return;
    }

    const commaSeparated = targetSymbols.join(', ');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(commaSeparated);
        triggerToast(`Copied ${targetSymbols.length} symbol${targetSymbols.length > 1 ? 's' : ''} for TradingView`);
        return;
      }
    } catch (_) {}

    try {
      const textarea = document.createElement('textarea');
      textarea.value = commaSeparated;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        triggerToast(`Copied ${targetSymbols.length} symbol${targetSymbols.length > 1 ? 's' : ''} for TradingView`);
        return;
      }
    } catch (_) {}

    prompt("Copy comma-separated symbols for TradingView:", commaSeparated);
  };

  const renderDateAndSyncControls = (compact = false) => (
    <>
      {/* Date Navigation & Picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handlePrevDay}
          disabled={!canGoPrev}
          title={prevDate ? `Previous Day (${prevDate})` : 'No earlier trading date'}
          aria-label="Previous Day"
          style={{
            width: compact ? '26px' : '28px',
            height: compact ? '26px' : '28px',
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
          <svg width={compact ? "13" : "14"} height={compact ? "13" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            padding: compact ? '4px 6px' : '5px 8px',
            height: compact ? '26px' : '28px',
            fontSize: compact ? '11.5px' : '12px',
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
            width: compact ? '26px' : '28px',
            height: compact ? '26px' : '28px',
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
          <svg width={compact ? "13" : "14"} height={compact ? "13" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <button
        className="btn btn-secondary btn-sm"
        onClick={async () => {
          if (isLiveSyncing || syncStatus?.status === 'running') return;
          setIsLiveSyncing(true);
          try {
            const res = await handleTriggerLiveQuotesSync();
            priceCacheRef.current.clear();
            if (currentCandidateRef.current?.symbol) {
              fetchBrowsePrices(currentCandidateRef.current.symbol);
            }
            if (res) {
              if (res.status === 'skipped') {
                triggerToast(`⚡ ${res.reason || 'Market closed'}`);
              } else if (res.updated_count !== undefined) {
                triggerToast(`⚡ Synced ${res.updated_count} watchlist stock${res.updated_count === 1 ? '' : 's'}`);
              }
            }
          } finally {
            setIsLiveSyncing(false);
          }
        }}
        disabled={isLiveSyncing || syncStatus?.status === 'running' || loadingCandidates}
        title={(isLiveSyncing || syncStatus?.status === 'running') ? "Refreshing Watchlist Live Quotes..." : "Fast Sync Watchlist Live Quotes (<0.5s)"}
        style={{
          padding: compact ? '4px 8px' : '5px 10px',
          height: compact ? '26px' : '28px',
          fontSize: compact ? '13px' : '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: (isLiveSyncing || syncStatus?.status === 'running') ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.5)',
          border: (isLiveSyncing || syncStatus?.status === 'running') ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.4)',
          color: '#38bdf8',
          cursor: (isLiveSyncing || syncStatus?.status === 'running') ? 'not-allowed' : 'pointer',
          lineHeight: 1
        }}
      >
        <span className={(isLiveSyncing || syncStatus?.status === 'running') ? "spin-icon" : ""}>⚡</span>
      </button>
    </>
  );

  return (
    <div className="stock-screen-container">
      {/* Interactive Strategy & Filter controls */}
      {isSetupSectionCollapsed ? (
        <div
          className="glass-card"
          style={{
            marginBottom: '8px',
            padding: '6px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}
        >
          {/* Left: Active Setup Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
            {/* Active Setup Badge */}
            <div
              onClick={toggleSetupCollapse}
              title={`${curFolder?.name || 'Folder'} › ${curScreener?.name || curScreener?.label || activeSetupName}\nFormula: ${activeExpression || 'Default'}\nClick to expand setup selection (Alt + S)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(15, 23, 42, 0.55)',
                border: `1px solid ${activeScreenerColor}40`,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                {curFolder?.icon ? `${curFolder.icon} ` : '📁 '}{curFolder?.name || 'Daily'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>›</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: activeScreenerColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {curScreener?.icon ? `${curScreener.icon} ` : ''}{curScreener?.name || curScreener?.label || activeSetupName}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                background: `${activeScreenerColor}25`,
                color: activeScreenerColor,
                marginLeft: '4px'
              }}>
                {displayedCandidates.length}{selectedIndustry !== 'ALL' || excludeBiotech ? ` / ${filteredCandidates.length}` : ''}
              </span>
            </div>
          </div>

          {/* Right Action Controls: Date Picker, Live Sync & Setup Expand Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {renderDateAndSyncControls(true)}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleSetupCollapse}
              title="Expand setup selection to show folders and screeners (Alt + S)"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(56, 189, 248, 0.12)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span>▼</span>
              <span>Setups</span>
            </button>
          </div>
        </div>
      ) : (
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
                      padding: '0 12px',
                      height: '28px',
                      boxSizing: 'border-box',
                      fontSize: '12px',
                      fontWeight: isSelected ? '700' : '600',
                      lineHeight: 1,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                      border: `1px solid ${isSelected ? color : 'rgba(255, 255, 255, 0.12)'}`,
                      background: isSelected ? `${color}25` : 'rgba(15, 23, 42, 0.55)',
                      color: isSelected ? color : 'var(--text-secondary)',
                      boxShadow: isSelected ? `0 2px 8px ${color}35` : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', lineHeight: 1 }}>
                      {folder.icon ? <span style={{ fontSize: '12px', lineHeight: 1 }}>{folder.icon}</span> : null}
                      <span>{folder.name}</span>
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      lineHeight: 1,
                      padding: '2px 5px',
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

          {/* Right Action Controls: Standalone Date Picker, Live Quotes, Expression & Collapse Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {renderDateAndSyncControls(false)}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExpressionSection(!showExpressionSection)}
              style={{
                padding: '0 12px',
                height: '28px',
                boxSizing: 'border-box',
                lineHeight: 1,
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

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleSetupCollapse}
              title="Collapse setup selection to maximize chart space (Alt + S)"
              style={{
                padding: '0 10px',
                height: '28px',
                boxSizing: 'border-box',
                lineHeight: 1,
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: 'var(--text-secondary)'
              }}
            >
              <span>▲</span>
              <span>Collapse</span>
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
            background: activeFolderId === 'action'
              ? 'rgba(245, 158, 11, 0.08)'
              : activeFolderId === 'daily' 
                ? 'rgba(56, 189, 248, 0.08)' 
                : activeFolderId === 'weekly' 
                  ? 'rgba(168, 85, 247, 0.08)' 
                  : activeFolderId === 'short'
                    ? 'rgba(244, 63, 94, 0.08)'
                    : 'rgba(148, 163, 184, 0.08)',
            border: activeFolderId === 'action'
              ? '1px solid rgba(245, 158, 11, 0.25)'
              : activeFolderId === 'daily' 
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
                const screenerColor = SETUP_COLORS[screener.id] || (activeFolderId === 'action' ? '#f59e0b' : (activeFolderId === 'daily' ? '#38bdf8' : (activeFolderId === 'weekly' ? '#a855f7' : (activeFolderId === 'short' ? '#f43f5e' : '#94a3b8'))));

                return (
                  <button
                    key={screener.id}
                    type="button"
                    onClick={() => onSelectScreener(screener.id, screener.expression)}
                    title={screener.description || screener.expression || ''}
                    style={{
                      padding: '0 10px',
                      height: '26px',
                      boxSizing: 'border-box',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '700' : '500',
                      lineHeight: 1,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                      border: isActive ? `1px solid ${screenerColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isActive ? `${screenerColor}33` : 'rgba(15, 23, 42, 0.45)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: isActive ? `0 2px 6px ${screenerColor}30` : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {screener.icon ? <span style={{ fontSize: '11.5px', lineHeight: 1 }}>{screener.icon}</span> : null}
                    <span>{screener.name || screener.label}</span>
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
    )}

      {/* Stock Browse Mode Content */}
      {filteredCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          {loadingCandidates ? 'Loading candidates...' : 'No candidate stocks match your current active filters.'}
        </div>
      ) : baseCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          {excludeInWatchlist && !excludeBiotech ? (
            <>
              <p>All {filteredCandidates.length} candidates in this scan are already saved in your watchlists.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setExcludeInWatchlist(false)} style={{ marginTop: '10px' }}>
                Include Watchlist Stocks ({filteredCandidates.length})
              </button>
            </>
          ) : excludeInWatchlist && excludeBiotech ? (
            <>
              <p>All {filteredCandidates.length} candidates were excluded by active filters (Biotech or already in Watchlist).</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setExcludeInWatchlist(false)}>
                  Include Watchlist
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setExcludeBiotech(false)}>
                  Include Biotech
                </button>
              </div>
            </>
          ) : (
            <>
              <p>All {filteredCandidates.length} candidates in this scan were excluded as Biotech / Pharmaceuticals.</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setExcludeBiotech(false)} style={{ marginTop: '10px' }}>
                Include Biotech ({filteredCandidates.length})
              </button>
            </>
          )}
        </div>
      ) : displayedCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          <p>No candidates found in industry/group <strong>"{selectedIndustry}"</strong>.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIndustry('ALL')} style={{ marginTop: '10px' }}>
            Show All Industry Groups ({baseCandidates.length})
          </button>
        </div>
      ) : (
        <div
          className="browse-split-container"
          style={{
            position: 'relative',
            gap: 0,
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            background: 'var(--bg-primary)'
          }}
        >
          {/* Watchlist Toast Notification */}
          {watchlistToast && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              zIndex: 9999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              pointerEvents: 'none'
            }}>
              ✓ {watchlistToast}
            </div>
          )}

          {/* Main Browse Column (Left) with Unified StockView */}
          <div className="browse-main-col" style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            <StockView
              ref={chartComponentRef}
              stock={currentCandidate}
              prices={browsePrices}
              loadingPrices={loadingBrowsePrices}
              setupName={activeSetupName}
              asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
              targetWatchlistSymbols={activeWatchlistSymbols}
              targetWatchlistFlags={watchlistFlags}
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

          {/* Resizable Vertical Splitter */}
          <StockListSplitter
            isResizing={isResizingSidePanel}
            onMouseDown={startResizingSidePanel}
          />

          {/* Candidate List Ribbon (Right Column) */}
          <div
            className="browse-side-col"
            style={{
              width: `${sidePanelWidth}px`,
              minWidth: 0,
              flex: `0 0 ${sidePanelWidth}px`,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary)',
              overflow: 'hidden',
              padding: 0
            }}
          >
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
              gap: '6px'
            }}>
              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Total ({displayedCandidates.length}{selectedIndustry !== 'ALL' || excludeBiotech || excludeInWatchlist ? ` / ${filteredCandidates.length}` : ''})
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleToggleAllWatchlist}
                  disabled={displayedCandidates.length === 0 || isProcessingAll}
                  title={allDisplayedAreAdded
                    ? `Remove all ${displayedCandidates.length} candidate stocks from Watchlist`
                    : `Add all ${displayedCandidates.length} candidate stocks into Watchlist`
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
                    <><span>⭐️</span> Remove All</>
                  ) : (
                    <><span>⭐️</span> Add All</>
                  )}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportTradingView}
                  disabled={displayedCandidates.length === 0}
                  title="Copy comma-separated symbols for TradingView"
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            <StockList
              items={displayedCandidates}
              selectedStock={currentCandidate}
              selectedSymbol={currentCandidate?.symbol}
              onSelectStock={(stk) => {
                if (stk) {
                  const idx = displayedCandidates.findIndex((c) => c === stk || c.symbol === stk.symbol);
                  if (idx !== -1) setBrowseIndex(idx);
                }
              }}
              columns={candidateTableColumns}
              sortBy={sortBy}
              onSortChange={(newSort) => {
                setSortBy(newSort);
                setBrowseIndex(0);
              }}
              showIndustryFilter={true}
              selectedIndustry={selectedIndustry}
              onIndustryChange={(newInd) => {
                setSelectedIndustry(newInd);
                setBrowseIndex(0);
              }}
              industryCounts={industryCounts}
              hideHeaderSelectButton={true}
              filterExtra={({ isSelectMode, toggleSelectMode }) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setExcludeBiotech((prev) => !prev);
                      setBrowseIndex(0);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '3px 5px',
                      borderRadius: '5px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      background: excludeBiotech ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${excludeBiotech ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: excludeBiotech ? '#f87171' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2
                    }}
                    title="Jeff Sun & Stockbee Rule: Exclude binary clinical biotech & pharmaceutical stocks from candidate scans"
                  >
                    {excludeBiotech ? (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="2" y="2" width="12" height="12" rx="3" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5" />
                        <path d="M4.8 8.2L7 10.4L11.5 5.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                    <span>No Biotech</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExcludeInWatchlist((prev) => !prev);
                      setBrowseIndex(0);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '3px 5px',
                      borderRadius: '5px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      background: excludeInWatchlist ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${excludeInWatchlist ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: excludeInWatchlist ? '#38bdf8' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2
                    }}
                    title="Exclude candidates that are already saved in any of your watchlists"
                  >
                    {excludeInWatchlist ? (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="2" y="2" width="12" height="12" rx="3" fill="#38bdf8" stroke="#38bdf8" strokeWidth="1.5" />
                        <path d="M4.8 8.2L7 10.4L11.5 5.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                    <span>Not Watched</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSelectMode}
                    style={{
                      background: isSelectMode ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelectMode ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: isSelectMode ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)',
                      borderRadius: '5px',
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      lineHeight: 1.2,
                      transition: 'all 0.15s ease'
                    }}
                    title={isSelectMode ? "Exit select mode" : "Select multiple candidates for batch watchlist actions"}
                  >
                    <span>{isSelectMode ? '✓ Done' : '☑ Select'}</span>
                  </button>
                </div>
              )}
              renderCell={(colKey, c) => {
                if (colKey === 'symbol') {
                  const symUpper = (c.symbol || '').toUpperCase();
                  const isItemSaved = activeWatchlistSymbols.has(symUpper);
                  const savedFlag = watchlistFlags.get(symUpper);
                  const flagDef = savedFlag ? FLAG_COLORS[savedFlag] : null;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <StockBrandIcon symbol={c.symbol} size={18} />
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>{c.symbol}</span>
                      {isItemSaved && (
                        flagDef ? (
                          <span
                            style={{
                              fontSize: '11px',
                              lineHeight: 1,
                              color: flagDef.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              pointerEvents: 'none',
                              userSelect: 'none',
                              filter: `drop-shadow(0 0 3px ${flagDef.color}80)`,
                            }}
                            title={`Saved in Watchlist (${flagDef.label})`}
                          >
                            ⚑
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              pointerEvents: 'none',
                              userSelect: 'none',
                              filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.5))',
                            }}
                            title="Saved in Watchlist"
                          >
                            ⭐️
                          </span>
                        )
                      )}
                    </div>
                  );
                }
              }}
              enableSelectMode={true}
              targetWatchlistSymbols={activeWatchlistSymbols}
              onBatchAddToWatchlist={async (_, symbolsArray) => {
                if (!symbolsArray || symbolsArray.length === 0) return;
                try {
                  const res = await fetch(`${API_BASE}/api/watchlists/items/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: symbolsArray })
                  });
                  if (res.ok) {
                    fetchWatchlistItems();
                    if (fetchWatchlists) fetchWatchlists();
                    triggerToast(`Added ${symbolsArray.length} to Watchlist`);
                  }
                } catch (e) {
                  console.error('Error adding batch to watchlist:', e);
                }
              }}
              loading={loadingCandidates}
              loadingMessage="Scanning screener setups..."
              emptyMessage="No candidates found."
              enableKeyboardNav={false}
              autoScrollSelected={true}
            />
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
