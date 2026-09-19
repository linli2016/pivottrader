import React, { useState, useEffect, useMemo } from 'react';
import RRGQuadrantChart from './RRGQuadrantChart';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export default function GroupRadarTab({ onSelectStock = () => {}, tradingDates = [] }) {
  const [activeTab, setActiveTab] = useState('sectors'); // 'sectors', 'industries', or 'themes'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'rrg'
  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState([]);
  const [sectorEtfs, setSectorEtfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('ret_1w_pct');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [expandedGroups, setExpandedGroups] = useState({});
  const [constituents, setConstituents] = useState({});
  const [loadingConstituents, setLoadingConstituents] = useState({});

  // RRG State
  const [rrgData, setRrgData] = useState([]);
  const [loadingRRG, setLoadingRRG] = useState(false);
  const [trailBars, setTrailBars] = useState(5);

  // Sector drill-down state (Industries / Themes / Stocks within Sector)
  const [sectorSubTabs, setSectorSubTabs] = useState({}); // { [sectorName]: 'industries' | 'themes' | 'stocks' }
  const [sectorIndustries, setSectorIndustries] = useState({}); // { [cacheKey]: [] }
  const [sectorThemes, setSectorThemes] = useState({}); // { [cacheKey]: [] }
  const [expandedSubIndustries, setExpandedSubIndustries] = useState({}); // { [subIndKey]: boolean }
  const [subIndustryConstituents, setSubIndustryConstituents] = useState({}); // { [cacheKey]: [] }
  const [loadingSubIndustries, setLoadingSubIndustries] = useState({});

  // Theme Management Modal state
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [themeFormName, setThemeFormName] = useState('');
  const [themeFormDesc, setThemeFormDesc] = useState('');
  const [themeFormSymbols, setThemeFormSymbols] = useState('');
  const [savingTheme, setSavingTheme] = useState(false);

  // Fetch group strength data
  const fetchGroupStrength = async (tab = activeTab, date = selectedDate) => {
    setLoading(true);
    setError(null);
    try {
      const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/api/groups/strength?type=${tab}${dateParam}`);
      if (!res.ok) {
        throw new Error(`Failed to load ${tab} strength: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);

      // Also fetch sector ETFs if on Sectors tab
      if (tab === 'sectors') {
        const etfRes = await fetch(`${API_BASE}/api/sectors/etfs`);
        if (etfRes.ok) {
          const etfJson = await etfRes.json();
          setSectorEtfs(etfJson);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch RRG data
  const fetchRRGData = async (tab = activeTab, date = selectedDate, trail = trailBars) => {
    setLoadingRRG(true);
    try {
      const dateParam = date ? `&date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/api/groups/rrg?type=${tab}&trail=${trail}${dateParam}`);
      if (res.ok) {
        const json = await res.json();
        setRrgData(json);
      }
    } catch (err) {
      console.error('Error loading RRG data:', err);
    } finally {
      setLoadingRRG(false);
    }
  };

  useEffect(() => {
    fetchGroupStrength(activeTab, selectedDate);
    if (viewMode === 'rrg') {
      fetchRRGData(activeTab, selectedDate, trailBars);
    }
  }, [activeTab, selectedDate, viewMode, trailBars]);


  // Fetch constituents or child groups for a specific parent group
  const toggleGroupExpand = async (groupName) => {
    const isCurrentlyExpanded = !!expandedGroups[groupName];
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !isCurrentlyExpanded
    }));

    if (isCurrentlyExpanded) return;

    const dateParam = selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : '';
    const dateKey = selectedDate || 'latest';

    // If on Sectors tab, fetch Industries in this Sector and Themes in this Sector
    if (activeTab === 'sectors') {
      const secKey = `sector:${groupName}:${dateKey}`;
      setLoadingConstituents((prev) => ({ ...prev, [groupName]: true }));

      try {
        const [indRes, thRes, stRes] = await Promise.all([
          fetch(`${API_BASE}/api/groups/strength?type=industries&sector=${encodeURIComponent(groupName)}${dateParam}`),
          fetch(`${API_BASE}/api/groups/strength?type=themes&sector=${encodeURIComponent(groupName)}${dateParam}`),
          fetch(`${API_BASE}/api/groups/constituents?type=sectors&name=${encodeURIComponent(groupName)}${dateParam}`)
        ]);

        if (indRes.ok) {
          const indJson = await indRes.json();
          setSectorIndustries((prev) => ({ ...prev, [secKey]: indJson }));
        }
        if (thRes.ok) {
          const thJson = await thRes.json();
          setSectorThemes((prev) => ({ ...prev, [secKey]: thJson }));
        }
        if (stRes.ok) {
          const stJson = await stRes.json();
          setConstituents((prev) => ({ ...prev, [secKey]: stJson }));
        }
      } catch (err) {
        console.error(`Error loading sector drilldown for ${groupName}:`, err);
      } finally {
        setLoadingConstituents((prev) => ({ ...prev, [groupName]: false }));
      }
    } else {
      // For Industries or Themes tab, fetch constituent stocks
      const cacheKey = `${activeTab}:${groupName}:${dateKey}`;
      if (!constituents[cacheKey]) {
        setLoadingConstituents((prev) => ({ ...prev, [groupName]: true }));
        try {
          const url = `${API_BASE}/api/groups/constituents?type=${activeTab}&name=${encodeURIComponent(groupName)}${dateParam}`;
          const res = await fetch(url);
          if (res.ok) {
            const cData = await res.json();
            setConstituents((prev) => ({ ...prev, [cacheKey]: cData }));
          }
        } catch (err) {
          console.error(`Error loading constituents for ${groupName}:`, err);
        } finally {
          setLoadingConstituents((prev) => ({ ...prev, [groupName]: false }));
        }
      }
    }
  };

  // Toggle child industry inside a Sector
  const toggleSubIndustryExpand = async (sectorName, indName) => {
    const subKey = `${sectorName}:${indName}`;
    const isExpanded = !!expandedSubIndustries[subKey];
    setExpandedSubIndustries((prev) => ({ ...prev, [subKey]: !isExpanded }));

    if (isExpanded) return;

    const dateParam = selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : '';
    const dateKey = selectedDate || 'latest';
    const cacheKey = `ind:${indName}:${dateKey}`;

    if (!subIndustryConstituents[cacheKey]) {
      setLoadingSubIndustries((prev) => ({ ...prev, [subKey]: true }));
      try {
        const url = `${API_BASE}/api/groups/constituents?type=industries&name=${encodeURIComponent(indName)}${dateParam}`;
        const res = await fetch(url);
        if (res.ok) {
          const cData = await res.json();
          setSubIndustryConstituents((prev) => ({ ...prev, [cacheKey]: cData }));
        }
      } catch (err) {
        console.error(`Error loading sub-industry constituents for ${indName}:`, err);
      } finally {
        setLoadingSubIndustries((prev) => ({ ...prev, [subKey]: false }));
      }
    }
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filtered & Sorted groups
  const filteredAndSortedGroups = useMemo(() => {
    let list = [...data];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((g) => {
        const nameMatch = g.name && g.name.toLowerCase().includes(term);
        const symbolMatch = g.top_symbols && g.top_symbols.some((s) => s.toLowerCase().includes(term));
        return nameMatch || symbolMatch;
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [data, searchTerm, sortBy, sortOrder]);

  // Theme Management handlers
  const openNewThemeModal = () => {
    setEditingTheme(null);
    setThemeFormName('');
    setThemeFormDesc('');
    setThemeFormSymbols('');
    setIsThemeModalOpen(true);
  };

  const openEditThemeModal = (groupName) => {
    const cacheKey = `${activeTab}:${groupName}:${selectedDate || 'latest'}`;
    const stockList = constituents[cacheKey] || [];
    const syms = stockList.length > 0 ? stockList.map((s) => s.symbol).join(', ') : '';

    setEditingTheme(groupName);
    setThemeFormName(groupName);
    setThemeFormDesc('');
    setThemeFormSymbols(syms);
    setIsThemeModalOpen(true);
  };

  const handleSaveTheme = async (e) => {
    e.preventDefault();
    if (!themeFormName.trim()) return;

    setSavingTheme(true);
    try {
      const rawSymbols = themeFormSymbols
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const res = await fetch(`${API_BASE}/api/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: themeFormName.trim(),
          description: themeFormDesc.trim(),
          symbols: rawSymbols
        })
      });

      if (res.ok) {
        setIsThemeModalOpen(false);
        setConstituents({});
        fetchGroupStrength(activeTab, selectedDate);
      } else {
        const errJson = await res.json();
        alert(`Error saving theme: ${errJson.detail || res.statusText}`);
      }
    } catch (err) {
      alert(`Error saving theme: ${err.message}`);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleDeleteTheme = async (themeName) => {
    if (!window.confirm(`Are you sure you want to delete the theme "${themeName}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/themes/${encodeURIComponent(themeName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchGroupStrength(activeTab, selectedDate);
      } else {
        alert('Failed to delete theme');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Helper for color intensity on returns
  const formatReturn = (val) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    const isPositive = val > 0;
    const isZero = val === 0;
    const color = isPositive ? '#10b981' : isZero ? 'var(--text-secondary)' : '#f43f5e';
    const prefix = isPositive ? '+' : '';
    return (
      <span style={{ color, fontWeight: 600 }}>
        {prefix}{val.toFixed(1)}%
      </span>
    );
  };

  // Helper for RS Rank badge color
  const getRsRankBadge = (rank) => {
    if (rank === null || rank === undefined) return '-';
    let color = '#94a3b8';
    let bg = 'rgba(148, 163, 184, 0.15)';

    if (rank >= 80) {
      color = '#38bdf8'; // Cyan / Leader
      bg = 'rgba(56, 189, 248, 0.18)';
    } else if (rank >= 60) {
      color = '#10b981'; // Green
      bg = 'rgba(16, 185, 129, 0.18)';
    } else if (rank >= 40) {
      color = '#fbbf24'; // Yellow
      bg = 'rgba(251, 191, 36, 0.15)';
    } else {
      color = '#f43f5e'; // Red
      bg = 'rgba(244, 63, 94, 0.15)';
    }

    return (
      <span
        style={{
          color,
          backgroundColor: bg,
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '11px',
          display: 'inline-block',
          minWidth: '28px',
          textAlign: 'center'
        }}
      >
        {rank}
      </span>
    );
  };

  // Helper for 52w high distance formatting
  const format52wH = (val) => {
    if (val === null || val === undefined) return '-';
    const isNearHigh = val >= -10.0;
    return (
      <span style={{ color: isNearHigh ? '#38bdf8' : 'var(--text-secondary)', fontWeight: isNearHigh ? 700 : 500 }}>
        {val.toFixed(1)}%
      </span>
    );
  };

  // Helper for Relative Volume formatting
  const formatRVol = (val) => {
    if (val === null || val === undefined) return '-';
    const isHighVol = val >= 120;
    return (
      <span
        style={{
          color: isHighVol ? '#10b981' : 'var(--text-secondary)',
          fontWeight: isHighVol ? 700 : 500,
          background: isHighVol ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
          padding: isHighVol ? '2px 6px' : '0',
          borderRadius: '4px'
        }}
      >
        {val}%
      </span>
    );
  };

  // Setup badge renderer
  const renderSetupBadges = (setups = []) => {
    if (!setups || setups.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {setups.map((s, idx) => {
          let bg = 'rgba(255, 255, 255, 0.1)';
          let color = '#fff';
          if (s === 'Breakout') {
            bg = 'rgba(168, 85, 247, 0.2)';
            color = '#c084fc';
          } else if (s === 'VCP') {
            bg = 'rgba(16, 185, 129, 0.2)';
            color = '#34d399';
          } else if (s === 'Low Cheat') {
            bg = 'rgba(14, 165, 233, 0.2)';
            color = '#38bdf8';
          } else if (s === 'EP') {
            bg = 'rgba(245, 158, 11, 0.2)';
            color = '#fbbf24';
          } else if (s === 'Power Play') {
            bg = 'rgba(236, 72, 153, 0.2)';
            color = '#f472b6';
          } else if (s === 'RS Blue Dot') {
            bg = 'rgba(56, 189, 248, 0.25)';
            color = '#38bdf8';
          }
          const displayLabel = s === 'RS Blue Dot' ? '🔵 RS Blue Dot' : s;
          return (
            <span
              key={idx}
              style={{
                background: bg,
                color,
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              {displayLabel}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Section */}
      <div
        className="header-section"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>GROUP RADAR</span>
            <span>•</span>
            <span>INSTITUTIONAL ROTATION</span>
          </div>
          <h1>Group Strength Radar</h1>
          <p>Real-Time Relative Strength, Multi-Horizon Momentum & Breadth Across Sectors, Industries, and Themes</p>
        </div>

        {/* Top Right Controls: Snapshot / Date Picker & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live indicator badge */}
          {!selectedDate && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Today Live
            </div>
          )}

          {/* Historical Snapshot Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Snapshot:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="">Latest Live Session</option>
              {tradingDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchGroupStrength(activeTab, selectedDate)}
            disabled={loading}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* 3-Pill Switcher & Search Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '12px 18px',
          marginBottom: '20px'
        }}
      >
        {/* The 3 Pills (Sectors, Industries, Themes) */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            gap: '4px'
          }}
        >
          {/* Pill 1: Sectors */}
          <button
            onClick={() => setActiveTab('sectors')}
            style={{
              background: activeTab === 'sectors' ? '#10b981' : 'transparent',
              color: activeTab === 'sectors' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Sectors {activeTab === 'sectors' && data.length > 0 ? `(${data.length})` : ''}
          </button>

          {/* Pill 2: Industries */}
          <button
            onClick={() => setActiveTab('industries')}
            style={{
              background: activeTab === 'industries' ? '#10b981' : 'transparent',
              color: activeTab === 'industries' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Industries {activeTab === 'industries' && data.length > 0 ? `(${data.length})` : ''}
          </button>

          {/* Pill 3: Themes */}
          <button
            onClick={() => setActiveTab('themes')}
            style={{
              background: activeTab === 'themes' ? '#10b981' : 'transparent',
              color: activeTab === 'themes' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Themes {activeTab === 'themes' && data.length > 0 ? `(${data.length})` : ''}
          </button>
        </div>

        {/* View Mode Toggle: Table View vs RRG Quadrant View */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '3px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            gap: '3px'
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              background: viewMode === 'table' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: viewMode === 'table' ? '#38bdf8' : 'var(--text-secondary)',
              border: viewMode === 'table' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
              borderRadius: '16px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: viewMode === 'table' ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📋</span> Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rrg')}
            style={{
              background: viewMode === 'rrg' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: viewMode === 'rrg' ? '#38bdf8' : 'var(--text-secondary)',
              border: viewMode === 'rrg' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
              borderRadius: '16px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: viewMode === 'rrg' ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🎯</span> RRG Quadrant View
          </button>
        </div>

        {/* Right side of toolbar: Search + Optional "+ New Theme" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            className="select-input"
            placeholder={`🔍 Filter ${activeTab} or tickers...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '240px',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '7px 14px',
              fontSize: '13px'
            }}
          />

          {activeTab === 'themes' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={openNewThemeModal}
              style={{
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                fontWeight: 700,
                padding: '7px 14px'
              }}
            >
              + New Theme
            </button>
          )}
        </div>
      </div>

      {/* RRG Quadrant View */}
      {viewMode === 'rrg' && (
        <RRGQuadrantChart
          data={rrgData}
          loading={loadingRRG}
          trailBars={trailBars}
          onChangeTrailBars={(n) => {
            setTrailBars(n);
            fetchRRGData(activeTab, selectedDate, n);
          }}
          onSelectGroup={(item) => {
            setViewMode('table');
            setSearchTerm(item.name);
            toggleGroupExpand(item.name);
          }}
        />
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
              Calculating {activeTab} relative strength & momentum metrics...
            </div>
          )}


      {/* Error state */}
      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Leaderboard Table */}
      {!loading && !error && (
        <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', userSelect: 'none' }}>
                <th
                  onClick={() => handleSort('name')}
                  style={{ textAlign: 'left', padding: '10px 12px', cursor: 'pointer', minWidth: '220px' }}
                >
                  NAME {sortBy === 'name' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('today_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  Today {sortBy === 'today_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_1w_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  1W {sortBy === 'ret_1w_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_1m_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  1M {sortBy === 'ret_1m_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_3m_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  3M {sortBy === 'ret_3m_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_ytd_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  YTD {sortBy === 'ret_ytd_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('rs_rank')}
                  style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  RS Rank {sortBy === 'rs_rank' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('dist_52wh_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '90px' }}
                >
                  52wH {sortBy === 'dist_52wh_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('rvol_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  RVol {sortBy === 'rvol_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                {activeTab === 'themes' && (
                  <th style={{ textAlign: 'center', width: '70px', padding: '10px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGroups.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No {activeTab} matched your search filter.
                  </td>
                </tr>
              ) : (
                filteredAndSortedGroups.map((group) => {
                  const isExpanded = !!expandedGroups[group.name];
                  const dateKey = selectedDate || 'latest';
                  const secKey = `sector:${group.name}:${dateKey}`;
                  const cacheKey = `${activeTab}:${group.name}:${dateKey}`;
                  const isLoadingThis = !!loadingConstituents[group.name];

                  const currentSubTab = sectorSubTabs[group.name] || 'industries';
                  const currentSectorIndustries = sectorIndustries[secKey] || [];
                  const currentSectorThemes = sectorThemes[secKey] || [];
                  const currentSectorStocks = constituents[secKey] || [];
                  const groupStocks = constituents[cacheKey] || [];

                  return (
                    <React.Fragment key={group.name}>
                      {/* Parent Group Row */}
                      <tr
                        onClick={() => toggleGroupExpand(group.name)}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                        className="group-row"
                      >
                        {/* Group Name + Chevron */}
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                fontSize: '11px',
                                color: isExpanded ? '#10b981' : 'var(--text-muted)'
                              }}
                            >
                              ▶
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {group.name}
                            </span>
                            {group.etf_symbol && (
                              <span
                                className="pill"
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8'
                                }}
                              >
                                {group.etf_symbol}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                              ({group.stock_count})
                            </span>
                          </div>
                        </td>

                        {/* Today % */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatReturn(group.today_pct)}</td>

                        {/* 1W % */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatReturn(group.ret_1w_pct)}</td>

                        {/* 1M % */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatReturn(group.ret_1m_pct)}</td>

                        {/* 3M % */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatReturn(group.ret_3m_pct)}</td>

                        {/* YTD % */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatReturn(group.ret_ytd_pct)}</td>

                        {/* RS Rank */}
                        <td style={{ textAlign: 'center', padding: '11px 12px' }}>{getRsRankBadge(group.rs_rank)}</td>

                        {/* 52wH */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{format52wH(group.dist_52wh_pct)}</td>

                        {/* RVol */}
                        <td style={{ textAlign: 'right', padding: '11px 12px' }}>{formatRVol(group.rvol_pct)}</td>

                        {/* Actions for Themes */}
                        {activeTab === 'themes' && (
                          <td
                            style={{ textAlign: 'center', padding: '11px 12px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDeleteTheme(group.name)}
                              title="Delete Theme"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '2px 4px'
                              }}
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Expandable Accordion */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={activeTab === 'themes' ? 10 : 9}
                            style={{
                              padding: '14px 16px 22px 28px',
                              backgroundColor: 'rgba(0, 0, 0, 0.38)',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            {isLoadingThis ? (
                              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                ⏳ Loading breakdown for <strong>{group.name}</strong>...
                              </div>
                            ) : activeTab === 'sectors' ? (
                              /* ----------------- SECTORS DRILL-DOWN: Industries / Themes / Stocks ----------------- */
                              <div>
                                {/* Sub-navigation pills inside Sector */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                  <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.5)', padding: '3px', borderRadius: '18px', border: '1px solid var(--border-color)', gap: '4px' }}>
                                    <button
                                      onClick={() => setSectorSubTabs((prev) => ({ ...prev, [group.name]: 'industries' }))}
                                      style={{
                                        background: currentSubTab === 'industries' ? '#10b981' : 'transparent',
                                        color: currentSubTab === 'industries' ? '#ffffff' : 'var(--text-secondary)',
                                        border: 'none',
                                        borderRadius: '16px',
                                        padding: '4px 14px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🏢 Industries ({currentSectorIndustries.length})
                                    </button>
                                    <button
                                      onClick={() => setSectorSubTabs((prev) => ({ ...prev, [group.name]: 'themes' }))}
                                      style={{
                                        background: currentSubTab === 'themes' ? '#10b981' : 'transparent',
                                        color: currentSubTab === 'themes' ? '#ffffff' : 'var(--text-secondary)',
                                        border: 'none',
                                        borderRadius: '16px',
                                        padding: '4px 14px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🎯 Themes ({currentSectorThemes.length})
                                    </button>
                                    <button
                                      onClick={() => setSectorSubTabs((prev) => ({ ...prev, [group.name]: 'stocks' }))}
                                      style={{
                                        background: currentSubTab === 'stocks' ? '#10b981' : 'transparent',
                                        color: currentSubTab === 'stocks' ? '#ffffff' : 'var(--text-secondary)',
                                        border: 'none',
                                        borderRadius: '16px',
                                        padding: '4px 14px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      📈 Top Stocks ({currentSectorStocks.length})
                                    </button>
                                  </div>

                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {currentSubTab === 'industries'
                                      ? `Click any industry below to expand its constituent stocks`
                                      : currentSubTab === 'themes'
                                      ? `Narrative themes with exposure to ${group.name}`
                                      : `Leading individual stocks in ${group.name}`}
                                  </span>
                                </div>

                                {/* VIEW 1: Industries within Sector */}
                                {currentSubTab === 'industries' && (
                                  currentSectorIndustries.length === 0 ? (
                                    <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                      No industry groups found in this sector.
                                    </div>
                                  ) : (
                                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                          <th style={{ textAlign: 'left', padding: '6px 10px' }}>Industry Group</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>Today</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>1W</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>1M</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>3M</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>YTD</th>
                                          <th style={{ textAlign: 'center', padding: '6px 10px', width: '75px' }}>RS Rank</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '85px' }}>52wH</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>RVol</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {currentSectorIndustries.map((subInd) => {
                                          const subKey = `${group.name}:${subInd.name}`;
                                          const isSubExpanded = !!expandedSubIndustries[subKey];
                                          const subCacheKey = `ind:${subInd.name}:${dateKey}`;
                                          const subStocks = subIndustryConstituents[subCacheKey] || [];
                                          const isSubLoading = !!loadingSubIndustries[subKey];

                                          return (
                                            <React.Fragment key={subInd.name}>
                                              <tr
                                                onClick={() => toggleSubIndustryExpand(group.name, subInd.name)}
                                                style={{
                                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                                  cursor: 'pointer',
                                                  backgroundColor: isSubExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent'
                                                }}
                                                className="group-row"
                                              >
                                                <td style={{ padding: '7px 10px' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span
                                                      style={{
                                                        display: 'inline-block',
                                                        transform: isSubExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s ease',
                                                        fontSize: '10px',
                                                        color: isSubExpanded ? '#38bdf8' : 'var(--text-muted)'
                                                      }}
                                                    >
                                                      ▶
                                                    </span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                      {subInd.name}
                                                    </span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                      ({subInd.stock_count})
                                                    </span>
                                                  </div>
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(subInd.today_pct)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(subInd.ret_1w_pct)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(subInd.ret_1m_pct)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(subInd.ret_3m_pct)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(subInd.ret_ytd_pct)}</td>
                                                <td style={{ textAlign: 'center', padding: '7px 10px' }}>{getRsRankBadge(subInd.rs_rank)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{format52wH(subInd.dist_52wh_pct)}</td>
                                                <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatRVol(subInd.rvol_pct)}</td>
                                              </tr>

                                              {/* 2nd Level Expansion: Stocks in this Sub-Industry */}
                                              {isSubExpanded && (
                                                <tr>
                                                  <td
                                                    colSpan={9}
                                                    style={{
                                                      padding: '10px 14px 14px 34px',
                                                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                                                    }}
                                                  >
                                                    {isSubLoading ? (
                                                      <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                        ⏳ Loading stocks for <strong>{subInd.name}</strong>...
                                                      </div>
                                                    ) : subStocks.length === 0 ? (
                                                      <div style={{ padding: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                                        No stocks found.
                                                      </div>
                                                    ) : (
                                                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                            <th style={{ textAlign: 'left', padding: '5px 6px', width: '80px' }}>Symbol</th>
                                                            <th style={{ textAlign: 'left', padding: '5px 6px' }}>Company Name</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '70px' }}>Price</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '65px' }}>Today</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '65px' }}>1W</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '65px' }}>1M</th>
                                                            <th style={{ textAlign: 'center', padding: '5px 6px', width: '65px' }}>RS Rank</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '70px' }}>52wH</th>
                                                            <th style={{ textAlign: 'right', padding: '5px 6px', width: '65px' }}>RVol</th>
                                                            <th style={{ textAlign: 'left', padding: '5px 6px', width: '150px' }}>Active Setups</th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {subStocks.map((stock) => (
                                                            <tr
                                                              key={stock.symbol}
                                                              onClick={() => onSelectStock(stock, subStocks)}
                                                              style={{
                                                                borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                                                                cursor: 'pointer'
                                                              }}
                                                              className="stock-hover-row"
                                                            >
                                                              <td style={{ padding: '5px 6px', fontWeight: 800, color: '#38bdf8' }}>{stock.symbol}</td>
                                                              <td style={{ padding: '5px 6px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px', fontWeight: 600 }}>${stock.close?.toFixed(2)}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px' }}>{formatReturn(stock.today_pct)}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px' }}>{formatReturn(stock.ret_1w_pct)}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px' }}>{formatReturn(stock.ret_1m_pct)}</td>
                                                              <td style={{ textAlign: 'center', padding: '5px 6px' }}>{getRsRankBadge(stock.rs_rank)}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px' }}>{format52wH(stock.dist_52wh_pct)}</td>
                                                              <td style={{ textAlign: 'right', padding: '5px 6px' }}>{formatRVol(stock.rvol_pct)}</td>
                                                              <td style={{ padding: '5px 6px' }}>{renderSetupBadges(stock.setups)}</td>
                                                            </tr>
                                                          ))}
                                                        </tbody>
                                                      </table>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )
                                )}

                                {/* VIEW 2: Themes within Sector */}
                                {currentSubTab === 'themes' && (
                                  currentSectorThemes.length === 0 ? (
                                    <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                      No active momentum themes mapped to this sector.
                                    </div>
                                  ) : (
                                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                          <th style={{ textAlign: 'left', padding: '6px 10px' }}>Theme</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>Today</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>1W</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>1M</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>3M</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>YTD</th>
                                          <th style={{ textAlign: 'center', padding: '6px 10px', width: '75px' }}>RS Rank</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '85px' }}>52wH</th>
                                          <th style={{ textAlign: 'right', padding: '6px 10px', width: '80px' }}>RVol</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {currentSectorThemes.map((th) => (
                                          <tr key={th.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <td style={{ padding: '7px 10px' }}>
                                              <span style={{ fontWeight: 600, color: '#38bdf8' }}>{th.name}</span>
                                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                ({th.stock_count} stocks: {th.top_symbols?.join(', ')})
                                              </span>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(th.today_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(th.ret_1w_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(th.ret_1m_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(th.ret_3m_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatReturn(th.ret_ytd_pct)}</td>
                                            <td style={{ textAlign: 'center', padding: '7px 10px' }}>{getRsRankBadge(th.rs_rank)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{format52wH(th.dist_52wh_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '7px 10px' }}>{formatRVol(th.rvol_pct)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )
                                )}

                                {/* VIEW 3: All Stocks within Sector */}
                                {currentSubTab === 'stocks' && (
                                  currentSectorStocks.length === 0 ? (
                                    <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                      No stocks found in this sector.
                                    </div>
                                  ) : (
                                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                          <th style={{ textAlign: 'left', padding: '6px 8px', width: '90px' }}>Symbol</th>
                                          <th style={{ textAlign: 'left', padding: '6px 8px' }}>Company Name</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '80px' }}>Price</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>Today</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>1W</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>1M</th>
                                          <th style={{ textAlign: 'center', padding: '6px 8px', width: '70px' }}>RS Rank</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>52wH</th>
                                          <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>RVol</th>
                                          <th style={{ textAlign: 'left', padding: '6px 8px', width: '160px' }}>Active Setups</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {currentSectorStocks.slice(0, 30).map((stock) => (
                                          <tr
                                            key={stock.symbol}
                                            onClick={() => onSelectStock(stock, currentSectorStocks)}
                                            style={{
                                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                              cursor: 'pointer'
                                            }}
                                            className="stock-hover-row"
                                          >
                                            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>{stock.symbol}</td>
                                            <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>${stock.close?.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatReturn(stock.today_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatReturn(stock.ret_1w_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatReturn(stock.ret_1m_pct)}</td>
                                            <td style={{ textAlign: 'center', padding: '6px 8px' }}>{getRsRankBadge(stock.rs_rank)}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>{format52wH(stock.dist_52wh_pct)}</td>
                                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatRVol(stock.rvol_pct)}</td>
                                            <td style={{ padding: '6px 8px' }}>{renderSetupBadges(stock.setups)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )
                                )}
                              </div>
                            ) : (
                              /* ----------------- INDUSTRIES & THEMES DRILL-DOWN: Stocks Table ----------------- */
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Constituent Leaders in <strong>{group.name}</strong> ({groupStocks.length} stocks) — Click any row to inspect chart
                                  </span>
                                  {activeTab === 'themes' && (
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => openEditThemeModal(group.name)}
                                      style={{ padding: '2px 8px', fontSize: '11px' }}
                                    >
                                      ✏️ Edit Theme Tickers
                                    </button>
                                  )}
                                </div>

                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                      <th style={{ textAlign: 'left', padding: '6px 8px', width: '90px' }}>Symbol</th>
                                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Company Name</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '80px' }}>Price</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>Today</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>1W</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>1M</th>
                                      <th style={{ textAlign: 'center', padding: '6px 8px', width: '70px' }}>RS Rank</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>52wH</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '75px' }}>RVol</th>
                                      <th style={{ textAlign: 'left', padding: '6px 8px', width: '160px' }}>Active Setups</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupStocks.map((stock) => (
                                      <tr
                                        key={stock.symbol}
                                        onClick={() => onSelectStock(stock, groupStocks)}
                                        style={{
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                          cursor: 'pointer',
                                          transition: 'background-color 0.12s ease'
                                        }}
                                        className="stock-hover-row"
                                      >
                                        <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>
                                          {stock.symbol}
                                        </td>
                                        <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {stock.name}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>
                                          ${stock.close?.toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                                          {formatReturn(stock.today_pct)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                                          {formatReturn(stock.ret_1w_pct)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                                          {formatReturn(stock.ret_1m_pct)}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                          {getRsRankBadge(stock.rs_rank)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                                          {format52wH(stock.dist_52wh_pct)}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                                          {formatRVol(stock.rvol_pct)}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                          {renderSetupBadges(stock.setups)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sector ETFs Leaderboard Section (when Sectors tab is selected) */}
      {activeTab === 'sectors' && sectorEtfs.length > 0 && !loading && (
        <div className="glass-card" style={{ marginTop: '28px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
            Primary 11 Sector ETFs Leaderboard (XLK, XLF, XLE, etc.)
          </h3>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>ETF Ticker</th>
                  <th style={{ textAlign: 'left' }}>Sector</th>
                  <th style={{ textAlign: 'center' }}>RS Rank</th>
                  <th style={{ textAlign: 'center' }}>1W RS Δ</th>
                  <th style={{ textAlign: 'right' }}>1W Return</th>
                  <th style={{ textAlign: 'center' }}>1M RS Δ</th>
                  <th style={{ textAlign: 'right' }}>1M Return</th>
                  <th style={{ textAlign: 'right' }}>3M Return</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {sectorEtfs
                  .filter((e) => e.symbol !== 'SPY' && e.symbol !== 'QQQ')
                  .sort((a, b) => (b.delta_rs_1w || 0) - (a.delta_rs_1w || 0))
                  .map((etf) => (
                    <tr key={etf.symbol} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{etf.symbol}</td>
                      <td style={{ fontWeight: 600 }}>{etf.sector}</td>
                      <td style={{ textAlign: 'center' }}>{getRsRankBadge(etf.rs_rank)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: etf.delta_rs_1w >= 0 ? '#10b981' : '#f43f5e' }}>
                        {etf.delta_rs_1w >= 0 ? `+${etf.delta_rs_1w}` : etf.delta_rs_1w}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatReturn(etf.ret_1w_pct)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: etf.delta_rs_1m >= 0 ? '#10b981' : '#f43f5e' }}>
                        {etf.delta_rs_1m >= 0 ? `+${etf.delta_rs_1m}` : etf.delta_rs_1m}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatReturn(etf.ret_1m_pct)}</td>
                      <td style={{ textAlign: 'right' }}>{formatReturn(etf.ret_3m_pct)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${etf.close?.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Theme Creation / Editing Modal */}
      {isThemeModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setIsThemeModalOpen(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '480px',
              maxWidth: '90vw',
              padding: '24px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              {editingTheme ? `Edit Theme: ${editingTheme}` : 'Create New Momentum Theme'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Define a thematic cluster of stocks to monitor aggregated relative strength, volume, and momentum.
            </p>

            <form onSubmit={handleSaveTheme}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Theme Name
                </label>
                <input
                  type="text"
                  required
                  value={themeFormName}
                  onChange={(e) => setThemeFormName(e.target.value)}
                  placeholder="e.g. AI Accelerators, Uranium & SMRs..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={themeFormDesc}
                  onChange={(e) => setThemeFormDesc(e.target.value)}
                  placeholder="Brief narrative / sector description..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Tickers (comma or space separated)
                </label>
                <textarea
                  rows={4}
                  required
                  value={themeFormSymbols}
                  onChange={(e) => setThemeFormSymbols(e.target.value)}
                  placeholder="e.g. NVDA, AVGO, ARM, SMCI, ANET, VST..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsThemeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingTheme}
                  style={{ background: '#10b981', color: '#fff', fontWeight: 700 }}
                >
                  {savingTheme ? 'Saving...' : 'Save Theme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
