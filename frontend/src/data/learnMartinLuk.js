// Martin Luk Complete Trading System Data
// Sources: U.S. Investing Championship (USIC) Official Records (+283.1% in 2024, +969.8% in 2025),
//          TraderLion In-Depth Video Breakdowns with Richard Moglen,
//          Trading Resource Hub / Substack Case Studies by Kyna Kosling,
//          and Martin Luk (@MartinLuk / @martinluktrades) Strategy Archives

export const MARTIN_LUK_CONTENT = {
  hero: {
    badge: "MARTIN LUK · USIC CHAMPION PLAYBOOK",
    title: "Stop-Loss Compression, 9/21 EMA Pullbacks & Anchored VWAP",
    subtitle: "How a 22-Year-Old Scored +283.1% (2024) and +969.8% (2025) in the U.S. Investing Championship",
    author: "By Martin Luk (@MartinLuk · USIC Champion)",
    description: "Capital preservation over prediction. A mathematical masterclass in turning a 20%–25% win rate into quadruple-digit compounding. Master compressed micro-stops (≤1.5%–2.5%), the math of exponential R-multiples, 9 & 21 EMA pullback confluences, Anchored VWAP (AVWAP) institutional support shelves, and equity-curve-driven risk modulation.",
    tags: [
      "+283% (2024) & +969% (2025) USIC",
      "Stop-Loss Compression",
      "Exponential R-Multiples",
      "9 & 21 EMA Pullbacks",
      "Anchored VWAP (AVWAP)",
      "Inside Day Compressions",
      "Equity Curve Feedback",
      "High ADR% Momentum"
    ]
  },
  chapters: [
    {
      id: "ml_philosophy",
      number: "00",
      title: "From 50% Drawdown to +969.8% USIC Win: The Math of Stop Compression",
      shortTitle: "0. Core Philosophy",
      icon: "🏆",
      summary: "How bouncing back from a catastrophic 2021 meme stock drawdown led to mastering stop-loss compression, where shrinking risk from 5% to 1.5% quadruples your R-multiple.",
      rules: [
        {
          title: "Capital Preservation Over Prediction",
          badge: "Zero Forecasting",
          desc: "You cannot predict where the market or an individual stock will go next; you can only control how much you lose when you are wrong. Trading is risk management disguised as stock picking."
        },
        {
          title: "The Math of Stop-Loss Compression",
          badge: "Exponential R-Edge",
          desc: "'The higher the return, the larger the absolute increase in R.' Reducing your stop-loss from 5% down to 1.5% transforms a standard +30% price advance from a modest +6R win into a game-changing +20R windfall."
        },
        {
          title: "Low Win-Rate Tolerance",
          badge: "20%–25% Win Rate",
          desc: "Accept that 7 out of 10 trades will be scratch breakevens or small 1R paper cuts. A 20%–25% win rate is more than sufficient to generate hundreds of percent in annual returns when your winners return 10R to 35R+."
        },
        {
          title: "Equity Curve Modulation",
          badge: "Dynamic Risk Throttle",
          desc: "Let your personal equity curve dictate your aggression. Ramp exposure when trades are clicking and profit cushion builds; immediately slash size in half during drawdowns."
        }
      ],
      body: `
### The Genesis: Learning Through Real Market Pain
In 2020, at age 18, **Martin Luk** opened his first brokerage account. Lacking a structured framework, he chased speculative meme stocks (GME, AMC) and short-dated options during the retail speculative frenzy. When the 2021 growth stock bear market struck, his account suffered a devastating **50%+ drawdown**.

Rather than quitting, Luk immersed himself in the principles of elite momentum practitioners—studying **Kristjan Qullamaggie**, **Mark Minervini**, **William O'Neil**, and **Jesse Livermore**. He realized that conventional trading advice (e.g. standard 5%–8% stop losses) created mediocre risk-reward profiles that struggled to survive inevitable choppy whipsaws.

By rebuilding his methodology around **micro-stop precision (1%–2.5%)**, **Anchored VWAP confluence**, and **orderly pullback timing**, he achieved verified, audited world-class milestones in the prestigious **U.S. Investing Championship (USIC)**:
- **2024 USIC:** Finished with **+283.1% return** (Top of Stock Division).
- **2025 USIC:** Crowned champion with an astonishing **+969.8% return** (Scaling over 10x in 12 months).

---

#### The Mathematical Engine: Why Stop-Loss Compression Dominates
Consider an identical market leader making a **+30% swing advance**:

| Metric | Conventional Swing Trader | Martin Luk Compressed Stop |
| :--- | :--- | :--- |
| **Stock Entry Price** | $100.00 | $100.00 |
| **Stop-Loss Price** | $94.00 (-6.0% stop) | **$98.50 (-1.5% stop)** |
| **Risk per Share ($1R)** | $6.00 | **$1.50 (4x Tighter)** |
| **Exit Price (+30%)** | $130.00 (+$30.00 gain) | $130.00 (+$30.00 gain) |
| **Realized R-Multiple** | **+5.0R** ($30.00 / $6.00) | **+20.0R** ($30.00 / $1.50) |
| **Account Impact (1% Risk)** | **+5.0% Portfolio Gain** | **+20.0% Portfolio Gain!** |

> *"Most people look for stocks that will move 100%. I look for stocks where I can risk 1.5% to make 20%–30%. When you compress your stop down to 1%–2%, you don't need a monster 100-bagger to make 15R to 25R. The math does the heavy lifting for you."* — **Martin Luk**
`
    },
    {
      id: "ml_selection",
      number: "01",
      title: "Stock Selection & Scanning: High ADR% & Sector Theme Clusters",
      shortTitle: "1. Selection & ADR%",
      icon: "🎯",
      summary: "Filtering the entire market for high-beta momentum leaders: why ADR% ≥ 5.0% is non-negotiable and how to spot institutional sector cluster moves.",
      matrix: [
        {
          dimension: "1. Volatility Threshold: ADR% ≥ 4.5%–5.0%+",
          badge: "Non-Negotiable",
          points: [
            "20-day Average Daily Range (ADR%) must be at least 4.5% to 5.0%+.",
            "Stocks with 2%–3% ADR cannot provide the rapid price velocity required for high R-multiple expansion.",
            "High ADR allows an explosive runner to travel 10%–20% in just 2 to 4 sessions, hitting +5R to +10R with ease."
          ]
        },
        {
          dimension: "2. Relative Strength Performance Scans",
          badge: "1M / 3M / 6M Leaders",
          points: [
            "Scan for the top 1% to 2% gainers over 1-month (~21 days), 3-month (~63 days), and 6-month (~126 days) intervals.",
            "Focus on candidates trading near 52-week highs while the broader market indices are pulling back or consolidating.",
            "Stocks exhibiting zero downside correlation during market red days are prime targets for immediate upside explosion."
          ]
        },
        {
          dimension: "3. Sector & Theme Confluence ('Clustering')",
          badge: "Institutional Footprint",
          points: [
            "Never trade an isolated, lone runner in an obscure industry.",
            "Demand institutional 'clustering': 3 to 6 stocks from the same industry group appearing on gainers scans simultaneously.",
            "When institutions accumulate an entire theme (e.g. AI power, cybersecurity, biotech, nuclear energy), the tailwind lifts all leaders."
          ]
        },
        {
          dimension: "4. Liquidity & Spread Protection",
          badge: "Clean Execution",
          points: [
            "Minimum stock price: ≥ $5.00 (eliminates erratic micro-penny spread traps).",
            "Average daily volume: ≥ 200,000 shares.",
            "Daily dollar volume turnover: ≥ $10,000,000+ ($10M) to ensure stops trigger without catastrophic slippage."
          ]
        }
      ],
      body: `
### The Daily Scanning Pipeline
Martin Luk operates with a structured, repeatable evening scanning workflow:

\`\`\`
Entire US Equity Universe (10,000+ stocks)
   ↓  Apply Liquidity Filter: Price ≥ $5.00, Vol ≥ 200k, Turnover ≥ $10M
Liquid Universe (~1,800 stocks)
   ↓  Apply Volatility Filter: ADR% (20d) ≥ 4.5%–5.0%+
High-Beta Growth Universe (~500 stocks)
   ↓  Run 1M, 3M, 6M Gainers Scans & Sector Group Rankings
Relative Strength Leaders (~75 stocks)
   ↓  Manual Chart Screen: 9/21 EMA Alignment, AVWAP Support, Base Quality
Daily Watchlist (5 to 12 Top Priority Candidates)
\`\`\`

#### Why ADR% Governs Everything in Luk's Sizing
If a stock moves an average of 2.0% per day, placing a 1.5% stop loss means you are sitting well within normal daily noise (75% of ADR). You will be stopped out constantly.

Conversely, on a stock with **6.0% ADR**, a 1.5% stop loss represents only **25% of the daily range (1/4 ADR)**. When timed precisely at an intraday inflection level (such as an anchored VWAP retest or morning ORH), the stock has ample room to expand without touching the stop.
`
    },
    {
      id: "ml_indicators",
      number: "02",
      title: "Technical Arsenal: The 9 & 21 EMA Ribbon and Anchored VWAP",
      shortTitle: "2. Technical Arsenal",
      icon: "📊",
      summary: "Deconstructing Luk's chart template: why the 9 EMA and 21 EMA define dynamic trend momentum and how Anchored VWAP (AVWAP) reveals true institutional cost basis.",
      indicators: [
        {
          name: "1. 9-Day Exponential Moving Average (9 EMA)",
          users: "Fast Momentum Guide",
          desc: "Measures immediate short-term momentum and price velocity.",
          bullets: [
            "In high-powered momentum runners, price hugs the rising 9 EMA without violating it for days.",
            "A shallow pullback that touches the rising 9 EMA and prints a reversal wick is the earliest low-risk entry opportunity.",
            "Slope is paramount: only buy pullbacks when the 9 EMA is steeply curling upward."
          ]
        },
        {
          name: "2. 21-Day Exponential Moving Average (21 EMA)",
          users: "Core Swing Trendline",
          desc: "The primary intermediate trend guardrail and swing trailing line.",
          bullets: [
            "Acts as major dynamic support during multi-week consolidations and orderly base digestion.",
            "Represents the core trailing stop: remaining position is held as long as daily candles close above the rising 21 EMA.",
            "A stock breaking below a flat or declining 21 EMA on heavy volume is disqualified from buying."
          ]
        },
        {
          name: "3. Anchored VWAP (AVWAP)",
          users: "Institutional Cost Basis",
          desc: "Calculates the Volume Weighted Average Price anchored to a specific catalytic event.",
          bullets: [
            "Anchor #1: Breakout Day (start of the current impulsive move).",
            "Anchor #2: Episodic Pivot / Earnings Gap-Up bar.",
            "Anchor #3: Major Structural Swing Low (market cycle pivot).",
            "Confluence Power: When AVWAP converges with the rising 9 or 21 EMA, it creates an impenetrable institutional defense line."
          ]
        }
      ],
      body: `
### The Power of Indicator Confluence
Martin Luk avoids cluttering his screen with oscillators, MACD, or RSI. He relies on **price, volume, moving averages, and Anchored VWAP**.

\`\`\`
Price Advance ↗
              \
               \   Pullback into Confluence Zone
                \
═════════════════●═══════════════════  ← Rising 9 EMA
                 |
-----------------●-------------------  ← Anchored VWAP (from Breakout)
                 |
~~~~~~~~~~~~~~~~~●~~~~~~~~~~~~~~~~~~~  ← Rising 21 EMA
\`\`\`

#### Why Anchored VWAP Is an Unfair Advantage
Standard moving averages weight only time and price. **Anchored VWAP incorporates institutional share volume**. 

When a stock gaps up on massive volume after earnings, the Anchored VWAP from that gap session represents the **exact average price paid by all institutional buyers** since the catalyst occurred. When the stock pulls back to that line weeks later, institutions actively protect their entry price, creating explosive bounces with minimal downside risk.
`
    },
    {
      id: "ml_setups",
      number: "03",
      title: "The 3 Signature Setups: EMA Pullbacks, Inside Days & EP Shelves",
      shortTitle: "3. Signature Setups",
      icon: "🎯",
      summary: "Mastering Martin Luk's three core patterns: the 9/21 EMA & AVWAP Pullback, the Inside Day Compression, and the Episodic Pivot 2–5 Day Shelf.",
      matrix: [
        {
          dimension: "Setup 1: The 9/21 EMA & AVWAP Pullback",
          badge: "Break-and-Retest",
          points: [
            "Prior Move: Stock makes an explosive impulsive surge (+30% to +60%+) out of a sound base.",
            "The Retest: Price pulls back quietly for 3 to 7 sessions on light, drying volume (VDU).",
            "Support Test: Price gently tests the rising 9 EMA or 21 EMA and the Breakout Anchored VWAP.",
            "Entry: Buy as price prints an intraday reversal wick off the EMA/AVWAP or reclaims the prior day's high.",
            "Stop Loss: Placed directly beneath the pullback pivot low (typically 1.0% to 2.5% risk)."
          ]
        },
        {
          dimension: "Setup 2: Inside Day Compression Breakout",
          badge: "Volatility Spring",
          points: [
            "Pattern: After an impulsive thrust, the stock forms 1 or 2 consecutive Inside Days (Day 2 High < Day 1 High and Day 2 Low > Day 1 Low).",
            "Significance: Daily volatility contracts to a fine point right at or slightly above the rising 9 EMA.",
            "Entry: Buy on the breakout above the Inside Day High (IDH) on expanding morning volume.",
            "Stop Loss: Placed at the Inside Day Low (IDL) or morning Low of Day (risk often < 1.5%)."
          ]
        },
        {
          dimension: "Setup 3: Episodic Pivot (EP) 2–5 Day Shelf",
          badge: "Delayed Catalyst",
          points: [
            "Catalyst: Massive 10%+ earnings gap-up on huge volume buzz.",
            "The Pause: If Day 1 was too volatile or wide to enter with a tight stop, wait for Day 2 to 5.",
            "The Shelf: Stock trades sideways in a tight 2%–4% range along the Earnings AVWAP without filling the gap.",
            "Entry: Buy the secondary breakout of the shelf resistance with a stop at the shelf low."
          ]
        }
      ],
      body: `
### Setup 1 Detailed Mechanics: The 9/21 EMA & AVWAP Retest
Instead of chasing a stock on the day it breaks out (which often requires a wide 4%–6% stop to survive opening noise), Luk lets the eager buyers do the heavy lifting. He waits for the **first orderly pullback**:

\`\`\`
      Peak High
         /\
        /  \   Orderly Pullback (Volume Dries Up)
       /    \
      /      \
Breakout      ● ← Entry Point (Reversal Wick off 9/21 EMA + AVWAP)
 Pivot       / \
    ────────+   \── Stop Loss (Tight: ≤ 1.5% - 2.0%)
\`\`\`

#### Verification Checklist for a Valid Retest:
1. **Volume Contraction:** Volume on each down day must be significantly lower than volume on the breakout up days.
2. **Candle Behavior:** Candles must become smaller (narrow range bars, dojis, hammers with lower wicks).
3. **No Overhead Damage:** The pullback should not retrace more than 38% to 50% of the prior impulsive leg.
4. **Immediate Response:** Once the EMA/AVWAP is touched, buyers should step in within 1 to 2 sessions. If price chops sideways below the 21 EMA for more than 3 days, abort.
`
    },
    {
      id: "ml_execution",
      number: "04",
      title: "Precision Execution: Intraday Timing, Micro-Stops & The Half-ADR Rule",
      shortTitle: "4. Precision Execution",
      icon: "⚡",
      summary: "Executing with razor-sharp precision: 5-minute Opening Range Highs (ORH), intraday AVWAP reclaims, and the non-negotiable Half-ADR (≤50% ADR) stop limit.",
      indicators: [
        {
          name: "5-Minute Opening Range High (5m ORH)",
          users: "Primary Trigger",
          desc: "High of the first 5-minute bar (9:30–9:35 AM EST).",
          bullets: [
            "Filters early opening spread volatility while capturing rapid institutional demand.",
            "Enter immediately as price crosses the 5m high with projected volume surging above average.",
            "Stop loss is placed at the 5-minute Low of the Day (LoD)."
          ]
        },
        {
          name: "Intraday AVWAP Reclaim",
          users: "Pullback Confirmation",
          desc: "Timing entries on the 5-minute intraday chart as price reclaims the daily session AVWAP.",
          bullets: [
            "If a stock opens soft and dips below session AVWAP, wait for buyers to push it back above.",
            "Enter on the 5-minute candle close back above the session AVWAP with stop at the morning low.",
            "Confirms that sellers have exhausted intraday supply and buyers have resumed control."
          ]
        },
        {
          name: "The Half-ADR (≤ 50% ADR) Stop Rule",
          users: "Non-Negotiable Risk Limit",
          desc: "The absolute dollar distance from entry to stop-loss must never exceed 50% of the stock's 20-day ADR.",
          bullets: [
            "$$\\text{Stop Distance} = \\text{Entry Price} - \\text{Stop Price}$$",
            "$$\\text{Stop Distance \\% of ADR} = \\frac{\\text{Stop Distance}}{\\text{Daily ADR (\\$)}} \\times 100 \\le 50\\%$$",
            "If the required structural stop exceeds 50% of ADR, the trade is rejected—wait for tighter consolidation or pass."
          ]
        }
      ],
      body: `
### The Half-ADR Rule: Mathematical Validation
Why is the **$\le 50\%$ ADR rule** critical to Martin Luk's world-record performance?

Let's look at the statistics:
- If your stop is **1.0x ADR ($100\%$ of ADR)**, normal random daily volatility will stop you out 50% of the time, and reaching a $+3R$ gain requires an extreme $3.0\text{x ADR}$ move that occurs in less than 5% of trading days.
- If your stop is **$\le 0.33\text{x to }0.50\text{x ADR}$**, reaching a $+3R$ gain requires only a normal **$1.0\text{x to }1.5\text{x ADR}$** expansion!

\`\`\`
Normal Daily Trading Range (1.0x ADR)
├─────────────────────────────────────────────────┤
▲                       ▲                         ▲
LoD                   Entry                     High
│  Stop Distance (Risk) │
└── ≤ 50% of ADR ───────┘  ──► Reaching +3R to +5R requires
                               only a standard daily expansion!
\`\`\`

#### What If Price Gaps Past Your Trigger?
Never chase a stock more than **0.5% to 1.0% past your planned pivot price**. Chasing widens your stop-loss, dilutes your R-multiple, and inflates downside exposure. If you miss the opening surge, wait for an intraday bull flag or retest.
`
    },
    {
      id: "ml_management",
      number: "05",
      title: "Trade Management & Scaling: The +3R to +5R Trim and 21 EMA Trail",
      shortTitle: "5. Trade Management",
      icon: "📈",
      summary: "Systematic profit realization without emotional interference: taking 25%–35% off at +3R to +5R, moving stops to breakeven, and surfing runners on the 21 EMA.",
      pyramid: [
        {
          tranche: "STEP 1: PARTIAL PROFIT TRIM",
          size: "Sell 25% to 35% of Position",
          trigger: "+3R to +5R Gain (Typically Day 2 to 4)",
          desc: "Lock in realized profit into the initial impulsive expansion. This cushions the account, pays for prior small losses, and immediately reduces mental pressure."
        },
        {
          tranche: "STEP 2: ADJUST STOP TO BREAKEVEN",
          size: "Risk Slashed to Exactly $0",
          trigger: "Immediately Following Partial Trim",
          desc: "Raise the stop-loss on the remaining 65%–75% position to your exact entry price (breakeven). The trade is now mathematically risk-free."
        },
        {
          tranche: "STEP 3: 21 EMA / AVWAP DAILY TRAIL",
          size: "Core Runner (65%–75% Position)",
          trigger: "First Daily Close Below 21 EMA or AVWAP",
          desc: "Hold the remaining core as long as price respects the rising 21 EMA. Liquidate ONLY on a daily close below the 21 EMA or loss of the Breakout AVWAP."
        }
      ],
      body: `
### The 3-Step Scaling Architecture
Managing winning trades is where the outsized returns are made. Martin Luk separates his position into two components:
1. **The Tactical Tranche (25%–35%)**: Sold into the first multi-day push at $+3R\text{ to }+5R$ to bank profits.
2. **The Core Runner (65%–75%)**: Held to capture multi-week institutional trend expansion along the rising 21 EMA.

\`\`\`
Entry: Risk = 1R (Stop ≤ 1.5%–2.5%)
  ↓
Day 2 to 4: Explosive thrust higher (+3R to +5R)
  → SELL 25% to 35% to lock in profit cushion!
  → Move stop on remainder to Breakeven ($0 Risk).
  ↓
Day 5+: Full trend surfing mode
  → Trail with the rising 21-day EMA.
  → Exit remaining shares ONLY on the first daily close below 21 EMA.
\`\`\`

---

#### The Psychology of the Breakeven Stop
Once a trade hits $+3R$ and you trim 30% while raising your stop to breakeven, **the worst possible outcome is a guaranteed winning trade**. 

This psychological milestone frees your mind from fear and greed. You no longer obsessively watch every intraday tick. You can comfortably let the stock pull back and test the 21 EMA without feeling compelled to sell prematurely.
`
    },
    {
      id: "ml_equity_curve",
      number: "06",
      title: "Equity Curve Feedback & Risk Modulation: Surviving Chop and Compounding",
      shortTitle: "6. Equity Curve & Risk",
      icon: "🧭",
      summary: "How Martin Luk survived drawdowns and won USIC: using personal equity curve highs and drawdowns as an objective throttle for position sizing and leverage.",
      rules: [
        {
          title: "The Equity Curve as Your True Market Indicator",
          badge: "Objective Reality",
          desc: "Your personal trading results reflect market health better than any news headline or technical indicator. When your setups follow through effortlessly, the market is healthy; when stops trigger repeatedly, the market is in chop."
        },
        {
          title: "Drawdown Protocol: Cut Size in Half",
          badge: "Capital Preservation",
          desc: "If your account draws down -3% to -5% from peak equity, immediately slash your position sizing and dollar risk in half (from 1.0% down to 0.5% or 0.25%). Never fight a losing streak with bigger size."
        },
        {
          title: "Earn the Right to Size Up",
          badge: "Pyramiding Equity",
          desc: "Only increase position sizes when you are operating on a profit cushion generated from previous winning trades. Use the market's money to finance larger risks."
        },
        {
          title: "Concentration Discipline",
          badge: "Max 4 to 6 Positions",
          desc: "Hold 4 to 6 high-conviction momentum leaders at any one time (15% to 25% position sizing). Diversifying into 20 names dilutes alpha and makes tight execution impossible."
        }
      ],
      body: `
### The Equity Curve Throttle System
Many traders evaluate market conditions by watching index charts or reading macroeconomic commentary. Martin Luk evaluates market conditions through his **personal equity curve**:

\`\`\`
Equity Curve at New All-Time Highs
  ▲
  │   GREEN STATE: Maximum Aggression
  │   Risk: 0.75% – 1.0% per trade | Exposure: 100% invested | 4–6 Positions
──┼──────────────────────────────────────────────────────────────────────────
  │   YELLOW STATE: Minor Pullback (-2% to -4% from peak)
  │   Risk: 0.40% – 0.50% per trade | Exposure: 50% invested | Pass on B-setups
──┼──────────────────────────────────────────────────────────────────────────
  │   RED STATE: Drawdown (-5%+ from peak)
  ▼   Risk: 0.20% – 0.25% per trade | Move 80%–100% to Cash | Protect Mental Capital
\`\`\`

#### Why Revenge Trading Destroys Compounding
A -50% loss requires a +100% gain just to get back to even. By contrast, a tightly managed -5% drawdown requires only a +5.3% gain to make a new high.

By cutting position sizes during losing streaks, Luk ensures that drawdowns remain shallow paper cuts. When the market turns and a fresh leadership wave begins, he is operating with intact capital and razor-sharp mental clarity.
`
    },
    {
      id: "ml_checklist",
      number: "07",
      title: "Interactive Martin Luk Pre-Trade Checklist",
      shortTitle: "7. Pre-Trade Checklist",
      icon: "✅",
      summary: "Mandatory pre-flight checklist: verify all 10 non-negotiable Martin Luk rules (ADR%, stop compression, AVWAP, and risk limits) before placing an order."
    },
    {
      id: "ml_calculator",
      number: "08",
      title: "Interactive Stop Compression & Exponential R-Multiple Calculator",
      shortTitle: "8. Stop & R Calculator",
      icon: "🧮",
      summary: "Calculate exact share sizing, verify the ≤50% ADR limit, compare compressed vs. conventional R-multiples, and generate your 21 EMA trailing plan."
    }
  ]
};
