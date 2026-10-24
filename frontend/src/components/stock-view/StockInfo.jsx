import React, { useState, useMemo } from 'react';
import StockBrandIcon from '../StockBrandIcon';
import ThreeStopCalculatorModal from '../ThreeStopCalculatorModal';

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
  watchlists = [],
  targetWatchlistId = null,
  onTargetWatchlistChange = null,
  onToggleWatchlist = null,
  isWatchlistSaved = false,
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
  const rawName = stock?.name || stock?.company_name || stockDetail?.metadata?.name || '';
  const cleanName = useMemo(() => cleanCompanyName(rawName, symbol), [rawName, symbol]);

  const sector = stock?.sector || stockDetail?.metadata?.sector || stockDetail?.sector || '';
  const industry = stock?.industry || stockDetail?.metadata?.industry || stockDetail?.industry || '';

  // Telemetry metrics
  const rsRank = stock?.rs_rank ?? stockDetail?.rs_rank ?? null;
  const adrVal = stock?.adr_20d ?? stockDetail?.adr_20d ?? null;
  const tiVal = stockDetail?.ti_65 ?? stock?.ti_65 ?? null;

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

  // Earnings date badge
  const earningsBadge = useMemo(() => {
    const dt = stock?.next_earnings_date || stockDetail?.next_earnings_date || stockDetail?.metadata?.next_earnings_date;
    if (!dt) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dt + 'T00:00:00');
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let badgeSub = '';
      let isUrgent = false;

      if (diffDays === 0) {
        badgeSub = 'Today';
        isUrgent = true;
      } else if (diffDays === 1) {
        badgeSub = 'Tomorrow';
        isUrgent = true;
      } else if (diffDays > 1) {
        badgeSub = `in ${diffDays}d`;
        if (diffDays <= 7) isUrgent = true;
      } else {
        badgeSub = `${Math.abs(diffDays)}d ago`;
      }
      return { dateStr: dt, badgeSub, isUrgent, displayText: `Earning: ${dt} (${badgeSub})` };
    } catch {
      return { dateStr: dt, displayText: `Earning: ${dt}`, isUrgent: false };
    }
  }, [stock?.next_earnings_date, stockDetail?.next_earnings_date, stockDetail?.metadata?.next_earnings_date]);

  const targetWatchlist = useMemo(() => {
    if (!targetWatchlistId || !watchlists) return null;
    return watchlists.find((w) => w.id === targetWatchlistId) || null;
  }, [watchlists, targetWatchlistId]);

  // Three-Stop Risk Sizer state & derivations
  const [showCalcModal, setShowCalcModal] = useState(false);

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

  const isExtDanger = extAtrVal !== null && extAtrVal > 4.0;
  const isExtWarn = extAtrVal !== null && extAtrVal > 3.2 && extAtrVal <= 4.0;

  const entryPriceVal = latestPrice?.close ?? stock?.close ?? stockDetail?.close ?? null;
  const stopPriceVal = latestPrice?.low ?? stock?.low ?? null;
  const dollarAtrVal = useMemo(() => {
    const c = Number(entryPriceVal);
    const atrPct = Number(latestPrice?.atr_20d ?? stock?.atr_20d ?? stockDetail?.atr_20d ?? adrVal ?? 3.0);
    if (c > 0 && atrPct > 0) {
      return c * (atrPct / 100.0);
    }
    return null;
  }, [entryPriceVal, latestPrice, stock, stockDetail, adrVal]);

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

          {/* Target Watchlist Controls */}
          {watchlists && watchlists.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Target:</span>
              <select
                value={targetWatchlistId || ''}
                onChange={(e) => onTargetWatchlistChange?.(Number(e.target.value))}
                title="Target Watchlist (for saving/adding stocks)"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: 'var(--border-radius-md, 6px)',
                  padding: '5px 8px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {watchlists.map((w) => (
                  <option key={w.id} value={w.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                    ⭐️ {w.name} ({w.item_count || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          {onToggleWatchlist && (
            <button
              type="button"
              onClick={() => onToggleWatchlist(symbol)}
              disabled={!symbol}
              title={
                isWatchlistSaved
                  ? `Saved in "${targetWatchlist?.name || 'target watchlist'}" (Click or press W to remove)`
                  : `Save ${symbol || 'stock'} to "${targetWatchlist?.name || 'target watchlist'}" (Hotkey: W)`
              }
              aria-label={isWatchlistSaved ? 'Remove from watchlist' : 'Save to watchlist'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                padding: 0,
                borderRadius: '5px',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                background: isWatchlistSaved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: isWatchlistSaved ? '#34d399' : 'var(--text-secondary, #94a3b8)',
                border: isWatchlistSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color, #1e293b)',
                cursor: symbol ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              {isWatchlistSaved ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              )}
            </button>
          )}

          {/* Stop Position Sizer Calculator Button */}
          <button
            type="button"
            onClick={() => setShowCalcModal(true)}
            title="Open 2-Stop / 3-Stop Position Sizer & LoD Risk Calculator"
            aria-label="Stop Position Sizer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '28px',
              padding: '0 8px',
              borderRadius: '5px',
              boxSizing: 'border-box',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <span>🧮</span>
            <span>Stop Sizer</span>
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

        {/* 50-SMA ATR Extension (Jeff Sun Extension Guardrail) */}
        {extAtrVal !== null && (
          <span
            title={
              isExtDanger
                ? '⚠️ Extended > 4x ATR from 50 SMA (Jeff Sun Hard Guardrail: Avoid Focus List)'
                : isExtWarn
                ? 'Caution: Extended > 3.2x ATR from 50 SMA'
                : 'Extension from 50 SMA in multiples of 20-day ATR'
            }
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: isExtDanger
                ? 'rgba(239, 68, 68, 0.25)'
                : isExtWarn
                ? 'rgba(234, 179, 8, 0.2)'
                : 'rgba(16, 185, 129, 0.15)',
              color: isExtDanger ? '#f87171' : isExtWarn ? '#fde047' : '#34d399',
              border: `1px solid ${
                isExtDanger
                  ? 'rgba(239, 68, 68, 0.5)'
                  : isExtWarn
                  ? 'rgba(234, 179, 8, 0.4)'
                  : 'rgba(16, 185, 129, 0.3)'
              }`,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isExtDanger && <span>⚠️</span>}
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

        {/* TI65 (Trend Intensity) */}
        {tiVal !== null && tiVal !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: tiVal >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : tiVal < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.06)',
              color: tiVal >= 1.05 ? '#34d399' : tiVal < 0.95 ? '#f87171' : 'var(--text-secondary, #94a3b8)',
              border: `1px solid ${tiVal >= 1.05 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
              fontWeight: 600,
            }}
          >
            TI65: {Number(tiVal).toFixed(2)}
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

        {/* Next Earnings Date Badge */}
        {showEarningsBadge && earningsBadge && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700,
              background: earningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
              color: earningsBadge.isUrgent ? '#f87171' : '#c084fc',
              border: `1px solid ${earningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
            }}
            title={`Next Earnings Date: ${earningsBadge.dateStr}`}
          >
            {earningsBadge.displayText}
          </span>
        )}
      </div>

      {/* Jeff Sun 3-Stop Risk & Position Sizing Calculator Modal */}
      <ThreeStopCalculatorModal
        isOpen={showCalcModal}
        onClose={() => setShowCalcModal(false)}
        symbol={symbol}
        initialEntryPrice={entryPriceVal}
        initialStopPrice={stopPriceVal}
        initialAtr={dollarAtrVal}
      />
    </div>
  );
}

