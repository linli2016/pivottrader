/**
 * Candidate filtering utility.
 * Note: Active production screening and filtering is executed server-side
 * with vectorized DuckDB queries in `application/services/database.py` via `POST /api/candidates`.
 * This client helper is retained for reference, local simulation, and offline filtering.
 * 
 * @param {Array} candidates - The list of candidate stock metrics.
 * @param {Object} filters - Dictionary of active filter states.
 * @returns {Array} - The filtered list of candidates.
 */
export function filterCandidates(candidates, filters = {}) {
  const f = { ...filters };

  // Helper to get value supporting both snake_case and camelCase
  const getF = (key, legacyKey, defaultVal = undefined) => {
    if (f[key] !== undefined) return f[key];
    if (legacyKey && f[legacyKey] !== undefined) return f[legacyKey];
    return defaultVal;
  };

  const minPrice = getF('min_price', 'minPriceFilter', 5.0);
  const minVol = getF('min_volume_sma_50', 'minVolFilter', 100000);
  const minDollarVol = getF('min_dollar_vol', 'minDollarVolFilter', 3000000.0);

  const enforceStage2 = getF('enforce_stage2', 'enforceStage2', false);
  const enableRs = getF('enable_rs', 'enableRs', false);
  const minRs = getF('min_rs_rank', 'minRsFilter', 70);
  const enableTi65 = getF('enable_ti65', 'enableTi65', false);
  const minTi65 = getF('min_ti_65', 'minTi65Filter', 1.05);

  const requirePowerPlay = getF('require_power_play', 'enablePowerPlay', false);
  const requireBreakout = getF('require_breakout', 'enableQullamaggieBreakout', false);
  const requireEpisodicPivot = getF('require_episodic_pivot', 'enableEpisodicPivot', false);
  const requireMomentum = getF('require_momentum', 'enableQullamaggieMomentum', false);
  const requireParabolic = getF('require_parabolic', 'enableParabolicClimax', false);
  const requireIpoBase = getF('require_ipo_base', 'enableIpoBase', false);
  const requireVcp = getF('require_vcp', 'enableVcpSetup', false);

  return candidates.filter(c => {
    // Exclude ETFs from screening candidates
    if (c.asset_type && c.asset_type.toUpperCase().includes('ETF')) return false;

    // 1. Base Liquidity
    if (c.close < minPrice) return false;
    if (c.vol_50d_ma < minVol) return false;
    const dollarVol = c.dollar_vol_50d_ma || (c.close * c.vol_50d_ma);
    if (dollarVol < minDollarVol) return false;

    // Trend Template (if enforce_stage2 is checked)
    if (enforceStage2) {
      if (c.sma_50 === null || c.sma_150 === null || c.sma_200 === null) return false;
      if (c.sma_50 <= c.sma_150 || c.sma_150 <= c.sma_200) return false;
      if (c.close < c.sma_50) return false;
      if (c.sma_200_20d_ago !== null && c.sma_200_20d_ago !== undefined && c.sma_200 <= c.sma_200_20d_ago) return false;
      if (c.dist_from_52w_high !== null && c.dist_from_52w_high !== undefined && c.dist_from_52w_high > 25.0) return false;
      if (c.surge_off_low_pct !== null && c.surge_off_low_pct !== undefined && c.surge_off_low_pct < 30.0) return false;
    }

    // Relative Strength (RS Rank) filter
    if (enableRs) {
      if (c.rs_rank === null || c.rs_rank === undefined || c.rs_rank < minRs) return false;
    }

    // Stockbee Trend Intensity (TI65) filter
    if (enableTi65) {
      if (c.ti_65 === null || c.ti_65 === undefined || c.ti_65 < minTi65) return false;
    }

    // Pivot Tightness (VDU) filter
    const requirePivotTightness = getF('require_pivot_tightness', 'enablePivotTightness', false);
    if (requirePivotTightness) {
      const maxPivotSpread = getF('max_pivot_spread', 'maxPivotSpreadFilter', 8.0);
      const maxPivotClustering = getF('max_pivot_clustering', 'maxPivotClusteringFilter', 3.0);
      const maxPivotVolRatio = getF('max_pivot_vol_ratio', 'maxPivotVolRatioFilter', 0.80);

      if (c.pivot_spread_pct !== null && c.pivot_spread_pct !== undefined && c.pivot_spread_pct > maxPivotSpread) return false;
      if (c.pivot_close_clustering_pct !== null && c.pivot_close_clustering_pct !== undefined && c.pivot_close_clustering_pct > maxPivotClustering) return false;
      if (c.volume && c.vol_50d_ma && (c.volume / c.vol_50d_ma) > maxPivotVolRatio) return false;
    }

    // Power Play
    if (requirePowerPlay) {
      if (!c.pp_is_setup) return false;
      const minPpRunup = getF('min_pp_runup', 'minPpRunupFilter', 100.0);
      const maxPpDrawdown = getF('max_pp_drawdown', 'maxPpDrawdownFilter', 25.0);
      if (c.pp_runup_pct !== null && c.pp_runup_pct !== undefined && c.pp_runup_pct < minPpRunup) return false;
      if (c.pp_drawdown_pct !== null && c.pp_drawdown_pct !== undefined && c.pp_drawdown_pct > maxPpDrawdown) return false;
    }

    // QM Breakout
    if (requireBreakout) {
      if (!c.breakout_is_setup) return false;
      const minBreakoutRunup = getF('min_breakout_runup', 'minBreakoutRunupFilter', 30.0);
      if (c.breakout_runup_pct !== null && c.breakout_runup_pct !== undefined && c.breakout_runup_pct < minBreakoutRunup) return false;
    }

    // Episodic Pivot
    if (requireEpisodicPivot) {
      if (!c.ep_is_setup) return false;
      const minEpGap = getF('min_ep_gap', 'minEpGapFilter', 10.0);
      const minEpRelVol = getF('min_ep_rel_vol', 'minEpRelVolFilter', 2.5);
      if (c.gap_pct !== null && c.gap_pct !== undefined && c.gap_pct < minEpGap) return false;
      if (c.rel_vol_50d !== null && c.rel_vol_50d !== undefined && c.rel_vol_50d < minEpRelVol) return false;
    }

    // Momentum
    if (requireMomentum) {
      const qmSubview = getF('qm_subview', 'qmSubview', 'all');
      if (qmSubview === '1m' && (!c.qm_timeframes || !c.qm_timeframes.includes('1M'))) return false;
      if (qmSubview === '3m' && (!c.qm_timeframes || !c.qm_timeframes.includes('3M'))) return false;
      if (qmSubview === '6m' && (!c.qm_timeframes || !c.qm_timeframes.includes('6M'))) return false;
    }

    // Parabolic
    if (requireParabolic) {
      const isShort = getF('enable_parabolic_short', 'enableParabolicShort', true);
      const isLong = getF('enable_parabolic_long', 'enableParabolicLong', true);
      const isShortMatch = isShort && c.parabolic_short_is_setup;
      const isLongMatch = isLong && c.parabolic_long_is_setup;
      if (!isShortMatch && !isLongMatch) return false;
    }

    // IPO Base
    if (requireIpoBase) {
      const maxIpoAge = getF('max_ipo_age', 'maxIpoAgeFilter', 350);
      const maxIpoDist = getF('max_ipo_dist', 'maxIpoDistFilter', 25.0);
      const maxIpoDepth = getF('max_ipo_depth', 'maxIpoDepthFilter', 35.0);
      if (c.ipo_days_count === null || c.ipo_days_count === undefined) return false;
      if (c.ipo_days_count < 10 || c.ipo_days_count > maxIpoAge) return false;
      if (c.ipo_drawdown_from_high !== null && c.ipo_drawdown_from_high > maxIpoDist) return false;
      if (c.ipo_base_depth !== null && c.ipo_base_depth > maxIpoDepth) return false;
    }

    // VCP
    if (requireVcp) {
      if (!c.vcp_is_setup) return false;
      const enableVcpEps = getF('enable_vcp_eps_growth', 'enableVcpEpsGrowth', false);
      if (enableVcpEps) {
        const minEpsGrowth = getF('min_eps_growth_qoq', 'minEpsGrowthFilter', 20.0);
        if (c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined && c.eps_qoq_growth < minEpsGrowth) return false;
      }
    }

    return true;
  });
}
