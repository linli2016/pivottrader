import React, { useState, useEffect } from 'react';
import MarketPulseDynamicsChart from './MarketPulseDynamicsChart';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

/**
 * MarketPulseCard:
 * Deepvue / CANSLIM inspired Market Pulse widget tracking:
 * 1. Follow-Through Day (FTD) Status
 * 2. Distribution Pressure (25-day rolling count with 1-week delta & 5% rally exemptions)
 * 3. Moving Average Market Breadth (% above 21-day, 50-day, and 200-day MAs with 1-year percentile tracks)
 * 4. Historical Dynamics Graph (% above MAs, Distribution Pressure bars, Benchmark overlay)
 */
export default function MarketPulseCard({ marketPulse, asOfDate, isLive = true }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const [fetchedHistory, setFetchedHistory] = useState([]);

  const pulseHistory = (marketPulse?.history && marketPulse.history.length > 0)
    ? marketPulse.history
    : fetchedHistory;

  useEffect(() => {
    if ((!marketPulse?.history || marketPulse.history.length === 0) && showGraph) {
      const dateParam = asOfDate ? `?date=${asOfDate}` : '';
      fetch(`${API_BASE}/api/market/pulse/history${dateParam}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setFetchedHistory(data);
        })
        .catch(err => console.error('Error fetching pulse history:', err));
    }
  }, [marketPulse?.history, asOfDate, showGraph]);

  if (!marketPulse) {
    return null;
  }

  const {
    ftd_status = 'No active FTD',
    has_active_ftd = false,
    ftd_details,
    distribution_pressure = 0,
    distribution_trend = 'flat',
    distribution_trend_label = 'vs 1 week ago',
    near_exemption_count = 0,
    near_exemption_label = 'No marks near 5 rally exemption',
    total_symbols = 0,
    breadth_metrics = [],
    distribution_marks = [],
    indices_breakdown = {}
  } = marketPulse;

  // Trend arrow & color
  const isTrendDown = distribution_trend === 'down';
  const isTrendUp = distribution_trend === 'up';
  const trendColor = isTrendDown ? '#10b981' : isTrendUp ? '#ef4444' : '#94a3b8';
  const trendArrow = isTrendDown ? '↓' : isTrendUp ? '↑' : '→';

  // Live or As of Date badge
  const isHistorical = asOfDate && asOfDate !== marketPulse.as_of_date;
  const badgeLabel = isHistorical ? `• As of ${asOfDate}` : 'Live';

  return (
    <div
      className="glass-card market-pulse-widget"
      style={{
        padding: '20px 24px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.45)',
        position: 'relative'
      }}
    >
      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Market pulse
          </h2>

          {/* Live Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.02em'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981'
              }}
            />
            <span>{badgeLabel}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* History Dynamics Graph toggle button */}
          <button
            type="button"
            onClick={() => setShowGraph(prev => !prev)}
            style={{
              background: showGraph ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showGraph ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
              color: showGraph ? '#38bdf8' : '#94a3b8',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
            title="Toggle historical market pulse dynamics graph"
          >
            <span>📊 {showGraph ? 'Hide Graph' : 'Dynamics Graph'}</span>
            <span style={{ fontSize: '10px' }}>{showGraph ? '▲' : '▼'}</span>
          </button>

          {/* Details toggle button */}
          <button
            type="button"
            onClick={() => setShowDetails(prev => !prev)}
            style={{
              background: showDetails ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showDetails ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
              color: showDetails ? '#38bdf8' : '#94a3b8',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            title="Inspect distribution marks & FTD details"
          >
            <span>{showDetails ? 'Hide Marks' : 'Inspect Marks'}</span>
            <span style={{ fontSize: '10px' }}>{showDetails ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Situational Awareness Strip (Jeff Sun Regime & 52w Net NH-NL) */}
      {marketPulse?.situational_awareness && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '7px 12px',
            marginBottom: '14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '10px',
            flexWrap: 'wrap',
            fontSize: '11.5px',
          }}
        >
          <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🧭</span>
            <span>Situational Awareness:</span>
          </span>

          {/* SPY 50-ATR Extension */}
          {(() => {
            const spy = marketPulse.situational_awareness?.index_extensions?.SPY || marketPulse.situational_awareness?.spy;
            if (!spy) return null;
            const ext = typeof spy.ext_atr_50 === 'number' ? spy.ext_atr_50 : parseFloat(spy.ext_atr_50) || 0;
            const isDanger = spy.is_danger ?? (ext >= 3.5);
            const isWarn = spy.is_warn ?? (ext >= 2.0 && ext < 3.5);
            const badgeBg = isDanger ? 'rgba(239, 68, 68, 0.25)' : isWarn ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.15)';
            const badgeColor = isDanger ? '#f87171' : isWarn ? '#fde047' : '#34d399';
            const stance = spy.stance || spy.regime_stance || 'Normal';
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>SPY 50-ATR:</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '11px',
                    background: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.45)' : 'transparent'}`,
                  }}
                  title={`SPY Close: $${spy.close?.toFixed(2)} | 50 SMA: $${spy.sma_50?.toFixed(2)} | ATR: $${((spy.close * (spy.atr_20d || 1.0)) / 100)?.toFixed(2)}`}
                >
                  {isDanger && '⚠️ '}
                  {ext > 0 ? `+${ext.toFixed(1)}x` : `${ext.toFixed(1)}x`} ({stance})
                </span>
              </div>
            );
          })()}

          {/* QQQ 50-ATR Extension */}
          {(() => {
            const qqq = marketPulse.situational_awareness?.index_extensions?.QQQ || marketPulse.situational_awareness?.qqq;
            if (!qqq) return null;
            const ext = typeof qqq.ext_atr_50 === 'number' ? qqq.ext_atr_50 : parseFloat(qqq.ext_atr_50) || 0;
            const isDanger = qqq.is_danger ?? (ext >= 3.5);
            const isWarn = qqq.is_warn ?? (ext >= 2.0 && ext < 3.5);
            const badgeBg = isDanger ? 'rgba(239, 68, 68, 0.25)' : isWarn ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.15)';
            const badgeColor = isDanger ? '#f87171' : isWarn ? '#fde047' : '#34d399';
            const stance = qqq.stance || qqq.regime_stance || 'Normal';
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>QQQ 50-ATR:</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '11px',
                    background: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.45)' : 'transparent'}`,
                  }}
                  title={`QQQ Close: $${qqq.close?.toFixed(2)} | 50 SMA: $${qqq.sma_50?.toFixed(2)} | ATR: $${((qqq.close * (qqq.atr_20d || 1.0)) / 100)?.toFixed(2)}`}
                >
                  {isDanger && '⚠️ '}
                  {ext > 0 ? `+${ext.toFixed(1)}x` : `${ext.toFixed(1)}x`} ({stance})
                </span>
              </div>
            );
          })()}

          {/* 52-Week Net NH-NL */}
          {(() => {
            const nhNl = marketPulse.situational_awareness?.net_nh_nl || marketPulse.situational_awareness?.market_breath;
            if (!nhNl) return null;
            const net = nhNl.net_nh_nl ?? 0;
            const highs = nhNl.new_highs ?? nhNl.nh_count ?? 0;
            const lows = nhNl.new_lows ?? nhNl.nl_count ?? 0;
            const rating = nhNl.nh_nl_rating || (net > 50 ? 'EXPANDING' : net < -50 ? 'CONTRACTING' : 'NEUTRAL');
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>52w Net NH-NL:</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '11px',
                    background: net > 0 ? 'rgba(16, 185, 129, 0.18)' : net < 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                    color: net > 0 ? '#34d399' : net < 0 ? '#f87171' : '#94a3b8',
                  }}
                  title={`52-Week Highs: ${highs} | 52-Week Lows: ${lows}`}
                >
                  {net > 0 ? `+${net}` : net} ({rating})
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. Main Content: Side-by-side layout when Graph is active */}
      <div className={`market-pulse-grid ${showGraph ? 'with-graph' : ''}`}>
        {/* Left Column: Pulse Overview & Market Breadth Meters (The Bar Chart) */}
        <div className="market-pulse-summary-col">
          {/* Headline: FTD & Distribution Pressure */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#f1f5f9' }}>
                {ftd_status}
              </span>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#f1f5f9' }}>
                Distribution pressure {distribution_pressure}{' '}
                <span style={{ color: trendColor, fontWeight: 800 }}>
                  {trendArrow}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginLeft: '3px' }}>
                  {distribution_trend_label}
                </span>
              </span>
            </div>

            {/* Sub-callout: Rally Exemption Status */}
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: near_exemption_count > 0 ? '#f59e0b' : '#34d399',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {near_exemption_label}
              </span>
            </div>
          </div>

          {/* Moving Average Market Breadth Meters (The Bar Chart) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', margin: '4px 0' }}>
            {breadth_metrics.map(metric => {
              const isGreen = metric.is_bullish;
              const barColor = isGreen ? '#10b981' : '#f43f5e';
              const pct = Math.min(Math.max(metric.current_pct, 0), 100);
              const pctile = Math.min(Math.max(metric.percentile_1y, 0), 100);

              return (
                <div
                  key={metric.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showGraph ? '108px 1fr auto' : '125px 1fr auto',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {/* Metric Label */}
                  <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {metric.label}
                  </div>

                  {/* Progress Bar Track */}
                  <div
                    style={{
                      height: '6.5px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '999px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: barColor,
                        borderRadius: '999px',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </div>

                  {/* Metric Value & 1-Year Percentile Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: showGraph ? '132px' : '150px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', minWidth: '40px', textAlign: 'right' }}>
                      {metric.current_pct.toFixed(1)}%
                    </span>

                    <span style={{ color: '#475569', fontSize: '10px' }}>•</span>

                    {/* 1Y Dot on Track Visualizer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title={`1-Year Range: Min ${metric.min_1y}% - Max ${metric.max_1y}% (Rank: ${metric.percentile_1y}%)`}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '2px',
                          background: 'rgba(255, 255, 255, 0.18)',
                          borderRadius: '2px',
                          position: 'relative'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: `${pctile}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            boxShadow: '0 0 3px rgba(255, 255, 255, 0.5)'
                          }}
                        />
                      </div>

                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500, minWidth: '42px', textAlign: 'left' }}>
                        {metric.percentile_label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-footer with universe size & timestamp */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: '#64748b'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>Breadth:</span>
              <strong style={{ color: '#cbd5e1' }}>{total_symbols.toLocaleString()} stocks</strong>
            </div>

            <div>
              <span>As of </span>
              <strong style={{ color: '#cbd5e1' }}>{marketPulse.as_of_date}</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Market Pulse Dynamics Graph */}
        {showGraph && (
          <div className="market-pulse-graph-col">
            <MarketPulseDynamicsChart
              history={pulseHistory}
              asOfDate={asOfDate}
              isEmbedded={true}
            />
          </div>
        )}
      </div>

      {/* 6. Expandable Detailed Distribution Marks & FTD Breakdown Table */}
      {showDetails && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
              Institutional Distribution Marks (Rolling 25-Day Window)
            </h4>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              SPY: <strong style={{ color: '#f8fafc' }}>{indices_breakdown?.SPY?.active_count ?? 0}</strong> active · QQQ: <strong style={{ color: '#f8fafc' }}>{indices_breakdown?.QQQ?.active_count ?? 0}</strong> active
            </div>
          </div>

          {ftd_details && ftd_details.details && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: '6px',
                background: has_active_ftd ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${has_active_ftd ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                fontSize: '12px',
                color: has_active_ftd ? '#34d399' : '#cbd5e1'
              }}
            >
              <strong>Follow-Through Day Analysis:</strong> {ftd_details.details}
            </div>
          )}

          {distribution_marks && distribution_marks.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '6px 8px' }}>Date</th>
                    <th style={{ padding: '6px 8px' }}>Symbol</th>
                    <th style={{ padding: '6px 8px' }}>Close</th>
                    <th style={{ padding: '6px 8px' }}>Drop %</th>
                    <th style={{ padding: '6px 8px' }}>Gain Since</th>
                    <th style={{ padding: '6px 8px' }}>5% Rally Exemption</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Expires In</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution_marks.map((m, idx) => {
                    const isNear = m.is_near_exemption;
                    return (
                      <tr
                        key={`${m.symbol}-${m.date}-${idx}`}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          backgroundColor: isNear ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '6px 8px', color: '#f8fafc', fontWeight: 600 }}>{m.date}</td>
                        <td style={{ padding: '6px 8px', color: m.symbol === 'QQQ' ? '#38bdf8' : '#a855f7', fontWeight: 700 }}>
                          {m.symbol}
                        </td>
                        <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>${m.close.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', color: '#f43f5e', fontWeight: 600 }}>{m.pct_change.toFixed(2)}%</td>
                        <td style={{ padding: '6px 8px', color: m.current_gain_pct >= 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                          {m.current_gain_pct >= 0 ? `+${m.current_gain_pct.toFixed(2)}%` : `${m.current_gain_pct.toFixed(2)}%`}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {isNear ? (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                              ⚡ Near (+{m.current_gain_pct.toFixed(2)}% of 5%)
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>
                              {(5.0 - m.current_gain_pct).toFixed(1)}% to clear
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#cbd5e1' }}>
                          {m.days_to_expire} session{m.days_to_expire === 1 ? '' : 's'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#34d399', textAlign: 'center', padding: '10px 0' }}>
              Zero active distribution days in the last 25 trading sessions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

