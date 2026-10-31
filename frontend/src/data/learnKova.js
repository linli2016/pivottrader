// KovaView / MichaelZTrading Complete Trading System Data
export const KOVA_CONTENT = {
  hero: {
    badge: "KOVAVIEW · EDUCATION SYSTEM",
    title: "A System Behind a +40% Week",
    subtitle: "Six Years of Trading Experience Compressed Into One Non-Negotiable Process",
    author: "By Michael (@MichaelZTrading / @kovainvest)",
    description: "Stock picking is not mysticism — it is filtering. Four dimensions, and every one has to pass. Moving beyond scattered concepts into one complete process from market open to close.",
    tags: ["CAN SLIM", "Minervini VCP", "Pocket Pivot", "Pyramid 50/30/20", "Stop 7-8%", "Max 5 Positions"]
  },
  chapters: [
    {
      id: "preface",
      number: "00",
      title: "Preface: Written to Myself Six Years Ago",
      shortTitle: "Preface",
      icon: "🧭",
      summary: "Overcoming a 40% account drawdown by stopping trading on feeling and building an uncompromising checklist.",
      body: `
### The Hard Lesson
Back then my account drew down more than 40% in two months. The problem wasn't a lack of theory — I'd worn out several books by Minervini, O'Neil, and Weinstein.

The problem was that what I understood was a pile of **scattered concepts, not one complete process from market open to close**.

- Every entry was based purely on feeling in the moment.
- I'd stubbornly hold onto losers and bail early on winners.
- My watchlist was full of names, and every one of them felt *"more or less buyable."*
- When the broader market was turning weak, I'd still be adding to positions because *"this one's different from the market."*

### The Solution: Non-Negotiable Process
What I did afterward was force everything I'd learned into an **execution checklist that wasn't up for debate**. Only after that did my P&L curve start to take shape.

> *"Reading this won't make you money tomorrow. But it will stop you from trading on feeling."*
`
    },
    {
      id: "selection",
      number: "01",
      title: "Stock Selection: Four Dimensions, None Optional",
      shortTitle: "1. Selection",
      icon: "🎯",
      summary: "Every candidate must satisfy all 4 dimensions: Fundamentals, Technicals, Institutional Sponsorship, and Market Regime.",
      matrix: [
        {
          dimension: "1. Fundamentals",
          badge: "CAN SLIM (C & A)",
          points: [
            "Quarterly EPS YoY growth of 25%+ (the higher the better).",
            "EPS growth accelerating over the last two quarters is even better.",
            "Annual EPS sustained growth with Revenue YoY growth of 20%+.",
            "Warning sign: EPS deceleration (e.g. 30% down to 10% over two quarters) is an immediate danger signal before price reacts."
          ]
        },
        {
          dimension: "2. Technicals",
          badge: "Chart Health",
          points: [
            "RS Rating / Rank of 80+, ideally 90+ (Top 10% relative strength).",
            "Price above the 50-day moving average.",
            "10-day EMA above the 20-day EMA (fast trend alignment).",
            "Within 15–20% of the 52-week high (eliminates downtrending laggards)."
          ]
        },
        {
          dimension: "3. Institutional Sponsorship",
          badge: "Smart Money Buying",
          points: [
            "Number of funds holding the stock increasing over recent quarters.",
            "Top-tier long-term accumulation (Fidelity, Capital Group, Janus in 13F filings).",
            "Real institutional accumulation matters infinitely more than analyst ratings."
          ]
        },
        {
          dimension: "4. Market Environment",
          badge: "The 'M' in CAN SLIM",
          points: [
            "Broader market in Confirmed Uptrend with no pileup of distribution days.",
            "75% of stocks move in the direction of the general market.",
            "In a bear market, even a 5-star setup only has a ~30% win rate. In a bull market, even mediocre setups make money."
          ]
        }
      ],
      body: `
### The Retail Trader's Number One Mistake
Looking only at fundamentals and ignoring technicals, or vice versa. Good companies with ugly charts exist, and bad companies with flying stock prices exist too — **what we are looking for is the small, elite overlap where both are right**.

A candidate only earns a spot in the pool when **all four boxes are checked**. Miss one, and you pass — there is never a shortage of stocks.
`,
      pivotTraderLink: {
        tab: "candidates",
        label: "Run Leaders Screen in PivotTrader",
        hint: "Filter the market using 90+ RS, >50 EMA, and 10>20 EMA alignment"
      }
    },
    {
      id: "screening",
      number: "02",
      title: "Finding Names: Screener Criteria & The 3-Pass Review",
      shortTitle: "2. Finding Names",
      icon: "🔬",
      summary: "Turn criteria into a fast scan (50-80 names) then run 3 rounds of visual review to yield the 10-15 Focus List.",
      screenerRules: [
        { rule: "Stock Price", val: "≥ $10.00", desc: "Filters out low-priced speculative pennies" },
        { rule: "Average Daily Range (ADR20)", val: "≥ 4.0%", desc: "Ensures volatility for high-reward swings" },
        { rule: "Relative Strength (RS)", val: "≥ 90", desc: "Top decile performers in the market" },
        { rule: "Trend Filter", val: "Price > 50 EMA", desc: "Above intermediate-term institutional moving average" },
        { rule: "Fast Alignment", val: "10 EMA > 20 EMA", desc: "Short-term momentum confirms upward drift" },
        { rule: "Advance Off Low", val: "≥ 70% above 52w Low", desc: "Proven market leaders in strong Stage 2 run" }
      ],
      passes: [
        {
          step: "Pass 1 · Elimination",
          count: "50-80 → ~30 names",
          desc: "Eliminate anything with an ugly shape, recent steep breakdowns, or extended moves that have already exhausted their run."
        },
        {
          step: "Pass 2 · Base Pattern",
          count: "~30 → ~15 names",
          desc: "Flag names forming a clean, recognizable base: Cup with Handle, Flat Base, or Volatility Contraction Pattern (VCP)."
        },
        {
          step: "Pass 3 · Final Setup Focus",
          count: "~15 → 10-15 names",
          desc: "Focus on names where the 10 EMA has just crossed above the 20 EMA, or where the base is about to complete its final contraction."
        }
      ],
      body: `
### Candidates vs. Setups
The screener's job is to narrow the field of view, not to pick stocks directly. The real work happens after the focus watchlist is built.

Every morning before open:
1. Check whether names on your focus list are giving an active setup today.
2. If not, **sit on your hands** and check again tomorrow.

> *"The biggest improvement in trading is learning to sit on your hands on days with no setup. What the screener finds are candidates; the setup is the order. The two shouldn't be conflated."*
`
    },
    {
      id: "entry",
      number: "03",
      title: "Entry Mechanics: VCP is Core, Pocket Pivot is the Supplement",
      shortTitle: "3. Entry",
      icon: "⚡",
      summary: "The highest-probability entry occurs when supply has completely dried up across price, volume, and volatility.",
      vcpDetails: [
        {
          name: "Price Contraction",
          icon: "📉",
          desc: "Each pullback is shallower and shorter than the last. E.g., initial 25-35% drop → 15-20% contraction → 5-10% handle."
        },
        {
          name: "Volume Contraction",
          icon: "🔇",
          desc: "Volume drops significantly below the 50-day average. Watch for consecutive 'FU' (dead quiet) days signaling sellers are exhausted."
        },
        {
          name: "Volatility Contraction",
          icon: "📐",
          desc: "Intraday trading range compresses. 3 to 5 consecutive days of closes within <1% range, tightly bunched candlesticks."
        }
      ],
      body: `
### The Pivot Point: Trigger Price
- **Pivot Definition:** The highest price of the tightest final consolidation range.
- **Trigger Rule:** Pivot + $0.10 is the breakout trigger price.
- **Two Hard Conditions for Buying:**
  1. Price breaks above the pivot.
  2. Breakout-day volume is **40% to 50%+ above the 50-day average volume**.
- **The Buy Zone:** From the pivot up to **+5% maximum**. Past 5%, do **NOT** chase. Chasing ruins your stop-loss ratio.

---

### Pocket Pivot: Early Accumulation Entry
When a stock is consolidating strongly and hasn't yet cleared the daily pivot, a Pocket Pivot provides an asymmetric early entry.
- **Definition:** On an up day, volume exceeds the volume of the **highest down day in the prior 10 trading days**.
- **Rationale:** Institutional demand suddenly overwhelms all recent supply before retail notices the breakout.

#### Real Case Study: $RKLB
> *"The main upward wave I caught in $RKLB was entered during a pocket pivot late in the base contraction — not on the daily breakout candle. The lower timeframe overwhelmed every down day of the prior two weeks. Those who waited for the obvious daily breakout entered ~8% later."*
`
    },
    {
      id: "stoploss",
      number: "04",
      title: "Stop-Loss: Protecting Principal",
      shortTitle: "4. Stop-Loss",
      icon: "🛡️",
      summary: "Anyone who cannot cut losses will not survive 3 years in this market. 7-8% is the hard ceiling; actual stops are tighter.",
      stopLevels: [
        { name: "Hard Ceiling", dist: "7% - 8%", desc: "Sell unconditionally if down 7-8% from buy price. Validated by decades of CAN SLIM history." },
        { name: "Just Below Pivot", dist: "1% - 3%", desc: "Breaking back below the pivot means the breakout has failed. Immediate exit." },
        { name: "Prior Low Stop", dist: "2% - 3%", desc: "2-3% below the entry day's intraday low. Ideal for tight momentum swings." },
        { name: "21 EMA Stop", dist: "Trend Line", desc: "Leading stocks ride the 21 EMA. Breaking below signals trend degradation." },
        { name: "2x ATR Stop", dist: "Volatility Adjusted", desc: "Uses 2x Average True Range adapted to the stock's natural noise level." }
      ],
      body: `
### Time Stop: What Most People Miss
If the stock shows **no upward progress 2–3 weeks after entry**, just grinding sideways near your buy price, **exit the trade**.
- Good breakouts show clear progress within 1–5 days.
- Grinding sideways burns opportunity cost, ties up capital, and indicates lack of sponsorship. Time is a stop loss.

### Shakeout vs. Real Breakdown
- **Real Breakdown:** Heavy volume, closes decisively below pivot, keeps drifting lower → stay out.
- **Shakeout:** Light volume, dips intraday below pivot but rallies back to close above it within 1–2 days. If you were stopped out, **allow yourself to buy back in** once it reclaims the pivot. Never let pride dictate trading decisions.
`
    },
    {
      id: "adding",
      number: "05",
      title: "Adding to Positions: Pyramid Style, Only Add to Winners",
      shortTitle: "5. Adding",
      icon: "🔺",
      summary: "Never average down into a losing position. Scale in 50% / 30% / 20% pyramid tranches as price confirms.",
      pyramid: [
        { tranche: "Tranche 1", size: "50% Allocation", trigger: "Breakout Day", desc: "Enter half size on the initial pivot breakout with confirmed volume." },
        { tranche: "Tranche 2", size: "30% Allocation", trigger: "+2% to +3% Gain", desc: "Add second tranche once the trade shows early confirmation and cushion." },
        { tranche: "Tranche 3", size: "20% Allocation", trigger: "+2% to +5% or Pocket Pivot", desc: "Final tranche added on further advance or a clean pullback pocket pivot." }
      ],
      body: `
### Strict Allocation Caps
- **25% Cap Per Position:** No single stock may exceed 25% of total account capital. Room for error is always mandatory.
- **Smaller as You Go Up:** Higher add-ons must be smaller in size to prevent raising your average cost into vulnerable territory.

### The Three Sins of Adding:
1. **Never add to a loser.** If you were wrong, you were wrong — averaging down doubles account damage.
2. **Never add more than 5% above the pivot.** Chasing compresses your stop-loss margin and destroys the risk/reward profile.
3. **Never add when the broader market is weakening.** When market breadth deteriorates, scale back even on your best names.
`
    },
    {
      id: "selling",
      number: "06",
      title: "Selling: Offensive & Defensive Rules",
      shortTitle: "6. Selling",
      icon: "💰",
      summary: "Stop-losses protect capital; selling protects profit. Master both offensive profit-taking and defensive trend exits.",
      offensive: [
        {
          name: "8-Week / 20% Rule",
          rule: "+20% in ≤ 3 weeks",
          action: "Hold for at least 8 full weeks. Explosive early momentum frequently signals a market leader embarking on a huge intermediate wave."
        },
        {
          name: "Climax Run (Blow-off Top)",
          rule: "+25-30%+ in 2-3 weeks",
          action: "Multiple large up-candles, widening intraday range, extreme volume gap-ups ($MU, $SNDK). Cut 50% immediately, trail remainder along 10 EMA."
        },
        {
          name: "Churning (Stalling on Heavy Volume)",
          rule: "Heavy volume with minimal price progress",
          action: "Multiple days of massive volume with closes in the lower half of the day. Institutions are quietly offloading shares."
        }
      ],
      defensive: [
        {
          name: "50-Day Moving Average Break",
          rule: "Decisive close below 50-day SMA on heavy volume",
          action: "The primary institutional support line is broken. Sell the entire position."
        },
        {
          name: "Trendline Break",
          rule: "Break below primary ascending trendline",
          action: "Uptrend structure compromised. Exit or tighten stops aggressively."
        },
        {
          name: "Distribution Day Pileup",
          rule: "5+ distribution days within 4–5 weeks",
          action: "Smart money is exiting the market. Raise cash across portfolio."
        },
        {
          name: "Post-Earnings Gap Down",
          rule: "Gap-down below 50 EMA on quarterly earnings",
          action: "A decisive institutional verdict. Exit immediately at open without hesitation."
        }
      ],
      body: `
### Execution Discipline
The moment a sell signal triggers, **place the order immediately** — do not give yourself time to bargain or second-guess.

> *"If it later turns out to have been a shakeout, you can accept it and buy back in. In the long run, those who execute strictly win, and those who make frequent exceptions lose."*
`
    },
    {
      id: "sizing_mindset",
      number: "07",
      title: "Position Sizing & Mindset: Survival to the Next Bull Market",
      shortTitle: "7. Sizing & Mindset",
      icon: "🧠",
      summary: "Technique determines how much you make; sizing and psychology determine whether you survive.",
      rules: [
        {
          title: "Bull Market Posture",
          badge: "Green Light",
          desc: "Market > 50 EMA with few distribution days. Hold 4 to 5 concentrated names (max 25% each)."
        },
        {
          title: "Bear Market / Correction Posture",
          badge: "Yellow / Red Light",
          desc: "Market < 50 EMA with 5+ distribution days. Cut exposure to < 30%, hold 1-2 top names or 100% cash."
        },
        {
          title: "Max 5 Concurrent Positions",
          badge: "Focus Cap",
          desc: "Fewer than 3 is too concentrated; more than 5 and you cannot track stops and catalysts effectively."
        },
        {
          title: "Handling a Losing Streak",
          badge: "Circuit Breakers",
          desc: "After 3 consecutive stop-outs: cut position size by 50% immediately. After 5 consecutive stop-outs: stop trading for 1 full week (review only)."
        }
      ],
      body: `
### The Single Most Important Mental Habit
**Learn to do nothing during the weeks with no signal.**

VCP and pocket pivots don't give dozens of high-quality setups every month. Most of the time, **your job is waiting**. A trader who stares at the screen all day wanting to trade every candle will never succeed with this methodology.
`
    },
    {
      id: "journal",
      number: "08",
      title: "Trading Journal: The Cheapest Teacher",
      shortTitle: "8. Journal",
      icon: "📓",
      summary: "Log every trade across 6 dimensions to permanently eliminate recurring errors.",
      fields: [
        "1. Reason for buying (VCP contraction, pocket pivot, earnings catalyst)",
        "2. Market environment at the time of entry (breadth, distribution count)",
        "3. Initial stop-loss level and dollar risk calculation",
        "4. Pyramid add-on schedule and triggers",
        "5. Exit execution details: profit/loss amount and reason for exit",
        "6. Post-trade review: what was done right, what was done wrong, lessons learned"
      ],
      body: `
### Compounding Experience
Stick with this logging habit for 6 months and you'll be stunned by how many mistakes you repeat. This is infinitely more valuable than reading books, because **it is your own hard data**.

> *"Going back through my earliest journal entries, the frequency of repeating the same mistake dropped from once a week to once every few months. That gap is the true value of the journal."*
`
    },
    {
      id: "checklist",
      number: "09",
      title: "Interactive Pre-Flight Execution Checklist",
      shortTitle: "9. Checklist",
      icon: "✅",
      summary: "Verify every criterion before placing an order. Eliminate emotional trades.",
      body: "Use this interactive checklist before executing any new buy order to ensure strict compliance with the KovaView framework."
    },
    {
      id: "calculator",
      number: "10",
      title: "Interactive Position & Pyramid Calculator",
      shortTitle: "10. Calculator",
      icon: "🧮",
      summary: "Calculate total risk, max position size, and exact share allocation across the 50/30/20 pyramid tranches.",
      body: "Size your position dynamically based on your account equity, risk tolerance, and stop-loss level."
    }
  ]
};
