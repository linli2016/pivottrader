import React from 'react';

export default function SqlConsoleTab({
  sqlQuery,
  setSqlQuery,
  loadingSql,
  sqlResult,
  handleRunSQL,
}) {
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

      <div className="glass-card">
        <textarea
          className="sql-textarea"
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
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
