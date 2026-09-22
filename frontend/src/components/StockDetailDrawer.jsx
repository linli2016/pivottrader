import React from 'react';
import CandlestickChart from './CandlestickChart';
import VcpFootprintCard from './VcpFootprintCard';
import LowCheatFootprintCard from './LowCheatFootprintCard';

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
  const [financials, setFinancials] = React.useState(null);
  const [loadingFinancials, setLoadingFinancials] = React.useState(false);

  const earningsDateStr = financials?.next_earnings_date || stockDetail?.next_earnings_date || stockDetail?.metadata?.next_earnings_date || selectedStock?.next_earnings_date;

  const earningsBadgeInfo = React.useMemo(() => {
    if (!earningsDateStr) return null;
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
      
      return {
        dateStr: earningsDateStr,
        badgeSub,
        diffDays,
        isUrgent,
        fullDisplay: `${earningsDateStr} (${badgeSub})`
      };
    } catch (e) {
      return { dateStr: earningsDateStr, fullDisplay: earningsDateStr, isUrgent: false };
    }
  }, [earningsDateStr]);

  const isEtf = React.useMemo(() => {
    return stockDetail?.metadata?.asset_type === 'ETF' || selectedStock?.asset_type === 'ETF';
  }, [stockDetail, selectedStock]);

  const instInfo = React.useMemo(() => {
    if (isEtf) return null;
    const summary = stockDetail?.sponsorship_summary;
    const latestFund = stockDetail?.fundamentals?.[0];
    const holdersCount = summary?.holders_count ?? latestFund?.inst_holders_count ?? selectedStock?.inst_holders_count;
    const qoqChange = summary?.holders_qoq_change ?? latestFund?.inst_holders_qoq_change ?? selectedStock?.inst_holders_qoq_change;
    const growthPct = summary?.holders_growth_pct ?? (
      holdersCount && qoqChange !== null && qoqChange !== undefined && (holdersCount - qoqChange > 0)
        ? ((qoqChange * 100) / (holdersCount - qoqChange))
        : null
    );
    const streak = summary?.sponsorship_streak ?? latestFund?.sponsorship_streak ?? selectedStock?.sponsorship_streak ?? 0;
    const ownershipPct = summary?.ownership_pct ?? latestFund?.inst_ownership_pct ?? selectedStock?.inst_ownership_pct;

    if (holdersCount === null || holdersCount === undefined) return null;
    return {
      holdersCount,
      qoqChange,
      growthPct,
      streak,
      ownershipPct
    };
  }, [stockDetail, selectedStock, isEtf]);

  const currentIndex = React.useMemo(() => {
    if (!activeStockList || activeStockList.length === 0 || !selectedStock) return -1;
    return activeStockList.findIndex(
      s => (s.symbol || s).toUpperCase() === selectedStock.symbol.toUpperCase()
    );
  }, [activeStockList, selectedStock]);

  const handlePrevStock = React.useCallback(() => {
    if (currentIndex <= 0 || !activeStockList.length || !handleSelectStock) return;
    const prevStock = activeStockList[currentIndex - 1];
    handleSelectStock(prevStock, activeStockList);
  }, [currentIndex, activeStockList, handleSelectStock]);

  const handleNextStock = React.useCallback(() => {
    if (currentIndex < 0 || currentIndex >= activeStockList.length - 1 || !handleSelectStock) return;
    const nextStock = activeStockList[currentIndex + 1];
    handleSelectStock(nextStock, activeStockList);
  }, [currentIndex, activeStockList, handleSelectStock]);

  React.useEffect(() => {
    if (!selectedStock?.symbol) {
      setFinancials(null);
      return;
    }
    setLoadingFinancials(true);
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    fetch(`${API_BASE}/api/stocks/${selectedStock.symbol}/financials`)
      .then(res => res.json())
      .then(data => {
        setFinancials(data);
        setLoadingFinancials(false);
      })
      .catch(e => {
        console.error("Error loading financials:", e);
        setLoadingFinancials(false);
      });
  }, [selectedStock?.symbol]);

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

  const [activeBottomTab, setActiveBottomTab] = React.useState('quarterly');

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

  // Metrics computation for KovaView HUD
  const rvol = selectedStock?.rvol ?? (
    stockPrices && stockPrices.length > 50
      ? (stockPrices[stockPrices.length - 1].volume / (stockPrices.slice(-50).reduce((acc, b) => acc + (b.volume || 0), 0) / 50))
      : null
  );
  const volRatioPct = rvol !== null && rvol !== undefined ? Math.round(rvol * 100) : null;
  const isVolSurge = rvol !== null && rvol >= 1.5;
  const isVolExpanding = rvol !== null && rvol >= 1.1 && rvol < 1.5;
  const isVolDryUp = rvol !== null && rvol <= 0.6;

  const pivotRs = selectedStock?.pivot_rs ?? stockDetail?.rs_rank ?? null;
  const rsShift = selectedStock?.rs_shift ?? 0;
  const extAtr = selectedStock?.ext_atr_10ema !== undefined && selectedStock?.ext_atr_10ema !== null
    ? selectedStock.ext_atr_10ema
    : null;
  const adr20 = selectedStock?.adr_20d ?? stockDetail?.atr_20d ?? null;
  const ti65 = stockDetail?.ti_65 ?? null;

  const vcp = stockDetail?.vcp_footprint;
  const cheat = stockDetail?.low_cheat_footprint;
  const hasVcp = vcp?.vcp_is_setup;
  const hasCheat = cheat?.low_cheat_is_setup;

  const industryName = selectedStock?.industry || stockDetail?.metadata?.industry || 'N/A';
  const sectorName = selectedStock?.sector || stockDetail?.metadata?.sector || 'N/A';
  const top20ClusterCount = selectedStock?.top_20_group_count ?? 0;

  const formatCompactNum = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatVolume = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return Number(val).toLocaleString();
  };

  return (
    <div className="full-page-modal-backdrop" onClick={() => setSelectedStock(null)}>
      <div className="full-page-modal custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        {/* KovaView Pro Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          gap: '12px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          {/* Left: Ticker & Clean Company Name & Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#10b981',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.5px',
              lineHeight: 1
            }}>
              {selectedStock.symbol}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '320px'
              }} title={stockDetail?.metadata?.name || selectedStock.name}>
                {cleanName}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{stockDetail?.metadata?.exchange || selectedStock.exchange || 'US'}</span>
                <span>•</span>
                <span>{sectorName}</span>
                <span>→</span>
                <span style={{ color: '#c084fc', fontWeight: '500' }}>{industryName}</span>
              </div>
            </div>
          </div>

          {/* Center: Quick Glance Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* RS */}
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              RS: {stockDetail?.rs_rank ?? selectedStock?.rs_rank ?? 'N/A'}
            </span>

            {/* PRS */}
            {pivotRs !== null && (
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                background: pivotRs >= 90 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                color: pivotRs >= 90 ? '#10b981' : 'var(--text-primary)',
                border: `1px solid ${pivotRs >= 90 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
              }}>
                PRS: {pivotRs}
                {rsShift > 0 ? (
                  <span style={{ color: '#10b981', marginLeft: '3px' }}>↑+{rsShift}</span>
                ) : rsShift < 0 ? (
                  <span style={{ color: '#f43f5e', marginLeft: '3px' }}>↓{rsShift}</span>
                ) : null}
              </span>
            )}

            {/* RVOL */}
            {volRatioPct !== null && (
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                background: volRatioPct >= 120 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                color: volRatioPct >= 120 ? '#10b981' : 'var(--text-secondary)',
                border: `1px solid ${volRatioPct >= 120 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`
              }}>
                RVOL: {(rvol).toFixed(1)}x ({volRatioPct}%)
              </span>
            )}

            {/* Extension */}
            {extAtr !== null && (
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                background: extAtr <= 2.0 ? 'rgba(16, 185, 129, 0.15)' : extAtr <= 3.0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: extAtr <= 2.0 ? '#10b981' : extAtr <= 3.0 ? '#f59e0b' : '#f43f5e',
                border: `1px solid ${extAtr <= 2.0 ? 'rgba(16, 185, 129, 0.3)' : extAtr <= 3.0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
              }}>
                Ext: {extAtr > 0 ? '+' : ''}{extAtr.toFixed(1)} ATR ({extAtr <= 2.0 ? 'Hold' : extAtr <= 3.0 ? 'Normal' : 'Wait'})
              </span>
            )}

            {/* ADR */}
            {adr20 !== null && (
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                ADR: {adr20.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Right: Pagination + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            {activeStockList && activeStockList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrevStock}
                  disabled={currentIndex <= 0}
                  title="Previous Stock (← / ↑ Arrow)"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px', opacity: currentIndex <= 0 ? 0.35 : 1, cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer' }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 4px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                  {currentIndex >= 0 ? currentIndex + 1 : 1} / {activeStockList.length}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={handleNextStock}
                  disabled={currentIndex >= activeStockList.length - 1}
                  title="Next Stock (→ / ↓ Arrow)"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px', opacity: currentIndex >= activeStockList.length - 1 ? 0.35 : 1, cursor: currentIndex >= activeStockList.length - 1 ? 'not-allowed' : 'pointer' }}
                >
                  Next ▶
                </button>
              </div>
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

        {/* KovaView Two-Column Cockpit Workspace */}
        <div className="stock-cockpit-grid">
          {/* LEFT MAIN AREA: Full Chart + Tabbed Bottom Drawer */}
          <div className="stock-cockpit-main">
            {/* Candlestick Chart Edge-to-Edge Container */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 10px',
              height: 'clamp(640px, 76vh, 1050px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CandlestickChart data={stockPrices} symbol={selectedStock?.symbol} height="100%" />
            </div>

            {/* Bottom Tabs Drawer (Quarterly YoY, Annual, Patterns) */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {/* Tab Header Navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <button
                  onClick={() => setActiveBottomTab('quarterly')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: activeBottomTab === 'quarterly' ? '700' : '500',
                    color: activeBottomTab === 'quarterly' ? '#38bdf8' : 'var(--text-secondary)',
                    background: activeBottomTab === 'quarterly' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: activeBottomTab === 'quarterly' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  📊 Quarterly Matrix (YoY)
                </button>

                <button
                  onClick={() => setActiveBottomTab('annual')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: activeBottomTab === 'annual' ? '700' : '500',
                    color: activeBottomTab === 'annual' ? '#10b981' : 'var(--text-secondary)',
                    background: activeBottomTab === 'annual' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    border: activeBottomTab === 'annual' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  📈 Annual Statements
                </button>

                <button
                  onClick={() => setActiveBottomTab('patterns')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: activeBottomTab === 'patterns' ? '700' : '500',
                    color: activeBottomTab === 'patterns' ? '#c084fc' : 'var(--text-secondary)',
                    background: activeBottomTab === 'patterns' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                    border: activeBottomTab === 'patterns' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🌀 Setup Wave Breakdown {hasVcp || hasCheat ? '✓' : ''}
                </button>
              </div>

              {/* Tab Contents */}
              <div style={{ padding: '12px 14px' }}>
                {activeBottomTab === 'quarterly' && (
                  <div>
                    {financials?.quarterly_financials && financials.quarterly_financials.length > 0 ? (
                      <div className="table-container" style={{ margin: 0, overflowX: 'auto', opacity: loadingFinancials ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                        <table className="data-table" style={{ minWidth: '600px', width: '100%', fontSize: '11.5px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '120px', fontWeight: 600, color: 'var(--accent-color)', textAlign: 'left' }}>Qtr Ended</th>
                              {financials.quarterly_financials.map((q, idx) => (
                                <th key={idx} style={{ textAlign: 'center' }}>{q.quarter_str}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* EPS Row */}
                            <tr>
                              <td style={{ fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>EPS ($)</td>
                              {financials.quarterly_financials.map((q, idx) => (
                                <td key={idx} style={{ textAlign: 'center', fontWeight: '500' }}>
                                  {q.eps !== null ? `$${q.eps.toFixed(2)}` : 'N/A'}
                                </td>
                              ))}
                            </tr>
                            {/* EPS YoY Chg Row */}
                            <tr>
                              <td style={{ fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>EPS % Chg</td>
                              {financials.quarterly_financials.map((q, idx) => {
                                const color = q.eps_pct_change > 0 ? 'var(--accent-success)' : q.eps_pct_change < 0 ? 'var(--accent-danger)' : 'var(--text-primary)';
                                return (
                                  <td key={idx} style={{ textAlign: 'center', color, fontWeight: 'bold' }}>
                                    {q.eps_pct_change !== null ? `${q.eps_pct_change >= 0 ? '+' : ''}${q.eps_pct_change.toFixed(0)}%` : 'N/A'}
                                  </td>
                                );
                              })}
                            </tr>
                            {/* Sales Row */}
                            <tr>
                              <td style={{ fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>Sales (M)</td>
                              {financials.quarterly_financials.map((q, idx) => (
                                <td key={idx} style={{ textAlign: 'center', fontWeight: '500' }}>
                                  {q.sales !== null ? `$${q.sales.toFixed(1)}M` : 'N/A'}
                                </td>
                              ))}
                            </tr>
                            {/* Sales YoY Chg Row */}
                            <tr>
                              <td style={{ fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>Sales % Chg</td>
                              {financials.quarterly_financials.map((q, idx) => {
                                const color = q.sales_pct_change > 0 ? 'var(--accent-success)' : q.sales_pct_change < 0 ? 'var(--accent-danger)' : 'var(--text-primary)';
                                return (
                                  <td key={idx} style={{ textAlign: 'center', color, fontWeight: 'bold' }}>
                                    {q.sales_pct_change !== null ? `${q.sales_pct_change >= 0 ? '+' : ''}${q.sales_pct_change.toFixed(0)}%` : 'N/A'}
                                  </td>
                                );
                              })}
                            </tr>
                            {/* Net Margin Row */}
                            <tr>
                              <td style={{ fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>Net Margin</td>
                              {financials.quarterly_financials.map((q, idx) => {
                                const color = q.net_margin > 0 ? 'var(--accent-success)' : q.net_margin < 0 ? 'var(--accent-danger)' : 'var(--text-primary)';
                                return (
                                  <td key={idx} style={{ textAlign: 'center', color, fontWeight: '500' }}>
                                    {q.net_margin !== null ? `${q.net_margin.toFixed(1)}%` : 'N/A'}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                        {loadingFinancials ? 'Loading quarterly matrix...' : 'No quarterly statements cached.'}
                      </div>
                    )}
                  </div>
                )}

                {activeBottomTab === 'annual' && (
                  <div>
                    {financials?.yearly_financials && financials.yearly_financials.length > 0 ? (
                      <div className="table-container" style={{ margin: 0, opacity: loadingFinancials ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                        <table className="data-table" style={{ width: '100%', fontSize: '11.5px' }}>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>EPS ($)</th>
                              <th>EPS % Chg</th>
                              <th>Sales % Chg</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financials.yearly_financials.map((y, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 'bold' }}>{y.year}</td>
                                <td>{y.eps !== null ? `$${y.eps.toFixed(2)}` : 'N/A'}</td>
                                <td style={{ color: y.eps_pct_change > 0 ? 'var(--accent-success)' : y.eps_pct_change < 0 ? 'var(--accent-danger)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                                  {y.eps_pct_change !== null ? `${y.eps_pct_change >= 0 ? '+' : ''}${y.eps_pct_change.toFixed(0)}%` : 'N/A'}
                                </td>
                                <td style={{ color: y.sales_pct_change > 0 ? 'var(--accent-success)' : y.sales_pct_change < 0 ? 'var(--accent-danger)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                                  {y.sales_pct_change !== null ? `${y.sales_pct_change >= 0 ? '+' : ''}${y.sales_pct_change.toFixed(0)}%` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '12px 0', textAlign: 'center' }}>
                        {loadingFinancials ? 'Loading annual financials...' : 'No annual statement cached.'}
                      </div>
                    )}
                  </div>
                )}

                {activeBottomTab === 'patterns' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {hasVcp ? (
                      <VcpFootprintCard vcpFootprint={stockDetail?.vcp_footprint} />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                        No active Minervini VCP contraction pattern.
                      </div>
                    )}

                    {hasCheat && (
                      <LowCheatFootprintCard lowCheatFootprint={stockDetail?.low_cheat_footprint} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: KovaView Telemetry HUD & Context */}
          <div className="stock-cockpit-sidebar">
            {/* 1. KovaView Live Stock Telemetry Card (Exact styling to KovaView) */}
            <div className="kovaview-hud-card">
              <div className="kovaview-hud-title">
                <span>⚡</span> Stock Telemetry
              </div>

              {/* Vol Ratio */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Vol Ratio</span>
                <span className="kovaview-hud-val" style={{ color: volRatioPct >= 120 ? '#10b981' : 'var(--text-primary)' }}>
                  {volRatioPct !== null ? `${volRatioPct}%` : 'N/A'}
                </span>
              </div>

              {/* Volume State */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Volume</span>
                <span className="kovaview-hud-val">
                  {isVolSurge ? (
                    <span style={{ padding: '1px 6px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', fontSize: '10px', fontWeight: '700' }}>
                      🔵 HIGH VOL SURGE
                    </span>
                  ) : isVolExpanding ? (
                    <span style={{ padding: '1px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '10px', fontWeight: '700' }}>
                      🟢 EXPANDING
                    </span>
                  ) : isVolDryUp ? (
                    <span style={{ padding: '1px 6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontSize: '10px' }}>
                      ⚪ DRY UP
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>NORMAL</span>
                  )}
                </span>
              </div>

              {/* Pivot RS (Kova Score) */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Pivot RS (PRS)</span>
                <span className="kovaview-hud-val" style={{ color: (pivotRs ?? 0) >= 90 ? '#10b981' : 'var(--text-primary)' }}>
                  {pivotRs ?? 'N/A'}
                  {rsShift > 0 ? (
                    <span style={{ color: '#10b981', fontSize: '10.5px' }}>↑+{rsShift}</span>
                  ) : rsShift < 0 ? (
                    <span style={{ color: '#f43f5e', fontSize: '10.5px' }}>↓{rsShift}</span>
                  ) : null}
                </span>
              </div>

              {/* Technical Status */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Technical Status</span>
                <span className="kovaview-hud-val">
                  {selectedStock?.status_atr === 'healthy' ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ● HEALTHY
                    </span>
                  ) : selectedStock?.status_atr === 'overextended' ? (
                    <span style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ● OVEREXTENDED
                    </span>
                  ) : (
                    <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ● NORMAL
                    </span>
                  )}
                </span>
              </div>

              {/* Extension & Advice */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Extension (10E)</span>
                <span className="kovaview-hud-val">
                  {extAtr !== null ? (
                    <>
                      <span style={{ color: extAtr <= 2.0 ? '#10b981' : extAtr <= 3.0 ? '#f59e0b' : '#f43f5e' }}>
                        {extAtr > 0 ? '+' : ''}{extAtr.toFixed(1)} ATR
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: extAtr <= 2.0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: extAtr <= 2.0 ? '#10b981' : '#f43f5e'
                      }}>
                        {extAtr <= 2.0 ? 'Hold / Buy' : 'Wait Pullback'}
                      </span>
                    </>
                  ) : 'N/A'}
                </span>
              </div>

              {/* Market Cap */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Market Cap</span>
                <span className="kovaview-hud-val">{formatCompactNum(selectedStock?.market_cap)}</span>
              </div>

              {/* Avg Volume (50d) */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Avg Volume (50d)</span>
                <span className="kovaview-hud-val">{formatVolume(selectedStock?.vol_50d_ma || stockDetail?.vol_50d_ma)}</span>
              </div>

              {/* ADR (20D) */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">ADR (20D)</span>
                <span className="kovaview-hud-val" style={{ color: '#f59e0b' }}>
                  {adr20 !== null ? `${adr20.toFixed(2)}%` : 'N/A'}
                </span>
              </div>

              {/* Trend Intensity TI65 */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Trend Intensity (TI65)</span>
                <span className="kovaview-hud-val" style={{
                  color: ti65 >= 1.05 ? '#10b981' : ti65 < 0.95 ? '#f43f5e' : 'var(--text-primary)'
                }}>
                  {ti65 !== null ? `${ti65.toFixed(2)}` : 'N/A'}
                </span>
              </div>

              {/* Industry Theme & Cluster */}
              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Theme / Cluster</span>
                <span className="kovaview-hud-val" style={{ textAlign: 'right', fontSize: '11px', color: top20ClusterCount >= 2 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {top20ClusterCount >= 2 ? `🔥 ${top20ClusterCount} in Top 20` : 'Normal Flow'}
                </span>
              </div>
            </div>

            {/* 2. Setup Footprints & Patterns Card */}
            <div className="kovaview-hud-card">
              <div className="kovaview-hud-title">
                <span>🌀</span> Pattern Setups
              </div>

              {hasVcp ? (
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8' }}>VCP Footprint</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{vcp.footprint_str}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    <span>Pivot: <strong style={{ color: '#f8fafc' }}>${vcp.pivot_price?.toFixed(2)}</strong></span>
                    <span>Contraction: <strong style={{ color: '#10b981' }}>{vcp.final_contraction_pct}%</strong></span>
                  </div>
                </div>
              ) : null}

              {hasCheat ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b' }}>Minervini 3-C Cheat</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>TRIGGERED</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    <span>Base Depth: <strong style={{ color: '#f8fafc' }}>{cheat.base_depth_pct}%</strong></span>
                    <span>Stage 2: <strong style={{ color: '#10b981' }}>Qualified</strong></span>
                  </div>
                </div>
              ) : null}

              {!hasVcp && !hasCheat && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 0' }}>
                  No active contraction patterns detected. Moving average trend alignment active.
                </div>
              )}
            </div>

            {/* 3. Catalysts & Sponsorship Card */}
            <div className="kovaview-hud-card">
              <div className="kovaview-hud-title">
                <span>🏛️</span> Catalysts & Institutional Flow
              </div>

              <div className="kovaview-hud-row">
                <span className="kovaview-hud-label">Next Earnings</span>
                <span className="kovaview-hud-val" style={{ color: earningsBadgeInfo?.isUrgent ? '#f43f5e' : '#c084fc' }}>
                  {earningsBadgeInfo ? earningsBadgeInfo.fullDisplay : (loadingFinancials ? 'Checking...' : 'Unscheduled')}
                </span>
              </div>

              {!isEtf && instInfo && (
                <>
                  <div className="kovaview-hud-row">
                    <span className="kovaview-hud-label">Institutional Funds</span>
                    <span className="kovaview-hud-val" style={{ color: '#38bdf8' }}>
                      {instInfo.holdersCount.toLocaleString()} funds
                    </span>
                  </div>
                  <div className="kovaview-hud-row">
                    <span className="kovaview-hud-label">QoQ Inflow</span>
                    <span className="kovaview-hud-val" style={{ color: instInfo.qoqChange >= 0 ? '#10b981' : '#f43f5e' }}>
                      {instInfo.qoqChange >= 0 ? `+${instInfo.qoqChange}` : instInfo.qoqChange} funds
                    </span>
                  </div>
                  {instInfo.streak >= 1 && (
                    <div className="kovaview-hud-row">
                      <span className="kovaview-hud-label">Accumulation Streak</span>
                      <span className="kovaview-hud-val" style={{ color: '#10b981' }}>
                        🔥 {instInfo.streak} Quarters
                      </span>
                    </div>
                  )}
                  {instInfo.ownershipPct !== null && instInfo.ownershipPct !== undefined && (
                    <div className="kovaview-hud-row">
                      <span className="kovaview-hud-label">Inst Float Ownership</span>
                      <span className="kovaview-hud-val">
                        {instInfo.ownershipPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4. Action Button */}
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedStock(null);
                setActiveTab('inspector');
                setInspectorSymbol(selectedStock.symbol);
                handleInspectorSearch(selectedStock.symbol);
              }}
              style={{
                padding: '9px 12px',
                fontSize: '11.5px',
                fontWeight: '600',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🔍 Open in Full Stock Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
