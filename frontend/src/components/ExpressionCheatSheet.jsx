import React, { useState } from 'react';

const CHEAT_SHEET_CATEGORIES = [
  {
    id: 'price',
    title: 'Price & Volume',
    color: '#38bdf8',
    variables: [
      { sym: 'C', label: 'Close', desc: 'Current close price' },
      { sym: 'C1', label: 'Close 1d Ago', desc: 'Yesterday close price' },
      { sym: 'O', label: 'Open', desc: 'Current open price' },
      { sym: 'H', label: 'High', desc: 'Current intraday high' },
      { sym: 'L', label: 'Low', desc: 'Current intraday low' },
      { sym: 'V', label: 'Volume', desc: 'Today share volume' },
      { sym: 'V1', label: 'Volume 1d Ago', desc: 'Yesterday volume' },
      { sym: 'AVGV50', label: '50d Vol MA', desc: '50-day average volume' },
      { sym: 'DOLLAR_VOL', label: '50d $ Vol', desc: '50-day average dollar volume' },
    ]
  },
  {
    id: 'averages',
    title: 'Moving Averages',
    color: '#a855f7',
    variables: [
      { sym: 'AVGC50', label: '50 SMA', desc: '50-day SMA of close' },
      { sym: 'AVGC150', label: '150 SMA', desc: '150-day SMA of close' },
      { sym: 'AVGC200', label: '200 SMA', desc: '200-day SMA of close' },
      { sym: 'XAVGC10', label: '10 EMA', desc: '10-day EMA of close' },
      { sym: 'XAVGC20', label: '20 EMA', desc: '20-day EMA of close' },
      { sym: 'XAVGC50', label: '50 EMA', desc: '50-day EMA of close' },
    ]
  },
  {
    id: 'trend',
    title: 'Trend & RS',
    color: '#34d399',
    variables: [
      { sym: 'STAGE2', label: 'Stage 2', desc: 'Minervini Stage 2 uptrend template' },
      { sym: 'RS_RANK', label: 'RS Rank', desc: 'IBD-style RS percentile (0-99)' },
      { sym: 'TI65', label: 'TI65', desc: 'Stockbee Trend Intensity (C / 65 SMA)' },
      { sym: 'IS_52W_HIGH', label: '52w High', desc: 'At or near 52-week high' },
      { sym: 'DIST_52W_HIGH', label: 'Dist 52wH %', desc: 'Distance below 52w high' },
      { sym: 'DAYS_52W_HIGH', label: 'Days 52wH', desc: 'Trading days elapsed since 52w high' },
      { sym: 'SURGE_OFF_LOW', label: 'Surge Low %', desc: '% surge off 52w low' },
      { sym: 'RET_1M', label: '1M Return %', desc: '1-month percentage gain' },
      { sym: 'RET_3M', label: '3M Return %', desc: '3-month percentage gain' },
      { sym: 'RET_6M', label: '6M Return %', desc: '6-month percentage gain' },
    ]
  },
  {
    id: 'volatility',
    title: 'Volatility & Tightness',
    color: '#f59e0b',
    variables: [
      { sym: 'ADR20', label: 'ADR% (20d)', desc: '20-day average daily range %' },
      { sym: 'ATR20', label: 'ATR (20d)', desc: '20-day average true range ($)' },
      { sym: 'PIVOT_SPREAD', label: 'Pivot Spread %', desc: '3-day consolidation spread' },
      { sym: 'PIVOT_CLUSTERING', label: 'Clustering %', desc: '3-day close tightness' },
      { sym: 'PIVOT_VOL_RATIO', label: 'Vol Dry-up', desc: 'Current Vol / 50d Vol MA' },
    ]
  },
  {
    id: 'pattern',
    title: 'Pattern Primitives',
    color: '#ec4899',
    variables: [
      { sym: 'BREAKOUT', label: 'Breakout', desc: 'QM Breakout candidate' },
      { sym: 'POWER_PLAY', label: 'Power Play', desc: 'High Tight Flag candidate' },
      { sym: 'PP_RUNUP', label: 'PP Runup %', desc: '8-week explosive prior move' },
      { sym: 'PP_DRAWDOWN', label: 'PP Base %', desc: 'Base pullback depth (<=25%)' },
      { sym: 'PP_DAYS', label: 'PP Days', desc: 'Days in consolidation base' },
      { sym: 'EPISODIC_PIVOT', label: 'EP', desc: 'Catalyst gap & go setup' },
      { sym: 'GAP_PCT', label: 'Gap %', desc: 'Morning/overnight gap %' },
      { sym: 'REL_VOL', label: 'Rel Vol', desc: 'Relative volume multiple (2.5x)' },
      { sym: 'LOW_CHEAT', label: 'Low Cheat', desc: 'Early reversal entry in lower base' },
      { sym: 'CHEAT', label: 'Cheat (3-C)', desc: 'Cup Completion Cheat in mid-upper base' },
      { sym: 'BASE_DEPTH', label: 'Base Depth %', desc: 'Base correction depth' },
      { sym: 'PARABOLIC_SHORT', label: 'Parabolic', desc: 'Overextended upward exhaustion' },
      { sym: 'DIST_EMA10', label: 'Dist 10 EMA %', desc: 'Stretch above 10 EMA' },
      { sym: 'UP_DAYS', label: 'Up Days', desc: 'Consecutive green days' },
      { sym: 'VCP', label: 'VCP', desc: 'Volatility Contraction Pattern' },
      { sym: 'IPO_BASE', label: 'IPO Base', desc: 'First base in recent IPO' },
    ]
  },
  {
    id: 'fundamentals',
    title: 'Fundamentals & Sponsorship (CAN SLIM)',
    color: '#38bdf8',
    variables: [
      { sym: 'INST_STREAK', label: 'Inst Streak', desc: 'Consecutive quarters of increasing funds (e.g. >= 2)' },
      { sym: 'INST_HOLDERS', label: 'Inst Funds', desc: 'Total institutional holder fund count' },
      { sym: 'INST_QOQ_CHANGE', label: 'Inst Net QoQ', desc: 'Net new institutional funds added this quarter' },
      { sym: 'INST_OWN_PCT', label: 'Inst Float %', desc: 'Institutional float ownership %' },
      { sym: 'EPS_GROWTH_QOQ', label: 'EPS QoQ %', desc: 'Quarterly EPS growth YoY %' },
      { sym: 'EPS_DILUTED', label: 'Diluted EPS', desc: 'Latest quarterly diluted EPS' },
      { sym: 'REVENUE', label: 'Revenue', desc: 'Latest quarterly total revenue' },
    ]
  },
  {
    id: 'operators',
    title: 'Operators',
    color: '#94a3b8',
    variables: [
      { sym: 'AND', label: 'AND', desc: 'Both conditions must be true' },
      { sym: 'OR', label: 'OR', desc: 'Either condition may be true' },
      { sym: 'NOT', label: 'NOT', desc: 'Invert boolean condition' },
      { sym: '>=', label: '>=', desc: 'Greater than or equal to' },
      { sym: '<=', label: '<=', desc: 'Less than or equal to' },
      { sym: '>', label: '>', desc: 'Greater than' },
      { sym: '<', label: '<', desc: 'Less than' },
      { sym: '=', label: '=', desc: 'Equal to' },
      { sym: '(', label: '(', desc: 'Open parenthesis' },
      { sym: ')', label: ')', desc: 'Close parenthesis' },
      { sym: 'TOP(RET_1M, 50)', label: 'TOP(metric, N)', desc: 'Window filter for top N by metric' },
      { sym: 'ORDER BY RET_1M DESC LIMIT 50', label: 'ORDER BY ... LIMIT N', desc: 'Sort & limit candidate scan results' },
    ]
  }
];

export default function ExpressionCheatSheet({ onInsert = () => { }, onClose = null }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const displayedCategories = selectedCategory === 'all'
    ? CHEAT_SHEET_CATEGORIES
    : CHEAT_SHEET_CATEGORIES.filter(c => c.id === selectedCategory);

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>
            📚 Scan Expression Variables & Cheat Sheet
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            (Click any chip to insert into formula)
          </span>
        </div>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: selectedCategory === 'all' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
              background: selectedCategory === 'all' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: selectedCategory === 'all' ? '#38bdf8' : 'var(--text-secondary)',
            }}
          >
            All
          </button>
          {CHEAT_SHEET_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: selectedCategory === cat.id ? `1px solid ${cat.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedCategory === cat.id ? `${cat.color}25` : 'transparent',
                color: selectedCategory === cat.id ? cat.color : 'var(--text-secondary)',
              }}
            >
              {cat.title}
            </button>
          ))}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                marginLeft: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1
              }}
              title="Close Cheat Sheet"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Categorized Chips Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
        {displayedCategories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {cat.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {cat.variables.map(v => (
                <button
                  key={v.sym}
                  type="button"
                  onClick={() => onInsert(v.sym)}
                  title={`${v.sym}: ${v.desc}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '5px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cat.color;
                    e.currentTarget.style.background = `${cat.color}22`;
                    e.currentTarget.style.color = cat.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                    e.currentTarget.style.color = '#f8fafc';
                  }}
                >
                  <span>{v.sym}</span>
                  {v.label && v.label !== v.sym && (
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'sans-serif' }}>
                      ({v.label})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

