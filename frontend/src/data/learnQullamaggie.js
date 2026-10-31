// Kristjan Qullamaggie Complete Trading System Data
// Sources: Official Qullamaggie.com Methodology, Twitch Live Streams (2017-2024),
//          Chat with Traders Interview (Ep. 212), Swing Trading Masterclasses,
//          Pradeep Bonde (Stockbee) Mentorship, & Historical Trade Archive

export const QULLAMAGGIE_CONTENT = {
  hero: {
    badge: "KRISTJAN QULLAMAGGIE · SWING TRADING SYSTEM",
    title: "Breakouts, Episodic Pivots & The 10/20 EMA Momentum Playbook",
    subtitle: "How a Swedish Day Trader Compounded a Small Account into Over $100 Million",
    author: "By Kristjan Kullamägi (@Qullamaggie · qullamaggie.com)",
    description: "Trading high-momentum market leaders with asymmetric risk-to-reward. Master the 3 core setups (High Tight Flag Breakouts, Episodic Pivots, and Parabolic Climaxes), 1M/3M/6M relative strength screening, Opening Range High (ORH) execution, the non-negotiable <60% ATR LoD stop rule, and ruthless 10/20 EMA trailing discipline.",
    tags: [
      "1M/3M/6M Momentum Scanners",
      "High Tight Flags & Breakouts",
      "Episodic Pivots (EP)",
      "Parabolic Climaxes",
      "Opening Range High (ORH)",
      "<60% ATR LoD Risk Rule",
      "3-5 Day Partial Profit",
      "10 & 20 EMA Trailing Rule"
    ]
  },
  chapters: [
    {
      id: "kq_core_philosophy",
      number: "00",
      title: "The $100M+ Journey & Core Philosophy: Asymmetric Law of Large Numbers",
      shortTitle: "0. Core Philosophy",
      icon: "👑",
      summary: "From blowing up accounts repeatedly to generating an audited $100M+ fortune: why a 30% win rate is all you need when your winners are 10R to 50R+.",
      rules: [
        {
          title: "The Law of Large Numbers",
          badge: "Win Rate vs Expectancy",
          desc: "You don't need a high win rate to make tens of millions. A 25%–35% win rate is more than enough when your average loss is 0.5R to 1R and your monster winners return 5R, 10R, 20R, or even 50R+."
        },
        {
          title: "Trade the Alpha Leaders",
          badge: "Newtonian Momentum",
          desc: "The stocks that will go up the most in the next 1 to 3 months are the ones that have already gone up the most over the past 1, 3, and 6 months. Never trade sluggish value stocks; trade high ADR% market leaders."
        },
        {
          title: "Tight Risk at Inception",
          badge: "Asymmetric Edge",
          desc: "Only enter setups where your risk is tightly defined against the Low of the Day (LoD) or a tight multi-day pivot. If the stop distance exceeds 60% of daily ATR, pass immediately."
        },
        {
          title: "Respect the 10 & 20 Day EMA",
          badge: "Golden Trailing Rule",
          desc: "'The second you think you are smarter than the 10 & 20 day EMA, that's when you are doomed for mediocrity.' Never anticipate a breakdown; sell your core position only on the first daily close below the MA."
        }
      ],
      body: `
### From Repeated Account Blow-Ups to $100 Million+
Between 2011 and 2013, **Kristjan Kullamägi** blew up four trading accounts. He began by day trading penny stocks, chasing chat room alerts, and gambling on short-dated options without an edge or risk discipline.

The turning point came when he stopped looking for holy grail indicators and began studying the greatest stock market winners in history—reading **William O'Neil**, **Nicolas Darvas**, **Jesse Livermore**, and **Dan Zanger**, while learning directly from **Pradeep Bonde (Stockbee)**. He realized that every monster stock shares the exact same structural footprint:
1. An explosive initial price thrust (30% to 100%+ in weeks).
2. An orderly consolidation that lets the moving averages catch up while volume dries up.
3. A clean pivot point where risk can be capped at 1%–5% with the potential for 30%–300% upside.

By executing this framework consistently on live Twitch streams from 2017 to 2022, Kristjan grew his accounts from small five-figure stakes into **over $100 million in verified profits**.

> *"Trading is not about being right on every trade. It is about losing small paper cuts when you are wrong and making massive, account-altering returns when you catch a true leader."* — **Kristjan Qullamaggie**

---

#### The Core Mathematical Formula of Qullamaggie's Edge
$$\text{Expected Value (EV)} = (\text{Win Rate} \times \text{Avg Win}) - (\text{Loss Rate} \times \text{Avg Loss})$$

| Parameter | Retail Trader Perception | Qullamaggie Reality |
| :--- | :--- | :--- |
| **Win Rate** | 70% – 85% (Unrealistic) | **28% – 35%** (Realized) |
| **Average Loss** | -5% to -15% (Account killing) | **-0.5R to -1.0R** (Small paper cut) |
| **Average Winner** | +5% to +10% (Taking profits early) | **+5R to +25R+** (Letting runners surf 10/20 EMA) |
| **P&L Profile** | Choppy, prone to blow-ups | **Exponential staircase compounding** |
`
    },
    {
      id: "kq_scanners_selection",
      number: "01",
      title: "Stock Selection & Momentum Scanners: The Top 1%–2% Universe",
      shortTitle: "1. Scanners & Selection",
      icon: "🎯",
      summary: "How to filter 10,000+ US stocks down to the elite 50–100 highest-velocity leaders using 1M, 3M, and 6M momentum scans and high ADR% criteria.",
      matrix: [
        {
          dimension: "1. 1-Month Gainers (~21 Trading Days)",
          badge: "Velocity & Themes",
          points: [
            "Scans for the top 100 stocks up the most over the last 1 month.",
            "Detects explosive fresh themes, sudden biotech/tech sector breakouts, and early-stage momentum runners.",
            "Crucial for identifying emerging leaders before Wall Street analysts initiate coverage."
          ]
        },
        {
          dimension: "2. 3-Month Gainers (~63 Trading Days)",
          badge: "Intermediate Power",
          points: [
            "Scans for the top 100 stocks up the most over the last 3 months.",
            "Filters for established institutional sponsorship following blowout earnings reports.",
            "Captures stocks completing their first or second orderly base consolidation."
          ]
        },
        {
          dimension: "3. 6-Month Gainers (~126 Trading Days)",
          badge: "True Market Royalty",
          points: [
            "Scans for the top 100 stocks up the most over the last 6 months.",
            "Isolates the mega-winners of the current bull cycle (e.g. NVDA, SMCI, CELH during their runs).",
            "Highest conviction setups occur when a stock appears simultaneously on the 1M, 3M, and 6M scans."
          ]
        },
        {
          dimension: "4. Volatility & Liquidity Filters",
          badge: "Non-Negotiable Baseline",
          points: [
            "ADR% (20-day Average Daily Range) ≥ 4.0%–5.0%+: Without daily volatility, you cannot generate large R-multiples.",
            "Minimum Price: ≥ $2.00 (preferably ≥ $5.00) to avoid manipulative sub-dollar penny scams.",
            "Average Daily Volume: ≥ 100,000 shares (prefer daily dollar volume ≥ $5M–$10M+) for clean execution."
          ]
        }
      ],
      body: `
### The Momentum Universe Filtration Workflow
Qullamaggie does not look at random stocks or Wall Street news recommendations. Every single trade begins with a **systematic universe filter**:

\`\`\`
Total Stock Market (10,000+ stocks)
   ↓  Filter: Price ≥ $2.00, Vol ≥ 100k, ADR% ≥ 4.0%
Liquid Volatile Universe (~1,500 stocks)
   ↓  Run 1M, 3M, and 6M Performance Scans
Top Momentum Gainers (Top 75–100 per scan, deduplicated into ~150 names)
   ↓  Manual Chart Flip (10/20 EMA Alignment, Tight Bases, VDU)
Daily Focus List (3 to 10 Top Candidates with Defined Triggers)
\`\`\`

#### Moving Average Alignment (The Trend Template)
To qualify for a long breakout entry, a momentum leader must exhibit **bullish moving average alignment**:
- **Price > 10 EMA > 20 EMA > 50 SMA > 200 SMA**
- The **10-day EMA** represents short-term momentum.
- The **20-day EMA** represents intermediate swing trend support.
- The **50-day SMA** represents institutional benchmark accumulation.
- The **200-day SMA** represents the broad macro regime line.

Stocks trading below their 50-day or 200-day moving averages are disqualified from standard breakout buying.
`
    },
    {
      id: "kq_high_tight_flag",
      number: "02",
      title: "Setup 1: High Tight Flag & Consolidation Breakouts",
      shortTitle: "2. HTF & Breakouts",
      icon: "🚩",
      summary: "The bread-and-butter setup responsible for tens of millions in profits: anatomy of explosive poles, orderly flag pullbacks, and Volume Dry-Up (VDU).",
      rules: [
        {
          title: "The Explosive Pole",
          badge: "Prior Move",
          desc: "The stock must have made a powerful, explosive runup of +30% to +100%+ (or 200%+ for small caps) in the prior 1 to 8 weeks. Do not trade consolidations in sluggish, range-bound stocks."
        },
        {
          title: "Orderly Consolidation",
          badge: "Tight Pullback",
          desc: "The base should retrace no more than 15% to 25% from the peak. The pullback must be orderly, characterized by higher lows, symmetrical wedges, or tight horizontal channel pauses."
        },
        {
          title: "Surfing the 10 & 20 EMA",
          badge: "Moving Average Catch-Up",
          desc: "During the 2 to 8 weeks of consolidation, the price 'surfs' along the rising 10 EMA or dips slightly to the 20 EMA. Price compresses into a tight cluster right against resistance."
        },
        {
          title: "Volume Dry-Up (VDU)",
          badge: "Supply Depletion",
          desc: "As the flag tightens toward the apex/pivot, volume should dramatically decline below the 50-day average. A quiet, low-volume rest indicates sellers have exhausted their supply."
        }
      ],
      body: `
### Anatomy of the Perfect High Tight Flag Breakout

A High Tight Flag (HTF) is the single most explosive pattern in financial markets because it represents **institutional supply absorption**. When a stock doubles in price and refuses to pull back more than 15%–20%, it means large institutions are eagerly buying every share sellers offer.

\`\`\`
       Peak High
          /\
         /  \\  Orderly Flag (-15% to -20%)
        /    \\---/\\---/\\  ← Volume Dries Up (VDU)
Explosive    -------------  ← Pivot Trigger Line (ORH)
 Pole       ~~~~~~~~~~~~~  ← Surfing 10/20 EMA
(+50-100%)
  /
 /
/
\`\`\`

#### Key Characteristics of Winning Breakout Bases
1. **Duration**: 2 to 6 weeks is the sweet spot. Less than 10 days is often too immature (unless an explosive Power Play); more than 10 weeks risks turning into a sluggish multi-month base.
2. **Pivot Line**: Look for at least 2 to 4 touchpoints along resistance (horizontal shelf, descending wedge trendline, or flat channel).
3. **Volatility Contraction**: Daily candles must get smaller and tighter near the right side of the base (inside days, narrow bars).
4. **Volume Confirmation**: On the breakout session, volume must surge significantly above the prior quiet days (ideally 1.5x–2.0x+ daily run-rate).

#### Historical Case Study: TASR (Axon Enterprise) 2003–2004
> *"TASR went from 35 cents to 30 dollars—almost a 100-bagger in a year. This thing formed several high tight flags in succession. Every time it consolidated into the 10 and 20 day EMA on low volume, it exploded again. Learn this pattern inside and out."* — **Kristjan Qullamaggie**
`
    },
    {
      id: "kq_episodic_pivot",
      number: "03",
      title: "Setup 2: Episodic Pivot (EP) — The Institutional Paradigm Shift",
      shortTitle: "3. Episodic Pivot (EP)",
      icon: "⚡",
      summary: "Profiting from fundamental surprises: huge 10%+ gap-ups on monster volume buzz driven by earnings blowouts, guidance raises, and game-changing catalysts.",
      matrix: [
        {
          dimension: "1. The Unexpected Catalyst",
          badge: "Fundamental Shock",
          points: [
            "Blowout quarterly earnings: triple-digit EPS and revenue growth beating analyst estimates by wide margins.",
            "Huge forward guidance upgrade ('Beat-and-Raise').",
            "Revolutionary new product launch, multi-billion dollar enterprise contract, or FDA approval.",
            "Must be a structural surprise, not an anticipated event already priced into the stock."
          ]
        },
        {
          dimension: "2. The Gap-Up Footprint",
          badge: "Price Shock (10%+)",
          points: [
            "The stock opens with a massive gap-up of at least +10% to +20%+.",
            "Best EPs emerge from a dormant, multi-month base near cyclical lows rather than after an extended 300% run.",
            "A stock breaking out of a 6-month base on an EP has months of unspent institutional accumulation ahead."
          ]
        },
        {
          dimension: "3. Extreme Volume Buzz",
          badge: "Volume Footprint",
          points: [
            "Massive volume from the opening bell: stock often trades its entire 50-day average daily volume in the first 15–30 minutes.",
            "Relative Volume (RVOL) typically exceeds 3x to 10x normal levels.",
            "Institutions with billions in AUM cannot buy their required allocation in one day—the imbalance drives weeks of follow-through."
          ]
        },
        {
          dimension: "4. Execution Tactics",
          badge: "Opening Range High",
          points: [
            "Enter on the breakout of the 1-minute, 5-minute, or 60-minute Opening Range High (ORH).",
            "Stop-loss placed at the Low of the Day (LoD).",
            "Alternative entry: Delayed EP (enter on 2–5 day consolidation flag after the initial gap session)."
          ]
        }
      ],
      body: `
### What Is an Episodic Pivot (EP)?
Coined by **Pradeep Bonde (Stockbee)** and perfected by **Kristjan Qullamaggie**, an **Episodic Pivot** is an explosive gap-up that marks a fundamental **regime shift** in a company's trajectory.

When a company produces a massive earnings beat or announces a transformative product, institutional valuation models are instantly shattered. Portfolio managers must scramble to establish multi-million share positions over weeks and months, creating persistent upward drift.

\`\`\`
                  Breakout Continuation ↗
                  /\\---/\\ (Day 2-5 Consolidation)
          Gap Up [██]  ← Day 1 ORH Breakout (Huge Volume Buzz)
          (+10%+) |
                  |
Dormant Base  ====+
(3 to 6 Months)
\`\`\`

#### The Two Ways to Trade an Episodic Pivot
1. **Day-1 ORH Breakout**:
   - Pre-market: Identify top gappers (>10%) with blowout quarterly numbers.
   - At 9:30 AM open: Monitor the 1-minute and 5-minute candles.
   - Entry: Buy as price breaks above the Opening Range High (ORH) with a stop at Low of the Day (LoD).
   - If the morning range is too wide (>60% ATR), wait for an intraday pullback and buy the subsequent higher low.

2. **Day 2–5 Delayed Consolidation (The Flag Entry)**:
   - If Day 1 was too volatile or extended, put the EP winner on your Focus List.
   - Allow the stock to digest the initial move for 2 to 5 sessions, forming a tight flag on declining volume.
   - Enter on the secondary breakout above the flag resistance with a tight stop at the consolidation low.
`
    },
    {
      id: "kq_parabolic",
      number: "04",
      title: "Setup 3: Parabolic Short & Long — Fading Climax Extremes",
      shortTitle: "4. Parabolic Climaxes",
      icon: "🌋",
      summary: "How to safely trade explosive climax moves: shorting vertical exhaustion blow-offs and catching violent capitulation bounces with asymmetric risk.",
      rules: [
        {
          title: "Parabolic Short Criteria",
          badge: "Vertical Blow-Off",
          desc: "Target stocks up 50%–100%+ in 3 to 5 consecutive days (large cap) or 150%–300%+ (small/mid cap). Price must be stretched ≥ 20%–40%+ above the rising 10 EMA on extreme climax volume."
        },
        {
          title: "Wait for the Exhaustion Trigger",
          badge: "Reversal Signal",
          desc: "Never short into a rising parabolic green candle. Wait for the FIRST high-volume exhaustion red day or a breakdown below the previous day's low or Opening Range Low (ORL)."
        },
        {
          title: "Stop at High of the Day (HoD)",
          badge: "Strict Risk",
          desc: "Place the stop loss strictly at the High of the Day (HoD). If the stock breaks HoD, cover immediately without hesitation—climax runners can squeeze beyond all rational valuation."
        },
        {
          title: "Quick Multi-Day Cover Target",
          badge: "Fast Profit Taking",
          desc: "Parabolic shorts are quick mean-reversion trades, not long-term investments. Cover the entire position after 2 to 4 days into a sharp drop toward the 10 EMA or 20 EMA."
        }
      ],
      body: `
### Parabolic Short Anatomy
When a momentum stock goes parabolic, retail FOMO and aggressive short-squeezes drive the price up at an unsustainable 80-degree angle. Eventually, the buying pool exhausts, creating a violent downward cascade.

\`\`\`
       Climax Top (Exhaustion Volume)
            /\\
           /  \\  ← Reversal Day: Breakdown below Prior Day Low / ORL
          /    \\   (Stop at High of Day)
         /      \\
        /        \\  Target: 2-4 Day Mean Reversion to 10/20 EMA
Vertical Advance  V
(3-5 Days, +50-200%)
  |
  |  Stretched >20-40% above 10 EMA
\`\`\`

#### Rules for Trading the Parabolic Short
1. **Never Front-Run the Top**: Shorting an intact vertical move is financial suicide. Wait for evidence that the buyers have failed (topping tail, red candle, break of previous day low).
2. **Execution Timing**: Best entries occur on the breakdown of the 5-minute or 15-minute Opening Range Low (ORL) on the first red session.
3. **Target & Exit**: Cover 50% on Day 1 into the flush; cover the remainder when price tags the rising 10 EMA or 20 EMA (typically Day 2–4).

---

### Parabolic Long (Capitulation Reversal)
The exact inverse setup: a stock down 3 to 5 consecutive red days, dropping -30% to -60% and stretched ≥ 20% below the 10 EMA on panicky capitulation volume.
- **Entry**: Buy the first green reversal bar or 5-minute ORH breakout.
- **Stop**: Low of the Day (LoD).
- **Target**: Quick snapback bounce toward the declining 10 EMA.
`
    },
    {
      id: "kq_execution_tactics",
      number: "05",
      title: "Execution Tactics: ORH Entries, LOD Stops & The <60% ATR Rule",
      shortTitle: "5. Execution Tactics",
      icon: "⚡",
      summary: "The precise mechanics of entering trades: 1m/5m/60m Opening Range Highs, Low of Day stops, and the non-negotiable <60% ATR risk guardrail.",
      indicators: [
        {
          name: "1-Minute Opening Range High (1m ORH)",
          users: "Fast Execution",
          desc: "The high of the very first 1-minute candle (9:30–9:31 AM EST).",
          bullets: [
            "Best suited for high-liquidity stocks and explosive Episodic Pivots with extreme premarket volume.",
            "Provides the earliest possible fill and the tightest initial stop.",
            "Requires fast execution software and discipline to cut immediately on false starts."
          ]
        },
        {
          name: "5-Minute Opening Range High (5m ORH)",
          users: "Standard Gold Baseline",
          desc: "The high of the first 5-minute candle (9:30–9:35 AM EST).",
          bullets: [
            "Qullamaggie's default execution timeframe for standard consolidation breakouts.",
            "Filters out the opening 60 seconds of retail market noise and wide bid-ask spreads.",
            "Stop is placed at the low of the 5-minute candle or the Low of the Day (LoD)."
          ]
        },
        {
          name: "60-Minute Opening Range High (60m ORH)",
          users: "Noise Elimination",
          desc: "The high of the first 30–60 minutes of trading (9:30–10:00 or 10:30 AM EST).",
          bullets: [
            "Ideal for larger capitalization stocks and swing positions where daily confirmation is preferred.",
            "Significantly higher win rate, but results in wider stops and smaller share sizing."
          ]
        },
        {
          name: "The <60% ATR LoD Risk Rule",
          users: "Non-Negotiable Risk Filter",
          desc: "The distance from your entry price to the Low of the Day (LoD) MUST be ≤ 60% of the stock's Average True Range (ATR).",
          bullets: [
            "$$\\text{Risk Distance} = \\text{Entry Price} - \\text{LoD Stop Price}$$",
            "$$\\text{Risk \\% of ATR} = \\frac{\\text{Risk Distance}}{\\text{Daily ATR (14)}} \\times 100 \\le 60\\%$$",
            "If the stop distance exceeds 60% of ATR, the trade is mathematically INVALID—wait for a tighter intraday pause or pass."
          ]
        }
      ],
      body: `
### Why the Low of Day (LoD) Is the Only Logical Stop
When a genuine institutional breakout occurs, the opening dip represents the lowest price buyers were willing to let sellers push the stock. Once buyers overpower supply and break out above the Opening Range High (ORH), **the stock should never violate that morning low**.

If price drops back below the Low of the Day, the breakout has failed. Holding and hoping for a bounce is the hallmark of amateur trading.

\`\`\`
       Breakout Trigger (ORH) ───► Buy Entry Here
        |                      ▲
        |                      │  Stop Distance (Risk)
        |                      │  MUST be ≤ 60% of Daily ATR!
       Morning Dip (LoD) ──────┴── Stop Loss Placed Here (Exit if breached)
\`\`\`

#### What If the Stop Is Too Wide (>60% ATR)?
Frequently on volatile momentum names, a morning breakout bar will shoot up so fast that the distance to LoD is 100% or 150% of the daily ATR. 

In this scenario:
1. **DO NOT CHASE**: Buying an extended move with a wide stop destroys your risk-to-reward ratio. Reaching a +3R profit would require an impossible 4.5x ATR single-day move.
2. **Wait for Intraday Consolidation**: Allow the stock to consolidate for 30 to 90 minutes. It will often form an intraday bull flag or higher low.
3. **Use the Higher Low**: You can now enter the secondary push with your stop placed at the new, tighter higher low (which is now comfortably <60% ATR).
`
    },
    {
      id: "kq_trade_management",
      number: "06",
      title: "Post-Execution Trade Management: 3-5 Day Rule & The 10/20 EMA Trail",
      shortTitle: "6. Trade Management",
      icon: "📈",
      summary: "How to extract maximum profits without guesswork: the 3-5 day partial profit rule, moving stops to breakeven, and surfing runners on the 10/20 EMA.",
      pyramid: [
        {
          tranche: "STEP 1: 3-5 DAY PARTIAL TRIM",
          size: "Sell 1/3 to 1/2 Position",
          trigger: "3 to 5 Days After Breakout",
          desc: "Momentum bursts typically pause or pull back after 3 to 5 sessions. Sell 1/3 to 1/2 into strength to lock in +3R to +5R profit cushion and eliminate downside anxiety."
        },
        {
          tranche: "STEP 2: MOVE STOP TO BREAKEVEN",
          size: "Risk Becomes Exactly $0",
          trigger: "Immediately After Partial Trim",
          desc: "Raise the stop on the remaining 1/2 to 2/3 position to your exact entry price (breakeven). Once executed, you can no longer lose money on this trade."
        },
        {
          tranche: "STEP 3: TRAIL RUNNER ON 10/20 EMA",
          size: "Remaining 1/2 to 2/3 Position",
          trigger: "First Daily Close Below 10 or 20 EMA",
          desc: "Hold the core position as long as it respects the rising moving average. Sell ONLY on the first daily close below the 10 EMA (for fast leaders) or 20 EMA (for core trends)."
        }
      ],
      body: `
### The 3-Step Trade Management Playbook
Managing a winning trade requires balancing two competing forces:
1. **The need for profit cushion**: Taking partial profits early to prevent giving back gains during sudden reversals.
2. **The need for home-run winners**: Letting a large chunk of the position ride the full institutional trend for weeks or months.

Qullamaggie solved this with a **systematic 3-step sequence**:

\`\`\`
Day 1: Breakout Entry (Stop at LoD, Risk = 1R)
   ↓
Day 3 to 5: Strong push higher (+3R to +5R)
   → Sell 1/3 to 1/2 of position into strength!
   → Move stop on remainder to Breakeven (Entry Price).
   ↓
Day 6+: The trade is completely risk-free.
   → Switch to 10 EMA (fast) or 20 EMA (slower) daily trailing stop.
   → Exit remaining shares ONLY on the first daily close below the moving average.
\`\`\`

---

#### The Golden Trailing Rule
> *"The second you think you are smarter than the 10 & 20 day moving average, that's when you are doomed for mediocrity. Trust me, I talk from experience."* — **Kristjan Qullamaggie**

#### Critical Trailing Principles:
- **Never sell during market hours just because price dips below the line**: The moving average rule applies strictly to the **4:00 PM daily close**. Stocks frequently dip below the 10 EMA intraday to shake out weak hands before closing right back above it.
- **Which MA should you use?**
  - **10-day EMA**: For high-flying, super-fast momentum leaders (ADR% > 7%). When they lose the 10 EMA, the violent momentum phase has ended.
  - **20-day EMA**: For established, larger-cap leaders (ADR% 3%–6%) and general market swings. Gives more room for normal back-and-forth digestion.
`
    },
    {
      id: "kq_market_regime",
      number: "07",
      title: "Market Pulse & Regime Timing: When to Step on the Gas",
      shortTitle: "7. Market Pulse & Regime",
      icon: "🚦",
      summary: "Timing the broader market tide: why 80% of your annual gains happen in 2-3 months, tracking QQQ/SPY 10/20 EMAs, and capital preservation in chop.",
      matrix: [
        {
          dimension: "1. Confirmed Uptrend (Green Light)",
          badge: "Pedal to the Metal",
          points: [
            "QQQ & SPY trading above their rising 10 EMA and 20 EMA.",
            "10-day EMA is above the 20-day EMA (10 EMA > 20 EMA) and both sloping upward.",
            "Market breadth expanding; breakouts follow through consistently with high win rates.",
            "Action: Max aggressive sizing (100% invested or margin), full 0.5%–1.0% equity risk per trade."
          ]
        },
        {
          dimension: "2. Early Warning / Pullback (Yellow Light)",
          badge: "Cautious Sizing",
          points: [
            "Major index closes below its 10-day EMA or breaks a short-term rising trendline.",
            "Leading stocks begin stalling, failing breakouts, or producing heavy distribution volume.",
            "Action: Cut position sizing by 50%, tighten trailing stops, take partial profits quickly, eliminate B-quality setups."
          ]
        },
        {
          dimension: "3. Confirmed Downtrend / Distribution (Red Light)",
          badge: "Cash Is King",
          points: [
            "Indices trade below declining 20-day EMA and 50-day SMA.",
            "Clusters of institutional distribution days across SPY and QQQ.",
            "Breakouts suffer immediate failures and whipsaws.",
            "Action: Move to 80%–100% cash. No new breakout buys. Sit on hands or selectively trade small Parabolic Shorts."
          ]
        },
        {
          dimension: "4. The 80/20 Distribution of Annual Gains",
          badge: "Patience & Preservation",
          points: [
            "Kristjan emphasizes that 80% to 90% of your annual trading profits are made during 2 or 3 explosive multi-week market waves.",
            "During the remaining 8–9 months of chop and correction, your only job is to protect your capital and maintain mental clarity.",
            "Giving back 50% of your bull market profits in choppy tape is what keeps most traders from ever compounding wealth."
          ]
        }
      ],
      body: `
### The Market Tide Determines All Boat Elevations
Even the most perfect High Tight Flag or Episodic Pivot has a high failure rate if launched into a market facing heavy institutional distribution. 

Qullamaggie uses a simple, unambiguous benchmark for market regime: **the Nasdaq 100 (QQQ) and S&P 500 (SPY) relative to their 10 and 20 EMAs**.

\`\`\`
                ▲
               / \\   Green Light: Index > 10 EMA > 20 EMA
              /   \\  (Pedal to the Metal, full risk sizing)
             /     \\
═════════════       ═══════════════════════════════════════════
                    \\     Yellow Light: Close below 10 EMA (Tighten)
                     \\
                      \\   Red Light: Index < 20 EMA & 50 SMA (Cash is King!)
                       ▼
\`\`\`

#### Daily Market Check Ritual
Before opening a single trade in the morning:
1. Look at the daily chart of **QQQ** and **SPY**.
2. Are they above both the 10 EMA and 20 EMA?
3. Did the leading momentum stocks from yesterday follow through, or did they gap up and reverse red?
4. If the market environment is negative, **close your trading software and walk away**. The best trades of your career will come when the market confirms a fresh follow-through day.
`
    },
    {
      id: "kq_routine",
      number: "08",
      title: "The Elite Trader's Routine: Daily Workflow & Focus List Preparation",
      shortTitle: "8. Daily Workflow",
      icon: "🧭",
      summary: "Step-by-step daily trading habits: flipping 800+ charts post-market, pre-market catalyst scanning, volume buzz alerts, and trade journaling.",
      passes: [
        {
          step: "1. Post-Market Scan (4:15 PM – 5:30 PM)",
          count: "800+ Charts",
          desc: "Run 1M, 3M, and 6M gainers scans. Quickly flip through charts looking for tight consolidations, higher lows, and volume drying up near 10/20 EMAs."
        },
        {
          step: "2. Build Tomorrow's Focus List (8:00 PM)",
          count: "3 to 10 Tickers",
          desc: "Select only the cleanest setups. Note exact pivot resistance trigger prices, check earnings dates (never hold into imminent earnings), and set price alerts."
        },
        {
          step: "3. Pre-Market Intelligence (8:30 AM – 9:20 AM)",
          count: "Catalyst Check",
          desc: "Scan for top percentage gappers (>10%). Read PR wires for earnings blowouts, guidance upgrades, or drug trials to identify potential Episodic Pivots."
        },
        {
          step: "4. Market Open Execution (9:30 AM – 10:30 AM)",
          count: "High Focus Window",
          desc: "Watch 1m and 5m ORH breakouts on the Focus List. Execute without hesitation when price breaks ORH with expanding volume and LoD risk ≤ 60% ATR."
        },
        {
          step: "5. Market Close Review (3:45 PM – 4:00 PM)",
          count: "MA Evaluation",
          desc: "Evaluate open positions against the 10 EMA or 20 EMA close. Take partial profits on Day 3-5 winners, move stops to BE, and exit any positions closing below MA."
        }
      ],
      body: `
### Consistency in Routine Breeds Consistency in P&L
Kristjan's incredible performance was not born from superhuman intellect; it was the result of **relentless, mechanical daily execution**.

> *"You have to flip through thousands of charts until your eyes bleed. You need to see the setups in your sleep. When the opening bell rings, you shouldn't be thinking or deliberating—you are simply executing a plan prepared the night before."* — **Kristjan Qullamaggie**

#### Golden Rules of the Routine
- **Never buy a stock you didn't plan for before the open**: Impulsive, reactive buying of random tickers running across social media feeds is the #1 cause of unforced capital drawdowns.
- **Know your exact share size before entering**: Use the Position Sizing formula to determine your exact share count so you never pause to do mental math at the moment of execution.
- **Log every trade in your journal**: Record the setup type, entry price, initial LoD stop, ATR percentage, market regime light, and the screenshot of the daily and 5-minute charts.
`
    },
    {
      id: "kq_checklist",
      number: "09",
      title: "Interactive Qullamaggie Pre-Trade Checklist",
      shortTitle: "9. Pre-Trade Checklist",
      icon: "✅",
      summary: "Mandatory pre-flight checklist: verify all 10 non-negotiable Qullamaggie rules before risking a single dollar on a breakout trade."
    },
    {
      id: "kq_calculator",
      number: "10",
      title: "Interactive Position Sizing & 10/20 EMA Profit Calculator",
      shortTitle: "10. Sizing Calculator",
      icon: "🧮",
      summary: "Calculate exact share sizing based on LoD stop distance, verify the <60% ATR guardrail, and generate your 3-5 day partial exit and 10/20 EMA trail plan."
    }
  ]
};
