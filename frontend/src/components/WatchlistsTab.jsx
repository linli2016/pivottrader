import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CandlestickChart from './CandlestickChart';
import GroupStageChart from './GroupStageChart';
import { getLocalDateStr } from '../utils/dateUtils';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

import StockBrandIcon from './StockBrandIcon';
export { StockBrandIcon };


export const QUADRANT_COLORS = {
  Leading: { accent: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', title: 'Leading' },
  Improving: { accent: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)', title: 'Improving' },
  Weakening: { accent: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', title: 'Weakening' },
  Lagging: { accent: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)', title: 'Lagging' },
};

export default function WatchlistsTab({ handleSelectStock, watchlists = [], fetchWatchlists }) {
  // Main Navigation Mode for Right Dock: 'watchlists' | 'groups' | 'positions'
  const [dockTab, setDockTab] = useState('watchlists');
  const dockTabRef = useRef(dockTab);
  useEffect(() => {
    dockTabRef.current = dockTab;
  }, [dockTab]);

  // Active Stock & Chart Data
  const [selectedStock, setSelectedStock] = useState(null);
  const selectedStockRef = useRef(selectedStock);
  useEffect(() => {
    selectedStockRef.current = selectedStock;
  }, [selectedStock]);

  const [stockPrices, setStockPrices] = useState([]);
  const [displayedPricesSymbol, setDisplayedPricesSymbol] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const displayItemsRef = useRef([]);

  // Stock Details / Telemetry
  const [stockDetail, setStockDetail] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [peersData, setPeersData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const watchlistDataCacheRef = useRef(new Map()); // symbol -> { prices, detail, financials, peersData }
  const [fundTab, setFundTab] = useState('institutions');
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Accordion Collapse States for Stock Detail Panel (Merged Stock Inspector)
  const [collapsedSections, setCollapsedSections] = useState({
    fundamentals: false,
    sponsorship: false,
    stats: false,
    profile: false,
    peers: false,
    setups: false,
  });

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Stock Details Sub-pane visibility (collapsed by default to give maximum room to chart, or persisted)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('pivot_watchlist_right_panel_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pivot_watchlist_right_panel_collapsed', isRightPanelCollapsed);
    } catch (_) {}
  }, [isRightPanelCollapsed]);

  // Resizable Splitter between Chart and Stock Detail Sub-panel
  const [stockDetailWidth, setStockDetailWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_watchlist_stock_detail_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 320 && val <= 700) return val;
      }
    } catch (_) {}
    return 380;
  });
  const [isResizingDetail, setIsResizingDetail] = useState(false);
  const resizeDetailStartXRef = useRef(0);
  const resizeDetailStartWidthRef = useRef(380);

  const startResizingDetail = useCallback((e) => {
    e.preventDefault();
    setIsResizingDetail(true);
    resizeDetailStartXRef.current = e.clientX;
    resizeDetailStartWidthRef.current = stockDetailWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [stockDetailWidth]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingDetail) return;
      const delta = resizeDetailStartXRef.current - e.clientX;
      const newWidth = Math.max(320, Math.min(650, resizeDetailStartWidthRef.current + delta));
      setStockDetailWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingDetail) {
        setIsResizingDetail(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_watchlist_stock_detail_width', stockDetailWidth);
        } catch (_) {}
      }
    };

    if (isResizingDetail) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingDetail, stockDetailWidth]);

  // Quick ticker search in inspector drawer
  const [inspectTickerInput, setInspectTickerInput] = useState('');

  // Multi-Charts Layout (Daily on top, Monthly on bottom-left, Weekly on bottom-right)
  const [showMultiCharts, setShowMultiCharts] = useState(() => {
    try {
      const saved = localStorage.getItem('pivot_watchlist_multicharts');
      return saved !== null ? saved === 'true' : true; // default true as requested
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pivot_watchlist_multicharts', String(showMultiCharts));
    } catch (_) {}
  }, [showMultiCharts]);

  // -------------------------------------------------------------
  // TAB 1: WATCHLIST STATE
  // -------------------------------------------------------------
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [targetWatchlistId, setTargetWatchlistId] = useState(null);
  const [targetItems, setTargetItems] = useState([]);
  const [items, setItems] = useState([]);
  const activeWatchlistSymbols = useMemo(() => {
    return new Set((items || []).map((i) => i.symbol?.toUpperCase()).filter(Boolean));
  }, [items]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');
  const [sortBy, setSortBy] = useState('group_rs');
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [isAddingBatchToTarget, setIsAddingBatchToTarget] = useState(false);
  const [quickAddMenuSym, setQuickAddMenuSym] = useState(null); // ticker to add to a chosen watchlist
  const [quickAddToast, setQuickAddToast] = useState(null); // notification toast

  // -------------------------------------------------------------
  // TAB 2: MARKET GROUPS (SECTORS / INDUSTRIES / THEMES) STATE
  // -------------------------------------------------------------
  const [groupType, setGroupType] = useState('sectors'); // 'sectors' | 'industries' | 'themes'
  const [groupsData, setGroupsData] = useState({ sectors: [], industries: [], themes: [] });
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [expandedMarketGroups, setExpandedMarketGroups] = useState(new Set());
  const [groupConstituents, setGroupConstituents] = useState({}); // key: `${type}:${name}` -> stock[]
  const [loadingConstituents, setLoadingConstituents] = useState({}); // key -> bool
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSortBy, setGroupSortBy] = useState('today_pct'); // 'today_pct' | 'ret_1w_pct' | 'ret_1m_pct' | 'ret_3m_pct' | 'ret_ytd_pct' | 'rs_rank' | 'dist_52wh_pct' | 'rvol_pct' | 'stage_num'
  const [groupSortOrder, setGroupSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [previewGroupChart, setPreviewGroupChart] = useState(null); // { groupType, groupName, stageBadge, stageColor } for reference modal
  const [activeGroupChart, setActiveGroupChart] = useState(null); // docked in left chart panel

  // Close preview modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewGroupChart) {
        setPreviewGroupChart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewGroupChart]);

  // -------------------------------------------------------------
  // TAB 3: POSITIONS (OPEN & CLOSED TRADES) STATE
  // -------------------------------------------------------------
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [positionsStatus, setPositionsStatus] = useState('OPEN'); // 'OPEN' | 'CLOSED'

  const openPositions = useMemo(() => positions.filter((p) => p.status === 'OPEN'), [positions]);
  const closedPositions = useMemo(() => positions.filter((p) => p.status === 'CLOSED'), [positions]);
  const displayedPositions = useMemo(
    () => (positionsStatus === 'OPEN' ? openPositions : closedPositions),
    [positionsStatus, openPositions, closedPositions]
  );

  // -------------------------------------------------------------
  // RESIZABLE SPLITTER DIVIDER (Between Chart and Right Table Dock)
  // -------------------------------------------------------------
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_markets_table_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch (_) {}
    return 480; // default width for comfortable table reading
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(480);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const delta = resizeStartXRef.current - e.clientX;
      const newWidth = Math.max(0, Math.min(resizeStartWidthRef.current + delta, window.innerWidth - 80));
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_markets_table_width', rightPanelWidth);
        } catch (_) {}
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rightPanelWidth]);

  // Multi-Chart Vertical Height Splitter State (Daily vs Monthly/Weekly)
  const [multiChartTopPct, setMultiChartTopPct] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_markets_multichart_top_pct');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 15 && val <= 85) return val;
      }
    } catch (_) {}
    return 62; // default: 62% daily on top, 38% monthly/weekly on bottom
  });

  const [isMultiChartResizing, setIsMultiChartResizing] = useState(false);
  const multiChartsContainerRef = useRef(null);
  const resizeStartYRef = useRef(0);
  const resizeStartTopPctRef = useRef(62);
  const containerHeightRef = useRef(600);

  const startMultiChartResizing = useCallback(
    (e) => {
      e.preventDefault();
      setIsMultiChartResizing(true);
      resizeStartYRef.current = e.clientY;
      resizeStartTopPctRef.current = multiChartTopPct;
      if (multiChartsContainerRef.current) {
        containerHeightRef.current = multiChartsContainerRef.current.getBoundingClientRect().height;
      }
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [multiChartTopPct]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isMultiChartResizing) return;
      const deltaY = e.clientY - resizeStartYRef.current;
      const totalH = containerHeightRef.current || 600;
      const deltaPct = (deltaY / totalH) * 100;
      const newPct = Math.max(15, Math.min(85, resizeStartTopPctRef.current + deltaPct));
      setMultiChartTopPct(newPct);
    };

    const handleMouseUp = () => {
      if (isMultiChartResizing) {
        setIsMultiChartResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_markets_multichart_top_pct', multiChartTopPct.toString());
        } catch (_) {}
      }
    };

    if (isMultiChartResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMultiChartResizing, multiChartTopPct]);

  // Show temporary toast
  const triggerToast = (msg) => {
    setQuickAddToast(msg);
    setTimeout(() => setQuickAddToast(null), 2500);
  };

  // Initialize selected and target watchlists (prefer 'Mag 7' if present, otherwise first available)
  useEffect(() => {
    if (watchlists.length > 0) {
      if (!selectedWatchlistId) {
        const mag7 = watchlists.find((w) => w.name.toLowerCase() === 'mag 7');
        setSelectedWatchlistId(mag7 ? mag7.id : watchlists[0].id);
      }
      if (!targetWatchlistId) {
        const mag7 = watchlists.find((w) => w.name.toLowerCase() === 'mag 7');
        setTargetWatchlistId(mag7 ? mag7.id : watchlists[0].id);
      }
    }
  }, [watchlists, selectedWatchlistId, targetWatchlistId]);

  // Target Watchlist items for targetWatchlistSymbols
  const fetchTargetItems = useCallback(async (wId) => {
    if (!wId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${wId}/items`);
      if (res.ok) {
        const data = await res.json();
        setTargetItems(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching target watchlist items:', e);
    }
  }, []);

  useEffect(() => {
    if (targetWatchlistId && targetWatchlistId !== selectedWatchlistId) {
      fetchTargetItems(targetWatchlistId);
    }
  }, [targetWatchlistId, selectedWatchlistId, fetchTargetItems]);

  const targetWatchlistSymbols = useMemo(() => {
    if (targetWatchlistId === selectedWatchlistId) {
      return activeWatchlistSymbols;
    }
    return new Set((targetItems || []).map((i) => i.symbol?.toUpperCase()).filter(Boolean));
  }, [targetWatchlistId, selectedWatchlistId, activeWatchlistSymbols, targetItems]);

  // Fetch watchlist items
  const fetchItems = useCallback(async (wId) => {
    if (!wId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${wId}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        if (data.length > 0) {
          setSelectedStock((current) => {
            if (!current) {
              return data[0];
            }
            if (dockTabRef.current === 'watchlists' && !data.some((d) => d.symbol === current.symbol)) {
              return data[0];
            }
            return current;
          });
        }
      }
    } catch (e) {
      console.error('Error fetching watchlist items:', e);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWatchlistId) {
      setSelectedIndustry('ALL');
      fetchItems(selectedWatchlistId);
    }
  }, [selectedWatchlistId, fetchItems]);

  // Fetch Groups data
  const fetchGroupsData = useCallback(async (type) => {
    if (groupsData[type] && groupsData[type].length > 0) return;
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/strength?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setGroupsData((prev) => ({ ...prev, [type]: data }));
      }
    } catch (e) {
      console.error(`Error fetching ${type} strength:`, e);
    } finally {
      setLoadingGroups(false);
    }
  }, [groupsData]);

  // Fetch Positions
  const fetchPositions = useCallback(async () => {
    setLoadingPositions(true);
    try {
      const res = await fetch(`${API_BASE}/api/positions`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
      }
    } catch (e) {
      console.error('Error fetching open positions:', e);
    } finally {
      setLoadingPositions(false);
    }
  }, []);

  useEffect(() => {
    if (dockTab === 'groups') {
      fetchGroupsData(groupType);
    } else if (dockTab === 'positions') {
      fetchPositions();
    }
  }, [dockTab, groupType, fetchGroupsData, fetchPositions]);

  // Expand / collapse group accordion in Market Groups
  const toggleMarketGroup = async (groupName) => {
    const isExpanded = expandedMarketGroups.has(groupName);
    const cacheKey = `${groupType}:${groupName}`;

    setExpandedMarketGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });

    if (!isExpanded && !groupConstituents[cacheKey]) {
      setLoadingConstituents((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        const res = await fetch(`${API_BASE}/api/groups/constituents?type=${groupType}&name=${encodeURIComponent(groupName)}`);
        if (res.ok) {
          const data = await res.json();
          setGroupConstituents((prev) => ({ ...prev, [cacheKey]: data }));
        }
      } catch (e) {
        console.error(`Error fetching constituents for ${groupName}:`, e);
      } finally {
        setLoadingConstituents((prev) => ({ ...prev, [cacheKey]: false }));
      }
    }
  };

  // Prefetch adjacent stocks for instantaneous 0ms flip
  const prefetchAdjacentWatchlistStocks = useCallback((currentSym, stockList) => {
    const list = stockList || displayItemsRef.current || [];
    if (!list || list.length <= 1) return;
    const idx = list.findIndex((s) => (s.symbol || '').toUpperCase() === currentSym);
    if (idx === -1) return;
    const targets = [];
    [-2, -1, 1, 2].forEach((offset) => {
      const targetIdx = idx + offset;
      if (targetIdx >= 0 && targetIdx < list.length) {
        const s = (list[targetIdx].symbol || '').toUpperCase();
        if (s && !watchlistDataCacheRef.current.has(s) && !targets.includes(s)) {
          targets.push(s);
        }
      }
    });

    targets.forEach(async (targetSym) => {
      try {
        const [pRes, dRes, fRes, peRes] = await Promise.all([
          fetch(`${API_BASE}/api/stocks/${targetSym}/prices?limit=3500`),
          fetch(`${API_BASE}/api/stocks/${targetSym}`),
          fetch(`${API_BASE}/api/stocks/${targetSym}/financials`),
          fetch(`${API_BASE}/api/stocks/${targetSym}/peers?limit=6`)
        ]);
        const [prices, detail, fin, peers] = await Promise.all([
          pRes.ok ? pRes.json() : [],
          dRes.ok ? dRes.json() : null,
          fRes.ok ? fRes.json() : null,
          peRes.ok ? peRes.json() : null,
        ]);
        watchlistDataCacheRef.current.set(targetSym, { prices, detail, financials: fin, peersData: peers });
      } catch (_) {}
    });
  }, []);

  // Centralized stock selection: updates immediately in one batch if cached, or triggers fetch without unmounting charts
  const selectStock = useCallback((stock) => {
    if (!stock?.symbol) {
      setSelectedStock(null);
      setStockPrices([]);
      setDisplayedPricesSymbol(null);
      setStockDetail(null);
      setFinancials(null);
      setPeersData(null);
      return;
    }
    setActiveGroupChart(null);
    setSelectedStock(stock);

    const sym = stock.symbol.toUpperCase();
    if (watchlistDataCacheRef.current.has(sym)) {
      const cached = watchlistDataCacheRef.current.get(sym);
      setStockPrices(cached.prices);
      setDisplayedPricesSymbol(sym);
      setStockDetail(cached.detail);
      setFinancials(cached.financials);
      setPeersData(cached.peersData);
      setLoadingPrices(false);
      setLoadingDetail(false);
      prefetchAdjacentWatchlistStocks(sym, displayItemsRef.current);
    }
  }, [prefetchAdjacentWatchlistStocks]);

  // Quick ticker search in inspector drawer
  const handleInspectTickerSubmit = (e) => {
    e?.preventDefault();
    const cleanSym = inspectTickerInput.trim().toUpperCase();
    if (!cleanSym) return;
    setInspectTickerInput('');
    selectStock({ symbol: cleanSym });
    setIsRightPanelCollapsed(false);
  };

  // Global listener for pt-inspect-stock event
  useEffect(() => {
    const handleInspectEvent = (e) => {
      const sym = e.detail?.symbol;
      if (sym) {
        setIsRightPanelCollapsed(false);
        selectStock({ symbol: sym.toUpperCase() });
      }
    };
    window.addEventListener('pt-inspect-stock', handleInspectEvent);
    return () => window.removeEventListener('pt-inspect-stock', handleInspectEvent);
  }, [selectStock]);

  // Fetch stock chart prices and telemetry when selected stock changes
  useEffect(() => {
    if (!selectedStock?.symbol) {
      setStockPrices([]);
      setDisplayedPricesSymbol(null);
      setStockDetail(null);
      setFinancials(null);
      setPeersData(null);
      return;
    }

    const sym = selectedStock.symbol.toUpperCase();

    // 1. Instant 0ms cache hit
    if (watchlistDataCacheRef.current.has(sym)) {
      const cached = watchlistDataCacheRef.current.get(sym);
      setStockPrices(cached.prices);
      setDisplayedPricesSymbol(sym);
      setStockDetail(cached.detail);
      setFinancials(cached.financials);
      setPeersData(cached.peersData);
      setLoadingPrices(false);
      setLoadingDetail(false);
      prefetchAdjacentWatchlistStocks(sym, displayItemsRef.current);
      return;
    }

    setLoadingPrices(true);
    setLoadingDetail(true);

    let pricesData = null;
    let detailData = null;
    let financialsData = null;
    let peersDataRes = null;

    const pPrices = fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=3500`)
      .then((res) => (res.ok ? res.json() : []))
      .then((prices) => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          pricesData = prices;
          setStockPrices(prices);
          setDisplayedPricesSymbol(sym);
          setLoadingPrices(false);
        }
        return prices;
      })
      .catch(() => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          setLoadingPrices(false);
        }
        return [];
      });

    const pDetail = fetch(`${API_BASE}/api/stocks/${sym}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((detail) => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          detailData = detail;
          setStockDetail(detail);
          setLoadingDetail(false);
        }
        return detail;
      })
      .catch(() => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          setLoadingDetail(false);
        }
        return null;
      });

    const pFin = fetch(`${API_BASE}/api/stocks/${sym}/financials`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fin) => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          financialsData = fin;
          setFinancials(fin);
        }
        return fin;
      })
      .catch(() => null);

    const pPeers = fetch(`${API_BASE}/api/stocks/${sym}/peers?limit=6`)
      .then((res) => (res.ok ? res.json() : null))
      .then((peers) => {
        if (selectedStockRef.current?.symbol?.toUpperCase() === sym) {
          peersDataRes = peers;
          setPeersData(peers);
        }
        return peers;
      })
      .catch(() => null);

    Promise.all([pPrices, pDetail, pFin, pPeers]).then(() => {
      watchlistDataCacheRef.current.set(sym, {
        prices: pricesData || [],
        detail: detailData,
        financials: financialsData,
        peersData: peersDataRes
      });
      prefetchAdjacentWatchlistStocks(sym, displayItemsRef.current);
    });
  }, [selectedStock?.symbol, prefetchAdjacentWatchlistStocks]);

  // Quick Add Symbol to active watchlist
  const handleAddSymbol = async (e) => {
    e?.preventDefault();
    const sym = newSymbolInput.trim().toUpperCase();
    if (!sym || !selectedWatchlistId) return;

    setIsAddingSymbol(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym })
      });
      if (res.ok) {
        setNewSymbolInput('');
        fetchItems(selectedWatchlistId);
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Added ${sym} to watchlist`);
      }
    } catch (e) {
      console.error('Error adding symbol:', e);
    } finally {
      setIsAddingSymbol(false);
    }
  };

  // Add arbitrary symbol to specified watchlist
  const handleAddSymbolToWatchlist = async (sym, targetWId = selectedWatchlistId) => {
    if (!sym || !targetWId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${targetWId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym.toUpperCase() })
      });
      if (res.ok) {
        if (targetWId === selectedWatchlistId) {
          fetchItems(selectedWatchlistId);
        }
        if (fetchWatchlists) fetchWatchlists();
        const targetW = watchlists.find((w) => w.id === targetWId);
        triggerToast(`Added ${sym.toUpperCase()} to ${targetW?.name || 'watchlist'}`);
      }
    } catch (err) {
      console.error('Error adding symbol to watchlist:', err);
    } finally {
      setQuickAddMenuSym(null);
    }
  };

  // Remove symbol from active watchlist
  const handleRemoveSymbol = async (sym, e) => {
    if (e) e.stopPropagation();
    if (!selectedWatchlistId || !sym) return;

    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/${encodeURIComponent(sym)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setItems((prev) => {
          const updated = prev.filter((i) => i.symbol !== sym);
          if (dockTabRef.current === 'watchlists' && selectedStock?.symbol === sym) {
            setSelectedStock(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Removed ${sym}`);
      }
    } catch (e) {
      console.error('Error removing symbol:', e);
    }
  };

  // Toggle symbol in target watchlist (matches Screen result page)
  const handleToggleWatchlist = async (sym, customTargetId = null) => {
    const targetWId = customTargetId || targetWatchlistId || selectedWatchlistId;
    if (!targetWId || !sym) return;
    const symUpper = sym.toUpperCase();
    const isTargetSame = targetWId === selectedWatchlistId;
    const isSaved = isTargetSame ? activeWatchlistSymbols.has(symUpper) : targetWatchlistSymbols.has(symUpper);
    const targetW = watchlists.find((w) => w.id === targetWId);

    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWId}/items/${encodeURIComponent(symUpper)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          if (isTargetSame) {
            setItems((prev) => {
              const updated = prev.filter((i) => i.symbol?.toUpperCase() !== symUpper);
              if (dockTabRef.current === 'watchlists' && selectedStock?.symbol?.toUpperCase() === symUpper) {
                setSelectedStock(updated.length > 0 ? updated[0] : null);
              }
              return updated;
            });
          } else {
            setTargetItems((prev) => prev.filter((i) => i.symbol?.toUpperCase() !== symUpper));
          }
          if (fetchWatchlists) fetchWatchlists();
          triggerToast(`Removed ${symUpper} from ${targetW?.name || 'watchlist'}`);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: symUpper })
        });
        if (res.ok) {
          if (isTargetSame) {
            fetchItems(selectedWatchlistId);
          } else {
            fetchTargetItems(targetWId);
          }
          if (fetchWatchlists) fetchWatchlists();
          triggerToast(`Added ${symUpper} to ${targetW?.name || 'watchlist'}`);
        }
      }
    } catch (err) {
      console.error('Error toggling watchlist item:', err);
    }
  };

  // Batch add selected symbols to target watchlist
  const handleAddBatchToTarget = async () => {
    const targetWId = targetWatchlistId || selectedWatchlistId;
    if (!targetWId || selectedSymbols.size === 0) return;
    const targetW = watchlists.find((w) => w.id === targetWId);
    const symbolsArray = Array.from(selectedSymbols);

    setIsAddingBatchToTarget(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${targetWId}/items/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolsArray })
      });
      if (res.ok) {
        if (targetWId === selectedWatchlistId) {
          fetchItems(selectedWatchlistId);
        } else {
          fetchTargetItems(targetWId);
        }
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Added ${symbolsArray.length} stock${symbolsArray.length > 1 ? 's' : ''} to "${targetW?.name || 'watchlist'}"`);
        setSelectedSymbols(new Set());
        setIsSelectMode(false);
      } else {
        triggerToast('Failed to add stocks to target watchlist');
      }
    } catch (e) {
      console.error('Error adding batch to target watchlist:', e);
      triggerToast('Error adding stocks');
    } finally {
      setIsAddingBatchToTarget(false);
    }
  };

  // Batch remove selected symbols
  const handleRemoveBatch = async () => {
    if (!selectedWatchlistId || selectedSymbols.size === 0) return;
    const confirmDelete = window.confirm(`Remove ${selectedSymbols.size} symbols from this watchlist?`);
    if (!confirmDelete) return;

    setIsDeletingItems(true);
    try {
      const symbolsArray = Array.from(selectedSymbols);
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/remove-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolsArray })
      });
      if (res.ok) {
        const symsUpper = new Set(symbolsArray.map((s) => s.toUpperCase()));
        setItems((prev) => {
          const updated = prev.filter((i) => !symsUpper.has(i.symbol?.toUpperCase()));
          if (dockTabRef.current === 'watchlists' && selectedStock && symsUpper.has(selectedStock.symbol?.toUpperCase())) {
            setSelectedStock(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
        setSelectedSymbols(new Set());
        setIsSelectMode(false);
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Removed ${symbolsArray.length} symbols`);
      } else {
        triggerToast('Failed to remove selected symbols');
      }
    } catch (e) {
      console.error('Error removing batch symbols:', e);
      triggerToast('Error removing symbols');
    } finally {
      setIsDeletingItems(false);
    }
  };

  // Clear all symbols from active watchlist
  const handleClearWatchlist = async () => {
    if (!selectedWatchlistId || items.length === 0) {
      triggerToast('Watchlist is already empty');
      return;
    }
    const currentW = watchlists.find((w) => w.id === selectedWatchlistId);
    const confirmClear = window.confirm(`Remove all ${items.length} stocks from "${currentW?.name || 'this watchlist'}"?`);
    if (!confirmClear) return;

    setIsDeletingItems(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setItems([]);
        setSelectedSymbols(new Set());
        setIsSelectMode(false);
        if (dockTabRef.current === 'watchlists' && selectedStock) {
          setSelectedStock(null);
        }
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Removed all stocks from "${currentW?.name || 'watchlist'}"`);
      } else {
        triggerToast('Failed to clear watchlist');
      }
    } catch (e) {
      console.error('Error clearing watchlist:', e);
      triggerToast('Error clearing watchlist');
    } finally {
      setIsDeletingItems(false);
    }
  };

  const toggleSelectSymbol = (sym, e) => {
    e.stopPropagation();
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  // Create Watchlist
  const handleCreateWatchlist = async (e) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() })
      });
      if (res.ok) {
        const created = await res.json();
        setNewWatchlistName('');
        setShowCreateModal(false);
        if (fetchWatchlists) await fetchWatchlists();
        setSelectedWatchlistId(created.id);
        triggerToast(`Created watchlist "${created.name}"`);
      }
    } catch (e) {
      console.error('Error creating watchlist:', e);
    }
  };

  // Rename Watchlist
  const handleRenameWatchlist = async (e) => {
    e.preventDefault();
    if (!renameInput.trim() || !selectedWatchlistId) return;

    setIsRenaming(true);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInput.trim() })
      });
      if (res.ok) {
        setShowRenameModal(false);
        if (fetchWatchlists) await fetchWatchlists();
        triggerToast(`Renamed to "${renameInput.trim()}"`);
      }
    } catch (e) {
      console.error('Error renaming watchlist:', e);
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete Watchlist
  const handleDeleteWatchlist = async () => {
    if (!selectedWatchlistId) return;
    const target = watchlists.find((w) => w.id === selectedWatchlistId);
    const confirmDelete = window.confirm(`Delete watchlist "${target?.name || ''}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (fetchWatchlists) await fetchWatchlists();
        const remaining = watchlists.filter((w) => w.id !== selectedWatchlistId);
        setSelectedWatchlistId(remaining.length > 0 ? remaining[0].id : null);
        triggerToast('Watchlist deleted');
      }
    } catch (e) {
      console.error('Error deleting watchlist:', e);
    }
  };

  // Export to TradingView (.txt)
  const handleExportTradingView = () => {
    if (items.length === 0) return;
    const currentW = watchlists.find((w) => w.id === selectedWatchlistId);
    const filename = `${(currentW?.name || 'watchlist').toLowerCase().replace(/\s+/g, '_')}_tradingview.txt`;
    const symbolsList = items.map((i) => i.symbol.toUpperCase()).join('\n');
    const blob = new Blob([symbolsList], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('Exported to TradingView format');
  };


  // -------------------------------------------------------------
  // FILTERING & SORTING FOR WATCHLIST ITEMS
  // -------------------------------------------------------------
  const industryCounts = useMemo(() => {
    const counts = {};
    (items || []).forEach((item) => {
      const ind = (item.industry || item.group_name || item.sector || '').trim() || 'Unclassified';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [items]);

  useEffect(() => {
    if (selectedIndustry !== 'ALL' && !industryCounts.some(ic => ic.industry === selectedIndustry)) {
      setSelectedIndustry('ALL');
    }
  }, [industryCounts, selectedIndustry]);

  const filteredItems = useMemo(() => {
    if (!selectedIndustry || selectedIndustry === 'ALL') {
      return items;
    }
    return items.filter((item) => {
      const ind = (item.industry || item.group_name || item.sector || '').trim() || 'Unclassified';
      return ind === selectedIndustry;
    });
  }, [items, selectedIndustry]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case 'symbol':
        return copy.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
      case 'symbol_desc':
        return copy.sort((a, b) => (b.symbol || '').localeCompare(a.symbol || ''));
      case 'group_rs':
        return copy.sort((a, b) => (b.group_rs_rank ?? b.rs_rank ?? 0) - (a.group_rs_rank ?? a.rs_rank ?? 0));
      case 'rs_rank':
        return copy.sort((a, b) => (b.rs_rank ?? -999) - (a.rs_rank ?? -999));
      case 'rs_rank_asc':
        return copy.sort((a, b) => (a.rs_rank ?? 999) - (b.rs_rank ?? 999));
      case 'chg_pct_desc':
        return copy.sort((a, b) => ((b.today_pct ?? b.chg_pct) ?? -999) - ((a.today_pct ?? a.chg_pct) ?? -999));
      case 'chg_pct_asc':
        return copy.sort((a, b) => ((a.today_pct ?? a.chg_pct) ?? 999) - ((b.today_pct ?? b.chg_pct) ?? 999));
      case 'added':
        return copy.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
      default:
        return copy;
    }
  }, [filteredItems, sortBy]);

  // -------------------------------------------------------------
  // FILTERING & SORTING FOR MARKET GROUPS TAB
  // -------------------------------------------------------------
  const currentGroupsList = groupsData[groupType] || [];

  const filteredAndSortedGroups = useMemo(() => {
    let list = currentGroupsList;
    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.trim().toLowerCase();
      list = list.filter((g) => (g.name || '').toLowerCase().includes(q));
    }

    const sorted = [...list].sort((a, b) => {
      let valA = a[groupSortBy];
      let valB = b[groupSortBy];
      if (valA === undefined || valA === null) valA = -999999;
      if (valB === undefined || valB === null) valB = -999999;
      if (typeof valA === 'string') return valA.localeCompare(valB);
      return valB - valA;
    });

    return groupSortOrder === 'asc' ? sorted.reverse() : sorted;
  }, [currentGroupsList, groupSearchQuery, groupSortBy, groupSortOrder]);

  // Current Group Index for Next / Prev navigation
  const currentGroupIndex = useMemo(() => {
    if (!activeGroupChart) return -1;
    return filteredAndSortedGroups.findIndex((g) => g.name === activeGroupChart.groupName);
  }, [activeGroupChart, filteredAndSortedGroups]);

  const handleNextGroup = useCallback(() => {
    if (filteredAndSortedGroups.length === 0) return;
    const nextIdx = currentGroupIndex < filteredAndSortedGroups.length - 1 ? currentGroupIndex + 1 : 0;
    const grp = filteredAndSortedGroups[nextIdx];
    if (grp) {
      setActiveGroupChart({
        groupType,
        groupName: grp.name,
        stageBadge: grp.stage_badge,
        stageColor: grp.stage_color
      });
    }
  }, [currentGroupIndex, filteredAndSortedGroups, groupType]);

  const handlePrevGroup = useCallback(() => {
    if (filteredAndSortedGroups.length === 0) return;
    const prevIdx = currentGroupIndex > 0 ? currentGroupIndex - 1 : filteredAndSortedGroups.length - 1;
    const grp = filteredAndSortedGroups[prevIdx];
    if (grp) {
      setActiveGroupChart({
        groupType,
        groupName: grp.name,
        stageBadge: grp.stage_badge,
        stageColor: grp.stage_color
      });
    }
  }, [currentGroupIndex, filteredAndSortedGroups, groupType]);

  const handleOpenGroupChart = useCallback(
    (type, name) => {
      if (!name) return;
      setGroupType(type);
      fetchGroupsData(type);
      const match = groupsData[type]?.find((g) => g.name === name);
      setActiveGroupChart({
        groupType: type,
        groupName: name,
        stageBadge: match?.stage_badge || (type === 'sectors' ? 'Sector Stage' : 'Industry Stage'),
        stageColor: match?.stage_color || '#38bdf8'
      });
    },
    [fetchGroupsData, groupsData]
  );

  // -------------------------------------------------------------
  // FLATTENED DISPLAY ITEMS FOR KEYBOARD NAVIGATION
  // -------------------------------------------------------------
  const displayItems = useMemo(() => {
    if (dockTab === 'watchlists') {
      return sortedItems;
    }
    if (dockTab === 'groups') {
      const flat = [];
      expandedMarketGroups.forEach((gName) => {
        const cacheKey = `${groupType}:${gName}`;
        const consts = groupConstituents[cacheKey];
        if (consts && consts.length > 0) {
          flat.push(...consts);
        }
      });
      return flat;
    }
    if (dockTab === 'positions') {
      return displayedPositions;
    }
    return sortedItems;
  }, [dockTab, sortedItems, expandedMarketGroups, groupType, groupConstituents, displayedPositions]);

  useEffect(() => {
    displayItemsRef.current = displayItems;
  }, [displayItems]);

  // Keyboard Navigation across currently visible display items or groups (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        // If currently inspecting a group in the main panel, navigate next/prev group
        if (activeGroupChart && dockTab === 'groups') {
          if (e.key === 'ArrowUp') handlePrevGroup();
          else handleNextGroup();
          return;
        }

        if (!displayItems || displayItems.length === 0) return;
        const currentIdx = displayItems.findIndex(
          (i) => (i.symbol || '').toUpperCase() === (selectedStock?.symbol || '').toUpperCase()
        );
        if (e.key === 'ArrowUp') {
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : displayItems.length - 1;
          selectStock(displayItems[prevIdx]);
        } else {
          const nextIdx = currentIdx < displayItems.length - 1 ? currentIdx + 1 : 0;
          selectStock(displayItems[nextIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayItems, selectedStock, activeGroupChart, dockTab, handlePrevGroup, handleNextGroup, selectStock]);

  const activeWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);
  const targetWatchlist = watchlists.find((w) => w.id === targetWatchlistId);

  // Active bar metrics for HUD
  const latestBar = useMemo(() => {
    if (!stockPrices || stockPrices.length === 0) return null;
    return stockPrices[stockPrices.length - 1];
  }, [stockPrices]);

  const cleanName = useMemo(() => {
    const raw = selectedStock?.name || stockDetail?.metadata?.name || selectedStock?.symbol || '';
    return raw
      .replace(/[\s,-]+(?:Class\s+[A-Z0-9]+\s+)?(?:Common\s+(?:Stock|Shares?|Units?)|Capital\s+Stock|Ordinary\s+Shares?|(?:American\s+)?Depositary\s+Shares?|ADS|ADR|Subordinated?\s+Voting\s+Shares?|Limited\s+Partnership\s+Units?).*$/i, '')
      .replace(/[\s,-]+(?:Common\s+(?:Stock|Shares?|Units?)|Capital\s+Stock|Ordinary\s+Shares?|(?:American\s+)?Depositary\s+Shares?).*$/i, '')
      .replace(/\s*\(.*?par\s+value.*?\)/i, '')
      .replace(/[\s,-]+Class\s+[A-Z0-9]+(?:\s+Common\s+(?:Stock|Shares?))?$/i, '')
      .replace(/[\s,-]+$/, '')
      .trim();
  }, [selectedStock, stockDetail]);

  const rsRank = selectedStock?.rs_rank ?? stockDetail?.rs_rank ?? null;

  const hasBlueDot = useMemo(() => {
    if (selectedStock?.is_rs_blue_dot || stockDetail?.is_rs_blue_dot) return true;
    if (stockPrices && stockPrices.length > 0) {
      const recent = stockPrices.slice(-5);
      return recent.some((b) => b.is_rs_blue_dot);
    }
    return false;
  }, [selectedStock, stockDetail, stockPrices]);

  // Derived stock telemetry for Screener-matching Header
  const adrVal = stockDetail?.adr_20d ?? selectedStock?.adr_20d ?? null;
  const tiVal = stockDetail?.ti_65 ?? selectedStock?.ti_65 ?? null;
  const ret1m = stockDetail?.ret_1m ?? selectedStock?.ret_1m ?? null;
  const ret3m = stockDetail?.ret_3m ?? selectedStock?.ret_3m ?? null;
  const ret6m = stockDetail?.ret_6m ?? selectedStock?.ret_6m ?? null;
  const instSummary = stockDetail?.sponsorship_summary ?? null;
  const instHolders = instSummary?.holders_count ?? selectedStock?.inst_holders_count ?? null;
  const instStreak = instSummary?.sponsorship_streak ?? selectedStock?.sponsorship_streak ?? 0;
  const exchange = stockDetail?.metadata?.exchange || selectedStock?.exchange || '';
  const sector = stockDetail?.metadata?.sector || selectedStock?.sector || '';
  const industry = stockDetail?.metadata?.industry || selectedStock?.industry || '';
  const stageBadge = selectedStock?.stage_badge || null;
  const stageColor = selectedStock?.stage_color || null;
  const activeSetups = selectedStock?.setups || [];

  // 52W High, Low, and Distance calculation
  const stats52w = useMemo(() => {
    let high = stockDetail?.high_52w ?? stockDetail?.metrics?.high_52w ?? selectedStock?.high_52w;
    let low = stockDetail?.low_52w ?? stockDetail?.metrics?.low_52w ?? selectedStock?.low_52w;
    let distHigh = stockDetail?.dist_from_52w_high ?? stockDetail?.metrics?.dist_from_52w_high ?? selectedStock?.dist_from_52w_high ?? selectedStock?.dist_52wh_pct;
    
    // Fallback: compute from daily stockPrices if not present in detail/stock
    if ((high === null || high === undefined || low === null || low === undefined) && stockPrices && stockPrices.length > 0) {
      const last252 = stockPrices.slice(-252);
      const highs = last252.map(b => b.high).filter(v => typeof v === 'number' && v > 0);
      const lows = last252.map(b => b.low).filter(v => typeof v === 'number' && v > 0);
      if (highs.length > 0) high = Math.max(...highs);
      if (lows.length > 0) low = Math.min(...lows);
    }
    if ((distHigh === null || distHigh === undefined) && high && stockPrices && stockPrices.length > 0) {
      const curClose = stockPrices[stockPrices.length - 1]?.close;
      if (curClose) {
        distHigh = ((curClose - high) / high) * 100;
      }
    }
    return { high, low, distHigh };
  }, [stockDetail, selectedStock, stockPrices]);

  // Volume 50D MA calculation
  const vol50dMa = useMemo(() => {
    let v = stockDetail?.vol_50d_ma ?? stockDetail?.metrics?.vol_50d_ma ?? latestBar?.vol_50d_ma ?? selectedStock?.vol_50d_ma;
    if ((v === null || v === undefined) && stockPrices && stockPrices.length >= 10) {
      const sliceBars = stockPrices.slice(-50);
      const vols = sliceBars.map(b => b.volume).filter(x => typeof x === 'number');
      if (vols.length > 0) {
        v = vols.reduce((acc, val) => acc + val, 0) / vols.length;
      }
    }
    return v;
  }, [stockDetail, latestBar, selectedStock, stockPrices]);

  // Market Cap
  const marketCap = useMemo(() => {
    return stockDetail?.market_cap ?? stockDetail?.metadata?.market_cap ?? stockDetail?.metrics?.market_cap ?? selectedStock?.market_cap ?? null;
  }, [stockDetail, selectedStock]);

  const formatMarketCap = (cap) => {
    if (!cap || isNaN(cap)) return '—';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${Number(cap).toLocaleString()}`;
  };

  const formatDist52w = (dist) => {
    if (dist === null || dist === undefined || isNaN(dist)) return '—';
    const num = Number(dist);
    if (Math.abs(num) < 0.05) return '0.0%';
    const val = num > 0 ? -num : num;
    return `${val.toFixed(1)}%`;
  };

  const rawThemes = stockDetail?.themes || stockDetail?.metadata?.themes;
  const themes = useMemo(() => {
    if (Array.isArray(rawThemes) && rawThemes.length > 0) return rawThemes;
    const singleTheme = stockDetail?.theme || stockDetail?.metadata?.theme;
    return singleTheme ? [singleTheme] : [];
  }, [rawThemes, stockDetail?.theme, stockDetail?.metadata?.theme]);

  const isEtf = useMemo(() => {
    const at = stockDetail?.metadata?.asset_type || selectedStock?.asset_type;
    return at === 'ETF' || (at && at.toUpperCase().includes('ETF'));
  }, [stockDetail?.metadata?.asset_type, selectedStock?.asset_type]);

  const inspectorEarningsBadge = useMemo(() => {
    const dt = stockDetail?.next_earnings_date || stockDetail?.metadata?.next_earnings_date || selectedStock?.next_earnings_date;
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
        fullDisplay: `${dt} (${badgeSub})`
      };
    } catch (e) {
      return { dateStr: dt, fullDisplay: dt, isUrgent: false };
    }
  }, [stockDetail?.next_earnings_date, stockDetail?.metadata?.next_earnings_date, selectedStock?.next_earnings_date]);

  const instDetails = useMemo(() => {
    if (isEtf) return null;
    const s = stockDetail?.sponsorship_summary;
    const f = stockDetail?.fundamentals?.[0];
    const holdersCount = s?.holders_count ?? f?.inst_holders_count ?? selectedStock?.inst_holders_count;
    const qoqChange = s?.holders_qoq_change ?? f?.inst_holders_qoq_change ?? selectedStock?.inst_holders_qoq_change;
    const growthPct = s?.holders_growth_pct ?? (
      holdersCount && qoqChange !== null && qoqChange !== undefined && (holdersCount - qoqChange > 0)
        ? ((qoqChange * 100) / (holdersCount - qoqChange))
        : null
    );
    const streak = s?.sponsorship_streak ?? f?.sponsorship_streak ?? selectedStock?.sponsorship_streak ?? 0;
    const ownershipPct = s?.ownership_pct ?? f?.inst_ownership_pct;

    if (holdersCount === null || holdersCount === undefined) return null;
    return { holdersCount, qoqChange, growthPct, streak, ownershipPct };
  }, [stockDetail, selectedStock, isEtf]);

  // Positions summary (Unrealized P&L for Open, Realized P&L for Closed)
  const openSummary = useMemo(() => {
    let totalPnl = 0;
    let totalNotional = 0;
    openPositions.forEach((p) => {
      totalPnl += p.unrealized_pnl || 0;
      totalNotional += p.entry_notional || 0;
    });
    const pnlPct = totalNotional > 0 ? (totalPnl / totalNotional) * 100 : 0;
    return { count: openPositions.length, totalPnl, totalNotional, pnlPct };
  }, [openPositions]);

  const closedSummary = useMemo(() => {
    let totalPnl = 0;
    let totalNotional = 0;
    closedPositions.forEach((p) => {
      totalPnl += p.realized_pnl ?? p.pnl ?? 0;
      totalNotional += p.entry_notional || 0;
    });
    const pnlPct = totalNotional > 0 ? (totalPnl / totalNotional) * 100 : 0;
    return { count: closedPositions.length, totalPnl, totalNotional, pnlPct };
  }, [closedPositions]);

  const currentPositionsSummary = positionsStatus === 'OPEN' ? openSummary : closedSummary;

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      position: 'relative'
    }}>
      {/* Toast Notification */}
      {quickAddToast && (
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
          ✓ {quickAddToast}
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT CONTAINER: CHART & TELEMETRY (flex: 1)              */}
      {/* ======================================================== */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        position: 'relative'
      }}>
        {/* Main Chart Pane */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}>
          {activeGroupChart ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Group Chart Top Header Bar */}
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    {activeGroupChart.groupType === 'sectors' ? '🏛' : activeGroupChart.groupType === 'themes' ? '⚡' : '🏭'} {activeGroupChart.groupName}
                  </span>
                  {activeGroupChart.stageBadge && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: activeGroupChart.stageColor ? `${activeGroupChart.stageColor}25` : 'rgba(16,185,129,0.2)',
                      color: activeGroupChart.stageColor || '#10b981',
                      border: `1px solid ${activeGroupChart.stageColor || '#10b981'}44`
                    }}>
                      {activeGroupChart.stageBadge}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Stan Weinstein Stage Analysis ({activeGroupChart.groupType})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Prev / Next Group Nav Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '2px 4px', border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={handlePrevGroup}
                      title="Previous Group (Arrow Up)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 6px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      ▲ Prev
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '0 4px', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                      {currentGroupIndex >= 0 ? `${currentGroupIndex + 1} / ${filteredAndSortedGroups.length}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextGroup}
                      title="Next Group (Arrow Down)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 6px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      Next ▼
                    </button>
                  </div>

                  {selectedStock && (
                    <button
                      type="button"
                      onClick={() => setActiveGroupChart(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ← Back to {selectedStock.symbol} Chart
                    </button>
                  )}
                </div>
              </div>

              {/* Group Stage Chart Body */}
              <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px' }}>
                <GroupStageChart
                  groupType={activeGroupChart.groupType}
                  groupName={activeGroupChart.groupName}
                  onSelectStock={(sym) => {
                    selectStock({ symbol: sym });
                  }}
                  onDataLoaded={(data) => {
                    const summary = data?.stage_summary;
                    if (summary?.stage_badge) {
                      setActiveGroupChart((prev) => (prev ? {
                        ...prev,
                        stageBadge: summary.stage_badge,
                        stageColor: summary.stage_color || prev.stageColor
                      } : null));
                    }
                  }}
                  height={520}
                  isCompact={false}
                />
              </div>
            </div>
          ) : selectedStock ? (
            <>
              {/* Chart Top Header Bar (Matching Candidates Screen Telemetry) */}
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                background: 'var(--bg-secondary)',
                flexShrink: 0
              }}>
                {/* Row 1: Company Name, Sector & Industry/Group Pills (Clickable), Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StockBrandIcon symbol={selectedStock.symbol} size={22} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                        {cleanName || selectedStock.symbol}
                      </span>
                      {loadingPrices && (
                        <span className="spin-icon" style={{ fontSize: '13px', color: '#38bdf8' }} title="Loading latest candles...">
                          ⟳
                        </span>
                      )}
                    </div>

                    {sector && sector !== 'Sector' && (
                      <button
                        type="button"
                        onClick={() => handleOpenGroupChart('sectors', sector)}
                        title={`Click to view ${sector} Sector Stage Chart`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(168, 85, 247, 0.12)',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          color: '#c084fc',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.22)';
                          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
                        }}
                      >
                        🏛 {sector}
                      </button>
                    )}

                    {industry && industry !== 'Industry' && (
                      <button
                        type="button"
                        onClick={() => handleOpenGroupChart('industries', industry)}
                        title={`Click to view ${industry} Industry Stage Chart`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#38bdf8',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.22)';
                          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                        }}
                      >
                        🏭 {industry}
                      </button>
                    )}
                  </div>

                  {/* Top Right: Target Watchlist Action & Details Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Target Watchlist Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Target:</span>
                      <select
                        value={targetWatchlistId || ''}
                        onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                        title="Target Watchlist (for saving/adding stocks)"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: 'var(--border-radius-md)',
                          padding: '5px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {watchlists.map((w) => (
                          <option key={w.id} value={w.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                            ⭐️ {w.name} ({w.item_count || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const isCurrentSaved = selectedStock && targetWatchlistSymbols.has(selectedStock.symbol.toUpperCase());
                      return (
                        <button
                          type="button"
                          onClick={() => handleToggleWatchlist(selectedStock?.symbol)}
                          disabled={!selectedStock}
                          title={isCurrentSaved ? `Saved in "${targetWatchlist?.name || 'target watchlist'}" (Click to remove)` : `Save ${selectedStock?.symbol || 'stock'} to "${targetWatchlist?.name || 'target watchlist'}"`}
                          aria-label={isCurrentSaved ? 'Remove from watchlist' : 'Save to watchlist'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            padding: 0,
                            borderRadius: '5px',
                            boxSizing: 'border-box',
                            transition: 'all 0.15s ease',
                            background: isCurrentSaved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isCurrentSaved ? '#34d399' : 'var(--text-secondary)',
                            border: isCurrentSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)',
                            cursor: selectedStock ? 'pointer' : 'not-allowed',
                            flexShrink: 0
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

                    {/* Multi-Chart View (Daily + Monthly + Weekly) Toggle Icon Button */}
                    <button
                      type="button"
                      onClick={() => setShowMultiCharts((prev) => !prev)}
                      title={showMultiCharts ? 'Switch to Single Chart (Daily)' : 'Switch to 3-Charts Layout (Daily + Monthly + Weekly)'}
                      aria-label={showMultiCharts ? 'Switch to Single Chart' : 'Switch to 3-Charts Layout'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        borderRadius: '5px',
                        boxSizing: 'border-box',
                        background: showMultiCharts ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: showMultiCharts ? '1px solid #c084fc' : '1px solid var(--border-color)',
                        color: showMultiCharts ? '#c084fc' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="12" y1="12" x2="12" y2="21" />
                        {showMultiCharts && (
                          <>
                            <rect x="3" y="3" width="18" height="9" rx="1" fill="currentColor" opacity="0.35" />
                            <rect x="3" y="12" width="9" height="9" rx="1" fill="currentColor" opacity="0.45" />
                            <rect x="12" y="12" width="9" height="9" rx="1" fill="currentColor" opacity="0.45" />
                          </>
                        )}
                      </svg>
                    </button>

                    {/* Toggle Stock Details / Inspector Drawer Icon Button */}
                    <button
                      type="button"
                      onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                      title={isRightPanelCollapsed ? 'Show Stock Inspector & Deep Telemetry' : 'Collapse Stock Inspector'}
                      aria-label={isRightPanelCollapsed ? 'Show Stock Inspector' : 'Collapse Stock Inspector'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        borderRadius: '5px',
                        boxSizing: 'border-box',
                        background: !isRightPanelCollapsed ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: !isRightPanelCollapsed ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        color: !isRightPanelCollapsed ? '#38bdf8' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                        {!isRightPanelCollapsed && (
                          <rect x="15" y="3" width="6" height="18" rx="1" fill="currentColor" opacity="0.4" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Row 2: Badges Group Matching Candidates Screen (RS, Blue Dot, ADR%, TI65, Inst, Returns, Stage, Setups) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* RS Rank */}
                  {rsRank !== null && (
                    <span className="pill pill-success" style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      fontWeight: 800,
                      background: rsRank >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: rsRank >= 70 ? '#34d399' : 'var(--text-secondary)',
                      border: `1px solid ${rsRank >= 70 ? '#10b981' : 'var(--border-color)'}`
                    }}>
                      RS: {rsRank}
                    </span>
                  )}

                  {/* RS Blue Dot */}
                  {hasBlueDot && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.45)',
                      fontWeight: 700
                    }}>
                      🔵 RS Blue Dot
                    </span>
                  )}

                  {/* ADR% */}
                  {adrVal !== null && adrVal !== undefined ? (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: adrVal >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                      color: adrVal >= 5.0 ? '#f59e0b' : '#60a5fa',
                      border: `1px solid ${adrVal >= 5.0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                      fontWeight: 700
                    }}>
                      ADR%: {Number(adrVal).toFixed(2)}%
                    </span>
                  ) : null}

                  {/* TI65 (Trend Intensity) */}
                  {tiVal !== null && tiVal !== undefined && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: tiVal >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : tiVal < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                      color: tiVal >= 1.05 ? '#34d399' : tiVal < 0.95 ? '#f87171' : 'var(--text-secondary)',
                      border: `1px solid ${tiVal >= 1.05 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                      fontWeight: 600
                    }}>
                      TI65: {Number(tiVal).toFixed(2)}
                    </span>
                  )}

                  {/* Institutional Sponsorship */}
                  {instHolders !== null && instHolders !== undefined && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: instStreak >= 2 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                      color: instStreak >= 2 ? '#22c55e' : '#38bdf8',
                      border: `1px solid ${instStreak >= 2 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                      fontWeight: 700
                    }}>
                      🏛️ Inst: {instHolders.toLocaleString()}{instStreak >= 2 ? ` 🔥 +${instStreak}Q` : ''}
                    </span>
                  )}

                  {/* Returns: 1M, 3M, 6M */}
                  {ret1m !== null && ret1m !== undefined && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontWeight: 600
                    }}>
                      1M: {ret1m >= 0 ? '+' : ''}{Number(ret1m).toFixed(1)}%
                    </span>
                  )}

                  {ret3m !== null && ret3m !== undefined && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      fontWeight: 600
                    }}>
                      3M: {ret3m >= 0 ? '+' : ''}{Number(ret3m).toFixed(1)}%
                    </span>
                  )}

                  {ret6m !== null && ret6m !== undefined && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: 'rgba(236, 72, 153, 0.15)',
                      color: '#f472b6',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      fontWeight: 600
                    }}>
                      6M: {ret6m >= 0 ? '+' : ''}{Number(ret6m).toFixed(1)}%
                    </span>
                  )}

                  {/* Weinstein Stage badge */}
                  {stageBadge && (
                    <span style={{
                      fontSize: '10.5px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: stageColor ? `${stageColor}25` : 'rgba(16, 185, 129, 0.2)',
                      color: stageColor || '#10b981',
                      border: `1px solid ${stageColor || '#10b981'}55`,
                      fontWeight: 800
                    }}>
                      {stageBadge}
                    </span>
                  )}

                  {/* Active Setups */}
                  {activeSetups.map((s) => (
                    <span key={s} style={{
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      border: '1px solid rgba(56, 189, 248, 0.4)'
                    }}>
                      ⚡ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Candlestick Chart Area (Daily on top, Monthly on bottom-left, Weekly on bottom-right) */}
              <div style={{ flex: 1, minHeight: 0, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {stockPrices && stockPrices.length > 0 ? (
                  <>
                    {showMultiCharts ? (
                      <div
                        ref={multiChartsContainerRef}
                        style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}
                      >
                        {/* Top: Daily Chart */}
                        <div style={{
                          flex: `${multiChartTopPct} 1 0%`,
                          minHeight: '60px',
                          position: 'relative',
                          pointerEvents: isMultiChartResizing ? 'none' : 'auto'
                        }}>
                          <CandlestickChart
                            data={stockPrices}
                            symbol={displayedPricesSymbol || selectedStock.symbol}
                            timeframe="daily"
                            showVolumeProfile={true}
                            height="100%"
                          />
                        </div>

                        {/* Horizontal Splitter (Row-resize divider between Daily and Monthly/Weekly) */}
                        <div
                          onMouseDown={startMultiChartResizing}
                          onDoubleClick={() => setMultiChartTopPct(62)}
                          style={{
                            height: '6px',
                            cursor: 'row-resize',
                            background: isMultiChartResizing ? '#38bdf8' : 'var(--border-color)',
                            transition: 'background 0.15s ease',
                            position: 'relative',
                            flexShrink: 0,
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => { if (!isMultiChartResizing) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)'; }}
                          onMouseLeave={(e) => { if (!isMultiChartResizing) e.currentTarget.style.background = 'var(--border-color)'; }}
                          title="Drag to adjust height between Daily and Monthly/Weekly charts (Double-click to reset)"
                        >
                          <div style={{
                            width: '28px',
                            height: '2px',
                            borderRadius: '1px',
                            background: isMultiChartResizing ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
                          }} />
                        </div>

                        {/* Bottom Split: Monthly (Left) & Weekly (Right) */}
                        <div style={{
                          flex: `${100 - multiChartTopPct} 1 0%`,
                          minHeight: '60px',
                          display: 'flex',
                          flexDirection: 'row',
                          width: '100%',
                          pointerEvents: isMultiChartResizing ? 'none' : 'auto'
                        }}>
                          {/* Monthly Chart (Left Bottom) */}
                          <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', borderRight: '1px solid var(--border-color)' }}>
                            <CandlestickChart
                              data={stockPrices}
                              symbol={displayedPricesSymbol || selectedStock.symbol}
                              timeframe="monthly"
                              hideTools={true}
                              showVolumeProfile={false}
                              showYearlyThumbnail={false}
                              showRsLine={false}
                              showEarnings={false}
                              height="100%"
                            />
                          </div>

                          {/* Weekly Chart (Right Bottom) */}
                          <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
                            <CandlestickChart
                              data={stockPrices}
                              symbol={displayedPricesSymbol || selectedStock.symbol}
                              timeframe="weekly"
                              hideTools={true}
                              showVolumeProfile={false}
                              showYearlyThumbnail={false}
                              showRsLine={false}
                              height="100%"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <CandlestickChart
                        data={stockPrices}
                        symbol={displayedPricesSymbol || selectedStock.symbol}
                        height="100%"
                      />
                    )}

                    {/* Subtle floating badge when updating prices in background without unmounting */}
                    {loadingPrices && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        padding: '3px 10px',
                        borderRadius: '14px',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        zIndex: 20,
                        pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                      }}>
                        <span className="spin-icon">⟳</span>
                        <span>Updating {selectedStock.symbol}...</span>
                      </div>
                    )}
                  </>
                ) : loadingPrices ? (
                  <div style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    gap: '8px'
                  }}>
                    <span className="spin-icon">⟳</span>
                    <span>Loading chart candles for {selectedStock.symbol}...</span>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px'
                  }}>
                    No price data available for {selectedStock.symbol}.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '32px' }}>📊</span>
              <div>Select a stock or expand a sector/industry group on the right to view its candlestick chart.</div>
            </div>
          )}
        </div>

        {/* Collapsible Stock Detail / Inspector Sub-panel */}
        {!isRightPanelCollapsed && selectedStock && (
          <>
            {/* Resizable Divider between Chart and Stock Detail Sub-panel */}
            <div
              onMouseDown={startResizingDetail}
              style={{
                width: '6px',
                cursor: 'col-resize',
                background: isResizingDetail ? '#38bdf8' : 'var(--border-color)',
                transition: 'background 0.15s ease',
                position: 'relative',
                flexShrink: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { if (!isResizingDetail) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)'; }}
              onMouseLeave={(e) => { if (!isResizingDetail) e.currentTarget.style.background = 'var(--border-color)'; }}
              title="Drag to resize Stock Inspector panel"
            >
              <div style={{
                width: '2px',
                height: '24px',
                borderRadius: '1px',
                background: isResizingDetail ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
              }} />
            </div>

            <div
              className="custom-scrollbar"
              style={{
                width: `${stockDetailWidth}px`,
                minWidth: '320px',
                maxWidth: '650px',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-color)',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.3)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                  <StockBrandIcon symbol={selectedStock.symbol} size={18} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    {selectedStock.symbol}
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '4px',
                    padding: '1px 5px'
                  }}>
                    INSPECTOR
                  </span>
                </div>

                {/* In-Panel Quick Ticker Search */}
                <form
                  onSubmit={handleInspectTickerSubmit}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Type any ticker to inspect"
                >
                  <input
                    type="text"
                    placeholder="Ticker..."
                    value={inspectTickerInput}
                    onChange={(e) => setInspectTickerInput(e.target.value)}
                    style={{
                      width: '74px',
                      padding: '3px 6px',
                      fontSize: '11px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    title="Inspect ticker"
                  >
                    🔍
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsRightPanelCollapsed(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 4px'
                  }}
                  title="Collapse Inspector panel"
                >
                  ✕
                </button>
              </div>

              {/* Accordion 1: Company Profile */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('profile')}
                  style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>🏢 Company Profile</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{collapsedSections.profile ? '▼' : '▲'}</span>
                </div>
                {!collapsedSections.profile && (
                  <div style={{ padding: '0 12px 10px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <p style={{ margin: 0 }}>
                      {profileExpanded
                        ? (stockDetail?.metadata?.description || selectedStock.name)
                        : (stockDetail?.metadata?.description || selectedStock.name)?.slice(0, 160) + '...'}
                    </p>
                    <button
                      onClick={() => setProfileExpanded(!profileExpanded)}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', padding: '4px 0 0', cursor: 'pointer', fontSize: '10.5px', fontWeight: 600 }}
                    >
                      {profileExpanded ? 'Show less' : 'Read full description →'}
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 2: Quarterly Fundamental EPS History */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('fundamentals')}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      📊 Quarterly EPS Acceleration (CAN SLIM "C")
                    </span>
                    {stockDetail?.fundamentals?.length > 0 && (
                      <span style={{
                        fontSize: '9.5px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {stockDetail.fundamentals.length}Q
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {collapsedSections.fundamentals ? '▼' : '▲'}
                  </span>
                </div>
                {!collapsedSections.fundamentals && (
                  <div style={{ padding: '0 10px 10px' }}>
                    <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '4px 6px' }}>Quarter</th>
                            <th style={{ padding: '4px 6px' }}>Date</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>EPS</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>QoQ %</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stockDetail?.fundamentals || []).map((f, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700, padding: '4px 6px' }}>{f.fiscal_quarter}</td>
                              <td style={{ color: 'var(--text-secondary)', padding: '4px 6px' }}>{f.report_date || 'N/A'}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px' }}>
                                ${f.eps_diluted !== null && f.eps_diluted !== undefined ? f.eps_diluted.toFixed(2) : 'N/A'}
                              </td>
                              <td style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                textAlign: 'right',
                                padding: '4px 6px',
                                color: f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined
                                  ? (f.eps_qoq_growth >= 0 ? '#34d399' : '#f87171')
                                  : 'var(--text-secondary)'
                              }}>
                                {f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined
                                  ? `${f.eps_qoq_growth >= 0 ? '+' : ''}${f.eps_qoq_growth.toFixed(1)}%`
                                  : 'N/A'}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px', color: 'var(--text-secondary)' }}>
                                {f.total_revenue ? `$${(f.total_revenue / 1000000).toFixed(1)}M` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                          {(!stockDetail?.fundamentals || stockDetail.fundamentals.length === 0) && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px' }}>
                                No quarterly statements cached for this stock.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Institutional Sponsorship & Fund Growth */}
              {!isEtf && (
                <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div
                    onClick={() => toggleSection('sponsorship')}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        🏛️ Institutional Sponsorship (CAN SLIM "I")
                      </span>
                      {instDetails?.streak >= 2 ? (
                        <span style={{ fontSize: '9.5px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          🔥 +{instDetails.streak}Q
                        </span>
                      ) : instDetails?.streak === 1 ? (
                        <span style={{ fontSize: '9.5px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                          📈 +1Q
                        </span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {collapsedSections.sponsorship ? '▼' : '▲'}
                    </span>
                  </div>
                  {!collapsedSections.sponsorship && (
                    <div style={{ padding: '0 10px 10px' }}>
                      <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '4px 6px' }}>Quarter</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Funds</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>QoQ Change</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Growth %</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Float %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stockDetail?.sponsorship_history || []).map((s, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 700, padding: '4px 6px' }}>{s.fiscal_quarter}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right', padding: '4px 6px' }}>
                                  {s.holders_count ? s.holders_count.toLocaleString() : 'N/A'}
                                </td>
                                <td style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                  padding: '4px 6px',
                                  color: s.holders_qoq_change !== null && s.holders_qoq_change !== undefined
                                    ? (s.holders_qoq_change >= 0 ? '#34d399' : '#f87171')
                                    : 'var(--text-secondary)'
                                }}>
                                  {s.holders_qoq_change !== null && s.holders_qoq_change !== undefined
                                    ? `${s.holders_qoq_change >= 0 ? '+' : ''}${s.holders_qoq_change.toLocaleString()}`
                                    : '—'}
                                </td>
                                <td style={{
                                  fontFamily: 'var(--font-mono)',
                                  textAlign: 'right',
                                  padding: '4px 6px',
                                  color: s.holders_growth_pct !== null && s.holders_growth_pct !== undefined
                                    ? (s.holders_growth_pct >= 0 ? '#34d399' : '#f87171')
                                    : 'var(--text-secondary)'
                                }}>
                                  {s.holders_growth_pct !== null && s.holders_growth_pct !== undefined
                                    ? `${s.holders_growth_pct >= 0 ? '+' : ''}${s.holders_growth_pct.toFixed(1)}%`
                                    : '—'}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px', color: 'var(--text-secondary)' }}>
                                  {s.ownership_pct !== null && s.ownership_pct !== undefined ? `${s.ownership_pct.toFixed(1)}%` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                            {(!stockDetail?.sponsorship_history || stockDetail.sponsorship_history.length === 0) && (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '12px' }}>
                                  No institutional sponsorship records cached.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accordion 4: Key Technical Stats */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('stats')}
                  style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>⚡ Key Technical Stats</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{collapsedSections.stats ? '▼' : '▲'}</span>
                </div>
                {!collapsedSections.stats && (
                  <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10.5px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>52W Range</div>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {stats52w.low !== null && stats52w.low !== undefined && stats52w.high !== null && stats52w.high !== undefined
                            ? `$${stats52w.low.toFixed(1)} - $${stats52w.high.toFixed(1)}`
                            : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Dist from 52W High</div>
                        <div style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: (stats52w.distHigh !== null && stats52w.distHigh !== undefined && (stats52w.distHigh >= -10 || (stats52w.distHigh > 0 && stats52w.distHigh <= 10))) ? '#10b981' : 'var(--text-secondary)'
                        }}>
                          {formatDist52w(stats52w.distHigh)}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Market Cap</div>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {formatMarketCap(marketCap)}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Volume 50D MA</div>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {vol50dMa ? `${(vol50dMa / 1e6).toFixed(2)}M` : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>1M / 3M Returns</div>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {ret1m !== null ? `${ret1m >= 0 ? '+' : ''}${ret1m.toFixed(1)}%` : '—'} / {ret3m !== null ? `${ret3m >= 0 ? '+' : ''}${ret3m.toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>TI65 Trend Intensity</div>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: tiVal >= 1.05 ? '#34d399' : tiVal < 0.95 ? '#f87171' : '#ffffff' }}>
                          {tiVal !== null ? tiVal.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Active Setups */}
                    {selectedStock.setups && selectedStock.setups.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Setups</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {selectedStock.setups.map((s) => (
                            <span key={s} style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontWeight: 700
                            }}>
                              ⚡ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 5: Industry Peers */}
              {peersData?.peers && peersData.peers.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div
                    onClick={() => toggleSection('peers')}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        👥 Industry Peers (Ranked by RS)
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {peersData.peers.length}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {collapsedSections.peers ? '▼' : '▲'}
                    </span>
                  </div>
                  {!collapsedSections.peers && (
                    <div style={{ padding: '0 10px 10px' }}>
                      <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '4px 6px' }}>Peer</th>
                              <th style={{ padding: '4px 6px' }}>Company</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Price</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>RS</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Chg %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {peersData.peers.map((p) => {
                              const isCurrent = p.symbol?.toUpperCase() === selectedStock.symbol.toUpperCase();
                              return (
                                <tr
                                  key={p.symbol}
                                  onClick={() => selectStock({ symbol: p.symbol })}
                                  style={{
                                    cursor: 'pointer',
                                    background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                                    transition: 'background 0.15s ease'
                                  }}
                                  className="table-row-hover"
                                  title={`Click to inspect peer stock ${p.symbol}`}
                                >
                                  <td style={{ fontWeight: 800, color: isCurrent ? '#38bdf8' : '#34d399', padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>
                                    {p.symbol}
                                  </td>
                                  <td style={{
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'var(--text-secondary)',
                                    padding: '4px 6px'
                                  }}>
                                    {p.name}
                                  </td>
                                  <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px' }}>
                                    ${p.close?.toFixed(2) || '—'}
                                  </td>
                                  <td style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    padding: '4px 6px',
                                    color: (p.rs_rank ?? 0) >= 70 ? '#34d399' : 'var(--text-secondary)'
                                  }}>
                                    {p.rs_rank ?? '—'}
                                  </td>
                                  <td style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 600,
                                    textAlign: 'right',
                                    padding: '4px 6px',
                                    color: (p.chg_pct ?? 0) >= 0 ? '#34d399' : '#f87171'
                                  }}>
                                    {p.chg_pct !== undefined && p.chg_pct !== null ? `${p.chg_pct >= 0 ? '+' : ''}${p.chg_pct.toFixed(1)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* RESIZABLE SPLITTER (Col-resize divider)                  */}
      {/* ======================================================== */}
      <div
        onMouseDown={startResizing}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: isResizing ? '#38bdf8' : 'var(--border-color)',
          transition: 'background 0.15s ease',
          position: 'relative',
          flexShrink: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)'; }}
        onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'var(--border-color)'; }}
        title="Drag to resize chart / table panels"
      >
        <div style={{
          width: '2px',
          height: '24px',
          borderRadius: '1px',
          background: isResizing ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
        }} />
      </div>

      {/* ======================================================== */}
      {/* RIGHT CONTAINER: TABLE & WORKSPACE DOCK (~480px)         */}
      {/* ======================================================== */}
      <div style={{
        width: `${rightPanelWidth}px`,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        overflow: 'hidden'
      }}>
        {/* Primary Tab Bar: [ ★ Watchlists ] [ 🏛 Market Groups ] [ 💼 Positions ] */}
        <div style={{
          padding: '5px 8px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.25)'
        }}>
          <button
            type="button"
            onClick={() => setDockTab('watchlists')}
            style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: '5px',
              border: dockTab === 'watchlists' ? '1px solid #10b981' : '1px solid transparent',
              background: dockTab === 'watchlists' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: dockTab === 'watchlists' ? '#10b981' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <span>★</span>
            <span>Watchlists</span>
            <span style={{
              background: dockTab === 'watchlists' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '1px 5px',
              fontSize: '10px'
            }}>
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDockTab('groups')}
            style={{
              flex: 1.2,
              padding: '5px 8px',
              borderRadius: '5px',
              border: dockTab === 'groups' ? '1px solid #38bdf8' : '1px solid transparent',
              background: dockTab === 'groups' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: dockTab === 'groups' ? '#38bdf8' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <span>🏛</span>
            <span>Market</span>
          </button>

          <button
            type="button"
            onClick={() => setDockTab('positions')}
            style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: '5px',
              border: dockTab === 'positions' ? '1px solid #f59e0b' : '1px solid transparent',
              background: dockTab === 'positions' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: dockTab === 'positions' ? '#f59e0b' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <span>💼</span>
            <span>Positions</span>
            {openPositions.length > 0 && (
              <span style={{
                background: dockTab === 'positions' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '1px 5px',
                fontSize: '10px'
              }}>
                {openPositions.length}
              </span>
            )}
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 1: WATCHLISTS PANEL                                          */}
        {/* ----------------------------------------------------------------- */}
        {dockTab === 'watchlists' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Watchlist Dropdown & Options */}
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '12px' }}>📁</span>
                <select
                  value={selectedWatchlistId || ''}
                  onChange={(e) => setSelectedWatchlistId(Number(e.target.value))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '180px'
                  }}
                >
                  {watchlists.map((w) => (
                    <option key={w.id} value={w.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                      {w.name} ({w.item_count || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  title="New Watchlist"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}
                >
                  ➕
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenameInput(activeWatchlist?.name || '');
                    setShowRenameModal(true);
                  }}
                  title="Rename Watchlist"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                  title="Watchlist Options"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', padding: '2px 4px' }}
                >
                  ≡
                </button>
              </div>

              {/* Dropdown menu */}
              {showDropdownMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowDropdownMenu(false)} />
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    right: '12px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                    padding: '4px 0',
                    zIndex: 100,
                    minWidth: '180px'
                  }}>
                    <button
                      onClick={() => { setShowDropdownMenu(false); handleExportTradingView(); }}
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 12px', fontSize: '11.5px', color: '#ffffff', cursor: 'pointer' }}
                    >
                      ↗️ Export to TradingView (.txt)
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                    <button
                      onClick={() => { setShowDropdownMenu(false); handleClearWatchlist(); }}
                      disabled={items.length === 0}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        color: items.length === 0 ? 'var(--text-muted)' : '#fb7185',
                        cursor: items.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      🗑️ Remove All Stocks
                    </button>
                    <button
                      onClick={() => { setShowDropdownMenu(false); handleDeleteWatchlist(); }}
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 12px', fontSize: '11.5px', color: '#fb7185', cursor: 'pointer' }}
                    >
                      🗑️ Delete Watchlist
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Add Symbol Bar */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '6px' }}>
              <form onSubmit={handleAddSymbol} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                <input
                  type="text"
                  placeholder="+ Add symbol (e.g. PLTR)"
                  value={newSymbolInput}
                  onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={isAddingSymbol || !newSymbolInput.trim()}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedSymbols(new Set());
                }}
                style={{
                  background: isSelectMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelectMode ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  color: isSelectMode ? '#38bdf8' : 'var(--text-secondary)',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '10.5px',
                  cursor: 'pointer'
                }}
              >
                {isSelectMode ? 'Done' : 'Select'}
              </button>
            </div>

            {/* Industry/Group Filter Combobox */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)' }}>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  color: selectedIndustry !== 'ALL' ? '#38bdf8' : 'var(--text-primary)',
                  border: selectedIndustry !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: selectedIndustry !== 'ALL' ? '600' : '400',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Filter stocks by industry/group"
              >
                <option value="ALL">All Industry Groups ({items.length})</option>
                {industryCounts.map(({ industry, count }) => (
                  <option key={industry} value={industry}>
                    {industry} ({count})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Action Toolbar when isSelectMode is active */}
            {isSelectMode && (
              <div style={{
                padding: '6px 10px',
                background: 'rgba(56, 189, 248, 0.08)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={sortedItems.length > 0 && selectedSymbols.size === sortedItems.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedSymbols.size > 0 && selectedSymbols.size < sortedItems.length;
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSymbols(new Set(sortedItems.map((i) => i.symbol)));
                        } else {
                          setSelectedSymbols(new Set());
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>
                      {selectedSymbols.size === 0
                        ? `Select All (${sortedItems.length})`
                        : `${selectedSymbols.size} of ${sortedItems.length} selected`}
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Add Selected to Target Watchlist */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <select
                      value={targetWatchlistId || ''}
                      onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                      title="Choose Target Watchlist to add selected stocks into"
                      style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        maxWidth: '120px'
                      }}
                    >
                      {watchlists.map((w) => (
                        <option key={w.id} value={w.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                          → {w.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={selectedSymbols.size === 0 || isAddingBatchToTarget}
                      onClick={handleAddBatchToTarget}
                      title={`Add selected ${selectedSymbols.size} stocks into "${targetWatchlist?.name || 'target watchlist'}"`}
                      style={{
                        background: selectedSymbols.size > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                        border: selectedSymbols.size > 0 ? '1px solid #059669' : '1px solid var(--border-color)',
                        color: selectedSymbols.size > 0 ? '#ffffff' : 'var(--text-muted)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: selectedSymbols.size > 0 && !isAddingBatchToTarget ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>➕</span>
                      <span>Add Selected {selectedSymbols.size > 0 ? `(${selectedSymbols.size})` : ''}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={selectedSymbols.size === 0 || isDeletingItems}
                    onClick={handleRemoveBatch}
                    title="Remove selected stocks from watchlist"
                    style={{
                      background: selectedSymbols.size > 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
                      border: selectedSymbols.size > 0 ? '1px solid #dc2626' : '1px solid var(--border-color)',
                      color: selectedSymbols.size > 0 ? '#ffffff' : 'var(--text-muted)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: selectedSymbols.size > 0 && !isDeletingItems ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🗑️</span>
                    <span>Remove Selected</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearWatchlist}
                    disabled={items.length === 0 || isDeletingItems}
                    title="Remove all stocks from this watchlist"
                    style={{
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#fb7185',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: items.length > 0 && !isDeletingItems ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Remove All
                  </button>
                </div>
              </div>
            )}

            {/* Watchlist Stock Table */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
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
                    {isSelectMode && (
                      <th style={{ width: '28px', padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={sortedItems.length > 0 && selectedSymbols.size === sortedItems.length}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedSymbols.size > 0 && selectedSymbols.size < sortedItems.length;
                          }}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSymbols(new Set(sortedItems.map((i) => i.symbol)));
                            } else {
                              setSelectedSymbols(new Set());
                            }
                          }}
                          title={selectedSymbols.size === sortedItems.length ? 'Deselect All' : 'Select All'}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                    )}
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
                    >
                      RS {sortBy === 'rs_rank' ? '↓' : sortBy === 'rs_rank_asc' ? '↑' : ''}
                    </th>
                    <th style={{ width: '22px', padding: '6px 4px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems ? (
                    <tr>
                      <td colSpan={isSelectMode ? 5 : 4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Loading watchlist stocks...
                      </td>
                    </tr>
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={isSelectMode ? 5 : 4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No stocks found in this watchlist.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => {
                      const isSelected = selectedStock?.symbol === item.symbol;
                      const chg = item.today_pct !== undefined ? item.today_pct : item.chg_pct;
                      const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;
                      const rsVal = item.rs_rank;

                      return (
                        <tr
                          key={item.symbol}
                          onClick={() => selectStock(item)}
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
                          {isSelectMode && (
                            <td style={{ textAlign: 'center', padding: '6px 4px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedSymbols.has(item.symbol)}
                                onChange={(e) => toggleSelectSymbol(item.symbol, e)}
                              />
                            </td>
                          )}

                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <StockBrandIcon symbol={item.symbol} size={18} />
                              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>{item.symbol}</span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 700, color: chg === null || chg === undefined ? 'var(--text-muted)' : isPositive ? '#34d399' : '#fb7185' }}>
                            {chg !== null && chg !== undefined ? `${isPositive ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                          </td>

                          <td style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 800, color: rsVal >= 70 ? '#34d399' : rsVal <= 30 ? '#fb7185' : 'var(--text-secondary)' }}>
                            {rsVal !== null && rsVal !== undefined ? rsVal : '—'}
                          </td>

                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveSymbol(item.symbol, e)}
                              title={`Remove ${item.symbol}`}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                            >
                              ✕
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
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 2: MARKET GROUPS (SECTORS / INDUSTRY GROUPS / THEMES)        */}
        {/* ----------------------------------------------------------------- */}
        {dockTab === 'groups' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Secondary Segment Switcher: [ Sectors ] [ Industry Groups ] [ Themes ] */}
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              gap: '4px',
              background: 'rgba(0,0,0,0.2)'
            }}>
              {[
                { id: 'sectors', label: 'Sectors (30)' },
                { id: 'industries', label: 'Industries (175)' },
                { id: 'themes', label: 'Themes (24)' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setGroupType(sub.id)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: groupType === sub.id ? '1px solid #38bdf8' : '1px solid transparent',
                    background: groupType === sub.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: groupType === sub.id ? '#38bdf8' : 'var(--text-muted)',
                    fontSize: '10.5px',
                    fontWeight: groupType === sub.id ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Filter and Sort Toolbar (Single Line) */}
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0,0,0,0.1)'
            }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder={`🔍 Filter ${groupType}...`}
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '4px 20px 4px 6px',
                    fontSize: '10.5px',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                {groupSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGroupSearchQuery('')}
                    style={{ position: 'absolute', right: '5px', top: '4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Sort:</span>
                <select
                  value={groupSortBy}
                  onChange={(e) => setGroupSortBy(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '3px',
                    padding: '3px 4px',
                    fontSize: '10px',
                    outline: 'none'
                  }}
                >
                  <option value="today_pct">Today %</option>
                  <option value="ret_1w_pct">1-Week %</option>
                  <option value="ret_1m_pct">1-Month %</option>
                  <option value="ret_3m_pct">3-Month %</option>
                  <option value="ret_ytd_pct">YTD %</option>
                  <option value="rs_rank">RS Score</option>
                  <option value="dist_52wh_pct">Dist 52WH</option>
                  <option value="rvol_pct">RVOL %</option>
                  <option value="stage_num">Weinstein Stage</option>
                </select>

                <button
                  type="button"
                  onClick={() => setGroupSortOrder(groupSortOrder === 'desc' ? 'asc' : 'desc')}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '3px',
                    color: 'var(--text-secondary)',
                    padding: '3px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {groupSortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                </button>
              </div>
            </div>

            {/* Column Header Row for Market Groups */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.35)',
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              position: 'sticky',
              top: 0,
              zIndex: 2
            }}>
              <span>Group</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ width: '58px', textAlign: 'right' }}>Stage</span>
                <span style={{ width: '45px', textAlign: 'right' }}>Today</span>
                <span style={{ width: '42px', textAlign: 'right' }}>1W</span>
                <span style={{ width: '24px', textAlign: 'center' }}>RS</span>
              </div>
            </div>

            {/* Accordion Groups List */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Loading {groupType}...
                </div>
              ) : filteredAndSortedGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  No groups match query.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredAndSortedGroups.map((grp) => {
                    const isExpanded = expandedMarketGroups.has(grp.name);
                    const isChartActive = activeGroupChart?.groupName === grp.name;
                    const cacheKey = `${groupType}:${grp.name}`;
                    const constituents = groupConstituents[cacheKey] || [];
                    const isLoadingConsts = loadingConstituents[cacheKey];

                    return (
                      <div key={grp.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {/* Group Header Row */}
                        <div
                          onClick={() => toggleMarketGroup(grp.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            background: isChartActive
                              ? 'rgba(56, 189, 248, 0.16)'
                              : isExpanded
                              ? 'rgba(56, 189, 248, 0.08)'
                              : 'transparent',
                            borderLeft: isChartActive ? '3px solid #38bdf8' : '3px solid transparent',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background 0.1s ease'
                          }}
                          onMouseEnter={(e) => { if (!isChartActive && !isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { if (!isChartActive && !isExpanded) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* Left: Chevron, Group Title, Stock Count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, paddingRight: '8px' }}>
                            <span style={{ fontSize: '10px', color: isChartActive || isExpanded ? '#38bdf8' : 'var(--text-muted)', transition: 'transform 0.15s ease', flexShrink: 0 }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '11.5px', color: isChartActive || isExpanded ? '#38bdf8' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {grp.name}
                            </span>
                            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1px 5px', flexShrink: 0 }}>
                              {grp.stock_count || 0}
                            </span>
                          </div>

                          {/* Right: Stage, Today%, 1W%, RS */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontSize: '11px' }}>
                            {/* Dedicated Stage column - aligned on right, loads in Main Panel */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (grp.stage_badge) {
                                  setActiveGroupChart({
                                    groupType,
                                    groupName: grp.name,
                                    stageBadge: grp.stage_badge,
                                    stageColor: grp.stage_color
                                  });
                                }
                              }}
                              style={{
                                width: '58px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                flexShrink: 0,
                                cursor: grp.stage_badge ? 'pointer' : 'default'
                              }}
                              title={grp.stage_badge ? (isChartActive ? 'Active in Main Chart' : `Click to view ${grp.name} Stage Chart in main panel`) : ''}
                            >
                              {grp.stage_badge ? (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isChartActive
                                      ? (grp.stage_color || '#10b981')
                                      : grp.stage_color ? `${grp.stage_color}25` : 'rgba(16,185,129,0.2)',
                                    color: isChartActive ? '#ffffff' : (grp.stage_color || '#10b981'),
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.2,
                                    border: isChartActive
                                      ? '1px solid #ffffff'
                                      : `1px solid ${grp.stage_color ? grp.stage_color + '44' : 'rgba(16,185,129,0.3)'}`,
                                    boxShadow: isChartActive ? '0 0 8px rgba(56, 189, 248, 0.6)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.08)';
                                    e.currentTarget.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.5)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = isChartActive ? '0 0 8px rgba(56, 189, 248, 0.6)' : 'none';
                                  }}
                                >
                                  {grp.stage_badge}
                                </span>
                              ) : null}
                            </div>

                            <span style={{
                              fontWeight: 800,
                              color: grp.today_pct >= 0 ? '#34d399' : '#fb7185',
                              width: '45px',
                              textAlign: 'right'
                            }}>
                              {grp.today_pct !== undefined && grp.today_pct !== null ? `${grp.today_pct >= 0 ? '+' : ''}${grp.today_pct.toFixed(1)}%` : '—'}
                            </span>
                            <span style={{
                              color: grp.ret_1w_pct >= 0 ? '#34d399' : '#fb7185',
                              width: '42px',
                              textAlign: 'right',
                              fontSize: '10px'
                            }}>
                              {grp.ret_1w_pct !== undefined && grp.ret_1w_pct !== null ? `${grp.ret_1w_pct >= 0 ? '+' : ''}${grp.ret_1w_pct.toFixed(1)}%` : '—'}
                            </span>
                            <span style={{
                              fontWeight: 800,
                              color: grp.rs_rank >= 70 ? '#34d399' : grp.rs_rank <= 30 ? '#fb7185' : 'var(--text-secondary)',
                              width: '24px',
                              textAlign: 'center',
                              fontSize: '10.5px'
                            }}>
                              {grp.rs_rank ?? '—'}
                            </span>
                          </div>
                        </div>

                        {/* Inline Accordion Constituents Table */}
                        {isExpanded && (
                          <div style={{ background: 'rgba(0, 0, 0, 0.35)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '2px 0 6px 12px' }}>
                            {isLoadingConsts ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10.5px' }}>
                                Loading {grp.name} constituents...
                              </div>
                            ) : constituents.length === 0 ? (
                              <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '10.5px' }}>
                                No constituent stocks found.
                              </div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                                <tbody>
                                  {constituents.map((stock) => {
                                    const isSelected = selectedStock?.symbol === stock.symbol;
                                    const chg = stock.today_pct;
                                    const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;

                                    return (
                                      <tr
                                        key={stock.symbol}
                                        onClick={() => selectStock(stock)}
                                        style={{
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                          background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                                          borderLeft: isSelected ? '3px solid #38bdf8' : '3px solid transparent',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                      >
                                        <td style={{ padding: '4px 6px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <StockBrandIcon symbol={stock.symbol} size={16} />
                                            <div style={{ minWidth: 0 }}>
                                              <span style={{ fontWeight: 800, color: '#ffffff' }}>{stock.symbol}</span>
                                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {stock.name}
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 700, color: chg === null || chg === undefined ? 'var(--text-muted)' : isPositive ? '#34d399' : '#fb7185' }}>
                                          {chg !== null && chg !== undefined ? `${isPositive ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                                        </td>

                                        <td style={{ textAlign: 'right', padding: '4px 6px', color: '#ffffff', fontWeight: 600 }}>
                                          ${stock.close?.toFixed(2) || '—'}
                                        </td>

                                        <td style={{ textAlign: 'center', padding: '4px 4px', fontWeight: 800, color: stock.rs_rank >= 70 ? '#34d399' : stock.rs_rank <= 30 ? '#fb7185' : 'var(--text-muted)' }}>
                                          {stock.rs_rank ?? '—'}
                                        </td>

                                        {/* Setups tag badges */}
                                        <td style={{ padding: '4px 4px' }}>
                                          {stock.setups && stock.setups.length > 0 && (
                                            <span style={{
                                              fontSize: '8.5px',
                                              padding: '1px 4px',
                                              borderRadius: '3px',
                                              background: 'rgba(56, 189, 248, 0.2)',
                                              color: '#38bdf8',
                                              fontWeight: 700
                                            }}>
                                              {stock.setups[0]}
                                            </span>
                                          )}
                                        </td>

                                        {/* Quick Add / Remove Watchlist Action */}
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                          {(() => {
                                            const isStockSaved = targetWatchlistSymbols.has(stock.symbol.toUpperCase());
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleToggleWatchlist(stock.symbol)}
                                                title={isStockSaved ? `Saved in "${targetWatchlist?.name || 'target watchlist'}" (Click to remove)` : `Add ${stock.symbol} to "${targetWatchlist?.name || 'target watchlist'}"`}
                                                style={{
                                                  background: isStockSaved ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                                                  border: isStockSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(16, 185, 129, 0.4)',
                                                  color: isStockSaved ? '#34d399' : '#10b981',
                                                  borderRadius: '3px',
                                                  padding: '1px 4px',
                                                  fontSize: '10px',
                                                  cursor: 'pointer',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  minWidth: '20px',
                                                  height: '18px',
                                                  transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!isStockSaved) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!isStockSaved) e.currentTarget.style.background = 'transparent';
                                                }}
                                              >
                                                {isStockSaved ? (
                                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                  </svg>
                                                ) : (
                                                  '＋'
                                                )}
                                              </button>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 3: POSITIONS (OPEN TRADES FROM IBKR JOURNAL)                 */}
        {/* ----------------------------------------------------------------- */}
        {dockTab === 'positions' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Open / Closed Positions Toggle Sub-Bar */}
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button
                type="button"
                onClick={() => setPositionsStatus('OPEN')}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: positionsStatus === 'OPEN' ? '1px solid #10b981' : '1px solid transparent',
                  background: positionsStatus === 'OPEN' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: positionsStatus === 'OPEN' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Open Trades</span>
                <span style={{
                  fontSize: '9.5px',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: positionsStatus === 'OPEN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  color: positionsStatus === 'OPEN' ? '#ffffff' : 'var(--text-muted)'
                }}>
                  {openPositions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPositionsStatus('CLOSED')}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: positionsStatus === 'CLOSED' ? '1px solid #38bdf8' : '1px solid transparent',
                  background: positionsStatus === 'CLOSED' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: positionsStatus === 'CLOSED' ? '#38bdf8' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Closed Trades</span>
                <span style={{
                  fontSize: '9.5px',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: positionsStatus === 'CLOSED' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  color: positionsStatus === 'CLOSED' ? '#ffffff' : 'var(--text-muted)'
                }}>
                  {closedPositions.length}
                </span>
              </button>
            </div>

            {/* Positions Summary Card */}
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {positionsStatus === 'OPEN' ? 'OPEN POSITIONS' : 'CLOSED POSITIONS'}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>
                  {currentPositionsSummary.count} {positionsStatus === 'OPEN' ? 'Active Trades' : 'Closed Trades'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {positionsStatus === 'OPEN' ? 'UNREALIZED P&L' : 'REALIZED P&L'}
                </div>
                <div style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: currentPositionsSummary.totalPnl >= 0 ? '#34d399' : '#fb7185'
                }}>
                  {currentPositionsSummary.totalPnl >= 0 ? '+' : ''}${currentPositionsSummary.totalPnl.toFixed(2)} ({currentPositionsSummary.pnlPct >= 0 ? '+' : ''}{currentPositionsSummary.pnlPct.toFixed(1)}%)
                </div>
              </div>

              <button
                type="button"
                onClick={fetchPositions}
                title={`Refresh ${positionsStatus === 'OPEN' ? 'Open' : 'Closed'} Positions`}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  padding: '3px 6px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                🔄
              </button>
            </div>

            {/* Positions Table */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              {loadingPositions ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Loading {positionsStatus.toLowerCase()} positions...
                </div>
              ) : displayedPositions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  No {positionsStatus.toLowerCase()} trades found in journal.
                </div>
              ) : (
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
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Position</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>P&L %</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>P&L $</th>
                      <th style={{ width: '22px', padding: '6px 4px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPositions.map((pos) => {
                      const isSelected = selectedStock?.symbol === pos.symbol;
                      const pnlPct = pos.status === 'OPEN'
                        ? (pos.unrealized_pnl_pct ?? pos.pnl_pct)
                        : (pos.pnl_pct);
                      const pnlDollar = pos.status === 'OPEN'
                        ? (pos.unrealized_pnl ?? pos.pnl)
                        : (pos.realized_pnl ?? pos.pnl);
                      const isPositive = pnlDollar !== null && pnlDollar !== undefined
                        ? pnlDollar >= 0
                        : (pnlPct !== null && pnlPct !== undefined ? pnlPct >= 0 : false);

                      return (
                        <tr
                          key={pos.id || `${pos.symbol}-${pos.status}-${pos.close_date || ''}`}
                          onClick={() => selectStock(pos)}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                            borderLeft: isSelected ? '3px solid #f59e0b' : '3px solid transparent',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <StockBrandIcon symbol={pos.symbol} size={18} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontWeight: 800, color: '#ffffff' }}>{pos.symbol}</span>
                                  <span style={{
                                    fontSize: '8.5px',
                                    fontWeight: 800,
                                    borderRadius: '3px',
                                    padding: '1px 3px',
                                    background: pos.direction === 'SHORT' ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)',
                                    color: pos.direction === 'SHORT' ? '#f43f5e' : '#10b981'
                                  }}>
                                    {pos.direction || 'LONG'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                  {pos.status === 'CLOSED'
                                    ? (pos.close_date ? `${pos.close_date} (${pos.holding_days ?? 0}d)` : 'Closed')
                                    : (pos.holding_days ? `${pos.holding_days}d held` : 'Open')}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 800, color: isPositive ? '#34d399' : '#fb7185' }}>
                            {pnlPct !== null && pnlPct !== undefined ? `${isPositive ? '+' : ''}${pnlPct.toFixed(1)}%` : '—'}
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 700, color: isPositive ? '#34d399' : '#fb7185' }}>
                            {pnlDollar !== null && pnlDollar !== undefined ? `${pnlDollar >= 0 ? '+' : ''}$${Math.round(pnlDollar).toLocaleString()}` : '—'}
                          </td>

                          <td style={{ padding: '6px 4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const isPosSaved = targetWatchlistSymbols.has(pos.symbol.toUpperCase());
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleToggleWatchlist(pos.symbol)}
                                  title={isPosSaved ? `Saved in "${targetWatchlist?.name || 'target watchlist'}" (Click to remove)` : `Add ${pos.symbol} to "${targetWatchlist?.name || 'target watchlist'}"`}
                                  style={{
                                    background: isPosSaved ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                                    border: isPosSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(16, 185, 129, 0.4)',
                                    color: isPosSaved ? '#34d399' : '#10b981',
                                    borderRadius: '3px',
                                    padding: '1px 4px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '20px',
                                    height: '18px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isPosSaved) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isPosSaved) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  {isPosSaved ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  ) : (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}
      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '400px',
              margin: 'auto',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              padding: '20px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
              Create New Watchlist
            </h3>
            <form onSubmit={handleCreateWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Watchlist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Breakout Radar, High Tight Flag"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  autoFocus
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newWatchlistName.trim()}
                  style={{ fontSize: '12px', fontWeight: 700 }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Watchlist Modal */}
      {showRenameModal && (
        <div className="drawer-backdrop" onClick={() => setShowRenameModal(false)}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '400px',
              margin: 'auto',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              padding: '20px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
              Rename Watchlist
            </h3>
            <form onSubmit={handleRenameWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Watchlist Name</label>
                <input
                  type="text"
                  placeholder="Enter new name"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  autoFocus
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowRenameModal(false)}
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!renameInput.trim() || isRenaming}
                  style={{ fontSize: '12px', fontWeight: 700 }}
                >
                  {isRenaming ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stan Weinstein Group Stage Chart Reference */}
      {previewGroupChart && (
        <div
          className="full-page-modal-backdrop"
          onClick={() => setPreviewGroupChart(null)}
          style={{
            position: 'fixed',
            inset: 0,
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
            className="glass-card custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '960px',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STAN WEINSTEIN STAGE ANALYSIS · {previewGroupChart.groupType?.toUpperCase() || 'MARKET'}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: previewGroupChart.stageColor ? `${previewGroupChart.stageColor}25` : 'rgba(16,185,129,0.2)',
                    color: previewGroupChart.stageColor || '#10b981',
                    fontWeight: 800,
                    border: `1px solid ${previewGroupChart.stageColor || '#10b981'}44`
                  }}>
                    {previewGroupChart.stageBadge || 'Stage Analysis'}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {previewGroupChart.groupType === 'sectors' ? '🏛' : previewGroupChart.groupType === 'themes' ? '⚡' : '🏭'} {previewGroupChart.groupName}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {sector && (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupChart((prev) => ({ ...(prev || {}), groupType: 'sectors', groupName: sector }))}
                    style={{
                      background: previewGroupChart.groupType === 'sectors' && previewGroupChart.groupName === sector ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupChart.groupType === 'sectors' && previewGroupChart.groupName === sector ? '#c084fc' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupChart.groupType === 'sectors' && previewGroupChart.groupName === sector ? '#ffffff' : '#c084fc',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🏛️ Sector: {sector}
                  </button>
                )}
                {industry && (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupChart((prev) => ({ ...(prev || {}), groupType: 'industries', groupName: industry }))}
                    style={{
                      background: previewGroupChart.groupType === 'industries' && previewGroupChart.groupName === industry ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupChart.groupType === 'industries' && previewGroupChart.groupName === industry ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupChart.groupType === 'industries' && previewGroupChart.groupName === industry ? '#ffffff' : '#38bdf8',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🏭 Industry: {industry}
                  </button>
                )}
                {themes && themes.map((thm) => (
                  <button
                    key={thm}
                    type="button"
                    onClick={() => setPreviewGroupChart((prev) => ({ ...(prev || {}), groupType: 'themes', groupName: thm }))}
                    style={{
                      background: previewGroupChart.groupType === 'themes' && previewGroupChart.groupName === thm ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupChart.groupType === 'themes' && previewGroupChart.groupName === thm ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupChart.groupType === 'themes' && previewGroupChart.groupName === thm ? '#ffffff' : '#34d399',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ {thm}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupChart(previewGroupChart);
                    setPreviewGroupChart(null);
                  }}
                  title="Dock this group chart in the main left panel"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '5px',
                    color: '#38bdf8',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ↗ View in Main Panel
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewGroupChart(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    color: 'var(--text-secondary)',
                    padding: '5px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <GroupStageChart
              groupType={previewGroupChart.groupType}
              groupName={previewGroupChart.groupName}
              onSelectStock={(sym) => {
                setPreviewGroupChart(null);
                selectStock({ symbol: sym });
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
