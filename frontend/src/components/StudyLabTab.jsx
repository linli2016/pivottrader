import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StockView from './stock-view';
import StockList, { StockListSplitter, useStockListResize } from './stock-list';
import StockBrandIcon from './StockBrandIcon';
import GroupStageChart from './GroupStageChart';
import { getLocalDateStr } from '../utils/dateUtils';
import { SETUP_TAG_META } from './stock-list/StockListRow';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

const SETUP_COLORS = {
  // Folders
  action: '#f59e0b',
  daily: '#38bdf8',
  weekly: '#a855f7',
  study: '#38bdf8',
  short: '#f43f5e',
  others: '#94a3b8',
  // Action Setups
  vdu_coils: '#10b981',
  zanger_breakout: '#ec4899',
  PB: '#8b5cf6',
  pullback: '#8b5cf6',
  // Study Setups
  high_rvol: '#38bdf8',
  confirmed_staged: '#10b981',
  stage1: '#38bdf8',
  stage2: '#10b981',
  stage3: '#f59e0b',
  stage4: '#f43f5e',
  all: '#a855f7',
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
  confirmed_staged: '#10b981',
  stage1: '#38bdf8',
  stage2: '#10b981',
  stage3: '#f59e0b',
  stage4: '#f43f5e',
  all: '#64748b',
  vcp: '#10b981',
};

const SETUP_CANONICAL_NAMES = {
  PB: 'Pullback',
  pullback: 'Pullback',
  power_play: 'Power Play',
  breakout: 'QM Breakouts',
  breakouts: 'QM Breakouts',
  qm_breakouts: 'QM Breakouts',
  standard: 'QM Breakouts',
  episodic_pivot: 'Episodic Pivot',
  ep_9_million: 'EP9 Million',
  parabolic: 'Parabolic Short',
  parabolic_short: 'Parabolic Short',
  parabolic_long: 'Parabolic Long',
  weinstein_breakdown: 'Stage 4 Breakdown',
  weinstein_pullback: 'Pullback to 200D MA',
  stage4_continuation: 'Stage 4 Continuation',
  gap_breakdown: 'Downside Gap Breakdown',
  cup_and_handle: 'Cup and Handle',
  cheat: 'Cheat / 3-C',
  low_cheat: 'Low Cheat',
  momentum: 'Momentum Universe',
  leaders: 'Leaders',
  gainers: 'All Gainers',
  '1m': '1M Gainers',
  '3m': '3M Gainers',
  '6m': '6M Gainers',
  all: 'All Gainers + Stage 2',
  ipo_base: 'IPO Base',
  lead: 'Lead',
  mediocre: 'Mediocre',
  lag: 'Lag',
  pullback_10ema: '10-EMA Pullback',
  reset_20ema: '20-EMA Reset',
  high_tight_breakout: 'High Tight Breakout',
  confirmed_staged: 'Confirmed Staged',
  stage1: 'Stage 1 Basing',
  stage2: 'Stage 2 Advancing',
  stage3: 'Stage 3 Topping',
  stage4: 'Stage 4 Declining',
  trend_1m: '1 Month Trend',
  trend_1_4m: '1~4 Month Trend',
  trend_5m: '5 Months Trend',
  vcp: 'Minervini VCP',
};

// Deduplicate candidates to show each stock just once, taking the first occurrence chronologically as the date
export const deduplicateByFirstOccurrence = (candidates) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const sorted = [...candidates].sort((a, b) => {
    const dateA = a.setup_date || a.date || a.screen_date || a.added_at || '';
    const dateB = b.setup_date || b.date || b.screen_date || b.added_at || '';
    const cmp = String(dateA).localeCompare(String(dateB));
    if (cmp !== 0) return cmp;
    return (a.symbol || '').localeCompare(b.symbol || '');
  });

  const seen = new Set();
  const unique = [];
  for (const cand of sorted) {
    if (!cand?.symbol) continue;
    const sym = cand.symbol.toUpperCase();
    if (!seen.has(sym)) {
      seen.add(sym);
      unique.push(cand);
    }
  }
  return unique;
};

export default function StudyLabTab({
  onSelectStock = null,
  watchlists = [],
  fetchWatchlists = () => {},
  setupsConfig = { folders: [], setups: [], filters: {} }
}) {
  // Navigation & Screener State (Defaults to Weekly Top Gainers)
  const [activeFolderId, setActiveFolderId] = useState('weekly');
  const [activeScreenerId, setActiveScreenerId] = useState('gainers');
  const [folderMemory, setFolderMemory] = useState({});
  const [setupType, setSetupType] = useState('gainers');

  // Chart & Row References
  const chartRef = useRef(null);
  const selectedCandidateRowRef = useRef(null);
  const priceCacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

  // Date range presets & Month/Year selection
  const todayObj = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => todayObj.getFullYear(), [todayObj]);
  const currentMonth = useMemo(() => todayObj.getMonth() + 1, [todayObj]);
  const todayStr = useMemo(() => getLocalDateStr(), []);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);

  // Studied months persistence
  const [studiedMonths, setStudiedMonths] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_study_completed_months');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isMonthStudied = useCallback((year, month) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return studiedMonths.includes(key);
  }, [studiedMonths]);

  const toggleMonthStudied = useCallback((year, month) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    setStudiedMonths((prev) => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try {
        localStorage.setItem('pt_study_completed_months', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save studied months:', err);
      }
      return next;
    });
  }, []);

  const availableYears = useMemo(() => {
    const years = [];
    const minYear = 2015;
    for (let y = currentYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const MONTH_OPTIONS = useMemo(() => [
    { value: 1, label: '01 - Jan', short: 'Jan' },
    { value: 2, label: '02 - Feb', short: 'Feb' },
    { value: 3, label: '03 - Mar', short: 'Mar' },
    { value: 4, label: '04 - Apr', short: 'Apr' },
    { value: 5, label: '05 - May', short: 'May' },
    { value: 6, label: '06 - Jun', short: 'Jun' },
    { value: 7, label: '07 - Jul', short: 'Jul' },
    { value: 8, label: '08 - Aug', short: 'Aug' },
    { value: 9, label: '09 - Sep', short: 'Sep' },
    { value: 10, label: '10 - Oct', short: 'Oct' },
    { value: 11, label: '11 - Nov', short: 'Nov' },
    { value: 12, label: '12 - Dec', short: 'Dec' },
  ], []);

  const getMonthRange = useCallback((year, month) => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start: startStr, end: endStr };
  }, []);

  // Default date range is the current month
  const initialRange = useMemo(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start: startStr, end: endStr };
  }, []);

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [activeDatePreset, setActiveDatePreset] = useState('current_month');

  // Execution & Candidates State
  const [loading, setLoading] = useState(false);
  const [rawCandidates, setRawCandidates] = useState([]);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [error, setError] = useState(null);

  // Filters on Candidates List
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');
  const [previewGroupModal, setPreviewGroupModal] = useState(null);

  // Watchlist integration
  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = useState(new Set());

  // Model Book Saved State (for quick 1-click toggle)
  const [savedTrades, setSavedTrades] = useState([]);
  const [savingToModelBook, setSavingToModelBook] = useState(false);

  const {
    panelWidth: sidePanelWidth,
    isResizing: isResizingSidePanel,
    startResizing: startResizingSidePanel,
  } = useStockListResize({
    storageKey: 'pt_study_side_panel_width',
    defaultWidth: 360,
    minWidth: 260,
  });

  // Top setup selection section collapse state with localStorage persistence
  const [isSetupSectionCollapsed, setIsSetupSectionCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pt_study_setup_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSetupCollapse = useCallback(() => {
    setIsSetupSectionCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pt_study_setup_collapsed', String(next));
      } catch {}
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return next;
    });
  }, []);

  // Keyboard shortcut: Alt + S or Cmd/Ctrl + Shift + S to toggle setup selection collapse
  useEffect(() => {
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

  // Setup Config Helpers
  const curFolder = useMemo(() => {
    const visibleFolders = (setupsConfig?.folders || []).filter(f => f.visible !== false);
    return visibleFolders.find(f => f.id === activeFolderId) || visibleFolders[0] || (setupsConfig?.folders || [])[0] || null;
  }, [setupsConfig, activeFolderId]);

  const curScreener = useMemo(() => {
    if (curFolder?.screeners) {
      const match = curFolder.screeners.find(s => s.id === activeScreenerId);
      if (match) return match;
    }
    for (const f of (setupsConfig?.folders || [])) {
      const match = f.screeners?.find(s => s.id === activeScreenerId);
      if (match) return match;
    }
    return (setupsConfig?.setups || []).find(s => s.id === activeScreenerId || s.id === setupType) || null;
  }, [setupsConfig, curFolder, activeScreenerId, setupType]);

  const currentSetupDisplayName = curScreener?.name || curScreener?.label || SETUP_CANONICAL_NAMES[setupType] || 'Setup';

  const activeScreenerColor = useMemo(() => {
    if (curScreener?.id && SETUP_COLORS[curScreener.id]) return SETUP_COLORS[curScreener.id];
    if (activeFolderId && SETUP_COLORS[activeFolderId]) return SETUP_COLORS[activeFolderId];
    return '#38bdf8';
  }, [curScreener, activeFolderId]);

  // Watchlist Sync
  const fetchWatchlistItems = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/items`);
      if (res.ok) {
        const data = await res.json();
        const symSet = new Set(data.map(item => (item.symbol || '').toUpperCase()));
        setActiveWatchlistSymbols(symSet);
      }
    } catch (e) {
      console.error('Error fetching watchlist items:', e);
    }
  }, []);

  useEffect(() => {
    fetchWatchlistItems();
  }, [fetchWatchlistItems]);

  const handleToggleWatchlist = async (symbol) => {
    if (!symbol) return;
    const symUpper = symbol.toUpperCase();
    const isSaved = activeWatchlistSymbols.has(symUpper);

    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/watchlists/items/${encodeURIComponent(symUpper)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.delete(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      } else {
        const res = await fetch(`${API_BASE}/api/watchlists/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: symUpper }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.add(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      }
    } catch (e) {
      console.error('Error toggling watchlist:', e);
    }
  };

  // Price Fetcher & In-memory Cache
  const fetchStockPrices = useCallback(async (symbol) => {
    if (!symbol) return [];
    const sym = symbol.toUpperCase();
    if (priceCacheRef.current.has(sym)) {
      return priceCacheRef.current.get(sym);
    }
    if (pendingRequestsRef.current.has(sym)) {
      return pendingRequestsRef.current.get(sym);
    }

    const reqPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=3500`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            priceCacheRef.current.set(sym, data);
            return data;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch prices for ${sym}:`, err);
      } finally {
        pendingRequestsRef.current.delete(sym);
      }
      return [];
    })();

    pendingRequestsRef.current.set(sym, reqPromise);
    return reqPromise;
  }, []);

  const prefetchSymbols = useCallback((symbols) => {
    if (!Array.isArray(symbols) || symbols.length === 0) return;
    symbols.forEach(sym => {
      if (!sym) return;
      const s = sym.toUpperCase();
      if (!priceCacheRef.current.has(s) && !pendingRequestsRef.current.has(s)) {
        fetchStockPrices(s);
      }
    });
  }, [fetchStockPrices]);

  // Load Saved Model Book for matching saved badges
  const fetchSavedTrades = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved`);
      if (res.ok) {
        const data = await res.json();
        setSavedTrades(data || []);
      }
    } catch (e) {
      console.error('Error fetching saved trades:', e);
    }
  }, []);

  useEffect(() => {
    fetchSavedTrades();
  }, [fetchSavedTrades]);

  const isCandidateSaved = useCallback((cand) => {
    if (!cand) return false;
    const date = cand.setup_date || cand.date || cand.screen_date;
    return savedTrades.some(
      t => t.symbol.toUpperCase() === cand.symbol.toUpperCase() && t.setup_date === date
    );
  }, [savedTrades]);

  const getSavedTradeForCandidate = useCallback((cand) => {
    if (!cand) return null;
    const date = cand.setup_date || cand.date || cand.screen_date;
    return savedTrades.find(
      t => t.symbol.toUpperCase() === cand.symbol.toUpperCase() && t.setup_date === date
    );
  }, [savedTrades]);

  const availableTags = useMemo(() => {
    if (setupsConfig?.tags && Object.keys(setupsConfig.tags).length > 0) {
      return Object.values(setupsConfig.tags);
    }
    return Object.values(SETUP_TAG_META);
  }, [setupsConfig]);

  // Save Candidate to Model Book with target tag
  const handleSaveCandidateWithTag = async (cand, targetTag, targetTagName) => {
    if (!cand) return;
    setSavingToModelBook(true);
    const date = cand.setup_date || cand.date || cand.screen_date;
    const existing = getSavedTradeForCandidate(cand);

    const tagDef = availableTags.find(t => t.id === targetTag) || SETUP_TAG_META[targetTag] || { id: targetTag, name: targetTagName || targetTag, label: targetTag };
    const setupName = targetTagName || tagDef.name || tagDef.label || targetTag;

    const payload = {
      ...(existing?.id ? { id: existing.id } : {}),
      symbol: cand.symbol.toUpperCase(),
      setup_date: date,
      setup_type: targetTag,
      setup_name: setupName,
      market_regime: cand.market_regime || 'UNKNOWN',
      notes: existing?.notes || '',
      tags: [targetTag]
    };

    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedTrades(prev => [saved, ...prev.filter(t => t.id !== saved.id)]);
      }
    } catch (e) {
      console.error('Error saving to model book:', e);
    } finally {
      setSavingToModelBook(false);
      setShowSavePopup(false);
    }
  };

  // Remove Candidate from Model Book
  const handleRemoveSavedCandidate = async (cand) => {
    if (!cand) return;
    const existing = getSavedTradeForCandidate(cand);
    if (!existing) return;

    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${existing.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedTrades(prev => prev.filter(t => t.id !== existing.id));
      }
    } catch (e) {
      console.error('Error deleting from model book:', e);
    } finally {
      setShowSavePopup(false);
    }
  };

  // Quick hotkey toggle for Model Book
  const handleToggleSaveCandidateQuick = async (cand) => {
    if (!cand) return;
    const existing = getSavedTradeForCandidate(cand);
    if (existing) {
      await handleRemoveSavedCandidate(cand);
    } else {
      const defaultTag = cand.setup_tag || cand.tag || curScreener?.tag || 'BO';
      const tagDef = availableTags.find(t => t.id === defaultTag) || SETUP_TAG_META[defaultTag];
      await handleSaveCandidateWithTag(cand, defaultTag, tagDef?.name || defaultTag);
    }
  };

  // Run Setup Scan across date range
  const handleRunScan = useCallback(async (customSetupId, customDates) => {
    const sId = customSetupId || activeScreenerId || setupType || 'power_play';
    const sDate = customDates?.start || startDate;
    const eDate = customDates?.end || endDate;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        setup_type: sId,
        start_date: sDate,
        end_date: eDate,
        forward_days: 25,
        filters: {}
      };

      const res = await fetch(`${API_BASE}/api/model-book/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Scan failed');
      }

      const data = await res.json();
      const raw = data.candidates || data.trades || data.all_candidates || [];
      const candidates = deduplicateByFirstOccurrence(raw);
      setRawCandidates(candidates);
      setBrowseIndex(0);

      if (candidates.length > 0) {
        prefetchSymbols(candidates.slice(0, 10).map(c => c.symbol));
      } else {
        setStockPrices([]);
      }
    } catch (e) {
      console.error('Error running study scan:', e);
      setError(e.message || 'Error executing study scan');
    } finally {
      setLoading(false);
    }
  }, [activeScreenerId, setupType, startDate, endDate, prefetchSymbols]);

  // Initial Scan on Mount (defaults to Weekly folder & Top Gainers screener)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;

    const folders = setupsConfig?.folders || [];
    const visibleFolders = folders.filter(f => f.visible !== false);
    const weeklyFolder = visibleFolders.find(f => f.id === 'weekly' || f.name?.toLowerCase() === 'weekly') ||
                         visibleFolders[0] || null;

    let targetScreenerId = 'gainers';
    let targetFolderId = 'weekly';

    if (weeklyFolder) {
      targetFolderId = weeklyFolder.id;
      const visibleScreeners = (weeklyFolder.screeners || []).filter(s => s.visible !== false);
      const candidateList = visibleScreeners.length > 0 ? visibleScreeners : (weeklyFolder.screeners || []);
      const gainersScreener = candidateList.find(s => s.id === 'gainers') ||
                              candidateList.find(s => s.id === weeklyFolder.default_screener_id) ||
                              candidateList[0];
      targetScreenerId = gainersScreener?.id || 'gainers';

      setActiveFolderId(targetFolderId);
      setActiveScreenerId(targetScreenerId);
      setSetupType(targetScreenerId);
    }

    initializedRef.current = true;
    handleRunScan(targetScreenerId, { start: startDate, end: endDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupsConfig]);

  // Filter candidates by Industry & Stage 2
  const industryCounts = useMemo(() => {
    const counts = {};
    (rawCandidates || []).forEach(c => {
      const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [rawCandidates]);

  const displayedCandidates = useMemo(() => {
    let list = rawCandidates || [];

    if (selectedIndustry === 'MIN_3') {
      const validIndustries = new Set(
        industryCounts.filter(ic => ic.count >= 3).map(ic => ic.industry)
      );
      list = list.filter(c => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return validIndustries.has(ind);
      });
    } else if (selectedIndustry === 'LESS_3') {
      const validIndustries = new Set(
        industryCounts.filter(ic => ic.count < 3).map(ic => ic.industry)
      );
      list = list.filter(c => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return validIndustries.has(ind);
      });
    } else if (selectedIndustry !== 'ALL') {
      list = list.filter(c => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return ind === selectedIndustry;
      });
    }

    const uniqueList = deduplicateByFirstOccurrence(list);

    return [...uniqueList].sort((a, b) => {
      const dateA = a.setup_date || a.date || a.added_at || '';
      const dateB = b.setup_date || b.date || b.added_at || '';
      const cmp = String(dateA).localeCompare(String(dateB));
      if (cmp !== 0) return cmp;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });
  }, [rawCandidates, selectedIndustry, industryCounts]);

  const currentCandidate = displayedCandidates[browseIndex] || null;

  // Load prices for currently active candidate
  useEffect(() => {
    if (!currentCandidate) {
      setStockPrices([]);
      return;
    }
    let isCancelled = false;
    setLoadingPrices(true);

    fetchStockPrices(currentCandidate.symbol).then(prices => {
      if (!isCancelled) {
        setStockPrices(prices);
        setLoadingPrices(false);
      }
    });

    if (displayedCandidates.length > 1) {
      const targets = [];
      if (browseIndex + 1 < displayedCandidates.length) targets.push(displayedCandidates[browseIndex + 1]?.symbol);
      if (browseIndex + 2 < displayedCandidates.length) targets.push(displayedCandidates[browseIndex + 2]?.symbol);
      if (browseIndex > 0) targets.push(displayedCandidates[browseIndex - 1]?.symbol);
      prefetchSymbols(targets);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentCandidate, browseIndex, displayedCandidates, fetchStockPrices, prefetchSymbols]);

  // Auto-scroll selected candidate row into view
  useEffect(() => {
    if (selectedCandidateRowRef.current) {
      selectedCandidateRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [browseIndex]);

  // Keyboard navigation: Arrow keys and J / K
  useEffect(() => {
    if (displayedCandidates.length === 0) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 's' || e.key === 'S') {
        if (currentCandidate) {
          e.preventDefault();
          handleToggleSaveCandidateQuick(currentCandidate);
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setBrowseIndex(prev => Math.max(prev - 1, 0));
        setShowSavePopup(false);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setBrowseIndex(prev => Math.min(prev + 1, displayedCandidates.length - 1));
        setShowSavePopup(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedCandidates.length, currentCandidate, handleToggleSaveCandidateQuick]);

  // Handlers for Folder & Screener clicks
  const handleSelectFolder = (folderId) => {
    setActiveFolderId(folderId);
    const folder = (setupsConfig?.folders || []).find(f => f.id === folderId);
    if (!folder || !folder.screeners || folder.screeners.length === 0) return;

    const visibleScreeners = folder.screeners.filter(s => s.visible !== false);
    const candidateList = visibleScreeners.length > 0 ? visibleScreeners : folder.screeners;
    const rememberedId = folderMemory[folderId];
    const screener = candidateList.find(s => s.id === folder.default_screener_id) ||
                     (rememberedId && candidateList.find(s => s.id === rememberedId)) ||
                     candidateList[0];
    if (screener) {
      setActiveScreenerId(screener.id);
      setSetupType(screener.id);
      handleRunScan(screener.id, { start: startDate, end: endDate });
    }
  };

  const handleSelectScreener = (screenerId) => {
    setActiveScreenerId(screenerId);
    setSetupType(screenerId);
    setFolderMemory(prev => ({
      ...prev,
      [activeFolderId]: screenerId
    }));
    handleRunScan(screenerId, { start: startDate, end: endDate });
  };

  const handleYearChange = (newYear) => {
    const yr = parseInt(newYear, 10);
    setSelectedYear(yr);
    const range = getMonthRange(yr, selectedMonth);
    setStartDate(range.start);
    setEndDate(range.end);
    setActiveDatePreset(null);
    handleRunScan(activeScreenerId, { start: range.start, end: range.end });
  };

  const handleMonthSelect = (newMonth) => {
    const m = parseInt(newMonth, 10);
    setSelectedMonth(m);
    const range = getMonthRange(selectedYear, m);
    setStartDate(range.start);
    setEndDate(range.end);
    setActiveDatePreset(null);
    setShowMonthDropdown(false);
    handleRunScan(activeScreenerId, { start: range.start, end: range.end });
  };

  const handleDatePresetSelect = (preset) => {
    setActiveDatePreset(preset.id);
    setStartDate(preset.start);
    setEndDate(preset.end);
    handleRunScan(activeScreenerId, { start: preset.start, end: preset.end });
  };



  // RS Blue Dot indicator
  const currentHasBlueDot = useMemo(() => {
    if (currentCandidate?.is_rs_blue_dot) return true;
    if (stockPrices && stockPrices.length > 0) {
      const recent = stockPrices.slice(-5);
      return recent.some(b => b.is_rs_blue_dot);
    }
    return false;
  }, [currentCandidate, stockPrices]);

  // Export CSV
  const handleExportCSV = () => {
    if (displayedCandidates.length === 0) return;
    const headers = ['Symbol', 'Date', 'Name', 'Sector', 'Industry', 'Close', 'ADR20d', 'RS_Rank', 'TI65', 'ER20', 'Ret_1M', 'Ret_3M', 'Ret_6M', 'Inst_Holders'];
    const rows = displayedCandidates.map(c => [
      c.symbol,
      c.setup_date || c.date || '',
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.sector || '').replace(/"/g, '""')}"`,
      `"${(c.industry || '').replace(/"/g, '""')}"`,
      c.close ?? '',
      c.adr_20d ?? '',
      c.rs_rank ?? '',
      c.ti_65 ?? '',
      c.er_20d ?? '',
      c.ret_1m ?? '',
      c.ret_3m ?? '',
      c.ret_6m ?? '',
      c.inst_holders_count ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `study_lab_${activeScreenerId}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDateAndScanControls = (compact = false) => (
    <>
      {/* Year & Month Selection with Studied Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {/* Year Dropdown */}
        <select
          value={selectedYear}
          onChange={e => handleYearChange(e.target.value)}
          title="Select study year"
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: compact ? '2px 5px' : '3px 7px',
            height: compact ? '26px' : '28px',
            fontSize: compact ? '11px' : '11.5px',
            fontWeight: '700',
            cursor: 'pointer',
            outline: 'none',
            colorScheme: 'dark'
          }}
        >
          {availableYears.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>

        {/* Month Dropdown Container with Studied Checkbox */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.9)',
              border: isMonthStudied(selectedYear, selectedMonth)
                ? '1px solid rgba(16, 185, 129, 0.6)'
                : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              height: compact ? '26px' : '28px',
              padding: '0 6px',
              gap: '5px',
              boxSizing: 'border-box'
            }}
          >
            <input
              type="checkbox"
              checked={isMonthStudied(selectedYear, selectedMonth)}
              onChange={(e) => {
                e.stopPropagation();
                toggleMonthStudied(selectedYear, selectedMonth);
              }}
              title={`Mark ${selectedYear}-${String(selectedMonth).padStart(2, '0')} as studied`}
              style={{
                cursor: 'pointer',
                accentColor: '#10b981',
                width: '13px',
                height: '13px',
                margin: 0
              }}
            />
            <button
              type="button"
              onClick={() => setShowMonthDropdown(prev => !prev)}
              title="Select Month & View Studied Months"
              style={{
                background: 'transparent',
                border: 'none',
                color: isMonthStudied(selectedYear, selectedMonth) ? '#34d399' : '#f8fafc',
                fontSize: compact ? '11px' : '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                outline: 'none'
              }}
            >
              <span>{MONTH_OPTIONS.find(m => m.value === selectedMonth)?.short || selectedMonth}</span>
              <span style={{ fontSize: '8px', opacity: 0.7 }}>▼</span>
            </button>
          </div>

          {showMonthDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                onClick={() => setShowMonthDropdown(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 5px)',
                  left: 0,
                  zIndex: 9999,
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  minWidth: '175px',
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                <div style={{
                  fontSize: '10.5px',
                  color: '#94a3b8',
                  padding: '3px 8px 4px',
                  fontWeight: 700,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Months ({selectedYear})</span>
                  <span style={{ color: '#10b981', fontSize: '10px' }}>
                    {MONTH_OPTIONS.filter(m => isMonthStudied(selectedYear, m.value)).length}/12 studied
                  </span>
                </div>

                {MONTH_OPTIONS.map((m) => {
                  const isSelected = selectedMonth === m.value;
                  const isStudied = isMonthStudied(selectedYear, m.value);
                  return (
                    <div
                      key={m.value}
                      onClick={() => handleMonthSelect(m.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                        color: isSelected ? '#38bdf8' : (isStudied ? '#34d399' : 'var(--text-secondary, #cbd5e1)'),
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : (isStudied ? 600 : 500)
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isStudied}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleMonthStudied(selectedYear, m.value);
                        }}
                        title={`Check up ${selectedYear} ${m.label} as studied`}
                        style={{
                          cursor: 'pointer',
                          accentColor: '#10b981',
                          width: '13px',
                          height: '13px',
                          margin: 0
                        }}
                      />
                      <span style={{ flex: 1 }}>{m.label}</span>
                      {isSelected && <span style={{ fontSize: '10px', color: '#38bdf8' }}>●</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Start Date & End Date Pickers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          type="date"
          value={startDate}
          onChange={e => {
            setStartDate(e.target.value);
            setActiveDatePreset(null);
          }}
          title="Start Date"
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: compact ? '3px 5px' : '4px 6px',
            height: compact ? '26px' : '28px',
            fontSize: compact ? '11px' : '11.5px',
            fontWeight: '600',
            cursor: 'pointer',
            outline: 'none',
            colorScheme: 'dark'
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
        <input
          type="date"
          value={endDate}
          onChange={e => {
            setEndDate(e.target.value);
            setActiveDatePreset(null);
          }}
          title="End Date"
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: compact ? '3px 5px' : '4px 6px',
            height: compact ? '26px' : '28px',
            fontSize: compact ? '11px' : '11.5px',
            fontWeight: '600',
            cursor: 'pointer',
            outline: 'none',
            colorScheme: 'dark'
          }}
        />
      </div>

      {/* Run Scan Button */}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => handleRunScan(activeScreenerId, { start: startDate, end: endDate })}
        disabled={loading}
        style={{
          height: compact ? '26px' : '28px',
          padding: '0 12px',
          fontSize: '12px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        {loading ? <span className="spin-icon">↻</span> : '▶'} Run Scan
      </button>
    </>
  );

  return (
    <div className="stock-screen-container">
      {/* 1. Top Glass-Card Header & Filter Ribbon */}
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
          {/* Left: Expand Toggle & Active Setup Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleSetupCollapse}
              title="Expand setup selection (Alt + S)"
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

            {/* Active Setup Badge */}
            <div
              onClick={toggleSetupCollapse}
              title={`${curFolder?.name || 'Folder'} › ${currentSetupDisplayName}\nClick to expand setup selection`}
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
                {curScreener?.icon ? `${curScreener.icon} ` : ''}{currentSetupDisplayName}
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
                {displayedCandidates.length}{selectedIndustry !== 'ALL' ? ` / ${rawCandidates.length}` : ''}
              </span>
            </div>
          </div>

          {/* Right Action Controls: Date Controls & Run Scan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {renderDateAndScanControls(true)}
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 16px', marginBottom: '8px', flexShrink: 0 }}>
          {/* Row 1: Folder Selection on Left, Date Controls & Collapse on Right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Left: Folder Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                      onClick={() => handleSelectFolder(folder.id)}
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
              ) : null}
            </div>

            {/* Right: Date Range Presets & Pickers + Run Scan + Collapse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {renderDateAndScanControls(false)}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={toggleSetupCollapse}
                title="Collapse setup selection to maximize chart space (Alt + S)"
                style={{
                  height: '28px',
                  padding: '0 10px',
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

          {/* Row 2: Screener Subview Bar for Active Folder */}
          {curFolder?.screeners && curFolder.screeners.length > 0 && (() => {
            const folderColor = SETUP_COLORS[activeFolderId] || '#38bdf8';
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                padding: '7px 12px',
                background: `${folderColor}14`,
                border: `1px solid ${folderColor}40`,
                borderRadius: '8px',
                marginTop: '2px'
              }}>
                {(curFolder.screeners || []).filter(s => s.visible !== false).map((screener) => {
                  const isSelected = activeScreenerId === screener.id;
                  const screenerColor = SETUP_COLORS[screener.id] || folderColor;

                return (
                  <button
                    key={screener.id}
                    type="button"
                    onClick={() => handleSelectScreener(screener.id)}
                    title={screener.description || screener.expression || ''}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '500',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isSelected ? `1px solid ${screenerColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? `${screenerColor}33` : 'rgba(15, 23, 42, 0.45)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: isSelected ? `0 2px 6px ${screenerColor}30` : 'none'
                    }}
                  >
                    {screener.icon ? `${screener.icon} ` : ''}{screener.name || screener.label}
                  </button>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}

      {/* 2. Split Screen: Chart + Candidate Ribbon */}
      <div
        className="browse-split-container"
        style={{
          gap: 0,
          marginTop: '8px',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}
      >
        {/* Main Col: Unified StockView */}
        <div className="browse-main-col" style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          <StockView
            ref={chartRef}
            stock={currentCandidate}
            prices={stockPrices}
            loadingPrices={loadingPrices}
            setupName={currentSetupDisplayName}
            asOfDate={currentCandidate?.setup_date || currentCandidate?.date || null}
            marketRegime={currentCandidate?.market_regime}
            showEarningsBadge={false}
            defaultShowSpyChart={true}
            watchlistSymbols={activeWatchlistSymbols}
            onSelectGroup={(type, name) => setPreviewGroupModal({ groupType: type, groupName: name })}
            onSelectStock={(stk) => {
              if (!stk?.symbol) return;
              const idx = displayedCandidates.findIndex(c => c.symbol.toUpperCase() === stk.symbol.toUpperCase());
              if (idx !== -1) {
                setBrowseIndex(idx);
              } else if (onSelectStock) {
                onSelectStock(stk.symbol);
              }
            }}
            headerExtra={(() => {
              const savedTrade = getSavedTradeForCandidate(currentCandidate);
              const isSaved = Boolean(savedTrade);
              const savedTagId = savedTrade ? (savedTrade.setup_type || (savedTrade.tags && savedTrade.tags[0]) || 'BO') : null;
              const savedTagDef = savedTagId ? (availableTags.find(t => t.id?.toUpperCase() === savedTagId?.toUpperCase()) || SETUP_TAG_META[savedTagId] || { id: savedTagId, label: savedTagId, name: savedTagId, color: '#34d399' }) : null;
              const tagColor = savedTagDef?.color || '#34d399';

              return (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowSavePopup(prev => !prev)}
                    disabled={!currentCandidate || savingToModelBook}
                    title={
                      isSaved
                        ? `Saved in Model Book (${savedTagDef?.name || savedTagId}) - Click to change tag or remove (Hotkey: S)`
                        : `Save ${currentCandidate?.symbol || 'candidate'} to Model Book with tag (Hotkey: S)`
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      height: '28px',
                      padding: isSaved ? '0 9px' : '0 8px',
                      borderRadius: '5px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      background: isSaved ? `${tagColor}25` : 'rgba(255, 255, 255, 0.05)',
                      color: isSaved ? tagColor : 'var(--text-secondary, #94a3b8)',
                      border: isSaved ? `1px solid ${tagColor}80` : '1px solid var(--border-color, #1e293b)',
                      cursor: currentCandidate ? 'pointer' : 'not-allowed',
                      flexShrink: 0,
                      fontWeight: isSaved ? 700 : 600,
                      fontSize: '11px'
                    }}
                  >
                    <span>{isSaved ? '★' : '☆'}</span>
                    <span>{savingToModelBook ? 'Saving...' : (isSaved ? (savedTagDef?.label || savedTagDef?.name || 'Saved') : 'Save')}</span>
                    <span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '1px' }}>▼</span>
                  </button>

                  {showSavePopup && currentCandidate && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                        onClick={() => setShowSavePopup(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 5px)',
                          right: 0,
                          zIndex: 9999,
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          padding: '6px',
                          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.75)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          minWidth: '185px',
                          pointerEvents: 'auto'
                        }}
                      >
                        <div style={{ fontSize: '10px', color: '#94a3b8', padding: '3px 8px 4px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          Select Target Tag:
                        </div>

                        {availableTags.map((tag) => {
                          const isCurrent = isSaved && savedTagId?.toUpperCase() === tag.id?.toUpperCase();
                          const color = tag.color || '#38bdf8';
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSaveCandidateWithTag(currentCandidate, tag.id, tag.name || tag.label)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 8px',
                                background: isCurrent ? `${color}25` : 'transparent',
                                border: isCurrent ? `1px solid ${color}60` : '1px solid transparent',
                                borderRadius: '5px',
                                color: isCurrent ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                                fontSize: '11px',
                                fontWeight: isCurrent ? 700 : 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background 0.12s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span style={{ fontSize: '12px' }}>{tag.icon || '🏷️'}</span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>
                                {tag.name || tag.label} <span style={{ opacity: 0.6, fontSize: '10px' }}>({tag.id})</span>
                              </span>
                              {isCurrent && <span style={{ color: color, fontSize: '11px', fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })}

                        {isSaved && (
                          <>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveSavedCandidate(currentCandidate)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 8px',
                                background: 'transparent',
                                border: '1px solid transparent',
                                borderRadius: '5px',
                                color: '#fb7185',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ fontSize: '11px' }}>🗑️</span>
                              <span>Remove from Model Book</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          />
        </div>

        {/* Resizable Vertical Splitter */}
        <StockListSplitter
          isResizing={isResizingSidePanel}
          onMouseDown={startResizingSidePanel}
        />

        {/* Side Col: Candidate List Ribbon (Right Column) */}
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
          {/* Header: Total Count + Prev/Next Buttons + Export CSV */}
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
              Total ({displayedCandidates.length}{selectedIndustry !== 'ALL' ? ` / ${rawCandidates.length}` : ''})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBrowseIndex(prev => Math.max(prev - 1, 0))}
                disabled={browseIndex <= 0}
                title="Previous Candidate (▲ or k)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  fontSize: '11px',
                  borderRadius: '6px'
                }}
              >
                ▲
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBrowseIndex(prev => Math.min(prev + 1, displayedCandidates.length - 1))}
                disabled={browseIndex >= displayedCandidates.length - 1}
                title="Next Candidate (▼ or j)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  fontSize: '11px',
                  borderRadius: '6px'
                }}
              >
                ▼
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportCSV}
                disabled={displayedCandidates.length === 0}
                title="Export candidates to CSV"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  borderRadius: '6px',
                  cursor: displayedCandidates.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: displayedCandidates.length > 0 ? 1 : 0.4
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

            <StockList
              items={displayedCandidates}
              selectedStock={currentCandidate}
              selectedSymbol={currentCandidate?.symbol}
              onSelectStock={(cand) => {
                if (cand?.symbol) {
                  const idx = displayedCandidates.findIndex(
                    (c) => c === cand || c.symbol?.toUpperCase() === cand.symbol?.toUpperCase()
                  );
                  if (idx !== -1) setBrowseIndex(idx);
                }
              }}
              columns={['symbol', 'date']}
              defaultSortBy="date_asc"
              showIndustryFilter={true}
              selectedIndustry={selectedIndustry}
              onIndustryChange={(newInd) => {
                setSelectedIndustry(newInd);
                setBrowseIndex(0);
              }}
              industryCounts={industryCounts}
              totalCount={rawCandidates.length}
              renderCell={(colKey, cand) => {
                if (colKey === 'symbol') {
                  const savedTrade = getSavedTradeForCandidate(cand);
                  const isSaved = Boolean(savedTrade);
                  const tagId = savedTrade ? (savedTrade.setup_type || (savedTrade.tags && savedTrade.tags[0]) || 'BO') : null;
                  const tagDef = tagId ? (availableTags.find(t => t.id?.toUpperCase() === tagId?.toUpperCase()) || SETUP_TAG_META[tagId]) : null;
                  const tagColor = tagDef?.color || '#34d399';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <StockBrandIcon symbol={cand.symbol} size={18} />
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>{cand.symbol}</span>
                      {isSaved && (
                        <span style={{ fontSize: '11px', color: tagColor, fontWeight: 700 }} title={`Saved in Model Book (${tagDef?.name || tagId || 'Saved'})`}>
                          ★
                        </span>
                      )}
                    </div>
                  );
                }
              }}
              loading={loading}
              loadingMessage="Scanning historical setups..."
              emptyMessage="No candidates found for this date range."
              enableKeyboardNav={false}
              autoScrollSelected={true}
            />
        </div>
      </div>

      {/* 3. Industry Stage & Breadth Modal (GroupStageChart) */}
      {previewGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewGroupModal(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '95%',
              maxWidth: '950px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                🏭 {previewGroupModal.groupName}
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewGroupModal(null)}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                ✕ Close
              </button>
            </div>

            <GroupStageChart
              groupType={previewGroupModal.groupType}
              groupName={previewGroupModal.groupName}
              onSelectStock={(sym) => {
                setPreviewGroupModal(null);
                if (onSelectStock) onSelectStock(sym);
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

