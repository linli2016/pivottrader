import React from 'react';
import CandlestickChart from './CandlestickChart';

export default function StockDetailDrawer({
  selectedStock,
  setSelectedStock,
  activeStockList = [],
  handleSelectStock,
  stockDetail,
  stockPrices,
  setActiveTab,
  setInspectorSymbol,
  handleInspectorSearch,
}) {
  const currentIndex = React.useMemo(() => {
    if (!activeStockList || activeStockList.length === 0 || !selectedStock) return -1;
    return activeStockList.findIndex(
      s => (s.symbol || s).toUpperCase() === selectedStock.symbol.toUpperCase()
    );
  }, [activeStockList, selectedStock]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < activeStockList.length - 1;

  const handlePrevStock = React.useCallback(() => {
    if (!canPrev || !handleSelectStock) return;
    const prevStock = activeStockList[currentIndex - 1];
    handleSelectStock(prevStock, activeStockList);
  }, [canPrev, currentIndex, activeStockList, handleSelectStock]);

  const handleNextStock = React.useCallback(() => {
    if (!canNext || !handleSelectStock) return;
    const nextStock = activeStockList[currentIndex + 1];
    handleSelectStock(nextStock, activeStockList);
  }, [canNext, currentIndex, activeStockList, handleSelectStock]);

  // Keyboard shortcuts: Escape to close, Left/Right arrow to navigate
  React.useEffect(() => {
    if (!selectedStock) return;
    const handleKeyDown = (e) => {
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

  // Clean company name
  const cleanName = (
    selectedStock?.name ||
    stockDetail?.metadata?.name ||
    selectedStock?.symbol ||
    ''
  ).replace(/\s*(?:Class\s+[A-Z]\s+)?(?:Common\s+Stock|Ordinary\s+Shares|ADS|ADR).*$/i, '')
   .replace(/\s*\(.*?par\s+value.*?\)/i, '')
   .replace(/\s*-\s*Common\s+Stock/i, '')
   .trim();

  // Exchange, Sector, Industry
  const exchange = stockDetail?.metadata?.exchange || selectedStock?.exchange || 'US';
  const sector = selectedStock?.sector || stockDetail?.metadata?.sector || 'Sector';
  const industry = selectedStock?.industry || stockDetail?.metadata?.industry || 'Industry';

  // Latest price & day change %
  const latestBar = stockPrices && stockPrices.length > 0 ? stockPrices[stockPrices.length - 1] : null;
  const prevBar = stockPrices && stockPrices.length > 1 ? stockPrices[stockPrices.length - 2] : null;
  const price = selectedStock?.close ?? latestBar?.close;
  const changePct = selectedStock?.change_pct ?? (
    latestBar && prevBar && prevBar.close ? ((latestBar.close - prevBar.close) / prevBar.close) * 100 : null
  );

  // Metrics matching screen result page (CandidatesTab)
  const rsRank = stockDetail?.rs_rank ?? selectedStock?.rs_rank ?? 'N/A';

  const hasBlueDot = Boolean(
    selectedStock?.is_rs_blue_dot ||
    stockDetail?.is_rs_blue_dot ||
    (selectedStock?.setups && selectedStock.setups.includes('RS Blue Dot')) ||
    (stockPrices && stockPrices.length > 0 && stockPrices.slice(-5).some(b => b.is_rs_blue_dot))
  );

  const adr = selectedStock?.adr_20d ?? stockDetail?.adr_20d ?? null;
  const atr = selectedStock?.atr_20d ?? stockDetail?.atr_20d ?? null;
  const ti65 = stockDetail?.ti_65 ?? selectedStock?.ti_65 ?? null;

  const isEtf = (stockDetail?.metadata?.asset_type === 'ETF') ||
                (selectedStock?.asset_type === 'ETF') ||
                (selectedStock?.asset_type && selectedStock.asset_type.toUpperCase().includes('ETF'));

  const instCount = stockDetail?.sponsorship_summary?.holders_count ??
                    stockDetail?.fundamentals?.[0]?.inst_holders_count ??
                    selectedStock?.inst_holders_count;
  const instQoq = stockDetail?.sponsorship_summary?.holders_qoq_change ??
                  stockDetail?.fundamentals?.[0]?.inst_holders_qoq_change ??
                  selectedStock?.inst_holders_qoq_change;
  const instStreak = stockDetail?.sponsorship_summary?.sponsorship_streak ??
                     stockDetail?.fundamentals?.[0]?.sponsorship_streak ??
                     selectedStock?.sponsorship_streak ?? 0;

  const ret1m = stockDetail?.ret_1m ?? selectedStock?.ret_1m ?? null;
  const ret3m = stockDetail?.ret_3m ?? selectedStock?.ret_3m ?? null;
  const ret6m = stockDetail?.ret_6m ?? selectedStock?.ret_6m ?? null;

  const earningsDateStr = stockDetail?.metadata?.next_earnings_date ||
                          stockDetail?.next_earnings_date ||
                          selectedStock?.next_earnings_date;

  let earningsBadge = null;
  if (earningsDateStr) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(earningsDateStr + 'T00:00:00');
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      earningsBadge = {
        dateStr: earningsDateStr,
        badgeSub,
        isUrgent,
        displayText: `Earning ${badgeSub}`
      };
    } catch (e) {
      earningsBadge = { dateStr: earningsDateStr, isUrgent: false, displayText: `Earning ${earningsDateStr}` };
    }
  }

  const handleOpenInspector = () => {
    const sym = selectedStock.symbol;
    setSelectedStock(null);
    if (setActiveTab) setActiveTab('inspector');
    if (setInspectorSymbol) setInspectorSymbol(sym);
    if (handleInspectorSearch) handleInspectorSearch(sym);
  };

  return (
    <div className="full-page-modal-backdrop" onClick={() => setSelectedStock(null)}>
      <div className="full-page-modal custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          {/* Left: Symbol + Company Name + Price + Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#34d399',
              letterSpacing: '-0.5px',
              margin: 0,
              lineHeight: 1.1,
              fontFamily: 'var(--font-mono)'
            }}>
              {selectedStock.symbol}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '320px'
                }} title={stockDetail?.metadata?.name || selectedStock.name}>
                  {cleanName}
                </span>

                {price !== null && price !== undefined && (
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ${Number(price).toFixed(2)}
                    {changePct !== null && changePct !== undefined && (
                      <span style={{
                        fontSize: '11.5px',
                        marginLeft: '5px',
                        fontWeight: 700,
                        color: changePct >= 0 ? '#34d399' : '#f87171'
                      }}>
                        {changePct >= 0 ? '+' : ''}{Number(changePct).toFixed(2)}%
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {exchange} • {sector} ({industry})
              </div>
            </div>
          </div>

          {/* Right: Stock Navigation & Inspector & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
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
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  padding: '0 4px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${activeStockList.length}` : ''}
                </span>
                <button
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

            {setActiveTab && handleInspectorSearch && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleOpenInspector}
                title="Open in Full Stock Inspector"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🔍 Inspector
              </button>
            )}

            <button
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
                transition: 'all 0.15s ease'
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Badges Bar (Exact same metric set as screen result page) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <span className="pill pill-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
            RS: {rsRank}
          </span>

          {hasBlueDot && (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: 'rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="RS Blue Dot: Relative Strength vs SPY hit a new 52-week high before price breakout"
            >
              🔵 RS Blue Dot
            </span>
          )}

          {adr !== null && adr !== undefined ? (
            <span className="pill" style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: adr >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)',
              color: adr >= 5.0 ? '#f59e0b' : '#60a5fa',
              border: adr >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
              fontWeight: 700
            }}>
              ADR%: {Number(adr).toFixed(2)}%
            </span>
          ) : atr !== null && atr !== undefined ? (
            <span className="pill" style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: 'rgba(59, 130, 246, 0.18)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontWeight: 600
            }}>
              ADTR: {Number(atr).toFixed(2)}%
            </span>
          ) : null}

          {ti65 !== null && ti65 !== undefined && (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: ti65 >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : ti65 < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                color: ti65 >= 1.05 ? '#34d399' : ti65 < 0.95 ? '#f87171' : 'var(--text-secondary)',
                border: ti65 >= 1.05 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 600
              }}
              title={`Stockbee Trend Intensity (TI65): ${Number(ti65).toFixed(2)}`}
            >
              TI65: {Number(ti65).toFixed(2)}
            </span>
          )}

          {!isEtf && (
            instCount !== null && instCount !== undefined ? (
              <span
                className="pill"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  background: (instStreak >= 2 || (instQoq > 0)) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.18)',
                  color: (instStreak >= 2 || (instQoq > 0)) ? '#22c55e' : '#38bdf8',
                  border: (instStreak >= 2 || (instQoq > 0)) ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700
                }}
                title={`Institutional Sponsorship: ${Number(instCount).toLocaleString()} funds`}
              >
                🏛️ Inst: {Number(instCount).toLocaleString()} {instQoq !== null && instQoq !== undefined ? `(${instQoq >= 0 ? '+' : ''}${instQoq} QoQ)` : ''}{instStreak >= 2 ? ` 🔥 +${instStreak}Q` : ''}
              </span>
            ) : instStreak >= 1 ? (
              <span
                className="pill"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  background: instStreak >= 2 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                  color: instStreak >= 2 ? '#22c55e' : '#60a5fa',
                  border: instStreak >= 2 ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                  fontWeight: 700
                }}
              >
                🏛️ {instStreak >= 2 ? '🔥 ' : ''}+{instStreak}Q Inst
              </span>
            ) : null
          )}

          {ret1m !== null && ret1m !== undefined && (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontWeight: 600
              }}
              title={`1-Month Return: ${Number(ret1m).toFixed(1)}%`}
            >
              1M: {ret1m >= 0 ? '+' : ''}{Number(ret1m).toFixed(1)}%
            </span>
          )}

          {ret3m !== null && ret3m !== undefined && (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                fontWeight: 600
              }}
              title={`3-Month Return: ${Number(ret3m).toFixed(1)}%`}
            >
              3M: {ret3m >= 0 ? '+' : ''}{Number(ret3m).toFixed(1)}%
            </span>
          )}

          {ret6m !== null && ret6m !== undefined && (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: 'rgba(236, 72, 153, 0.18)',
                color: '#f472b6',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                fontWeight: 600
              }}
              title={`6-Month Return: ${Number(ret6m).toFixed(1)}%`}
            >
              6M: {ret6m >= 0 ? '+' : ''}{Number(ret6m).toFixed(1)}%
            </span>
          )}

          {earningsBadge ? (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: '700',
                background: earningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                color: earningsBadge.isUrgent ? '#f87171' : '#c084fc',
                border: `1px solid ${earningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`
              }}
              title={`Next Earnings Date: ${earningsBadge.dateStr}`}
            >
              {earningsBadge.displayText}
            </span>
          ) : (
            <span
              className="pill"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: '500',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              title="Next Earnings Date: Unscheduled"
            >
              Earning: Unscheduled
            </span>
          )}
        </div>

        {/* Candlestick Chart Edge-to-Edge Container */}
        <div style={{
          background: 'var(--bg-primary, #090d16)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '6px 10px',
          height: '480px',
          minHeight: '480px',
          maxHeight: '480px',
          flexShrink: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <CandlestickChart
            data={stockPrices}
            symbol={selectedStock?.symbol}
            companyName={cleanName}
            asOfDate={selectedStock?.screen_date || null}
            height={468}
          />
        </div>
      </div>
    </div>
  );
}
