import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CandlestickChart from './CandlestickChart';
import StockBrandIcon from './StockBrandIcon';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

const SETUP_COLORS = {
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
  confirmed_staged: '#10b981',
  stage1: '#38bdf8',
  stage2: '#10b981',
  stage3: '#f59e0b',
  stage4: '#f43f5e',
  all: '#64748b',
  vcp: '#10b981',
};

export default function ModelBookTab({
  onSelectStock = null,
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
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

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

  // Reclassify setup type
  const handleUpdateSetupType = async (id, newType) => {
    const screener = allScreeners.find(s => s.id === newType);
    const newName = screener?.name || screener?.label || newType;
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${id}/setup-type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_type: newType, setup_name: newName })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error updating setup type:', e);
    }
  };

  // Trigger date update & shift
  const handleUpdateTriggerDate = async (id, newDate) => {
    if (!newDate) return;
    setIsUpdatingDate(true);
    try {
      const res = await fetch(`${API_BASE}/api/model-book/saved/${id}/trigger-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_date: newDate })
      });
      if (res.ok) {
        const updated = await res.json();
        setSavedTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error updating trigger date:', e);
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleShiftTriggerDate = (deltaDays) => {
    if (!currentTrade || !savedTradePrices || savedTradePrices.length === 0) return;
    const curDate = currentTrade.setup_date;
    const curIdx = savedTradePrices.findIndex(p => p.date === curDate);
    if (curIdx === -1) return;
    const nextIdx = Math.max(0, Math.min(savedTradePrices.length - 1, curIdx + deltaDays));
    if (nextIdx !== curIdx) {
      handleUpdateTriggerDate(currentTrade.id, savedTradePrices[nextIdx].date);
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

  // Export saved model book to JSON or CSV
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
      {/* 1. Top Glass-Card Header & Filter Ribbon */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Left: Title + Search + Setup Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>📚</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                Model Book
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search symbol, notes, setup..."
                value={savedTradeSearch}
                onChange={e => {
                  setSavedTradeSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                style={{
                  padding: '5px 10px 5px 28px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '240px'
                }}
              />
              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
                🔍
              </span>
              {savedTradeSearch && (
                <button
                  type="button"
                  onClick={() => setSavedTradeSearch('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Setup Type Filter */}
            <select
              value={savedTradeFilterSetup}
              onChange={e => {
                setSavedTradeFilterSetup(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 10px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
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

          {/* Right: Info Badge & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredSavedTrades.length}</strong> of <strong>{savedTrades.length}</strong> textbook setups
            </span>
            <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportJSON}
              disabled={savedTrades.length === 0}
              title="Export Model Book to JSON file"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              📥 Export JSON
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>📁 Git:</span>
              <code style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                data/saved_model_book.json
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Split Screen: Chart & Notes on Left, List on Right */}
      <div className="browse-split-container" style={{ marginTop: '10px' }}>
        {/* Main Column: Stock Info Card + Full Height Candlestick Chart + Study Notes */}
        <div className="browse-main-col">
          {currentTrade ? (
            <>
              {/* Stock Info Bar */}
              <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <StockBrandIcon symbol={currentTrade.symbol} size={22} />
                  <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {currentTrade.symbol}
                  </span>

                  {/* Interactive Setup Type Selector */}
                  <select
                    value={currentTrade.setup_type}
                    onChange={e => handleUpdateSetupType(currentTrade.id, e.target.value)}
                    title="Click to reclassify setup type"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      outline: 'none'
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
                      border: '1px solid var(--border-color)'
                    }}
                    title="Adjust trigger date: click calendar to pick a date, or use ◀ / ▶ to shift 1 trading bar"
                  >
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Trigger:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShiftTriggerDate(-1)}
                      disabled={isUpdatingDate}
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
                      value={currentTrade.setup_date || ''}
                      onChange={e => handleUpdateTriggerDate(currentTrade.id, e.target.value)}
                      disabled={isUpdatingDate}
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
                      onClick={() => handleShiftTriggerDate(1)}
                      disabled={isUpdatingDate}
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

                  {currentTrade.market_regime && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
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

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  <button
                    type="button"
                    onClick={() => handleDeleteSavedTrade(currentTrade.id)}
                    className="btn btn-secondary btn-sm"
                    title="Delete from Model Book"
                    style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.4)', padding: '3px 8px', fontSize: '11px', height: '28px' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Candlestick Chart */}
              <div className="glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <CandlestickChart
                  ref={chartRef}
                  data={savedTradePrices}
                  symbol={currentTrade.symbol}
                  setupName={currentTrade.setup_name || currentTrade.setup_type}
                  asOfDate={currentTrade.setup_date}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', margin: 0 }}>
              Saved Setups ({filteredSavedTrades.length})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedIndex(prev => Math.max(prev - 1, 0))}
                disabled={selectedIndex <= 0}
                title="Previous Trade (▲ or k)"
                style={{ padding: '2px 8px', fontSize: '11px', height: '26px' }}
              >
                ▲ Prev
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedIndex(prev => Math.min(prev + 1, filteredSavedTrades.length - 1))}
                disabled={selectedIndex >= filteredSavedTrades.length - 1}
                title="Next Trade (▼ or j)"
                style={{ padding: '2px 8px', fontSize: '11px', height: '26px' }}
              >
                Next ▼
              </button>
            </div>
          </div>

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
                const setupColor = SETUP_COLORS[trade.setup_type] || '#38bdf8';

                return (
                  <div
                    key={trade.id}
                    ref={isSelected ? selectedSavedTradeRowRef : null}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      padding: '8px 10px',
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
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#34d399' : 'var(--text-primary)' }}>
                        {trade.symbol}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {trade.setup_date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: setupColor, fontWeight: 600 }}>
                        {trade.setup_name || trade.setup_type}
                      </span>
                      {trade.market_regime && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {trade.market_regime === 'BULLISH' ? '🟢 Bullish' : trade.market_regime === 'BEARISH' ? '🔴 Bearish' : '🟡 Caution'}
                        </span>
                      )}
                    </div>
                    {trade.notes && (
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {trade.notes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
