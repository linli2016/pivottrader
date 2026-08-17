import React from 'react';
import CandlestickChart from './CandlestickChart';

export default function InspectorTab({
  inspectorSymbol,
  setInspectorSymbol,
  searchingInspector,
  inspectorError,
  inspectorDetail,
  inspectorPrices,
  handleInspectorSearch,
  inspectorInputRef,
}) {
  return (
    <div>
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>DEEP ANALYZER</span>
            <span>•</span>
            <span>CHART & EPS</span>
          </div>
          <h1>Stock Inspector</h1>
          <p>Inspect daily charts and EPS history for any stock in the database</p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="form-group" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: '12px', margin: 0 }}>
          <span style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>Search Ticker:</span>
          <input
            ref={inspectorInputRef}
            type="text"
            placeholder="e.g. AAPL, LESL, NVDA"
            value={inspectorSymbol}
            onChange={(e) => setInspectorSymbol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleInspectorSearch(inspectorSymbol);
              }
            }}
            style={{ flex: 1, textTransform: 'uppercase' }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => handleInspectorSearch(inspectorSymbol)}
          disabled={searchingInspector}
        >
          {searchingInspector ? 'Searching...' : 'Inspect Ticker'}
        </button>
      </div>

      {/* Error alerts */}
      {inspectorError && (
        <div className="query-alert alert-danger" style={{ marginBottom: '24px' }}>
          {inspectorError}
        </div>
      )}

      {/* Inspected Stock details */}
      {inspectorDetail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Meta details */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '26px', color: 'var(--accent-color)', fontWeight: '700' }}>
                {inspectorDetail.metadata.symbol}
              </h2>
              <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                {inspectorDetail.metadata.name || 'Company Name Not Available'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill pill-success" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)' }}>
                RS Percentile: {inspectorDetail.rs_rank !== null ? inspectorDetail.rs_rank : 'N/A'}
              </span>
              <span className="pill pill-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning)' }}>
                ADTR (20d): {inspectorDetail.atr_20d !== null && inspectorDetail.atr_20d !== undefined ? `${inspectorDetail.atr_20d.toFixed(2)}%` : 'N/A'}
              </span>
              <span className="pill pill-primary" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)' }}>
                RS Score: {inspectorDetail.rs_score !== null ? inspectorDetail.rs_score.toFixed(4) : 'N/A'}
              </span>
              <span className="pill pill-secondary">Exchange: {inspectorDetail.metadata.exchange}</span>
              <span className="pill pill-secondary">Asset: {inspectorDetail.metadata.asset_type}</span>
            </div>
          </div>

          {/* Grid layout for Financials and Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Financials Table */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quarterly Fundamental Earnings Acceleration (EPS History)</h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report Quarter</th>
                      <th>Report Date</th>
                      <th>Diluted EPS</th>
                      <th>EPS QoQ Growth</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectorDetail.fundamentals.map((f, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{f.fiscal_quarter}</td>
                        <td>{f.report_date || 'N/A'}</td>
                        <td>${f.eps_diluted !== null && f.eps_diluted !== undefined ? f.eps_diluted.toFixed(2) : 'N/A'}</td>
                        <td style={{ color: f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined ? (f.eps_qoq_growth >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)' }}>
                          {f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined ? `${f.eps_qoq_growth >= 0 ? '+' : ''}${f.eps_qoq_growth.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td>{f.total_revenue ? `$${(f.total_revenue / 1000000).toFixed(1)}M` : 'N/A'}</td>
                      </tr>
                    ))}
                    {inspectorDetail.fundamentals.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No quarterly statements cached for this stock.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Candlestick chart */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Candlestick Price Chart (Daily Bars)</h3>
              <div style={{ height: '600px', overflow: 'hidden' }}>
                {inspectorPrices.length > 0 ? (
                  <CandlestickChart data={inspectorPrices} height={540} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    No historical price bars available for charting.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
