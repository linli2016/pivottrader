import React, { useState, useEffect, useMemo } from 'react';
import RRGQuadrantChart from './RRGQuadrantChart';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

export const QUADRANT_CONFIG = {
  Improving: {
    title: 'Improving',
    accent: '#38bdf8',
    cardBg: 'rgba(56, 189, 248, 0.05)',
    cardBorder: 'rgba(56, 189, 248, 0.22)',
    pillBg: 'rgba(56, 189, 248, 0.08)',
    pillBorder: 'rgba(56, 189, 248, 0.25)',
    selectedBg: 'rgba(56, 189, 248, 0.25)'
  },
  Leading: {
    title: 'Leading',
    accent: '#10b981',
    cardBg: 'rgba(16, 185, 129, 0.05)',
    cardBorder: 'rgba(16, 185, 129, 0.22)',
    pillBg: 'rgba(16, 185, 129, 0.08)',
    pillBorder: 'rgba(16, 185, 129, 0.25)',
    selectedBg: 'rgba(16, 185, 129, 0.25)'
  },
  Lagging: {
    title: 'Lagging',
    accent: '#f43f5e',
    cardBg: 'rgba(244, 63, 94, 0.05)',
    cardBorder: 'rgba(244, 63, 94, 0.22)',
    pillBg: 'rgba(244, 63, 94, 0.08)',
    pillBorder: 'rgba(244, 63, 94, 0.25)',
    selectedBg: 'rgba(244, 63, 94, 0.25)'
  },
  Weakening: {
    title: 'Weakening',
    accent: '#f59e0b',
    cardBg: 'rgba(245, 158, 11, 0.05)',
    cardBorder: 'rgba(245, 158, 11, 0.22)',
    pillBg: 'rgba(245, 158, 11, 0.08)',
    pillBorder: 'rgba(245, 158, 11, 0.25)',
    selectedBg: 'rgba(245, 158, 11, 0.25)'
  }
};

export const SECTOR_LEGEND_DOTS = [
  { name: 'Technology', color: '#38bdf8' },
  { name: 'Financials', color: '#10b981' },
  { name: 'Healthcare', color: '#f43f5e' },
  { name: 'Consumer', color: '#f59e0b' },
  { name: 'Industrials', color: '#94a3b8' },
  { name: 'Energy', color: '#fb923c' },
  { name: 'Defensive', color: '#a855f7' },
  { name: 'Materials', color: '#ec4899' },
  { name: 'Real Estate', color: '#06b6d4' },
  { name: 'Utilities', color: '#84cc16' }
];

export default function GroupRadarTab({ onSelectStock = () => {}, tradingDates = [] }) {
  const [activeTab, setActiveTab] = useState('sectors'); // 'sectors', 'industries', or 'themes'
  const [viewMode, setViewMode] = useState('rrg'); // 'rrg' | 'board' | 'heatmap' | 'table'
  const [timeframe, setTimeframe] = useState('1wk'); // '1wk' | '1mo' | '3mo' | '6mo'
  const [selectedGroupName, setSelectedGroupName] = useState(null);
  const [selectedConstituents, setSelectedConstituents] = useState([]);
  const [loadingSelectedConstituents, setLoadingSelectedConstituents] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [data, setData] = useState([]);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState(null);
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

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    const bars = tf === '1wk' ? 5 : tf === '1mo' ? 21 : tf === '3mo' ? 63 : 126;
    setTrailBars(bars);
  };

  const handleSelectGroup = (name) => {
    if (selectedGroupName === name) {
      setSelectedGroupName(null);
      setSelectedConstituents([]);
    } else {
      setSelectedGroupName(name);
      fetchInspectorConstituents(name);
    }
  };

  const fetchInspectorConstituents = async (name) => {
    if (!name) return;
    setLoadingSelectedConstituents(true);
    try {
      const dateParam = selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : '';
      const res = await fetch(`${API_BASE}/api/groups/constituents?type=${activeTab}&name=${encodeURIComponent(name)}${dateParam}`);
      if (res.ok) {
        const items = await res.json();
        setSelectedConstituents(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.error('Error loading inspector constituents:', err);
    } finally {
      setLoadingSelectedConstituents(false);
    }
  };

  useEffect(() => {
    fetchGroupStrength(activeTab, selectedDate);
    fetchRRGData(activeTab, selectedDate, trailBars);
  }, [activeTab, selectedDate, trailBars]);


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

  // Group sectors into 4 RRG quadrants for KovaView-style cards
  const sectorQuadrants = useMemo(() => {
    if (activeTab !== 'sectors' || !Array.isArray(data)) return {};
    const groups = {
      Improving: [],
      Leading: [],
      Lagging: [],
      Weakening: []
    };
    data.forEach((item) => {
      const q = item.quadrant || 'Improving';
      if (groups[q]) {
        groups[q].push(item);
      }
    });
    // Sort within each quadrant by rank ascending
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    });
    return groups;
  }, [activeTab, data]);

  const handleSectorPillClick = (sectorName) => {
    if (selectedSectorFilter === sectorName) {
      setSelectedSectorFilter(null);
    } else {
      setSelectedSectorFilter(sectorName);
      if (!expandedGroups[sectorName]) {
        toggleGroupExpand(sectorName);
      }
    }
  };

  // Filtered & Sorted groups
  const filteredAndSortedGroups = useMemo(() => {
    let list = [...data];

    // Sector pill filter
    if (activeTab === 'sectors' && selectedSectorFilter) {
      list = list.filter((g) => g.name === selectedSectorFilter);
    }

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
  }, [data, activeTab, selectedSectorFilter, searchTerm, sortBy, sortOrder]);

  const selectedItem = useMemo(() => {
    if (!selectedGroupName || !Array.isArray(data)) return null;
    return data.find((d) => d.name === selectedGroupName) || null;
  }, [selectedGroupName, data]);

  const topMovers = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return [...data]
      .filter((d) => (d.rank_delta !== undefined && d.rank_delta !== 0) || d.ret_1w_pct !== undefined)
      .sort((a, b) => {
        const deltaA = a.rank_delta ?? 0;
        const deltaB = b.rank_delta ?? 0;
        if (deltaB !== deltaA) return deltaB - deltaA;
        return (b.ret_1w_pct ?? 0) - (a.ret_1w_pct ?? 0);
      })
      .slice(0, 8);
  }, [data]);

  const quadrantCounts = useMemo(() => {
    const counts = { Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    if (!Array.isArray(data)) return counts;
    data.forEach((d) => {
      const q = d.quadrant || 'Improving';
      if (counts[q] !== undefined) counts[q]++;
    });
    return counts;
  }, [data]);

  const boardQuadrants = useMemo(() => {
    const groups = {
      Improving: [],
      Leading: [],
      Lagging: [],
      Weakening: []
    };
    if (!Array.isArray(data)) return groups;
    data.forEach((item) => {
      const q = item.quadrant || 'Improving';
      if (groups[q]) groups[q].push(item);
    });
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => (a.rank || 999) - (b.rank || 999));
    });
    return groups;
  }, [data]);

  const heatmapItems = useMemo(() => {
    if (!Array.isArray(filteredAndSortedGroups)) return [];
    return [...filteredAndSortedGroups].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }, [filteredAndSortedGroups]);

  const getReturnDisplay = (item) => {
    let val = item.ret_1w_pct;
    if (timeframe === '1mo') val = item.ret_1m_pct;
    else if (timeframe === '3mo') val = item.ret_3m_pct;
    else if (timeframe === '6mo') val = item.ret_ytd_pct;

    if (val === undefined || val === null) return '-';
    const num = Number(val);
    if (isNaN(num)) return '-';
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

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
          marginBottom: '16px'
        }}
      >
        <div className="header-title">
          <div className="header-subtitle-tag">
            <span>INDUSTRY RADAR</span>
            <span>•</span>
            <span>LEADERSHIP & ROTATION</span>
          </div>
          <h1>Industry Radar</h1>
          <p>Institutional Relative Strength, Multi-Horizon Rotation & Breadth Across Sectors, Industries, and Themes</p>
        </div>

        {/* Top Right Controls: Snapshot / Date Picker & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                padding: '5px 10px',
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
            onClick={() => {
              fetchGroupStrength(activeTab, selectedDate);
              fetchRRGData(activeTab, selectedDate, trailBars);
            }}
            disabled={loading}
            style={{ padding: '5px 12px', fontSize: '12px' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Redesigned Institutional Toolbar */}
      <div className="radar-toolbar">
        <div className="radar-toolbar-left">
          {/* Scope Switcher: Sectors / Industries / Themes */}
          <div className="radar-pills-group">
            <button
              className={`radar-pill-btn ${activeTab === 'sectors' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sectors'); setSelectedSectorFilter(null); }}
            >
              Sectors {activeTab === 'sectors' && data.length > 0 ? `(${data.length})` : ''}
            </button>
            <button
              className={`radar-pill-btn ${activeTab === 'industries' ? 'active' : ''}`}
              onClick={() => { setActiveTab('industries'); setSelectedSectorFilter(null); }}
            >
              Industries {activeTab === 'industries' && data.length > 0 ? `(${data.length})` : ''}
            </button>
            <button
              className={`radar-pill-btn ${activeTab === 'themes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('themes'); setSelectedSectorFilter(null); }}
            >
              Themes {activeTab === 'themes' && data.length > 0 ? `(${data.length})` : ''}
            </button>
          </div>

          {/* View Mode Switcher: ① RRG / ② Board / ③ Heatmap / ④ Table */}
          <div className="radar-pills-group">
            <button
              className={`radar-pill-btn ${viewMode === 'rrg' ? 'view-active' : ''}`}
              onClick={() => setViewMode('rrg')}
            >
              ① RRG
            </button>
            <button
              className={`radar-pill-btn ${viewMode === 'board' ? 'view-active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              ② Board
            </button>
            <button
              className={`radar-pill-btn ${viewMode === 'heatmap' ? 'view-active' : ''}`}
              onClick={() => setViewMode('heatmap')}
            >
              ③ Heatmap
            </button>
            <button
              className={`radar-pill-btn ${viewMode === 'table' ? 'view-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              ④ Table
            </button>
          </div>

          {/* Timeframe Switcher: 1wk / 1mo / 3mo / 6mo */}
          <div className="radar-pills-group">
            {['1wk', '1mo', '3mo', '6mo'].map((tf) => (
              <button
                key={tf}
                className={`radar-pill-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => handleTimeframeChange(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Ranking info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <span>📅 {selectedDate ? `ranking as of ${selectedDate}` : 'ranking as of Latest'}</span>
          </div>
        </div>

        <div className="radar-toolbar-right">
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="select-input"
              placeholder={`Search ${activeTab} name...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '210px',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '6px 28px 6px 12px',
                fontSize: '12px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {activeTab === 'themes' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={openNewThemeModal}
              style={{
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '16px',
                fontSize: '11.5px'
              }}
            >
              + Theme
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Institutional Layout */}
      <div className="radar-3col-layout">
        {/* LEFT COLUMN: Ranks List */}
        <div className="radar-left-col">
          <div className="radar-left-header">
            <div className="radar-left-title">
              <span>{activeTab === 'sectors' ? 'Sector' : activeTab === 'industries' ? 'Industry' : 'Theme'} ranks</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filteredAndSortedGroups.length}</span>
            </div>
            <div className="radar-left-subtitle">Click once to focus, click again to clear.</div>
          </div>

          <div className="radar-ranks-scroll">
            {filteredAndSortedGroups.map((g) => {
              const isSelected = selectedGroupName === g.name;
              const delta = g.rank_delta ?? 0;
              const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
              const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : 'var(--text-muted)';
              const retStr = getReturnDisplay(g);
              const retColor = retStr.startsWith('+') ? '#34d399' : retStr.startsWith('-') ? '#f87171' : 'var(--text-muted)';

              return (
                <div
                  key={g.name}
                  className={`radar-rank-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectGroup(g.name)}
                  title={`#${g.rank} ${g.name} | ${g.quadrant || 'Improving'} | Δ ${delta} | ${timeframe}: ${retStr}`}
                >
                  <span className="radar-rank-num">#{g.rank || '-'}</span>
                  <div className="radar-rank-name-wrap">
                    <div className="radar-rank-name">{g.name}</div>
                    <div className="radar-rank-meta">{g.stock_count ? `${g.stock_count} stocks` : ''}</div>
                  </div>
                  <span className="radar-rank-delta" style={{ color: deltaColor }}>
                    {arrow} {delta !== 0 ? Math.abs(delta) : ''}
                  </span>
                  <span className="radar-rank-return" style={{ color: retColor }}>
                    {retStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Main Canvas */}
        <div className="radar-center-col">
          <div className="radar-canvas-header">
            <div className="radar-category-legend">
              {SECTOR_LEGEND_DOTS.map((cat) => (
                <div key={cat.name} className="radar-category-dot-item">
                  <span className="radar-category-dot" style={{ backgroundColor: cat.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                </div>
              ))}
            </div>

            <div className="radar-migration-pills" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginRight: '4px' }}>Migrated:</span>
              <span className="radar-mig-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                Leading {quadrantCounts.Leading}
              </span>
              <span className="radar-mig-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                Improving {quadrantCounts.Improving}
              </span>
              <span className="radar-mig-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                Weakening {quadrantCounts.Weakening}
              </span>
              <span className="radar-mig-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                Lagging {quadrantCounts.Lagging}
              </span>

              {/* RRG Trail selector with stable layout footprint */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  marginLeft: '8px',
                  paddingLeft: '8px',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                  visibility: viewMode === 'rrg' ? 'visible' : 'hidden',
                  pointerEvents: viewMode === 'rrg' ? 'auto' : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trail:</span>
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setTrailBars(num);
                      fetchRRGData(activeTab, selectedDate, num);
                    }}
                    style={{
                      padding: '2px 7px',
                      fontSize: '10.5px',
                      fontWeight: trailBars === num ? 700 : 500,
                      borderRadius: '4px',
                      border: trailBars === num ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: trailBars === num ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: trailBars === num ? '#38bdf8' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {num}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', height: '16px', lineHeight: '16px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {viewMode === 'rrg' && 'Lines show where leaders moved over the window • hover any bubble for detail'}
            {viewMode === 'board' && 'Quadrants matrix showing leaders & rotation stages • click card to inspect'}
            {viewMode === 'heatmap' && 'Rank-ordered performance tiles tinted by quadrant status • click tile to inspect'}
            {viewMode === 'table' && 'Detailed metrics table with multi-timeframe returns & relative strength'}
          </div>

          {/* VIEW CANVAS CONTAINER WITH STABLE HEIGHT & INTERNAL SCROLL */}
          <div className="radar-canvas-view-wrap">
            {/* 1. RRG VIEW */}
            {viewMode === 'rrg' && (
              <RRGQuadrantChart
                data={rrgData}
                loading={loadingRRG}
                trailBars={trailBars}
                selectedGroupName={selectedGroupName}
                onChangeTrailBars={(n) => {
                  setTrailBars(n);
                  fetchRRGData(activeTab, selectedDate, n);
                }}
                onSelectGroup={(item) => handleSelectGroup(item.name)}
                hideToolbar={true}
              />
            )}

          {/* 2. BOARD VIEW (2x2 Quadrants) */}
          {viewMode === 'board' && (
            <div className="radar-board-grid">
              {['Improving', 'Leading', 'Lagging', 'Weakening'].map((quadName) => {
                const qCfg = QUADRANT_CONFIG[quadName];
                const items = boardQuadrants[quadName] || [];
                return (
                  <div
                    key={quadName}
                    className="radar-board-quadrant"
                    style={{
                      background: qCfg.cardBg,
                      borderColor: qCfg.cardBorder
                    }}
                  >
                    <div className="radar-board-quad-header">
                      <span style={{ color: qCfg.accent }}>{qCfg.title}</span>
                      <span style={{ color: qCfg.accent, opacity: 0.85, fontSize: '12px' }}>{items.length}</span>
                    </div>

                    <div className="radar-board-cards-wrap">
                      {items.length === 0 ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No groups</span>
                      ) : (
                        items.map((item) => {
                          const isSel = selectedGroupName === item.name;
                          const delta = item.rank_delta ?? 0;
                          const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
                          const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : 'var(--text-muted)';
                          return (
                            <div
                              key={item.name}
                              className={`radar-board-card ${isSel ? 'active-selected' : ''}`}
                              style={{
                                background: isSel ? qCfg.selectedBg : qCfg.pillBg,
                                border: `1px solid ${isSel ? qCfg.accent : qCfg.pillBorder}`
                              }}
                              onClick={() => handleSelectGroup(item.name)}
                              title={`#${item.rank} ${item.name} | 1W: ${item.ret_1w_pct}%`}
                            >
                              <span className="radar-board-card-rank">#{item.rank || '-'}</span>
                              <span className="radar-board-card-name">{item.name}</span>
                              <span className="radar-board-card-delta" style={{ color: deltaColor }}>
                                {arrow} {delta !== 0 ? Math.abs(delta) : ''}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. HEATMAP VIEW */}
          {viewMode === 'heatmap' && (
            <div className="radar-heatmap-grid">
              {heatmapItems.map((item) => {
                const isSel = selectedGroupName === item.name;
                const qCfg = QUADRANT_CONFIG[item.quadrant || 'Improving'] || QUADRANT_CONFIG.Improving;
                const delta = item.rank_delta ?? 0;
                const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
                const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : 'var(--text-muted)';

                return (
                  <div
                    key={item.name}
                    className={`radar-heatmap-tile ${isSel ? 'active-selected' : ''}`}
                    style={{
                      background: qCfg.cardBg,
                      borderColor: isSel ? '#ffffff' : qCfg.cardBorder
                    }}
                    onClick={() => handleSelectGroup(item.name)}
                    title={`#${item.rank} ${item.name} (${item.quadrant}) | 1W: ${item.ret_1w_pct}%`}
                  >
                    <div className="radar-heatmap-name">{item.name}</div>
                    <div className="radar-heatmap-bottom">
                      <span className="radar-heatmap-rank">#{item.rank || '-'}</span>
                      <span className="radar-heatmap-delta" style={{ color: deltaColor }}>
                        {arrow} {delta !== 0 ? Math.abs(delta) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. TABLE VIEW */}
          {viewMode === 'table' && (
            <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
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

              {/* Active sector filter badge */}
              {selectedSectorFilter && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                    padding: '8px 14px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Filtered to sector:
                  </span>
                  <span
                    className="pill"
                    style={{
                      fontSize: '12px',
                      padding: '2px 10px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedSectorFilter(null)}
                  >
                    {selectedSectorFilter} ✕
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={() => setSelectedSectorFilter(null)}
                  >
                    Show all
                  </button>
                </div>
              )}

              {/* Main Leaderboard Table */}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', userSelect: 'none', position: 'sticky', top: 0, zIndex: 10, background: '#0e1422' }}>
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
                            {activeTab === 'sectors' && group.rank && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--text-muted)',
                                  minWidth: '24px'
                                }}
                              >
                                #{group.rank}
                              </span>
                            )}
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {group.name}
                            </span>
                            {activeTab === 'sectors' && group.rank_delta !== undefined && group.rank_delta !== null && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: group.rank_delta > 0 ? '#10b981' : group.rank_delta < 0 ? '#f43f5e' : 'var(--text-muted)'
                                }}
                                title={`5-Day Rank Change: ${group.rank_delta > 0 ? '+' : ''}${group.rank_delta}`}
                              >
                                {group.rank_delta > 0 ? `▲ ${group.rank_delta}` : group.rank_delta < 0 ? `▼ ${Math.abs(group.rank_delta)}` : '—'}
                              </span>
                            )}
                            {activeTab === 'sectors' && group.quadrant && (
                              <span
                                className="pill"
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 8px',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  background: QUADRANT_CONFIG[group.quadrant]?.pillBg || 'rgba(255,255,255,0.06)',
                                  color: QUADRANT_CONFIG[group.quadrant]?.accent || 'var(--text-secondary)',
                                  border: `1px solid ${QUADRANT_CONFIG[group.quadrant]?.pillBorder || 'transparent'}`
                                }}
                              >
                                {group.quadrant}
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
            </div>
          )}
        </div>
      </div>

        {/* RIGHT COLUMN: Selection Inspector & Top Movers */}
        <div className="radar-right-col">
          {/* Selected Group Card */}
          <div className="radar-inspector-card">
            <div className="radar-inspector-title">
              Selected {activeTab === 'sectors' ? 'Sector' : activeTab === 'industries' ? 'Industry' : 'Theme'}
            </div>

            {!selectedItem ? (
              <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No selection</div>
                Pick a row, map bubble, board card, or heatmap tile to inspect constituents and momentum details.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {selectedItem.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Rank #{selectedItem.rank} {selectedItem.rank_delta ? `(Δ ${selectedItem.rank_delta > 0 ? '+' : ''}${selectedItem.rank_delta})` : ''}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: (QUADRANT_CONFIG[selectedItem.quadrant || 'Improving'] || QUADRANT_CONFIG.Improving).pillBg,
                      color: (QUADRANT_CONFIG[selectedItem.quadrant || 'Improving'] || QUADRANT_CONFIG.Improving).accent,
                      border: `1px solid ${(QUADRANT_CONFIG[selectedItem.quadrant || 'Improving'] || QUADRANT_CONFIG.Improving).pillBorder}`
                    }}
                  >
                    {selectedItem.quadrant || 'Improving'}
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>RS-Ratio / Mom</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.rs_ratio || '--'} / {selectedItem.rs_momentum || '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>1W Return</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: (selectedItem.ret_1w_pct || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.ret_1w_pct !== undefined ? `${selectedItem.ret_1w_pct >= 0 ? '+' : ''}${selectedItem.ret_1w_pct}%` : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>1M Return</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: (selectedItem.ret_1m_pct || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.ret_1m_pct !== undefined ? `${selectedItem.ret_1m_pct >= 0 ? '+' : ''}${selectedItem.ret_1m_pct}%` : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>YTD Return</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: (selectedItem.ret_ytd_pct || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.ret_ytd_pct !== undefined ? `${selectedItem.ret_ytd_pct >= 0 ? '+' : ''}${selectedItem.ret_ytd_pct}%` : '--'}
                    </div>
                  </div>
                </div>

                {/* Top Constituent Stocks */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Top Constituents ({selectedConstituents.length || selectedItem.top_symbols?.length || 0})
                  </div>

                  {loadingSelectedConstituents ? (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>
                      Loading stocks...
                    </div>
                  ) : selectedConstituents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                      {selectedConstituents.slice(0, 10).map((stk) => (
                        <div
                          key={stk.symbol}
                          onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: 'rgba(0,0,0,0.25)',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            transition: 'background 0.12s ease'
                          }}
                          className="hover-brighten"
                          title="Click to inspect stock"
                        >
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>{stk.symbol}</span>
                          <span style={{ color: 'var(--text-secondary)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stk.name}
                          </span>
                          <span style={{ fontWeight: 700, color: (stk.ret_today || 0) >= 0 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                            {stk.close ? `$${Number(stk.close).toFixed(2)}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : selectedItem.top_symbols && selectedItem.top_symbols.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedItem.top_symbols.map((sym) => (
                        <button
                          key={sym}
                          className="badge badge-outline"
                          onClick={() => onSelectStock && onSelectStock(sym)}
                          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px' }}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No constituent tickers</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top Movers Card */}
          <div className="radar-inspector-card">
            <div className="radar-inspector-title">Top Movers ({timeframe})</div>
            <div className="radar-top-movers-list">
              {topMovers.map((m) => {
                const delta = m.rank_delta ?? 0;
                const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : (m.ret_1w_pct ? `+${m.ret_1w_pct}%` : '+0');
                const isPositive = delta > 0 || (m.ret_1w_pct || 0) > 0;
                const dotColor = (QUADRANT_CONFIG[m.quadrant || 'Improving'] || QUADRANT_CONFIG.Improving).accent;

                return (
                  <div
                    key={m.name}
                    className="radar-mover-item"
                    onClick={() => handleSelectGroup(m.name)}
                    title={`Click to focus ${m.name}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: isPositive ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {deltaStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
