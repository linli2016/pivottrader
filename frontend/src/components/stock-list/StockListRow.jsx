import React from 'react';
import StockBrandIcon from '../StockBrandIcon';

export const SETUP_TAG_META = {
  HTF: { id: 'HTF', label: 'HTF', name: 'High Tight Flag', icon: '⚡', color: '#f59e0b' },
  VCP: { id: 'VCP', label: 'VCP', name: 'VCP Base', icon: '📐', color: '#10b981' },
  IPO: { id: 'IPO', label: 'IPO', name: 'IPO Base', icon: '🐣', color: '#06b6d4' },
  EP: { id: 'EP', label: 'EP', name: 'Post EP', icon: '💥', color: '#ec4899' },
  SHORT: { id: 'SHORT', label: 'Short', name: 'Short Setup', icon: '🐻', color: '#f43f5e' },
  Others: { id: 'Others', label: 'Others', name: 'Others', icon: '📁', color: '#94a3b8' },
};

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
  targetWatchlistSymbols = null,
  targetWatchlistName = '',
  onToggleTargetWatchlist = null,
}) {
  const isTargetSaved = React.useMemo(() => {
    if (!targetWatchlistSymbols || !item.symbol) return false;
    const cleanSym = item.symbol.toUpperCase();
    return typeof targetWatchlistSymbols.has === 'function'
      ? targetWatchlistSymbols.has(cleanSym)
      : Array.isArray(targetWatchlistSymbols) && targetWatchlistSymbols.includes(cleanSym);
  }, [targetWatchlistSymbols, item.symbol]);

  const chg = item.today_pct !== undefined ? item.today_pct : item.chg_pct;
  const isPositive = chg !== null && chg !== undefined ? chg >= 0 : false;
  const rsVal = item.rs_rank;

  const normRsRaw = item.normalized_rs !== null && item.normalized_rs !== undefined ? Number(item.normalized_rs) : null;
  const normRs = normRsRaw !== null ? (Math.abs(normRsRaw) < 0.0001 ? 0 : normRsRaw) : null;
  const rsColor = normRs === null ? 'var(--text-muted, #94a3b8)' : normRs > 0 ? '#34d399' : normRs < 0 ? '#fb7185' : 'var(--text-secondary, #cbd5e1)';

  const hasRsBlueDot = item.is_rs_blue_dot || (item.setups && item.setups.includes('RS Blue Dot'));
  const [showTagTooltip, setShowTagTooltip] = React.useState(false);

  const matchedTooltipText = item.matched_setups && item.matched_setups.length > 0
    ? `Weekly Setups for ${item.symbol}:\n` + item.matched_setups.map(m => `• [${m.tag}] ${m.name}`).join('\n')
    : (item.setup_name ? `Setup: ${item.setup_name}` : item.symbol);

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
            cellStyle = { padding: '6px 8px', position: 'relative' };
            cellContent = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div
                  style={{ position: 'relative', display: 'inline-flex', cursor: item.matched_setups ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (item.matched_setups && item.matched_setups.length > 0) {
                      e.stopPropagation();
                      setShowTagTooltip(prev => !prev);
                    }
                  }}
                  title={matchedTooltipText}
                >
                  <StockBrandIcon symbol={item.symbol} size={18} />
                  {showTagTooltip && item.matched_setups && item.matched_setups.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '24px',
                        top: '-4px',
                        zIndex: 9999,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        color: '#f8fafc',
                        pointerEvents: 'auto',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '3px' }}>
                        <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '10.5px' }}>{item.symbol} Weekly Setups</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowTagTooltip(false); }}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                      {item.matched_setups.map((m, idx) => {
                        const tagMeta = SETUP_TAG_META[m.tag] || { icon: '📁', color: '#94a3b8' };
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '10.5px' }}>
                            <span style={{ color: tagMeta.color, fontWeight: 700 }}>{tagMeta.icon} [{m.tag}]</span>
                            <span style={{ color: '#cbd5e1' }}>{m.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '11.5px' }}>
                      {item.symbol}
                    </span>
                    {isTargetSaved && (
                      <span
                        style={{
                          fontSize: '11px',
                          cursor: onToggleTargetWatchlist ? 'pointer' : 'default',
                          lineHeight: 1,
                          filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.5))',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={`Saved in "${targetWatchlistName || 'target watchlist'}"${onToggleTargetWatchlist ? ' (Click to toggle)' : ''}`}
                        onClick={(e) => {
                          if (onToggleTargetWatchlist) {
                            e.stopPropagation();
                            onToggleTargetWatchlist(item.symbol);
                          }
                        }}
                      >
                        ⭐️
                      </span>
                    )}
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

          case 'ext_atr_50':
            const extAtr = item.ext_atr_50 !== undefined && item.ext_atr_50 !== null ? Number(item.ext_atr_50) : null;
            const isDanger = extAtr !== null && extAtr > 4.0;
            const isWarn = extAtr !== null && extAtr > 3.2 && extAtr <= 4.0;
            cellStyle = {
              textAlign: 'center',
              padding: '6px 6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
            };
            cellContent = extAtr !== null ? (
              <span
                title={isDanger ? '⚠️ Extended > 4x ATR from 50 SMA (Jeff Sun Hard Guardrail: Avoid Focus)' : 'Extension from 50 SMA in multiples of 20-day ATR'}
                style={{
                  fontSize: '10px',
                  padding: '1.5px 5px',
                  borderRadius: '4px',
                  background: isDanger ? 'rgba(239, 68, 68, 0.25)' : isWarn ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                  color: isDanger ? '#f87171' : isWarn ? '#fde047' : '#34d399',
                  border: isDanger ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {isDanger && <span style={{ fontSize: '9px' }}>⚠️</span>}
                {extAtr > 0 ? `+${extAtr.toFixed(1)}x` : `${extAtr.toFixed(1)}x`}
              </span>
            ) : (
              '—'
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
                title={`Remove ${item.symbol} from watchlist (Delete / Backspace)`}
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

