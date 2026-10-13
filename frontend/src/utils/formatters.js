/**
 * Shared numeric, currency, and percentage formatting utilities.
 */

export function formatNumber(val, decimals = 2, fallback = '—') {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(val, decimals = 2, fallback = '—', showSign = false) {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  const num = Number(val);
  const formatted = num.toFixed(decimals) + '%';
  if (showSign && num > 0) return '+' + formatted;
  return formatted;
}

export function formatVolume(val, fallback = '—') {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  const num = Number(val);
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function formatCurrency(val, decimals = 2, fallback = '—') {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  return '$' + Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
