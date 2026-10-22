import React from 'react';
import StockListRow from './StockListRow';

const COLUMN_DEFAULTS = {
  symbol: { label: 'Symbol', align: 'left', sortable: true, sortAsc: 'symbol', sortDesc: 'symbol_desc' },
  today_pct: { label: 'Today', align: 'right', sortable: true, sortAsc: 'chg_pct_asc', sortDesc: 'chg_pct_desc' },
  rs_rank: { label: 'RS', align: 'center', sortable: true, sortAsc: 'rs_rank_asc', sortDesc: 'rs_rank', tooltip: 'IBD Relative Strength Rank (1–99). Click to sort.' },
  ext_atr_50: { label: '50-ATR', align: 'center', sortable: true, sortAsc: 'ext_atr_50_asc', sortDesc: 'ext_atr_50_desc', tooltip: 'Extension from 50 SMA in multiples of 20-day ATR (Jeff Sun Guardrail <= 4x). Click to sort.' },
  rs_line: { label: 'RS Line', align: 'right', sortable: true, sortAsc: 'rs_line_asc', sortDesc: 'rs_line', tooltip: 'Normalized Relative Strength Line vs SPY [-1.00 to +1.00]. Click to sort.' },
  date: { label: 'Date', align: 'right', sortable: true, sortAsc: 'date_asc', sortDesc: 'date_desc' },
  price: { label: 'Price', align: 'right', sortable: true, sortAsc: 'price_asc', sortDesc: 'price_desc' },
  regime: { label: 'Regime', align: 'center', sortable: false },
  setups: { label: 'Setup', align: 'left', sortable: false },
  actions: { label: '', align: 'center', sortable: false, width: '28px' },
};

export default function StockListTable({
  items = [],
  columns = ['symbol', 'today_pct', 'rs_rank', 'rs_line', 'actions'],
  sortBy = 'symbol',
  onSortChange = () => {},
  isSelectMode = false,
  selectedSymbols = new Set(),
  onToggleSelectSymbol = () => {},
  onSelectAllToggle = () => {},
  selectedItem = null,
  selectedStock = null,
  selectedSymbol = null,
  checkIsSelected = null,
  onSelectStock = () => {},
  selectedRowRef = null,
  loading = false,
  loadingMessage = 'Loading stocks...',
  emptyMessage = 'No stocks found.',
  renderCell = null,
  renderRowActions = null,
  onRemoveSymbol = null,
}) {
  const handleSortClick = (colKey) => {
    const meta = COLUMN_DEFAULTS[colKey];
    if (!meta || !meta.sortable) return;

    if (colKey === 'date') {
      if (sortBy === 'date_asc' || sortBy === 'date') {
        onSortChange('date_desc');
      } else {
        onSortChange('date_asc');
      }
      return;
    }

    if (sortBy === meta.sortDesc) {
      onSortChange(meta.sortAsc);
    } else {
      onSortChange(meta.sortDesc);
    }
  };

  const getSortIndicator = (colKey) => {
    const meta = COLUMN_DEFAULTS[colKey];
    if (!meta || !meta.sortable) return '';
    if (sortBy === meta.sortAsc || (colKey === 'date' && sortBy === 'date')) return '↑';
    if (sortBy === meta.sortDesc) return '↓';
    return '';
  };

  const activeSym = (selectedSymbol || selectedItem?.symbol || '').toUpperCase();
  const colSpanTotal = columns.length + (isSelectMode ? 1 : 0);

  return (
    <div className="custom-scrollbar stock-list-table-wrapper">
      <table className="stock-list-table">
        <thead className="stock-list-thead">
          <tr>
            {isSelectMode && (
              <th style={{ width: '28px', padding: '6px 4px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedSymbols.size === items.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedSymbols.size > 0 && selectedSymbols.size < items.length;
                  }}
                  onChange={onSelectAllToggle}
                  title={selectedSymbols.size === items.length ? 'Deselect All' : 'Select All'}
                  style={{ cursor: 'pointer' }}
                />
              </th>
            )}

            {columns.map((colKey) => {
              const meta = COLUMN_DEFAULTS[colKey] || { label: colKey, align: 'left', sortable: false };
              const sortInd = getSortIndicator(colKey);

              return (
                <th
                  key={colKey}
                  className={`stock-list-th ${meta.sortable ? 'sortable' : ''}`}
                  style={{
                    textAlign: meta.align,
                    width: meta.width || 'auto',
                    padding: meta.align === 'left' ? '6px 8px' : '6px 6px',
                  }}
                  onClick={meta.sortable ? () => handleSortClick(colKey) : undefined}
                  title={meta.tooltip}
                >
                  {meta.label} {sortInd}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={colSpanTotal}
                style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted, #94a3b8)' }}
              >
                {loadingMessage}
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td
                colSpan={colSpanTotal}
                style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted, #94a3b8)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const sym = (item.symbol || '').toUpperCase();
              const isSelected = checkIsSelected
                ? checkIsSelected(item, idx)
                : selectedStock
                ? (item === selectedStock || (selectedStock.id !== undefined && item.id !== undefined && item.id === selectedStock.id))
                : selectedItem
                ? (item === selectedItem || (selectedItem.id !== undefined && item.id !== undefined && item.id === selectedItem.id))
                : activeSym
                ? activeSym === sym
                : false;
              const isChecked = selectedSymbols.has(item.symbol);

              return (
                <StockListRow
                  key={item.id !== undefined && item.id !== null ? `id_${item.id}` : `${sym}_${item.setup_date || item.date || ''}_${idx}`}
                  item={item}
                  index={idx}
                  isSelected={isSelected}
                  isSelectMode={isSelectMode}
                  isChecked={isChecked}
                  onToggleSelect={onToggleSelectSymbol}
                  onSelect={onSelectStock}
                  columns={columns}
                  renderCell={renderCell}
                  renderRowActions={renderRowActions}
                  onRemove={onRemoveSymbol}
                  rowRef={isSelected ? selectedRowRef : null}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

