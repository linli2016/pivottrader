import React, { useState, useMemo, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { QULLAMAGGIE_CONTENT } from '../data/learnQullamaggie';
import { MARTIN_LUK_CONTENT } from '../data/learnMartinLuk';
import { KOVA_CONTENT } from '../data/learnKova';
import { JEFF_SUN_CONTENT } from '../data/learnJeffSun';
import { DAN_ZANGER_CONTENT } from '../data/learnDanZanger';
import { COMPARISON_CONTENT } from '../data/learnComparison';

const SYSTEM_ORDER = ['qullamaggie', 'martinluk', 'kova', 'jeffsun', 'danzanger', 'comparison'];

function PatternDiagramSvg({ patternType }) {
  return (
    <svg className="learn-pattern-svg" viewBox="0 0 240 92" fill="none" aria-hidden="true">
      {patternType === 'ema_avwap_pullback' && (
        <>
          <line x1="20" y1="55" x2="210" y2="35" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <line x1="20" y1="68" x2="210" y2="48" stroke="#38bdf8" strokeWidth="1.4" />
          <path d="M16 80 L74 24 L102 46 L130 38 L152 48 L180 20 L216 10" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="152" cy="48" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'inside_day_compression' && (
        <>
          <line x1="120" y1="18" x2="120" y2="76" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          <line x1="150" y1="30" x2="150" y2="64" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="176" y1="36" x2="176" y2="58" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <path d="M176 36 L216 12" stroke="#10b981" strokeWidth="2.4" strokeDasharray="3 2" strokeLinecap="round" />
          <circle cx="176" cy="36" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'high_tight_flag' && (
        <>
          <line x1="68" y1="26" x2="174" y2="26" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <path d="M16 84 Q36 82 56 34 L68 26 L88 38 L108 28 L128 36 L148 27 L168 34 L174 26 L216 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="174" cy="26" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'episodic_pivot' && (
        <>
          <line x1="14" y1="68" x2="72" y2="68" stroke="#64748b" strokeDasharray="3 3" strokeWidth="1.2" />
          <line x1="88" y1="28" x2="194" y2="28" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <path d="M14 68 L72 68 M88 34 L108 42 L128 32 L150 40 L174 28 L218 8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M72 68 L88 34" stroke="#38bdf8" strokeWidth="2.2" strokeDasharray="3 2" />
          <circle cx="174" cy="28" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'parabolic_climax' && (
        <>
          <path d="M16 84 Q120 80 184 14" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <path d="M16 84 L46 76 L74 62 L106 44 L138 28 L168 16 L184 14 L204 48 L220 78" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="184" cy="14" r="4" fill="#f43f5e" />
        </>
      )}
      {patternType === 'cup_handle' && (
        <>
          <line x1="52" y1="30" x2="195" y2="30" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <line x1="154" y1="30" x2="184" y2="38" stroke="#38bdf8" strokeDasharray="3 2" strokeWidth="1.3" />
          <path d="M12 80 L52 30 C68 72, 134 72, 154 30 L166 42 L176 35 L184 40 L216 12" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="184" cy="36" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'flat_base' && (
        <>
          <line x1="58" y1="32" x2="188" y2="32" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <line x1="58" y1="48" x2="188" y2="48" stroke="#64748b" strokeDasharray="3 3" strokeWidth="1.1" />
          <path d="M12 82 L58 32 L78 46 L98 34 L120 45 L142 33 L164 44 L182 32 L218 11" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="182" cy="32" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'ascending_triangle' && (
        <>
          <line x1="52" y1="28" x2="192" y2="28" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="68" y1="72" x2="184" y2="28" stroke="#38bdf8" strokeDasharray="4 3" strokeWidth="1.3" />
          <path d="M14 80 L56 28 L74 68 L104 28 L124 54 L150 28 L166 40 L182 28 L216 10" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="182" cy="28" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'bull_flag' && (
        <>
          <line x1="78" y1="22" x2="164" y2="38" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="78" y1="38" x2="164" y2="54" stroke="#64748b" strokeDasharray="3 3" strokeWidth="1.2" />
          <path d="M22 84 L78 22 L96 40 L114 29 L132 46 L150 35 L162 44 L214 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="38" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'parabolic_curve' && (
        <>
          <path d="M18 82 Q135 80 196 12" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <path d="M18 82 L58 76 L68 80 L108 66 L118 70 L152 48 L160 53 L184 26 L196 10 L218 46" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="196" cy="10" r="4" fill="#f43f5e" />
        </>
      )}
      {patternType === 'channel' && (
        <>
          <line x1="28" y1="54" x2="178" y2="26" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="28" y1="78" x2="178" y2="50" stroke="#38bdf8" strokeDasharray="4 3" strokeWidth="1.2" />
          <path d="M20 76 L52 50 L76 68 L108 40 L132 58 L166 28 L216 8" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="28" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'falling_wedge' && (
        <>
          <line x1="64" y1="20" x2="176" y2="48" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="64" y1="52" x2="176" y2="62" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1.2" />
          <path d="M16 80 L64 20 L84 52 L108 32 L128 56 L150 42 L166 58 L214 14" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="172" cy="46" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'symmetrical_triangle' && (
        <>
          <line x1="58" y1="18" x2="184" y2="46" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="58" y1="76" x2="184" y2="46" stroke="#38bdf8" strokeDasharray="4 3" strokeWidth="1.3" />
          <path d="M16 80 L58 20 L84 70 L114 31 L138 58 L160 40 L172 49 L216 14" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="176" cy="44" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'descending_triangle' && (
        <>
          <line x1="52" y1="62" x2="192" y2="62" stroke="#f43f5e" strokeDasharray="4 3" strokeWidth="1.4" />
          <line x1="58" y1="20" x2="184" y2="62" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.3" />
          <path d="M16 32 L58 20 L78 62 L106 36 L128 62 L152 48 L174 62 L214 86" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="174" cy="62" r="3.5" fill="#f43f5e" />
        </>
      )}
      {patternType === 'inv_head_shoulders' && (
        <>
          <line x1="36" y1="36" x2="202" y2="36" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.4" />
          <path d="M16 18 L56 60 L82 36 L116 84 L148 36 L170 56 L190 36 L220 10" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="190" cy="36" r="3.5" fill="#f59e0b" />
        </>
      )}
      {patternType === 'head_shoulders' && (
        <>
          <line x1="36" y1="58" x2="202" y2="58" stroke="#f43f5e" strokeDasharray="4 3" strokeWidth="1.4" />
          <path d="M16 78 L56 32 L82 58 L116 12 L148 58 L170 36 L190 58 L220 84" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="190" cy="58" r="3.5" fill="#f43f5e" />
        </>
      )}
    </svg>
  );
}

export default function LearnTab({ setActiveTab, onSelectSetup }) {
  const [system, setSystem] = useState('qullamaggie'); // 'qullamaggie' | 'kova' | 'jeffsun' | 'danzanger'
  const [activeChapterId, setActiveChapterId] = useState('kq_core_philosophy');
  const [searchQuery, setSearchQuery] = useState('');
  const tabRefs = useRef({});

  // Dan Zanger Chart Visual Mode & Lightbox
  const [patternVisualTab, setPatternVisualTab] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  // Kristjan Qullamaggie Interactive Calculator State
  const [kqEquity, setKqEquity] = useState(100000);
  const [kqRiskPct, setKqRiskPct] = useState(0.5); // 0.5% equity risk
  const [kqEntryPrice, setKqEntryPrice] = useState(50.0);
  const [kqLodPrice, setKqLodPrice] = useState(48.5);
  const [kqAtr, setKqAtr] = useState(3.0);

  // Kristjan Qullamaggie Interactive Checklist State
  const [kqChecklistItems, setKqChecklistItems] = useState({
    regimeUptrend: true,
    momentumScan: true,
    highAdrLiquidity: true,
    cleanBaseSurfing: true,
    volumeDryUp: true,
    orhBreakout: true,
    lodAtrUnder60: true,
    riskCappedEquity: true,
    threeToFiveDayPlan: true,
    emaTrailDiscipline: false
  });

  // Martin Luk Interactive Calculator State
  const [mlEquity, setMlEquity] = useState(100000);
  const [mlRiskPct, setMlRiskPct] = useState(0.75); // 0.75% equity risk
  const [mlEntryPrice, setMlEntryPrice] = useState(50.0);
  const [mlStopPrice, setMlStopPrice] = useState(49.25); // $0.75 stop (1.5%)
  const [mlAdr, setMlAdr] = useState(3.0); // $3.00 daily ADR (6%)

  // Martin Luk Interactive Checklist State
  const [mlChecklistItems, setMlChecklistItems] = useState({
    adrThreshold: true,
    themeClustering: true,
    trendAlignment: true,
    avwapSupport: true,
    volumeContraction: true,
    triggerExecution: true,
    halfAdrLimit: true,
    riskCappedEquity: true,
    partialTrimPlan: true,
    trail21Ema: false
  });

  // Universal Comparison & Simulator State
  const [compEquity, setCompEquity] = useState(100000);
  const [compRiskPct, setCompRiskPct] = useState(1.0); // 1.0% equity risk ($1,000)
  const [compEntryPrice, setCompEntryPrice] = useState(100.0);
  const [compExpectedGainPct, setCompExpectedGainPct] = useState(30.0); // +30% expected stock move
  const [compCompressedStopPct, setCompCompressedStopPct] = useState(1.5); // 1.5% compressed stop
  const [compStandardStopPct, setCompStandardStopPct] = useState(4.5); // 4.5% standard pivot stop
  const [compWideStopPct, setCompWideStopPct] = useState(7.5); // 7.5% conventional stop

  // Universal Super Trader Checklist State
  const [compChecklistItems, setCompChecklistItems] = useState({
    regimeUptrend: true,
    alphaLeader: true,
    highAdrVolatility: true,
    cleanBaseVdu: true,
    structuralStopDefined: true,
    stopCompressionChecked: true,
    strictRiskCapped: true,
    partialTrimPlan: true,
    breakevenAdjustment: true,
    dailyCloseTrailing: false
  });

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

  // Dan Zanger Interactive Calculator State
  const [dzEquity, setDzEquity] = useState(100000);
  const [dzRiskPct, setDzRiskPct] = useState(1.0); // 1.0% equity risk
  const [dzPivotPrice, setDzPivotPrice] = useState(60.0);
  const [dzEntryPrice, setDzEntryPrice] = useState(60.6);
  const [dzStopPrice, setDzStopPrice] = useState(59.0);
  const [dzCurrentVol, setDzCurrentVol] = useState(750000);
  const [dzAvgSliceVol, setDzAvgSliceVol] = useState(350000);

  // Dan Zanger Interactive Checklist State
  const [dzChecklistItems, setDzChecklistItems] = useState({
    marketAndGroup: true,
    explosiveGrowth: true,
    classicBaseNoWedge: true,
    baseVolumeDryUp: true,
    friskyLiquidity: true,
    withinFivePctPivot: true,
    zvrVolumeSurge: true,
    subPivotDollarStop: true,
    noImminentEarnings: true,
    scaleAndMarginDiscipline: false
  });

  // Select system content
  const t =
    system === 'qullamaggie'
      ? QULLAMAGGIE_CONTENT
      : system === 'martinluk'
        ? MARTIN_LUK_CONTENT
        : system === 'comparison'
          ? COMPARISON_CONTENT
          : system === 'jeffsun'
            ? JEFF_SUN_CONTENT
            : system === 'danzanger'
              ? DAN_ZANGER_CONTENT
              : KOVA_CONTENT;

  // Handle system switch
  const handleSystemChange = (newSystem) => {
    setSystem(newSystem);
    if (newSystem === 'qullamaggie') {
      setActiveChapterId('kq_core_philosophy');
    } else if (newSystem === 'martinluk') {
      setActiveChapterId('ml_philosophy');
    } else if (newSystem === 'comparison') {
      setActiveChapterId('comp_matrix');
    } else if (newSystem === 'jeffsun') {
      setActiveChapterId('js_core_beliefs');
    } else if (newSystem === 'danzanger') {
      setActiveChapterId('dz_philosophy');
    } else {
      setActiveChapterId('selection');
    }
    setSearchQuery('');
  };

  // Accessible keyboard arrow navigation for ARIA tablist
  const handleSystemTabKeyDown = (e, currentSys) => {
    const idx = SYSTEM_ORDER.indexOf(currentSys);
    let nextIdx = -1;
    if (e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % SYSTEM_ORDER.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + SYSTEM_ORDER.length) % SYSTEM_ORDER.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = SYSTEM_ORDER.length - 1;
    }
    if (nextIdx !== -1) {
      e.preventDefault();
      const targetSys = SYSTEM_ORDER[nextIdx];
      handleSystemChange(targetSys);
      tabRefs.current[targetSys]?.focus();
    }
  };

  // Kristjan Qullamaggie Calculator calculations
  const kqCalcResults = useMemo(() => {
    const equity = parseFloat(kqEquity) || 0;
    const riskPct = parseFloat(kqRiskPct) || 0;
    const entry = parseFloat(kqEntryPrice) || 0;
    const lod = parseFloat(kqLodPrice) || 0;
    const atr = parseFloat(kqAtr) || 0;

    const stopDistance = entry > 0 ? entry - lod : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const lodDistancePctAtr = atr > 0 ? (stopDistance / atr) * 100 : 0;
    const isLodValid = lodDistancePctAtr > 0 && lodDistancePctAtr <= 60.0;

    const totalRiskDollars = equity * (riskPct / 100);
    let totalShares = 0;
    if (stopDistance > 0 && totalRiskDollars > 0) {
      totalShares = Math.floor(totalRiskDollars / stopDistance);
    }

    const totalPositionValue = totalShares * entry;
    const positionPctOfEquity = equity > 0 ? (totalPositionValue / equity) * 100 : 0;

    // Qullamaggie 3-5 day partial exit (1/3 to 1/2) and +3R / +5R targets
    const target3R = entry + 3.0 * stopDistance;
    const target5R = entry + 5.0 * stopDistance;
    const trimSharesThird = Math.floor(totalShares * (1 / 3));
    const trimSharesHalf = Math.floor(totalShares * 0.5);
    const runnerShares = Math.max(0, totalShares - trimSharesHalf);

    return {
      stopDistance,
      stopPct,
      lodDistancePctAtr,
      isLodValid,
      totalRiskDollars,
      totalShares,
      totalPositionValue,
      positionPctOfEquity,
      target3R,
      target5R,
      trimSharesThird,
      trimSharesHalf,
      runnerShares
    };
  }, [kqEquity, kqRiskPct, kqEntryPrice, kqLodPrice, kqAtr]);

  // Martin Luk Calculator calculations
  const mlCalcResults = useMemo(() => {
    const equity = parseFloat(mlEquity) || 0;
    const riskPct = parseFloat(mlRiskPct) || 0;
    const entry = parseFloat(mlEntryPrice) || 0;
    const stop = parseFloat(mlStopPrice) || 0;
    const adr = parseFloat(mlAdr) || 0;

    const stopDistance = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const stopDistancePctAdr = adr > 0 ? (stopDistance / adr) * 100 : 0;
    const isStopCompressed = stopDistancePctAdr > 0 && stopDistancePctAdr <= 50.0;

    const totalRiskDollars = equity * (riskPct / 100);
    let totalShares = 0;
    if (stopDistance > 0 && totalRiskDollars > 0) {
      totalShares = Math.floor(totalRiskDollars / stopDistance);
    }

    const totalPositionValue = totalShares * entry;
    const positionPctOfEquity = equity > 0 ? (totalPositionValue / equity) * 100 : 0;

    // Comparative R-Multiple on +25% Move
    const target25Pct = entry * 1.25;
    const gain25Pct = target25Pct - entry;
    const rMultiple25Pct = stopDistance > 0 ? gain25Pct / stopDistance : 0;
    const conventionalStopDist = entry * 0.05; // 5% stop
    const conventionalR25Pct = conventionalStopDist > 0 ? gain25Pct / conventionalStopDist : 0;
    const rMultiplierBoost = conventionalR25Pct > 0 ? rMultiple25Pct / conventionalR25Pct : 1;

    // Targets & Scaling: +3R, +5R, 30% trim, 70% 21-EMA runner
    const target3R = entry + 3.0 * stopDistance;
    const target5R = entry + 5.0 * stopDistance;
    const trimShares30 = Math.floor(totalShares * 0.3);
    const runnerShares70 = Math.max(0, totalShares - trimShares30);

    return {
      stopDistance,
      stopPct,
      stopDistancePctAdr,
      isStopCompressed,
      totalRiskDollars,
      totalShares,
      totalPositionValue,
      positionPctOfEquity,
      target25Pct,
      rMultiple25Pct,
      conventionalR25Pct,
      rMultiplierBoost,
      target3R,
      target5R,
      trimShares30,
      runnerShares70
    };
  }, [mlEquity, mlRiskPct, mlEntryPrice, mlStopPrice, mlAdr]);

  // Universal Master Simulator calculations
  const compCalcResults = useMemo(() => {
    const equity = parseFloat(compEquity) || 0;
    const riskPct = parseFloat(compRiskPct) || 0;
    const entry = parseFloat(compEntryPrice) || 0;
    const gainPct = parseFloat(compExpectedGainPct) || 0;
    const cStopPct = parseFloat(compCompressedStopPct) || 0;
    const sStopPct = parseFloat(compStandardStopPct) || 0;
    const wStopPct = parseFloat(compWideStopPct) || 0;

    const riskDollars = equity * (riskPct / 100);
    const targetPrice = entry * (1 + gainPct / 100);
    const gainPerShare = targetPrice - entry;

    // 1. Compressed Stop (Luk / QM)
    const cStopDist = entry * (cStopPct / 100);
    const cStopPrice = entry - cStopDist;
    const cShares = cStopDist > 0 ? Math.floor(riskDollars / cStopDist) : 0;
    const cPositionValue = cShares * entry;
    const cTotalProfit = cShares * gainPerShare;
    const cRMultiple = cStopDist > 0 ? gainPerShare / cStopDist : 0;
    const cPortfolioGainPct = equity > 0 ? (cTotalProfit / equity) * 100 : 0;

    // 2. Standard Pivot Stop (Kova / JS)
    const sStopDist = entry * (sStopPct / 100);
    const sStopPrice = entry - sStopDist;
    const sShares = sStopDist > 0 ? Math.floor(riskDollars / sStopDist) : 0;
    const sPositionValue = sShares * entry;
    const sTotalProfit = sShares * gainPerShare;
    const sRMultiple = sStopDist > 0 ? gainPerShare / sStopDist : 0;
    const sPortfolioGainPct = equity > 0 ? (sTotalProfit / equity) * 100 : 0;

    // 3. Wide Conventional Stop (Retail)
    const wStopDist = entry * (wStopPct / 100);
    const wStopPrice = entry - wStopDist;
    const wShares = wStopDist > 0 ? Math.floor(riskDollars / wStopDist) : 0;
    const wPositionValue = wShares * entry;
    const wTotalProfit = wShares * gainPerShare;
    const wRMultiple = wStopDist > 0 ? gainPerShare / wStopDist : 0;
    const wPortfolioGainPct = equity > 0 ? (wTotalProfit / equity) * 100 : 0;

    const outperformanceVsWide = wTotalProfit > 0 ? cTotalProfit / wTotalProfit : 1;
    const outperformanceVsStandard = sTotalProfit > 0 ? cTotalProfit / sTotalProfit : 1;

    return {
      riskDollars,
      targetPrice,
      gainPerShare,
      cStopDist,
      cStopPrice,
      cShares,
      cPositionValue,
      cTotalProfit,
      cRMultiple,
      cPortfolioGainPct,
      sStopDist,
      sStopPrice,
      sShares,
      sPositionValue,
      sTotalProfit,
      sRMultiple,
      sPortfolioGainPct,
      wStopDist,
      wStopPrice,
      wShares,
      wPositionValue,
      wTotalProfit,
      wRMultiple,
      wPortfolioGainPct,
      outperformanceVsWide,
      outperformanceVsStandard
    };
  }, [compEquity, compRiskPct, compEntryPrice, compExpectedGainPct, compCompressedStopPct, compStandardStopPct, compWideStopPct]);

  // Kova Calculator calculations
  const calcResults = useMemo(() => {
    const equity = parseFloat(calcEquity) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntryPrice) || 0;
    const stop = parseFloat(calcStopPrice) || 0;

    const stopDistance = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const totalRiskDollars = equity * (riskPct / 100);

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
    const target25R = entry + 2.5 * stopDistance;
    const target3R = entry + 3.0 * stopDistance;
    const target7Atr = sma50 + 7.0 * atr;

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

  // Dan Zanger Calculator calculations
  const dzCalcResults = useMemo(() => {
    const equity = parseFloat(dzEquity) || 0;
    const riskPct = parseFloat(dzRiskPct) || 0;
    const pivot = parseFloat(dzPivotPrice) || 0;
    const entry = parseFloat(dzEntryPrice) || 0;
    const stop = parseFloat(dzStopPrice) || 0;
    const curVol = parseFloat(dzCurrentVol) || 0;
    const avgVol = parseFloat(dzAvgSliceVol) || 0;

    const maxBuyPrice = pivot * 1.05;
    const chasePct = pivot > 0 ? ((entry - pivot) / pivot) * 100 : 0;
    const isWithinFivePct = entry >= pivot && chasePct <= 5.0;
    const isAnticipating = entry < pivot;

    const stopDistance = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const subPivotDollarGap = pivot > 0 ? pivot - stop : 0;
    const isStopTight = stopDistance > 0 && stopPct <= 5.0;

    const zvrPct = avgVol > 0 ? (curVol / avgVol) * 100 : 0;
    const isZvrExtreme = zvrPct >= 200.0;
    const isZvrValid = zvrPct >= 120.0;

    const totalRiskDollars = equity * (riskPct / 100);
    let totalShares = 0;
    if (stopDistance > 0 && totalRiskDollars > 0) {
      totalShares = Math.floor(totalRiskDollars / stopDistance);
    }

    const totalPositionValue = totalShares * entry;
    const positionPctOfEquity = equity > 0 ? (totalPositionValue / equity) * 100 : 0;

    // Dan Zanger Golden Rule #5: Sell 20%-30% (25% default) at +15% to +20% above breakout pivot
    const trimShares25 = Math.floor(totalShares * 0.25);
    const coreShares50 = Math.floor(totalShares * 0.5);
    const runnerShares25 = Math.max(0, totalShares - trimShares25 - coreShares50);

    const target15Pct = pivot * 1.15;
    const target20Pct = pivot * 1.20;

    return {
      maxBuyPrice,
      chasePct,
      isWithinFivePct,
      isAnticipating,
      stopDistance,
      stopPct,
      subPivotDollarGap,
      isStopTight,
      zvrPct,
      isZvrExtreme,
      isZvrValid,
      totalRiskDollars,
      totalShares,
      totalPositionValue,
      positionPctOfEquity,
      trimShares25,
      coreShares50,
      runnerShares25,
      target15Pct,
      target20Pct
    };
  }, [dzEquity, dzRiskPct, dzPivotPrice, dzEntryPrice, dzStopPrice, dzCurrentVol, dzAvgSliceVol]);

  // Checklist score
  const kqChecklistScore = useMemo(() => {
    const keys = Object.keys(kqChecklistItems);
    const completed = keys.filter(k => kqChecklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [kqChecklistItems]);

  const mlChecklistScore = useMemo(() => {
    const keys = Object.keys(mlChecklistItems);
    const completed = keys.filter(k => mlChecklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [mlChecklistItems]);

  const compChecklistScore = useMemo(() => {
    const keys = Object.keys(compChecklistItems);
    const completed = keys.filter(k => compChecklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [compChecklistItems]);

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

  const dzChecklistScore = useMemo(() => {
    const keys = Object.keys(dzChecklistItems);
    const completed = keys.filter(k => dzChecklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [dzChecklistItems]);

  const toggleKqChecklist = (key) => {
    setKqChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMlChecklist = (key) => {
    setMlChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCompChecklist = (key) => {
    setCompChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleChecklist = (key) => {
    setChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleJsChecklist = (key) => {
    setJsChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDzChecklist = (key) => {
    setDzChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return t.chapters;
    const q = searchQuery.toLowerCase();
    return t.chapters.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.shortTitle.toLowerCase().includes(q) ||
      (c.patterns && c.patterns.some(p =>
        p.name.toLowerCase().includes(q) ||
        (p.headline && p.headline.toLowerCase().includes(q)) ||
        (p.originalText && p.originalText.some(txt => txt.toLowerCase().includes(q)))
      ))
    );
  }, [t.chapters, searchQuery]);

  const activeChapter = useMemo(() => {
    return t.chapters.find(c => c.id === activeChapterId) || t.chapters[0];
  }, [t.chapters, activeChapterId]);

  return (
    <div className="learn-page-container">
      {/* Methodology Switcher */}
      <div
        className="learn-system-selector-row"
        role="tablist"
        aria-label="Trading Methodologies"
      >
        <button
          ref={(el) => { tabRefs.current.qullamaggie = el; }}
          id="learn-tab-qullamaggie"
          role="tab"
          aria-selected={system === 'qullamaggie'}
          aria-controls="learn-panel-qullamaggie"
          tabIndex={system === 'qullamaggie' ? 0 : -1}
          className={`learn-system-btn ${system === 'qullamaggie' ? 'active' : ''}`}
          onClick={() => handleSystemChange('qullamaggie')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'qullamaggie')}
        >
          <span className="system-icon" aria-hidden="true">👑</span>
          <div className="system-btn-text">
            <span className="system-name">Kristjan Qullamaggie</span>
            <span className="system-sub">HTF Breakouts · Episodic Pivots · 10/20 EMA Trail</span>
          </div>
        </button>

        <button
          ref={(el) => { tabRefs.current.martinluk = el; }}
          id="learn-tab-martinluk"
          role="tab"
          aria-selected={system === 'martinluk'}
          aria-controls="learn-panel-martinluk"
          tabIndex={system === 'martinluk' ? 0 : -1}
          className={`learn-system-btn ${system === 'martinluk' ? 'active' : ''}`}
          onClick={() => handleSystemChange('martinluk')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'martinluk')}
        >
          <span className="system-icon" aria-hidden="true">🏆</span>
          <div className="system-btn-text">
            <span className="system-name">Martin Luk Method</span>
            <span className="system-sub">+283% &amp; +969% USIC · Stop Compression</span>
          </div>
        </button>

        <button
          ref={(el) => { tabRefs.current.kova = el; }}
          id="learn-tab-kova"
          role="tab"
          aria-selected={system === 'kova'}
          aria-controls="learn-panel-kova"
          tabIndex={system === 'kova' ? 0 : -1}
          className={`learn-system-btn ${system === 'kova' ? 'active' : ''}`}
          onClick={() => handleSystemChange('kova')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'kova')}
        >
          <span className="system-icon" aria-hidden="true">🎯</span>
          <div className="system-btn-text">
            <span className="system-name">KovaView Method</span>
            <span className="system-sub">CAN SLIM · VCP · 50/30/20 Pyramid</span>
          </div>
        </button>

        <button
          ref={(el) => { tabRefs.current.jeffsun = el; }}
          id="learn-tab-jeffsun"
          role="tab"
          aria-selected={system === 'jeffsun'}
          aria-controls="learn-panel-jeffsun"
          tabIndex={system === 'jeffsun' ? 0 : -1}
          className={`learn-system-btn ${system === 'jeffsun' ? 'active' : ''}`}
          onClick={() => handleSystemChange('jeffsun')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'jeffsun')}
        >
          <span className="system-icon" aria-hidden="true">📈</span>
          <div className="system-btn-text">
            <span className="system-name">Jeff Sun, CFTe Method</span>
            <span className="system-sub">High ADR% · RVOL · &lt;60% ATR LoD</span>
          </div>
        </button>

        <button
          ref={(el) => { tabRefs.current.danzanger = el; }}
          id="learn-tab-danzanger"
          role="tab"
          aria-selected={system === 'danzanger'}
          aria-controls="learn-panel-danzanger"
          tabIndex={system === 'danzanger' ? 0 : -1}
          className={`learn-system-btn ${system === 'danzanger' ? 'active' : ''}`}
          onClick={() => handleSystemChange('danzanger')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'danzanger')}
        >
          <span className="system-icon" aria-hidden="true">🚀</span>
          <div className="system-btn-text">
            <span className="system-name">Dan Zanger Method</span>
            <span className="system-sub">11 Chart Patterns · ZVR · 10 Golden Rules</span>
          </div>
        </button>

        <button
          ref={(el) => { tabRefs.current.comparison = el; }}
          id="learn-tab-comparison"
          role="tab"
          aria-selected={system === 'comparison'}
          aria-controls="learn-panel-comparison"
          tabIndex={system === 'comparison' ? 0 : -1}
          className={`learn-system-btn ${system === 'comparison' ? 'active' : ''}`}
          onClick={() => handleSystemChange('comparison')}
          onKeyDown={(e) => handleSystemTabKeyDown(e, 'comparison')}
        >
          <span className="system-icon" aria-hidden="true">⚖️</span>
          <div className="system-btn-text">
            <span className="system-name">Master Comparison</span>
            <span className="system-sub">5 Super Traders · Universal DNA</span>
          </div>
        </button>
      </div>

      <div
        id={`learn-panel-${system}`}
        role="tabpanel"
        aria-labelledby={`learn-tab-${system}`}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Header / Hero Section */}
        <div className="glass-card learn-hero-card">
          <div className="learn-hero-header">
            <div className="learn-hero-badge-group">
              <span className="badge badge-emerald">{t.hero.badge}</span>
              <span className="badge badge-outline">{t.hero.author}</span>
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
                <span className="learn-toc-title">Chapters Navigation</span>
                <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                  {t.chapters.length} Topics
                </span>
              </div>

              <div className="learn-search-box">
                <input
                  type="text"
                  className="learn-search-input"
                  aria-label="Search curriculum"
                  placeholder="Search curriculum..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="learn-search-clear"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <nav className="learn-toc-nav" aria-label="Chapter list">
                {filteredChapters.map((ch) => (
                  <button
                    key={ch.id}
                    className={`learn-toc-item ${activeChapterId === ch.id ? 'active' : ''}`}
                    onClick={() => setActiveChapterId(ch.id)}
                  >
                    <div className="learn-toc-item-left">
                      <span className="learn-toc-num">{ch.number}</span>
                      <span className="learn-toc-icon" aria-hidden="true">{ch.icon}</span>
                      <span className="learn-toc-text">{ch.shortTitle}</span>
                    </div>
                    {activeChapterId === ch.id && (
                      <span className="learn-toc-active-dot" aria-hidden="true">●</span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="learn-quick-actions">
                <div className="learn-quick-title">PIVOTTRADER LAUNCHPAD</div>
                <button
                  className="btn btn-secondary btn-sm full-width"
                  style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                  onClick={() => {
                    if (onSelectSetup) onSelectSetup(system === 'qullamaggie' || system === 'martinluk' ? 'qm_breakouts' : system === 'danzanger' ? 'power_play' : 'gainers');
                    if (setActiveTab) setActiveTab('candidates');
                  }}
                >
                  🎯 Run Leaders Screener
                </button>
                <button
                  className="btn btn-secondary btn-sm full-width"
                  style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                  onClick={() => setActiveTab && setActiveTab('dashboard')}
                >
                  📈 Check Market Regime
                </button>
                <button
                  className="btn btn-secondary btn-sm full-width"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setActiveTab && setActiveTab('model-book')}
                >
                  📚 Model Book Historicals
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
                  <span className="learn-chapter-icon-large" aria-hidden="true">{activeChapter.icon}</span>
                </div>
                <h2 className="learn-chapter-title">{activeChapter.title}</h2>
                <p className="learn-chapter-summary">{activeChapter.summary}</p>
              </div>

              {/* Special Section: Dan Zanger 11 Chart Patterns Cards */}
              {activeChapter.patterns && (
                <div className="learn-patterns-grid">
                  {activeChapter.patterns.map((pat, pIdx) => {
                    const defaultVisual = pat.diagrams && pat.diagrams.length > 0 ? 'diagram' : (pat.sampleCharts && pat.sampleCharts.length > 0 ? 'chart' : 'vector');
                    const activeVisual = patternVisualTab[pat.num] || defaultVisual;

                    return (
                      <div
                        key={pIdx}
                        className={`learn-pattern-card ${pat.sentiment === 'bearish' ? 'bearish' : pat.sentiment === 'warning' ? 'warning' : ''}`}
                      >
                        <div className="learn-pattern-top">
                          <div className="learn-pattern-title-wrap">
                            <span className="learn-pattern-num">{pat.num}</span>
                            <div>
                              <h4>{pat.name}</h4>
                              {pat.headline && pat.headline !== pat.name && (
                                <div className="learn-pattern-official-headline">{pat.headline}</div>
                              )}
                            </div>
                          </div>
                          <div className="learn-pattern-badge-group">
                            <span
                              className={`badge ${
                                pat.sentiment === 'bearish'
                                  ? 'badge-danger'
                                  : pat.sentiment === 'warning'
                                    ? 'badge-warning'
                                    : 'badge-emerald'
                              }`}
                            >
                              {pat.badge}
                            </span>
                            {pat.sourceUrl && (
                              <a
                                href={pat.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="learn-source-link"
                                title="Open original explanation on chartpattern.com"
                              >
                                chartpattern.com ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Visual Tabs & Display */}
                        <div className="learn-pattern-visual-container">
                          <div className="learn-pattern-visual-tabs">
                            {pat.diagrams && pat.diagrams.length > 0 && (
                              <button
                                type="button"
                                className={`learn-pattern-visual-tab-btn ${activeVisual === 'diagram' ? 'active' : ''}`}
                                onClick={() => setPatternVisualTab(prev => ({ ...prev, [pat.num]: 'diagram' }))}
                              >
                                📐 Schematic {pat.diagrams.length > 1 ? `(${pat.diagrams.length})` : ''}
                              </button>
                            )}
                            {pat.sampleCharts && pat.sampleCharts.length > 0 && (
                              <button
                                type="button"
                                className={`learn-pattern-visual-tab-btn ${activeVisual === 'chart' ? 'active' : ''}`}
                                onClick={() => setPatternVisualTab(prev => ({ ...prev, [pat.num]: 'chart' }))}
                              >
                                📈 Historic Chart {pat.sampleCharts[0].ticker ? `(${pat.sampleCharts[0].ticker})` : ''}
                              </button>
                            )}
                            <button
                              type="button"
                              className={`learn-pattern-visual-tab-btn ${activeVisual === 'vector' ? 'active' : ''}`}
                              onClick={() => setPatternVisualTab(prev => ({ ...prev, [pat.num]: 'vector' }))}
                            >
                              ⚡ Vector Model
                            </button>
                          </div>

                          <div className="learn-pattern-visual-body">
                            {activeVisual === 'chart' && pat.sampleCharts && pat.sampleCharts.length > 0 && (
                              <div className="learn-pattern-gallery">
                                {pat.sampleCharts.map((chart, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="learn-pattern-chart-item"
                                    onClick={() => setLightboxImage(chart)}
                                    title="Click to view full resolution"
                                  >
                                    <div className="learn-pattern-img-wrap">
                                      <img src={chart.src} alt={chart.title} className="learn-pattern-chart-img" />
                                      <span className="learn-pattern-zoom-pill">🔍 Enlarge</span>
                                    </div>
                                    {chart.caption && (
                                      <div className="learn-pattern-caption">{chart.caption}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeVisual === 'diagram' && pat.diagrams && pat.diagrams.length > 0 && (
                              <div className="learn-pattern-gallery">
                                {pat.diagrams.map((diag, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="learn-pattern-diagram-item"
                                    onClick={() => setLightboxImage({ ...diag, isSchematic: true })}
                                    title="Click to view full resolution"
                                  >
                                    <div className="learn-pattern-schematic-wrap">
                                      <img src={diag.src} alt={diag.title} className="learn-pattern-diagram-img" />
                                      <span className="learn-pattern-zoom-pill">🔍 Enlarge</span>
                                    </div>
                                    {diag.caption && (
                                      <div className="learn-pattern-caption">{diag.caption}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeVisual === 'vector' && (
                              <div className="learn-pattern-svg-box">
                                <PatternDiagramSvg patternType={pat.patternType} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dan Zanger Verbatim Methodology Commentary */}
                        {pat.originalText && pat.originalText.length > 0 && (
                          <div className="learn-zanger-text-box">
                            <div className="learn-zanger-text-header">
                              <span className="learn-zanger-quote-symbol" aria-hidden="true">“</span>
                              <span>Dan Zanger's Chartpattern.com Commentary</span>
                            </div>
                            <div className="learn-zanger-text-body">
                              {pat.originalText.map((p, pIdx) => (
                                <p key={pIdx} className="learn-zanger-p">{p}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="learn-pattern-meta">
                          <div className="learn-pattern-meta-row">
                            <span className="learn-pattern-meta-label">Structure:</span>
                            <span>{pat.specs}</span>
                          </div>
                          <div className="learn-pattern-meta-row">
                            <span className="learn-pattern-meta-label">Pivot Trigger:</span>
                            <span style={{ color: pat.sentiment === 'bearish' ? '#fda4af' : '#38bdf8' }}>
                              {pat.pivot}
                            </span>
                          </div>
                          <div className="learn-pattern-meta-row">
                            <span className="learn-pattern-meta-label">Volume:</span>
                            <span>{pat.volume}</span>
                          </div>
                        </div>

                        <p className="learn-pattern-rule">{pat.rule}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Special Section: Four Dimensions Matrix (Kova / Zanger Chapter 1) */}
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

              {/* Special Section: Indicator Cards (Jeff Sun / Dan Zanger) */}
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

              {/* Special Section: Screener Rules & Review Funnel */}
              {activeChapter.screenerRules && (
                <div className="learn-rules-container">
                  <h3 className="section-subheading">Core Screener Parameters &amp; Objectives</h3>
                  <div className="learn-rules-table-wrapper">
                    <table className="learn-table">
                      <thead>
                        <tr>
                          <th scope="col">Rule Dimension</th>
                          <th scope="col">Threshold Parameter</th>
                          <th scope="col">Rationale &amp; Objective</th>
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
                </div>
              )}

              {activeChapter.passes && (
                <div className="learn-rules-container">
                  <h3 className="section-subheading" style={{ marginTop: activeChapter.screenerRules ? '24px' : '0' }}>
                    Progressive Chart Review Funnel
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
                </div>
              )}

              {/* Special Section: VCP 3 Contractions (Kova Chapter 3) */}
              {activeChapter.vcpDetails && (
                <div className="learn-vcp-container">
                  <div className="learn-callout-box">
                    <div className="learn-callout-icon">💡</div>
                    <div>
                      <strong>True VCP Definition:</strong>{' '}
                      Many traders mistakenly think VCP is just price contraction. A genuine, high win-rate VCP requires ALL THREE contractions simultaneously.
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

              {/* Special Section: Stop Loss Levels */}
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
                          📍 Trigger Point: <strong>{pyr.trigger}</strong>
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
                    🟢 Offensive Selling (Protecting Big Profits)
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
                        🔴 Defensive Selling (Capital Preservation)
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
                      📋 Mandatory Journal Entry Fields:
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
              {/* KRISTJAN QULLAMAGGIE INTERACTIVE CHECKLIST (kq_checklist) */}
              {/* ========================================================= */}
              {activeChapter.id === 'kq_checklist' && (
                <div className="learn-interactive-checklist-pane">
                  <div className="checklist-score-banner">
                    <div className="score-summary">
                      <span className="score-title">Qullamaggie Execution Compliance Score</span>
                      <div className="score-number">
                        {kqChecklistScore.pct}%{' '}
                        <span className="score-sub">({kqChecklistScore.completed}/{kqChecklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {kqChecklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ Ready to Execute — Pedal to the Metal
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Non-Negotiable Rules Incomplete
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="checklist-items-grid">
                    <label className={`checklist-item ${kqChecklistItems.regimeUptrend ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.regimeUptrend}
                        onChange={() => toggleKqChecklist('regimeUptrend')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          1. Market Pulse Green Light (QQQ &amp; SPY &gt; 10 &amp; 20 EMA)
                        </span>
                        <span className="checklist-item-desc">
                          Indices above rising 10 EMA &amp; 20 EMA, with 10 EMA &gt; 20 EMA. Never swim against heavy market distribution.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.momentumScan ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.momentumScan}
                        onChange={() => toggleKqChecklist('momentumScan')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          2. Top 1%–2% Momentum Leader (1M / 3M / 6M Confluence)
                        </span>
                        <span className="checklist-item-desc">
                          Stock has proven relative strength: up 30%–100%+ in past 1 to 3 months. Ideally appears in multiple gainers scans.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.highAdrLiquidity ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.highAdrLiquidity}
                        onChange={() => toggleKqChecklist('highAdrLiquidity')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          3. High ADR% (≥ 4.0% – 5.0%+) &amp; Liquid Turnover ($5M–$10M+)
                        </span>
                        <span className="checklist-item-desc">
                          Inherent volatility is mandatory to generate 5R–20R+ payoff. Average dollar volume prevents slippage friction.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.cleanBaseSurfing ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.cleanBaseSurfing}
                        onChange={() => toggleKqChecklist('cleanBaseSurfing')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          4. Clean Base Consolidation &amp; 10/20 EMA Surf
                        </span>
                        <span className="checklist-item-desc">
                          Orderly pullback (≤15%–25%) over 2 to 8 weeks. Price rests on rising 10 EMA or dips slightly to 20 EMA with higher lows.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.volumeDryUp ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.volumeDryUp}
                        onChange={() => toggleKqChecklist('volumeDryUp')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          5. Volume Dry-Up (VDU) Prior to Breakout
                        </span>
                        <span className="checklist-item-desc">
                          Volume contracts dramatically as price tightens near resistance. Sellers have exhausted available floating supply.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.orhBreakout ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.orhBreakout}
                        onChange={() => toggleKqChecklist('orhBreakout')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          6. Opening Range High (ORH) Breakout Confirmation
                        </span>
                        <span className="checklist-item-desc">
                          Entering on 1m, 5m, or 60m ORH breakout with expanding morning volume buzz. No anticipatory front-running.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.lodAtrUnder60 ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.lodAtrUnder60}
                        onChange={() => toggleKqChecklist('lodAtrUnder60')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          7. Stop at LoD &amp; Distance ≤ 60% of Daily ATR
                        </span>
                        <span className="checklist-item-desc">
                          Stop loss placed strictly at Low of the Day (LoD). Risk distance must NOT exceed 60% ATR.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.riskCappedEquity ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.riskCappedEquity}
                        onChange={() => toggleKqChecklist('riskCappedEquity')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          8. Risk Capped at 0.25% – 1.0% Account Equity
                        </span>
                        <span className="checklist-item-desc">
                          Exact share count derived from LoD stop distance. Never expose more than 1% of portfolio equity to any single idea.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.threeToFiveDayPlan ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.threeToFiveDayPlan}
                        onChange={() => toggleKqChecklist('threeToFiveDayPlan')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          9. 3–5 Day Partial Profit Plan &amp; Breakeven Stop
                        </span>
                        <span className="checklist-item-desc">
                          Commitment to sell 1/3 to 1/2 into initial strength (+3R to +5R) on Day 3–5, then immediately move stop to breakeven.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${kqChecklistItems.emaTrailDiscipline ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kqChecklistItems.emaTrailDiscipline}
                        onChange={() => toggleKqChecklist('emaTrailDiscipline')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          10. 10/20 EMA Daily Close Trailing Discipline
                        </span>
                        <span className="checklist-item-desc">
                          Hold remaining runner until the FIRST DAILY CLOSE below the 10 EMA (fast) or 20 EMA (core trend). No intraday panic selling!
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* KRISTJAN QULLAMAGGIE CALCULATOR (kq_calculator)           */}
              {/* ========================================================= */}
              {activeChapter.id === 'kq_calculator' && (
                <div className="learn-calculator-pane">
                  <div className="calc-inputs-grid">
                    <div className="calc-input-group">
                      <label htmlFor="kq-equity-input">Total Account Equity ($)</label>
                      <input
                        id="kq-equity-input"
                        type="number"
                        className="calc-input"
                        value={kqEquity}
                        onChange={(e) => setKqEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kq-risk-input">Equity Risk Per Trade (%)</label>
                      <span id="kq-risk-hint" className="calc-hint">Qullamaggie Rule: 0.25% – 1.00%</span>
                      <input
                        id="kq-risk-input"
                        aria-describedby="kq-risk-hint"
                        type="number"
                        step="0.05"
                        className="calc-input"
                        value={kqRiskPct}
                        onChange={(e) => setKqRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kq-entry-input">Entry / Breakout Price ($)</label>
                      <input
                        id="kq-entry-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={kqEntryPrice}
                        onChange={(e) => setKqEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kq-lod-input">Low of Day (LoD) Stop ($)</label>
                      <span id="kq-lod-hint" className="calc-hint">Intraday Low before breakout</span>
                      <input
                        id="kq-lod-input"
                        aria-describedby="kq-lod-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={kqLodPrice}
                        onChange={(e) => setKqLodPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kq-atr-input">Daily ATR ($)</label>
                      <span id="kq-atr-hint" className="calc-hint">14-Day Average True Range</span>
                      <input
                        id="kq-atr-input"
                        aria-describedby="kq-atr-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={kqAtr}
                        onChange={(e) => setKqAtr(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Guardrails / Threshold Alert */}
                  <div className="calc-status-row">
                    <div className="calc-status-item">
                      {kqCalcResults.isLodValid ? (
                        <span className="badge badge-emerald">
                          ✓ LoD Risk Validated:{' '}
                          <strong>{kqCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong>{' '}
                          (≤60% Spring-Coil Threshold)
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          ⚠️ Risk Exceeds 60% ATR:{' '}
                          <strong>{kqCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong>{' '}
                          — Wait for tighter intraday consolidation or pass!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Metrics Grid */}
                  <div className="calc-metrics-grid">
                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Max Dollar Risk</span>
                      <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                        ${kqCalcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">{kqRiskPct}% of account equity</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">LoD Stop Distance</span>
                      <span className="calc-metric-value text-warning">
                        ${kqCalcResults.stopDistance.toFixed(2)}
                      </span>
                      <span className="calc-metric-sub">
                        {kqCalcResults.stopPct.toFixed(2)}% below entry ({kqCalcResults.lodDistancePctAtr.toFixed(1)}% ATR)
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Shares to Buy</span>
                      <span className="calc-metric-value text-emerald">
                        {kqCalcResults.totalShares.toLocaleString()}
                      </span>
                      <span className="calc-metric-sub">
                        Strict 1R risk sizing
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Position Value</span>
                      <span className="calc-metric-value text-primary">
                        ${kqCalcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">
                        {kqCalcResults.positionPctOfEquity.toFixed(1)}% of equity
                      </span>
                    </div>
                  </div>

                  {/* Qullamaggie 3-Step Profit Scaling & Trailing Plan */}
                  <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                    👑 Qullamaggie 3-Step Profit Scaling &amp; 10/20 EMA Trailing Plan
                  </h3>
                  <div className="pyramid-orders-grid">
                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-emerald">STEP 1: 3–5 DAY TRIM</span>
                        <span className="order-trigger-badge">+3R to +5R Gain</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#34d399' }}>
                          ${kqCalcResults.target3R.toFixed(2)} – ${kqCalcResults.target5R.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Sell: <strong>{kqCalcResults.trimSharesThird.toLocaleString()} shs (1/3)</strong> or <strong>{kqCalcResults.trimSharesHalf.toLocaleString()} shs (1/2)</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Lock in profit into momentum strength
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-warning">STEP 2: BREAKEVEN STOP</span>
                        <span className="order-trigger-badge">Risk = Exactly $0</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#f59e0b' }}>
                          ${kqEntryPrice > 0 ? parseFloat(kqEntryPrice).toFixed(2) : '0.00'}
                        </div>
                        <div className="order-price">
                          Stop Level: <strong>Original Entry Price</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Trade is now 100% risk-free
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-outline">STEP 3: 10/20 EMA TRAIL</span>
                        <span className="order-trigger-badge">Core Runner</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#38bdf8' }}>
                          {kqCalcResults.runnerShares.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Exit Rule: <strong>First Daily CLOSE Below 10/20 EMA</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Never exit intraday; wait for 4:00 PM close!
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* MARTIN LUK INTERACTIVE CHECKLIST (ml_checklist)           */}
              {/* ========================================================= */}
              {activeChapter.id === 'ml_checklist' && (
                <div className="learn-interactive-checklist-pane">
                  <div className="checklist-score-banner">
                    <div className="score-summary">
                      <span className="score-title">Martin Luk Execution Compliance Score</span>
                      <div className="score-number">
                        {mlChecklistScore.pct}%{' '}
                        <span className="score-sub">({mlChecklistScore.completed}/{mlChecklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {mlChecklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ Asymmetric Edge Validated — Ready to Fire
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Stop Compression Criteria Incomplete
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="checklist-items-grid">
                    <label className={`checklist-item ${mlChecklistItems.adrThreshold ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.adrThreshold}
                        onChange={() => toggleMlChecklist('adrThreshold')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          1. High ADR% Volatility Floor (ADR% ≥ 4.5%–5.0%+)
                        </span>
                        <span className="checklist-item-desc">
                          Inherent price range is mandatory. Stocks with low ADR cannot generate exponential R-multiples.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.themeClustering ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.themeClustering}
                        onChange={() => toggleMlChecklist('themeClustering')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          2. Sector &amp; Theme Clustering (3+ Industry Peers)
                        </span>
                        <span className="checklist-item-desc">
                          Institutional money flow is sector-wide. Never trade an isolated stock; demand theme confirmation.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.trendAlignment ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.trendAlignment}
                        onChange={() => toggleMlChecklist('trendAlignment')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          3. Fast Trend Alignment (Price &gt; 9 EMA &gt; 21 EMA &gt; 50 SMA)
                        </span>
                        <span className="checklist-item-desc">
                          Both the 9 and 21 EMAs must be sloping upward with price above institutional support.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.avwapSupport ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.avwapSupport}
                        onChange={() => toggleMlChecklist('avwapSupport')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          4. 9/21 EMA &amp; Anchored VWAP (AVWAP) Confluence Retest
                        </span>
                        <span className="checklist-item-desc">
                          Pullback gently tests the rising 9/21 EMA and the Breakout/Earnings Anchored VWAP shelf.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.volumeContraction ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.volumeContraction}
                        onChange={() => toggleMlChecklist('volumeContraction')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          5. Volume Dry-Up (VDU) on the Pullback
                        </span>
                        <span className="checklist-item-desc">
                          Pullback volume is noticeably lower than breakout up days. Sellers are exhausting available float.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.triggerExecution ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.triggerExecution}
                        onChange={() => toggleMlChecklist('triggerExecution')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          6. 5m ORH Breakout or Intraday AVWAP Reclaim
                        </span>
                        <span className="checklist-item-desc">
                          Entering on quantifiable strength confirmation, never blindly guessing or front-running support.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.halfAdrLimit ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.halfAdrLimit}
                        onChange={() => toggleMlChecklist('halfAdrLimit')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          7. Stop-Loss Compression (Stop ≤ 50% ADR / ≤ 1.5%–2.5%)
                        </span>
                        <span className="checklist-item-desc">
                          Stop loss is tightly tucked below local swing low or AVWAP shelf. Absolute distance must not exceed 1/2 ADR.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.riskCappedEquity ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.riskCappedEquity}
                        onChange={() => toggleMlChecklist('riskCappedEquity')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          8. Strict Account Equity Risk (0.5% – 1.0% Max)
                        </span>
                        <span className="checklist-item-desc">
                          Position size is derived directly from the compressed stop distance. Max 4 to 6 active positions.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.partialTrimPlan ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.partialTrimPlan}
                        onChange={() => toggleMlChecklist('partialTrimPlan')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          9. Tactical +3R to +5R Trim (25%–35%) &amp; Breakeven Stop
                        </span>
                        <span className="checklist-item-desc">
                          Lock in profit on the initial push to finance risk; move stop on remainder to exact entry price.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${mlChecklistItems.trail21Ema ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={mlChecklistItems.trail21Ema}
                        onChange={() => toggleMlChecklist('trail21Ema')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          10. 21 EMA Daily Close Trailing Discipline
                        </span>
                        <span className="checklist-item-desc">
                          Let core runners surf the multi-week institutional wave. Exit ONLY on a daily close below 21 EMA!
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* MARTIN LUK CALCULATOR (ml_calculator)                     */}
              {/* ========================================================= */}
              {activeChapter.id === 'ml_calculator' && (
                <div className="learn-calculator-pane">
                  <div className="calc-inputs-grid">
                    <div className="calc-input-group">
                      <label htmlFor="ml-equity-input">Total Account Equity ($)</label>
                      <input
                        id="ml-equity-input"
                        type="number"
                        className="calc-input"
                        value={mlEquity}
                        onChange={(e) => setMlEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="ml-risk-input">Equity Risk Per Trade (%)</label>
                      <span id="ml-risk-hint" className="calc-hint">Martin Luk Rule: 0.50% – 1.00%</span>
                      <input
                        id="ml-risk-input"
                        aria-describedby="ml-risk-hint"
                        type="number"
                        step="0.05"
                        className="calc-input"
                        value={mlRiskPct}
                        onChange={(e) => setMlRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="ml-entry-input">Entry / Reversal Price ($)</label>
                      <input
                        id="ml-entry-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={mlEntryPrice}
                        onChange={(e) => setMlEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="ml-stop-input">Stop-Loss Price ($)</label>
                      <span id="ml-stop-hint" className="calc-hint">Tucked under local swing low / AVWAP</span>
                      <input
                        id="ml-stop-input"
                        aria-describedby="ml-stop-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={mlStopPrice}
                        onChange={(e) => setMlStopPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="ml-adr-input">Daily ADR ($)</label>
                      <span id="ml-adr-hint" className="calc-hint">20-Day Average Daily Range ($)</span>
                      <input
                        id="ml-adr-input"
                        aria-describedby="ml-adr-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={mlAdr}
                        onChange={(e) => setMlAdr(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Guardrails / Threshold Alert */}
                  <div className="calc-status-row">
                    <div className="calc-status-item">
                      {mlCalcResults.isStopCompressed ? (
                        <span className="badge badge-emerald">
                          ✓ Stop Compression Validated:{' '}
                          <strong>{mlCalcResults.stopDistancePctAdr.toFixed(1)}% of ADR</strong>{' '}
                          (≤50% Half-ADR Limit · Stop = {mlCalcResults.stopPct.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          ⚠️ Stop Too Wide (&gt;50% ADR):{' '}
                          <strong>{mlCalcResults.stopDistancePctAdr.toFixed(1)}% of ADR</strong>{' '}
                          — Compress entry near AVWAP/9 EMA or pass!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Metrics Grid */}
                  <div className="calc-metrics-grid">
                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Max Dollar Risk</span>
                      <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                        ${mlCalcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">{mlRiskPct}% of account equity</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Compressed Stop Distance</span>
                      <span className="calc-metric-value text-warning">
                        ${mlCalcResults.stopDistance.toFixed(2)}
                      </span>
                      <span className="calc-metric-sub">
                        -{mlCalcResults.stopPct.toFixed(2)}% ({mlCalcResults.stopDistancePctAdr.toFixed(1)}% ADR)
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Shares to Buy</span>
                      <span className="calc-metric-value text-emerald">
                        {mlCalcResults.totalShares.toLocaleString()}
                      </span>
                      <span className="calc-metric-sub">
                        Strict 1R risk sizing
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Position Value</span>
                      <span className="calc-metric-value text-primary">
                        ${mlCalcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">
                        {mlCalcResults.positionPctOfEquity.toFixed(1)}% of equity
                      </span>
                    </div>
                  </div>

                  {/* Exponential R-Multiple Comparative Banner */}
                  <div className="learn-callout-box" style={{ marginTop: '20px', borderLeftColor: '#38bdf8' }}>
                    <div className="learn-callout-icon">🚀</div>
                    <div>
                      <strong>The Math of Stop Compression (On a +25% Move to ${mlCalcResults.target25Pct.toFixed(2)}):</strong>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <span>Compressed Stop ({mlCalcResults.stopPct.toFixed(1)}%): <strong style={{ color: '#34d399', fontSize: '15px' }}>+{mlCalcResults.rMultiple25Pct.toFixed(1)}R</strong></span>
                        <span>Conventional Stop (5.0%): <strong style={{ color: '#94a3b8', fontSize: '15px' }}>+{mlCalcResults.conventionalR25Pct.toFixed(1)}R</strong></span>
                        <span className="badge badge-emerald">Yields {mlCalcResults.rMultiplierBoost.toFixed(1)}x Higher R-Payoff!</span>
                      </div>
                    </div>
                  </div>

                  {/* Martin Luk 3-Step Scaling & 21 EMA Trailing Plan */}
                  <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                    🏆 Martin Luk 3-Step Scaling &amp; 21 EMA Trailing Plan
                  </h3>
                  <div className="pyramid-orders-grid">
                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-emerald">STEP 1: TACTICAL TRIM (30%)</span>
                        <span className="order-trigger-badge">+3R to +5R Gain</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#34d399' }}>
                          ${mlCalcResults.target3R.toFixed(2)} – ${mlCalcResults.target5R.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Sell: <strong>{mlCalcResults.trimShares30.toLocaleString()} shs (30%)</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Realize profit cushion &amp; eliminate anxiety
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-warning">STEP 2: BREAKEVEN STOP</span>
                        <span className="order-trigger-badge">Risk = Exactly $0</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#f59e0b' }}>
                          ${mlEntryPrice > 0 ? parseFloat(mlEntryPrice).toFixed(2) : '0.00'}
                        </div>
                        <div className="order-price">
                          Stop Level: <strong>Original Entry Price</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Free trade — downside risk eliminated
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-outline">STEP 3: 21 EMA RUNNER</span>
                        <span className="order-trigger-badge">Core Runner (70%)</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#38bdf8' }}>
                          {mlCalcResults.runnerShares70.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Exit Rule: <strong>First Daily CLOSE Below 21 EMA</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Hold for multi-week trend; respect AVWAP support
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* UNIVERSAL MASTER CHECKLIST (comp_checklist)               */}
              {/* ========================================================= */}
              {activeChapter.id === 'comp_checklist' && (
                <div className="learn-interactive-checklist-pane">
                  <div className="checklist-score-banner">
                    <div className="score-summary">
                      <span className="score-title">Super Trader Universal Compliance Score</span>
                      <div className="score-number">
                        {compChecklistScore.pct}%{' '}
                        <span className="score-sub">({compChecklistScore.completed}/{compChecklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {compChecklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ Universal DNA Validated — High Expectancy
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Universal Rules Incomplete — Do Not Force Trade
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="checklist-items-grid">
                    <label className={`checklist-item ${compChecklistItems.regimeUptrend ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.regimeUptrend}
                        onChange={() => toggleCompChecklist('regimeUptrend')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          1. Market Regime Confirmed (QQQ &amp; SPY &gt; 10 &amp; 20 EMA)
                        </span>
                        <span className="checklist-item-desc">
                          All 5 traders agree: never fight heavy general market distribution. Green light environment is mandatory.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.alphaLeader ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.alphaLeader}
                        onChange={() => toggleCompChecklist('alphaLeader')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          2. Elite Relative Strength Leader (Top 1%–2% 1M/3M/6M)
                        </span>
                        <span className="checklist-item-desc">
                          Candidate is an authentic market leader in a winning industry theme cluster, not a lagging value stock.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.highAdrVolatility ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.highAdrVolatility}
                        onChange={() => toggleCompChecklist('highAdrVolatility')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          3. Inherent Daily Volatility (ADR% ≥ 4.5% – 5.0%+)
                        </span>
                        <span className="checklist-item-desc">
                          Without high daily range, explosive multi-R swings are mathematically impossible. Turnover ≥ $10M+.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.cleanBaseVdu ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.cleanBaseVdu}
                        onChange={() => toggleCompChecklist('cleanBaseVdu')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          4. Base Tightening &amp; Dramatic Volume Dry-Up (VDU)
                        </span>
                        <span className="checklist-item-desc">
                          Price compresses near resistance while volume drops to a whisper, indicating available supply is absorbed.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.structuralStopDefined ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.structuralStopDefined}
                        onChange={() => toggleCompChecklist('structuralStopDefined')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          5. Hard Structural Stop Mapped Before Order Entry
                        </span>
                        <span className="checklist-item-desc">
                          Stop loss is tied to verifiable price structure: Low of Day (LoD), Anchored VWAP, or tight sub-pivot. Zero mental stops.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.stopCompressionChecked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.stopCompressionChecked}
                        onChange={() => toggleCompChecklist('stopCompressionChecked')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          6. Stop Compression Guardrail (≤60% ATR or ≤50% ADR)
                        </span>
                        <span className="checklist-item-desc">
                          The stop distance must not exceed 60% ATR / 50% ADR. If the required stop is too wide, pass immediately.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.strictRiskCapped ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.strictRiskCapped}
                        onChange={() => toggleCompChecklist('strictRiskCapped')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          7. Strict Account Equity Risk (0.25% – 1.0% Max)
                        </span>
                        <span className="checklist-item-desc">
                          Exact share sizing computed from stop distance. Portfolio concentrated in 3 to 6 top leaders (no diworsification).
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.partialTrimPlan ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.partialTrimPlan}
                        onChange={() => toggleCompChecklist('partialTrimPlan')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          8. Systematic Partial Trim (+3R to +5R / Day 3–5)
                        </span>
                        <span className="checklist-item-desc">
                          Commitment to sell 20%–35% into the initial expansion to lock in profit cushion and pay for overhead risk.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.breakevenAdjustment ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.breakevenAdjustment}
                        onChange={() => toggleCompChecklist('breakevenAdjustment')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          9. Breakeven Stop Adjustment ($0 Downside Risk)
                        </span>
                        <span className="checklist-item-desc">
                          Immediately raise stop on remaining 65%–80% position to original entry price. Downside is now completely eliminated.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${compChecklistItems.dailyCloseTrailing ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={compChecklistItems.dailyCloseTrailing}
                        onChange={() => toggleCompChecklist('dailyCloseTrailing')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          10. 10/20 EMA Trailing Discipline Based on Daily Close
                        </span>
                        <span className="checklist-item-desc">
                          Hold remaining runner until the first daily close below 10 or 20/21 EMA. Never exit on emotional midday wicks!
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* MASTER STOP COMPRESSION & R SIMULATOR (comp_calculator)   */}
              {/* ========================================================= */}
              {activeChapter.id === 'comp_calculator' && (
                <div className="learn-calculator-pane">
                  <div className="calc-inputs-grid">
                    <div className="calc-input-group">
                      <label htmlFor="comp-equity-input">Total Portfolio Equity ($)</label>
                      <input
                        id="comp-equity-input"
                        type="number"
                        className="calc-input"
                        value={compEquity}
                        onChange={(e) => setCompEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="comp-risk-input">Equity Risk Per Trade (%)</label>
                      <span id="comp-risk-hint" className="calc-hint">Super Trader Standard: 0.50% – 1.00%</span>
                      <input
                        id="comp-risk-input"
                        aria-describedby="comp-risk-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={compRiskPct}
                        onChange={(e) => setCompRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="comp-entry-input">Stock Entry Price ($)</label>
                      <input
                        id="comp-entry-input"
                        type="number"
                        step="1.0"
                        className="calc-input"
                        value={compEntryPrice}
                        onChange={(e) => setCompEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="comp-gain-input">Expected Stock Gain (%)</label>
                      <span id="comp-gain-hint" className="calc-hint">Target swing runup</span>
                      <input
                        id="comp-gain-input"
                        aria-describedby="comp-gain-hint"
                        type="number"
                        step="5.0"
                        className="calc-input"
                        value={compExpectedGainPct}
                        onChange={(e) => setCompExpectedGainPct(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Stop Level Sliders / Inputs */}
                  <div className="calc-inputs-grid" style={{ marginTop: '16px' }}>
                    <div className="calc-input-group">
                      <label htmlFor="comp-cstop-input">Compressed Stop % (Luk / QM)</label>
                      <input
                        id="comp-cstop-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={compCompressedStopPct}
                        onChange={(e) => setCompCompressedStopPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="comp-sstop-input">Standard Pivot Stop % (Kova / JS)</label>
                      <input
                        id="comp-sstop-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={compStandardStopPct}
                        onChange={(e) => setCompStandardStopPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="comp-wstop-input">Conventional Wide Stop % (Retail)</label>
                      <input
                        id="comp-wstop-input"
                        type="number"
                        step="0.5"
                        className="calc-input"
                        value={compWideStopPct}
                        onChange={(e) => setCompWideStopPct(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Target Price Header */}
                  <div className="calc-status-row" style={{ marginTop: '20px' }}>
                    <div className="calc-status-item">
                      <span className="badge badge-emerald">
                        Target Price on +{compExpectedGainPct}% Move: <strong>${compCalcResults.targetPrice.toFixed(2)}</strong> (+${compCalcResults.gainPerShare.toFixed(2)}/share) · Fixed Dollar Risk: <strong>${compCalcResults.riskDollars.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 3-Tier Multi-System Comparison Cards */}
                  <div className="pyramid-orders-grid" style={{ marginTop: '20px' }}>
                    {/* Tier 1: Compressed Stop */}
                    <div className="pyramid-order-card" style={{ borderLeft: '4px solid #10b981' }}>
                      <div className="order-header">
                        <span className="badge badge-emerald">COMPRESSED STOP ({compCompressedStopPct}%)</span>
                        <span className="order-trigger-badge" style={{ color: '#34d399', fontWeight: 700 }}>
                          +{compCalcResults.cRMultiple.toFixed(1)} R
                        </span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#34d399', fontSize: '20px' }}>
                          +${compCalcResults.cTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="order-price">
                          Shares: <strong>{compCalcResults.cShares.toLocaleString()} shs</strong> (${compCalcResults.cStopPrice.toFixed(2)} stop)
                        </div>
                        <div className="order-price" style={{ marginTop: '4px', color: '#94a3b8' }}>
                          Portfolio Return: <strong>+{compCalcResults.cPortfolioGainPct.toFixed(1)}%</strong>
                        </div>
                      </div>
                      <div className="order-footer" style={{ color: '#34d399' }}>
                        Style: Martin Luk &amp; Qullamaggie LoD Precision
                      </div>
                    </div>

                    {/* Tier 2: Standard Pivot Stop */}
                    <div className="pyramid-order-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="order-header">
                        <span className="badge badge-warning">STANDARD PIVOT ({compStandardStopPct}%)</span>
                        <span className="order-trigger-badge" style={{ color: '#f59e0b', fontWeight: 700 }}>
                          +{compCalcResults.sRMultiple.toFixed(1)} R
                        </span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#f59e0b', fontSize: '20px' }}>
                          +${compCalcResults.sTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="order-price">
                          Shares: <strong>{compCalcResults.sShares.toLocaleString()} shs</strong> (${compCalcResults.sStopPrice.toFixed(2)} stop)
                        </div>
                        <div className="order-price" style={{ marginTop: '4px', color: '#94a3b8' }}>
                          Portfolio Return: <strong>+{compCalcResults.sPortfolioGainPct.toFixed(1)}%</strong>
                        </div>
                      </div>
                      <div className="order-footer" style={{ color: '#f59e0b' }}>
                        Style: KovaView &amp; Jeff Sun ATR Guardrails
                      </div>
                    </div>

                    {/* Tier 3: Conventional Wide Stop */}
                    <div className="pyramid-order-card" style={{ borderLeft: '4px solid #64748b' }}>
                      <div className="order-header">
                        <span className="badge badge-outline">CONVENTIONAL WIDE ({compWideStopPct}%)</span>
                        <span className="order-trigger-badge" style={{ color: '#94a3b8', fontWeight: 700 }}>
                          +{compCalcResults.wRMultiple.toFixed(1)} R
                        </span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#94a3b8', fontSize: '20px' }}>
                          +${compCalcResults.wTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="order-price">
                          Shares: <strong>{compCalcResults.wShares.toLocaleString()} shs</strong> (${compCalcResults.wStopPrice.toFixed(2)} stop)
                        </div>
                        <div className="order-price" style={{ marginTop: '4px', color: '#94a3b8' }}>
                          Portfolio Return: <strong>+{compCalcResults.wPortfolioGainPct.toFixed(1)}%</strong>
                        </div>
                      </div>
                      <div className="order-footer" style={{ color: '#94a3b8' }}>
                        Style: Retail Swing Trader Average
                      </div>
                    </div>
                  </div>

                  {/* Summary Comparison Callout */}
                  <div className="learn-callout-box" style={{ marginTop: '24px', borderLeftColor: '#10b981' }}>
                    <div className="learn-callout-icon">💡</div>
                    <div>
                      <strong>The Stop Compression Verdict:</strong> For the exact same ${compCalcResults.riskDollars.toLocaleString()} dollar risk, executing with a {compCompressedStopPct}% compressed stop generates{' '}
                      <strong style={{ color: '#34d399' }}>{compCalcResults.outperformanceVsWide.toFixed(1)}x more profit</strong> than a conventional {compWideStopPct}% stop (and{' '}
                      <strong style={{ color: '#38bdf8' }}>{compCalcResults.outperformanceVsStandard.toFixed(1)}x more</strong> than a standard {compStandardStopPct}% pivot stop) on the identical +{compExpectedGainPct}% stock move!
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* KOVA INTERACTIVE CHECKLIST (Chapter 9)                    */}
              {/* ========================================================= */}
              {activeChapter.id === 'checklist' && (
                <div className="learn-interactive-checklist-pane">
                  <div className="checklist-score-banner">
                    <div className="score-summary">
                      <span className="score-title">KovaView Compliance Score</span>
                      <div className="score-number">
                        {checklistScore.pct}%{' '}
                        <span className="score-sub">({checklistScore.completed}/{checklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {checklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ Ready to Execute
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Incomplete Rules
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
                          1. Market Environment Filter (Confirmed Uptrend)
                        </span>
                        <span className="checklist-item-desc">
                          Major indices above 50-day EMA without cluster of distribution days.
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
                          2. Fundamentals Quality (EPS YoY ≥ 25%)
                        </span>
                        <span className="checklist-item-desc">
                          Sustained revenue growth (20%+) with no EPS deceleration.
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
                          3. RS Relative Strength (Rank ≥ 80, Ideally ≥ 90)
                        </span>
                        <span className="checklist-item-desc">
                          Top decile performer. Never trade low RS stocks.
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
                          4. Technical Trend Health (10 EMA &gt; 20 EMA &gt; 50 SMA)
                        </span>
                        <span className="checklist-item-desc">
                          Within 15–20% of 52-week high, &gt;70% above 52-week low.
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
                          5. Clean Base Pattern (VCP / Cup with Handle / Low Cheat)
                        </span>
                        <span className="checklist-item-desc">
                          Clear progressive volatility contractions with tightening daily candles.
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
                          6. Volume Dry-Up (VDU) Before Breakout
                        </span>
                        <span className="checklist-item-desc">
                          Volume significantly below 50-day average, signaling exhausted supply.
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
                          7. Hard Stop Defined (Distance ≤ 7–8%)
                        </span>
                        <span className="checklist-item-desc">
                          Stop anchored below pivot or entry low. If &gt;8%, sizing must be scaled down.
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
                          8. Single Position ≤ 25% of Portfolio
                        </span>
                        <span className="checklist-item-desc">
                          Strict capital cap regardless of subjective confidence.
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
                          9. Total Concurrent Positions ≤ 5
                        </span>
                        <span className="checklist-item-desc">
                          Concentration allows close management of exits and risk.
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
                          10. Pre-Trade Journal Plan Recorded
                        </span>
                        <span className="checklist-item-desc">
                          Document reason, trigger, and stop before pulling the trigger.
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
                      <label htmlFor="kova-equity-input">Total Account Equity ($)</label>
                      <input
                        id="kova-equity-input"
                        type="number"
                        className="calc-input"
                        value={calcEquity}
                        onChange={(e) => setCalcEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kova-risk-input">Risk Per Trade (%)</label>
                      <span id="kova-risk-hint" className="calc-hint">Recommended: 0.5% – 1.0%</span>
                      <input
                        id="kova-risk-input"
                        aria-describedby="kova-risk-hint"
                        type="number"
                        step="0.05"
                        className="calc-input"
                        value={calcRiskPct}
                        onChange={(e) => setCalcRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kova-entry-input">Entry / Pivot Price ($)</label>
                      <input
                        id="kova-entry-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={calcEntryPrice}
                        onChange={(e) => setCalcEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="kova-stop-input">Stop-Loss Price ($)</label>
                      <span id="kova-stop-hint" className="calc-hint">Below pivot or entry low</span>
                      <input
                        id="kova-stop-input"
                        aria-describedby="kova-stop-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={calcStopPrice}
                        onChange={(e) => setCalcStopPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Risk Warning Banners */}
                  {calcResults.isStopTooWide && (
                    <div className="calc-alert-banner alert-danger">
                      ⚠️ Stop distance is {calcResults.stopPct.toFixed(1)}%, exceeding the hard 7–8% ceiling! Tighten stop or skip setup.
                    </div>
                  )}

                  {calcResults.isPositionTooLarge && (
                    <div className="calc-alert-banner alert-warning">
                      ⚠️ Position size is {calcResults.positionPctOfEquity.toFixed(1)}% of account, exceeding the 25% single-stock cap!
                    </div>
                  )}

                  {/* Calculated Metrics Grid */}
                  <div className="calc-metrics-grid">
                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Dollar Risk</span>
                      <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                        ${calcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">{calcRiskPct}% of equity</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Stop-Loss Distance</span>
                      <span className={`calc-metric-value ${calcResults.isStopTooWide ? 'text-danger' : 'text-emerald'}`}>
                        {calcResults.stopPct.toFixed(2)}%
                      </span>
                      <span className="calc-metric-sub">-${calcResults.stopDistance.toFixed(2)} / share</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Shares to Buy</span>
                      <span className="calc-metric-value text-emerald">
                        {calcResults.totalShares.toLocaleString()}
                      </span>
                      <span className="calc-metric-sub">Max shares allowed</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Position Value</span>
                      <span className={`calc-metric-value ${calcResults.isPositionTooLarge ? 'text-warning' : 'text-primary'}`}>
                        ${calcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">
                        {calcResults.positionPctOfEquity.toFixed(1)}% of equity
                      </span>
                    </div>
                  </div>

                  {/* 50 / 30 / 20 Pyramid Scaling Plan */}
                  <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                    🔺 Recommended 50% / 30% / 20% Pyramid Scaling Orders
                  </h3>
                  <div className="pyramid-orders-grid">
                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-emerald">TRANCHE 1 (50%)</span>
                        <span className="order-trigger-badge">At Breakout</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares">
                          {calcResults.tranche1Shares.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Price: <strong>${parseFloat(calcEntryPrice).toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Cost: ${(calcResults.tranche1Shares * parseFloat(calcEntryPrice)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-warning">TRANCHE 2 (30%)</span>
                        <span className="order-trigger-badge">After +2.5%</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares">
                          {calcResults.tranche2Shares.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Price: <strong>${calcResults.addPrice1.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Cost: ${(calcResults.tranche2Shares * calcResults.addPrice1).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-outline">TRANCHE 3 (20%)</span>
                        <span className="order-trigger-badge">After +5.0%</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares">
                          {calcResults.tranche3Shares.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Price: <strong>${calcResults.addPrice2.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Cost: ${(calcResults.tranche3Shares * calcResults.addPrice2).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                      <span className="score-title">Jeff Sun Execution Compliance Score</span>
                      <div className="score-number">
                        {jsChecklistScore.pct}%{' '}
                        <span className="score-sub">({jsChecklistScore.completed}/{jsChecklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {jsChecklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ A-Rated Execution Validated
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Filters Incomplete - Stand Down
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
                          1. Focus List Upgraded Candidate
                        </span>
                        <span className="checklist-item-desc">
                          Stock was prepared post-market with defined pivot alerts; not an impulsive intraday pick.
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
                          2. LoD Distance ≤ 60% of Daily ATR (Spring Coil Rule)
                        </span>
                        <span className="checklist-item-desc">
                          Distance from Low of Day to entry is tight, ensuring high R-multiple potential and tight risk.
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
                          3. 50-MA ATR Distance ≤ 4x Multiples (Launchpad Filter)
                        </span>
                        <span className="checklist-item-desc">
                          Entry point is near base consolidation. Avoid chasing extended names &gt;4x from 50-MA.
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
                          4. Projected RVOL ≥ 1.5x at Breakout / M30 Re-ORH
                        </span>
                        <span className="checklist-item-desc">
                          Volume expansion confirms smart money commitment. Never buy low-volume breakouts.
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
                          5. Non-Biotech Gap Risk Elimination
                        </span>
                        <span className="checklist-item-desc">
                          No individual speculative trial biotechs. Trade biotech strictly through liquid ETFs (LABD/LABU).
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
                          6. High ADR% (≥ 4.0%) &amp; Average Dollar Volume ≥ $100M
                        </span>
                        <span className="checklist-item-desc">
                          Asset possesses strong volatility edge and institutional liquidity with minimal spread friction.
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
                          7. Portfolio Equity Risk Capped at 0.25% - 0.50%
                        </span>
                        <span className="checklist-item-desc">
                          Account loss strictly limited. Position sizing derived mathematically from LoD stop distance.
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
                          8. +2.5R - +3.0R Partial Trim &amp; 10 EMA Trailing Plan Set
                        </span>
                        <span className="checklist-item-desc">
                          Take 1/3-1/2 off into first R-expansion, raise stop to breakeven, and trail remainder on 10 EMA.
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
                      <label htmlFor="js-equity-input">Total Account Equity ($)</label>
                      <input
                        id="js-equity-input"
                        type="number"
                        className="calc-input"
                        value={jsEquity}
                        onChange={(e) => setJsEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="js-risk-input">Equity Risk Per Trade (%)</label>
                      <span id="js-risk-hint" className="calc-hint">Jeff Sun Rule: 0.25% – 0.50%</span>
                      <input
                        id="js-risk-input"
                        aria-describedby="js-risk-hint"
                        type="number"
                        step="0.05"
                        className="calc-input"
                        value={jsRiskPct}
                        onChange={(e) => setJsRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="js-entry-input">Entry / Breakout Price ($)</label>
                      <input
                        id="js-entry-input"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={jsEntryPrice}
                        onChange={(e) => setJsEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="js-lod-input">Low of Day (LoD) Stop ($)</label>
                      <span id="js-lod-hint" className="calc-hint">Intraday Low before entry</span>
                      <input
                        id="js-lod-input"
                        aria-describedby="js-lod-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={jsLodPrice}
                        onChange={(e) => setJsLodPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="js-atr-input">Daily ATR ($)</label>
                      <span id="js-atr-hint" className="calc-hint">14-Day Average True Range</span>
                      <input
                        id="js-atr-input"
                        aria-describedby="js-atr-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={jsAtr}
                        onChange={(e) => setJsAtr(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="js-sma50-input">50-Day Moving Average ($)</label>
                      <span id="js-sma50-hint" className="calc-hint">Launchpad reference</span>
                      <input
                        id="js-sma50-input"
                        aria-describedby="js-sma50-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={jsSma50Price}
                        onChange={(e) => setJsSma50Price(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Validation Banners */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', margin: '20px 0' }}>
                    <div className={`calc-alert-banner ${jsCalcResults.isLodValid ? 'alert-success' : 'alert-danger'}`}>
                      {jsCalcResults.isLodValid ? (
                        <span>✓ LoD Distance Valid: <strong>{jsCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong> (≤ 60% rule PASS)</span>
                      ) : (
                        <span>⚠️ LoD Distance Overextended: <strong>{jsCalcResults.lodDistancePctAtr.toFixed(1)}% of ATR</strong> (&gt; 60% REJECT! Do not chase)</span>
                      )}
                    </div>

                    <div className={`calc-alert-banner ${jsCalcResults.isLaunchpad ? 'alert-success' : 'alert-warning'}`}>
                      {jsCalcResults.isLaunchpad ? (
                        <span>✓ 50-MA Launchpad Valid: <strong>{jsCalcResults.sma50AtrMultiple.toFixed(2)}x ATR</strong> (≤ 4x rule PASS)</span>
                      ) : (
                        <span>⚠️ 50-MA Extended: <strong>{jsCalcResults.sma50AtrMultiple.toFixed(2)}x ATR</strong> (&gt; 4x extended, mean reversion risk)</span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Metrics Grid */}
                  <div className="calc-metrics-grid">
                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Max Total Dollar Risk</span>
                      <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                        ${jsCalcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">{jsRiskPct}% of total equity</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">LoD Stop Distance</span>
                      <span className={`calc-metric-value ${jsCalcResults.isLodValid ? 'text-emerald' : 'text-danger'}`}>
                        {jsCalcResults.stopPct.toFixed(2)}%
                      </span>
                      <span className="calc-metric-sub">-${jsCalcResults.stopDistance.toFixed(2)} ({jsCalcResults.lodDistancePctAtr.toFixed(1)}% ATR)</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Position Shares to Buy</span>
                      <span className="calc-metric-value text-emerald">
                        {jsCalcResults.totalShares.toLocaleString()}
                      </span>
                      <span className="calc-metric-sub">Shares to cap risk</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Position Capital</span>
                      <span className="calc-metric-value text-primary">
                        ${jsCalcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">
                        {jsCalcResults.positionPctOfEquity.toFixed(1)}% of equity
                      </span>
                    </div>
                  </div>

                  {/* Profit Taking Targets */}
                  <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                    🎯 Jeff Sun Systematic Profit-Taking Targets
                  </h3>
                  <div className="pyramid-orders-grid">
                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-emerald">+2.5R FIRST TARGET</span>
                        <span className="order-trigger-badge">Scale 1/3, Stop to BE</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#34d399' }}>
                          ${jsCalcResults.target25R.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Gain: <strong>+${(2.5 * jsCalcResults.stopDistance).toFixed(2)}</strong> (+{(2.5 * jsCalcResults.stopPct).toFixed(1)}%)
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Lock risk-free cushion
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-warning">+3.0R RUNNER TARGET</span>
                        <span className="order-trigger-badge">Scale 1/3 into Strength</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#f59e0b' }}>
                          ${jsCalcResults.target3R.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Gain: <strong>+${(3.0 * jsCalcResults.stopDistance).toFixed(2)}</strong> (+{(3.0 * jsCalcResults.stopPct).toFixed(1)}%)
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Trail remainder on 10 EMA
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-outline">7x ATR 50-MA EXTENSION</span>
                        <span className="order-trigger-badge">Statistical Reversion</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#38bdf8' }}>
                          ${jsCalcResults.target7Atr.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Extension: <strong>7.0x ATR from 50-MA</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Scale out climax push
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* DAN ZANGER INTERACTIVE CHECKLIST (dz_checklist)           */}
              {/* ========================================================= */}
              {activeChapter.id === 'dz_checklist' && (
                <div className="learn-interactive-checklist-pane">
                  <div className="checklist-score-banner">
                    <div className="score-summary">
                      <span className="score-title">Dan Zanger Breakout Compliance Score</span>
                      <div className="score-number">
                        {dzChecklistScore.pct}%{' '}
                        <span className="score-sub">({dzChecklistScore.completed}/{dzChecklistScore.total} checks)</span>
                      </div>
                    </div>
                    <div className="score-status">
                      {dzChecklistScore.pct === 100 ? (
                        <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ✓ A+ Zanger Breakout Validated
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                          ⚠ Golden Rules Incomplete - Stand Down
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="checklist-items-grid">
                    <label className={`checklist-item ${dzChecklistItems.marketAndGroup ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.marketAndGroup}
                        onChange={() => toggleDzChecklist('marketAndGroup')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          1. Confirmed Market Wave &amp; Top Industry Group Pack (Rule #7)
                        </span>
                        <span className="checklist-item-desc">
                          4–10 peers in the same leading group are breaking out together; not a lone wolf in chop.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.explosiveGrowth ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.explosiveGrowth}
                        onChange={() => toggleDzChecklist('explosiveGrowth')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          2. Monster Earnings &amp; Revenue Fuel (QoQ/YoY ≥ 40%–200%+)
                        </span>
                        <span className="checklist-item-desc">
                          Accelerating revenue/EPS growth with dominant category-killer product catalyst.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.classicBaseNoWedge ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.classicBaseNoWedge}
                        onChange={() => toggleDzChecklist('classicBaseNoWedge')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          3. Clean Classic Base — Zero Upward Wedging (Rule #1)
                        </span>
                        <span className="checklist-item-desc">
                          Recognizable Cup &amp; Handle, Flat Base, High-Tight Flag, or Ascending Triangle.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.baseVolumeDryUp ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.baseVolumeDryUp}
                        onChange={() => toggleDzChecklist('baseVolumeDryUp')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          4. Pre-Breakout Volume Dry-Up (&lt; 60% of 20-Day Avg)
                        </span>
                        <span className="checklist-item-desc">
                          Final 3–7 days of handle/flag show toothpick volume bars confirming zero sellers left.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.friskyLiquidity ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.friskyLiquidity}
                        onChange={() => toggleDzChecklist('friskyLiquidity')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          5. Institutional Liquidity &amp; Friskiness ($20+, ≥ 1M Vol/Day)
                        </span>
                        <span className="checklist-item-desc">
                          Fast-moving wide-range leader where large size can enter and exit cleanly in seconds.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.withinFivePctPivot ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.withinFivePctPivot}
                        onChange={() => toggleDzChecklist('withinFivePctPivot')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          6. Entry Crossing Pivot &amp; Strictly ≤ +5% Above Trendline (Rule #3)
                        </span>
                        <span className="checklist-item-desc">
                          Not anticipating inside a dead base, and NEVER chasing &gt;5% past the breakout line.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.zvrVolumeSurge ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.zvrVolumeSurge}
                        onChange={() => toggleDzChecklist('zvrVolumeSurge')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          7. Intraday Zanger Volume Ratio Surge (ZVR ≥ 150%–200%+)
                        </span>
                        <span className="checklist-item-desc">
                          Time-sliced volume roaring well above 20-day average pace with strong upper-range bar.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.subPivotDollarStop ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.subPivotDollarStop}
                        onChange={() => toggleDzChecklist('subPivotDollarStop')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          8. Hard Sub-Pivot Stop Armed ($1 Below Pivot / ≤ 3–5% Max)
                        </span>
                        <span className="checklist-item-desc">
                          Committed to instant liquidation if price drops back under its breakout point (Rule #4).
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.noImminentEarnings ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.noImminentEarnings}
                        onChange={() => toggleDzChecklist('noImminentEarnings')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          9. Quarterly Earnings Date Verified Clear
                        </span>
                        <span className="checklist-item-desc">
                          No binary earnings announcement in the next few days that could trigger an overnight gap-down.
                        </span>
                      </div>
                    </label>

                    <label className={`checklist-item ${dzChecklistItems.scaleAndMarginDiscipline ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={dzChecklistItems.scaleAndMarginDiscipline}
                        onChange={() => toggleDzChecklist('scaleAndMarginDiscipline')}
                      />
                      <div className="checklist-item-content">
                        <span className="checklist-item-title">
                          10. +15–20% Scale-Out Order &amp; Zero Premature Margin (Rules #5 &amp; #10)
                        </span>
                        <span className="checklist-item-desc">
                          Ready to trim 20%–30% at +15%–20% gain; using cash only unless cushion has earned margin.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* DAN ZANGER INTERACTIVE CALCULATOR (dz_calculator)         */}
              {/* ========================================================= */}
              {activeChapter.id === 'dz_calculator' && (
                <div className="learn-calculator-pane">
                  <div className="calc-inputs-grid">
                    <div className="calc-input-group">
                      <label htmlFor="dz-equity-input">Total Account Equity ($)</label>
                      <span id="dz-equity-hint" className="calc-hint">
                        Cash equity (avoid premature margin)
                      </span>
                      <input
                        id="dz-equity-input"
                        aria-describedby="dz-equity-hint"
                        type="number"
                        className="calc-input"
                        value={dzEquity}
                        onChange={(e) => setDzEquity(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-risk-input">Max Equity Risk Per Trade (%)</label>
                      <span id="dz-risk-hint" className="calc-hint">
                        Recommended: 0.75% – 1.50%
                      </span>
                      <input
                        id="dz-risk-input"
                        aria-describedby="dz-risk-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={dzRiskPct}
                        onChange={(e) => setDzRiskPct(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-pivot-input">Breakout Pivot / Trendline ($)</label>
                      <span id="dz-pivot-hint" className="calc-hint">
                        Exact handle/flag resistance break
                      </span>
                      <input
                        id="dz-pivot-input"
                        aria-describedby="dz-pivot-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={dzPivotPrice}
                        onChange={(e) => setDzPivotPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-entry-input">Planned Buy Price ($)</label>
                      <span id="dz-entry-hint" className="calc-hint">
                        Max +5% Ceiling: ${dzCalcResults.maxBuyPrice.toFixed(2)}
                      </span>
                      <input
                        id="dz-entry-input"
                        aria-describedby="dz-entry-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={dzEntryPrice}
                        onChange={(e) => setDzEntryPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-stop-input">Sub-Pivot Hard Stop ($)</label>
                      <span id="dz-stop-hint" className="calc-hint">
                        Typically ~$1 below pivot (≤ 5% max)
                      </span>
                      <input
                        id="dz-stop-input"
                        aria-describedby="dz-stop-hint"
                        type="number"
                        step="0.1"
                        className="calc-input"
                        value={dzStopPrice}
                        onChange={(e) => setDzStopPrice(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-curvol-input">Current Intraday Volume (Shares)</label>
                      <span id="dz-curvol-hint" className="calc-hint">
                        Shares traded so far today
                      </span>
                      <input
                        id="dz-curvol-input"
                        aria-describedby="dz-curvol-hint"
                        type="number"
                        step="10000"
                        className="calc-input"
                        value={dzCurrentVol}
                        onChange={(e) => setDzCurrentVol(e.target.value)}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label htmlFor="dz-avgvol-input">20-Day Avg Volume at This Time</label>
                      <span id="dz-avgvol-hint" className="calc-hint">
                        Time-sliced 20D baseline for ZVR
                      </span>
                      <input
                        id="dz-avgvol-input"
                        aria-describedby="dz-avgvol-hint"
                        type="number"
                        step="10000"
                        className="calc-input"
                        value={dzAvgSliceVol}
                        onChange={(e) => setDzAvgSliceVol(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Zanger Rule Validation Banners */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', margin: '20px 0' }}>
                    <div
                      className={`calc-alert-banner ${
                        dzCalcResults.isWithinFivePct
                          ? 'alert-success'
                          : dzCalcResults.isAnticipating
                            ? 'alert-warning'
                            : 'alert-danger'
                      }`}
                    >
                      {dzCalcResults.isWithinFivePct ? (
                        <span>
                          ✓ Rule #3 Buy Zone Valid:{' '}
                          <strong>+{dzCalcResults.chasePct.toFixed(2)}%</strong>{' '}
                          (≤ 5% cap ${dzCalcResults.maxBuyPrice.toFixed(2)})
                        </span>
                      ) : dzCalcResults.isAnticipating ? (
                        <span>
                          ⚠️ Below Pivot (Anticipating):{' '}
                          <strong>{dzCalcResults.chasePct.toFixed(2)}%</strong>{' '}
                          — Wait for trendline break!
                        </span>
                      ) : (
                        <span>
                          🚫 Rule #3 Violated (&gt;5% Extended):{' '}
                          <strong>+{dzCalcResults.chasePct.toFixed(2)}%</strong>{' '}
                          — DO NOT CHASE!
                        </span>
                      )}
                    </div>

                    <div
                      className={`calc-alert-banner ${
                        dzCalcResults.isZvrExtreme
                          ? 'alert-success'
                          : dzCalcResults.isZvrValid
                            ? 'alert-warning'
                            : 'alert-danger'
                      }`}
                    >
                      {dzCalcResults.isZvrExtreme ? (
                        <span>
                          🔥 ZVR Pink Alert Surge:{' '}
                          <strong>{dzCalcResults.zvrPct.toFixed(0)}% ZVR</strong>{' '}
                          (≥ 200% Elephant Stampede!)
                        </span>
                      ) : dzCalcResults.isZvrValid ? (
                        <span>
                          ✓ ZVR Institutional Pace:{' '}
                          <strong>{dzCalcResults.zvrPct.toFixed(0)}% ZVR</strong>{' '}
                          (120–199% Valid Expansion)
                        </span>
                      ) : (
                        <span>
                          ⚠️ ZVR Volume Too Weak:{' '}
                          <strong>{dzCalcResults.zvrPct.toFixed(0)}% ZVR</strong>{' '}
                          (&lt; 120% High Fakeout Risk!)
                        </span>
                      )}
                    </div>

                    <div className={`calc-alert-banner ${dzCalcResults.isStopTight ? 'alert-success' : 'alert-danger'}`}>
                      {dzCalcResults.isStopTight ? (
                        <span>
                          ✓ Rule #4 Tight Stop Valid:{' '}
                          <strong>{dzCalcResults.stopPct.toFixed(2)}%</strong>{' '}
                          (${dzCalcResults.subPivotDollarGap.toFixed(2)} below pivot)
                        </span>
                      ) : (
                        <span>
                          ⚠️ Stop Invalid or &gt;5% Wide:{' '}
                          <strong>{dzCalcResults.stopPct.toFixed(2)}%</strong>{' '}
                          — Tighten near $1 below pivot!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Metrics Grid */}
                  <div className="calc-metrics-grid">
                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Max Dollar Risk</span>
                      <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                        ${dzCalcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">{dzRiskPct}% of account equity</span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Zanger Volume Ratio</span>
                      <span className={`calc-metric-value ${dzCalcResults.isZvrValid ? 'text-emerald' : 'text-danger'}`}>
                        {dzCalcResults.zvrPct.toFixed(0)}%
                      </span>
                      <span className="calc-metric-sub">
                        {dzCalcResults.isZvrExtreme ? 'Pink Alert (≥200%)' : 'vs. 20D Intraday Avg'}
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Shares to Buy</span>
                      <span className="calc-metric-value text-emerald">
                        {dzCalcResults.totalShares.toLocaleString()}
                      </span>
                      <span className="calc-metric-sub">
                        -${dzCalcResults.stopDistance.toFixed(2)} / share ({dzCalcResults.stopPct.toFixed(2)}%)
                      </span>
                    </div>

                    <div className="calc-metric-card">
                      <span className="calc-metric-label">Total Position Value</span>
                      <span className="calc-metric-value text-primary">
                        ${dzCalcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="calc-metric-sub">
                        {dzCalcResults.positionPctOfEquity.toFixed(1)}% of equity
                      </span>
                    </div>
                  </div>

                  {/* Dan Zanger Profit Scaling Plan */}
                  <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                    🚀 Dan Zanger Profit-Scaling &amp; Trendline Trail Plan
                  </h3>
                  <div className="pyramid-orders-grid">
                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-emerald">RULE #5 TRIM (25%)</span>
                        <span className="order-trigger-badge">+15% to +20% Pivot Gain</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#34d399' }}>
                          ${dzCalcResults.target15Pct.toFixed(2)} – ${dzCalcResults.target20Pct.toFixed(2)}
                        </div>
                        <div className="order-price">
                          Sell Shares: <strong>{dzCalcResults.trimShares25.toLocaleString()} shs (20–30%)</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Lock profit &amp; raise stop to Pivot BE
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-warning">CORE LEADER SURF (50%)</span>
                        <span className="order-trigger-badge">10-Day SMA Trail</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#f59e0b' }}>
                          {dzCalcResults.coreShares50.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Guardrail: <strong>Rising 10-Day SMA</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Hold strongest winners; exit before Earnings
                      </div>
                    </div>

                    <div className="pyramid-order-card">
                      <div className="order-header">
                        <span className="badge badge-outline">CLIMAX RUNNER (25%)</span>
                        <span className="order-trigger-badge">Parabolic / 21-EMA Snap</span>
                      </div>
                      <div className="order-main">
                        <div className="order-shares" style={{ color: '#38bdf8' }}>
                          {dzCalcResults.runnerShares25.toLocaleString()} <span className="shares-label">Shares</span>
                        </div>
                        <div className="order-price">
                          Exit Signal: <strong>Exhaustion Gap / Trendline Break</strong>
                        </div>
                      </div>
                      <div className="order-footer">
                        Action: Liquidate 100% into blow-off euphoria
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
                      if (onSelectSetup) onSelectSetup(activeChapter.pivotTraderLink.setup || 'gainers');
                      if (setActiveTab) setActiveTab(activeChapter.pivotTraderLink.tab);
                    }}
                  >
                    🚀 Launch Tool
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

      {/* Dan Zanger Chart Preview Lightbox */}
      {lightboxImage && (
        <div
          className="full-page-modal-backdrop learn-lightbox-backdrop"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="learn-lightbox-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.title || 'Chart Preview'}
          >
            <div className="learn-lightbox-header">
              <div className="learn-lightbox-title-box">
                <span className="badge badge-emerald">
                  {lightboxImage.ticker ? `Historic Trade · ${lightboxImage.ticker}` : 'Dan Zanger Chart Archive'}
                </span>
                <h3>{lightboxImage.title}</h3>
              </div>
              <button
                type="button"
                className="btn-icon learn-lightbox-close"
                aria-label="Close"
                onClick={() => setLightboxImage(null)}
              >
                ✕
              </button>
            </div>

            <div className="learn-lightbox-content">
              <div className={`learn-lightbox-img-frame ${lightboxImage.isSchematic ? 'schematic' : ''}`}>
                <img src={lightboxImage.src} alt={lightboxImage.title} />
              </div>
              {lightboxImage.caption && (
                <div className="learn-lightbox-caption-box">
                  <p>{lightboxImage.caption}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
