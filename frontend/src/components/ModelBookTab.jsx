import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CandlestickChart from './CandlestickChart';
import { getLocalDateStr } from '../utils/dateUtils';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

const SETUP_CANONICAL_NAMES = {
  power_play: 'Power Play',
  breakout: 'Breakouts & HTF',
  breakouts: 'Breakouts & HTF',
  episodic_pivot: 'Episodic Pivot',
  momentum: 'My Universe',
  parabolic: 'Parabolic Short',
  ipo_base: 'IPO Base',
  vcp: 'Minervini VCP',
  low_cheat: 'Minervini Low Cheat'
};

export default function ModelBookTab({
  onSelectStock = null,
  watchlists: _watchlists = [],
  fetchWatchlists: _fetchWatchlists = () => {},
  setupsConfig = { setups: [], filters: {} }
}) {
  // Screening Parameters
  const [setupType, setSetupType] = useState('breakouts');
  const [selectedSubSetupId, setSelectedSubSetupId] = useState('htf');
  const modelBookChartRef = useRef(null);
  const selectedCandidateRowRef = useRef(null);
  const selectedSavedTradeRowRef = useRef(null);
  const [targetGainPct, setTargetGainPct] = useState(16.0);
  const [customGain, setCustomGain] = useState('');
  const [stopLossPct, setStopLossPct] = useState(8.0);
  const [customStop, setCustomStop] = useState('');
  const [emaExitType, setEmaExitType] = useState('none'); // 'ema_10', 'ema_20', 'none'
  const [forwardDays, setForwardDays] = useState(25);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState('');

  // Dynamic setups from centralized config
  const setupOptions = useMemo(() => {
    if (setupsConfig?.setups && setupsConfig.setups.length > 0) {
      return setupsConfig.setups;
    }
    return [
      { id: 'breakouts', name: 'Breakouts & HTF', icon: '🎯', description: 'Consolidations and High Tight Flags (Power Plays) ready to break out along rising moving averages.' },
      { id: 'episodic_pivot', name: 'Episodic Pivot', icon: '⚡', description: 'Massive gap-up (10%+) on heavy relative volume driven by catalyst or earnings.' },
      { id: 'momentum', name: 'My Universe', icon: '🌌', description: 'Filters out a broad universe of stocks for further screening across Stage 2 and Momentum Gainers.' },
      { id: 'parabolic', name: 'Parabolic Short', icon: '🌋', description: 'Overextended momentum climaxes for mean-reversion short setups.' },
      { id: 'ipo_base', name: 'IPO Base', icon: '🌱', description: 'Early institutional accumulation in newly public companies (< 350 days).' },
      { id: 'vcp', name: 'Minervini VCP', icon: '📐', description: 'Volatility Contraction Pattern with drying volume along Stage 2 uptrend.' }
    ];
  }, [setupsConfig]);

  const activeSetup = useMemo(() => {
    return setupOptions.find(s => s.id === setupType) || setupOptions[0];
  }, [setupOptions, setupType]);

  // Sync initial sub-setup ID when activeSetup changes
  useEffect(() => {
    if (activeSetup?.sub_setups?.length > 0) {
      setSelectedSubSetupId(prev => {
        if (!prev || !activeSetup.sub_setups.some(s => s.id === prev)) {
          return activeSetup.default_sub_id || activeSetup.sub_setups[0].id;
        }
        return prev;
      });
    } else {
      setSelectedSubSetupId(null);
    }
  }, [activeSetup]);

  const isSubActive = useCallback((sub) => {
    if (!sub) return false;
    const defaultSubId = activeSetup?.default_sub_id || activeSetup?.sub_setups?.[0]?.id;
    const currentSubId = selectedSubSetupId || defaultSubId;
    return sub.id === currentSubId;
  }, [selectedSubSetupId, activeSetup]);

  const activeSubSetup = useMemo(() => {
    if (!activeSetup?.sub_setups || activeSetup.sub_setups.length === 0) return null;
    return activeSetup.sub_setups.find(s => isSubActive(s)) || activeSetup.sub_setups[0];
  }, [activeSetup, isSubActive]);

  const currentSetupDisplayName = activeSubSetup?.name || SETUP_CANONICAL_NAMES[setupType] || activeSetup?.name || 'Setup';
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Year-by-Year & Quick Date Presets
  const datePresets = useMemo(() => {
    const todayStr = getLocalDateStr();

    // Generate recent 5 full calendar years (e.g. 2025, 2024, 2023, 2022, 2021)
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
  }, [currentYear]);

  // Date Range (default: current year)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const start = `${currentYear}-01-01`;
    const end = getLocalDateStr(today);
    return { start, end };
  }, [currentYear]);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [activeDatePreset, setActiveDatePreset] = useState('ytd');

  // Execution State
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  // Sub-view: 'study' (Historical Winners Lab) vs 'saved' (My Saved Model Book)
  const [activeSubView, setActiveSubView] = useState('study');

  // Saved Model Book Trades State
  const [savedTrades, setSavedTrades] = useState([]);
  const [loadingSavedTrades, setLoadingSavedTrades] = useState(false);
  const [selectedSavedTrade, setSelectedSavedTrade] = useState(null);
  const [displayedSavedTrade, setDisplayedSavedTrade] = useState(null);
  const [savedTradePrices, setSavedTradePrices] = useState([]);
  const [loadingSavedPrices, setLoadingSavedPrices] = useState(false);
  const [savedTradeFilterSetup, setSavedTradeFilterSetup] = useState('ALL');
  const [savedTradeSearch, setSavedTradeSearch] = useState('');
  const [traderNote, setTraderNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Save action state
  const [savingToModelBook, setSavingToModelBook] = useState(false);
  const [dateUpdatedFeedback, setDateUpdatedFeedback] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  // Active criteria chips preview
  const activeFilterChips = useMemo(() => {
    const filters = scanResult?.summary?.filters || {};
    const chips = [];

    // Baseline Liquidity
    if (filters.min_price !== undefined) {
      chips.push({ text: `Price: ≥$${filters.min_price}`, highlight: false });
    }
    if (filters.min_volume_sma_50 !== undefined) {
      const k = Math.round(Number(filters.min_volume_sma_50) / 1000);
      chips.push({ text: k === 0 ? '50d Vol: Min (0)' : `50d Vol: ≥${k}K`, highlight: false });
    }
    if (filters.min_dollar_vol !== undefined) {
      const m = Math.round(Number(filters.min_dollar_vol) / 1000000);
      chips.push({ text: m === 0 ? '$ Vol: Min ($0)' : `$ Vol: ≥$${m}M`, highlight: true });
    }

    // Trend & Template
    if (filters.enforce_stage2) {
      chips.push({ text: `Stage 2 Template`, highlight: true });
    }
    if (filters.enable_rs) {
      chips.push({ text: `RS Rank: ≥${filters.min_rs_percentile || 70}`, highlight: true });
    }

    // Setup Specifics
    if (setupType === 'breakouts' || setupType === 'breakout') {
      const isHTF = Boolean(filters.enable_htf_mode || filters.breakout_subview === 'htf');
      chips.push({ text: `Mode: ${isHTF ? 'Power Play / HTF' : 'QM Breakouts'}`, highlight: true });
      chips.push({ text: `Runup: ≥${filters.min_breakout_runup || (isHTF ? 100 : 30)}% (${filters.runup_window_weeks || (isHTF ? 8 : 12)}w)`, highlight: true });
      chips.push({ text: `Base Depth: ≤${filters.max_breakout_drawdown || (isHTF ? 25 : 30)}%`, highlight: true });
      chips.push({ text: `Consolidation: ${filters.min_breakout_days || 10}–${filters.max_breakout_days || (isHTF ? 30 : 40)}d`, highlight: false });
      if (filters.require_pivot_tightness) {
        chips.push({ text: 'Pivot Tightness', highlight: false });
      }
    } else if (setupType === 'momentum') {
      const viewMap = {
        'all': 'All Views',
        'stage2': 'Stage 2',
        'leaders': 'Leaders',
        'gainers': 'All Gainers',
        '1m': '1M Gainers',
        '3m': '3M Gainers',
        '6m': '6M Gainers'
      };
      const subLabel = viewMap[filters.qm_subview] || filters.qm_subview || 'All Views';
      chips.push({ text: `View: ${subLabel}`, highlight: true });
      if (filters.qm_top_n) {
        chips.push({ text: `Top ${filters.qm_top_n}`, highlight: false });
      }
      if (filters.min_breakout_days !== undefined) {
        chips.push({ text: `Consolidation: ≥${filters.min_breakout_days}d`, highlight: false });
      }
    } else {
      if (filters.min_pp_runup !== undefined) {
        chips.push({ text: `Runup: ≥${filters.min_pp_runup}%`, highlight: true });
      }
      if (filters.max_pp_drawdown !== undefined) {
        chips.push({ text: `Base Depth: ≤${filters.max_pp_drawdown}%`, highlight: true });
      }
      if (filters.min_pp_days_since_peak !== undefined) {
        chips.push({ text: `Consolidation: ≥${filters.min_pp_days_since_peak}d`, highlight: false });
      }
      if (filters.min_breakout_runup !== undefined) {
        chips.push({ text: `Runup: ≥${filters.min_breakout_runup}%`, highlight: true });
      }
      if (filters.min_ep_gap !== undefined) {
        chips.push({ text: `Gap: ≥${filters.min_ep_gap}%`, highlight: true });
      }
      if (filters.min_ep_rel_vol !== undefined) {
        chips.push({ text: `Rel Vol: ≥${filters.min_ep_rel_vol}x`, highlight: true });
      }
      if (filters.max_ipo_age !== undefined) {
        chips.push({ text: `IPO Age: ≤${filters.max_ipo_age}d`, highlight: true });
      }
      if (filters.max_ipo_dist !== undefined) {
        chips.push({ text: `From ATH: ≤${filters.max_ipo_dist}%`, highlight: false });
      }
      if (filters.max_ipo_depth !== undefined) {
        chips.push({ text: `Base Depth: ≤${filters.max_ipo_depth}%`, highlight: false });
      }
      if (filters.min_parabolic_runup !== undefined) {
        chips.push({ text: `Runup: ≥${filters.min_parabolic_runup}% (${filters.parabolic_window_days || 10}d)`, highlight: true });
      }
      if (filters.min_parabolic_ema_dist !== undefined) {
        chips.push({ text: `10 EMA Stretch: ≥${filters.min_parabolic_ema_dist}%`, highlight: true });
      }
      if (filters.min_parabolic_up_days !== undefined) {
        chips.push({ text: `Up Days: ≥${filters.min_parabolic_up_days}d`, highlight: false });
      }
    }

    if (filters.enable_adr && filters.min_adr_20d !== undefined) {
      chips.push({ text: `ADR: ≥${filters.min_adr_20d}%`, highlight: false });
    }

    // Trade Execution & Exit Criteria
    if (setupType === 'parabolic') {
      chips.push({ text: `Entry: Short Breakdown`, highlight: true });
    } else {
      chips.push({ text: `Entry: Buy-Stop (High > Setup High)`, highlight: true });
    }
    if (stopLossPct !== null && stopLossPct !== '') {
      chips.push({ text: `Stop Loss: -${stopLossPct}%`, highlight: true });
    }
    if (emaExitType && emaExitType !== 'none') {
      chips.push({ text: `Trailing Exit: ${emaExitType === 'ema_20' ? 'EMA 20' : 'EMA 10'}`, highlight: true });
    }

    return chips;
  }, [scanResult, activeSetup, setupType, stopLossPct, emaExitType]);

  // Table & View Filters
  const [viewMode, setViewMode] = useState('winners'); // 'winners' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('ALL'); // 'ALL' | 'BULLISH' | 'CAUTION' | 'BEARISH'
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');

  // Sector Breakdown and Filtering
  const sectorCounts = useMemo(() => {
    if (!scanResult) return [];
    const pool = viewMode === 'winners' ? (scanResult.winners || []) : (scanResult.all_candidates || []);
    const counts = {};
    pool.forEach(c => {
      const s = c.sector && c.sector.trim() !== '' ? c.sector.trim() : 'Unclassified';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
  }, [scanResult, viewMode]);

  useEffect(() => {
    if (selectedSector !== 'ALL' && !sectorCounts.some(sc => sc.sector === selectedSector)) {
      setSelectedSector('ALL');
    }
  }, [sectorCounts, selectedSector]);

  // Chart Viewer State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [displayedChartCandidate, setDisplayedChartCandidate] = useState(null);
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // In-memory price cache to eliminate chart reload blink & enable instant navigation
  const priceCacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

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
        const res = await fetch(`${API_BASE}/api/stocks/${sym}/prices`);
        if (res.ok) {
          const prices = await res.json();
          priceCacheRef.current.set(sym, prices);
          return prices;
        }
      } catch (err) {
        console.error(`Error loading prices for ${sym}:`, err);
      } finally {
        pendingRequestsRef.current.delete(sym);
      }
      return [];
    })();
    pendingRequestsRef.current.set(sym, reqPromise);
    return reqPromise;
  }, []);

  const prefetchSymbols = useCallback((symbols) => {
    if (!symbols || symbols.length === 0) return;
    symbols.forEach(sym => {
      if (sym && !priceCacheRef.current.has(sym.toUpperCase()) && !pendingRequestsRef.current.has(sym.toUpperCase())) {
        fetchStockPrices(sym);
      }
    });
  }, [fetchStockPrices]);


  // Quick Date Presets
  const applyDatePreset = (presetId) => {
    setActiveDatePreset(presetId);
    const targetPreset = datePresets.find(p => p.id === presetId);
    if (!targetPreset) return;
    const { start, end } = targetPreset;
    setStartDate(start);
    setEndDate(end);
    handleRunScan(setupType, selectedSubSetupId, { start, end });
  };

  // Run Scan API
  const handleRunScan = async (setupToRun = null, subSetupIdToRun = null, dateRangeToRun = null) => {
    const targetSetup = typeof setupToRun === 'string' && setupToRun.trim() !== '' ? setupToRun : setupType;
    const activeSetupObj = (setupOptions || []).find(s => s.id === targetSetup);
    const targetSubSetupId = subSetupIdToRun !== null && subSetupIdToRun !== undefined
      ? subSetupIdToRun
      : (selectedSubSetupId || activeSetupObj?.default_sub_id || activeSetupObj?.sub_setups?.[0]?.id || null);
    const targetStart = dateRangeToRun?.start || startDate;
    const targetEnd = dateRangeToRun?.end || endDate;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        setup_type: targetSetup,
        sub_setup_id: targetSubSetupId,
        target_gain_pct: parseFloat(targetGainPct) || 20.0,
        stop_loss_pct: stopLossPct !== null && stopLossPct !== '' ? parseFloat(stopLossPct) : null,
        ema_exit_type: emaExitType || 'ema_10',
        start_date: targetStart,
        end_date: targetEnd,
        forward_days: parseInt(forwardDays, 10) || 20,
        max_drawdown_limit: stopLossPct !== null && stopLossPct !== '' ? parseFloat(stopLossPct) : null,
        episode_window_days: 15
      };

      const res = await fetch(`${API_BASE}/api/model-book/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Scan failed');
      }

      const data = await res.json();
      setScanResult(data);

      // Automatically select the first winner or candidate for charting
      const candidatesList = data.winners && data.winners.length > 0 ? data.winners : (data.all_candidates || []);
      if (candidatesList.length > 0) {
        handleSelectCandidate(candidatesList[0]);
        prefetchSymbols(candidatesList.slice(0, 10).map(c => c.symbol));
      } else {
        setSelectedCandidate(null);
        setDisplayedChartCandidate(null);
        setStockPrices([]);
      }
    } catch (e) {
      console.error('Error running model book scan:', e);
      setError(e.message || 'Error executing study backtest');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSetup = (newId) => {
    setSetupType(newId);
    const newSetup = setupOptions.find(s => s.id === newId);
    const defaultSub = newSetup?.default_sub_id || newSetup?.sub_setups?.[0]?.id || null;
    setSelectedSubSetupId(defaultSub);
    handleRunScan(newId, defaultSub, { start: startDate, end: endDate });
  };

  const handleSelectSubSetup = (sub) => {
    if (!sub) return;
    setSelectedSubSetupId(sub.id);
    handleRunScan(setupType, sub.id, { start: startDate, end: endDate });
  };

  // Filter and sort candidates
  const displayedCandidates = useMemo(() => {
    if (!scanResult) return [];
    let list = viewMode === 'winners' ? (scanResult.winners || []) : (scanResult.all_candidates || []);

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        c => c.symbol.toLowerCase().includes(term) || (c.name && c.name.toLowerCase().includes(term))
      );
    }

    if (selectedRegime !== 'ALL') {
      list = list.filter(c => c.market_regime === selectedRegime);
    }

    if (selectedSector !== 'ALL') {
      list = list.filter(c => {
        const s = c.sector && c.sector.trim() !== '' ? c.sector.trim() : 'Unclassified';
        return s === selectedSector;
      });
    }

    return [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'date' || sortField === 'setup_date') {
        valA = a.setup_date || a.date || '';
        valB = b.setup_date || b.date || '';
      } else if (sortField === 'holding_days') {
        valA = a.holding_days != null ? Number(a.holding_days) : -1;
        valB = b.holding_days != null ? Number(b.holding_days) : -1;
      } else if (sortField === 'entry_date') {
        valA = a.entry_date || '';
        valB = b.entry_date || '';
      } else if (sortField === 'exit_date') {
        valA = a.exit_date || '';
        valB = b.exit_date || '';
      }

      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        const cmp = sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        if (cmp !== 0) return cmp;
        return (a.symbol || '').localeCompare(b.symbol || '');
      }
      const numCmp = sortDirection === 'asc' ? valA - valB : valB - valA;
      if (numCmp !== 0) return numCmp;
      return (a.setup_date || a.date || '').localeCompare(b.setup_date || b.date || '');
    });
  }, [scanResult, viewMode, searchTerm, selectedRegime, selectedSector, sortField, sortDirection]);

  const prefetchAdjacentCandidates = useCallback((currentCand) => {
    if (!currentCand || displayedCandidates.length === 0) return;
    const idx = displayedCandidates.findIndex(
      c => c.symbol === currentCand.symbol && (c.setup_date || c.date) === (currentCand.setup_date || currentCand.date)
    );
    if (idx === -1) return;
    const targets = [];
    if (idx > 0) targets.push(displayedCandidates[idx - 1].symbol);
    if (idx < displayedCandidates.length - 1) targets.push(displayedCandidates[idx + 1].symbol);
    if (idx > 1) targets.push(displayedCandidates[idx - 2].symbol);
    if (idx < displayedCandidates.length - 2) targets.push(displayedCandidates[idx + 2].symbol);
    prefetchSymbols(targets);
  }, [displayedCandidates, prefetchSymbols]);

  // Fetch prices when candidate is selected
  const handleSelectCandidate = async (candidate) => {
    if (!candidate) return;
    setSelectedCandidate(candidate);

    const sym = candidate.symbol.toUpperCase();
    const cached = priceCacheRef.current.get(sym);
    if (cached && cached.length > 0) {
      setStockPrices(cached);
      setDisplayedChartCandidate(candidate);
      setLoadingPrices(false);
      prefetchAdjacentCandidates(candidate);
      return;
    }

    setLoadingPrices(true);
    try {
      const prices = await fetchStockPrices(candidate.symbol);
      setStockPrices(prices);
      setDisplayedChartCandidate(candidate);
    } catch (e) {
      console.error(`Error loading prices for ${candidate.symbol}:`, e);
    } finally {
      setLoadingPrices(false);
      prefetchAdjacentCandidates(candidate);
    }
  };

  // Run initial scan on mount
  useEffect(() => {
    handleRunScan();
  }, []);

  // Flipping through candidates (Next / Previous)
  const currentIndex = useMemo(() => {
    if (!selectedCandidate || displayedCandidates.length === 0) return -1;
    return displayedCandidates.findIndex(
      c => c.symbol === selectedCandidate.symbol && (c.setup_date || c.date) === (selectedCandidate.setup_date || selectedCandidate.date)
    );
  }, [selectedCandidate, displayedCandidates]);

  const handlePrevCandidate = () => {
    if (currentIndex > 0) {
      handleSelectCandidate(displayedCandidates[currentIndex - 1]);
    }
  };

  const handleNextCandidate = () => {
    if (currentIndex >= 0 && currentIndex < displayedCandidates.length - 1) {
      handleSelectCandidate(displayedCandidates[currentIndex + 1]);
    }
  };

  // Saved Model Book API & state actions
  const fetchSavedTrades = async () => {
    setLoadingSavedTrades(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved`);
      if (res.ok) {
        const data = await res.json();
        setSavedTrades(data || []);
        prefetchSymbols((data || []).map(t => t.symbol));
      }
    } catch (e) {
      console.error('Error fetching saved trades:', e);
    } finally {
      setLoadingSavedTrades(false);
    }
  };

  useEffect(() => {
    fetchSavedTrades();
  }, []);

  const isCandidateSaved = (cand) => {
    if (!cand) return false;
    const date = cand.setup_date || cand.date || cand.screen_date;
    return savedTrades.some(
      t => t.symbol.toUpperCase() === cand.symbol.toUpperCase() && t.setup_date === date
    );
  };

  const getSavedTradeForCandidate = (cand) => {
    if (!cand) return null;
    const date = cand.setup_date || cand.date || cand.screen_date;
    return savedTrades.find(
      t => t.symbol.toUpperCase() === cand.symbol.toUpperCase() && t.setup_date === date
    );
  };

  const handleToggleSaveCandidate = async (cand) => {
    if (!cand) return;
    const existing = getSavedTradeForCandidate(cand);
    if (existing) {
      if (window.confirm(`Remove ${cand.symbol} (${cand.setup_date || cand.date}) from saved Model Book?`)) {
        await handleDeleteSavedTrade(existing.id, false);
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
      market_regime: cand.market_regime,
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
      console.error('Error saving model book trade:', e);
    } finally {
      setSavingToModelBook(false);
    }
  };

  const handleDeleteSavedTrade = async (tradeId, confirm = true) => {
    if (confirm && !window.confirm('Remove this trade from your saved Model Book?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${tradeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSavedTrades(prev => prev.filter(t => t.id !== tradeId));
        if (selectedSavedTrade?.id === tradeId) {
          setSelectedSavedTrade(null);
          setDisplayedSavedTrade(null);
          setSavedTradePrices([]);
        }
      }
    } catch (e) {
      console.error('Error deleting saved trade:', e);
    }
  };

  // Filtered and sorted saved trades list
  const filteredSavedTrades = useMemo(() => {
    let list = [...savedTrades];
    if (savedTradeFilterSetup !== 'ALL') {
      list = list.filter(t => t.setup_type === savedTradeFilterSetup);
    }
    if (savedTradeSearch.trim() !== '') {
      const q = savedTradeSearch.toLowerCase().trim();
      list = list.filter(t =>
        t.symbol.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.setup_name && t.setup_name.toLowerCase().includes(q)) ||
        (t.setup_date && t.setup_date.includes(q))
      );
    }
    return list;
  }, [savedTrades, savedTradeFilterSetup, savedTradeSearch]);

  const prefetchAdjacentSavedTrades = useCallback((currentTrade) => {
    if (!currentTrade || filteredSavedTrades.length === 0) return;
    const idx = filteredSavedTrades.findIndex(t => t.id === currentTrade.id);
    if (idx === -1) return;
    const targets = [];
    if (idx > 0) targets.push(filteredSavedTrades[idx - 1].symbol);
    if (idx < filteredSavedTrades.length - 1) targets.push(filteredSavedTrades[idx + 1].symbol);
    if (idx > 1) targets.push(filteredSavedTrades[idx - 2].symbol);
    if (idx < filteredSavedTrades.length - 2) targets.push(filteredSavedTrades[idx + 2].symbol);
    prefetchSymbols(targets);
  }, [filteredSavedTrades, prefetchSymbols]);

  const handleSelectSavedTrade = async (trade) => {
    if (!trade) return;
    setSelectedSavedTrade(trade);
    setTraderNote(trade.notes || '');

    const sym = trade.symbol.toUpperCase();
    const cached = priceCacheRef.current.get(sym);
    if (cached && cached.length > 0) {
      setSavedTradePrices(cached);
      setDisplayedSavedTrade(trade);
      setLoadingSavedPrices(false);
      prefetchAdjacentSavedTrades(trade);
      return;
    }

    setLoadingSavedPrices(true);
    try {
      const prices = await fetchStockPrices(trade.symbol);
      setSavedTradePrices(prices);
      setDisplayedSavedTrade(trade);
    } catch (e) {
      console.error(`Error loading prices for saved trade ${trade.symbol}:`, e);
    } finally {
      setLoadingSavedPrices(false);
      prefetchAdjacentSavedTrades(trade);
    }
  };

  const handleSaveTraderNotes = async () => {
    if (!selectedSavedTrade) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${selectedSavedTrade.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: traderNote })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedSavedTrade(updated);
        setNoteSavedFeedback(true);
        setTimeout(() => setNoteSavedFeedback(false), 2500);
      }
    } catch (e) {
      console.error('Error updating trade notes:', e);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Available trading dates for currently selected saved stock
  const availableSavedTradeDates = useMemo(() => {
    if (!savedTradePrices || savedTradePrices.length === 0) return [];
    return savedTradePrices.map(p => p.time || p.date).filter(Boolean);
  }, [savedTradePrices]);

  const handleUpdateTriggerDate = async (tradeId, newDate) => {
    if (!tradeId || !newDate || !selectedSavedTrade) return;
    if (selectedSavedTrade.setup_date === newDate) return;
    setIsUpdatingDate(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${tradeId}/trigger-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_date: newDate })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => (t.id === tradeId || t.id === updated.id) ? updated : t));
        setSelectedSavedTrade(updated);
        setDisplayedSavedTrade(updated);
        setDateUpdatedFeedback(true);
        setTimeout(() => setDateUpdatedFeedback(false), 2500);
      }
    } catch (err) {
      console.error('Error updating trigger date:', err);
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleShiftTriggerDate = (delta) => {
    if (!selectedSavedTrade || !selectedSavedTrade.setup_date) return;
    const currDate = selectedSavedTrade.setup_date;
    const dates = availableSavedTradeDates;
    if (dates.length > 0) {
      let idx = dates.indexOf(currDate);
      if (idx === -1) {
        idx = dates.findIndex(d => d >= currDate);
        if (idx === -1) idx = dates.length - 1;
      }
      const targetIdx = Math.max(0, Math.min(dates.length - 1, idx + delta));
      if (targetIdx !== idx) {
        handleUpdateTriggerDate(selectedSavedTrade.id, dates[targetIdx]);
      }
    } else {
      const d = new Date(currDate + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      handleUpdateTriggerDate(selectedSavedTrade.id, getLocalDateStr(d));
    }
  };

  const handleUpdateSetupType = async (tradeId, newSetupType) => {
    if (!tradeId || !newSetupType || !selectedSavedTrade) return;
    if (selectedSavedTrade.setup_type === newSetupType) return;
    const opt = setupOptions.find(s => s.id === newSetupType);
    const newSetupName = opt ? (opt.name || opt.label) : (SETUP_CANONICAL_NAMES[newSetupType] || newSetupType);

    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${tradeId}/setup-type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_type: newSetupType, setup_name: newSetupName })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => (t.id === tradeId || t.id === updated.id) ? updated : t));
        setSelectedSavedTrade(updated);
        setDisplayedSavedTrade(updated);
      }
    } catch (err) {
      console.error('Error updating setup type:', err);
    }
  };

  const currentSavedIndex = useMemo(() => {
    if (!selectedSavedTrade || filteredSavedTrades.length === 0) return -1;
    return filteredSavedTrades.findIndex(t => t.id === selectedSavedTrade.id);
  }, [selectedSavedTrade, filteredSavedTrades]);

  const handlePrevSavedTrade = () => {
    if (currentSavedIndex > 0) {
      handleSelectSavedTrade(filteredSavedTrades[currentSavedIndex - 1]);
    }
  };

  const handleNextSavedTrade = () => {
    if (currentSavedIndex >= 0 && currentSavedIndex < filteredSavedTrades.length - 1) {
      handleSelectSavedTrade(filteredSavedTrades[currentSavedIndex + 1]);
    }
  };

  // Keyboard navigation (ArrowUp = prev, ArrowDown = next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (activeSubView === 'saved') {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          handleNextSavedTrade();
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          handlePrevSavedTrade();
        }
      } else {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          handleNextCandidate();
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          handlePrevCandidate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayedCandidates, activeSubView, currentSavedIndex, filteredSavedTrades]);

  // Auto-scroll selected candidate into view in the candidates table
  useEffect(() => {
    if (selectedCandidateRowRef.current) {
      selectedCandidateRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedCandidate]);

  // Auto-scroll selected saved trade into view in the saved trades table
  useEffect(() => {
    if (selectedSavedTradeRowRef.current) {
      selectedSavedTradeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedSavedTrade]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (displayedCandidates.length === 0) return;
    const headers = [
      'Symbol',
      'Company Name',
      'Sector',
      'Setup Date',
      'Entry Date',
      'Entry Price',
      'Exit Date',
      'Exit Price',
      'Exit Reason',
      'Trade Return %',
      'Peak Gain %',
      'Max Drawdown %',
      'Days',
      'Target Price',
      'Stop Price',
      'Market Regime',
      'ADR% (20d)',
      'Prior Runup %',
      'Base Depth %',
      'RS Score'
    ];

    const rows = displayedCandidates.map(c => [
      c.symbol,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.sector || '').replace(/"/g, '""')}"`,
      c.setup_date || c.date,
      c.entry_date || '',
      c.entry_price || '',
      c.exit_date || '',
      c.exit_price || '',
      c.exit_reason || '',
      c.trade_return_pct ?? '',
      c.peak_gain_pct ?? '',
      c.max_drawdown_pct ?? '',
      c.holding_days ?? '',
      c.target_price ?? '',
      c.stop_price ?? '',
      c.market_regime || '',
      c.adr_20d ?? '',
      c.prior_runup_pct ?? '',
      c.base_depth_pct ?? '',
      c.rs_score ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `model_book_${setupType}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const summary = scanResult?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '40px' }}>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              📚 Model Book Study
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-color)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              Historical Winners Lab
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            disabled={displayedCandidates.length === 0}
            style={{
              padding: '8px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              cursor: displayedCandidates.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📥</span> Export CSV ({displayedCandidates.length})
          </button>

          <button
            onClick={() => handleRunScan()}
            disabled={loading}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--accent-color)',
              border: 'none',
              color: '#080b11',
              fontWeight: '600',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? (
              <>
                <span className="spin-icon">⟳</span> Scanning History...
              </>
            ) : (
              <>
                <span>⚡</span> Run Study Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-view Switcher: Study & Scanner vs Saved Model Book */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveSubView('study')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeSubView === 'study' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              backgroundColor: activeSubView === 'study' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: activeSubView === 'study' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🔬</span> Study & Scanner
          </button>
          <button
            onClick={() => {
              setActiveSubView('saved');
              if (!selectedSavedTrade && savedTrades.length > 0) {
                handleSelectSavedTrade(savedTrades[0]);
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeSubView === 'saved' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              backgroundColor: activeSubView === 'saved' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: activeSubView === 'saved' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>⭐️</span> My Saved Model Book
            <span style={{
              padding: '1px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              backgroundColor: activeSubView === 'saved' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              color: activeSubView === 'saved' ? '#38bdf8' : 'var(--text-primary)',
              fontWeight: '800'
            }}>
              {savedTrades.length}
            </span>
          </button>
        </div>

        {activeSubView === 'saved' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>📁 Tracked in Git:</span>
            <code style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-primary)' }}>
              data/saved_model_book.json
            </code>
          </div>
        )}
      </div>

      {activeSubView === 'study' ? (
        <>
          {/* 2. Controls & Configuration Toolbar */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
        {/* Setup Selection Pills */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: '85px' }}>
            Setup Pattern:
          </span>
          {setupOptions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelectSetup(s.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: setupType === s.id ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: setupType === s.id ? 'var(--accent-light)' : 'rgba(255, 255, 255, 0.03)',
                color: setupType === s.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: setupType === s.id ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title={s.description || s.desc}
            >
              <span>{s.icon || '📌'}</span>
              <span>{s.name || s.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Sub-Bar for Setups defining sub_setups (e.g., Breakouts, Momentum) */}
        {activeSetup?.sub_setups && activeSetup.sub_setups.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '8px 14px',
            background: setupType === 'momentum' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(56, 189, 248, 0.08)',
            border: setupType === 'momentum' ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: setupType === 'momentum' ? '#c084fc' : '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {activeSetup.sub_title || `${activeSetup.name} Mode:`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {activeSetup.sub_setups.map(sub => {
                const isActive = isSubActive(sub);
                const activeThemeColor = setupType === 'momentum' ? '#a855f7' : '#38bdf8';
                const activeBg = setupType === 'momentum' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)';

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectSubSetup(sub)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '700' : '500',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      backgroundColor: isActive ? activeBg : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      border: isActive ? `1px solid ${activeThemeColor}` : '1px solid var(--border-color)',
                      boxShadow: isActive ? `0 0 10px ${activeBg}` : 'none'
                    }}
                    title={sub.description || sub.label || sub.name}
                  >
                    {sub.label || sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Setup Criteria Preview */}
        {activeFilterChips && activeFilterChips.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600', marginRight: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
              ⚙️ Backtest Criteria:
            </span>
            {activeFilterChips.map((chip, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: chip.highlight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: chip.highlight ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                  color: chip.highlight ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: '500'
                }}
              >
                {chip.text}
              </span>
            ))}
          </div>
        )}

        {/* Trade Execution & Exit Parameters Row */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          {/* Target Gain */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Target Gain:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[10, 16, 20, 30, 50].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    setTargetGainPct(pct);
                    setCustomGain('');
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: targetGainPct === pct && !customGain ? '1px solid #34d399' : '1px solid var(--border-color)',
                    backgroundColor: targetGainPct === pct && !customGain ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                    color: targetGainPct === pct && !customGain ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  +{pct}%
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                placeholder="Custom"
                value={customGain}
                onChange={e => {
                  setCustomGain(e.target.value);
                  if (e.target.value) setTargetGainPct(parseFloat(e.target.value) || 20);
                }}
                style={{
                  width: '60px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {/* Initial Stop Loss */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Stop Loss:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[5, 7, 8, 10].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    setStopLossPct(pct);
                    setCustomStop('');
                  }}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: stopLossPct === pct && !customStop ? '1px solid #f87171' : '1px solid var(--border-color)',
                    backgroundColor: stopLossPct === pct && !customStop ? 'rgba(248, 113, 113, 0.2)' : 'transparent',
                    color: stopLossPct === pct && !customStop ? '#f87171' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  -{pct}%
                </button>
              ))}
              <button
                onClick={() => {
                  setStopLossPct(null);
                  setCustomStop('');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: stopLossPct === null ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: stopLossPct === null ? 'var(--accent-light)' : 'transparent',
                  color: stopLossPct === null ? 'var(--accent-color)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                None
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                placeholder="Custom"
                value={customStop}
                onChange={e => {
                  setCustomStop(e.target.value);
                  if (e.target.value) setStopLossPct(parseFloat(e.target.value) || null);
                }}
                style={{
                  width: '60px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {/* Trailing EMA Exit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }} title="Exit trade when daily close is below the chosen EMA">
              Trailing Exit:
            </span>
            <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'ema_10', label: 'Close < EMA 10' },
                { id: 'ema_20', label: 'Close < EMA 20' },
                { id: 'none', label: 'None / Off' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEmaExitType(opt.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: emaExitType === opt.id ? '#38bdf8' : 'transparent',
                    color: emaExitType === opt.id ? '#080b11' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Forward Window / Horizon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Holding Horizon:
            </span>
            <select
              value={forwardDays}
              onChange={e => setForwardDays(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10 Trading Days (~2 Wks)</option>
              <option value={15}>15 Trading Days (~3 Wks)</option>
              <option value={20}>20 Trading Days (~1 Mo)</option>
              <option value={25}>25 Trading Days (~5 Wks)</option>
              <option value={30}>30 Trading Days (~6 Wks)</option>
              <option value={40}>40 Trading Days (~2 Mo)</option>
              <option value={60}>60 Trading Days (~1 Qtr)</option>
            </select>
          </div>

          {/* Date Range Presets & Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Date Range:
            </span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {datePresets.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  title={p.title}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '5px',
                    border: activeDatePreset === p.id ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                    backgroundColor: activeDatePreset === p.id ? 'var(--accent-light)' : 'rgba(255, 255, 255, 0.03)',
                    color: activeDatePreset === p.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: activeDatePreset === p.id ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                style={{
                  padding: '3px 6px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px'
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                style={{
                  padding: '3px 6px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fda4af', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 3. Summary Statistics Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Card 1: Win Rate & Trades */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Win Rate (≥ +{summary.target_gain_pct}%)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="stat-value" style={{ color: summary.win_rate_pct >= 30 ? '#34d399' : '#f87171' }}>
                {summary.win_rate_pct}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({summary.total_winners} wins / {summary.total_trades} trades)
              </span>
            </div>
            <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
              Period: {summary.date_range?.start || startDate} to {summary.date_range?.end || endDate} • {summary.total_setups} Setups
            </span>
          </div>

          {/* Card 2: Exit Breakdown */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Exit Breakdown</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>🎯 Target Hit:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{summary.win_rate_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f87171', fontWeight: 600 }}>🛑 Stop Loss:</span>
                <span style={{ fontWeight: 700, color: summary.stop_loss_rate_pct > 0 ? '#f87171' : 'var(--text-secondary)' }}>{summary.stop_loss_rate_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>📉 Trailing Exit:</span>
                <span style={{ fontWeight: 700, color: '#fbbf24' }}>{summary.ema_exit_rate_pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>⏱️ Expired:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{summary.time_expired_rate_pct}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Profit Factor & Expectancy */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Profit Factor & Expectancy</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="stat-value" style={{ color: summary.profit_factor >= 1.5 ? '#34d399' : (summary.profit_factor >= 1.0 ? '#fbbf24' : '#f87171') }}>
                {summary.profit_factor}x
              </span>
              <span style={{ fontSize: '12px', color: summary.avg_trade_return_pct >= 0 ? '#34d399' : '#f87171' }}>
                Avg {summary.avg_trade_return_pct >= 0 ? `+${summary.avg_trade_return_pct}%` : `${summary.avg_trade_return_pct}%`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Avg Win: <strong style={{ color: '#34d399' }}>+{summary.avg_winner_gain_pct}%</strong></span>
              <span>Avg Loss: <strong style={{ color: '#f87171' }}>{summary.avg_loser_loss_pct}%</strong></span>
            </div>
          </div>

          {/* Card 4: Median Days to Target */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Median Days to Target</span>
            <span className="stat-value" style={{ color: '#38bdf8' }}>
              {summary.median_days_to_target || '-'} <span style={{ fontSize: '16px', fontWeight: '400' }}>days</span>
            </span>
            <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
              Avg trade drawdown: {summary.avg_drawdown_pct}%
            </span>
          </div>

          {/* Card 5: Best Trade */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Best Trade</span>
            {summary.best_performer ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="stat-value" style={{ color: '#facc15' }}>
                    {summary.best_performer.symbol}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#34d399' }}>
                    +{summary.best_performer.gain_pct}%
                  </span>
                </div>
                <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
                  {summary.best_performer.date} • {summary.best_performer.sector || 'Equities'}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>None</span>
            )}
          </div>

          {/* Card 6: Market Timing Edge */}
          {summary.regime_breakdown && (
            <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
              <span className="stat-label">Market Timing Edge</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Bullish Tape:</span>
                  <span style={{ fontWeight: 700, color: (summary.regime_breakdown.BULLISH?.win_rate_pct ?? 0) >= 25 ? '#34d399' : 'var(--text-primary)' }}>
                    {summary.regime_breakdown.BULLISH?.win_rate_pct ?? 0}% ({summary.regime_breakdown.BULLISH?.winners ?? 0}/{summary.regime_breakdown.BULLISH?.total ?? 0})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>🟡 Caution Tape:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {summary.regime_breakdown.CAUTION?.win_rate_pct ?? 0}% ({summary.regime_breakdown.CAUTION?.winners ?? 0}/{summary.regime_breakdown.CAUTION?.total ?? 0})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#fb7185', fontWeight: 600 }}>🔴 Bearish Tape:</span>
                  <span style={{ fontWeight: 700, color: '#fb7185' }}>
                    {summary.regime_breakdown.BEARISH?.win_rate_pct ?? 0}% ({summary.regime_breakdown.BEARISH?.winners ?? 0}/{summary.regime_breakdown.BEARISH?.total ?? 0})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Split-Screen Layout: Interactive Model Book Chart (Left) + Master Table (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(320px, 28%)', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: Model Book Chart Reviewer */}
        <div className="glass-card" style={{ minWidth: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedCandidate ? (
            <>
              {/* Active Winner Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {selectedCandidate.symbol}
                    </h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {selectedCandidate.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8'
                      }}
                    >
                      {selectedCandidate.sector}
                    </span>
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(56, 189, 248, 0.18)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Setup Bar Date"
                    >
                      📅 Setup: {selectedCandidate.setup_date || selectedCandidate.date}
                    </span>
                    {selectedCandidate.entry_date && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: 'rgba(16, 185, 129, 0.18)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Breakout Buy Stop executed on ${selectedCandidate.entry_date}`}
                      >
                        ⚡ Entry: {selectedCandidate.entry_date} @ ${selectedCandidate.entry_price?.toFixed(2)}
                      </span>
                    )}
                    {selectedCandidate.exit_reason && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: selectedCandidate.exit_reason === 'TARGET'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : (selectedCandidate.exit_reason === 'STOP_LOSS'
                              ? 'rgba(244, 63, 94, 0.18)'
                              : 'rgba(245, 158, 11, 0.18)'),
                          color: selectedCandidate.exit_reason === 'TARGET'
                            ? '#34d399'
                            : (selectedCandidate.exit_reason === 'STOP_LOSS'
                              ? '#fb7185'
                              : '#fbbf24'),
                          border: `1px solid ${selectedCandidate.exit_reason === 'TARGET'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : (selectedCandidate.exit_reason === 'STOP_LOSS'
                              ? 'rgba(244, 63, 94, 0.35)'
                              : 'rgba(245, 158, 11, 0.35)')}`,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Exit Date: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price ? selectedCandidate.exit_price.toFixed(2) : '-'}`}
                      >
                        {selectedCandidate.exit_reason === 'TARGET' && `🎯 Target Hit: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price?.toFixed(2)}`}
                        {selectedCandidate.exit_reason === 'STOP_LOSS' && `🛑 Stopped Out: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price?.toFixed(2)}`}
                        {selectedCandidate.exit_reason === 'EMA_10_EXIT' && `📉 < EMA 10: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price?.toFixed(2)}`}
                        {selectedCandidate.exit_reason === 'EMA_20_EXIT' && `📉 < EMA 20: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price?.toFixed(2)}`}
                        {selectedCandidate.exit_reason === 'TIME_EXPIRED' && `⏱️ Expired: ${selectedCandidate.exit_date} @ $${selectedCandidate.exit_price?.toFixed(2)}`}
                      </span>
                    )}
                    {selectedCandidate.adr_20d !== null && selectedCandidate.adr_20d !== undefined && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: selectedCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(59, 130, 246, 0.15)',
                          color: selectedCandidate.adr_20d >= 5.0 ? '#fbbf24' : '#60a5fa',
                          border: selectedCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="20-Day Average Daily Range (ADR%) on Trigger Date"
                      >
                        ⚡ ADR: {selectedCandidate.adr_20d.toFixed(1)}%
                      </span>
                    )}
                    {selectedCandidate.market_regime && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: selectedCandidate.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.18)'
                              : 'rgba(245, 158, 11, 0.18)'),
                          color: selectedCandidate.market_regime === 'BULLISH'
                            ? '#34d399'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? '#fb7185'
                              : '#fbbf24'),
                          border: `1px solid ${selectedCandidate.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.35)'
                              : 'rgba(245, 158, 11, 0.35)')}`,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Market on trigger date: ${selectedCandidate.market_label || selectedCandidate.market_regime}\nQQQ Close: $${selectedCandidate.market_index_close ?? '-'}\nStack: ${selectedCandidate.market_stack ?? '-'}`}
                      >
                        {selectedCandidate.market_regime === 'BULLISH' && '🟢 Tape: Bullish'}
                        {selectedCandidate.market_regime === 'CAUTION' && '🟡 Tape: Caution'}
                        {selectedCandidate.market_regime === 'BEARISH' && '🔴 Tape: Bearish'}
                        {!['BULLISH', 'CAUTION', 'BEARISH'].includes(selectedCandidate.market_regime) && `Tape: ${selectedCandidate.market_regime}`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '12.5px', flexWrap: 'wrap' }}>
                    <span>
                      Trade Return: <strong style={{ color: selectedCandidate.trade_return_pct >= 0 ? '#34d399' : '#f87171', fontSize: '13.5px' }}>
                        {selectedCandidate.trade_return_pct >= 0 ? `+${selectedCandidate.trade_return_pct}%` : `${selectedCandidate.trade_return_pct}%`}
                      </strong>
                    </span>
                    <span>
                      Target: <strong style={{ color: '#34d399' }}>${selectedCandidate.target_price?.toFixed(2)} (+{targetGainPct}%)</strong>
                    </span>
                    <span>
                      Stop: <strong style={{ color: selectedCandidate.stop_price ? '#f87171' : 'var(--text-muted)' }}>
                        {selectedCandidate.stop_price ? `$${selectedCandidate.stop_price.toFixed(2)} (-${stopLossPct}%)` : 'None'}
                      </strong>
                    </span>
                    <span>
                      Peak: <strong style={{ color: '#34d399' }}>${selectedCandidate.peak_price?.toFixed(2) || '-'} (+{selectedCandidate.peak_gain_pct}%)</strong>
                    </span>
                    <span>
                      Max DD: <strong style={{ color: selectedCandidate.max_drawdown_pct < -8 ? '#f87171' : 'var(--text-secondary)' }}>{selectedCandidate.max_drawdown_pct}%</strong>
                    </span>
                    <span>
                      Held: <strong style={{ color: '#38bdf8' }}>{selectedCandidate.holding_days != null ? `${selectedCandidate.holding_days}d` : '-'}</strong>
                    </span>
                  </div>
                </div>

                {/* Navigation and Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Previous / Next buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handlePrevCandidate}
                      disabled={currentIndex <= 0}
                      title="Previous Winner (↑ Arrow)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentIndex > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      ◀ Prev
                    </button>
                    <button
                      onClick={handleNextCandidate}
                      disabled={currentIndex >= displayedCandidates.length - 1}
                      title="Next Winner (↓ Arrow)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentIndex < displayedCandidates.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentIndex < displayedCandidates.length - 1 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Next ▶
                    </button>
                  </div>


                  {/* Save to Model Book Button (1-Click direct save) */}
                  <button
                    onClick={() => handleToggleSaveCandidate(selectedCandidate)}
                    disabled={savingToModelBook}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isCandidateSaved(selectedCandidate) ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: isCandidateSaved(selectedCandidate) ? '1px solid #34d399' : '1px solid var(--border-color)',
                      color: isCandidateSaved(selectedCandidate) ? '#34d399' : 'var(--text-primary)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: savingToModelBook ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                    title={isCandidateSaved(selectedCandidate) ? "Saved in Model Book (Click to remove)" : "Save to Model Book (1-click save to git)"}
                  >
                    <span>{isCandidateSaved(selectedCandidate) ? '★' : '☆'}</span>
                    {savingToModelBook ? 'Saving...' : (isCandidateSaved(selectedCandidate) ? 'Saved' : 'Save')}
                  </button>

                  {/* Open Inspector Drawer if available */}
                  {onSelectStock && (
                    <button
                      onClick={() => onSelectStock({ symbol: selectedCandidate.symbol })}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      title="Open full inspector details"
                    >
                      🔍 Inspect
                    </button>
                  )}

                  {/* Header Quick Screenshot Action Button */}
                  <button
                    onClick={() => modelBookChartRef.current?.saveScreenshot()}
                    disabled={!selectedCandidate || loadingPrices || !stockPrices || stockPrices.length === 0}
                    title={`Take chart screenshot and store in ./charts/${currentSetupDisplayName}/${(selectedCandidate?.date || selectedCandidate?.screen_date || 'date')}_${selectedCandidate?.symbol || 'STOCK'}.png`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      cursor: (!selectedCandidate || loadingPrices || !stockPrices || stockPrices.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Candlestick Chart */}
              <div style={{ width: '100%', height: '580px', minHeight: '580px', position: 'relative' }}>
                {/* Sleek top loading indicator line (zero screen blackout) */}
                {loadingPrices && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    zIndex: 30,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '2px 2px 0 0'
                  }}>
                    <div className="screener-progress-indicator" />
                  </div>
                )}
                {stockPrices && stockPrices.length > 0 ? (
                  <CandlestickChart
                    ref={modelBookChartRef}
                    data={stockPrices}
                    height={580}
                    asOfDate={displayedChartCandidate?.setup_date || displayedChartCandidate?.date || displayedChartCandidate?.screen_date || selectedCandidate?.setup_date || selectedCandidate?.date}
                    symbol={displayedChartCandidate?.symbol || selectedCandidate?.symbol}
                    setupName={currentSetupDisplayName}
                    companyName={displayedChartCandidate?.name || selectedCandidate?.name}
                    showScreenshotButton={true}
                  />
                ) : loadingPrices ? (
                  <div style={{ height: '580px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <span className="spin-icon" style={{ marginRight: '8px' }}>⟳</span> Loading price history for {selectedCandidate?.symbol}...
                  </div>
                ) : (
                  <div style={{ height: '580px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No historical prices available for {selectedCandidate?.symbol}.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ height: '580px', minHeight: '580px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px' }}>
              <span style={{ fontSize: '40px' }}>📖</span>
              <p style={{ fontSize: '14px' }}>Select a winner candidate from the table to load its chart and study setup characteristics.</p>
            </div>
          )}
        </div>

        {/* Right Column: Candidates & Winners Table */}
        <div className="glass-card" style={{ minWidth: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Table Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* View Mode Pills: Winners vs All */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setViewMode('winners')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'winners' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'winners' ? '#080b11' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🏆 Winners Only ({scanResult?.winners?.length || 0})
              </button>
              <button
                onClick={() => setViewMode('all')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'all' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'all' ? '#080b11' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                All Setups ({scanResult?.all_candidates?.length || 0})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Sector filter */}
              <select
                value={selectedSector}
                onChange={e => {
                  setSelectedSector(e.target.value);
                  setSelectedCandidate(null);
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: selectedSector !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: selectedSector !== 'ALL' ? '#38bdf8' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: selectedSector !== 'ALL' ? '600' : '400',
                  cursor: 'pointer'
                }}
                title="Filter candidates by sector"
              >
                <option value="ALL">
                  All Sectors ({viewMode === 'winners' ? (scanResult?.winners?.length || 0) : (scanResult?.all_candidates?.length || 0)})
                </option>
                {sectorCounts.map(({ sector, count }) => (
                  <option key={sector} value={sector}>
                    {sector} ({count})
                  </option>
                ))}
              </select>

              {/* Market Tape filter */}
              <select
                value={selectedRegime}
                onChange={e => setSelectedRegime(e.target.value)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: selectedRegime === 'BULLISH' ? '#34d399' : (selectedRegime === 'BEARISH' ? '#fb7185' : (selectedRegime === 'CAUTION' ? '#fbbf24' : 'var(--text-primary)')),
                  fontSize: '12px',
                  fontWeight: selectedRegime !== 'ALL' ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Market Tapes</option>
                <option value="BULLISH">🟢 Bullish Tape</option>
                <option value="CAUTION">🟡 Caution Tape</option>
                <option value="BEARISH">🔴 Bearish Tape</option>
              </select>
            </div>
          </div>

          {/* Search bar & sub-header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              type="text"
              placeholder="Search ticker or company name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                backgroundColor: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12.5px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '0 2px' }}>
              <span>Showing {displayedCandidates.length} setups</span>
              <span>Use ↑ / ↓ arrow keys to flip</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="custom-scrollbar" style={{ height: '600px', maxHeight: '600px', overflowX: 'hidden', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('symbol')}
                    style={{
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#111827',
                      borderBottom: '1px solid var(--border-color)',
                      width: '34%',
                      padding: '8px 10px',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                  >
                    Ticker {sortField === 'symbol' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('date')}
                    style={{
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#111827',
                      borderBottom: '1px solid var(--border-color)',
                      width: '36%',
                      padding: '8px 6px',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                  >
                    Setup {sortField === 'date' || sortField === 'setup_date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('market_regime')}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#111827',
                      borderBottom: '1px solid var(--border-color)',
                      width: '30%',
                      padding: '8px 6px',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                  >
                    Tape {sortField === 'market_regime' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {loading ? 'Analyzing historical setups and trade paths...' : 'No setups found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  displayedCandidates.map(cand => {
                    const candDate = cand.setup_date || cand.date;
                    const isSelected = selectedCandidate && selectedCandidate.symbol === cand.symbol && (selectedCandidate.setup_date || selectedCandidate.date) === candDate;
                    const isWinner = cand.hit_target;

                    return (
                      <tr
                        key={`${cand.symbol}_${candDate}`}
                        ref={isSelected ? selectedCandidateRowRef : null}
                        onClick={() => handleSelectCandidate(cand)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                          boxShadow: isSelected ? 'inset 3px 0 0 var(--accent-color)' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontWeight: '700', color: isWinner ? '#34d399' : (cand.trade_return_pct > 0 ? 'var(--text-primary)' : 'var(--text-secondary)') }}>
                              {cand.symbol}
                            </span>
                            {isWinner && <span title="Hit Profit Target" style={{ fontSize: '10px' }}>🏆</span>}
                          </div>
                        </td>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{candDate}</td>

                        {/* Market Tape Column */}
                        <td style={{ textAlign: 'center' }}>
                          {cand.market_regime === 'BULLISH' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(16, 185, 129, 0.18)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                fontWeight: 700
                              }}
                              title={`Bullish Uptrend (Green Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🟢 Bullish
                            </span>
                          )}
                          {cand.market_regime === 'CAUTION' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(245, 158, 11, 0.18)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                fontWeight: 700
                              }}
                              title={`Caution / Pullback (Yellow Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🟡 Caution
                            </span>
                          )}
                          {cand.market_regime === 'BEARISH' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(244, 63, 94, 0.18)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                fontSize: '10px',
                                padding: '1px 6px',
                                fontWeight: 700
                              }}
                              title={`High Risk / Distribution (Red Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🔴 Bearish
                            </span>
                          )}
                          {!['BULLISH', 'CAUTION', 'BEARISH'].includes(cand.market_regime) && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                          )}
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
    </>
  ) : (
    /* ================== MY SAVED MODEL BOOK SUB-VIEW ================== */
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Saved Trades Filter Bar */}
      <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search symbol, notes, setup..."
              value={savedTradeSearch}
              onChange={e => setSavedTradeSearch(e.target.value)}
              style={{
                padding: '6px 10px 6px 28px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                width: '240px'
              }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
              🔍
            </span>
            {savedTradeSearch && (
              <button
                onClick={() => setSavedTradeSearch('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Setup Filter */}
          <select
            value={savedTradeFilterSetup}
            onChange={e => setSavedTradeFilterSetup(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Setups ({savedTrades.length})</option>
            {setupOptions.map(opt => {
              const count = savedTrades.filter(t => t.setup_type === opt.id).length;
              return (
                <option key={opt.id} value={opt.id}>
                  {opt.icon || '📌'} {opt.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredSavedTrades.length}</strong> of <strong>{savedTrades.length}</strong> saved textbook setups
          </span>
        </div>
      </div>

      {/* Split View: Left Chart & Notes + Right List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(320px, 28%)', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: Chart & Study Notes */}
        <div className="glass-card" style={{ minWidth: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '650px' }}>
          {selectedSavedTrade ? (
            <>
              {/* Header Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {selectedSavedTrade.symbol}
                    </span>
                    {/* Interactive Setup Type Selector */}
                    <select
                      value={selectedSavedTrade.setup_type}
                      onChange={e => handleUpdateSetupType(selectedSavedTrade.id, e.target.value)}
                      title="Click to reclassify setup type"
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {setupOptions.map(opt => (
                        <option key={opt.id} value={opt.id} style={{ backgroundColor: '#181b22', color: 'var(--text-primary)' }}>
                          {opt.icon || '📌'} {opt.name || opt.label}
                        </option>
                      ))}
                    </select>
                    {/* Interactive Trigger Date Editor */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                      }}
                      title="Adjust trigger date: click calendar to pick a date, or use ◀ / ▶ to shift 1 trading bar"
                    >
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Trigger:
                      </span>
                      <button
                        onClick={() => handleShiftTriggerDate(-1)}
                        disabled={isUpdatingDate}
                        title="Shift trigger date 1 bar earlier (◀)"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '3px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          padding: '1px 6px',
                          fontSize: '11px',
                          lineHeight: 1.2
                        }}
                      >
                        ◀
                      </button>
                      <input
                        type="date"
                        value={selectedSavedTrade.setup_date || ''}
                        onChange={e => handleUpdateTriggerDate(selectedSavedTrade.id, e.target.value)}
                        disabled={isUpdatingDate}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          outline: 'none',
                          padding: '0 2px'
                        }}
                      />
                      <button
                        onClick={() => handleShiftTriggerDate(1)}
                        disabled={isUpdatingDate}
                        title="Shift trigger date 1 bar later (▶)"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '3px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          padding: '1px 6px',
                          fontSize: '11px',
                          lineHeight: 1.2
                        }}
                      >
                        ▶
                      </button>
                      {dateUpdatedFeedback && (
                        <span style={{ color: '#34d399', fontSize: '11px', fontWeight: '700', marginLeft: '4px' }}>
                          ✓ Date updated
                        </span>
                      )}
                    </div>
                    {selectedSavedTrade.market_regime && (
                      <span
                        className="pill"
                        style={{
                          backgroundColor: selectedSavedTrade.market_regime === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : (selectedSavedTrade.market_regime === 'BEARISH' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                          color: selectedSavedTrade.market_regime === 'BULLISH' ? '#34d399' : (selectedSavedTrade.market_regime === 'BEARISH' ? '#fb7185' : '#fbbf24'),
                          border: selectedSavedTrade.market_regime === 'BULLISH' ? '1px solid rgba(16, 185, 129, 0.3)' : (selectedSavedTrade.market_regime === 'BEARISH' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'),
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        Tape: {selectedSavedTrade.market_regime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Prev / Next Review Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handlePrevSavedTrade}
                      disabled={currentSavedIndex <= 0}
                      title="Previous Saved Trade (↑ Arrow or K)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentSavedIndex > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentSavedIndex > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      ◀ Prev
                    </button>
                    <button
                      onClick={handleNextSavedTrade}
                      disabled={currentSavedIndex >= filteredSavedTrades.length - 1}
                      title="Next Saved Trade (↓ Arrow or J)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentSavedIndex < filteredSavedTrades.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentSavedIndex < filteredSavedTrades.length - 1 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Next ▶
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteSavedTrade(selectedSavedTrade.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#fb7185',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Remove from saved model book"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              {/* Candlestick Chart */}
              <div style={{ width: '100%', position: 'relative' }}>
                {/* Sleek top loading indicator line (zero screen blackout) */}
                {loadingSavedPrices && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    zIndex: 30,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '2px 2px 0 0'
                  }}>
                    <div className="screener-progress-indicator" />
                  </div>
                )}
                {savedTradePrices && savedTradePrices.length > 0 ? (
                  <CandlestickChart
                    data={savedTradePrices}
                    height={500}
                    asOfDate={displayedSavedTrade?.setup_date || selectedSavedTrade.setup_date}
                    symbol={displayedSavedTrade?.symbol || selectedSavedTrade.symbol}
                    setupName={displayedSavedTrade?.setup_name || displayedSavedTrade?.setup_type || selectedSavedTrade.setup_name || selectedSavedTrade.setup_type}
                    selectedStock={displayedSavedTrade || selectedSavedTrade}
                    showScreenshotButton={true}
                    showPriceLine={false}
                  />
                ) : loadingSavedPrices ? (
                  <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <span className="spin-icon" style={{ marginRight: '8px' }}>⟳</span> Loading prices for {selectedSavedTrade?.symbol}...
                  </div>
                ) : (
                  <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No historical prices available for {selectedSavedTrade?.symbol}.
                  </div>
                )}
              </div>

              {/* Trader Study Notes Editor */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      📝 Trader Study Notes
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      (Committed to Git in data/saved_model_book.json)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {noteSavedFeedback && (
                      <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>
                        ✓ Saved to git!
                      </span>
                    )}
                    <button
                      onClick={handleSaveTraderNotes}
                      disabled={isSavingNote}
                      style={{
                        padding: '5px 12px',
                        backgroundColor: 'var(--accent-color)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: isSavingNote ? 'wait' : 'pointer'
                      }}
                    >
                      {isSavingNote ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={traderNote}
                  onChange={e => setTraderNote(e.target.value)}
                  placeholder="Write your observations about this setup: What made the base special? How did volume behave? How did it respect the 10/20 EMA? What was the earnings/catalyst driver?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ height: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
              <span style={{ fontSize: '48px' }}>⭐️</span>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>My Saved Model Book</h3>
              <p style={{ margin: 0, fontSize: '13.5px', maxWidth: '450px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {savedTrades.length === 0
                  ? 'You have not saved any trades yet. Switch over to the "Study & Scanner" tab, find an exemplary setup, and click "☆ Save to Model Book" to add it here.'
                  : 'Select a saved trade from the list on the right to review its textbook chart and notes.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Saved Trades List */}
        <div className="glass-card" style={{ minWidth: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Saved Setups
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
              {filteredSavedTrades.length} Entries
            </span>
          </div>

          {/* Saved Trades Table */}
          <div className="custom-scrollbar" style={{ height: '640px', maxHeight: '640px', overflowX: 'hidden', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#111827', borderBottom: '1px solid var(--border-color)', width: '42%', padding: '8px 10px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>Ticker</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#111827', borderBottom: '1px solid var(--border-color)', width: '30%', padding: '8px 6px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#111827', borderBottom: '1px solid var(--border-color)', width: '18%', textAlign: 'center', padding: '8px 6px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>Tape</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#111827', borderBottom: '1px solid var(--border-color)', width: '10%', textAlign: 'center', padding: '8px 4px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredSavedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px 15px', color: 'var(--text-muted)' }}>
                      {loadingSavedTrades
                        ? 'Loading saved trades...'
                        : (savedTrades.length === 0
                            ? 'No saved trades yet. Save golden setups from the Study & Scanner tab!'
                            : 'No saved trades match the search/filter.')}
                    </td>
                  </tr>
                ) : (
                  filteredSavedTrades.map(trade => {
                    const isSelected = selectedSavedTrade && selectedSavedTrade.id === trade.id;

                    return (
                      <tr
                        key={trade.id}
                        ref={isSelected ? selectedSavedTradeRowRef : null}
                        onClick={() => handleSelectSavedTrade(trade)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                          boxShadow: isSelected ? 'inset 3px 0 0 #38bdf8' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                              {trade.symbol}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {trade.setup_name || trade.setup_type}
                            </span>
                            {trade.notes && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={trade.notes}>
                                📝 {trade.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {trade.setup_date}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {trade.market_regime === 'BULLISH' && <span title="Bullish Tape">🟢</span>}
                          {trade.market_regime === 'CAUTION' && <span title="Caution Tape">🟡</span>}
                          {trade.market_regime === 'BEARISH' && <span title="Bearish Tape">🔴</span>}
                          {!['BULLISH', 'CAUTION', 'BEARISH'].includes(trade.market_regime) && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedTrade(trade.id);
                            }}
                            title="Delete from saved model book"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '13px',
                              padding: '2px 4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            🗑️
                          </button>
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
    </div>
  )}

    </div>
  );
}

