import React, { useState, useEffect, useMemo } from 'react';
import { fmtMoney } from './JournalCharts';
import './PositionCalculator.css';

/**
 * VanTharpCalculatorModal (Position Calculator)
 * Centered, High-Fidelity 2-Column Pre-Entry Sizing Dashboard:
 * - Left Column: Account & 1R Risk Budget, Pre-Entry Setup & LoD Guardrail, Multi-Stop Tranches
 * - Right Column: Planned Sizing Hero, Asymmetric Profit Targets, Order Execution Action Bar
 */
export default function VanTharpCalculatorModal({
  isOpen,
  onClose,
  accounts = [],
  totalUsdBalance = 0,
  totalUsdEquity = 0,
  defaultAccountId = '',
  symbol: propSymbol = '',
  initialSymbol = '',
  initialEntry = null,
  initialEntryPrice = null,
  initialStop = null,
  initialStopPrice = null,
  initialAtr = null,
  initialDollarAtr = null,
  initialDirection = 'LONG',
}) {
  // Auto-fetch accounts if modal opened outside JournalTab where accounts aren't passed
  const [internalAccounts, setInternalAccounts] = useState([]);
  const [internalTotalUsdEquity, setInternalTotalUsdEquity] = useState(0);
  const [internalTotalUsdBalance, setInternalTotalUsdBalance] = useState(0);

  useEffect(() => {
    if (isOpen && (!accounts || accounts.length === 0)) {
      let cancelled = false;
      fetch('/api/journal/accounts')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data && data.accounts) {
            setInternalAccounts(data.accounts);
            setInternalTotalUsdEquity(data.total_usd_equity || 0);
            setInternalTotalUsdBalance(data.total_usd_balance || 0);
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, accounts]);

  const effectiveAccounts = accounts && accounts.length > 0 ? accounts : internalAccounts;
  const effectiveTotalUsdEquity = totalUsdEquity > 0 ? totalUsdEquity : internalTotalUsdEquity;
  const effectiveTotalUsdBalance = totalUsdBalance > 0 ? totalUsdBalance : internalTotalUsdBalance;

  // Selected account ID ('all', account_id, or 'custom')
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    return defaultAccountId || (effectiveAccounts.length === 1 ? effectiveAccounts[0].account_id : 'all');
  });

  // USD Equity
  const [customEquity, setCustomEquity] = useState('');
  const [isCustomEquity, setIsCustomEquity] = useState(false);

  // Risk % (default to 1% as Van Tharp taught & requested by user)
  const [riskPct, setRiskPct] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_vt_risk_pct');
      return saved ? parseFloat(saved) || 1.0 : 1.0;
    } catch {
      return 1.0;
    }
  });

  // Stop Sizer Strategy Mode: '1-stop' | '2-stop' | '3-stop'
  const [stopMode, setStopMode] = useState(() => {
    try {
      const saved = localStorage.getItem('pt_calc_stop_mode');
      return saved || '3-stop';
    } catch {
      return '3-stop';
    }
  });

  // Pre-entry Trade Inputs
  const [symbol, setSymbol] = useState(initialSymbol || propSymbol || '');
  const [direction, setDirection] = useState(initialDirection || 'LONG');
  const [entryPrice, setEntryPrice] = useState(
    initialEntry != null ? String(initialEntry) : (initialEntryPrice != null ? String(initialEntryPrice) : '')
  );
  const [stopPrice, setStopPrice] = useState(
    initialStop != null ? String(initialStop) : (initialStopPrice != null ? String(initialStopPrice) : '')
  );
  const [dollarAtr, setDollarAtr] = useState(
    initialAtr != null ? String(initialAtr) : (initialDollarAtr != null ? String(initialDollarAtr) : '')
  );
  const [copied, setCopied] = useState(false);

  // Sync inputs when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const sym = initialSymbol || propSymbol;
      if (sym) setSymbol(sym.toUpperCase());
      const ent = initialEntry != null ? initialEntry : initialEntryPrice;
      if (ent != null) setEntryPrice(Number(ent).toFixed(2));
      const stp = initialStop != null ? initialStop : initialStopPrice;
      if (stp != null) setStopPrice(Number(stp).toFixed(2));
      const atr = initialAtr != null ? initialAtr : initialDollarAtr;
      if (atr != null) setDollarAtr(Number(atr).toFixed(2));
      if (initialDirection) setDirection(initialDirection);
      if (defaultAccountId) setSelectedAccountId(defaultAccountId);
    }
  }, [
    isOpen,
    initialSymbol,
    propSymbol,
    initialEntry,
    initialEntryPrice,
    initialStop,
    initialStopPrice,
    initialAtr,
    initialDollarAtr,
    initialDirection,
    defaultAccountId,
  ]);

  // Persist user preferences
  useEffect(() => {
    try {
      localStorage.setItem('pt_vt_risk_pct', String(riskPct));
    } catch { /* ignore */ }
  }, [riskPct]);

  useEffect(() => {
    try {
      localStorage.setItem('pt_calc_stop_mode', stopMode);
    } catch { /* ignore */ }
  }, [stopMode]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Escape' || e.key === 'Cancel') && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Active Account resolution
  const activeAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return effectiveAccounts.find((a) => a.account_id === selectedAccountId) || null;
  }, [effectiveAccounts, selectedAccountId]);

  const activeEquityUSD = useMemo(() => {
    if (isCustomEquity) {
      return parseFloat(customEquity) || 0;
    }
    if (selectedAccountId === 'all') {
      return effectiveTotalUsdEquity > 0
        ? effectiveTotalUsdEquity
        : effectiveAccounts.reduce((sum, a) => sum + (a.total_usd_equity || a.usd_balance || 0), 0);
    }
    return activeAccount ? (activeAccount.total_usd_equity ?? activeAccount.usd_balance ?? 0) : 0;
  }, [isCustomEquity, customEquity, selectedAccountId, effectiveTotalUsdEquity, effectiveAccounts, activeAccount]);

  const activeCashUSD = useMemo(() => {
    if (selectedAccountId === 'all') {
      return effectiveTotalUsdBalance > 0
        ? effectiveTotalUsdBalance
        : effectiveAccounts.reduce((sum, a) => sum + (a.usd_balance || 0), 0);
    }
    return activeAccount ? (activeAccount.usd_balance || 0) : 0;
  }, [selectedAccountId, effectiveTotalUsdBalance, effectiveAccounts, activeAccount]);

  const handleAccountSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomEquity(true);
      if (!customEquity) setCustomEquity(String(activeEquityUSD || 100000));
    } else {
      setIsCustomEquity(false);
      setSelectedAccountId(val);
    }
  };

  // Pre-Entry Calculations & Multi-Stop Tranches
  const calc = useMemo(() => {
    const equity = Math.max(0, activeEquityUSD);
    const cash = Math.max(0, activeCashUSD);
    const rPct = Math.max(0, parseFloat(riskPct) || 0);
    const isLong = direction === 'LONG';

    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopPrice) || 0;
    const atr = parseFloat(dollarAtr) || (entry > 0 ? entry * 0.03 : 1);

    // Stop distance calculation
    const stopDistance = isLong
      ? (entry > stop ? entry - stop : 0)
      : (stop > entry ? stop - entry : 0);
    const stopDistancePct = entry > 0 ? (stopDistance / entry) * 100 : 0;

    // Jeff Sun Guardrail: Stop distance <= 0.60 * ATR
    const atrMultiple = atr > 0 ? stopDistance / atr : 0;
    const isWithinAtrCorridor = atrMultiple <= 0.60 && atrMultiple > 0;
    const isLoosePivot = atrMultiple > 0.60;

    // 1R Risk Capital based on Total Equity
    const dollarRisk = (equity * rPct) / 100;

    // Van Tharp integer truncation: floor(Risk Money / Risk Per Share)
    const fullShares = stopDistance > 0 ? Math.floor(dollarRisk / stopDistance) : 0;
    const positionCost = fullShares * entry;
    const portfolioPct = equity > 0 ? (positionCost / equity) * 100 : 0;
    const allocationPct = portfolioPct;
    const actualRiskMoney = fullShares * stopDistance;

    // Cash limit check
    const maxCashShares = entry > 0 ? Math.floor(cash / entry) : 0;
    const exceedsCash = positionCost > cash && cash > 0;

    // Offset directions
    const stopOffsetSign = isLong ? -1 : 1;
    const targetOffsetSign = isLong ? 1 : -1;

    // Tranche Calculations
    // 1-Stop: 100% full shares @ stop
    const t1Shares1 = fullShares;
    const stop1Price1 = stop;
    const total1StopLoss = actualRiskMoney;
    const blendedRPct1 = 1.0;

    // 2-Stop: 50% / 50% split @ -0.50R & -1.0R
    const t1Shares2 = Math.floor(fullShares / 2);
    const t2Shares2 = Math.max(0, fullShares - t1Shares2);
    const stop1Price2 = Math.max(0, entry + stopOffsetSign * 0.50 * stopDistance);
    const stop2Price2 = stop;
    const loss1_2 = t1Shares2 * (0.50 * stopDistance);
    const loss2_2 = t2Shares2 * stopDistance;
    const total2StopLoss = loss1_2 + loss2_2;
    const blendedRPct2 = dollarRisk > 0 ? (total2StopLoss / dollarRisk) : 0.75;

    // 3-Stop: 1/3s split @ -0.33R, -0.67R, -1.0R (Jeff Sun protocol)
    const t1Shares3 = Math.floor(fullShares / 3);
    const t2Shares3 = Math.floor(fullShares / 3);
    const t3Shares3 = Math.max(0, fullShares - t1Shares3 - t2Shares3);
    const stop1Price3 = Math.max(0, entry + stopOffsetSign * (1 / 3) * stopDistance);
    const stop2Price3 = Math.max(0, entry + stopOffsetSign * (2 / 3) * stopDistance);
    const stop3Price3 = stop;
    const loss1_3 = t1Shares3 * ((1 / 3) * stopDistance);
    const loss2_3 = t2Shares3 * ((2 / 3) * stopDistance);
    const loss3_3 = t3Shares3 * stopDistance;
    const total3StopLoss = loss1_3 + loss2_3 + loss3_3;
    const blendedRPct3 = dollarRisk > 0 ? (total3StopLoss / dollarRisk) : 0.67;

    // Active tranche list
    let tranches = [];
    let totalStopLoss = actualRiskMoney;
    let blendedRPct = 1.0;
    let lossCapLabel = '-1.00R';

    if (stopMode === '1-stop') {
      totalStopLoss = total1StopLoss;
      blendedRPct = blendedRPct1;
      lossCapLabel = '-1.00R';
      tranches = [
        {
          id: 1,
          name: 'Hard Stop',
          shares: t1Shares1,
          pct: '100%',
          stopPrice: stop1Price1,
          loss: total1StopLoss,
          rMultiple: '-1.00R',
          desc: '100% position exit @ planned LoD',
        },
      ];
    } else if (stopMode === '2-stop') {
      totalStopLoss = total2StopLoss;
      blendedRPct = blendedRPct2;
      lossCapLabel = '-0.75R';
      tranches = [
        {
          id: 1,
          name: 'Tranche 1 (50%)',
          shares: t1Shares2,
          pct: '50%',
          stopPrice: stop1Price2,
          loss: loss1_2,
          rMultiple: '-0.50R',
          desc: 'Midpoint half-cut cushion',
        },
        {
          id: 2,
          name: 'Tranche 2 (50%)',
          shares: t2Shares2,
          pct: '50%',
          stopPrice: stop2Price2,
          loss: loss2_2,
          rMultiple: '-1.00R',
          desc: 'Structural Stop Loss / LoD',
        },
      ];
    } else {
      // 3-stop
      totalStopLoss = total3StopLoss;
      blendedRPct = blendedRPct3;
      lossCapLabel = '-0.67R';
      tranches = [
        {
          id: 1,
          name: 'Tranche 1 (1/3)',
          shares: t1Shares3,
          pct: '33%',
          stopPrice: stop1Price3,
          loss: loss1_3,
          rMultiple: '-0.33R',
          desc: 'Tight breach / BE defense',
        },
        {
          id: 2,
          name: 'Tranche 2 (1/3)',
          shares: t2Shares3,
          pct: '33%',
          stopPrice: stop2Price3,
          loss: loss2_3,
          rMultiple: '-0.67R',
          desc: 'Intermediate support breach',
        },
        {
          id: 3,
          name: 'Tranche 3 (1/3)',
          shares: t3Shares3,
          pct: '34%',
          stopPrice: stop3Price3,
          loss: loss3_3,
          rMultiple: '-1.00R',
          desc: 'Structural Stop Loss / LoD',
        },
      ];
    }

    const lossSaved = Math.max(0, actualRiskMoney - totalStopLoss);

    // Asymmetric Targets (+1R, +2R, +3R, +5R)
    const target1R = entry > 0 && stopDistance > 0 ? entry + targetOffsetSign * 1 * stopDistance : 0;
    const target2R = entry > 0 && stopDistance > 0 ? entry + targetOffsetSign * 2 * stopDistance : 0;
    const target3R = entry > 0 && stopDistance > 0 ? entry + targetOffsetSign * 3 * stopDistance : 0;
    const target5R = entry > 0 && stopDistance > 0 ? entry + targetOffsetSign * 5 * stopDistance : 0;

    return {
      equity,
      cash,
      rPct,
      isLong,
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
      positionCost,
      portfolioPct,
      allocationPct,
      actualRiskMoney,
      maxCashShares,
      exceedsCash,
      tranches,
      totalStopLoss,
      blendedRPct,
      lossCapLabel,
      lossSaved,
      target1R,
      target2R,
      target3R,
      target5R,
    };
  }, [activeEquityUSD, activeCashUSD, riskPct, direction, entryPrice, stopPrice, dollarAtr, stopMode]);

  // Copy Order Plan for Pre-Entry execution in TWS or notes
  const handleCopyPlan = () => {
    if (!calc.fullShares || !calc.entry) return;
    const sym = symbol ? symbol.toUpperCase() : 'STOCK';
    const lines = [
      `🎯 PRE-ENTRY POSITION PLAN (${sym}): ${calc.isLong ? 'BUY' : 'SELL SHORT'} ${calc.fullShares.toLocaleString()} SHARES`,
      `• Entry Price: $${calc.entry.toFixed(2)} | Planned Size: ${calc.fullShares.toLocaleString()} shs ($${calc.positionCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${calc.portfolioPct.toFixed(1)}% of Total USD Equity)`,
      `• Stop Guardrail: Distance $${calc.stopDistance.toFixed(2)} (${calc.stopDistancePct.toFixed(2)}%) = ${calc.atrMultiple.toFixed(2)}x ATR ${calc.isWithinAtrCorridor ? '✅ PASS (<=0.60x)' : calc.isLoosePivot ? '⚠️ WIDE (>0.60x)' : ''}`,
      `• Planned 1R Budget: $${calc.dollarRisk.toFixed(0)} (${riskPct}% of Total USD Equity $${calc.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
      `• Stop Strategy: ${stopMode.toUpperCase()} (Max Blended Loss: -$${calc.totalStopLoss.toFixed(0)} / ${calc.lossCapLabel})`,
      ...calc.tranches.map(
        (t) =>
          `    - ${t.name}: ${t.shares.toLocaleString()} shs @ Stop $${t.stopPrice.toFixed(2)} (${t.rMultiple}, Loss: -$${t.loss.toFixed(0)}) — ${t.desc}`
      ),
      `• Asymmetric Profit Targets:`,
      `    +1R (Breakeven R): $${calc.target1R.toFixed(2)} (+$${calc.actualRiskMoney.toFixed(0)})`,
      `    +2R (2:1 Reward): $${calc.target2R.toFixed(2)} (+$${(calc.actualRiskMoney * 2).toFixed(0)})`,
      `    +3R (Scale-out 1/3): $${calc.target3R.toFixed(2)} (+$${(calc.actualRiskMoney * 3).toFixed(0)})`,
      `    +5R (Trend Runner): $${calc.target5R.toFixed(2)} (+$${(calc.actualRiskMoney * 5).toFixed(0)})`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="vt-modal-backdrop" onClick={onClose}>
      <div className="vt-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vt-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧮</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Position Calculator {symbol ? `(${symbol.toUpperCase()})` : ''}
              </h3>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>
                Van Tharp Total Equity 1R Model · Stop Tranche Sizer · LoD ATR Guardrail
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
            style={{ fontSize: '15px', color: '#94a3b8', padding: '2px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* 2-Column Balanced Dashboard */}
        <div className="vt-grid-layout">
          {/* Left Column: Account & 1R Risk, Setup & Guardrail, Stop Sizer Tranches */}
          <div className="vt-col">
            {/* 1. Account & 1R Risk Budget */}
            <div className="vt-card">
              <div className="vt-card-title">
                <span>1. Account &amp; 1R Risk Budget</span>
              </div>

              <div className="vt-input-group">
                <select
                  className="vt-select-account"
                  value={isCustomEquity ? 'custom' : selectedAccountId}
                  onChange={handleAccountSelect}
                >
                  {effectiveAccounts.length > 1 && (
                    <option value="all">
                      All Accounts Combined ({fmtMoney(effectiveTotalUsdEquity || effectiveTotalUsdBalance, { sign: false })} Total Equity)
                    </option>
                  )}
                  {effectiveAccounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.account_id} {a.name ? `(${a.name})` : ''} — {fmtMoney(a.total_usd_equity || a.usd_balance, { sign: false })}
                    </option>
                  ))}
                  <option value="custom">✏️ Custom USD Equity…</option>
                </select>
              </div>

              {isCustomEquity ? (
                <div className="vt-input-group">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    className="vt-input"
                    value={customEquity}
                    onChange={(e) => setCustomEquity(e.target.value)}
                    placeholder="e.g. 100000"
                  />
                </div>
              ) : (
                <div className="vt-account-risk-row">
                  {/* Account stats */}
                  <div className="vt-account-stat-box">
                    <div className="vt-stat-box-row">
                      <span className="vt-sublabel">Total USD Equity:</span>
                      <span className="vt-usd-value">{fmtMoney(calc.equity, { sign: false })}</span>
                    </div>
                    {activeAccount && (
                      <div className="vt-stat-box-breakdown">
                        <span>Cash: <b>{fmtMoney(activeAccount.usd_balance, { sign: false })}</b></span>
                        <span>•</span>
                        <span>Open: <b>{fmtMoney(activeAccount.open_positions_value || 0, { sign: true })}</b></span>
                        {activeAccount.cad_balance > 0 && (
                          <span className="vt-cad-tag">CAD C{fmtMoney(activeAccount.cad_balance, { sign: false })}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1R Budget Box */}
                  <div className="vt-risk-side-box">
                    <div className="vt-risk-presets">
                      {[0.5, 0.75, 1.0, 1.5].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          className={`vt-preset-btn ${riskPct === pct ? 'active' : ''}`}
                          onClick={() => setRiskPct(pct)}
                        >
                          {pct}% {pct === 1.0 ? '⭐' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="vt-risk-bottom-row">
                      <span style={{ fontSize: '10px', color: '#fb7185', fontWeight: 700 }}>1R BUDGET:</span>
                      <span className="vt-1r-val">{fmtMoney(calc.dollarRisk, { sign: false })} USD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Pre-Entry Trade Setup & LoD Guardrail */}
            <div className="vt-card">
              <div className="vt-card-title">
                <span>2. Pre-Entry Setup &amp; ATR Guardrail</span>
              </div>

              <div className="vt-trade-inputs-row1">
                <div className="vt-input-group">
                  <label className="vt-label">Direction</label>
                  <div className="segmented-control" style={{ height: '28px' }}>
                    <button
                      type="button"
                      className={`segmented-item ${direction === 'LONG' ? 'active' : ''}`}
                      onClick={() => setDirection('LONG')}
                      style={{ fontSize: '11px', padding: '0 6px' }}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      className={`segmented-item ${direction === 'SHORT' ? 'active' : ''}`}
                      onClick={() => setDirection('SHORT')}
                      style={{ fontSize: '11px', padding: '0 6px' }}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div className="vt-input-group">
                  <label className="vt-label">Symbol</label>
                  <input
                    type="text"
                    className="vt-input"
                    placeholder="e.g. NVDA"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="vt-input-group">
                  <label className="vt-label">Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="vt-input"
                    placeholder="e.g. 150.00"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                  />
                </div>

                <div className="vt-input-group">
                  <label className="vt-label">Stop / LoD ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="vt-input"
                    placeholder={direction === 'LONG' ? 'e.g. 147.50' : 'e.g. 152.50'}
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="vt-trade-inputs-row2">
                <div className="vt-input-group">
                  <label className="vt-label">
                    <span>Dollar ATR ($)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="vt-input"
                    placeholder="e.g. 4.20"
                    value={dollarAtr}
                    onChange={(e) => setDollarAtr(e.target.value)}
                  />
                </div>

                {/* LoD Risk Corridor Guardrail Banner */}
                {calc.entry > 0 && calc.stop > 0 ? (
                  <div
                    className={`vt-atr-banner ${
                      calc.isWithinAtrCorridor
                        ? 'vt-guardrail-pass'
                        : calc.isLoosePivot
                        ? 'vt-guardrail-fail'
                        : 'vt-guardrail-neutral'
                    }`}
                  >
                    <div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        LoD Guardrail (&le; 0.60x ATR):
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '1px' }}>
                        Dist: ${calc.stopDistance.toFixed(2)} ({calc.stopDistancePct.toFixed(1)}%) = {calc.atrMultiple.toFixed(2)}x ATR
                      </div>
                    </div>
                    <div>
                      {calc.isWithinAtrCorridor ? (
                        <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}>
                          ✅ TIGHT PIVOT
                        </span>
                      ) : calc.isLoosePivot ? (
                        <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
                          ⚠️ WIDE RISK
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="vt-atr-banner vt-guardrail-neutral">
                    <span style={{ fontSize: '10.5px' }}>Enter entry and stop to check LoD corridor.</span>
                  </div>
                )}
              </div>

              {/* Validation Warnings */}
              {calc.entry > 0 && calc.stop > 0 && (
                <div className="vt-guardrails">
                  {calc.isLong && calc.stop >= calc.entry && (
                    <div className="vt-alert vt-alert-err">
                      ⚠️ Stop Loss must be &lt; Entry for a LONG position.
                    </div>
                  )}
                  {!calc.isLong && calc.stop <= calc.entry && (
                    <div className="vt-alert vt-alert-err">
                      ⚠️ Stop Loss must be &gt; Entry for a SHORT position.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Stop Sizer Tranches */}
            <div className="vt-card">
              <div className="vt-card-title">
                <span>3. Stop Strategy &amp; Exit Tranches</span>
                <span className="vt-card-title-sub">Pre-Entry Exit Scaling</span>
              </div>

              <div className="vt-mode-segmented">
                <button
                  type="button"
                  className={`vt-mode-btn ${stopMode === '1-stop' ? 'active' : ''}`}
                  onClick={() => setStopMode('1-stop')}
                >
                  1-Stop (Hard)
                </button>
                <button
                  type="button"
                  className={`vt-mode-btn ${stopMode === '2-stop' ? 'active' : ''}`}
                  onClick={() => setStopMode('2-stop')}
                >
                  2-Stop (50/50 Split)
                </button>
                <button
                  type="button"
                  className={`vt-mode-btn ${stopMode === '3-stop' ? 'active' : ''}`}
                  onClick={() => setStopMode('3-stop')}
                >
                  3-Stop (Jeff Sun 1/3s)
                </button>
              </div>

              <div className="vt-tranche-header">
                <span>🛡️ Tranches ({calc.lossCapLabel} Cap):</span>
                <span style={{ color: '#34d399', fontSize: '10.5px' }}>
                  Max Loss: -${calc.totalStopLoss.toFixed(0)} ({(calc.blendedRPct * 100).toFixed(0)}% of 1R)
                </span>
              </div>

              <div className="vt-tranche-list">
                {calc.tranches.map((t) => (
                  <div key={t.id} className="vt-tranche-item">
                    <div className="vt-tranche-left">
                      <span className="vt-tranche-title">
                        {t.name}: <span style={{ color: '#38bdf8' }}>{t.shares.toLocaleString()} shs</span>
                      </span>
                      <span className="vt-tranche-desc">({t.desc})</span>
                    </div>
                    <div className="vt-tranche-right">
                      <span className="vt-tranche-price">Stop: ${t.stopPrice.toFixed(2)}</span>
                      <span className="vt-tranche-loss">-${t.loss.toFixed(0)} ({t.rMultiple})</span>
                    </div>
                  </div>
                ))}
              </div>

              {calc.lossSaved > 0 && (
                <div style={{ fontSize: '10.5px', color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 8px', borderRadius: '4px' }}>
                  ✨ Tranche scaling protects <b>${calc.lossSaved.toFixed(0)}</b> ({((1 - calc.blendedRPct) * 100).toFixed(0)}% of 1R) vs hard stop!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Planned Sizing, Profit Targets & Action Bar */}
          <div className="vt-col">
            {/* 4. Position Sizing Hero Card */}
            <div className="vt-card vt-hero-card">
              <div className="vt-card-title">4. Position Sizing</div>

              <div className="vt-results-hero">
                <div className="vt-shares-number">
                  {calc.fullShares > 0 ? calc.fullShares.toLocaleString() : '0'}
                </div>
                <div className="vt-shares-label">SHARES TO {calc.isLong ? 'BUY' : 'SHORT'}</div>
              </div>

              <div className="vt-metrics-breakdown">
                <div className="vt-metric-item">
                  <span className="vt-metric-label">Stop / Share</span>
                  <span className="vt-metric-value">
                    ${calc.stopDistance.toFixed(2)} <span className="vt-metric-sub">({calc.stopDistancePct.toFixed(1)}%)</span>
                  </span>
                </div>

                <div className="vt-metric-item">
                  <span className="vt-metric-label">1R Dollar Risk</span>
                  <span className="vt-metric-value vt-highlight-emerald">
                    {fmtMoney(calc.actualRiskMoney, { sign: false })}
                  </span>
                </div>

                <div className="vt-metric-item">
                  <span className="vt-metric-label">Capital Req.</span>
                  <span className="vt-metric-value">
                    {fmtMoney(calc.positionCost, { sign: false })}
                  </span>
                </div>

                <div className="vt-metric-item">
                  <span className="vt-metric-label">% USD Equity</span>
                  <span className="vt-metric-value">
                    {calc.portfolioPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {calc.exceedsCash && (
                <div className="vt-alert vt-alert-warn" style={{ marginTop: '2px', padding: '3px 6px', fontSize: '10px' }}>
                  ⚠️ Exceeds cash ({fmtMoney(calc.cash, { sign: false })}). Max cash: <b>{calc.maxCashShares.toLocaleString()} shs</b>.
                </div>
              )}
            </div>

            {/* 5. Asymmetric Profit Targets */}
            <div className="vt-card">
              <div className="vt-card-title">
                <span>5. Profit Targets</span>
                <span className="vt-card-title-sub">R-Multiples</span>
              </div>

              <div className="vt-targets-table-wrapper">
                <table className="vt-targets-table">
                  <thead>
                    <tr>
                      <th>Multiple</th>
                      <th>Target Price</th>
                      <th>Expected Profit</th>
                      <th>Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="vt-r-tag vt-r-1">1.0R</span> <span style={{ color: '#94a3b8' }}>Breakeven R</span></td>
                      <td className="jr-num">${calc.target1R.toFixed(2)}</td>
                      <td className="jr-num vt-highlight-emerald">{fmtMoney(calc.actualRiskMoney, { sign: true })}</td>
                      <td className="jr-num">+{calc.stopDistancePct.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td><span className="vt-r-tag vt-r-2">2.0R</span> <span style={{ color: '#94a3b8' }}>2:1 Reward</span></td>
                      <td className="jr-num">${calc.target2R.toFixed(2)}</td>
                      <td className="jr-num vt-highlight-emerald">{fmtMoney(calc.actualRiskMoney * 2, { sign: true })}</td>
                      <td className="jr-num">+{(calc.stopDistancePct * 2).toFixed(1)}%</td>
                    </tr>
                    <tr className="vt-highlight-row">
                      <td><span className="vt-r-tag vt-r-3">3.0R</span> <span style={{ color: '#94a3b8' }}>Scale-Out 1/3</span></td>
                      <td className="jr-num font-bold">${calc.target3R.toFixed(2)}</td>
                      <td className="jr-num vt-highlight-emerald font-bold">{fmtMoney(calc.actualRiskMoney * 3, { sign: true })}</td>
                      <td className="jr-num font-bold">+{(calc.stopDistancePct * 3).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td><span className="vt-r-tag vt-r-5">5.0R</span> <span style={{ color: '#94a3b8' }}>Trend Runner</span></td>
                      <td className="jr-num font-bold">${calc.target5R.toFixed(2)}</td>
                      <td className="jr-num vt-highlight-emerald font-bold">{fmtMoney(calc.actualRiskMoney * 5, { sign: true })}</td>
                      <td className="jr-num font-bold">+{(calc.stopDistancePct * 5).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="vt-action-bar">
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-primary'} vt-copy-btn`}
                onClick={handleCopyPlan}
                disabled={!calc.fullShares || !calc.entry}
                style={{ fontSize: '12px', padding: '6px 12px', height: '32px', fontWeight: 700 }}
              >
                {copied ? '✓ Copied Pre-Entry Plan!' : '📋 Copy Pre-Entry Plan'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontSize: '12px', padding: '6px 14px', height: '32px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
