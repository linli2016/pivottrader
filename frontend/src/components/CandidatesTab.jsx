import React from 'react';

export default function CandidatesTab({
  candidates,
  filteredCandidates,
  minPriceFilter,
  setMinPriceFilter,
  minVolFilter,
  setMinVolFilter,
  minRsFilter,
  setMinRsFilter,
  minEpsGrowthFilter,
  setMinEpsGrowthFilter,
  minAtrFilter,
  setMinAtrFilter,
  enforceStage2,
  setEnforceStage2,
  enablePowerPlay,
  setEnablePowerPlay,
  enableIpoBase,
  setEnableIpoBase,
  enableVcpSetup,
  setEnableVcpSetup,
  enableDarvasBox,
  setEnableDarvasBox,
  enableNewLeaders,
  setEnableNewLeaders,
  minPpRunupFilter,
  setMinPpRunupFilter,
  maxPpDrawdownFilter,
  setMaxPpDrawdownFilter,
  minPpDaysSincePeakFilter,
  setMinPpDaysSincePeakFilter,
  maxPpVolRatioFilter,
  setMaxPpVolRatioFilter,
  maxIpoAgeFilter,
  setMaxIpoAgeFilter,
  maxIpoDistFilter,
  setMaxIpoDistFilter,
  maxIpoDepthFilter,
  setMaxIpoDepthFilter,
  maxDarvasWidthFilter,
  setMaxDarvasWidthFilter,
  max52wDistFilter,
  setMax52wDistFilter,
  minSurgeOffLowFilter,
  setMinSurgeOffLowFilter,
  minNewLeadersRsFilter,
  setMinNewLeadersRsFilter,
  // Optional checkbox states & setters
  enablePpRunup,
  setEnablePpRunup,
  enablePpDrawdown,
  setEnablePpDrawdown,
  enablePpDaysSincePeak,
  setEnablePpDaysSincePeak,
  enablePpVolRatio,
  setEnablePpVolRatio,
  enableIpoAge,
  setEnableIpoAge,
  enableIpoDist,
  setEnableIpoDist,
  enableIpoDepth,
  setEnableIpoDepth,
  enableVcpEpsGrowth,
  setEnableVcpEpsGrowth,
  enableVcpRsPercentile,
  setEnableVcpRsPercentile,
  enableVcpPattern,
  setEnableVcpPattern,
  enableDarvasPattern,
  setEnableDarvasPattern,
  enableDarvasWidth,
  setEnableDarvasWidth,
  enableRsNewHigh,
  setEnableRsNewHigh,
  enableAtr,
  setEnableAtr,
  enable52wDist,
  setEnable52wDist,
  enableSurgeOffLow,
  setEnableSurgeOffLow,
  enableNewLeadersRs,
  setEnableNewLeadersRs,
  enableNewLeaders52wHigh,
  setEnableNewLeaders52wHigh,
  enableNewLeadersBase,
  setEnableNewLeadersBase,
  handleSelectStock,
}) {

  const handleExportTradingView = () => {
    if (filteredCandidates.length === 0) {
      alert("No candidates to export!");
      return;
    }
    const content = filteredCandidates.map(c => {
      const exchange = c.exchange ? `${c.exchange}:` : '';
      return `${exchange}${c.symbol}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PivotTrader_Watchlist_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="header-section">
        <div className="header-title">
          <h1>Screen Candidates</h1>
          <p>US Stocks passing RS percentiles & EPS QoQ acceleration guidelines</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleExportTradingView}
          disabled={filteredCandidates.length === 0}
        >
          Export to TradingView
        </button>
      </div>

      {/* Interactive Strategy & Filter controls */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'nowrap', overflowX: 'auto', flex: 1 }}>
            {/* Baseline Stage 2 Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enforceStage2}
                onChange={(e) => setEnforceStage2(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              📈 Stage 2 Trend
            </label>

            <span style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '14px' }}>|</span>

            {/* Setup Overlay Checkboxes */}
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Setups:</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enablePowerPlay}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnablePowerPlay(val);
                  if (val) {
                    setEnableIpoBase(false);
                    setEnableVcpSetup(false);
                    setEnableDarvasBox(false);
                    setEnableNewLeaders(false);
                    setEnforceStage2(false);
                  } else {
                    setEnforceStage2(true);
                  }
                }}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              🚀 Power Play
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enableIpoBase}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnableIpoBase(val);
                  if (val) {
                    setEnablePowerPlay(false);
                    setEnableVcpSetup(false);
                    setEnableDarvasBox(false);
                    setEnableNewLeaders(false);
                  }
                }}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              📅 IPO Base
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enableVcpSetup}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnableVcpSetup(val);
                  if (val) {
                    setEnablePowerPlay(false);
                    setEnableIpoBase(false);
                    setEnableDarvasBox(false);
                    setEnableNewLeaders(false);
                  }
                }}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              ⚡ VCP Setup
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enableDarvasBox}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnableDarvasBox(val);
                  if (val) {
                    setEnablePowerPlay(false);
                    setEnableIpoBase(false);
                    setEnableVcpSetup(false);
                    setEnableNewLeaders(false);
                    setEnforceStage2(true);
                  }
                }}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              📦 Darvas Box
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={enableNewLeaders}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnableNewLeaders(val);
                  if (val) {
                    setEnablePowerPlay(false);
                    setEnableIpoBase(false);
                    setEnableVcpSetup(false);
                    setEnableDarvasBox(false);
                    setEnforceStage2(true);
                  }
                }}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-color)' }}
              />
              🌟 New Leaders
            </label>
          </div>
        </div>

        {/* Currently Selected Setup Criteria Text Section */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Currently Selected Setup Criteria
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {enablePowerPlay ? '🚀 Power Play' : enableIpoBase ? '📅 IPO Base' : enableVcpSetup ? '⚡ VCP Setup' : enableDarvasBox ? '📦 Darvas Box' : enableNewLeaders ? '🌟 New Leaders' : '📈 Stage 2 Trend Baseline'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', whiteSpace: 'nowrap' }}>
                Showing {filteredCandidates.length.toLocaleString()} / {candidates.length.toLocaleString()} stocks
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            {enablePowerPlay && 'Screening for high-velocity momentum stocks undergoing shallow high-level consolidations after a massive price expansion.'}
            {enableIpoBase && 'Screening for young, recently listed growth stocks constructing their initial primary base after going public.'}
            {enableVcpSetup && 'Screening for Mark Minervini\'s signature Volatility Contraction Pattern (VCP), where overhead supply dries up through contracting swings.'}
            {enableDarvasBox && 'Screening for Nicolas Darvas\'s Box strategy, identifying stocks consolidating in tight support/resistance boxes within confirmed Phase 2 uptrends.'}
            {enableNewLeaders && 'Screening for market correction turn leadership—stocks trading near 52-week highs that corrected the least and surged off market lows with top relative strength.'}
            {!enablePowerPlay && !enableIpoBase && !enableVcpSetup && !enableDarvasBox && !enableNewLeaders && 'Screening for classic Minervini Stage 2 uptrend stocks in confirmed institutional mark-up phases.'}
          </p>

          {enablePowerPlay ? (
            <ol style={{ margin: '4px 0 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
              <li>
                <strong>Explosive Price Move:</strong> An explosive price move commences on huge volume that shoots the stock price up 100 percent or more in less than eight weeks. This generally occurs after a period of relative dormancy. <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>(Active Filter: &ge; {minPpRunupFilter}% run-up{enablePpRunup ? '' : ' - Disabled'})</span>
              </li>
              <li>
                <strong>Tight Consolidation:</strong> The stock price then moves sideways in a relatively tight range, not correcting more than 20 to 25 percentage over a period of three to six weeks (some can emerge after only 12 days). <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>(Active Filter: &le; {maxPpDrawdownFilter}% drawdown, peak &ge; {minPpDaysSincePeakFilter}d prior{enablePpDrawdown && enablePpDaysSincePeak ? '' : ' - Partially Disabled'})</span>
              </li>
              <li>
                <strong>Volume Contraction:</strong> With the base (usually just days before a breakout), volume will contract considerably. <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{enablePpVolRatio ? `(Active Filter: \u2264 ${maxPpVolRatioFilter.toFixed(2)}x 50d Vol MA)` : '(Filter Disabled)'}</span>
              </li>
            </ol>
          ) : (
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
              {enableIpoBase && (
                <>
                  <li><strong>Listing Age:</strong> IPO trading history between 10 and {maxIpoAgeFilter} days {enableIpoAge ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Proximity to High:</strong> Distance from all-time IPO high &le; {maxIpoDistFilter}% {enableIpoDist ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Base Depth Bounded:</strong> Maximum base depth correction &le; {maxIpoDepthFilter}% {enableIpoDepth ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Trend Baseline:</strong> Close &ge; SMA(50) (SMA 150/200 waived due to limited history)</li>
                </>
              )}
              {enableVcpSetup && (
                <>
                  <li><strong>52-Week High Proximity:</strong> Current price is within 15% of the 52-week high (Active)</li>
                  <li><strong>Contractions from 52w High:</strong> At least 2 contractions ($T_1, T_2$) from 52-week high point to now {enableVcpPattern ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Relative Strength:</strong> RS Percentile Rank &ge; {minRsFilter}th percentile {enableVcpRsPercentile ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Earnings Growth:</strong> QoQ Diluted EPS Growth &ge; {minEpsGrowthFilter}% {enableVcpEpsGrowth ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Trend Baseline:</strong> Enforces Stage 2 Trend Template (Close &gt; SMA 50 &gt; SMA 150 &gt; SMA 200)</li>
                </>
              )}
              {enableDarvasBox && (
                <>
                  <li><strong>Box Formation:</strong> Unbreached 3-day peak (Box Top) and 3-day floor (Box Bottom) {enableDarvasPattern ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Max Box Height:</strong> Box width (Top - Bottom) / Top &le; {maxDarvasWidthFilter}% {enableDarvasWidth ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Phase 2 Baseline:</strong> Enforces Stage 2 Trend Template (Close &gt; SMA 50 &gt; SMA 150 &gt; SMA 200) by default</li>
                </>
              )}
              {enableNewLeaders && (
                <>
                  <li><strong>52-Week High Proximity:</strong> Trading within &le; {max52wDistFilter}% of 52-week high {enable52wDist ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Surge off Lows:</strong> Rebound &ge; {minSurgeOffLowFilter}% off recent 60-day market low {enableSurgeOffLow ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>Relative Strength:</strong> Leader RS Percentile Rank &ge; {minNewLeadersRsFilter}th percentile {enableNewLeadersRs ? '(Active)' : '(Disabled)'}</li>
                  <li><strong>52-Week High List:</strong> {enableNewLeaders52wHigh ? 'Must be touching/hitting 52-week high (Active)' : 'Near or touching 52-week high list'}</li>
                  <li><strong>Uptrend & Base Context:</strong> Consolidating or base-building in Stage 2 uptrend {enableNewLeadersBase ? '(Enforced)' : '(Disabled)'}</li>
                </>
              )}
              {!enablePowerPlay && !enableIpoBase && !enableVcpSetup && !enableDarvasBox && !enableNewLeaders && (
                <>
                  <li><strong>Moving Average Alignment:</strong> Close &gt; SMA(50) &gt; SMA(150) &gt; SMA(200) {enforceStage2 ? '(Enforced)' : '(Disabled)'}</li>
                  <li><strong>Liquidity Baseline:</strong> Min stock price &ge; ${minPriceFilter.toFixed(2)} and 50d Volume MA &ge; {minVolFilter.toLocaleString()}</li>
                  <li><strong>Relative Strength:</strong> {enableRsNewHigh ? 'Must be making a 52-week RS Rank High' : 'RS Rank calculated dynamically'}</li>
                  {enableAtr && <li><strong>Daily ATR:</strong> &ge; {minAtrFilter.toFixed(1)}%</li>}
                </>
              )}
            </ul>
          )}
        </div>

        {/* Active Strategy Rules Description Box */}
        <div style={{
          padding: '16px',
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px dashed rgba(148, 163, 184, 0.2)',
          borderRadius: '8px'
        }}>
          <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Screening Filters
          </h4>
          <div style={{ display: 'flex', gap: '12px 24px', flexWrap: 'wrap', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--accent-color)' }}>📈</span>
              <span style={{ color: 'var(--text-secondary)' }}>Price:</span>
              <strong style={{ color: 'var(--text-primary)' }}>&ge; ${minPriceFilter.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--accent-color)' }}>📊</span>
              <span style={{ color: 'var(--text-secondary)' }}>Vol SMA (50d):</span>
              <strong style={{ color: 'var(--text-primary)' }}>&ge; {minVolFilter.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: enforceStage2 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>⚡</span>
              <span style={{ color: 'var(--text-secondary)' }}>Trend Template:</span>
              <strong style={{ color: enforceStage2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {!enforceStage2
                  ? 'Disabled (Optional)'
                  : enableIpoBase && enableIpoAge
                  ? 'SMA(50) [Waive SMA 150/200 on IPOs]'
                  : 'SMA(50) > SMA(150) > SMA(200)'}
              </strong>
            </div>
            {enableAtr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-color)' }}>🌀</span>
                <span style={{ color: 'var(--text-secondary)' }}>Daily ATR:</span>
                <strong style={{ color: 'var(--text-primary)' }}>&ge; {minAtrFilter.toFixed(1)}%</strong>
              </div>
            )}
            {enableRsNewHigh && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-success)' }}>📈</span>
                <span style={{ color: 'var(--text-secondary)' }}>RS Rank:</span>
                <strong style={{ color: 'var(--text-primary)' }}>New High</strong>
              </div>
            )}
            {enablePowerPlay && (
              <>
                {enablePpRunup && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>🚀</span>
                    <span style={{ color: 'var(--text-secondary)' }}>8w Run-up:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&ge; {minPpRunupFilter}%</strong>
                  </div>
                )}
                {enablePpDrawdown && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-danger)' }}>📉</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Max Drawdown:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&le; {maxPpDrawdownFilter}%</strong>
                  </div>
                )}
                {enablePpVolRatio && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>📉</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Max Base Vol:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&le; {maxPpVolRatioFilter.toFixed(2)}x SMA</strong>
                  </div>
                )}
              </>
            )}
            {enableIpoBase && (
              <>
                {enableIpoAge && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-color)' }}>📅</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Max IPO Age:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{maxIpoAgeFilter} days</strong>
                  </div>
                )}
                {enableIpoDist && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>🎯</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Max Dist from High:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{maxIpoDistFilter}%</strong>
                  </div>
                )}
                {enableIpoDepth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-danger)' }}>📉</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Max Base Drawdown:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&le; {maxIpoDepthFilter}%</strong>
                  </div>
                )}
              </>
            )}
            {enableVcpSetup && (
              <>
                {enableVcpEpsGrowth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-warning)' }}>💰</span>
                    <span style={{ color: 'var(--text-secondary)' }}>QoQ EPS Growth:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&ge; {minEpsGrowthFilter}%</strong>
                  </div>
                )}
                {enableVcpRsPercentile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>⚡</span>
                    <span style={{ color: 'var(--text-secondary)' }}>RS Percentile:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>&ge; {minRsFilter}th</strong>
                  </div>
                )}
                {enableVcpPattern && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--accent-success)' }}>🌀</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Pattern:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>VCP Contraction</strong>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dynamic Parameter Sliders / Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {/* ========================================== */}
          {/* 1. Stage 2 Baseline (Mandatory Inputs) */}
          {/* ========================================== */}

          {/* Min Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              📌 Min Stock Price (${minPriceFilter.toFixed(2)}):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="1"
                max="100"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              <input
                type="number"
                min="0"
                max="1000"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(parseFloat(e.target.value) || 0)}
                style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
              />
            </div>
          </div>

          {/* Min 50d Volume MA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              📊 Min 50d Vol MA ({(minVolFilter / 1000).toFixed(0)}k):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="50000"
                max="2000000"
                step="50000"
                value={minVolFilter}
                onChange={(e) => setMinVolFilter(parseInt(e.target.value) || 0)}
                style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
              <input
                type="number"
                min="0"
                max="10000000"
                value={minVolFilter}
                onChange={(e) => setMinVolFilter(parseInt(e.target.value) || 0)}
                style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
              />
            </div>
          </div>

          {/* Daily ATR (Optional Global/Stage 2 filter) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableAtr ? 1 : 0.5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableAtr}
                onChange={(e) => setEnableAtr(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
              Min ATR (20d) ({minAtrFilter.toFixed(1)}%):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={minAtrFilter}
                disabled={!enableAtr}
                onChange={(e) => setMinAtrFilter(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, cursor: enableAtr ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
              />
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={minAtrFilter}
                disabled={!enableAtr}
                onChange={(e) => setMinAtrFilter(parseFloat(e.target.value) || 0)}
                style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
              />
            </div>
          </div>

          {/* RS Ranking at New High (Global Filter) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableRsNewHigh ? 1 : 0.5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableRsNewHigh}
                onChange={(e) => setEnableRsNewHigh(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
              RS Ranking at New High
            </label>
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '13px',
              color: enableRsNewHigh ? 'var(--accent-success)' : 'var(--text-secondary)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '38px',
              boxSizing: 'border-box'
            }}>
              {enableRsNewHigh ? '📈 RS Rank at 252-day High' : '⚪ New High Waived'}
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. Power Play Sliders (Visible if selected) */}
          {/* ========================================== */}
          {enablePowerPlay && (
            <>
              {/* Min Power Play Run-up */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpRunup ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePpRunup}
                    onChange={(e) => setEnablePpRunup(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min 8w Run-up ({minPpRunupFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={minPpRunupFilter}
                    disabled={!enablePpRunup}
                    onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enablePpRunup ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={minPpRunupFilter}
                    disabled={!enablePpRunup}
                    onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Max Power Play Drawdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpDrawdown ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePpDrawdown}
                    onChange={(e) => setEnablePpDrawdown(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Drawdown ({maxPpDrawdownFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="1"
                    value={maxPpDrawdownFilter}
                    disabled={!enablePpDrawdown}
                    onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enablePpDrawdown ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={maxPpDrawdownFilter}
                    disabled={!enablePpDrawdown}
                    onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Min Days Since Peak (Consolidation Age) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpDaysSincePeak ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePpDaysSincePeak}
                    onChange={(e) => setEnablePpDaysSincePeak(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min Days Since Peak ({minPpDaysSincePeakFilter}d):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={minPpDaysSincePeakFilter}
                    disabled={!enablePpDaysSincePeak}
                    onChange={(e) => setMinPpDaysSincePeakFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enablePpDaysSincePeak ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minPpDaysSincePeakFilter}
                    disabled={!enablePpDaysSincePeak}
                    onChange={(e) => setMinPpDaysSincePeakFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Max Volume Contraction */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enablePpVolRatio ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePpVolRatio}
                    onChange={(e) => setEnablePpVolRatio(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Base Vol ({maxPpVolRatioFilter.toFixed(2)}x):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={maxPpVolRatioFilter}
                    disabled={!enablePpVolRatio}
                    onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enablePpVolRatio ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={maxPpVolRatioFilter}
                    disabled={!enablePpVolRatio}
                    onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* 3. IPO Base Sliders (Visible if selected) */}
          {/* ========================================== */}
          {enableIpoBase && (
            <>
              {/* Max IPO Age */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableIpoAge ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableIpoAge}
                    onChange={(e) => setEnableIpoAge(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max IPO Age ({maxIpoAgeFilter} days):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="30"
                    max="1000"
                    step="10"
                    value={maxIpoAgeFilter}
                    disabled={!enableIpoAge}
                    onChange={(e) => setMaxIpoAgeFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableIpoAge ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={maxIpoAgeFilter}
                    disabled={!enableIpoAge}
                    onChange={(e) => setMaxIpoAgeFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Max Distance from IPO High */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableIpoDist ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableIpoDist}
                    onChange={(e) => setEnableIpoDist(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Dist from High ({maxIpoDistFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={maxIpoDistFilter}
                    disabled={!enableIpoDist}
                    onChange={(e) => setMaxIpoDistFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableIpoDist ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxIpoDistFilter}
                    disabled={!enableIpoDist}
                    onChange={(e) => setMaxIpoDistFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Max IPO Base Drawdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableIpoDepth ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableIpoDepth}
                    onChange={(e) => setEnableIpoDepth(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Base Drawdown ({maxIpoDepthFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="1"
                    value={maxIpoDepthFilter}
                    disabled={!enableIpoDepth}
                    onChange={(e) => setMaxIpoDepthFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableIpoDepth ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="5"
                    max="80"
                    value={maxIpoDepthFilter}
                    disabled={!enableIpoDepth}
                    onChange={(e) => setMaxIpoDepthFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* 4. VCP Setup Sliders (Visible if selected) */}
          {/* ========================================== */}
          {enableVcpSetup && (
            <>
              {/* RS Percentile Rank */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpRsPercentile ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableVcpRsPercentile}
                    onChange={(e) => setEnableVcpRsPercentile(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min RS Rank ({minRsFilter}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minRsFilter}
                    disabled={!enableVcpRsPercentile}
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableVcpRsPercentile ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minRsFilter}
                    disabled={!enableVcpRsPercentile}
                    onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* QoQ EPS Growth */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpEpsGrowth ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableVcpEpsGrowth}
                    onChange={(e) => setEnableVcpEpsGrowth(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min QoQ EPS Growth ({minEpsGrowthFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="-50"
                    max="200"
                    value={minEpsGrowthFilter}
                    disabled={!enableVcpEpsGrowth}
                    onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableVcpEpsGrowth ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="-100"
                    max="1000"
                    value={minEpsGrowthFilter}
                    disabled={!enableVcpEpsGrowth}
                    onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* VCP Contraction Pattern */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableVcpPattern ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableVcpPattern}
                    onChange={(e) => setEnableVcpPattern(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  VCP Contraction Pattern
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: enableVcpPattern ? 'var(--accent-success)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  {enableVcpPattern ? '🌀 Pattern Recognition Active' : '⚪ Pattern Recognition Waived'}
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* 5. Darvas Box Sliders (Visible if selected) */}
          {/* ========================================== */}
          {enableDarvasBox && (
            <>
              {/* Max Darvas Box Width % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableDarvasWidth ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableDarvasWidth}
                    onChange={(e) => setEnableDarvasWidth(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Box Width ({maxDarvasWidthFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={maxDarvasWidthFilter}
                    disabled={!enableDarvasWidth}
                    onChange={(e) => setMaxDarvasWidthFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableDarvasWidth ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="5"
                    max="80"
                    value={maxDarvasWidthFilter}
                    disabled={!enableDarvasWidth}
                    onChange={(e) => setMaxDarvasWidthFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Darvas Pattern Recognition */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableDarvasPattern ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableDarvasPattern}
                    onChange={(e) => setEnableDarvasPattern(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Darvas Box Pattern Recognition
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: enableDarvasPattern ? 'var(--accent-success)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  {enableDarvasPattern ? '📦 Pattern Recognition Active' : '⚪ Pattern Recognition Waived'}
                </div>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* 6. New Leaders Sliders (Visible if selected) */}
          {/* ========================================== */}
          {enableNewLeaders && (
            <>
              {/* Max Distance from 52w High % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enable52wDist ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enable52wDist}
                    onChange={(e) => setEnable52wDist(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Max Dist from 52w High ({max52wDistFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={max52wDistFilter}
                    disabled={!enable52wDist}
                    onChange={(e) => setMax52wDistFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enable52wDist ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={max52wDistFilter}
                    disabled={!enable52wDist}
                    onChange={(e) => setMax52wDistFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Min Surge off Market Low % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableSurgeOffLow ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableSurgeOffLow}
                    onChange={(e) => setEnableSurgeOffLow(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min Surge off Market Low ({minSurgeOffLowFilter}%):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={minSurgeOffLowFilter}
                    disabled={!enableSurgeOffLow}
                    onChange={(e) => setMinSurgeOffLowFilter(parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableSurgeOffLow ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={minSurgeOffLowFilter}
                    disabled={!enableSurgeOffLow}
                    onChange={(e) => setMinSurgeOffLowFilter(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Leader RS Rank */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableNewLeadersRs ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableNewLeadersRs}
                    onChange={(e) => setEnableNewLeadersRs(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  Min Leader RS Rank ({minNewLeadersRsFilter}):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={minNewLeadersRsFilter}
                    disabled={!enableNewLeadersRs}
                    onChange={(e) => setMinNewLeadersRsFilter(parseInt(e.target.value) || 0)}
                    style={{ flex: 1, cursor: enableNewLeadersRs ? 'pointer' : 'not-allowed', accentColor: 'var(--accent-color)' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minNewLeadersRsFilter}
                    disabled={!enableNewLeadersRs}
                    onChange={(e) => setMinNewLeadersRsFilter(parseInt(e.target.value) || 0)}
                    style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* 52-Week High List Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: enableNewLeaders52wHigh ? 1 : 0.5 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableNewLeaders52wHigh}
                    onChange={(e) => setEnableNewLeaders52wHigh(e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  52-Week High List Requirement
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: enableNewLeaders52wHigh ? 'var(--accent-success)' : 'var(--text-secondary)',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  {enableNewLeaders52wHigh ? '🔥 Must be hitting 52w High' : '⚪ Near 52w High (Within Dist %)'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Sector / Industry</th>
              <th>Price</th>
              <th>Vol 50d MA</th>
              <th>RS Score</th>
              <th>RS Percentile</th>
              <th>ATR (20d)</th>
              <th>EPS QoQ Growth</th>
              <th>Report Qtr</th>
              {enablePowerPlay && (
                <>
                  <th>Run Up %</th>
                  <th>Drawdown %</th>
                  <th>Vol vs SMA</th>
                </>
              )}
              {enableIpoBase && (
                <>
                  <th>IPO Age</th>
                  <th>Dist from High</th>
                  <th>Base Depth</th>
                </>
              )}
              {enableNewLeaders && (
                <>
                  <th>52w High Dist</th>
                  <th>Surge off Low</th>
                  <th>52w High Status</th>
                </>
              )}
              <th>VCP Setup</th>
              <th>Darvas Box</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((c, i) => (
              <tr key={i} onClick={() => handleSelectStock(c)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{c.symbol}</td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.sector ? `${c.sector}${c.sector_rank ? ` (${c.sector_rank})` : ''}` : 'N/A'}
                  </span>
                  <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>{c.industry || 'N/A'}</span>
                </td>
                <td>${c.close.toFixed(2)}</td>
                <td>{c.vol_50d_ma.toLocaleString()}</td>
                <td>{c.rs_score ? c.rs_score.toFixed(4) : 'N/A'}</td>
                <td>
                  <span className="pill pill-success">{c.rs_rank}</span>
                </td>
                <td style={{ fontWeight: '500' }}>
                  {c.atr_20d !== null && c.atr_20d !== undefined ? `${c.atr_20d.toFixed(2)}%` : 'N/A'}
                </td>
                <td style={{ color: c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined ? (c.eps_qoq_growth >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)' }}>
                  {c.eps_qoq_growth !== null && c.eps_qoq_growth !== undefined ? `${c.eps_qoq_growth >= 0 ? '+' : ''}${c.eps_qoq_growth.toFixed(1)}%` : 'N/A'}
                </td>
                <td>
                  {c.fiscal_quarter ? (
                    <span className="pill pill-primary">{c.fiscal_quarter}</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                  )}
                </td>
                {enablePowerPlay && (
                  <>
                    <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                      +{c.pp_runup_pct !== null && c.pp_runup_pct !== undefined ? c.pp_runup_pct.toFixed(0) : '0'}%
                    </td>
                    <td style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>
                      -{c.pp_drawdown_pct !== null && c.pp_drawdown_pct !== undefined ? c.pp_drawdown_pct.toFixed(1) : '0'}%
                    </td>
                    <td style={{ color: c.volume / c.vol_50d_ma < 0.6 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                      {c.volume && c.vol_50d_ma ? `${(c.volume / c.vol_50d_ma).toFixed(2)}x` : 'N/A'}
                    </td>
                  </>
                )}
                {enableIpoBase && (
                  <>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {c.ipo_days_count} days
                    </td>
                    <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                      {c.ipo_drawdown_from_high !== null && c.ipo_drawdown_from_high !== undefined ? `${c.ipo_drawdown_from_high.toFixed(1)}%` : '0%'}
                    </td>
                    <td style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>
                      -{c.ipo_base_depth !== null && c.ipo_base_depth !== undefined ? `${c.ipo_base_depth.toFixed(1)}%` : '0%'}
                    </td>
                  </>
                )}
                {enableNewLeaders && (
                  <>
                    <td style={{ color: c.dist_from_52w_high !== null && c.dist_from_52w_high <= 15 ? 'var(--accent-success)' : 'var(--text-primary)', fontWeight: '600' }}>
                      {c.dist_from_52w_high !== null && c.dist_from_52w_high !== undefined ? `${c.dist_from_52w_high.toFixed(1)}%` : '0%'}
                    </td>
                    <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>
                      +{c.surge_off_low_pct !== null && c.surge_off_low_pct !== undefined ? `${c.surge_off_low_pct.toFixed(1)}%` : '0%'}
                    </td>
                    <td>
                      {c.is_52w_high ? (
                        <span className="pill pill-success" style={{ fontWeight: 'bold' }}>🔥 52w High</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Near High</span>
                      )}
                    </td>
                  </>
                )}
                <td>
                  {c.vcp_is_setup ? (
                    <span className="pill pill-success" style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                      {c.vcp_troughs}T ({c.vcp_depths.replace(/,/g, ' / ') + '%'})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>No</span>
                  )}
                </td>
                <td>
                  {c.darvas_is_setup ? (
                    <span className="pill pill-success" style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                      📦 ${c.darvas_box_bottom?.toFixed(2)} - ${c.darvas_box_top?.toFixed(2)} ({c.darvas_box_width_pct?.toFixed(1)}%)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>No</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredCandidates.length === 0 && (
              <tr>
                <td colSpan={10 + (enablePowerPlay ? 3 : 0) + (enableIpoBase ? 3 : 0) + (enableNewLeaders ? 3 : 0)} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No candidates matching current config rules found in database cache. Run "Sync Database Tickers" to evaluate stocks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
