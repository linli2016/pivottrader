/**
 * Filters the list of candidates based on active screening criteria, overlays, and thresholds.
 * 
 * @param {Array} candidates - The full list of candidate stock metrics.
 * @param {Object} filters - An object containing all active filter states.
 * @returns {Array} - The filtered list of candidates.
 */
export function filterCandidates(candidates, filters) {
  const {
    minPriceFilter,
    minVolFilter,
    minAtrFilter,
    minRsFilter,
    minEpsGrowthFilter,
    enforceStage2,
    enablePowerPlay,
    enableIpoBase,
    enableVcpSetup,
    minPpRunupFilter,
    maxPpDrawdownFilter,
    maxPpVolRatioFilter,
    maxIpoAgeFilter,
    maxIpoDistFilter,
    maxIpoDepthFilter,
    // Optional checkboxes states
    enablePpRunup,
    enablePpDrawdown,
    enablePpVolRatio,
    enableIpoAge,
    enableIpoDist,
    enableIpoDepth,
    enableVcpEpsGrowth,
    enableVcpRsPercentile,
    enableVcpPattern,
    enableRsNewHigh,
    enableAtr,
  } = filters;

  return candidates.filter(c => {
    // 1. Stage 2 (Mandatory / Base filtering)
    if (c.close < minPriceFilter) return false;
    if (c.vol_50d_ma < minVolFilter) return false;
    
    // Trend Template (waived for recent IPOs under IPO base if enableIpoAge is checked)
    const isRecentIpo = enableIpoBase && enableIpoAge && c.ipo_days_count !== null && c.ipo_days_count !== undefined && c.ipo_days_count <= maxIpoAgeFilter;
    if (isRecentIpo) {
      if (c.sma_50 !== null && c.sma_50 !== undefined && c.close < c.sma_50) return false;
    } else {
      if (c.sma_50 === null || c.sma_150 === null || c.sma_200 === null) return false;
      if (c.sma_50 <= c.sma_150 || c.sma_150 <= c.sma_200) return false;
      if (c.close < c.sma_50) return false;
    }

    // Optional ATR filter
    if (enableAtr) {
      if (c.atr_20d !== null && c.atr_20d !== undefined && c.atr_20d < minAtrFilter) return false;
    }

    // General RS Rank New High filter
    if (enableRsNewHigh) {
      if (!c.rs_rank_is_new_high) return false;
    }

    // 2. Power Play Overlay
    if (enablePowerPlay) {
      if (enablePpRunup) {
        if (c.pp_runup_pct === null || c.pp_runup_pct === undefined || c.pp_runup_pct < minPpRunupFilter) return false;
      }
      if (enablePpDrawdown) {
        if (c.pp_drawdown_pct === null || c.pp_drawdown_pct === undefined || c.pp_drawdown_pct > maxPpDrawdownFilter) return false;
      }
      if (enablePpVolRatio) {
        if (c.volume && c.vol_50d_ma) {
          const volRatio = c.volume / c.vol_50d_ma;
          if (volRatio > maxPpVolRatioFilter) return false;
        }
      }
    }

    // 3. IPO Base Overlay
    if (enableIpoBase) {
      if (enableIpoAge) {
        if (c.ipo_days_count === null || c.ipo_days_count === undefined) return false;
        if (c.ipo_days_count < 10 || c.ipo_days_count > maxIpoAgeFilter) return false;
      }
      if (enableIpoDist) {
        if (c.ipo_drawdown_from_high === null || c.ipo_drawdown_from_high === undefined) return false;
        if (c.ipo_drawdown_from_high > maxIpoDistFilter) return false;
      }
      if (enableIpoDepth) {
        if (c.ipo_base_depth === null || c.ipo_base_depth === undefined) return false;
        if (c.ipo_base_depth > maxIpoDepthFilter) return false;
      }
    }

    // 4. VCP Setup Overlay
    if (enableVcpSetup) {
      if (enableVcpEpsGrowth) {
        if (c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined && c.eps_qoq_growth < minEpsGrowthFilter) return false;
      }
      if (enableVcpRsPercentile) {
        if (c.rs_rank !== null && c.rs_rank !== undefined && c.rs_rank < minRsFilter) return false;
      }
      if (enableVcpPattern) {
        if (!c.vcp_is_setup) return false;
      }
    }

    return true;
  });
}
