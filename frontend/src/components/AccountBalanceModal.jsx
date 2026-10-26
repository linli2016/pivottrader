import React, { useState, useEffect, useRef } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function AccountBalanceModal({
  isOpen,
  onClose,
  account,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const [usdBalance, setUsdBalance] = useState('');
  const [cadBalance, setCadBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (account) {
      setUsdBalance(account.usd_balance !== undefined && account.usd_balance !== null ? String(account.usd_balance) : '0');
      setCadBalance(account.cad_balance !== undefined && account.cad_balance !== null ? String(account.cad_balance) : '0');
      setError(null);
    }
  }, [account, isOpen]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    else if (!isOpen && d.open) d.close();
  }, [isOpen]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return undefined;
    const handleClose = () => onClose?.();
    d.addEventListener('close', handleClose);
    return () => d.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/journal/accounts/${encodeURIComponent(account.account_id)}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usd_balance: parseFloat(usdBalance) || 0,
          cad_balance: parseFloat(cadBalance) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onSaved?.(data);
      dialogRef.current?.close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="jr-dialog" aria-label="Edit Account Balances">
      {isOpen && account && (
        <div className="jr-dialog-body">
          <div className="jr-dialog-header">
            <h2>💰 Edit Cash Balances — {account.account_id} {account.name ? `(${account.name})` : ''}</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="vt-callout-banner" style={{ margin: 0 }}>
              <span className="vt-callout-icon">ℹ️</span>
              <div>
                <b>Van Tharp Position Sizing:</b> PivotTrader calculates trade risk and position size using <b>USD cash balance only</b>.
                CAD balance is tracked alongside for total portfolio accounting.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="vt-label" style={{ color: '#34d399', fontWeight: '600' }}>
                USD Cash Balance ($) <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— Active 1R Risk Equity</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="jr-input"
                style={{ fontSize: '16px', fontWeight: '600', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                value={usdBalance}
                onChange={(e) => setUsdBalance(e.target.value)}
                placeholder="0.00"
              />
              <span className="jr-muted">
                1% trade risk budget will be: <b>${((parseFloat(usdBalance) || 0) * 0.01).toFixed(2)} USD</b> per trade.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="vt-label">
                CAD Cash Balance (C$) <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— Excluded from trade risk</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="jr-input"
                style={{ fontSize: '15px' }}
                value={cadBalance}
                onChange={(e) => setCadBalance(e.target.value)}
                placeholder="0.00"
              />
              <span className="jr-muted">
                Your Canadian dollar cash reserves. Not counted for US stock sizing.
              </span>
            </div>

            {error && <div className="jr-banner jr-banner-err">{error}</div>}

            <div className="jr-dialog-actions" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Balance'}
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}

