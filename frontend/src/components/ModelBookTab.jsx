import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CandlestickChart from './CandlestickChart';
import StockBrandIcon from './StockBrandIcon';
import GroupStageChart from './GroupStageChart';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function ModelBookTab({
  onSelectStock = null,
  watchlists = [],
  fetchWatchlists = () => {},
  setupsConfig = { folders: [], setups: [], filters: {} }
}) {
  const chartRef = useRef(null);
  const selectedSavedTradeRowRef = useRef(null);
  const priceCacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Map());

  // Saved Trades State
  const [savedTrades, setSavedTrades] = useState([]);
  const [loadingSavedTrades, setLoadingSavedTrades] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [savedTradePrices, setSavedTradePrices] = useState([]);
  const [loadingSavedPrices, setLoadingSavedPrices] = useState(false);
  const [savedTradeFilterSetup, setSavedTradeFilterSetup] = useState('ALL');
  const [savedTradeSearch, setSavedTradeSearch] = useState('');
  const [traderNote, setTraderNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [isEditingTrade, setIsEditingTrade] = useState(false);
  const [editSetupType, setEditSetupType] = useState('');
  const [editTriggerDate, setEditTriggerDate] = useState('');
  const [isSavingTradeEdit, setIsSavingTradeEdit] = useState(false);
  const [previewGroupModal, setPreviewGroupModal] = useState(null);

  // Watchlist integration
  const [targetWatchlistId, setTargetWatchlistId] = useState(null);
  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = useState(new Set());

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

  // Setup options from centralized config
  const allScreeners = useMemo(() => {
    if (setupsConfig?.folders && setupsConfig.folders.length > 0) {
      const list = [];
      setupsConfig.folders.filter(f => f.visible !== false).forEach(f => {
        (f.screeners || []).filter(sc => sc.visible !== false).forEach(sc => {
          list.push(sc);
        });
      });
      return list;
    }
    return (setupsConfig?.setups || []).filter(s => s.visible !== false);
  }, [setupsConfig]);

  // Fetch prices
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

  // Load Saved Model Book from backend
  const fetchSavedTrades = useCallback(async () => {
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
  }, [prefetchSymbols]);

  useEffect(() => {
    fetchSavedTrades();
  }, [fetchSavedTrades]);

  // Filter saved trades by search & setup
  const filteredSavedTrades = useMemo(() => {
    let list = savedTrades || [];
    if (savedTradeFilterSetup !== 'ALL') {
      list = list.filter(t => t.setup_type === savedTradeFilterSetup);
    }
    if (savedTradeSearch.trim()) {
      const q = savedTradeSearch.toLowerCase();
      list = list.filter(t =>
        t.symbol.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.setup_name && t.setup_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [savedTrades, savedTradeFilterSetup, savedTradeSearch]);

  const currentTrade = filteredSavedTrades[selectedIndex] || null;

  // RS Blue Dot indicator as of setup_date (zero lookahead bias)
  const currentHasBlueDot = useMemo(() => {
    if (currentTrade?.is_rs_blue_dot) return true;
    if (savedTradePrices && savedTradePrices.length > 0) {
      const targetDate = currentTrade?.setup_date;
      if (targetDate) {
        const idx = savedTradePrices.findIndex(b => (b.time || b.date) === targetDate);
        if (idx !== -1) {
          const windowBars = savedTradePrices.slice(Math.max(0, idx - 4), idx + 1);
          return windowBars.some(b => b.is_rs_blue_dot);
        }
      }
      const recent = savedTradePrices.slice(-5);
      return recent.some(b => b.is_rs_blue_dot);
    }
    return false;
  }, [currentTrade, savedTradePrices]);

  // Reset edit mode when switching trade selection
  useEffect(() => {
    setIsEditingTrade(false);
  }, [currentTrade?.id]);

  // Load prices and notes when selected trade changes
  useEffect(() => {
    if (!currentTrade) {
      setSavedTradePrices([]);
      setTraderNote('');
      return;
    }
    setTraderNote(currentTrade.notes || '');
    let isCancelled = false;
    setLoadingSavedPrices(true);

    fetchStockPrices(currentTrade.symbol).then(prices => {
      if (!isCancelled) {
        setSavedTradePrices(prices);
        setLoadingSavedPrices(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTrade, fetchStockPrices]);

  // Auto-scroll selected trade into view
  useEffect(() => {
    if (selectedSavedTradeRowRef.current) {
      selectedSavedTradeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation: Arrow keys and J / K
  useEffect(() => {
    if (filteredSavedTrades.length === 0) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredSavedTrades.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSavedTrades.length]);

  // Save Notes handler
  const handleSaveNotes = async () => {
    if (!currentTrade) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${currentTrade.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: traderNote })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
        setNoteSavedFeedback(true);
        setTimeout(() => setNoteSavedFeedback(false), 2000);
      }
    } catch (e) {
      console.error('Error saving notes:', e);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Start editing setup type and trigger date
  const handleStartEditTrade = () => {
    if (!currentTrade) return;
    setEditSetupType(currentTrade.setup_type || '');
    setEditTriggerDate(currentTrade.setup_date || '');
    setIsEditingTrade(true);
  };

  // Shift draft trigger date by 1 trading bar
  const handleShiftEditTriggerDate = (deltaDays) => {
    if (!savedTradePrices || savedTradePrices.length === 0) return;
    const curDate = editTriggerDate || currentTrade?.setup_date;
    const curIdx = savedTradePrices.findIndex(p => (p.date || p.time) === curDate);
    if (curIdx === -1) return;
    const nextIdx = Math.max(0, Math.min(savedTradePrices.length - 1, curIdx + deltaDays));
    if (nextIdx !== curIdx) {
      setEditTriggerDate(savedTradePrices[nextIdx].date || savedTradePrices[nextIdx].time);
    }
  };

  // Confirm & persist setup type and trigger date edits
  const handleConfirmEditTrade = async () => {
    if (!currentTrade) return;
    setIsSavingTradeEdit(true);
    try {
      let latestTrade = currentTrade;

      if (editSetupType && editSetupType !== currentTrade.setup_type) {
        const screener = allScreeners.find(s => s.id === editSetupType);
        const newName = screener?.name || screener?.label || editSetupType;
        const res = await fetch(`${API_BASE}/api/model-book/saved/${currentTrade.id}/setup-type`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setup_type: editSetupType, setup_name: newName })
        });
        if (res.ok) {
          latestTrade = await res.json();
        }
      }

      if (editTriggerDate && editTriggerDate !== currentTrade.setup_date) {
        const res = await fetch(`${API_BASE}/api/model-book/saved/${currentTrade.id}/trigger-date`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setup_date: editTriggerDate })
        });
        if (res.ok) {
          latestTrade = await res.json();
        }
      }

      setSavedTrades(prev => prev.map(t => t.id === latestTrade.id ? latestTrade : t));
      setIsEditingTrade(false);
    } catch (e) {
      console.error('Error saving trade edit:', e);
    } finally {
      setIsSavingTradeEdit(false);
    }
  };

  // Delete trade from Model Book
  const handleDeleteSavedTrade = async (id) => {
    if (!window.confirm('Delete this trade from saved Model Book?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedTrades(prev => prev.filter(t => t.id !== id));
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Error deleting saved trade:', e);
    }
  };

  // Export saved model book to JSON
  const handleExportJSON = () => {
    if (savedTrades.length === 0) return;
    const jsonStr = JSON.stringify(savedTrades, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `model_book_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stock-screen-container">
      {/* Split Screen: Chart & Notes on Left, List on Right */}
      <div className="browse-split-container">
        {/* Main Column: Stock Info Card + Full Height Candlestick Chart + Study Notes */}
        <div className="browse-main-col">
          {currentTrade ? (
            <>
              {/* Stock Info Panel matching Setup Study page */}
              <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                {/* Top Row: Symbol, Name, Subtitle (Exchange • Sector • Industry Button) on Left, Watchlist/Actions on Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Left: Brand Icon + Ticker + Name + Sector + Industry */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                    <StockBrandIcon symbol={currentTrade?.symbol} size={22} />
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      {currentTrade?.symbol || 'No Selection'}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                      {currentTrade?.name || ''}
                    </span>
                    {currentTrade?.sector && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {currentTrade.sector}
                      </span>
                    )}
                    {currentTrade?.industry && (
                      <button
                        type="button"
                        onClick={() => setPreviewGroupModal({ groupType: 'industries', groupName: currentTrade.industry })}
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
                        <span>🏭 {currentTrade.industry}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Watchlist + Inspect + Screenshot + Edit + Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {isEditingTrade && (
                      <>
                        {/* Interactive Setup Type Selector */}
                        <select
                          value={editSetupType}
                          onChange={e => setEditSetupType(e.target.value)}
                          disabled={isSavingTradeEdit}
                          title="Select setup type"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            height: '28px'
                          }}
                        >
                          {allScreeners.map(opt => (
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
                            gap: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            height: '28px',
                            boxSizing: 'border-box'
                          }}
                          title="Adjust trigger date: click calendar to pick a date, or use ◀ / ▶ to shift 1 trading bar"
                        >
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Trigger:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleShiftEditTriggerDate(-1)}
                            disabled={isSavingTradeEdit}
                            title="Shift trigger date 1 bar earlier (◀)"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '3px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              padding: '1px 5px',
                              fontSize: '10px'
                            }}
                          >
                            ◀
                          </button>
                          <input
                            type="date"
                            value={editTriggerDate}
                            onChange={e => setEditTriggerDate(e.target.value)}
                            disabled={isSavingTradeEdit}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#38bdf8',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              outline: 'none',
                              padding: '0 2px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleShiftEditTriggerDate(1)}
                            disabled={isSavingTradeEdit}
                            title="Shift trigger date 1 bar later (▶)"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '3px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              padding: '1px 5px',
                              fontSize: '10px'
                            }}
                          >
                            ▶
                          </button>
                        </div>

                        {/* Confirm Save Button */}
                        <button
                          type="button"
                          onClick={handleConfirmEditTrade}
                          disabled={isSavingTradeEdit}
                          className="btn btn-primary btn-sm"
                          title="Save setup type and trigger date changes"
                          style={{
                            padding: '3px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            height: '28px',
                            background: 'rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.5)'
                          }}
                        >
                          {isSavingTradeEdit ? 'Saving...' : '✓ Save'}
                        </button>

                        {/* Cancel Edit Button */}
                        <button
                          type="button"
                          onClick={() => setIsEditingTrade(false)}
                          disabled={isSavingTradeEdit}
                          className="btn btn-secondary btn-sm"
                          title="Cancel editing"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            height: '28px'
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* Watchlist Quick Action */}
                    {watchlists && watchlists.length > 0 && (
                      <>
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
                            cursor: 'pointer',
                            height: '28px'
                          }}
                        >
                          {watchlists.map((w) => (
                            <option key={w.id} value={w.id}>
                              ⭐️ {w.name}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const isCurrentWatchlisted = currentTrade && activeWatchlistSymbols.has(currentTrade.symbol.toUpperCase());
                          return (
                            <button
                              className={`btn ${isCurrentWatchlisted ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                              onClick={() => handleToggleWatchlist(currentTrade?.symbol)}
                              disabled={!currentTrade}
                              title={isCurrentWatchlisted ? 'Saved in Watchlist (Click to remove)' : `Save ${currentTrade?.symbol || 'stock'} to Watchlist`}
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
                                cursor: currentTrade ? 'pointer' : 'not-allowed'
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
                      </>
                    )}

                    {/* Inspect in Inspector Tab */}
                    {onSelectStock && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectStock(currentTrade.symbol)}
                        title={`Inspect ${currentTrade.symbol} in Inspector Tab`}
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
                          color: 'var(--text-secondary)'
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
                      disabled={loadingSavedPrices || savedTradePrices.length === 0}
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
                        cursor: savedTradePrices.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                    </button>

                    {/* Edit Setup Type & Trigger Date Button */}
                    {!isEditingTrade && (
                      <button
                        type="button"
                        onClick={handleStartEditTrade}
                        className="btn btn-secondary btn-sm"
                        title="Edit setup type and trigger date"
                        style={{ padding: '3px 8px', fontSize: '11px', height: '28px' }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Badges Group (Left) & Stock Position Count (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Left: Badges Group */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* RS Rank */}
                    <span className="pill pill-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                      RS: {currentTrade?.rs_rank ?? (currentTrade?.rs_score ? Math.round(currentTrade.rs_score) : 'N/A')}
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
                    {currentTrade?.adr_20d !== null && currentTrade?.adr_20d !== undefined && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: currentTrade.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                          color: currentTrade.adr_20d >= 5.0 ? '#f59e0b' : '#60a5fa',
                          border: currentTrade.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700
                        }}
                      >
                        ADR%: {currentTrade.adr_20d.toFixed(2)}%
                      </span>
                    )}

                    {/* TI65 */}
                    {currentTrade?.ti_65 !== null && currentTrade?.ti_65 !== undefined && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: currentTrade.ti_65 >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : currentTrade.ti_65 < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                          color: currentTrade.ti_65 >= 1.05 ? '#34d399' : currentTrade.ti_65 < 0.95 ? '#f87171' : 'var(--text-secondary)',
                          border: currentTrade.ti_65 >= 1.05 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                          fontWeight: 600
                        }}
                        title={`Stockbee Trend Intensity (TI65): ${currentTrade.ti_65.toFixed(2)}`}
                      >
                        TI65: {currentTrade.ti_65.toFixed(2)}
                      </span>
                    )}

                    {/* Institutional Sponsorship */}
                    {currentTrade?.inst_holders_count !== null && currentTrade?.inst_holders_count !== undefined ? (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: (currentTrade.sponsorship_streak >= 2 || (currentTrade.inst_holders_qoq_change > 0)) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.18)',
                          color: (currentTrade.sponsorship_streak >= 2 || (currentTrade.inst_holders_qoq_change > 0)) ? '#22c55e' : '#38bdf8',
                          border: (currentTrade.sponsorship_streak >= 2 || (currentTrade.inst_holders_qoq_change > 0)) ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                          fontWeight: 700
                        }}
                        title={`Institutional Sponsorship: ${currentTrade.inst_holders_count.toLocaleString()} funds`}
                      >
                        🏛️ Inst: {currentTrade.inst_holders_count.toLocaleString()} {currentTrade.sponsorship_streak >= 2 ? `🔥 +${currentTrade.sponsorship_streak}Q` : ''}
                      </span>
                    ) : null}

                    {/* Returns: 1M, 3M, 6M */}
                    {currentTrade?.ret_1m !== null && currentTrade?.ret_1m !== undefined && (
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
                        title={`1-Month Return: ${currentTrade.ret_1m.toFixed(1)}%`}
                      >
                        1M: {currentTrade.ret_1m >= 0 ? '+' : ''}{currentTrade.ret_1m.toFixed(1)}%
                      </span>
                    )}

                    {currentTrade?.ret_3m !== null && currentTrade?.ret_3m !== undefined && (
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
                        title={`3-Month Return: ${currentTrade.ret_3m.toFixed(1)}%`}
                      >
                        3M: {currentTrade.ret_3m >= 0 ? '+' : ''}{currentTrade.ret_3m.toFixed(1)}%
                      </span>
                    )}

                    {currentTrade?.ret_6m !== null && currentTrade?.ret_6m !== undefined && (
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
                        title={`6-Month Return: ${currentTrade.ret_6m.toFixed(1)}%`}
                      >
                        6M: {currentTrade.ret_6m >= 0 ? '+' : ''}{currentTrade.ret_6m.toFixed(1)}%
                      </span>
                    )}

                    {/* Market Tape Badge */}
                    {currentTrade?.market_regime && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: currentTrade.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : (currentTrade.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.18)'
                              : 'rgba(245, 158, 11, 0.18)'),
                          color: currentTrade.market_regime === 'BULLISH'
                            ? '#34d399'
                            : (currentTrade.market_regime === 'BEARISH'
                              ? '#fb7185'
                              : '#fbbf24'),
                          border: `1px solid ${currentTrade.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : (currentTrade.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.35)'
                              : 'rgba(245, 158, 11, 0.35)')}`,
                          fontWeight: 700
                        }}
                      >
                        {currentTrade.market_regime === 'BULLISH' ? '🟢 Bullish Tape' : currentTrade.market_regime === 'BEARISH' ? '🔴 Bearish Tape' : '🟡 Caution Tape'}
                      </span>
                    )}
                  </div>

                  {/* Stock Position Count on Far Bottom Right */}
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                    Stock {filteredSavedTrades.length > 0 ? selectedIndex + 1 : 0} of {filteredSavedTrades.length}
                  </span>
                </div>
              </div>

              {/* Candlestick Chart */}
              <div className="glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <CandlestickChart
                  ref={chartRef}
                  data={savedTradePrices}
                  symbol={currentTrade.symbol}
                  companyName={currentTrade.name}
                  setupName={currentTrade.setup_name || currentTrade.setup_type}
                  asOfDate={isEditingTrade ? (editTriggerDate || currentTrade.setup_date) : currentTrade.setup_date}
                  height="100%"
                  showScreenshotButton={false}
                />
              </div>

              {/* Study Notes Textarea */}
              <div className="glass-card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                    📝 Trader Study Notes:
                  </span>
                  {noteSavedFeedback && (
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                      ✓ Notes Saved to Git
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={traderNote}
                  onChange={e => setTraderNote(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Why was this trade a textbook winner? What made the base special? (Auto-saved on blur)..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px' }}>
              <span style={{ fontSize: '40px' }}>📖</span>
              <p style={{ fontSize: '14px' }}>No saved textbook setups found. Use <strong>Setup Study</strong> or <strong>Stock Screen</strong> to curate winning trades.</p>
            </div>
          )}
        </div>

        {/* Side Column: Saved Trades List */}
        <div className="glass-card browse-side-col">
          {/* Header: Counter + Prev/Next Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0, gap: '6px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Saved Setups ({filteredSavedTrades.length}{savedTradeFilterSetup !== 'ALL' ? ` / ${savedTrades.length}` : ''})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedIndex(prev => Math.max(prev - 1, 0))}
                disabled={selectedIndex <= 0}
                title="Previous Trade (▲ or k)"
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
                onClick={() => setSelectedIndex(prev => Math.min(prev + 1, filteredSavedTrades.length - 1))}
                disabled={selectedIndex >= filteredSavedTrades.length - 1}
                title="Next Trade (▼ or j)"
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
            </div>
          </div>

          {/* Setup Category Selection beneath Counter and Prev/Next Buttons */}
          <div style={{ marginBottom: '8px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <select
              value={savedTradeFilterSetup}
              onChange={e => {
                setSavedTradeFilterSetup(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                width: '100%',
                padding: '5px 8px',
                background: 'rgba(30, 41, 59, 0.85)',
                color: savedTradeFilterSetup !== 'ALL' ? '#38bdf8' : 'var(--text-primary)',
                border: savedTradeFilterSetup !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: savedTradeFilterSetup !== 'ALL' ? '600' : '400',
                outline: 'none',
                cursor: 'pointer'
              }}
              title="Filter saved setups by setup category"
            >
              <option value="ALL">All Setups ({savedTrades.length})</option>
              {allScreeners.map(opt => {
                const count = savedTrades.filter(t => t.setup_type === opt.id).length;
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.icon || '📌'} {opt.name || opt.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Saved Trades Rows */}
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
            {filteredSavedTrades.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                {loadingSavedTrades ? 'Loading saved trades...' : 'No saved trades found.'}
              </div>
            ) : (
              filteredSavedTrades.map((trade, idx) => {
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={trade.id}
                    ref={isSelected ? selectedSavedTradeRowRef : null}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1.5px solid #10b981'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, whiteSpace: 'nowrap' }}>
                      <StockBrandIcon symbol={trade.symbol} size={18} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#34d399' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {trade.symbol}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {trade.setup_date}
                      </span>
                      {trade.market_regime && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {trade.market_regime === 'BULLISH' ? '🟢 Bullish' : trade.market_regime === 'BEARISH' ? '🔴 Bearish' : '🟡 Caution'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedTrade(trade.id);
                        }}
                        title={`Remove ${trade.symbol} (${trade.setup_date}) from Model Book`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          padding: 0,
                          borderRadius: '4px',
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          color: '#fb7185',
                          fontSize: '11px',
                          lineHeight: 1,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ✕
                      </button>
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
                onClick={() => setPreviewGroupModal(null)}
                className="btn btn-secondary btn-sm"
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

