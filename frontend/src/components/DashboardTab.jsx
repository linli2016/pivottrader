import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ScoreMoversCard from './ScoreMoversCard';
import SyncDataTab from './SyncDataTab';
import MarketPulseCard from './MarketPulseCard';
import { getLocalDateStr } from '../utils/dateUtils';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

const CATEGORY_STYLES = {
  'EQUITIES': {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.08)',
    border: 'rgba(56, 189, 248, 0.35)',
    dot: '#38bdf8'
  },
  'RATES': {
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.35)',
    dot: '#eab308'
  },
  'CREDIT': {
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.35)',
    dot: '#a855f7'
  },
  'FX · COMM': {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981'
  },
  'VOLATILITY': {
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.35)',
    dot: '#f43f5e'
  },
  'CRYPTO': {
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.35)',
    dot: '#06b6d4'
  }
};

const DEFAULT_CROSS_ASSETS = [
  // 1. EQUITIES
  { symbol: "SPY", name: "S&P 500 ETF", category: "EQUITIES", price: 761.69, change_pct: -0.12, format: "price" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", category: "EQUITIES", price: 721.45, change_pct: 0.63, format: "price" },
  { symbol: "IWM", name: "Russell 2000 ETF", category: "EQUITIES", price: 284.10, change_pct: -0.47, format: "price" },
  { symbol: "DIA", name: "Dow Jones 30 ETF", category: "EQUITIES", price: 515.88, change_pct: -0.48, format: "price" },
  // 2. RATES
  { symbol: "US10Y", name: "10-Year Treasury Yield", category: "RATES", price: 5.00, change_pct: 1.03, format: "yield_pct" },
  { symbol: "2S10S", name: "10Y-2Y Yield Curve Spread", category: "RATES", price: "27bp", change_pct: null, format: "text" },
  { symbol: "IEF", name: "7-10 Year Treasury Bond ETF", category: "RATES", price: 90.80, change_pct: -0.49, format: "price" },
  // 3. CREDIT
  { symbol: "HYG", name: "High Yield Corporate Bond ETF", category: "CREDIT", price: 78.53, change_pct: -0.24, format: "price" },
  { symbol: "HY OAS", name: "High Yield Option-Adjusted Spread", category: "CREDIT", price: "270bp", change_pct: null, format: "text" },
  // 4. FX · COMM
  { symbol: "DXY", name: "US Dollar Index", category: "FX · COMM", price: 99.94, change_pct: 0.01, format: "index" },
  { symbol: "WTI", name: "WTI Crude Oil ($/bbl)", category: "FX · COMM", price: 93.93, change_pct: -2.24, format: "price" },
  { symbol: "GOLD", name: "Gold Spot / Futures ($/oz)", category: "FX · COMM", price: 4413.4, change_pct: -0.26, format: "price_comma" },
  { symbol: "CU/AU", name: "Copper / Gold Growth Ratio", category: "FX · COMM", price: 0.00149, change_pct: -0.14, format: "ratio_5dec" },
  // 5. VOLATILITY
  { symbol: "VIX", name: "CBOE Volatility Index", category: "VOLATILITY", price: 14.81, change_pct: -4.08, format: "index" },
  { symbol: "MOVE", name: "ICE BofA Bond Volatility Index", category: "VOLATILITY", price: 80.6, change_pct: 5.80, format: "index" },
  // 6. CRYPTO
  { symbol: "BTC", name: "Bitcoin ($)", category: "CRYPTO", price: 81396, change_pct: 0.29, format: "crypto_comma" },
  { symbol: "ETH", name: "Ethereum ($)", category: "CRYPTO", price: 2678, change_pct: 1.27, format: "crypto_comma" }
];

const formatAssetPrice = (item) => {
  if (typeof item.price === 'string') return item.price;
  const num = Number(item.price);
  if (isNaN(num)) return '-';
  if (item.format === 'yield_pct') return `${num.toFixed(2)}%`;
  if (item.format === 'ratio_5dec') return num.toFixed(5);
  if (item.format === 'crypto_comma' || item.format === 'price_comma') {
    return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
  return num.toFixed(2);
};

const formatCapFlow = (val, showSign = true) => {
  if (val === null || val === undefined || isNaN(val)) return '$0B';
  const absVal = Math.abs(val);
  const sign = showSign ? (val < 0 ? '-' : '+') : '';
  if (absVal >= 1e12) return `${sign}$${(absVal / 1e12).toFixed(2)}T`;
  if (absVal >= 1e9) return `${sign}$${(absVal / 1e9).toFixed(1)}B`;
  if (absVal >= 1e6) return `${sign}$${(absVal / 1e6).toFixed(1)}M`;
  return `${sign}$${absVal.toLocaleString()}`;
};

const renderSparkline = (item) => {
  const chg = item.change_pct;
  const isUp = chg !== null && chg !== undefined && chg > 0;
  const isDown = chg !== null && chg !== undefined && chg < 0;
  const strokeColor = isUp ? '#10b981' : isDown ? '#f43f5e' : '#94a3b8';
  const fillColor = isUp ? 'rgba(16, 185, 129, 0.18)' : isDown ? 'rgba(244, 63, 94, 0.18)' : 'rgba(148, 163, 184, 0.12)';

  const width = 38;
  const height = 18;

  let hash = 0;
  for (let i = 0; i < item.symbol.length; i++) {
    hash = (hash * 31 + item.symbol.charCodeAt(i)) % 1000;
  }

  const numPoints = 8;
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    let y = 0.5;
    if (isUp) {
      y = 0.75 - t * 0.55 + Math.sin(t * 8 + hash) * 0.12;
    } else if (isDown) {
      y = 0.25 + t * 0.55 + Math.sin(t * 8 + hash) * 0.12;
    } else {
      y = 0.5 + Math.sin(t * 10 + hash) * 0.2;
    }
    y = Math.max(0.1, Math.min(0.9, y));
    const px = t * width;
    const py = y * height;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'hidden' }}>
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function DashboardTab({
  summary,
  syncStatus,
  handleTriggerLiveQuotesSync,
  handleTriggerSync,
  fetchSyncStatus,
  fetchSummary,
  setActiveTab,
  handleSelectStock,
  onSelectSetup,
  tradingDates = [],
  // Subpage controls
  subpage,
  onSubpageChange,
  // Market Ingest props
  syncPrices,
  setSyncPrices,
  syncFundamentals,
  setSyncFundamentals,
  syncSponsorship,
  setSyncSponsorship,
  syncSponsorshipUniverse,
  setSyncSponsorshipUniverse,
  syncPremarket,
  setSyncPremarket,
  syncHistoryYears,
  setSyncHistoryYears,
  syncForceFull,
  setSyncForceFull,
  syncFixSplits,
  setSyncFixSplits,
  handleTriggerRepairSplits,
}) {
  const [internalSubpage, setInternalSubpage] = useState('cockpit');
  const activeSubpage = subpage !== undefined ? subpage : internalSubpage;
  const handleSubpageChange = (newSubpage) => {
    if (onSubpageChange) {
      onSubpageChange(newSubpage);
    } else {
      setInternalSubpage(newSubpage);
    }
  };

  const [marketData, setMarketData] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [topGroups, setTopGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [focusLeaders, setFocusLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  // As Of Date selection state
  const [asOfDate, setAsOfDate] = useState('');
  const [availableDates, setAvailableDates] = useState(tradingDates || []);

  useEffect(() => {
    if (tradingDates && tradingDates.length > 0) {
      setAvailableDates(tradingDates);
    } else {
      fetch(`${API_BASE}/api/trading-dates`)
        .then(res => res.ok ? res.json() : [])
        .then(dates => {
          if (Array.isArray(dates) && dates.length > 0) setAvailableDates(dates);
        })
        .catch(err => console.error('Error fetching trading dates:', err));
    }
  }, [tradingDates]);

  const todayStr = new Date().toLocaleDateString('en-CA');
  const latestDbDate = availableDates && availableDates.length > 0 ? availableDates[0] : (summary?.last_price_date || todayStr);
  const maxSelectableDate = (latestDbDate && latestDbDate > todayStr)
    ? latestDbDate
    : new Date(Date.now() + 86400000 * 7).toLocaleDateString('en-CA');

  const curDateStr = (asOfDate && asOfDate !== 'latest') ? asOfDate : latestDbDate;

  const isWeekend = useCallback((dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    return day === 0 || day === 6;
  }, []);

  const getPrevWeekday = useCallback((dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay();
    const daysBack = dayOfWeek === 1 ? 3 : dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 1 : 1;
    dt.setDate(dt.getDate() - daysBack);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getNextWeekday = useCallback((dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayOfWeek = dt.getDay();
    const daysForward = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : dayOfWeek === 0 ? 1 : 1;
    dt.setDate(dt.getDate() + daysForward);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const prevDate = useMemo(() => {
    if (!curDateStr) return null;
    if (availableDates && availableDates.length > 0) {
      const prevTrading = availableDates.find(d => d < curDateStr && !isWeekend(d));
      if (prevTrading) return prevTrading;
    }
    return getPrevWeekday(curDateStr);
  }, [curDateStr, availableDates, isWeekend, getPrevWeekday]);

  const nextDate = useMemo(() => {
    if (!curDateStr) return null;
    if (availableDates && availableDates.length > 0) {
      const newerTrading = availableDates.filter(d => d > curDateStr && !isWeekend(d));
      if (newerTrading.length > 0) {
        return newerTrading[newerTrading.length - 1];
      }
    }
    return getNextWeekday(curDateStr);
  }, [curDateStr, availableDates, isWeekend, getNextWeekday]);

  const canGoPrev = Boolean(prevDate);
  const canGoNext = Boolean(nextDate && (!maxSelectableDate || nextDate <= maxSelectableDate));

  const handlePrevDay = () => {
    if (canGoPrev && prevDate) {
      setAsOfDate(prevDate);
    }
  };

  const handleNextDay = () => {
    if (canGoNext && nextDate) {
      if (nextDate === latestDbDate) {
        setAsOfDate('');
      } else {
        setAsOfDate(nextDate);
      }
    }
  };

  const scrollToIngest = useCallback(() => {
    const el = document.getElementById('market-ingest-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (subpage === 'ingest') {
      const timer = setTimeout(() => {
        scrollToIngest();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [subpage, scrollToIngest]);

  // Quick Mini-Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcRiskPct, setCalcRiskPct] = useState(0.75);
  const [calcEntry, setCalcEntry] = useState(50.0);
  const [calcStop, setCalcStop] = useState(47.5);

  // Market Breadth Analytics state
  const [activeBreadthChart, setActiveBreadthChart] = useState('daily'); // 'daily', 'trend', 'heatmap'
  const [isBreadthTableOpen, setIsBreadthTableOpen] = useState(true);
  const [breadthPage, setBreadthPage] = useState(1);
  const [breadthPageSize, setBreadthPageSize] = useState(65);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [hiddenSymbols, setHiddenSymbols] = useState(new Set());

  const isSyncing = syncStatus?.status === 'running';

  // Fetch Market Monitor evaluation with 252 sessions for breadth charts & history
  const fetchMarket = useCallback(async (selectedDate = asOfDate) => {
    setLoadingMarket(true);
    try {
      const dateParam = selectedDate ? `&date=${selectedDate}` : '';
      const res = await fetch(`${API_BASE}/api/market-monitor?limit=252${dateParam}`);
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
        return data;
      }
    } catch (err) {
      console.error('Error loading market monitor data for cockpit:', err);
    } finally {
      setLoadingMarket(false);
    }
    return null;
  }, [asOfDate]);

  // Fetch top industry groups for rotation snapshot
  const fetchGroups = useCallback(async (selectedDate = asOfDate) => {
    setLoadingGroups(true);
    try {
      const dateParam = selectedDate ? `?date=${selectedDate}` : '';
      const res = await fetch(`${API_BASE}/api/groups/strength${dateParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (b.ret_1w_pct || 0) - (a.ret_1w_pct || 0));
          setTopGroups(sorted.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error loading group strength for cockpit:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [asOfDate]);

  // Fetch top focus momentum leaders
  const fetchLeaders = useCallback(async (selectedDate = asOfDate) => {
    setLoadingLeaders(true);
    try {
      const lDate = selectedDate || marketData?.summary?.latest_date || '';
      const expr = encodeURIComponent('RS_RANK >= 90 AND ADR20 >= 4.0 AND C >= 10.0 AND C > XAVGC50 AND XAVGC10 > XAVGC20');
      const url = `${API_BASE}/api/candidates?expression=${expr}${lDate ? `&date=${lDate}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.candidates || []);
        setFocusLeaders(items.slice(0, 6));
      }
    } catch (err) {
      console.error('Error loading focus leaders for cockpit:', err);
    } finally {
      setLoadingLeaders(false);
    }
  }, [asOfDate, marketData?.summary?.latest_date]);

  // Initial and reactive loads when asOfDate changes
  useEffect(() => {
    fetchMarket(asOfDate);
    fetchGroups(asOfDate);
  }, [asOfDate, fetchMarket, fetchGroups]);

  useEffect(() => {
    fetchLeaders(asOfDate);
  }, [asOfDate, fetchLeaders]);

  // Comprehensive reload of all cockpit data (triggered automatically after background sync completes)
  const reloadAllDashboardData = useCallback(async () => {
    setLoadingMarket(true);
    setLoadingGroups(true);
    setLoadingLeaders(true);
    try {
      const dateParam = asOfDate ? `&date=${asOfDate}` : '';
      const gDateParam = asOfDate ? `?date=${asOfDate}` : '';
      const [marketRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/api/market-monitor?limit=252&refresh=true${dateParam}`),
        fetch(`${API_BASE}/api/groups/strength${gDateParam}`)
      ]);
      if (marketRes.ok) {
        const mData = await marketRes.json();
        setMarketData(mData);
        const lDate = asOfDate || mData?.summary?.latest_date || '';
        const expr = encodeURIComponent('RS_RANK >= 90 AND ADR20 >= 4.0 AND C >= 10.0 AND C > XAVGC50 AND XAVGC10 > XAVGC20');
        const leadersRes = await fetch(`${API_BASE}/api/candidates?expression=${expr}${lDate ? `&date=${lDate}` : ''}`);
        if (leadersRes.ok) {
          const lData = await leadersRes.json();
          const items = Array.isArray(lData) ? lData : (lData.candidates || []);
          setFocusLeaders(items.slice(0, 6));
        }
      }
      if (groupsRes.ok) {
        const gData = await groupsRes.json();
        if (Array.isArray(gData)) {
          const sorted = [...gData].sort((a, b) => (b.ret_1w_pct || 0) - (a.ret_1w_pct || 0));
          setTopGroups(sorted.slice(0, 5));
        }
      }
      if (fetchSummary) fetchSummary();
    } catch (err) {
      console.error('Error reloading cockpit after sync:', err);
    } finally {
      setLoadingMarket(false);
      setLoadingGroups(false);
      setLoadingLeaders(false);
    }
  }, [asOfDate, fetchSummary]);

  // 1-Click Quick Sync action from within the Cockpit:
  // Runs standard daily bars price sync (identical to "Sync Price Data" on Market Ingest)
  // WITHOUT premarket/postmarket extended data to preserve clean end-of-day market statistics.
  const handleQuickSync = async () => {
    if (isSyncing || asOfDate) return;
    try {
      await fetch(`${API_BASE}/api/sync/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skip_prices: false,
          skip_fundamentals: true,
          sync_sponsorship: false,
          include_premarket: false,
          include_extended: false,
          fix_splits: false
        })
      });
      if (fetchSyncStatus) fetchSyncStatus();
    } catch (err) {
      console.error('Error triggering quick sync from cockpit:', err);
    }
  };

  // Monitor syncStatus: when it finishes (running -> idle), automatically reload the cockpit
  const prevSyncStatusRef = useRef(syncStatus?.status);
  useEffect(() => {
    if (prevSyncStatusRef.current === 'running' && syncStatus?.status === 'idle') {
      reloadAllDashboardData();
    }
    prevSyncStatusRef.current = syncStatus?.status;
  }, [syncStatus?.status, reloadAllDashboardData]);

  // Mini calculator calculation
  const calcResults = useMemo(() => {
    const equity = parseFloat(calcEquity) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntry) || 0;
    const stop = parseFloat(calcStop) || 0;

    const stopDist = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDist / entry) * 100 : 0;
    const riskDollars = equity * (riskPct / 100);

    let shares = 0;
    if (stopDist > 0 && riskDollars > 0) {
      shares = Math.floor(riskDollars / stopDist);
    }
    const positionValue = shares * entry;
    const posPct = equity > 0 ? (positionValue / equity) * 100 : 0;

    return {
      riskDollars,
      stopPct,
      shares,
      positionValue,
      posPct,
      isStopTooWide: stopPct > 8.0,
      isPosTooLarge: posPct > 25.0
    };
  }, [calcEquity, calcRiskPct, calcEntry, calcStop]);

  const kq = marketData?.summary?.kq_evaluation;
  const summaryData = marketData?.summary;
  const latestDate = asOfDate || summaryData?.latest_date || summary?.last_price_date || 'Latest Available';

  // Cross-Asset Macro Tape Data
  const crossAssets = useMemo(() => {
    const apiAssets = summaryData?.cross_asset;
    if (Array.isArray(apiAssets) && apiAssets.length > 0) return apiAssets;
    const bm = summaryData?.benchmarks;
    return DEFAULT_CROSS_ASSETS.map((item) => {
      if (bm && bm[item.symbol]) {
        return {
          ...item,
          price: bm[item.symbol].close || item.price,
          change_pct: bm[item.symbol].change_pct !== undefined ? bm[item.symbol].change_pct : item.change_pct
        };
      }
      return item;
    });
  }, [summaryData?.cross_asset, summaryData?.benchmarks]);

  const asOfTimeString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
    } catch (e) {
      return '21:41';
    }
  }, []);

  const displayedCrossAssets = useMemo(() => {
    return crossAssets.filter(item => !hiddenSymbols.has(item.symbol));
  }, [crossAssets, hiddenSymbols]);

  // Determine if DuckDB data is stale compared to expected trading date (using local date)
  const isDataStale = useMemo(() => {
    if (asOfDate) return false;
    if (!latestDate || latestDate === 'Latest Available') return false;
    const today = new Date();
    const todayStr = getLocalDateStr(today);
    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekday: if latest DB date is not today, data is stale
      return latestDate < todayStr;
    } else {
      // Weekend: check if earlier than Friday
      const daysToFriday = dayOfWeek === 0 ? 2 : 1;
      const friday = new Date(today);
      friday.setDate(today.getDate() - daysToFriday);
      const fridayStr = getLocalDateStr(friday);
      return latestDate < fridayStr;
    }
  }, [latestDate, asOfDate]);

  // Light color mapping
  const lightBadge = kq?.badge || 'YELLOW LIGHT';
  const lightColor = lightBadge.includes('GREEN') ? '#10b981' : (lightBadge.includes('RED') ? '#f43f5e' : '#f59e0b');
  const lightGlow = lightBadge.includes('GREEN') ? 'rgba(16, 185, 129, 0.25)' : (lightBadge.includes('RED') ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)');

  const dailyData = marketData?.daily_data || [];

  // Breadth bias percentage
  const gainersCount = typeof summaryData?.latest_gainers_4pct === 'number' ? summaryData.latest_gainers_4pct : 0;
  const losersCount = typeof summaryData?.latest_losers_4pct === 'number' ? summaryData.latest_losers_4pct : 0;
  const total4pct = gainersCount + losersCount;
  const biasPct = total4pct > 0 ? Math.round((gainersCount / total4pct) * 100) : 50;

  // Market Participation & Capital Flow calculations
  const advCount = summaryData?.latest_advancers ?? 0;
  const decCount = summaryData?.latest_decliners ?? 0;
  const uncCount = summaryData?.latest_unchanged ?? 0;
  const totalStocks = summaryData?.latest_total_active || (advCount + decCount + uncCount) || 1;
  const advPct = summaryData?.latest_advance_pct ?? (totalStocks > 0 ? (advCount / totalStocks) * 100 : 50);
  const decPct = summaryData?.latest_decline_pct ?? (totalStocks > 0 ? (decCount / totalStocks) * 100 : 50);
  const uncPct = Math.max(0, 100 - advPct - decPct);

  const capInc = summaryData?.latest_cap_increased ?? 0;
  const capDec = summaryData?.latest_cap_decreased ?? 0;
  const netCap = summaryData?.latest_net_cap_flow ?? (capInc - capDec);
  const totalCapFlow = capInc + capDec;
  const capAdvPct = totalCapFlow > 0 ? (capInc / totalCapFlow) * 100 : 50;
  const capDecPct = totalCapFlow > 0 ? (capDec / totalCapFlow) * 100 : 50;

  const upDollarVol = summaryData?.latest_up_dollar_vol ?? 0;
  const downDollarVol = summaryData?.latest_down_dollar_vol ?? 0;
  const totalVol = upDollarVol + downDollarVol;
  const upVolPct = totalVol > 0 ? (upDollarVol / totalVol) * 100 : 50;
  const downVolPct = totalVol > 0 ? (downDollarVol / totalVol) * 100 : 50;

  const qqqChange = summaryData?.benchmarks?.QQQ?.change_pct ?? kq?.change_pct ?? 0;

  const situation = useMemo(() => {
    if (totalStocks <= 1) {
      return {
        badge: "⚪ GATHERING MARKET DATA",
        color: "#94a3b8",
        bg: "rgba(148, 163, 184, 0.12)",
        border: "rgba(148, 163, 184, 0.25)",
        detail: "Calculating market breadth participation and capital flow across the universe."
      };
    }
    if (qqqChange >= 0 && decPct >= 58 && netCap < 0) {
      return {
        badge: "⚠️ DIVERGENCE: STEALTH DISTRIBUTION",
        color: "#fb7185",
        bg: "rgba(244, 63, 94, 0.16)",
        border: "rgba(244, 63, 94, 0.35)",
        detail: `Major indices closed positive (+${qqqChange.toFixed(2)}%), but ${decPct.toFixed(1)}% of all stocks declined with ${formatCapFlow(netCap)} net institutional capital contraction. Mega-caps are masking broad-market selling.`
      };
    }
    if (capAdvPct >= 65 && advPct >= 55) {
      return {
        badge: "🟢 BROAD ACCUMULATION & CAPITAL INFLOW",
        color: "#34d399",
        bg: "rgba(16, 185, 129, 0.16)",
        border: "rgba(16, 185, 129, 0.35)",
        detail: `Broad-based buying pressure: ${advPct.toFixed(1)}% of stocks advancing with ${formatCapFlow(netCap)} net institutional capital expansion across sectors.`
      };
    }
    if (capAdvPct <= 35 && decPct >= 55) {
      return {
        badge: "🔴 SYSTEMIC CAPITAL CONTRACTION",
        color: "#fb7185",
        bg: "rgba(244, 63, 94, 0.16)",
        border: "rgba(244, 63, 94, 0.35)",
        detail: `Heavy distribution across the market: ${decPct.toFixed(1)}% of stocks down and ${formatCapFlow(netCap)} capital withdrawn from equities.`
      };
    }
    if (qqqChange < 0 && advPct >= 55) {
      return {
        badge: "🔄 POSITIVE BREADTH DIVERGENCE",
        color: "#38bdf8",
        bg: "rgba(56, 189, 248, 0.16)",
        border: "rgba(56, 189, 248, 0.35)",
        detail: `Indices pulled back, but underlying breadth remained resilient with ${advPct.toFixed(1)}% of stocks advancing.`
      };
    }
    return {
      badge: "🟡 BALANCED / ROTATIONAL REGIME",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.16)",
      border: "rgba(245, 158, 11, 0.35)",
      detail: `Selective market rotation: ${advPct.toFixed(1)}% advancing vs ${decPct.toFixed(1)}% declining with ${formatCapFlow(netCap)} net capital flow.`
    };
  }, [totalStocks, qqqChange, decPct, netCap, capAdvPct, advPct]);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Helper to calculate month separators and date axis labels
  const getMonthSeparators = (chartData, getX) => {
    if (!chartData || chartData.length === 0) return { all: [], visible: [] };
    const all = [];
    for (let i = 0; i < chartData.length; i++) {
      const d = chartData[i];
      const isFirst = i === 0;
      const prev = i > 0 ? chartData[i - 1] : null;
      const isNewMonth = prev ? d.date.slice(0, 7) !== prev.date.slice(0, 7) : false;
      const isNewYear = prev ? d.date.slice(0, 4) !== prev.date.slice(0, 4) : false;

      if (isFirst || isNewMonth) {
        const x = getX(i);
        const mNum = parseInt(d.date.slice(5, 7), 10) - 1;
        const mName = MONTH_NAMES[mNum] || d.date.slice(5, 7);
        const yShort = d.date.slice(2, 4);
        const label = isNewYear || isFirst ? `${mName} '${yShort}` : mName;
        all.push({
          index: i,
          x,
          date: d.date,
          isFirst,
          isNewMonth,
          isNewYear,
          label
        });
      }
    }

    const visible = [];
    let lastX = -999;
    for (const sep of all) {
      if (sep.x - lastX >= 45) {
        visible.push(sep);
        lastX = sep.x;
      }
    }
    return { all, visible };
  };

  // SVG Chart for Daily 4% UP vs DOWN with Date Axis & Month Separators
  const renderDailyChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse();
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.gainers_4pct, d.losers_4pct, d.ema_13_up, d.ema_13_down)),
      500
    );

    const height = 240;
    const width = 1000;
    const paddingLeft = 45;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 35;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const baselineY = paddingTop + innerHeight;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => paddingLeft + idx * stepX;
    const getY = (val) => baselineY - (val / maxVal) * innerHeight;

    const { all: monthSeparators, visible: visibleSeparators } = getMonthSeparators(chartData, getX);

    const pointsEmaUp = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_up)}`).join(' ');
    const pointsEmaDown = chartData.map((d, i) => `${getX(i)},${getY(d.ema_13_down)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
          {/* Horizontal Y-axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = baselineY - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Baseline X-axis line */}
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="rgba(255, 255, 255, 0.18)" />

          {/* Vertical Month Separator Lines across chart */}
          {monthSeparators.map((sep, idx) => {
            if (sep.isFirst) return null;
            return (
              <line
                key={`sep-grid-${idx}`}
                x1={sep.x}
                y1={paddingTop}
                x2={sep.x}
                y2={baselineY}
                stroke={sep.isNewYear ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)'}
                strokeDasharray={sep.isNewYear ? 'none' : '3 3'}
                strokeWidth={sep.isNewYear ? 1.2 : 1}
              />
            );
          })}

          {/* Daily 4% UP / DOWN Bars with hover tooltips */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const yUp = getY(d.gainers_4pct);
            const yDown = getY(d.losers_4pct);
            const barW = Math.max(innerWidth / chartData.length - 1, 1);
            return (
              <g key={i}>
                <title>{`${d.date}: 4% UP=${d.gainers_4pct}, 4% DOWN=${d.losers_4pct} (13 EMA UP=${d.ema_13_up}, DOWN=${d.ema_13_down})`}</title>
                <line x1={x} y1={baselineY} x2={x} y2={yUp} stroke="rgba(16, 185, 129, 0.4)" strokeWidth={barW} />
                <line x1={x} y1={baselineY} x2={x} y2={yDown} stroke="rgba(244, 63, 94, 0.4)" strokeWidth={barW} />
              </g>
            );
          })}

          {/* 13 EMA Polylines */}
          <polyline fill="none" stroke="var(--accent-success)" strokeWidth="2.5" points={pointsEmaUp} />
          <polyline fill="none" stroke="var(--accent-danger)" strokeWidth="2.5" strokeDasharray="3 3" points={pointsEmaDown} />

          {/* Month Separator Ticks and Date Labels */}
          {visibleSeparators.map((sep, idx) => (
            <g key={`sep-lbl-${idx}`}>
              <line
                x1={sep.x}
                y1={baselineY}
                x2={sep.x}
                y2={baselineY + 5}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={1}
              />
              <text
                x={sep.x}
                y={baselineY + 18}
                fill={sep.isNewYear || sep.isFirst ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize="10"
                fontWeight={sep.isNewYear || sep.isFirst ? 700 : 500}
                textAnchor="middle"
              >
                {sep.label}
              </text>
            </g>
          ))}

          {/* Chart Legend */}
          <g transform={`translate(${width - 240}, 15)`}>
            <rect x="0" y="0" width="12" height="12" fill="var(--accent-success)" rx="2" />
            <text x="18" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">4% UP (13 EMA)</text>
            <rect x="120" y="0" width="12" height="12" fill="var(--accent-danger)" rx="2" />
            <text x="138" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">4% DOWN (13 EMA)</text>
          </g>
        </svg>
      </div>
    );
  };

  // SVG Chart for 25% UP vs DOWN Trend with Date Axis & Month Separators
  const renderTrendChart = () => {
    if (dailyData.length === 0) return null;
    const chartData = [...dailyData].reverse();
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.up_25pct_1m, d.down_25pct_1m, d.up_25pct_3m, d.down_25pct_3m)),
      300
    );

    const height = 240;
    const width = 1000;
    const paddingLeft = 45;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 35;
    const innerWidth = width - paddingLeft - paddingRight;
    const innerHeight = height - paddingTop - paddingBottom;
    const baselineY = paddingTop + innerHeight;

    const stepX = innerWidth / Math.max(chartData.length - 1, 1);

    const getX = (idx) => paddingLeft + idx * stepX;
    const getY = (val) => baselineY - (val / maxVal) * innerHeight;

    const { all: monthSeparators, visible: visibleSeparators } = getMonthSeparators(chartData, getX);

    const points25Up1M = chartData.map((d, i) => `${getX(i)},${getY(d.up_25pct_1m)}`).join(' ');
    const points25Down1M = chartData.map((d, i) => `${getX(i)},${getY(d.down_25pct_1m)}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
          {/* Horizontal Y-axis Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = Math.round(maxVal * ratio);
            const y = baselineY - ratio * innerHeight;
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Baseline X-axis line */}
          <line x1={paddingLeft} y1={baselineY} x2={width - paddingRight} y2={baselineY} stroke="rgba(255, 255, 255, 0.18)" />

          {/* Vertical Month Separator Lines across chart */}
          {monthSeparators.map((sep, idx) => {
            if (sep.isFirst) return null;
            return (
              <line
                key={`trend-sep-grid-${idx}`}
                x1={sep.x}
                y1={paddingTop}
                x2={sep.x}
                y2={baselineY}
                stroke={sep.isNewYear ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.07)'}
                strokeDasharray={sep.isNewYear ? 'none' : '3 3'}
                strokeWidth={sep.isNewYear ? 1.2 : 1}
              />
            );
          })}

          {/* Trend Polylines */}
          <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points25Up1M} />
          <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={points25Down1M} />

          {/* Month Separator Ticks and Date Labels */}
          {visibleSeparators.map((sep, idx) => (
            <g key={`trend-sep-lbl-${idx}`}>
              <line
                x1={sep.x}
                y1={baselineY}
                x2={sep.x}
                y2={baselineY + 5}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={1}
              />
              <text
                x={sep.x}
                y={baselineY + 18}
                fill={sep.isNewYear || sep.isFirst ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize="10"
                fontWeight={sep.isNewYear || sep.isFirst ? 700 : 500}
                textAnchor="middle"
              >
                {sep.label}
              </text>
            </g>
          ))}

          {/* Chart Legend */}
          <g transform={`translate(${width - 260}, 15)`}>
            <line x1="0" y1="6" x2="16" y2="6" stroke="#10b981" strokeWidth="3" />
            <text x="22" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">25% UP (1 Month)</text>
            <line x1="140" y1="6" x2="156" y2="6" stroke="#f43f5e" strokeWidth="3" />
            <text x="162" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="600">25% DOWN (1 Month)</text>
          </g>
        </svg>
      </div>
    );
  };

  // EdgeStacker Breadth Heatmap Calendar Grid
  const renderHeatmap = () => {
    if (dailyData.length === 0) return null;
    return (
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Historical Market Expansion (Green = Net 4% Gainers Expansion, Red = Net 4% Losers Contraction)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))', gap: '6px' }}>
          {[...dailyData].reverse().map((d, i) => {
            const isExpansion = d.net_4pct >= 0;
            const intensity = Math.min(Math.abs(d.net_4pct) / 300, 1);
            const bg = isExpansion
              ? `rgba(16, 185, 129, ${0.2 + intensity * 0.7})`
              : `rgba(244, 63, 94, ${0.2 + intensity * 0.7})`;
            return (
              <div
                key={i}
                title={`${d.date}: 4% UP=${d.gainers_4pct}, 4% DOWN=${d.losers_4pct} (Net: ${d.net_4pct >= 0 ? '+' : ''}${d.net_4pct})`}
                style={{
                  height: '28px',
                  borderRadius: '4px',
                  backgroundColor: bg,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {d.date.slice(5)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Stockbee Market Monitor Paginated Table
  const renderBreadthTable = () => {
    const effectivePageSize = breadthPageSize === 'all' ? dailyData.length || 1 : breadthPageSize;
    const totalPages = Math.ceil(dailyData.length / effectivePageSize);
    const paginatedData = breadthPageSize === 'all'
      ? dailyData
      : dailyData.slice((breadthPage - 1) * breadthPageSize, breadthPage * breadthPageSize);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Daily Stockbee Market Monitor Log ({dailyData.length} Total Sessions)
            </h4>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Historical 4% thrust, 25%/50% multi-month momentum expansion, and 13 EMA breadth
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Show:</span>
              <select
                value={breadthPageSize}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setBreadthPageSize(val);
                  setBreadthPage(1);
                }}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <option value={65}>65 Rows (~3 Mo)</option>
                <option value={120}>120 Rows (~6 Mo)</option>
                <option value={252}>252 Rows (1 Yr)</option>
                <option value="all">Show All</option>
              </select>
            </div>

            {breadthPageSize !== 'all' && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBreadthPage((prev) => Math.max(prev - 1, 1))}
                  disabled={breadthPage === 1}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {breadthPage} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBreadthPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={breadthPage >= totalPages}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%', maxHeight: '450px' }}>
          <table className="data-table compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'center' }}>REGIME</th>
                <th style={{ textAlign: 'center', color: '#38bdf8' }}>A / D (Up/Down)</th>
                <th style={{ textAlign: 'right', color: '#a855f7' }}>Net Cap Flow</th>
                <th style={{ textAlign: 'right' }}>Cap %</th>
                <th style={{ textAlign: 'right', color: '#34d399' }}>4% ▲</th>
                <th style={{ textAlign: 'right', color: '#fb7185' }}>4% ▼</th>
                <th style={{ textAlign: 'right' }}>Net 4%</th>
                <th style={{ textAlign: 'right' }}>Ratio</th>
                <th style={{ textAlign: 'right', color: '#60a5fa' }}>5D Ratio</th>
                <th style={{ textAlign: 'right', color: '#818cf8' }}>10D Ratio</th>
                <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#34d399' }}>▲</span> 1M</th>
                <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#fb7185' }}>▼</span> 1M</th>
                <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#34d399' }}>▲</span> 3M</th>
                <th style={{ textAlign: 'right' }}>25% <span style={{ color: '#fb7185' }}>▼</span> 3M</th>
                <th style={{ textAlign: 'right' }}>50% <span style={{ color: '#34d399' }}>▲</span> 1M</th>
                <th style={{ textAlign: 'right' }}>50% <span style={{ color: '#34d399' }}>▲</span> 3M</th>
                <th style={{ textAlign: 'right' }}>13 EMA <span style={{ color: '#34d399' }}>▲</span></th>
                <th style={{ textAlign: 'right' }}>13 EMA <span style={{ color: '#fb7185' }}>▼</span></th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const isStrongUp = row.gainers_4pct >= 300 || row.ratio_4pct >= 2.0;
                const isStrongDown = row.losers_4pct >= 300 || row.ratio_4pct <= 0.5;
                const regime = row.regime || row.sb_regime || (
                  row.up_25pct_3m !== undefined && row.down_25pct_3m !== undefined
                    ? (row.up_25pct_3m > row.down_25pct_3m ? 'BULLISH' : row.up_25pct_3m < row.down_25pct_3m ? 'BEARISH' : 'NEUTRAL')
                    : row.kq_regime
                );

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</td>
                    <td style={{ textAlign: 'center' }}>
                      {regime === 'BULLISH' && (
                        <span
                          className="pill"
                          title={`Stockbee Market Monitor: BULLISH (25% ▲ 3M: ${row.up_25pct_3m ?? '-'} > 25% ▼ 3M: ${row.down_25pct_3m ?? '-'})`}
                          style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}
                        >
                          🟢 BULLISH
                        </span>
                      )}
                      {regime === 'BEARISH' && (
                        <span
                          className="pill"
                          title={`Stockbee Market Monitor: BEARISH (25% ▲ 3M: ${row.up_25pct_3m ?? '-'} < 25% ▼ 3M: ${row.down_25pct_3m ?? '-'})`}
                          style={{ background: 'rgba(244, 63, 94, 0.18)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}
                        >
                          🔴 BEARISH
                        </span>
                      )}
                      {regime === 'CAUTION' && (
                        <span
                          className="pill"
                          title="Stockbee Market Monitor: CAUTION"
                          style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}
                        >
                          🟡 CAUTION
                        </span>
                      )}
                      {regime === 'NEUTRAL' && (
                        <span
                          className="pill"
                          title="Stockbee Market Monitor: NEUTRAL"
                          style={{ background: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.35)', fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}
                        >
                          ⚪ NEUTRAL
                        </span>
                      )}
                      {!['BULLISH', 'BEARISH', 'CAUTION', 'NEUTRAL'].includes(regime) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{row.advancers?.toLocaleString() || '-'}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                      <span style={{ color: '#fb7185', fontWeight: 600 }}>{row.decliners?.toLocaleString() || '-'}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: (row.net_cap_flow || 0) >= 0 ? '#34d399' : '#fb7185', fontFamily: 'var(--font-mono)', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {row.net_cap_flow !== undefined ? formatCapFlow(row.net_cap_flow) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: (row.cap_advance_pct || 50) >= 50 ? '#34d399' : '#fb7185', fontSize: '11px' }}>
                      {row.cap_advance_pct !== undefined ? `${row.cap_advance_pct.toFixed(0)}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: isStrongUp ? 700 : 500, color: isStrongUp ? '#34d399' : 'var(--text-primary)', backgroundColor: row.gainers_4pct >= 500 ? 'rgba(16, 185, 129, 0.15)' : 'transparent' }}>
                      {row.gainers_4pct.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: isStrongDown ? 700 : 500, color: isStrongDown ? '#fb7185' : 'var(--text-primary)', backgroundColor: row.losers_4pct >= 500 ? 'rgba(244, 63, 94, 0.15)' : 'transparent' }}>
                      {row.losers_4pct.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.net_4pct > 0 ? '#34d399' : row.net_4pct < 0 ? '#fb7185' : 'var(--text-secondary)' }}>
                      {row.net_4pct > 0 ? `+${row.net_4pct}` : row.net_4pct}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.ratio_4pct >= 2.0 ? '#34d399' : row.ratio_4pct <= 0.5 ? '#fb7185' : 'var(--text-primary)' }}>
                      {row.ratio_4pct}x
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.ratio_5d >= 2.0 ? '#34d399' : row.ratio_5d <= 0.5 ? '#fb7185' : 'var(--text-primary)' }}>
                      {row.ratio_5d}x
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.ratio_10d >= 2.0 ? '#34d399' : row.ratio_10d <= 0.5 ? '#fb7185' : 'var(--text-primary)' }}>
                      {row.ratio_10d}x
                    </td>
                    <td style={{ textAlign: 'right', color: row.up_25pct_1m > row.down_25pct_1m ? '#34d399' : 'var(--text-primary)' }}>
                      {row.up_25pct_1m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: row.down_25pct_1m > row.up_25pct_1m ? '#fb7185' : 'var(--text-primary)' }}>
                      {row.down_25pct_1m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.up_25pct_3m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                      {row.down_25pct_3m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {row.up_50pct_1m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {row.up_50pct_3m.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 500 }}>
                      {row.ema_13_up}
                    </td>
                    <td style={{ textAlign: 'right', color: '#fb7185', fontWeight: 500 }}>
                      {row.ema_13_down}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="cockpit-dashboard-container">
      {/* Redesigned Cockpit Header */}
      <div className="cockpit-header-card">
        <div className="cockpit-header-main">
          <div className="cockpit-header-eyebrow">
            <span className="cockpit-header-eyebrow-accent">
              <span>⚡</span> TRADING COCKPIT
            </span>
            <span>•</span>
            <span>MARKET POSTURE & RISK COMMAND</span>
          </div>

          <div className="cockpit-header-title-row">
            <h1 className="cockpit-header-title">Trading Cockpit & Market Posture</h1>
            {/* Freshness / Mode Badge */}
            {isSyncing ? (
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', fontSize: '11px', padding: '3px 9px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <span className="spin-icon">⟳</span> Ingesting Live Data...
              </span>
            ) : asOfDate ? (
              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)', fontSize: '11px', padding: '3px 9px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <span>📅</span> Historical Session: {latestDate || asOfDate}
              </span>
            ) : isDataStale ? (
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: '11px', padding: '3px 9px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} /> Outdated: As of {latestDate}
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px', padding: '3px 9px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} /> Synced: As of {latestDate}
              </span>
            )}
          </div>

          <p className="cockpit-header-desc">
            Real-time regime indicators, multi-asset radar, group rotations, and focus momentum setups
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="cockpit-header-toolbar">
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
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val === latestDbDate) {
                  setAsOfDate('');
                } else {
                  setAsOfDate(val);
                }
              }}
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

          {/* 1-Click Inline Sync Button */}
          <button
            type="button"
            className="cockpit-header-btn primary"
            onClick={handleQuickSync}
            disabled={isSyncing || !!asOfDate}
            title={asOfDate ? "Sync disabled in historical view. Reset to Latest to sync." : "Ingest today's latest regular market prices into DuckDB"}
          >
            {isSyncing ? (
              <>
                <span className="spin-icon">⟳</span>
                <span>Syncing Feeds...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Sync Today's Data</span>
              </>
            )}
          </button>

          {/* Jump to Market Ingest section */}
          <button
            type="button"
            className="cockpit-header-btn secondary"
            onClick={scrollToIngest}
            title="Scroll to Market Ingest & Feeds Pipelines section at bottom"
          >
            <span>⚙️</span>
            <span>Market Ingest</span>
            {isSyncing ? (
              <span className="spin-icon" style={{ color: '#38bdf8', fontSize: '11px' }}>⟳</span>
            ) : isDataStale ? (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
            ) : (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            )}
          </button>

        </div>
      </div>

      {/* Historical Archive Notice Banner */}
      {asOfDate && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          padding: '10px 18px',
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(14, 19, 31, 0.8) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '8px',
          marginBottom: '18px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#e9d5ff' }}>
                Historical Session View: As of {latestDate || asOfDate}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Viewing market monitor regime, breadth expansion metrics, rotation snapshot, and RS leaders for this historical session.
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setAsOfDate('')}
            style={{ fontSize: '11.5px', padding: '4px 12px', whiteSpace: 'nowrap', borderColor: 'rgba(168, 85, 247, 0.5)', color: '#e9d5ff' }}
          >
            Return to Latest Session →
          </button>
        </div>
      )}

      {/* Inline Stale Data Notice / Sync Progress Alert */}
      {isSyncing ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          marginBottom: '18px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="spin-icon" style={{ color: '#38bdf8', fontSize: '18px' }}>⟳</span>
            <span style={{ fontSize: '13px', color: '#e0f2fe' }}>
              <strong>Syncing Market Feeds in Background...</strong> Ingesting price bars and quotes into DuckDB. This cockpit will automatically refresh all posture metrics and focus setups once complete.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={scrollToIngest}
            style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
          >
            View Ingest Console ↓
          </button>
        </div>
      ) : isDataStale ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          padding: '12px 18px',
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '8px',
          marginBottom: '18px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#fbbf24' }}>
                Market Data Stale: Cockpit is currently displaying session as of {latestDate}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Run Quick Sync to pull today's latest prices, breadth, and quotes into DuckDB without leaving this page.
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleQuickSync}
            style={{
              backgroundColor: '#f59e0b',
              color: '#000',
              fontWeight: '700',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
            }}
          >
            <span>⚡</span>
            <span>Sync Today's Session Now</span>
          </button>
        </div>
      ) : null}

      {/* 0. Cross-Asset Section */}
      <div className="cross-asset-card-wrapper">
        <div className="cross-asset-top">
          <h3 className="cross-asset-title">Cross-asset</h3>
          <div className="cross-asset-meta">
            <span className="cross-asset-now-badge">
              <span className="cross-asset-now-dot" /> now
            </span>
            <button
              className="cross-asset-customize-btn"
              onClick={() => setIsCustomizing(prev => !prev)}
              title="Customize Cross-Asset Macro Tape"
            >
              + Customize
            </button>
            <span className="cross-asset-asof">as of {asOfTimeString} ET</span>
          </div>
        </div>

        {/* Categories Legend with matching colored dots */}
        <div className="cross-asset-legend">
          {Object.entries(CATEGORY_STYLES).map(([cat, style]) => (
            <div key={cat} className="cross-asset-legend-item">
              <span
                className="cross-asset-legend-dot"
                style={{ backgroundColor: style.dot }}
              />
              <span style={{ color: style.dot }}>{cat}</span>
            </div>
          ))}
        </div>

        {/* Customization Drawer (if open) */}
        {isCustomizing && (
          <div className="cross-asset-customize-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Visible Macro Assets</span>
              <button
                onClick={() => setHiddenSymbols(new Set())}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                Show All
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DEFAULT_CROSS_ASSETS.map(asset => {
                const isHidden = hiddenSymbols.has(asset.symbol);
                return (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setHiddenSymbols(prev => {
                        const next = new Set(prev);
                        if (next.has(asset.symbol)) next.delete(asset.symbol);
                        else next.add(asset.symbol);
                        return next;
                      });
                    }}
                    className="chip-filter"
                    style={{
                      background: !isHidden ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: !isHidden ? '#38bdf8' : 'var(--border-color)',
                      color: !isHidden ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11px',
                      padding: '3px 8px'
                    }}
                  >
                    {!isHidden ? '✓ ' : '+ '}{asset.symbol}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cross-Asset Tiles Grid */}
        <div className="cross-asset-grid">
          {displayedCrossAssets.map((item) => {
            const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.EQUITIES;
            const chg = item.change_pct;
            const isPos = chg !== null && chg !== undefined && chg > 0;
            const isNeg = chg !== null && chg !== undefined && chg < 0;
            const chgColor = isPos ? '#10b981' : isNeg ? '#f43f5e' : '#64748b';
            const dotColor = isPos ? '#10b981' : isNeg ? '#f43f5e' : 'rgba(255, 255, 255, 0.35)';

            return (
              <div
                key={item.symbol}
                className="cross-asset-tile"
                style={{
                  borderColor: catStyle.border,
                  backgroundColor: catStyle.bg
                }}
                title={`${item.name || item.symbol} (${item.category})`}
              >
                <div className="cross-asset-tile-top">
                  <span className="cross-asset-sym">
                    {item.symbol}
                  </span>
                  <span className="cross-asset-chg" style={{ color: chgColor }}>
                    {chg !== undefined && chg !== null
                      ? `${chg >= 0 ? '+' : ''}${Number(chg).toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
                <div className="cross-asset-tile-bottom">
                  <div className="cross-asset-price-group">
                    <span className="cross-asset-price">
                      {formatAssetPrice(item)}
                    </span>
                    <span
                      className="cross-asset-status-dot"
                      style={{ backgroundColor: dotColor }}
                    />
                  </div>
                  <div className="cross-asset-sparkline">
                    {renderSparkline(item)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Primary Market Posture Card (The "Fourth Dimension" Light) */}
      <div
        className="glass-card cockpit-posture-card"
        style={{
          borderLeft: `5px solid ${lightColor}`,
          boxShadow: `0 10px 30px -10px ${lightGlow}`,
          marginBottom: '20px',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)'
        }}
      >
        <div className="cockpit-posture-top">
          <div className="cockpit-posture-headline">
            <div className="cockpit-light-badge" style={{ background: lightColor }}>
              <span className="cockpit-light-dot" />
              <span>{lightBadge}</span>
            </div>
            <h2 className="cockpit-posture-title">
              {kq?.stance || 'EVALUATING MARKET REGIME...'}
            </h2>
          </div>

          <div className="cockpit-exposure-pill">
            <span className="exposure-label">RECOMMENDED EXPOSURE</span>
            <span className="exposure-value" style={{ color: lightColor }}>
              {kq?.exposure || '25–50% Sizing (Reduced Size)'}
            </span>
          </div>
        </div>

        <p className="cockpit-guidance-text">
          {kq?.guidance || 'Market in consolidation or pulling back toward 10/20 EMA. Slower follow-through; stay selective, trim targets into strength, and maintain tight stops.'}
        </p>

        {/* Posture Key Metrics Strip */}
        <div className="cockpit-metrics-strip">
          <div className="posture-metric-item">
            <span className="p-metric-label">QQQ Trend Alignment</span>
            <span className="p-metric-val text-emerald">{kq?.stack || 'P > 10 > 20 > 50'}</span>
            <span className="p-metric-sub">Dist 10EMA: {kq?.dist_ema10_pct ? `+${kq.dist_ema10_pct.toFixed(1)}%` : '+1.1%'}</span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">4% Expansion Breadth</span>
            <span className="p-metric-val" style={{ color: (summaryData?.latest_ratio_4pct || 1) >= 1 ? '#34d399' : '#f59e0b' }}>
              {summaryData?.latest_gainers_4pct || 0} vs {summaryData?.latest_losers_4pct || 0}
            </span>
            <span className="p-metric-sub">Ratio: {(summaryData?.latest_ratio_4pct || 0.89).toFixed(2)} (5d Net: {summaryData?.sum_5d_net_4pct || -446})</span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">QQQ Benchmark</span>
            <span className="p-metric-val">
              ${summaryData?.benchmarks?.QQQ?.close?.toFixed(2) || '721.45'}
            </span>
            <span className="p-metric-sub text-emerald">
              +{summaryData?.benchmarks?.QQQ?.change_pct?.toFixed(2) || '0.63'}% Today
            </span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">SPY Benchmark</span>
            <span className="p-metric-val">
              ${summaryData?.benchmarks?.SPY?.close?.toFixed(2) || '761.69'}
            </span>
            <span className="p-metric-sub text-emerald">
              +{summaryData?.benchmarks?.SPY?.change_pct?.toFixed(2) || '0.13'}% Today
            </span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">Distribution Days (4–5w)</span>
            <span
              className="p-metric-val"
              style={{
                color: (summaryData?.market_pulse?.distribution_pressure ?? 2) >= 5 ? '#f43f5e' : '#38bdf8'
              }}
            >
              {summaryData?.market_pulse?.distribution_pressure ?? 2} / 5
            </span>
            <span className="p-metric-sub">
              {summaryData?.market_pulse?.distribution_trend_label
                ? `${summaryData.market_pulse.distribution_trend_label}`
                : 'Below Warning Threshold'}
            </span>
          </div>
        </div>

        {/* QQQ Moving Average Stack & Momentum Bias Matrix */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}>
          {/* Momentum Bias Gauge */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Momentum Bias</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: lightColor }}>{biasPct}%</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bullish</span>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px', height: '5px', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ background: lightColor, height: '100%', width: `${biasPct}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* QQQ Close */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>QQQ Close</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              ${kq?.close ? kq.close.toFixed(2) : (summaryData?.benchmarks?.QQQ?.close ? summaryData.benchmarks.QQQ.close.toFixed(2) : '-')}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: (kq?.change_pct ?? summaryData?.benchmarks?.QQQ?.change_pct ?? 0) >= 0 ? '#34d399' : '#fb7185' }}>
              {(kq?.change_pct ?? summaryData?.benchmarks?.QQQ?.change_pct ?? 0) >= 0 ? `+${(kq?.change_pct ?? summaryData?.benchmarks?.QQQ?.change_pct ?? 0).toFixed(2)}%` : `${(kq?.change_pct ?? summaryData?.benchmarks?.QQQ?.change_pct ?? 0).toFixed(2)}%`}
            </span>
          </div>

          {/* 10 EMA */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>10 EMA</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: (kq?.close >= kq?.ema_10) ? '#34d399' : '#fb7185', marginTop: '2px' }}>
              ${kq?.ema_10 ? kq.ema_10.toFixed(2) : '-'}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: (kq?.ema_10_slope ?? 0) >= 0 ? '#34d399' : '#fb7185' }}>
              {(kq?.ema_10_slope ?? 0) >= 0 ? '↗ Rising' : '↘ Declining'}
            </span>
          </div>

          {/* 20 EMA */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>20 EMA</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: (kq?.close >= kq?.ema_20) ? '#34d399' : '#fb7185', marginTop: '2px' }}>
              ${kq?.ema_20 ? kq.ema_20.toFixed(2) : '-'}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: (kq?.ema_20_slope ?? 0) >= 0 ? '#34d399' : '#fb7185' }}>
              {(kq?.ema_20_slope ?? 0) >= 0 ? '↗ Rising' : '↘ Declining'}
            </span>
          </div>

          {/* 50 SMA */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>50 SMA</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: (kq?.close >= kq?.sma_50) ? '#34d399' : '#fb7185', marginTop: '2px' }}>
              ${kq?.sma_50 ? kq.sma_50.toFixed(2) : '-'}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: (kq?.sma_50_slope ?? 0) >= 0 ? '#34d399' : '#fb7185' }}>
              {(kq?.sma_50_slope ?? 0) >= 0 ? '↗ Rising' : '↘ Rolling Over'}
            </span>
          </div>

          {/* 1M 25% Breadth */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>1M 25% Up / Down</span>
            <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
              <span style={{ color: '#34d399' }}>{summaryData?.latest_up_25pct_1m ?? 0}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
              <span style={{ color: '#fb7185' }}>{summaryData?.latest_down_25pct_1m ?? 0}</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>20d Trend Health</span>
          </div>
        </div>
      </div>

      {/* 1b. Market Participation & Capital Flow Gauge */}
      <div
        className="glass-card"
        style={{
          marginBottom: '20px',
          padding: '22px 26px',
          borderLeft: `5px solid ${situation.color}`,
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cockpit-card-tag">MARKET PARTICIPATION & CAPITAL FLOW</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  color: situation.color,
                  backgroundColor: situation.bg,
                  border: `1px solid ${situation.border}`,
                  letterSpacing: '0.04em'
                }}
              >
                {situation.badge}
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '4px 0 0 0' }}>
              ⚖️ Advance / Decline & Market Capital Flow Gauge
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Net Capital Flow
              </div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: netCap >= 0 ? '#34d399' : '#fb7185',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {formatCapFlow(netCap)}
              </div>
            </div>
            <div style={{ height: '32px', width: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Net Advance / Decline
              </div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: advCount >= decCount ? '#34d399' : '#fb7185',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {advCount - decCount >= 0 ? `+${(advCount - decCount).toLocaleString()}` : (advCount - decCount).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Situation Detail Text */}
        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 16px 0', maxWidth: '1200px' }}>
          {situation.detail}
        </p>

        {/* Dual Progress Bars: Stock Count vs Market Cap Flow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {/* Card A: Equal-Weighted Stock Count (A/D) */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Equal-Weighted Breadth (Stock Count)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {totalStocks.toLocaleString()} Total Stocks
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div style={{ height: '14px', borderRadius: '7px', display: 'flex', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.06)', marginBottom: '10px' }}>
              <div
                style={{
                  width: `${advPct}%`,
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  transition: 'width 0.4s ease'
                }}
                title={`Advancing: ${advCount.toLocaleString()} (${advPct.toFixed(1)}%)`}
              />
              <div
                style={{
                  width: `${uncPct}%`,
                  background: '#64748b',
                  transition: 'width 0.4s ease'
                }}
                title={`Unchanged: ${uncCount.toLocaleString()} (${uncPct.toFixed(1)}%)`}
              />
              <div
                style={{
                  width: `${decPct}%`,
                  background: 'linear-gradient(90deg, #f43f5e, #e11d48)',
                  transition: 'width 0.4s ease'
                }}
                title={`Declining: ${decCount.toLocaleString()} (${decPct.toFixed(1)}%)`}
              />
            </div>

            {/* Detail Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {advCount.toLocaleString()} Up ({advPct.toFixed(1)}%)
                </span>
              </div>
              {uncCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {uncCount.toLocaleString()} Flat
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ color: '#fb7185', fontWeight: 700 }}>
                  {decCount.toLocaleString()} Down ({decPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>A / D Ratio: <strong style={{ color: advPct >= 50 ? '#34d399' : '#fb7185' }}>{(advCount / Math.max(decCount, 1)).toFixed(2)} : 1</strong></span>
              <span>Net Spread: <strong style={{ color: advCount >= decCount ? '#34d399' : '#fb7185' }}>{advCount - decCount >= 0 ? `+${(advCount - decCount).toLocaleString()}` : (advCount - decCount).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Card B: Capital-Weighted Money Flow ($) */}
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Capital-Weighted Money Flow (Market Cap Δ)
              </span>
              <span style={{ fontSize: '11px', color: netCap >= 0 ? '#34d399' : '#fb7185', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {netCap >= 0 ? `+${formatCapFlow(netCap, false)} Net Expansion` : `${formatCapFlow(netCap, true)} Net Contraction`}
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div style={{ height: '14px', borderRadius: '7px', display: 'flex', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.06)', marginBottom: '10px' }}>
              <div
                style={{
                  width: `${capAdvPct}%`,
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  transition: 'width 0.4s ease'
                }}
                title={`Capital Gained: ${formatCapFlow(capInc, true)} (${capAdvPct.toFixed(1)}%)`}
              />
              <div
                style={{
                  width: `${capDecPct}%`,
                  background: 'linear-gradient(90deg, #f43f5e, #e11d48)',
                  transition: 'width 0.4s ease'
                }}
                title={`Capital Lost: ${formatCapFlow(-capDec, true)} (${capDecPct.toFixed(1)}%)`}
              />
            </div>

            {/* Detail Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  +{formatCapFlow(capInc, false)} ({capAdvPct.toFixed(1)}%)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ color: '#fb7185', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  -{formatCapFlow(capDec, false)} ({capDecPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>Capital Advance Ratio: <strong style={{ color: capAdvPct >= 50 ? '#34d399' : '#fb7185' }}>{(capInc / Math.max(capDec, 1)).toFixed(2)} : 1</strong></span>
              <span>Traded Turnover: <strong style={{ color: '#ffffff' }}>{upVolPct.toFixed(0)}% Up-Vol</strong> vs <strong style={{ color: '#ffffff' }}>{downVolPct.toFixed(0)}% Down-Vol</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 1c. Market Pulse Widget (CANSLIM FTD, Distribution Pressure, and MA Breadth Percentiles) */}
      <MarketPulseCard marketPulse={summaryData?.market_pulse} asOfDate={asOfDate} />

      {/* 2. Market Breadth Visualizer & Trend Health */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cockpit-card-tag">MARKET BREADTH ANALYTICS</span>
              <span className="badge badge-outline" style={{ fontSize: '10.5px' }}>{dailyData.length} Sessions Logged</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
              📊 Market Breadth Visualizer & Trend Health
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="segmented-control">
              <button
                className={`segmented-item ${activeBreadthChart === 'daily' ? 'active' : ''}`}
                onClick={() => setActiveBreadthChart('daily')}
              >
                4% Thrust & 13 EMA
              </button>
              <button
                className={`segmented-item ${activeBreadthChart === 'trend' ? 'active' : ''}`}
                onClick={() => setActiveBreadthChart('trend')}
              >
                1-Month 25% Trend Health
              </button>
              <button
                className={`segmented-item ${activeBreadthChart === 'heatmap' ? 'active' : ''}`}
                onClick={() => setActiveBreadthChart('heatmap')}
              >
                Breadth Heatmap
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsBreadthTableOpen(prev => !prev)}
              style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <span>{isBreadthTableOpen ? '▲ Hide Log' : '▼ Historical Log'}</span>
            </button>
          </div>
        </div>

        {loadingMarket && !marketData ? (
          <div className="cockpit-loading-placeholder">
            <span className="spin-icon">⟳</span> Loading market breadth metrics...
          </div>
        ) : dailyData.length === 0 ? (
          <div className="cockpit-empty-state">No breadth history available. Run Step 0: Market Ingest.</div>
        ) : (
          <>
            {activeBreadthChart === 'daily' && renderDailyChart()}
            {activeBreadthChart === 'trend' && renderTrendChart()}
            {activeBreadthChart === 'heatmap' && renderHeatmap()}

            {/* Expandable Historical Breadth Table */}
            {isBreadthTableOpen && (
              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {renderBreadthTable()}
              </div>
            )}
          </>
        )}
      </div>

      {/* 2b. Pivot Score Movers */}
      <ScoreMoversCard
        latestDate={latestDate}
        onSelectStock={handleSelectStock}
        onNavigateLeaderboard={() => setActiveTab && setActiveTab('leaderboard')}
      />

      {/* 3. Daily Routine Pre-Flight Navigator (Steps 0 to 5) */}
      <div className="glass-card cockpit-routine-card" style={{ marginBottom: '20px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.06em' }}>
              DAILY PROTOCOL
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
              Pre-Flight Routine Navigator
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Follow the 5-step discipline before placing any trade
          </span>
        </div>

        <div className="cockpit-routine-grid">
          {/* Step 0 */}
          <div className="routine-step-box" onClick={scrollToIngest}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 0</span>
              <span className="routine-icon">{isSyncing ? '⟳' : (isDataStale ? '⚠️' : '🔄')}</span>
            </div>
            <span className="routine-title">0. Market Ingest</span>
            <span className="routine-desc">
              {isSyncing ? 'Sync in progress...' : (isDataStale ? `Stale: As of ${latestDate}` : `Up to date (${latestDate})`)}
            </span>
            <button
              className="btn btn-secondary btn-sm routine-btn"
              onClick={(e) => {
                if (isDataStale && !isSyncing && !asOfDate) {
                  e.stopPropagation();
                  handleQuickSync();
                } else {
                  e.stopPropagation();
                  scrollToIngest();
                }
              }}
              disabled={isSyncing || !!asOfDate}
              title={asOfDate ? "Sync disabled in historical view" : (isDataStale ? "Run Quick Sync for today's market session" : "Scroll to Market Ingest section")}
            >
              {isSyncing ? 'Syncing...' : (isDataStale ? '🔄 Sync Now' : 'Pipeline Feeds ↓')}
            </button>
          </div>

          {/* Step 1 */}
          <div className="routine-step-box active-glow" onClick={() => setActiveTab && setActiveTab('leaderboard')}>
            <div className="routine-step-top">
              <span className="badge badge-emerald">STEP 1</span>
              <span className="routine-icon">🏆</span>
            </div>
            <span className="routine-title">1. Leaderboard</span>
            <span className="routine-desc">Near-Highs leaders & sector money flow</span>
            <button className="btn btn-secondary btn-sm routine-btn">Open Leaders →</button>
          </div>

          {/* Step 2 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('sector-compare')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 2</span>
              <span className="routine-icon">🌐</span>
            </div>
            <span className="routine-title">2. Industry Radar</span>
            <span className="routine-desc">Find top rotating sectors & industries</span>
            <button className="btn btn-secondary btn-sm routine-btn">Explore Radar →</button>
          </div>

          {/* Step 3 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('candidates')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 3</span>
              <span className="routine-icon">🎯</span>
            </div>
            <span className="routine-title">3. Stock Screen</span>
            <span className="routine-desc">Filter VCP, Breakout & Leaders setups</span>
            <button className="btn btn-secondary btn-sm routine-btn">Screen Setups →</button>
          </div>

          {/* Step 4 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('watchlists')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 4</span>
              <span className="routine-icon">⭐️</span>
            </div>
            <span className="routine-title">4. Watchlists</span>
            <span className="routine-desc">Trim to 10–15 Focus Candidates</span>
            <button className="btn btn-secondary btn-sm routine-btn">Open Watchlists →</button>
          </div>

          {/* Step 5 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('inspector')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 5</span>
              <span className="routine-icon">🔍</span>
            </div>
            <span className="routine-title">5. Stock Inspector</span>
            <span className="routine-desc">Verify chart structure, stop & entry</span>
            <button className="btn btn-secondary btn-sm routine-btn">Inspect Chart →</button>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Intelligence Grid (Rotation Leaders + Focus Candidates) */}
      <div className="cockpit-intel-grid">
        {/* Left Card: Sector & Industry Rotation Snapshot */}
        <div className="glass-card cockpit-intel-card">
          <div className="cockpit-card-header">
            <div>
              <span className="cockpit-card-tag">SECTOR & INDUSTRY FLOW</span>
              <h3 className="cockpit-card-title">🌐 Rotation Leaders Snapshot</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab && setActiveTab('sector-compare')}
            >
              Full Industry Radar →
            </button>
          </div>

          {loadingGroups ? (
            <div className="cockpit-loading-placeholder">
              <span className="spin-icon">⟳</span> Loading rotation leaders...
            </div>
          ) : topGroups.length === 0 ? (
            <div className="cockpit-empty-state">No group data available. Run Step 0: Market Ingest.</div>
          ) : (
            <div className="cockpit-table-wrapper">
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>Industry Group</th>
                    <th>RS Rank</th>
                    <th>1-Wk Ret</th>
                    <th>RVOL%</th>
                    <th>Top Leaders</th>
                  </tr>
                </thead>
                <tbody>
                  {topGroups.map((grp, idx) => (
                    <tr
                      key={idx}
                      className="cockpit-table-row"
                      onClick={() => setActiveTab && setActiveTab('sector-compare')}
                      title="Click to view in Industry Radar"
                    >
                      <td style={{ fontWeight: 600, color: '#ffffff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {grp.name}
                      </td>
                      <td>
                        <span className="code-pill">
                          {Math.round(grp.rs_rank || 80)}
                        </span>
                      </td>
                      <td style={{ color: (grp.ret_1w_pct || 0) >= 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                        {(grp.ret_1w_pct || 0) > 0 ? `+${grp.ret_1w_pct.toFixed(1)}%` : `${grp.ret_1w_pct?.toFixed(1) || '0.0'}%`}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {Math.round(grp.rvol_pct || 100)}%
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(grp.top_symbols || []).slice(0, 3).map((sym, sIdx) => (
                            <span key={sIdx} className="badge badge-outline" style={{ fontSize: '10.5px' }}>
                              {sym}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: High-Conviction Momentum Leaders (Picks Style) */}
        <div className="glass-card cockpit-intel-card">
          <div className="cockpit-card-header">
            <div>
              <span className="cockpit-card-tag">TOP MOMENTUM SETUP CANDIDATES</span>
              <h3 className="cockpit-card-title">🎯 Leaders Focus List</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (onSelectSetup) onSelectSetup('momentum');
                if (setActiveTab) setActiveTab('candidates');
              }}
            >
              All Candidates →
            </button>
          </div>

          {loadingLeaders ? (
            <div className="cockpit-loading-placeholder">
              <span className="spin-icon">⟳</span> Screening market leaders...
            </div>
          ) : focusLeaders.length === 0 ? (
            <div className="cockpit-empty-state">No candidates found for criteria. Run Step 0: Market Ingest.</div>
          ) : (
            <div className="cockpit-table-wrapper">
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Chg%</th>
                    <th>RS Rank</th>
                    <th>ADR%</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {focusLeaders.map((stock, idx) => (
                    <tr
                      key={idx}
                      className="cockpit-table-row"
                      onClick={() => handleSelectStock && handleSelectStock(stock)}
                      title={`Click to inspect ${stock.symbol}`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="stock-sym-badge">{stock.symbol}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stock.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>
                        ${stock.price?.toFixed(2) || stock.close?.toFixed(2)}
                      </td>
                      <td style={{ color: (stock.change_pct || 0) >= 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                        {(stock.change_pct || 0) > 0 ? `+${stock.change_pct.toFixed(2)}%` : `${stock.change_pct?.toFixed(2) || '0.00'}%`}
                      </td>
                      <td>
                        <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                          {Math.round(stock.rs_rank || stock.rs_percentile || 90)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {stock.adr20 ? `${stock.adr20.toFixed(1)}%` : `${stock.adr_pct?.toFixed(1) || '4.0'}%`}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (handleSelectStock) handleSelectStock(stock);
                          }}
                        >
                          Inspect 🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Risk Budget & Pre-Flight Execution Rules */}
      <div className="glass-card cockpit-risk-card" style={{ marginTop: '20px', padding: '24px 28px' }}>
        <div className="cockpit-card-header" style={{ marginBottom: '16px' }}>
          <div>
            <span className="cockpit-card-tag">RISK MANAGEMENT COCKPIT</span>
            <h3 className="cockpit-card-title">🛡️ Execution Discipline & Position Sizing</h3>
          </div>
          <span className="badge badge-outline">Non-Negotiable Rules</span>
        </div>

        <div className="cockpit-risk-grid">
          {/* Rules Column */}
          <div className="risk-rules-col">
            <div className="risk-rule-item">
              <span className="rule-badge">CAPITAL LIMIT</span>
              <div>
                <strong>Max 25% Portfolio Capital Per Stock</strong>
                <p>Never exceed 25% allocation regardless of conviction. Always leave room for error.</p>
              </div>
            </div>

            <div className="risk-rule-item">
              <span className="rule-badge">PORTFOLIO CAP</span>
              <div>
                <strong>Maximum 5 Concurrent Open Positions</strong>
                <p>Fewer than 3 is too concentrated; more than 5 dilutes focus and makes stop management impossible.</p>
              </div>
            </div>

            <div className="risk-rule-item">
              <span className="rule-badge">STOP-LOSS CEILING</span>
              <div>
                <strong>Hard Stop at 7% – 8% Maximum</strong>
                <p>Sell unconditionally if down 7–8%. Actual stops (below pivot or entry low) are usually tighter (2–5%).</p>
              </div>
            </div>

            <div className="risk-rule-item" style={{ borderLeftColor: '#f43f5e' }}>
              <span className="rule-badge" style={{ color: '#f43f5e' }}>CIRCUIT BREAKER</span>
              <div>
                <strong>Losing Streak Rules</strong>
                <p>3 stop-outs in a row &gt; cut position size 50%. 5 stop-outs &gt; stop trading for 1 week.</p>
              </div>
            </div>
          </div>

          {/* Mini Position Calculator Column */}
          <div className="cockpit-mini-calc">
            <div className="mini-calc-header">
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>🧮 Quick Position Size Calculator</span>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>0.5% – 1.0% Risk</span>
            </div>

            <div className="mini-calc-inputs">
              <div className="mini-input-group">
                <label>Account Equity ($)</label>
                <input
                  type="number"
                  className="calc-input mini"
                  value={calcEquity}
                  onChange={(e) => setCalcEquity(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.05"
                  className="calc-input mini"
                  value={calcRiskPct}
                  onChange={(e) => setCalcRiskPct(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Entry Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  className="calc-input mini"
                  value={calcEntry}
                  onChange={(e) => setCalcEntry(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Stop Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  className="calc-input mini"
                  value={calcStop}
                  onChange={(e) => setCalcStop(e.target.value)}
                />
              </div>
            </div>

            {calcResults.isStopTooWide && (
              <div className="mini-alert-danger">
                ⚠️ Stop is {calcResults.stopPct.toFixed(1)}% (exceeds 8% hard ceiling)!
              </div>
            )}

            {calcResults.isPosTooLarge && (
              <div className="mini-alert-warning">
                ⚠️ Position is {calcResults.posPct.toFixed(1)}% of capital (exceeds 25% cap)!
              </div>
            )}

            <div className="mini-calc-results">
              <div className="mini-res-box">
                <span className="mini-res-label">Dollar Risk</span>
                <span className="mini-res-val" style={{ color: '#f43f5e' }}>${calcResults.riskDollars.toFixed(0)}</span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Stop Distance</span>
                <span className={`mini-res-val ${calcResults.isStopTooWide ? 'text-danger' : 'text-emerald'}`}>
                  {calcResults.stopPct.toFixed(1)}%
                </span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Max Shares</span>
                <span className="mini-res-val text-emerald">{calcResults.shares.toLocaleString()}</span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Position Value</span>
                <span className="mini-res-val" style={{ color: '#ffffff' }}>${calcResults.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="mini-res-sub">({calcResults.posPct.toFixed(1)}% equity)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Dedicated Market Ingest & Data Pipelines Section */}
      <div id="market-ingest-section" style={{ marginTop: '36px', paddingTop: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '20px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15))' }} />
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#38bdf8',
            textTransform: 'uppercase'
          }}>
            <span>⚡</span>
            <span>Market Ingest & Data Pipelines</span>
          </div>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent)' }} />
        </div>

        <SyncDataTab
          syncPrices={syncPrices}
          setSyncPrices={setSyncPrices}
          syncFundamentals={syncFundamentals}
          setSyncFundamentals={setSyncFundamentals}
          syncSponsorship={syncSponsorship}
          setSyncSponsorship={setSyncSponsorship}
          syncSponsorshipUniverse={syncSponsorshipUniverse}
          setSyncSponsorshipUniverse={setSyncSponsorshipUniverse}
          syncPremarket={syncPremarket}
          setSyncPremarket={setSyncPremarket}
          syncHistoryYears={syncHistoryYears}
          setSyncHistoryYears={setSyncHistoryYears}
          syncForceFull={syncForceFull}
          setSyncForceFull={setSyncForceFull}
          syncFixSplits={syncFixSplits}
          setSyncFixSplits={setSyncFixSplits}
          handleTriggerRepairSplits={handleTriggerRepairSplits}
          syncStatus={syncStatus}
          handleTriggerSync={handleTriggerSync}
          summary={summary}
          setActiveTab={setActiveTab}
          onNavigateCockpit={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      </div>
    </div>
  );
}

