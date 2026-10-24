import React, { useState, useEffect, useMemo } from 'react';

/**
 * ThreeStopCalculatorModal:
 * Jeff Sun inspired execution & risk management calculator:
 * 1. LoD (Low of Day) Rule Guardrail Check: verifies if Entry - LoD <= 0.60 * ATR.
 * 2. 3-Stop Tranche Scaling: scales out in 3 tranches (tight pivot, LoD, structural)
 *    ensuring the blended mathematical loss is capped at -0.67R of planned budget.
 * 3. Asymmetric Profit Targets (+2R, +3R, +5R).
 */
export default function ThreeStopCalculatorModal({
  isOpen,
  onClose,
  symbol = '',
  initialEntryPrice = null,
  initialStopPrice = null,
  initialAtr = null,
}) {
  // Stop Mode: '2-stop' (default for small positions) or '3-stop' (Jeff Sun)
  const [stopMode, setStopMode] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_calc_stop_mode');
      return saved || '2-stop';
    } catch (_) {
      return '2-stop';
    }
  });

  // Saved user preferences
  const [equity, setEquity] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_calc_equity');
      return saved ? parseFloat(saved) || 100000 : 100000;
    } catch (_) {
      return 100000;
    }
  });

  const [riskPct, setRiskPct] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_calc_risk_pct');
      return saved ? parseFloat(saved) || 0.5 : 0.5;
    } catch (_) {
      return 0.5;
    }
  });

  const [entryPrice, setEntryPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [dollarAtr, setDollarAtr] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync initial inputs when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialEntryPrice) {
        setEntryPrice(Number(initialEntryPrice).toFixed(2));
      }
      if (initialStopPrice) {
        setStopPrice(Number(initialStopPrice).toFixed(2));
      } else if (initialEntryPrice && initialAtr) {
        // Default stop to ~0.5 ATR below entry if LoD not available
        setStopPrice((Number(initialEntryPrice) - Number(initialAtr) * 0.5).toFixed(2));
      }
      if (initialAtr) {
        setDollarAtr(Number(initialAtr).toFixed(2));
      }
    }
  }, [isOpen, initialEntryPrice, initialStopPrice, initialAtr]);

  // Persist equity and risk preferences
  useEffect(() => {
    try {
      localStorage.setItem('pt_calc_equity', String(equity));
    } catch (_) {}
  }, [equity]);

  useEffect(() => {
    try {
      localStorage.setItem('pt_calc_risk_pct', String(riskPct));
    } catch (_) {}
  }, [riskPct]);

  useEffect(() => {
    try {
      localStorage.setItem('pt_calc_stop_mode', stopMode);
    } catch (_) {}
  }, [stopMode]);

  // Close on Escape or Cancel key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Escape' || e.key === 'Cancel') && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Math calculations
  const calc = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopPrice) || 0;
    const atr = parseFloat(dollarAtr) || (entry > 0 ? entry * 0.03 : 1);
    const eq = parseFloat(equity) || 0;
    const rPct = parseFloat(riskPct) || 0;

    const stopDistance = entry > stop ? entry - stop : 0;
    const stopDistancePct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const atrMultiple = atr > 0 ? stopDistance / atr : 0;

    // Jeff Sun Guardrail: Stop distance <= 0.60 * ATR
    const isWithinAtrCorridor = atrMultiple <= 0.60 && atrMultiple > 0;
    const isLoosePivot = atrMultiple > 0.60;

    // Dollar Risk (1.0R)
    const dollarRisk = (eq * rPct) / 100;

    // Share sizing
    const fullShares = stopDistance > 0 ? Math.floor(dollarRisk / stopDistance) : 0;
    const positionValue = fullShares * entry;
    const portfolioPct = eq > 0 ? (positionValue / eq) * 100 : 0;

    const is2Stop = stopMode === '2-stop';

    // 2-Stop (50% / 50% split @ -0.50R & -1.0R)
    const t1Shares2 = Math.floor(fullShares / 2);
    const t2Shares2 = Math.max(0, fullShares - t1Shares2);
    const stop1Price2 = Math.max(0, entry - 0.50 * stopDistance);
    const stop2Price2 = stop;
    const loss1_2 = t1Shares2 * (entry - stop1Price2);
    const loss2_2 = t2Shares2 * (entry - stop2Price2);
    const total2StopLoss = loss1_2 + loss2_2;
    const blendedRPct2 = dollarRisk > 0 ? (total2StopLoss / dollarRisk) : 0.75;

    // 3-Stop (1/3s split @ -0.33R, -0.67R, -1.0R)
    const t1Shares3 = Math.floor(fullShares / 3);
    const t2Shares3 = Math.floor(fullShares / 3);
    const t3Shares3 = Math.max(0, fullShares - t1Shares3 - t2Shares3);
    const stop1Price3 = Math.max(0, entry - (1 / 3) * stopDistance);
    const stop2Price3 = Math.max(0, entry - (2 / 3) * stopDistance);
    const stop3Price3 = stop;
    const loss1_3 = t1Shares3 * (entry - stop1Price3);
    const loss2_3 = t2Shares3 * (entry - stop2Price3);
    const loss3_3 = t3Shares3 * (entry - stop3Price3);
    const total3StopLoss = loss1_3 + loss2_3 + loss3_3;
    const blendedRPct3 = dollarRisk > 0 ? (total3StopLoss / dollarRisk) : 0.67;

    // Active mode values
    const t1Shares = is2Stop ? t1Shares2 : t1Shares3;
    const t2Shares = is2Stop ? t2Shares2 : t2Shares3;
    const t3Shares = is2Stop ? 0 : t3Shares3;

    const stop1Price = is2Stop ? stop1Price2 : stop1Price3;
    const stop2Price = is2Stop ? stop2Price2 : stop2Price3;
    const stop3Price = is2Stop ? null : stop3Price3;

    const totalStopLoss = is2Stop ? total2StopLoss : total3StopLoss;
    const blendedRPct = is2Stop ? blendedRPct2 : blendedRPct3;
    const lossCapLabel = is2Stop ? '-0.75R' : '-0.67R';

    // Profit Targets
    const target2R = entry + 2 * stopDistance;
    const target3R = entry + 3 * stopDistance;
    const target5R = entry + 5 * stopDistance;

    return {
      entry,
      stop,
      atr,
      stopDistance,
      stopDistancePct,
      atrMultiple,
      isWithinAtrCorridor,
      isLoosePivot,
      dollarRisk,
      fullShares,
      positionValue,
      portfolioPct,
      is2Stop,
      t1Shares,
      t2Shares,
      t3Shares,
      stop1Price,
      stop2Price,
      stop3Price,
      totalStopLoss,
      blendedRPct,
      lossCapLabel,
      target2R,
      target3R,
      target5R,
    };
  }, [entryPrice, stopPrice, dollarAtr, equity, riskPct, stopMode]);

  const handleCopyPlan = () => {
    if (!calc.fullShares || !symbol) return;
    const is2Stop = stopMode === '2-stop';
    const text = is2Stop
      ? [
          `🎯 ${symbol.toUpperCase()} 2-STOP EXECUTION PLAN (50/50):`,
          `• Entry: $${calc.entry.toFixed(2)} | Planned Size: ${calc.fullShares} shs ($${calc.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${calc.portfolioPct.toFixed(1)}% acct)`,
          `• Stop Guardrail: $${calc.stopDistance.toFixed(2)} (${calc.stopDistancePct.toFixed(2)}%) = ${calc.atrMultiple.toFixed(2)}x ATR ${calc.isWithinAtrCorridor ? '✅ PASS (<=0.60x)' : '⚠️ WIDE (>0.60x)'}`,
          `• Tranche 1 (50%): ${calc.t1Shares} shs @ Stop $${calc.stop1Price.toFixed(2)} (-0.50R / Midpoint)`,
          `• Tranche 2 (50%): ${calc.t2Shares} shs @ Stop $${calc.stop2Price.toFixed(2)} (LoD / -1.0R)`,
          `• Max Mathematical Loss: -$${calc.totalStopLoss.toFixed(0)} (${(calc.blendedRPct * 100).toFixed(0)}% of 1R budget)`,
          `• Targets: +2R = $${calc.target2R.toFixed(2)} | +3R = $${calc.target3R.toFixed(2)} | +5R = $${calc.target5R.toFixed(2)}`,
        ].join('\n')
      : [
          `🎯 ${symbol.toUpperCase()} 3-STOP EXECUTION PLAN (1/3s):`,
          `• Entry: $${calc.entry.toFixed(2)} | Planned Size: ${calc.fullShares} shs ($${calc.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${calc.portfolioPct.toFixed(1)}% acct)`,
          `• Stop Guardrail: $${calc.stopDistance.toFixed(2)} (${calc.stopDistancePct.toFixed(2)}%) = ${calc.atrMultiple.toFixed(2)}x ATR ${calc.isWithinAtrCorridor ? '✅ PASS (<=0.60x)' : '⚠️ WIDE (>0.60x)'}`,
          `• Tranche 1 (1/3): ${calc.t1Shares} shs @ Stop $${calc.stop1Price.toFixed(2)} (-0.33R)`,
          `• Tranche 2 (1/3): ${calc.t2Shares} shs @ Stop $${calc.stop2Price.toFixed(2)} (-0.67R)`,
          `• Tranche 3 (1/3): ${calc.t3Shares} shs @ Stop $${calc.stop3Price.toFixed(2)} (LoD / -1.0R)`,
          `• Max Mathematical Loss: -$${calc.totalStopLoss.toFixed(0)} (${(calc.blendedRPct * 100).toFixed(0)}% of 1R budget)`,
          `• Targets: +2R = $${calc.target2R.toFixed(2)} | +3R = $${calc.target3R.toFixed(2)} | +5R = $${calc.target5R.toFixed(2)}`,
        ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          padding: '22px 24px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧮</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                {stopMode === '2-stop' ? '2-Stop' : '3-Stop'} Position Sizer {symbol ? `(${symbol.toUpperCase()})` : ''}
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {stopMode === '2-stop'
                  ? '50/50 Scaled Exit Protocol: -0.50R Half-Cut & -0.75R Loss Cap'
                  : 'Jeff Sun Risk Protocol: 0.60x ATR LoD Guardrail & -0.67R Loss Cap'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Stop Mode Toggle (2-Stop vs 3-Stop) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '7px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Stop Model:</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
              {stopMode === '2-stop' ? '50/50 Split (Simpler for < $5k size)' : '3-Tier Scale (Jeff Sun 1/3s)'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.35)', padding: '3px', borderRadius: '7px' }}>
            <button
              type="button"
              onClick={() => setStopMode('2-stop')}
              style={{
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: stopMode === '2-stop' ? 800 : 600,
                cursor: 'pointer',
                background: stopMode === '2-stop' ? '#38bdf8' : 'transparent',
                color: stopMode === '2-stop' ? '#0f172a' : '#94a3b8',
                border: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              2-Stop (50/50)
            </button>
            <button
              type="button"
              onClick={() => setStopMode('3-stop')}
              style={{
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: stopMode === '3-stop' ? 800 : 600,
                cursor: 'pointer',
                background: stopMode === '3-stop' ? '#38bdf8' : 'transparent',
                color: stopMode === '3-stop' ? '#0f172a' : '#94a3b8',
                border: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              3-Stop (1/3s)
            </button>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Account Equity ($)
            </label>
            <input
              type="number"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>
                Risk Per Trade (%)
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.25, 0.5, 0.75, 1.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRiskPct(preset)}
                    style={{
                      background: riskPct === preset ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${riskPct === preset ? '#38bdf8' : 'transparent'}`,
                      borderRadius: '4px',
                      color: riskPct === preset ? '#38bdf8' : '#94a3b8',
                      fontSize: '10px',
                      padding: '1px 4px',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              step="0.05"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Entry Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="e.g. 150.00"
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Stop / LoD ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="e.g. 147.50"
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Dollar ATR ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={dollarAtr}
              onChange={(e) => setDollarAtr(e.target.value)}
              placeholder="e.g. 4.20"
              style={{
                width: '100%',
                padding: '7px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* LoD Guardrail Banner */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: calc.isWithinAtrCorridor
              ? 'rgba(16, 185, 129, 0.12)'
              : calc.isLoosePivot
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${
              calc.isWithinAtrCorridor
                ? 'rgba(16, 185, 129, 0.35)'
                : calc.isLoosePivot
                ? 'rgba(239, 68, 68, 0.45)'
                : 'rgba(255, 255, 255, 0.1)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
              Jeff Sun LoD Risk Corridor Check (Stop &le; 0.60x ATR):
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              Stop Distance: ${calc.stopDistance.toFixed(2)} ({calc.stopDistancePct.toFixed(2)}%) ={' '}
              <span
                style={{
                  color: calc.isWithinAtrCorridor ? '#34d399' : calc.isLoosePivot ? '#f87171' : '#ffffff',
                }}
              >
                {calc.atrMultiple.toFixed(2)}x ATR
              </span>
            </div>
          </div>
          <div>
            {calc.isWithinAtrCorridor ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.2)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                ✅ TIGHT PIVOT
              </span>
            ) : calc.isLoosePivot ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.25)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                ⚠️ WIDE RISK
              </span>
            ) : null}
          </div>
        </div>

        {/* Total Position Size Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Planned Dollar Risk (1R)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fb7185' }}>
              ${calc.dollarRisk.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Shares</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
              {calc.fullShares.toLocaleString()} shs
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Position Value (% Acct)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
              ${calc.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({calc.portfolioPct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Tranches Execution Plan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
            <span>🛡️ {calc.is2Stop ? '2-Stop' : '3-Stop'} Tranche Execution (Loss Capped at {calc.lossCapLabel}):</span>
            <span style={{ color: '#34d399' }}>Max Loss: -${calc.totalStopLoss.toFixed(0)} ({(calc.blendedRPct * 100).toFixed(0)}% of 1R)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Tranche 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                  {calc.is2Stop ? 'Tranche 1 (50%): ' : 'Tranche 1 (1/3): '}
                </span>
                <span style={{ color: '#94a3b8' }}>{calc.t1Shares} shares</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fde047' }}>
                Stop: ${calc.stop1Price.toFixed(2)}{' '}
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  {calc.is2Stop ? '(-0.50R / Midpoint)' : '(-0.33R / BE)'}
                </span>
              </div>
            </div>

            {/* Tranche 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                  {calc.is2Stop ? 'Tranche 2 (50%): ' : 'Tranche 2 (1/3): '}
                </span>
                <span style={{ color: '#94a3b8' }}>{calc.t2Shares} shares</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: calc.is2Stop ? '#f87171' : '#fb923c' }}>
                Stop: ${calc.stop2Price.toFixed(2)}{' '}
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  {calc.is2Stop ? '(LoD / -1.0R)' : '(-0.67R)'}
                </span>
              </div>
            </div>

            {/* Tranche 3 (Only shown in 3-Stop mode) */}
            {!calc.is2Stop && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>Tranche 3 (1/3): </span>
                  <span style={{ color: '#94a3b8' }}>{calc.t3Shares} shares</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f87171' }}>
                  Stop: ${calc.stop3Price?.toFixed(2)}{' '}
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>(LoD / -1.0R)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profit Targets Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>+2R Target</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
              ${calc.target2R.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>+${(calc.dollarRisk * 2).toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>+3R Target</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
              ${calc.target3R.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>+${(calc.dollarRisk * 3).toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>+5R Target</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
              ${calc.target5R.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>+${(calc.dollarRisk * 5).toFixed(0)}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleCopyPlan}
            disabled={!calc.fullShares}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: copied ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.2)',
              border: `1px solid ${copied ? '#10b981' : '#38bdf8'}`,
              color: copied ? '#34d399' : '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: calc.fullShares ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy Order Plan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

