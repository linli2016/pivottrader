import React, { useState, useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

// --- Price Chart Component ---
function CandlestickChart({ data, height = 280 }) {
  const chartContainerRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#161e2f' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });
    chart.timeScale().fitContent();

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    
    candlestickSeries.setData(data);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', position: 'relative' }} />;
}

// --- Dynamic API Resolution ---
const API_BASE = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:8000'
  : '';

// Parse synchronization progress from stdout logs
const getProgressFromLogs = (logs) => {
  if (!logs) return 0;
  const matches = [...logs.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return parseFloat(lastMatch[1]);
  }
  return 0;
};

function App() {
  const inspectorInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetail, setStockDetail] = useState(null);
  const [stockPrices, setStockPrices] = useState([]);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', log_output: '' });
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM symbols LIMIT 5;");
  const [sqlResult, setSqlResult] = useState(null);
  const [loadingSql, setLoadingSql] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('minervini');
  const [minRsFilter, setMinRsFilter] = useState(70);
  const [minEpsGrowthFilter, setMinEpsGrowthFilter] = useState(20.0);
  const [minPriceFilter, setMinPriceFilter] = useState(5.0);
  const [minVolFilter, setMinVolFilter] = useState(300000);
  const [minAdrFilter, setMinAdrFilter] = useState(0.0);
  const [minPpRunupFilter, setMinPpRunupFilter] = useState(100.0);
  const [maxPpDrawdownFilter, setMaxPpDrawdownFilter] = useState(25.0);
  const [maxPpVolRatioFilter, setMaxPpVolRatioFilter] = useState(1.0);
  const [inspectorSymbol, setInspectorSymbol] = useState('');
  const [inspectorDetail, setInspectorDetail] = useState(null);
  const [inspectorPrices, setInspectorPrices] = useState([]);
  const [inspectorError, setInspectorError] = useState('');
  const [searchingInspector, setSearchingInspector] = useState(false);
  const [config, setConfig] = useState({
    min_price: 5.00,
    min_volume_sma_50: 300000,
    min_rs_percentile: 70,
    min_eps_growth_qoq: 20.0,
    provider_selected: 'YFINANCE',
    price_provider_selected: 'YFINANCE'
  });

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/summary`);
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error("Error fetching summary: ", e);
    }
  };

  // Fetch candidates
  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/candidates`);
      const data = await res.json();
      setCandidates(data);
    } catch (e) {
      console.error("Error fetching candidates: ", e);
    }
  };

  // Fetch configs
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      const data = await res.json();
      setConfig(data);
      setMinRsFilter(data.min_rs_percentile);
      setMinEpsGrowthFilter(data.min_eps_growth_qoq);
      setMinPriceFilter(data.min_price);
      setMinVolFilter(data.min_volume_sma_50);
    } catch (e) {
      console.error("Error fetching config: ", e);
    }
  };

  // Fetch status logs
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/screen/status`);
      const data = await res.json();
      setSyncStatus(data);
    } catch (e) {
      console.error("Error fetching sync status: ", e);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchCandidates();
    fetchConfig();
    fetchSyncStatus();

    // Setup polling for sync logs while pipeline runs
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchSummary();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Intercept keypresses when on stock page to focus and type in the symbol search box
  useEffect(() => {
    if (activeTab !== 'inspector') return;

    const handleGlobalKeyDown = (e) => {
      // 1. Skip if user is typing in a form input, textarea or select
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT'
      )) {
        return;
      }

      // 2. Skip if modifier keys are pressed (browser shortcuts like Cmd+R, Ctrl+C)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 3. Intercept alphanumeric characters
      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        
        // Focus the input
        if (inspectorInputRef.current) {
          inspectorInputRef.current.focus();
        }
        
        // Append input character to symbol search state
        setInspectorSymbol(prev => (prev + e.key).toUpperCase());
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeTab]);

  // Fetch selected stock detail
  const handleSelectStock = async (stock) => {
    setSelectedStock(stock);
    setStockDetail(null);
    setStockPrices([]);
    try {
      // 1. Fetch metadata and fundamentals
      const detRes = await fetch(`${API_BASE}/api/stocks/${stock.symbol}`);
      const detData = await detRes.json();
      setStockDetail(detData);

      // 2. Fetch prices
      const prRes = await fetch(`${API_BASE}/api/stocks/${stock.symbol}/prices`);
      const prData = await prRes.json();
      setStockPrices(prData);
    } catch (e) {
      console.error("Error fetching stock details: ", e);
    }
  };

  // Trigger sync run
  const handleTriggerSync = async () => {
    try {
      await fetch(`${API_BASE}/api/screen/run`, { method: 'POST' });
      fetchSyncStatus();
    } catch (e) {
      console.error("Error triggering sync: ", e);
    }
  };

  // Save configs
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert("Configuration saved successfully!");
        fetchCandidates();
      }
    } catch (e) {
      console.error("Error saving config: ", e);
    }
  };

  // Run custom SQL query
  const handleRunSQL = async () => {
    setLoadingSql(true);
    setSqlResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/sql/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (e) {
      setSqlResult({ error: str(e) });
    } finally {
      setLoadingSql(false);
    }
  };

  // Inspect specific stock
  const handleInspectorSearch = async (sym) => {
    if (!sym) return;
    const cleanSym = sym.trim().toUpperCase();
    setSearchingInspector(true);
    setInspectorError('');
    setInspectorDetail(null);
    setInspectorPrices([]);
    try {
      const detRes = await fetch(`${API_BASE}/api/stocks/${cleanSym}`);
      if (detRes.status === 404) {
        setInspectorError(`Symbol "${cleanSym}" not found in database.`);
        setSearchingInspector(false);
        return;
      }
      if (!detRes.ok) {
        throw new Error("Failed to load details");
      }
      const detData = await detRes.json();
      setInspectorDetail(detData);

      const prRes = await fetch(`${API_BASE}/api/stocks/${cleanSym}/prices`);
      if (prRes.ok) {
        const prData = await prRes.json();
        setInspectorPrices(prData);
      }
    } catch (e) {
      console.error(e);
      setInspectorError(`Failed to retrieve data for "${cleanSym}": ${e.message}`);
    } finally {
      setSearchingInspector(false);
      setTimeout(() => {
        if (inspectorInputRef.current) {
          inspectorInputRef.current.focus();
          inspectorInputRef.current.select();
        }
      }, 50);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (c.close < minPriceFilter) return false;
    if (c.vol_50d_ma < minVolFilter) return false;
    if (c.rs_rank < minRsFilter) return false;
    if (c.adr_20d !== null && c.adr_20d !== undefined && c.adr_20d < minAdrFilter) return false;

    if (selectedStrategy === 'minervini') {
      if (c.eps_qoq_growth === null || c.eps_qoq_growth === undefined) return false;
      if (c.eps_qoq_growth < minEpsGrowthFilter) return false;
    }
    if (selectedStrategy === 'powerplay') {
      if (c.pp_runup_pct === null || c.pp_runup_pct === undefined || c.pp_runup_pct < minPpRunupFilter) return false;
      if (c.pp_drawdown_pct === null || c.pp_drawdown_pct === undefined || c.pp_drawdown_pct > maxPpDrawdownFilter) return false;
      if (c.volume && c.vol_50d_ma) {
        const volRatio = c.volume / c.vol_50d_ma;
        if (volRatio > maxPpVolRatioFilter) return false;
      }
    }
    return true;
  });

  // Export symbols to TradingView file
  const handleExportTradingView = () => {
    if (filteredCandidates.length === 0) {
      alert("No candidates to export!");
      return;
    }
    const content = filteredCandidates.map(c => {
      const exchange = c.exchange ? `${c.exchange}:` : '';
      return `${exchange}${c.symbol}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PivotTrader_Watchlist_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">P</div>
          <div className="logo-text">PivotTrader</div>
        </div>
        <ul className="nav-links">
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </li>
          <li 
            className={`nav-item ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            Screen ({filteredCandidates.length})
          </li>
          <li 
            className={`nav-item ${activeTab === 'inspector' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('inspector');
              if (selectedStock && !inspectorSymbol) {
                setInspectorSymbol(selectedStock.symbol);
                handleInspectorSearch(selectedStock.symbol);
              }
            }}
          >
            Stock Inspector
          </li>
          <li 
            className={`nav-item ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            SQL Console
          </li>
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configurations
          </li>
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        
        {/* Render Tab Views */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="header-section">
              <div className="header-title">
                <h1>Dashboard Summary</h1>
                <p>Status of your local embedded DuckDB datasets</p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleTriggerSync}
                disabled={syncStatus.status === 'running'}
              >
                {syncStatus.status === 'running' ? 'Running Screen Sync...' : 'Sync Database Tickers'}
              </button>
            </div>

            {/* Ingestion progress bar */}
            {syncStatus.status === 'running' && (
              <div className="glass-card" style={{ marginBottom: '32px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Database Ingestion Progress</span>
                  <span style={{ color: 'var(--accent-color)' }}>{getProgressFromLogs(syncStatus.log_output).toFixed(1)}%</span>
                </h3>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', height: '16px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                  <div style={{ 
                    background: 'linear-gradient(90deg, var(--accent-color), var(--accent-success))', 
                    height: '100%', 
                    width: `${getProgressFromLogs(syncStatus.log_output)}%`, 
                    transition: 'width 0.5s ease-out' 
                  }} />
                </div>
              </div>
            )}

            {/* Stat summaries */}
            <div className="card-grid">
              <div className="glass-card stat-card">
                <span className="stat-label">Stock Directory Universe</span>
                <span className="stat-value">{summary?.symbols_count || 0}</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-label">Total Ingested Price Bars</span>
                <span className="stat-value">{(summary?.daily_bars_count || 0).toLocaleString()}</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-label">Last Checked Pricing Date</span>
                <span className="stat-value">{summary?.last_price_date || 'N/A'}</span>
              </div>
            </div>

            {/* Ingestion status logs */}
            <div className="glass-card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Pipeline Running Logs</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Pipeline Status: <strong style={{ color: syncStatus.status === 'running' ? 'var(--accent-warning)' : syncStatus.status === 'completed' ? 'var(--accent-success)' : 'var(--text-primary)' }}>{syncStatus.status.toUpperCase()}</strong>
              </p>
              {syncStatus.log_output && (
                <div className="log-console">
                  {syncStatus.log_output}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Screening Strategy:</span>
                  <select 
                    value={selectedStrategy} 
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontWeight: '500' }}
                  >
                    <option value="minervini">Mark Minervini Stage 2 Screen</option>
                    <option value="momentum">High Momentum Leaders (Technical Only)</option>
                    <option value="powerplay">Mark Minervini Power Play Screen</option>
                  </select>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> ranked stocks
                </span>
              </div>

              {/* Dynamic Parameter Sliders / Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {/* 1. Relative Strength */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Min Relative Strength Rank ({minRsFilter}):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={minRsFilter}
                      onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                      style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                    />
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={minRsFilter}
                      onChange={(e) => setMinRsFilter(parseInt(e.target.value) || 0)}
                      style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                    />
                  </div>
                </div>

                {/* 2. EPS Growth QoQ (Only for Minervini Strategy) */}
                {selectedStrategy === 'minervini' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      Min QoQ EPS Growth ({minEpsGrowthFilter}%):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="range"
                        min="-50"
                        max="200"
                        value={minEpsGrowthFilter}
                        onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                        style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                      />
                      <input 
                        type="number"
                        min="-100"
                        max="1000"
                        value={minEpsGrowthFilter}
                        onChange={(e) => setMinEpsGrowthFilter(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Min Price */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Min Stock Price (${minPriceFilter.toFixed(2)}):
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

                {/* 4. Min 50d Volume MA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Min 50d Vol MA ({(minVolFilter / 1000).toFixed(0)}k):
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

                {/* 5. Min ADR (20d) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Min ADR (20d) ({minAdrFilter.toFixed(1)}%):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={minAdrFilter}
                      onChange={(e) => setMinAdrFilter(parseFloat(e.target.value) || 0)}
                      style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                    />
                    <input 
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={minAdrFilter}
                      onChange={(e) => setMinAdrFilter(parseFloat(e.target.value) || 0)}
                      style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                    />
                  </div>
                </div>

                {/* Power Play Sliders */}
                {selectedStrategy === 'powerplay' && (
                  <>
                    {/* Min Power Play Run-up */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Min Run-up in Last 8w ({minPpRunupFilter}%):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="range"
                          min="50"
                          max="200"
                          step="5"
                          value={minPpRunupFilter}
                          onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                          style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                        />
                        <input 
                          type="number"
                          min="10"
                          max="1000"
                          value={minPpRunupFilter}
                          onChange={(e) => setMinPpRunupFilter(parseFloat(e.target.value) || 0)}
                          style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    {/* Max Power Play Drawdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Max Base Drawdown ({maxPpDrawdownFilter}%):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="range"
                          min="10"
                          max="40"
                          step="1"
                          value={maxPpDrawdownFilter}
                          onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                          style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                        />
                        <input 
                          type="number"
                          min="5"
                          max="50"
                          value={maxPpDrawdownFilter}
                          onChange={(e) => setMaxPpDrawdownFilter(parseFloat(e.target.value) || 0)}
                          style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    {/* Max Volume Contraction */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Max Base Vol vs 50d SMA ({maxPpVolRatioFilter.toFixed(2)}x):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="range"
                          min="0.2"
                          max="1.5"
                          step="0.05"
                          value={maxPpVolRatioFilter}
                          onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                          style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                        />
                        <input 
                          type="number"
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          value={maxPpVolRatioFilter}
                          onChange={(e) => setMaxPpVolRatioFilter(parseFloat(e.target.value) || 0)}
                          style={{ width: '55px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                        />
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
                    <th>Price</th>
                    <th>Vol 50d MA</th>
                    {selectedStrategy === 'powerplay' ? (
                      <>
                        <th>Run Up %</th>
                        <th>Drawdown %</th>
                        <th>Vol vs SMA</th>
                      </>
                    ) : (
                      <>
                        <th>RS Score</th>
                        <th>RS Percentile</th>
                        <th>ADR (20d)</th>
                        <th>EPS QoQ Growth</th>
                        <th>Report Qtr</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, i) => (
                    <tr key={i} onClick={() => handleSelectStock(c)}>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{c.symbol}</td>
                      <td>${c.close.toFixed(2)}</td>
                      <td>{c.vol_50d_ma.toLocaleString()}</td>
                      {selectedStrategy === 'powerplay' ? (
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
                      ) : (
                        <>
                          <td>{c.rs_score.toFixed(4)}</td>
                          <td>
                            <span className="pill pill-success">{c.rs_rank}</span>
                          </td>
                          <td style={{ fontWeight: '500' }}>
                            {c.adr_20d !== null && c.adr_20d !== undefined ? `${c.adr_20d.toFixed(2)}%` : 'N/A'}
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
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={selectedStrategy === 'powerplay' ? 6 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No candidates matching current config rules found in database cache. Run "Sync Database Tickers" to evaluate stocks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inspector' && (
          <div>
            <div className="header-section">
              <div className="header-title">
                <h1>Stock Inspector</h1>
                <p>Inspect daily charts and EPS history for any stock in the database</p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: '12px', margin: 0 }}>
                <span style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>Search Ticker:</span>
                <input 
                  ref={inspectorInputRef}
                  type="text"
                  placeholder="e.g. AAPL, LESL, NVDA"
                  value={inspectorSymbol}
                  onChange={(e) => setInspectorSymbol(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInspectorSearch(inspectorSymbol);
                    }
                  }}
                  style={{ flex: 1, textTransform: 'uppercase' }}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => handleInspectorSearch(inspectorSymbol)}
                disabled={searchingInspector}
              >
                {searchingInspector ? 'Searching...' : 'Inspect Ticker'}
              </button>
            </div>

            {/* Error alerts */}
            {inspectorError && (
              <div className="query-alert alert-danger" style={{ marginBottom: '24px' }}>
                {inspectorError}
              </div>
            )}

            {/* Inspected Stock details */}
            {inspectorDetail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Meta details */}
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '26px', color: 'var(--accent-color)', fontWeight: '700' }}>
                      {inspectorDetail.metadata.symbol}
                    </h2>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      {inspectorDetail.metadata.name || 'Company Name Not Available'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="pill pill-success" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)' }}>
                      RS Percentile: {inspectorDetail.rs_rank !== null ? inspectorDetail.rs_rank : 'N/A'}
                    </span>
                    <span className="pill pill-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning)' }}>
                      ADR (20d): {inspectorDetail.adr_20d !== null && inspectorDetail.adr_20d !== undefined ? `${inspectorDetail.adr_20d.toFixed(2)}%` : 'N/A'}
                    </span>
                    <span className="pill pill-primary" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)' }}>
                      RS Score: {inspectorDetail.rs_score !== null ? inspectorDetail.rs_score.toFixed(4) : 'N/A'}
                    </span>
                    <span className="pill pill-secondary">Exchange: {inspectorDetail.metadata.exchange}</span>
                    <span className="pill pill-secondary">Asset: {inspectorDetail.metadata.asset_type}</span>
                  </div>
                </div>

                {/* Grid layout for Financials and Chart (Fundamentals ON TOP) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                  {/* Financials Table */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quarterly Fundamental Earnings Acceleration (EPS History)</h3>
                    <div className="table-container" style={{ margin: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Report Quarter</th>
                            <th>Report Date</th>
                            <th>Diluted EPS</th>
                            <th>EPS QoQ Growth</th>
                            <th>Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectorDetail.fundamentals.map((f, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 'bold' }}>{f.fiscal_quarter}</td>
                              <td>{f.report_date || 'N/A'}</td>
                              <td>${f.eps_diluted !== null && f.eps_diluted !== undefined ? f.eps_diluted.toFixed(2) : 'N/A'}</td>
                              <td style={{ color: f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined ? (f.eps_qoq_growth >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-secondary)' }}>
                                {f.eps_qoq_growth !== null && f.eps_qoq_growth !== undefined ? `${f.eps_qoq_growth >= 0 ? '+' : ''}${f.eps_qoq_growth.toFixed(1)}%` : 'N/A'}
                              </td>
                              <td>{f.total_revenue ? `$${(f.total_revenue / 1000000).toFixed(1)}M` : 'N/A'}</td>
                            </tr>
                          ))}
                          {inspectorDetail.fundamentals.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No quarterly statements cached for this stock.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Candlestick chart */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Candlestick Price Chart (Daily Bars)</h3>
                    <div style={{ height: '600px', overflow: 'hidden' }}>
                      {inspectorPrices.length > 0 ? (
                        <CandlestickChart data={inspectorPrices} height={540} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                          No historical price bars available for charting.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="sql-console">
            <div className="header-section">
              <div className="header-title">
                <h1>SQL Query Console</h1>
                <p>Run custom analytical queries directly on your DuckDB database</p>
              </div>
            </div>

            <div className="glass-card">
              <textarea 
                className="sql-textarea"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={handleRunSQL} disabled={loadingSql}>
                  {loadingSql ? 'Executing Query...' : 'Run Query'}
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ⚠️ Database connection is strictly <strong>Read-Only</strong>. Writes (DROP, DELETE, UPDATE) are blocked.
                </span>
              </div>
            </div>

            {/* SQL Results */}
            {sqlResult && (
              <div className="glass-card" style={{ overflowX: 'auto' }}>
                {sqlResult.error ? (
                  <div className="query-alert alert-danger">
                    <strong>SQL execution failed:</strong>
                    <span>{sqlResult.error}</span>
                  </div>
                ) : (
                  <div>
                    <div className="query-alert alert-info" style={{ marginBottom: '16px' }}>
                      Query returned {sqlResult.count} row(s) successfully.
                    </div>
                    <div className="table-container" style={{ margin: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            {sqlResult.columns.map((col, idx) => <th key={idx}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {row.map((cell, cellIdx) => <td key={cellIdx}>{cell === null ? 'NULL' : cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="header-section">
              <div className="header-title">
                <h1>Screener Configurations</h1>
                <p>Configure momentum thresholds, exchanges, and data providers</p>
              </div>
            </div>

            <div className="glass-card">
              <form onSubmit={handleSaveConfig} className="form-grid">
                <div className="form-group">
                  <label>Primary / Fundamental Data Provider</label>
                  <select 
                    value={config.provider_selected} 
                    onChange={(e) => setConfig({ ...config, provider_selected: e.target.value })}
                  >
                    <option value="YFINANCE">Yahoo Finance (Free & No Limits)</option>
                    <option value="IBKR">Interactive Brokers (Workstation connection)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price Ingestion Provider</label>
                  <select 
                    value={config.price_provider_selected} 
                    onChange={(e) => setConfig({ ...config, price_provider_selected: e.target.value })}
                  >
                    <option value="YFINANCE">Yahoo Finance (Recommended: Multi-threaded & Fast)</option>
                    <option value="IBKR">Interactive Brokers (Sequential & Rate Limited)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum Stock Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={config.min_price}
                    onChange={(e) => setConfig({ ...config, min_price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum 50-day SMA Volume</label>
                  <input 
                    type="number" 
                    value={config.min_volume_sma_50}
                    onChange={(e) => setConfig({ ...config, min_volume_sma_50: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Minervini Min RS Percentile Rank (70 = Top 30%)</label>
                  <input 
                    type="number" 
                    value={config.min_rs_percentile}
                    onChange={(e) => setConfig({ ...config, min_rs_percentile: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum QoQ EPS Growth (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={config.min_eps_growth_qoq}
                    onChange={(e) => setConfig({ ...config, min_eps_growth_qoq: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary">Save Configurations</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Stock Detail Side-drawer Panel */}
      {selectedStock && (
        <div className="drawer-backdrop" onClick={() => setSelectedStock(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2 style={{ fontSize: '24px', color: 'var(--accent-color)', display: 'inline' }}>{selectedStock.symbol}</h2>
                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '15px' }}>
                  {stockDetail?.metadata?.name || 'Loading Ticker Metadata...'}
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Exchange: {stockDetail?.metadata?.exchange || 'N/A'} | Asset Type: {stockDetail?.metadata?.asset_type || 'N/A'}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span className="pill pill-success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    RS Rank: {stockDetail?.rs_rank !== null && stockDetail?.rs_rank !== undefined ? stockDetail.rs_rank : 'N/A'}
                  </span>
                  <span className="pill pill-warning" style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning)' }}>
                    ADR (20d): {stockDetail?.adr_20d !== null && stockDetail?.adr_20d !== undefined ? `${stockDetail.adr_20d.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedStock(null)}>&times;</button>
            </div>

            <div style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSelectedStock(null);
                  setActiveTab('inspector');
                  setInspectorSymbol(selectedStock.symbol);
                  handleInspectorSearch(selectedStock.symbol);
                }}
                style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
              >
                🔍 Open in Full Stock Inspector
              </button>
            </div>

            {/* Candlestick chart rendering */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Candlestick Price Chart (Daily Bars)</h3>
              <div className="glass-card" style={{ padding: '16px', height: '312px', overflow: 'hidden' }}>
                {stockPrices.length > 0 ? (
                  <CandlestickChart data={stockPrices} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    Loading historical pricing candles...
                  </div>
                )}
              </div>
            </div>

            {/* Fundamentals display */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Quarterly Fundamental Earnings Acceleration</h3>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report Quarter</th>
                      <th>Diluted EPS</th>
                      <th>EPS QoQ Growth</th>
                      <th>Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockDetail?.fundamentals.map((f, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{f.fiscal_quarter}</td>
                        <td>${f.eps_diluted.toFixed(2)}</td>
                        <td style={{ color: f.eps_qoq_growth >= 0 ? 'var(--accent-success)' : f.eps_qoq_growth < 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                          {f.eps_qoq_growth !== null ? `${f.eps_qoq_growth >= 0 ? '+' : ''}${f.eps_qoq_growth.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td>{f.total_revenue ? `$${(f.total_revenue / 1000000).toFixed(1)}M` : 'N/A'}</td>
                      </tr>
                    ))}
                    {!stockDetail && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Loading historical quarterly statements...
                        </td>
                      </tr>
                    )}
                    {stockDetail && stockDetail.fundamentals.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No fundamentals cached. Ticker was not in the top RS candidates during the last data sync.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
