import React from 'react';

// Parse synchronization progress from stdout logs
const getProgressFromLogs = (logs) => {
  if (!logs) return 0;
  const matches = [...logs.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return parseFloat(lastMatch[1]);
  }
  return 0;
};

export default function SyncDataTab({
  syncPrices,
  setSyncPrices,
  syncFundamentals,
  setSyncFundamentals,
  syncSponsorship,
  setSyncSponsorship,
  syncSponsorshipUniverse = 'all',
  setSyncSponsorshipUniverse,
  syncPremarket,
  setSyncPremarket,
  syncHistoryYears = 5,
  setSyncHistoryYears,
  syncForceFull = false,
  setSyncForceFull,
  syncStatus,
  handleTriggerSync,
  summary,
  setActiveTab,
}) {
  return (
    <div className="sync-data-page">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>DAILY ROUTINE</span>
            <span>•</span>
            <span>STEP 0: MARKET INGEST</span>
          </div>
          <h1>0. Market Ingest</h1>
          <p>Ingest daily prices, live market quotes, fundamentals (EPS), and 13F institutional sponsorship into DuckDB</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: syncPremarket ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', color: syncPremarket ? 'var(--text-muted)' : 'var(--text-secondary)', opacity: syncPremarket ? 0.5 : 1 }}>
              <input
                type="checkbox"
                checked={syncPrices}
                onChange={(e) => setSyncPrices(e.target.checked)}
                disabled={syncStatus.status === 'running' || syncPremarket}
                style={{ cursor: syncPremarket ? 'not-allowed' : 'pointer', accentColor: 'var(--accent-color)' }}
              />
              Sync Price Data
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#ec4899' }}>
              <input
                type="checkbox"
                checked={syncPremarket}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSyncPremarket(checked);
                  if (checked) {
                    setSyncPrices(false);
                    setSyncFundamentals(false);
                    if (setSyncSponsorship) setSyncSponsorship(false);
                  } else {
                    setSyncPrices(true);
                  }
                }}
                disabled={syncStatus.status === 'running'}
                style={{ cursor: 'pointer', accentColor: '#ec4899' }}
              />
              ⚡ Live Market Quotes
            </label>
            {syncPremarket && (
              <span style={{ fontSize: '11px', color: '#f472b6', marginTop: '-4px', marginBottom: '2px', lineHeight: '1.2' }}>
                Real-time quotes for pre-market (04:00–09:30), live trading session (09:30–16:00), and post-market (16:00–20:00 ET).
              </span>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: syncPremarket ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', color: syncPremarket ? 'var(--text-muted)' : 'var(--text-secondary)', opacity: syncPremarket ? 0.5 : 1 }}>
              <input
                type="checkbox"
                checked={syncFundamentals}
                onChange={(e) => setSyncFundamentals(e.target.checked)}
                disabled={syncStatus.status === 'running' || syncPremarket}
                style={{ cursor: syncPremarket ? 'not-allowed' : 'pointer', accentColor: 'var(--accent-color)' }}
              />
              Sync Fundamentals (EPS)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: syncPremarket ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', color: syncPremarket ? 'var(--text-muted)' : '#60a5fa', opacity: syncPremarket ? 0.5 : 1 }} title="Sync institutional sponsorship fund counts and consecutive growth streaks (Free: Yahoo / SEC 13F)">
                <input
                  type="checkbox"
                  checked={syncSponsorship}
                  onChange={(e) => setSyncSponsorship && setSyncSponsorship(e.target.checked)}
                  disabled={syncStatus.status === 'running' || syncPremarket}
                  style={{ cursor: syncPremarket ? 'not-allowed' : 'pointer', accentColor: '#3b82f6' }}
                />
                🏛️ Sync Institutional Sponsorship
              </label>
              {syncSponsorship && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '24px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>Scope:</span>
                  <select
                    value={syncSponsorshipUniverse || 'all'}
                    onChange={(e) => setSyncSponsorshipUniverse && setSyncSponsorshipUniverse(e.target.value)}
                    disabled={syncStatus.status === 'running' || syncPremarket}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Active Stocks (~4,800)</option>
                    <option value="candidates">Top Momentum Leaders (~900)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', opacity: syncPremarket ? 0.5 : 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: syncPremarket ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              <span>Lookback History:</span>
              <select
                value={syncHistoryYears}
                onChange={(e) => setSyncHistoryYears(parseInt(e.target.value, 10))}
                disabled={syncStatus.status === 'running' || syncPremarket}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '12px',
                  cursor: syncPremarket ? 'not-allowed' : 'pointer'
                }}
              >
                <option value={2}>2 Years (~500 Days)</option>
                <option value={5}>5 Years (~1,250 Days)</option>
                <option value={10}>10 Years (~2,500 Days)</option>
                <option value={15}>15 Years (~3,750 Days)</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: syncPremarket ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', color: syncPremarket ? 'var(--text-muted)' : '#3b82f6' }}>
              <input
                type="checkbox"
                checked={syncForceFull}
                onChange={(e) => setSyncForceFull(e.target.checked)}
                disabled={syncStatus.status === 'running' || syncPremarket}
                style={{ cursor: syncPremarket ? 'not-allowed' : 'pointer', accentColor: '#3b82f6' }}
              />
              🔄 Force Full Backfill History
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTriggerSync}
            disabled={syncStatus.status === 'running' || (!syncPrices && !syncFundamentals && !syncPremarket && !syncSponsorship)}
            style={syncPremarket ? { background: '#ec4899', borderColor: '#db2777' } : {}}
          >
            {syncStatus.status === 'running'
              ? 'Running Sync...'
              : (syncPremarket ? '⚡ Sync Live Market Quotes' : 'Sync Database Tickers')}
          </button>
        </div>
      </div>

      {/* Routine Quick Jump Banner */}
      <div
        className="glass-card"
        style={{
          marginBottom: '24px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 19, 31, 0.85) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
              STEP 0 OF 5
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              Data Ingestion Pre-requisite
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Once sync completes, proceed to Step 1: Market Monitor to evaluate market posture, or check the Cockpit Dashboard.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setActiveTab && setActiveTab('dashboard')}
          >
            📊 Proceed to Cockpit Dashboard →
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab && setActiveTab('leaderboard')}
          >
            🏆 Proceed to 1. Leaderboard →
          </button>
        </div>
      </div>

      {/* Ingestion progress bar */}
      {syncStatus.status === 'running' && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', color: '#ffffff' }}>
            <span>Database Ingestion Progress</span>
            <span style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-mono)' }}>{getProgressFromLogs(syncStatus.log_output).toFixed(1)}%</span>
          </h3>
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', height: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
            <div style={{
              background: 'linear-gradient(90deg, #059669, #10b981)',
              height: '100%',
              width: `${getProgressFromLogs(syncStatus.log_output)}%`,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* Stat summaries (Single Row 4-Column Grid) */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card stat-card" style={{ padding: '16px 20px' }}>
          <span className="stat-label">Stock Directory Universe</span>
          <span className="stat-value">{summary?.symbols_count || 0}</span>
          <span className="stat-subtext">Active Tickers</span>
        </div>
        <div className="glass-card stat-card" style={{ padding: '16px 20px' }}>
          <span className="stat-label">Total Ingested Price Bars</span>
          <span className="stat-value">{(summary?.daily_bars_count || 0).toLocaleString()}</span>
          <span className="stat-subtext">Daily OHLCV Candles</span>
        </div>
        <div className="glass-card stat-card" style={{ padding: '16px 20px' }}>
          <span className="stat-label">Earliest Pricing Date</span>
          <span className="stat-value" style={{ fontSize: '24px', paddingTop: '4px' }}>{summary?.earliest_price_date || 'N/A'}</span>
          <span className="stat-subtext">Start of History</span>
        </div>
        <div className="glass-card stat-card" style={{ padding: '16px 20px' }}>
          <span className="stat-label">Last Pricing Date</span>
          <span className="stat-value" style={{ fontSize: '24px', paddingTop: '4px' }}>{summary?.last_price_date || 'N/A'}</span>
          <span className="stat-subtext">Latest Market Close</span>
        </div>
      </div>

      {/* Sync Console Logs */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Ingest Status & Terminal Output</h3>
          <span className={`pill ${
            syncStatus.status === 'completed' ? 'pill-success' :
            syncStatus.status === 'running' ? 'pill-warning' :
            syncStatus.status === 'failed' ? 'pill-danger' : 'pill-neutral'
          }`}>
            STATUS: {syncStatus.status.toUpperCase()}
          </span>
        </div>

        <div className="log-console">
          {syncStatus.log_output || 'Console log sync output is currently empty. Run a Sync Ingest operation above.'}
          {syncStatus.error_message && `\n\n[FATAL ERROR]: ${syncStatus.error_message}`}
        </div>
      </div>
    </div>
  );
}

