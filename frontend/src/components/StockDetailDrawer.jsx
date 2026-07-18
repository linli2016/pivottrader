import React from 'react';
import CandlestickChart from './CandlestickChart';

export default function StockDetailDrawer({
  selectedStock,
  setSelectedStock,
  stockDetail,
  stockPrices,
  setActiveTab,
  setInspectorSymbol,
  handleInspectorSearch,
}) {
  const [financials, setFinancials] = React.useState(null);
  const [loadingFinancials, setLoadingFinancials] = React.useState(false);

  React.useEffect(() => {
    if (!selectedStock) {
      setFinancials(null);
      return;
    }
    setFinancials(null);
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
  }, [selectedStock]);

  if (!selectedStock) return null;

  return (
    <div className="drawer-backdrop" onClick={() => setSelectedStock(null)}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2 style={{ fontSize: '24px', color: 'var(--accent-color)', display: 'inline' }}>{selectedStock.symbol}</h2>
            <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '15px' }}>
              {stockDetail?.metadata?.name || 'Loading Ticker Metadata...'}
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Exchange: {stockDetail?.metadata?.exchange || 'N/A'} | Asset Type: {stockDetail?.metadata?.asset_type || 'N/A'}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                RS Rank: {stockDetail?.rs_rank !== null && stockDetail?.rs_rank !== undefined ? stockDetail.rs_rank : 'N/A'}
              </span>
              <span className="pill pill-warning" style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning)' }}>
                ATR (20d): {stockDetail?.atr_20d !== null && stockDetail?.atr_20d !== undefined ? `${stockDetail.atr_20d.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={() => setSelectedStock(null)}>&times;</button>
        </div>

        {/* Candlestick chart rendering */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Candlestick Price Chart (Daily Bars)</h3>
          <div className="glass-card" style={{ padding: '16px', height: '312px', overflow: 'hidden' }}>
            {stockPrices.length > 0 ? (
              <CandlestickChart data={stockPrices} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Loading historical pricing candles...
              </div>
            )}
          </div>
        </div>

        {/* MarketSurge Style Annual Financials & key stats */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {/* Annual Performance Card */}
          <div className="glass-card" style={{ flex: 1.5, minWidth: '280px', padding: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Annual Performance Table
            </h4>
            {loadingFinancials ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>Loading annual financials...</div>
            ) : financials?.yearly_financials && financials.yearly_financials.length > 0 ? (
              <div className="table-container" style={{ margin: 0 }}>
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>No annual statement cached.</div>
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
                  <span style={{ color: 'var(--text-secondary)' }}>Daily ATR (20d):</span>
                  <strong style={{ color: 'var(--accent-warning)' }}>
                    {stockDetail?.atr_20d !== null && stockDetail?.atr_20d !== undefined ? `${stockDetail.atr_20d.toFixed(2)}%` : 'N/A'}
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
            {loadingFinancials ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                Loading quarterly statement matrix...
              </div>
            ) : financials?.quarterly_financials && financials.quarterly_financials.length > 0 ? (
              <div className="table-container" style={{ margin: 0, overflow: 'visible' }}>
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
