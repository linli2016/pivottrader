import React from 'react';
import StockBrandIcon from '../StockBrandIcon';

export default function StockListRow({
  item,
  index = 0,
  isSelected = false,
  isSelectMode = false,
  isChecked = false,
  onToggleSelect = () => {},
  onSelect = () => {},
  columns = ['symbol', 'today_pct', 'rs_rank', 'rs_line', 'actions'],
  renderCell = null,
  renderRowActions = null,
  onRemove = null,
  rowRef = null,
}) {
  const chg = item.today_pct !== undefined ? item.today_pct : item.chg_pct;
  const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;
  const rsVal = item.rs_rank;

  const normRsRaw = item.normalized_rs !== null && item.normalized_rs !== undefined ? Number(item.normalized_rs) : null;
  const normRs = normRsRaw !== null ? (Math.abs(normRsRaw) < 0.0001 ? 0 : normRsRaw) : null;
  const rsColor = normRs === null ? 'var(--text-muted, #94a3b8)' : normRs > 0 ? '#34d399' : normRs < 0 ? '#fb7185' : 'var(--text-secondary, #cbd5e1)';

  const hasRsBlueDot = item.is_rs_blue_dot || (item.setups && item.setups.includes('RS Blue Dot'));

  return (
    <tr
      ref={rowRef}
      className={`stock-list-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item, index)}
    >
      {/* Checkbox column when multi-select mode is active */}
      {isSelectMode && (
        <td
          style={{ width: '28px', textAlign: 'center', padding: '6px 4px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onToggleSelect(item.symbol, e)}
            style={{ cursor: 'pointer' }}
          />
        </td>
      )}

      {columns.map((colKey) => {
        let cellContent = null;
        let cellStyle = { padding: '6px 6px' };

        switch (colKey) {
          case 'symbol':
            cellStyle = { padding: '6px 8px' };
            cellContent = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <StockBrandIcon symbol={item.symbol} size={18} />
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>
                      {item.symbol}
                    </span>
                    {item.badge && (
                      <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.name && item.showName && (
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted, #94a3b8)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                  )}
                </div>
              </div>
            );
            break;

          case 'today_pct':
            cellStyle = {
              textAlign: 'right',
              padding: '6px 6px',
              fontWeight: 700,
              color: chg === null || chg === undefined ? 'var(--text-muted, #94a3b8)' : isPositive ? '#34d399' : '#fb7185',
            };
            cellContent = chg !== null && chg !== undefined ? `${isPositive ? '+' : ''}${chg.toFixed(1)}%` : '—';
            break;

          case 'rs_rank':
            cellStyle = {
              textAlign: 'center',
              padding: '6px 6px',
              fontWeight: 800,
              color: rsVal >= 70 ? '#34d399' : rsVal <= 30 ? '#fb7185' : 'var(--text-secondary, #cbd5e1)',
            };
            cellContent = rsVal !== null && rsVal !== undefined ? rsVal : '—';
            break;

          case 'rs_line':
            cellStyle = {
              textAlign: 'right',
              padding: '6px 6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              color: rsColor,
            };
            cellContent = (
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                <span>
                  {normRs !== null
                    ? `${normRs > 0 ? '+' : ''}${normRs.toFixed(2)}`
                    : item.rs_line !== null && item.rs_line !== undefined
                    ? Number(item.rs_line).toFixed(2)
                    : '—'}
                </span>
                {hasRsBlueDot && (
                  <span title="RS Blue Dot (RS line at 52-week high)" style={{ fontSize: '10px' }}>
                    🔵
                  </span>
                )}
              </div>
            );
            break;

          case 'date':
            cellStyle = { textAlign: 'right', padding: '6px 6px', fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 500, whiteSpace: 'nowrap' };
            cellContent = item.setup_date || item.date || item.added_at || '—';
            break;

          case 'regime':
            cellStyle = { textAlign: 'center', padding: '6px 6px', whiteSpace: 'nowrap' };
            cellContent = item.market_regime ? (
              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary, #cbd5e1)', fontWeight: 600 }}>
                {item.market_regime === 'BULLISH'
                  ? '🟢 Bullish'
                  : item.market_regime === 'BEARISH'
                  ? '🔴 Bearish'
                  : '🟡 Caution'}
              </span>
            ) : (
              '—'
            );
            break;

          case 'price':
            const pVal = item.close !== undefined ? item.close : item.price;
            cellStyle = { textAlign: 'right', padding: '6px 6px', color: '#ffffff', fontWeight: 600 };
            cellContent = pVal !== null && pVal !== undefined ? `$${Number(pVal).toFixed(2)}` : '—';
            break;

          case 'setups':
            cellStyle = { padding: '4px 6px' };
            cellContent = item.setups && item.setups.length > 0 ? (
              <span
                style={{
                  fontSize: '8.5px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.setups[0]}
              </span>
            ) : null;
            break;

          case 'actions':
            cellStyle = { width: '28px', padding: '6px 4px', textAlign: 'center' };
            cellContent = renderRowActions ? (
              renderRowActions(item)
            ) : onRemove ? (
              <button
                type="button"
                className="stock-list-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.symbol, e);
                }}
                title={`Remove ${item.symbol}`}
              >
                ✕
              </button>
            ) : null;
            break;

          default:
            cellContent = item[colKey] !== undefined ? String(item[colKey]) : null;
            break;
        }

        // Allow custom cell renderer override
        if (renderCell) {
          const custom = renderCell(colKey, item, cellContent);
          if (custom !== undefined) {
            cellContent = custom;
          }
        }

        return (
          <td key={colKey} style={cellStyle}>
            {cellContent}
          </td>
        );
      })}
    </tr>
  );
}

