import React from 'react';
import CandlestickChart from './CandlestickChart';
import VcpFootprintCard from './VcpFootprintCard';

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

  if (!selectedStock) return null;

  return (
    <div className="full-page-modal-backdrop" onClick={() => setSelectedStock(null)}>
      <div className="full-page-modal" onClick={(e) => e.stopPropagation()}>
        {/* Full-Page Modal Header */}
        <div className="drawer-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--accent-color)', margin: 0, letterSpacing: '-0.5px' }}>
              {selectedStock.symbol}
            </h2>
            <span style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '600' }}>
              {stockDetail?.metadata?.name || selectedStock.name || 'Loading Ticker Metadata...'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              Exchange: {stockDetail?.metadata?.exchange || selectedStock.exchange || 'N/A'} | Asset Type: {stockDetail?.metadata?.asset_type || 'Common Stock'}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill pill-success" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: '700' }}>
                RS Rank: {stockDetail?.rs_rank !== null && stockDetail?.rs_rank !== undefined ? stockDetail.rs_rank : (selectedStock?.rs_rank ?? 'N/A')}
              </span>
              <span className="pill pill-warning" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: '700', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning)' }}>
                ADR% (20d): {selectedStock?.adr_20d !== null && selectedStock?.adr_20d !== undefined ? `${selectedStock.adr_20d.toFixed(2)}%` : (stockDetail?.atr_20d !== null && stockDetail?.atr_20d !== undefined ? `${stockDetail.atr_20d.toFixed(2)}%` : 'N/A')}
              </span>
              {stockDetail?.vcp_footprint?.footprint_str && (
                <span className="pill pill-primary" style={{ fontSize: '12px', padding: '4px 10px', fontWeight: '800', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                  🌀 VCP: {stockDetail.vcp_footprint.footprint_str}
                </span>
              )}
              {earningsBadgeInfo ? (
                <span
                  className="pill"
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    fontWeight: '700',
                    background: earningsBadgeInfo.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: earningsBadgeInfo.isUrgent ? '#f87171' : '#c084fc',
                    border: `1px solid ${earningsBadgeInfo.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`
                  }}
                  title={`Next Earnings Date: ${earningsBadgeInfo.dateStr}`}
                >
                  📅 E: {earningsBadgeInfo.fullDisplay}
                </span>
              ) : (
                <span
                  className="pill"
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    fontWeight: '500',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  title="Next Earnings Date: Not Scheduled or Unannounced"
                >
                  📅 E: {loadingFinancials ? 'Checking...' : 'Unscheduled'}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {activeStockList && activeStockList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrevStock}
                  disabled={currentIndex <= 0}
                  title="Previous Stock (Left / Up Arrow)"
                  style={{ padding: '3px 10px', fontSize: '12px', height: '28px', opacity: currentIndex <= 0 ? 0.4 : 1, cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer' }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '0 6px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  {currentIndex >= 0 ? currentIndex + 1 : 1} / {activeStockList.length}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={handleNextStock}
                  disabled={currentIndex >= activeStockList.length - 1}
                  title="Next Stock (Right / Down Arrow)"
                  style={{ padding: '3px 10px', fontSize: '12px', height: '28px', opacity: currentIndex >= activeStockList.length - 1 ? 0.4 : 1, cursor: currentIndex >= activeStockList.length - 1 ? 'not-allowed' : 'pointer' }}
                >
                  Next ▶
                </button>
              </div>
            )}

            <button
              className="close-btn"
              onClick={() => setSelectedStock(null)}
              style={{
                width: '36px',
                height: '36px',
                fontSize: '22px',
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

        {/* Candlestick chart rendering */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📈 Candlestick Price Chart (Daily Bars)
            </h3>
            {selectedStock?.close && (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Latest Price: <strong style={{ color: 'var(--accent-color)', fontSize: '15px' }}>${selectedStock.close.toFixed(2)}</strong>
              </span>
            )}
          </div>
          <div className="glass-card" style={{ padding: '12px 16px', height: '520px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CandlestickChart data={stockPrices} height={496} />
          </div>
        </div>

        {/* Minervini VCP Footprint Card */}
        <VcpFootprintCard vcpFootprint={stockDetail?.vcp_footprint} />


        {/* MarketSurge Style Annual Financials & key stats */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {/* Annual Performance Card */}
          <div className="glass-card" style={{ flex: 1.5, minWidth: '280px', padding: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Annual Performance Table
            </h4>
            {financials?.yearly_financials && financials.yearly_financials.length > 0 ? (
              <div className="table-container" style={{ margin: 0, opacity: loadingFinancials ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                <table className="data-table">
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>
                {loadingFinancials ? 'Loading annual financials...' : 'No annual statement cached.'}
              </div>
            )}
          </div>

          {/* O'Neil Ratings & Stats Card */}
          <div className="glass-card" style={{ flex: 1, minWidth: '280px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Key Technicals & Info
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Relative Strength (RS) Rank:</span>
                  <strong style={{ color: 'var(--accent-color)' }}>
                    {stockDetail?.rs_rank !== null && stockDetail?.rs_rank !== undefined ? stockDetail.rs_rank : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Average Daily Vol (50d):</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedStock?.vol_50d_ma ? selectedStock.vol_50d_ma.toLocaleString() : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Daily ADR% (20d):</span>
                  <strong style={{ color: 'var(--accent-warning)' }}>
                    {(selectedStock?.adr_20d !== null && selectedStock?.adr_20d !== undefined)
                      ? `${selectedStock.adr_20d.toFixed(2)}%`
                      : (stockDetail?.atr_20d !== null && stockDetail?.atr_20d !== undefined ? `${stockDetail.atr_20d.toFixed(2)}%` : 'N/A')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Trend Intensity (TI65):</span>
                  <strong style={{
                    color: stockDetail?.ti_65 >= 1.05 ? 'var(--accent-success)' : stockDetail?.ti_65 < 0.95 ? 'var(--accent-danger)' : 'var(--text-primary)'
                  }}>
                    {stockDetail?.ti_65 !== null && stockDetail?.ti_65 !== undefined
                      ? `${stockDetail.ti_65.toFixed(2)}${stockDetail.ti_65 >= 1.05 ? ' (Bullish)' : stockDetail.ti_65 < 0.95 ? ' (Bearish)' : ' (Neutral)'}`
                      : 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Next Earnings Date:</span>
                  <strong style={{
                    color: earningsBadgeInfo ? (earningsBadgeInfo.isUrgent ? 'var(--accent-danger)' : '#c084fc') : 'var(--text-primary)'
                  }}>
                    {earningsBadgeInfo ? earningsBadgeInfo.fullDisplay : (loadingFinancials ? 'Checking...' : 'N/A')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Asset Name:</span>
                  <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stockDetail?.metadata?.name || 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedStock(null);
                setActiveTab('inspector');
                setInspectorSymbol(selectedStock.symbol);
                handleInspectorSearch(selectedStock.symbol);
              }}
              style={{ padding: '8px 12px', fontSize: '12px', width: '100%', marginTop: '16px' }}
            >
              🔍 Open in Full Stock Inspector
            </button>
          </div>
        </div>

        {/* MarketSurge Style Quarterly Horizontal Table */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Quarterly Performance Matrix (YoY Comparisons)
          </h3>
          <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
            {financials?.quarterly_financials && financials.quarterly_financials.length > 0 ? (
              <div className="table-container" style={{ margin: 0, overflow: 'visible', opacity: loadingFinancials ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                <table className="data-table" style={{ minWidth: '700px', width: '100%' }}>
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                No quarterly statements cached.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
