import React, { useState, useEffect, useMemo, useRef } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function LeaderboardTab({
  onSelectStock = () => {},
  tradingDates = [],
  selectedDate: propSelectedDate,
  setSelectedDate: propSetSelectedDate,
  watchlists = [],
  fetchWatchlists = () => {}
}) {
  const [data, setData] = useState({
    summary: {},
    sector_distribution: [],
    industry_distribution: [],
    stocks: [],
    date: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date State & Helpers (identical to CandidatesTab / Screen page)
  const [internalSelectedDate, setInternalSelectedDate] = useState('latest');
  const selectedDate = propSelectedDate !== undefined ? propSelectedDate : internalSelectedDate;
  const setSelectedDate = propSetSelectedDate || setInternalSelectedDate;

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
    const daysForward = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : dayOfWeek === 0 ? 1 : 1;
    dt.setDate(dt.getDate() + daysForward);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const prevDate = React.useMemo(() => {
    if (!curDateStr) return null;
    if (tradingDates && tradingDates.length > 0) {
      const prevTrading = tradingDates.find(d => d < curDateStr && !isWeekend(d));
      if (prevTrading) return prevTrading;
    }
    return getPrevWeekday(curDateStr);
  }, [curDateStr, tradingDates, isWeekend, getPrevWeekday]);

  const nextDate = React.useMemo(() => {
    if (!curDateStr) return null;
    if (tradingDates && tradingDates.length > 0) {
      const newerTrading = tradingDates.filter(d => d > curDateStr && !isWeekend(d));
      if (newerTrading.length > 0) {
        return newerTrading[newerTrading.length - 1];
      }
    }
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

  // Boards Definitions
  const BOARDS = useMemo(() => [
    { id: 'near_52w_high', label: 'Near 52w high', defaultRs: 90, defaultSort: 'pivot_rs' },
    { id: 'new_highs', label: 'New highs', defaultRs: 0, defaultSort: 'pivot_rs' },
    { id: 'gainers', label: 'Gainers', defaultRs: 0, defaultSort: 'change_pct' },
    { id: 'pre_market', label: 'Pre-market', defaultRs: 0, defaultSort: 'gap_pct' },
    { id: 'strongest', label: 'Strongest', defaultRs: 90, defaultSort: 'rs_rank' },
  ], []);

  const [selectedBoard, setSelectedBoard] = useState('near_52w_high');

  // Filter & Grouping States
  const [groupViewMode, setGroupViewMode] = useState('sector'); // 'sector' | 'industry'
  const [minRs, setMinRs] = useState(90); // Default to 90 as per playbook
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [filterSweetSpot, setFilterSweetSpot] = useState(false);
  const [filterHealthyAtr, setFilterHealthyAtr] = useState(false);
  const [filterExpandingVol, setFilterExpandingVol] = useState(false);
  const [filterPrs90, setFilterPrs90] = useState(false);
  const [filterAccelerating, setFilterAccelerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Table Sort State
  const [sortBy, setSortBy] = useState('pivot_rs');
  const [sortOrder, setSortOrder] = useState('desc');
  const [leaderViewMode, setLeaderViewMode] = useState('table'); // 'table' | 'heatmap' | 'board'

  // Switch board handler
  const handleBoardChange = (boardId) => {
    if (boardId === selectedBoard) return;
    setSelectedBoard(boardId);
    setSelectedSector(null);
    setSelectedIndustry(null);
    const targetBoard = BOARDS.find(b => b.id === boardId);
    if (targetBoard) {
      setMinRs(targetBoard.defaultRs);
      setSortBy(targetBoard.defaultSort);
      setSortOrder('desc');
    }
  };

  // Selected Stock for drawer & arrow keys
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [expandedSectors, setExpandedSectors] = useState({});

  // Watchlist integration
  const [targetWatchlistId, setTargetWatchlistId] = useState(null);
  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = useState(new Set());

  // Refs for table row keyboard navigation
  const tableBodyRef = useRef(null);

  // Initialize target watchlist
  useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists, targetWatchlistId]);

  // Fetch items of the selected watchlist
  const fetchWatchlistItems = async (wlId) => {
    if (!wlId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${wlId}/items`);
      if (res.ok) {
        const items = await res.json();
        setActiveWatchlistSymbols(new Set(items.map(item => item.symbol.toUpperCase())));
      }
    } catch (e) {
      console.error('Failed to fetch watchlist items:', e);
    }
  };

  useEffect(() => {
    if (targetWatchlistId) {
      fetchWatchlistItems(targetWatchlistId);
    }
  }, [targetWatchlistId]);

  // Toggle stock in watchlist
  const handleToggleWatchlist = async (symbol, e) => {
    if (e) e.stopPropagation();
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
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    }
  };

  // Fetch Leaderboard data
  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const dateToFetch = (selectedDate && selectedDate !== 'latest') ? selectedDate : curDateStr;
      if (dateToFetch) params.append('date', dateToFetch);
      params.append('board', selectedBoard);
      params.append('min_rs', minRs);
      if (selectedSector) params.append('sector', selectedSector);
      if (selectedIndustry) params.append('industry', selectedIndustry);

      const res = await fetch(`${API_BASE}/api/leaderboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load leaderboard (${res.status} ${res.statusText})`);
      }
      const json = await res.json();
      setData(json);

      // Auto-select first stock if none selected or current selection is not in list
      if (json.stocks && json.stocks.length > 0) {
        if (!selectedSymbol || !json.stocks.some(s => s.symbol === selectedSymbol)) {
          setSelectedSymbol(json.stocks[0].symbol);
        }
      } else {
        setSelectedSymbol(null);
      }
    } catch (err) {
      setError(err.message || 'Error fetching leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  // Reset sector and industry filters when date changes so user sees the new day's overall Money Flow
  const prevDateRef = useRef(curDateStr);
  useEffect(() => {
    if (prevDateRef.current !== curDateStr) {
      prevDateRef.current = curDateStr;
      setSelectedSector(null);
      setSelectedIndustry(null);
    }
  }, [curDateStr]);

  useEffect(() => {
    fetchLeaderboard();
  }, [curDateStr, selectedBoard, minRs, selectedSector, selectedIndustry]);

  // Client-side filtering & sorting for smooth instant response
  const displayedStocks = useMemo(() => {
    let list = data.stocks || [];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q))
      );
    }

    // Quick Filters
    if (filterSweetSpot) {
      list = list.filter(s => s.status_days === 'sweet_spot');
    }
    if (filterHealthyAtr) {
      list = list.filter(s => s.status_atr === 'healthy');
    }
    if (filterExpandingVol) {
      list = list.filter(s => s.status_rvol === 'expanding');
    }
    if (filterPrs90) {
      list = list.filter(s => (s.pivot_rs ?? 0) >= 90);
    }
    if (filterAccelerating) {
      list = list.filter(s => (s.rs_shift ?? 0) >= 10);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [data.stocks, searchQuery, filterSweetSpot, filterHealthyAtr, filterExpandingVol, filterPrs90, filterAccelerating, sortBy, sortOrder]);

  // Group displayed stocks by sector for Board view
  const sectorGroups = useMemo(() => {
    if (!displayedStocks || displayedStocks.length === 0) return [];
    const map = new Map();
    displayedStocks.forEach((stock, idx) => {
      const sec = stock.sector || 'Unassigned';
      if (!map.has(sec)) {
        map.set(sec, []);
      }
      map.get(sec).push({ ...stock, rank: idx + 1 });
    });
    return Array.from(map.entries())
      .map(([sector, stocks]) => ({ sector, stocks }))
      .sort((a, b) => b.stocks.length - a.stocks.length);
  }, [displayedStocks]);

  // Handle Sort Change
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Keyboard navigation through candidate table
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if focus is in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (!displayedStocks || displayedStocks.length === 0) return;

      const currentIndex = displayedStocks.findIndex(s => s.symbol === selectedSymbol);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < displayedStocks.length - 1 ? currentIndex + 1 : 0;
        const nextStock = displayedStocks[nextIndex];
        if (nextStock) {
          setSelectedSymbol(nextStock.symbol);
          onSelectStock(nextStock, displayedStocks);
          scrollToRow(nextStock.symbol);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : displayedStocks.length - 1;
        const prevStock = displayedStocks[prevIndex];
        if (prevStock) {
          setSelectedSymbol(prevStock.symbol);
          onSelectStock(prevStock, displayedStocks);
          scrollToRow(prevStock.symbol);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const curStock = displayedStocks.find(s => s.symbol === selectedSymbol);
        if (curStock) {
          onSelectStock(curStock, displayedStocks);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedStocks, selectedSymbol, onSelectStock]);

  const scrollToRow = (sym) => {
    const row = document.getElementById(`leaderboard-row-${sym}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleRowClick = (stock) => {
    setSelectedSymbol(stock.symbol);
    onSelectStock(stock, displayedStocks);
  };

  const toggleSectorExpand = (secName, e) => {
    e.stopPropagation();
    setExpandedSectors(prev => ({
      ...prev,
      [secName]: !prev[secName]
    }));
  };

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '12px 16px', gap: '10px' }}>
      
      {/* 1. Header & Global Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> Boards
            <span className="badge" style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              {data.board_title || 'Leaderboard'}
            </span>
          </h1>
        </div>

        {/* Global Controls: Date, Watchlist Target, Refresh */}
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

          {/* Watchlist Target Selector */}
          {watchlists && watchlists.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>⭐️ To:</span>
              <select
                value={targetWatchlistId || ''}
                onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                className="select-input"
                style={{ padding: '4px 6px', fontSize: '11px', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
              >
                {watchlists.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reload Button */}
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Reload Leaderboard"
          >
            <span className={loading ? 'spin-icon' : ''}>⟳</span> Refresh
          </button>
        </div>
      </div>

      {/* 1b. KovaView Board Pill Switcher & RS Cutoff */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        {/* Board Pills (Capsule Switcher) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {BOARDS.map((b) => {
            const isActive = selectedBoard === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleBoardChange(b.id)}
                style={{
                  padding: '5px 13px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '20px',
                  border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#000000' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Min RS Cutoff */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setMinRs(0)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              background: minRs === 0 ? '#10b981' : 'transparent',
              color: minRs === 0 ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            All RS
          </button>
          <button
            onClick={() => setMinRs(80)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              background: minRs === 80 ? '#10b981' : 'transparent',
              color: minRs === 80 ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            RS &ge; 80
          </button>
          <button
            onClick={() => setMinRs(90)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              background: minRs === 90 ? '#10b981' : 'transparent',
              color: minRs === 90 ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Kova Recommended: Top 10% RS Leaders"
          >
            ⭐ RS &ge; 90
          </button>
          <button
            onClick={() => setMinRs(95)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              background: minRs === 95 ? '#10b981' : 'transparent',
              color: minRs === 95 ? '#000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            RS &ge; 95
          </button>
        </div>
      </div>

      {/* KovaView Subtitle describing the active board criteria */}
      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '-4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{data.board_description || `${data.stocks?.length || 0} stocks as of ${curDateStr}`}</span>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
        {/* Total Candidates */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qualified Leaders</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            {data.summary.total_candidates ?? '--'}
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '400' }}>of {data.summary.total_universe_qualified ?? '--'} near highs</span>
          </div>
        </div>

        {/* Top Concentration Sector */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>#1 Leading Sector</div>
          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#38bdf8', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.summary.top_sector}>
            {data.summary.top_sector || 'None'}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', marginLeft: '5px' }}>
              ({data.summary.top_sector_pct || 0}%)
            </span>
          </div>
        </div>

        {/* Top 3 Sectors Concentration */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top 3 Concentration</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }}>
            {data.summary.top_3_sectors_pct ? `${data.summary.top_3_sectors_pct}%` : '--'}
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '5px' }}>of leaders</span>
          </div>
        </div>

        {/* Top 20 Clustered Industry Group (Kova Drill Deeper) */}
        <div
          onClick={() => {
            if (data.summary.top_cluster_industry && data.summary.top_cluster_industry !== 'None') {
              setSelectedIndustry(data.summary.top_cluster_industry === selectedIndustry ? null : data.summary.top_cluster_industry);
            }
          }}
          style={{
            background: selectedIndustry === data.summary.top_cluster_industry ? 'rgba(168, 85, 247, 0.2)' : 'var(--card-bg)',
            border: selectedIndustry === data.summary.top_cluster_industry ? '1px solid #c084fc' : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '9px 12px',
            cursor: data.summary.top_cluster_industry && data.summary.top_cluster_industry !== 'None' ? 'pointer' : 'default',
            transition: 'all 0.15s ease'
          }}
          title={data.summary.top_cluster_stocks?.length ? `Leaders in Top 20: ${data.summary.top_cluster_stocks.join(', ')} (Click to filter)` : 'Top Clustered Group in Top 20 RS Leaders'}
        >
          <div style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span>🔥</span> Top 20 Cluster
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#c084fc', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={data.summary.top_cluster_industry}>
            {data.summary.top_cluster_industry || 'None'}
            {data.summary.top_cluster_count > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', marginLeft: '5px' }}>
                ({data.summary.top_cluster_count} names)
              </span>
            )}
          </div>
        </div>

        {/* Sweet Spot Count */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Sweet Spot (30–120d)</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
            {data.summary.sweet_spot_count ?? '--'}
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '5px' }}>stocks</span>
          </div>
        </div>

        {/* Healthy ATR Count */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Healthy ATR (&le; 2 ATR)</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
            {data.summary.healthy_atr_count ?? '--'}
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '5px' }}>buyable</span>
          </div>
        </div>

        {/* Pivot RS Leaders Count */}
        <div
          onClick={() => setFilterPrs90(prev => !prev)}
          style={{
            background: filterPrs90 ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
            border: filterPrs90 ? '1px solid #10b981' : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '9px 12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to toggle filter for Pivot RS ≥ 90 leaders"
        >
          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRS &ge; 90 Leaders</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            {data.summary.prs_90_count ?? '--'}
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '400' }}>
              ({data.summary.accelerating_count ?? 0} &Delta;RS &ge; +10)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter:</span>

          {/* Sweet Spot Toggle */}
          <button
            onClick={() => setFilterSweetSpot(prev => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '20px',
              border: filterSweetSpot ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: filterSweetSpot ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
              color: filterSweetSpot ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: filterSweetSpot ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🌟</span> Sweet Spot (30–120d)
          </button>

          {/* Healthy ATR Toggle */}
          <button
            onClick={() => setFilterHealthyAtr(prev => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '20px',
              border: filterHealthyAtr ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: filterHealthyAtr ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
              color: filterHealthyAtr ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: filterHealthyAtr ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🟢</span> Healthy ATR (&le; 2 ATR)
          </button>

          {/* Expanding Volume Toggle */}
          <button
            onClick={() => setFilterExpandingVol(prev => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '20px',
              border: filterExpandingVol ? '1px solid #38bdf8' : '1px solid var(--border-color)',
              background: filterExpandingVol ? 'rgba(56, 189, 248, 0.2)' : 'var(--card-bg)',
              color: filterExpandingVol ? '#38bdf8' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: filterExpandingVol ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🔥</span> RVOL &ge; 1.2x
          </button>

          {/* PRS >= 90 Toggle */}
          <button
            onClick={() => setFilterPrs90(prev => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '20px',
              border: filterPrs90 ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: filterPrs90 ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
              color: filterPrs90 ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: filterPrs90 ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⭐</span> PRS &ge; 90
          </button>

          {/* Accelerating Toggle */}
          <button
            onClick={() => setFilterAccelerating(prev => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '20px',
              border: filterAccelerating ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: filterAccelerating ? 'rgba(16, 185, 129, 0.2)' : 'var(--card-bg)',
              color: filterAccelerating ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: filterAccelerating ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🚀</span> Accelerating (&Delta;RS &ge; +10)
          </button>

          {/* Active Sector / Industry Chips */}
          {selectedSector && (
            <span
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Sector: {selectedSector}
              <span
                onClick={() => { setSelectedSector(null); setSelectedIndustry(null); }}
                style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '2px' }}
                title="Clear sector filter"
              >
                ×
              </span>
            </span>
          )}

          {selectedIndustry && (
            <span
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Industry: {selectedIndustry}
              <span
                onClick={() => setSelectedIndustry(null)}
                style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '2px' }}
                title="Clear industry filter"
              >
                ×
              </span>
            </span>
          )}
        </div>

        {/* Ticker Search input */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            placeholder="Search ticker / name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 28px 5px 10px',
              fontSize: '12px',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <span
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '14px'
              }}
            >
              ×
            </span>
          )}
        </div>
      </div>

      {/* 4. Main Two-Column Workflow (Left: Sector Concentration Step 1, Right: Candidates Table Step 2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '10px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: Sector & Industry Theme Concentration (Step 1) */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          
          {/* Step 1 Money Flow Header with KovaView Pill Switcher */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Money Flow</span>
              
              {/* KovaView Sector / Industry Pill Switcher */}
              <div style={{
                display: 'inline-flex',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '2px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <button
                  onClick={() => setGroupViewMode('sector')}
                  style={{
                    padding: '2px 9px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    background: groupViewMode === 'sector' ? '#10b981' : 'transparent',
                    color: groupViewMode === 'sector' ? '#000000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Sector
                </button>
                <button
                  onClick={() => setGroupViewMode('industry')}
                  style={{
                    padding: '2px 9px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    background: groupViewMode === 'industry' ? '#10b981' : 'transparent',
                    color: groupViewMode === 'industry' ? '#000000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Industry
                </button>
              </div>
            </div>

            {/* Sub-header: Count and Reset */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {data.summary.total_universe_qualified ?? data.stocks?.length ?? 0} stocks · {groupViewMode === 'sector' ? `${data.sector_distribution?.length || 0} sectors` : `${data.industry_distribution?.length || 0} groups`}
              </span>
              {(selectedSector || selectedIndustry) && (
                <button
                  onClick={() => { setSelectedSector(null); setSelectedIndustry(null); }}
                  style={{
                    padding: '1px 6px',
                    fontSize: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  title="Clear group filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* List: Sector View or Industry View */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {groupViewMode === 'sector' ? (
              data.sector_distribution && data.sector_distribution.length > 0 ? (
                data.sector_distribution.map((sec) => {
                  const isSelected = selectedSector === sec.sector;
                  const isExpanded = expandedSectors[sec.sector];

                  return (
                    <div
                      key={sec.sector}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '7px 9px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSector(null);
                          setSelectedIndustry(null);
                        } else {
                          setSelectedSector(sec.sector);
                          setSelectedIndustry(null);
                        }
                      }}
                    >
                      {/* Sector Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                          <div style={{ fontWeight: '600', fontSize: '12px', color: isSelected ? '#38bdf8' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sec.sector}>
                            {sec.sector}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            Avg {sec.avg_dist_52w ?? 0}% · {sec.avg_days_at_highs ?? 0}d at highs
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{sec.count}</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: isSelected ? '#38bdf8' : '#10b981' }}>
                            {sec.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 6px 0' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, sec.pct * 2.5)}%`,
                            background: isSelected ? '#38bdf8' : sec.pct >= 20 ? '#10b981' : sec.pct >= 10 ? '#f59e0b' : '#64748b',
                            borderRadius: '2px'
                          }}
                        />
                      </div>

                      {/* Expandable Industries Breakdown */}
                      {sec.top_industries && sec.top_industries.length > 0 && (
                        <div style={{ marginTop: '3px' }}>
                          <div
                            onClick={(e) => toggleSectorExpand(sec.sector, e)}
                            style={{
                              fontSize: '9.5px',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <span>{isExpanded ? '▾' : '▸'}</span>
                            <span>{sec.top_industries.length} Industries in {sec.sector}</span>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: '5px', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {sec.top_industries.map(ind => {
                                const isIndSelected = selectedIndustry === ind.industry;
                                return (
                                  <div
                                    key={ind.industry}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSector(sec.sector);
                                      setSelectedIndustry(isIndSelected ? null : ind.industry);
                                    }}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      fontSize: '10.5px',
                                      padding: '2px 4px',
                                      borderRadius: '3px',
                                      background: isIndSelected ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                      color: isIndSelected ? '#c084fc' : 'var(--text-secondary)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={ind.industry}>
                                      <div>{ind.industry}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Avg {ind.avg_dist_52w ?? 0}% · {ind.avg_days_at_highs ?? 0}d</div>
                                    </div>
                                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      {ind.count} ({ind.pct}%)
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                  No sector concentration data.
                </div>
              )
            ) : (
              data.industry_distribution && data.industry_distribution.length > 0 ? (
                data.industry_distribution.map((ind) => {
                  const isSelected = selectedIndustry === ind.industry;

                  return (
                    <div
                      key={`${ind.sector}-${ind.industry}`}
                      style={{
                        background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '7px 9px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedIndustry(null);
                        } else {
                          setSelectedIndustry(ind.industry);
                        }
                      }}
                    >
                      {/* Industry Header Row: Industry Name & Count/Pct */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontWeight: '600', fontSize: '12px', color: isSelected ? '#c084fc' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '6px' }} title={ind.industry}>
                          {ind.industry}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{ind.count}</span>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: isSelected ? '#c084fc' : '#10b981' }}>
                            {ind.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Parent Sector Tag */}
                      <div style={{ fontSize: '9.5px', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }} title={`Sector: ${ind.sector}`}>
                        {ind.sector}
                      </div>

                      {/* Avg Metrics & Top 20 Badge: Strictly on the same line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', marginTop: '2px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                          Avg {ind.avg_dist_52w ?? 0}% · {ind.avg_days_at_highs ?? 0}d at highs
                        </span>
                        {ind.top_20_count >= 2 ? (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              color: '#f59e0b',
                              background: 'rgba(245, 158, 11, 0.18)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '10px',
                              padding: '0.5px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              flexShrink: 0
                            }}
                            title={`${ind.top_20_count} stocks in Top 20 RS Leaders`}
                          >
                            🔥 {ind.top_20_count} in Top 20
                          </span>
                        ) : ind.top_20_count === 1 ? (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: '600',
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.12)',
                              borderRadius: '8px',
                              padding: '0.5px 4px',
                              flexShrink: 0
                            }}
                            title="1 stock in Top 20 RS Leaders"
                          >
                            1 in Top 20
                          </span>
                        ) : null}
                      </div>

                      {/* Visual Progress Bar */}
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 2px 0' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, ind.pct * 3.5)}%`,
                            background: isSelected ? '#c084fc' : ind.pct >= 15 ? '#10b981' : ind.pct >= 8 ? '#f59e0b' : '#64748b',
                            borderRadius: '2px'
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                  No industry group concentration data.
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Leadership Table */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Leading Stocks
              </span>
              <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                {displayedStocks.length} displayed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="leaderboard-view-bar">
                <button
                  className={`leaderboard-view-btn ${leaderViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setLeaderViewMode('table')}
                  title="Table View"
                >
                  📋 Table
                </button>
                <button
                  className={`leaderboard-view-btn ${leaderViewMode === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setLeaderViewMode('heatmap')}
                  title="Heatmap View"
                >
                  🔥 Heatmap
                </button>
                <button
                  className={`leaderboard-view-btn ${leaderViewMode === 'board' ? 'active' : ''}`}
                  onClick={() => setLeaderViewMode('board')}
                  title="Sector Board View"
                >
                  📊 Sector Board
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Use ↑ ↓ arrow keys to inspect
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-secondary)', gap: '8px' }}>
                <span className="spin-icon">⟳</span> Loading near-highs leaders...
              </div>
            ) : error ? (
              <div style={{ padding: '24px', color: '#f43f5e', textAlign: 'center' }}>
                {error}
              </div>
            ) : displayedStocks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</span>
                <div>No stocks found matching the current filters.</div>
                <button
                  onClick={() => {
                    setSelectedSector(null);
                    setSelectedIndustry(null);
                    setFilterSweetSpot(false);
                    setFilterHealthyAtr(false);
                    setFilterExpandingVol(false);
                    setFilterPrs90(false);
                    setFilterAccelerating(false);
                    setSearchQuery('');
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: '12px', fontSize: '11px' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : leaderViewMode === 'heatmap' ? (
              <div style={{ padding: '14px' }}>
                <div className="leaderboard-heatmap-grid">
                  {displayedStocks.map((stock, index) => {
                    const isSelected = selectedSymbol === stock.symbol;
                    const change = stock.change_pct ?? 0;
                    const isPos = change > 0;
                    const isNeg = change < 0;
                    const bg = isPos
                      ? `rgba(16, 185, 129, ${Math.min(0.32, 0.08 + Math.abs(change) * 0.04)})`
                      : isNeg
                      ? `rgba(244, 63, 94, ${Math.min(0.32, 0.08 + Math.abs(change) * 0.04)})`
                      : 'rgba(255, 255, 255, 0.03)';
                    const borderColor = isSelected
                      ? '#10b981'
                      : isPos
                      ? 'rgba(16, 185, 129, 0.3)'
                      : isNeg
                      ? 'rgba(244, 63, 94, 0.3)'
                      : 'var(--border-color)';

                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => handleRowClick(stock)}
                        className="leaderboard-tile"
                        style={{
                          background: bg,
                          borderColor: borderColor,
                          boxShadow: isSelected ? '0 0 0 2px #10b981' : undefined
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            #{index + 1}
                          </span>
                          <span
                            onClick={(e) => handleToggleWatchlist(stock.symbol, e)}
                            style={{
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: activeWatchlistSymbols.has(stock.symbol.toUpperCase()) ? '#f59e0b' : 'rgba(255,255,255,0.2)'
                            }}
                          >
                            ★
                          </span>
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                            {stock.symbol}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stock.name || stock.company_name}>
                            {stock.name || stock.company_name || stock.sector}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isPos ? '#10b981' : isNeg ? '#f43f5e' : 'var(--text-primary)' }}>
                            {isPos ? '+' : ''}{change.toFixed(2)}%
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            ${stock.close ? stock.close.toFixed(2) : '-'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '10px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>RS {stock.rs_rank ?? '-'}</span>
                          <span style={{ color: '#38bdf8' }}>Kova {stock.pivot_rs ?? '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : leaderViewMode === 'board' ? (
              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {sectorGroups.map(({ sector, stocks }) => (
                  <div
                    key={sector}
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {sector}
                      </span>
                      <span className="badge" style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        {stocks.length} stocks
                      </span>
                    </div>
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '360px', overflowY: 'auto' }}>
                      {stocks.map(stock => {
                        const isSelected = selectedSymbol === stock.symbol;
                        const change = stock.change_pct ?? 0;
                        const isPos = change > 0;
                        const isNeg = change < 0;
                        return (
                          <div
                            key={stock.symbol}
                            onClick={() => handleRowClick(stock)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? '#10b981' : 'transparent'}`,
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '20px' }}>
                                #{stock.rank}
                              </span>
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)' }}>
                                  {stock.symbol}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {stock.name || stock.company_name}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: isPos ? '#10b981' : isNeg ? '#f43f5e' : 'var(--text-secondary)' }}>
                                {isPos ? '+' : ''}{change.toFixed(2)}%
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                RS {stock.rs_rank ?? '-'} · ${stock.close ? stock.close.toFixed(2) : '-'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ background: '#0e131f', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ width: '28px', padding: '7px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>#</th>

                    <th style={{ width: '24px', padding: '7px 2px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>⭐️</th>
                    
                    <th
                      onClick={() => handleSort('symbol')}
                      style={{ width: '82px', padding: '7px 5px', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'symbol' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      Name {sortBy === 'symbol' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th style={{ width: '125px', padding: '7px 5px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      Sector · Industry
                    </th>

                    <th
                      onClick={() => handleSort('change_pct')}
                      style={{ width: '56px', padding: '7px 3px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'change_pct' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                      title="Today's % Change"
                    >
                      Today {sortBy === 'change_pct' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('rvol')}
                      style={{ width: '42px', padding: '7px 2px', textAlign: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'rvol' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                      title="Relative Volume (vs 50d avg)"
                    >
                      RVol {sortBy === 'rvol' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('ret_1w')}
                      style={{ width: '50px', padding: '7px 2px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'ret_1w' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                      title="1-Week Performance (5 trading days)"
                    >
                      1W {sortBy === 'ret_1w' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('ret_1m')}
                      style={{ width: '48px', padding: '7px 2px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'ret_1m' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      1M {sortBy === 'ret_1m' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('ret_3m')}
                      style={{ width: '48px', padding: '7px 2px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'ret_3m' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      3M {sortBy === 'ret_3m' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('ret_ytd')}
                      style={{ width: '52px', padding: '7px 2px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'ret_ytd' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      YTD {sortBy === 'ret_ytd' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('pivot_rs')}
                      style={{ width: '56px', padding: '7px 2px', textAlign: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'pivot_rs' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                      title="Kova / Pivot RS (1–99) & Velocity Shift"
                    >
                      Kova {sortBy === 'pivot_rs' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('dist_from_52w_high')}
                      style={{ width: '48px', padding: '7px 4px', textAlign: 'right', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'dist_from_52w_high' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      52wH {sortBy === 'dist_from_52w_high' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('days_at_highs')}
                      style={{ width: '62px', padding: '7px 2px', textAlign: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'days_at_highs' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      Days {sortBy === 'days_at_highs' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('ext_atr_10ema')}
                      style={{ width: '62px', padding: '7px 2px', textAlign: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'ext_atr_10ema' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                    >
                      Ext {sortBy === 'ext_atr_10ema' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>

                    <th
                      onClick={() => handleSort('rs_rank')}
                      style={{ width: '36px', padding: '7px 2px', textAlign: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: sortBy === 'rs_rank' ? '#10b981' : 'var(--text-secondary)', fontWeight: '600' }}
                      title="IBD Relative Strength (1–99)"
                    >
                      RS {sortBy === 'rs_rank' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>

                <tbody ref={tableBodyRef}>
                  {displayedStocks.map((stock, index) => {
                    const isSelected = selectedSymbol === stock.symbol;
                    const isSaved = activeWatchlistSymbols.has(stock.symbol.toUpperCase());

                    return (
                      <tr
                        key={stock.symbol}
                        id={`leaderboard-row-${stock.symbol}`}
                        onClick={() => handleRowClick(stock)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                          boxShadow: isSelected ? 'inset 2px 0 0 #10b981' : 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Rank # */}
                        <td style={{ padding: '6px 2px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>
                          {index + 1}
                        </td>

                        {/* Star Button */}
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <span
                            onClick={(e) => handleToggleWatchlist(stock.symbol, e)}
                            style={{
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: isSaved ? '#f59e0b' : 'var(--text-muted)',
                              transition: 'transform 0.15s ease'
                            }}
                            title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          >
                            {isSaved ? '★' : '☆'}
                          </span>
                        </td>

                        {/* Symbol & Name */}
                        <td style={{ padding: '6px 5px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '11.5px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              {stock.symbol}
                            </span>
                            {stock.is_prs_90 && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  padding: '0 3px',
                                  borderRadius: '3px',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  lineHeight: '13px'
                                }}
                                title="⭐ Pivot RS 90+ (Top decile momentum)"
                              >
                                90+
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stock.name}>
                            {stock.name}
                          </div>
                        </td>

                        {/* Sector · Industry Stack */}
                        <td style={{ padding: '6px 5px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1.2 }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: selectedSector === stock.sector ? '#38bdf8' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={stock.sector}
                            >
                              {stock.sector}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: selectedIndustry === stock.industry ? '#c084fc' : 'var(--text-muted)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={stock.industry}
                              >
                                {stock.industry}
                              </span>
                              {stock.top_20_group_count >= 2 && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    color: '#f59e0b',
                                    fontWeight: '700',
                                    flexShrink: 0
                                  }}
                                  title={`Institutional Cluster: ${stock.top_20_group_count} names in Top 20 RS Leaders`}
                                >
                                  🔥
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Today (% change) */}
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', color: stock.change_pct > 0 ? '#10b981' : stock.change_pct < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                          {stock.change_pct != null ? `${stock.change_pct > 0 ? '+' : ''}${stock.change_pct.toFixed(2)}%` : '--'}
                        </td>

                        {/* RVOL */}
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          {stock.rvol >= 1.2 ? (
                            <span
                              style={{
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontWeight: '700',
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                              title={`Volume Expansion: ${stock.rvol}x average`}
                            >
                              {stock.rvol}x
                            </span>
                          ) : (
                            <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {stock.rvol}x
                            </span>
                          )}
                        </td>

                        {/* 1W Return */}
                        <td style={{ padding: '6px 3px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', color: stock.ret_1w > 0 ? '#10b981' : stock.ret_1w < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                          {stock.ret_1w != null ? `${stock.ret_1w > 0 ? '+' : ''}${stock.ret_1w.toFixed(2)}%` : '--'}
                        </td>

                        {/* 1M Return */}
                        <td style={{ padding: '6px 3px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', color: stock.ret_1m > 0 ? '#10b981' : stock.ret_1m < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                          {stock.ret_1m != null ? `${stock.ret_1m > 0 ? '+' : ''}${stock.ret_1m.toFixed(2)}%` : '--'}
                        </td>

                        {/* 3M Return */}
                        <td style={{ padding: '6px 3px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', color: stock.ret_3m > 0 ? '#10b981' : stock.ret_3m < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                          {stock.ret_3m != null ? `${stock.ret_3m > 0 ? '+' : ''}${stock.ret_3m.toFixed(2)}%` : '--'}
                        </td>

                        {/* YTD Return */}
                        <td style={{ padding: '6px 3px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', color: stock.ret_ytd > 0 ? '#10b981' : stock.ret_ytd < 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                          {stock.ret_ytd != null ? `${stock.ret_ytd > 0 ? '+' : ''}${stock.ret_ytd.toFixed(2)}%` : '--'}
                        </td>

                        {/* Kova / Pivot RS & Shift */}
                        <td style={{ padding: '6px 2px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ fontWeight: '700', fontSize: '10.5px', color: stock.pivot_rs >= 90 ? '#10b981' : 'var(--text-primary)' }}>
                            {stock.pivot_rs ?? '--'}
                          </span>
                          {stock.rs_shift >= 10 ? (
                            <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '700', marginLeft: '2px' }} title={`1M Velocity: +${stock.rs_shift} rank points (Accelerating)`}>
                              ↑+{stock.rs_shift}
                            </span>
                          ) : stock.rs_shift <= -10 ? (
                            <span style={{ fontSize: '9px', color: '#f43f5e', fontWeight: '700', marginLeft: '2px' }} title={`1M Velocity: ${stock.rs_shift} rank points (Fading)`}>
                              ↓{stock.rs_shift}
                            </span>
                          ) : stock.rs_shift !== 0 && stock.rs_shift != null ? (
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '2px' }} title={`1M Velocity: ${stock.rs_shift > 0 ? `+${stock.rs_shift}` : stock.rs_shift} rank points`}>
                              {stock.rs_shift > 0 ? `+${stock.rs_shift}` : stock.rs_shift}
                            </span>
                          ) : null}
                        </td>

                        {/* Off 52w High (52wH) */}
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', color: stock.dist_from_52w_high === 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          {stock.dist_from_52w_high === 0 ? '0.00%' : `-${stock.dist_from_52w_high.toFixed(2)}%`}
                        </td>

                        {/* Days at Highs */}
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          {stock.status_days === 'sweet_spot' ? (
                            <span
                              style={{
                                padding: '2px 5px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="🌟 Sweet Spot (30–120 days): Sustained institutional accumulation"
                            >
                              🌟 {stock.days_at_highs}d
                            </span>
                          ) : stock.status_days === 'fresh' ? (
                            <span
                              style={{
                                padding: '2px 5px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.25)'
                              }}
                              title="Fresh Breakout (<30 days): Higher failure rate, verify pattern"
                            >
                              {stock.days_at_highs}d
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 5px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.25)'
                              }}
                              title="Maturing Trend (>120 days): Watch for late-stage exhaustion"
                            >
                              {stock.days_at_highs}d
                            </span>
                          )}
                        </td>

                        {/* ATR Extension */}
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          {stock.status_atr === 'healthy' ? (
                            <span
                              style={{
                                padding: '2px 4px',
                                borderRadius: '10px',
                                fontSize: '9.5px',
                                fontWeight: '600',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                whiteSpace: 'nowrap'
                              }}
                              title="Healthy: ≤ 2.0 ATR from 10 EMA (Low chase risk)"
                            >
                              {stock.ext_atr_10ema > 0 ? '+' : ''}{stock.ext_atr_10ema != null ? stock.ext_atr_10ema.toFixed(1) : '0.0'} ATR
                            </span>
                          ) : stock.status_atr === 'normal' ? (
                            <span
                              style={{
                                padding: '2px 4px',
                                borderRadius: '10px',
                                fontSize: '9.5px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                whiteSpace: 'nowrap'
                              }}
                              title="Normal: 2.0–3.0 ATR from 10 EMA"
                            >
                              {stock.ext_atr_10ema > 0 ? '+' : ''}{stock.ext_atr_10ema != null ? stock.ext_atr_10ema.toFixed(1) : '0.0'} ATR
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 4px',
                                borderRadius: '10px',
                                fontSize: '9.5px',
                                fontWeight: '600',
                                background: 'rgba(244, 63, 94, 0.15)',
                                color: '#f43f5e',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                whiteSpace: 'nowrap'
                              }}
                              title="Overextended: > 3.0 ATR from 10 EMA (High chase risk, wait for pullback)"
                            >
                              {stock.ext_atr_10ema > 0 ? '+' : ''}{stock.ext_atr_10ema != null ? stock.ext_atr_10ema.toFixed(1) : '0.0'} ⚠️
                            </span>
                          )}
                        </td>

                        {/* RS Rank */}
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '1px 4px',
                              borderRadius: '3px',
                              fontWeight: '700',
                              fontSize: '10px',
                              fontFamily: 'var(--font-mono)',
                              background: stock.rs_rank >= 95 ? 'rgba(245, 158, 11, 0.2)' : stock.rs_rank >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                              color: stock.rs_rank >= 95 ? '#f59e0b' : stock.rs_rank >= 90 ? '#10b981' : '#38bdf8',
                              border: `1px solid ${stock.rs_rank >= 95 ? 'rgba(245, 158, 11, 0.4)' : stock.rs_rank >= 90 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`
                            }}
                          >
                            {stock.rs_rank}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
