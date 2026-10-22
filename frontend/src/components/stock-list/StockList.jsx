import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import StockListHeader, { StockListBatchBar } from './StockListHeader';
import StockListFilter from './StockListFilter';
import StockListTable from './StockListTable';
import './StockList.css';

export default function StockList({
  // Items & Selection
  items = [],
  selectedStock = null,
  selectedSymbol = null,
  isItemSelected = null,
  onSelectStock = () => {},
  columns = ['symbol', 'today_pct', 'rs_rank', 'rs_line', 'actions'],

  // Sorting (controlled or uncontrolled)
  sortBy: controlledSortBy = null,
  onSortChange: controlledOnSortChange = null,
  defaultSortBy = 'symbol',

  // Industry Filtering (controlled or uncontrolled)
  showIndustryFilter = false,
  selectedIndustry: controlledSelectedIndustry = null,
  onIndustryChange: controlledOnIndustryChange = null,
  industryCounts: propIndustryCounts = null,
  totalCount: propTotalCount = null,
  filterExtra = null,

  // Quick Add Symbol
  showQuickAdd = false,
  onAddSymbol = null,
  isAddingSymbol = false,
  quickAddPlaceholder = '+ Add symbol (e.g. PLTR)',

  // Multi-Select Mode & Batch Actions
  enableSelectMode = false,
  hideHeaderSelectButton = false,
  hideSelectButton = false,
  isSelectMode: controlledIsSelectMode = null,
  onToggleSelectMode: controlledOnToggleSelectMode = null,
  selectedSymbols: controlledSelectedSymbols = null,
  onSelectionChange = null,

  watchlists = [],
  targetWatchlistId = null,
  onTargetWatchlistChange = null,
  onBatchAddToWatchlist = null,
  isAddingBatchToTarget = false,

  onBatchRemove = null,
  isDeletingItems = false,
  onClearAll = null,

  // Custom Slots & Extras
  headerExtra = null,
  batchActionsExtra = null,
  renderCell = null,
  renderRowActions = null,
  onRemoveSymbol = null,

  // State & Messages
  loading = false,
  loadingMessage = 'Loading stocks...',
  emptyMessage = 'No stocks found.',

  // Keyboard navigation & behavior
  enableKeyboardNav = true,
  enableVimNav = false,
  autoScrollSelected = true,
  className = '',
  style = {},
}) {
  // Internal sort state if uncontrolled
  const [internalSortBy, setInternalSortBy] = useState(defaultSortBy);
  const sortBy = controlledSortBy !== null ? controlledSortBy : internalSortBy;
  const setSortBy = controlledOnSortChange || setInternalSortBy;

  // Internal industry filter if uncontrolled
  const [internalSelectedIndustry, setInternalSelectedIndustry] = useState('ALL');
  const selectedIndustry = controlledSelectedIndustry !== null ? controlledSelectedIndustry : internalSelectedIndustry;
  const setSelectedIndustry = controlledOnIndustryChange || setInternalSelectedIndustry;

  // Internal select mode state if uncontrolled
  const [internalIsSelectMode, setInternalIsSelectMode] = useState(false);
  const isSelectMode = controlledIsSelectMode !== null ? controlledIsSelectMode : internalIsSelectMode;
  const toggleSelectMode = useCallback(() => {
    if (controlledOnToggleSelectMode) {
      controlledOnToggleSelectMode();
    } else {
      setInternalIsSelectMode((prev) => !prev);
    }
  }, [controlledOnToggleSelectMode]);

  // Internal selected symbols set if uncontrolled
  const [internalSelectedSymbols, setInternalSelectedSymbols] = useState(() => new Set());
  const selectedSymbols = controlledSelectedSymbols !== null ? controlledSelectedSymbols : internalSelectedSymbols;
  const updateSelectedSymbols = useCallback(
    (nextSet) => {
      if (onSelectionChange) {
        onSelectionChange(nextSet);
      }
      if (controlledSelectedSymbols === null) {
        setInternalSelectedSymbols(nextSet);
      }
    },
    [controlledSelectedSymbols, onSelectionChange]
  );

  // Clear selected symbols when exiting select mode
  useEffect(() => {
    if (!isSelectMode && selectedSymbols.size > 0) {
      updateSelectedSymbols(new Set());
    }
  }, [isSelectMode, selectedSymbols.size, updateSelectedSymbols]);

  // Compute industry breakdown with counts
  const computedIndustryCounts = useMemo(() => {
    if (!items || items.length === 0) return [];
    const counts = {};
    items.forEach((item) => {
      const ind = (item.industry || item.group_name || item.sector || '').trim() || 'Unclassified';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry));
  }, [items]);

  const industryCounts = propIndustryCounts || computedIndustryCounts;
  const effectiveTotalCount = propTotalCount !== null && propTotalCount !== undefined ? propTotalCount : items.length;

  // Filter items by selected industry
  const filteredItems = useMemo(() => {
    if (!selectedIndustry || selectedIndustry === 'ALL') {
      return items;
    }
    return items.filter((item) => {
      const ind = (item.industry || item.group_name || item.sector || '').trim() || 'Unclassified';
      return ind === selectedIndustry;
    });
  }, [items, selectedIndustry]);

  // Sort items according to sortBy
  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case 'symbol':
        return copy.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
      case 'symbol_desc':
        return copy.sort((a, b) => (b.symbol || '').localeCompare(a.symbol || ''));
      case 'chg_pct_desc':
        return copy.sort((a, b) => ((b.today_pct ?? b.chg_pct) ?? -999) - ((a.today_pct ?? a.chg_pct) ?? -999));
      case 'chg_pct_asc':
        return copy.sort((a, b) => ((a.today_pct ?? a.chg_pct) ?? 999) - ((b.today_pct ?? b.chg_pct) ?? 999));
      case 'rs_rank':
        return copy.sort((a, b) => (b.rs_rank ?? -999) - (a.rs_rank ?? -999));
      case 'rs_rank_asc':
        return copy.sort((a, b) => (a.rs_rank ?? 999) - (b.rs_rank ?? 999));
      case 'ext_atr_50_desc':
        return copy.sort((a, b) => (Number(b.ext_atr_50) || -999) - (Number(a.ext_atr_50) || -999));
      case 'ext_atr_50_asc':
        return copy.sort((a, b) => (Number(a.ext_atr_50) || 999) - (Number(b.ext_atr_50) || 999));
      case 'rs_line':
        return copy.sort((a, b) => {
          const valB = b.normalized_rs !== undefined && b.normalized_rs !== null ? b.normalized_rs : b.rs_line;
          const valA = a.normalized_rs !== undefined && a.normalized_rs !== null ? a.normalized_rs : a.rs_line;
          return (valB ?? -999999) - (valA ?? -999999);
        });
      case 'rs_line_asc':
        return copy.sort((a, b) => {
          const valB = b.normalized_rs !== undefined && b.normalized_rs !== null ? b.normalized_rs : b.rs_line;
          const valA = a.normalized_rs !== undefined && a.normalized_rs !== null ? a.normalized_rs : a.rs_line;
          return (valA ?? 999999) - (valB ?? 999999);
        });
      case 'date':
      case 'date_asc':
        return copy.sort((a, b) => {
          const dateA = a.setup_date || a.date || a.added_at || '';
          const dateB = b.setup_date || b.date || b.added_at || '';
          const cmp = String(dateA).localeCompare(String(dateB));
          if (cmp !== 0) return cmp;
          return (a.symbol || '').localeCompare(b.symbol || '');
        });
      case 'date_desc':
        return copy.sort((a, b) => {
          const dateA = a.setup_date || a.date || a.added_at || '';
          const dateB = b.setup_date || b.date || b.added_at || '';
          const cmp = String(dateB).localeCompare(String(dateA));
          if (cmp !== 0) return cmp;
          return (a.symbol || '').localeCompare(b.symbol || '');
        });
      case 'price_desc':
        return copy.sort((a, b) => ((b.close ?? b.price) ?? -999) - ((a.close ?? a.price) ?? -999));
      case 'price_asc':
        return copy.sort((a, b) => ((a.close ?? a.price) ?? 999) - ((b.close ?? b.price) ?? 999));
      case 'group_rs':
        return copy.sort((a, b) => (b.group_rs_rank ?? b.rs_rank ?? 0) - (a.group_rs_rank ?? a.rs_rank ?? 0));
      case 'added':
        return copy.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
      default:
        return copy;
    }
  }, [filteredItems, sortBy]);

  // Selection toggle handlers
  const handleToggleSelectSymbol = useCallback(
    (sym, e) => {
      e?.stopPropagation();
      const next = new Set(selectedSymbols);
      if (next.has(sym)) {
        next.delete(sym);
      } else {
        next.add(sym);
      }
      updateSelectedSymbols(next);
    },
    [selectedSymbols, updateSelectedSymbols]
  );

  const handleSelectAllToggle = useCallback(
    (e) => {
      if (e.target.checked) {
        updateSelectedSymbols(new Set(sortedItems.map((i) => i.symbol)));
      } else {
        updateSelectedSymbols(new Set());
      }
    },
    [sortedItems, updateSelectedSymbols]
  );

  // Determine if a row is selected
  const checkIsSelected = useCallback(
    (item, idx) => {
      if (isItemSelected) {
        return isItemSelected(item, idx);
      }
      if (selectedStock) {
        if (item === selectedStock) return true;
        if (selectedStock.id !== undefined && item.id !== undefined && item.id !== null && selectedStock.id !== null) {
          return item.id === selectedStock.id;
        }
        const itemSym = (item.symbol || '').toUpperCase();
        const selSym = (selectedStock.symbol || '').toUpperCase();
        if (itemSym && selSym && itemSym === selSym) {
          const itemDate = item.setup_date || item.date || item.screen_date;
          const selDate = selectedStock.setup_date || selectedStock.date || selectedStock.screen_date;
          if (itemDate || selDate) {
            return itemDate === selDate;
          }
          return true;
        }
        return false;
      }
      if (selectedSymbol) {
        return (item.symbol || '').toUpperCase() === selectedSymbol.toUpperCase();
      }
      return false;
    },
    [isItemSelected, selectedStock, selectedSymbol]
  );

  // Active Item Key & auto-scrolling
  const activeItemKey = useMemo(() => {
    if (selectedStock) {
      if (selectedStock.id !== undefined && selectedStock.id !== null) {
        return `id_${selectedStock.id}`;
      }
      const sym = (selectedStock.symbol || '').toUpperCase();
      const date = selectedStock.setup_date || selectedStock.date || selectedStock.screen_date || '';
      return `${sym}_${date}`;
    }
    if (selectedSymbol) {
      return (selectedSymbol || '').toUpperCase();
    }
    return '';
  }, [selectedStock, selectedSymbol]);

  const selectedRowRef = useRef(null);

  useEffect(() => {
    if (autoScrollSelected && selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeItemKey, autoScrollSelected]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      const isUp = e.key === 'ArrowUp' || (enableVimNav && (e.key === 'k' || e.key === 'K'));
      const isDown = e.key === 'ArrowDown' || (enableVimNav && (e.key === 'j' || e.key === 'J'));

      if (isUp || isDown) {
        if (!sortedItems || sortedItems.length === 0) return;
        e.preventDefault();

        const currentIdx = sortedItems.findIndex((item, idx) => checkIsSelected(item, idx));

        if (isUp) {
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : sortedItems.length - 1;
          onSelectStock(sortedItems[prevIdx], prevIdx);
        } else {
          const nextIdx = currentIdx >= 0 && currentIdx < sortedItems.length - 1 ? currentIdx + 1 : 0;
          onSelectStock(sortedItems[nextIdx], nextIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNav, enableVimNav, sortedItems, checkIsSelected, onSelectStock]);

  return (
    <div className={`stock-list-container ${className}`} style={style}>
      {/* 1. Header with Quick Add & Select button (if not hidden) */}
      <StockListHeader
        showQuickAdd={showQuickAdd}
        onAddSymbol={onAddSymbol}
        isAddingSymbol={isAddingSymbol}
        quickAddPlaceholder={quickAddPlaceholder}
        enableSelectMode={enableSelectMode}
        hideSelectButton={hideHeaderSelectButton || hideSelectButton}
        isSelectMode={isSelectMode}
        onToggleSelectMode={toggleSelectMode}
        headerExtra={headerExtra}
      />

      {/* 2. Industry Group Filter & Custom Filter bar */}
      <StockListFilter
        showIndustryFilter={showIndustryFilter}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        industryCounts={industryCounts}
        totalCount={effectiveTotalCount}
        filterExtra={filterExtra}
        isSelectMode={isSelectMode}
        toggleSelectMode={toggleSelectMode}
      />

      {/* 3. Batch Action Toolbar when select mode is active */}
      <StockListBatchBar
        isSelectMode={isSelectMode}
        totalItemsCount={sortedItems.length}
        selectedSymbols={selectedSymbols}
        onSelectAll={handleSelectAllToggle}
        watchlists={watchlists}
        targetWatchlistId={targetWatchlistId}
        onTargetWatchlistChange={onTargetWatchlistChange}
        onBatchAddToWatchlist={onBatchAddToWatchlist}
        isAddingBatchToTarget={isAddingBatchToTarget}
        onBatchRemove={onBatchRemove}
        isDeletingItems={isDeletingItems}
        onClearAll={onClearAll}
        batchActionsExtra={batchActionsExtra}
      />

      {/* 3. Table View */}
      <StockListTable
        items={sortedItems}
        columns={columns}
        sortBy={sortBy}
        onSortChange={setSortBy}
        isSelectMode={isSelectMode}
        selectedSymbols={selectedSymbols}
        onToggleSelectSymbol={handleToggleSelectSymbol}
        onSelectAllToggle={handleSelectAllToggle}
        selectedStock={selectedStock}
        selectedSymbol={selectedSymbol}
        checkIsSelected={checkIsSelected}
        onSelectStock={onSelectStock}
        selectedRowRef={selectedRowRef}
        loading={loading}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        renderCell={renderCell}
        renderRowActions={renderRowActions}
        onRemoveSymbol={onRemoveSymbol}
      />
    </div>
  );
}
