import React, { useState, useEffect, useRef } from 'react';
import DashboardTab from './components/DashboardTab';
import CandidatesTab from './components/CandidatesTab';
import InspectorTab from './components/InspectorTab';
import SqlConsoleTab from './components/SqlConsoleTab';
import SettingsTab from './components/SettingsTab';
import MarketMonitorTab from './components/MarketMonitorTab';
import SectorCompareTab from './components/SectorCompareTab';
import StockDetailDrawer from './components/StockDetailDrawer';
import WatchlistsTab from './components/WatchlistsTab';
import SetupsAndRulesTab from './components/SetupsAndRulesTab';


const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [summary, setSummary] = useState(null);
  const [watchlists, setWatchlists] = useState([]);
  const [tradingDates, setTradingDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const fetchWatchlists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists`);
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data);
      }
    } catch (e) {
      console.error("Error fetching watchlists:", e);
    }
  };

  const fetchTradingDates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trading-dates`);
      if (res.ok) {
        const data = await res.json();
        setTradingDates(data);
      }
    } catch (e) {
      console.error("Error fetching trading dates: ", e);
    }
  };


  useEffect(() => {
    fetchWatchlists();
  }, []);
  const [config, setConfig] = useState({
    min_price: 5.0,
    min_volume_sma_50: 100000,
    min_rs_percentile: 70,
    min_eps_growth_qoq: 20.0,
    provider_selected: 'YFINANCE',
    price_provider_selected: 'YFINANCE'
  });

  // Database ingestion flags & logs tracking
  const [syncPrices, setSyncPrices] = useState(true);
  const [syncFundamentals, setSyncFundamentals] = useState(false);
  const [syncPremarket, setSyncPremarket] = useState(false);
  const [syncHistoryYears, setSyncHistoryYears] = useState(5);
  const [syncForceFull, setSyncForceFull] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    status: 'idle',
    start_time: null,
    end_time: null,
    log_output: '',
    error_message: null
  });

  // Modal Detail state
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeStockList, setActiveStockList] = useState([]);
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
  const [minVolFilter, setMinVolFilter] = useState(100000);
  const [minAtrFilter, setMinAtrFilter] = useState(0.0);
  const [enforceStage2, setEnforceStage2] = useState(false);
  const [enablePowerPlay, setEnablePowerPlay] = useState(true);
  const [enableIpoBase, setEnableIpoBase] = useState(false);
  const [enableVcpSetup, setEnableVcpSetup] = useState(false);
  const [enableDarvasBox, setEnableDarvasBox] = useState(false);
  const [enableNewLeaders, setEnableNewLeaders] = useState(false);
  const [enableQullamaggieBreakout, setEnableQullamaggieBreakout] = useState(false);
  const [enableEpisodicPivot, setEnableEpisodicPivot] = useState(false);
  const [enableParabolicClimax, setEnableParabolicClimax] = useState(false);
  const [enableParabolicShort, setEnableParabolicShort] = useState(false);
  const [enableParabolicLong, setEnableParabolicLong] = useState(false);

  // Qullamaggie setup inputs
  const [min1mRetFilter, setMin1mRetFilter] = useState(20.0);
  const [enable1mRet, setEnable1mRet] = useState(true);
  const [enableEmaSurfing, setEnableEmaSurfing] = useState(true);

  const [minEpGapFilter, setMinEpGapFilter] = useState(10.0);
  const [enableEpGap, setEnableEpGap] = useState(true);
  const [minEpRelVolFilter, setMinEpRelVolFilter] = useState(2.5);
  const [enableEpRelVol, setEnableEpRelVol] = useState(true);
  const [enableEpFlag, setEnableEpFlag] = useState(true);

  const [minParabolicRunupFilter, setMinParabolicRunupFilter] = useState(40.0);
  const [enableParabolicRunup, setEnableParabolicRunup] = useState(true);
  const [minParabolicEmaDistFilter, setMinParabolicEmaDistFilter] = useState(18.0);
  const [enableParabolicEmaDist, setEnableParabolicEmaDist] = useState(true);
  const [minParabolicUpDaysFilter, setMinParabolicUpDaysFilter] = useState(3);
  const [enableParabolicUpDays, setEnableParabolicUpDays] = useState(true);


  // Optional filter checkbox states
  const [enablePpRunup, setEnablePpRunup] = useState(true);
  const [enablePpDrawdown, setEnablePpDrawdown] = useState(true);
  const [enablePpDaysSincePeak, setEnablePpDaysSincePeak] = useState(true);
  const [enablePpVolRatio, setEnablePpVolRatio] = useState(false);

  const [enableIpoAge, setEnableIpoAge] = useState(true);
  const [enableIpoDist, setEnableIpoDist] = useState(true);
  const [enableIpoDepth, setEnableIpoDepth] = useState(true);

  const [enableVcpEpsGrowth, setEnableVcpEpsGrowth] = useState(false);
  const [enableVcpPattern, setEnableVcpPattern] = useState(true);

  const [enableDarvasPattern, setEnableDarvasPattern] = useState(true);
  const [enableDarvasWidth, setEnableDarvasWidth] = useState(true);

  const [enableRs, setEnableRs] = useState(false);

  const [enableRsNewHigh, setEnableRsNewHigh] = useState(false);

  const [enableAtr, setEnableAtr] = useState(false);

  // Pivot Tightness (VDU) Filter
  const [enablePivotTightness, setEnablePivotTightness] = useState(false);
  const [maxPivotSpreadFilter, setMaxPivotSpreadFilter] = useState(8.0);
  const [maxPivotClusteringFilter, setMaxPivotClusteringFilter] = useState(3.0);
  const [maxPivotVolRatioFilter, setMaxPivotVolRatioFilter] = useState(0.8);

  // New Leaders optional filter checkboxes
  const [enable52wDist, setEnable52wDist] = useState(true);
  const [enableSurgeOffLow, setEnableSurgeOffLow] = useState(true);
  const [enableNewLeadersRs, setEnableNewLeadersRs] = useState(true);
  const [enableNewLeaders52wHigh, setEnableNewLeaders52wHigh] = useState(false);
  const [enableNewLeadersBase, setEnableNewLeadersBase] = useState(true);

  // Power play inputs
  const [minPpRunupFilter, setMinPpRunupFilter] = useState(100.0);
  const [maxPpDrawdownFilter, setMaxPpDrawdownFilter] = useState(25.0);
  const [minPpDaysSincePeakFilter, setMinPpDaysSincePeakFilter] = useState(10);
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
  const activeFiltersRef = useRef(null);

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

  // Fetch candidates from backend with server-side filtering
  const fetchCandidates = async (targetDt = selectedDate, currentFilters = null) => {
    setLoadingCandidates(true);
    try {
      const filtersToSend = currentFilters !== null ? currentFilters : activeFiltersRef.current;
      const payload = {
        date: targetDt && targetDt !== 'latest' ? targetDt : undefined,
        ...filtersToSend
      };
      const res = await fetch(`${API_BASE}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (e) {
      console.error("Error fetching candidates: ", e);
    } finally {
      setLoadingCandidates(false);
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
    fetchTradingDates();
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
          skip_prices: !syncPrices && !syncPremarket,
          skip_fundamentals: !syncFundamentals,
          include_premarket: syncPremarket,
          history_years: parseInt(syncHistoryYears, 10),
          force_full: syncForceFull
        })
      });
      fetchSyncStatus();
    } catch (e) {
      console.error("Error triggering sync run: ", e);
    }
  };

  // Select stock for drawer detail
  const handleSelectStock = async (stock, list = null) => {
    setSelectedStock(stock);
    if (list && Array.isArray(list) && list.length > 0) {
      setActiveStockList(list);
    }
    try {
      const [detailRes, prRes] = await Promise.all([
        fetch(`${API_BASE}/api/stocks/${stock.symbol}`),
        fetch(`${API_BASE}/api/stocks/${stock.symbol}/prices`)
      ]);
      const [detailData, prData] = await Promise.all([
        detailRes.json(),
        prRes.json()
      ]);
      setStockDetail(detailData);
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

  // Collect active filters for server-side screening
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
    enableParabolicClimax,
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
    minParabolicUpDaysFilter,
    enableParabolicUpDays,

    // Optional checkbox states
    enablePpRunup,
    enablePpDrawdown,
    enablePpDaysSincePeak,
    enablePpVolRatio,
    enableIpoAge,
    enableIpoDist,
    enableIpoDepth,
    enableVcpEpsGrowth,
    enableVcpPattern,
    enableDarvasPattern,
    enableDarvasWidth,
    enableRs,
    enableRsNewHigh,
    enableAtr,
    enablePivotTightness,
    maxPivotSpreadFilter,
    maxPivotClusteringFilter,
    maxPivotVolRatioFilter,
    enable52wDist,
    enableSurgeOffLow,
    enableNewLeadersRs,
    enableNewLeaders52wHigh,
    enableNewLeadersBase,
  };

  activeFiltersRef.current = activeFilters;
  const activeFiltersKey = JSON.stringify(activeFilters);

  // Debounced server-side candidate fetching when filters or selected date change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCandidates(selectedDate, activeFilters);
    }, 200);
    return () => clearTimeout(handler);
  }, [selectedDate, activeFiltersKey]);

  const filteredCandidates = candidates;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar-nav">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">⚡</div>
            <span className="brand-name">PivotTrader</span>
            <span className="brand-badge">PRO</span>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Overview</div>
            <ul className="nav-menu">
              <li
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="nav-item-content">
                  <span>📊</span>
                  <span>Dashboard</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Daily Routine</div>
            <ul className="nav-menu">
              {/* 1. Market Monitor */}
              <li
                className={`nav-item ${activeTab === 'market-monitor' ? 'active' : ''}`}
                onClick={() => setActiveTab('market-monitor')}
              >
                <div className="nav-item-content">
                  <span>📈</span>
                  <span>1. Market Monitor</span>
                </div>
              </li>

              {/* 2. Sector Compare */}
              <li
                className={`nav-item ${activeTab === 'sector-compare' ? 'active' : ''}`}
                onClick={() => setActiveTab('sector-compare')}
              >
                <div className="nav-item-content">
                  <span>🌐</span>
                  <span>2. Sector Compare</span>
                </div>
              </li>

              {/* 3. Stock Screen */}
              <li
                className={`nav-item ${activeTab === 'candidates' ? 'active' : ''}`}
                onClick={() => setActiveTab('candidates')}
              >
                <div className="nav-item-content">
                  <span>🎯</span>
                  <span>3. Stock Screen</span>
                </div>
                <span className="nav-badge emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {loadingCandidates && <span className="spin-icon" style={{ fontSize: '10px' }}>⟳</span>}
                  {filteredCandidates.length}
                </span>
              </li>

              {/* 4. Watchlists */}
              <li
                className={`nav-item ${activeTab === 'watchlists' ? 'active' : ''}`}
                onClick={() => setActiveTab('watchlists')}
              >
                <div className="nav-item-content">
                  <span>⭐️</span>
                  <span>4. My Watchlists</span>
                </div>
                <span className="nav-badge emerald">{watchlists.reduce((sum, w) => sum + (w.item_count || 0), 0)}</span>
              </li>

              {/* 5. Stock Inspector */}
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
                <div className="nav-item-content">
                  <span>🔍</span>
                  <span>5. Stock Inspector</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Tools & Config</div>
            <ul className="nav-menu">
              <li
                className={`nav-item ${activeTab === 'setups-rules' ? 'active' : ''}`}
                onClick={() => setActiveTab('setups-rules')}
              >
                <div className="nav-item-content">
                  <span>📖</span>
                  <span>Setups & Rules</span>
                </div>
              </li>
              <li
                className={`nav-item ${activeTab === 'sql' ? 'active' : ''}`}
                onClick={() => setActiveTab('sql')}
              >
                <div className="nav-item-content">
                  <span>💻</span>
                  <span>SQL Console</span>
                </div>
              </li>
              <li
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <div className="nav-item-content">
                  <span>⚙️</span>
                  <span>Configurations</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="user-profile">
          <div className="user-avatar">PT</div>
          <div className="user-info">
            <span className="user-name">Edge Trader</span>
            <span className="user-role">Live Account</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardTab
            syncPrices={syncPrices}
            setSyncPrices={setSyncPrices}
            syncFundamentals={syncFundamentals}
            setSyncFundamentals={setSyncFundamentals}
            syncPremarket={syncPremarket}
            setSyncPremarket={setSyncPremarket}
            syncHistoryYears={syncHistoryYears}
            setSyncHistoryYears={setSyncHistoryYears}
            syncForceFull={syncForceFull}
            setSyncForceFull={setSyncForceFull}
            syncStatus={syncStatus}
            handleTriggerSync={handleTriggerSync}
            summary={summary}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'market-monitor' && (
          <MarketMonitorTab />
        )}

        {activeTab === 'sector-compare' && (
          <SectorCompareTab onSelectStock={handleSelectStock} />
        )}

        {activeTab === 'watchlists' && (
          <WatchlistsTab
            handleSelectStock={handleSelectStock}
            watchlists={watchlists}
            fetchWatchlists={fetchWatchlists}
          />
        )}

        {activeTab === 'candidates' && (
          <CandidatesTab
            watchlists={watchlists}
            fetchWatchlists={fetchWatchlists}
            candidates={candidates}
            loadingCandidates={loadingCandidates}
            fetchCandidates={fetchCandidates}
            filteredCandidates={filteredCandidates}
            tradingDates={tradingDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
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
            enableParabolicClimax={enableParabolicClimax}
            setEnableParabolicClimax={setEnableParabolicClimax}
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
            minParabolicUpDaysFilter={minParabolicUpDaysFilter}
            setMinParabolicUpDaysFilter={setMinParabolicUpDaysFilter}
            enableParabolicUpDays={enableParabolicUpDays}
            setEnableParabolicUpDays={setEnableParabolicUpDays}

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
            enableVcpPattern={enableVcpPattern}
            setEnableVcpPattern={setEnableVcpPattern}
            enableDarvasPattern={enableDarvasPattern}
            setEnableDarvasPattern={setEnableDarvasPattern}
            enableDarvasWidth={enableDarvasWidth}
            setEnableDarvasWidth={setEnableDarvasWidth}
            enableRs={enableRs}
            setEnableRs={setEnableRs}
            enableRsNewHigh={enableRsNewHigh}
            setEnableRsNewHigh={setEnableRsNewHigh}
            enableAtr={enableAtr}
            setEnableAtr={setEnableAtr}
            enablePivotTightness={enablePivotTightness}
            setEnablePivotTightness={setEnablePivotTightness}
            maxPivotSpreadFilter={maxPivotSpreadFilter}
            setMaxPivotSpreadFilter={setMaxPivotSpreadFilter}
            maxPivotClusteringFilter={maxPivotClusteringFilter}
            setMaxPivotClusteringFilter={setMaxPivotClusteringFilter}
            maxPivotVolRatioFilter={maxPivotVolRatioFilter}
            setMaxPivotVolRatioFilter={setMaxPivotVolRatioFilter}
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

        {activeTab === 'setups-rules' && (
          <SetupsAndRulesTab />
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
        activeStockList={activeStockList}
        handleSelectStock={handleSelectStock}
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
