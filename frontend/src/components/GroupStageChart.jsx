import React, { useState } from 'react';
import GroupChart, { STAGE_CONFIG } from './GroupChart';

export { STAGE_CONFIG };

/**
 * Stan Weinstein Stage Analysis Component for Groups
 * Composes GroupChart and provides:
 * - Detailed stage bias banner
 * - Key metrics bar with breadth breakdown (Stocks > 200d MA, Stocks in Stage 2)
 * - Constituent group leaders & breakouts row
 * Used directly by the Industry Radar page (GroupRadarTab).
 */
export default function GroupStageChart({
  groupType = 'industries',
  groupName = '',
  onSelectStock = () => {},
  height = 420,
  isCompact = false,
  date = null,
  onDataLoaded = null
}) {
  const [stageData, setStageData] = useState(null);

  const handleDataLoaded = (chartData) => {
    setStageData(chartData);
    if (onDataLoaded) {
      onDataLoaded(chartData);
    }
  };

  const breadth = stageData?.breadth || null;

  return (
    <GroupChart
      groupType={groupType}
      groupName={groupName}
      date={date}
      height={height}
      onSelectStock={onSelectStock}
      showHeader={true}
      showStageBadge={true}
      onDataLoaded={handleDataLoaded}
      isCompact={isCompact}
    >
      {/* Constituent Leaders Row */}
      {breadth && breadth.leaders && breadth.leaders.length > 0 && !isCompact && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Top Group Leaders & Breakouts (Click to inspect stock)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {breadth.leaders.map((stk) => (
              <button
                key={stk.symbol}
                type="button"
                onClick={() => onSelectStock && onSelectStock(stk.symbol)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-brighten"
                title={`${stk.name} - RS Rank: ${stk.rs_rank}`}
              >
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{stk.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                  ${Number(stk.close).toFixed(2)}
                </span>
                {stk.dist_sma200_pct !== undefined && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: stk.dist_sma200_pct >= 0 ? '#34d399' : '#f87171'
                    }}
                  >
                    {stk.dist_sma200_pct >= 0 ? '+' : ''}{stk.dist_sma200_pct}%
                  </span>
                )}
                {stk.stage2_days > 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontWeight: 700
                    }}
                  >
                    Stage 2
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </GroupChart>
  );
}
