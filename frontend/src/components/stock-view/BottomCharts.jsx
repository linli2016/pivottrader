import React from 'react';
import MonthlyChart from './MonthlyChart';
import WeeklyChart from './WeeklyChart';

/**
 * BottomCharts - Horizontal container splitting the bottom row between Monthly (left) and Weekly (right) charts.
 */
export default function BottomCharts({
  data,
  symbol,
  companyName,
  isResizing = false,
  style = {},
  className = '',
}) {
  return (
    <div
      className={`stock-view-bottom-charts ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        minHeight: 0,
        pointerEvents: isResizing ? 'none' : 'auto',
        ...style,
      }}
    >
      {/* Monthly Chart (Left Bottom) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          borderRight: '1px solid var(--border-color, #1e293b)',
        }}
      >
        <MonthlyChart
          data={data}
          symbol={symbol}
          companyName={companyName}
          height="100%"
        />
      </div>

      {/* Weekly Chart (Right Bottom) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
        }}
      >
        <WeeklyChart
          data={data}
          symbol={symbol}
          companyName={companyName}
          height="100%"
        />
      </div>
    </div>
  );
}

