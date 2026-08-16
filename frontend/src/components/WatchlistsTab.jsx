import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function WatchlistsTab({ handleSelectStock, watchlists, fetchWatchlists }) {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(watchlists[0].id);
    }
  }, [watchlists]);

  const fetchItems = async (watchlistId) => {
    if (!watchlistId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${watchlistId}/items`);
      if (!res.ok) throw new Error('Failed to fetch watchlist items');
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWatchlistId) {
      fetchItems(selectedWatchlistId);
    }
  }, [selectedWatchlistId]);

  const handleCreateWatchlist = async (e) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create watchlist');
      const created = await res.json();
      setNewWatchlistName('');
      setShowCreateModal(false);
      await fetchWatchlists();
      setSelectedWatchlistId(created.id);
    } catch (e) {
      alert(`Error creating watchlist: ${e.message}`);
    }
  };

  const handleDeleteWatchlist = async (watchlistId, name) => {
    if (!window.confirm(`Are you sure you want to delete the watchlist "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${watchlistId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete watchlist');
      await fetchWatchlists();
      const remaining = watchlists.filter((w) => w.id !== watchlistId);
      if (remaining.length > 0) {
        setSelectedWatchlistId(remaining[0].id);
      } else {
        setSelectedWatchlistId(null);
      }
    } catch (e) {
      alert(`Error deleting watchlist: ${e.message}`);
    }
  };

  const handleRemoveItem = async (symbol) => {
    if (!selectedWatchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items/${symbol}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove item');
      setItems(items.filter((item) => item.symbol !== symbol));
      fetchWatchlists();
    } catch (e) {
      alert(`Error removing item: ${e.message}`);
    }
  };

  const handleExportTradingView = () => {
    if (items.length === 0) {
      alert('No stocks in this watchlist to export!');
      return;
    }
    const currentW = watchlists.find((w) => w.id === selectedWatchlistId);
    const wName = currentW ? currentW.name.replace(/\s+/g, '_') : 'Watchlist';
    const content = items
      .map((item) => (item.exchange ? `${item.exchange}:${item.symbol}` : item.symbol))
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PivotTrader_${wName}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);

  return (
    <div>
      {/* Header */}
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>PORTFOLIO & FOCUS</span>
            <span>•</span>
            <span>CUSTOM WATCHLISTS</span>
          </div>
          <h1>My Watchlists</h1>
          <p>Organize, track, and monitor your curated momentum stock watchlists</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleExportTradingView} disabled={items.length === 0}>
            Export to TradingView
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Watchlist
          </button>
        </div>
      </div>

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              margin: 'auto',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
              Create New Watchlist
            </h3>
            <form onSubmit={handleCreateWatchlist} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Watchlist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Breakout Candidates, Focus List"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newWatchlistName.trim()}>
                  Create Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Tabs & Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="segmented-control">
          {watchlists.map((w) => (
            <button
              key={w.id}
              className={`segmented-item ${selectedWatchlistId === w.id ? 'active' : ''}`}
              onClick={() => setSelectedWatchlistId(w.id)}
            >
              ⭐️ {w.name} ({w.item_count})
            </button>
          ))}
        </div>

        {activeWatchlist && activeWatchlist.name !== 'Default Watchlist' && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: '#fb7185' }}
            onClick={() => handleDeleteWatchlist(activeWatchlist.id, activeWatchlist.name)}
          >
            🗑️ Delete Watchlist
          </button>
        )}
      </div>

      {/* Watchlist Data Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
            {activeWatchlist?.name || 'Watchlist'} ({items.length} Saved Stocks)
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click any stock row to open detail chart</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            Loading watchlist items...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⭐️</div>
            No stocks in this watchlist yet.<br />
            Use <strong>Browse Mode</strong> in the Candidates Screen to quickly flip through stocks and add them!
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Symbol</th>
                  <th style={{ textAlign: 'left' }}>Company Name</th>
                  <th style={{ textAlign: 'left' }}>Sector</th>
                  <th style={{ textAlign: 'right' }}>Price ($)</th>
                  <th style={{ textAlign: 'right', color: '#34d399' }}>RS Rank</th>
                  <th style={{ textAlign: 'right' }}>Vol 50d MA</th>
                  <th style={{ textAlign: 'right' }}>Added Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.symbol} onClick={() => handleSelectStock(item)}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-color)', fontSize: '15px' }}>{item.symbol}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name || 'N/A'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.sector || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.close ? `$${item.close.toFixed(2)}` : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                      {item.rs_rank !== null && item.rs_rank !== undefined ? item.rs_rank : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {item.vol_50d_ma ? (item.vol_50d_ma / 1000).toFixed(0) + 'k' : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {item.added_at ? item.added_at.slice(0, 10) : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#fb7185', padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleRemoveItem(item.symbol)}
                        title="Remove stock from watchlist"
                      >
                        ✕ Remove
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
  );
}
