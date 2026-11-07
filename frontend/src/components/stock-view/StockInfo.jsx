import React, { useState, useMemo, useEffect } from 'react';
import StockBrandIcon from '../StockBrandIcon';
import VanTharpCalculatorModal from '../VanTharpCalculatorModal';
import { FLAG_COLORS } from '../../utils/flagConstants';

export function cleanCompanyName(rawName, symbol) {
  if (!rawName) return symbol || '';
  return rawName
    .replace(/[\s,-]+(?:Class\s+[A-Z0-9]+\s+)?(?:Common\s+(?:Stock|Shares?|Units?)|Capital\s+Stock|Ordinary\s+Shares?|(?:American\s+)?Depositary\s+Shares?|ADS|ADR|Subordinated?\s+Voting\s+Shares?|Limited\s+Partnership\s+Units?).*$/i, '')
    .replace(/[\s,-]+(?:Common\s+(?:Stock|Shares?|Units?)|Capital\s+Stock|Ordinary\s+Shares?|(?:American\s+)?Depositary\s+Shares?).*$/i, '')
    .replace(/\s*\(.*?par\s+value.*?\)/i, '')
    .replace(/[\s,-]+Class\s+[A-Z0-9]+(?:\s+Common\s+(?:Stock|Shares?))?$/i, '')
    .replace(/[\s,-]+$/, '')
    .trim() || symbol || '';
}

/**
 * StockInfo - Header bar showing stock identity, sector/industry navigation,
 * watchlist actions, multi-chart/inspector toggles, and comprehensive telemetry badges.
 */
export default function StockInfo({
  stock,
  stockDetail = null,
  stockPrices = [],
  loadingPrices = false,
  // Watchlist props
  onToggleWatchlist = null,
  isWatchlistSaved = false,
  watchlistFlag = null,
  // Multi-chart toggle
  showMultiCharts = true,
  onToggleMultiCharts = null,
  // Inspector drawer toggle
  isDetailCollapsed = true,
  onToggleDetail = null,
  // Navigation / group callbacks
  onSelectGroup = null,
  // Setup / Market regime overrides
  asOfDate = null,
  setupName = null,
  marketRegime = null,
  // Optional extra header elements (non-counter)
  headerExtra = null,
  showEarningsBadge = true,
}) {
  const symbol = stock?.symbol || stock?.ticker || (typeof stock === 'string' ? stock : '');
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [showFlagPopup, setShowFlagPopup] = useState(false);

  useEffect(() => {
    setShowFlagPopup(false);
  }, [symbol]);

  const currentFlagDef = useMemo(() => {
    const activeColor = watchlistFlag || stock?.flag_color;
    return activeColor && FLAG_COLORS[activeColor] ? FLAG_COLORS[activeColor] : null;
  }, [watchlistFlag, stock?.flag_color]);
  const rawName = stock?.name || stock?.company_name || stockDetail?.metadata?.name || '';
  const cleanName = useMemo(() => cleanCompanyName(rawName, symbol), [rawName, symbol]);

  const sector = stock?.sector || stockDetail?.metadata?.sector || stockDetail?.sector || '';
  const industry = stock?.industry || stockDetail?.metadata?.industry || stockDetail?.industry || '';

  // Telemetry metrics
  const rsRank = stock?.rs_rank ?? stockDetail?.rs_rank ?? null;
  const adrVal = stock?.adr_20d ?? stockDetail?.adr_20d ?? null;
  const erVal = stock?.er_20d ?? stockDetail?.er_20d ?? stockDetail?.metrics?.er_20d ?? null;

  // Check if latest session completed a Pocket Pivot
  const latestIsPocketPivot = useMemo(() => {
    if (!stockPrices || stockPrices.length < 2) return false;
    const latest = stockPrices[stockPrices.length - 1];
    if (latest.is_pocket_pivot !== undefined) return Boolean(latest.is_pocket_pivot);
    const n = stockPrices.length;
    const curr = stockPrices[n - 1];
    const prev = stockPrices[n - 2];
    const prevClose = prev ? Number(prev.close) : Number(curr.open);
    const c = Number(curr.close);
    const o = Number(curr.open);
    const isUp = c > prevClose || (c === prevClose && c >= o);
    if (!isUp) return false;
    const vol = Number(curr.volume) || 0;
    let maxDown = 0;
    let hasDown = false;
    for (let j = Math.max(0, n - 11); j < n - 1; j++) {
      const b = stockPrices[j];
      const p = j > 0 ? stockPrices[j - 1] : null;
      const pC = p ? Number(p.close) : Number(b.open);
      const bC = Number(b.close);
      const bO = Number(b.open);
      if (bC < pC || (bC === pC && bC < bO)) {
        hasDown = true;
        const v = Number(b.volume) || 0;
        if (v > maxDown) maxDown = v;
      }
    }
    return (hasDown && vol > maxDown);
  }, [stockPrices]);

  // Institutional Sponsorship summary
  const instSummary = useMemo(() => {
    const s = stockDetail?.sponsorship_summary;
    const f = stockDetail?.fundamentals?.[0];
    const holdersCount = stock?.inst_holders_count ?? s?.holders_count ?? f?.inst_holders_count;
    const streak = stock?.sponsorship_streak ?? s?.sponsorship_streak ?? f?.sponsorship_streak ?? 0;
    return { holdersCount, streak };
  }, [stock, stockDetail]);

  const instHolders = instSummary?.holdersCount ?? null;
  const instStreak = instSummary?.streak ?? 0;

  // Performance returns
  const ret1m = stock?.ret_1m ?? stockDetail?.ret_1m ?? null;
  const ret3m = stock?.ret_3m ?? stockDetail?.ret_3m ?? null;
  const ret6m = stock?.ret_6m ?? stockDetail?.ret_6m ?? null;

  // Weinstein Stage
  const stageNum = stock?.stage_num ?? stockDetail?.stage_num ?? null;
  const stageName = stock?.stage_name ?? stockDetail?.stage_name ?? null;
  const stageBadge = stageNum ? `Stage ${stageNum}${stageName ? ` (${stageName})` : ''}` : null;
  const stageColor =
    stageNum === 2 ? '#10b981' : stageNum === 4 ? '#f43f5e' : stageNum === 1 ? '#38bdf8' : stageNum === 3 ? '#f59e0b' : null;

  // Market Regime
  const effectiveRegime = marketRegime || stock?.market_regime || null;

  const latestPrice = useMemo(() => {
    if (stockPrices && stockPrices.length > 0) {
      return stockPrices[stockPrices.length - 1];
    }
    return null;
  }, [stockPrices]);

  const extAtrVal = useMemo(() => {
    const val = stock?.ext_atr_50 ?? stockDetail?.ext_atr_50 ?? latestPrice?.ext_atr_50 ?? null;
    return val !== null && val !== undefined ? Number(val) : null;
  }, [stock?.ext_atr_50, stockDetail?.ext_atr_50, latestPrice?.ext_atr_50]);

  const isExtClimax = extAtrVal !== null && extAtrVal >= 10.0;
  const isExtTrim = extAtrVal !== null && extAtrVal >= 7.0 && extAtrVal < 10.0;
  const isExtDanger = extAtrVal !== null && extAtrVal > 4.0 && extAtrVal < 7.0;
  const isExtWarn = extAtrVal !== null && extAtrVal > 3.2 && extAtrVal <= 4.0;

  return (
    <div
      className="stock-view-info-header"
      style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-color, #1e293b)',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        background: 'var(--bg-secondary, #0f172a)',
        flexShrink: 0,
      }}
    >
      {/* Row 1: Stock Identity, Sector/Industry Pills, Target Watchlist, View Toggles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '12px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
            <StockBrandIcon symbol={symbol} size={22} />
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.2px',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '240px',
              }}
              title={cleanName || symbol}
            >
              {cleanName || symbol}
            </span>
            {loadingPrices && (
              <span
                className="spin-icon"
                style={{ fontSize: '13px', color: '#38bdf8', flexShrink: 0 }}
                title="Loading latest candles..."
              >
                ⟳
              </span>
            )}
          </div>

          {sector && sector !== 'Sector' && (
            <button
              type="button"
              onClick={() => onSelectGroup?.('sectors', sector)}
              title={`Click to view ${sector} Sector Stage Chart`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '5px',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: '#c084fc',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: onSelectGroup ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                maxWidth: '160px',
                minWidth: 0,
                flexShrink: 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ flexShrink: 0 }}>🏛</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sector}
              </span>
            </button>
          )}

          {industry && industry !== 'Industry' && (
            <button
              type="button"
              onClick={() => onSelectGroup?.('industries', industry)}
              title={`Click to view ${industry} Industry Stage Chart`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '5px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: onSelectGroup ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                maxWidth: 'clamp(140px, 18vw, 240px)',
                minWidth: 0,
                flexShrink: 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ flexShrink: 0 }}>🏭</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {industry}
              </span>
            </button>
          )}
        </div>

        {/* Top Right Controls: Target Watchlist, Multi-Chart Toggle, Detail Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {/* Optional page extra (non-counter) */}
          {headerExtra}

          {/* Watchlist Controls */}
          {onToggleWatchlist && (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowFlagPopup((prev) => !prev)}
                disabled={!symbol}
                title={
                  isWatchlistSaved
                    ? `Saved in Watchlist${currentFlagDef ? ` (${currentFlagDef.label})` : ''} - Click to change flag or remove (Hotkey: W)`
                    : `Add ${symbol || 'stock'} to Watchlist with flag color (Hotkey: W without flag)`
                }
                aria-label="Add to watchlist with flag color"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  height: '28px',
                  padding: isWatchlistSaved ? '0 9px' : '0 8px',
                  borderRadius: '5px',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease',
                  background: isWatchlistSaved
                    ? (currentFlagDef ? `${currentFlagDef.color}25` : 'rgba(16, 185, 129, 0.22)')
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isWatchlistSaved
                    ? (currentFlagDef ? currentFlagDef.color : '#34d399')
                    : 'var(--text-secondary, #94a3b8)',
                  border: isWatchlistSaved
                    ? `1px solid ${currentFlagDef ? currentFlagDef.color : 'rgba(16, 185, 129, 0.5)'}`
                    : '1px solid var(--border-color, #1e293b)',
                  cursor: symbol ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
              >
                {isWatchlistSaved ? (
                  <>
                    {currentFlagDef ? (
                      <span style={{ fontSize: '11px', lineHeight: 1 }}>⚑</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>
                      {currentFlagDef ? currentFlagDef.shortLabel : 'Saved'}
                    </span>
                    <span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '1px' }}>▼</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Watchlist</span>
                    <span style={{ fontSize: '8px', opacity: 0.7, marginLeft: '1px' }}>▼</span>
                  </>
                )}
              </button>

                {showFlagPopup && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                      onClick={() => setShowFlagPopup(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        right: 0,
                        zIndex: 9999,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '6px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.75)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '165px',
                        pointerEvents: 'auto',
                      }}
                    >
                      <div style={{ fontSize: '10px', color: '#94a3b8', padding: '3px 8px 4px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        Select Watchlist Flag:
                      </div>
                      {Object.values(FLAG_COLORS).map((f) => {
                        const isCurrent = (currentFlagDef?.id || watchlistFlag) === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              onToggleWatchlist(symbol, f.id);
                              setShowFlagPopup(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px 8px',
                              background: isCurrent ? `${f.color}25` : 'transparent',
                              border: isCurrent ? `1px solid ${f.color}60` : '1px solid transparent',
                              borderRadius: '5px',
                              color: isCurrent ? '#ffffff' : 'var(--text-secondary, #cbd5e1)',
                              fontSize: '11px',
                              fontWeight: isCurrent ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                              transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrent) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: f.color,
                                boxShadow: `0 0 5px ${f.color}80`,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{f.label}</span>
                            {isCurrent && <span style={{ color: f.color, fontSize: '10px' }}>✓</span>}
                          </button>
                        );
                      })}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          onToggleWatchlist(symbol, null);
                          setShowFlagPopup(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 8px',
                          background: isWatchlistSaved && !currentFlagDef ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                          border: '1px solid transparent',
                          borderRadius: '5px',
                          color: 'var(--text-muted, #94a3b8)',
                          fontSize: '11px',
                          fontWeight: isWatchlistSaved && !currentFlagDef ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isWatchlistSaved && !currentFlagDef ? 'rgba(255, 255, 255, 0.1)' : 'transparent')}
                      >
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>⚪</span>
                        <span style={{ flex: 1 }}>No Flag (Plain)</span>
                        {isWatchlistSaved && !currentFlagDef && <span style={{ fontSize: '10px' }}>✓</span>}
                      </button>

                      {isWatchlistSaved && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleWatchlist(symbol, 'REMOVE');
                            setShowFlagPopup(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '5px 8px',
                            background: 'transparent',
                            border: '1px solid transparent',
                            borderRadius: '5px',
                            color: '#fb7185',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontSize: '11px' }}>🗑️</span>
                          <span>Remove from Watchlist</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          {/* Position Sizing Calculator Button */}
          <button
            type="button"
            onClick={() => setShowRiskCalc(true)}
            disabled={!symbol}
            title="Position Calculator (1/2/3 Level Stops, 1R Risk, LoD Guardrail)"
            aria-label="Risk & Position Sizing Calculator"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '28px',
              padding: '0 8px',
              borderRadius: '5px',
              boxSizing: 'border-box',
              background: showRiskCalc ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: showRiskCalc ? '#34d399' : '#38bdf8',
              border: showRiskCalc ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.35)',
              cursor: symbol ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <path d="M16 10h.01" />
              <path d="M12 10h.01" />
              <path d="M8 10h.01" />
              <path d="M12 14h.01" />
              <path d="M8 14h.01" />
              <path d="M12 18h.01" />
              <path d="M8 18h.01" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Risk</span>
          </button>

          {/* Multi-Chart View (Daily + Monthly + Weekly) Toggle Button */}
          {onToggleMultiCharts && (
            <button
              type="button"
              onClick={onToggleMultiCharts}
              title={showMultiCharts ? 'Switch to Single Chart (Daily)' : 'Switch to 3-Charts Layout (Daily + Monthly + Weekly)'}
              aria-label={showMultiCharts ? 'Switch to Single Chart' : 'Switch to 3-Charts Layout'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                padding: 0,
                borderRadius: '5px',
                boxSizing: 'border-box',
                background: showMultiCharts ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: showMultiCharts ? '1px solid #c084fc' : '1px solid var(--border-color, #1e293b)',
                color: showMultiCharts ? '#c084fc' : 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="12" y1="12" x2="12" y2="21" />
                {showMultiCharts && (
                  <>
                    <rect x="3" y="3" width="18" height="9" rx="1" fill="currentColor" opacity="0.35" />
                    <rect x="3" y="12" width="9" height="9" rx="1" fill="currentColor" opacity="0.45" />
                    <rect x="12" y="12" width="9" height="9" rx="1" fill="currentColor" opacity="0.45" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* Toggle Stock Detail / Inspector Drawer Button */}
          {onToggleDetail && (
            <button
              type="button"
              onClick={onToggleDetail}
              title={isDetailCollapsed ? 'Show Stock Inspector & Deep Telemetry' : 'Collapse Stock Inspector'}
              aria-label={isDetailCollapsed ? 'Show Stock Inspector' : 'Collapse Stock Inspector'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                padding: 0,
                borderRadius: '5px',
                boxSizing: 'border-box',
                background: !isDetailCollapsed ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: !isDetailCollapsed ? '1px solid #38bdf8' : '1px solid var(--border-color, #1e293b)',
                color: !isDetailCollapsed ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
                {!isDetailCollapsed && (
                  <rect x="15" y="3" width="6" height="18" rx="1" fill="currentColor" opacity="0.4" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Badges Group (RS, Blue Dot, ADR%, TI65, Inst, Returns, Stage, Active Setups, Market Regime, Earnings) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* RS Rank */}
        {rsRank !== null && (
          <span
            className="pill pill-success"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              fontWeight: 800,
              background: rsRank >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: rsRank >= 70 ? '#34d399' : 'var(--text-secondary, #94a3b8)',
              border: `1px solid ${rsRank >= 70 ? '#10b981' : 'var(--border-color, #1e293b)'}`,
            }}
          >
            RS: {rsRank}
          </span>
        )}

        {/* 50-SMA ATR Extension (Jeff Sun Extension Guardrail & TradingView Parity) */}
        {extAtrVal !== null && (
          <span
            title={
              isExtClimax
                ? '🔥 Parabolic Climax >= 10x ATR from 50 SMA (Jeff Sun / TradingView Parity: Peak Climax Scale-Out)'
                : isExtTrim
                ? '⚠️ Overextended >= 7x ATR from 50 SMA (Jeff Sun Scale-Out Zone: Trim 30-50%)'
                : isExtDanger
                ? '⚠️ Extended > 4x ATR from 50 SMA (Jeff Sun Hard Guardrail: Avoid Chasing)'
                : isExtWarn
                ? '⚡ Approaching 50-SMA Extension threshold (> 3.2x ATR)'
                : '✓ Safe 50-SMA base distance (<= 3.2x ATR: Slingshot Coiled)'
            }
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: isExtClimax
                ? 'rgba(239, 68, 68, 0.3)'
                : isExtTrim
                ? 'rgba(249, 115, 22, 0.25)'
                : isExtDanger
                ? 'rgba(234, 179, 8, 0.22)'
                : isExtWarn
                ? 'rgba(234, 179, 8, 0.15)'
                : 'rgba(16, 185, 129, 0.15)',
              color: isExtClimax
                ? '#f87171'
                : isExtTrim
                ? '#fb923c'
                : isExtDanger
                ? '#fde047'
                : isExtWarn
                ? '#fef08a'
                : '#34d399',
              border: `1px solid ${
                isExtClimax
                  ? 'rgba(239, 68, 68, 0.6)'
                  : isExtTrim
                  ? 'rgba(249, 115, 22, 0.5)'
                  : isExtDanger
                  ? 'rgba(234, 179, 8, 0.45)'
                  : isExtWarn
                  ? 'rgba(234, 179, 8, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)'
              }`,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isExtClimax ? <span>🔥</span> : (isExtTrim || isExtDanger) ? <span>⚠️</span> : null}
            50-ATR: {extAtrVal > 0 ? `+${extAtrVal.toFixed(1)}x` : `${extAtrVal.toFixed(1)}x`}
          </span>
        )}

        {/* Latest Pocket Pivot Badge */}
        {latestIsPocketPivot && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(14, 165, 233, 0.22)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              fontWeight: 800,
              letterSpacing: '0.3px',
            }}
            title="Latest session completed a Pocket Pivot: up-day volume greater than highest down-day volume of the last 10 days"
          >
            ⚡ Pocket Pivot
          </span>
        )}

        {/* ADR% */}
        {adrVal !== null && adrVal !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: adrVal >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)',
              color: adrVal >= 5.0 ? '#f59e0b' : '#60a5fa',
              border: `1px solid ${adrVal >= 5.0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
              fontWeight: 700,
            }}
          >
            ADR%: {Number(adrVal).toFixed(2)}%
          </span>
        )}

        {/* ER20 (Kaufman / Stockbee Price Linearity) */}
        {erVal !== null && erVal !== undefined && (
          <span
            title="Kaufman 20-Day Fractal Efficiency Ratio (Stockbee Price Linearity). Range -1.0 to +1.0. >= +0.35 indicates low-friction institutional linear trend."
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: erVal >= 0.35 ? 'rgba(16, 185, 129, 0.2)' : erVal <= -0.30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: erVal >= 0.35 ? '#34d399' : erVal <= -0.30 ? '#f87171' : 'var(--text-secondary, #94a3b8)',
              border: `1px solid ${erVal >= 0.35 ? 'rgba(16, 185, 129, 0.4)' : erVal <= -0.30 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              fontWeight: erVal >= 0.35 || erVal <= -0.30 ? 700 : 600,
            }}
          >
            ER20: {erVal > 0 ? '+' : ''}{Number(erVal).toFixed(2)}{erVal >= 0.35 ? ' ⚡ Linear' : erVal <= -0.30 ? ' 🔻' : ''}
          </span>
        )}

        {/* Institutional Sponsorship */}
        {instHolders !== null && instHolders !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: instStreak >= 2 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              color: instStreak >= 2 ? '#22c55e' : '#38bdf8',
              border: `1px solid ${instStreak >= 2 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
              fontWeight: 700,
            }}
          >
            🏛️ Inst: {instHolders.toLocaleString()}{instStreak >= 2 ? ` 🔥 +${instStreak}Q` : ''}
          </span>
        )}

        {/* Returns: 1M, 3M, 6M */}
        {ret1m !== null && ret1m !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontWeight: 600,
            }}
          >
            1M: {ret1m >= 0 ? '+' : ''}{Number(ret1m).toFixed(1)}%
          </span>
        )}

        {ret3m !== null && ret3m !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              fontWeight: 600,
            }}
          >
            3M: {ret3m >= 0 ? '+' : ''}{Number(ret3m).toFixed(1)}%
          </span>
        )}

        {ret6m !== null && ret6m !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#f472b6',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              fontWeight: 600,
            }}
          >
            6M: {ret6m >= 0 ? '+' : ''}{Number(ret6m).toFixed(1)}%
          </span>
        )}

        {/* Weinstein Stage badge */}
        {stageBadge && (
          <span
            style={{
              fontSize: '10.5px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: stageColor ? `${stageColor}25` : 'rgba(16, 185, 129, 0.2)',
              color: stageColor || '#10b981',
              border: `1px solid ${stageColor || '#10b981'}55`,
              fontWeight: 800,
            }}
          >
            {stageBadge}
          </span>
        )}

        {/* Market Regime Badge */}
        {effectiveRegime && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background:
                effectiveRegime === 'BULLISH'
                  ? 'rgba(16, 185, 129, 0.18)'
                  : effectiveRegime === 'BEARISH'
                  ? 'rgba(244, 63, 94, 0.18)'
                  : 'rgba(245, 158, 11, 0.18)',
              color:
                effectiveRegime === 'BULLISH'
                  ? '#34d399'
                  : effectiveRegime === 'BEARISH'
                  ? '#fb7185'
                  : '#fbbf24',
              border: `1px solid ${
                effectiveRegime === 'BULLISH'
                  ? 'rgba(16, 185, 129, 0.35)'
                  : effectiveRegime === 'BEARISH'
                  ? 'rgba(244, 63, 94, 0.35)'
                  : 'rgba(245, 158, 11, 0.35)'
              }`,
              fontWeight: 700,
            }}
          >
            {effectiveRegime === 'BULLISH'
              ? '🟢 Bullish Tape'
              : effectiveRegime === 'BEARISH'
              ? '🔴 Bearish Tape'
              : '🟡 Caution Tape'}
          </span>
        )}

      </div>

      {/* Position Sizing Calculator Modal (Van Tharp 1R + 1/2/3 Level Stops) */}
      {showRiskCalc && symbol && (() => {
        const curPrice = latestPrice?.close ?? stock?.close ?? 50.0;
        const rawLod = latestPrice?.low ?? stock?.low ?? null;
        const lodPrice = rawLod !== null && !isNaN(Number(rawLod)) && Number(rawLod) < Number(curPrice)
          ? Number(rawLod)
          : Number((Number(curPrice) * 0.985).toFixed(2));
        const atrValue = latestPrice?.atr_20 ?? stock?.atr_20 ?? (adrVal && curPrice ? (Number(curPrice) * (Number(adrVal) / 100)) : null);

        return (
          <VanTharpCalculatorModal
            isOpen={showRiskCalc}
            onClose={() => setShowRiskCalc(false)}
            symbol={symbol}
            initialSymbol={symbol}
            companyName={cleanName}
            initialEntry={curPrice}
            initialStop={lodPrice}
            initialLod={rawLod}
            initialAtr={atrValue}
            initialDirection="LONG"
          />
        );
      })()}
    </div>
  );
}

