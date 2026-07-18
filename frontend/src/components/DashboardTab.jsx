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

export default function DashboardTab({
  syncPrices,
  setSyncPrices,
  syncFundamentals,
  setSyncFundamentals,
  syncStatus,
  handleTriggerSync,
  summary,
}) {
  return (
    <div>
      <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-title">
          <h1>Dashboard Summary</h1>
          <p>Status of your local embedded DuckDB datasets</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={syncPrices}
                onChange={(e) => setSyncPrices(e.target.checked)}
                disabled={syncStatus.status === 'running'}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              📈 Sync Price Data
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={syncFundamentals}
                onChange={(e) => setSyncFundamentals(e.target.checked)}
                disabled={syncStatus.status === 'running'}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              📊 Sync Fundamentals
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTriggerSync}
            disabled={syncStatus.status === 'running' || (!syncPrices && !syncFundamentals)}
          >
            {syncStatus.status === 'running' ? 'Running Screen Sync...' : 'Sync Database Tickers'}
          </button>
        </div>
      </div>

      {/* Ingestion progress bar */}
      {syncStatus.status === 'running' && (
        <div className="glass-card" style={{ marginBottom: '32px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Database Ingestion Progress</span>
            <span style={{ color: 'var(--accent-color)' }}>{getProgressFromLogs(syncStatus.log_output).toFixed(1)}%</span>
          </h3>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', height: '16px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--accent-color), var(--accent-success))',
              height: '100%',
              width: `${getProgressFromLogs(syncStatus.log_output)}%`,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* Stat summaries */}
      <div className="card-grid">
        <div className="glass-card stat-card">
          <span className="stat-label">Stock Directory Universe</span>
          <span className="stat-value">{summary?.symbols_count || 0}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Total Ingested Price Bars</span>
          <span className="stat-value">{(summary?.daily_bars_count || 0).toLocaleString()}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Last Checked Pricing Date</span>
          <span className="stat-value">{summary?.last_price_date || 'N/A'}</span>
        </div>
      </div>

      {/* Sync Console Logs */}
      <div className="glass-card" style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Screen Ingest Status & Logs</h3>
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-item">
            <span className="label">Runner Status</span>
            <span className={`pill ${
              syncStatus.status === 'completed' ? 'pill-success' :
              syncStatus.status === 'running' ? 'pill-warning' :
              syncStatus.status === 'failed' ? 'pill-danger' : ''
            }`}>
              {syncStatus.status.toUpperCase()}
            </span>
          </div>
          <div className="stat-item">
            <span className="label">Start Timestamp</span>
            <span>{syncStatus.start_time ? new Date(syncStatus.start_time).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="label">Completion Timestamp</span>
            <span>{syncStatus.end_time ? new Date(syncStatus.end_time).toLocaleString() : 'N/A'}</span>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-header">
            <span>Terminal stdout logs</span>
            {syncStatus.status === 'running' && <span className="pulse-dot" />}
          </div>
          <pre className="console-output">
            {syncStatus.log_output || 'Console log sync output is currently empty. Run a Sync Ingest operation above.'}
            {syncStatus.error_message && `\n\n[FATAL ERROR]: ${syncStatus.error_message}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
