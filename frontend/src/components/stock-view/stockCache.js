import { API_BASE } from '../../utils/api';

// Global in-memory cache to preserve stock data (prices, details, peers) across tab switches
export const globalStockDataCache = new Map(); // symbol -> { prices, detail, peersData }

/**
 * Fetch complete stock bundle: historical candles, fundamental detail, and industry peers.
 * Uses in-memory cache for instant 0ms retrieval on revisit.
 */
export async function fetchStockBundle(symbol, { forceRefresh = false, limit = 3500 } = {}) {
  if (!symbol) return { prices: [], detail: null, peersData: null };
  const sym = symbol.toUpperCase().trim();

  if (!forceRefresh && globalStockDataCache.has(sym)) {
    return globalStockDataCache.get(sym);
  }

  const pPrices = fetch(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}/prices?limit=${limit}`)
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => []);

  const pDetail = fetch(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  const pPeers = fetch(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}/peers?limit=6`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  const [prices, detail, peersData] = await Promise.all([pPrices, pDetail, pPeers]);

  const bundle = {
    prices: Array.isArray(prices) ? prices : [],
    detail,
    peersData
  };

  globalStockDataCache.set(sym, bundle);
  return bundle;
}

export function getCachedStockData(symbol) {
  if (!symbol) return null;
  return globalStockDataCache.get(symbol.toUpperCase().trim()) || null;
}

export function setCachedStockData(symbol, data) {
  if (!symbol) return;
  globalStockDataCache.set(symbol.toUpperCase().trim(), data);
}

export function clearStockCache() {
  globalStockDataCache.clear();
}

