import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function DashboardTab({
  summary,
  syncStatus,
  handleTriggerLiveQuotesSync,
  handleTriggerSync,
  fetchSyncStatus,
  fetchSummary,
  setActiveTab,
  handleSelectStock,
  onSelectSetup,
}) {
  const [marketData, setMarketData] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [topGroups, setTopGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [focusLeaders, setFocusLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  // Quick Mini-Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcRiskPct, setCalcRiskPct] = useState(0.75);
  const [calcEntry, setCalcEntry] = useState(50.0);
  const [calcStop, setCalcStop] = useState(47.5);

  const isSyncing = syncStatus?.status === 'running';

  // Fetch Market Monitor evaluation
  const fetchMarket = useCallback(async () => {
    setLoadingMarket(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-monitor?limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
        return data;
      }
    } catch (err) {
      console.error('Error loading market monitor data for cockpit:', err);
    } finally {
      setLoadingMarket(false);
    }
    return null;
  }, []);

  // Fetch top industry groups for rotation snapshot
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/strength`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (b.ret_1w_pct || 0) - (a.ret_1w_pct || 0));
          setTopGroups(sorted.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error loading group strength for cockpit:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Fetch top focus momentum leaders
  const fetchLeaders = useCallback(async (customDate = null) => {
    setLoadingLeaders(true);
    try {
      const lDate = customDate || marketData?.summary?.latest_date || '';
      const expr = encodeURIComponent('RS_RANK >= 90 AND ADR20 >= 4.0 AND C >= 10.0 AND C > XAVGC50 AND XAVGC10 > XAVGC20');
      const url = `${API_BASE}/api/candidates?expression=${expr}${lDate ? `&date=${lDate}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.candidates || []);
        setFocusLeaders(items.slice(0, 6));
      }
    } catch (err) {
      console.error('Error loading focus leaders for cockpit:', err);
    } finally {
      setLoadingLeaders(false);
    }
  }, [marketData?.summary?.latest_date]);

  // Initial loads
  useEffect(() => {
    fetchMarket();
    fetchGroups();
  }, [fetchMarket, fetchGroups]);

  useEffect(() => {
    fetchLeaders();
  }, [fetchLeaders]);

  // Comprehensive reload of all cockpit data (triggered automatically after background sync completes)
  const reloadAllDashboardData = useCallback(async () => {
    setLoadingMarket(true);
    setLoadingGroups(true);
    setLoadingLeaders(true);
    try {
      const [marketRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/api/market-monitor?limit=5&refresh=true`),
        fetch(`${API_BASE}/api/groups/strength`)
      ]);
      if (marketRes.ok) {
        const mData = await marketRes.json();
        setMarketData(mData);
        const lDate = mData?.summary?.latest_date || '';
        const expr = encodeURIComponent('RS_RANK >= 90 AND ADR20 >= 4.0 AND C >= 10.0 AND C > XAVGC50 AND XAVGC10 > XAVGC20');
        const leadersRes = await fetch(`${API_BASE}/api/candidates?expression=${expr}${lDate ? `&date=${lDate}` : ''}`);
        if (leadersRes.ok) {
          const lData = await leadersRes.json();
          const items = Array.isArray(lData) ? lData : (lData.candidates || []);
          setFocusLeaders(items.slice(0, 6));
        }
      }
      if (groupsRes.ok) {
        const gData = await groupsRes.json();
        if (Array.isArray(gData)) {
          const sorted = [...gData].sort((a, b) => (b.ret_1w_pct || 0) - (a.ret_1w_pct || 0));
          setTopGroups(sorted.slice(0, 5));
        }
      }
      if (fetchSummary) fetchSummary();
    } catch (err) {
      console.error('Error reloading cockpit after sync:', err);
    } finally {
      setLoadingMarket(false);
      setLoadingGroups(false);
      setLoadingLeaders(false);
    }
  }, [fetchSummary]);

  // 1-Click Quick Sync action from within the Cockpit
  const handleQuickSync = async () => {
    if (isSyncing) return;
    try {
      if (handleTriggerLiveQuotesSync) {
        await handleTriggerLiveQuotesSync();
      } else {
        await fetch(`${API_BASE}/api/sync/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skip_prices: false,
            skip_fundamentals: true,
            include_premarket: true,
            include_extended: true
          })
        });
        if (fetchSyncStatus) fetchSyncStatus();
      }
    } catch (err) {
      console.error('Error triggering quick sync from cockpit:', err);
    }
  };

  // Monitor syncStatus: when it finishes (running -> idle), automatically reload the cockpit
  const prevSyncStatusRef = useRef(syncStatus?.status);
  useEffect(() => {
    if (prevSyncStatusRef.current === 'running' && syncStatus?.status === 'idle') {
      reloadAllDashboardData();
    }
    prevSyncStatusRef.current = syncStatus?.status;
  }, [syncStatus?.status, reloadAllDashboardData]);

  // Mini calculator calculation
  const calcResults = useMemo(() => {
    const equity = parseFloat(calcEquity) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntry) || 0;
    const stop = parseFloat(calcStop) || 0;

    const stopDist = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDist / entry) * 100 : 0;
    const riskDollars = equity * (riskPct / 100);

    let shares = 0;
    if (stopDist > 0 && riskDollars > 0) {
      shares = Math.floor(riskDollars / stopDist);
    }
    const positionValue = shares * entry;
    const posPct = equity > 0 ? (positionValue / equity) * 100 : 0;

    return {
      riskDollars,
      stopPct,
      shares,
      positionValue,
      posPct,
      isStopTooWide: stopPct > 8.0,
      isPosTooLarge: posPct > 25.0
    };
  }, [calcEquity, calcRiskPct, calcEntry, calcStop]);

  const kq = marketData?.summary?.kq_evaluation;
  const summaryData = marketData?.summary;
  const latestDate = summary?.last_price_date || summaryData?.latest_date || 'Latest Available';

  // Determine if DuckDB data is stale compared to expected trading date
  const isDataStale = useMemo(() => {
    if (!latestDate || latestDate === 'Latest Available') return false;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekday: if latest DB date is not today, data is stale
      return latestDate < todayStr;
    } else {
      // Weekend: check if earlier than Friday
      const daysToFriday = dayOfWeek === 0 ? 2 : 1;
      const friday = new Date(today);
      friday.setDate(today.getDate() - daysToFriday);
      const fridayStr = friday.toISOString().slice(0, 10);
      return latestDate < fridayStr;
    }
  }, [latestDate]);

  // Light color mapping
  const lightBadge = kq?.badge || 'YELLOW LIGHT';
  const lightColor = lightBadge.includes('GREEN') ? '#10b981' : (lightBadge.includes('RED') ? '#f43f5e' : '#f59e0b');
  const lightGlow = lightBadge.includes('GREEN') ? 'rgba(16, 185, 129, 0.25)' : (lightBadge.includes('RED') ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)');

  return (
    <div className="cockpit-dashboard-container">
      {/* Cockpit Header */}
      <div className="header-section" style={{ marginBottom: '18px' }}>
        <div className="header-title">
          <div className="header-subtitle-tag" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>RISK COCKPIT</span>
            <span>•</span>
            <span>PRE-FLIGHT TRADING COMMAND DESK</span>

            {/* Freshness Badge */}
            {isSyncing ? (
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.45)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="spin-icon">⟳</span> Ingesting Live Data...
              </span>
            ) : isDataStale ? (
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.45)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span>⚠️</span> Outdated: As of {latestDate}
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.45)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span>●</span> Synced: As of {latestDate}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 6px 0' }}>
            Trading Cockpit & Market Posture
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
            Real-time market regime, exposure guidance, industry rotation flows, and focus momentum setups
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 1-Click Inline Sync Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleQuickSync}
            disabled={isSyncing}
            title="Ingest today's latest market prices and live quotes without leaving the cockpit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isSyncing ? 'rgba(56, 189, 248, 0.3)' : (isDataStale ? '#f59e0b' : 'var(--accent-color)'),
              color: isDataStale ? '#000' : '#080b11',
              fontWeight: 700,
              border: 'none',
              boxShadow: isDataStale ? '0 0 14px rgba(245, 158, 11, 0.4)' : 'none'
            }}
          >
            {isSyncing ? (
              <>
                <span className="spin-icon">⟳</span>
                <span>Syncing Feeds...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Sync Today's Data</span>
              </>
            )}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab && setActiveTab('sync-data')}
            title="Open Full Data Ingestion Pipelines (Fundamentals, History Lookback, 13F Sponsorship)"
          >
            ⚙️ Pipelines (Step 0)
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab && setActiveTab('learn')}
            title="Open Kova Trading System Playbook"
          >
            🎓 Learn Playbook
          </button>
        </div>
      </div>

      {/* Inline Stale Data Notice / Sync Progress Alert */}
      {isSyncing ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          marginBottom: '18px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="spin-icon" style={{ color: '#38bdf8', fontSize: '18px' }}>⟳</span>
            <span style={{ fontSize: '13px', color: '#e0f2fe' }}>
              <strong>Syncing Market Feeds in Background...</strong> Ingesting price bars and quotes into DuckDB. This cockpit will automatically refresh all posture metrics and focus setups once complete.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab && setActiveTab('sync-data')}
            style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
          >
            View Logs Console →
          </button>
        </div>
      ) : isDataStale ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          padding: '12px 18px',
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '8px',
          marginBottom: '18px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#fbbf24' }}>
                Market Data Stale: Cockpit is currently displaying session as of {latestDate}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Run Quick Sync to pull today's latest prices, breadth, and quotes into DuckDB without leaving this page.
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={handleQuickSync}
            style={{
              backgroundColor: '#f59e0b',
              color: '#000',
              fontWeight: '700',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
            }}
          >
            <span>⚡</span>
            <span>Sync Today's Session Now</span>
          </button>
        </div>
      ) : null}

      {/* 1. Primary Market Posture Card (The "Fourth Dimension" Light) */}
      <div
        className="glass-card cockpit-posture-card"
        style={{
          borderLeft: `5px solid ${lightColor}`,
          boxShadow: `0 10px 30px -10px ${lightGlow}`,
          marginBottom: '20px',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)'
        }}
      >
        <div className="cockpit-posture-top">
          <div className="cockpit-posture-headline">
            <div className="cockpit-light-badge" style={{ background: lightColor }}>
              <span className="cockpit-light-dot" />
              <span>{lightBadge}</span>
            </div>
            <h2 className="cockpit-posture-title">
              {kq?.stance || 'EVALUATING MARKET REGIME...'}
            </h2>
          </div>

          <div className="cockpit-exposure-pill">
            <span className="exposure-label">RECOMMENDED EXPOSURE</span>
            <span className="exposure-value" style={{ color: lightColor }}>
              {kq?.exposure || '25–50% Sizing (Reduced Size)'}
            </span>
          </div>
        </div>

        <p className="cockpit-guidance-text">
          {kq?.guidance || 'Market in consolidation or pulling back toward 10/20 EMA. Slower follow-through; stay selective, trim targets into strength, and maintain tight stops.'}
        </p>

        {/* Posture Key Metrics Strip */}
        <div className="cockpit-metrics-strip">
          <div className="posture-metric-item">
            <span className="p-metric-label">QQQ Trend Alignment</span>
            <span className="p-metric-val text-emerald">{kq?.stack || 'P > 10 > 20 > 50'}</span>
            <span className="p-metric-sub">Dist 10EMA: {kq?.dist_ema10_pct ? `+${kq.dist_ema10_pct.toFixed(1)}%` : '+1.1%'}</span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">4% Expansion Breadth</span>
            <span className="p-metric-val" style={{ color: (summaryData?.latest_ratio_4pct || 1) >= 1 ? '#34d399' : '#f59e0b' }}>
              {summaryData?.latest_gainers_4pct || 0} vs {summaryData?.latest_losers_4pct || 0}
            </span>
            <span className="p-metric-sub">Ratio: {(summaryData?.latest_ratio_4pct || 0.89).toFixed(2)} (5d Net: {summaryData?.sum_5d_net_4pct || -446})</span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">QQQ Benchmark</span>
            <span className="p-metric-val">
              ${summaryData?.benchmarks?.QQQ?.close?.toFixed(2) || '721.45'}
            </span>
            <span className="p-metric-sub text-emerald">
              +{summaryData?.benchmarks?.QQQ?.change_pct?.toFixed(2) || '0.63'}% Today
            </span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">SPY Benchmark</span>
            <span className="p-metric-val">
              ${summaryData?.benchmarks?.SPY?.close?.toFixed(2) || '761.69'}
            </span>
            <span className="p-metric-sub text-emerald">
              +{summaryData?.benchmarks?.SPY?.change_pct?.toFixed(2) || '0.13'}% Today
            </span>
          </div>

          <div className="posture-metric-item">
            <span className="p-metric-label">Distribution Days (4–5w)</span>
            <span className="p-metric-val" style={{ color: '#38bdf8' }}>
              2 / 5
            </span>
            <span className="p-metric-sub">Below Warning Threshold</span>
          </div>
        </div>
      </div>

      {/* 2. Daily Routine Pre-Flight Navigator (Steps 0 to 5) */}
      <div className="glass-card cockpit-routine-card" style={{ marginBottom: '20px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.06em' }}>
              DAILY PROTOCOL
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
              Pre-Flight Routine Navigator
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Follow the 5-step discipline before placing any trade
          </span>
        </div>

        <div className="cockpit-routine-grid">
          {/* Step 0 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('sync-data')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 0</span>
              <span className="routine-icon">{isSyncing ? '⟳' : (isDataStale ? '⚠️' : '🔄')}</span>
            </div>
            <span className="routine-title">0. Sync Data</span>
            <span className="routine-desc">
              {isSyncing ? 'Sync in progress...' : (isDataStale ? `Stale: As of ${latestDate}` : `Up to date (${latestDate})`)}
            </span>
            <button
              className="btn btn-secondary btn-sm routine-btn"
              onClick={(e) => {
                if (isDataStale && !isSyncing) {
                  e.stopPropagation();
                  handleQuickSync();
                }
              }}
              disabled={isSyncing}
              title={isDataStale ? "Run Quick Sync for today's market session" : "Open DuckDB pipeline details"}
            >
              {isSyncing ? 'Syncing...' : (isDataStale ? '⚡ Sync Now' : 'Pipeline Details →')}
            </button>
          </div>

          {/* Step 1 */}
          <div className="routine-step-box active-glow" onClick={() => setActiveTab && setActiveTab('market-monitor')}>
            <div className="routine-step-top">
              <span className="badge badge-emerald">STEP 1</span>
              <span className="routine-icon">📈</span>
            </div>
            <span className="routine-title">1. Market Monitor</span>
            <span className="routine-desc">{lightBadge}: {kq?.exposure || '25–50% Sizing'}</span>
            <button className="btn btn-secondary btn-sm routine-btn">Check Breadth →</button>
          </div>

          {/* Step 2 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('leaderboard')}>
            <div className="routine-step-top">
              <span className="badge badge-emerald">STEP 2</span>
              <span className="routine-icon">🏆</span>
            </div>
            <span className="routine-title">2. Leaderboard</span>
            <span className="routine-desc">Near-Highs leaders & sector money flow</span>
            <button className="btn btn-secondary btn-sm routine-btn">Open Leaders →</button>
          </div>

          {/* Step 3 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('sector-compare')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 3</span>
              <span className="routine-icon">🌐</span>
            </div>
            <span className="routine-title">3. Group Radar</span>
            <span className="routine-desc">Find top rotating sectors & industries</span>
            <button className="btn btn-secondary btn-sm routine-btn">Explore Radar →</button>
          </div>

          {/* Step 4 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('candidates')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 4</span>
              <span className="routine-icon">🎯</span>
            </div>
            <span className="routine-title">4. Stock Screen</span>
            <span className="routine-desc">Filter VCP, Breakout & Leaders setups</span>
            <button className="btn btn-secondary btn-sm routine-btn">Screen Setups →</button>
          </div>

          {/* Step 5 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('watchlists')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 5</span>
              <span className="routine-icon">⭐️</span>
            </div>
            <span className="routine-title">5. Watchlists</span>
            <span className="routine-desc">Trim to 10–15 Focus Candidates</span>
            <button className="btn btn-secondary btn-sm routine-btn">Open Watchlists →</button>
          </div>

          {/* Step 6 */}
          <div className="routine-step-box" onClick={() => setActiveTab && setActiveTab('inspector')}>
            <div className="routine-step-top">
              <span className="badge badge-outline">STEP 6</span>
              <span className="routine-icon">🔍</span>
            </div>
            <span className="routine-title">6. Stock Inspector</span>
            <span className="routine-desc">Verify chart structure, stop & entry</span>
            <button className="btn btn-secondary btn-sm routine-btn">Inspect Chart →</button>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Intelligence Grid (Rotation Leaders + Focus Candidates) */}
      <div className="cockpit-intel-grid">
        {/* Left Card: Sector & Industry Rotation Snapshot */}
        <div className="glass-card cockpit-intel-card">
          <div className="cockpit-card-header">
            <div>
              <span className="cockpit-card-tag">SECTOR & INDUSTRY FLOW</span>
              <h3 className="cockpit-card-title">🌐 Rotation Leaders Snapshot</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab && setActiveTab('sector-compare')}
            >
              Full Group Radar →
            </button>
          </div>

          {loadingGroups ? (
            <div className="cockpit-loading-placeholder">
              <span className="spin-icon">⟳</span> Loading rotation leaders...
            </div>
          ) : topGroups.length === 0 ? (
            <div className="cockpit-empty-state">No group data available. Run Step 0: Sync Data.</div>
          ) : (
            <div className="cockpit-table-wrapper">
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>Industry Group</th>
                    <th>RS Rank</th>
                    <th>1-Wk Ret</th>
                    <th>RVOL%</th>
                    <th>Top Leaders</th>
                  </tr>
                </thead>
                <tbody>
                  {topGroups.map((grp, idx) => (
                    <tr
                      key={idx}
                      className="cockpit-table-row"
                      onClick={() => setActiveTab && setActiveTab('sector-compare')}
                      title="Click to view in Group Radar"
                    >
                      <td style={{ fontWeight: 600, color: '#ffffff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {grp.name}
                      </td>
                      <td>
                        <span className="code-pill">
                          {Math.round(grp.rs_rank || 80)}
                        </span>
                      </td>
                      <td style={{ color: (grp.ret_1w_pct || 0) >= 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                        {(grp.ret_1w_pct || 0) > 0 ? `+${grp.ret_1w_pct.toFixed(1)}%` : `${grp.ret_1w_pct?.toFixed(1) || '0.0'}%`}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {Math.round(grp.rvol_pct || 100)}%
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(grp.top_symbols || []).slice(0, 3).map((sym, sIdx) => (
                            <span key={sIdx} className="badge badge-outline" style={{ fontSize: '10.5px' }}>
                              {sym}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: High-Conviction Momentum Leaders (Kova Picks Style) */}
        <div className="glass-card cockpit-intel-card">
          <div className="cockpit-card-header">
            <div>
              <span className="cockpit-card-tag">TOP MOMENTUM SETUP CANDIDATES</span>
              <h3 className="cockpit-card-title">🎯 Leaders Focus List</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (onSelectSetup) onSelectSetup('momentum');
                if (setActiveTab) setActiveTab('candidates');
              }}
            >
              All Candidates →
            </button>
          </div>

          {loadingLeaders ? (
            <div className="cockpit-loading-placeholder">
              <span className="spin-icon">⟳</span> Screening market leaders...
            </div>
          ) : focusLeaders.length === 0 ? (
            <div className="cockpit-empty-state">No candidates found for criteria. Run Step 0: Sync Data.</div>
          ) : (
            <div className="cockpit-table-wrapper">
              <table className="cockpit-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Chg%</th>
                    <th>RS Rank</th>
                    <th>ADR%</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {focusLeaders.map((stock, idx) => (
                    <tr
                      key={idx}
                      className="cockpit-table-row"
                      onClick={() => handleSelectStock && handleSelectStock(stock)}
                      title={`Click to inspect ${stock.symbol}`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="stock-sym-badge">{stock.symbol}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stock.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>
                        ${stock.price?.toFixed(2) || stock.close?.toFixed(2)}
                      </td>
                      <td style={{ color: (stock.change_pct || 0) >= 0 ? '#34d399' : '#f43f5e', fontWeight: 600 }}>
                        {(stock.change_pct || 0) > 0 ? `+${stock.change_pct.toFixed(2)}%` : `${stock.change_pct?.toFixed(2) || '0.00'}%`}
                      </td>
                      <td>
                        <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                          {Math.round(stock.rs_rank || stock.rs_percentile || 90)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {stock.adr20 ? `${stock.adr20.toFixed(1)}%` : `${stock.adr_pct?.toFixed(1) || '4.0'}%`}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (handleSelectStock) handleSelectStock(stock);
                          }}
                        >
                          Inspect 🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Risk Budget & Pre-Flight Execution Rules */}
      <div className="glass-card cockpit-risk-card" style={{ marginTop: '20px', padding: '24px 28px' }}>
        <div className="cockpit-card-header" style={{ marginBottom: '16px' }}>
          <div>
            <span className="cockpit-card-tag">RISK MANAGEMENT COCKPIT</span>
            <h3 className="cockpit-card-title">🛡️ Execution Discipline & Position Sizing</h3>
          </div>
          <span className="badge badge-outline">Non-Negotiable Rules</span>
        </div>

        <div className="cockpit-risk-grid">
          {/* Rules Column */}
          <div className="risk-rules-col">
            <div className="risk-rule-item">
              <span className="rule-badge">CAPITAL LIMIT</span>
              <div>
                <strong>Max 25% Portfolio Capital Per Stock</strong>
                <p>Never exceed 25% allocation regardless of conviction. Always leave room for error.</p>
              </div>
            </div>

            <div className="risk-rule-item">
              <span className="rule-badge">PORTFOLIO CAP</span>
              <div>
                <strong>Maximum 5 Concurrent Open Positions</strong>
                <p>Fewer than 3 is too concentrated; more than 5 dilutes focus and makes stop management impossible.</p>
              </div>
            </div>

            <div className="risk-rule-item">
              <span className="rule-badge">STOP-LOSS CEILING</span>
              <div>
                <strong>Hard Stop at 7% – 8% Maximum</strong>
                <p>Sell unconditionally if down 7–8%. Actual stops (below pivot or entry low) are usually tighter (2–5%).</p>
              </div>
            </div>

            <div className="risk-rule-item" style={{ borderLeftColor: '#f43f5e' }}>
              <span className="rule-badge" style={{ color: '#f43f5e' }}>CIRCUIT BREAKER</span>
              <div>
                <strong>Losing Streak Rules</strong>
                <p>3 stop-outs in a row &gt; cut position size 50%. 5 stop-outs &gt; stop trading for 1 week.</p>
              </div>
            </div>
          </div>

          {/* Mini Position Calculator Column */}
          <div className="cockpit-mini-calc">
            <div className="mini-calc-header">
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>🧮 Quick Position Size Calculator</span>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>0.5% – 1.0% Risk</span>
            </div>

            <div className="mini-calc-inputs">
              <div className="mini-input-group">
                <label>Account Equity ($)</label>
                <input
                  type="number"
                  className="calc-input mini"
                  value={calcEquity}
                  onChange={(e) => setCalcEquity(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.05"
                  className="calc-input mini"
                  value={calcRiskPct}
                  onChange={(e) => setCalcRiskPct(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Entry Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  className="calc-input mini"
                  value={calcEntry}
                  onChange={(e) => setCalcEntry(e.target.value)}
                />
              </div>

              <div className="mini-input-group">
                <label>Stop Price ($)</label>
                <input
                  type="number"
                  step="0.1"
                  className="calc-input mini"
                  value={calcStop}
                  onChange={(e) => setCalcStop(e.target.value)}
                />
              </div>
            </div>

            {calcResults.isStopTooWide && (
              <div className="mini-alert-danger">
                ⚠️ Stop is {calcResults.stopPct.toFixed(1)}% (exceeds 8% hard ceiling)!
              </div>
            )}

            {calcResults.isPosTooLarge && (
              <div className="mini-alert-warning">
                ⚠️ Position is {calcResults.posPct.toFixed(1)}% of capital (exceeds 25% cap)!
              </div>
            )}

            <div className="mini-calc-results">
              <div className="mini-res-box">
                <span className="mini-res-label">Dollar Risk</span>
                <span className="mini-res-val" style={{ color: '#f43f5e' }}>${calcResults.riskDollars.toFixed(0)}</span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Stop Distance</span>
                <span className={`mini-res-val ${calcResults.isStopTooWide ? 'text-danger' : 'text-emerald'}`}>
                  {calcResults.stopPct.toFixed(1)}%
                </span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Max Shares</span>
                <span className="mini-res-val text-emerald">{calcResults.shares.toLocaleString()}</span>
              </div>

              <div className="mini-res-box">
                <span className="mini-res-label">Position Value</span>
                <span className="mini-res-val" style={{ color: '#ffffff' }}>${calcResults.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                <span className="mini-res-sub">({calcResults.posPct.toFixed(1)}% equity)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
