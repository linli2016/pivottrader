import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StockView from './stock-view';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function StockDetailDrawer({
  selectedStock,
  setSelectedStock,
  activeStockList = [],
  handleSelectStock,
  stockDetail,
  stockPrices,
  setActiveTab,
  watchlists = [],
  fetchWatchlists = null,
}) {
  const [targetWatchlistId, setTargetWatchlistId] = useState(() => watchlists?.[0]?.id || null);
  const [drawerTargetSymbols, setDrawerTargetSymbols] = useState(() => new Set());

  useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists, targetWatchlistId]);

  useEffect(() => {
    if (!targetWatchlistId) return;
    fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setDrawerTargetSymbols(new Set(data.map(i => (i.symbol || '').toUpperCase())));
        }
      })
      .catch(() => {});
  }, [targetWatchlistId]);

  const handleToggleWatchlist = useCallback(async (sym) => {
    if (!targetWatchlistId || !sym) return;
    const symUpper = sym.toUpperCase();
    const isSaved = drawerTargetSymbols.has(symUpper);

    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items/${encodeURIComponent(symUpper)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setDrawerTargetSymbols(prev => {
            const next = new Set(prev);
            next.delete(symUpper);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
        }
      } else {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: symUpper }),
        });
        if (res.ok) {
          setDrawerTargetSymbols(prev => {
            const next = new Set(prev);
            next.add(symUpper);
            return next;
          });
          if (fetchWatchlists) fetchWatchlists();
        }
      }
    } catch (e) {
      console.error('Error toggling watchlist:', e);
    }
  }, [targetWatchlistId, drawerTargetSymbols, fetchWatchlists]);

  const currentIndex = useMemo(() => {
    if (!activeStockList || activeStockList.length === 0 || !selectedStock) return -1;
    return activeStockList.findIndex(
      s => (s?.symbol || s).toUpperCase() === (selectedStock?.symbol || selectedStock).toUpperCase()
    );
  }, [activeStockList, selectedStock]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < activeStockList.length - 1;

  const handlePrevStock = useCallback(() => {
    if (!canPrev || !handleSelectStock) return;
    const prevStock = activeStockList[currentIndex - 1];
    handleSelectStock(prevStock, activeStockList);
  }, [canPrev, currentIndex, activeStockList, handleSelectStock]);

  const handleNextStock = useCallback(() => {
    if (!canNext || !handleSelectStock) return;
    const nextStock = activeStockList[currentIndex + 1];
    handleSelectStock(nextStock, activeStockList);
  }, [canNext, currentIndex, activeStockList, handleSelectStock]);

  // Keyboard shortcuts: Escape to close, Left/Right arrow to navigate
  useEffect(() => {
    if (!selectedStock) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === 'Escape') {
        setSelectedStock(null);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevStock();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextStock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStock, setSelectedStock, handlePrevStock, handleNextStock]);

  if (!selectedStock) return null;

  const handleOpenWatchlists = () => {
    const sym = selectedStock?.symbol || selectedStock;
    setSelectedStock(null);
    if (setActiveTab) setActiveTab('watchlists');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pt-inspect-stock', { detail: { symbol: sym } }));
    }, 50);
  };

  return (
    <div className="full-page-modal-backdrop" onClick={() => setSelectedStock(null)}>
      <div
        className="full-page-modal custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1440px',
          height: '92vh',
          maxHeight: '94vh',
          padding: '10px 14px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <StockView
          stock={selectedStock}
          prices={stockPrices}
          detail={stockDetail}
          asOfDate={selectedStock?.screen_date || null}
          marketRegime={selectedStock?.market_regime}
          watchlists={watchlists}
          targetWatchlistId={targetWatchlistId}
          targetWatchlistSymbols={drawerTargetSymbols}
          onTargetWatchlistChange={setTargetWatchlistId}
          onToggleWatchlist={handleToggleWatchlist}
          onSelectStock={(stk) => {
            const sym = stk?.symbol || stk;
            if (handleSelectStock && sym) {
              handleSelectStock({ symbol: sym }, activeStockList);
            }
          }}
          headerExtra={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeStockList && activeStockList.length > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrevStock}
                    disabled={!canPrev}
                    title="Previous Stock (← Arrow)"
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      height: '24px',
                      opacity: canPrev ? 1 : 0.4,
                      cursor: canPrev ? 'pointer' : 'not-allowed'
                    }}
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleNextStock}
                    disabled={!canNext}
                    title="Next Stock (→ Arrow)"
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      height: '24px',
                      opacity: canNext ? 1 : 0.4,
                      cursor: canNext ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Next ▶
                  </button>
                </div>
              )}

              {setActiveTab && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleOpenWatchlists}
                  title="Open in Watchlists"
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    height: '28px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📊 Watchlists
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedStock(null)}
                title="Close (Esc)"
                style={{
                  width: '28px',
                  height: '28px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>
          }
          style={{ flex: 1, minHeight: 0, height: '100%' }}
        />
      </div>
    </div>
  );
}
