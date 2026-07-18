import React, { useState, useEffect, useRef } from 'react';
import { filterCandidates } from './utils/filter';
import DashboardTab from './components/DashboardTab';
import CandidatesTab from './components/CandidatesTab';
import InspectorTab from './components/InspectorTab';
import SqlConsoleTab from './components/SqlConsoleTab';
import SettingsTab from './components/SettingsTab';
import StockDetailDrawer from './components/StockDetailDrawer';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState({
    min_price: 5.0,
    min_volume_sma_50: 300000,
    min_rs_percentile: 70,
    min_eps_growth_qoq: 20.0,
    provider_selected: 'YFINANCE',
    price_provider_selected: 'YFINANCE'
  });

  // Database ingestion flags & logs tracking
  const [syncPrices, setSyncPrices] = useState(true);
  const [syncFundamentals, setSyncFundamentals] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    status: 'idle',
    start_time: null,
    end_time: null,
    log_output: '',
    error_message: null
  });

  // Modal Detail state
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetail, setStockDetail] = useState(null);
  const [stockPrices, setStockPrices] = useState([]);

  // SQL console inputs
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM symbols LIMIT 10;');
  const [sqlResult, setSqlResult] = useState(null);
  const [loadingSql, setLoadingSql] = useState(false);

  // Candidates filter configurations states
  const [minRsFilter, setMinRsFilter] = useState(70);
  const [minEpsGrowthFilter, setMinEpsGrowthFilter] = useState(20.0);
  const [minPriceFilter, setMinPriceFilter] = useState(5.00);
  const [minVolFilter, setMinVolFilter] = useState(300000);
  const [minAtrFilter, setMinAtrFilter] = useState(0.0);
  const [enforceStage2, setEnforceStage2] = useState(true);
  const [enablePowerPlay, setEnablePowerPlay] = useState(false);
  const [enableIpoBase, setEnableIpoBase] = useState(false);
  const [enableVcpSetup, setEnableVcpSetup] = useState(false);

  // Optional filter checkbox states
  const [enablePpRunup, setEnablePpRunup] = useState(true);
  const [enablePpDrawdown, setEnablePpDrawdown] = useState(true);
  const [enablePpVolRatio, setEnablePpVolRatio] = useState(false);

  const [enableIpoAge, setEnableIpoAge] = useState(true);
  const [enableIpoDist, setEnableIpoDist] = useState(true);
  const [enableIpoDepth, setEnableIpoDepth] = useState(true);

  const [enableVcpEpsGrowth, setEnableVcpEpsGrowth] = useState(true);
  const [enableVcpRsPercentile, setEnableVcpRsPercentile] = useState(true);
  const [enableVcpPattern, setEnableVcpPattern] = useState(true);
  const [enableRsNewHigh, setEnableRsNewHigh] = useState(false);

  const [enableAtr, setEnableAtr] = useState(false);

  // Power play inputs
  const [minPpRunupFilter, setMinPpRunupFilter] = useState(100.0);
  const [maxPpDrawdownFilter, setMaxPpDrawdownFilter] = useState(25.0);
  const [maxPpVolRatioFilter, setMaxPpVolRatioFilter] = useState(0.5);

  // IPO base inputs
  const [maxIpoAgeFilter, setMaxIpoAgeFilter] = useState(350);
  const [maxIpoDistFilter, setMaxIpoDistFilter] = useState(25.0);
  const [maxIpoDepthFilter, setMaxIpoDepthFilter] = useState(35.0);

  // Full inspector state
  const [inspectorSymbol, setInspectorSymbol] = useState('');
  const [searchingInspector, setSearchingInspector] = useState(false);
  const [inspectorError, setInspectorError] = useState(null);
  const [inspectorDetail, setInspectorDetail] = useState(null);
  const [inspectorPrices, setInspectorPrices] = useState([]);

  // References
  const inspectorInputRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Fetch summary counts
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
      const res = await fetch(`${API_BASE}/api/sync/status`);
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
  }, []);

  // Monitor sync updates
  useEffect(() => {
    if (syncStatus.status === 'running') {
      if (!syncIntervalRef.current) {
        syncIntervalRef.current = setInterval(fetchSyncStatus, 1500);
      }
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
        // Re-fetch datasets upon completion
        fetchSummary();
        fetchCandidates();
      }
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncStatus.status]);

  // Save configurations
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert("Configuration parameters updated and saved successfully!");
        fetchConfig();
      }
    } catch (err) {
      console.error("Error saving config: ", err);
    }
  };

  // Trigger sync run
  const handleTriggerSync = async () => {
    try {
      await fetch(`${API_BASE}/api/sync/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skip_prices: !syncPrices,
          skip_fundamentals: !syncFundamentals
        })
      });
      fetchSyncStatus();
    } catch (e) {
      console.error("Error triggering sync run: ", e);
    }
  };

  // Select stock for drawer detail
  const handleSelectStock = async (stock) => {
    setSelectedStock(stock);
    setStockDetail(null);
    setStockPrices([]);
    try {
      const detailRes = await fetch(`${API_BASE}/api/stocks/${stock.symbol}`);
      const detailData = await detailRes.json();
      setStockDetail(detailData);

      const prRes = await fetch(`${API_BASE}/api/stocks/${stock.symbol}/prices`);
      const prData = await prRes.json();
      setStockPrices(prData);
    } catch (e) {
      console.error("Error fetching stock details: ", e);
    }
  };

  // Search full details for inspector
  const handleInspectorSearch = async (symbol) => {
    if (!symbol || symbol.trim() === '') return;
    const cleanSym = symbol.trim().toUpperCase();
    setSearchingInspector(true);
    setInspectorError(null);
    setInspectorDetail(null);
    setInspectorPrices([]);

    try {
      const res = await fetch(`${API_BASE}/api/stocks/${cleanSym}`);
      if (res.status === 404) {
        setInspectorError(`Symbol ${cleanSym} not found in database. Please run a sync search or check ticker directory.`);
        setSearchingInspector(false);
        return;
      }
      const data = await res.json();
      setInspectorDetail(data);

      const prRes = await fetch(`${API_BASE}/api/stocks/${cleanSym}/prices`);
      const prData = await prRes.json();
      setInspectorPrices(prData);
    } catch (e) {
      setInspectorError(`Error loading details for ${cleanSym}: ${e.message}`);
    } finally {
      setSearchingInspector(false);
    }
  };

  // Run custom SQL console query
  const handleRunSQL = async () => {
    if (!sqlQuery || sqlQuery.trim() === '') return;
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
      setSqlResult({ error: e.message });
    } finally {
      setLoadingSql(false);
    }
  };

  // Compute filtered candidates list dynamically using filters utility helper
  const activeFilters = {
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
    // Optional checkbox states
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
  };
  const filteredCandidates = filterCandidates(candidates, activeFilters);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar-nav">
        <div className="brand">
          <span style={{ fontSize: '20px' }}>🛸</span>
          <span>PivotTrader</span>
        </div>
        <ul className="nav-menu">
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
        {activeTab === 'dashboard' && (
          <DashboardTab
            syncPrices={syncPrices}
            setSyncPrices={setSyncPrices}
            syncFundamentals={syncFundamentals}
            setSyncFundamentals={setSyncFundamentals}
            syncStatus={syncStatus}
            handleTriggerSync={handleTriggerSync}
            summary={summary}
          />
        )}

        {activeTab === 'candidates' && (
          <CandidatesTab
            candidates={candidates}
            filteredCandidates={filteredCandidates}
            minPriceFilter={minPriceFilter}
            setMinPriceFilter={setMinPriceFilter}
            minVolFilter={minVolFilter}
            setMinVolFilter={setMinVolFilter}
            minRsFilter={minRsFilter}
            setMinRsFilter={setMinRsFilter}
            minEpsGrowthFilter={minEpsGrowthFilter}
            setMinEpsGrowthFilter={setMinEpsGrowthFilter}
            minAtrFilter={minAtrFilter}
            setMinAtrFilter={setMinAtrFilter}
            enforceStage2={enforceStage2}
            setEnforceStage2={setEnforceStage2}
            enablePowerPlay={enablePowerPlay}
            setEnablePowerPlay={setEnablePowerPlay}
            enableIpoBase={enableIpoBase}
            setEnableIpoBase={setEnableIpoBase}
            enableVcpSetup={enableVcpSetup}
            setEnableVcpSetup={setEnableVcpSetup}
            minPpRunupFilter={minPpRunupFilter}
            setMinPpRunupFilter={setMinPpRunupFilter}
            maxPpDrawdownFilter={maxPpDrawdownFilter}
            setMaxPpDrawdownFilter={setMaxPpDrawdownFilter}
            maxPpVolRatioFilter={maxPpVolRatioFilter}
            setMaxPpVolRatioFilter={setMaxPpVolRatioFilter}
            maxIpoAgeFilter={maxIpoAgeFilter}
            setMaxIpoAgeFilter={setMaxIpoAgeFilter}
            maxIpoDistFilter={maxIpoDistFilter}
            setMaxIpoDistFilter={setMaxIpoDistFilter}
            maxIpoDepthFilter={maxIpoDepthFilter}
            setMaxIpoDepthFilter={setMaxIpoDepthFilter}
            // Optional checkbox states & setters
            enablePpRunup={enablePpRunup}
            setEnablePpRunup={setEnablePpRunup}
            enablePpDrawdown={enablePpDrawdown}
            setEnablePpDrawdown={setEnablePpDrawdown}
            enablePpVolRatio={enablePpVolRatio}
            setEnablePpVolRatio={setEnablePpVolRatio}
            enableIpoAge={enableIpoAge}
            setEnableIpoAge={setEnableIpoAge}
            enableIpoDist={enableIpoDist}
            setEnableIpoDist={setEnableIpoDist}
            enableIpoDepth={enableIpoDepth}
            setEnableIpoDepth={setEnableIpoDepth}
            enableVcpEpsGrowth={enableVcpEpsGrowth}
            setEnableVcpEpsGrowth={setEnableVcpEpsGrowth}
            enableVcpRsPercentile={enableVcpRsPercentile}
            setEnableVcpRsPercentile={setEnableVcpRsPercentile}
            enableVcpPattern={enableVcpPattern}
            setEnableVcpPattern={setEnableVcpPattern}
            enableRsNewHigh={enableRsNewHigh}
            setEnableRsNewHigh={setEnableRsNewHigh}
            enableAtr={enableAtr}
            setEnableAtr={setEnableAtr}
            handleSelectStock={handleSelectStock}
          />
        )}

        {activeTab === 'inspector' && (
          <InspectorTab
            inspectorSymbol={inspectorSymbol}
            setInspectorSymbol={setInspectorSymbol}
            searchingInspector={searchingInspector}
            inspectorError={inspectorError}
            inspectorDetail={inspectorDetail}
            inspectorPrices={inspectorPrices}
            handleInspectorSearch={handleInspectorSearch}
            inspectorInputRef={inspectorInputRef}
          />
        )}

        {activeTab === 'sql' && (
          <SqlConsoleTab
            sqlQuery={sqlQuery}
            setSqlQuery={setSqlQuery}
            loadingSql={loadingSql}
            sqlResult={sqlResult}
            handleRunSQL={handleRunSQL}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            config={config}
            setConfig={setConfig}
            handleSaveConfig={handleSaveConfig}
          />
        )}
      </div>

      {/* Stock Detail Side-drawer Panel */}
      <StockDetailDrawer
        selectedStock={selectedStock}
        setSelectedStock={setSelectedStock}
        stockDetail={stockDetail}
        stockPrices={stockPrices}
        setActiveTab={setActiveTab}
        setInspectorSymbol={setInspectorSymbol}
        handleInspectorSearch={handleInspectorSearch}
      />
    </div>
  );
}

export default App;
