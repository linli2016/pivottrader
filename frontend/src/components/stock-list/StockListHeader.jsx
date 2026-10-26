import React, { useState } from 'react';

/**
 * StockListBatchBar - Multi-select bulk action toolbar
 * Renders batch actions (select all, add to target watchlist, batch delete, etc.)
 */
export function StockListBatchBar({
  isSelectMode = false,
  totalItemsCount = 0,
  selectedSymbols = new Set(),
  onSelectAll = null,
  watchlists = [],
  targetWatchlistId = null,
  onTargetWatchlistChange = null,
  onBatchAddToWatchlist = null,
  isAddingBatchToTarget = false,
  onBatchRemove = null,
  isDeletingItems = false,
  onClearAll = null,
  batchActionsExtra = null,
}) {
  const [copiedBatch, setCopiedBatch] = useState(false);

  if (!isSelectMode) return null;

  return (
    <div className="stock-list-batch-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={totalItemsCount > 0 && selectedSymbols.size === totalItemsCount}
            ref={(el) => {
              if (el) el.indeterminate = selectedSymbols.size > 0 && selectedSymbols.size < totalItemsCount;
            }}
            onChange={onSelectAll}
            style={{ cursor: 'pointer' }}
          />
          <span>
            {selectedSymbols.size === 0
              ? `Select All (${totalItemsCount})`
              : `${selectedSymbols.size} of ${totalItemsCount} selected`}
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* Add Selected to Target Watchlist */}
        {onBatchAddToWatchlist && watchlists && watchlists.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <select
              value={targetWatchlistId || ''}
              onChange={(e) => onTargetWatchlistChange && onTargetWatchlistChange(Number(e.target.value))}
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
                maxWidth: '120px',
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
              onClick={() => onBatchAddToWatchlist(targetWatchlistId, Array.from(selectedSymbols))}
              title={`Add selected ${selectedSymbols.size} stocks into target watchlist`}
              style={{
                background: selectedSymbols.size > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                border: selectedSymbols.size > 0 ? '1px solid #059669' : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                color: selectedSymbols.size > 0 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: selectedSymbols.size > 0 && !isAddingBatchToTarget ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>➕</span>
              <span>Add Selected {selectedSymbols.size > 0 ? `(${selectedSymbols.size})` : ''}</span>
            </button>
          </div>
        )}

        {/* Copy Selected for TradingView */}
        <button
          type="button"
          disabled={selectedSymbols.size === 0}
          onClick={async () => {
            if (selectedSymbols.size === 0) return;
            const commaStr = Array.from(selectedSymbols).map((s) => String(s).toUpperCase()).join(', ');
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(commaStr);
                setCopiedBatch(true);
                setTimeout(() => setCopiedBatch(false), 2000);
                return;
              }
            } catch (_) {}
            try {
              const textarea = document.createElement('textarea');
              textarea.value = commaStr;
              textarea.style.position = 'fixed';
              textarea.style.opacity = '0';
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();
              const ok = document.execCommand('copy');
              document.body.removeChild(textarea);
              if (ok) {
                setCopiedBatch(true);
                setTimeout(() => setCopiedBatch(false), 2000);
                return;
              }
            } catch (_) {}
            prompt('Copy comma-separated symbols for TradingView:', commaStr);
          }}
          title="Copy selected symbols to clipboard (comma-separated for TradingView)"
          style={{
            background: copiedBatch ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.15)',
            border: copiedBatch ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.35)',
            color: copiedBatch ? '#34d399' : '#38bdf8',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: selectedSymbols.size > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
            opacity: selectedSymbols.size > 0 ? 1 : 0.4
          }}
        >
          <span>{copiedBatch ? '✓' : '📋'}</span>
          <span>{copiedBatch ? 'Copied!' : `Copy TV (${selectedSymbols.size})`}</span>
        </button>

        {/* Remove Selected */}
        {onBatchRemove && (
          <button
            type="button"
            disabled={selectedSymbols.size === 0 || isDeletingItems}
            onClick={() => onBatchRemove(Array.from(selectedSymbols))}
            title="Remove selected stocks"
            style={{
              background: selectedSymbols.size > 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
              border: selectedSymbols.size > 0 ? '1px solid #dc2626' : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
              color: selectedSymbols.size > 0 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: selectedSymbols.size > 0 && !isDeletingItems ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🗑️</span>
            <span>Remove Selected</span>
          </button>
        )}

        {/* Clear All */}
        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={totalItemsCount === 0 || isDeletingItems}
            title="Remove all stocks from this list"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: totalItemsCount > 0 && !isDeletingItems ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            Remove All
          </button>
        )}

        {batchActionsExtra}
      </div>
    </div>
  );
}

/**
 * StockListHeader - Top header toolbar (Quick Add symbol & Select button)
 */
export default function StockListHeader({
  // Quick Add
  showQuickAdd = false,
  onAddSymbol = null,
  isAddingSymbol = false,
  quickAddPlaceholder = '+ Add symbol (e.g. PLTR)',

  // Select Mode
  enableSelectMode = false,
  hideSelectButton = false,
  isSelectMode = false,
  onToggleSelectMode = null,
  headerExtra = null,
}) {
  const [inputVal, setInputVal] = useState('');

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const sym = inputVal.trim().toUpperCase();
    if (!sym || !onAddSymbol) return;
    try {
      await onAddSymbol(sym);
      setInputVal('');
    } catch (_) {
      // Handled by parent
    }
  };

  const hasTopBar = showQuickAdd || (enableSelectMode && !hideSelectButton) || headerExtra;
  if (!hasTopBar) return null;

  return (
    <div className="stock-list-header">
      {showQuickAdd && (
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '6px', flex: 1 }}>
          <input
            type="text"
            placeholder={quickAddPlaceholder}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#ffffff',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isAddingSymbol || !inputVal.trim()}
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: isAddingSymbol || !inputVal.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Add
          </button>
        </form>
      )}

      {headerExtra}

      {enableSelectMode && !hideSelectButton && (
        <button
          type="button"
          onClick={onToggleSelectMode}
          style={{
            background: isSelectMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: isSelectMode ? '1px solid #38bdf8' : '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            color: isSelectMode ? '#38bdf8' : 'var(--text-secondary, #cbd5e1)',
            borderRadius: '4px',
            padding: '3px 7px',
            fontSize: '10.5px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {isSelectMode ? 'Done' : 'Select'}
        </button>
      )}
    </div>
  );
}
