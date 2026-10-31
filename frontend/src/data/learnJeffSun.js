// Jeff Sun, CFTe Complete Trading System Data
// Source: The Complete Traders' Guide: My Process, Tools, Routine, Core Beliefs & FAQs

export const JEFF_SUN_CONTENT = {
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
A chart has both a Y-axis (price) and an X-axis (time):
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
};
