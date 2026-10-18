import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StockView from './stock-view';
import StockList, { StockListSplitter, useStockListResize } from './stock-list';
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

  const {
    panelWidth: sidePanelWidth,
    isResizing: isResizingSidePanel,
    startResizing: startResizingSidePanel,
  } = useStockListResize({
    storageKey: 'pt_model_book_side_panel_width',
    defaultWidth: 380,
    minWidth: 260,
  });

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
      }
    } catch (e) {
      console.error('Error fetching saved trades:', e);
    } finally {
      setLoadingSavedTrades(false);
    }
  }, []);

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
    return [...list].sort((a, b) => {
      const dateA = a.setup_date || a.date || a.added_at || '';
      const dateB = b.setup_date || b.date || b.added_at || '';
      const cmp = String(dateA).localeCompare(String(dateB));
      if (cmp !== 0) return cmp;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });
  }, [savedTrades, savedTradeFilterSetup, savedTradeSearch]);

  const currentTrade = filteredSavedTrades[selectedIndex] || null;


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

    // Prefetch surrounding saved trades for smooth keyboard navigation
    let timer = null;
    if (filteredSavedTrades.length > 1) {
      const symbolsToPrefetch = [];
      if (selectedIndex + 1 < filteredSavedTrades.length) symbolsToPrefetch.push(filteredSavedTrades[selectedIndex + 1]?.symbol);
      if (selectedIndex + 2 < filteredSavedTrades.length) symbolsToPrefetch.push(filteredSavedTrades[selectedIndex + 2]?.symbol);
      if (selectedIndex + 3 < filteredSavedTrades.length) symbolsToPrefetch.push(filteredSavedTrades[selectedIndex + 3]?.symbol);
      if (selectedIndex > 0) symbolsToPrefetch.push(filteredSavedTrades[selectedIndex - 1]?.symbol);

      timer = setTimeout(() => {
        prefetchSymbols(symbolsToPrefetch);
      }, 100);
    }

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentTrade, selectedIndex, filteredSavedTrades, fetchStockPrices, prefetchSymbols]);

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
      <div
        className="browse-split-container"
        style={{
          gap: 0,
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}
      >
        {/* Main Column: Stock Info Card + Full Height Candlestick Chart + Study Notes */}
        <div className="browse-main-col" style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)', gap: 0 }}>
          {currentTrade ? (
            <>
              <StockView
                ref={chartRef}
                stock={currentTrade}
                prices={savedTradePrices}
                loadingPrices={loadingSavedPrices}
                setupName={currentTrade.setup_name || currentTrade.setup_type}
                asOfDate={isEditingTrade ? (editTriggerDate || currentTrade.setup_date) : currentTrade.setup_date}
                marketRegime={currentTrade.market_regime}
                showEarningsBadge={false}
                watchlists={watchlists}
                targetWatchlistId={targetWatchlistId}
                onTargetWatchlistChange={setTargetWatchlistId}
                onToggleWatchlist={handleToggleWatchlist}
                onSelectGroup={(type, name) => setPreviewGroupModal({ groupType: type, groupName: name })}
                onSelectStock={(stk) => {
                  const sym = stk?.symbol || stk;
                  if (!sym) return;
                  const idx = filteredSavedTrades.findIndex(t => t.symbol.toUpperCase() === sym.toUpperCase());
                  if (idx !== -1) {
                    setSelectedIndex(idx);
                  } else if (onSelectStock) {
                    onSelectStock(sym);
                  }
                }}
                headerExtra={
                  <>
                    {isEditingTrade ? (
                      <>
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
                    ) : (
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
                  </>
                }
                style={{ flex: 1, minHeight: 0 }}
              />

              {/* Study Notes Textarea */}
              <div
                style={{
                  padding: '8px 12px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flexShrink: 0
                }}
              >
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

        {/* Resizable Vertical Splitter */}
        <StockListSplitter
          isResizing={isResizingSidePanel}
          onMouseDown={startResizingSidePanel}
        />

        {/* Side Column: Saved Trades List */}
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
          {/* Header: Counter + Prev/Next Buttons */}
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

            <StockList
              items={filteredSavedTrades}
              selectedStock={currentTrade}
              selectedSymbol={currentTrade?.symbol}
              onSelectStock={(trade) => {
                if (trade) {
                  const idx = filteredSavedTrades.findIndex(
                    (t) => (t.id !== undefined && trade.id !== undefined ? t.id === trade.id : t === trade)
                  );
                  if (idx !== -1) setSelectedIndex(idx);
                }
              }}
              columns={['symbol', 'date', 'regime', 'actions']}
              defaultSortBy="date_asc"
              filterExtra={
                <select
                  value={savedTradeFilterSetup}
                  onChange={(e) => {
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
                  {allScreeners.map((opt) => {
                    const count = savedTrades.filter((t) => t.setup_type === opt.id).length;
                    return (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon || '📌'} {opt.name || opt.label} ({count})
                      </option>
                    );
                  })}
                </select>
              }
              renderRowActions={(trade) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSavedTrade(trade.id);
                  }}
                  title={`Remove ${trade.symbol} (${trade.setup_date}) from Model Book`}
                  className="stock-list-action-btn"
                >
                  ✕
                </button>
              )}
              loading={loadingSavedTrades}
              loadingMessage="Loading saved trades..."
              emptyMessage="No saved trades found."
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

