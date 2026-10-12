import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, BaselineSeries, CrosshairMode, LineStyle } from 'lightweight-charts';

// ----------------- Formatting helpers (shared with JournalTab) -----------------

export function fmtMoney(v, { compact = false, sign = true } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = v > 0 && sign ? '+' : v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (compact && a >= 1000) {
    return `${s}$${a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k'}`;
  }
  return `${s}$${a.toLocaleString(undefined, { minimumFractionDigits: a >= 1000 ? 0 : 2, maximumFractionDigits: a >= 1000 ? 0 : 2 })}`;
}

export function fmtPct(v, digits = 1, sign = true) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = v > 0 && sign ? '+' : v < 0 ? '−' : '';
  return `${s}${Math.abs(v).toFixed(digits)}%`;
}

export function pnlClass(v) {
  if (v === null || v === undefined) return '';
  return v > 0 ? 'jr-pos' : v < 0 ? 'jr-neg' : '';
}

function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

function buildBins(values, requestedWidth) {
  if (!values.length) return { bins: [], width: requestedWidth || 1, lo: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const auto = niceStep((max - min) / 18 || Math.abs(max) || 1);
  let w = requestedWidth || auto;
  if ((max - min) / w > 80) w = auto; // guard against a tiny manual width producing hundreds of bars
  const idx = (v) => Math.floor(v / w + 1e-9);
  const lo = idx(min);
  const hi = idx(max);
  const bins = [];
  for (let i = lo; i <= hi; i++) bins.push({ start: i * w, end: (i + 1) * w, count: 0 });
  values.forEach((v) => { bins[idx(v) - lo].count += 1; });
  return { bins, width: w, lo };
}

const PCT_WIDTHS = [null, 1, 2, 5, 10];

// ----------------- Gain / Loss distribution histogram -----------------

export function PnlDistributionChart({ trades, selectedBin, onSelectBin }) {
  const [mode, setMode] = useState('pct');
  const [binWidth, setBinWidth] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const values = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'CLOSED' && t.pnl !== null && t.pnl !== undefined);
    return mode === 'pct'
      ? closed.filter((t) => t.pnl_pct !== null && t.pnl_pct !== undefined).map((t) => t.pnl_pct)
      : closed.map((t) => t.pnl);
  }, [trades, mode]);

  const { bins, width, lo } = useMemo(() => buildBins(values, mode === 'pct' ? binWidth : null), [values, binWidth, mode]);

  const summary = useMemo(() => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const gains = values.filter((v) => v > 0);
    const losses = values.filter((v) => v < 0);
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    return { mean, median, gains: gains.length, losses: losses.length, avgGain: avg(gains), avgLoss: avg(losses) };
  }, [values]);

  const fmtVal = (v) => (mode === 'pct' ? fmtPct(v, width < 1 ? 1 : 0) : fmtMoney(v, { compact: true }));

  const W = 760, H = 280;
  const m = { l: 40, r: 14, t: 18, b: 42 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const n = bins.length;
  const bw = n ? pw / n : pw;
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const yStep = Math.max(1, Math.ceil(niceStep(maxCount / 4)));
  const yTicks = [];
  for (let v = 0; v <= maxCount; v += yStep) yTicks.push(v);
  const xOf = (v) => m.l + (v / width - lo) * bw;
  const labelEvery = Math.max(1, Math.ceil(n / 10));
  const hovered = hoverIdx !== null ? bins[hoverIdx] : null;
  const isSelected = (b) => selectedBin && selectedBin.mode === mode && selectedBin.start === b.start && selectedBin.end === b.end;

  return (
    <div className="glass-card jr-chart-card">
      <div className="jr-card-header">
        <div>
          <div className="jr-card-title">Gain / Loss Distribution</div>
          <div className="jr-card-subtitle">Closed round trips · click a bar to filter the trade list</div>
        </div>
        <div className="jr-card-controls">
          {mode === 'pct' && (
            <select className="jr-select" value={binWidth ?? ''} onChange={(e) => setBinWidth(e.target.value ? Number(e.target.value) : null)} aria-label="Bin width">
              {PCT_WIDTHS.map((w) => <option key={w ?? 'auto'} value={w ?? ''}>{w ? `${w}% bins` : 'Auto bins'}</option>)}
            </select>
          )}
          <div className="segmented-control">
            <button className={`segmented-item ${mode === 'pct' ? 'active' : ''}`} onClick={() => setMode('pct')}>% Return</button>
            <button className={`segmented-item ${mode === 'usd' ? 'active' : ''}`} onClick={() => setMode('usd')}>$ P&amp;L</button>
          </div>
        </div>
      </div>

      {!n ? (
        <div className="jr-empty">No closed trades in this range.</div>
      ) : (
        <div className="jr-hist-wrap">
          <div className="jr-hist-tooltip">
            {hovered
              ? `${fmtVal(hovered.start)} to ${fmtVal(hovered.end)} · ${hovered.count} trade${hovered.count === 1 ? '' : 's'} (${((hovered.count / values.length) * 100).toFixed(0)}%)`
              : `${values.length} trades · bin ${mode === 'pct' ? `${width}%` : fmtMoney(width, { compact: true, sign: false })}`}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="jr-hist-svg" role="img" aria-label="Histogram of trade returns">
            {yTicks.map((v) => {
              const y = m.t + ph - (v / maxCount) * ph;
              return (
                <g key={`y${v}`}>
                  <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
                  <text x={m.l - 8} y={y + 3} textAnchor="end" className="jr-axis-text">{v}</text>
                </g>
              );
            })}
            {bins.map((b, i) => {
              const h = (b.count / maxCount) * ph;
              const gain = b.start >= 0;
              const sel = isSelected(b);
              return (
                <g key={b.start}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => b.count && onSelectBin(sel ? null : { mode, start: b.start, end: b.end, label: `${fmtVal(b.start)} to ${fmtVal(b.end)}` })}
                  style={{ cursor: b.count ? 'pointer' : 'default' }}>
                  <rect x={m.l + i * bw} y={m.t} width={bw} height={ph} fill={hoverIdx === i ? 'rgba(255,255,255,0.03)' : 'transparent'} />
                  <rect
                    x={m.l + i * bw + Math.min(2, bw * 0.12)}
                    y={m.t + ph - h}
                    width={Math.max(1, bw - Math.min(4, bw * 0.24))}
                    height={h}
                    rx={2}
                    fill={gain ? 'rgba(16,185,129,0.75)' : 'rgba(244,63,94,0.75)'}
                    stroke={sel ? '#fff' : 'none'}
                    strokeWidth={sel ? 1.5 : 0}
                  />
                  {b.count > 0 && bw >= 18 && (
                    <text x={m.l + i * bw + bw / 2} y={m.t + ph - h - 4} textAnchor="middle" className="jr-bar-label">{b.count}</text>
                  )}
                </g>
              );
            })}
            {bins.map((b, i) => (i % labelEvery === 0 ? (
              <text key={`x${b.start}`} x={m.l + i * bw} y={H - m.b + 16} textAnchor="middle" className="jr-axis-text">{fmtVal(b.start)}</text>
            ) : null))}
            <text x={m.l + n * bw} y={H - m.b + 16} textAnchor="middle" className="jr-axis-text">{fmtVal(bins[n - 1].end)}</text>
            <line x1={m.l} x2={W - m.r} y1={m.t + ph} y2={m.t + ph} stroke="rgba(255,255,255,0.15)" />
            {lo <= 0 && lo + n >= 0 && (
              <line x1={xOf(0)} x2={xOf(0)} y1={m.t} y2={m.t + ph} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
            )}
            {summary && (
              <>
                <line x1={xOf(summary.mean)} x2={xOf(summary.mean)} y1={m.t} y2={m.t + ph} stroke="#38bdf8" strokeWidth="1.5" />
                <line x1={xOf(summary.median)} x2={xOf(summary.median)} y1={m.t} y2={m.t + ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
              </>
            )}
          </svg>
          {summary && (
            <div className="jr-hist-legend">
              <span><i className="jr-dot" style={{ background: '#10b981' }} />Gains {summary.gains} · avg {fmtVal(summary.avgGain)}</span>
              <span><i className="jr-dot" style={{ background: '#f43f5e' }} />Losses {summary.losses} · avg {fmtVal(summary.avgLoss)}</span>
              <span><i className="jr-line" style={{ background: '#38bdf8' }} />Mean {fmtVal(summary.mean)}</span>
              <span><i className="jr-line jr-line-dashed" style={{ borderColor: '#f59e0b' }} />Median {fmtVal(summary.median)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------- Equity curve (cumulative closed P&L) -----------------

export function EquityCurveChart({ curve, height = 300 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !curve || curve.length === 0) return undefined;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(56, 189, 248, 0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e293b' },
        horzLine: { color: 'rgba(56, 189, 248, 0.4)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e293b' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 0 },
      topLineColor: '#10b981',
      topFillColor1: 'rgba(16, 185, 129, 0.28)',
      topFillColor2: 'rgba(16, 185, 129, 0.04)',
      bottomLineColor: '#f43f5e',
      bottomFillColor1: 'rgba(244, 63, 94, 0.04)',
      bottomFillColor2: 'rgba(244, 63, 94, 0.28)',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (v) => fmtMoney(v, { compact: true }), minMove: 1 },
    });
    series.setData(curve.map((p) => ({ time: p.date, value: p.cum_pnl })));
    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [curve, height]);

  return (
    <div className="glass-card jr-chart-card">
      <div className="jr-card-header">
        <div>
          <div className="jr-card-title">Equity Curve</div>
          <div className="jr-card-subtitle">Cumulative realized P&amp;L by close date</div>
        </div>
      </div>
      {curve && curve.length ? <div ref={containerRef} style={{ width: '100%', height }} /> : <div className="jr-empty">No closed trades in this range.</div>}
    </div>
  );
}

