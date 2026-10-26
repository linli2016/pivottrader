import React, { useState } from 'react';
import StockBrandIcon from '../StockBrandIcon';

function formatMarketCap(v) {
  if (v === null || v === undefined) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Number(v).toLocaleString()}`;
}

function formatDist52w(v) {
  if (v === null || v === undefined) return '—';
  const prefix = v > 0 ? '+' : '';
  return `${prefix}${v.toFixed(1)}%`;
}

/**
 * StockDetailPanel - Collapsible right inspector drawer showing:
 * Profile, Fundamentals (EPS & Sales), Institutional Sponsorship, Technicals, and Industry Peers.
 */
export default function StockDetailPanel({
  stock,
  stockDetail = null,
  peersData = null,
  width = 380,
  onClose = null,
  onSelectStock = null,
  onInspectTicker = null,
}) {
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [inspectTickerInput, setInspectTickerInput] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    profile: false,
    fundamentals: false,
    sponsorship: false,
    stats: false,
    peers: false,
  });

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const symbol = stock?.symbol || stock?.ticker || (typeof stock === 'string' ? stock : '');

  const handleInspectSubmit = (e) => {
    e.preventDefault();
    const sym = inspectTickerInput.trim().toUpperCase();
    if (sym && onInspectTicker) {
      onInspectTicker(sym);
      setInspectTickerInput('');
    } else if (sym && onSelectStock) {
      onSelectStock({ symbol: sym });
      setInspectTickerInput('');
    }
  };

  const isEtf =
    stockDetail?.metadata?.asset_type === 'ETF' ||
    stock?.asset_type === 'ETF' ||
    (stock?.asset_type && String(stock.asset_type).toUpperCase().includes('ETF'));

  // Stats calculation
  const meta = stockDetail?.metadata || {};
  const stats52w = {
    high: meta.high_52w ?? stock?.high_52w ?? null,
    low: meta.low_52w ?? stock?.low_52w ?? null,
    distHigh: stock?.dist_52wh_pct ?? meta.dist_52wh_pct ?? null,
  };
  const marketCap = meta.market_cap ?? stock?.market_cap ?? null;
  const vol50dMa = meta.avg_volume_50d ?? stock?.volume_sma_50 ?? stock?.vol_50d_avg ?? null;
  const tiVal = stockDetail?.ti_65 ?? stock?.ti_65 ?? null;
  const erVal = stock?.er_20d ?? stockDetail?.er_20d ?? stockDetail?.metrics?.er_20d ?? null;
  const ret1m = stock?.ret_1m ?? stockDetail?.ret_1m ?? null;
  const ret3m = stock?.ret_3m ?? stockDetail?.ret_3m ?? null;

  const instDetails = stockDetail?.sponsorship_summary || null;

  return (
    <div
      className="custom-scrollbar stock-view-detail-panel"
      style={{
        width: `${width}px`,
        minWidth: '320px',
        maxWidth: '650px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color, #1e293b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.3)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          <StockBrandIcon symbol={symbol} size={18} />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {symbol}
          </span>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            INSPECTOR
          </span>
        </div>

        {/* Quick Ticker Search */}
        <form
          onSubmit={handleInspectSubmit}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          title="Type any ticker to inspect"
        >
          <input
            type="text"
            placeholder="Ticker..."
            value={inspectTickerInput}
            onChange={(e) => setInspectTickerInput(e.target.value)}
            style={{
              width: '74px',
              padding: '3px 6px',
              fontSize: '11px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color, #1e293b)',
              borderRadius: '4px',
              color: '#ffffff',
              textTransform: 'uppercase',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Inspect ticker"
          >
            🔍
          </button>
        </form>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '2px 4px',
            }}
            title="Collapse Inspector panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Accordion 1: Company Profile */}
      <div style={{ borderBottom: '1px solid var(--border-color, #1e293b)' }}>
        <div
          onClick={() => toggleSection('profile')}
          className="stock-detail-section-header"
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
            🏢 Company Profile
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
            {collapsedSections.profile ? '▼' : '▲'}
          </span>
        </div>
        {!collapsedSections.profile && (
          <div style={{ padding: '0 12px 10px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.45 }}>
            <p style={{ margin: 0 }}>
              {profileExpanded
                ? stockDetail?.metadata?.description || stock?.name || 'No description available.'
                : (stockDetail?.metadata?.description || stock?.name || 'No description available.').slice(0, 160) + '...'}
            </p>
            {(stockDetail?.metadata?.description || stock?.name) && (stockDetail?.metadata?.description || stock?.name).length > 160 && (
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  padding: '4px 0 0',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  fontWeight: 600,
                }}
              >
                {profileExpanded ? 'Show less' : 'Read full description →'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Quarterly Fundamental EPS History */}
      <div style={{ borderBottom: '1px solid var(--border-color, #1e293b)' }}>
        <div
          onClick={() => toggleSection('fundamentals')}
          className="stock-detail-section-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
              📊 Quarterly EPS Acceleration (CAN SLIM "C")
            </span>
            {stockDetail?.fundamentals?.length > 0 && (
              <span
                style={{
                  fontSize: '9.5px',
                  color: 'var(--text-secondary, #94a3b8)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                {stockDetail.fundamentals.length}Q
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
            {collapsedSections.fundamentals ? '▼' : '▲'}
          </span>
        </div>
        {!collapsedSections.fundamentals && (
          <div style={{ padding: '0 10px 10px' }}>
            <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 6px' }}>Quarter</th>
                    <th style={{ padding: '4px 6px' }}>Date</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>EPS</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>QoQ %</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(stockDetail?.fundamentals || []).map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, padding: '4px 6px' }}>{f.fiscal_quarter}</td>
                      <td style={{ color: 'var(--text-secondary, #94a3b8)', padding: '4px 6px' }}>
                        {f.report_date || 'N/A'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px' }}>
                        ${f.eps_diluted !== null && f.eps_diluted !== undefined ? f.eps_diluted.toFixed(2) : 'N/A'}
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          textAlign: 'right',
                          padding: '4px 6px',
                          color:
                            f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined
                              ? f.eps_qoq_growth >= 0
                                ? '#34d399'
                                : '#f87171'
                              : 'var(--text-secondary, #94a3b8)',
                        }}
                      >
                        {f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined
                          ? `${f.eps_qoq_growth >= 0 ? '+' : ''}${f.eps_qoq_growth.toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          textAlign: 'right',
                          padding: '4px 6px',
                          color: 'var(--text-secondary, #94a3b8)',
                        }}
                      >
                        {f.total_revenue ? `$${(f.total_revenue / 1000000).toFixed(1)}M` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {(!stockDetail?.fundamentals || stockDetail.fundamentals.length === 0) && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary, #94a3b8)', padding: '12px' }}>
                        No quarterly statements cached for this stock.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Institutional Sponsorship & Fund Growth */}
      {!isEtf && (
        <div style={{ borderBottom: '1px solid var(--border-color, #1e293b)' }}>
          <div
            onClick={() => toggleSection('sponsorship')}
            className="stock-detail-section-header"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                🏛️ Institutional Sponsorship (CAN SLIM "I")
              </span>
              {instDetails?.streak >= 2 ? (
                <span
                  style={{
                    fontSize: '9.5px',
                    color: '#22c55e',
                    background: 'rgba(34, 197, 94, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  🔥 +{instDetails.streak}Q
                </span>
              ) : instDetails?.streak === 1 ? (
                <span
                  style={{
                    fontSize: '9.5px',
                    color: '#60a5fa',
                    background: 'rgba(59, 130, 246, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  📈 +1Q
                </span>
              ) : null}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
              {collapsedSections.sponsorship ? '▼' : '▲'}
            </span>
          </div>
          {!collapsedSections.sponsorship && (
            <div style={{ padding: '0 10px 10px' }}>
              <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 6px' }}>Quarter</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Funds</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>QoQ Change</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Growth %</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Float %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockDetail?.sponsorship_history || []).map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, padding: '4px 6px' }}>{s.fiscal_quarter}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right', padding: '4px 6px' }}>
                          {s.holders_count ? s.holders_count.toLocaleString() : 'N/A'}
                        </td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            textAlign: 'right',
                            padding: '4px 6px',
                            color:
                              s.holders_qoq_change !== null && s.holders_qoq_change !== undefined
                                ? s.holders_qoq_change >= 0
                                  ? '#34d399'
                                  : '#f87171'
                                : 'var(--text-secondary, #94a3b8)',
                          }}
                        >
                          {s.holders_qoq_change !== null && s.holders_qoq_change !== undefined
                            ? `${s.holders_qoq_change >= 0 ? '+' : ''}${s.holders_qoq_change.toLocaleString()}`
                            : '—'}
                        </td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            textAlign: 'right',
                            padding: '4px 6px',
                            color:
                              s.holders_growth_pct !== null && s.holders_growth_pct !== undefined
                                ? s.holders_growth_pct >= 0
                                  ? '#34d399'
                                  : '#f87171'
                                : 'var(--text-secondary, #94a3b8)',
                          }}
                        >
                          {s.holders_growth_pct !== null && s.holders_growth_pct !== undefined
                            ? `${s.holders_growth_pct >= 0 ? '+' : ''}${s.holders_growth_pct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px', color: 'var(--text-secondary, #94a3b8)' }}>
                          {s.ownership_pct !== null && s.ownership_pct !== undefined ? `${s.ownership_pct.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {(!stockDetail?.sponsorship_history || stockDetail.sponsorship_history.length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary, #94a3b8)', padding: '12px' }}>
                          No institutional sponsorship records cached.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 4: Key Technical Stats */}
      <div style={{ borderBottom: '1px solid var(--border-color, #1e293b)' }}>
        <div
          onClick={() => toggleSection('stats')}
          className="stock-detail-section-header"
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
            ⚡ Key Technical Stats
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
            {collapsedSections.stats ? '▼' : '▲'}
          </span>
        </div>
        {!collapsedSections.stats && (
          <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10.5px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>52W Range</div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {stats52w.low !== null && stats52w.low !== undefined && stats52w.high !== null && stats52w.high !== undefined
                    ? `$${stats52w.low.toFixed(1)} - $${stats52w.high.toFixed(1)}`
                    : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Dist from 52W High</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color:
                      stats52w.distHigh !== null && stats52w.distHigh !== undefined && (stats52w.distHigh >= -10 || (stats52w.distHigh > 0 && stats52w.distHigh <= 10))
                        ? '#10b981'
                        : 'var(--text-secondary, #94a3b8)',
                  }}
                >
                  {formatDist52w(stats52w.distHigh)}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Market Cap</div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {formatMarketCap(marketCap)}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>Volume 50D MA</div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {vol50dMa ? `${(vol50dMa / 1e6).toFixed(2)}M` : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>1M / 3M Returns</div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {ret1m !== null ? `${ret1m >= 0 ? '+' : ''}${ret1m.toFixed(1)}%` : '—'} /{' '}
                  {ret3m !== null ? `${ret3m >= 0 ? '+' : ''}${ret3m.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>TI65 Trend Intensity</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: tiVal >= 1.05 ? '#34d399' : tiVal < 0.95 ? '#f87171' : '#ffffff',
                  }}
                >
                  {tiVal !== null ? tiVal.toFixed(2) : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '10px' }}>ER20 Linearity</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: erVal >= 0.35 ? '#34d399' : erVal <= -0.30 ? '#f87171' : '#ffffff',
                  }}
                  title="Kaufman 20-Day Fractal Efficiency Ratio (Stockbee Linearity: >= +0.35 linear uptrend, <= -0.30 linear downtrend)"
                >
                  {erVal !== null ? `${erVal > 0 ? '+' : ''}${Number(erVal).toFixed(2)}${erVal >= 0.35 ? ' ⚡' : ''}` : '—'}
                </div>
              </div>
            </div>

            {/* Active Setups */}
            {stock?.setups && stock.setups.length > 0 && (
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                  Active Setups
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {stock.setups.map((s) => (
                    <span
                      key={s}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                    >
                      ⚡ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion 5: Industry Peers */}
      {peersData?.peers && peersData.peers.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border-color, #1e293b)' }}>
          <div
            onClick={() => toggleSection('peers')}
            className="stock-detail-section-header"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                👥 Industry Peers (Ranked by RS)
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  color: 'var(--text-secondary, #94a3b8)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                {peersData.peers.length}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
              {collapsedSections.peers ? '▼' : '▲'}
            </span>
          </div>
          {!collapsedSections.peers && (
            <div style={{ padding: '0 10px 10px' }}>
              <div className="table-container custom-scrollbar" style={{ margin: 0, overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '11px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 6px' }}>Symbol</th>
                      <th style={{ padding: '4px 6px' }}>Name</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>RS</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Chg %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peersData.peers.map((p) => {
                      const isCurrent = p.symbol?.toUpperCase() === symbol.toUpperCase();
                      return (
                        <tr
                          key={p.symbol}
                          onClick={() => onSelectStock?.(p)}
                          style={{
                            cursor: 'pointer',
                            background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                          className="table-row-hover stock-view-peer-row"
                          title={`Click to inspect peer stock ${p.symbol}`}
                        >
                          <td style={{ fontWeight: 800, color: isCurrent ? '#38bdf8' : '#34d399', padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>
                            {p.symbol}
                          </td>
                          <td
                            style={{
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'var(--text-secondary, #94a3b8)',
                              padding: '4px 6px',
                            }}
                          >
                            {p.name}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 6px' }}>
                            ${p.close?.toFixed(2) || '—'}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              textAlign: 'right',
                              padding: '4px 6px',
                              color: (p.rs_rank ?? 0) >= 70 ? '#34d399' : 'var(--text-secondary, #94a3b8)',
                            }}
                          >
                            {p.rs_rank ?? '—'}
                          </td>
                          <td
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              textAlign: 'right',
                              padding: '4px 6px',
                              color: (p.chg_pct ?? 0) >= 0 ? '#34d399' : '#f87171',
                            }}
                          >
                            {p.chg_pct !== undefined && p.chg_pct !== null ? `${p.chg_pct >= 0 ? '+' : ''}${p.chg_pct.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
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

