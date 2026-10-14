import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import RRGQuadrantChart from './RRGQuadrantChart';
import GroupStageChart from './GroupStageChart';

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

export default function GroupRadarTab({ onSelectStock = () => {}, tradingDates = [], initialStageFilter = 'all' }) {
  const [activeTab, setActiveTab] = useState('sectors'); // 'sectors', 'industries', or 'themes'
  const [viewMode, setViewMode] = useState('rrg'); // 'rrg' | 'board' | 'heatmap' | 'table'
  const [stageFilter, setStageFilter] = useState(initialStageFilter); // 'all' | 'stage2' | 'stage1' | 'stage3' | 'stage4' | 'positive_rs'
  const [timeframe, setTimeframe] = useState('1wk'); // '1wk' | '1mo' | '3mo' | '6mo'
  const [selectedGroupPerTab, setSelectedGroupPerTab] = useState({
    sectors: null,
    industries: null,
    themes: null
  });
  const selectedGroupName = selectedGroupPerTab[activeTab] || null;

  const setSelectedGroupName = (name) => {
    setSelectedGroupPerTab((prev) => ({
      ...prev,
      [activeTab]: name
    }));
  };
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

  // Panel Width & Collapse state with localStorage persistence
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pt_radar_left_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [isRightCollapsed, setIsRightCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pt_radar_right_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem('pt_radar_left_width'));
      if (v >= 180 && v <= 520) return v;
    } catch (_) {}
    return 270;
  });

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem('pt_radar_right_width'));
      if (v >= 240 && v <= 680) return v;
    } catch (_) {}
    return 320;
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const currentLeftWidthRef = useRef(leftPanelWidth);
  currentLeftWidthRef.current = leftPanelWidth;
  const currentRightWidthRef = useRef(rightPanelWidth);
  currentRightWidthRef.current = rightPanelWidth;

  const toggleLeftPanel = () => {
    setIsLeftCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pt_radar_left_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  const toggleRightPanel = () => {
    setIsRightCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pt_radar_right_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  const startResizingLeft = useCallback((e) => {
    e.preventDefault();
    setIsResizingLeft(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = currentLeftWidthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingRight = useCallback((e) => {
    e.preventDefault();
    setIsResizingRight(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = currentRightWidthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        const delta = e.clientX - resizeStartXRef.current;
        const newWidth = Math.min(Math.max(resizeStartWidthRef.current + delta, 180), Math.min(window.innerWidth * 0.45, 520));
        currentLeftWidthRef.current = newWidth;
        setLeftPanelWidth(newWidth);
      } else if (isResizingRight) {
        const delta = resizeStartXRef.current - e.clientX;
        const newWidth = Math.min(Math.max(resizeStartWidthRef.current + delta, 240), Math.min(window.innerWidth * 0.55, 680));
        currentRightWidthRef.current = newWidth;
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft) {
        setIsResizingLeft(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_radar_left_width', String(currentLeftWidthRef.current));
        } catch (_) {}
      }
      if (isResizingRight) {
        setIsResizingRight(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem('pt_radar_right_width', String(currentRightWidthRef.current));
        } catch (_) {}
      }
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingLeft, isResizingRight]);

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
    if (!name) return;
    selectGroup(name);
  };

  const inspectorRequestIdRef = useRef(0);

  const fetchInspectorConstituents = async (name) => {
    if (!name) return;
    const reqId = ++inspectorRequestIdRef.current;
    setLoadingSelectedConstituents(true);
    try {
      const dateParam = selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : '';
      const res = await fetch(`${API_BASE}/api/groups/constituents?type=${activeTab}&name=${encodeURIComponent(name)}${dateParam}`);
      if (res.ok && reqId === inspectorRequestIdRef.current) {
        const items = await res.json();
        if (reqId === inspectorRequestIdRef.current) {
          setSelectedConstituents(Array.isArray(items) ? items : []);
        }
      }
    } catch (err) {
      if (reqId === inspectorRequestIdRef.current) {
        console.error('Error loading inspector constituents:', err);
      }
    } finally {
      if (reqId === inspectorRequestIdRef.current) {
        setLoadingSelectedConstituents(false);
      }
    }
  };

  // Always keep current selected sector/industry/theme populated and persistent
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      const current = selectedGroupPerTab[activeTab];
      const exists = current && data.some((d) => d.name === current);
      if (!exists) {
        const fallback = data[0].name;
        setSelectedGroupPerTab((prev) => ({
          ...prev,
          [activeTab]: fallback
        }));
        fetchInspectorConstituents(fallback);
      } else {
        fetchInspectorConstituents(current);
      }
    }
  }, [data, activeTab]);

  useEffect(() => {
    fetchGroupStrength(activeTab, selectedDate);
    fetchRRGData(activeTab, selectedDate, trailBars);
  }, [activeTab, selectedDate, trailBars]);

  useEffect(() => {
    const handleNavRadar = (e) => {
      if (e.detail?.stageFilter) {
        setStageFilter(e.detail.stageFilter);
      }
      const targetTab = e.detail?.activeTab || activeTab;
      if (e.detail?.activeTab) {
        setActiveTab(e.detail.activeTab);
      }
      if (e.detail?.groupName) {
        setSelectedGroupPerTab((prev) => ({
          ...prev,
          [targetTab]: e.detail.groupName
        }));
        fetchInspectorConstituents(e.detail.groupName);
      }
    };
    window.addEventListener('pt-navigate-radar', handleNavRadar);
    return () => window.removeEventListener('pt-navigate-radar', handleNavRadar);
  }, [activeTab]);


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

  // Group sectors into 4 RRG quadrants
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

  // Stage distribution counts for the active dataset
  const stageCounts = useMemo(() => {
    const counts = { all: 0, stage2: 0, stage1: 0, stage3: 0, stage4: 0, positive_rs: 0 };
    if (!Array.isArray(data)) return counts;
    counts.all = data.length;
    data.forEach((d) => {
      if (d.stage_num === 2 || (typeof d.stage === 'string' && d.stage.includes('Stage 2'))) counts.stage2++;
      else if (d.stage_num === 1 || (typeof d.stage === 'string' && d.stage.includes('Stage 1'))) counts.stage1++;
      else if (d.stage_num === 3 || (typeof d.stage === 'string' && d.stage.includes('Stage 3'))) counts.stage3++;
      else if (d.stage_num === 4 || (typeof d.stage === 'string' && d.stage.includes('Stage 4'))) counts.stage4++;
      if ((d.mansfield_rs ?? -999) > 0) counts.positive_rs++;
    });
    return counts;
  }, [data]);

  // Filtered & Sorted groups
  const filteredAndSortedGroups = useMemo(() => {
    let list = [...data];

    // Sector pill filter
    if (activeTab === 'sectors' && selectedSectorFilter) {
      list = list.filter((g) => g.name === selectedSectorFilter);
    }

    // Stan Weinstein Stage filter
    if (stageFilter === 'stage2') {
      list = list.filter((g) => g.stage_num === 2 || (typeof g.stage === 'string' && g.stage.includes('Stage 2')));
    } else if (stageFilter === 'stage1') {
      list = list.filter((g) => g.stage_num === 1 || (typeof g.stage === 'string' && g.stage.includes('Stage 1')));
    } else if (stageFilter === 'stage3') {
      list = list.filter((g) => g.stage_num === 3 || (typeof g.stage === 'string' && g.stage.includes('Stage 3')));
    } else if (stageFilter === 'stage4') {
      list = list.filter((g) => g.stage_num === 4 || (typeof g.stage === 'string' && g.stage.includes('Stage 4')));
    } else if (stageFilter === 'positive_rs') {
      list = list.filter((g) => (g.mansfield_rs ?? -999) > 0);
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
  }, [data, activeTab, selectedSectorFilter, stageFilter, searchTerm, sortBy, sortOrder]);

  const selectedItem = useMemo(() => {
    if (!selectedGroupName || !Array.isArray(data)) return null;
    return data.find((d) => d.name === selectedGroupName) || null;
  }, [selectedGroupName, data]);

  const [activeChartSummary, setActiveChartSummary] = useState(null);

  useEffect(() => {
    setActiveChartSummary(null);
  }, [selectedGroupName, activeTab]);

  const handleStageDataLoaded = useCallback((chartData) => {
    if (!chartData || !chartData.stage_summary) return;
    const summary = chartData.stage_summary;
    setActiveChartSummary(summary);
    if (chartData.name && summary.stage_badge) {
      const stageNum = parseInt(summary.stage_badge.replace(/\D/g, ''), 10) || 1;
      setData((prevData) => {
        if (!Array.isArray(prevData)) return prevData;
        const target = prevData.find((d) => d.name === chartData.name);
        if (!target) return prevData;
        if (target.stage_num === stageNum && target.stage_badge === summary.stage_badge && target.mansfield_rs === summary.mansfield_rs) {
          return prevData;
        }
        return prevData.map((d) => {
          if (d.name === chartData.name) {
            return {
              ...d,
              stage: summary.stage,
              stage_badge: summary.stage_badge,
              stage_num: stageNum,
              stage_color: summary.stage_color,
              mansfield_rs: summary.mansfield_rs !== undefined ? summary.mansfield_rs : d.mansfield_rs,
              pct_in_stage2: chartData.breadth?.pct_in_stage2 ?? d.pct_in_stage2
            };
          }
          return d;
        });
      });
    }
  }, []);

  const displayStageBadge = activeChartSummary?.stage_badge || selectedItem?.stage_badge || (selectedItem?.stage_num ? `Stage ${selectedItem.stage_num}` : '--');
  const displayStageNum = activeChartSummary?.stage_badge ? parseInt(activeChartSummary.stage_badge.replace(/\D/g, ''), 10) : selectedItem?.stage_num;
  const displayMansfieldRs = activeChartSummary?.mansfield_rs !== undefined ? activeChartSummary.mansfield_rs : selectedItem?.mansfield_rs;
  const displayPctInStage2 = activeChartSummary?.pct_in_stage2 !== undefined ? activeChartSummary.pct_in_stage2 : selectedItem?.pct_in_stage2;

  const scrollToGroupRow = (name) => {
    if (!name) return;
    const rankEl = document.getElementById(`radar-rank-row-${encodeURIComponent(name)}`);
    if (rankEl) {
      rankEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const tableEl = document.getElementById(`radar-table-row-${encodeURIComponent(name)}`);
    if (tableEl && viewMode === 'table') {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const selectGroup = (name) => {
    if (!name) return;
    setSelectedGroupName(name);
    fetchInspectorConstituents(name);
    setTimeout(() => scrollToGroupRow(name), 10);
  };

  const handleNextGroup = () => {
    if (!filteredAndSortedGroups || filteredAndSortedGroups.length === 0) return;
    const currentIndex = filteredAndSortedGroups.findIndex((g) => g.name === selectedGroupName);
    let nextIndex = 0;
    if (currentIndex >= 0) {
      nextIndex = currentIndex < filteredAndSortedGroups.length - 1 ? currentIndex + 1 : 0;
    } else if (viewMode === 'stage' && filteredAndSortedGroups.length > 1) {
      nextIndex = 1;
    }
    const nextGroup = filteredAndSortedGroups[nextIndex];
    if (nextGroup) {
      selectGroup(nextGroup.name);
    }
  };

  const handlePrevGroup = () => {
    if (!filteredAndSortedGroups || filteredAndSortedGroups.length === 0) return;
    const currentIndex = filteredAndSortedGroups.findIndex((g) => g.name === selectedGroupName);
    let prevIndex = filteredAndSortedGroups.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else if (currentIndex === 0) {
      prevIndex = filteredAndSortedGroups.length - 1;
    }
    const prevGroup = filteredAndSortedGroups[prevIndex];
    if (prevGroup) {
      selectGroup(prevGroup.name);
    }
  };

  // Keyboard navigation: Up/Down arrow keys move between sectors / industries / themes
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input, textarea, or select element
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        return;
      }

      // Don't intercept if modal or drawer is open
      if (isThemeModalOpen || document.querySelector('.full-page-modal-backdrop') || e.defaultPrevented) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextGroup();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevGroup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredAndSortedGroups, selectedGroupName, viewMode, isThemeModalOpen]);

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

          {/* View Mode Switcher: ① RRG / ② Board / ③ Heatmap / ④ Table / ⑤ Stage Chart */}
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
            <button
              className={`radar-pill-btn ${viewMode === 'stage' ? 'view-active' : ''}`}
              onClick={() => setViewMode('stage')}
              title="Stan Weinstein 40-Week Stage Analysis & Price Chart"
            >
              ⑤ Stage Chart
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

          {/* Search box directly on the same line as tabs */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="select-input"
              placeholder={`Search ${activeTab} name...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '190px',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '5px 28px 5px 12px',
                fontSize: '12px'
              }}
            />
            {searchTerm && (
              <button
                type="button"
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
        </div>

        <div className="radar-toolbar-right">

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

      {/* Weinstein Stage & Mansfield RS Filter Sub-bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '-6px',
          marginBottom: '14px',
          padding: '7px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
            Weinstein Filter:
          </span>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStageFilter('all')}
            style={{ fontSize: '11px', padding: '3px 9px' }}
          >
            All ({stageCounts.all})
          </button>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'stage2' ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === 'stage2' ? 'all' : 'stage2')}
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              color: '#10b981',
              borderColor: stageFilter === 'stage2' ? '#10b981' : 'rgba(16, 185, 129, 0.3)',
              background: stageFilter === 'stage2' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)'
            }}
            title="Stage 2: Advancing Phase - Prime focus for buying (Stan Weinstein Rule #1)"
          >
            🟩 Stage 2 ({stageCounts.stage2})
          </button>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'stage1' ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === 'stage1' ? 'all' : 'stage1')}
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              color: '#38bdf8',
              borderColor: stageFilter === 'stage1' ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)',
              background: stageFilter === 'stage1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.08)'
            }}
            title="Stage 1: Basing Phase - Accumulation before markup"
          >
            🟦 Stage 1 ({stageCounts.stage1})
          </button>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'stage3' ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === 'stage3' ? 'all' : 'stage3')}
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              color: '#f59e0b',
              borderColor: stageFilter === 'stage3' ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)',
              background: stageFilter === 'stage3' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.08)'
            }}
            title="Stage 3: Topping Phase - Distribution & churning"
          >
            🟨 Stage 3 ({stageCounts.stage3})
          </button>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'stage4' ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === 'stage4' ? 'all' : 'stage4')}
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              color: '#f43f5e',
              borderColor: stageFilter === 'stage4' ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)',
              background: stageFilter === 'stage4' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.08)'
            }}
            title="Stage 4: Declining Phase - Markdown, avoid buying"
          >
            🟥 Stage 4 ({stageCounts.stage4})
          </button>
          <button
            type="button"
            className={`radar-pill-btn ${stageFilter === 'positive_rs' ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === 'positive_rs' ? 'all' : 'positive_rs')}
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              color: '#34d399',
              borderColor: stageFilter === 'positive_rs' ? '#34d399' : 'rgba(52, 211, 153, 0.3)',
              background: stageFilter === 'positive_rs' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.06)'
            }}
            title="Mansfield Relative Strength > 0 (Outperforming SPY Benchmark)"
          >
            📈 Mansfield RS &gt; 0 ({stageCounts.positive_rs})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {stageFilter !== 'all' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStageFilter('all')}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              Reset Filter ✕
            </button>
          )}

          {/* Panel Visibility Toggles */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)', gap: '2px' }}>
            <button
              type="button"
              onClick={toggleLeftPanel}
              style={{
                background: !isLeftCollapsed ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                color: !isLeftCollapsed ? '#38bdf8' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={isLeftCollapsed ? 'Show Left Panel (Ranks)' : 'Hide Left Panel (Ranks)'}
            >
              <span>{isLeftCollapsed ? '▷' : '◀'}</span>
              <span>Left Panel</span>
            </button>
            <button
              type="button"
              onClick={toggleRightPanel}
              style={{
                background: !isRightCollapsed ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                color: !isRightCollapsed ? '#38bdf8' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={isRightCollapsed ? 'Show Right Panel (Inspector)' : 'Hide Right Panel (Inspector)'}
            >
              <span>Right Panel</span>
              <span>{isRightCollapsed ? '◁' : '▶'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Institutional Layout */}
      <div className="radar-3col-layout">
        {/* LEFT COLUMN: Ranks List or Collapsed Strip */}
        {isLeftCollapsed ? (
          <div
            onClick={toggleLeftPanel}
            title="Expand Left Panel (Ranks)"
            className="radar-collapsed-bar"
            style={{
              width: '28px',
              minWidth: '28px',
              maxWidth: '28px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '14px 0',
              gap: '12px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>▶</span>
            <span
              style={{
                writingMode: 'vertical-rl',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)'
              }}
            >
              {activeTab === 'sectors' ? 'Sectors' : activeTab === 'industries' ? 'Industries' : 'Themes'} ({filteredAndSortedGroups.length})
            </span>
          </div>
        ) : (
          <div
            className="radar-left-col"
            style={{
              width: `${leftPanelWidth}px`,
              minWidth: '180px',
              maxWidth: '520px',
              flexShrink: 0
            }}
          >
            <div className="radar-left-header">
              <div className="radar-left-title">
                <span>{activeTab === 'sectors' ? 'Sector' : activeTab === 'industries' ? 'Industry' : 'Theme'} ranks</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filteredAndSortedGroups.length}</span>
                  <div style={{ display: 'inline-flex', gap: '3px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '1px 6px', fontSize: '10px', height: '22px', minWidth: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={handlePrevGroup}
                      disabled={filteredAndSortedGroups.length === 0}
                      title="Previous Group (↑ Up Arrow)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '1px 6px', fontSize: '10px', height: '22px', minWidth: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={handleNextGroup}
                      disabled={filteredAndSortedGroups.length === 0}
                      title="Next Group (↓ Down Arrow)"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '1px 6px', fontSize: '10px', height: '22px', minWidth: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                      onClick={toggleLeftPanel}
                      title="Hide Left Panel (◀)"
                    >
                      ◀
                    </button>
                  </div>
                </div>
              </div>
            <div className="radar-left-subtitle">Use ↑ / ↓ arrow keys or buttons to navigate.</div>
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
                  id={`radar-rank-row-${encodeURIComponent(g.name)}`}
                  className={`radar-rank-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectGroup(g.name)}
                  title={`#${g.rank} ${g.name} | ${g.stage_badge || g.stage || g.quadrant || 'Stage 1'} | MRS: ${g.mansfield_rs !== undefined && g.mansfield_rs !== null ? (g.mansfield_rs > 0 ? '+' : '') + Number(g.mansfield_rs).toFixed(1) + '%' : '--'} | Δ ${delta} | ${timeframe}: ${retStr}`}
                >
                  <span className="radar-rank-num">#{g.rank || '-'}</span>
                  <div className="radar-rank-name-wrap">
                    <div className="radar-rank-name" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                      {g.stage_num && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            lineHeight: 1.1,
                            flexShrink: 0,
                            background: g.stage_num === 2 ? 'rgba(16, 185, 129, 0.25)' : g.stage_num === 1 ? 'rgba(56, 189, 248, 0.25)' : g.stage_num === 3 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)',
                            color: g.stage_num === 2 ? '#10b981' : g.stage_num === 1 ? '#38bdf8' : g.stage_num === 3 ? '#f59e0b' : '#f43f5e',
                            border: `1px solid ${g.stage_num === 2 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
                          }}
                        >
                          S{g.stage_num}
                        </span>
                      )}
                    </div>
                    <div className="radar-rank-meta" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {g.mansfield_rs !== undefined && g.mansfield_rs !== null && (
                        <span
                          style={{
                            color: g.mansfield_rs > 0 ? '#34d399' : '#f87171',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px'
                          }}
                        >
                          RS {g.mansfield_rs > 0 ? '+' : ''}{Number(g.mansfield_rs).toFixed(1)}%
                        </span>
                      )}
                      <span>{g.stock_count ? `${g.stock_count} stks` : ''}</span>
                    </div>
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
      )}

      {/* LEFT SPLITTER */}
      {!isLeftCollapsed && (
        <div
          onMouseDown={startResizingLeft}
          className={`radar-panel-splitter ${isResizingLeft ? 'active' : ''}`}
          title="Drag to resize left ranks panel"
        >
          <div className="radar-splitter-bar" />
        </div>
      )}

      {/* CENTER COLUMN: Main Canvas */}
      <div className="radar-center-col" style={{ flex: 1, minWidth: 0 }}>
          <div className="radar-canvas-header">
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

          {viewMode !== 'stage' && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '10px', height: '18px', lineHeight: '18px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {viewMode === 'rrg' && 'Lines show where leaders moved over the window • hover any bubble for detail'}
              {viewMode === 'board' && 'Quadrants matrix showing leaders & rotation stages • click card to inspect'}
              {viewMode === 'heatmap' && 'Rank-ordered performance tiles tinted by quadrant status • click tile to inspect'}
              {viewMode === 'table' && 'Detailed metrics table with multi-timeframe returns & relative strength'}
            </div>
          )}

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
                  style={{ textAlign: 'left', padding: '10px 12px', cursor: 'pointer', minWidth: '200px' }}
                >
                  NAME {sortBy === 'name' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('stage_num')}
                  style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer', width: '105px', minWidth: '95px', whiteSpace: 'nowrap' }}
                  title="Stan Weinstein 4-Stage Status (Stage 1 Basing, Stage 2 Advancing, Stage 3 Topping, Stage 4 Declining)"
                >
                  STAGE {sortBy === 'stage_num' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('mansfield_rs')}
                  style={{ textAlign: 'right', padding: '10px 10px', cursor: 'pointer', width: '105px' }}
                  title="Mansfield Relative Strength vs SPY (Positive = Outperforming benchmark, Negative = Underperforming)"
                >
                  Mansfield RS {sortBy === 'mansfield_rs' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('pct_in_stage2')}
                  style={{ textAlign: 'right', padding: '10px 10px', cursor: 'pointer', width: '85px' }}
                  title="% of constituent stocks in Stage 2 (Weinstein Breadth Confirmation)"
                >
                  % in S2 {sortBy === 'pct_in_stage2' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('today_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  Today {sortBy === 'today_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_1w_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  1W {sortBy === 'ret_1w_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_1m_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  1M {sortBy === 'ret_1m_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_3m_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  3M {sortBy === 'ret_3m_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('ret_ytd_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
                >
                  YTD {sortBy === 'ret_ytd_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('rs_rank')}
                  style={{ textAlign: 'center', padding: '10px 12px', cursor: 'pointer', width: '75px' }}
                >
                  RS Rank {sortBy === 'rs_rank' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('dist_52wh_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '85px' }}
                >
                  52wH {sortBy === 'dist_52wh_pct' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  onClick={() => handleSort('rvol_pct')}
                  style={{ textAlign: 'right', padding: '10px 12px', cursor: 'pointer', width: '80px' }}
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
                  <td colSpan={activeTab === 'themes' ? 13 : 12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No {activeTab} matched your search or stage filter.
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
                        id={`radar-table-row-${encodeURIComponent(group.name)}`}
                        onClick={() => {
                          selectGroup(group.name);
                          toggleGroupExpand(group.name);
                        }}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: selectedGroupName === group.name
                            ? 'rgba(56, 189, 248, 0.16)'
                            : isExpanded
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                        className={`group-row ${selectedGroupName === group.name ? 'selected-group-row' : ''}`}
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

                        {/* Weinstein Stage */}
                        <td style={{ textAlign: 'center', padding: '11px 12px', whiteSpace: 'nowrap', minWidth: '95px' }}>
                          {group.stage_num ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: group.stage_num === 2 ? 'rgba(16, 185, 129, 0.2)' : group.stage_num === 1 ? 'rgba(56, 189, 248, 0.2)' : group.stage_num === 3 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                color: group.stage_num === 2 ? '#10b981' : group.stage_num === 1 ? '#38bdf8' : group.stage_num === 3 ? '#f59e0b' : '#f43f5e',
                                border: `1px solid ${group.stage_num === 2 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`
                              }}
                              title={group.stage || `Stage ${group.stage_num}`}
                            >
                              {group.stage_badge || `Stage ${group.stage_num}`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* Mansfield RS */}
                        <td style={{ textAlign: 'right', padding: '11px 10px', fontFamily: 'var(--font-mono)' }}>
                          {group.mansfield_rs !== undefined && group.mansfield_rs !== null ? (
                            <span style={{
                              fontWeight: 700,
                              color: group.mansfield_rs > 0 ? '#10b981' : group.mansfield_rs < 0 ? '#f43f5e' : 'var(--text-secondary)'
                            }}>
                              {group.mansfield_rs > 0 ? '+' : ''}{Number(group.mansfield_rs).toFixed(1)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* % in Stage 2 */}
                        <td style={{ textAlign: 'right', padding: '11px 10px', fontFamily: 'var(--font-mono)' }}>
                          {group.pct_in_stage2 !== undefined && group.pct_in_stage2 !== null ? (
                            <span style={{
                              fontWeight: 600,
                              color: group.pct_in_stage2 >= 50 ? '#10b981' : group.pct_in_stage2 >= 25 ? '#38bdf8' : 'var(--text-secondary)'
                            }}>
                              {Number(group.pct_in_stage2).toFixed(0)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
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
                            colSpan={activeTab === 'themes' ? 13 : 12}
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

          {/* 5. STAGE ANALYSIS VIEW (Stan Weinstein 40-Week MA & Mansfield RS) */}
          {viewMode === 'stage' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Quick Group Navigator Bar for Stage View */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  marginBottom: '10px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedItem && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        {selectedItem.rank ? `#${selectedItem.rank} ` : ''}{selectedItem.name}
                      </span>

                      {/* Stage & RS Quick Diagnostic Badges */}
                      {displayStageBadge && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: displayStageNum === 2 ? 'rgba(16, 185, 129, 0.25)' : displayStageNum === 1 ? 'rgba(56, 189, 248, 0.25)' : displayStageNum === 3 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)',
                            color: displayStageNum === 2 ? '#10b981' : displayStageNum === 1 ? '#38bdf8' : displayStageNum === 3 ? '#f59e0b' : '#f43f5e',
                            border: `1px solid ${displayStageNum === 2 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`
                          }}
                        >
                          {displayStageBadge}
                        </span>
                      )}
                      {displayMansfieldRs !== undefined && displayMansfieldRs !== null && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: displayMansfieldRs > 0 ? '#34d399' : '#f87171',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          Mansfield RS: {displayMansfieldRs > 0 ? '+' : ''}{Number(displayMansfieldRs).toFixed(1)}%
                        </span>
                      )}
                      {displayPctInStage2 !== undefined && displayPctInStage2 !== null && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Breadth: <strong style={{ color: '#ffffff' }}>{Number(displayPctInStage2).toFixed(0)}%</strong> in S2
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrevGroup}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    title="Previous Group (↑ Up Arrow)"
                  >
                    ◀ Prev
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleNextGroup}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    title="Next Group (↓ Down Arrow)"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              <GroupStageChart
                groupType={activeTab}
                groupName={selectedGroupName || (filteredAndSortedGroups[0]?.name || '')}
                onSelectStock={onSelectStock}
                height={500}
                isCompact={false}
                onDataLoaded={handleStageDataLoaded}
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SPLITTER */}
      {!isRightCollapsed && (
        <div
          onMouseDown={startResizingRight}
          className={`radar-panel-splitter ${isResizingRight ? 'active' : ''}`}
          title="Drag to resize right inspector panel"
        >
          <div className="radar-splitter-bar" />
        </div>
      )}

      {/* RIGHT COLUMN: Selection Inspector & Top Movers or Collapsed Strip */}
      {isRightCollapsed ? (
        <div
          onClick={toggleRightPanel}
          title="Expand Right Panel (Inspector)"
          className="radar-collapsed-bar"
          style={{
            width: '28px',
            minWidth: '28px',
            maxWidth: '28px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '14px 0',
            gap: '12px',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '11px', color: '#38bdf8' }}>◀</span>
          <span
            style={{
              writingMode: 'vertical-rl',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)'
            }}
          >
            Inspector &amp; Movers
          </span>
        </div>
      ) : (
        <div
          className="radar-right-col"
          style={{
            width: `${rightPanelWidth}px`,
            minWidth: '240px',
            maxWidth: '680px',
            flexShrink: 0
          }}
        >
          {/* Selected Group Card */}
          <div className="radar-inspector-card">
            <div className="radar-inspector-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Selected {activeTab === 'sectors' ? 'Sector' : activeTab === 'industries' ? 'Industry' : 'Theme'}</span>
              <div style={{ display: 'inline-flex', gap: '3px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px', height: '20px', minWidth: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handlePrevGroup}
                  disabled={filteredAndSortedGroups.length === 0}
                  title="Previous Group (↑ Up Arrow)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px', height: '20px', minWidth: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleNextGroup}
                  disabled={filteredAndSortedGroups.length === 0}
                  title="Next Group (↓ Down Arrow)"
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px', height: '20px', minWidth: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                  onClick={toggleRightPanel}
                  title="Hide Right Panel (▶)"
                >
                  ▶
                </button>
              </div>
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
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Weinstein Stage</div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: displayStageNum === 2 ? '#10b981' : displayStageNum === 1 ? '#38bdf8' : displayStageNum === 3 ? '#f59e0b' : displayStageNum === 4 ? '#f43f5e' : 'var(--text-secondary)'
                    }}>
                      {displayStageBadge || (displayStageNum ? `Stage ${displayStageNum}` : '--')}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mansfield RS vs SPY</div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: (displayMansfieldRs ?? 0) > 0 ? '#34d399' : (displayMansfieldRs ?? 0) < 0 ? '#f87171' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {displayMansfieldRs !== undefined && displayMansfieldRs !== null ? `${displayMansfieldRs > 0 ? '+' : ''}${Number(displayMansfieldRs).toFixed(1)}%` : '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>RS-Ratio / Mom</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      {selectedItem.rs_ratio || '--'} / {selectedItem.rs_momentum || '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>% in Stage 2</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: (displayPctInStage2 ?? 0) >= 50 ? '#34d399' : '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      {displayPctInStage2 !== undefined && displayPctInStage2 !== null ? `${Number(displayPctInStage2).toFixed(0)}%` : '--'}
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
                </div>

                {/* Stan Weinstein 40-Week Stage Chart in Inspector */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Stage Chart (40w SMA)
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '10.5px' }}
                      onClick={() => setViewMode('stage')}
                      title="Expand full screen Stage Chart"
                    >
                      Full Chart ↗
                    </button>
                  </div>
                  <GroupStageChart
                    groupType={activeTab}
                    groupName={selectedItem.name}
                    onSelectStock={onSelectStock}
                    height={250}
                    isCompact={true}
                    onDataLoaded={handleStageDataLoaded}
                  />
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
      )}
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
