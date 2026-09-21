import React, { useState, useMemo, useRef } from 'react';

const QUADRANT_CONFIG = {
  Leading: {
    label: 'LEADING',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    description: 'RS strong & accelerating (outperforming benchmark)',
  },
  Weakening: {
    label: 'WEAKENING',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.06)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    description: 'RS strong but decelerating (losing momentum)',
  },
  Lagging: {
    label: 'LAGGING',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    description: 'RS weak & decelerating (underperforming benchmark)',
  },
  Improving: {
    label: 'IMPROVING',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.06)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    description: 'RS weak but accelerating (turning up, early bottoming)',
  },
};

export default function RRGQuadrantChart({
  data = [],
  loading = false,
  onSelectGroup = null,
  selectedGroupName = null,
  trailBars = 5,
  onChangeTrailBars = null,
  hideToolbar = false,
}) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuadrantFilter, setActiveQuadrantFilter] = useState('ALL');
  const containerRef = useRef(null);

  // Filter data by search query and active quadrant
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.symbol && item.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesQuad = activeQuadrantFilter === 'ALL' || item.quadrant === activeQuadrantFilter;
      return matchesSearch && matchesQuad;
    });
  }, [data, searchQuery, activeQuadrantFilter]);

  // Compute symmetric domains around center (100, 100)
  const { minX, maxX, minY, maxY } = useMemo(() => {
    let maxDeltaX = 4.0;
    let maxDeltaY = 4.0;

    data.forEach((item) => {
      const dx = Math.abs((item.x || 100) - 100);
      const dy = Math.abs((item.y || 100) - 100);
      if (dx > maxDeltaX) maxDeltaX = dx;
      if (dy > maxDeltaY) maxDeltaY = dy;

      if (item.trail && Array.isArray(item.trail)) {
        item.trail.forEach((p) => {
          const tdx = Math.abs((p.x || 100) - 100);
          const tdy = Math.abs((p.y || 100) - 100);
          if (tdx > maxDeltaX) maxDeltaX = tdx;
          if (tdy > maxDeltaY) maxDeltaY = tdy;
        });
      }
    });

    const padFactor = 1.15;
    const finalDeltaX = Math.max(3.5, maxDeltaX * padFactor);
    const finalDeltaY = Math.max(3.5, maxDeltaY * padFactor);

    return {
      minX: 100 - finalDeltaX,
      maxX: 100 + finalDeltaX,
      minY: 100 - finalDeltaY,
      maxY: 100 + finalDeltaY,
    };
  }, [data]);

  // SVG dimensions
  const svgWidth = 920;
  const svgHeight = 640;
  const padding = { top: 40, right: 50, bottom: 50, left: 60 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (val) => {
    return padding.left + ((val - minX) / (maxX - minX)) * plotWidth;
  };

  const scaleY = (val) => {
    // Invert Y so higher momentum is at the top
    return padding.top + ((maxY - val) / (maxY - minY)) * plotHeight;
  };

  const centerX = scaleX(100);
  const centerY = scaleY(100);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: hideToolbar ? '0' : '12px',
        width: '100%',
        height: '100%',
        flex: 1,
        position: 'relative',
      }}
    >
      {/* Top Toolbar: Search, Filters, Trail Length, Clockwise Legend */}
      {!hideToolbar && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search box */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Filter by name / symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '4px 8px 4px 26px',
                  color: '#fff',
                  fontSize: '12px',
                  width: '180px',
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  opacity: 0.5,
                }}
              >
                🔍
              </span>
            </div>

            {/* Quadrant Quick Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {['ALL', 'Leading', 'Weakening', 'Lagging', 'Improving'].map((quad) => {
                const isActive = activeQuadrantFilter === quad;
                const qColor = quad === 'ALL' ? '#94a3b8' : QUADRANT_CONFIG[quad].color;
                return (
                  <button
                    key={quad}
                    type="button"
                    onClick={() => setActiveQuadrantFilter(quad)}
                    style={{
                      padding: '3px 9px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: isActive ? `1px solid ${qColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isActive ? `${qColor}25` : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {quad === 'ALL' ? 'All' : quad}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rotation Cycle Guide & Trail Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Clockwise cycle indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span>Cycle:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Improving</span>
              <span>➔</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Leading</span>
              <span>➔</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Weakening</span>
              <span>➔</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>Lagging</span>
            </div>

            {/* Trail Length Buttons */}
            {onChangeTrailBars && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trail:</span>
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChangeTrailBars(num)}
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      fontWeight: trailBars === num ? 700 : 500,
                      borderRadius: '4px',
                      border: trailBars === num ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: trailBars === num ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      color: trailBars === num ? '#38bdf8' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {num}d
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main SVG Quadrant Chart Surface */}
      <div
        className={hideToolbar ? "" : "glass-card"}
        style={{
          flex: 1,
          height: '100%',
          minHeight: '480px',
          position: 'relative',
          padding: hideToolbar ? '0' : '8px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: hideToolbar ? 'transparent' : undefined,
          border: hideToolbar ? 'none' : undefined,
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ width: '28px', height: '28px' }} />
            <span style={{ fontSize: '12px' }}>Calculating Relative Rotation Coordinates...</span>
          </div>
        ) : data.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No rotation data available for this date.</div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '680px',
              userSelect: 'none',
            }}
          >
            <defs>
              {/* Marker definitions for directional arrowheads */}
              {Object.entries(QUADRANT_CONFIG).map(([key, config]) => (
                <marker
                  key={`arrow-${key}`}
                  id={`arrow-${key}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={config.color} opacity="0.85" />
                </marker>
              ))}

              {/* Radial glow filter */}
              <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* 1. Quadrant Background Shading */}
            {/* Top-Right: LEADING */}
            <rect
              x={centerX}
              y={padding.top}
              width={svgWidth - padding.right - centerX}
              height={centerY - padding.top}
              fill={QUADRANT_CONFIG.Leading.bgColor}
            />
            {/* Bottom-Right: WEAKENING */}
            <rect
              x={centerX}
              y={centerY}
              width={svgWidth - padding.right - centerX}
              height={svgHeight - padding.bottom - centerY}
              fill={QUADRANT_CONFIG.Weakening.bgColor}
            />
            {/* Bottom-Left: LAGGING */}
            <rect
              x={padding.left}
              y={centerY}
              width={centerX - padding.left}
              height={svgHeight - padding.bottom - centerY}
              fill={QUADRANT_CONFIG.Lagging.bgColor}
            />
            {/* Top-Left: IMPROVING */}
            <rect
              x={padding.left}
              y={padding.top}
              width={centerX - padding.left}
              height={centerY - padding.top}
              fill={QUADRANT_CONFIG.Improving.bgColor}
            />

            {/* 2. Quadrant Corner Watermark Titles */}
            {/* Top-Right: LEADING */}
            <text
              x={svgWidth - padding.right - 14}
              y={padding.top + 24}
              textAnchor="end"
              fill={QUADRANT_CONFIG.Leading.color}
              fontSize="14"
              fontWeight="800"
              letterSpacing="1px"
              opacity="0.5"
            >
              LEADING ↗
            </text>
            {/* Bottom-Right: WEAKENING */}
            <text
              x={svgWidth - padding.right - 14}
              y={svgHeight - padding.bottom - 14}
              textAnchor="end"
              fill={QUADRANT_CONFIG.Weakening.color}
              fontSize="14"
              fontWeight="800"
              letterSpacing="1px"
              opacity="0.5"
            >
              WEAKENING ↘
            </text>
            {/* Bottom-Left: LAGGING */}
            <text
              x={padding.left + 14}
              y={svgHeight - padding.bottom - 14}
              textAnchor="start"
              fill={QUADRANT_CONFIG.Lagging.color}
              fontSize="14"
              fontWeight="800"
              letterSpacing="1px"
              opacity="0.5"
            >
              ↙ LAGGING
            </text>
            {/* Top-Left: IMPROVING */}
            <text
              x={padding.left + 14}
              y={padding.top + 24}
              textAnchor="start"
              fill={QUADRANT_CONFIG.Improving.color}
              fontSize="14"
              fontWeight="800"
              letterSpacing="1px"
              opacity="0.5"
            >
              ↖ IMPROVING
            </text>

            {/* 3. Crosshairs at (100, 100) */}
            <line
              x1={padding.left}
              y1={centerY}
              x2={svgWidth - padding.right}
              y2={centerY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <line
              x1={centerX}
              y1={padding.top}
              x2={centerX}
              y2={svgHeight - padding.bottom}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Center Benchmark Point (100, 100) */}
            <circle cx={centerX} cy={centerY} r="5" fill="#f8fafc" opacity="0.8" />
            <text
              x={centerX + 8}
              y={centerY - 8}
              fill="#94a3b8"
              fontSize="11"
              fontWeight="600"
            >
              SPY Benchmark (100, 100)
            </text>

            {/* 4. Axis Labels and Scale Ticks */}
            {/* X-Axis Bottom Label */}
            <text
              x={centerX}
              y={svgHeight - 14}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.5px"
            >
              RS-RATIO (TREND ➔)
            </text>

            {/* Y-Axis Left Label */}
            <text
              x={18}
              y={centerY}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
              fontWeight="700"
              letterSpacing="0.5px"
              transform={`rotate(-90 18 ${centerY})`}
            >
              RS-MOMENTUM (RATE OF CHANGE ➔)
            </text>

            {/* Tick marks on axes */}
            {[-4, -2, 2, 4].map((delta) => {
              const xVal = 100 + delta;
              const px = scaleX(xVal);
              if (px < padding.left || px > svgWidth - padding.right) return null;
              return (
                <g key={`x-tick-${delta}`}>
                  <line x1={px} y1={centerY - 4} x2={px} y2={centerY + 4} stroke="rgba(255, 255, 255, 0.3)" />
                  <text x={px} y={centerY + 16} textAnchor="middle" fill="#64748b" fontSize="10">
                    {xVal}
                  </text>
                </g>
              );
            })}

            {[-4, -2, 2, 4].map((delta) => {
              const yVal = 100 + delta;
              const py = scaleY(yVal);
              if (py < padding.top || py > svgHeight - padding.bottom) return null;
              return (
                <g key={`y-tick-${delta}`}>
                  <line x1={centerX - 4} y1={py} x2={centerX + 4} y2={py} stroke="rgba(255, 255, 255, 0.3)" />
                  <text x={centerX - 8} y={py + 3} textAnchor="end" fill="#64748b" fontSize="10">
                    {yVal}
                  </text>
                </g>
              );
            })}

            {/* 5. Historical Rotation Trails */}
            {filteredData.map((item) => {
              const trail = item.trail || [];
              if (trail.length < 2) return null;

              const isHovered = hoveredItem?.name === item.name;
              const isSelected = selectedGroupName === item.name;
              const quadColor = QUADRANT_CONFIG[item.quadrant]?.color || '#38bdf8';

              // Build path points
              const pathData = trail.map((p, idx) => {
                const px = scaleX(p.x);
                const py = scaleY(p.y);
                return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
              }).join(' ');

              return (
                <g key={`trail-${item.name}`} style={{ pointerEvents: 'none' }}>
                  {/* Trail Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={quadColor}
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.2}
                    strokeOpacity={isHovered || isSelected ? 0.9 : 0.35}
                    markerEnd={`url(#arrow-${item.quadrant})`}
                  />

                  {/* Historical trail dots */}
                  {trail.slice(0, -1).map((p, idx) => {
                    const px = scaleX(p.x);
                    const py = scaleY(p.y);
                    const alpha = 0.2 + (idx / trail.length) * 0.4;
                    return (
                      <circle
                        key={`trail-dot-${item.name}-${idx}`}
                        cx={px}
                        cy={py}
                        r={isHovered || isSelected ? 3 : 2}
                        fill={quadColor}
                        opacity={alpha}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* 6. Active Nodes & Labels */}
            {filteredData.map((item) => {
              const px = scaleX(item.x);
              const py = scaleY(item.y);
              const isHovered = hoveredItem?.name === item.name;
              const isSelected = selectedGroupName === item.name;
              const quadColor = QUADRANT_CONFIG[item.quadrant]?.color || '#38bdf8';
              const radius = isHovered || isSelected ? 8 : 6;
              const displayName = item.symbol || item.name;

              return (
                <g
                  key={`node-${item.name}`}
                  onClick={() => onSelectGroup && onSelectGroup(item)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer pulse circle when hovered or selected */}
                  {(isHovered || isSelected) && (
                    <circle
                      cx={px}
                      cy={py}
                      r={radius + 6}
                      fill="none"
                      stroke={quadColor}
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={px}
                    cy={py}
                    r={radius}
                    fill={quadColor}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    filter={isHovered || isSelected ? 'url(#node-glow)' : undefined}
                  />

                  {/* Node Label */}
                  <text
                    x={px}
                    y={py - radius - 4}
                    textAnchor="middle"
                    fill={isHovered || isSelected ? '#ffffff' : '#cbd5e1'}
                    fontSize={isHovered || isSelected ? '12' : '10.5'}
                    fontWeight={isHovered || isSelected ? '700' : '600'}
                    style={{
                      textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {displayName}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* 7. Interactive Hover Tooltip */}
        {hoveredItem && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: `1px solid ${QUADRANT_CONFIG[hoveredItem.quadrant]?.color || '#38bdf8'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
              minWidth: '220px',
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                {hoveredItem.name} {hoveredItem.symbol ? `(${hoveredItem.symbol})` : ''}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${QUADRANT_CONFIG[hoveredItem.quadrant]?.color}25`,
                  color: QUADRANT_CONFIG[hoveredItem.quadrant]?.color,
                  border: `1px solid ${QUADRANT_CONFIG[hoveredItem.quadrant]?.color}50`,
                }}
              >
                {hoveredItem.quadrant.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11.5px', color: '#94a3b8' }}>
              <div>
                RS-Ratio: <strong style={{ color: '#fff' }}>{hoveredItem.x.toFixed(2)}</strong>
              </div>
              <div>
                RS-Momentum: <strong style={{ color: '#fff' }}>{hoveredItem.y.toFixed(2)}</strong>
              </div>
              <div>
                1W Return:{' '}
                <strong style={{ color: hoveredItem.ret_1w >= 0 ? '#34d399' : '#f87171' }}>
                  {hoveredItem.ret_1w >= 0 ? '+' : ''}{hoveredItem.ret_1w.toFixed(2)}%
                </strong>
              </div>
              <div>
                Trails: <strong style={{ color: '#38bdf8' }}>{hoveredItem.trail?.length || 0} days</strong>
              </div>
            </div>

            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '10.5px', color: '#64748b' }}>
              {QUADRANT_CONFIG[hoveredItem.quadrant]?.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

