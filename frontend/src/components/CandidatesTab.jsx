import React from 'react';
import CandlestickChart from './CandlestickChart';

function FilterControl({ filterKey, filterDef, value, onChange }) {
  if (!filterDef) return null;

  if (filterDef.type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: '38px' }}>
        <label
          title={filterDef.description || ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: value ? '#f8fafc' : 'var(--text-secondary)',
            fontWeight: '500',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: 'var(--accent-color)', cursor: 'pointer', width: '16px', height: '16px' }}
          />
          {filterDef.name || filterKey}
        </label>
      </div>
    );
  }

  if (filterDef.type === 'select') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} title={filterDef.description || ''}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
          {filterDef.name || filterKey}
        </label>
        <select
          value={value !== undefined ? value : (filterDef.default || '')}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            color: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {(filterDef.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // Number type with range + numeric input
  const numVal = Number(value !== undefined && value !== null ? value : (filterDef.default || 0));

  const formatDisplay = () => {
    if (filterDef.unit === '$' && numVal >= 1000000) return `$${(numVal / 1000000).toFixed(1)}M`;
    if (filterDef.unit === '$') return `$${numVal.toFixed(2)}`;
    if (filterDef.unit === 'shares' && numVal >= 1000) return `${(numVal / 1000).toFixed(0)}k shares`;
    if (filterDef.unit === '%') return `${numVal}%`;
    return `${numVal}${filterDef.unit ? ' ' + filterDef.unit : ''}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} title={filterDef.description || ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
          {filterDef.name || filterKey}:
        </label>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>
          {formatDisplay()}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="range"
          min={filterDef.min ?? 0}
          max={filterDef.max ?? 100}
          step={filterDef.step ?? 1}
          value={numVal}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
        />
        <input
          type="number"
          min={filterDef.min ?? 0}
          max={filterDef.max ? filterDef.max * 10 : 1000000000}
          step={filterDef.step ?? 1}
          value={numVal}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: (filterDef.max && filterDef.max >= 10000) ? '80px' : '60px',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center'
          }}
        />
      </div>
    </div>
  );
}

const SETUP_COLORS = {
  power_play: '#38bdf8',
  breakout: '#f59e0b',
  episodic_pivot: '#ec4899',
  momentum: '#a855f7',
  parabolic: '#ef4444',
  ipo_base: '#06b6d4',
  vcp: '#10b981',
};

export default function CandidatesTab({
  watchlists = [],
  fetchWatchlists,
  candidates = [],
  loadingCandidates = false,
  fetchCandidates,
  filteredCandidates = [],
  tradingDates = [],
  selectedDate = 'latest',
  setSelectedDate = () => { },
  setupsConfig = { setups: [], filters: {} },
  activeSetupKey = 'power_play',
  onSelectSetup = () => { },
  activeFilters = {},
  onFilterChange = () => { },
  onResetFilters = () => { },
  handleTriggerLiveQuotesSync = () => { },
  syncStatus = {},
  handleSelectStock = () => { },
}) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const latestDbDate = tradingDates && tradingDates.length > 0 ? tradingDates[0] : todayStr;
  const maxSelectableDate = (latestDbDate && latestDbDate > todayStr)
    ? latestDbDate
    : new Date(Date.now() + 86400000 * 7).toLocaleDateString('en-CA');

  // Stock Browse Mode (Chart Flip) states
  const [browseIndex, setBrowseIndex] = React.useState(0);
  const [browsePrices, setBrowsePrices] = React.useState([]);
  const [browseDetail, setBrowseDetail] = React.useState(null);
  const [targetWatchlistId, setTargetWatchlistId] = React.useState(null);
  const [loadingBrowsePrices, setLoadingBrowsePrices] = React.useState(false);
  const [showFiltersSection, setShowFiltersSection] = React.useState(false);

  const selectedItemRef = React.useRef(null);
  const chartComponentRef = React.useRef(null);

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

  const currentCandidate = filteredCandidates[browseIndex] || null;

  const currentSetup = React.useMemo(() => {
    return (setupsConfig?.setups || []).find(s => s.id === activeSetupKey) || null;
  }, [setupsConfig, activeSetupKey]);

  const activeSetupName = React.useMemo(() => {
    if (currentSetup?.name) return currentSetup.name;
    if (currentCandidate?.pp_is_setup) return 'Power Play';
    if (currentCandidate?.breakout_is_setup) return 'QM Breakout';
    if (currentCandidate?.ep_is_setup) return 'Episodic Pivot';
    if (currentCandidate?.parabolic_short_is_setup || currentCandidate?.parabolic_long_is_setup) return 'Parabolic';
    if (currentCandidate?.vcp_is_setup) return 'VCP';
    if (currentCandidate?.ipo_days_count !== undefined && currentCandidate?.ipo_days_count <= 350) return 'IPO Base';
    return 'General';
  }, [currentSetup, currentCandidate]);

  const browseEarningsBadge = React.useMemo(() => {
    const dt = currentCandidate?.next_earnings_date || browseDetail?.next_earnings_date || browseDetail?.metadata?.next_earnings_date;
    if (!dt) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dt + 'T00:00:00');
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let badgeSub = '';
      let isUrgent = false;

      if (diffDays === 0) {
        badgeSub = 'Today';
        isUrgent = true;
      } else if (diffDays === 1) {
        badgeSub = 'Tomorrow';
        isUrgent = true;
      } else if (diffDays > 1) {
        badgeSub = `in ${diffDays}d`;
        if (diffDays <= 7) isUrgent = true;
      } else {
        badgeSub = `${Math.abs(diffDays)}d ago`;
      }

      return {
        dateStr: dt,
        badgeSub,
        diffDays,
        isUrgent,
        displayText: `Earning ${badgeSub}`,
        fullDisplay: `${dt} (${badgeSub})`
      };
    } catch (e) {
      return { dateStr: dt, badgeSub: dt, displayText: `Earning ${dt}`, fullDisplay: dt, isUrgent: false };
    }
  }, [currentCandidate?.next_earnings_date, browseDetail?.next_earnings_date, browseDetail?.metadata?.next_earnings_date]);

  // Auto-scroll selected candidate stock into view in the Filtered Candidates list
  React.useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [browseIndex, filteredCandidates.length]);

  React.useEffect(() => {
    if (watchlists && watchlists.length > 0 && !targetWatchlistId) {
      setTargetWatchlistId(watchlists[0].id);
    }
  }, [watchlists]);

  const fetchBrowsePrices = async (symbol) => {
    if (!symbol) return;
    setLoadingBrowsePrices(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/api/stocks/${symbol}/prices`),
        fetch(`${API_BASE}/api/stocks/${symbol}`)
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setBrowsePrices(data);
      }
      if (dRes.ok) {
        const detail = await dRes.json();
        setBrowseDetail(detail);
      }
      // If symbol doesn't have next_earnings_date cached, trigger background financials fetch
      if (!currentCandidate?.next_earnings_date) {
        fetch(`${API_BASE}/api/stocks/${symbol}/financials`)
          .then(res => res.json())
          .then(fData => {
            if (fData?.next_earnings_date) {
              setBrowseDetail(prev => prev ? { ...prev, next_earnings_date: fData.next_earnings_date } : prev);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error("Error fetching browse prices and details:", e);
    } finally {
      setLoadingBrowsePrices(false);
    }
  };


  React.useEffect(() => {
    if (currentCandidate) {
      fetchBrowsePrices(currentCandidate.symbol);
    }
  }, [browseIndex, currentCandidate?.symbol]);

  // Keyboard Arrow Navigation Listener for Browse Mode (Up/Down or Left/Right)
  React.useEffect(() => {
    if (filteredCandidates.length === 0) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setBrowseIndex((prev) => Math.min(prev + 1, filteredCandidates.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCandidates.length]);

  const [activeWatchlistSymbols, setActiveWatchlistSymbols] = React.useState(new Set());

  const fetchTargetWatchlistItems = async (watchlistId) => {
    if (!watchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${watchlistId}/items`);
      if (res.ok) {
        const data = await res.json();
        const symSet = new Set(data.map(item => item.symbol.toUpperCase()));
        setActiveWatchlistSymbols(symSet);
      }
    } catch (e) {
      console.error("Error fetching target watchlist items:", e);
    }
  };

  React.useEffect(() => {
    if (targetWatchlistId) {
      fetchTargetWatchlistItems(targetWatchlistId);
    }
  }, [targetWatchlistId, watchlists]);

  const handleToggleWatchlist = async (symbol) => {
    if (!targetWatchlistId || !symbol) return;
    const symUpper = symbol.toUpperCase();
    const isSaved = activeWatchlistSymbols.has(symUpper);

    try {
      if (isSaved) {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items/${symbol}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.delete(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      } else {
        const res = await fetch(`${API_BASE}/api/watchlists/${targetWatchlistId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });
        if (res.ok) {
          const nextSet = new Set(activeWatchlistSymbols);
          nextSet.add(symUpper);
          setActiveWatchlistSymbols(nextSet);
          if (fetchWatchlists) fetchWatchlists();
        }
      }
    } catch (e) {
      console.error(`Error toggling watchlist item: ${e.message}`);
    }
  };

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
    <div className="stock-screen-container">
      {/* Interactive Strategy & Filter controls */}
      <div className="glass-card" style={{ marginBottom: '10px', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {/* Top Integrated Header: Strategy Buttons + Right Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Strategy Selector (Left Side: Setup Buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {(setupsConfig?.setups || []).map((setup) => {
              const isSelected = activeSetupKey === setup.id;
              const color = SETUP_COLORS[setup.id] || '#38bdf8';
              return (
                <button
                  key={setup.id}
                  type="button"
                  onClick={() => onSelectSetup(setup.id)}
                  title={setup.description || ''}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? `${color}33` : 'rgba(15, 23, 42, 0.5)',
                    color: isSelected ? color : 'var(--text-secondary)',
                    boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none'
                  }}
                >
                  {setup.icon ? `${setup.icon} ` : ''}{setup.name}
                </button>
              );
            })}
          </div>

          {/* Right Action Controls: Standalone Date Picker & Rules/Sliders Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* HTML5 Graphical Date Picker Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={selectedDate || latestDbDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={maxSelectableDate}
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerLiveQuotesSync}
              disabled={syncStatus?.status === 'running' || loadingCandidates}
              title={syncStatus?.status === 'running' ? "Refreshing Live Quotes..." : "Sync Live Market Quotes (<3s)"}
              style={{
                padding: '5px 10px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: syncStatus?.status === 'running' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                border: syncStatus?.status === 'running' ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                cursor: syncStatus?.status === 'running' ? 'not-allowed' : 'pointer',
                lineHeight: 1
              }}
            >
              <span className={syncStatus?.status === 'running' ? "spin-icon" : ""}>⚡</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFiltersSection(!showFiltersSection)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: showFiltersSection ? 'rgba(255, 255, 255, 0.12)' : undefined,
                whiteSpace: 'nowrap'
              }}
            >
              ⚙️ {showFiltersSection ? 'Filters ▲' : 'Filters ▼'}
            </button>

          </div>
        </div>

        {/* Momentum Sub-Bar (Subviews & Top N Selector) */}
        {activeSetupKey === 'momentum' && showFiltersSection && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '8px',
            marginTop: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔍 Momentum View:
              </span>
              {[
                { id: 'all', label: `🎯 All Combined (~${activeFilters.qm_top_n || 75} Each, Deduped)` },
                { id: '1m', label: `⚡ 1-Month Gainers (Top ${activeFilters.qm_top_n || 75})` },
                { id: '3m', label: `🚀 3-Month Gainers (Top ${activeFilters.qm_top_n || 75})` },
                { id: '6m', label: `🌊 6-Month Gainers (Top ${activeFilters.qm_top_n || 75})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onFilterChange('qm_subview', tab.id)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '11.5px',
                    fontWeight: (activeFilters.qm_subview || 'all') === tab.id ? '700' : '500',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: (activeFilters.qm_subview || 'all') === tab.id ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: (activeFilters.qm_subview || 'all') === tab.id ? 'rgba(168, 85, 247, 0.3)' : 'rgba(15, 23, 42, 0.4)',
                    color: (activeFilters.qm_subview || 'all') === tab.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Top N limit selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>Top per scan:</span>
              {[50, 75, 100].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onFilterChange('qm_top_n', n)}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: (activeFilters.qm_top_n || 75) === n ? '700' : '500',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: (activeFilters.qm_top_n || 75) === n ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: (activeFilters.qm_top_n || 75) === n ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: (activeFilters.qm_top_n || 75) === n ? '#38bdf8' : 'var(--text-secondary)'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Section for Rules & Sliders */}
        {showFiltersSection && (
          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {(currentSetup?.visible_filters || Object.keys(setupsConfig?.filters || {})).map(fKey => {
                if (activeSetupKey === 'momentum' && (fKey === 'qm_subview' || fKey === 'qm_top_n')) return null;
                const fDef = setupsConfig?.filters?.[fKey];
                if (!fDef) return null;
                return (
                  <FilterControl
                    key={fKey}
                    filterKey={fKey}
                    filterDef={fDef}
                    value={activeFilters[fKey]}
                    onChange={(val) => onFilterChange(fKey, val)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stock Browse Mode Content */}
      {filteredCandidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', marginTop: '20px' }}>
          {loadingCandidates ? 'Loading candidates...' : 'No candidate stocks match your current active filters.'}
        </div>
      ) : (
        <div className="browse-split-container">
          {/* Main Browse Column (Left) */}
          <div className="browse-main-col">
            {/* Header Bar for Selected Stock */}
            <div className="glass-card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              {/* Top Row: Symbol + Company Name (Left) & Watchlist Quick Action (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
                    {currentCandidate?.symbol}
                  </h2>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                      {currentCandidate?.name || currentCandidate?.symbol || ''}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {currentCandidate?.exchange || ''} • {currentCandidate?.sector || 'Sector'} ({currentCandidate?.industry || 'Industry'})
                    </div>
                  </div>
                </div>

                {/* Top Right: Add to Watchlist Quick Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <select
                    value={targetWatchlistId || ''}
                    onChange={(e) => setTargetWatchlistId(Number(e.target.value))}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '5px 8px',
                      fontSize: '11.5px',
                      cursor: 'pointer'
                    }}
                  >
                    {watchlists.map((w) => (
                      <option key={w.id} value={w.id}>
                        ⭐️ {w.name}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const isCurrentSaved = currentCandidate && activeWatchlistSymbols.has(currentCandidate.symbol.toUpperCase());
                    return (
                      <button
                        className={`btn ${isCurrentSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleToggleWatchlist(currentCandidate?.symbol)}
                        disabled={!currentCandidate}
                        title={isCurrentSaved ? 'Saved in Watchlist (Click to remove)' : `Save ${currentCandidate?.symbol || 'stock'} to Watchlist`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          padding: 0,
                          borderRadius: '6px',
                          transition: 'all 0.2s ease',
                          background: isCurrentSaved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          color: isCurrentSaved ? '#34d399' : 'var(--text-secondary)',
                          border: isCurrentSaved ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: currentCandidate ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {isCurrentSaved ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#34d399" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </button>
                    );
                  })()}

                  {/* Header Quick Screenshot Action Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => chartComponentRef.current?.saveScreenshot()}
                    disabled={!currentCandidate || loadingBrowsePrices || browsePrices.length === 0}
                    title={`Take chart screenshot and store in ./charts/${activeSetupName}/${currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : 'date')}_${currentCandidate?.symbol || 'STOCK'}.png`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-secondary)',
                      cursor: (!currentCandidate || browsePrices.length === 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Badges Group (Left) & Stock Position Count (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Left: Badges Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                  <span className="pill pill-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                    RS: {currentCandidate?.rs_rank ?? 'N/A'}
                  </span>

                  {currentCandidate?.adr_20d !== null && currentCandidate?.adr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '11px', padding: '3px 8px', background: currentCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.18)', color: currentCandidate.adr_20d >= 5.0 ? '#f59e0b' : '#60a5fa', border: currentCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 700 }}>
                      ADR%: {currentCandidate.adr_20d.toFixed(2)}%
                    </span>
                  ) : currentCandidate?.atr_20d !== null && currentCandidate?.atr_20d !== undefined ? (
                    <span className="pill" style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                      ADTR: {currentCandidate.atr_20d.toFixed(2)}%
                    </span>
                  ) : null}

                  {currentCandidate?.ti_65 !== null && currentCandidate?.ti_65 !== undefined && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: currentCandidate.ti_65 >= 1.05 ? 'rgba(16, 185, 129, 0.18)' : currentCandidate.ti_65 < 0.95 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                        color: currentCandidate.ti_65 >= 1.05 ? '#34d399' : currentCandidate.ti_65 < 0.95 ? '#f87171' : 'var(--text-secondary)',
                        border: currentCandidate.ti_65 >= 1.05 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 600
                      }}
                      title={`Stockbee Trend Intensity (TI65): ${currentCandidate.ti_65.toFixed(2)}${currentCandidate.ti_65 >= 1.05 ? ' (Bullish Uptrend)' : currentCandidate.ti_65 < 0.95 ? ' (Bearish Trend)' : ' (Neutral)'}`}
                    >
                      TI65: {currentCandidate.ti_65.toFixed(2)}
                    </span>
                  )}

                  {/* Next Earnings Date Badge */}
                  {browseEarningsBadge ? (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        fontWeight: '700',
                        background: browseEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        color: browseEarningsBadge.isUrgent ? '#f87171' : '#c084fc',
                        border: `1px solid ${browseEarningsBadge.isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`
                      }}
                      title={`Next Earnings Date: ${browseEarningsBadge.dateStr}`}
                    >
                      {browseEarningsBadge.displayText}
                    </span>
                  ) : (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        fontWeight: '500',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                      title="Next Earnings Date: Not Scheduled or Unannounced"
                    >
                      Earning: {loadingBrowsePrices ? 'Checking...' : 'Unscheduled'}
                    </span>
                  )}

                  {/* Minervini VCP Footprint Badge */}
                  {browseDetail?.vcp_footprint?.footprint_str ? (
                    <span
                      className="pill pill-primary"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(56, 189, 248, 0.18)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Minervini Volatility Contraction Pattern (VCP) Footprint: Base Weeks, Contraction Depths %, and Troughs Count"
                    >
                      🌀 {browseDetail.vcp_footprint.footprint_str}
                    </span>
                  ) : currentCandidate?.vcp_depths && currentCandidate?.vcp_troughs ? (
                    <span
                      className="pill pill-primary"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(56, 189, 248, 0.18)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Minervini Volatility Contraction Pattern (VCP) Footprint"
                    >
                      🌀 {currentCandidate.vcp_depths.split(',').map(d => Math.round(parseFloat(d))).join('/')} {currentCandidate.vcp_troughs}T
                    </span>
                  ) : null}

                  {/* IPO Base Badge */}
                  {currentCandidate?.ipo_days_count !== null && currentCandidate?.ipo_days_count !== undefined && currentCandidate?.ipo_days_count <= 350 && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'rgba(6, 182, 212, 0.18)',
                        color: '#06b6d4',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`IPO Base: ${currentCandidate.ipo_days_count} trading days since IPO${currentCandidate.ipo_base_depth !== null && currentCandidate.ipo_base_depth !== undefined ? ` • Base Depth: ${Math.round(currentCandidate.ipo_base_depth)}%` : ''}`}
                    >
                      🌱 IPO {currentCandidate.ipo_days_count}d{currentCandidate.ipo_base_depth !== null && currentCandidate.ipo_base_depth !== undefined ? ` (${Math.round(currentCandidate.ipo_base_depth)}%)` : ''}
                    </span>
                  )}

                  {/* Power Play Badge */}
                  {currentCandidate?.pp_is_setup && (
                    <span
                      className="pill"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: currentCandidate?.pp_is_trigger ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.18)',
                        color: currentCandidate?.pp_is_trigger ? '#f87171' : '#fbbf24',
                        border: currentCandidate?.pp_is_trigger ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(245, 158, 11, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`Power Play (High Tight Flag): ${currentCandidate?.pp_runup_pct}% prior runup, ${currentCandidate?.pp_drawdown_pct}% base pullback over ${currentCandidate?.pp_days_since_peak}d${currentCandidate?.pp_is_trigger ? ' • BREAKOUT TRIGGER TODAY!' : ' • In Base'}`}
                    >
                      {currentCandidate?.pp_is_trigger ? '🚀 PP Breakout' : `🚀 PP Base ${currentCandidate?.pp_days_since_peak}d`} (+{Math.round(currentCandidate?.pp_runup_pct || 0)}%)
                    </span>
                  )}
                </div>

                {/* Stock Position Count on Far Bottom Right */}
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                  Stock {browseIndex + 1} of {filteredCandidates.length}
                </span>
              </div>
            </div>

            {/* Candlestick Chart Container - Fills 100% of remaining vertical height */}
            <div className="glass-card" style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <CandlestickChart
                ref={chartComponentRef}
                data={browsePrices}
                symbol={currentCandidate?.symbol}
                companyName={currentCandidate?.name}
                setupName={activeSetupName}
                asOfDate={currentCandidate?.screen_date || (selectedDate !== 'latest' ? selectedDate : null)}
                height="100%"
                showScreenshotButton={false}
              />
            </div>
          </div>

          {/* Candidate List Ribbon (Right Column) */}
          <div className="glass-card browse-side-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', margin: 0 }}>
                Filtered Candidates ({filteredCandidates.length})
              </h4>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportTradingView}
                disabled={filteredCandidates.length === 0}
                title="Export to TradingView watchlist (.txt)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  borderRadius: '6px',
                  cursor: filteredCandidates.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: filteredCandidates.length > 0 ? 1 : 0.4,
                  flexShrink: 0
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minHeight: 0,
                paddingRight: '2px'
              }}
            >
              {filteredCandidates.map((c, idx) => {
                const isSelected = idx === browseIndex;
                const isItemSaved = activeWatchlistSymbols.has(c.symbol.toUpperCase());
                return (
                  <div
                    key={c.symbol}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => setBrowseIndex(idx)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'var(--transition-smooth)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: idx === browseIndex ? '#34d399' : '#ffffff' }}>
                        {c.symbol}
                      </span>
                      {isItemSaved && <span style={{ fontSize: '11px' }} title="Saved in active watchlist">⭐️</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {c.ti_65 !== null && c.ti_65 !== undefined && (
                        <span
                          className="pill"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            fontWeight: 600,
                            background: c.ti_65 >= 1.05 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: c.ti_65 >= 1.05 ? '#34d399' : 'var(--text-secondary)'
                          }}
                          title={`Trend Intensity: ${c.ti_65.toFixed(2)}`}
                        >
                          TI {c.ti_65.toFixed(2)}
                        </span>
                      )}
                      <span className="pill pill-success" style={{ fontSize: '10px', padding: '1px 6px', fontWeight: 600 }}>
                        RS {c.rs_rank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
