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
  setActiveTab,
}) {
  return (
    <div>
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>DAILY WORKFLOW & ROUTINE</span>
            <span>•</span>
            <span>PRO TRADER DESK</span>
          </div>
          <h1>Dashboard & Daily Routine</h1>
          <p>Guided step-by-step daily process and status of DuckDB datasets & pipelines</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={syncPrices}
                onChange={(e) => setSyncPrices(e.target.checked)}
                disabled={syncStatus.status === 'running'}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              Sync Price Data
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={syncFundamentals}
                onChange={(e) => setSyncFundamentals(e.target.checked)}
                disabled={syncStatus.status === 'running'}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              Sync Fundamentals
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTriggerSync}
            disabled={syncStatus.status === 'running' || (!syncPrices && !syncFundamentals)}
          >
            {syncStatus.status === 'running' ? 'Running Sync...' : 'Sync Database Tickers'}
          </button>
        </div>
      </div>

      {/* Guided Daily Activity Workflow Banner */}
      <div
        className="glass-card"
        style={{
          marginBottom: '24px',
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 19, 31, 0.85) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="header-subtitle-tag" style={{ color: '#34d399', fontWeight: 700 }}>
              <span>DAILY TRADING PROCESS</span>
              <span>•</span>
              <span>GUIDED WORKFLOW</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '4px 0 0 0' }}>
              ⚡ Daily Activity Routine Guide
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Follow these 4 steps every trading session
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Step 1: Market Monitor */}
          <div
            onClick={() => setActiveTab && setActiveTab('market-monitor')}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  STEP 1
                </span>
                <span style={{ fontSize: '22px' }}>📈</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                Market Monitor
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Assess overall market verdict, 4% expansion thrust, and breadth regime.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px', width: '100%', fontSize: '12px', justifyContent: 'center' }}>
              1. Market Monitor →
            </button>
          </div>

          {/* Step 2: Sector Compare */}
          <div
            onClick={() => setActiveTab && setActiveTab('sector-compare')}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  STEP 2
                </span>
                <span style={{ fontSize: '22px' }}>🌐</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                Sector Compare
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Identify leading sectors, industry groups, and top sector rotation ETFs.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px', width: '100%', fontSize: '12px', justifyContent: 'center' }}>
              2. Sector Compare →
            </button>
          </div>

          {/* Step 3: Stock Screen */}
          <div
            onClick={() => setActiveTab && setActiveTab('candidates')}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  STEP 3
                </span>
                <span style={{ fontSize: '22px' }}>🎯</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                Stock Screen
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Screen setups (VCP, Darvas, EP, Power Play) and flip charts in Browse Mode.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px', width: '100%', fontSize: '12px', justifyContent: 'center' }}>
              3. Stock Screen →
            </button>
          </div>

          {/* Step 4: Watchlists */}
          <div
            onClick={() => setActiveTab && setActiveTab('watchlists')}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  STEP 4
                </span>
                <span style={{ fontSize: '22px' }}>⭐️</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                Watchlists
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Organize focus watchlists and export saved tickers to TradingView.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px', width: '100%', fontSize: '12px', justifyContent: 'center' }}>
              4. Watchlists →
            </button>
          </div>
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

      {/* Stat summaries */}
      <div className="card-grid">
        <div className="glass-card stat-card">
          <span className="stat-label">Stock Directory Universe</span>
          <span className="stat-value">{summary?.symbols_count || 0}</span>
          <span className="stat-subtext">Active Tickers</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Total Ingested Price Bars</span>
          <span className="stat-value">{(summary?.daily_bars_count || 0).toLocaleString()}</span>
          <span className="stat-subtext">Daily OHLCV Candles</span>
        </div>
        <div className="glass-card stat-card">
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
