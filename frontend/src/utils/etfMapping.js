/**
 * Industry and Sector Benchmark ETF mappings for Stan Weinstein Stage 2 Analysis.
 * Maps individual stock sectors and industries to their corresponding tradable ETF.
 */

export const BENCHMARK_ETFS = {
  // Key Sub-Industry ETFs (high-beta / high-leadership groups)
  SMH: { symbol: 'SMH', name: 'Semiconductors', fullName: 'VanEck Semiconductor ETF', level: 'Industry', sector: 'Technology' },
  IGV: { symbol: 'IGV', name: 'Software', fullName: 'iShares Expanded Tech-Software ETF', level: 'Industry', sector: 'Technology' },
  XBI: { symbol: 'XBI', name: 'Biotech', fullName: 'SPDR S&P Biotech ETF', level: 'Industry', sector: 'Healthcare' },
  KRE: { symbol: 'KRE', name: 'Regional Banks', fullName: 'SPDR S&P Regional Banking ETF', level: 'Industry', sector: 'Financials' },
  ITB: { symbol: 'ITB', name: 'Homebuilders', fullName: 'iShares U.S. Home Construction ETF', level: 'Industry', sector: 'Consumer Discretionary' },
  ITA: { symbol: 'ITA', name: 'Aerospace & Defense', fullName: 'iShares U.S. Aerospace & Defense ETF', level: 'Industry', sector: 'Industrials' },
  XOP: { symbol: 'XOP', name: 'Oil & Gas E&P', fullName: 'SPDR S&P Oil & Gas Exploration ETF', level: 'Industry', sector: 'Energy' },
  XRT: { symbol: 'XRT', name: 'Retail', fullName: 'SPDR S&P Retail ETF', level: 'Industry', sector: 'Consumer Discretionary' },

  // GICS Broad Sector SPDR ETFs
  XLK: { symbol: 'XLK', name: 'Technology', fullName: 'Technology Select Sector SPDR', level: 'Sector', sector: 'Technology' },
  XLF: { symbol: 'XLF', name: 'Financials', fullName: 'Financial Select Sector SPDR', level: 'Sector', sector: 'Financials' },
  XLV: { symbol: 'XLV', name: 'Health Care', fullName: 'Health Care Select Sector SPDR', level: 'Sector', sector: 'Healthcare' },
  XLY: { symbol: 'XLY', name: 'Consumer Discretionary', fullName: 'Consumer Discretionary SPDR', level: 'Sector', sector: 'Consumer Discretionary' },
  XLP: { symbol: 'XLP', name: 'Consumer Staples', fullName: 'Consumer Staples Select Sector SPDR', level: 'Sector', sector: 'Consumer Staples' },
  XLE: { symbol: 'XLE', name: 'Energy', fullName: 'Energy Select Sector SPDR', level: 'Sector', sector: 'Energy' },
  XLI: { symbol: 'XLI', name: 'Industrials', fullName: 'Industrial Select Sector SPDR', level: 'Sector', sector: 'Industrials' },
  XLB: { symbol: 'XLB', name: 'Materials', fullName: 'Materials Select Sector SPDR', level: 'Sector', sector: 'Materials' },
  XLU: { symbol: 'XLU', name: 'Utilities', fullName: 'Utilities Select Sector SPDR', level: 'Sector', sector: 'Utilities' },
  XLRE: { symbol: 'XLRE', name: 'Real Estate', fullName: 'Real Estate Select Sector SPDR', level: 'Sector', sector: 'Real Estate' },
  XLC: { symbol: 'XLC', name: 'Communication Services', fullName: 'Communication Services SPDR', level: 'Sector', sector: 'Communication Services' },

  // Broad Market Benchmarks
  SPY: { symbol: 'SPY', name: 'S&P 500', fullName: 'SPDR S&P 500 ETF Trust', level: 'Market', sector: 'Broad Market' },
  QQQ: { symbol: 'QQQ', name: 'Nasdaq 100', fullName: 'Invesco QQQ Trust', level: 'Market', sector: 'Broad Market' },
  IWM: { symbol: 'IWM', name: 'Russell 2000', fullName: 'iShares Russell 2000 ETF', level: 'Market', sector: 'Broad Market' }
};

/**
 * Ordered list of all sector benchmark ETFs for sequential group cycling
 */
export const SECTOR_ETFS_ORDERED = [
  BENCHMARK_ETFS.XLK,
  BENCHMARK_ETFS.XLF,
  BENCHMARK_ETFS.XLV,
  BENCHMARK_ETFS.XLY,
  BENCHMARK_ETFS.XLI,
  BENCHMARK_ETFS.XLE,
  BENCHMARK_ETFS.XLC,
  BENCHMARK_ETFS.XLB,
  BENCHMARK_ETFS.XLRE,
  BENCHMARK_ETFS.XLP,
  BENCHMARK_ETFS.XLU
];

/**
 * Ordered list of all key industry ETFs for sequential group cycling
 */
export const INDUSTRY_ETFS_ORDERED = [
  BENCHMARK_ETFS.SMH,
  BENCHMARK_ETFS.IGV,
  BENCHMARK_ETFS.XBI,
  BENCHMARK_ETFS.ITA,
  BENCHMARK_ETFS.ITB,
  BENCHMARK_ETFS.KRE,
  BENCHMARK_ETFS.XRT,
  BENCHMARK_ETFS.XOP
];

/**
 * Returns the best benchmark ETF for a given sector and industry.
 * Checks fine-grained sub-industry keywords first, then falls back to sector level.
 */
export function getBenchmarkEtf(sector = '', industry = '') {
  const sec = (sector || '').toLowerCase();
  const ind = (industry || '').toLowerCase();

  // Direct ETF symbol match
  const directSym = (sector || industry || '').toUpperCase().trim();
  if (BENCHMARK_ETFS[directSym]) {
    return BENCHMARK_ETFS[directSym];
  }

  // 1. High-priority sub-industry mappings
  if (ind.includes('semi') || ind.includes('chip') || sec.includes('chip')) {
    return BENCHMARK_ETFS.SMH;
  }
  if (ind.includes('biotech') || ind.includes('biological') || ind.includes('diagnostic')) {
    return BENCHMARK_ETFS.XBI;
  }
  if (ind.includes('software') || ind.includes('cloud') || sec.includes('software')) {
    return BENCHMARK_ETFS.IGV;
  }
  if (ind.includes('homebuild') || ind.includes('residential construction') || ind.includes('building') || sec.includes('building')) {
    return BENCHMARK_ETFS.ITB;
  }
  if (ind.includes('aerospace') || ind.includes('defense') || sec.includes('aerospace')) {
    return BENCHMARK_ETFS.ITA;
  }
  if (ind.includes('bank') || sec.includes('bank')) {
    return BENCHMARK_ETFS.KRE;
  }
  if (ind.includes('oil & gas') || ind.includes('drilling') || ind.includes('exploration') || ind.includes('petroleum')) {
    return BENCHMARK_ETFS.XOP;
  }
  if (ind.includes('retail') || ind.includes('apparel') || ind.includes('store') || sec.includes('retail')) {
    return BENCHMARK_ETFS.XRT;
  }

  // 2. Broad sector mappings
  if (sec.includes('tech') || sec.includes('computer') || sec.includes('electrncs') || ind.includes('tech') || ind.includes('computer') || ind.includes('hardware')) {
    return BENCHMARK_ETFS.XLK;
  }
  if (sec.includes('finan') || sec.includes('insurance') || ind.includes('financial') || ind.includes('insurance')) {
    return BENCHMARK_ETFS.XLF;
  }
  if (sec.includes('health') || sec.includes('medic') || ind.includes('medical') || ind.includes('pharma') || ind.includes('health')) {
    return BENCHMARK_ETFS.XLV;
  }
  if (sec.includes('energy') || ind.includes('energy') || ind.includes('oil') || ind.includes('gas') || ind.includes('coal')) {
    return BENCHMARK_ETFS.XLE;
  }
  if (sec.includes('industr') || sec.includes('machine') || sec.includes('transportation') || sec.includes('busins') || sec.includes('service') || ind.includes('industrial') || ind.includes('transport') || ind.includes('machinery') || ind.includes('business service')) {
    return BENCHMARK_ETFS.XLI;
  }
  if (sec.includes('material') || sec.includes('chemic') || sec.includes('metal') || sec.includes('mining') || ind.includes('chemical') || ind.includes('metal') || ind.includes('mining')) {
    return BENCHMARK_ETFS.XLB;
  }
  if (sec.includes('util') || ind.includes('utility') || ind.includes('utilities')) {
    return BENCHMARK_ETFS.XLU;
  }
  if (sec.includes('real est') || ind.includes('reit') || ind.includes('real estate')) {
    return BENCHMARK_ETFS.XLRE;
  }
  if (sec.includes('communic') || sec.includes('telecom') || sec.includes('media') || sec.includes('internet') || ind.includes('telecom') || ind.includes('media') || ind.includes('internet')) {
    return BENCHMARK_ETFS.XLC;
  }
  if (sec.includes('staple') || sec.includes('food') || sec.includes('bev') || sec.includes('alcohl') || sec.includes('agriculture') || ind.includes('food') || ind.includes('beverage') || ind.includes('staple')) {
    return BENCHMARK_ETFS.XLP;
  }
  if (sec.includes('consumer') || sec.includes('auto') || sec.includes('leisure') || ind.includes('consumer') || ind.includes('auto') || ind.includes('leisure')) {
    return BENCHMARK_ETFS.XLY;
  }
  if (sec.includes('misc')) {
    return BENCHMARK_ETFS.SPY;
  }

  return null;
}

/**
 * Builds an ordered list of distinct ETF objects from a list of groups or stocks.
 * Useful for populating activeStockList so the drawer can navigate "Next Group".
 */
export function buildGroupEtfList(items = [], type = 'sector') {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const sec = item.sector || (type === 'sector' ? item.name : '');
    const ind = item.industry || (type === 'industry' ? item.name : '');
    const etf = getBenchmarkEtf(sec, ind);
    if (etf && !seen.has(etf.symbol)) {
      seen.add(etf.symbol);
      result.push({
        symbol: etf.symbol,
        name: etf.fullName,
        group_name: item.name || etf.name,
        sector: etf.sector,
        industry: etf.name,
        asset_type: 'ETF',
        is_group_benchmark: true
      });
    }
  }

  // If no items or few items, fallback to ordered list
  if (result.length === 0) {
    const fallback = type === 'industry' ? INDUSTRY_ETFS_ORDERED : SECTOR_ETFS_ORDERED;
    return fallback.map(etf => ({
      symbol: etf.symbol,
      name: etf.fullName,
      group_name: etf.name,
      sector: etf.sector,
      industry: etf.name,
      asset_type: 'ETF',
      is_group_benchmark: true
    }));
  }

  return result;
}

