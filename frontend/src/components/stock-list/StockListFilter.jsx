import React from 'react';

export default function StockListFilter({
  showIndustryFilter = false,
  selectedIndustry = 'ALL',
  onIndustryChange = () => {},
  industryCounts = [],
  totalCount = 0,
  filterExtra = null,
  industryLabel = 'All Industry Groups',
  isSelectMode = false,
  toggleSelectMode = () => {},
}) {
  if (!showIndustryFilter && !filterExtra) {
    return null;
  }

  const renderedExtra = typeof filterExtra === 'function'
    ? filterExtra({ isSelectMode, toggleSelectMode })
    : filterExtra;

  return (
    <div className="stock-list-filter-bar">
      {showIndustryFilter && (
        <select
          value={selectedIndustry}
          onChange={(e) => onIndustryChange(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 8px',
            background: 'rgba(30, 41, 59, 0.85)',
            color: selectedIndustry !== 'ALL' ? '#38bdf8' : 'var(--text-primary, #f8fafc)',
            border: selectedIndustry !== 'ALL' ? '1px solid #38bdf8' : '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: selectedIndustry !== 'ALL' ? '600' : '400',
            outline: 'none',
            cursor: 'pointer',
          }}
          title="Filter stocks by industry/group"
        >
          <option value="ALL">
            {industryLabel} ({totalCount})
          </option>
          {industryCounts.map(({ industry, count }) => (
            <option key={industry} value={industry}>
              {industry} ({count})
            </option>
          ))}
        </select>
      )}

      {renderedExtra}
    </div>
  );
}
