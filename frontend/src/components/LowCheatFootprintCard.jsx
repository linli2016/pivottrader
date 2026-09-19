import React from 'react';

export default function LowCheatFootprintCard({ lowCheatFootprint }) {
  if (!lowCheatFootprint || (!lowCheatFootprint.low_cheat_is_setup && !lowCheatFootprint.cheat_is_setup)) {
    return (
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏹 Minervini Cheat / Low Cheat
          </h4>
          <span className="pill" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '11px' }}>
            No Active Setup
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Stock is currently not forming an early-stage base reversal Low Cheat or Cheat (3-C) pattern.
        </p>
      </div>
    );
  }

  const isCheat = lowCheatFootprint.cheat_type === 'cheat' || (lowCheatFootprint.base_position_pct > 50.0);
  const setupTitle = isCheat ? '⚡ Minervini Cheat (3-C)' : '🏹 Minervini Low Cheat';
  const badgeColor = isCheat ? '#eab308' : '#f97316';
  const badgeBg = isCheat ? 'rgba(234, 179, 8, 0.15)' : 'rgba(249, 115, 22, 0.15)';
  const badgeBorder = isCheat ? 'rgba(234, 179, 8, 0.3)' : 'rgba(249, 115, 22, 0.3)';
  const triggerLabel = isCheat ? '⚡ Cheat (3-C) Breakout Triggered' : '⚡ Low Cheat Breakout Triggered';

  const {
    low_cheat_is_trigger,
    low_cheat_pivot_price,
    low_cheat_stop_loss,
    low_cheat_risk_pct,
    base_peak_price,
    base_peak_date,
    base_trough_price,
    base_trough_date,
    base_depth_pct,
    base_position_pct,
    base_bars,
    exhaustion_type,
    trigger_vol_ratio,
    reward_risk_ratio,
    target_price
  } = lowCheatFootprint;

  const exhaustionLabel = () => {
    if (exhaustion_type === 'both') return 'VDU + Shakeout';
    if (exhaustion_type === 'volume_dry_up') return 'Volume Dry-Up (VDU)';
    if (exhaustion_type === 'shakeout') return 'Undercut & Rally';
    return isCheat ? 'Right Side Pause' : 'Base Low';
  };

  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: low_cheat_is_trigger
            ? `radial-gradient(circle, ${isCheat ? 'rgba(234, 179, 8, 0.25)' : 'rgba(249, 115, 22, 0.25)'} 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-color)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setupTitle}
          </h4>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '800',
              fontFamily: 'monospace',
              background: badgeBg,
              color: badgeColor,
              padding: '4px 12px',
              borderRadius: '6px',
              border: `1px solid ${badgeBorder}`,
              letterSpacing: '0.5px'
            }}
          >
            Base Depth: -{base_depth_pct}% ({base_position_pct}% Pos)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {low_cheat_is_trigger ? (
            <span className="pill pill-success" style={{ fontWeight: '700', fontSize: '11px', padding: '4px 10px', background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
              {triggerLabel}
            </span>
          ) : (
            <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '11px', padding: '4px 10px' }}>
              Base Forming ({base_bars}d)
            </span>
          )}

          <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px', padding: '4px 10px' }}>
            {exhaustionLabel()}
          </span>

          {lowCheatFootprint.stage2_qualified !== undefined && (
            <span
              className="pill"
              style={{
                background: lowCheatFootprint.stage2_qualified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: lowCheatFootprint.stage2_qualified ? '#34d399' : '#fbbf24',
                border: `1px solid ${lowCheatFootprint.stage2_qualified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '11px',
                padding: '4px 10px',
                fontWeight: '600'
              }}
            >
              {lowCheatFootprint.stage2_qualified ? '✓ Stage 2 Qualified' : 'Stage 2 In Progress'}
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
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Cheat Buy Pivot</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f97316' }}>
            ${low_cheat_pivot_price ? low_cheat_pivot_price.toFixed(2) : 'N/A'}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Stop Loss / Risk</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: low_cheat_risk_pct <= 5.0 ? '#34d399' : '#f59e0b' }}>
            ${low_cheat_stop_loss ? low_cheat_stop_loss.toFixed(2) : 'N/A'}{' '}
            <span style={{ fontSize: '12px', fontWeight: '500' }}>({low_cheat_risk_pct}%)</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Target / R:R</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>
            ${target_price ? target_price.toFixed(2) : 'N/A'}{' '}
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#34d399' }}>({reward_risk_ratio}R)</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Base Peak High</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            ${base_peak_price ? base_peak_price.toFixed(2) : 'N/A'}{' '}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{base_peak_date ? `(${base_peak_date})` : ''}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Base Trough Low</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            ${base_trough_price ? base_trough_price.toFixed(2) : 'N/A'}{' '}
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{base_trough_date ? `(${base_trough_date})` : ''}</span>
          </div>
        </div>
      </div>

      {/* Base Vertical Range Visualizer */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          <span>Trough: ${base_trough_price?.toFixed(2)} (0%)</span>
          <span style={{ color: '#f97316', fontWeight: '700' }}>
            🏹 Cheat Pivot: ${low_cheat_pivot_price?.toFixed(2)} ({base_position_pct}% of Base)
          </span>
          <span>Peak: ${base_peak_price?.toFixed(2)} (100%)</span>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', height: '10px', width: '100%', position: 'relative', overflow: 'hidden' }}>
          {/* Base Lower Half Allowed Zone (0% to 50%) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRight: '1px dashed rgba(56, 189, 248, 0.4)'
            }}
          />

          {/* Current Pivot Progress Bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, Math.max(5, base_position_pct))}%`,
              background: 'linear-gradient(90deg, #38bdf8, #f97316)',
              borderRadius: '6px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          <span>Lower 1/3 (Early Accumulation)</span>
          <span style={{ color: 'rgba(56, 189, 248, 0.7)' }}>50% Base Midpoint (Max Cheat Entry Bound)</span>
          <span>Classic Base Breakout</span>
        </div>
      </div>
    </div>
  );
}

