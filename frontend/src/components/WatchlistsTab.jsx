import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CandlestickChart from './CandlestickChart';
import GroupStageChart from './GroupStageChart';
import { getLocalDateStr } from '../utils/dateUtils';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

// Sleek Brand Logo Icon Component
export function StockBrandIcon({ symbol }) {
  const sym = (symbol || '').toUpperCase();

  if (sym === 'AAPL') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '4px',
        background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#000000', fontSize: '13px', fontWeight: 900, flexShrink: 0
      }}>
        
      </div>
    );
  }
  if (sym === 'MSFT') {
    return (
      <div style={{
        width: '18px', height: '18px', display: 'grid',
        gridTemplateColumns: '1fr 1fr', gap: '1.5px', flexShrink: 0
      }}>
        <div style={{ background: '#f25022', borderRadius: '1px' }} />
        <div style={{ background: '#7fba00', borderRadius: '1px' }} />
        <div style={{ background: '#00a4ef', borderRadius: '1px' }} />
        <div style={{ background: '#ffb900', borderRadius: '1px' }} />
      </div>
    );
  }
  if (sym === 'GOOG' || sym === 'GOOGL') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ea4335', fontSize: '12px', fontWeight: 900, fontFamily: 'sans-serif', flexShrink: 0
      }}>
        G
      </div>
    );
  }
  if (sym === 'AMZN') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#ff9900', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#000000', fontSize: '11px', fontWeight: 900, flexShrink: 0
      }}>
        a
      </div>
    );
  }
  if (sym === 'NVDA') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '4px',
        background: '#76b900', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ffffff', fontSize: '10px', fontWeight: 900, flexShrink: 0
      }}>
        N
      </div>
    );
  }
  if (sym === 'META') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#0668e1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ffffff', fontSize: '11px', fontWeight: 800, flexShrink: 0
      }}>
        ∞
      </div>
    );
  }
  if (sym === 'TSLA') {
    return (
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#e82127', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ffffff', fontSize: '11px', fontWeight: 900, flexShrink: 0
      }}>
        T
      </div>
    );
  }

  // Generic fallback avatar with subtle deterministic color
  const colors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
  const charCode = sym.charCodeAt(0) || 0;
  const bg = colors[charCode % colors.length];

  return (
    <div style={{
      width: '20px', height: '20px', borderRadius: '4px',
      background: `rgba(${parseInt(bg.slice(1,3),16)}, ${parseInt(bg.slice(3,5),16)}, ${parseInt(bg.slice(5,7),16)}, 0.25)`,
      border: `1px solid ${bg}`,
      color: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '10px', fontWeight: 800, flexShrink: 0
    }}>
      {sym.slice(0, 2)}
    </div>
  );
}

export const QUADRANT_COLORS = {
  Leading: { accent: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', title: 'Leading' },
  Improving: { accent: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)', title: 'Improving' },
  Weakening: { accent: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', title: 'Weakening' },
  Lagging: { accent: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)', title: 'Lagging' },
};

export default function WatchlistsTab({ handleSelectStock, watchlists = [], fetchWatchlists }) {
  // Main Navigation Mode for Right Dock: 'watchlists' | 'groups' | 'positions'
  const [dockTab, setDockTab] = useState('watchlists');

  // Active Stock & Chart Data
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Stock Details / Telemetry
  const [stockDetail, setStockDetail] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [peersData, setPeersData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const watchlistDataCacheRef = useRef(new Map()); // symbol -> { prices, detail, financials, peersData }
  const [fundTab, setFundTab] = useState('institutions');
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Accordion Collapse States for Stock Detail Panel
  const [collapsedSections, setCollapsedSections] = useState({
    profile: false,
    stats: false,
    peers: false,
    funds: false,
    setups: false,
  });

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Stock Details Sub-pane visibility (collapsed by default to give maximum room to chart)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('pivot_watchlist_right_panel_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true; // default collapsed for maximized chart space
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pivot_watchlist_right_panel_collapsed', isRightPanelCollapsed);
    } catch (_) {}
  }, [isRightPanelCollapsed]);

  // -------------------------------------------------------------
  // TAB 1: WATCHLIST STATE
  // -------------------------------------------------------------
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState('ALL');
  const [filterIndustry, setFilterIndustry] = useState('ALL');
  const [sortBy, setSortBy] = useState('group_rs');
  const [groupMode, setGroupMode] = useState('none');
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState(new Set());
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
  const [quickAddMenuSym, setQuickAddMenuSym] = useState(null); // ticker to add to a chosen watchlist
  const [quickAddToast, setQuickAddToast] = useState(null); // notification toast

  const toggleGroupCollapse = (key) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
  // TAB 3: POSITIONS (OPEN TRADES) STATE
  // -------------------------------------------------------------
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // -------------------------------------------------------------
  // RESIZABLE SPLITTER DIVIDER (Between Chart and Right Table Dock)
  // -------------------------------------------------------------
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_markets_table_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 340 && val <= 850) return val;
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
      const newWidth = Math.min(Math.max(resizeStartWidthRef.current + delta, 340), Math.min(window.innerWidth * 0.65, 850));
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

  // Show temporary toast
  const triggerToast = (msg) => {
    setQuickAddToast(msg);
    setTimeout(() => setQuickAddToast(null), 2500);
  };

  // Initialize selected watchlist (prefer 'Mag 7' if present, otherwise first available)
  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      const mag7 = watchlists.find((w) => w.name.toLowerCase() === 'mag 7');
      setSelectedWatchlistId(mag7 ? mag7.id : watchlists[0].id);
    }
  }, [watchlists, selectedWatchlistId]);

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
            if (current && data.some((d) => d.symbol === current.symbol)) {
              return current;
            }
            return data[0];
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
    if (!stockList || stockList.length <= 1) return;
    const idx = stockList.findIndex((s) => (s.symbol || '').toUpperCase() === currentSym);
    if (idx === -1) return;
    const adjacent = [];
    if (idx + 1 < stockList.length) adjacent.push((stockList[idx + 1].symbol || '').toUpperCase());
    if (idx - 1 >= 0) adjacent.push((stockList[idx - 1].symbol || '').toUpperCase());

    adjacent.forEach(async (targetSym) => {
      if (targetSym && !watchlistDataCacheRef.current.has(targetSym)) {
        try {
          const [pRes, dRes, fRes, peRes] = await Promise.all([
            fetch(`${API_BASE}/api/stocks/${targetSym}/prices?limit=750`),
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
      }
    });
  }, []);

  // Fetch stock chart prices and telemetry when selected stock changes
  useEffect(() => {
    if (!selectedStock?.symbol) {
      setStockPrices([]);
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
      setStockDetail(cached.detail);
      setFinancials(cached.financials);
      setPeersData(cached.peersData);
      setLoadingPrices(false);
      setLoadingDetail(false);
      prefetchAdjacentWatchlistStocks(sym, items);
      return;
    }

    setLoadingPrices(true);
    setLoadingDetail(true);

    let pricesData = null;
    let detailData = null;
    let financialsData = null;
    let peersDataRes = null;

    const pPrices = fetch(`${API_BASE}/api/stocks/${sym}/prices?limit=750`)
      .then((res) => (res.ok ? res.json() : []))
      .then((prices) => {
        pricesData = prices;
        setStockPrices(prices);
        setLoadingPrices(false);
        return prices;
      })
      .catch(() => {
        setLoadingPrices(false);
        return [];
      });

    const pDetail = fetch(`${API_BASE}/api/stocks/${sym}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((detail) => {
        detailData = detail;
        setStockDetail(detail);
        setLoadingDetail(false);
        return detail;
      })
      .catch(() => {
        setLoadingDetail(false);
        return null;
      });

    const pFin = fetch(`${API_BASE}/api/stocks/${sym}/financials`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fin) => {
        financialsData = fin;
        setFinancials(fin);
        return fin;
      })
      .catch(() => null);

    const pPeers = fetch(`${API_BASE}/api/stocks/${sym}/peers?limit=6`)
      .then((res) => (res.ok ? res.json() : null))
      .then((peers) => {
        peersDataRes = peers;
        setPeersData(peers);
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
      prefetchAdjacentWatchlistStocks(sym, items);
    });
  }, [selectedStock?.symbol, items, prefetchAdjacentWatchlistStocks]);

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
          if (selectedStock?.symbol === sym) {
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

  // Batch remove
  const handleRemoveBatch = async () => {
    if (!selectedWatchlistId || selectedSymbols.size === 0) return;
    const confirmDelete = window.confirm(`Remove ${selectedSymbols.size} symbols from this watchlist?`);
    if (!confirmDelete) return;

    setIsDeletingItems(true);
    try {
      const symbolsArray = Array.from(selectedSymbols);
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolsArray })
      });
      if (res.ok) {
        setItems((prev) => {
          const updated = prev.filter((i) => !selectedSymbols.has(i.symbol));
          if (selectedStock && selectedSymbols.has(selectedStock.symbol)) {
            setSelectedStock(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
        setSelectedSymbols(new Set());
        setIsSelectMode(false);
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Removed ${symbolsArray.length} symbols`);
      }
    } catch (e) {
      console.error('Error removing batch symbols:', e);
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

  // Clean Up Watchlist
  const handleCleanUpWatchlist = async () => {
    if (!selectedWatchlistId || items.length === 0) return;
    const confirmClean = window.confirm(
      `Clean Up Watchlist: Remove stocks below Stage 2 criteria (RS Rank < 50 or Price < 50 SMA)?`
    );
    if (!confirmClean) return;

    const toRemove = items
      .filter((item) => (item.rs_rank !== null && item.rs_rank < 50) || (item.chg_pct !== null && item.chg_pct < -15))
      .map((i) => i.symbol);

    if (toRemove.length === 0) {
      alert('No lagging stocks found in current watchlist.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: toRemove })
      });
      if (res.ok) {
        fetchItems(selectedWatchlistId);
        if (fetchWatchlists) fetchWatchlists();
        triggerToast(`Cleaned up ${toRemove.length} lagging stocks`);
      }
    } catch (e) {
      console.error('Error cleaning up watchlist:', e);
    }
  };

  // -------------------------------------------------------------
  // FILTERING & SORTING FOR WATCHLIST ITEMS
  // -------------------------------------------------------------
  const availableSectors = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const sec = (item.sector || '').trim();
      if (sec) map.set(sec, (map.get(sec) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const availableIndustries = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (filterSector !== 'ALL' && item.sector !== filterSector) return;
      const ind = (item.industry || '').trim();
      if (ind) map.set(ind, (map.get(ind) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filterSector]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase();
        const symMatch = (item.symbol || '').toLowerCase().includes(query);
        const nameMatch = (item.name || '').toLowerCase().includes(query);
        const indMatch = (item.industry || '').toLowerCase().includes(query);
        if (!symMatch && !nameMatch && !indMatch) return false;
      }
      if (filterSector !== 'ALL' && item.sector !== filterSector) return false;
      if (filterIndustry !== 'ALL' && item.industry !== filterIndustry) return false;
      return true;
    });
  }, [items, searchQuery, filterSector, filterIndustry]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case 'group_rs':
        return copy.sort((a, b) => (b.group_rs_rank ?? b.rs_rank ?? 0) - (a.group_rs_rank ?? a.rs_rank ?? 0));
      case 'rs_rank':
        return copy.sort((a, b) => (b.rs_rank ?? 0) - (a.rs_rank ?? 0));
      case 'chg_pct_desc':
        return copy.sort((a, b) => (b.chg_pct ?? -999) - (a.chg_pct ?? -999));
      case 'chg_pct_asc':
        return copy.sort((a, b) => (a.chg_pct ?? 999) - (b.chg_pct ?? 999));
      case 'rvol':
        return copy.sort((a, b) => (b.rvol_pct ?? 0) - (a.rvol_pct ?? 0));
      case 'symbol':
        return copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'added':
        return copy.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
      default:
        return copy;
    }
  }, [filteredItems, sortBy]);

  // Grouped items structure if groupMode !== 'none'
  const groupedSections = useMemo(() => {
    if (groupMode === 'none') return null;

    const groupsMap = new Map();
    sortedItems.forEach((item) => {
      let gName = '';
      let gRsRank = 50;
      let gQuadrant = 'Improving';

      if (groupMode === 'industry') {
        gName = (item.industry || '').trim() || 'Unclassified Industry';
        gRsRank = item.industry_rs_rank ?? item.group_rs_rank ?? 50;
        gQuadrant = item.industry_quadrant ?? item.group_quadrant ?? 'Improving';
      } else if (groupMode === 'sector') {
        gName = (item.sector || '').trim() || 'Unclassified Sector';
        gRsRank = item.sector_rs_rank ?? item.group_rs_rank ?? 50;
        gQuadrant = item.sector_quadrant ?? item.group_quadrant ?? 'Improving';
      } else if (groupMode === 'theme') {
        gName = item.theme || (item.themes && item.themes[0]) || 'Other / No Theme';
        gRsRank = item.theme_rs_rank ?? item.group_rs_rank ?? 50;
        gQuadrant = item.theme_quadrant ?? item.group_quadrant ?? 'Improving';
      }

      if (!groupsMap.has(gName)) {
        groupsMap.set(gName, {
          name: gName,
          key: gName,
          rsRank: gRsRank,
          quadrant: gQuadrant,
          items: []
        });
      }
      groupsMap.get(gName).items.push(item);
    });

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (b.rsRank !== a.rsRank) return b.rsRank - a.rsRank;
      return b.items.length - a.items.length || a.name.localeCompare(b.name);
    });
  }, [sortedItems, groupMode]);

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

  // -------------------------------------------------------------
  // FLATTENED DISPLAY ITEMS FOR KEYBOARD NAVIGATION
  // -------------------------------------------------------------
  const displayItems = useMemo(() => {
    if (dockTab === 'watchlists') {
      if (groupMode === 'none' || !groupedSections) {
        return sortedItems;
      }
      const flat = [];
      groupedSections.forEach((g) => {
        if (!collapsedGroupKeys.has(g.key)) {
          flat.push(...g.items);
        }
      });
      return flat;
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
      return positions;
    }
    return sortedItems;
  }, [dockTab, sortedItems, groupMode, groupedSections, collapsedGroupKeys, expandedMarketGroups, groupType, groupConstituents, positions]);

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
          setSelectedStock(displayItems[prevIdx]);
        } else {
          const nextIdx = currentIdx < displayItems.length - 1 ? currentIdx + 1 : 0;
          setSelectedStock(displayItems[nextIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayItems, selectedStock, activeGroupChart, dockTab, handlePrevGroup, handleNextGroup]);

  const activeWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);

  // Active bar metrics for HUD
  const latestBar = useMemo(() => {
    if (!stockPrices || stockPrices.length === 0) return null;
    return stockPrices[stockPrices.length - 1];
  }, [stockPrices]);

  const cleanName = useMemo(() => {
    const raw = selectedStock?.name || stockDetail?.metadata?.name || selectedStock?.symbol || '';
    return raw
      .replace(/\s*(?:Class\s+[A-Z]\s+)?(?:Common\s+Stock|Ordinary\s+Shares|ADS|ADR).*$/i, '')
      .replace(/\s*\(.*?par\s+value.*?\)/i, '')
      .replace(/\s*-\s*Common\s+Stock/i, '')
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
  const priceChangePct = selectedStock?.today_pct !== undefined && selectedStock?.today_pct !== null
    ? selectedStock.today_pct
    : selectedStock?.chg_pct;

  // Positions summary
  const positionsSummary = useMemo(() => {
    if (!positions || positions.length === 0) return { count: 0, totalPnl: 0, totalNotional: 0, pnlPct: 0 };
    let totalPnl = 0;
    let totalNotional = 0;
    positions.forEach((p) => {
      totalPnl += p.unrealized_pnl || 0;
      totalNotional += p.entry_notional || 0;
    });
    const pnlPct = totalNotional > 0 ? (totalPnl / totalNotional) * 100 : 0;
    return { count: positions.length, totalPnl, totalNotional, pnlPct };
  }, [positions]);

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 48px)',
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
                padding: '10px 16px',
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
                    setActiveGroupChart(null);
                    setSelectedStock({ symbol: sym });
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
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--bg-secondary)',
                flexShrink: 0
              }}>
                {/* Row 1: Symbol, Price, Change%, Company Name, Exchange & Sector, Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.4px', lineHeight: 1 }}>
                      {selectedStock.symbol}
                    </span>

                    {latestBar && (
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                        ${latestBar.close?.toFixed(2)}
                      </span>
                    )}

                    {priceChangePct !== null && priceChangePct !== undefined && (
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: priceChangePct >= 0 ? '#34d399' : '#fb7185',
                        lineHeight: 1
                      }}>
                        {priceChangePct >= 0 ? `+${priceChangePct.toFixed(2)}%` : `${priceChangePct.toFixed(2)}%`}
                      </span>
                    )}

                    {cleanName && cleanName !== selectedStock.symbol && (
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 700 }}>
                        {cleanName}
                      </span>
                    )}

                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {exchange ? `${exchange} • ` : ''}{sector || 'Sector'}
                    </span>

                    {industry && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}>
                        🏭 {industry}
                      </span>
                    )}
                  </div>

                  {/* Top Right: Watchlist Action & Details Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Quick Add To Watchlist Button with Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setQuickAddMenuSym(quickAddMenuSym === selectedStock.symbol ? null : selectedStock.symbol)}
                        title="Add this stock to a watchlist"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '5px',
                          color: '#10b981',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span>＋</span>
                        <span>Watchlist</span>
                      </button>

                      {quickAddMenuSym === selectedStock.symbol && (
                        <>
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                            onClick={() => setQuickAddMenuSym(null)}
                          />
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '28px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                            padding: '4px 0',
                            zIndex: 100,
                            minWidth: '160px'
                          }}>
                            <div style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                              ADD TO WATCHLIST:
                            </div>
                            {watchlists.map((w) => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => handleAddSymbolToWatchlist(selectedStock.symbol, w.id)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '6px 12px',
                                  fontSize: '11.5px',
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <span>{w.name}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({w.item_count || 0})</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Toggle Stock Details Drawer Button */}
                    <button
                      type="button"
                      onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                      title={isRightPanelCollapsed ? 'Show Stock Details & Info Panel' : 'Collapse Stock Details'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: !isRightPanelCollapsed ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: !isRightPanelCollapsed ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        borderRadius: '5px',
                        color: !isRightPanelCollapsed ? '#38bdf8' : 'var(--text-secondary)',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <span>{isRightPanelCollapsed ? '◧ Details' : '◨ Hide Details'}</span>
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

              {/* Candlestick Chart Area (Full Height) */}
              <div style={{ flex: 1, minHeight: 0, position: 'relative', height: '100%' }}>
                {loadingPrices ? (
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
                ) : stockPrices && stockPrices.length > 0 ? (
                  <CandlestickChart
                    data={stockPrices}
                    symbol={selectedStock.symbol}
                    height="100%"
                  />
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

        {/* Collapsible Stock Detail Sub-panel */}
        {!isRightPanelCollapsed && selectedStock && (
          <div
            className="custom-scrollbar"
            style={{
              width: '320px',
              minWidth: '320px',
              maxWidth: '320px',
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
              zIndex: 10
            }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                {selectedStock.symbol} · Telemetry
              </span>
              <button
                type="button"
                onClick={() => setIsRightPanelCollapsed(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>

            {/* Profile */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div
                onClick={() => toggleSection('profile')}
                style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Company Profile</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{collapsedSections.profile ? '▼' : '▲'}</span>
              </div>
              {!collapsedSections.profile && (
                <div style={{ padding: '0 12px 8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <p style={{ margin: 0 }}>
                    {profileExpanded
                      ? (stockDetail?.metadata?.description || selectedStock.name)
                      : (stockDetail?.metadata?.description || selectedStock.name)?.slice(0, 140) + '...'}
                  </p>
                  <button
                    onClick={() => setProfileExpanded(!profileExpanded)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', padding: '4px 0 0', cursor: 'pointer', fontSize: '10.5px' }}
                  >
                    {profileExpanded ? 'Show less' : 'Read more'}
                  </button>
                </div>
              )}
            </div>

            {/* Key Stats */}
            <div style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div
                onClick={() => toggleSection('stats')}
                style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Key Technical Stats</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{collapsedSections.stats ? '▼' : '▲'}</span>
              </div>
              {!collapsedSections.stats && (
                <div style={{ padding: '0 12px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10.5px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>52W Range</div>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>
                      ${stockDetail?.metrics?.low_52w?.toFixed(1) || '—'} - ${stockDetail?.metrics?.high_52w?.toFixed(1) || '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Dist from 52W High</div>
                    <div style={{ fontWeight: 700, color: selectedStock.dist_52wh_pct >= -10 ? '#10b981' : 'var(--text-secondary)' }}>
                      {selectedStock.dist_52wh_pct !== undefined ? `${selectedStock.dist_52wh_pct?.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Market Cap</div>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>
                      {stockDetail?.metrics?.market_cap ? `$${(stockDetail.metrics.market_cap / 1e9).toFixed(1)}B` : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Volume 50D MA</div>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>
                      {latestBar?.vol_50d_ma ? `${(latestBar.vol_50d_ma / 1e6).toFixed(2)}M` : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Setups Tag List */}
            {selectedStock.setups && selectedStock.setups.length > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Active Setups</div>
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
        minWidth: '340px',
        maxWidth: '850px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        overflow: 'hidden'
      }}>
        {/* Primary Tab Bar: [ ★ Watchlists ] [ 🏛 Market Groups ] [ 💼 Positions ] */}
        <div style={{
          padding: '8px 10px',
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
            {positions.length > 0 && (
              <span style={{
                background: dockTab === 'positions' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '1px 5px',
                fontSize: '10px'
              }}>
                {positions.length}
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
                    <button
                      onClick={() => { setShowDropdownMenu(false); handleCleanUpWatchlist(); }}
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 12px', fontSize: '11.5px', color: '#f59e0b', cursor: 'pointer' }}
                    >
                      🧹 Clean Up Laggards
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
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

            {/* Filter & Group Controls */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="🔍 Filter ticker or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '3px 20px 3px 6px',
                    fontSize: '10.5px',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '4px', top: '3px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Group By selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>Group by:</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'industry', label: 'Industry' },
                    { id: 'sector', label: 'Sector' },
                    { id: 'theme', label: 'Theme' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setGroupMode(btn.id)}
                      style={{
                        background: groupMode === btn.id ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                        border: groupMode === btn.id ? '1px solid #38bdf8' : '1px solid transparent',
                        color: groupMode === btn.id ? '#38bdf8' : 'var(--text-muted)',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        fontSize: '9.5px',
                        fontWeight: groupMode === btn.id ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Watchlist Stock Table */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
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
                    {isSelectMode && <th style={{ width: '24px', padding: '6px 4px', textAlign: 'center' }}>✓</th>}
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Symbol / Name</th>
                    <th style={{ textAlign: 'right', padding: '6px 6px', cursor: 'pointer' }} onClick={() => setSortBy(sortBy === 'chg_pct_desc' ? 'chg_pct_asc' : 'chg_pct_desc')}>
                      Today {sortBy === 'chg_pct_desc' ? '↓' : sortBy === 'chg_pct_asc' ? '↑' : ''}
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 6px', cursor: 'pointer' }} onClick={() => setSortBy('rvol')}>RVOL</th>
                    <th style={{ textAlign: 'center', padding: '6px 6px', cursor: 'pointer' }} onClick={() => setSortBy('rs_rank')}>RS</th>
                    <th style={{ width: '22px', padding: '6px 4px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Loading watchlist stocks...
                      </td>
                    </tr>
                  ) : sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
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
                          onClick={() => { setActiveGroupChart(null); setSelectedStock(item); }}
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
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>{item.symbol}</div>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                {item.industry || item.sector || item.name || '—'}
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 700, color: chg === null || chg === undefined ? 'var(--text-muted)' : isPositive ? '#34d399' : '#fb7185' }}>
                            {chg !== null && chg !== undefined ? `${isPositive ? '+' : ''}${chg.toFixed(1)}%` : '—'}
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', color: item.rvol_pct && item.rvol_pct >= 150 ? '#34d399' : 'var(--text-secondary)' }}>
                            {item.rvol_pct ? `${Math.round(item.rvol_pct)}%` : '—'}
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
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
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
                                        onClick={() => { setActiveGroupChart(null); setSelectedStock(stock); }}
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
                                          <div>
                                            <span style={{ fontWeight: 800, color: '#ffffff' }}>{stock.symbol}</span>
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {stock.name}
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

                                        {/* Quick Add To Watchlist Action */}
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => handleAddSymbolToWatchlist(stock.symbol)}
                                            title={`Add ${stock.symbol} to active watchlist`}
                                            style={{
                                              background: 'transparent',
                                              border: '1px solid rgba(16, 185, 129, 0.4)',
                                              color: '#10b981',
                                              borderRadius: '3px',
                                              padding: '1px 4px',
                                              fontSize: '10px',
                                              cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                          >
                                            ＋
                                          </button>
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
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>OPEN POSITIONS</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                  {positionsSummary.count} Active Trades
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>UNREALIZED P&L</div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: positionsSummary.totalPnl >= 0 ? '#34d399' : '#fb7185'
                }}>
                  {positionsSummary.totalPnl >= 0 ? '+' : ''}${positionsSummary.totalPnl.toFixed(2)} ({positionsSummary.pnlPct >= 0 ? '+' : ''}{positionsSummary.pnlPct.toFixed(1)}%)
                </div>
              </div>

              <button
                type="button"
                onClick={fetchPositions}
                title="Refresh Open Positions"
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
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
              {loadingPositions ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Loading open positions...
                </div>
              ) : positions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  No open trades found in journal.
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
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>Qty / Entry</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>Last</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>P&L %</th>
                      <th style={{ textAlign: 'right', padding: '6px 6px' }}>P&L $</th>
                      <th style={{ width: '22px', padding: '6px 4px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const isSelected = selectedStock?.symbol === pos.symbol;
                      const pnlPct = pos.unrealized_pnl_pct ?? pos.pnl_pct;
                      const isPositive = pnlPct !== null && pnlPct !== undefined ? pnlPct >= 0 : false;

                      return (
                        <tr
                          key={pos.id || pos.symbol}
                          onClick={() => { setActiveGroupChart(null); setSelectedStock(pos); }}
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
                                {pos.holding_days ? `${pos.holding_days}d held` : 'Open'}
                              </div>
                            </div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px' }}>
                            <div style={{ color: '#ffffff', fontWeight: 600 }}>{pos.open_qty} shs</div>
                            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>@ ${pos.avg_entry?.toFixed(2)}</div>
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 600, color: '#ffffff' }}>
                            ${pos.current_price?.toFixed(2) || '—'}
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 800, color: isPositive ? '#34d399' : '#fb7185' }}>
                            {pnlPct !== null && pnlPct !== undefined ? `${isPositive ? '+' : ''}${pnlPct.toFixed(1)}%` : '—'}
                          </td>

                          <td style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 700, color: isPositive ? '#34d399' : '#fb7185' }}>
                            {pos.unrealized_pnl !== null && pos.unrealized_pnl !== undefined ? `${pos.unrealized_pnl >= 0 ? '+' : ''}$${pos.unrealized_pnl.toFixed(0)}` : '—'}
                          </td>

                          <td style={{ padding: '6px 4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleAddSymbolToWatchlist(pos.symbol)}
                              title={`Add ${pos.symbol} to active watchlist`}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#10b981',
                                borderRadius: '3px',
                                padding: '1px 4px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                            >
                              ＋
                            </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                setActiveGroupChart(null);
                setSelectedStock({ symbol: sym });
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
