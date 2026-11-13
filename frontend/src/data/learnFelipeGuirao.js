// Felipe Guirao Complete Trading System Data
// Sources: Felipe Guirao (@FelipeGuirao) Official Strategy Guide & Case Studies,
//          Liberty Signal (liberty-signal.com), Official 7-Year Verified Performance Archives,
//          and Market Interviews on EOD Momentum Swing Trading

export const FELIPE_GUIRAO_CONTENT = {
  hero: {
    badge: "FELIPE GUIRAO, CMT · LIBERTY SIGNAL PLAYBOOK",
    title: "Systematic End-of-Day Swing Trading, 8/20/50 EMA Ribbon & 5-Day Cycles",
    subtitle: "A 7-Year Track Record of Triple-Digit Annual Returns in Just 30 Minutes a Day with a 65% Win Rate & 13% Max Drawdown",
    author: "By Felipe Guirao, CMT (@FelipeGuirao · Founder of Liberty Signal)",
    description: "No discretion, no stress, no screen fatigue. A masterclass in systematic end-of-day (EOD) swing trading built on data, not art. Master the 3-step setup: the First Valid Consolidation (FVC / VCP), the stacked 8/20/50 EMA momentum ribbon, CML (Custom Momentum & Linearity) indicator, 3:58 PM market-close execution, structural stops below LOD, the 1:1 RR breakeven rule, and the strict 5-day time exit horizon.",
    tags: [
      "7-Year Triple-Digit Track Record",
      "30 Min / Day Routine",
      "65% Positive Trades",
      "80% Profitable Months",
      "13% Max Drawdown",
      "First Valid Consolidation (FVC)",
      "8, 20 & 50 EMA Ribbon",
      "CML Green Linearity",
      "3:58 PM Market-Close Entry",
      "1:1 RR Breakeven Rule",
      "Strict 5-Day Time Exit"
    ]
  },
  chapters: [
    {
      id: "fg_philosophy",
      number: "00",
      title: "The 30-Minute Edge: Systems Trading Principles, Hard Data & Statistical Distribution",
      shortTitle: "0. Core Philosophy",
      icon: "⏱️",
      summary: "Why trading stocks is not an art, but hard data and statistical distribution: how 95% hard rules, a 65% win rate, and a 13% max drawdown create sustainable wealth without lifestyle sacrifice.",
      rules: [
        {
          title: "95% Hard Rules, 5% Discretion ('Systems First')",
          badge: "Durable Edge",
          desc: "The past 100 trades are executed EXACTLY the same as the next 100. Discretion is limited to 5% (solely for choosing and prioritizing valid setups). Trading is treated as hard data and statistical distribution."
        },
        {
          title: "The Reality of Statistical Distribution",
          badge: "65% vs 35% Win Rate",
          desc: "Styles aiming for 1:10 to 1:20 RR typically suffer a 35% win rate, 10–15 losers in a row, and 9-month drawdowns. Guirao targets a 65% win rate, 80% profitable months, an 8-loss streak only once every 2–3 years, and a 13% max drawdown."
        },
        {
          title: "Risk-First Wealth Compounding",
          badge: "Avg 100%+ Annually",
          desc: "'You will never make more than 200% per year with this style. You won't win trading competitions. It's designed to grow wealth consistently with low drawdown (-13%) and time/mind freedom for family, job, and business.'"
        },
        {
          title: "End-of-Day (EOD) Market Close Execution",
          badge: "Enter at 3:58 PM",
          desc: "Never enter in the morning or chase intraday wicks. Wait literally until the last 2 minutes of the trading day (3:58 PM EST) to confirm that the daily breakout candle has locked in its range expansion."
        }
      ],
      body: `
### The Philosophy: Building a Durable Edge Based on Data
**Felipe Guirao, CMT** built his swing trading system on pure **systems trading principles**. It took two years of rigorous development and backtesting, and has now been traded without changing a single rule for over **7 consecutive years**:

> *"As momentum swing traders, all we care about is:*
> 1. *Volatility contraction and expansion*
> 2. *Momentum*
> 
> *Pair these two, understand how stocks move to the long and short side, and you have a foundation to build an edge. I do 95% hard rule-based trading and 5% discretion (mainly to choose and prioritize setups only). This means the past 100 trades are traded EXACTLY the same as the next 100."* — **Felipe Guirao**

---

#### The Reality of Statistical Distribution: Why 65% Win Rate Beats Chasing 1:20 RR
Most retail traders fail because they don't understand the practical, psychological reality of statistical distribution:

| Metric / Dimension | Chasing Extreme R:R (1:10 to 1:20 RR) | Felipe Guirao Systematic EOD Swing |
| :--- | :--- | :--- |
| **Typical Win Rate** | ~30% – 35% positive trades | **~65% positive trades** |
| **Profitable Months** | Spiky; long flat periods | **80% of all months profitable** |
| **Max Account Drawdown** | 25% to 40%+ deep drawdowns | **13% Maximum Historical Drawdown** |
| **Time Spent in Drawdown** | Can spend **6 to 9 months** underwater | **Low time in drawdown** (fast recovery) |
| **Consecutive Losing Streak** | **10 to 15 losers in a row** is common | **Max 8 losers in a row (once every 2–3 years)** |
| **Screen Time Commitment** | Glued to screens 6–8 hours/day | **< 30 minutes per day** (EOD only) |
| **Mental Stress Level** | Extreme emotional roller-coaster | **No stress, no emotional response trading** |

> *"If you have a 35% success rate trading style, by statistical distribution you will have 10 losers in a row. If you are not aware of it because you copy your favorite trader, you might get 9 losers in a row, think this 'ain't working', and walk away with losses. 
> 
> I prefer to keep control of my equity curve and get it as stable as possible: 65% positive trades, 80% profitable months, and a 13% max drawdown."* — **Felipe Guirao**

---

#### The Core Objective: Risk-First Wealth Building
This system is explicitly not built for taking \$50k to \$5M overnight with reckless leverage:
- **Expected Return:** Averages **triple-digit % returns** (~100%+ per year).
- **Hard Upper Bound:** You will never make more than 200% in a single year.
- **Capital Protection:** Designed for individuals who worked 20 years to build capital and refuse to endure 30%+ drawdowns.
- **Lifestyle Preservation:** Complete time and mental freedom for your job, business, and family.
`
    },
    {
      id: "fg_selection",
      number: "01",
      title: "Step 1: Young Trends, Base Breakouts & Riding the Second Leg",
      shortTitle: "1. Young Trends & Leg 2",
      icon: "🎯",
      summary: "Why targeting the breakout of the first valid consolidation out of a multi-month base to ride the second leg produces the highest probability momentum trade.",
      matrix: [
        {
          dimension: "1. Multi-Week / Month Base Breakout",
          badge: "Step 1 Foundation",
          points: [
            "Every winning campaign begins with a stock breaking out from a multi-week or multi-month primary base.",
            "This initial surge establishes the **first leg of a new, fresh trend**.",
            "Never buy a stock that has not demonstrated the power to break out from sound base accumulation."
          ]
        },
        {
          dimension: "2. Riding Leg 2 (The Sweet Spot)",
          badge: "Highest Probability",
          points: [
            "We target the breakout of the **First Valid Consolidation (FVC)** to ride the **second leg** of the intermediate trend.",
            "Data proves the second leg is almost always the **strongest, cleanest, and most reliable** momentum wave.",
            "Critical warning: After multiple consolidations (Legs 3, 4, 5+), the success rate of subsequent breakouts drops dramatically."
          ]
        },
        {
          dimension: "3. Stacked 8, 20 & 50 EMAs",
          badge: "Ribbon Stacking",
          points: [
            "During the first leg higher, the moving averages must show clear momentum stacking: **8 EMA > 20 EMA > 50 EMA**.",
            "All three moving averages must be sloped upward and actively trending.",
            "Price must trade cleanly above the ribbon during the initial thrust."
          ]
        },
        {
          dimension: "4. CML Indicator Is GREEN",
          badge: "Custom Indicator",
          points: [
            "Guirao's proprietary **CML (Custom Momentum & Linearity) Indicator** must be **GREEN**.",
            "CML verifies that the price advance is linear, smooth, and driven by institutional volume rather than erratic, volatile spikes.",
            "If CML is red or gray, the setup is automatically disqualified."
          ]
        }
      ],
      body: `
### Step 1: Establishing the First Leg of a Fresh Trend

\`\`\`
                                                   Second Leg (Strongest Wave!) ↗
                                                      /
                         First Valid Consolidation   /
                         (VCP Contracting Apex)     /
                             ┌──┬──┬──┬──┐         /
                             │  │  │  │  │        ● ← ENTER AT MARKET CLOSE (3:58 PM)
     First Leg ↗             ●  ●  ●  ●  ●       /
        /                    │  │  │  │  │      /
       /                     └──┴──┴──┴──┘     /
      /                                       /
─────+ ← Primary Base Breakout               /
Base Accumulation                           /
\`\`\`

#### Why Guirao Exclusively Targets Leg 2
Many traders make the mistake of buying extended stocks that are already 4 or 5 consolidations into a 9-month trend. By that point, early institutions are distributing into late retail buyers, and breakouts frequently fail with sharp mean-reversion flushes.

Guirao's statistical edge relies on **the second leg**:
1. **Leg 1** proves institutional sponsorship and trend validity.
2. **The First Valid Consolidation** shakes out weak hands and allows the 8 and 20 EMAs to catch up to price.
3. **Leg 2** represents the primary institutional markup phase, delivering rapid 5-day momentum velocity with minimum drawdown risk.
`
    },
    {
      id: "fg_indicators",
      number: "02",
      title: "Technical Arsenal: The 8/20/50 EMA Ribbon & The CML Indicator",
      shortTitle: "2. Technical Arsenal",
      icon: "📊",
      summary: "Deconstructing Guirao's core technical tools: the stacked 8, 20, and 50 EMAs, the CML (Custom Momentum & Linearity) indicator, and the 8/20 EMA support layer.",
      indicators: [
        {
          name: "1. 8-Day Exponential Moving Average (8 EMA)",
          users: "Fast Momentum Guide",
          desc: "Defines the immediate short-term trend momentum and dynamic support.",
          bullets: [
            "In high-powered momentum runners, price rides directly along the rising 8 EMA.",
            "During Step 2 consolidation, price MUST touch or interact with the 8/20 EMA layer.",
            "8 EMA slope must be curling upward heading into the breakout."
          ]
        },
        {
          name: "2. 20-Day Exponential Moving Average (20 EMA)",
          users: "Consolidation Floor (Hard Rule)",
          desc: "The absolute structural floor for a valid consolidation.",
          bullets: [
            "NON-NEGOTIABLE HARD RULE: There must be **NO daily close below the 20 EMA** during the consolidation.",
            "If price closes below the 20 EMA at any point during the consolidation, the setup is immediately disqualified.",
            "8 EMA must remain stacked above the 20 EMA."
          ]
        },
        {
          name: "3. 50-Day Exponential Moving Average (50 EMA)",
          users: "Intermediate Trend Baseline",
          desc: "Confirms intermediate trend direction and macro alignment.",
          bullets: [
            "8 EMA > 20 EMA > 50 EMA must be stacked and trending upward.",
            "Short-side trades are only taken when a stock breaks below a declining 50 EMA.",
            "Acts as the anchor baseline for the multi-week base breakout."
          ]
        },
        {
          name: "4. CML (Custom Momentum & Linearity Indicator)",
          users: "Algorithmic Quality Gate",
          desc: "Proprietary indicator measuring directional velocity and price linearity.",
          bullets: [
            "Must be **GREEN** to validate the setup.",
            "Ensures price movement is smooth and persistent, filtering out choppy, jagged charts.",
            "Eliminates subjective guesswork on whether a trend is 'clean enough' to trade."
          ]
        }
      ],
      body: `
### The Power of the 8/20 EMA Layer
Guirao uses moving averages not as crossing triggers, but as **dynamic boundary layers**:

\`\`\`
Price Candle
   ▲
   │    Impulsive First Leg ↗
   │
   ├──────────────────────────  Consolidation Resistance Line (Horizontal / Down-trendline)
   │   7+ Day VCP:
   │   ●──●──●──●──● (Contracting Volatility)
   │
══════════════════════════════  ← Rising 8 EMA (Must Touch / Interact)
──────────────────────────────  ← Rising 20 EMA (NO DAILY CLOSE BELOW!)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ← Rising 50 EMA (Trending Stacking Baseline)
\`\`\`

#### The Two Non-Negotiable Moving Average Rules:
1. **The Touch Rule:** The consolidation MUST interact with the 8/20 EMA layer. If a stock hovers too far above its 8 EMA, it has not sufficiently consolidated and is vulnerable to an opening flush.
2. **The 20 EMA Close Rule:** Price can wick below the 20 EMA intraday, but **MUST NEVER close below the 20 EMA on a daily basis**. A daily close below the 20 EMA signals that momentum has dissipated, disqualifying the setup.
`
    },
    {
      id: "fg_setups",
      number: "03",
      title: "Step 2 & Step 3: The First Valid Consolidation (VCP) & 3:58 PM Breakout Entry",
      shortTitle: "3. The 3-Step Setup",
      icon: "🎯",
      summary: "Detailed breakdown of the 4 strict criteria for the First Valid Consolidation (FVC / VCP) and the exact 3:58 PM market-close breakout execution rules.",
      patterns: [
        {
          num: "FG-01",
          name: "The First Valid Consolidation (FVC / VCP)",
          headline: "7+ Day VCP Touching 8/20 EMA with No Close Below 20 EMA",
          badge: "Primary Bread & Butter",
          sentiment: "bullish",
          patternType: "first_valid_consolidation",
          quoteHeader: "Felipe Guirao's Official Strategy Guide",
          originalText: [
            "Step 2: Now you want to find the first valid consolidation, which comes in the form of a volatility contraction pattern (VCP).",
            "Consolidation must be at least 7 days from high before breakout.",
            "There must be volatility contraction (trendlines converge, not expand). The consolidation must touch the 8/20 EMA layer, with NO daily close below the 20 EMA.",
            "Step 3: Look for the breakout. A strong range expansion candle, bigger and stronger than the 2 preceding candles, with no big wick on the upper side, closing above resistance. Enter at the close before 4:00 PM EST (at 3:58 PM)."
          ],
          specs: "At least 7 days from high, converging VCP trendlines, touching 8/20 EMA layer, no daily close below 20 EMA",
          pivot: "Breakout candle closing above horizontal resistance or downward trendline",
          volume: "Bigger and stronger range expansion than the 2 preceding daily candles",
          rule: "Enter at 3:58 PM EST. Stop placed below LOD of breakout candle. Target 5-day time stop. Move stop to BE at 1:1 RR."
        },
        {
          num: "FG-02",
          name: "Bearish Breakdown Consolidation",
          headline: "Shorting Broken Leaders on Bearish Volatility Contractions",
          badge: "Short Strategy",
          sentiment: "bearish",
          patternType: "bearish_flag_breakdown",
          quoteHeader: "Felipe Guirao's Official Strategy Guide",
          originalText: [
            "I have 3 separate scans, one for bullish signals, short signals (I also short regularly when market conditions dictate), and another for ETFs.",
            "When market conditions dictate, broken stocks trading below declining 8, 20, and 50 EMAs form tight counter-trend consolidations.",
            "Enter short at the close (3:58 PM EST) as price breaks down below the consolidation floor on expanding range. Stop placed above the high of the breakdown candle."
          ],
          specs: "Stock in Stage 4 downtrend below declining 8/20/50 EMAs forming a tight 5 to 7-day consolidation",
          pivot: "Breakdown candle closing below consolidation support shelf",
          volume: "Expanding range and volume on the breakdown candle",
          rule: "Enter short at 3:58 PM EST close. Stop placed above high of the day. Move stop to BE at 1:1 RR. Exit at Day 5 close."
        },
        {
          num: "FG-03",
          name: "5-Day Time Stop & 1:1 RR Breakeven Progression",
          headline: "Rigid 5-Day Holding Cycle with Zero Hope-Holding",
          badge: "Execution Architecture",
          sentiment: "bullish",
          patternType: "five_day_time_exit",
          quoteHeader: "Felipe Guirao's Official Strategy Guide",
          originalText: [
            "I place my stop below the LOD, and target a time stop of a 5-day move. So after 5 days, I'm out.",
            "After the price reaches around the 1:1 RR level, I move my stop to BE. Simple, effective, non-discretionary, scalable.",
            "At 3:50 PM every day, I close any trades still open that are on day 5 after entry. This forces regular capital recycling and eliminates multi-week drawdowns."
          ],
          specs: "Structured 5-day holding lifecycle with strict 1:1 RR breakeven ratchet",
          pivot: "Entry at 3:58 PM close; liquidation at 3:50 PM on Day 5",
          volume: "Expansion on Days 1 to 3",
          rule: "Move stop to Breakeven once price reaches 1:1 RR. Close 100% of remaining position on Day 5 at 3:50 PM EST."
        }
      ],
      matrix: [
        {
          dimension: "Criterion 1: Consolidation Duration",
          badge: "At Least 7 Days",
          points: [
            "The consolidation must be **at least 7 daily candles from the swing high** before the breakout occurs.",
            "3-day or 5-day quick pauses are disqualified; they have not digested overhead supply sufficiently.",
            "Ensures true institutional equilibrium before the next expansion."
          ]
        },
        {
          dimension: "Criterion 2: Volatility Contraction (VCP)",
          badge: "Converging Lines",
          points: [
            "There must be clear **volatility contraction**: trendlines must converge, not expand.",
            "Expanding triangles or widening megaphone patterns are strictly rejected.",
            "Daily trading ranges contract into a tight, quiet apex."
          ]
        },
        {
          dimension: "Criterion 3: 8/20 EMA Layer Touch",
          badge: "Dynamic Interaction",
          points: [
            "The consolidation candles must **touch or interact with the 8/20 EMA layer**.",
            "Guarantees the stock has reverted to its short-term moving average baseline."
          ]
        },
        {
          dimension: "Criterion 4: 20 EMA Structural Integrity",
          badge: "Zero Close Below 20 EMA",
          points: [
            "There must be **NO daily close below the 20 EMA** during the entire consolidation.",
            "If price closes below the 20 EMA on any day, the setup is completely invalidated."
          ]
        }
      ],
      body: `
### Step 3 Breakout Candle Anatomy & Execution

\`\`\`
Resistance Line (Horizontal or Downward Trendline)
──────────────────┬───────────────────────────┬──────────
                  │   7+ Day VCP Apex         │   [█] ← BREAKOUT CANDLE:
                  │   (Converging Lines)      │    │    - Closes ABOVE resistance line
                  │   ●──●──●──●──●           │    │    - NO BIG UPPER WICK!
══════════════════╪═══════════════════════════╪════│════ ← Rising 8 EMA (Interacts)
                  │   Touching 8/20 Layer     │    │
──────────────────┴───────────────────────────┴────│───── ← Rising 20 EMA (NO CLOSE BELOW!)
                                                   │
                                ENTER AT 3:58 PM EST (MARKET CLOSE)
                                                   ▲
                                    STOP LOSS BELOW LOD (LOW OF DAY)
\`\`\`

#### The 4 Breakout Candle Requirements:
1. **Range Expansion:** Must be a strong range expansion candle closing above the resistance line (either horizontal level or downward trendline).
2. **Relative Strength:** Must be **bigger and stronger than the 2 preceding candles**.
3. **Clean Close (No Big Upper Wick):** A large upper wick indicates intraday selling and rejection. The candle must close near its high.
4. **Market-Close Execution:** Enter at **3:58 PM EST** (literally in the last 2 minutes of the day) to lock in confirmed range expansion!
5. **Stop Loss:** Placed strictly **below the LOD (Low of Day)** of the breakout candle.
6. **Breakeven Trigger:** As soon as price reaches **1:1 RR** (profit equals initial risk), immediately raise the stop to Breakeven (BE).
7. **Time Stop:** Hold for a **5-day move**. At 3:50 PM on Day 5, close the trade regardless of price.

---

### Real Trade Case Study: $VTRS (Viatris)
In his published strategy breakdown, Felipe Guirao showcased his trade on **$VTRS** (taken in September):

1. **Step 1 (The Young Trend):** $VTRS broke out from a multi-month accumulation base, launching Leg 1 higher. The 8, 20, and 50 EMAs stacked up in bullish order, and the CML indicator turned bright GREEN.
2. **Step 2 (The 7-Day VCP):** The stock consolidated for over 7 days from its high. Trendlines converged in a clean Volatility Contraction Pattern. Price gently pulled back and touched the 8/20 EMA layer while never printing a daily close below the 20 EMA.
3. **Step 3 (The Breakout & EOD Entry):** A powerful range expansion candle emerged, noticeably larger and stronger than the previous two candles, closing above the downward resistance trendline with no upper wick.
4. **Execution & Management:** 
   - Entered at **3:58 PM EST** before the market close.
   - Stop Loss placed 1 tick below the breakout candle's Low of Day (LOD).
   - Once $VTRS gained 1x its initial risk distance (**1:1 RR**), the stop was moved to Breakeven.
   - On **Day 5**, the position was systematically closed at the market close, capturing a clean, stress-free momentum gain without overnight bag-holding.
`
    },
    {
      id: "fg_routine",
      number: "04",
      title: "Daily Process & Routine: The <30-Minute Execution Schedule",
      shortTitle: "4. Daily Process (<30m)",
      icon: "⚡",
      summary: "Guirao's exact New York EST schedule: 3:30 PM setup, 3:35 PM scans, 3:50 PM Day-5 exits, and 3:58 PM market-close order entries.",
      indicators: [
        {
          name: "3:30 PM EST: Workspace Setup",
          users: "Preparation",
          desc: "Open up brokerage, TradingView, and TC2000.",
          bullets: [
            "Log into all trading platforms 30 minutes before the market close.",
            "Verify account balances, active positions, and market status.",
            "Ensure data feeds are live and synchronized."
          ]
        },
        {
          name: "3:35 PM EST: The 3 Scans in TC2000",
          users: "Scanning Routine",
          desc: "Run 3 distinct automated scans to capture all market opportunities.",
          bullets: [
            "Scan 1: Bullish Momentum Breakouts (7+ day VCP, 8/20 EMA layer, no close below 20 EMA, CML green).",
            "Scan 2: Short Signals (Broken stocks below declining 50 EMA forming bearish consolidations).",
            "Scan 3: ETF Signals (Major index and thematic ETF breakouts/breakdowns)."
          ]
        },
        {
          name: "3:50 PM EST: Filter Candidates & Close Day-5 Trades",
          users: "Portfolio Management",
          desc: "Validate signals and execute the strict 5-day time stop.",
          bullets: [
            "Review stocks appearing in scans: confirm 95% hard rules (7+ days, VCP contraction, no big upper wick, bigger than last 2 candles).",
            "Move qualifying candidates to TradingView and load onto brokerage order tickets.",
            "CRITICAL: Close any open trades that have reached Day 5 after entry!"
          ]
        },
        {
          name: "3:58 PM EST: Market-Close Entry & GTC Stop Setup",
          users: "Execution Window",
          desc: "Execute entries literally in the last 2 minutes of the trading day.",
          bullets: [
            "Submit market orders at 3:58 PM EST to enter at the closing price.",
            "Immediately enter GTC (Good 'Til Cancelled) Stop Loss order 1 tick below the breakout candle LOD.",
            "Set Breakeven (BE) price alert at the 1:1 RR level.",
            "Done for the day in < 30 minutes!"
          ]
        }
      ],
      body: `
### The Complete Daily Routine (NY EST Time)

| Time (EST) | Dedicated Action | Duration |
| :--- | :--- | :--- |
| **9:30 AM – 3:30 PM** | **DO NOTHING (98% of the time).** Live your life, work your job, run your business. Zero intraday chart watching. | **0 Min** |
| **3:30 PM** | Open up brokerage account, TradingView, and TC2000 workspace. | **5 Min** |
| **3:35 PM** | Run the 3 TC2000 scans: Bullish Setups, Short Setups, and ETFs. | **10 Min** |
| **3:50 PM** | Filter valid candidates against the 4 FVC rules. Load into brokerage. **Close all open trades on Day 5.** | **8 Min** |
| **3:58 PM** | **Enter trades in the last 2 minutes before the close.** Submit GTC stop below LOD and set 1:1 RR alarm. | **4 Min** |
| **4:02 PM** | Workspace closed. Total time elapsed: **27 minutes**. | **Done!** |

---

#### Why Trading at 3:58 PM Eliminates All Emotional Stress
- **No Intraday Chop:** You don't care what happens between 9:30 AM and 3:30 PM. A stock that wicks higher at 10:30 AM and collapses by 2:00 PM is completely ignored because you only evaluate the candle at 3:50 PM.
- **Confirmed Breakout Shape:** You only enter when you can see the candle is actually closing near its high with no big upper wick.
- **Fixed Risk Automation:** GTC stop loss below LOD is entered immediately after fill. You never need to make an emergency decision during the day.
`
    },
    {
      id: "fg_management",
      number: "05",
      title: "Trade Management: The 1:1 RR Breakeven Rule & 5-Day Time Stop",
      shortTitle: "5. Trade Management",
      icon: "📈",
      summary: "Systematic risk reduction: moving stops to Breakeven at 1:1 RR, holding for exactly 5 days, and closing at 3:50 PM on Day 5.",
      pyramid: [
        {
          tranche: "DAY 1: EOD CLOSE FILL & INITIAL RISK",
          size: "Full Position (100% Size)",
          trigger: "3:58 PM EST Market-Close Entry",
          desc: "Filled at the close. Hard GTC stop loss placed strictly below LOD of the breakout candle. Maximum risk capped at 1.0% of account equity."
        },
        {
          tranche: "DAYS 2 TO 4: 1:1 RR BREAKEVEN RATCHET",
          size: "Risk Slashed to Exactly $0.00",
          trigger: "Price Advances 1x Initial Risk Distance (1:1 RR)",
          desc: "As soon as the stock gains 1x the initial stop distance (1:1 RR), raise the stop loss to your exact entry price (breakeven). The trade is now a risk-free 'Free Roll'."
        },
        {
          tranche: "DAY 5: THE SYSTEMATIC TIME STOP",
          size: "Liquidate Remaining 100% Position",
          trigger: "3:50 PM EST on the 5th Trading Day After Entry",
          desc: "Regardless of whether the stock is up +1R, +3R, or slightly negative, systematically close the entire position at 3:50 PM on Day 5. Zero hope-holding!"
        }
      ],
      body: `
### The Trade Lifecycle Architecture

\`\`\`
Day 1 (Entry Day):
  → 3:58 PM EST: Enter at Market Close on confirmed breakout candle
  → Place Hard GTC Stop Loss 1 tick below Low of Day (LOD)
  → Set Breakeven Alarm at Entry + 1R Distance (1:1 RR)
  ↓
Days 2 to 4 (Momentum Run):
  → When price crosses the 1:1 RR alarm: IMMEDIATELY RAISE STOP TO BREAKEVEN ($0 Risk)!
  → If price pulls back, you exit at breakeven with zero dollar loss.
  ↓
Day 5 (The Time Stop):
  → At 3:50 PM EST on Day 5 after entry, SUBMIT ORDER TO CLOSE 100% OF POSITION.
  → Result logged. Capital recycled for the next fresh setup!
\`\`\`

---

#### The Power of the 1:1 RR Breakeven Rule
Unlike systems that wait for +2R or +3R to move stops, Guirao moves to Breakeven at **1:1 RR**:
- Because momentum breakouts out of 7-day VCPs produce quick bursts, a stock reaching 1:1 RR has proven immediate buyer demand.
- If it subsequently collapses back to entry, the breakout has lost momentum and is failing.
- Raising the stop to breakeven at 1:1 RR protects capital, prevents winners from turning into losers, and keeps the overall portfolio win rate at **65%**.
`
    },
    {
      id: "fg_case_study",
      number: "06",
      title: "Real Case Study Walkthrough: The $VTRS (Viatris) Trade",
      shortTitle: "6. Case Study: $VTRS",
      icon: "🏆",
      summary: "Step-by-step visual dissection of Felipe Guirao's September $VTRS trade: Base breakout, 8/20/50 EMA alignment, 7-day VCP, 3:58 PM entry, and 5-day exit.",
      body: `
### Dissecting a Real Trade: $VTRS (Viatris — September)

In his comprehensive trading guide, Felipe Guirao walked through his actual trade on **$VTRS** as a textbook blueprint of the system:

\`\`\`
$VTRS Daily Chart Breakdown:

1. Step 1: Base Breakout & Leg 1
   - $VTRS broke out of a multi-month accumulation base.
   - Launched the first leg of a new, fresh trend.
   - 8, 20, and 50 EMAs were stacked up and trending upward.
   - CML (Custom Momentum & Linearity) indicator turned bright GREEN.

2. Step 2: The First Valid Consolidation (FVC / VCP)
   - Consolidation lasted over 7 days from the swing high.
   - Volatility contracted cleanly (converging trendlines).
   - Price pulled back and touched the 8/20 EMA layer.
   - Crucial: NO daily candle closed below the 20 EMA!

3. Step 3: Breakout & EOD Entry
   - Strong range expansion candle closing above the downward resistance line.
   - Noticeably bigger and stronger than the 2 preceding candles.
   - Clean close with NO big upper wick!
   - Entered at 3:58 PM EST right before the market close.
   - Stop Loss placed 1 tick below the breakout candle's Low of Day (LOD).

4. Execution & Management:
   - Price surged higher over the subsequent sessions.
   - Hit the 1:1 RR level → Stop raised to Breakeven ($0 risk).
   - On Day 5 at 3:50 PM EST → Position closed at market close for a clean profit!
\`\`\`

---

#### Key Lessons from the $VTRS Trade:
1. **Patience During Step 2:** Guirao didn't guess the breakout on Day 3 or Day 4 of the consolidation. He waited until the consolidation was **at least 7 days** and the breakout candle confirmed range expansion.
2. **Zero Day-Trading Screen Time:** The entire trade required checking the chart at 3:50 PM, executing at 3:58 PM, and setting GTC stops.
3. **Execution Simplicity:** No Fibonacci levels, no MACD indicators, no intraday scalp stress. Just pure price action, moving averages, and strict time-based exits.
`
    },
    {
      id: "fg_checklist",
      number: "07",
      title: "Interactive Felipe Guirao Pre-Trade Checklist",
      shortTitle: "7. Pre-Trade Checklist",
      icon: "✅",
      summary: "Mandatory pre-flight checklist: verify all 10 non-negotiable Liberty Signal rules (FVC, 8/20/50 EMA, CML green, 3:58 PM entry, 1:1 BE, and 5-day exit) before placing an order."
    },
    {
      id: "fg_calculator",
      number: "08",
      title: "Interactive 5-Day Swing & Risk Calculator",
      shortTitle: "8. 5-Day & Risk Calculator",
      icon: "🧮",
      summary: "Calculate exact share sizing, enforce the 1.0% equity risk rule, verify structural stop distance below LOD, generate your 1:1 RR breakeven trigger, and map your 5-day exit calendar."
    }
  ]
};
