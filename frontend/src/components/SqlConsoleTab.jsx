import React, { useState } from 'react';

const TABLE_METADATA = [
  {
    name: 'symbols',
    category: 'DIRECTORY',
    description: 'Master directory of active symbols, asset types, exchange, name, sector, industry, and IPO date.',
    defaultQuery: 'SELECT * FROM symbols LIMIT 10;'
  },
  {
    name: 'daily_bars',
    category: 'MARKET DATA',
    description: 'Historical daily price bars, volume, RS scores & ranks, moving averages, and pattern setups (VCP, Darvas, EP, etc.).',
    defaultQuery: 'SELECT symbol, date, close, volume, rs_rank FROM daily_bars ORDER BY date DESC LIMIT 10;'
  },
  {
    name: 'quarterly_fundamentals',
    category: 'FINANCIALS',
    description: 'Quarterly financial reports, Diluted EPS, YoY/QoQ growth rates, and revenue data.',
    defaultQuery: 'SELECT * FROM quarterly_fundamentals ORDER BY report_date DESC LIMIT 10;'
  },
  {
    name: 'watchlists',
    category: 'USER DATA',
    description: 'Saved custom user watchlists and creation metadata.',
    defaultQuery: 'SELECT * FROM watchlists;'
  },
  {
    name: 'watchlist_items',
    category: 'USER DATA',
    description: 'Symbols mapped inside user watchlists with date added timestamps.',
    defaultQuery: 'SELECT * FROM watchlist_items;'
  }
];

export default function SqlConsoleTab({
  sqlQuery,
  setSqlQuery,
  loadingSql,
  sqlResult,
  handleRunSQL,
}) {
  const [tablesList] = useState(TABLE_METADATA);

  const handleSelectTableQuery = (queryText) => {
    setSqlQuery(queryText);
  };

  return (
    <div className="sql-console">
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>DEVELOPER TOOL</span>
            <span>•</span>
            <span>DUCKDB READ-ONLY</span>
          </div>
          <h1>SQL Query Console</h1>
          <p>Run custom analytical queries directly on your DuckDB database</p>
        </div>
      </div>

      {/* Available Database Tables Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🗄️</span> Available Database Tables ({tablesList.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Click table actions to auto-fill query
          </span>
        </div>

        <div className="table-card-grid">
          {tablesList.map((table) => (
            <div key={table.name} className="table-card">
              <div>
                <div className="table-card-header">
                  <span className="table-name-badge">{table.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                    {table.category}
                  </span>
                </div>
                <p className="table-card-desc">{table.description}</p>
              </div>

              <div className="table-card-actions">
                <button
                  className="btn-xs btn-outline-accent"
                  onClick={() => handleSelectTableQuery(`SELECT * FROM ${table.name} LIMIT 10;`)}
                >
                  ⚡ SELECT *
                </button>
                <button
                  className="btn-xs btn-outline-secondary"
                  onClick={() => handleSelectTableQuery(`DESCRIBE ${table.name};`)}
                >
                  📋 DESCRIBE
                </button>
                <button
                  className="btn-xs btn-outline-secondary"
                  onClick={() => handleSelectTableQuery(`SELECT COUNT(*) as total_rows FROM ${table.name};`)}
                >
                  🔢 COUNT(*)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Editor & Query Presets */}
      <div className="glass-card">
        <div className="preset-chips-container">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Presets:</span>
          <button className="preset-chip" onClick={() => setSqlQuery('SHOW TABLES;')}>
            🔍 SHOW TABLES
          </button>
          <button className="preset-chip" onClick={() => setSqlQuery('SELECT symbol, date, close, volume, rs_rank FROM daily_bars WHERE rs_rank >= 90 ORDER BY date DESC LIMIT 20;')}>
            🚀 Top RS Rank Stocks (&ge; 90)
          </button>
          <button className="preset-chip" onClick={() => setSqlQuery('SELECT sector, COUNT(*) as symbol_count FROM symbols GROUP BY sector ORDER BY symbol_count DESC;')}>
            📊 Sector Breakdown
          </button>
          <button className="preset-chip" onClick={() => setSqlQuery('SELECT * FROM quarterly_fundamentals WHERE eps_qoq_growth >= 25 ORDER BY report_date DESC LIMIT 15;')}>
            📈 High EPS Growth (&ge; 25%)
          </button>
        </div>

        <textarea
          className="sql-textarea"
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="Enter SQL query..."
        />
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleRunSQL} disabled={loadingSql}>
            {loadingSql ? 'Executing Query...' : 'Run Query'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            ⚠️ Database connection is strictly <strong>Read-Only</strong>. Writes (DROP, DELETE, UPDATE) are blocked.
          </span>
        </div>
      </div>

      {/* SQL Results */}
      {sqlResult && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {sqlResult.error ? (
            <div className="query-alert alert-danger">
              <strong>SQL execution failed:</strong>
              <span>{sqlResult.error}</span>
            </div>
          ) : (
            <div>
              <div className="query-alert alert-info" style={{ marginBottom: '16px' }}>
                Query returned {sqlResult.count} row(s) successfully.
              </div>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {sqlResult.columns.map((col, idx) => <th key={idx}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {sqlResult.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => <td key={cellIdx}>{cell === null ? 'NULL' : cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

