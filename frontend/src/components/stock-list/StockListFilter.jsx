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

  const min3Count = industryCounts
    .filter(({ count }) => count >= 3)
    .reduce((sum, { count }) => sum + count, 0);

  const less3Count = industryCounts
    .filter(({ count }) => count < 3)
    .reduce((sum, { count }) => sum + count, 0);

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
          <option value="MIN_3">
            Industry Groups (≥ 3) ({min3Count})
          </option>
          <option value="LESS_3">
            Industry Groups (&lt; 3) ({less3Count})
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
