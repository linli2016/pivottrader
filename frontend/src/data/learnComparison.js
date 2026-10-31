// Master System Comparison & Synthesis
// Cross-Analysis of the 5 Elite Trading Methodologies in PivotTrader:
// Kristjan Qullamaggie, Martin Luk, KovaView, Jeff Sun, CFTe, and Dan Zanger

export const COMPARISON_CONTENT = {
  hero: {
    badge: "MASTER SYSTEM COMPARISON · SUPER TRADER SYNTHESIS",
    title: "The Grand Unified Theory of Momentum Swing Trading",
    subtitle: "Cross-Comparative Analysis of 5 Legendary Systems & The Universal DNA of Asymmetric Alpha",
    author: "By PivotTrader Research & Master Trader Synthesis",
    description: "What happens when you dissect the world's most lucrative momentum strategies side-by-side? Compare Kristjan Qullamaggie, Martin Luk, KovaView, Jeff Sun, and Dan Zanger across 10 critical dimensions. Discover the 8 Universal Pillars of Super Trading, master stop-loss compression math, and execute with unified institutional discipline.",
    tags: [
      "5 Elite Systems Compared",
      "The 8 Universal Pillars",
      "Stop Compression Math",
      "Volume as Hard Data",
      "LoD & Half-ADR Stops",
      "Multi-Tiered Scaling",
      "10/20/21 EMA Discipline",
      "Master Pre-Flight Checklist"
    ]
  },
  chapters: [
    {
      id: "comp_matrix",
      number: "00",
      title: "The 10-Dimension Comparative Matrix: Side-by-Side Analysis",
      shortTitle: "0. Comparison Matrix",
      icon: "⚖️",
      summary: "A rigorous, side-by-side technical comparison of Qullamaggie, Martin Luk, KovaView, Jeff Sun, and Dan Zanger across all 10 critical execution parameters.",
      rules: [
        {
          title: "Execution Diversity, Conceptual Unity",
          badge: "Shared Core",
          desc: "While their setups vary from high tight flags and AVWAP pullbacks to classic cup-and-handles, all 5 traders share the identical core: buying high relative strength on institutional volume with asymmetrical downside protection."
        },
        {
          title: "Stop Precision Dictates R-Multiples",
          badge: "Stop Compression",
          desc: "Traders using micro-stops (Martin Luk at ≤1.5%–2.5%, Qullamaggie at LoD ≤60% ATR, Zanger at $1 sub-pivot) extract 15R to 40R+ from standard 25% moves, dramatically lowering their required win rate."
        },
        {
          title: "Volume Is the Only Hard Data",
          badge: "Institutional Footprint",
          desc: "Every system demands volume dry-up (VDU) during base consolidation, followed by violent volume expansion (ZVR, RVOL, or Volume Buzz) on the trigger day to confirm institutional buying."
        },
        {
          title: "Daily Close Trailing Invariance",
          badge: "The Non-Negotiable",
          desc: "All 5 systems strictly trail moving averages (10 EMA, 20/21 EMA, or 10 SMA) based exclusively on the 4:00 PM daily close. None of them exit based on midday emotional wicks."
        }
      ],
      body: `
### The 10-Dimension Technical Comparison Matrix

The table below breaks down the exact operational parameters used by each super trader:

| Execution Dimension | Kristjan Qullamaggie | Martin Luk | KovaView | Jeff Sun, CFTe | Dan Zanger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Origin & Verified Milestone** | Swedish swing trader; compounded five-figures into **\$100M+** on live streams | Hong Kong/UK trader; **+283.1%** (2024) & **+969.8%** (2025) USIC | Six-year systematic process; Minervini & O'Neil disciple | 16-year multi-asset swing manager; systematic trading | World Record: **\$10.7k into \$18M** (+29,233%) in 18 months |
| **2. Core Philosophy** | Asymmetric law of large numbers; alpha leaders; 10/20 EMA surfing | Stop-loss compression; exponential R-multiples; pullback retests | 4-dimension filtering (Fundamentals, RS, Base, Regime); VCP | Quantitative threshold execution; zero feeling; statistical profit zones | Pure price & volume tape reading; zero indicators; breakout velocity |
| **3. Stock Selection & Volatility** | 1M/3M/6M Gainers; $\\text{ADR\\%} \\ge 4.5\\%\\text{--}5\\%$; Price $\\ge \\$2\\text{--}\\$5$ | Top 1%–2% RS leaders; $\\text{ADR\\%} \\ge 4.5\\%\\text{--}5\\%$; Sector clusters | CAN SLIM (EPS $\\ge 25\\%$, Sales $\\ge 20\\%$); RS Rank $\\ge 80\\text{--}90$ | High ADR% ($\\ge 4\\%\\text{--}6\\%$); liquid Leveraged ETFs & growth; $\\$100\\text{M}+$ Vol | "Frisky movers" ($\\$30\\text{--}\\$150+$); 40%–400% EPS/Sales; Float squeeze |
| **4. Technical Toolset** | 10 EMA, 20 EMA, 50 SMA, 200 SMA | 9 EMA, 21 EMA, 50 SMA, Anchored VWAP (AVWAP) | 10 EMA, 20 EMA, 50 SMA, Volume dry-up (VDU) | Swing Data (ADR%/RVOL), 50-MA ATR Multiple, VARS Histogram | Zero oscillators/indicators; Trendlines, Horizontal Pivots, Volume Bars |
| **5. Signature Setups** | High Tight Flag (HTF), Episodic Pivot (EP), Parabolic Short/Long | 9/21 EMA & AVWAP Retest, Inside Day Compression, EP Shelf | Minervini VCP, Cup & Handle, Low Cheat, Pocket Pivot | RVOL Breakouts from Focus List, Spring-Coil Consolidations | 11 Classic Patterns (Cup & Handle, Bull Flags, Wedges, Channels) |
| **6. Entry Timing Tactic** | 1m, 5m, or 60m Opening Range High (ORH) | 5m ORH or Intraday AVWAP Reclaim | Break of pivot handle / pocket pivot volume expansion | Live RVOL breakout run-rate above pivot | Buy-Stop right on pivot breakout line (strictly within +5%) |
| **7. Stop-Loss Guardrail** | Low of Day (LoD) strictly $\\le 60\\%\\text{ ATR}$ | Local swing low / AVWAP shelf strictly $\\le 50\\%\\text{ ADR}$ ($\\le 1.5\\%\\text{--}2.5\\%$) | Base pivot low or 10 EMA (Strictly $\\le 7\\%\\text{--}8\\%$) | Low of Day (LoD) strictly $\\le 60\\%\\text{ ATR}$ | Tightly tucked $\\approx \\$0.50\\text{--}\\$1.00$ beneath breakout pivot |
| **8. Position Sizing Model** | $\\frac{\\text{Equity} \\times \\text{Risk\\%}}{\\text{Entry} - \\text{LoD}}$; 0.25%–1.0% risk; max 25% pos | Compressed risk: 0.5%–1.0% equity risk; 4–6 positions (15%–25% each) | Pyramid 50% initial, 30% add at +2.5%, 20% add at +5.0%; max 5 pos | 0.25%–0.5% equity risk; position sized to dollar risk vs LoD | 1.0% equity risk; heavy concentration in 3–6 top leaders |
| **9. Scaling & Exit Plan** | Sell 1/3–1/2 on Days 3–5; stop to BE; trail remainder on 10/20 EMA | Sell 25%–35% at +3R to +5R; stop to BE; trail core on 21 EMA | Offensive sell at +20%–25% or 3x stop; defensive sell on 20 EMA break | Trim at +2.5R to +3.0R; target extension at 6x–8x ATR from 50-MA | Sell 20%–30% at +15% to +20% above pivot; trail 50% on 10 SMA |
| **10. Trailing Stop Rule** | Sell remainder ONLY on first daily **CLOSE below 10 or 20 EMA** | Sell remainder ONLY on first daily **CLOSE below 21 EMA or AVWAP** | Move to BE after tranche 2; sell on moving average violation | Partial trailing stops; exit if price rejects 10x ATR extension | Trail rising 10-day SMA; liquidate into parabolic blow-off euphoria |

---

#### Key Takeaway from the Matrix
Notice that while the entry triggers range from breakout pivots to retests of moving averages, **not a single trader uses discretionary mental stops or loose 15% stop-losses**. Risk is always mechanically defined at the exact moment of entry.
`
    },
    {
      id: "comp_universal_pillars",
      number: "01",
      title: "The 8 Universal Pillars of Super Trading (The Shared DNA)",
      shortTitle: "1. The 8 Universal Pillars",
      icon: "💎",
      summary: "The immutable laws of market speculation: eight foundational truths that every single multi-million dollar trader adheres to without exception.",
      matrix: [
        {
          dimension: "1. Trade Only True Alpha Leaders (RS & ADR%)",
          badge: "Newtonian Momentum",
          points: [
            "Never trade laggards, turnaround hopes, or beaten-down deep-value stocks.",
            "Screen strictly for the top 1% to 2% strongest relative strength performers over 1M, 3M, and 6M timeframes.",
            "Demand an Average Daily Range (ADR%) of at least 4.0% to 5.0%+. Without daily volatility, generating 10R–20R+ swings within days is mathematically impossible."
          ]
        },
        {
          dimension: "2. Volume Is the Institutional Footprint",
          badge: "Hard Evidence",
          points: [
            "Before Breakout: Volume must dry up to a trickle (Volume Dry-Up / VDU) as price tightens into the base apex, proving supply is exhausted.",
            "On Breakout: Volume must violently expand (1.5x–3.0x+ daily run-rate, ZVR surge, or morning Volume Buzz), confirming massive institutional sponsorship.",
            "A breakout on light or tepid volume has a very high failure probability."
          ]
        },
        {
          dimension: "3. Asymmetric Expectancy Over Win Rate",
          badge: "Math of the Game",
          points: [
            "None of these traders strive for a 70% or 80% win rate; they operate comfortably with 20% to 40% win rates.",
            "The Law of Large Numbers dictates success: take small, controlled paper cuts (-0.5R to -1.0R) when wrong, while letting monster runners expand into +5R, +10R, +20R, or +50R+ payoffs.",
            "Expected Value (EV) = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)."
          ]
        },
        {
          dimension: "4. Hard Structural Stops Before Entry",
          badge: "Non-Negotiable Risk",
          points: [
            "Stops are never arbitrary; they are anchored to quantifiable chart structure: Low of the Day (LoD), Anchored VWAP, or tight sub-pivot shelves.",
            "Qullamaggie and Jeff Sun enforce Risk to LoD ≤ 60% ATR; Martin Luk enforces Stop ≤ 50% ADR; Dan Zanger enforces ~$1 sub-pivot.",
            "If the required structural stop is too wide, the trade is rejected—never widen your stop to accommodate a messy setup."
          ]
        },
        {
          dimension: "5. Multi-Tiered Profit Realization (Trim + BE)",
          badge: "Downside Elimination",
          points: [
            "Phase 1: Sell 20% to 35% into initial momentum strength (+3R to +5R, Day 3–5, or +15%–20% above pivot) to lock in realized profit cushion.",
            "Phase 2: Raise stop-loss on the remaining shares to Breakeven (BE). The trade is now mathematically risk-free.",
            "Phase 3: Let the remaining 50% to 70% core position surf the larger multi-week institutional trend."
          ]
        },
        {
          dimension: "6. Trailing Discipline on the Daily Close",
          badge: "Zero Intraday Guessing",
          points: [
            "Core runners are trailed along key rising moving averages (10 EMA, 20/21 EMA, or 10 SMA).",
            "The Hard Rule: Exits are evaluated strictly on the 4:00 PM daily close.",
            "Never panic sell intraday wicks below the moving average; institutional algorithms deliberately shake out weak retail stops before closing strong."
          ]
        },
        {
          dimension: "7. General Market Regime Lighting",
          badge: "The Tide That Lifts Boats",
          points: [
            "Green Light (QQQ/SPY above rising 10 & 20 EMA, 10 EMA > 20 EMA): Max exposure, full risk sizing, pedal to the metal.",
            "Yellow Light (Index closes below 10 EMA / breaks trend): Slash sizing by 50%, tighten stops, eliminate B-setups.",
            "Red Light (Index below 21 EMA / 50 SMA in distribution): Move to 80%–100% cash. No new breakout buys."
          ]
        },
        {
          dimension: "8. Extreme Portfolio Concentration",
          badge: "Focused Alpha",
          points: [
            "Holding 20 to 30 stocks is universally rejected as 'diworsification'.",
            "All 5 traders concentrate portfolio capital into 3 to 6 high-conviction market leaders (typically 15% to 25% allocation per position).",
            "Super-performance is generated by riding the single fastest horse in the strongest sector with maximum focus."
          ]
        }
      ],
      body: `
### The 8 Universal Pillars Architecture

When you strip away individual charting software, terminology, and setup names, all 5 champion traders execute the **exact same institutional operating system**.

The architecture operates across two synchronized engines: **Part I: Edge, Selection & Invalidation** (Pillars 1–4) and **Part II: Execution, Trailing & Portfolio Compounding** (Pillars 5–8).

---

### Part I: Edge, Selection & Invalidation (Pillars 1–4)

#### 1. Trade Only True Alpha Leaders (RS & ADR%)
> **The Immutable Law:** Never buy turnaround stories, beaten-down laggards, or low-volatility value stocks. Allocate 100% of risk capital into the top 1%–2% relative strength momentum leaders in winning industry themes.

* **Quantitative Hurdle:** Average Daily Range (**ADR%**) must be at least **4.0% to 5.0%+**, 1M/3M/6M Relative Strength in the 98th+ percentile, and daily dollar turnover ≥ $10M+.
* **The Mathematical Edge:** Inherent daily volatility is the indispensable fuel of rapid compounding. If a stock moves only 1.5% a day, capturing a +20% swing takes months. If ADR is 6%+, that same move takes 3 to 5 days.
* **Master Consensus:**
  * **Kristjan Qullamaggie:** Only scans stocks up 30% to 100%+ over the past 1–3 months that are consolidating near multi-month highs.
  * **Martin Luk:** Enforces a strict minimum 4.5% ADR and $10M turnover; rejects sluggish large-caps.
  * **Dan Zanger:** Hunts high-beta momentum movers with clean, frisky trading range and explosive volume history.

#### 2. Volume as the Institutional Footprint (VDU & Surge)
> **The Immutable Law:** Volume is the only indicator that cannot be faked. Look for extreme Volume Dry-Up (VDU) during base consolidation, followed by violent volume surges on breakout.

* **Quantitative Hurdle:** Base volume must shrink to 20%–50% of the 50-day average during tightness, then explode to **1.5x–3.0x+ daily run-rate** on the breakout pivot.
* **The Mathematical Edge:** Volume contraction proves available floating supply has been locked up by institutions. The subsequent breakout volume confirms institutional accumulation is actively underway.
* **Master Consensus:**
  * **Dan Zanger:** Uses the Zanger Volume Ratio (ZVR) to measure volume pace in the first 15–30 minutes against a 20-day time slice.
  * **Kristjan Qullamaggie:** Uses "Volume Buzz" at the opening bell. A stock trading 100% of its normal daily volume in the first 45 minutes signals an institutional Episodic Pivot.
  * **Jeff Sun:** Focuses on Relative Volume (RVOL) breaks on curated daily Focus List candidates.

#### 3. Asymmetric Expectancy Over Win Rate (EV > Hit Rate)
> **The Immutable Law:** Professional trading is not about being right often; it is about making an astronomical return when you are right and losing a pittance when you are wrong.

* **Quantitative Hurdle:** System average profit must target **+5R to +20R+**, while losses are capped strictly at **-0.5R to -1.0R**.
* **The Mathematical Edge:** A trader with a **30% win rate** who averages +10R on winners and -1R on losers achieves an astonishing Expected Value ($EV = 0.30 \times 10 - 0.70 \times 1 = +2.3R$ per trade).
* **Master Consensus:**
  * **All 5 Masters:** Unanimously agree that seeking a 70%–80% win rate forces traders into taking premature small profits and holding onto losers. Super-performance is powered by fat-tailed, right-skewed payoffs.

#### 4. Hard Structural Stops Before Entry (Quantifiable Invalidation)
> **The Immutable Law:** Never enter an order without an exact, non-negotiable price invalidation level anchored to chart structure. Mental stops and arbitrary percentage stops are strictly forbidden.

* **Quantitative Hurdle:** Stop distance must be anchored to quantifiable chart structure (Low of Day, Anchored VWAP, or sub-pivot shelf) and **must not exceed 60% of ATR or 50% of ADR**.
* **The Mathematical Edge:** If you do not pre-define the exact dollar invalidation level before you press buy, emotion and loss aversion will inevitably cause you to hold through devastating drawdowns.
* **Master Consensus:**
  * **Kristjan Qullamaggie:** Stops are placed strictly at the Low of the Day (LoD) or previous day's low.
  * **Martin Luk:** Adheres strictly to the Half-ADR rule (Stop ≤ 50% ADR); rejects any setup requiring a wide stop.
  * **Jeff Sun:** Computes LoD stop distance as a percentage of 14-day ATR (must be ≤ 60% of ATR).
  * **Dan Zanger:** Places hard stop approximately $1.00 below the breakout pivot; liquidates immediately if pivot fails.

---

### Part II: Execution, Trailing & Portfolio Compounding (Pillars 5–8)

#### 5. Multi-Tiered Profit Realization (Trim + Breakeven Cushion)
> **The Immutable Law:** Sell 20% to 35% into the initial expansion at +3R to +5R (or Day 3–5) and immediately move the stop loss on the remaining shares to Breakeven.

* **Quantitative Hurdle:** Realize 1/3 of the position on the initial multi-day runup to pay for all downside risk, then let the remaining 65%–80% ride risk-free.
* **The Mathematical Edge:** Once you bank +3R on 30% of your position and raise your stop to breakeven, **a losing trade is mathematically impossible**. The remaining core is free money surfing the multi-week institutional trend.
* **Master Consensus:**
  * **Kristjan Qullamaggie:** Sells 1/3 to 1/2 of position into strength on Day 3 to Day 5, and moves stop to breakeven.
  * **Martin Luk:** Realizes 25%–35% at +3R to +5R, moves stop to break-even, and preserves total mental peace.
  * **Jeff Sun:** Systematic first target at +2.5R (scales 1/3 and moves stop to BE); second target at +3.0R.
  * **Dan Zanger:** Sells 20%–30% of position at +15% to +20% gain into the initial surge above the pivot.

#### 6. Trailing Discipline on the Daily Close (Zero Midday Noise)
> **The Immutable Law:** Core runners are trailed along key rising moving averages (10 EMA or 20/21 EMA). Sell decisions are made strictly on the 4:00 PM daily close.

* **Quantitative Hurdle:** A position is held until a daily candlestick body closes below the designated trailing average (10 EMA for high momentum, 20/21 EMA for major trends).
* **The Mathematical Edge:** Intraday wicks are deliberately manipulated by algorithmic liquidity hunters to shake out retail stops. Evaluating exits strictly at the market close prevents premature shakeouts from multi-month 100%+ runners.
* **Master Consensus:**
  * **Kristjan Qullamaggie:** "The second you think you are smarter than the 10 & 20 day EMA, that's when you are doomed for mediocrity." Trailed strictly on the daily close.
  * **Martin Luk:** Trails core runners along the rising 21 EMA and Breakout Anchored VWAP. Liquidates only on close below.
  * **Dan Zanger:** Trails alongside the rising 10 SMA; holds as long as price maintains above the trend line.

#### 7. General Market Regime Lighting (Traffic Light Filter)
> **The Immutable Law:** Only trade with full aggression when the general market environment is in a confirmed uptrend (Green Light). In Yellow or Red lights, preserve capital aggressively.

* **Quantitative Hurdle:** Green Light requires QQQ & SPY to trade above their rising 10 & 20 EMAs (10 EMA > 20 EMA).
* **The Mathematical Edge:** When the general market is in a distribution phase (Red Light), over 80% of breakout setups fail regardless of individual chart quality. Cutting exposure in poor markets preserves both financial and mental capital.
* **Master Consensus:**
  * **Kristjan Qullamaggie:** Full exposure in market uptrends; stays mostly in cash during choppy or downtrending market regimes.
  * **Martin Luk:** Uses personal equity curve throttle: cuts trade risk in half immediately if portfolio draws down -3% to -5%.
  * **KovaView:** Market Regime is Dimension #1 in the 4-Dimension filter. No new buys if index is under pressure.

#### 8. Extreme Portfolio Concentration (Focused Alpha)
> **The Immutable Law:** Concentrate capital into 3 to 6 high-conviction market leaders (15% to 35% allocation each). Holding 20 to 30 stocks is universally rejected as "diworsification".

* **Quantitative Hurdle:** Concentrated portfolio of 3 to 6 positions maximum during peak market conditions.
* **The Mathematical Edge:** Super-performance is mathematically impossible when capital is spread across 25 mediocre names. Concentrating in the top 3–5 true market leaders delivers 10x the compounding velocity while remaining easy to monitor.
* **Master Consensus:**
  * **All 5 Masters:** Unanimously reject retail over-diversification. They identify the single fastest horse in the strongest sector and back it with conviction.

---

### The 8 Pillars Master Summary Table

| # | Universal Pillar | Core Rule & Execution | Quantitative Metric | Master Alignment |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Alpha RS Leadership** | Only buy top 1%–2% relative strength stocks in leading sectors; avoid laggards | ADR% ≥ 4.0%–5.0%+, RS Rank ≥ 98 | Qullamaggie, Luk, Kova, Sun, Zanger |
| **2** | **Institutional Volume** | Extreme VDU during base contraction, explosive volume surge on breakout pivot | Breakout Vol ≥ 1.5x–3.0x+ run-rate | Volume Buzz (QM), ZVR (Zanger), RVOL (Sun) |
| **3** | **Asymmetric Expectancy** | Prioritize +10R to +20R payoffs over win rate; embrace 25%–35% win rates | EV = (Win% × Win) - (Loss% × Loss) | Unanimous across all 5 Masters |
| **4** | **Structural Hard Stops** | Non-negotiable price invalidation anchored to chart structure mapped prior to buy | Stop ≤ 60% ATR or ≤ 50% ADR | LoD (QM/Sun), Half-ADR (Luk), Sub-Pivot (Zanger) |
| **5** | **Tiered Profit Scaling** | Sell 20%–35% into first surge at +3R to +5R and raise stop on balance to Breakeven | Locked 1/3 cushion = $0 downside risk | Martin Luk, Qullamaggie, Jeff Sun, Dan Zanger |
| **6** | **Daily Close Trailing** | Trail runners along rising 10/20 EMA or 10 SMA strictly on the 4:00 PM daily close | Sell only on close below line; ignore wicks | 10/20 EMA (QM/Luk/Kova), 10 SMA (Zanger) |
| **7** | **Market Regime Lighting** | Green Light market filter required for full exposure; cash in distribution | QQQ/SPY > 10 & 20 EMA, Traffic Lights | All 5 Masters |
| **8** | **Portfolio Concentration** | Concentrate into 3 to 6 high-conviction leaders (15%–35% each); avoid diworsification | 3–6 Positions Max (15%–35% each) | All 5 Masters reject holding 20+ small positions |

---

### The Core Epiphany: Asymmetry vs. Win Rate

Amateur traders spend 90% of their effort trying to increase their win rate from 50% to 70%. Super traders operate with peace of mind at a **30% win rate** because their risk-to-reward ratio is **1:10 or 1:20**.

If you lose \$500 on 7 trades (-\$3,500) and win \$6,000 on 3 trades (+\$18,000), your net profit is **+\$14,500** on a 30% win rate.
`
    },
    {
      id: "comp_profiles",
      number: "02",
      title: "Trader Profiles & Unique Edges: What Each Master Does Best",
      shortTitle: "2. Master Profiles",
      icon: "🎖️",
      summary: "Deep-dive analysis of what separates each of the 5 traders: the specific edge that powered their world records and championship wins.",
      indicators: [
        {
          name: "1. Kristjan Qullamaggie (@Qullamaggie)",
          users: "Volume Buzz & 10/20 EMA Trail",
          desc: "Master of early-morning momentum velocity and multi-month trend surfing.",
          bullets: [
            "Signature Setup: High Tight Flag (HTF) Breakout & Episodic Pivot (EP).",
            "Unique Edge: Reading opening 15-minute 'Volume Buzz' to catch institutional EPs at the open.",
            "Famous Dictum: 'The second you think you are smarter than the 10 & 20 day EMA, that\\'s when you are doomed for mediocrity.'"
          ]
        },
        {
          name: "2. Martin Luk (@MartinLuk)",
          users: "Stop Compression & AVWAP Retests",
          desc: "Master of mathematical asymmetry and 2024/2025 USIC Champion (+969.8%).",
          bullets: [
            "Signature Setup: 9/21 EMA & Anchored VWAP Break-and-Retest, Inside Day Compression.",
            "Unique Edge: Compressing stop-losses down to ≤1.5%–2.5% (Half-ADR rule) to turn standard 25% moves into +20R payoffs.",
            "Dynamic Throttle: Slashing position sizes in half immediately when account draws down -3% to -5%."
          ]
        },
        {
          name: "3. KovaView (@MichaelZTrading)",
          users: "4-Dimension Filter & Pyramiding",
          desc: "Master of institutional CAN SLIM quality funnels and progressive scaling.",
          bullets: [
            "Signature Setup: Minervini Volatility Contraction Pattern (VCP) & Low Cheat.",
            "Unique Edge: 50/30/20 Pyramiding architecture—never adding to a position unless it is showing profit cushion.",
            "Discipline: Strict 4-dimension matrix where Fundamentals, RS, Base, and Regime must all pass."
          ]
        },
        {
          name: "4. Jeff Sun, CFTe (@jfsrev)",
          users: "Statistical ATR Multiples & Focus List",
          desc: "16-year quantitative swing practitioner and multi-asset compounding fund manager.",
          bullets: [
            "Signature Setup: RVOL Focus List Breakouts & Spring-Coil Consolidations.",
            "Unique Edge: 50-day SMA ATR extension multiples (≤4x ATR Launchpad, 6x–8x ATR Extension Profit Zone).",
            "VARS Indicator: Normalizing relative strength against market volatility to eliminate high-beta false positives."
          ]
        },
        {
          name: "5. Dan Zanger (Chartpattern.com)",
          users: "Tape Reading & ZVR Surges",
          desc: "Audited world-record holder (+29,233% in 18 months, $10.7k to $42M).",
          bullets: [
            "Signature Setup: 11 Classic Chart Patterns (Cup with Handle, High Tight Flags, Wedges, Channels).",
            "Unique Edge: Time-sliced Zanger Volume Ratio (ZVR) surges and strict +5% buy-zone ceiling.",
            "Discipline: Zero indicators—relying entirely on pure price action, volume bars, and $1 sub-pivot stops."
          ]
        }
      ],
      body: `
### How to Choose Your Blend
Every trader must align their trading system with their personal psychology, lifestyle, and time availability:

1. **If you have full-time screen access during market open (9:30–10:30 AM EST):**
   - **Kristjan Qullamaggie & Dan Zanger** offer the fastest execution on morning Opening Range Highs (ORH) and volume surges.
2. **If you prefer entering on quiet pullbacks with micro-stops rather than chasing green breakouts:**
   - **Martin Luk's** 9/21 EMA and Anchored VWAP break-and-retest setup provides the highest R-multiple asymmetry with zero FOMO.
3. **If you want institutional fundamental backing and progressive scaling:**
   - **KovaView's** CAN SLIM + Minervini VCP framework with 50/30/20 pyramiding provides the most structured corporate quality screening.
4. **If you prefer statistical rules, quantitative ATR targets, and liquid ETFs:**
   - **Jeff Sun's** Focus List upgrade routine and 50-MA ATR extension targets provide objective mathematical clarity.
`
    },
    {
      id: "comp_stop_math",
      number: "03",
      title: "The Mathematics of Stop Compression: Why Micro-Stops Multiply Returns",
      shortTitle: "3. Stop Compression Math",
      icon: "🧮",
      summary: "Mathematical proof of why shrinking your stop-loss from 6% to 1.5% quadruples your R-multiple and transforms a 25% win rate into quadruple-digit compounding.",
      body: `
### The Power Law of Stop-Loss Compression

Why did Martin Luk score **+969.8%** in the US Investing Championship while most swing traders struggle to make 20%? The secret lies in the mathematics of **Stop-Loss Compression**.

#### The Core Mathematical Principle:
$$\\text{Realized R-Multiple} = \\frac{\\text{Stock Percentage Gain}}{\\text{Stop-Loss Percentage Distance}}$$

Consider a leading growth stock trading at **\$100.00** that breaks out and runs **+30% to \$130.00**:

| Trader Type | Initial Stop Distance | Stop Price | Shares Bought (\$1,000 Risk) | Dollar Profit on +30% Move | Realized R-Multiple | Portfolio Gain (1% Risk) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Conventional Swing** | **-6.0%** | \$94.00 | 166 shares | +\$4,980 | **+5.0 R** | **+5.0%** |
| **Moderate Breakout** | **-3.0%** | \$97.00 | 333 shares | +\$9,990 | **+10.0 R** | **+10.0%** |
| **Compressed Stop (Luk/QM)** | **-1.5%** | **\$98.50** | **666 shares** | **+\$19,980** | **+20.0 R** | **+20.0%!** |

---

#### The 3 Explosive Consequences of Stop Compression:
1. **4x Higher Returns for the Exact Same Stock Move:**
   - By compressing your stop from 6% to 1.5%, you buy 4 times as many shares for the exact same \$1,000 risk. When the stock runs +30%, you make **+\$19,980 instead of +\$4,980**!
2. **You Don't Need 100-Baggers to Compound Fortunes:**
   - A trader with a wide 8% stop needs a stock to triple (+200%) to hit a +25R trade.
   - A trader with a 1.5% compressed stop achieves **+20R on a standard +30% swing** that occurs dozens of times every quarter.
3. **Drastically Lower Required Win Rate:**
   - With an average win of +15R, a trader with a **25% win rate** generates a staggering profit factor of **5.0** (gaining 15R on 1 trade while losing 1R on 3 trades).

> *"The higher the return, the larger the absolute increase in R."* — **Martin Luk & Kyna Kosling**
`
    },
    {
      id: "comp_checklist",
      number: "04",
      title: "The Universal Super Trader Pre-Flight Checklist",
      shortTitle: "4. Universal Checklist",
      icon: "✅",
      summary: "Unified 10-point checklist synthesizing the non-negotiable rules across Qullamaggie, Martin Luk, KovaView, Jeff Sun, and Dan Zanger."
    },
    {
      id: "comp_calculator",
      number: "05",
      title: "Master Stop Compression & Multi-System R Simulator",
      shortTitle: "5. R-Multiple Simulator",
      icon: "🚀",
      summary: "Interactive simulator: compare realized R-multiples and position sizing across Compressed (1.5%), Standard (4.0%), and Conventional (7.0%) stops."
    }
  ]
};

