import React, { useState, useEffect, useRef } from 'react';
import { filterCandidates } from './utils/filter';
import DashboardTab from './components/DashboardTab';
import CandidatesTab from './components/CandidatesTab';
import InspectorTab from './components/InspectorTab';
import SqlConsoleTab from './components/SqlConsoleTab';
import SettingsTab from './components/SettingsTab';
import MarketMonitorTab from './components/MarketMonitorTab';
import SectorCompareTab from './components/SectorCompareTab';
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
  const [enableDarvasBox, setEnableDarvasBox] = useState(false);
  const [enableNewLeaders, setEnableNewLeaders] = useState(false);
  const [enableQullamaggieBreakout, setEnableQullamaggieBreakout] = useState(false);
  const [enableEpisodicPivot, setEnableEpisodicPivot] = useState(false);
  const [enableParabolicShort, setEnableParabolicShort] = useState(false);
  const [enableParabolicLong, setEnableParabolicLong] = useState(false);

  // Qullamaggie setup inputs
  const [min1mRetFilter, setMin1mRetFilter] = useState(20.0);
  const [enable1mRet, setEnable1mRet] = useState(true);
  const [enableEmaSurfing, setEnableEmaSurfing] = useState(true);

  const [minEpGapFilter, setMinEpGapFilter] = useState(8.0);
  const [enableEpGap, setEnableEpGap] = useState(true);
  const [minEpRelVolFilter, setMinEpRelVolFilter] = useState(2.5);
  const [enableEpRelVol, setEnableEpRelVol] = useState(true);
  const [enableEpFlag, setEnableEpFlag] = useState(true);

  const [minParabolicRunupFilter, setMinParabolicRunupFilter] = useState(40.0);
  const [enableParabolicRunup, setEnableParabolicRunup] = useState(true);
  const [minParabolicEmaDistFilter, setMinParabolicEmaDistFilter] = useState(18.0);
  const [enableParabolicEmaDist, setEnableParabolicEmaDist] = useState(true);

  // Optional filter checkbox states
  const [enablePpRunup, setEnablePpRunup] = useState(true);
  const [enablePpDrawdown, setEnablePpDrawdown] = useState(true);
  const [enablePpDaysSincePeak, setEnablePpDaysSincePeak] = useState(true);
  const [enablePpVolRatio, setEnablePpVolRatio] = useState(false);

  const [enableIpoAge, setEnableIpoAge] = useState(true);
  const [enableIpoDist, setEnableIpoDist] = useState(true);
  const [enableIpoDepth, setEnableIpoDepth] = useState(true);

  const [enableVcpEpsGrowth, setEnableVcpEpsGrowth] = useState(true);
  const [enableVcpRsPercentile, setEnableVcpRsPercentile] = useState(true);
  const [enableVcpPattern, setEnableVcpPattern] = useState(true);

  const [enableDarvasPattern, setEnableDarvasPattern] = useState(true);
  const [enableDarvasWidth, setEnableDarvasWidth] = useState(true);

  const [enableRsNewHigh, setEnableRsNewHigh] = useState(false);

  const [enableAtr, setEnableAtr] = useState(false);

  // New Leaders optional filter checkboxes
  const [enable52wDist, setEnable52wDist] = useState(true);
  const [enableSurgeOffLow, setEnableSurgeOffLow] = useState(true);
  const [enableNewLeadersRs, setEnableNewLeadersRs] = useState(true);
  const [enableNewLeaders52wHigh, setEnableNewLeaders52wHigh] = useState(false);
  const [enableNewLeadersBase, setEnableNewLeadersBase] = useState(true);

  // Power play inputs
  const [minPpRunupFilter, setMinPpRunupFilter] = useState(100.0);
  const [maxPpDrawdownFilter, setMaxPpDrawdownFilter] = useState(25.0);
  const [minPpDaysSincePeakFilter, setMinPpDaysSincePeakFilter] = useState(12);
  const [maxPpVolRatioFilter, setMaxPpVolRatioFilter] = useState(0.5);

  // IPO base inputs
  const [maxIpoAgeFilter, setMaxIpoAgeFilter] = useState(350);
  const [maxIpoDistFilter, setMaxIpoDistFilter] = useState(25.0);
  const [maxIpoDepthFilter, setMaxIpoDepthFilter] = useState(35.0);

  // Darvas Box inputs
  const [maxDarvasWidthFilter, setMaxDarvasWidthFilter] = useState(25.0);

  // New Leaders inputs
  const [max52wDistFilter, setMax52wDistFilter] = useState(25.0);
  const [minSurgeOffLowFilter, setMinSurgeOffLowFilter] = useState(20.0);
  const [minNewLeadersRsFilter, setMinNewLeadersRsFilter] = useState(80);

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
    enableDarvasBox,
    enableNewLeaders,
    enableQullamaggieBreakout,
    enableEpisodicPivot,
    enableParabolicShort,
    enableParabolicLong,
    minPpRunupFilter,
    maxPpDrawdownFilter,
    minPpDaysSincePeakFilter,
    maxPpVolRatioFilter,
    maxIpoAgeFilter,
    maxIpoDistFilter,
    maxIpoDepthFilter,
    maxDarvasWidthFilter,
    max52wDistFilter,
    minSurgeOffLowFilter,
    minNewLeadersRsFilter,
    min1mRetFilter,
    enable1mRet,
    enableEmaSurfing,
    minEpGapFilter,
    enableEpGap,
    minEpRelVolFilter,
    enableEpRelVol,
    enableEpFlag,
    minParabolicRunupFilter,
    enableParabolicRunup,
    minParabolicEmaDistFilter,
    enableParabolicEmaDist,
    // Optional checkbox states
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
    enable52wDist,
    enableSurgeOffLow,
    enableNewLeadersRs,
    enableNewLeaders52wHigh,
    enableNewLeadersBase,
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
            className={`nav-item ${activeTab === 'market-monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('market-monitor')}
          >
            Market Monitor
          </li>
          <li
            className={`nav-item ${activeTab === 'sector-compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('sector-compare')}
          >
            Sector Compare
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

        {activeTab === 'market-monitor' && (
          <MarketMonitorTab />
        )}

        {activeTab === 'sector-compare' && (
          <SectorCompareTab onSelectStock={handleSelectStock} />
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
            enableDarvasBox={enableDarvasBox}
            setEnableDarvasBox={setEnableDarvasBox}
            enableNewLeaders={enableNewLeaders}
            setEnableNewLeaders={setEnableNewLeaders}
            enableQullamaggieBreakout={enableQullamaggieBreakout}
            setEnableQullamaggieBreakout={setEnableQullamaggieBreakout}
            enableEpisodicPivot={enableEpisodicPivot}
            setEnableEpisodicPivot={setEnableEpisodicPivot}
            enableParabolicShort={enableParabolicShort}
            setEnableParabolicShort={setEnableParabolicShort}
            enableParabolicLong={enableParabolicLong}
            setEnableParabolicLong={setEnableParabolicLong}
            min1mRetFilter={min1mRetFilter}
            setMin1mRetFilter={setMin1mRetFilter}
            enable1mRet={enable1mRet}
            setEnable1mRet={setEnable1mRet}
            enableEmaSurfing={enableEmaSurfing}
            setEnableEmaSurfing={setEnableEmaSurfing}
            minEpGapFilter={minEpGapFilter}
            setMinEpGapFilter={setMinEpGapFilter}
            enableEpGap={enableEpGap}
            setEnableEpGap={setEnableEpGap}
            minEpRelVolFilter={minEpRelVolFilter}
            setMinEpRelVolFilter={setMinEpRelVolFilter}
            enableEpRelVol={enableEpRelVol}
            setEnableEpRelVol={setEnableEpRelVol}
            enableEpFlag={enableEpFlag}
            setEnableEpFlag={setEnableEpFlag}
            minParabolicRunupFilter={minParabolicRunupFilter}
            setMinParabolicRunupFilter={setMinParabolicRunupFilter}
            enableParabolicRunup={enableParabolicRunup}
            setEnableParabolicRunup={setEnableParabolicRunup}
            minParabolicEmaDistFilter={minParabolicEmaDistFilter}
            setMinParabolicEmaDistFilter={setMinParabolicEmaDistFilter}
            enableParabolicEmaDist={enableParabolicEmaDist}
            setEnableParabolicEmaDist={setEnableParabolicEmaDist}
            minPpRunupFilter={minPpRunupFilter}
            setMinPpRunupFilter={setMinPpRunupFilter}
            maxPpDrawdownFilter={maxPpDrawdownFilter}
            setMaxPpDrawdownFilter={setMaxPpDrawdownFilter}
            minPpDaysSincePeakFilter={minPpDaysSincePeakFilter}
            setMinPpDaysSincePeakFilter={setMinPpDaysSincePeakFilter}
            maxPpVolRatioFilter={maxPpVolRatioFilter}
            setMaxPpVolRatioFilter={setMaxPpVolRatioFilter}
            maxIpoAgeFilter={maxIpoAgeFilter}
            setMaxIpoAgeFilter={setMaxIpoAgeFilter}
            maxIpoDistFilter={maxIpoDistFilter}
            setMaxIpoDistFilter={setMaxIpoDistFilter}
            maxIpoDepthFilter={maxIpoDepthFilter}
            setMaxIpoDepthFilter={setMaxIpoDepthFilter}
            maxDarvasWidthFilter={maxDarvasWidthFilter}
            setMaxDarvasWidthFilter={setMaxDarvasWidthFilter}
            max52wDistFilter={max52wDistFilter}
            setMax52wDistFilter={setMax52wDistFilter}
            minSurgeOffLowFilter={minSurgeOffLowFilter}
            setMinSurgeOffLowFilter={setMinSurgeOffLowFilter}
            minNewLeadersRsFilter={minNewLeadersRsFilter}
            setMinNewLeadersRsFilter={setMinNewLeadersRsFilter}
            // Optional checkbox states & setters
            enablePpRunup={enablePpRunup}
            setEnablePpRunup={setEnablePpRunup}
            enablePpDrawdown={enablePpDrawdown}
            setEnablePpDrawdown={setEnablePpDrawdown}
            enablePpDaysSincePeak={enablePpDaysSincePeak}
            setEnablePpDaysSincePeak={setEnablePpDaysSincePeak}
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
            enableDarvasPattern={enableDarvasPattern}
            setEnableDarvasPattern={setEnableDarvasPattern}
            enableDarvasWidth={enableDarvasWidth}
            setEnableDarvasWidth={setEnableDarvasWidth}
            enableRsNewHigh={enableRsNewHigh}
            setEnableRsNewHigh={setEnableRsNewHigh}
            enableAtr={enableAtr}
            setEnableAtr={setEnableAtr}
            enable52wDist={enable52wDist}
            setEnable52wDist={setEnable52wDist}
            enableSurgeOffLow={enableSurgeOffLow}
            setEnableSurgeOffLow={setEnableSurgeOffLow}
            enableNewLeadersRs={enableNewLeadersRs}
            setEnableNewLeadersRs={setEnableNewLeadersRs}
            enableNewLeaders52wHigh={enableNewLeaders52wHigh}
            setEnableNewLeaders52wHigh={setEnableNewLeaders52wHigh}
            enableNewLeadersBase={enableNewLeadersBase}
            setEnableNewLeadersBase={setEnableNewLeadersBase}
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
