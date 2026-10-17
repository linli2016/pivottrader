import React, { useMemo } from 'react';
import StockBrandIcon from '../StockBrandIcon';

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
}) {
  const symbol = stock?.symbol || stock?.ticker || (typeof stock === 'string' ? stock : '');
  const rawName = stock?.name || stock?.company_name || stockDetail?.metadata?.name || '';
  const cleanName = useMemo(() => cleanCompanyName(rawName, symbol), [rawName, symbol]);

  const sector = stock?.sector || stockDetail?.metadata?.sector || stockDetail?.sector || '';
  const industry = stock?.industry || stockDetail?.metadata?.industry || stockDetail?.industry || '';

  // Telemetry metrics
  const rsRank = stock?.rs_rank ?? stockDetail?.rs_rank ?? null;
  const hasBlueDot = Boolean(
    stock?.is_rs_blue_dot ||
    stockDetail?.is_rs_blue_dot ||
    (stock?.setups && stock.setups.includes('RS Blue Dot')) ||
    (stockPrices && stockPrices.length > 0 && stockPrices.slice(-5).some((b) => b.is_rs_blue_dot))
  );

  const adrVal = stock?.adr_20d ?? stockDetail?.adr_20d ?? null;
  const tiVal = stockDetail?.ti_65 ?? stock?.ti_65 ?? null;

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

  // Active Setups
  const activeSetups = useMemo(() => {
    const list = [];
    if (setupName) list.push(setupName);
    if (Array.isArray(stock?.setups)) {
      stock.setups.forEach((s) => {
        if (s && !list.includes(s) && s !== 'RS Blue Dot') list.push(s);
      });
    }
    return list;
  }, [setupName, stock?.setups]);

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
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StockBrandIcon symbol={symbol} size={22} />
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.2px',
                lineHeight: 1.2,
              }}
            >
              {cleanName || symbol}
            </span>
            {loadingPrices && (
              <span
                className="spin-icon"
                style={{ fontSize: '13px', color: '#38bdf8' }}
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
              }}
            >
              🏛 {sector}
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
              }}
            >
              🏭 {industry}
            </button>
          )}
        </div>

        {/* Top Right Controls: Target Watchlist, Multi-Chart Toggle, Detail Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  ? `Saved in "${targetWatchlist?.name || 'target watchlist'}" (Click to remove)`
                  : `Save ${symbol || 'stock'} to "${targetWatchlist?.name || 'target watchlist'}"`
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

        {/* RS Blue Dot */}
        {hasBlueDot && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              fontWeight: 700,
            }}
          >
            🔵 RS Blue Dot
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

        {/* Active Setups */}
        {activeSetups.map((s) => (
          <span
            key={s}
            style={{
              fontSize: '10.5px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              fontWeight: 700,
              border: '1px solid rgba(56, 189, 248, 0.4)',
            }}
          >
            ⚡ {s}
          </span>
        ))}

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
        {earningsBadge && (
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
    </div>
  );
}

