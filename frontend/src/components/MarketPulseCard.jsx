import React, { useState } from 'react';

/**
 * MarketPulseCard:
 * Deepvue / CANSLIM inspired Market Pulse widget tracking:
 * 1. Follow-Through Day (FTD) Status
 * 2. Distribution Pressure (25-day rolling count with 1-week delta & 5% rally exemptions)
 * 3. Moving Average Market Breadth (% above 21-day, 50-day, and 200-day MAs with 1-year percentile tracks)
 */
export default function MarketPulseCard({ marketPulse, asOfDate, isLive = true }) {
  const [showDetails, setShowDetails] = useState(false);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Market pulse
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

          {/* Live Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
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
      </div>

      {/* 2. Headline: FTD & Distribution Pressure */}
      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
          {ftd_status}
        </span>
        <span style={{ margin: '0 8px', color: '#64748b' }}>·</span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
          Distribution pressure {distribution_pressure}{' '}
          <span style={{ color: trendColor, fontWeight: 800 }}>
            {trendArrow}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginLeft: '4px' }}>
            vs 1 week ago
          </span>
        </span>
      </div>

      {/* 3. Sub-callout: Rally Exemption Status */}
      <div style={{ marginBottom: '18px' }}>
        <span
          style={{
            fontSize: '12.5px',
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

      {/* 4. Moving Average Market Breadth Meters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                gridTemplateColumns: '125px 1fr auto',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              {/* Metric Label */}
              <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', minWidth: '45px', textAlign: 'right' }}>
                  {metric.current_pct.toFixed(1)}%
                </span>

                <span style={{ color: '#475569', fontSize: '11px' }}>•</span>

                {/* 1Y Dot on Track Visualizer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title={`1-Year Range: Min ${metric.min_1y}% - Max ${metric.max_1y}% (Rank: ${metric.percentile_1y}%)`}
                >
                  <div
                    style={{
                      width: '38px',
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

                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, minWidth: '46px', textAlign: 'left' }}>
                    {metric.percentile_label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Sub-footer with universe size & timestamp */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: '#64748b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Market Breadth:</span>
          <strong style={{ color: '#cbd5e1' }}>{total_symbols.toLocaleString()} stocks in database</strong>
          <span style={{ color: '#475569' }}>(All symbols)</span>
        </div>

        <div>
          <span>As of </span>
          <strong style={{ color: '#cbd5e1' }}>{marketPulse.as_of_date}</strong>
        </div>
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

