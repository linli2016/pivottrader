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
    enableDarvasBox,
    minPpRunupFilter,
    maxPpDrawdownFilter,
    minPpDaysSincePeakFilter,
    maxPpVolRatioFilter,
    maxIpoAgeFilter,
    maxIpoDistFilter,
    maxIpoDepthFilter,
    maxDarvasWidthFilter,
    // Optional checkboxes states
    enablePpRunup,
    enablePpDrawdown,
    enablePpDaysSincePeak,
    enablePpVolRatio,
    enableIpoAge,
    enableIpoDist,
    enableIpoDepth,
    enableVcpEpsGrowth,
    enableVcpRsPercentile,
    enableVcpPattern,
    enableDarvasPattern,
    enableDarvasWidth,
    enableRsNewHigh,
    enableAtr,
    // New Leaders setup states
    enableNewLeaders,
    max52wDistFilter,
    minSurgeOffLowFilter,
    minNewLeadersRsFilter,
    enable52wDist,
    enableSurgeOffLow,
    enableNewLeadersRs,
    enableNewLeaders52wHigh,
    enableNewLeadersBase,
  } = filters;

  return candidates.filter(c => {
    // 1. Stage 2 (Mandatory / Base filtering)
    if (c.close < minPriceFilter) return false;
    if (c.vol_50d_ma < minVolFilter) return false;
    
    // Trend Template (if enforceStage2 is checked)
    if (enforceStage2) {
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
      if (enablePpDaysSincePeak) {
        if (c.pp_days_since_peak === null || c.pp_days_since_peak === undefined || c.pp_days_since_peak < minPpDaysSincePeakFilter) return false;
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
      // Stage 2 Trend Template is required for Minervini VCP Pattern
      if (!c.close || !c.sma_50 || !c.sma_150 || !c.sma_200) return false;
      if (!(c.close > c.sma_50 && c.sma_50 > c.sma_150 && c.sma_150 > c.sma_200)) return false;

      if (enableVcpEpsGrowth) {
        if (c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined && c.eps_qoq_growth < minEpsGrowthFilter) return false;
      }
      if (enableVcpRsPercentile) {
        if (c.rs_rank !== null && c.rs_rank !== undefined && c.rs_rank < minRsFilter) return false;
      }
      if (enableVcpPattern) {
        if (!c.vcp_is_setup) return false;
      }
      // Current price must be within 15% range of 52-week high
      if (c.dist_from_52w_high !== null && c.dist_from_52w_high !== undefined && c.dist_from_52w_high > 15.0) return false;
    }

    // 5. Darvas Box Setup Overlay
    if (enableDarvasBox) {
      if (enableDarvasPattern) {
        if (!c.darvas_is_setup) return false;
      }
      if (enableDarvasWidth) {
        if (c.darvas_box_width_pct === null || c.darvas_box_width_pct === undefined || c.darvas_box_width_pct > maxDarvasWidthFilter) return false;
      }
    }

    // 6. New Leaders Setup Overlay (Minervini Market Correction Leader Turnover)
    if (enableNewLeaders) {
      if (enable52wDist) {
        if (c.dist_from_52w_high === null || c.dist_from_52w_high === undefined || c.dist_from_52w_high > max52wDistFilter) return false;
      }
      if (enableSurgeOffLow) {
        if (c.surge_off_low_pct === null || c.surge_off_low_pct === undefined || c.surge_off_low_pct < minSurgeOffLowFilter) return false;
      }
      if (enableNewLeadersRs) {
        if (c.rs_rank === null || c.rs_rank === undefined || c.rs_rank < minNewLeadersRsFilter) return false;
      }
      if (enableNewLeaders52wHigh) {
        if (!c.is_52w_high && (c.dist_from_52w_high === null || c.dist_from_52w_high > 3.0)) return false;
      }
      if (enableNewLeadersBase) {
        if (!c.vcp_is_setup && !c.darvas_is_setup && !c.rs_rank_is_new_high) return false;
      }
    }

    // 7. Qullamaggie Breakout Setup Overlay
    if (filters.enableQullamaggieBreakout) {
      if (filters.enable1mRet && filters.min1mRetFilter !== undefined) {
        if (c.ret_1m === null || c.ret_1m === undefined || c.ret_1m < filters.min1mRetFilter) return false;
      }
      if (filters.enableEmaSurfing) {
        if (c.ema_10 && c.close < c.ema_10 * 0.97 && c.ema_20 && c.close < c.ema_20 * 0.97) return false;
      }
    }

    // 8. Episodic Pivot (EP) Setup Overlay
    if (filters.enableEpisodicPivot) {
      if (filters.enableEpGap && filters.minEpGapFilter !== undefined) {
        if (c.gap_pct === null || c.gap_pct === undefined || c.gap_pct < filters.minEpGapFilter) return false;
      }
      if (filters.enableEpRelVol && filters.minEpRelVolFilter !== undefined) {
        if (c.rel_vol_50d === null || c.rel_vol_50d === undefined || c.rel_vol_50d < filters.minEpRelVolFilter) return false;
      }
    }

    // 9. Parabolic Climax Setup Overlay (Short & Long)
    if (filters.enableParabolicClimax || filters.enableParabolicShort || filters.enableParabolicLong) {
      // Short-side candidate match (overextended top)
      const isShortMatch = (
        c.parabolic_short_is_setup ||
        (
          (c.parabolic_runup_pct !== null && c.parabolic_runup_pct > 0) &&
          (!filters.enableParabolicRunup || filters.minParabolicRunupFilter === undefined || c.parabolic_runup_pct >= filters.minParabolicRunupFilter) &&
          (!filters.enableParabolicEmaDist || filters.minParabolicEmaDistFilter === undefined || (c.dist_ema10_pct !== null && c.dist_ema10_pct >= filters.minParabolicEmaDistFilter)) &&
          (!filters.enableParabolicUpDays || filters.minParabolicUpDaysFilter === undefined || (c.parabolic_up_days !== null && c.parabolic_up_days >= filters.minParabolicUpDaysFilter))
        )
      );

      // Long-side candidate match (oversold bottom)
      const isLongMatch = (
        c.parabolic_long_is_setup ||
        (c.dist_ema10_pct !== null && c.dist_ema10_pct <= -18.0 && c.parabolic_runup_pct !== null && c.parabolic_runup_pct <= -30.0)
      );

      if (!isShortMatch && !isLongMatch) return false;
    }

    return true;
  });
}
