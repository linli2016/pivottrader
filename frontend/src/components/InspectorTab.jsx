import React from 'react';
import CandlestickChart from './CandlestickChart';
import VcpFootprintCard from './VcpFootprintCard';

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
  const inspectorEarningsBadge = React.useMemo(() => {
    const dt = inspectorDetail?.next_earnings_date || inspectorDetail?.metadata?.next_earnings_date;
    if (!dt) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dt + 'T00:00:00');
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
        dateStr: dt,
        badgeSub,
        diffDays,
        isUrgent,
        fullDisplay: `${dt} (${badgeSub})`
      };
    } catch (e) {
      return { dateStr: dt, fullDisplay: dt, isUrgent: false };
    }
  }, [inspectorDetail?.next_earnings_date, inspectorDetail?.metadata?.next_earnings_date]);

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
                ADR% (20d): {inspectorDetail.adr_20d !== null && inspectorDetail.adr_20d !== undefined
                  ? `${inspectorDetail.adr_20d.toFixed(2)}%`
                  : (inspectorDetail.atr_20d !== null && inspectorDetail.atr_20d !== undefined ? `${inspectorDetail.atr_20d.toFixed(2)}%` : 'N/A')}
              </span>
              {inspectorDetail.vcp_footprint?.footprint_str && (
                <span className="pill pill-primary" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', fontWeight: '800' }}>
                  🌀 VCP: {inspectorDetail.vcp_footprint.footprint_str}
                </span>
              )}
              <span className="pill pill-primary" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)' }}>
                RS Score: {inspectorDetail.rs_score !== null ? inspectorDetail.rs_score.toFixed(4) : 'N/A'}
              </span>

              {/* Next Earnings Date Badge */}
              {inspectorEarningsBadge ? (
                <span
                  className="pill"
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    fontWeight: '700',
                    background: inspectorEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: inspectorEarningsBadge.isUrgent ? '#f87171' : '#c084fc',
                    border: `1px solid ${inspectorEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`
                  }}
                  title={`Next Earnings Date: ${inspectorEarningsBadge.dateStr}`}
                >
                  📅 E: {inspectorEarningsBadge.fullDisplay}
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
                  📅 E: Unscheduled
                </span>
              )}

              <span className="pill pill-secondary">Exchange: {inspectorDetail.metadata.exchange}</span>
              <span className="pill pill-secondary">Asset: {inspectorDetail.metadata.asset_type}</span>
            </div>
          </div>

          {/* Minervini VCP Footprint Card */}
          <VcpFootprintCard vcpFootprint={inspectorDetail.vcp_footprint} />

          {/* Grid layout for Financials and Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Candlestick chart */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 'clamp(480px, 60vh, 850px)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Candlestick Price Chart (Daily Bars)</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {inspectorPrices.length > 0 ? (
                  <CandlestickChart data={inspectorPrices} symbol={inspectorSymbol} height="100%" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px', color: 'var(--text-secondary)' }}>
                    No historical price bars available for charting.
                  </div>
                )}
              </div>
            </div>

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
          </div>
        </div>
      )}

    </div>
  );
}
