import React from 'react';
import CandlestickChart from './CandlestickChart';
import VcpFootprintCard from './VcpFootprintCard';
import GroupStageChart from './GroupStageChart';

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
  const [previewGroupModal, setPreviewGroupModal] = React.useState(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewGroupModal) {
        setPreviewGroupModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewGroupModal]);

  const sector = inspectorDetail?.metadata?.sector || inspectorDetail?.sector;
  const industry = inspectorDetail?.metadata?.industry || inspectorDetail?.industry;
  const rawThemes = inspectorDetail?.themes || inspectorDetail?.metadata?.themes;
  const themes = React.useMemo(() => {
    if (Array.isArray(rawThemes) && rawThemes.length > 0) return rawThemes;
    const singleTheme = inspectorDetail?.theme || inspectorDetail?.metadata?.theme;
    return singleTheme ? [singleTheme] : [];
  }, [rawThemes, inspectorDetail?.theme, inspectorDetail?.metadata?.theme]);
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

  const isEtf = React.useMemo(() => {
    const at = inspectorDetail?.metadata?.asset_type;
    return at === 'ETF' || (at && at.toUpperCase().includes('ETF'));
  }, [inspectorDetail?.metadata?.asset_type]);

  const instSummary = React.useMemo(() => {
    if (isEtf) return null;
    const s = inspectorDetail?.sponsorship_summary;
    const f = inspectorDetail?.fundamentals?.[0];
    const holdersCount = s?.holders_count ?? f?.inst_holders_count;
    const qoqChange = s?.holders_qoq_change ?? f?.inst_holders_qoq_change;
    const growthPct = s?.holders_growth_pct ?? (
      holdersCount && qoqChange !== null && qoqChange !== undefined && (holdersCount - qoqChange > 0)
        ? ((qoqChange * 100) / (holdersCount - qoqChange))
        : null
    );
    const streak = s?.sponsorship_streak ?? f?.sponsorship_streak ?? 0;
    const ownershipPct = s?.ownership_pct ?? f?.inst_ownership_pct;

    if (holdersCount === null || holdersCount === undefined) return null;
    return { holdersCount, qoqChange, growthPct, streak, ownershipPct };
  }, [inspectorDetail, isEtf]);

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

      {/* Notice Banner */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
            Stock Inspector is now merged directly into <strong>4. Watchlists</strong>'s Stock Detail Panel! You can inspect any stock alongside multi-timeframe charts, VCP footprints, and institutional fund flows.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('pt-navigate-watchlists', { detail: { symbol: inspectorSymbol || 'AAPL' } }));
          }}
          className="btn btn-primary btn-sm"
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          Open in Watchlists →
        </button>
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
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '26px', color: 'var(--accent-color)', fontWeight: '700', margin: 0, lineHeight: 1.1 }}>
                  {inspectorDetail.metadata.symbol}
                </h2>
                <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {inspectorDetail.metadata.name || 'Company Name Not Available'}
                </span>
              </div>

              {/* Classification: Sector / Industry / Theme with Group Chart trigger */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                {/* Sector Button */}
                {sector ? (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupModal({ groupType: 'sectors', groupName: sector })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#c084fc',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-brighten"
                    title={`Click to view Stan Weinstein Stage Analysis Chart for Sector: ${sector}`}
                  >
                    <span>🏛️ Sector: {sector}</span>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>📈 Chart</span>
                  </button>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    🏛️ Sector: N/A
                  </span>
                )}

                {/* Industry Button */}
                {industry ? (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupModal({ groupType: 'industries', groupName: industry })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-brighten"
                    title={`Click to view Stan Weinstein Stage Analysis Chart for Industry: ${industry}`}
                  >
                    <span>🏭 Industry: {industry}</span>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>📈 Chart</span>
                  </button>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    🏭 Industry: N/A
                  </span>
                )}

                {/* Theme(s) Button */}
                {themes.length > 0 ? (
                  themes.map((thm) => (
                    <button
                      key={thm}
                      type="button"
                      onClick={() => setPreviewGroupModal({ groupType: 'themes', groupName: thm })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-brighten"
                      title={`Click to view Stan Weinstein Stage Analysis Chart for Narrative Theme: ${thm}`}
                    >
                      <span>⚡ Theme: {thm}</span>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>📈 Chart</span>
                    </button>
                  ))
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                    title="No thematic basket mapped for this stock"
                  >
                    ⚡ Theme: None
                  </span>
                )}
              </div>
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
              {!isEtf && (
                instSummary ? (
                  <span
                    className="pill"
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      fontWeight: '700',
                      background: instSummary.streak >= 2 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.18)',
                      color: instSummary.streak >= 2 ? '#22c55e' : '#38bdf8',
                      border: `1px solid ${instSummary.streak >= 2 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`
                    }}
                    title={`Institutional Sponsorship: ${instSummary.holdersCount.toLocaleString()} funds${instSummary.qoqChange !== null && instSummary.qoqChange !== undefined ? ` (${instSummary.qoqChange >= 0 ? '+' : ''}${instSummary.qoqChange.toLocaleString()} QoQ)` : ''}${instSummary.streak >= 1 ? `, Streak: ${instSummary.streak}Q` : ''}`}
                  >
                    🏛️ Inst: {instSummary.holdersCount.toLocaleString()} {instSummary.qoqChange !== null && instSummary.qoqChange !== undefined ? `(${instSummary.qoqChange >= 0 ? '+' : ''}${instSummary.qoqChange.toLocaleString()} QoQ${instSummary.growthPct !== null ? ` | ${instSummary.growthPct >= 0 ? '+' : ''}${instSummary.growthPct.toFixed(1)}%` : ''})` : ''}
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
                    title="Institutional Sponsorship not synced yet. Run 'Sync Institutional Sponsorship' on Dashboard."
                  >
                    🏛️ Inst: Unsynced
                  </span>
                )
              )}
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

            {/* Institutional Sponsorship & Fund Growth (CAN SLIM "I") */}
            {!isEtf && (
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏛️ Institutional Sponsorship & Fund Growth (CAN SLIM "I")</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Tracks institutional fund backing and consecutive quarters of increasing fund accumulation.
                    </p>
                  </div>
                  {inspectorDetail.sponsorship_summary && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(() => {
                        const streak = inspectorDetail.fundamentals?.[0]?.sponsorship_streak || 0;
                        if (streak >= 2) {
                          return (
                            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                              🔥 {streak} Quarters Consecutive Growth
                            </span>
                          );
                        } else if (streak === 1) {
                          return (
                            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                              📈 1 Quarter Inflow
                            </span>
                          );
                        }
                        return (
                          <span style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)', borderRadius: '12px', padding: '4px 10px', fontSize: '12px', fontWeight: 500 }}>
                            No Growth Streak
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="table-container" style={{ margin: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fiscal Quarter</th>
                        <th>Report Date</th>
                        <th>Total Institutional Funds</th>
                        <th>Net QoQ Fund Change</th>
                        <th>QoQ Growth %</th>
                        <th>Float Ownership %</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inspectorDetail.sponsorship_history || []).map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 'bold' }}>{s.fiscal_quarter}</td>
                          <td>{s.report_date || 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>
                            {s.holders_count ? s.holders_count.toLocaleString() : 'N/A'}
                          </td>
                          <td style={{ color: s.holders_qoq_change !== null && s.holders_qoq_change !== undefined ? (s.holders_qoq_change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)', fontWeight: 600 }}>
                            {s.holders_qoq_change !== null && s.holders_qoq_change !== undefined ? `${s.holders_qoq_change >= 0 ? '+' : ''}${s.holders_qoq_change.toLocaleString()}` : 'Baseline (1st Qtr)'}
                          </td>
                          <td style={{ color: s.holders_growth_pct !== null && s.holders_growth_pct !== undefined ? (s.holders_growth_pct >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)' }}>
                            {s.holders_growth_pct !== null && s.holders_growth_pct !== undefined ? `${s.holders_growth_pct >= 0 ? '+' : ''}${s.holders_growth_pct.toFixed(1)}%` : '—'}
                          </td>
                          <td>
                            {s.ownership_pct !== null && s.ownership_pct !== undefined ? `${s.ownership_pct.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            {s.source || 'yfinance'}
                          </td>
                        </tr>
                      ))}
                      {(!inspectorDetail.sponsorship_history || inspectorDetail.sponsorship_history.length === 0) && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                            No institutional sponsorship records cached for this stock. Click <strong>Sync Institutional Sponsorship</strong> on the Dashboard to fetch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Stan Weinstein Group Stage Chart Reference */}
      {previewGroupModal && (
        <div
          className="full-page-modal-backdrop"
          onClick={() => setPreviewGroupModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="glass-card custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '960px',
              maxWidth: '96vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#0e1422',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.75)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STAN WEINSTEIN STAGE ANALYSIS · {previewGroupModal.groupType === 'sectors' ? 'SECTOR' : previewGroupModal.groupType === 'themes' ? 'THEME' : 'INDUSTRY'}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{previewGroupModal.groupType === 'sectors' ? '🏛️' : previewGroupModal.groupType === 'themes' ? '⚡' : '🏭'}</span>
                  <span>{previewGroupModal.groupName}</span>
                </h3>
              </div>

              {/* Group Quick Toggles & Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {sector && (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupModal({ groupType: 'sectors', groupName: sector })}
                    style={{
                      background: previewGroupModal.groupType === 'sectors' && previewGroupModal.groupName === sector ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupModal.groupType === 'sectors' && previewGroupModal.groupName === sector ? '#c084fc' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupModal.groupType === 'sectors' && previewGroupModal.groupName === sector ? '#ffffff' : '#c084fc',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🏛️ Sector: {sector}
                  </button>
                )}
                {industry && (
                  <button
                    type="button"
                    onClick={() => setPreviewGroupModal({ groupType: 'industries', groupName: industry })}
                    style={{
                      background: previewGroupModal.groupType === 'industries' && previewGroupModal.groupName === industry ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupModal.groupType === 'industries' && previewGroupModal.groupName === industry ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupModal.groupType === 'industries' && previewGroupModal.groupName === industry ? '#ffffff' : '#38bdf8',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🏭 Industry: {industry}
                  </button>
                )}
                {themes && themes.map((thm) => (
                  <button
                    key={thm}
                    type="button"
                    onClick={() => setPreviewGroupModal({ groupType: 'themes', groupName: thm })}
                    style={{
                      background: previewGroupModal.groupType === 'themes' && previewGroupModal.groupName === thm ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${previewGroupModal.groupType === 'themes' && previewGroupModal.groupName === thm ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                      borderRadius: '5px',
                      color: previewGroupModal.groupType === 'themes' && previewGroupModal.groupName === thm ? '#ffffff' : '#34d399',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ {thm}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPreviewGroupModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    color: 'var(--text-secondary)',
                    padding: '5px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: '6px'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <GroupStageChart
              groupType={previewGroupModal.groupType}
              groupName={previewGroupModal.groupName}
              onSelectStock={(sym) => {
                setPreviewGroupModal(null);
                if (setInspectorSymbol) setInspectorSymbol(sym);
                if (handleInspectorSearch) handleInspectorSearch(sym);
              }}
              height={440}
              isCompact={false}
            />
          </div>
        </div>
      )}

    </div>
  );
}
