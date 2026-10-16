import React, { useState, useEffect } from 'react';
import stockLogosMap from '../utils/stockLogosMap.json';

/**
 * High-priority manual overrides or custom mappings
 */
export const LOGO_OVERRIDES = {
  SPCX: 'spacex',
  GOOGL: 'alphabet',
  GOOG: 'alphabet',
  META: 'meta-platforms',
};

/**
 * Resolves a stock ticker to TradingView's S3 CDN vector logo URL.
 * Base URL: https://s3-symbol-logo.tradingview.com/{logoid}.svg
 */
export function getTradingViewLogoUrl(symbol) {
  if (!symbol) return null;
  const sym = String(symbol).trim().toUpperCase().split(':').pop();
  const logoid = LOGO_OVERRIDES[sym] || stockLogosMap[sym] || sym.toLowerCase();
  return `https://s3-symbol-logo.tradingview.com/${logoid}.svg`;
}

// Fallback deterministic colors for initials avatar
const FALLBACK_COLORS = [
  '#38bdf8', // sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f43f5e'  // rose
];

/**
 * StockBrandIcon: Renders TradingView company vector logo (SVG),
 * falling back gracefully to a stylized letter badge if the image cannot be loaded.
 */
export function StockBrandIcon({
  symbol,
  size = 18,
  style = {},
  className = '',
  title
}) {
  const sym = (symbol || '').trim().toUpperCase().split(':').pop();
  const [hasError, setHasError] = useState(false);

  // Reset error state when symbol changes
  useEffect(() => {
    setHasError(false);
  }, [sym]);

  if (!sym) {
    return null;
  }

  const logoUrl = !hasError ? getTradingViewLogoUrl(sym) : null;

  // Fallback avatar background and color calculation
  const charCode = (sym.charCodeAt(0) || 0) + (sym.charCodeAt(1) || 0);
  const accentColor = FALLBACK_COLORS[charCode % FALLBACK_COLORS.length];
  const r = parseInt(accentColor.slice(1, 3), 16);
  const g = parseInt(accentColor.slice(3, 5), 16);
  const b = parseInt(accentColor.slice(5, 7), 16);

  if (logoUrl && !hasError) {
    return (
      <div
        className={`stock-brand-icon-wrapper ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.05)',
          ...style
        }}
        title={title || sym}
      >
        <img
          src={logoUrl}
          alt={sym}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            display: 'block'
          }}
        />
      </div>
    );
  }

  // Fallback badge with ticker initials
  return (
    <div
      className={`stock-brand-icon-fallback ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `rgba(${r}, ${g}, ${b}, 0.22)`,
        border: `1px solid rgba(${r}, ${g}, ${b}, 0.45)`,
        color: accentColor,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.max(8, Math.round(size * 0.46))}px`,
        fontWeight: 800,
        flexShrink: 0,
        textTransform: 'uppercase',
        userSelect: 'none',
        lineHeight: 1,
        ...style
      }}
      title={title || sym}
    >
      {sym.slice(0, Math.min(sym.length, size < 20 ? 1 : 2))}
    </div>
  );
}

export default StockBrandIcon;

