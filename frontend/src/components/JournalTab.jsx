import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { PnlDistributionChart, EquityCurveChart, fmtMoney, fmtPct, pnlClass } from './JournalCharts';
import { DailyChart } from './stock-view';
import VanTharpCalculatorModal from './VanTharpCalculatorModal';
import AccountBalanceModal from './AccountBalanceModal';
import './JournalTab.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 100;

function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtQty(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeForPreset(preset) {
  const today = new Date();
  if (preset === 'all') return {};
  if (preset === 'ytd') return { start: `${today.getFullYear()}-01-01` };
  if (preset === '12m') {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    return { start: isoDate(d) };
  }
  if (preset === '90d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return { start: isoDate(d) };
  }
  if (/^\d{4}$/.test(preset)) return { start: `${preset}-01-01`, end: `${preset}-12-31` };
  return {};
}

// Native modal <dialog> with light-dismiss (closedby="any") + fallback for browsers without closedBy support.
function Modal({ open, onClose, title, headerActions, children, wide = false }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    const handleClose = () => onCloseRef.current?.();
    d.addEventListener('close', handleClose);
    let handleClick = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleClick = (event) => {
        if (event.target !== d) return;
        const r = d.getBoundingClientRect();
        const inside = r.top <= event.clientY && event.clientY <= r.top + r.height && r.left <= event.clientX && event.clientX <= r.left + r.width;
        if (!inside) d.close();
      };
      d.addEventListener('click', handleClick);
    }
    return () => {
      d.removeEventListener('close', handleClose);
      if (handleClick) d.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <dialog ref={ref} closedby="any" className={`jr-dialog ${wide ? 'jr-dialog-wide' : ''}`} aria-label={typeof title === 'string' ? title : undefined}>
      {open && (
        <div className="jr-dialog-body">
          <div className="jr-dialog-header">
            <h2>{title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {headerActions}
              <button className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()} aria-label="Close">✕</button>
            </div>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

function FlexSetupGuide() {
  return (
    <div className="jr-guide">
      <div className="jr-guide-callout">
        <b>💡 Multiple IBKR Accounts:</b>
        <ul>
          <li>
            <b>Under the same login?</b> In your Activity Flex Query in IBKR Portal, set <b>General Configuration → Accounts → All</b> (or check all desired accounts). A single Query ID will sync all your accounts together!
          </li>
          <li>
            <b>Under separate logins or separate queries?</b> Click <b>+ Add Another Query / Account</b> below to enter each Query ID (and token if different). PivotTrader will sync all of them in one click.
          </li>
        </ul>
      </div>
      <h4>1 · Create an Activity Flex Query</h4>
      <ol>
        <li>IBKR Portal → <b>Performance &amp; Reports → Flex Queries</b> → <b>Activity Flex Query</b> → <b>+</b> (Create / Edit).</li>
        <li>Under <b>Sections</b>:
          <ul>
            <li>Tick <b>Trades</b>: in its <i>Options</i> select <b>Execution</b>. Fields: select all or <code>Account ID, Currency, FX Rate To Base, Asset Class, Symbol, Description, Conid, Trade ID, Transaction ID, IB Execution ID, IB Order ID, Date/Time, Trade Date, Quantity, Trade Price, Proceeds, IB Commission, Net Cash, Realized P/L (FIFO), Buy/Sell, Open/Close Indicator, Level Of Detail</code>.</li>
            <li>Tick <b>Cash Report</b>: in its <i>Options</i> select fields <code>Account ID, Currency, Ending Cash, Ending Settled Cash</code> (or "Select All"). This allows PivotTrader to automatically fetch your live USD and CAD cash balances every time you sync!</li>
          </ul>
        </li>
        <li><b>Delivery Configuration</b>: Format <b>XML</b>, Period <b>Last 365 Calendar Days</b>.</li>
        <li><b>General Configuration</b>: Under <b>Accounts</b>, select <b>All</b> (or check the accounts you wish to sync). Date Format <code>yyyyMMdd</code>, Time Format <code>HHmmss</code>, Date/Time Separator <code>;</code> (semi-colon). Include Canceled Trades: <b>No</b>.</li>
        <li>Save, then copy the numeric <b>Query ID</b> shown next to the query name.</li>
      </ol>
      <h4>2 · Enable the Flex Web Service</h4>
      <ol>
        <li>IBKR Portal → <b>Settings → Account Settings → Reporting → Flex Web Service Configuration</b>.</li>
        <li>Enable it and <b>generate a token</b> (choose the longest validity; optionally restrict to your IP).</li>
        <li>Paste the token and Query ID here, save, then press <b>Sync from IBKR</b>. Run the sync regularly — executions accumulate locally, so history beyond 365 days is preserved after the first import.</li>
      </ol>
      <p className="jr-muted">The token is stored only on this machine in <code>data/ibkr_flex.json</code> (git-ignored). Trades are stored in <code>data/journal.db</code>.</p>
    </div>
  );
}

function StatCard({ label, value, valueClass = '', sub, title }) {
  return (
    <div className="glass-card jr-stat" title={title}>
      <div className="stat-label">{label}</div>
      <div className={`jr-stat-value ${valueClass}`}>{value}</div>
      {sub && <div className="jr-stat-sub">{sub}</div>}
    </div>
  );
}

function StatsGrid({ stats }) {
  if (!stats) return null;
  const s = stats;
  return (
    <div className="jr-stats-grid">
      <StatCard label="Net P&L" value={fmtMoney(s.total_pnl)} valueClass={pnlClass(s.total_pnl)}
        sub={`${s.total_trades} closed${s.open_trades ? ` · ${s.open_trades} open` : ''}`} />
      {s.open_trades > 0 && s.open_pnl !== null && s.open_pnl !== undefined && (
        <StatCard
          label="Open P&L"
          value={fmtMoney(s.open_pnl)}
          valueClass={pnlClass(s.open_pnl)}
          sub={`${s.open_trades} open position${s.open_trades > 1 ? 's' : ''}${s.avg_open_pnl_pct !== null && s.avg_open_pnl_pct !== undefined ? ` · avg ${fmtPct(s.avg_open_pnl_pct)}` : ''}`}
          title="Unrealized / mark-to-market P&L on current open positions using latest close price"
        />
      )}
      <StatCard label="Win Rate" value={s.win_rate === null ? '—' : `${s.win_rate.toFixed(1)}%`}
        sub={`${s.wins} W · ${s.losses} L${s.breakeven ? ` · ${s.breakeven} BE` : ''}`} />
      <StatCard label="Profit Factor" value={s.profit_factor === null ? '—' : s.profit_factor.toFixed(2)}
        valueClass={s.profit_factor === null ? '' : s.profit_factor >= 1 ? 'jr-pos' : 'jr-neg'}
        sub={`${fmtMoney(s.gross_profit, { compact: true })} / ${fmtMoney(s.gross_loss, { compact: true })}`}
        title="Gross profit ÷ |gross loss|" />
      <StatCard label="Expectancy" value={fmtMoney(s.expectancy)} valueClass={pnlClass(s.expectancy)}
        sub={`${fmtPct(s.expectancy_pct, 2)} per trade`}
        title="Average P&L per closed trade. % = win rate × avg win% + loss rate × avg loss%" />
      <StatCard label="Avg Win / Avg Loss"
        value={<><span className="jr-pos">{fmtPct(s.avg_win_pct)}</span> / <span className="jr-neg">{fmtPct(s.avg_loss_pct)}</span></>}
        title="Average gain % on winning trades vs average loss % on losing trades" />
      <StatCard label="Win/Loss Ratio" value={s.adjusted_win_loss_ratio === null ? '—' : s.adjusted_win_loss_ratio.toFixed(2)}
        sub={`$-based ${s.win_loss_ratio === null ? '—' : s.win_loss_ratio.toFixed(2)} · median ${fmtPct(s.median_pnl_pct)}`}
        title="Avg win % ÷ |avg loss %|" />
      <StatCard label="Largest Win"
        value={s.largest_win?.pnl_pct !== null && s.largest_win?.pnl_pct !== undefined ? fmtPct(s.largest_win.pnl_pct) : '—'}
        valueClass="jr-pos"
        sub={s.largest_win ? `${fmtMoney(s.largest_win.pnl)} · ${s.largest_win.symbol}` : '—'} />
      <StatCard label="Largest Loss"
        value={s.largest_loss?.pnl_pct !== null && s.largest_loss?.pnl_pct !== undefined ? fmtPct(s.largest_loss.pnl_pct) : '—'}
        valueClass="jr-neg"
        sub={s.largest_loss ? `${fmtMoney(s.largest_loss.pnl)} · ${s.largest_loss.symbol}` : '—'} />
      <StatCard label="Max Drawdown"
        value={s.max_drawdown_pct !== null && s.max_drawdown_pct !== undefined ? fmtPct(s.max_drawdown_pct) : '—'}
        valueClass={s.max_drawdown_pct < 0 ? 'jr-neg' : ''}
        sub={fmtMoney(s.max_drawdown)}
        title="Peak-to-trough compounded return drawdown and dollar drawdown across closed trades" />
      <StatCard label="Avg Hold" value={s.avg_hold_days === null ? '—' : `${s.avg_hold_days.toFixed(1)}D`}
        sub={`W ${s.avg_hold_days_win === null ? '—' : s.avg_hold_days_win.toFixed(1) + 'd'} · L ${s.avg_hold_days_loss === null ? '—' : s.avg_hold_days_loss.toFixed(1) + 'd'}`} />
      <StatCard label="Max Streak" value={<><span className="jr-pos">{s.max_consecutive_wins}W</span> / <span className="jr-neg">{s.max_consecutive_losses}L</span></>}
        sub="Consecutive wins / losses" />
      {s.r_trades_count > 0 && (
        <StatCard label="Real R/R Ratio"
          value={s.real_rr_ratio === null ? '—' : `${s.real_rr_ratio.toFixed(2)} : 1`}
          valueClass={s.real_rr_ratio >= 1 ? 'jr-pos' : 'jr-neg'}
          sub={`Avg Win ${s.avg_win_r !== null ? (s.avg_win_r >= 0 ? '+' : '') + s.avg_win_r.toFixed(2) + 'R' : '—'} · Loss ${s.avg_loss_r !== null ? s.avg_loss_r.toFixed(2) + 'R' : '—'}`}
          title="Real Reward-to-Risk factor: Avg Win R ÷ |Avg Loss R| from trades with initial stops" />
      )}
      {s.r_trades_count > 0 && (
        <StatCard label="Avg R-Multiple"
          value={s.avg_r_multiple === null ? '—' : `${s.avg_r_multiple >= 0 ? '+' : ''}${s.avg_r_multiple.toFixed(2)} R`}
          valueClass={s.avg_r_multiple >= 0 ? 'jr-pos' : 'jr-neg'}
          sub={`${s.r_trades_count} trade${s.r_trades_count > 1 ? 's' : ''} with stop price`}
          title="Average R-Multiple realized across closed trades with stop price defined" />
      )}
      <StatCard label="Commissions" value={fmtMoney(s.total_commission, { sign: false })} sub="Included in all P&L figures" />
    </div>
  );
}

function PeriodPnlGrid({ monthly, yearly, selectedPeriod, onSelectPeriod }) {
  const byMonth = useMemo(() => Object.fromEntries(monthly.map((m) => [m.period, m])), [monthly]);
  const years = useMemo(() => [...yearly].sort((a, b) => b.period.localeCompare(a.period)), [yearly]);
  const maxAbs = useMemo(() => Math.max(1, ...monthly.map((m) => Math.abs(m.pnl))), [monthly]);

  const cellStyle = (pnl) => {
    if (pnl === undefined || pnl === null || pnl === 0) return undefined;
    const a = 0.1 + 0.55 * Math.min(1, Math.abs(pnl) / maxAbs);
    return { background: pnl > 0 ? `rgba(16,185,129,${a})` : `rgba(244,63,94,${a})` };
  };

  return (
    <div className="glass-card jr-chart-card">
      <div className="jr-card-header">
        <div>
          <div className="jr-card-title">Profit by Month / Year</div>
          <div className="jr-card-subtitle">Realized P&amp;L by close date · click a cell to filter the trade list</div>
        </div>
      </div>
      {!years.length ? <div className="jr-empty">No closed trades in this range.</div> : (
        <div className="jr-period-scroll custom-scrollbar">
          <table className="jr-period-table">
            <thead>
              <tr>
                <th>Year</th>
                {MONTHS.map((mn) => <th key={mn}>{mn}</th>)}
                <th>Total</th>
                <th>Trades</th>
                <th>Win %</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.period}>
                  <td className={`jr-period-year ${selectedPeriod === y.period ? 'jr-cell-selected' : ''}`}
                    onClick={() => onSelectPeriod(selectedPeriod === y.period ? null : y.period)}>{y.period}</td>
                  {MONTHS.map((_, i) => {
                    const key = `${y.period}-${String(i + 1).padStart(2, '0')}`;
                    const mm = byMonth[key];
                    return (
                      <td key={key}
                        className={`jr-period-cell ${mm ? 'jr-clickable' : ''} ${selectedPeriod === key ? 'jr-cell-selected' : ''}`}
                        style={cellStyle(mm?.pnl)}
                        onClick={() => mm && onSelectPeriod(selectedPeriod === key ? null : key)}
                        title={mm ? `${key}: ${fmtMoney(mm.pnl)} · ${mm.trades} trades · ${mm.win_rate.toFixed(0)}% win` : ''}>
                        {mm ? (
                          <>
                            <div className="jr-period-pnl">{fmtMoney(mm.pnl, { compact: true })}</div>
                            <div className="jr-period-sub">{mm.trades}t · {mm.win_rate.toFixed(0)}%</div>
                          </>
                        ) : <span className="jr-muted">·</span>}
                      </td>
                    );
                  })}
                  <td className={`jr-period-total ${pnlClass(y.pnl)}`}>{fmtMoney(y.pnl, { compact: true })}</td>
                  <td className="jr-period-num">{y.trades}</td>
                  <td className="jr-period-num">{y.win_rate === null ? '—' : `${y.win_rate.toFixed(0)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const COLUMNS = [
  { key: 'open', label: 'Opened', get: (t) => t.open_datetime || '' },
  { key: 'close', label: 'Closed', get: (t) => t.close_datetime || t.open_datetime || '' },
  { key: 'account', label: 'Account', get: (t) => t.account_id || '' },
  { key: 'symbol', label: 'Symbol', get: (t) => t.symbol },
  { key: 'direction', label: 'Side', get: (t) => t.direction },
  { key: 'max_position', label: 'Qty', get: (t) => t.max_position, num: true },
  { key: 'avg_entry', label: 'Entry', get: (t) => t.avg_entry ?? 0, num: true },
  { key: 'initial_stop', label: 'Stop', get: (t) => t.initial_stop ?? -Infinity, num: true },
  { key: 'avg_exit', label: 'Exit / Cur', get: (t) => (t.status === 'OPEN' ? (t.current_price ?? 0) : (t.avg_exit ?? 0)), num: true },
  { key: 'initial_risk_pct', label: 'iRisk', get: (t) => t.initial_risk_pct ?? -Infinity, num: true },
  { key: 'pnl', label: 'P&L', get: (t) => t.pnl ?? -Infinity, num: true },
  { key: 'pnl_pct', label: 'Return', get: (t) => t.pnl_pct ?? -Infinity, num: true },
  { key: 'r_multiple', label: 'R-Mult', get: (t) => t.r_multiple ?? -Infinity, num: true },
  { key: 'holding_days', label: 'Days', get: (t) => t.holding_days ?? -1, num: true },
  { key: 'notes', label: 'Notes', get: (t) => (t.notes ? 1 : 0) + (t.tags?.length ? 1 : 0), num: true },
];

function TradeTable({ trades, sort, onSortChange, onOpenTrade, onSelectStock, onToggleIgnore, accounts = [], onSelectAccount, onOpenCalculator }) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [trades]);

  const hasMultipleAccounts = (accounts || []).length > 1;
  const activeColumns = useMemo(() => {
    return COLUMNS.filter((c) => c.key !== 'account' || hasMultipleAccounts);
  }, [hasMultipleAccounts]);

  const sorted = useMemo(() => {
    const col = activeColumns.find((c) => c.key === (sort?.key || 'open')) || activeColumns[0];
    const mult = (sort?.dir || 'desc') === 'asc' ? 1 : -1;
    return [...trades].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      if (va < vb) return -1 * mult;
      if (va > vb) return 1 * mult;
      return 0;
    });
  }, [trades, sort, activeColumns]);

  const toggleSort = (key) => {
    if (onSortChange) {
      onSortChange((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
    }
  };

  return (
    <div className="table-container jr-table-container">
      <table className="data-table compact-table jr-trade-table">
        <thead>
          <tr>
            {activeColumns.map((c) => (
              <th key={c.key} onClick={() => toggleSort(c.key)} className={`jr-sortable ${c.num ? 'jr-num' : ''}`}>
                {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, limit).map((t) => (
            <tr key={t.id} onClick={() => onOpenTrade(t)} className={t.is_ignored ? 'jr-row-ignored' : ''}>
              <td>{t.open_date}</td>
              <td>
                {t.is_ignored ? (
                  <span className="pill pill-danger" title={`Excluded from journal stats: ${t.ignored_reason || 'Unrelated trade'}`}>EXCLUDED</span>
                ) : t.status === 'OPEN' ? (
                  <span className="pill pill-warning">OPEN</span>
                ) : (
                  t.close_date
                )}
              </td>
              {hasMultipleAccounts && (
                <td>
                  <button
                    type="button"
                    className="jr-account-badge"
                    onClick={(e) => { e.stopPropagation(); onSelectAccount?.(t.account_id); }}
                    title={`Filter journal to account ${t.account_id}`}
                  >
                    {t.account_id}
                  </button>
                </td>
              )}
              <td>
                <button className="jr-symbol-link" onClick={(e) => { e.stopPropagation(); onSelectStock?.(t.symbol); }} title="Open stock details">
                  {t.symbol}
                </button>
                {t.incomplete && <span className="jr-flag" title="Opened before the imported history window; P&L from IBKR FIFO realized P&L">◐</span>}
              </td>
              <td><span className={`pill ${t.direction === 'LONG' ? 'pill-success' : 'pill-danger'}`}>{t.direction}</span></td>
              <td className="jr-num">{fmtQty(t.max_position)}</td>
              <td className="jr-num">{fmtNum(t.avg_entry)}</td>
              <td className="jr-num">{t.initial_stop ? fmtNum(t.initial_stop) : <span className="jr-muted">—</span>}</td>
              <td className="jr-num" title={t.status === 'OPEN' ? (t.current_price_date ? `Current close (${t.current_price_date}): $${fmtNum(t.current_price)}` : 'Current close') : undefined}>
                {t.status === 'OPEN' ? (
                  t.current_price ? (
                    <span className="jr-open-cur-price">${fmtNum(t.current_price)}</span>
                  ) : (
                    t.avg_exit ? <span title="Partial exit">${fmtNum(t.avg_exit)}</span> : <span className="jr-muted">—</span>
                  )
                ) : (
                  fmtNum(t.avg_exit)
                )}
              </td>
              <td className="jr-num">
                {t.initial_risk_pct !== null && t.initial_risk_pct !== undefined ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0 4px', fontSize: '11.5px', color: '#38bdf8' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCalculator?.({
                        symbol: t.symbol,
                        entry: t.avg_entry,
                        stop: t.initial_stop,
                        direction: t.direction,
                        account_id: t.account_id,
                      });
                    }}
                    title="Open Van Tharp Sizing Calculator for this trade"
                  >
                    {t.initial_risk_pct.toFixed(1)}% 🧮
                  </button>
                ) : (
                  <span className="jr-muted">—</span>
                )}
              </td>
              <td className={`jr-num ${pnlClass(t.pnl)}`}>
                {t.pnl !== null && t.pnl !== undefined ? (
                  <span title={t.status === 'OPEN' && t.unrealized_pnl !== null && t.unrealized_pnl !== undefined ? `Unrealized: ${fmtMoney(t.unrealized_pnl)}${t.realized_pnl ? ` · Realized: ${fmtMoney(t.realized_pnl)}` : ''}` : undefined}>
                    {fmtMoney(t.pnl)}
                  </span>
                ) : <span className="jr-muted">—</span>}
              </td>
              <td className={`jr-num ${pnlClass(t.pnl_pct)}`}>
                {t.pnl_pct !== null && t.pnl_pct !== undefined ? fmtPct(t.pnl_pct, 2) : <span className="jr-muted">—</span>}
              </td>
              <td className={`jr-num ${t.r_multiple !== null && t.r_multiple !== undefined ? (t.r_multiple >= 0 ? 'jr-pos' : 'jr-neg') : ''}`}>
                {t.r_multiple !== null && t.r_multiple !== undefined ? (
                  <span title={t.status === 'OPEN' ? 'Current R-Multiple' : 'Realized R-Multiple'}>
                    {t.r_multiple >= 0 ? '+' : ''}{t.r_multiple.toFixed(2)} R
                  </span>
                ) : <span className="jr-muted">—</span>}
              </td>
              <td className="jr-num">{t.holding_days ?? '—'}</td>
              <td className="jr-notes-cell" title={t.notes || ''}>
                {t.tags?.map((tag) => <span key={tag} className="jr-tag">{tag}</span>)}
                {t.notes ? <span className="jr-notes-preview">📝 {t.notes}</span> : (!t.tags?.length && <span className="jr-muted">Add…</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > limit && (
        <div className="jr-show-more">
          <button className="btn btn-secondary btn-sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Show more ({sorted.length - limit} remaining)
          </button>
        </div>
      )}
      {!sorted.length && <div className="jr-empty">No trades match the current filters.</div>}
    </div>
  );
}

function TradeDetail({ trade, onSaved, allTags, onToggleIgnore, onSelectStock, onOpenCalculator }) {
  const [notes, setNotes] = useState(trade.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tagsText, setTagsText] = useState((trade.tags || []).join(', '));
  const [initialStop, setInitialStop] = useState(
    trade.initial_stop !== null && trade.initial_stop !== undefined ? String(trade.initial_stop) : ''
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  // Fetch full historical price bars for this symbol
  useEffect(() => {
    let active = true;
    setLoadingPrices(true);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(trade.symbol)}/prices?limit=750`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((bars) => {
        if (active) setPrices(bars || []);
      })
      .catch((err) => {
        console.warn('Could not load price bars for trade chart:', err);
        if (active) setPrices([]);
      })
      .finally(() => {
        if (active) setLoadingPrices(false);
      });
    return () => { active = false; };
  }, [trade.symbol]);

  // Current close price and live P&L calculation for open trades
  const effectiveCurrentPrice = trade.status === 'OPEN'
    ? (trade.current_price ?? (prices.length > 0 ? prices[prices.length - 1].close : null))
    : null;

  const effectivePnl = useMemo(() => {
    if (trade.pnl !== null && trade.pnl !== undefined) return trade.pnl;
    if (trade.status === 'OPEN' && effectiveCurrentPrice && trade.avg_entry) {
      const openQty = trade.open_qty ?? trade.max_position ?? 0;
      const unrealized = trade.direction === 'LONG'
        ? (effectiveCurrentPrice - trade.avg_entry) * openQty
        : (trade.avg_entry - effectiveCurrentPrice) * openQty;
      return (trade.realized_pnl || 0) + unrealized;
    }
    return null;
  }, [trade, effectiveCurrentPrice]);

  const effectivePnlPct = useMemo(() => {
    if (trade.pnl_pct !== null && trade.pnl_pct !== undefined) return trade.pnl_pct;
    if (trade.status === 'OPEN' && effectiveCurrentPrice && trade.avg_entry) {
      if (trade.entry_notional && trade.entry_notional > 1e-9 && effectivePnl !== null) {
        return (effectivePnl / trade.entry_notional) * 100;
      }
      return trade.direction === 'LONG'
        ? ((effectiveCurrentPrice - trade.avg_entry) / trade.avg_entry) * 100
        : ((trade.avg_entry - effectiveCurrentPrice) / trade.avg_entry) * 100;
    }
    return null;
  }, [trade, effectiveCurrentPrice, effectivePnl]);

  // Compute live initial risk and R-multiple
  const parsedStop = initialStop.trim() === '' ? null : parseFloat(initialStop);
  const validStop = parsedStop !== null && !isNaN(parsedStop) && parsedStop > 0;
  let riskPerShare = null;
  let riskPct = null;
  let riskTotal = null;
  let rMultiple = null;
  let stopWarning = null;

  if (validStop && trade.avg_entry) {
    if (trade.direction === 'LONG') {
      if (parsedStop < trade.avg_entry) {
        riskPerShare = trade.avg_entry - parsedStop;
        riskPct = (riskPerShare / trade.avg_entry) * 100;
        const maxPos = trade.max_position || trade.entry_qty || 0;
        riskTotal = riskPerShare * maxPos;
        if (effectivePnl !== null && effectivePnl !== undefined && riskTotal > 0.0001) {
          rMultiple = effectivePnl / riskTotal;
        }
      } else {
        stopWarning = 'Stop price should be lower than entry price for long positions';
      }
    } else if (trade.direction === 'SHORT') {
      if (parsedStop > trade.avg_entry) {
        riskPerShare = parsedStop - trade.avg_entry;
        riskPct = (riskPerShare / trade.avg_entry) * 100;
        const maxPos = trade.max_position || trade.entry_qty || 0;
        riskTotal = riskPerShare * maxPos;
        if (effectivePnl !== null && effectivePnl !== undefined && riskTotal > 0.0001) {
          rMultiple = effectivePnl / riskTotal;
        }
      } else {
        stopWarning = 'Stop price should be higher than entry price for short positions';
      }
    }
  }

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE}/api/journal/trades/${encodeURIComponent(trade.id)}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          tags,
          initial_stop: validStop ? parsedStop : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Save failed');
      const data = await res.json();
      onSaved(trade.id, data);
      setIsEditingNotes(false);
      setStatus({ ok: true, msg: 'Saved' });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag) => {
    const cur = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    if (!cur.includes(tag)) setTagsText([...cur, tag].join(', '));
  };

  const renderedMarkdown = useMemo(() => {
    if (!notes || !notes.trim()) return '';
    try {
      return marked.parse(notes);
    } catch (e) {
      return `<p>${notes}</p>`;
    }
  }, [notes]);

  // Combine split executions with the exact same datetime, side, and action
  const combinedExecutions = useMemo(() => {
    const raw = trade.executions || [];
    if (raw.length <= 1) return raw;
    const res = [];
    for (const e of raw) {
      if (!res.length) {
        res.push({ ...e });
        continue;
      }
      const prev = res[res.length - 1];
      if (
        e.date_time &&
        e.date_time === prev.date_time &&
        e.side === prev.side &&
        e.action === prev.action
      ) {
        const totalQty = prev.quantity + e.quantity;
        const prevNotional = Math.abs(prev.quantity) * (prev.price || 0);
        const currNotional = Math.abs(e.quantity) * (e.price || 0);
        const combinedNotional = prevNotional + currNotional;
        prev.price = Math.abs(totalQty) > 1e-9 ? combinedNotional / Math.abs(totalQty) : prev.price;
        prev.quantity = totalQty;
        prev.commission = (prev.commission || 0) + (e.commission || 0);
        prev.net_cash = (prev.net_cash || 0) + (e.net_cash || 0);
        prev.fraction = Math.min(1.0, (prev.fraction || 1.0) + (e.fraction || 1.0));
      } else {
        res.push({ ...e });
      }
    }
    return res;
  }, [trade.executions]);

  return (
    <div className="jr-detail">
      {trade.is_ignored && (
        <div className="jr-ignored-banner">
          <div>
            <b>Excluded Trade:</b> This trade is ignored from journal statistics and performance charts
            {trade.ignored_reason ? ` (${trade.ignored_reason})` : ''}.
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onToggleIgnore(trade)}>
            ↩ Restore to Journal
          </button>
        </div>
      )}

      {trade.incomplete && (
        <div className="jr-warning">This position was opened before the imported history window. P&amp;L uses IBKR&apos;s FIFO realized P&amp;L; entry details are partial.</div>
      )}

      <div className="jr-detail-columns">
        {/* LEFT COLUMN: Executions on Top + Full Stock Chart below */}
        <div className="jr-detail-left">
          {/* Execution Logs Section */}
          <div className="jr-panel-card jr-exec-box">
            <div className="jr-panel-card-header">
              <div className="jr-panel-card-title">
                Execution Logs <span className="jr-muted">({combinedExecutions.length})</span>
              </div>
              <div className="jr-exec-header-summary">
                {trade.account_id ? <span>Account: <b>{trade.account_id}</b></span> : null}
                <span>Entry: <b>${fmtNum(trade.avg_entry)}</b></span>
                {trade.avg_exit ? <span>Exit: <b>${fmtNum(trade.avg_exit)}</b></span> : null}
                <span>Max Qty: <b>{fmtQty(trade.max_position)}</b></span>
              </div>
            </div>
            <div className="jr-exec-scroll custom-scrollbar">
              <table className="data-table compact-table jr-exec-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Action</th>
                    <th>Side</th>
                    <th className="jr-num">Qty</th>
                    <th className="jr-num">Price</th>
                    <th className="jr-num">Net Cash</th>
                    <th className="jr-num">Comm</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedExecutions.map((e, i) => (
                    <tr key={`${e.exec_id}-${i}`} style={{ cursor: 'default' }}>
                      <td>{e.date_time?.replace('T', ' ')}</td>
                      <td>{e.action}{e.fraction < 1 ? ` (${(e.fraction * 100).toFixed(0)}%)` : ''}</td>
                      <td className={e.side === 'BUY' ? 'jr-pos' : 'jr-neg'}><b>{e.side}</b></td>
                      <td className="jr-num">{fmtQty(e.quantity)}</td>
                      <td className="jr-num">${fmtNum(e.price, 2)}</td>
                      <td className="jr-num">{fmtNum(e.net_cash)}</td>
                      <td className="jr-num">{fmtNum(e.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Stock Candlestick Chart */}
          <div className="jr-panel-card jr-chart-box">
            <div className="jr-chart-container-inner">
              {loadingPrices ? (
                <div className="jr-chart-loading">
                  <span className="spin-icon">⟳</span> Loading historical chart bars…
                </div>
              ) : prices.length === 0 ? (
                <div className="jr-empty">
                  No historical price data found for {trade.symbol}. Make sure daily stock prices are synced.
                </div>
              ) : (
                <DailyChart
                  data={prices}
                  symbol={trade.symbol}
                  companyName={trade.description || trade.symbol}
                  asOfDate={trade.open_date}
                  height={560}
                  showScreenshotButton={false}
                  tradeExecutions={combinedExecutions}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Risk Card, Statistics, Notes & Tags, Exclude Button */}
        <div className="jr-detail-right">
          {/* Trade Overview & Risk Plan Card */}
          <div className="jr-panel-card jr-overview-card">
            <div className="jr-panel-card-header">
              <div className="jr-panel-card-title">
                Trade Overview
                <span className={`pill ${trade.direction === 'LONG' ? 'pill-success' : 'pill-danger'}`} style={{ marginLeft: '4px' }}>
                  {trade.direction}
                </span>
                {trade.account_id && (
                  <span className="pill pill-secondary" style={{ marginLeft: '4px' }} title={`IBKR Account: ${trade.account_id}`}>
                    Account: {trade.account_id}
                  </span>
                )}
                {trade.is_ignored ? (
                  <span className="pill pill-danger" style={{ marginLeft: '4px' }}>EXCLUDED</span>
                ) : trade.status === 'OPEN' ? (
                  <span className="pill pill-warning" style={{ marginLeft: '4px' }}>OPEN</span>
                ) : null}
              </div>
              <div className="jr-overview-header-metrics">
                <span>
                  {trade.status === 'OPEN' ? 'Open P&L: ' : 'P&L: '}
                  <b className={pnlClass(effectivePnl)}>
                    {effectivePnl !== null ? `${fmtMoney(effectivePnl)} (${fmtPct(effectivePnlPct, 2)})` : '—'}
                  </b>
                </span>
                {rMultiple !== null ? (
                  <span>
                    {trade.status === 'OPEN' ? 'Current R: ' : 'R: '}
                    <b className={rMultiple >= 0 ? 'jr-pos' : 'jr-neg'}>
                      {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)} R
                    </b>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="jr-overview-metrics-bar">
              <div className="jr-metric-item">
                <span className="jr-metric-lbl">Holding</span>
                <span className="jr-metric-val">{trade.holding_days ?? '—'}d</span>
              </div>
              <div className="jr-metric-item">
                <span className="jr-metric-lbl">Qty</span>
                <span className="jr-metric-val">{fmtQty(trade.max_position)}</span>
              </div>
              <div className="jr-metric-item">
                <span className="jr-metric-lbl">Avg Entry</span>
                <span className="jr-metric-val">${fmtNum(trade.avg_entry)}</span>
              </div>
              <div className="jr-metric-item">
                <span className="jr-metric-lbl">{trade.status === 'OPEN' ? 'Current Price' : 'Avg Exit'}</span>
                <span className="jr-metric-val">
                  {trade.status === 'OPEN'
                    ? (effectiveCurrentPrice ? `$${fmtNum(effectiveCurrentPrice)}` : (trade.avg_exit ? `$${fmtNum(trade.avg_exit)}` : '—'))
                    : (trade.avg_exit ? `$${fmtNum(trade.avg_exit)}` : '—')}
                </span>
              </div>
              <div className="jr-metric-item">
                <span className="jr-metric-lbl">Comm</span>
                <span className="jr-metric-val">{fmtMoney(trade.commission, { sign: false })}</span>
              </div>
            </div>

            {/* Inline Initial Risk & Stop Calculator */}
            <div className="jr-stop-inline-bar">
              <div className="jr-stop-input-wrap">
                <span className="jr-metric-lbl">
                  Initial Stop ($)
                  {stopWarning ? (
                    <span className="jr-neg" style={{ marginLeft: '6px' }}>⚠️ {stopWarning}</span>
                  ) : null}
                </span>
                <div className="jr-stop-input-row">
                  <input
                    type="number"
                    step="0.01"
                    className="jr-input jr-stop-input-compact"
                    value={initialStop}
                    onChange={(e) => setInitialStop(e.target.value)}
                    placeholder={trade.direction === 'LONG' ? `< $${fmtNum(trade.avg_entry)}` : `> $${fmtNum(trade.avg_entry)}`}
                  />
                </div>
              </div>

              <div className="jr-stop-calc-stat">
                <span className="jr-metric-lbl">Risk / Share</span>
                <span className="jr-metric-val">
                  {riskPerShare !== null ? `$${fmtNum(riskPerShare)} (${riskPct.toFixed(1)}%)` : '—'}
                </span>
              </div>

              <div className="jr-stop-calc-stat">
                <span className="jr-metric-lbl">Total Risk</span>
                <span className="jr-metric-val">
                  {riskTotal !== null ? fmtMoney(-riskTotal, { sign: false }) : '—'}
                </span>
              </div>

              <div className="jr-stop-calc-stat">
                <span className="jr-metric-lbl">{trade.status === 'OPEN' ? 'Current R' : 'R-Multiple'}</span>
                <span className={`jr-metric-val ${rMultiple !== null ? (rMultiple >= 0 ? 'jr-pos' : 'jr-neg') : ''}`}>
                  {rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)} R` : '—'}
                </span>
              </div>

              {onOpenCalculator && (
                <div className="jr-stop-calc-stat" style={{ alignSelf: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                    onClick={() => onOpenCalculator({
                      symbol: trade.symbol,
                      entry: trade.avg_entry,
                      stop: validStop ? parsedStop : trade.initial_stop,
                      direction: trade.direction,
                      account_id: trade.account_id,
                    })}
                    title="Open Van Tharp Position Calculator with this trade's setup"
                  >
                    🧮 Sizing Calc
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Markdown Notes & Tags Card */}
          <div className="jr-panel-card jr-notes-card">
            <div className="jr-panel-card-header">
              <div className="jr-panel-card-title">
                Journal Notes &amp; Rules
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!isEditingNotes ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingNotes(true)}
                    title="Edit Markdown Notes"
                  >
                    ✏️ Edit Notes
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingNotes(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* View Mode (Rendered Markdown) vs Edit Mode (Textarea) */}
            {!isEditingNotes ? (
              <div
                className="jr-notes-view-mode custom-scrollbar"
                onDoubleClick={() => setIsEditingNotes(true)}
                title="Double click to edit notes"
              >
                {renderedMarkdown ? (
                  <div
                    className="markdown-body jr-markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                  />
                ) : (
                  <div className="jr-notes-placeholder">
                    No notes entered yet. Double click here or click <b>"✏️ Edit Notes"</b> to add trade reflections, setup criteria, or rules analysis.
                  </div>
                )}
              </div>
            ) : (
              <div className="jr-notes-edit-mode">
                <textarea
                  className="jr-textarea jr-notes-textarea"
                  rows={10}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Markdown supported: write setup analysis, rules evaluation, entry execution, trade management, exit discipline..."
                  autoFocus
                />
              </div>
            )}

            {/* Tags and Suggestions */}
            <div className="jr-tags-section">
              <label className="jr-field" style={{ margin: 0 }}>
                <span className="stat-label">Tags (comma separated)</span>
                <input
                  className="jr-input"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="vcp, breakout, A+ setup, chased, discipline"
                />
              </label>
              {allTags.length > 0 && (
                <div className="jr-tag-suggestions">
                  {allTags.map((tag) => (
                    <button key={tag} type="button" className="chip-filter" onClick={() => addTag(tag)}>
                      +{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Bar: Exclude Trade on Left, Save Notes on Right */}
            <div className="jr-notes-save-bar">
              <button
                type="button"
                className={`btn btn-sm ${trade.is_ignored ? 'btn-secondary' : 'jr-btn-danger-ghost'}`}
                onClick={() => onToggleIgnore(trade)}
                title={trade.is_ignored ? 'Restore trade to journal' : 'Exclude trade from journal statistics'}
              >
                {trade.is_ignored ? '↩ Restore Trade' : '🗑 Exclude Trade'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {status && <span className={status.ok ? 'jr-pos' : 'jr-neg'}>{status.msg}</span>}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Notes & Stop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlexSettings({ config, onSaved }) {
  const [token, setToken] = useState('');
  const [queries, setQueries] = useState(() => {
    if (config?.queries && config.queries.length > 0) {
      return config.queries.map((q) => ({
        name: q.name || '',
        query_id: q.query_id || '',
        token: '',
        has_custom_token: Boolean(q.has_custom_token),
        token_masked: q.token_masked || '',
      }));
    }
    return [
      {
        name: 'Primary Account',
        query_id: config?.query_id || '',
        token: '',
        has_custom_token: false,
        token_masked: '',
      },
    ];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addQuery = () => {
    setQueries((prev) => [
      ...prev,
      {
        name: `Account ${prev.length + 1}`,
        query_id: '',
        token: '',
        has_custom_token: false,
        token_masked: '',
      },
    ]);
  };

  const removeQuery = (idx) => {
    setQueries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQueryField = (idx, field, val) => {
    setQueries((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: val } : q))
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleanedQueries = queries
        .map((q) => ({
          name: q.name.trim() || `Query ${q.query_id.trim()}`,
          query_id: q.query_id.trim(),
          token: q.token.trim() || null,
        }))
        .filter((q) => q.query_id);

      if (cleanedQueries.length === 0) {
        throw new Error('Please configure at least one Activity Flex Query ID');
      }

      const res = await fetch(`${API_BASE}/api/journal/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim() || null,
          query_id: cleanedQueries[0].query_id,
          queries: cleanedQueries,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Save failed');
      onSaved(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="jr-settings-form">
      <label className="jr-field">
        <span className="stat-label">Default Flex Web Service Token</span>
        <input
          className="jr-input"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={config?.has_token ? `Saved (${config.token_masked}) — leave blank to keep` : 'Paste token'}
        />
        <span className="jr-muted">Used for all queries unless a specific query specifies a custom token below.</span>
      </label>

      <div className="jr-queries-section">
        <div className="jr-queries-header">
          <span className="stat-label">Activity Flex Queries / Accounts ({queries.length})</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addQuery}>
            + Add Another Query / Account
          </button>
        </div>

        <div className="jr-queries-list">
          {queries.map((q, idx) => (
            <div key={idx} className="jr-query-card glass-card">
              <div className="jr-query-card-header">
                <span className="jr-query-badge">#{idx + 1}</span>
                <input
                  className="jr-input jr-query-name-input"
                  placeholder="Account Label (e.g. Taxable Margin, Roth IRA)"
                  value={q.name}
                  onChange={(e) => updateQueryField(idx, 'name', e.target.value)}
                />
                {queries.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm jr-query-remove-btn"
                    onClick={() => removeQuery(idx)}
                    title="Remove this query"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="jr-query-card-fields">
                <label className="jr-field jr-field-compact">
                  <span className="stat-label">Query ID</span>
                  <input
                    className="jr-input"
                    inputMode="numeric"
                    value={q.query_id}
                    onChange={(e) => updateQueryField(idx, 'query_id', e.target.value)}
                    placeholder="e.g. 123456"
                    required
                  />
                </label>

                <label className="jr-field jr-field-compact">
                  <span className="stat-label">Custom Token (Optional)</span>
                  <input
                    className="jr-input"
                    type="password"
                    autoComplete="off"
                    value={q.token}
                    onChange={(e) => updateQueryField(idx, 'token', e.target.value)}
                    placeholder={
                      q.has_custom_token
                        ? `Custom token saved (${q.token_masked})`
                        : 'Inherits default token above'
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="jr-neg">{error}</div>}
      <div className="jr-dialog-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
      <details className="jr-details" open={!config?.has_token}>
        <summary>How to configure multiple accounts &amp; Flex queries in IBKR</summary>
        <FlexSetupGuide />
      </details>
    </form>
  );
}

function AccountBalancesSection({
  balances,
  selectedAccount,
  onSelectAccount,
  onOpenCalculator,
  onEditBalance,
}) {
  const accounts = balances?.accounts || [];
  if (!accounts.length) return null;

  const totalUsdCash = balances?.total_usd_balance || 0;
  const totalOpenVal = balances?.total_open_positions_value || 0;
  const totalUsdEquity = balances?.total_usd_equity || (totalUsdCash + totalOpenVal);
  const totalCad = balances?.total_cad_balance || 0;
  const total1r = balances?.total_risk_1pct_usd || 0;
  const hasMultiple = accounts.length > 1;

  return (
    <div className="jr-accounts-section">
      <div className="jr-accounts-header">
        <div className="jr-accounts-title">
          <span>💼 Accounts &amp; Total Equity</span>
          <span className="pill pill-secondary" style={{ textTransform: 'none', fontWeight: '500' }}>
            Van Tharp Total Equity Method (USD Cash + Open Positions)
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenCalculator?.(selectedAccount ? { account_id: selectedAccount } : null)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🧮</span> Position Calculator
        </button>
      </div>

      <div className="jr-accounts-grid">
        {accounts.map((acct) => {
          const isFiltered = selectedAccount === acct.account_id;
          return (
            <div
              key={acct.account_id}
              className={`jr-account-card ${isFiltered ? 'jr-account-card-active' : ''}`}
            >
              <div className="jr-account-card-header">
                <div className="jr-account-name-group">
                  <span className="jr-account-badge-id">{acct.account_id}</span>
                  <span className="jr-account-name">{acct.name || 'Account'}</span>
                </div>
                <div className="jr-account-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '3px 6px', fontSize: '12px' }}
                    onClick={() => onEditBalance?.(acct)}
                    title="Edit cash balance"
                  >
                    ✏️ Edit
                  </button>
                  {hasMultiple && (
                    <button
                      type="button"
                      className={`btn btn-sm ${isFiltered ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => onSelectAccount?.(isFiltered ? '' : acct.account_id)}
                      title={isFiltered ? 'Clear account filter' : `Filter trades to ${acct.account_id}`}
                    >
                      {isFiltered ? '✓ Filtered' : 'Filter'}
                    </button>
                  )}
                </div>
              </div>

              <div className="jr-account-balances-row">
                <div className="jr-balance-primary">
                  <div className="stat-label">Total USD Equity (1R Risk Base)</div>
                  <div className="jr-balance-usd">
                    {fmtMoney(acct.total_usd_equity ?? acct.usd_balance, { sign: false })}
                  </div>
                  <div className="jr-balance-breakdown">
                    <span>Cash: <b>{fmtMoney(acct.usd_balance, { sign: false })}</b></span>
                    <span>•</span>
                    <span>
                      Open ({acct.open_trades_count || 0}): <b>{fmtMoney(acct.open_positions_value || 0, { sign: true })}</b>
                    </span>
                  </div>
                </div>

                <div className="jr-balance-secondary">
                  <div className="stat-label">CAD Cash</div>
                  <div className="jr-balance-cad">
                    C{fmtMoney(acct.cad_balance, { sign: false })}
                  </div>
                  <span className="jr-muted" style={{ fontSize: '10.5px' }}>Excluded from risk</span>
                </div>
              </div>

              <div className="jr-account-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#38bdf8', fontSize: '11.5px', fontWeight: '600', padding: '0 4px' }}
                  onClick={() => onOpenCalculator?.({ account_id: acct.account_id })}
                >
                  🧮 Calculate Size
                </button>
                <div
                  className="jr-risk-budget-pill"
                  title={`1% of Total USD Equity (${fmtMoney(acct.usd_balance, { sign: false })} cash + ${fmtMoney(acct.open_positions_value || 0, { sign: true })} open positions, excluding ignored)`}
                >
                  <span>🛡️ 1% Risk (1R):</span>
                  <b>{fmtMoney(acct.risk_1pct_usd, { sign: false })} USD</b>
                </div>
              </div>
            </div>
          );
        })}

        {hasMultiple && (
          <div className="jr-account-card" style={{ background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.04), var(--card-bg))' }}>
            <div className="jr-account-card-header">
              <div className="jr-account-name-group">
                <span className="pill pill-success" style={{ fontWeight: '700' }}>PORTFOLIO TOTAL</span>
                <span className="jr-account-name">{accounts.length} Accounts</span>
              </div>
            </div>

            <div className="jr-account-balances-row">
              <div className="jr-balance-primary">
                <div className="stat-label">Total Portfolio USD Equity</div>
                <div className="jr-balance-usd">
                  {fmtMoney(totalUsdEquity, { sign: false })}
                </div>
                <div className="jr-balance-breakdown">
                  <span>Cash: <b>{fmtMoney(totalUsdCash, { sign: false })}</b></span>
                  <span>•</span>
                  <span>
                    Open: <b>{fmtMoney(totalOpenVal, { sign: true })}</b>
                  </span>
                </div>
              </div>

              <div className="jr-balance-secondary">
                <div className="stat-label">Total CAD Cash</div>
                <div className="jr-balance-cad">
                  C{fmtMoney(totalCad, { sign: false })}
                </div>
                <span className="jr-muted" style={{ fontSize: '10.5px' }}>Excluded from risk</span>
              </div>
            </div>

            <div className="jr-account-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: '#38bdf8', fontSize: '11.5px', fontWeight: '600', padding: '0 4px' }}
                onClick={() => onOpenCalculator?.({ account_id: 'all' })}
              >
                🧮 Calculate Size
              </button>
              <div
                className="jr-risk-budget-pill"
                title={`1% of Total Portfolio Equity (${fmtMoney(totalUsdCash, { sign: false })} cash + ${fmtMoney(totalOpenVal, { sign: true })} open positions)`}
              >
                <span>🛡️ Total 1% Risk (1R):</span>
                <b>{fmtMoney(total1r, { sign: false })} USD</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JournalTab({ onSelectStock }) {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [preset, setPreset] = useState('ytd');
  const [account, setAccount] = useState(() => {
    try {
      return localStorage.getItem('pivot_journal_account') || '';
    } catch {
      return '';
    }
  });
  const [symbolInput, setSymbolInput] = useState('');
  const [symbol, setSymbol] = useState('');
  const [outcome, setOutcome] = useState('all');
  const [showIgnored, setShowIgnored] = useState(false);
  const [periodFilter, setPeriodFilter] = useState(null);
  const [binFilter, setBinFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [confirmTrade, setConfirmTrade] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorParams, setCalculatorParams] = useState(null);
  const [editBalanceAccount, setEditBalanceAccount] = useState(null);

  const handleOpenCalculator = useCallback((params = null) => {
    setCalculatorParams(params || (account ? { account_id: account } : null));
    setCalculatorOpen(true);
  }, [account]);

  const handleAccountChange = useCallback((newAcc) => {
    setAccount(newAcc);
    try {
      if (newAcc) localStorage.setItem('pivot_journal_account', newAcc);
      else localStorage.removeItem('pivot_journal_account');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (account && data?.accounts && data.accounts.length > 0 && !data.accounts.includes(account)) {
      handleAccountChange('');
    }
  }, [data?.accounts, account, handleAccountChange]);

  useEffect(() => {
    const id = setTimeout(() => setSymbol(symbolInput.trim()), 350);
    return () => clearTimeout(id);
  }, [symbolInput]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/journal/config`);
      if (res.ok) setConfig(await res.json());
    } catch { /* surfaced by journal load */ }
  }, []);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const { start, end } = rangeForPreset(preset);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (symbol) params.set('symbol', symbol);
      if (account) params.set('account', account);
      if (showIgnored) params.set('include_ignored', 'true');
      const res = await fetch(`${API_BASE}/api/journal?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [preset, symbol, account, showIgnored]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadJournal(); }, [loadJournal]);
  useEffect(() => { setPeriodFilter(null); setBinFilter(null); }, [preset, symbol, account]);

  const runSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/journal/sync`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
      const acctList = body.accounts?.length ? ` across ${body.accounts.length} account(s) (${body.accounts.join(', ')})` : '';
      setSyncMsg({
        ok: true,
        msg: `Synced ${body.fetched} executions (${body.new_executions} new)${acctList}${body.skipped_non_stock ? ` · ${body.skipped_non_stock} non-stock skipped` : ''}${body.has_fifo_pnl ? '' : ' · tip: add "Realized P/L (FIFO)" to your Flex Query'}`
      });
      await loadJournal();
    } catch (e) {
      setSyncMsg({ ok: false, msg: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const executeToggleIgnore = async (trade) => {
    try {
      const isCurrentlyIgnored = trade.is_ignored;
      const url = `${API_BASE}/api/journal/trades/${encodeURIComponent(trade.id)}/ignore`;
      const res = isCurrentlyIgnored
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Unrelated trade' }),
          });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update trade exclusion');
      await loadJournal();
    } catch (err) {
      alert(`Could not update trade: ${err.message}`);
    } finally {
      setConfirmTrade(null);
    }
  };

  const handleToggleIgnore = (trade) => {
    if (trade.is_ignored) {
      // Direct restore without destructive confirmation
      executeToggleIgnore(trade);
    } else {
      // Require confirmation before removing/excluding
      setConfirmTrade(trade);
    }
  };


  const handleNotesSaved = (tradeId, saved) => {
    loadJournal();
    setData((d) => d && ({
      ...d,
      trades: d.trades.map((t) => (t.id === tradeId ? {
        ...t,
        notes: saved.notes,
        tags: saved.tags,
        initial_stop: saved.initial_stop,
        notes_updated_at: saved.notes_updated_at,
      } : t)),
    }));
  };


  const [sort, setSort] = useState({ key: 'open', dir: 'desc' });

  const trades = data?.trades || [];
  const allTags = useMemo(() => [...new Set(trades.flatMap((t) => t.tags || []))].sort(), [trades]);

  const filteredTrades = useMemo(() => trades.filter((t) => {
    if (outcome === 'win' && !(t.status === 'CLOSED' && t.pnl > 0)) return false;
    if (outcome === 'loss' && !(t.status === 'CLOSED' && t.pnl < 0)) return false;
    if (outcome === 'open' && t.status !== 'OPEN') return false;
    if (periodFilter && !(t.close_date || '').startsWith(periodFilter)) return false;
    if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
    if (binFilter) {
      if (t.status !== 'CLOSED') return false;
      const v = binFilter.mode === 'pct' ? t.pnl_pct : t.pnl;
      if (v === null || v === undefined || v < binFilter.start - 1e-9 || v >= binFilter.end - 1e-9) return false;
    }
    return true;
  }), [trades, outcome, periodFilter, binFilter, tagFilter]);

  const sortedTrades = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === (sort?.key || 'open')) || COLUMNS[0];
    const mult = (sort?.dir || 'desc') === 'asc' ? 1 : -1;
    return [...filteredTrades].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      if (va < vb) return -1 * mult;
      if (va > vb) return 1 * mult;
      return 0;
    });
  }, [filteredTrades, sort]);

  const activeIndex = useMemo(() => {
    if (!activeTradeId) return -1;
    return sortedTrades.findIndex((t) => t.id === activeTradeId);
  }, [sortedTrades, activeTradeId]);

  const activeTrade = useMemo(() => {
    if (activeIndex >= 0 && activeIndex < sortedTrades.length) {
      return sortedTrades[activeIndex];
    }
    return trades.find((t) => t.id === activeTradeId) || null;
  }, [sortedTrades, activeIndex, trades, activeTradeId]);

  const handlePrevTrade = useCallback(() => {
    if (activeIndex > 0) {
      setActiveTradeId(sortedTrades[activeIndex - 1].id);
    }
  }, [activeIndex, sortedTrades]);

  const handleNextTrade = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < sortedTrades.length - 1) {
      setActiveTradeId(sortedTrades[activeIndex + 1].id);
    }
  }, [activeIndex, sortedTrades]);

  // Keyboard navigation for Trade Detail modal: Left arrow = Prev, Right arrow = Next (unless typing in input/textarea)
  useEffect(() => {
    if (!activeTradeId) return;
    const handleKeyDown = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTrade();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTrade();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTradeId, handlePrevTrade, handleNextTrade]);

  const hasListFilters = outcome !== 'all' || periodFilter || binFilter || tagFilter || Boolean(account) || showIgnored;
  const presets = [
    { id: 'all', label: 'All' },
    { id: 'ytd', label: 'YTD' },
    { id: '12m', label: '12M' },
    { id: '90d', label: '90D' },
    ...(data?.years || []).map((y) => ({ id: y, label: y })),
  ];
  const noData = data && !trades.length && !symbol && (!data?.years || data.years.length === 0);

  return (
    <div className="journal-page">
      <div className="header-section">
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>PERFORMANCE</span><span>•</span><span>IBKR FLEX</span>
          </div>
          <h1>Trading Journal</h1>
          <p>
            Round-trip trades reconstructed from IBKR executions
            {data?.last_sync?.synced_at && <> · last sync {data.last_sync.synced_at.replace('T', ' ')}</>}
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenCalculator()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🧮</span> Position Calculator
          </button>
          <button className="btn btn-secondary" onClick={() => setSettingsOpen(true)}>⚙️ Flex Settings</button>
          <button className="btn btn-primary" onClick={runSync} disabled={syncing || !config?.has_token || !config?.query_id}
            title={!config?.has_token ? 'Configure Flex token first' : 'Fetch latest executions from IBKR'}>
            {syncing ? <><span className="spin-icon">⟳</span> Syncing…</> : '🔄 Sync from IBKR'}
          </button>
        </div>
      </div>

      {syncMsg && <div className={`jr-banner ${syncMsg.ok ? 'jr-banner-ok' : 'jr-banner-err'}`}>{syncMsg.msg}</div>}
      {error && <div className="jr-banner jr-banner-err">Failed to load journal: {error}</div>}

      {noData ? (
        <div className="glass-card jr-onboarding">
          <h3>Connect your IBKR account</h3>
          <p className="jr-muted">
            {config?.has_token ? 'Settings saved. Press "Sync from IBKR" to import your executions.' : 'Set up an Activity Flex Query and a Flex Web Service token, then save them in Flex Settings.'}
          </p>
          {!config?.has_token && <button className="btn btn-primary" onClick={() => setSettingsOpen(true)}>⚙️ Open Flex Settings</button>}
          <FlexSetupGuide />
        </div>
      ) : (
        <>
          <div className="jr-filter-bar">
            <div className="segmented-control">
              {presets.map((p) => (
                <button key={p.id} className={`segmented-item ${preset === p.id ? 'active' : ''}`} onClick={() => setPreset(p.id)}>{p.label}</button>
              ))}
            </div>
            <input className="jr-input jr-search" placeholder="Filter symbol…" value={symbolInput} onChange={(e) => setSymbolInput(e.target.value)} aria-label="Filter by symbol" />
            {data?.accounts?.length > 1 && (
              <select className="jr-select" value={account} onChange={(e) => handleAccountChange(e.target.value)} aria-label="Account">
                <option value="">All accounts ({data.accounts.length})</option>
                {data.accounts.map((a) => <option key={a} value={a}>Account {a}</option>)}
              </select>
            )}
            {loading && <span className="jr-muted"><span className="spin-icon">⟳</span> Loading…</span>}
          </div>

          <AccountBalancesSection
            balances={data?.balances}
            selectedAccount={account}
            onSelectAccount={handleAccountChange}
            onOpenCalculator={handleOpenCalculator}
            onEditBalance={(acct) => setEditBalanceAccount(acct)}
          />

          <StatsGrid stats={data?.stats} />

          <div className="jr-charts-row">
            <PnlDistributionChart trades={trades} selectedBin={binFilter} onSelectBin={setBinFilter} />
            <EquityCurveChart curve={data?.equity_curve || []} />
          </div>

          <PeriodPnlGrid monthly={data?.monthly || []} yearly={data?.yearly || []} selectedPeriod={periodFilter} onSelectPeriod={setPeriodFilter} />

          <div className="jr-history-header">
            <div className="jr-card-title">Trade History <span className="jr-muted">({filteredTrades.length})</span></div>
            <div className="jr-history-filters">
              <div className="segmented-control">
                {[['all', 'All'], ['win', 'Winners'], ['loss', 'Losers'], ['open', 'Open']].map(([id, label]) => (
                  <button key={id} className={`segmented-item ${outcome === id ? 'active' : ''}`} onClick={() => setOutcome(id)}>{label}</button>
                ))}
              </div>
              {allTags.length > 0 && (
                <select className="jr-select" value={tagFilter || ''} onChange={(e) => setTagFilter(e.target.value || null)} aria-label="Tag filter">
                  <option value="">All tags</option>
                  {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {(data?.ignored_count > 0 || showIgnored) && (
                <button
                  type="button"
                  className={`btn btn-sm ${showIgnored ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowIgnored((v) => !v)}
                  title={showIgnored ? 'Hide excluded trades' : 'Show trades excluded from journal'}
                >
                  {showIgnored ? '👁 Showing Excluded' : `👁 Excluded (${data?.ignored_count || 0})`}
                </button>
              )}
            </div>
          </div>
          {hasListFilters && (
            <div className="chip-group">
              {account && <button className="chip-filter active" onClick={() => handleAccountChange('')}>Account: {account} ✕</button>}
              {periodFilter && <button className="chip-filter active" onClick={() => setPeriodFilter(null)}>Period {periodFilter} ✕</button>}
              {binFilter && <button className="chip-filter active" onClick={() => setBinFilter(null)}>{binFilter.label} ✕</button>}
              {tagFilter && <button className="chip-filter active" onClick={() => setTagFilter(null)}>Tag {tagFilter} ✕</button>}
              {outcome !== 'all' && <button className="chip-filter active" onClick={() => setOutcome('all')}>{outcome} ✕</button>}
              {showIgnored && <button className="chip-filter active" onClick={() => setShowIgnored(false)}>Included Excluded ✕</button>}
            </div>
          )}
          <TradeTable
            trades={filteredTrades}
            sort={sort}
            onSortChange={setSort}
            onOpenTrade={(t) => setActiveTradeId(t.id)}
            onSelectStock={onSelectStock}
            onToggleIgnore={handleToggleIgnore}
            accounts={data?.accounts || []}
            onSelectAccount={handleAccountChange}
            onOpenCalculator={handleOpenCalculator}
          />
        </>
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="IBKR Flex Settings">
        <FlexSettings config={config} onSaved={(cfg) => { setConfig(cfg); setSettingsOpen(false); }} />
      </Modal>

      <Modal
        open={!!activeTrade}
        onClose={() => setActiveTradeId(null)}
        title={activeTrade ? `${activeTrade.symbol} · ${activeTrade.description || 'Trade'}` : 'Trade'}
        headerActions={
          activeTrade && sortedTrades.length > 1 ? (
            <div className="jr-modal-nav-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm jr-modal-nav-btn"
                onClick={handlePrevTrade}
                disabled={activeIndex <= 0}
                title="Previous trade in current selection (Hotkey: ←)"
              >
                ◀ Prev
              </button>
              <span className="jr-modal-nav-counter">
                {activeIndex + 1} / {sortedTrades.length}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm jr-modal-nav-btn"
                onClick={handleNextTrade}
                disabled={activeIndex >= sortedTrades.length - 1}
                title="Next trade in current selection (Hotkey: →)"
              >
                Next ▶
              </button>
            </div>
          ) : null
        }
        wide
      >
        {activeTrade && (
          <TradeDetail
            key={activeTrade.id}
            trade={activeTrade}
            onSaved={handleNotesSaved}
            allTags={allTags}
            onToggleIgnore={handleToggleIgnore}
            onSelectStock={onSelectStock}
            onOpenCalculator={handleOpenCalculator}
          />
        )}
      </Modal>

      <Modal open={!!confirmTrade} onClose={() => setConfirmTrade(null)} title="Exclude Unrelated Trade?">
        {confirmTrade && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              Are you sure you want to exclude <b>{confirmTrade.symbol}</b> ({confirmTrade.direction} trade closed on {confirmTrade.close_date || confirmTrade.open_date}, P&amp;L {fmtMoney(confirmTrade.pnl)}) from your trading journal?
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              This trade will be removed from your win rate, profit factor, equity curve, and monthly metrics. You can always review and restore it via the <b>"👁 Excluded"</b> button.
            </p>
            <div className="jr-dialog-actions" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmTrade(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#f43f5e', borderColor: '#f43f5e' }}
                onClick={() => executeToggleIgnore(confirmTrade)}
              >
                Yes, Exclude Trade
              </button>
            </div>
          </div>
        )}
      </Modal>

      <VanTharpCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        accounts={data?.balances?.accounts || []}
        totalUsdBalance={data?.balances?.total_usd_balance || 0}
        totalUsdEquity={data?.balances?.total_usd_equity || 0}
        defaultAccountId={calculatorParams?.account_id || account || ''}
        initialSymbol={calculatorParams?.symbol || ''}
        initialEntry={calculatorParams?.entry || null}
        initialStop={calculatorParams?.stop || null}
        initialDirection={calculatorParams?.direction || 'LONG'}
        initialAtr={calculatorParams?.atr || null}
      />

      <AccountBalanceModal
        isOpen={!!editBalanceAccount}
        onClose={() => setEditBalanceAccount(null)}
        account={editBalanceAccount}
        onSaved={(_updated) => {
          loadJournal();
        }}
      />
    </div>
  );
}


