import React, { useState, useEffect, useRef, useMemo } from 'react';
import CandlestickChart from './CandlestickChart';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

const SETUP_CANONICAL_NAMES = {
  power_play: 'Power Play',
  breakout: 'QM Breakout',
  episodic_pivot: 'Episodic Pivot',
  momentum: 'QM Momentum',
  parabolic: 'Parabolic',
  ipo_base: 'IPO Base',
  vcp: 'Minervini VCP'
};

export default function ModelBookTab({
  onSelectStock = null,
  watchlists = [],
  fetchWatchlists = () => {},
  setupsConfig = { setups: [], filters: {} }
}) {
  // Screening Parameters
  const [setupType, setSetupType] = useState('power_play');
  const modelBookChartRef = useRef(null);
  const [targetGainPct, setTargetGainPct] = useState(20.0);
  const [customGain, setCustomGain] = useState('');
  const [forwardDays, setForwardDays] = useState(20);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState('');

  // Dynamic setups from centralized config
  const setupOptions = useMemo(() => {
    if (setupsConfig?.setups && setupsConfig.setups.length > 0) {
      return setupsConfig.setups;
    }
    return [
      { id: 'power_play', name: 'Power Play', icon: '🚀', description: 'Explosive 100%+ surge in < 8 weeks followed by tight 3-6 week consolidation.' },
      { id: 'breakout', name: 'QM Breakout', icon: '🎯', description: 'High-momentum consolidation surfing rising 10/20 EMAs ready to break out.' },
      { id: 'episodic_pivot', name: 'Episodic Pivot', icon: '⚡', description: 'Massive gap-up (10%+) on heavy relative volume driven by catalyst or earnings.' },
      { id: 'momentum', name: 'QM Momentum', icon: '🏆', description: 'Top 1-2% strongest momentum leaders over 1M, 3M, and 6M timeframes.' },
      { id: 'parabolic', name: 'Parabolic', icon: '🌋', description: 'Overextended momentum climaxes or capitulation exhaustion.' },
      { id: 'ipo_base', name: 'IPO Base', icon: '🌱', description: 'Early institutional accumulation in newly public companies (< 350 days).' },
      { id: 'vcp', name: 'Minervini VCP', icon: '📐', description: 'Volatility Contraction Pattern with drying volume along Stage 2 uptrend.' }
    ];
  }, [setupsConfig]);

  const activeSetup = useMemo(() => {
    return setupOptions.find(s => s.id === setupType) || setupOptions[0];
  }, [setupOptions, setupType]);
  
  // Date Range (default: past 1 year up to 30 days ago to allow forward bars)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getTime() - 30 * 24 * 60 * 1000);
    const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [activeDatePreset, setActiveDatePreset] = useState('1y');

  // Execution State
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  // Active criteria chips preview
  const activeFilterChips = useMemo(() => {
    const filters = scanResult?.summary?.filters || activeSetup?.filters || {};
    const chips = [];

    // Baseline Liquidity
    if (filters.min_price !== undefined) {
      chips.push({ text: `Price: ≥$${filters.min_price}`, highlight: false });
    }
    if (filters.min_volume_sma_50 !== undefined) {
      const k = Math.round(Number(filters.min_volume_sma_50) / 1000);
      chips.push({ text: `50d Vol: ≥${k}K`, highlight: false });
    }
    if (filters.min_dollar_vol !== undefined) {
      const m = Math.round(Number(filters.min_dollar_vol) / 1000000);
      chips.push({ text: `$ Vol: ≥$${m}M`, highlight: true });
    }

    // Trend & Template
    if (filters.enforce_stage2) {
      chips.push({ text: `Stage 2 Template`, highlight: true });
    }
    if (filters.enable_rs) {
      chips.push({ text: `RS Rank: ≥${filters.min_rs_percentile || 70}`, highlight: true });
    }

    // Setup Specifics
    if (filters.min_pp_runup !== undefined) {
      chips.push({ text: `Runup: ≥${filters.min_pp_runup}%`, highlight: true });
    }
    if (filters.max_pp_drawdown !== undefined) {
      chips.push({ text: `Base Depth: ≤${filters.max_pp_drawdown}%`, highlight: true });
    }
    if (filters.min_pp_days_since_peak !== undefined) {
      chips.push({ text: `Consolidation: ≥${filters.min_pp_days_since_peak}d`, highlight: false });
    }
    if (filters.min_breakout_runup !== undefined) {
      chips.push({ text: `Runup: ≥${filters.min_breakout_runup}%`, highlight: true });
    }
    if (filters.enable_adr && filters.min_adr_20d !== undefined) {
      chips.push({ text: `ADR: ≥${filters.min_adr_20d}%`, highlight: false });
    }
    if (filters.min_ep_gap !== undefined) {
      chips.push({ text: `Gap: ≥${filters.min_ep_gap}%`, highlight: true });
    }
    if (filters.min_ep_rel_vol !== undefined) {
      chips.push({ text: `Rel Vol: ≥${filters.min_ep_rel_vol}x`, highlight: true });
    }
    if (filters.max_ipo_age !== undefined) {
      chips.push({ text: `IPO Age: ≤${filters.max_ipo_age}d`, highlight: true });
    }
    if (filters.max_ipo_dist !== undefined) {
      chips.push({ text: `From ATH: ≤${filters.max_ipo_dist}%`, highlight: false });
    }
    if (filters.max_ipo_depth !== undefined) {
      chips.push({ text: `Base Depth: ≤${filters.max_ipo_depth}%`, highlight: false });
    }

    return chips;
  }, [scanResult, activeSetup]);

  // Table & View Filters
  const [viewMode, setViewMode] = useState('winners'); // 'winners' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedRegime, setSelectedRegime] = useState('ALL'); // 'ALL' | 'BULLISH' | 'CAUTION' | 'BEARISH'
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');

  // Chart Viewer State
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [stockPrices, setStockPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Watchlist action state
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('');
  const [watchlistSuccess, setWatchlistSuccess] = useState(null);

  // Set default target watchlist
  useEffect(() => {
    if (watchlists && watchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlistId]);

  // Quick Date Presets
  const applyDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const today = new Date();
    const end = new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000); // 25 days ago buffer for forward window
    let start = new Date(end);

    if (preset === '6m') {
      start.setMonth(start.getMonth() - 6);
    } else if (preset === '1y') {
      start.setFullYear(start.getFullYear() - 1);
    } else if (preset === '2y') {
      start.setFullYear(start.getFullYear() - 2);
    } else if (preset === 'all') {
      start = new Date('2021-08-27');
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Run Scan API
  const handleRunScan = async (setupToRun = null) => {
    const targetSetup = typeof setupToRun === 'string' && setupToRun.trim() !== '' ? setupToRun : setupType;
    setLoading(true);
    setError(null);
    try {
      const activeSetupObj = (setupOptions || []).find(s => s.id === targetSetup);
      const payload = {
        setup_type: targetSetup,
        target_gain_pct: parseFloat(targetGainPct) || 20.0,
        start_date: startDate,
        end_date: endDate,
        forward_days: parseInt(forwardDays, 10) || 20,
        max_drawdown_limit: maxDrawdownLimit !== '' ? parseFloat(maxDrawdownLimit) : null,
        episode_window_days: 15,
        filters: activeSetupObj?.filters || {}
      };

      const res = await fetch(`${API_BASE}/api/model-book/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Scan failed');
      }

      const data = await res.json();
      setScanResult(data);

      // Automatically select the first winner or candidate for charting
      const candidatesList = data.winners && data.winners.length > 0 ? data.winners : (data.all_candidates || []);
      if (candidatesList.length > 0) {
        handleSelectCandidate(candidatesList[0]);
      } else {
        setSelectedCandidate(null);
        setStockPrices([]);
      }
    } catch (e) {
      console.error('Error running model book scan:', e);
      setError(e.message || 'Error executing study backtest');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSetup = (newId) => {
    setSetupType(newId);
    handleRunScan(newId);
  };

  // Run initial scan on mount
  useEffect(() => {
    handleRunScan();
  }, []);

  // Fetch prices when candidate is selected
  const handleSelectCandidate = async (candidate) => {
    if (!candidate) return;
    setSelectedCandidate(candidate);
    setLoadingPrices(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/${candidate.symbol}/prices`);
      if (res.ok) {
        const priceData = await res.json();
        setStockPrices(priceData);
      }
    } catch (e) {
      console.error(`Error loading prices for ${candidate.symbol}:`, e);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Filter and sort candidates
  const displayedCandidates = useMemo(() => {
    if (!scanResult) return [];
    let list = viewMode === 'winners' ? (scanResult.winners || []) : (scanResult.all_candidates || []);

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        c => c.symbol.toLowerCase().includes(term) || (c.name && c.name.toLowerCase().includes(term))
      );
    }

    if (selectedSector !== 'ALL') {
      list = list.filter(c => c.sector === selectedSector);
    }

    if (selectedRegime !== 'ALL') {
      list = list.filter(c => c.market_regime === selectedRegime);
    }

    return [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        const cmp = sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        if (cmp !== 0) return cmp;
        return (a.symbol || '').localeCompare(b.symbol || '');
      }
      const numCmp = sortDirection === 'asc' ? valA - valB : valB - valA;
      if (numCmp !== 0) return numCmp;
      return (a.date || '').localeCompare(b.date || '');
    });
  }, [scanResult, viewMode, searchTerm, selectedSector, selectedRegime, sortField, sortDirection]);

  // Sector list for filter dropdown
  const availableSectors = useMemo(() => {
    if (!scanResult) return [];
    const pool = scanResult.all_candidates || [];
    const set = new Set(pool.map(c => c.sector).filter(Boolean));
    return Array.from(set).sort();
  }, [scanResult]);

  // Flipping through candidates (Next / Previous)
  const currentIndex = useMemo(() => {
    if (!selectedCandidate || displayedCandidates.length === 0) return -1;
    return displayedCandidates.findIndex(
      c => c.symbol === selectedCandidate.symbol && c.date === selectedCandidate.date
    );
  }, [selectedCandidate, displayedCandidates]);

  const handlePrevCandidate = () => {
    if (currentIndex > 0) {
      handleSelectCandidate(displayedCandidates[currentIndex - 1]);
    }
  };

  const handleNextCandidate = () => {
    if (currentIndex >= 0 && currentIndex < displayedCandidates.length - 1) {
      handleSelectCandidate(displayedCandidates[currentIndex + 1]);
    }
  };

  // Keyboard navigation (ArrowUp = prev, ArrowDown = next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNextCandidate();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrevCandidate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayedCandidates]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (displayedCandidates.length === 0) return;
    const headers = [
      'Symbol',
      'Company Name',
      'Sector',
      'Trigger Date',
      'Market Regime',
      'Market Stack',
      'QQQ Close',
      'Entry Price',
      'ADR% (20d)',
      'Peak Price',
      'Peak Gain %',
      'Max Drawdown %',
      'Days to Target',
      'Prior Runup %',
      'Base Depth %',
      'RS Score'
    ];

    const rows = displayedCandidates.map(c => [
      c.symbol,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.sector || '').replace(/"/g, '""')}"`,
      c.date,
      c.market_regime || '',
      `"${(c.market_stack || '').replace(/"/g, '""')}"`,
      c.market_index_close ?? '',
      c.entry_price,
      c.adr_20d ?? '',
      c.peak_price || '',
      c.peak_gain_pct,
      c.max_drawdown_pct,
      c.days_to_target ?? '',
      c.prior_runup_pct,
      c.base_depth_pct,
      c.rs_score ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `model_book_${setupType}_winners.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add to Watchlist
  const handleAddToWatchlist = async () => {
    if (!selectedCandidate || !selectedWatchlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${selectedWatchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedCandidate.symbol })
      });
      if (res.ok) {
        setWatchlistSuccess(`Added ${selectedCandidate.symbol} to watchlist!`);
        fetchWatchlists();
        setTimeout(() => setWatchlistSuccess(null), 3000);
      }
    } catch (e) {
      console.error('Error adding to watchlist:', e);
    }
  };

  const summary = scanResult?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '40px' }}>
      {/* 1. Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              📚 Model Book Study
            </h1>
            <span
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-color)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              Historical Winners Lab
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Isolate true setup winners (≥ {targetGainPct}% run-ups) and study their pre-breakout characteristics. Volume expansion on Day 1 is skipped to capture early stealth breakouts.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            disabled={displayedCandidates.length === 0}
            style={{
              padding: '8px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              cursor: displayedCandidates.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📥</span> Export CSV ({displayedCandidates.length})
          </button>

          <button
            onClick={() => handleRunScan()}
            disabled={loading}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--accent-color)',
              border: 'none',
              color: '#080b11',
              fontWeight: '600',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? (
              <>
                <span className="spin-icon">⟳</span> Scanning History...
              </>
            ) : (
              <>
                <span>⚡</span> Run Study Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Controls & Configuration Toolbar */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
        {/* Setup Selection Pills */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: '85px' }}>
            Setup Pattern:
          </span>
          {setupOptions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelectSetup(s.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: setupType === s.id ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: setupType === s.id ? 'var(--accent-light)' : 'rgba(255, 255, 255, 0.03)',
                color: setupType === s.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: setupType === s.id ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title={s.description || s.desc}
            >
              <span>{s.icon || '📌'}</span>
              <span>{s.name || s.label}</span>
            </button>
          ))}
        </div>

        {/* Active Setup Criteria Preview */}
        {activeFilterChips && activeFilterChips.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600', marginRight: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
              ⚙️ Backtest Criteria:
            </span>
            {activeFilterChips.map((chip, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: chip.highlight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: chip.highlight ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                  color: chip.highlight ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: '500'
                }}
              >
                {chip.text}
              </span>
            ))}
          </div>
        )}

        {/* Target Gain & Horizon Row */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          {/* Target Gain */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Target Gain:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[15, 20, 30, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    setTargetGainPct(pct);
                    setCustomGain('');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: targetGainPct === pct && !customGain ? '1px solid #34d399' : '1px solid var(--border-color)',
                    backgroundColor: targetGainPct === pct && !customGain ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                    color: targetGainPct === pct && !customGain ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  +{pct}%
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
              <input
                type="number"
                placeholder="Custom"
                value={customGain}
                onChange={e => {
                  setCustomGain(e.target.value);
                  if (e.target.value) setTargetGainPct(parseFloat(e.target.value) || 20);
                }}
                style={{
                  width: '65px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {/* Forward Window */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Horizon:
            </span>
            <select
              value={forwardDays}
              onChange={e => setForwardDays(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10 Trading Days (~2 Wks)</option>
              <option value={20}>20 Trading Days (~1 Mo)</option>
              <option value={40}>40 Trading Days (~2 Mo)</option>
              <option value={60}>60 Trading Days (~1 Qtr)</option>
            </select>
          </div>

          {/* Stop Loss / Drawdown limit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Max Drawdown (Stop):
            </span>
            <select
              value={maxDrawdownLimit}
              onChange={e => setMaxDrawdownLimit(e.target.value)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="">Any (No Filter)</option>
              <option value="-5.0">Max -5% Drawdown</option>
              <option value="-8.0">Max -8% Drawdown</option>
              <option value="-10.0">Max -10% Drawdown</option>
              <option value="-15.0">Max -15% Drawdown</option>
            </select>
          </div>

          {/* Date Range Presets & Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Date Range:
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['6m', '1y', '2y', 'all'].map(p => (
                <button
                  key={p}
                  onClick={() => applyDatePreset(p)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: activeDatePreset === p ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                    backgroundColor: activeDatePreset === p ? 'var(--accent-light)' : 'transparent',
                    color: activeDatePreset === p ? 'var(--accent-color)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '11.5px'
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setActiveDatePreset('custom');
              }}
              style={{
                padding: '3px 6px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '11.5px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fda4af', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 3. Summary Statistics Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Card 1: Win Rate */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Win Rate (≥ +{summary.target_gain_pct}%)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="stat-value" style={{ color: summary.win_rate_pct >= 30 ? '#34d399' : '#f87171' }}>
                {summary.win_rate_pct}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({summary.total_winners}/{summary.total_setups})
              </span>
            </div>
            <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
              Horizon: {summary.forward_days} trading days
            </span>
          </div>

          {/* Card 2: Avg Winner Gain */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Avg Winner MFE Gain</span>
            <span className="stat-value" style={{ color: '#34d399' }}>
              +{summary.avg_winner_gain_pct}%
            </span>
            <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
              Peak high reached within horizon
            </span>
          </div>

          {/* Card 3: Median Days to Target */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Median Days to Target</span>
            <span className="stat-value" style={{ color: '#38bdf8' }}>
              {summary.median_days_to_target || '-'} <span style={{ fontSize: '16px', fontWeight: '400' }}>days</span>
            </span>
            <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
              Avg drawdown: {summary.avg_drawdown_pct}%
            </span>
          </div>

          {/* Card 4: Top Performer */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Best Winner</span>
            {summary.best_performer ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="stat-value" style={{ color: '#facc15' }}>
                    {summary.best_performer.symbol}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#34d399' }}>
                    +{summary.best_performer.gain_pct}%
                  </span>
                </div>
                <span className="stat-subtext" style={{ color: 'var(--text-muted)' }}>
                  {summary.best_performer.date} • {summary.best_performer.sector || 'Equities'}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>None</span>
            )}
          </div>

          {/* Card 5: Winner Profile Characteristics */}
          <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
            <span className="stat-label">Winner Profile</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Prior Runup: <strong style={{ color: 'var(--text-primary)' }}>+{summary.avg_winner_runup_pct}%</strong>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Base Depth: <strong style={{ color: 'var(--text-primary)' }}>{summary.avg_winner_base_depth}%</strong>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                RS Score: <strong style={{ color: 'var(--text-primary)' }}>{summary.avg_winner_rs_score || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Card 6: Market Timing Edge */}
          {summary.regime_breakdown && (
            <div className="glass-card stat-card" style={{ padding: '14px 18px' }}>
              <span className="stat-label">Market Timing Edge</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Bullish Tape:</span>
                  <span style={{ fontWeight: 700, color: (summary.regime_breakdown.BULLISH?.win_rate_pct ?? 0) >= 25 ? '#34d399' : 'var(--text-primary)' }}>
                    {summary.regime_breakdown.BULLISH?.win_rate_pct ?? 0}% ({summary.regime_breakdown.BULLISH?.winners ?? 0}/{summary.regime_breakdown.BULLISH?.total ?? 0})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>🟡 Caution Tape:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {summary.regime_breakdown.CAUTION?.win_rate_pct ?? 0}% ({summary.regime_breakdown.CAUTION?.winners ?? 0}/{summary.regime_breakdown.CAUTION?.total ?? 0})
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ color: '#fb7185', fontWeight: 600 }}>🔴 Bearish Tape:</span>
                  <span style={{ fontWeight: 700, color: '#fb7185' }}>
                    {summary.regime_breakdown.BEARISH?.win_rate_pct ?? 0}% ({summary.regime_breakdown.BEARISH?.winners ?? 0}/{summary.regime_breakdown.BEARISH?.total ?? 0})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Split-Screen Layout: Master Table (Left) + Interactive Model Book Chart (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 46%) 1fr', gap: '18px', alignItems: 'start' }}>
        {/* Left Column: Candidates & Winners Table */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Table Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* View Mode Pills: Winners vs All */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={() => setViewMode('winners')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'winners' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'winners' ? '#080b11' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🏆 Winners Only ({scanResult?.winners?.length || 0})
              </button>
              <button
                onClick={() => setViewMode('all')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'all' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'all' ? '#080b11' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                All Setups ({scanResult?.all_candidates?.length || 0})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Market Tape filter */}
              <select
                value={selectedRegime}
                onChange={e => setSelectedRegime(e.target.value)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: selectedRegime === 'BULLISH' ? '#34d399' : (selectedRegime === 'BEARISH' ? '#fb7185' : (selectedRegime === 'CAUTION' ? '#fbbf24' : 'var(--text-primary)')),
                  fontSize: '12px',
                  fontWeight: selectedRegime !== 'ALL' ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Market Tapes</option>
                <option value="BULLISH">🟢 Bullish Tape</option>
                <option value="CAUTION">🟡 Caution Tape</option>
                <option value="BEARISH">🔴 Bearish Tape</option>
              </select>

              {/* Sector filter */}
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  maxWidth: '130px',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Sectors</option>
                {availableSectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div>
            <input
              type="text"
              placeholder="Search ticker or company name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                backgroundColor: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12.5px'
              }}
            />
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>
                    Ticker {sortField === 'symbol' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                    Trigger Date {sortField === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('market_regime')} style={{ cursor: 'pointer' }}>
                    Market Tape {sortField === 'market_regime' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('peak_gain_pct')} style={{ cursor: 'pointer', color: '#34d399' }}>
                    Peak Gain {sortField === 'peak_gain_pct' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('max_drawdown_pct')} style={{ cursor: 'pointer' }}>
                    Max DD
                  </th>
                  <th onClick={() => handleSort('days_to_target')} style={{ cursor: 'pointer' }}>
                    Days
                  </th>
                  <th onClick={() => handleSort('adr_20d')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    ADR% {sortField === 'adr_20d' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('prior_runup_pct')} style={{ cursor: 'pointer' }}>
                    Prior Move
                  </th>
                  <th onClick={() => handleSort('base_depth_pct')} style={{ cursor: 'pointer' }}>
                    Depth
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {loading ? 'Analyzing historical bars...' : 'No setups found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  displayedCandidates.map(cand => {
                    const isSelected = selectedCandidate && selectedCandidate.symbol === cand.symbol && selectedCandidate.date === cand.date;
                    const isWinner = cand.hit_target;

                    return (
                      <tr
                        key={`${cand.symbol}_${cand.date}`}
                        onClick={() => handleSelectCandidate(cand)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--accent-color)' : '3px solid transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', color: isWinner ? '#34d399' : 'var(--text-primary)' }}>
                              {cand.symbol}
                            </span>
                            {isWinner && <span style={{ fontSize: '10px' }}>🏆</span>}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{cand.date}</td>

                        {/* Market Tape Column */}
                        <td>
                          {cand.market_regime === 'BULLISH' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(16, 185, 129, 0.18)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                fontSize: '10.5px',
                                padding: '2px 7px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={`Bullish Uptrend (Green Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🟢 Bullish
                            </span>
                          )}
                          {cand.market_regime === 'CAUTION' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(245, 158, 11, 0.18)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                fontSize: '10.5px',
                                padding: '2px 7px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={`Caution / Pullback (Yellow Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🟡 Caution
                            </span>
                          )}
                          {cand.market_regime === 'BEARISH' && (
                            <span
                              className="pill"
                              style={{
                                background: 'rgba(244, 63, 94, 0.18)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                fontSize: '10.5px',
                                padding: '2px 7px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={`High Risk / Distribution (Red Light)\nQQQ Close: $${cand.market_index_close ?? '-'}\nStack: ${cand.market_stack ?? '-'}`}
                            >
                              🔴 Bearish
                            </span>
                          )}
                          {!['BULLISH', 'CAUTION', 'BEARISH'].includes(cand.market_regime) && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                          )}
                        </td>

                        <td style={{ fontWeight: '700', color: cand.peak_gain_pct >= targetGainPct ? '#34d399' : 'var(--text-secondary)' }}>
                          +{cand.peak_gain_pct}%
                        </td>
                        <td style={{ color: cand.max_drawdown_pct < -10 ? '#f87171' : 'var(--text-secondary)' }}>
                          {cand.max_drawdown_pct}%
                        </td>
                        <td style={{ color: cand.days_to_target ? '#38bdf8' : 'var(--text-muted)' }}>
                          {cand.days_to_target ? `${cand.days_to_target}d` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: (cand.adr_20d >= 5.0 ? '#fbbf24' : 'var(--text-secondary)') }}>
                          {cand.adr_20d !== null && cand.adr_20d !== undefined ? `${cand.adr_20d.toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>+{cand.prior_runup_pct}%</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{cand.base_depth_pct}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px' }}>
            <span>Showing {displayedCandidates.length} setups</span>
            <span>Use ↑ / ↓ arrow keys to flip charts</span>
          </div>
        </div>

        {/* Right Column: Model Book Chart Reviewer */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedCandidate ? (
            <>
              {/* Active Winner Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {selectedCandidate.symbol}
                    </h2>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {selectedCandidate.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8'
                      }}
                    >
                      {selectedCandidate.sector}
                    </span>
                    {selectedCandidate.date && (
                      <span
                        className="pill"
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
                        title="Trigger / Screen Date for this setup candidate"
                      >
                        📅 Trigger: {selectedCandidate.date}
                      </span>
                    )}
                    {selectedCandidate.adr_20d !== null && selectedCandidate.adr_20d !== undefined && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: selectedCandidate.adr_20d >= 5.0 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(59, 130, 246, 0.15)',
                          color: selectedCandidate.adr_20d >= 5.0 ? '#fbbf24' : '#60a5fa',
                          border: selectedCandidate.adr_20d >= 5.0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="20-Day Average Daily Range (ADR%) on Trigger Date"
                      >
                        ⚡ ADR: {selectedCandidate.adr_20d.toFixed(1)}%
                      </span>
                    )}
                    {selectedCandidate.market_regime && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          background: selectedCandidate.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.18)'
                              : 'rgba(245, 158, 11, 0.18)'),
                          color: selectedCandidate.market_regime === 'BULLISH'
                            ? '#34d399'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? '#fb7185'
                              : '#fbbf24'),
                          border: `1px solid ${selectedCandidate.market_regime === 'BULLISH'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : (selectedCandidate.market_regime === 'BEARISH'
                              ? 'rgba(244, 63, 94, 0.35)'
                              : 'rgba(245, 158, 11, 0.35)')}`,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={`Market on trigger date: ${selectedCandidate.market_label || selectedCandidate.market_regime}\nQQQ Close: $${selectedCandidate.market_index_close ?? '-'}\nStack: ${selectedCandidate.market_stack ?? '-'}`}
                      >
                        {selectedCandidate.market_regime === 'BULLISH' && '🟢 Tape: Bullish'}
                        {selectedCandidate.market_regime === 'CAUTION' && '🟡 Tape: Caution'}
                        {selectedCandidate.market_regime === 'BEARISH' && '🔴 Tape: Bearish'}
                        {!['BULLISH', 'CAUTION', 'BEARISH'].includes(selectedCandidate.market_regime) && `Tape: ${selectedCandidate.market_regime}`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '12.5px' }}>
                    <span>
                      Entry Price: <strong>${selectedCandidate.entry_price.toFixed(2)}</strong>
                    </span>
                    <span>
                      Peak: <strong style={{ color: '#34d399' }}>${selectedCandidate.peak_price?.toFixed(2) || '-'} (+{selectedCandidate.peak_gain_pct}%)</strong>
                    </span>
                    <span>
                      Max Pullback: <strong style={{ color: selectedCandidate.max_drawdown_pct < -8 ? '#f87171' : 'var(--text-secondary)' }}>{selectedCandidate.max_drawdown_pct}%</strong>
                    </span>
                    {selectedCandidate.days_to_target && (
                      <span style={{ color: '#38bdf8', fontWeight: '600' }}>
                        ⚡ Hit +{targetGainPct}% in {selectedCandidate.days_to_target} days
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation and Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Previous / Next buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handlePrevCandidate}
                      disabled={currentIndex <= 0}
                      title="Previous Winner (↑ Arrow)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentIndex > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      ◀ Prev
                    </button>
                    <button
                      onClick={handleNextCandidate}
                      disabled={currentIndex >= displayedCandidates.length - 1}
                      title="Next Winner (↓ Arrow)"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: currentIndex < displayedCandidates.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: currentIndex < displayedCandidates.length - 1 ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Next ▶
                    </button>
                  </div>

                  {/* Watchlist Add */}
                  {watchlists && watchlists.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={handleAddToWatchlist}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'rgba(250, 204, 21, 0.15)',
                          border: '1px solid rgba(250, 204, 21, 0.3)',
                          color: '#facc15',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        title="Save to Watchlist"
                      >
                        ⭐️ Watchlist
                      </button>
                    </div>
                  )}

                  {/* Open Inspector Drawer if available */}
                  {onSelectStock && (
                    <button
                      onClick={() => onSelectStock({ symbol: selectedCandidate.symbol })}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      title="Open full inspector details"
                    >
                      🔍 Inspect
                    </button>
                  )}

                  {/* Header Quick Screenshot Action Button */}
                  <button
                    onClick={() => modelBookChartRef.current?.saveScreenshot()}
                    disabled={!selectedCandidate || loadingPrices || !stockPrices || stockPrices.length === 0}
                    title={`Take chart screenshot and store in ./charts/${SETUP_CANONICAL_NAMES[setupType] || 'Power Play'}/${(selectedCandidate?.date || selectedCandidate?.screen_date || 'date')}_${selectedCandidate?.symbol || 'STOCK'}.png`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      cursor: (!selectedCandidate || loadingPrices || !stockPrices || stockPrices.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              </div>

              {watchlistSuccess && (
                <div style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '4px', fontSize: '12px' }}>
                  ✓ {watchlistSuccess}
                </div>
              )}

              {/* Candlestick Chart */}
              <div style={{ width: '100%', height: '480px', minHeight: '480px', position: 'relative' }}>
                {loadingPrices && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(22, 30, 47, 0.75)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <span className="spin-icon" style={{ marginRight: '8px' }}>⟳</span> Loading price history for {selectedCandidate?.symbol}...
                  </div>
                )}
                {stockPrices && stockPrices.length > 0 ? (
                  <CandlestickChart
                    ref={modelBookChartRef}
                    data={stockPrices}
                    height={480}
                    asOfDate={selectedCandidate?.date || selectedCandidate?.screen_date}
                    symbol={selectedCandidate?.symbol}
                    setupName={SETUP_CANONICAL_NAMES[setupType] || 'Power Play'}
                    companyName={selectedCandidate?.name}
                    showScreenshotButton={true}
                  />
                ) : !loadingPrices ? (
                  <div style={{ height: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No historical prices available for {selectedCandidate?.symbol}.
                  </div>
                ) : null}
              </div>

              {/* Setup Characteristics Footprint */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px', padding: '10px 14px', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Prior Runup</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#34d399' }}>+{selectedCandidate.prior_runup_pct}%</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Base Depth</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedCandidate.base_depth_pct}%</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Pivot Price</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>${selectedCandidate.pivot_price ? selectedCandidate.pivot_price.toFixed(2) : '-'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ADR (20d)</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: selectedCandidate.adr_20d >= 5.0 ? '#fbbf24' : '#60a5fa' }}>
                    {selectedCandidate.adr_20d !== null && selectedCandidate.adr_20d !== undefined ? `${selectedCandidate.adr_20d.toFixed(1)}%` : '-'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>RS Score</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>{selectedCandidate.rs_score || '-'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>End of Period Return</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: selectedCandidate.end_return_pct >= 0 ? '#34d399' : '#f87171' }}>
                    {selectedCandidate.end_return_pct >= 0 ? `+${selectedCandidate.end_return_pct}%` : `${selectedCandidate.end_return_pct}%`}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Market Tape</span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: selectedCandidate.market_regime === 'BULLISH' ? '#34d399' : (selectedCandidate.market_regime === 'BEARISH' ? '#fb7185' : '#fbbf24')
                  }}>
                    {selectedCandidate.market_regime || 'UNKNOWN'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>QQQ MA Stack</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                    title={`QQQ Close on Trigger: $${selectedCandidate.market_index_close ?? '-'}`}
                  >
                    {selectedCandidate.market_stack || '-'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ height: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px' }}>
              <span style={{ fontSize: '40px' }}>📖</span>
              <p style={{ fontSize: '14px' }}>Select a winner candidate from the table to load its chart and study setup characteristics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

