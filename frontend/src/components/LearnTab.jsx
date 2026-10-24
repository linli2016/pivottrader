import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { KOVA_CONTENT } from '../data/learnKova';
import { JEFF_SUN_CONTENT } from '../data/learnJeffSun';

export default function LearnTab({ setActiveTab, onSelectSetup }) {
  const [system, setSystem] = useState('kova'); // 'kova' | 'jeffsun'
  const [lang, setLang] = useState('en');
  const [activeChapterId, setActiveChapterId] = useState('selection');
  const [searchQuery, setSearchQuery] = useState('');

  // Kova Interactive Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcRiskPct, setCalcRiskPct] = useState(0.75); // 0.75%
  const [calcEntryPrice, setCalcEntryPrice] = useState(50.0);
  const [calcStopPrice, setCalcStopPrice] = useState(47.0);

  // Kova Interactive Checklist State
  const [checklistItems, setChecklistItems] = useState({
    regime: true,
    fundamentals: true,
    rs: true,
    trend: true,
    base: true,
    volume: true,
    stopDefined: true,
    sizeUnder25: true,
    maxFivePositions: true,
    journalLogged: false
  });

  // Jeff Sun Interactive Calculator State
  const [jsEquity, setJsEquity] = useState(100000);
  const [jsRiskPct, setJsRiskPct] = useState(0.35); // 0.35% equity risk
  const [jsEntryPrice, setJsEntryPrice] = useState(50.0);
  const [jsLodPrice, setJsLodPrice] = useState(48.5);
  const [jsSma50Price, setJsSma50Price] = useState(42.0);
  const [jsAtr, setJsAtr] = useState(3.0);

  // Jeff Sun Interactive Checklist State
  const [jsChecklistItems, setJsChecklistItems] = useState({
    focusList: true,
    lodAtr: true,
    sma50Atr: true,
    rvolBreakout: true,
    nonBiotech: true,
    highAdrLiquid: true,
    riskCapped: true,
    trailingTargetPlan: false
  });

  // Select system content
  const currentContent = system === 'jeffsun' ? JEFF_SUN_CONTENT : KOVA_CONTENT;
  const t = currentContent[lang] || currentContent.en;

  // Handle system switch
  const handleSystemChange = (newSystem) => {
    setSystem(newSystem);
    if (newSystem === 'jeffsun') {
      setActiveChapterId('js_core_beliefs');
    } else {
      setActiveChapterId('selection');
    }
    setSearchQuery('');
  };

  // Kova Calculator calculations
  const calcResults = useMemo(() => {
    const equity = parseFloat(calcEquity) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntryPrice) || 0;
    const stop = parseFloat(calcStopPrice) || 0;

    const stopDistance = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const totalRiskDollars = (equity * (riskPct / 100));

    let totalShares = 0;
    if (stopDistance > 0 && totalRiskDollars > 0) {
      totalShares = Math.floor(totalRiskDollars / stopDistance);
    }

    const totalPositionValue = totalShares * entry;
    const positionPctOfEquity = equity > 0 ? (totalPositionValue / equity) * 100 : 0;

    // Pyramid tranches 50% / 30% / 20%
    const tranche1Shares = Math.floor(totalShares * 0.5);
    const tranche2Shares = Math.floor(totalShares * 0.3);
    const tranche3Shares = totalShares - tranche1Shares - tranche2Shares;

    const addPrice1 = entry * 1.025; // +2.5%
    const addPrice2 = entry * 1.05;  // +5.0%

    const isStopTooWide = stopPct > 8.0;
    const isPositionTooLarge = positionPctOfEquity > 25.0;

    return {
      stopDistance,
      stopPct,
      totalRiskDollars,
      totalShares,
      totalPositionValue,
      positionPctOfEquity,
      tranche1Shares,
      tranche2Shares,
      tranche3Shares,
      addPrice1,
      addPrice2,
      isStopTooWide,
      isPositionTooLarge
    };
  }, [calcEquity, calcRiskPct, calcEntryPrice, calcStopPrice]);

  // Jeff Sun Calculator calculations
  const jsCalcResults = useMemo(() => {
    const equity = parseFloat(jsEquity) || 0;
    const riskPct = parseFloat(jsRiskPct) || 0;
    const entry = parseFloat(jsEntryPrice) || 0;
    const lod = parseFloat(jsLodPrice) || 0;
    const sma50 = parseFloat(jsSma50Price) || 0;
    const atr = parseFloat(jsAtr) || 0;

    const stopDistance = entry > 0 ? entry - lod : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const lodDistancePctAtr = atr > 0 ? (stopDistance / atr) * 100 : 0;
    const isLodValid = lodDistancePctAtr <= 60.0;

    const sma50Dist = entry > 0 ? entry - sma50 : 0;
    const sma50AtrMultiple = atr > 0 ? sma50Dist / atr : 0;
    const isLaunchpad = sma50AtrMultiple <= 4.0;

    const totalRiskDollars = equity * (riskPct / 100);
    let totalShares = 0;
    if (stopDistance > 0 && totalRiskDollars > 0) {
      totalShares = Math.floor(totalRiskDollars / stopDistance);
    }

    const totalPositionValue = totalShares * entry;
    const positionPctOfEquity = equity > 0 ? (totalPositionValue / equity) * 100 : 0;

    // Targets: +2.5R, +3R, and 7x ATR extension
    const target25R = entry + (2.5 * stopDistance);
    const target3R = entry + (3.0 * stopDistance);
    const target7Atr = sma50 + (7.0 * atr);

    return {
      stopDistance,
      stopPct,
      lodDistancePctAtr,
      isLodValid,
      sma50Dist,
      sma50AtrMultiple,
      isLaunchpad,
      totalRiskDollars,
      totalShares,
      totalPositionValue,
      positionPctOfEquity,
      target25R,
      target3R,
      target7Atr
    };
  }, [jsEquity, jsRiskPct, jsEntryPrice, jsLodPrice, jsSma50Price, jsAtr]);

  // Checklist score
  const checklistScore = useMemo(() => {
    const keys = Object.keys(checklistItems);
    const completed = keys.filter(k => checklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [checklistItems]);

  const jsChecklistScore = useMemo(() => {
    const keys = Object.keys(jsChecklistItems);
    const completed = keys.filter(k => jsChecklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [jsChecklistItems]);

  const toggleChecklist = (key) => {
    setChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleJsChecklist = (key) => {
    setJsChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return t.chapters;
    const q = searchQuery.toLowerCase();
    return t.chapters.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.shortTitle.toLowerCase().includes(q)
    );
  }, [t.chapters, searchQuery]);

  const activeChapter = useMemo(() => {
    return t.chapters.find(c => c.id === activeChapterId) || t.chapters[0];
  }, [t.chapters, activeChapterId]);

  return (
    <div className="learn-page-container">
      {/* Methodology Switcher */}
      <div className="learn-system-selector-row">
        <button
          className={`learn-system-btn ${system === 'kova' ? 'active' : ''}`}
          onClick={() => handleSystemChange('kova')}
        >
          <span className="system-icon">🎯</span>
          <div className="system-btn-text">
            <span className="system-name">KovaView Method</span>
            <span className="system-sub">CAN SLIM · VCP · 50/30/20 Pyramid</span>
          </div>
        </button>

        <button
          className={`learn-system-btn ${system === 'jeffsun' ? 'active' : ''}`}
          onClick={() => handleSystemChange('jeffsun')}
        >
          <span className="system-icon">📈</span>
          <div className="system-btn-text">
            <span className="system-name">Jeff Sun, CFTe Method</span>
            <span className="system-sub">High ADR% · RVOL · &lt;60% ATR LoD</span>
          </div>
        </button>
      </div>

      {/* Header / Hero Section */}
      <div className="glass-card learn-hero-card">
        <div className="learn-hero-header">
          <div className="learn-hero-badge-group">
            <span className="badge badge-emerald">{t.hero.badge}</span>
            <span className="badge badge-outline">{t.hero.author}</span>
          </div>
          <div className="learn-lang-switch">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => setLang('zh')}
            >
              中文
            </button>
          </div>
        </div>

        <h1 className="learn-hero-title">{t.hero.title}</h1>
        <p className="learn-hero-subtitle">{t.hero.subtitle}</p>
        <p className="learn-hero-desc">{t.hero.description}</p>

        <div className="learn-tags-row">
          {t.hero.tags.map((tag, i) => (
            <span key={i} className="learn-pill-tag">
              ⚡ {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="learn-main-layout">
        {/* Left Column: Sticky Chapters Table of Contents */}
        <div className="learn-sidebar">
          <div className="glass-card learn-toc-card">
            <div className="learn-toc-header">
              <span className="learn-toc-title">
                {lang === 'en' ? 'Chapters Navigation' : '章节目录导航'}
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                {t.chapters.length} {lang === 'en' ? 'Topics' : '讲'}
              </span>
            </div>

            <div className="learn-search-box">
              <input
                type="text"
                className="learn-search-input"
                placeholder={lang === 'en' ? 'Search curriculum...' : '搜索章节与规则...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="learn-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <nav className="learn-toc-nav">
              {filteredChapters.map((ch) => (
                <button
                  key={ch.id}
                  className={`learn-toc-item ${activeChapterId === ch.id ? 'active' : ''}`}
                  onClick={() => setActiveChapterId(ch.id)}
                >
                  <div className="learn-toc-item-left">
                    <span className="learn-toc-num">{ch.number}</span>
                    <span className="learn-toc-icon">{ch.icon}</span>
                    <span className="learn-toc-text">{ch.shortTitle}</span>
                  </div>
                  {activeChapterId === ch.id && (
                    <span className="learn-toc-active-dot">●</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="learn-quick-actions">
              <div className="learn-quick-title">
                {lang === 'en' ? 'PIVOTTRADER LAUNCHPAD' : 'PIVOTTRADER 快捷联动'}
              </div>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                onClick={() => {
                  if (onSelectSetup) onSelectSetup('momentum');
                  if (setActiveTab) setActiveTab('candidates');
                }}
              >
                🎯 {lang === 'en' ? 'Run Leaders Screener' : '一键运行领涨股筛选'}
              </button>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                onClick={() => setActiveTab && setActiveTab('dashboard')}
              >
                📈 {lang === 'en' ? 'Check Market Regime' : '查看大盘多空状态'}
              </button>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setActiveTab && setActiveTab('model-book')}
              >
                📚 {lang === 'en' ? 'Model Book Historicals' : '经典牛股图谱库'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Chapter Content */}
        <div className="learn-content-pane">
          <div className="glass-card learn-content-card">
            {/* Chapter Header */}
            <div className="learn-chapter-header">
              <div className="learn-chapter-meta">
                <span className="learn-chapter-number">CHAPTER {activeChapter.number}</span>
                <span className="learn-chapter-icon-large">{activeChapter.icon}</span>
              </div>
              <h2 className="learn-chapter-title">{activeChapter.title}</h2>
              <p className="learn-chapter-summary">{activeChapter.summary}</p>
            </div>

            {/* Special Section: Four Dimensions Matrix (Kova Chapter 1) */}
            {activeChapter.matrix && (
              <div className="learn-matrix-grid">
                {activeChapter.matrix.map((item, idx) => (
                  <div key={idx} className="learn-matrix-card">
                    <div className="learn-matrix-card-header">
                      <h4>{item.dimension}</h4>
                      <span className="badge badge-emerald">{item.badge}</span>
                    </div>
                    <ul className="learn-matrix-list">
                      {item.points.map((p, pIdx) => (
                        <li key={pIdx}>
                          <span className="check-bullet">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Special Section: Glossary Items (Jeff Sun Chapter 1) */}
            {activeChapter.glossaryItems && (
              <div className="learn-glossary-grid">
                {activeChapter.glossaryItems.map((g, gIdx) => (
                  <div key={gIdx} className="learn-glossary-card">
                    <div className="learn-glossary-header">
                      <span className="badge badge-primary">{g.term}</span>
                      <span className="learn-glossary-full">{g.full}</span>
                    </div>
                    <p className="learn-glossary-desc">{g.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Special Section: Indicator Cards (Jeff Sun Chapter 2) */}
            {activeChapter.indicators && (
              <div className="learn-indicators-grid">
                {activeChapter.indicators.map((ind, iIdx) => (
                  <div key={iIdx} className="learn-indicator-card">
                    <div className="learn-indicator-header">
                      <h4>{ind.name}</h4>
                      <span className="badge badge-warning">{ind.users}</span>
                    </div>
                    <p className="learn-indicator-desc">{ind.desc}</p>
                    {ind.bullets && (
                      <ul className="learn-indicator-bullets">
                        {ind.bullets.map((b, bIdx) => (
                          <li key={bIdx}>
                            <span className="check-bullet">▸</span> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Special Section: Screener Rules */}
            {activeChapter.screenerRules && (
              <div className="learn-rules-container">
                <h3 className="section-subheading">
                  {lang === 'en' ? 'Core Screener Parameters & Objectives' : '核心扫描门槛与设计原理'}
                </h3>
                <div className="learn-rules-table-wrapper">
                  <table className="learn-table">
                    <thead>
                      <tr>
                        <th>{lang === 'en' ? 'Rule Dimension' : '规则维度'}</th>
                        <th>{lang === 'en' ? 'Threshold Parameter' : '门槛阈值'}</th>
                        <th>{lang === 'en' ? 'Rationale & Objective' : '设计原理与作用'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeChapter.screenerRules.map((r, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{r.rule}</td>
                          <td>
                            <code className="code-pill">{r.val}</code>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {activeChapter.passes && (
                  <>
                    <h3 className="section-subheading" style={{ marginTop: '24px' }}>
                      {lang === 'en' ? 'Progressive Chart Review Funnel' : '人工漏斗审查阶段'}
                    </h3>
                    <div className="learn-passes-grid">
                      {activeChapter.passes.map((pass, pIdx) => (
                        <div key={pIdx} className="learn-pass-card">
                          <div className="learn-pass-header">
                            <span className="learn-pass-step">{pass.step}</span>
                            <span className="badge badge-warning">{pass.count}</span>
                          </div>
                          <p className="learn-pass-desc">{pass.desc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Special Section: VCP 3 Contractions (Kova Chapter 3) */}
            {activeChapter.vcpDetails && (
              <div className="learn-vcp-container">
                <div className="learn-callout-box">
                  <div className="learn-callout-icon">💡</div>
                  <div>
                    <strong>{lang === 'en' ? 'True VCP Definition:' : '真正的 VCP 灵魂所在：'}</strong>{' '}
                    {lang === 'en'
                      ? 'Many traders mistakenly think VCP is just price contraction. A genuine, high win-rate VCP requires ALL THREE contractions simultaneously.'
                      : '多数人以为 VCP 只是价格收敛，这只看到了皮毛。真正高胜率的 VCP 必须是价格、成交量与波动率三大收缩同时发生。'}
                  </div>
                </div>

                <div className="learn-vcp-grid">
                  {activeChapter.vcpDetails.map((vcp, vIdx) => (
                    <div key={vIdx} className="learn-vcp-card">
                      <div className="learn-vcp-card-icon">{vcp.icon}</div>
                      <h4>{vcp.name}</h4>
                      <p>{vcp.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Section: Stop Loss Levels (Kova Chapter 4) */}
            {activeChapter.stopLevels && (
              <div className="learn-stops-grid">
                {activeChapter.stopLevels.map((st, sIdx) => (
                  <div key={sIdx} className="learn-stop-card">
                    <div className="learn-stop-header">
                      <span className="learn-stop-name">{st.name}</span>
                      <span className="badge badge-danger">{st.dist}</span>
                    </div>
                    <p className="learn-stop-desc">{st.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Special Section: Pyramid Tranches (Kova Chapter 5) */}
            {activeChapter.pyramid && (
              <div className="learn-pyramid-container">
                <div className="learn-pyramid-grid">
                  {activeChapter.pyramid.map((pyr, pIdx) => (
                    <div key={pIdx} className="learn-pyramid-card">
                      <div className="learn-pyramid-header">
                        <span className="learn-pyramid-badge">{pyr.tranche}</span>
                        <span className="badge badge-emerald">{pyr.size}</span>
                      </div>
                      <div className="learn-pyramid-trigger">
                        📍 {lang === 'en' ? 'Trigger Point:' : '触发时机：'} <strong>{pyr.trigger}</strong>
                      </div>
                      <p className="learn-pyramid-desc">{pyr.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Section: Offensive & Defensive Selling */}
            {activeChapter.offensive && (
              <div className="learn-selling-container">
                <h3 className="section-subheading" style={{ color: '#34d399' }}>
                  🟢 {lang === 'en' ? 'Offensive Selling (Protecting Big Profits)' : '进攻性卖出 (守住暴利)'}
                </h3>
                <div className="learn-selling-grid">
                  {activeChapter.offensive.map((off, oIdx) => (
                    <div key={oIdx} className="learn-sell-card offensive">
                      <div className="learn-sell-header">
                        <h4>{off.name}</h4>
                        <span className="badge badge-outline">{off.rule}</span>
                      </div>
                      <p>{off.action}</p>
                    </div>
                  ))}
                </div>

                {activeChapter.defensive && (
                  <>
                    <h3 className="section-subheading" style={{ color: '#f43f5e', marginTop: '24px' }}>
                      🔴 {lang === 'en' ? 'Defensive Selling (Capital Preservation)' : '防御性卖出 (保住本金)'}
                    </h3>
                    <div className="learn-selling-grid">
                      {activeChapter.defensive.map((def, dIdx) => (
                        <div key={dIdx} className="learn-sell-card defensive">
                          <div className="learn-sell-header">
                            <h4>{def.name}</h4>
                            <span className="badge badge-danger">{def.rule}</span>
                          </div>
                          <p>{def.action}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Special Section: Rules / Mindset */}
            {activeChapter.rules && (
              <div className="learn-mindset-grid">
                {activeChapter.rules.map((rule, rIdx) => (
                  <div key={rIdx} className="learn-mindset-card">
                    <div className="learn-mindset-header">
                      <h4>{rule.title}</h4>
                      <span className="badge badge-emerald">{rule.badge}</span>
                    </div>
                    <p>{rule.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Special Section: Trading Journal Logging Fields (Kova Chapter 8) */}
            {activeChapter.fields && (
              <div className="learn-journal-container">
                <div className="learn-journal-card">
                  <h4 style={{ marginBottom: '12px', color: '#38bdf8' }}>
                    📋 {lang === 'en' ? 'Mandatory Journal Entry Fields:' : '每笔交易必记六大字段：'}
                  </h4>
                  <ul className="learn-journal-list">
                    {activeChapter.fields.map((fld, fIdx) => (
                      <li key={fIdx}>
                        <span className="badge badge-outline" style={{ marginRight: '8px' }}>#{fIdx + 1}</span>
                        {fld}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Markdown / Body Text Content */}
            {activeChapter.body && (
              <div
                className="markdown-body learn-article-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(activeChapter.body) }}
              />
            )}

            {/* ========================================================= */}
            {/* KOVA INTERACTIVE CHECKLIST (Chapter 9)                    */}
            {/* ========================================================= */}
            {activeChapter.id === 'checklist' && (
              <div className="learn-interactive-checklist-pane">
                <div className="checklist-score-banner">
                  <div className="score-summary">
                    <span className="score-title">
                      {lang === 'en' ? 'KovaView Compliance Score' : 'KovaView 执行达标合规率'}
                    </span>
                    <div className="score-number">
                      {checklistScore.pct}%{' '}
                      <span className="score-sub">({checklistScore.completed}/{checklistScore.total} checks)</span>
                    </div>
                  </div>
                  <div className="score-status">
                    {checklistScore.pct === 100 ? (
                      <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ✓ {lang === 'en' ? 'Ready to Execute' : '100% 达标，准予下单'}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ⚠ {lang === 'en' ? 'Incomplete Rules' : '规则未完全满足，切勿急躁'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="checklist-items-grid">
                  <label className={`checklist-item ${checklistItems.regime ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.regime}
                      onChange={() => toggleChecklist('regime')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '1. Market Environment Filter (Confirmed Uptrend)' : '1. 大盘环境确认处于健康上升通道'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Major indices above 50-day EMA without cluster of distribution days.'
                          : '标普500/纳指处于50EMA上方，近一个月无5天以上放量分布日。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.fundamentals ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.fundamentals}
                      onChange={() => toggleChecklist('fundamentals')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '2. Fundamentals Quality (EPS YoY ≥ 25%)' : '2. 基本面强劲（EPS同比增速 ≥ 25%）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Sustained revenue growth (20%+) with no EPS deceleration.'
                          : '单季营收同比增速超20%，未出现连续两个季度的增速减缓。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.rs ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.rs}
                      onChange={() => toggleChecklist('rs')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '3. RS Relative Strength (Rank ≥ 80, Ideally ≥ 90)' : '3. 相对强度达标（RS ≥ 80，优选 ≥ 90）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Top decile performer. Never trade low RS stocks.'
                          : '属于全市场最前10%的强势领涨个股，绝不做低RS滞涨票。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.trend ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.trend}
                      onChange={() => toggleChecklist('trend')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '4. Technical Trend Health (10 EMA > 20 EMA > 50 SMA)' : '4. 均线多头排列（10 EMA > 20 EMA > 50 SMA）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Within 15–20% of 52-week high, >70% above 52-week low.'
                          : '距离52周新高在15-20%以内，较52周低点涨幅超70%。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.base ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.base}
                      onChange={() => toggleChecklist('base')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '5. Clean Base Pattern (VCP / Cup with Handle / Low Cheat)' : '5. 具备干净清晰的底部收敛（VCP/杯柄/低位欺骗）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Clear progressive volatility contractions with tightening daily candles.'
                          : '每次回调幅度逐级缩小，整理末端K线紧密贴合。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.volume ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.volume}
                      onChange={() => toggleChecklist('volume')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '6. Volume Dry-Up (VDU) Before Breakout' : '6. 突破前出现明显地量（Volume Dry-Up）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Volume significantly below 50-day average, signaling exhausted supply.'
                          : '成交量明显低于50日均线，出现死寂日（FU Day）证明浮筹洗净。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.stopDefined ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.stopDefined}
                      onChange={() => toggleChecklist('stopDefined')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '7. Hard Stop Defined (Distance ≤ 7–8%)' : '7. 止损位严格预先锚定（止损距离 ≤ 7-8%）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Stop anchored below pivot or entry low. If >8%, sizing must be scaled down.'
                          : '锚定在支点或进场日低点下方。若止损距离过宽必须缩减仓位。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.sizeUnder25 ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.sizeUnder25}
                      onChange={() => toggleChecklist('sizeUnder25')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '8. Single Position ≤ 25% of Portfolio' : '8. 单票最大仓位不超过总资金 25%'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Strict capital cap regardless of subjective confidence.'
                          : '无论对个股有多自信，坚决不突破 25% 仓位硬红线。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.maxFivePositions ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.maxFivePositions}
                      onChange={() => toggleChecklist('maxFivePositions')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '9. Total Concurrent Positions ≤ 5' : '9. 全账户持仓标的不得超过 5 只'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Concentration allows close management of exits and risk.'
                          : '持仓过多会导致无法严格盯防每一只标的的止损与加仓。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${checklistItems.journalLogged ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checklistItems.journalLogged}
                      onChange={() => toggleChecklist('journalLogged')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '10. Pre-Trade Journal Plan Recorded' : '10. 已将进场理由与止损加仓计划录入日志'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Document reason, trigger, and stop before pulling the trigger.'
                          : '在下单前记录为什么买入、止损在哪里，坚决拒绝凭一时兴起交易。'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* KOVA INTERACTIVE CALCULATOR (Chapter 10)                  */}
            {/* ========================================================= */}
            {activeChapter.id === 'calculator' && (
              <div className="learn-calculator-pane">
                <div className="calc-inputs-grid">
                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Total Account Equity ($)' : '账户总资金 ($)'}</label>
                    <input
                      type="number"
                      className="calc-input"
                      value={calcEquity}
                      onChange={(e) => setCalcEquity(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Risk Per Trade (%)' : '单笔最大风险容忍 (%)'}</label>
                    <input
                      type="number"
                      step="0.05"
                      className="calc-input"
                      value={calcRiskPct}
                      onChange={(e) => setCalcRiskPct(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Recommended: 0.5% – 1.0%' : '推荐范围：0.5% – 1.0%'}</span>
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Entry / Pivot Price ($)' : '预定买入 / 支点价 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={calcEntryPrice}
                      onChange={(e) => setCalcEntryPrice(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Stop-Loss Price ($)' : '硬止损触发价 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={calcStopPrice}
                      onChange={(e) => setCalcStopPrice(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Below pivot or entry low' : '锚定支点下方或低点'}</span>
                  </div>
                </div>

                {/* Risk Warning Banners */}
                {calcResults.isStopTooWide && (
                  <div className="calc-alert-banner alert-danger">
                    ⚠️ {lang === 'en'
                      ? `Stop distance is ${calcResults.stopPct.toFixed(1)}%, exceeding the hard 7–8% ceiling! Tighten stop or skip setup.`
                      : `止损距离达到 ${calcResults.stopPct.toFixed(1)}%，已超过 7–8% 的硬性上限！请收紧止损位或放弃该形态。`}
                  </div>
                )}

                {calcResults.isPositionTooLarge && (
                  <div className="calc-alert-banner alert-warning">
                    ⚠️ {lang === 'en'
                      ? `Position size is ${calcResults.positionPctOfEquity.toFixed(1)}% of account, exceeding the 25% single-stock cap!`
                      : `计算仓位占总资金 ${calcResults.positionPctOfEquity.toFixed(1)}%，超过了 25% 单票持仓上限！需缩减规模。`}
                  </div>
                )}

                {/* Calculated Metrics Grid */}
                <div className="calc-metrics-grid">
                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Dollar Risk' : '单笔总美元风险'}</span>
                    <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                      ${calcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">{calcRiskPct}% {lang === 'en' ? 'of equity' : '总资产占比'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Stop-Loss Distance' : '止损距离幅度'}</span>
                    <span className={`calc-metric-value ${calcResults.isStopTooWide ? 'text-danger' : 'text-emerald'}`}>
                      {calcResults.stopPct.toFixed(2)}%
                    </span>
                    <span className="calc-metric-sub">-${calcResults.stopDistance.toFixed(2)} / share</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Shares to Buy' : '建议买入总股数'}</span>
                    <span className="calc-metric-value text-emerald">
                      {calcResults.totalShares.toLocaleString()}
                    </span>
                    <span className="calc-metric-sub">{lang === 'en' ? 'Max shares allowed' : '上限允许股数'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Position Value' : '持仓总资金规模'}</span>
                    <span className={`calc-metric-value ${calcResults.isPositionTooLarge ? 'text-warning' : 'text-primary'}`}>
                      ${calcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">
                      {calcResults.positionPctOfEquity.toFixed(1)}% {lang === 'en' ? 'of equity' : '总资金占比'}
                    </span>
                  </div>
                </div>

                {/* 50 / 30 / 20 Pyramid Scaling Plan */}
                <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                  🔺 {lang === 'en' ? 'Recommended 50% / 30% / 20% Pyramid Scaling Orders' : '倒金字塔加仓挂单计划 (50% / 30% / 20%)'}
                </h3>
                <div className="pyramid-orders-grid">
                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-emerald">TRANCHE 1 (50%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'At Breakout' : '突破支点买入'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche1Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${parseFloat(calcEntryPrice).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche1Shares * parseFloat(calcEntryPrice)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-warning">TRANCHE 2 (30%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'After +2.5%' : '涨幅达 +2.5%'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche2Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${calcResults.addPrice1.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche2Shares * calcResults.addPrice1).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-outline">TRANCHE 3 (20%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'After +5.0%' : '涨幅达 +5.0%'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche3Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${calcResults.addPrice2.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche3Shares * calcResults.addPrice2).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* JEFF SUN INTERACTIVE CHECKLIST (js_checklist)             */}
            {/* ========================================================= */}
            {activeChapter.id === 'js_checklist' && (
              <div className="learn-interactive-checklist-pane">
                <div className="checklist-score-banner">
                  <div className="score-summary">
                    <span className="score-title">
                      {lang === 'en' ? "Jeff Sun Execution Compliance Score" : 'Jeff Sun 实战执行合规率'}
                    </span>
                    <div className="score-number">
                      {jsChecklistScore.pct}%{' '}
                      <span className="score-sub">({jsChecklistScore.completed}/{jsChecklistScore.total} checks)</span>
                    </div>
                  </div>
                  <div className="score-status">
                    {jsChecklistScore.pct === 100 ? (
                      <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ✓ {lang === 'en' ? 'A-Rated Execution Validated' : 'A级执行达标，准予开仓'}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ⚠ {lang === 'en' ? 'Filters Incomplete - Stand Down' : '红线未满足，坚决不追高'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="checklist-items-grid">
                  <label className={`checklist-item ${jsChecklistItems.focusList ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.focusList}
                      onChange={() => toggleJsChecklist('focusList')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '1. Focus List Upgraded Candidate' : '1. 属于前日盘后确立的 Focus List 精选池'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Stock was prepared post-market with defined pivot alerts; not an impulsive intraday pick.'
                          : '该标的已在开盘前预设好支点报警，绝非盘中临时起意追涨的杂毛票。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.lodAtr ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.lodAtr}
                      onChange={() => toggleJsChecklist('lodAtr')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '2. LoD Distance ≤ 60% of Daily ATR (Spring Coil Rule)' : '2. 进场点距离当日最低点 LoD 严禁超过 60% ATR'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Distance from Low of Day to entry is tight, ensuring high R-multiple potential and tight risk.'
                          : '弹簧伸缩法则：若已消耗超过单日 60% ATR 空间，弹性耗尽且止损过宽，坚决否决。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.sma50Atr ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.sma50Atr}
                      onChange={() => toggleJsChecklist('sma50Atr')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '3. 50-MA ATR Distance ≤ 4x Multiples (Launchpad Filter)' : '3. 距离 50 日均线乖离倍数 ≤ 4x ATR（发射台准则）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Entry point is near base consolidation. Avoid chasing extended names >4x from 50-MA.'
                          : '进场紧靠 50EMA 结构基底。若股价偏离 50 均线超 4 倍 ATR，均值回归回踩概率极高。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.rvolBreakout ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.rvolBreakout}
                      onChange={() => toggleJsChecklist('rvolBreakout')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '4. Projected RVOL ≥ 1.5x at Breakout / M30 Re-ORH' : '4. 突破或开盘30分钟收复高点时 RVOL ≥ 1.5x'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Volume expansion confirms smart money commitment. Never buy low-volume breakouts.'
                          : '放量量比必须超 1.5 倍以上，证明大资金机构真实入场抢筹，彻底过滤假突破。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.nonBiotech ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.nonBiotech}
                      onChange={() => toggleJsChecklist('nonBiotech')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '5. Non-Biotech Gap Risk Elimination' : '5. 剔除单只高波动生物医药股（杜绝跳空归零风险）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'No individual speculative trial biotechs. Trade biotech strictly through liquid ETFs (LABD/LABU).'
                          : '绝不做单只小市值 Biotech，从根源上消灭临床失败暴跌 80% 的黑天鹅。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.highAdrLiquid ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.highAdrLiquid}
                      onChange={() => toggleJsChecklist('highAdrLiquid')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '6. High ADR% (≥ 4.0%) & Average Dollar Volume ≥ $100M' : '6. 高 ADR% (≥ 4.0%) 且日均成交额 ≥ 1 亿美元'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Asset possesses strong volatility edge and institutional liquidity with minimal spread friction.'
                          : '个股具备充足的单日波动空间，且盘子充裕流动性充沛，滑点损耗极低。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.riskCapped ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.riskCapped}
                      onChange={() => toggleJsChecklist('riskCapped')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '7. Portfolio Equity Risk Capped at 0.25% - 0.50%' : '7. 单笔总资金本金风险严格限制在 0.25% - 0.50%'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Account loss strictly limited. Position sizing derived mathematically from LoD stop distance.'
                          : '依据进场点到 LoD 止损距离反推股数，单笔绝对不允许亏损总账户的 0.5% 以上。'}
                      </span>
                    </div>
                  </label>

                  <label className={`checklist-item ${jsChecklistItems.trailingTargetPlan ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={jsChecklistItems.trailingTargetPlan}
                      onChange={() => toggleJsChecklist('trailingTargetPlan')}
                    />
                    <div className="checklist-item-content">
                      <span className="checklist-item-title">
                        {lang === 'en' ? '8. +2.5R - +3.0R Partial Trim & 10 EMA Trailing Plan Set' : '8. 预设 +2.5R 至 +3.0R 分批止盈及 10EMA 移动止损'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Take 1/3-1/2 off into first R-expansion, raise stop to breakeven, and trail remainder on 10 EMA.'
                          : '第一目标位主动减仓锁定利润，剩余仓位平手止损零风险，沿 10EMA 享受主升浪。'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* JEFF SUN INTERACTIVE CALCULATOR (js_calculator)           */}
            {/* ========================================================= */}
            {activeChapter.id === 'js_calculator' && (
              <div className="learn-calculator-pane">
                <div className="calc-inputs-grid">
                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Total Account Equity ($)' : '账户总资金 ($)'}</label>
                    <input
                      type="number"
                      className="calc-input"
                      value={jsEquity}
                      onChange={(e) => setJsEquity(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Equity Risk Per Trade (%)' : '单笔总资金风险比例 (%)'}</label>
                    <input
                      type="number"
                      step="0.05"
                      className="calc-input"
                      value={jsRiskPct}
                      onChange={(e) => setJsRiskPct(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Jeff Sun Rule: 0.25% – 0.50%' : 'Jeff Sun 准则：0.25% – 0.50%'}</span>
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Entry / Breakout Price ($)' : '进场买入价 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={jsEntryPrice}
                      onChange={(e) => setJsEntryPrice(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Low of Day (LoD) Stop ($)' : '当日最低价 LoD 止损点 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={jsLodPrice}
                      onChange={(e) => setJsLodPrice(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Intraday Low before entry' : '进场前的当日日内最低价'}</span>
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Daily ATR ($)' : '股票日度 ATR ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={jsAtr}
                      onChange={(e) => setJsAtr(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? '14-Day Average True Range' : '14日平均真实波幅'}</span>
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? '50-Day Moving Average ($)' : '50日移动均线价格 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={jsSma50Price}
                      onChange={(e) => setJsSma50Price(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Launchpad reference' : '发射台基准参考'}</span>
                  </div>
                </div>

                {/* Validation Banners */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', margin: '20px 0' }}>
                  <div className={`calc-alert-banner ${jsCalcResults.isLodValid ? 'alert-success' : 'alert-danger'}`}>
                    {jsCalcResults.isLodValid ? (
                      <span>✓ {lang === 'en' ? 'LoD Distance Valid' : 'LoD 紧凑度合格'}: <strong>{jsCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong> (≤ 60% rule PASS)</span>
                    ) : (
                      <span>⚠️ {lang === 'en' ? 'LoD Distance Overextended' : 'LoD 距离过宽'}: <strong>{jsCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong> (&gt; 60% REJECT! Do not chase)</span>
                    )}
                  </div>

                  <div className={`calc-alert-banner ${jsCalcResults.isLaunchpad ? 'alert-success' : 'alert-warning'}`}>
                    {jsCalcResults.isLaunchpad ? (
                      <span>✓ {lang === 'en' ? '50-MA Launchpad Valid' : '50均线发射台合格'}: <strong>{jsCalcResults.sma50AtrMultiple.toFixed(2)}x ATR</strong> (≤ 4x rule PASS)</span>
                    ) : (
                      <span>⚠️ {lang === 'en' ? '50-MA Extended' : '50均线过度偏离'}: <strong>{jsCalcResults.sma50AtrMultiple.toFixed(2)}x ATR</strong> (&gt; 4x extended, mean reversion risk)</span>
                    )}
                  </div>
                </div>

                {/* Calculated Metrics Grid */}
                <div className="calc-metrics-grid">
                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Max Total Dollar Risk' : '单笔最大美元风险'}</span>
                    <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                      ${jsCalcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">{jsRiskPct}% {lang === 'en' ? 'of total equity' : '占账户总净值'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'LoD Stop Distance' : 'LoD 止损距离幅度'}</span>
                    <span className={`calc-metric-value ${jsCalcResults.isLodValid ? 'text-emerald' : 'text-danger'}`}>
                      {jsCalcResults.stopPct.toFixed(2)}%
                    </span>
                    <span className="calc-metric-sub">-${jsCalcResults.stopDistance.toFixed(2)} ({jsCalcResults.lodDistancePctAtr.toFixed(1)}% ATR)</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Position Shares to Buy' : '计算可买入股数'}</span>
                    <span className="calc-metric-value text-emerald">
                      {jsCalcResults.totalShares.toLocaleString()}
                    </span>
                    <span className="calc-metric-sub">{lang === 'en' ? 'Shares to cap risk' : '严格锁死风险股数'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Position Capital' : '持仓总资金规模'}</span>
                    <span className="calc-metric-value text-primary">
                      ${jsCalcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">
                      {jsCalcResults.positionPctOfEquity.toFixed(1)}% {lang === 'en' ? 'of equity' : '总资产占比'}
                    </span>
                  </div>
                </div>

                {/* Profit Taking Targets */}
                <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                  🎯 {lang === 'en' ? 'Jeff Sun Systematic Profit-Taking Targets' : 'Jeff Sun 体系客观止盈目标位'}
                </h3>
                <div className="pyramid-orders-grid">
                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-emerald">+2.5R FIRST TARGET</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'Scale 1/3, Stop to BE' : '减仓 1/3 并提保本止损'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares" style={{ color: '#34d399' }}>
                        ${jsCalcResults.target25R.toFixed(2)}
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Gain:' : '单股盈利：'} <strong>+${(2.5 * jsCalcResults.stopDistance).toFixed(2)}</strong> (+{(2.5 * jsCalcResults.stopPct).toFixed(1)}%)
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Action: Lock risk-free cushion' : '操作：转为零风险持仓'}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-warning">+3.0R RUNNER TARGET</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'Scale 1/3 into Strength' : '减仓第二批 1/3'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares" style={{ color: '#f59e0b' }}>
                        ${jsCalcResults.target3R.toFixed(2)}
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Gain:' : '单股盈利：'} <strong>+${(3.0 * jsCalcResults.stopDistance).toFixed(2)}</strong> (+{(3.0 * jsCalcResults.stopPct).toFixed(1)}%)
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Action: Trail remainder on 10 EMA' : '操作：剩余沿 10EMA 移动止损'}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-outline">7x ATR 50-MA EXTENSION</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'Statistical Reversion' : '均值偏离极值'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares" style={{ color: '#38bdf8' }}>
                        ${jsCalcResults.target7Atr.toFixed(2)}
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Extension:' : '乖离率：'} <strong>7.0x ATR from 50-MA</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Action: Scale out climax push' : '操作：高位加速冲顶彻底兑现'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deep-link action button if defined */}
            {activeChapter.pivotTraderLink && (
              <div className="learn-cta-banner">
                <div className="learn-cta-text">
                  <h4>{activeChapter.pivotTraderLink.label}</h4>
                  <p>{activeChapter.pivotTraderLink.hint}</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (onSelectSetup) onSelectSetup('momentum');
                    if (setActiveTab) setActiveTab(activeChapter.pivotTraderLink.tab);
                  }}
                >
                  🚀 {lang === 'en' ? 'Launch Tool' : '立即启动'}
                </button>
              </div>
            )}

            {/* Navigation footer between chapters */}
            <div className="learn-chapter-footer">
              {(() => {
                const curIdx = t.chapters.findIndex(c => c.id === activeChapterId);
                const prev = curIdx > 0 ? t.chapters[curIdx - 1] : null;
                const next = curIdx < t.chapters.length - 1 ? t.chapters[curIdx + 1] : null;

                return (
                  <>
                    {prev ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => setActiveChapterId(prev.id)}
                      >
                        ← {prev.shortTitle}
                      </button>
                    ) : <div />}

                    {next ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => setActiveChapterId(next.id)}
                      >
                        {next.shortTitle} →
                      </button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
