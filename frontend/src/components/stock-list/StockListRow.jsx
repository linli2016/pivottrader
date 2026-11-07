import React from 'react';
import StockBrandIcon from '../StockBrandIcon';
import { FLAG_COLORS } from '../../utils/flagConstants';

export const SETUP_TAG_META = {
  BO: { id: 'BO', label: 'BO', name: 'Breakout', icon: '⚡', color: '#f59e0b' },
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
  onToggleTargetWatchlist = null,
  onUpdateFlag = null,
}) {
  const [showFlagPicker, setShowFlagPicker] = React.useState(false);
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
          case 'flag': {
            const currentFlag = item.flag_color ? FLAG_COLORS[item.flag_color] : null;
            cellStyle = { width: '32px', textAlign: 'center', padding: '4px 2px', position: 'relative' };
            cellContent = (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFlagPicker((prev) => !prev);
                  }}
                  title={
                    currentFlag
                      ? `${currentFlag.label}${item.added_at ? ` • Added ${item.added_at.slice(0, 16)}` : ''} (Click to change/clear flag)`
                      : `Flag stock${item.added_at ? ` • Added ${item.added_at.slice(0, 16)}` : ''} (Click to set color)`
                  }
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: onUpdateFlag ? 'pointer' : 'default',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    color: currentFlag ? currentFlag.color : 'var(--text-muted, #64748b)',
                    opacity: currentFlag ? 1 : 0.3,
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!currentFlag) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { if (!currentFlag) e.currentTarget.style.opacity = '0.3'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={currentFlag ? currentFlag.color : 'none'} stroke={currentFlag ? currentFlag.color : 'currentColor'} strokeWidth="2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </button>

                {showFlagPicker && onUpdateFlag && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFlagPicker(false);
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '26px',
                        top: '-8px',
                        zIndex: 9999,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        pointerEvents: 'auto',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.values(FLAG_COLORS).map((f) => {
                        const isThisFlag = item.flag_color === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateFlag(item.symbol, f.id);
                              setShowFlagPicker(false);
                            }}
                            title={`${f.label} (${f.shortLabel})`}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: f.color,
                              border: isThisFlag ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                              transform: isThisFlag ? 'scale(1.15)' : 'scale(1)',
                              boxShadow: isThisFlag ? `0 0 6px ${f.color}` : 'none',
                              padding: 0,
                            }}
                          />
                        );
                      })}
                      {item.flag_color && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateFlag(item.symbol, null);
                            setShowFlagPicker(false);
                          }}
                          title="Clear Flag"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '1px 3px',
                            marginLeft: '2px',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
            break;
          }

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
                          lineHeight: 1,
                          filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.5))',
                          display: 'inline-flex',
                          alignItems: 'center',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                        title="Saved in Watchlist"
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

          case 'proj_rvol':
            const pRvol = item.proj_rvol !== undefined && item.proj_rvol !== null
              ? Number(item.proj_rvol)
              : (item.rel_vol_50d !== undefined && item.rel_vol_50d !== null ? Number(item.rel_vol_50d) : null);
            const isHighRvol = pRvol !== null && pRvol >= 1.5;
            cellStyle = {
              textAlign: 'right',
              padding: '6px 6px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              color: pRvol === null ? 'var(--text-muted, #94a3b8)' : isHighRvol ? '#34d399' : 'var(--text-secondary, #cbd5e1)',
            };
            cellContent = pRvol !== null ? `${pRvol.toFixed(1)}x` : '—';
            break;

          case 'eps_growth': {
            const epsYoY = item.eps_qoq_growth !== undefined && item.eps_qoq_growth !== null ? Number(item.eps_qoq_growth) : null;
            const epsColor = epsYoY === null
              ? 'var(--text-muted, #94a3b8)'
              : epsYoY >= 100
              ? '#fbbf24'
              : epsYoY >= 40
              ? '#34d399'
              : epsYoY >= 0
              ? '#cbd5e1'
              : '#fb7185';
            cellStyle = {
              textAlign: 'right',
              padding: '6px 5px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10.5px',
              fontWeight: 700,
              color: epsColor,
              whiteSpace: 'nowrap',
            };
            cellContent = epsYoY !== null
              ? `${epsYoY >= 0 ? '+' : ''}${Math.abs(epsYoY) >= 999 ? `${Math.round(epsYoY)}%` : `${epsYoY.toFixed(0)}%`}`
              : '—';
            break;
          }

          case 'sales_growth': {
            const salesYoY = item.sales_yoy_growth !== undefined && item.sales_yoy_growth !== null ? Number(item.sales_yoy_growth) : null;
            const salesColor = salesYoY === null
              ? 'var(--text-muted, #94a3b8)'
              : salesYoY >= 100
              ? '#fbbf24'
              : salesYoY >= 40
              ? '#34d399'
              : salesYoY >= 0
              ? '#cbd5e1'
              : '#fb7185';
            cellStyle = {
              textAlign: 'right',
              padding: '6px 5px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10.5px',
              fontWeight: 700,
              color: salesColor,
              whiteSpace: 'nowrap',
            };
            cellContent = salesYoY !== null
              ? `${salesYoY >= 0 ? '+' : ''}${Math.abs(salesYoY) >= 999 ? `${Math.round(salesYoY)}%` : `${salesYoY.toFixed(0)}%`}`
              : '—';
            break;
          }

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

