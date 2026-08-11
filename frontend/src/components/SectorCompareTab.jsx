import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function SectorCompareTab() {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('delta_rs_1w');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSectorETFs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sectors/etfs`);
      if (!res.ok) {
        throw new Error(`Failed to fetch sector performance: ${res.statusText}`);
      }
      const data = await res.json();
      setEtfs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectorETFs();
  }, []);

  // Filter out non-sector benchmarks for ranking metrics
  const sectorEtfs = etfs.filter((item) => item.symbol !== 'SPY' && item.symbol !== 'QQQ');
  const benchmarkEtfs = etfs.filter((item) => item.symbol === 'SPY' || item.symbol === 'QQQ');

  // Filter by search term
  const filterList = (list) =>
    list.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.symbol.toLowerCase().includes(term) ||
        (item.sector && item.sector.toLowerCase().includes(term)) ||
        (item.name && item.name.toLowerCase().includes(term))
      );
    });

  // Sort sectors
  const sortedSectors = [...filterList(sectorEtfs)].sort((a, b) => {
    const valA = a[sortBy] ?? -999;
    const valB = b[sortBy] ?? -999;
    return valB - valA;
  });

  const sortedBenchmarks = [...filterList(benchmarkEtfs)];

  // Summary Cards (based on Sector ETFs)
  const topRsSector = sectorEtfs.length > 0 ? [...sectorEtfs].sort((a, b) => b.rs_rank - a.rs_rank)[0] : null;
  const top1wGainer = sectorEtfs.length > 0 ? [...sectorEtfs].sort((a, b) => b.delta_rs_1w - a.delta_rs_1w)[0] : null;
  const top1mGainer = sectorEtfs.length > 0 ? [...sectorEtfs].sort((a, b) => b.delta_rs_1m - a.delta_rs_1m)[0] : null;
  const laggingSector = sectorEtfs.length > 0 ? [...sectorEtfs].sort((a, b) => a.rs_rank - b.rs_rank)[0] : null;

  return (
    <div>
      {/* Header */}
      <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏢</span> Sector Strength & RS Rotation
          </h1>
          <p>Compare Relative Strength (RS Rank) & RS Changes (Δ RS) Across Primary Sector ETFs</p>
        </div>

        <button className="btn btn-secondary" onClick={fetchSectorETFs} disabled={loading}>
          🔄 Refresh Sectors
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Calculating sector relative strength & momentum metrics...
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary Stat Cards */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '28px' }}>
            {/* Top RS Sector */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-success)' }}>
              <span className="stat-label">Top RS Leader Sector</span>
              {topRsSector ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span className="stat-value" style={{ color: 'var(--accent-success)' }}>{topRsSector.sector}</span>
                    <span className="pill pill-success" style={{ fontSize: '11px' }}>{topRsSector.symbol} (RS {topRsSector.rs_rank})</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    1M Return: {topRsSector.ret_1m_pct >= 0 ? `+${topRsSector.ret_1m_pct}%` : `${topRsSector.ret_1m_pct}%`}
                  </span>
                </div>
              ) : 'N/A'}
            </div>

            {/* 1W RS Rotation Leader */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span className="stat-label">1-Week RS Rotation Leader</span>
              {top1wGainer ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span className="stat-value" style={{ color: '#3b82f6' }}>{top1wGainer.sector}</span>
                    <span className="pill pill-success" style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                      +{top1wGainer.delta_rs_1w} Δ RS
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {top1wGainer.symbol} (1W Return: {top1wGainer.ret_1w_pct >= 0 ? `+${top1wGainer.ret_1w_pct}%` : `${top1wGainer.ret_1w_pct}%`})
                  </span>
                </div>
              ) : 'N/A'}
            </div>

            {/* 1M RS Rotation Leader */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <span className="stat-label">1-Month RS Rotation Leader</span>
              {top1mGainer ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span className="stat-value" style={{ color: '#8b5cf6' }}>{top1mGainer.sector}</span>
                    <span className="pill" style={{ fontSize: '11px', background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc' }}>
                      +{top1mGainer.delta_rs_1m} Δ RS
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {top1mGainer.symbol} (1M Return: {top1mGainer.ret_1m_pct >= 0 ? `+${top1mGainer.ret_1m_pct}%` : `${top1mGainer.ret_1m_pct}%`})
                  </span>
                </div>
              ) : 'N/A'}
            </div>

            {/* Lagging Sector */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
              <span className="stat-label">Lagging Sector</span>
              {laggingSector ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>{laggingSector.sector}</span>
                    <span className="pill pill-danger" style={{ fontSize: '11px' }}>{laggingSector.symbol} (RS {laggingSector.rs_rank})</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    1M Return: {laggingSector.ret_1m_pct >= 0 ? `+${laggingSector.ret_1m_pct}%` : `${laggingSector.ret_1m_pct}%`}
                  </span>
                </div>
              ) : 'N/A'}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="glass-card" style={{ marginBottom: '24px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                className="select-input"
                placeholder="🔍 Filter sectors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '240px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '8px 14px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Sort By:</span>
              <select
                className="select-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="delta_rs_1w">1-Week RS Rank Change (Δ RS 1W)</option>
                <option value="delta_rs_1m">1-Month RS Rank Change (Δ RS 1M)</option>
                <option value="rs_rank">Current RS Rank (1-99)</option>
                <option value="ret_1w_pct">1-Week Price Return (%)</option>
                <option value="ret_1m_pct">1-Month Price Return (%)</option>
                <option value="ret_3m_pct">3-Month Price Return (%)</option>
              </select>
            </div>
          </div>

          {/* Primary Sector Strength Leaderboard Table */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '28px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Primary 11 Sector ETFs Leaderboard</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sorted by {sortBy.toUpperCase().replace(/_/g, ' ')}</span>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="candidates-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '60px' }}>Rank</th>
                    <th style={{ textAlign: 'left' }}>Sector Name</th>
                    <th style={{ textAlign: 'left' }}>ETF Ticker</th>
                    <th style={{ textAlign: 'center' }}>RS Rank</th>
                    <th style={{ textAlign: 'center' }}>1W RS Change (Δ RS)</th>
                    <th style={{ textAlign: 'right' }}>1W Return</th>
                    <th style={{ textAlign: 'center' }}>1M RS Change (Δ RS)</th>
                    <th style={{ textAlign: 'right' }}>1M Return</th>
                    <th style={{ textAlign: 'right' }}>3M Return</th>
                    <th style={{ textAlign: 'right' }}>ETF Price</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSectors.map((etf, idx) => {
                    const d1w = etf.delta_rs_1w || 0;
                    const d1m = etf.delta_rs_1m || 0;
                    const rankNum = idx + 1;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {/* Rank # */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="pill"
                            style={{
                              background: rankNum <= 3 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              color: rankNum <= 3 ? '#10b981' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            #{rankNum}
                          </span>
                        </td>

                        {/* Sector Name */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {etf.sector}
                        </td>

                        {/* Ticker */}
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{etf.symbol}</span>
                          <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>{etf.name}</span>
                        </td>

                        {/* RS Rank */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="pill"
                            style={{
                              background: etf.rs_rank >= 70 ? 'rgba(16, 185, 129, 0.2)' : etf.rs_rank >= 50 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: etf.rs_rank >= 70 ? '#10b981' : etf.rs_rank >= 50 ? '#60a5fa' : '#ef4444',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            RS {etf.rs_rank}
                          </span>
                        </td>

                        {/* 1W RS Change */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="pill"
                            style={{
                              background: d1w > 0 ? 'rgba(16, 185, 129, 0.18)' : d1w < 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(156, 163, 175, 0.1)',
                              color: d1w > 0 ? '#10b981' : d1w < 0 ? '#ef4444' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            {d1w > 0 ? `▲ +${d1w}` : d1w < 0 ? `▼ ${d1w}` : '0'}
                          </span>
                        </td>

                        {/* 1W Return */}
                        <td style={{ textAlign: 'right', fontWeight: 600, color: etf.ret_1w_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {etf.ret_1w_pct >= 0 ? `+${etf.ret_1w_pct}%` : `${etf.ret_1w_pct}%`}
                        </td>

                        {/* 1M RS Change */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="pill"
                            style={{
                              background: d1m > 0 ? 'rgba(16, 185, 129, 0.18)' : d1m < 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(156, 163, 175, 0.1)',
                              color: d1m > 0 ? '#10b981' : d1m < 0 ? '#ef4444' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            {d1m > 0 ? `▲ +${d1m}` : d1m < 0 ? `▼ ${d1m}` : '0'}
                          </span>
                        </td>

                        {/* 1M Return */}
                        <td style={{ textAlign: 'right', fontWeight: 600, color: etf.ret_1m_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {etf.ret_1m_pct >= 0 ? `+${etf.ret_1m_pct}%` : `${etf.ret_1m_pct}%`}
                        </td>

                        {/* 3M Return */}
                        <td style={{ textAlign: 'right', fontWeight: 500, color: etf.ret_3m_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {etf.ret_3m_pct >= 0 ? `+${etf.ret_3m_pct}%` : `${etf.ret_3m_pct}%`}
                        </td>

                        {/* ETF Price */}
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ${etf.close?.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Benchmarks Reference Section */}
          {sortedBenchmarks.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
                Market Benchmarks Reference (SPY & QQQ)
              </h3>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="candidates-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Benchmark Ticker</th>
                      <th style={{ textAlign: 'left' }}>Index Name</th>
                      <th style={{ textAlign: 'center' }}>RS Rank</th>
                      <th style={{ textAlign: 'center' }}>1W RS Change</th>
                      <th style={{ textAlign: 'right' }}>1W Return</th>
                      <th style={{ textAlign: 'center' }}>1M RS Change</th>
                      <th style={{ textAlign: 'right' }}>1M Return</th>
                      <th style={{ textAlign: 'right' }}>3M Return</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBenchmarks.map((bm, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ fontWeight: 700, color: '#60a5fa' }}>{bm.symbol}</td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{bm.name}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}>
                            RS {bm.rs_rank}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: bm.delta_rs_1w >= 0 ? '#10b981' : '#ef4444' }}>
                          {bm.delta_rs_1w >= 0 ? `+${bm.delta_rs_1w}` : bm.delta_rs_1w}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: bm.ret_1w_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {bm.ret_1w_pct >= 0 ? `+${bm.ret_1w_pct}%` : `${bm.ret_1w_pct}%`}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: bm.delta_rs_1m >= 0 ? '#10b981' : '#ef4444' }}>
                          {bm.delta_rs_1m >= 0 ? `+${bm.delta_rs_1m}` : bm.delta_rs_1m}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: bm.ret_1m_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {bm.ret_1m_pct >= 0 ? `+${bm.ret_1m_pct}%` : `${bm.ret_1m_pct}%`}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: bm.ret_3m_pct >= 0 ? '#10b981' : '#ef4444' }}>
                          {bm.ret_3m_pct >= 0 ? `+${bm.ret_3m_pct}%` : `${bm.ret_3m_pct}%`}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${bm.close?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
