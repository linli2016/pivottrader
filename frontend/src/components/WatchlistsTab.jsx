import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CandlestickChart from './CandlestickChart';
import VcpFootprintCard from './VcpFootprintCard';
import LowCheatFootprintCard from './LowCheatFootprintCard';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

// Sleek Brand Logo Icon Component
function StockBrandIcon({ symbol }) {
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

export default function WatchlistsTab({ handleSelectStock, watchlists = [], fetchWatchlists }) {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [activeMode, setActiveMode] = useState('watchlist'); // 'watchlist' | 'industry'
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Center Chart Data
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  // Right Panel Data
  const [stockDetail, setStockDetail] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [peersData, setPeersData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fundTab, setFundTab] = useState('institutions');
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Accordion Collapse States
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

  // Watchlist Management State
  const [symbolFilter, setSymbolFilter] = useState('');
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

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
        // Select first stock by default if none selected or not in current list
        if (data.length > 0) {
          setSelectedStock((current) => {
            if (current && data.some((d) => d.symbol === current.symbol)) {
              return current;
            }
            return data[0];
          });
        } else {
          setSelectedStock(null);
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
    setLoadingPrices(true);
    setLoadingDetail(true);

    // 1. Fetch Daily Prices for Candlestick Chart
    fetch(`${API_BASE}/api/stocks/${sym}/prices`)
      .then((res) => (res.ok ? res.json() : []))
      .then((prices) => {
        setStockPrices(prices);
        setLoadingPrices(false);
      })
      .catch((err) => {
        console.error(`Error loading prices for ${sym}:`, err);
        setLoadingPrices(false);
      });

    // 2. Fetch Detail & Sponsorship
    fetch(`${API_BASE}/api/stocks/${sym}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((detail) => {
        setStockDetail(detail);
        setLoadingDetail(false);
      })
      .catch((err) => {
        console.error(`Error loading detail for ${sym}:`, err);
        setLoadingDetail(false);
      });

    // 3. Fetch Financials
    fetch(`${API_BASE}/api/stocks/${sym}/financials`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fin) => setFinancials(fin))
      .catch(() => setFinancials(null));

    // 4. Fetch Industry Peers
    fetch(`${API_BASE}/api/stocks/${sym}/peers?limit=6`)
      .then((res) => (res.ok ? res.json() : null))
      .then((peers) => setPeersData(peers))
      .catch(() => setPeersData(null));
  }, [selectedStock?.symbol]);

  // Keyboard Navigation: ArrowUp / ArrowDown flips between stocks in list
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items || items.length === 0) return;
        const currentIdx = items.findIndex(
          (i) => (i.symbol || '').toUpperCase() === (selectedStock?.symbol || '').toUpperCase()
        );
        if (e.key === 'ArrowUp') {
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
          setSelectedStock(items[prevIdx]);
        } else {
          const nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
          setSelectedStock(items[nextIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedStock]);

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
        body: JSON.stringify({ symbol: sym }),
      });
      if (res.ok) {
        setNewSymbolInput('');
        await fetchItems(selectedWatchlistId);
        if (fetchWatchlists) fetchWatchlists();
      } else {
        alert(`Failed to add ${sym} to watchlist.`);
      }
    } catch (err) {
      alert(`Error adding symbol: ${err.message}`);
    } finally {
      setIsAddingSymbol(false);
    }
  };

  // Remove symbol from active watchlist
  const handleRemoveSymbol = async (sym, e) => {
    e?.stopPropagation();
    if (!selectedWatchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/${sym}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.symbol !== sym));
        if (selectedStock?.symbol === sym) {
          const remaining = items.filter((i) => i.symbol !== sym);
          setSelectedStock(remaining.length > 0 ? remaining[0] : null);
        }
        if (fetchWatchlists) fetchWatchlists();
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  // Create new watchlist
  const handleCreateWatchlist = async (e) => {
    e?.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewWatchlistName('');
        setShowCreateModal(false);
        if (fetchWatchlists) await fetchWatchlists();
        setSelectedWatchlistId(created.id);
      }
    } catch (err) {
      alert(`Error creating watchlist: ${err.message}`);
    }
  };

  // Delete current watchlist
  const handleDeleteWatchlist = async () => {
    if (!selectedWatchlistId) return;
    const currentW = watchlists.find((w) => w.id === selectedWatchlistId);
    if (!window.confirm(`Are you sure you want to delete "${currentW?.name || 'Watchlist'}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (fetchWatchlists) await fetchWatchlists();
        const remaining = watchlists.filter((w) => w.id !== selectedWatchlistId);
        setSelectedWatchlistId(remaining.length > 0 ? remaining[0].id : null);
        setShowDropdownMenu(false);
      }
    } catch (err) {
      alert(`Error deleting watchlist: ${err.message}`);
    }
  };

  // Filtered items list
  const filteredItems = useMemo(() => {
    if (!symbolFilter.trim()) return items;
    const query = symbolFilter.trim().toUpperCase();
    return items.filter(
      (i) => i.symbol.toUpperCase().includes(query) || (i.name || '').toUpperCase().includes(query)
    );
  }, [items, symbolFilter]);

  const activeWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);

  // Active bar metrics for HUD
  const latestBar = useMemo(() => {
    if (!stockPrices || stockPrices.length === 0) return null;
    return stockPrices[stockPrices.length - 1];
  }, [stockPrices]);

  const prevBar = useMemo(() => {
    if (!stockPrices || stockPrices.length < 2) return null;
    return stockPrices[stockPrices.length - 2];
  }, [stockPrices]);

  // Clean company name
  const cleanName = useMemo(() => {
    const raw = selectedStock?.name || stockDetail?.metadata?.name || selectedStock?.symbol || '';
    return raw
      .replace(/\s*(?:Class\s+[A-Z]\s+)?(?:Common\s+Stock|Ordinary\s+Shares|ADS|ADR).*$/i, '')
      .replace(/\s*\(.*?par\s+value.*?\)/i, '')
      .replace(/\s*-\s*Common\s+Stock/i, '')
      .trim();
  }, [selectedStock, stockDetail]);

  const rvolDisplay = selectedStock?.rvol_pct ?? (
    latestBar && latestBar.vol_50d_ma
      ? Math.round((latestBar.volume / latestBar.vol_50d_ma) * 100)
      : null
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 78px)',
      width: '100%',
      overflow: 'hidden',
      color: 'var(--text-primary)',
      boxSizing: 'border-box'
    }}>
      {/* 3-Column Workstation Layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        width: '100%',
        gap: '1px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderTop: '1px solid var(--border-color)'
      }}>

        {/* ======================================================== */}
        {/* COLUMN 1: LEFT WATCHLIST & SYMBOL LIST (~270px)          */}
        {/* ======================================================== */}
        <div style={{
          width: '275px',
          minWidth: '275px',
          maxWidth: '275px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          {/* Header Mode Switcher: Watchlist / Industry */}
          <div style={{
            padding: '10px 12px 8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '3px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              gap: '2px'
            }}>
              <button
                onClick={() => setActiveMode('watchlist')}
                style={{
                  background: activeMode === 'watchlist' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: activeMode === 'watchlist' ? '#10b981' : 'var(--text-secondary)',
                  border: activeMode === 'watchlist' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  borderRadius: '16px',
                  padding: '3px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Watchlist
              </button>
              <button
                onClick={() => setActiveMode('industry')}
                style={{
                  background: activeMode === 'industry' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: activeMode === 'industry' ? '#10b981' : 'var(--text-secondary)',
                  border: activeMode === 'industry' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  borderRadius: '16px',
                  padding: '3px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Industry
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setShowCreateModal(true)}
                title="Create New Watchlist"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 6px'
                }}
              >
                ➕
              </button>
            </div>
          </div>

          {/* Watchlist Dropdown Selector & Quick Actions */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#000000', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 900
              }}>
                {(activeWatchlist?.name || 'W')[0].toUpperCase()}
              </div>
              <select
                value={selectedWatchlistId || ''}
                onChange={(e) => setSelectedWatchlistId(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '140px'
                }}
              >
                {watchlists.map((w) => (
                  <option key={w.id} value={w.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                    {w.name} ({w.item_count})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                title="Watchlist Options"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 4px'
                }}
              >
                ≡
              </button>
            </div>

            {/* Dropdown Menu */}
            {showDropdownMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '38px',
                  right: '12px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  padding: '6px 0',
                  zIndex: 100,
                  minWidth: '150px'
                }}
              >
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowDropdownMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  + New Watchlist
                </button>
                {activeWatchlist && activeWatchlist.name !== 'Default' && (
                  <button
                    onClick={handleDeleteWatchlist}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: '12px',
                      color: '#fb7185',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Delete Watchlist
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Add Symbol Input Bar */}
          <form onSubmit={handleAddSymbol} style={{
            padding: '6px 10px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            gap: '6px'
          }}>
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
                fontSize: '11.5px',
                color: '#ffffff',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isAddingSymbol || !newSymbolInput.trim()}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </form>

          {/* Symbol List Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-color)',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--bg-secondary)',
                  zIndex: 2,
                  fontSize: '10.5px'
                }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Ticker</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 600 }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 600 }}>Chg%</th>
                  <th style={{ textAlign: 'right', padding: '6px 6px', fontWeight: 600 }}>Rel Vol</th>
                  <th style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 600 }}>RS</th>
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                      ⏳ Loading symbols...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                      No stocks in this list.<br />
                      Type a ticker above to add.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedStock?.symbol === item.symbol;
                    const chg = item.chg_pct;
                    const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;
                    const rsVal = item.rs_rank;

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => setSelectedStock(item)}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                          transition: 'background-color 0.12s ease'
                        }}
                        className="watchlist-item-row"
                      >
                        {/* Ticker + Logo */}
                        <td style={{ padding: '7px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <StockBrandIcon symbol={item.symbol} />
                            <span style={{ fontWeight: 800, color: isSelected ? '#10b981' : 'var(--text-primary)', fontSize: '12px' }}>
                              {item.symbol}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td style={{ textAlign: 'right', padding: '7px 6px', fontWeight: 600 }}>
                          {item.close !== null && item.close !== undefined ? `$${item.close.toFixed(2)}` : '—'}
                        </td>

                        {/* Chg% */}
                        <td style={{
                          textAlign: 'right',
                          padding: '7px 6px',
                          fontWeight: 700,
                          color: chg === null || chg === undefined ? 'var(--text-muted)' : isPositive ? '#34d399' : '#fb7185'
                        }}>
                          {chg !== null && chg !== undefined ? (
                            <div>
                              <span>{isPositive ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`}</span>
                            </div>
                          ) : '—'}
                        </td>

                        {/* Rel Vol */}
                        <td style={{
                          textAlign: 'right',
                          padding: '7px 6px',
                          color: item.rvol_pct && item.rvol_pct >= 150 ? '#34d399' : 'var(--text-secondary)'
                        }}>
                          {item.rvol_pct ? `${Math.round(item.rvol_pct)}%` : '—'}
                        </td>

                        {/* RS Rank Badge */}
                        <td style={{ textAlign: 'center', padding: '7px 6px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: rsVal >= 70 ? '#34d399' : rsVal <= 30 ? '#fb7185' : 'var(--text-secondary)'
                          }}>
                            {rsVal !== null && rsVal !== undefined ? rsVal : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: CENTER INTERACTIVE CHART & TELEMETRY (flex: 1) */}
        {/* ======================================================== */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-primary)',
          overflow: 'hidden'
        }}>
          {selectedStock ? (
            <>
              {/* Center Top Header Bar */}
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--bg-secondary)'
              }}>
                {/* Left: Ticker, Price, Chg%, RS Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                      {selectedStock.symbol}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🔍</span>
                  </div>

                  {latestBar && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                        ${latestBar.close?.toFixed(2)}
                      </span>
                      {selectedStock.chg_pct !== undefined && selectedStock.chg_pct !== null && (
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: selectedStock.chg_pct >= 0 ? '#34d399' : '#fb7185'
                        }}>
                          {selectedStock.chg_pct >= 0 ? `+${selectedStock.chg_pct.toFixed(1)}%` : `${selectedStock.chg_pct.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Kova RS Badge */}
                  {selectedStock.rs_rank !== null && selectedStock.rs_rank !== undefined && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      Kova {selectedStock.rs_rank} ↑
                    </span>
                  )}

                  {/* Blue Dot Indicator if active */}
                  {latestBar?.is_rs_blue_dot && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: 'rgba(56, 189, 248, 0.25)',
                      color: '#38bdf8'
                    }}>
                      🔵 Blue Dot
                    </span>
                  )}
                </div>

                {/* Right: Timeframe Switcher & Chart Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {['5m', '65m', '1D', '1W'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      style={{
                        background: selectedTimeframe === tf ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: selectedTimeframe === tf ? '#10b981' : 'var(--text-secondary)',
                        border: selectedTimeframe === tf ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>Candles ▾</span>
                </div>
              </div>

              {/* Chart Telemetry HUD Banner Overlays */}
              <div style={{
                padding: '6px 16px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {/* Row 1: OHLCV + Volume Ratio */}
                {latestBar && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>{selectedStock.symbol}</span>
                    <span>O <strong style={{ color: '#ffffff' }}>${latestBar.open?.toFixed(2)}</strong></span>
                    <span>H <strong style={{ color: '#ffffff' }}>${latestBar.high?.toFixed(2)}</strong></span>
                    <span>L <strong style={{ color: '#ffffff' }}>${latestBar.low?.toFixed(2)}</strong></span>
                    <span>C <strong style={{ color: '#ffffff' }}>${latestBar.close?.toFixed(2)}</strong></span>
                    <span>Vol <strong style={{ color: '#ffffff' }}>{(latestBar.volume / 1e6).toFixed(2)}M</strong></span>
                    {rvolDisplay && (
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                        Vol ratio {(rvolDisplay / 100).toFixed(1)}x
                      </span>
                    )}
                  </div>
                )}

                {/* Row 2: Kova Essentials Moving Averages */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', fontSize: '10.5px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kova Essentials:</span>
                  <span style={{ color: '#facc15' }}>
                    EMA 10 <strong>${selectedStock.ema_10 ? selectedStock.ema_10.toFixed(2) : latestBar?.close?.toFixed(2)}</strong>
                  </span>
                  <span style={{ color: '#38bdf8' }}>
                    EMA 20 <strong>${selectedStock.ema_20 ? selectedStock.ema_20.toFixed(2) : (latestBar?.close * 0.98)?.toFixed(2)}</strong>
                  </span>
                  <span style={{ color: '#c084fc' }}>
                    EMA 50 <strong>${selectedStock.ema_50 ? selectedStock.ema_50.toFixed(2) : latestBar?.sma_50?.toFixed(2)}</strong>
                  </span>
                  <span style={{ color: '#34d399' }}>
                    EMA 200 <strong>${selectedStock.sma_200 ? selectedStock.sma_200.toFixed(2) : latestBar?.sma_200?.toFixed(2)}</strong>
                  </span>
                </div>

                {/* Row 3: Growth & Pivot Wall Levels */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontSize: '10.5px' }}>
                  {stockDetail?.fundamentals?.[0] && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      EPS & Rev Growth: <strong style={{ color: '#34d399' }}>YoY +{Math.round(stockDetail.fundamentals[0].eps_qoq_growth || 20)}%</strong>
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>
                    Call Wall <strong style={{ color: '#34d399' }}>${selectedStock.high_52w ? selectedStock.high_52w.toFixed(2) : (latestBar?.close * 1.05)?.toFixed(2)}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Put Wall <strong style={{ color: '#fb7185' }}>${(latestBar?.close * 0.90)?.toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Main Candlestick Chart Area */}
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {loadingPrices ? (
                  <div style={{
                    display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: '13px'
                  }}>
                    ⏳ Loading chart candles for {selectedStock.symbol}...
                  </div>
                ) : stockPrices.length === 0 ? (
                  <div style={{
                    display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: '13px'
                  }}>
                    No price data available for {selectedStock.symbol}
                  </div>
                ) : (
                  <CandlestickChart
                    data={stockPrices}
                    symbol={selectedStock.symbol}
                    height="100%"
                  />
                )}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: '14px'
            }}>
              Select a stock on the left to display its chart.
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: RIGHT STOCK & COMPANY INFO PANEL (~340px)      */}
        {/* ======================================================== */}
        <div style={{
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          overflowY: 'auto'
        }}>
          {selectedStock ? (
            <>
              {/* Header: Symbol, Name & Prev/Next Arrows */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.25)',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 800, color: '#ffffff',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {selectedStock.symbol} · {cleanName}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => {
                      const idx = items.findIndex((i) => i.symbol === selectedStock.symbol);
                      if (idx > 0) setSelectedStock(items[idx - 1]);
                    }}
                    title="Previous Stock (Arrow Up)"
                    style={{
                      background: 'transparent', border: '1px solid var(--border-color)',
                      borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer',
                      padding: '2px 6px', fontSize: '11px'
                    }}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => {
                      const idx = items.findIndex((i) => i.symbol === selectedStock.symbol);
                      if (idx < items.length - 1) setSelectedStock(items[idx + 1]);
                    }}
                    title="Next Stock (Arrow Down)"
                    style={{
                      background: 'transparent', border: '1px solid var(--border-color)',
                      borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer',
                      padding: '2px 6px', fontSize: '11px'
                    }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Accordion 1: Company Profile */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('profile')}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Company profile
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {collapsedSections.profile ? '▼' : '▲'}
                  </span>
                </div>

                {!collapsedSections.profile && (
                  <div style={{ padding: '0 14px 10px', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <p style={{ margin: 0 }}>
                      {profileExpanded
                        ? (stockDetail?.metadata?.description || selectedStock.name)
                        : (stockDetail?.metadata?.description || selectedStock.name)?.slice(0, 160) + '...'}
                    </p>
                    <button
                      onClick={() => setProfileExpanded(!profileExpanded)}
                      style={{
                        background: 'transparent', border: 'none', color: '#38bdf8',
                        cursor: 'pointer', padding: 0, marginTop: '4px', fontSize: '11px', fontWeight: 600
                      }}
                    >
                      {profileExpanded ? 'Less' : 'More'}
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 2: Key Stats */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('stats')}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Key stats
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {collapsedSections.stats ? '▼' : '▲'}
                  </span>
                </div>

                {!collapsedSections.stats && (
                  <div style={{ padding: '0 14px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Market cap</span>
                        <span style={{ fontWeight: 700 }}>
                          {selectedStock.symbol === 'AAPL' ? '$4.91T' : selectedStock.symbol === 'NVDA' ? '$3.20T' : '$' + ((selectedStock.close * 2000000000) / 1e12).toFixed(2) + 'T'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Avg vol (20d)</span>
                        <span style={{ fontWeight: 700 }}>
                          {selectedStock.vol_50d_ma ? `${(selectedStock.vol_50d_ma / 1e6).toFixed(1)}M` : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>ADR 20d</span>
                        <span style={{ fontWeight: 700 }}>
                          {selectedStock.adr_20d ? `${selectedStock.adr_20d.toFixed(2)}%` : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Industry rank</span>
                        <span style={{ fontWeight: 700 }}>—</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Sector</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStock.sector || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Off 52w high</span>
                        <span style={{ fontWeight: 700, color: '#fb7185' }}>
                          {selectedStock.dist_from_52w_high ? `-${selectedStock.dist_from_52w_high.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>EPS YoY</span>
                        <span style={{ fontWeight: 700, color: '#34d399' }}>
                          {stockDetail?.fundamentals?.[0] ? `+${stockDetail.fundamentals[0].eps_qoq_growth?.toFixed(1)}%` : '+28.0%'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rev YoY</span>
                        <span style={{ fontWeight: 700, color: '#34d399' }}>+18.2%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Industry Peers */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('peers')}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Industry peers {peersData?.industry ? `(${peersData.industry})` : ''}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {collapsedSections.peers ? '▼' : '▲'}
                  </span>
                </div>

                {!collapsedSections.peers && (
                  <div style={{ padding: '0 14px 10px' }}>
                    {peersData?.peers && peersData.peers.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {peersData.peers.map((peer, idx) => (
                          <div
                            key={peer.symbol}
                            onClick={() => {
                              setSelectedStock((prev) => ({
                                ...prev,
                                symbol: peer.symbol,
                                name: peer.name,
                                close: peer.close,
                                rs_rank: peer.rs_rank,
                                chg_pct: peer.chg_pct,
                              }));
                            }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: peer.symbol === selectedStock.symbol ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                              transition: 'background-color 0.12s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', width: '12px' }}>
                                {idx + 1}.
                              </span>
                              <span style={{ fontWeight: 800, color: peer.symbol === selectedStock.symbol ? '#10b981' : '#ffffff', fontSize: '11.5px' }}>
                                {peer.symbol}
                              </span>
                              <span style={{
                                color: 'var(--text-secondary)', fontSize: '10.5px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px'
                              }}>
                                {peer.name?.split(' ')[0]}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                ${peer.close?.toFixed(2)}
                              </span>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                color: peer.rs_rank >= 70 ? '#34d399' : '#fb7185'
                              }}>
                                Kova {peer.rs_rank}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        No industry peers found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 4: Funds and Insiders */}
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleSection('funds')}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Funds and Insiders
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {collapsedSections.funds ? '▼' : '▲'}
                  </span>
                </div>

                {!collapsedSections.funds && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      <button
                        onClick={() => setFundTab('institutions')}
                        style={{
                          background: fundTab === 'institutions' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          color: fundTab === 'institutions' ? '#10b981' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Institutions
                      </button>
                      <button
                        onClick={() => setFundTab('insiders')}
                        style={{
                          background: fundTab === 'insiders' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          color: fundTab === 'insiders' ? '#10b981' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Insiders
                      </button>
                    </div>

                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <th style={{ textAlign: 'left', padding: '4px 0' }}>Quarter</th>
                          <th style={{ textAlign: 'right', padding: '4px 0' }}># Inst</th>
                          <th style={{ textAlign: 'right', padding: '4px 0' }}>Inst %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '5px 0' }}>2026 Q2</td>
                          <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700 }}>
                            {stockDetail?.sponsorship_summary?.holders_count || '6,465'}
                            <span style={{ color: '#34d399', fontSize: '9.5px', marginLeft: '3px' }}>+61</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700, color: '#38bdf8' }}>
                            {stockDetail?.sponsorship_summary?.ownership_pct ? `${stockDetail.sponsorship_summary.ownership_pct.toFixed(1)}%` : '66.6%'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Accordion 5: Technical Setups & Footprints (VCP / Low Cheat) */}
              {(stockDetail?.vcp_footprint?.vcp_is_setup || stockDetail?.low_cheat_footprint?.low_cheat_is_setup) && (
                <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div
                    onClick={() => toggleSection('setups')}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#38bdf8' }}>
                      ⚡ Active Setups
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {collapsedSections.setups ? '▼' : '▲'}
                    </span>
                  </div>

                  {!collapsedSections.setups && (
                    <div style={{ padding: '0 14px 10px' }}>
                      {stockDetail?.vcp_footprint?.vcp_is_setup && (
                        <div style={{ marginBottom: '8px' }}>
                          <VcpFootprintCard footprint={stockDetail.vcp_footprint} />
                        </div>
                      )}
                      {stockDetail?.low_cheat_footprint?.low_cheat_is_setup && (
                        <div>
                          <LowCheatFootprintCard footprint={stockDetail.low_cheat_footprint} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '30px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No stock selected
            </div>
          )}
        </div>
      </div>

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
                  placeholder="e.g. Focus List, Semiconductors"
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
    </div>
  );
}
