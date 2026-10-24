// Jeff Sun, CFTe Complete Trading System Data
// Source: The Complete Traders' Guide: My Process, Tools, Routine, Core Beliefs & FAQs

export const JEFF_SUN_CONTENT = {
  en: {
    hero: {
      badge: "JEFF SUN, CFTe · SYSTEMATIC SWING PLAYBOOK",
      title: "The Complete Trader's Guide: Process, Routine & Tools",
      subtitle: "16 Years of Pain, Stop Losses, & Multi-Asset Execution Playbook",
      author: "By Jeff Sun, CFTe (@jfsrev)",
      description: "Trading is not a short-term income generator; it is a long-term capital compounding business. A comprehensive framework from Finviz/TradingView screening to Focus List filtration, live RVOL breakout execution, the <60% ATR LoD risk rule, and statistical profit taking.",
      tags: ["High ADR% Momentum", "RVOL Breakout Filter", "<60% ATR LoD Entry", "50-MA ATR Extension", "VARS Relative Strength", "Systematic Scaling"]
    },
    chapters: [
      {
        id: "js_core_beliefs",
        number: "00",
        title: "Core Trading Beliefs: Capital Compounding vs. Income Generation",
        shortTitle: "0. Core Beliefs",
        icon: "🧭",
        summary: "16 years of market pain and grit: Why small refinements to routine, selective execution, and risk rules create exponential equity compounding.",
        rules: [
          {
            title: "Long-Term Compounding Mindset",
            badge: "P&L Philosophy",
            desc: "Trading is a long-term growth game; too many approach it as a short-term paycheck. Compounding 30-50% annually consistently outperforms erratic 200% years followed by devastating 50% drawdowns."
          },
          {
            title: "A-Rated Setup vs. C-Rated Execution",
            badge: "Execution Quality",
            desc: "An A-rated setup can result in C-rated performance if entry and stops are mismanaged. Conversely, an average setup executed with tight risk and high RVOL confirmation yields superior R-multiples."
          },
          {
            title: "Non-Negotiable Gap Risk Elimination",
            badge: "Risk Elimination",
            desc: "Exclude individual speculative biotech stocks from scans due to unpredictable overnight binary trial results. Gain biotech exposure strictly through liquid ETFs like LABD or LABU."
          },
          {
            title: "Respect the Factor of Time",
            badge: "X-Axis Patience",
            desc: "Don't get fixated solely on price movements; be patient with time. Charts have an X-axis and a Y-axis. The best moves expand immediately from tight bases without lingering."
          }
        ],
        body: `
### 15 Years of Market Insights
Over 16 years of trading across multi-asset classes, the difference between spinning your wheels and achieving multi-million compounding comes down to **eliminating unnecessary friction in your daily routine**.

> *"A few quick, simple refinements to your process can significantly shift your equity curve and enhance long-term compounding."*

#### The Three Immutable Pillars
1. **Never Trade on Feeling**: Every execution must be anchored to quantifiable indicators (RVOL, ADR%, ATR distance).
2. **Be Ruthlessly Selective**: Most breakouts fail during chop. Filtering out setups where entry is extended from the low of day or 50-day moving average preserves mental capital.
3. **Automate Awareness Through Alerts**: A daily routine must be sustainable and time-efficient. Staring at 50 flashing tickers in live market causes cognitive fatigue.
`
      },
      {
        id: "js_glossary",
        number: "01",
        title: "Proprietary Metrics: Terms & Language Used in Commentary",
        shortTitle: "1. Glossary",
        icon: "📖",
        summary: "Clear definitions for Jeff Sun's core trading vocabulary: LoD, RVOL, VARS, M30 Re-ORH, and ATR extensions.",
        glossaryItems: [
          { term: "LoD", full: "Low of Day", desc: "The lowest price printed during regular market hours. Critical benchmark for initial stop placement and entry tightness (<60% ATR rule)." },
          { term: "RVOL", full: "Relative Volume", desc: "Current volume divided by the historical 50-day average volume at the exact time of day. High RVOL (≥1.5x) proves institutional buying." },
          { term: "VARS", full: "Volatility Adjusted Relative Strength", desc: "A proprietary relative strength indicator that adjusts for each individual stock's idiosyncratic volatility versus SPY/QQQ." },
          { term: "M30 Re-ORH", full: "Post-Open 30m Reclaim of Opening Range High", desc: "Price reclaims its first 30-minute high after an initial morning dip, confirming institutional support and trapping early bears." },
          { term: "R-Multiple", full: "Initial Risk Unit (1R)", desc: "The monetary difference between entry price and stop loss. A +16R trade represents 16 times your initial dollar risk." },
          { term: "X × ATR% from 50-MA", full: "ATR Multiples from 50-Day Moving Average", desc: "Objective measurement of how far price is extended from intermediate trend. Used for launchpad entries (≤4x) and profit scaling (6-8x)." }
        ],
        body: `
### Why Standard Technical Analysis Fails Retail Traders
Standard technical analysis relies on subjective lines. Jeff Sun's framework converts discretionary chart patterns into **statistically verifiable, normalized mathematical thresholds**:
* Instead of asking *"Is the stock overextended?"*, we ask: *"Is price >4x ATR from its 50-day moving average?"*
* Instead of asking *"Is there volume?"*, we ask: *"Is projected RVOL ≥ 1.5x at the opening range breakout?"*
`
      },
      {
        id: "js_charting",
        number: "02",
        title: "Charting Setup: The Three Pillar Indicators on TradingView",
        shortTitle: "2. Charting & Indicators",
        icon: "📊",
        summary: "The essential daily indicators: Swing Data (ADR% / RVOL), ATR% Extension from 50-MA, and VARS Histogram.",
        indicators: [
          {
            name: "1. Swing Data (ADR% / RVOL / PVol / Float)",
            users: "75k+ Users",
            desc: "Displays Average Daily Range %, Relative Volume run-rate, projected volume, and float size directly on the chart header.",
            bullets: [
              "Target High ADR% (≥4.0% - 6.0%+): Expansive moves require inherent volatility to generate high R-multiples.",
              "Leveraged ETF Edge: Qullamaggie and Jeff Sun favor liquid leveraged ETFs (SOXL, NVDL, TQQQ) where high ADR% generates positive compounding.",
              "Average Dollar Volume ($Vol): Ensure >$100M daily turnover to eliminate slippage and spread friction."
            ]
          },
          {
            name: "2. ATR% Multiple from 50-MA",
            users: "47k+ Users",
            desc: "Measures the mathematical standard deviation of price extension relative to the 50-day institutional moving average.",
            bullets: [
              "Launchpad Zone (≤ 4x ATR): Entry must occur close to the 50-MA base where risk/reward is asymmetrical.",
              "Extension Profit Zone (6x – 8x ATR): Statistical profit-taking zone based on 13-year studies across 5,500+ US stocks.",
              "Avoid Chasing at 10x+ ATR: Gap-ups extended 10x ATR pull back >85% of the time without immediate follow-through."
            ]
          },
          {
            name: "3. VARS with Histogram (Volatility Adjusted RS)",
            users: "5k+ Users",
            desc: "Normalizes relative strength against SPY/QQQ by incorporating stock-specific volatility, eliminating beta false positives.",
            bullets: [
              "Distinguishes genuine institutional accumulation from high-beta market correlation.",
              "Histogram expansion above baseline indicates immediate leadership emergence."
            ]
          }
        ],
        body: `
### Logarithmic vs. Linear Charts
For high-ADR% swing trading, **Logarithmic charts are mandatory**:
* A move from $10 to $20 is a +100% gain; a move from $100 to $110 is only +10%. On a linear chart, the $100 move looks identical to the $10 move, completely distorting risk/reward.
* Log charts display equal vertical distance for equal percentage returns, keeping stop-loss distances visually proportional.
`
      },
      {
        id: "js_screening",
        number: "03",
        title: "Screening Architecture: 14 Post-Market & 2 Live RVOL Screens",
        shortTitle: "3. Screeners",
        icon: "🔬",
        summary: "Post-market scanning workflow on Finviz and TradingView, transitioning into real-time RVOL execution screens.",
        screenerRules: [
          { rule: "CANSLIM-Calibrated Screen", val: "High EPS, RS ≥ 90, Price > 50-MA", desc: "Filters core fundamental and technical leadership pool (1.9M+ impressions)" },
          { rule: "High ADR% Hottest Stocks", val: "ADR(20) ≥ 5.0%, $Vol ≥ $100M", desc: "Isolates the most volatile, liquid movers capable of +30% to +100% waves" },
          { rule: "Prolonged Consolidation", val: "Consolidation 6-12 weeks, Volume Dry-Up", desc: "Modeled after Jeff's +180% KC trade: extended base with tight coil ready to erupt" },
          { rule: "Strongest Movers Decile", val: "Top 1-Week, 1-Month, 3-Month, 6-Month", desc: "Surfaces leading momentum leaders undergoing institutional rotation" },
          { rule: "Live-Market Focus RVOL", val: "RVOL ≥ 1.5x at Market Open (9:30-10:00 AM)", desc: "Confirms whether stocks on your Focus List are receiving real institutional flow" },
          { rule: "Live Pre-Market Gappers", val: "Gap ≥ 4%, Pre-Market $Vol > $5M", desc: "Identifies early catalysts for Episodic Pivots (EP) and high-volume day-1 momentum" }
        ],
        body: `
### Screening Builds the Pool, Not the Order
Screening only builds a generic watchlist. An actionable trade setup requires **further qualitative filtering into the Focus List**:
1. Run post-market screens (15–20 minutes daily).
2. Filter ~100 screen results down to ~20 watchlist candidates.
3. Select strictly the **Top 5 to 8 A-Rated Focus List stocks** for the next session.
`
      },
      {
        id: "js_routine",
        number: "04",
        title: "Daily Routine: From Watchlist to Focus List & Price Alerts",
        shortTitle: "4. Daily Routine",
        icon: "⏰",
        summary: "A sustainable, low-fatigue trading routine: Screening → Focus List → Pre-market Alerts → Sit on hands until alerts trigger.",
        passes: [
          {
            step: "Stage 1 · Post-Market Scan",
            count: "~100 → 25 names",
            desc: "Run 14 Finviz/TradingView screeners after market close. Review daily charts for clean base tightness and 10/20 EMA support."
          },
          {
            step: "Stage 2 · Focus List Selection",
            count: "25 → 5-8 names",
            desc: "Upgrade only 'A-Rated' ideas. Identify exact breakout pivot price, calculate ATR distance, and define stop loss level."
          },
          {
            step: "Stage 3 · Pre-Market Price Alerts",
            count: "5-8 Alerts",
            desc: "Set price alerts at or 2-3 cents below pivot on TradingView. During the live session, DO NOT watch the screen continuously. Wait for the alert."
          },
          {
            step: "Stage 4 · Live RVOL Verification",
            count: "1-3 Executions",
            desc: "When an alert fires, check live RVOL run-rate and distance from LoD (<60% ATR). If conditions pass, execute immediately."
          }
        ],
        body: `
### The Power of Price Alerts Over Screen-Staring
The lower the timeframe you watch, the greater the mental exhaustion and the higher the probability of taking impulsive C-rated setups.
* **The Ritual**: Pre-market alert setting is non-negotiable.
* If an alert does not ring, **you do nothing**. Sitting in cash is an active, profitable position that protects mental clarity.
`
      },
      {
        id: "js_execution",
        number: "05",
        title: "Trade Execution: The Non-Negotiable <60% ATR LoD Rule",
        shortTitle: "5. Execution & Stops",
        icon: "⚡",
        summary: "The definitive spring-coil rule: Never buy a breakout if entry is >60% ATR above the Low of Day (LoD).",
        rules: [
          {
            title: "Rule 1: Entry Distance ≤ 60% of ATR from LoD",
            badge: "Hard Red Line",
            desc: "Visualizing ATR as a spring coil: A stock has finite daily expansion energy. If price has already consumed >60% of its ATR between LoD and your entry point, your stop distance is too wide and risk/reward is impaired."
          },
          {
            title: "Rule 2: Distance from 50-MA ≤ 4x ATR",
            badge: "Launchpad Filter",
            desc: "Entries must be within 4x ATR extension of the 50-day moving average. Entering above 4x ATR means chasing an extended move where mean reversion probability rises sharply."
          },
          {
            title: "Rule 3: Projected RVOL ≥ 1.5x at Breakout",
            badge: "Volume Confirmation",
            desc: "Breakouts on low or average volume are prone to failure and fakeouts. Heavy volume run-rate is the first undeniable proof of smart money buying."
          },
          {
            title: "Rule 4: M30 Re-ORH Trigger",
            badge: "Intraday Timing",
            desc: "After the 9:30 AM open, let the first 15–30 minutes print. A reclaim of the Opening Range High (ORH) confirms sustained institutional demand."
          }
        ],
        body: `
### Visualizing the <60% ATR Rule
Assume a stock has an **ATR of $4.00**:
* **Low of Day (LoD):** $50.00
* **60% of ATR:** $4.00 × 0.60 = **$2.40**
* **Maximum Allowable Buy Price:** $50.00 + $2.40 = **$52.40**

If the breakout level is at **$53.50**, the distance from LoD is $3.50 (87.5% of ATR). 
**Execution is REJECTED unconditionally.** Do not chase. Wait for a pullback or next setup.
`
      },
      {
        id: "js_management",
        number: "06",
        title: "Trade Management: Trailing Stops & Objective Scaling into Strength",
        shortTitle: "6. Profit Taking",
        icon: "💰",
        summary: "Scaling profits into statistical extensions (6-8x ATR from 50-MA or +2.5R to +3R) and trailing remainder on 10/20 EMA.",
        offensive: [
          {
            name: "Partial Trim at +2.5R to +3.0R",
            rule: "First Target (+2.5R - +3R)",
            action: "Sell 1/3 to 1/2 of position into initial strength. Move stop loss on remaining shares to breakeven (+0.2R to cover fees). You now have a risk-free trade."
          },
          {
            name: "ATR Extension Scale-Out (6x - 8x ATR)",
            rule: "Extreme Extension from 50-MA",
            action: "When stock reaches 6x to 8x ATR multiples above its 50-day moving average, institutional profit-taking is imminent. Scale out an additional 1/3 into momentum."
          },
          {
            name: "Fast Trailing Stop (10 EMA)",
            rule: "Short-Term Swing Trailing",
            action: "For aggressive high-ADR% runners, trail stops along the daily 10-day EMA. Close the remainder if a candle closes decisively below 10 EMA."
          },
          {
            name: "Structural Trailing Stop (20 EMA)",
            rule: "Intermediate Wave Trailing",
            action: "For major market leaders (e.g. NVDA, PLTR in Stage 2), trail along the 20-day EMA to ride multi-month intermediate compound waves."
          }
        ],
        body: `
### The Time Stop: Preserving Opportunity Capital
Achart has both a Y-axis (price) and an X-axis (time):
* If a breakout does not follow through with range expansion within **3 to 5 trading sessions** (grinding sideways at cost), **close the position**.
* Do not tie up capital waiting for a stalled trade to prove itself. Reallocate into active names expanding with fresh RVOL.
`
      },
      {
        id: "js_risk_sizing",
        number: "07",
        title: "Position Sizing & Risk to Equity: The 0.25% - 0.5% Formula",
        shortTitle: "7. Position Sizing",
        icon: "⚖️",
        summary: "Disciplined risk allocation: Cap loss to 0.25% - 0.50% of portfolio equity per trade, scaling up size purely through tight stops.",
        body: `
### The Math of Professional Risk Allocation
Amateurs ask: *"How many shares can I buy with my cash?"*  
Professionals ask: *"How many dollars am I risking if my stop loss is hit?"*

#### The Exact Formula:
$$\\text{Total Risk Dollars} = \\text{Account Equity} \\times \\text{Risk \\% (0.25\\% - 0.50\\%)}$$

$$\\text{Position Shares} = \\frac{\\text{Total Risk Dollars}}{\\text{Entry Price} - \\text{LoD Stop Price}}$$

#### Why Tight Entries Allow Massive Position Sizing:
Because your entry is tight to the LoD ($<60\\%$ ATR), your stop distance might be only **1.5% to 2.5%**.
* With a **2.0% stop distance** and a **0.5% equity risk**, your total position size is **25% of your portfolio** ($0.5\\% / 2\\% = 25\\%$).
* If the trade moves $+6\\%$, you make **+3R (+1.5% to your total account)** in 2 days.
`
      },
      {
        id: "js_checklist",
        number: "08",
        title: "Execution Checklist: Jeff Sun's 8 Pre-Flight Filters",
        shortTitle: "8. Execution Checklist",
        icon: "✅",
        summary: "Interactive checklist to verify every trade satisfies all 8 non-negotiable rules before submitting an order.",
        body: "Check off every item below before submitting a live execution order. If any item fails, stand down."
      },
      {
        id: "js_calculator",
        number: "09",
        title: "Interactive Calculator: LoD ATR & 50-MA Extension Sizer",
        shortTitle: "9. ATR & LoD Sizer",
        icon: "🧮",
        summary: "Calculate LoD ATR distance %, 50-MA extension multiple, position shares, and +2R/+3R profit targets in real time.",
        body: "Enter your account equity, risk %, entry price, low of day, 50-day moving average, and stock ATR to test execution validity."
      }
    ]
  },
  zh: {
    hero: {
      badge: "JEFF SUN, CFTe · 系统化波段交易作战手册",
      title: "交易员全流程进阶指南：体系、日常、工具与确定性",
      subtitle: "16 年实战止损阵痛沉淀：千万级多资产复利作战体系",
      author: "作者：Jeff Sun, CFTe (@jfsrev)",
      description: "交易绝非短期赚快钱的工具，而是一门严谨的长期资本复合增长事业。从 Finviz/TradingView 选股到精选池收敛、盘中 RVOL 突破确认、严禁破位 60% ATR 止损硬原则，以及客观统计驱动的分批止盈。",
      tags: ["高 ADR% 动量", "RVOL 突破过滤", "<60% ATR LoD 进场", "50EMA ATR 乖离率", "VARS 相对强度", "系统化分步止盈"]
    },
    chapters: [
      {
        id: "js_core_beliefs",
        number: "00",
        title: "核心交易理念：资本长期复利 vs. 短期暴利陷阱",
        shortTitle: "0. 核心理念",
        icon: "🧭",
        summary: "16年跨资产交易真理：对日常流程做微小的精细打磨，就能让你的净值曲线产生质的飞跃。",
        rules: [
          {
            title: "长期复利思维",
            badge: "盈亏哲学",
            desc: "交易是一场长期复利游戏，太多人却把它当成短期发工资的机器。每年稳定复利 30-50%，远远跑赢大起大落爆仓的赌徒。"
          },
          {
            title: "A级形态 vs. C级执行",
            badge: "执行质量",
            desc: "一个完美的 A 级形态如果进场点位松散、追高离止损过远，最终只能得到 C 级的亏损结果；而严格执行且止损极窄的交易，胜率再普通也能创造惊人 R 盈亏比。"
          },
          {
            title: "坚决消灭单票跳空归零风险",
            badge: "风险排除",
            desc: "在全量选股中坚决剔除单只高波动生物医药股（Biotech），彻底杜绝隔夜重组失败暴跌 80% 的黑天鹅。若要博弈医药弹性，只做 LABD/LABU 等高流动性 ETF。"
          },
          {
            title: "重视时间维度的力量",
            badge: "X轴耐心",
            desc: "K线不仅有 Y 轴（价格），更有 X 轴（时间）。真正具备大涨潜力的牛股，在突破后会迅速拉出波动率扩展，绝不会在成本线附近长期横盘磨耗。"
          }
        ],
        body: `
### 16 年全职交易的心血总结
在市场中生存并赚到数百万美元的关键，不是懂得多少生僻的技术指标，而是**在日常执行中彻底消灭随性与情绪摩擦**。

> *“交易日常中几个快速、简单的细微打磨，就能彻底逆转你的净值曲线，释放长期惊人的复利潜力。”*
`
      },
      {
        id: "js_glossary",
        number: "01",
        title: "专有核心指标术语与日常交流词汇表",
        shortTitle: "1. 核心术语",
        icon: "📖",
        summary: "Jeff Sun 交易体系核心词汇：LoD、RVOL、VARS、M30 Re-ORH 与 50-MA ATR 乖离率全解析。",
        glossaryItems: [
          { term: "LoD", full: "Low of Day (当日盘中最低价)", desc: "结构性硬止损锚点。进场点距离 LoD 严禁超过当日 ATR 的 60%。" },
          { term: "RVOL", full: "Relative Volume (相对成交量放大倍数)", desc: "当前时段成交量除以过去50天该时段的平均成交量。RVOL ≥ 1.5-2.0 倍是机构真金白银买入的最强证明。" },
          { term: "VARS", full: "Volatility Adjusted RS (波动率调整相对强度)", desc: "剔除个股自身高贝塔假象、真实量化相对标普/纳指超额阿尔法的原创指标。" },
          { term: "M30 Re-ORH", full: "Post-Open 30m Reclaim of ORH", desc: "开盘前30分钟震荡洗盘后，强势收复早盘高点（Opening Range High），确认机构持续扫货。" },
          { term: "R-Multiple", full: "R 初始风险单位", desc: "每笔交易的初始止损金额（买入价 - 止损价）。+3R 代表净赚初始风险金的 3 倍。" },
          { term: "X × ATR% from 50-MA", full: "距离 50 日均线的 ATR 乖离倍数", desc: "量化股价偏离均线的统计学标准差。进场必须处于发射台（≤4x），分批止盈在加速区（6-8x）。" }
        ],
        body: `
### 为什么主观技术分析总让散户亏损？
散户常问：“这股票是不是涨太多了？”或者“成交量算不算大？”
在 Jeff Sun 体系中，一切全部量化：
* 偏离度以 **ATR 倍数** 衡量；
* 成交量以 **RVOL 实时放大倍数** 判定；
* 进场紧凑度以 **LoD 距离占 ATR 比例** 约束。
`
      },
      {
        id: "js_charting",
        number: "02",
        title: "TradingView 图表配置：三大核心支柱指标",
        shortTitle: "2. 图表指标",
        icon: "📊",
        summary: "每日必看指标系统：Swing Data (ADR%/RVOL)、50-MA ATR 乖离倍数与 VARS 柱状图。",
        indicators: [
          {
            name: "1. Swing Data (ADR% / RVOL / PVol / 股本流动盘)",
            users: "超 7.5 万交易者使用",
            desc: "在图表头部一站式显示 ADR(20)%、实时量比、预测成交量与市值规模。",
            bullets: [
              "锁定高 ADR% (≥4.0% - 6.0%+): 波段爆发力必须依赖个股自身的波动弹性，窄幅低波动股票无法带来高 R 盈亏比。",
              "杠杆 ETF 优势: 精选高流动性杠杆标的（SOXL、NVDL、TQQQ），利用正向复利与高 ADR% 加速资金轮转。",
              "平均日成交额 ($Vol): 确保每日成交金额超 1 亿美元，彻底消灭滑点与买卖价差损耗。"
            ]
          },
          {
            name: "2. 距离 50 日均线的 ATR% 乖离倍数",
            users: "超 4.7 万交易者使用",
            desc: "客观量化股价偏离 50 日机构基准线的统计学极值，构建起正态分布钟形曲线。",
            bullets: [
              "发射台区域 (≤ 4x ATR): 进场点必须紧靠 50EMA 基底，此时盈亏比最为优异。",
              "分步止盈加速区 (6x – 8x ATR): 基于 13 年跨 5,500 只美股的回测，该区域面临极高统计学均值回归阻力，属于最佳主动分批减仓点。",
              "严禁在 10x+ 极度偏离时追高: 跳空且偏离超 10x ATR 的股票，85% 以上都会大幅回撤消化。"
            ]
          },
          {
            name: "3. VARS 波动率调整相对强度",
            users: "超 5,000 交易者使用",
            desc: "根据标的自身历史波动率校准的相对强度，精准筛选出真正跑赢大盘的领涨龙头。"
          }
        ],
        body: `
### 对数坐标 (Log) vs. 普通线性坐标 (Linear)
对于高 ADR% 的动量波段交易者，**必须使用对数坐标 (Logarithmic Chart)**：
* 从 $10 涨到 $20 是 +100% 翻倍；从 $100 涨到 $110 仅有 +10%。在普通坐标下两条柱子完全一样长，完全破坏了视觉上的真实盈亏比感知。
`
      },
      {
        id: "js_screening",
        number: "03",
        title: "选股筛选体系：14套盘后扫描与2套盘中RVOL实时监控",
        shortTitle: "3. 选股体系",
        icon: "🔬",
        summary: "基于 Finviz 与 TradingView 的盘后扫描漏斗，以及开盘前 30 分钟的高 RVOL 异动拦截。",
        screenerRules: [
          { rule: "CANSLIM 精准校准筛选", val: "高EPS增速, RS ≥ 90, 站上 50 均线", desc: "筛选全市场基本面与技术面双优的最顶级领涨股池（全网超 190 万浏览）" },
          { rule: "高 ADR% 最热门异动股", val: "ADR(20) ≥ 5.0%, 日成交额 ≥ 1亿美元", desc: "锁定全市场最具波动弹性与流动性的动量热钱汇聚标的" },
          { rule: "长期收敛爆发 (KC 战法)", val: "横盘收敛 6-12 周, 缩量洗盘", desc: "基于 Jeff Sun 经典 +180% KC 翻倍交易提炼的长期大底紧凑形态" },
          { rule: "各周期最强领涨梯队", val: "近 1周 / 1月 / 3月 / 6月涨幅前列", desc: "捕捉由机构主导的板块轮动先锋" },
          { rule: "盘中 Focus List RVOL 确认", val: "开盘前 30 分钟 RVOL ≥ 1.5x", desc: "验证核心自选池在开盘时是否迎来真正的大资金放量入场" }
        ],
        body: `
### 扫描只产生候选名单，不直接产生交易单
初学者最容易犯的错误是把筛选出来的股票直接买入。
* 每天盘后扫描花 15–20 分钟，从 100 多只结果中人工精选出 **5 到 8 只 A 级自选股 (Focus List)**；
* 次日只在这 5-8 只中等待买点触发，其余统统不看。
`
      },
      {
        id: "js_routine",
        number: "04",
        title: "每日交易作息：从大池子到精选池与价格报警",
        shortTitle: "4. 每日作息",
        icon: "⏰",
        summary: "高效率、可持续、绝不疲惫的作息法则：盘后扫描 → 精选Focus List → 预设报警 → 盘中坐等报警响铃。",
        passes: [
          {
            step: "阶段 1 · 盘后初筛",
            count: "~100 → 25 只",
            desc: "运行 14 套 Finviz / TradingView 筛选器，翻看形态是否紧密收敛并受到 10/20 EMA 支撑。"
          },
          {
            step: "阶段 2 · 确定 Focus List",
            count: "25 → 5-8 只",
            desc: "只升级严格符合 A 级标准的个股。计算好每只标的的 ATR 距离、突破支点价与止损挂单位。"
          },
          {
            step: "阶段 3 · 开盘前预设价格报警",
            count: "5-8 条报警",
            desc: "在 TradingView 上给 Focus List 逐一设置价格报警。盘中绝不全程死盯屏幕，等待报警通知。"
          },
          {
            step: "阶段 4 · 盘中放量确认下单",
            count: "1-3 笔执行",
            desc: "报警触发时，检查实时 RVOL 是否超 1.5x、且进场点距离 LoD 是否在 60% ATR 范围内。合格即果断下单。"
          }
        ],
        body: `
### 为什么要依赖价格报警，而不是整天盯盘？
盯盘时间越长、级别越小，交易者产生情绪冲动、买入乱七八糟次级垃圾形态的概率就越高。
* **极简法则**：开盘前设好报警，盘中报警不响，就坚决坐着不动；
* 现金持仓本身就是一种极其有利的积极头寸，它保护了你最宝贵的专注力。
`
      },
      {
        id: "js_execution",
        number: "05",
        title: "实战开仓核心红线：严禁距离 LoD 超过 60% ATR",
        shortTitle: "5. 开仓红线",
        icon: "⚡",
        summary: "核心弹簧弹力法则：进场价距离当日最低点（LoD）若已消耗超过 60% ATR，坚决不追高。",
        rules: [
          {
            title: "硬规则 1：进场点距离 LoD 严禁超过 60% ATR",
            badge: "核心红线",
            desc: "将 ATR 视作弹簧伸缩：一只股票每日的弹性空间是有限的。若从当日最低点到你的买入点已经耗尽了 60% 以上的单日波动空间，剩余上涨势能被压缩，且止损距离被动拉大，R 盈亏比彻底失效。"
          },
          {
            title: "硬规则 2：距离 50 日均线乖离严禁超过 4x ATR",
            badge: "发射台准则",
            desc: "进场必须紧靠 50EMA 均线基底。若股价已经脱离 50 均线 4 倍 ATR 以上，均值回归被动洗盘的概率骤增。"
          },
          {
            title: "硬规则 3：盘中突破必须伴随 RVOL ≥ 1.5x",
            badge: "放量确权",
            desc: "平量或缩量的所谓突破极易夭折成假突破骗线。高量比运行率是机构大资金持续扫盘的唯一真凭实据。"
          },
          {
            title: "硬规则 4：开盘 30 分钟收复高点 (M30 Re-ORH)",
            badge: "时间节奏",
            desc: "9:30 开盘后不要盲目争抢第一分钟。让盘面震荡消化 15-30 分钟，一旦收复早盘高点，往往是绝佳紧凑启动点。"
          }
        ],
        body: `
### 60% ATR 规则数学演示
假设某股票的 **ATR(14) 为 $4.00 美元**：
* **当日盘中最低价 (LoD):** $50.00
* **60% ATR 最大允许距离:** $4.00 × 0.60 = **$2.40**
* **最高允许买入价:** $50.00 + $2.40 = **$52.40**

若该股的突破点位在 **$53.50**，意味着从 LoD 上涨了 $3.50（消耗了 87.5% 的 ATR）。
**此时该笔交易必须被无条件否决（REJECTED）！** 绝不追高，等待次日回踩缩量或下一个标的。
`
      },
      {
        id: "js_management",
        number: "06",
        title: "仓位管理：移动止损、时间止损与统计学分步止盈",
        shortTitle: "6. 止盈止损",
        icon: "💰",
        summary: "在 +2.5R 到 +3R 锁定利润、在 6-8x ATR 乖离极值主动分批减仓，并沿 10/20 EMA 移动止损。",
        offensive: [
          {
            name: "到达 +2.5R 至 +3.0R 锁定首批利润",
            rule: "第一目标位 (+2.5R - +3R)",
            action: "逢高减仓 1/3 到 1/2，并将剩余仓位的止损立即提高到平手成本位（+0.2R 涵盖手续费），将此单转为零风险持仓。"
          },
          {
            name: "50-MA 乖离达 6x - 8x ATR 极值止盈",
            rule: "统计学偏离极限",
            action: "当股价脱离 50 均线达到 6-8 倍 ATR 时，遭遇机构获利了结回踩的概率极高，主动卖出另外的 1/3 锁定暴利。"
          },
          {
            name: "快速动量沿 10 EMA 移动止损",
            rule: "高 ADR% 动量追踪",
            action: "针对爆发力强的个股，只要日K线收盘不跌破 10 EMA 就坚定持有，跌破当日尾盘出清。"
          },
          {
            name: "大波段沿 20 EMA 结构性追踪",
            rule: "主升浪中线追踪",
            action: "针对超级大牛股（如大波段 NVDA、PLTR），沿 20 EMA 追踪，享受数月的主升浪大级别复利。"
          }
        ],
        body: `
### 时间止损 (Time Stop)：保护资金时间机会成本
K线兼具 Y 轴（价格）与 X 轴（时间）：
* 突破后如果在 **3 到 5 个交易日内** 未能展开强劲的波动率扩展（一直在成本位附近横盘滞涨），**果断主动平仓**；
* 绝不让宝贵的资金沉睡在不愿拉升的鸡肋标的上，立刻腾出仓位换入放量爆发的新龙头。
`
      },
      {
        id: "js_risk_sizing",
        number: "07",
        title: "仓位与资金风险：0.25% - 0.5% 严谨数学算式",
        shortTitle: "7. 仓位测算",
        icon: "⚖️",
        summary: "严禁超额下注：单笔最大本金风险严格限制在账户总值的 0.25% - 0.50%，靠窄止损放大购买股数。",
        body: `
### 专业交易员的风险算式
业余散户问：“我有 10 万块，能买多少股？”  
职业交易员问：“如果这笔交易打到止损，我会亏损账户的百分之几？”

#### 核心测算公式：
$$\\text{单笔允许亏损美元} = \\text{账户总资金} \\times \\text{单笔风险比例 (0.25\\% - 0.50\\%)}$$

$$\\text{应买入股数} = \\frac{\\text{单笔允许亏损美元}}{\\text{买入价} - \\text{LoD 止损价}}$$

#### 窄止损如何实现大仓位：
因为进场点严格贴近当日最低点 LoD（<60% ATR），你的单笔止损距离可能只有 **1.5% 到 2.5%**。
* 在 2.0% 的极窄止损下，承担 0.5% 的总资金风险，你可以安全开出占总资金 **25%** 的重仓；
* 一旦股价拉出 +6% 的常态波段涨幅，便直接斩获 **+3R（为总账户带来 +1.5% 的纯收益）**。
`
      },
      {
        id: "js_checklist",
        number: "08",
        title: "开盘实战清单：Jeff Sun 的 8 大下单检验过滤",
        shortTitle: "8. 检验清单",
        icon: "✅",
        summary: "在向券商提交委托单前，逐条确认 8 大客观指标全部合格，坚决拒绝凭一时兴起开仓。",
        body: "在提交买入委托单前逐项核对。若有任何一项亮红灯，立即放弃本次操作。"
      },
      {
        id: "js_calculator",
        number: "09",
        title: "实战计算器：LoD ATR 紧凑度与 50 均线偏离测算",
        shortTitle: "9. ATR与LoD测算器",
        icon: "🧮",
        summary: "实时测算进场点距离当日最低点（LoD）的 ATR 占比、50 均线乖离倍数、安全买入股数与 +2R/+3R 止盈目标价位。",
        body: "输入账户总额、单笔风险比例、买入价、当日最低价 LoD、50日均线价与个股日 ATR，一键校验交易合规性。"
      }
    ]
  }
};

