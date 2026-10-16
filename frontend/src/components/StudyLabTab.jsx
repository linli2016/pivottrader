import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CandlestickChart from './CandlestickChart';
import StockBrandIcon from './StockBrandIcon';
import GroupStageChart from './GroupStageChart';
import { getLocalDateStr } from '../utils/dateUtils';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

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
  confirmed_staged: '#10b981',
  stage1: '#38bdf8',
  stage2: '#10b981',
  stage3: '#f59e0b',
  stage4: '#f43f5e',
  all: '#64748b',
  vcp: '#10b981',
};

const SETUP_CANONICAL_NAMES = {
  power_play: 'Power Play',
  breakout: 'QM Breakouts',
  breakouts: 'QM Breakouts',
  qm_breakouts: 'QM Breakouts',
  standard: 'QM Breakouts',
  episodic_pivot: 'Episodic Pivot',
  parabolic: 'Parabolic Short',
  parabolic_short: 'Parabolic Short',
  weinstein_breakdown: 'Stage 4 Breakdown',
  weinstein_pullback: 'Pullback to 30W MA',
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

export default function StudyLabTab({
  onSelectStock = null,
  watchlists = [],
  fetchWatchlists = () => {},
  setupsConfig = { folders: [], setups: [], filters: {} }
}) {
  // Navigation & Screener State
  const [activeFolderId, setActiveFolderId] = useState('daily');
  const [activeScreenerId, setActiveScreenerId] = useState('power_play');
  const [folderMemory, setFolderMemory] = useState({ daily: 'power_play', weekly: 'leaders', others: 'confirmed_staged' });
  const [setupType, setSetupType] = useState('power_play');

  // Chart & Row References
  const chartRef = useRef(null);
  const selectedCandidateRowRef = useRef(null);
  const priceCacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

  // Date range presets
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const todayStr = useMemo(() => getLocalDateStr(), []);

  const datePresets = useMemo(() => {
    const yearPresets = Array.from({ length: 5 }, (_, i) => {
      const yr = currentYear - 1 - i;
      return {
        id: `year_${yr}`,
        label: `${yr}`,
        title: `Full Calendar Year ${yr} (${yr}-01-01 to ${yr}-12-31)`,
        start: `${yr}-01-01`,
        end: `${yr}-12-31`
      };
    });

    return [
      {
        id: 'ytd',
        label: 'YTD',
        title: `Year to Date (${currentYear}-01-01 to Present)`,
        start: `${currentYear}-01-01`,
        end: todayStr
      },
      ...yearPresets,
      {
        id: 'all',
        label: 'ALL',
        title: `All Available History (${currentYear - 5} to Present)`,
        start: `${currentYear - 5}-01-01`,
        end: todayStr
      }
    ];
  }, [currentYear, todayStr]);

  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeDatePreset, setActiveDatePreset] = useState('ytd');

  // Execution & Candidates State
  const [loading, setLoading] = useState(false);
  const [rawCandidates, setRawCandidates] = useState([]);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [error, setError] = useState(null);

  // Filters on Candidates List
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');
  const [stage2Only, setStage2Only] = useState(false);
  const [previewGroupModal, setPreviewGroupModal] = useState(null);

  // Watchlist integration
  const [targetWatchlistId, setTargetWatchlistId] = useState(null);
  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = useState(new Set());

  // Model Book Saved State (for quick 1-click toggle)
  const [savedTrades, setSavedTrades] = useState([]);
  const [savingToModelBook, setSavingToModelBook] = useState(false);

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

  // Watchlist Sync
  useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists, targetWatchlistId]);

  const fetchTargetWatchlistItems = useCallback(async (watchlistId) => {
    if (!watchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${watchlistId}/items`);
      if (res.ok) {
        const data = await res.json();
        const symSet = new Set(data.map(item => item.symbol.toUpperCase()));
        setActiveWatchlistSymbols(symSet);
      }
    } catch (e) {
      console.error('Error fetching watchlist items:', e);
    }
  }, []);

  useEffect(() => {
    if (targetWatchlistId) {
      fetchTargetWatchlistItems(targetWatchlistId);
    }
  }, [targetWatchlistId, fetchTargetWatchlistItems]);

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
        const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=750`);
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

  // 1-Click Save / Remove Candidate from Model Book
  const handleToggleSaveCandidate = async (cand) => {
    if (!cand) return;
    const existing = getSavedTradeForCandidate(cand);
    if (existing) {
      if (window.confirm(`Remove ${cand.symbol} (${cand.setup_date || cand.date}) from saved Model Book?`)) {
        try {
          const res = await fetch(`${API_BASE}/api/model-book/saved/${existing.id}`, { method: 'DELETE' });
          if (res.ok) {
            setSavedTrades(prev => prev.filter(t => t.id !== existing.id));
          }
        } catch (e) {
          console.error('Error deleting from model book:', e);
        }
      }
      return;
    }

    setSavingToModelBook(true);
    const date = cand.setup_date || cand.date || cand.screen_date;
    const payload = {
      symbol: cand.symbol,
      setup_date: date,
      setup_type: setupType,
      setup_name: currentSetupDisplayName,
      market_regime: cand.market_regime || 'UNKNOWN',
      notes: ''
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
      const candidates = data.candidates || data.trades || data.all_candidates || [];
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

  // Initial Scan on Mount
  useEffect(() => {
    handleRunScan('power_play', { start: startDate, end: endDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (selectedIndustry !== 'ALL') {
      list = list.filter(c => {
        const ind = (c.industry || c.group_name || '').trim() || 'Unclassified';
        return ind === selectedIndustry;
      });
    }

    if (stage2Only) {
      list = list.filter(c => c.industry_stage_num === 2);
    }

    return list;
  }, [rawCandidates, selectedIndustry, stage2Only]);

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

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setBrowseIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setBrowseIndex(prev => Math.min(prev + 1, displayedCandidates.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedCandidates.length]);

  // Handlers for Folder & Screener clicks
  const handleSelectFolder = (folderId) => {
    setActiveFolderId(folderId);
    const folder = (setupsConfig?.folders || []).find(f => f.id === folderId);
    if (!folder || !folder.screeners || folder.screeners.length === 0) return;

    const visibleScreeners = folder.screeners.filter(s => s.visible !== false);
    const candidateList = visibleScreeners.length > 0 ? visibleScreeners : folder.screeners;
    const rememberedId = folderMemory[folderId];
    const screener = candidateList.find(s => s.id === rememberedId) ||
                     candidateList.find(s => s.id === folder.default_screener_id) ||
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

  const handleDatePresetSelect = (preset) => {
    setActiveDatePreset(preset.id);
    setStartDate(preset.start);
    setEndDate(preset.end);
    handleRunScan(activeScreenerId, { start: preset.start, end: preset.end });
  };

  // Next earnings badge
  const browseEarningsBadge = useMemo(() => {
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
        displayText: `Earning ${badgeSub}`
      };
    } catch (e) {
      return { dateStr: dt, displayText: `Earning ${dt}`, isUrgent: false };
    }
  }, [currentCandidate?.next_earnings_date]);

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
    const headers = ['Symbol', 'Date', 'Name', 'Sector', 'Industry', 'Close', 'ADR20d', 'RS_Rank', 'TI65', 'Ret_1M', 'Ret_3M', 'Ret_6M', 'Inst_Holders'];
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

  return (
    <div className="stock-screen-container">
      {/* 1. Top Glass-Card Header & Filter Ribbon */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 16px', flexShrink: 0 }}>
        {/* Row 1: Folder Selection on Left, Date Controls on Right */}
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

          {/* Right: Date Range Presets & Pickers + Run Scan Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {datePresets.map(preset => {
                const isActive = activeDatePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleDatePresetSelect(preset)}
                    title={preset.title}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.45)',
                      color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
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
                  padding: '4px 6px',
                  height: '28px',
                  fontSize: '11.5px',
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
                  padding: '4px 6px',
                  height: '28px',
                  fontSize: '11.5px',
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
                height: '28px',
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
          </div>
        </div>

        {/* Row 2: Screener Subview Bar for Active Folder */}
        {curFolder?.screeners && curFolder.screeners.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
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
            {(curFolder.screeners || []).filter(s => s.visible !== false).map((screener) => {
              const isSelected = activeScreenerId === screener.id;
              const screenerColor = SETUP_COLORS[screener.id] || (activeFolderId === 'daily' ? '#38bdf8' : (activeFolderId === 'weekly' ? '#a855f7' : (activeFolderId === 'short' ? '#f43f5e' : '#94a3b8')));

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
        )}
      </div>

      {/* 2. Split Screen: Chart + Candidate Ribbon */}
      <div className="browse-split-container" style={{ marginTop: '10px' }}>
        {/* Main Col: Stock Info Card + Full Height Candlestick Chart */}
        <div className="browse-main-col">
          {/* Stock Info Card matching CandidatesTab */}
          <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            {/* Top Row: Symbol, Name, Subtitle (Exchange • Sector • Industry Button) on Left, Watchlist & Model Book on Right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Left: Brand Icon + Ticker + Name + Subtitle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <StockBrandIcon symbol={currentCandidate?.symbol} size={22} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      {currentCandidate?.symbol || 'No Selection'}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
                      {currentCandidate?.name || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {currentCandidate?.exchange || ''} • {currentCandidate?.sector || 'Sector'}
                    </span>
                    {currentCandidate?.industry && (
                      <button
                        type="button"
                        onClick={() => setPreviewGroupModal({ groupType: 'industries', groupName: currentCandidate.industry })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-brighten"
                        title="Click to view Stan Weinstein Stage Analysis Chart & Breadth for this Industry"
                      >
                        <span>🏭 {currentCandidate.industry}</span>
                        {currentCandidate.industry_stage_num ? (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: currentCandidate.industry_stage_num === 2 ? 'rgba(16, 185, 129, 0.25)' : currentCandidate.industry_stage_num === 1 ? 'rgba(56, 189, 248, 0.25)' : currentCandidate.industry_stage_num === 3 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)',
                              color: currentCandidate.industry_stage_num === 2 ? '#10b981' : currentCandidate.industry_stage_num === 1 ? '#38bdf8' : currentCandidate.industry_stage_num === 3 ? '#f59e0b' : '#f43f5e',
                              border: `1px solid ${currentCandidate.industry_stage_num === 2 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
                            }}
                          >
                            {currentCandidate.industry_stage_badge || `S${currentCandidate.industry_stage_num}`}
                          </span>
                        ) : null}
                        {currentCandidate.industry_mansfield_rs !== undefined && currentCandidate.industry_mansfield_rs !== null && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: currentCandidate.industry_mansfield_rs >= 0 ? '#34d399' : '#f87171'
                            }}
                          >
                            RS {currentCandidate.industry_mansfield_rs >= 0 ? '+' : ''}{Number(currentCandidate.industry_mansfield_rs).toFixed(1)}%
                          </span>
                        )}
                        <span style={{ fontSize: '10px', opacity: 0.85 }}>📈 Chart</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Watchlist + Save to Model Book + Screenshot + Inspect */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                {/* Watchlist Quick Action */}
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
                  const isCurrentWatchlisted = currentCandidate && activeWatchlistSymbols.has(currentCandidate.symbol.toUpperCase());
                  return (
                    <button
                      className={`btn ${isCurrentWatchlisted ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleToggleWatchlist(currentCandidate?.symbol)}
                      disabled={!currentCandidate}
                      title={isCurrentWatchlisted ? 'Saved in Watchlist (Click to remove)' : `Save ${currentCandidate?.symbol || 'stock'} to Watchlist`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        background: isCurrentWatchlisted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        color: isCurrentWatchlisted ? '#34d399' : 'var(--text-secondary)',
                        border: isCurrentWatchlisted ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                        cursor: currentCandidate ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isCurrentWatchlisted ? (
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

                {/* 1-Click Save to Model Book Button */}
                {(() => {
                  const isSaved = isCandidateSaved(currentCandidate);
                  return (
                    <button
                      className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleToggleSaveCandidate(currentCandidate)}
                      disabled={!currentCandidate || savingToModelBook}
                      title={isSaved ? "Saved in Model Book (Click to remove)" : "Save candidate to Model Book"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: isSaved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                        color: isSaved ? '#34d399' : '#38bdf8',
                        border: isSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(56, 189, 248, 0.45)',
                        cursor: currentCandidate ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{isSaved ? '★' : '☆'}</span>
                      <span>{savingToModelBook ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}</span>
                    </button>
                  );
                })()}

                {/* Inspect in Inspector Tab */}
                {onSelectStock && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectStock(currentCandidate?.symbol)}
                    disabled={!currentCandidate}
                    title={`Inspect ${currentCandidate?.symbol} in Inspector Tab`}
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
                      cursor: currentCandidate ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                )}

                {/* Screenshot Button */}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => chartRef.current?.saveScreenshot()}
                  disabled={!currentCandidate || loadingPrices || stockPrices.length === 0}
                  title="Take chart screenshot"
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
                    cursor: (!currentCandidate || stockPrices.length === 0) ? 'not-allowed' : 'pointer',
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
                {/* Setup Date Badge */}
                {currentCandidate?.setup_date && (
                  <span
                    className="pill"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'rgba(56, 189, 248, 0.18)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      fontWeight: 700
                    }}
                    title="Setup Bar Date"
                  >
                    📅 Setup: {currentCandidate.setup_date}
                  </span>
                )}

                {/* RS Rank */}
                <span className="pill pill-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  RS: {currentCandidate?.rs_rank ?? (currentCandidate?.rs_score ? Math.round(currentCandidate.rs_score) : 'N/A')}
                </span>

                {/* RS Blue Dot */}
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
                    title="RS Blue Dot: Relative Strength vs SPY hit a new 52-week high before price breakout"
                  >
                    🔵 RS Blue Dot
                  </span>
                )}

                {/* ADR% */}
                {currentCandidate?.adr_20d !== null && currentCandidate?.adr_20d !== undefined && (
                  <span
                    className="pill"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: currentCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                      color: currentCandidate.adr_20d >= 5.0 ? '#f59e0b' : '#60a5fa',
                      border: currentCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                      fontWeight: 700
                    }}
                  >
                    ADR%: {currentCandidate.adr_20d.toFixed(2)}%
                  </span>
                )}

                {/* TI65 */}
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
                    title={`Stockbee Trend Intensity (TI65): ${currentCandidate.ti_65.toFixed(2)}`}
                  >
                    TI65: {currentCandidate.ti_65.toFixed(2)}
                  </span>
                )}

                {/* Institutional Sponsorship */}
                {currentCandidate?.inst_holders_count !== null && currentCandidate?.inst_holders_count !== undefined ? (
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
                    title={`Institutional Sponsorship: ${currentCandidate.inst_holders_count.toLocaleString()} funds`}
                  >
                    🏛️ Inst: {currentCandidate.inst_holders_count.toLocaleString()} {currentCandidate.sponsorship_streak >= 2 ? `🔥 +${currentCandidate.sponsorship_streak}Q` : ''}
                  </span>
                ) : null}

                {/* Returns: 1M, 3M, 6M */}
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
                ) : null}

                {/* Market Tape Badge */}
                {currentCandidate?.market_regime && (
                  <span
                    className="pill"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: currentCandidate.market_regime === 'BULLISH'
                        ? 'rgba(16, 185, 129, 0.18)'
                        : (currentCandidate.market_regime === 'BEARISH'
                          ? 'rgba(244, 63, 94, 0.18)'
                          : 'rgba(245, 158, 11, 0.18)'),
                      color: currentCandidate.market_regime === 'BULLISH'
                        ? '#34d399'
                        : (currentCandidate.market_regime === 'BEARISH'
                          ? '#fb7185'
                          : '#fbbf24'),
                      border: `1px solid ${currentCandidate.market_regime === 'BULLISH'
                        ? 'rgba(16, 185, 129, 0.35)'
                        : (currentCandidate.market_regime === 'BEARISH'
                          ? 'rgba(244, 63, 94, 0.35)'
                          : 'rgba(245, 158, 11, 0.35)')}`,
                      fontWeight: 700
                    }}
                  >
                    {currentCandidate.market_regime === 'BULLISH' ? '🟢 Bullish Tape' : currentCandidate.market_regime === 'BEARISH' ? '🔴 Bearish Tape' : '🟡 Caution Tape'}
                  </span>
                )}
              </div>

              {/* Stock Position Count on Far Bottom Right */}
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                Stock {displayedCandidates.length > 0 ? browseIndex + 1 : 0} of {displayedCandidates.length}
              </span>
            </div>
          </div>

          {/* Candlestick Chart Container */}
          <div className="glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CandlestickChart
              ref={chartRef}
              data={stockPrices}
              symbol={currentCandidate?.symbol}
              companyName={currentCandidate?.name}
              setupName={currentSetupDisplayName}
              asOfDate={currentCandidate?.setup_date || currentCandidate?.date || null}
              height="100%"
              showScreenshotButton={false}
            />
          </div>
        </div>

        {/* Side Col: Candidate List Ribbon (Right Column) */}
        <div className="glass-card browse-side-col">
          {/* Header: Total Count + Prev/Next Buttons + Export CSV */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0 }}>
              Total ({displayedCandidates.length}{selectedIndustry !== 'ALL' ? ` / ${rawCandidates.length}` : ''})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBrowseIndex(prev => Math.max(prev - 1, 0))}
                disabled={browseIndex <= 0}
                title="Previous Candidate (▲ or k)"
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  height: '26px'
                }}
              >
                ▲ Prev
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBrowseIndex(prev => Math.min(prev + 1, displayedCandidates.length - 1))}
                disabled={browseIndex >= displayedCandidates.length - 1}
                title="Next Candidate (▼ or j)"
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  height: '26px'
                }}
              >
                Next ▼
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

          {/* Industry / Group Filter & Stage 2 Quick Filter */}
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
              <option value="ALL">All Industry Groups ({rawCandidates.length})</option>
              {industryCounts.map(({ industry, count }) => (
                <option key={industry} value={industry}>
                  {industry} ({count})
                </option>
              ))}
            </select>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: stage2Only ? '#34d399' : 'var(--text-secondary)',
              fontWeight: stage2Only ? '600' : '400',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '2px 0'
            }}>
              <input
                type="checkbox"
                checked={stage2Only}
                onChange={(e) => {
                  setStage2Only(e.target.checked);
                  setBrowseIndex(0);
                }}
                style={{ cursor: 'pointer', accentColor: '#10b981' }}
              />
              <span>Stage 2 Only</span>
            </label>
          </div>

          {/* Candidate List (Scrollable Cards) */}
          <div
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {displayedCandidates.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                {loading ? 'Scanning historical setups...' : 'No candidates found for this date range.'}
              </div>
            ) : (
              displayedCandidates.map((cand, idx) => {
                const isSelected = idx === browseIndex;
                const isSaved = isCandidateSaved(cand);

                return (
                  <div
                    key={`${cand.symbol}_${cand.setup_date || cand.date}_${idx}`}
                    ref={isSelected ? selectedCandidateRowRef : null}
                    onClick={() => setBrowseIndex(idx)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected
                        ? 'rgba(56, 189, 248, 0.16)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1.5px solid #38bdf8'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isSelected ? '0 2px 8px rgba(56, 189, 248, 0.25)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    {/* Row 1: Symbol + Setup Date + Price + ADR% */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#38bdf8' : 'var(--text-primary)' }}>
                          {cand.symbol}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {cand.setup_date || cand.date}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isSaved && (
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }} title="Saved in Model Book">
                            ★
                          </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ${cand.close?.toFixed(2) || '-'}
                        </span>
                        {cand.adr_20d !== null && cand.adr_20d !== undefined && (
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: cand.adr_20d >= 5 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                            color: cand.adr_20d >= 5 ? '#f59e0b' : '#60a5fa',
                            fontWeight: 600
                          }}>
                            {cand.adr_20d.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Company Name / Industry + Runup / Depth */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                        {cand.industry || cand.sector || cand.name || ''}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {cand.prior_runup_pct > 0 && (
                          <span style={{ color: '#34d399', fontWeight: 600 }}>
                            +{cand.prior_runup_pct}%
                          </span>
                        )}
                        {cand.base_depth_pct > 0 && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            -{cand.base_depth_pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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

