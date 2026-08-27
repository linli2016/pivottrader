import React from 'react';

export default function VcpFootprintCard({ vcpFootprint }) {
  if (!vcpFootprint) {
    return (
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🌀 Minervini VCP Footprint
          </h4>
          <span className="pill" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '11px' }}>
            No Active Contraction
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Stock is currently not in an active 52-week high contraction pattern.
        </p>
      </div>
    );
  }

  const {
    footprint_str,
    base_weeks,
    base_bars,
    vcp_troughs,
    final_contraction_pct,
    pivot_price,
    is_tight,
    is_contracting,
    vcp_is_setup,
    dist_from_52w_pct,
    high_52w_price,
    high_52w_date,
    base_peak_price,
    base_peak_date,
    waves = []
  } = vcpFootprint;

  // Max depth among waves for relative visual bar sizing
  const maxDepth = waves.length > 0 ? Math.max(...waves.map(w => w.depth_pct || 0), 10) : 30;

  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: vcp_is_setup ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-color)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🌀 Minervini VCP Footprint
          </h4>
          <span
            style={{
              fontSize: '15px',
              fontWeight: '800',
              fontFamily: 'monospace',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              letterSpacing: '0.5px'
            }}
          >
            {footprint_str || `${base_weeks}W ${vcp_troughs}T`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {vcp_is_setup ? (
            <span className="pill pill-success" style={{ fontWeight: '700', fontSize: '11px', padding: '4px 10px' }}>
              ✓ Valid VCP Setup
            </span>
          ) : (
            <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '11px', padding: '4px 10px' }}>
              Forming Base ({vcp_troughs}T)
            </span>
          )}

          {is_tight && (
            <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px', padding: '4px 10px' }}>
              ⚡ Tight Final Contraction ({final_contraction_pct}%)
            </span>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Base Length</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            {base_weeks} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>W ({base_bars}d)</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Contractions (T)</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>
            {vcp_troughs}T <span style={{ fontSize: '11px', fontWeight: '500', color: is_contracting ? '#34d399' : 'var(--text-secondary)' }}>{is_contracting ? '(Contracting)' : ''}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Final Contraction</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: is_tight ? '#34d399' : '#f59e0b' }}>
            {final_contraction_pct !== null && final_contraction_pct !== undefined ? `${final_contraction_pct}%` : 'N/A'}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Pivot Buy Point</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#ec4899' }}>
            {pivot_price ? `$${pivot_price.toFixed(2)}` : 'N/A'}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Base Peak High</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            {base_peak_price ? `$${base_peak_price.toFixed(2)}` : (high_52w_price ? `$${high_52w_price.toFixed(2)}` : 'N/A')}{' '}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {base_peak_date ? `(${base_peak_date})` : (dist_from_52w_pct ? `(-${dist_from_52w_pct}%)` : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Progressive Volatility Contraction Visualizer */}
      {waves.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sequential Contraction Waves ($D_1 \rightarrow D_2 \rightarrow \dots \rightarrow D_n$)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {waves.map((w, idx) => {
              const barWidthPct = Math.max(8, Math.min(100, (w.depth_pct / maxDepth) * 100));
              const isLastWave = idx === waves.length - 1;

              return (
                <div
                  key={idx}
                  style={{
                    background: isLastWave ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    border: isLastWave ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ fontWeight: '700', color: isLastWave ? '#38bdf8' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Wave {w.wave} (T{w.wave}):</span>
                      <strong style={{ color: isLastWave ? '#34d399' : '#f8fafc', fontSize: '13px' }}>-{w.depth_pct}%</strong>
                      {isLastWave && is_tight && (
                        <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                          Tight Pivot
                        </span>
                      )}
                    </span>

                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      ${w.peak_price.toFixed(2)} → ${w.trough_price.toFixed(2)} ({w.bars} bars)
                    </span>
                  </div>

                  {/* Visual Bar Gauge */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', height: '6px', width: '100%', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidthPct}%`,
                        background: isLastWave
                          ? 'linear-gradient(90deg, #38bdf8, #34d399)'
                          : 'linear-gradient(90deg, #f59e0b, #ec4899)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wave Breakdown Table */}
      {waves.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Contraction Extremas & Wave History
          </div>
          <div className="table-container" style={{ margin: 0 }}>
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Contraction</th>
                  <th style={{ textAlign: 'right' }}>Depth %</th>
                  <th style={{ textAlign: 'right' }}>Peak Price</th>
                  <th style={{ textAlign: 'center' }}>Peak Date</th>
                  <th style={{ textAlign: 'right' }}>Trough Price</th>
                  <th style={{ textAlign: 'center' }}>Trough Date</th>
                  <th style={{ textAlign: 'right' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {waves.map((w, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '700', color: idx === waves.length - 1 ? '#38bdf8' : 'var(--text-primary)' }}>
                      T{w.wave}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: w.depth_pct <= 10 ? '#34d399' : '#f59e0b' }}>
                      -{w.depth_pct}%
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      ${w.peak_price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {w.peak_date || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      ${w.trough_price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {w.trough_date || '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {w.bars}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
