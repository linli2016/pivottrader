// Brian Shannon, CMT Complete Trading System Data
// Sources: "Maximum Trading Gains With Anchored VWAP" (2023) by Brian Shannon, CMT,
//          "Technical Analysis Using Multiple Timeframes" (2008) by Brian Shannon, CMT,
//          AlphaTrends (@alphatrends / alphatrends.net) Educational Archives,
//          and CMT Association / TraderLion Masterclass Breakdowns

export const BRIAN_SHANNON_CONTENT = {
  hero: {
    badge: "BRIAN SHANNON, CMT · ALPHATRENDS PLAYBOOK",
    title: "Anchored VWAP (AVWAP) & Multiple Timeframe Alignment",
    subtitle: "The Pioneer of Anchored VWAP on Market Structure, the 5-Day SMA & Right-Side Confirmation",
    author: "By Brian Shannon, CMT (@alphatrends · Author of Maximum Trading Gains With Anchored VWAP)",
    description: "\"Only Price Pays.\" Master the institutional framework created by Brian Shannon, CMT—the pioneer of Anchored VWAP (AVWAP). Learn how to unite Price, Volume, and Time from exact psychological inflection points, align Multiple Timeframes (Daily, 30-Min 5-Day SMA, and 5/15-Min triggers), execute the 4 signature AVWAP setups (Bounce, Pinch, Handoff, and Reclaim), and never buy a stock below a declining 5-day moving average.",
    tags: [
      "Anchored VWAP (AVWAP) Pioneer",
      "Only Price Pays",
      "Multiple Timeframe Alignment",
      "Rising 5-Day SMA Rule",
      "AVWAP Pinch & Handoff",
      "Under-and-Back-Over Reclaim",
      "4 Stages of Market Structure",
      "Right-Side Confirmation"
    ]
  },
  chapters: [
    {
      id: "bs_philosophy",
      number: "00",
      title: "\"Only Price Pays\": Market Structure & The 4 Stages of Price Cycles",
      shortTitle: "0. Core Philosophy & 4 Stages",
      icon: "⚓",
      summary: "Why price is the final arbiter of supply and demand, how to read the 4 market stages (Accumulation, Markup, Distribution, Markdown), and why you must anticipate rather than blindly participate.",
      rules: [
        {
          title: "Only Price Pays",
          badge: "Supreme Axiom",
          desc: "News, earnings, P/E ratios, and analyst upgrades do not pay you—only price advancement pays you. Technical analysis is the study of supply and demand in a market to determine where the path of least resistance lies."
        },
        {
          title: "Anticipate, Then Confirm",
          badge: "Right-Side Entry",
          desc: "Never place blind limit orders on a declining support level or AVWAP ('catching a falling knife'). Let price test the level, hold, and prove that buyers have regained control before committing capital."
        },
        {
          title: "Trade Only Stage 2 Markup (Long)",
          badge: "Cycle Discipline",
          desc: "Stocks cycle through 4 distinct stages: Stage 1 (Accumulation), Stage 2 (Markup), Stage 3 (Distribution), and Stage 4 (Markdown). Restrict long swing trades strictly to Stage 2 uptrends."
        },
        {
          title: "Risk Management Is Job #1",
          badge: "Capital Defense",
          desc: "You are not a 'technology stock trader' or a 'breakout trader'—you are a professional risk manager. Every trade must have a structural price invalidation point defined before entry."
        }
      ],
      body: `
### The AlphaTrends Philosophy: Over 30 Years of Market Mastery
**Brian Shannon, CMT** (Chartered Market Technician and founder of *AlphaTrends*) has spent more than three decades teaching institutional and retail traders how to read pure market structure. His two landmark books—*Technical Analysis Using Multiple Timeframes* (2008) and *Maximum Trading Gains With Anchored VWAP* (2023)—revolutionized modern swing trading by bridging classical market cycle theory with **Anchored Volume Weighted Average Price (AVWAP)**.

At the heart of Shannon's methodology is a single, uncompromising truth: **Only Price Pays.**
- A company can report record-breaking revenue, yet if institutions use that liquidity event to distribute shares and price breaks down, the stock is a sell.
- Conversely, a stock with terrible headlines that refuses to go down and begins printing higher highs and higher lows above a rising AVWAP is being accumulated by smart money.

---

### The 4 Stages of Market Structure
Before looking at any entry trigger or indicator, you must identify which of the **four market stages** the stock currently occupies across your primary timeframe:

\`\`\`
                     STAGE 3: DISTRIBUTION
                     (Churning, Wide Swings, Flat/Rolling MAs & AVWAPs)
                        ┌───────────────────┐
                       /                     \\
        STAGE 2:      /                       \\      STAGE 4:
        MARKUP       /                         \\     MARKDOWN
   (Higher Highs &  /                           \\  (Lower Highs & Lower Lows,
    Higher Lows,   /                             \\  Below Declining 5d/20d/50d SMA
    Rising AVWAP) /                               \\ & Declining AVWAP)
                 /                                 \\
  ──────────────┘                                   └──────────────
  STAGE 1: ACCUMULATION                             STAGE 1: ACCUMULATION
  (Base Building, Flat MAs, Oscillating Around AVWAP)
\`\`\`

| Market Stage | Institutional Activity | Price & Moving Average Structure | AlphaTrends Action Plan |
| :--- | :--- | :--- | :--- |
| **Stage 1: Accumulation** | Smart money quietly absorbs floating supply after a prolonged decline | Sideways range; price crosses back and forth across a flattening 50-day SMA and base AVWAP | **Watchlist Only.** Prepare alerts at upper range resistance; do not tie up dead capital early. |
| **Stage 2: Markup** | Institutional demand overwhelms supply; trend followers pile in | Higher Highs (HH) and Higher Lows (HL); price surfs above rising 5-day, 20-day, and 50-day SMAs & rising AVWAPs | **Aggressive Long Zone.** Buy confirmed pullbacks to rising AVWAPs and breakouts from tight consolidations. |
| **Stage 3: Distribution** | Institutions sell into retail euphoria; momentum decelerates | Volatility expands; deep pullbacks violate rising AVWAPs; moving averages flatten and roll over | **Lock in Profits / Tighten Stops.** Stop buying dips; exit longs on break of key swing lows. |
| **Stage 4: Markdown** | Aggressive institutional liquidation; trapped longs panic-sell | Lower Highs (LH) and Lower Lows (LL) beneath declining 5-day, 20-day, and 50-day SMAs & declining AVWAPs | **Cash or Short Only.** Never attempt to "buy the dip" below a declining 5-day SMA and declining AVWAP! |

> *"Amateur traders ask: 'How much money can I make on this trade?' Professional traders ask: 'Where am I wrong, and how much will it cost me to find out?'"* — **Brian Shannon, CMT**
`
    },
    {
      id: "bs_mtfa",
      number: "01",
      title: "Multiple Timeframe Alignment (MTFA) & The 5-Day Moving Average",
      shortTitle: "1. Multiple Timeframes & 5d SMA",
      icon: "🧭",
      summary: "How to align Daily, 30-Minute (5-Day SMA), and 5/15-Minute timeframes so institutional tailwinds and tactical execution work in harmony.",
      matrix: [
        {
          dimension: "1. Higher Timeframe (Daily & Weekly)",
          badge: "The Macro Tide",
          points: [
            "Establishes the primary Stage 1–4 cycle and major institutional reference levels.",
            "Key Moving Averages: 20-day SMA, 50-day SMA, and 200-day SMA.",
            "Key Anchors: Major swing highs/lows, earnings gap bars, YTD AVWAP, and 52-week high AVWAP.",
            "Rule: When the Daily chart is in Stage 2 above a rising 50-day SMA and rising AVWAP, the wind is at your back."
          ]
        },
        {
          dimension: "2. Intermediate Timeframe (30-Minute / 5-Day SMA)",
          badge: "The Tactical Compass",
          points: [
            "The bridge between daily structure and intraday execution (13 thirty-minute bars per day × 5 days = 65-period SMA).",
            "Represents the exact volume- and time-weighted psychology of the past full week of trading.",
            "Golden Rule: NEVER buy a stock while it is trading below a declining 5-Day SMA—even if it hits a daily support level!",
            "Wait for the 5-Day SMA to flatten out and price to reclaim it with a Higher Low."
          ]
        },
        {
          dimension: "3. Short-Term Execution Timeframe (5-Min / 10-Min / 15-Min)",
          badge: "Precision Trigger",
          points: [
            "Used exclusively once Daily and 30-Minute timeframes are aligned.",
            "Identifies the exact intraday transition from pullback (lower highs) to new markup (higher high + higher low).",
            "Allows you to place a tight, structural stop-loss beneath the intraday higher low rather than a wide daily bar low."
          ]
        },
        {
          dimension: "4. The Alignment Matrix (When to Press vs. Pass)",
          badge: "Synchronized Edge",
          points: [
            "Daily Bullish + 5-Day SMA Rising + Intraday Trigger = A+ Full-Size Swing Trade.",
            "Daily Bullish + 5-Day SMA Declining = Stand Aside (Pullback in progress; wait for right-side turn).",
            "Daily Bearish (Stage 4) + 5-Day SMA Rising = Counter-trend bounce; avoid long swing trades or prepare short entry as rally stalls at declining Daily AVWAP."
          ]
        }
      ],
      body: `
### Why the 5-Day SMA Is Brian Shannon's Secret Weapon
One of the most common mistakes swing traders make is buying a stock on the Daily chart the moment it touches its 20-day or 50-day moving average—only to watch it slice straight through support.

Why does that happen? Because **a pullback on the Daily chart is a Stage 4 downtrend on the 30-minute intraday chart!**

\`\`\`
DAILY CHART VIEW:                    30-MINUTE CHART VIEW (Zoomed In):
Price pulling back to 20 SMA         Price in Stage 4 Markdown below Declining 5-Day SMA!

      /\\                                 \\
     /  \\  ← Daily Pullback               \\  Declining 5-Day SMA (65-period on 30m)
    /    ● ← Amateur buys blind touch      \\        /\\  ← Price reclaims 5-Day SMA
   /    /                                   \\  /\\  /  ● ← BRIAN SHANNON ENTRY!
  /    /  Rising 20d SMA / AVWAP             \\/  \\/   ▲   (Right-Side Higher Low)
 /                                            ────────┴── Stop below Higher Low
\`\`\`

#### How to Configure the 5-Day Moving Average on Your Charts
Because the U.S. equity market is open for **6.5 hours (390 minutes)** per day, a 5-day moving average translates mathematically to:
- **30-Minute Chart:** \`65 SMA\` (13 bars/day × 5 days = 65 bars)
- **15-Minute Chart:** \`130 SMA\` (26 bars/day × 5 days = 130 bars)
- **10-Minute Chart:** \`195 SMA\` (39 bars/day × 5 days = 195 bars)

#### The Non-Negotiable 5-Day SMA Rules:
1. **Slope Dictates Bias:** If the 5-day SMA is declining, sellers are in control of the week's trend. Do not fight them.
2. **Wait for the Turn:** Let the stock touch the Daily AVWAP or Daily SMA, then watch the 30-minute chart. Wait for price to stop making lower lows, rally back above the 5-day SMA, pull back to form a **Higher Low**, and then break higher.
3. **Surf the Wave:** Once in a winning trade, as long as the stock remains above a rising 5-day SMA, the short-term trend is healthy.
`
    },
    {
      id: "bs_avwap_mechanics",
      number: "02",
      title: "Anchored VWAP (AVWAP) Mastery: Uniting Price, Volume & Time",
      shortTitle: "2. AVWAP Mechanics & Anchors",
      icon: "📊",
      summary: "Why Anchored VWAP is superior to traditional moving averages, how it reveals whether the average participant is winning or trapped, and the 6 high-impact anchor points.",
      indicators: [
        {
          name: "1. What Is Anchored VWAP (AVWAP)?",
          users: "True Cost Basis Benchmark",
          desc: "Calculates the exact cumulative volume-weighted average price starting from any specific bar or event chosen by the trader.",
          bullets: [
            "Formula: AVWAP = Σ(Price × Volume) ÷ Σ(Volume), anchored from a specific bar or catalyst.",
            "Unlike a 20-day or 50-day SMA—which weights a 100k-share holiday session equally with a 50M-share earnings day—AVWAP weights every price tick strictly by the volume transacted.",
            "Eliminates the 'drop-off effect' of standard moving averages where old bars arbitrarily drop out of the calculation."
          ]
        },
        {
          name: "2. Buyer vs. Seller Psychology Around AVWAP",
          users: "Sentiment Thermometer",
          desc: "Reveals who has financial leverage and who is feeling psychological pain since a major event.",
          bullets: [
            "Price ABOVE Rising AVWAP: The average buyer since the anchor is in profit; the average short seller is underwater and squeezed. Dips to AVWAP attract institutional defense.",
            "Price BELOW Declining AVWAP: The average buyer since the anchor is underwater and losing money. Rallies back up to AVWAP encounter overhead supply from trapped longs begging to 'get out at breakeven'.",
            "Flat / Tangled AVWAPs: Equilibrium between buyers and sellers (Stage 1 or Stage 3 chop). Stand aside until price breaks free."
          ]
        },
        {
          name: "3. The 6 High-Impact Anchor Points",
          users: "Where Psychology Shifted",
          desc: "AVWAP is only as meaningful as the bar you anchor it to. Always anchor to moments where market crowd psychology fundamentally changed.",
          bullets: [
            "Anchor #1: Major Swing Lows & Swing Highs (structural trend turning points).",
            "Anchor #2: Earnings Reports, Guidance Shocks & FDA Catalyst Gaps.",
            "Anchor #3: High-Volume Breakout & Breakdown Expansion Bars.",
            "Anchor #4: IPO First Trading Day (tracks lifetime cost basis of all IPO buyers).",
            "Anchor #5: 52-Week High / All-Time High & 52-Week Low.",
            "Anchor #6: Objective Timeframes (Year-to-Date YTD, Quarter-to-Date, Month-to-Date)."
          ]
        }
      ],
      body: `
### Why Traditional Moving Averages Lie—And Why AVWAP Tells the Truth
Imagine a stock trades 500,000 shares a day at \$50 for 19 days, and then on Day 20 gaps up on earnings to \$65 on **25,000,000 shares**.
- A **20-day Simple Moving Average (SMA)** will read **\$50.75**—treating the 25-million-share institutional re-rating as just 1/20th (5%) of the average!
- An **Anchored VWAP** anchored to the major swing low before the run will immediately pull up toward **\$61+**, accurately reflecting that the vast majority of real institutional dollars entered at higher prices.

---

### The 6 Essential AVWAP Anchor Points Explained

| Anchor Point | Why It Matters Psychologically | How to Trade It |
| :--- | :--- | :--- |
| **1. Major Swing Low** | Marks the exact day sellers were exhausted and institutional accumulation began. | As long as price holds above the Swing-Low AVWAP, the primary uptrend is intact. Buy confirmed bounces off this line. |
| **2. Major Swing High / ATH** | Represents the average cost basis of everyone who bought since the peak. | While price is below the Swing-High AVWAP, trapped buyers create overhead supply. A breakout **above** the Swing-High AVWAP means all recent buyers are now profitable—triggering explosive upside! |
| **3. Earnings / Catalyst Gap** | Earnings gaps re-price a company's fundamentals on massive institutional volume. | Anchor to the Day 1 gap bar. Hold longs only while price stays above the Earnings AVWAP; look for a 2–5 day shelf bounce off it. |
| **4. IPO Debut Day** | Every IPO has a finite float and huge initial volume. The IPO AVWAP is the lifetime waterline of the stock. | Never hold an IPO stock below its IPO-Day AVWAP. When a recent IPO reclaims its IPO AVWAP for the first time, it signals a major Stage 2 liftoff. |
| **5. High-Volume Breakout Bar** | Tracks whether the institutions who powered the breakout are defending their newly acquired shares. | On a break-and-retest, price should hold at or just above the Breakout Bar AVWAP while volume dries up. |
| **6. Year-to-Date (YTD) Anchor** | Institutional fund managers are benchmarked on calendar-year performance starting January 1. | YTD AVWAP acts as a magnet and major institutional support/resistance level throughout Q1–Q4. |
`
    },
    {
      id: "bs_setups",
      number: "03",
      title: "The 4 Signature AVWAP Setups: Bounce, Pinch, Handoff & Reclaim",
      shortTitle: "3. The 4 AVWAP Setups",
      icon: "🎯",
      summary: "Complete visual and tactical breakdown of Brian Shannon's four core setups from 'Maximum Trading Gains With Anchored VWAP'.",
      patterns: [
        {
          num: "#1",
          name: "The AVWAP Bounce (Right-Side Pullback)",
          headline: "Pullback to Rising AVWAP + Higher Low Confirmation",
          badge: "Core Trend Setup",
          sentiment: "bullish",
          patternType: "avwap_bounce",
          quoteHeader: "Brian Shannon's AlphaTrends Execution Rule",
          originalText: [
            "We never buy the initial touch of an Anchored VWAP because we don't know if the level will hold or if price will slice right through it. Instead, we let the AVWAP prove itself as support first, then we buy as momentum turns back up on the right side of the pullback."
          ],
          specs: "Stage 2 uptrend pulls back on declining volume to test a rising Swing-Low or Earnings AVWAP.",
          pivot: "Intraday Higher Low + breakout above the short-term pullback high / 5-Day SMA reclaim.",
          volume: "Light volume on the pullback into AVWAP; expanding volume on the right-side reversal.",
          rule: "Stop-loss is placed tightly beneath the pullback pivot low (just below the rising AVWAP)."
        },
        {
          num: "#2",
          name: "The AVWAP Pinch (Converging Squeeze)",
          headline: "Volatility Compression Between Swing-High & Swing-Low AVWAPs",
          badge: "High-Velocity Coil",
          sentiment: "bullish",
          patternType: "avwap_pinch",
          quoteHeader: "Brian Shannon's AlphaTrends Execution Rule",
          originalText: [
            "An AVWAP Pinch occurs when price becomes trapped between a declining AVWAP from a recent high and a rising AVWAP from a prior low. As these two lines converge, energy coils tightly. The resolution out of the pinch tells us which camp—buyers or sellers—has won the war."
          ],
          specs: "Declining AVWAP from a swing peak converges with a rising AVWAP from a swing low or gap bar.",
          pivot: "Breakout above the declining Swing-High AVWAP (and most recent lower high inside the pinch).",
          volume: "Volume dries up inside the narrowing pinch apex, then surges as price clears the upper AVWAP.",
          rule: "Place stop-loss directly below the Pinch apex low (underneath the lower rising AVWAP)."
        },
        {
          num: "#3",
          name: "The AVWAP Handoff (Accelerating Trend)",
          headline: "Transferring Support to a Steeper Anchor as Momentum Accelerates",
          badge: "Trend Acceleration",
          sentiment: "bullish",
          patternType: "avwap_handoff",
          quoteHeader: "Brian Shannon's AlphaTrends Execution Rule",
          originalText: [
            "When a stock accelerates away from its original anchor point, the initial AVWAP becomes too far below current price to be useful for risk management. By anchoring a new AVWAP at the secondary inflection point where momentum accelerated, we create a 'handoff' that tracks the new, steeper trajectory."
          ],
          specs: "Price surges far above the original Swing-Low AVWAP and forms a secondary high-volume continuation pivot.",
          pivot: "Pullback bounce off the new 'Handoff' AVWAP (anchored at the continuation breakout or gap bar).",
          volume: "Secondary volume surge marks the exact candle to anchor the new Handoff AVWAP.",
          rule: "Use the steeper Handoff AVWAP both to add/enter on shallow dips and as a tight trailing stop for open profits."
        },
        {
          num: "#4",
          name: "The AVWAP Reclaim ('Under-and-Back-Over')",
          headline: "Bear-Trap Shakeout Below AVWAP Followed by Rapid Reclaim",
          badge: "Shakeout Reversal",
          sentiment: "bullish",
          patternType: "avwap_reclaim",
          quoteHeader: "Brian Shannon's AlphaTrends Execution Rule",
          originalText: [
            "Sometimes the best long trades come right after a stock briefly breaks below a widely watched AVWAP, shakes out weak longs, and invites eager short sellers in—only to immediately reverse back above the AVWAP. Trapped shorts become forced buyers, fueling a fast surge."
          ],
          specs: "Price undercuts a key rising AVWAP or 5-Day SMA intraday, fails to follow through down, and snaps back above.",
          pivot: "Candle close back above the AVWAP + break of the intraday rebound high.",
          volume: "High volume on the reclaim bar as trapped breakdown shorts rush to cover.",
          rule: "Hard stop goes directly beneath the shakeout low—if it breaks down a second time, exit immediately."
        }
      ],
      body: `
### Deep-Dive: Comparing the 4 Signature AVWAP Setups

Each of Brian Shannon's four setups corresponds to a specific phase of institutional accumulation during a Stage 2 advance:

\`\`\`
                                                 /\\  Setup 3: AVWAP Handoff
                                                /  \\ (New Steeper Anchor)
                              /\\  Setup 2:     /    ●─────────►
                             /  \\ AVWAP Pinch /    / 
            /\\              /    \\  (Declining)   /  ← Handoff AVWAP
           /  \\  Setup 1:  /      \\──●───────────/
          /    \\ Bounce   /         / (Breakout!)
         /      ●────────/         /
        /      /                  /  ← Original Swing-Low AVWAP
       /      /                  /
      ●──────/──────────────────/
   Anchor #1 (Swing Low)
\`\`\`

#### Why the "AVWAP Pinch" Is One of the Highest-Expectancy Setups in Trading
When a stock makes a big run from a Swing Low (Anchor A) and then pulls back from a Swing High (Anchor B), two distinct groups of traders are battling:
1. **The Early Buyers (tracked by the Rising Swing-Low AVWAP):** Still sitting on healthy profits and looking to defend their average cost basis.
2. **The Late Buyers / Shorts (tracked by the Declining Swing-High AVWAP):** Late buyers are underwater and selling rallies to breakeven, while short sellers are pressing the downtrend from the peak.

As price squeezes into the narrow space between these two lines (**The Pinch**), daily ranges shrink dramatically. The moment buyers push price **above the declining Swing-High AVWAP**:
- Every trader who bought since the peak is suddenly back in the green (removing overhead supply).
- Every short seller who shorted since the peak is suddenly underwater (forcing urgent short-covering).
- Risk is ultra-tight because the rising Swing-Low AVWAP is right underneath your entry!
`
    },
    {
      id: "bs_execution",
      number: "04",
      title: "Precision Entry Tactics: Right-Side Confirmation & Avoiding Falling Knives",
      shortTitle: "4. Right-Side Execution",
      icon: "⚡",
      summary: "Why you should never buy a blind touch of AVWAP, how to spot the Left Side vs. Right Side of a pullback, and how to trigger entries on 5-minute / 30-minute Higher Lows.",
      matrix: [
        {
          dimension: "Left Side vs. Right Side of the V",
          badge: "Timing Anatomy",
          points: [
            "Left Side (Falling Knife): Price is actively dropping toward AVWAP with lower highs and lower lows on the 15m/30m chart. Buying here is pure guessing.",
            "The Inflection Test: Price touches or slightly undercuts the AVWAP and buyers step in to halt the decline.",
            "Right Side (Confirmed Turn): Price prints a bounce, pulls back to form a Higher Low above the AVWAP, and breaks above the bounce high. This is where professionals buy."
          ]
        },
        {
          dimension: "The 3-Step Entry Trigger Sequence",
          badge: "Mechanical Trigger",
          points: [
            "Step 1 (Touch & Hold): Stock in Stage 2 pulls back to a rising Daily AVWAP (e.g., from Earnings or Swing Low).",
            "Step 2 (Structure Shift): On the 15m or 30m chart, price stops making lower lows, reclaims the intraday AVWAP and/or flattening 5-Day SMA, and forms a Higher Low.",
            "Step 3 (Breakout Execution): Buy as price breaks above the most recent intraday swing high with a stop placed directly below the Higher Low."
          ]
        },
        {
          dimension: "Opening Gap & First 15–30 Minutes Rule",
          badge: "Avoid Amateur Hour",
          points: [
            "The opening 5 to 15 minutes are dominated by overnight emotional retail orders and wide market-maker spreads.",
            "Allow the initial opening range and intraday VWAP to establish before committing capital.",
            "Look for stocks that hold above their intraday VWAP and yesterday's afternoon AVWAP before breaking the morning high."
          ]
        },
        {
          dimension: "Multiple AVWAP Confluence ('The Power Cluster')",
          badge: "A+ Conviction",
          points: [
            "The strongest entries occur when two or more independent AVWAPs stack at the exact same price level.",
            "Example: YTD AVWAP + Earnings Gap AVWAP + Rising 20-Day SMA + Rising 5-Day SMA all converging at $50.00.",
            "Multi-anchor confluence attracts both algorithmic VWAP execution bots and institutional swing desks simultaneously."
          ]
        }
      ],
      body: `
### Left Side vs. Right Side: The Visual Difference

Understanding the difference between the **Left Side** (anticipation/gambling) and the **Right Side** (confirmation/trend alignment) is the single biggest leap in a trader's consistency:

\`\`\`
       LEFT SIDE (Sellers in Control)   │   RIGHT SIDE (Buyers Back in Control)
       Lower Highs & Lower Lows         │   Higher Low + Break of Resistance
                                        │
          \\                             │                     /\\  ▲ Stage 2 Resumes!
           \\                            │            Buy! ──► ●  /
            \\    /\\  Lower High         │        ── ─ ─ ─ ─ ─/─ / ─ ─ Resistance Break
             \\  /  \\                    │          /\\       /
              \\/    \\                   │         /  \\     /
                     \\                  │        /    \\   /
  ════════════════════\\═════════════════╪═══════/══════\\═/═══════════ Rising Daily AVWAP
                       \\      /\\        │      /        ●  ← Right-Side Higher Low (HL)
       Blind Touch      \\    /  \\       │     /         ▲
       (Amateur Entry)   \\  /    \\      │    /          └── Hard Stop Placed Here
                          \\/      \\─────┼───/
                                  Pivot Low
\`\`\`

#### Why Waiting for the Right Side Actually Improves Your Risk-to-Reward
Retail traders often object: *"If I wait for the bounce and Higher Low, I'm buying at \$51.00 instead of \$50.00! Doesn't that hurt my reward?"*

**No—it dramatically improves your mathematical expectancy:**
1. **Higher Probability:** At \$50.00 on the way down, you have no idea if the stock is going to stop at \$50.00 or plunge to \$46.00. Waiting for the Higher Low at \$50.50 proves institutional buyers are actively defending the level.
2. **Tighter, Defined Stop:** When you buy a falling knife at \$50.00, where is your stop? It has to be an arbitrary guess. When you buy the Right-Side breakout at \$51.00 after a Higher Low at \$50.40, your structural invalidation level is **\$50.35** (just \$0.65 risk!), allowing you to size up safely.
3. **Immediate Momentum:** Buying on the Right Side puts you into a stock that is already moving in your favor, eliminating dead-money opportunity cost.
`
    },
    {
      id: "bs_risk_management",
      number: "05",
      title: "Risk Management, Position Sizing & Scaling (\"Sell Some on the Way Up\")",
      shortTitle: "5. Sizing & Scaling Plan",
      icon: "🛡️",
      summary: "How Brian Shannon sizes positions from structural stops, why he sells 1/3 into initial strength, and how he trails stops using Higher Lows and the 5-Day SMA.",
      pyramid: [
        {
          tranche: "PHASE 1: STRUCTURAL STOP & SIZING",
          size: "100% Initial Position (0.5%–1.0% Equity Risk)",
          trigger: "Right-Side Confirmation Above AVWAP / 5d SMA",
          desc: "Place your hard stop just below the Right-Side Higher Low or Pinch apex. Calculate exact shares: (Account Equity × Risk %) ÷ (Entry - Stop). Never let a single trade risk more than 1% of equity."
        },
        {
          tranche: "PHASE 2: SELL 1/3 INTO INITIAL STRENGTH",
          size: "Trim 1/3 of Shares",
          trigger: "+2R to +3R Surge or First Overhead AVWAP Resistance",
          desc: "'Sell some on the way up.' Ring the cash register on 1/3 of the position during the first impulsive burst. Immediately raise the stop-loss on the remaining 2/3 to Breakeven (or below the newest Higher Low)."
        },
        {
          tranche: "PHASE 3: TRAIL HIGHER LOWS & 5-DAY SMA",
          size: "Core 2/3 Runner Position",
          trigger: "Ratchet Stop Under Each New 30m Higher Low / Handoff AVWAP",
          desc: "Hold the remaining shares as long as the stock makes Higher Highs and Higher Lows above its rising 5-Day SMA and Handoff AVWAP. Exit when price violates the prior Higher Low or closes below the declining 5-Day SMA."
        }
      ],
      body: `
### The Mathematics of Position Sizing
Brian Shannon stresses that **the chart dictates the stop level, and the stop level dictates your share size**:

> **Position Shares = (Total Account Equity × Max Risk %) ÷ (Entry Price − Structural Stop Price)**

#### Concrete Example ($100,000 Account, 0.75% Risk = $750 Max Loss):
- **Scenario A (Wide Setup):** Stock triggers at $100.00 with structural Higher Low stop at $95.00 ($5.00 risk/share).
  - **Shares = $750 ÷ $5.00 = 150 shares** ($15,000 position).
- **Scenario B (Tight AVWAP Pinch Setup):** Stock triggers at $100.00 with tight AVWAP Pinch stop at $98.50 ($1.50 risk/share).
  - **Shares = $750 ÷ $1.50 = 500 shares** ($50,000 position, or capped at max portfolio concentration limit of 25%–30%).

Both trades carry the **exact same $750 risk to your account**, yet Scenario B holds over 3x as many shares if the stock rallies +15%!

---

### Trailing Stop Evolution: Locking In Gains Without Choking the Trade
Once a trade moves in your favor and you have sold **1/3 into strength**, how do you manage the remaining **2/3 core position**?

\`\`\`
                                               /\\
                                              /  \\  /\\  ← Price breaks below HL3 & 5d SMA
                                   /\\        /    \\/  ● ← EXIT REMAINING CORE!
                                  /  \\      /     HL3
                       /\\        /    \\    /     Stop #3
                      /  \\      /      \\  /
           /\\        /    \\    /        \\/
          /  \\      /      \\  /         HL2 (Raise Stop #2 Here)
  Entry  /    \\    /        \\/
    ●───/      \\  /         HL1 (Raise Stop #1 + Trim 1/3!)
   /            \\/
  ─┴─ Initial Stop (Below Entry HL)
\`\`\`

1. **Never Let a Good Winner Turn Into a Loser:** Once price reaches **+2R to +3R** (or hits the first logical overhead resistance, such as a declining AVWAP from an old high), sell **1/3 of your shares** and move your stop to **Breakeven**.
2. **Trail Underneath Confirmed Higher Lows:** Do not raise your stop on every random green candle. Wait for the stock to pull back on the 30-minute chart, hold above the rising 5-day SMA / Handoff AVWAP, and **break out to a new high**. Only *after* the new high is made does the pullback low become a confirmed **Higher Low**—raise your stop just beneath it!
`
    },
    {
      id: "bs_short_selling",
      number: "06",
      title: "Stage 4 Short Selling & The 8 Golden Rules of AlphaTrends",
      shortTitle: "6. Stage 4 Shorts & Golden Rules",
      icon: "📉",
      summary: "Flipping the playbook upside down: using declining AVWAPs and the declining 5-Day SMA to spot trapped buyers, avoid value traps, and execute low-risk short sales.",
      offensive: [
        {
          name: "1. Rally Into Declining AVWAP Rejection",
          rule: "Inverted Bounce",
          action: "In a Stage 4 downtrend, wait for a weak counter-trend rally up into a declining AVWAP (anchored from the peak or breakdown gap). Short when price prints a Lower High and breaks below the 30m rising bounce trendline."
        },
        {
          name: "2. Bearish AVWAP Pinch Breakdown",
          rule: "Bearish Coil",
          action: "Price coils between a rising AVWAP from a recent dead-cat bounce low and a dominant declining AVWAP from the major top. Short the breakdown below the rising bounce AVWAP with a stop above the pinch high."
        },
        {
          name: "3. Failed Breakout ('Over-and-Back-Under')",
          rule: "Bull-Trap Short",
          action: "Price briefly pokes above a declining Swing-High AVWAP or horizontal resistance on weak volume, traps breakout chasers, and immediately closes back below the AVWAP. Short the failure with a stop just above the wick high."
        },
        {
          name: "4. Post-Earnings Gap-Down Continuation",
          rule: "Institutional Liquidation",
          action: "When a stock gaps down below its 50-day and 200-day SMA on massive earnings volume, anchor an AVWAP to the gap-down bar. Any feeble intraday or multi-day rally that fails at the Earnings AVWAP is a prime short."
        }
      ],
      defensive: [
        {
          name: "1. Never Average Down Into a Losing Trade",
          rule: "Losers Average Losers",
          action: "Adding to a position that is below your entry price and below a declining AVWAP compounds a mistake. Only add to winning positions after a confirmed Higher Low."
        },
        {
          name: "2. Never Hold Through Binary Earnings Events",
          rule: "Zero Coin-Flips",
          action: "Holding a swing trade into an quarterly earnings release is pure gambling—not technical trading. Either take profits before the report or reduce size so a 15% gap-down cannot hurt you."
        },
        {
          name: "3. Respect the Declining 5-Day SMA",
          rule: "No Dip-Buying in Stage 4",
          action: "When a stock is below a declining 5-day SMA and declining Earnings/Swing-High AVWAP, every 'cheap' price gets cheaper. Stand aside until structure repairs."
        },
        {
          name: "4. Honor Your Initial Stop Without Hesitation",
          rule: "First Loss Is Best Loss",
          action: "If price violates your structural invalidation level, get out immediately. You can always re-enter if the stock sets up a fresh Under-and-Back-Over reclaim later."
        }
      ],
      body: `
### The 8 Golden Rules of Brian Shannon's AlphaTrends Method

| # | Golden Rule | Core Principle & Execution Mandate |
| :--- | :--- | :--- |
| **1** | **Only Price Pays** | Ignore narratives, social media hype, and valuation opinions. Trade the objective reality of price action and volume. |
| **2** | **Know Your Market Stage** | Identify Stage 1, 2, 3, or 4 before touching a button. Buy only in Stage 2 Markup; short only in Stage 4 Markdown. |
| **3** | **Align Multiple Timeframes** | Trade in the direction of the Daily trend, filtered by the slope of the 30-minute **5-Day SMA**, and triggered on the 5m/15m chart. |
| **4** | **Never Buy Below a Declining 5-Day SMA** | A declining 5-day SMA means sellers control the past week of action. Wait for it to flatten and price to reclaim it. |
| **5** | **Anchor to Psychological Inflection Points** | Place AVWAPs at Swing Highs/Lows, Earnings Gaps, Breakouts, IPO Debut, and YTD to see the true institutional cost basis. |
| **6** | **Buy the Right Side, Never the Blind Touch** | Let AVWAP prove it is support first. Enter only after price bounces, forms a Higher Low, and breaks short-term resistance. |
| **7** | **Define Structural Risk Before Entry** | Size every position mathematically so that a move to your chart invalidation stop costs no more than 0.5%–1.0% of account equity. |
| **8** | **Sell Some on the Way Up & Trail Higher Lows** | Trim 1/3 into initial strength (+2R to +3R), raise stop to breakeven, and trail the core under successive 30-minute Higher Lows. |
`,
      pivotTraderLink: {
        label: "Scan for Surf EMA & Pullback Leaders in PivotTrader",
        hint: "Find Stage 2 momentum leaders pulling back into moving average & AVWAP support in the Candidates tab.",
        tab: "candidates",
        setup: "buyable"
      }
    },
    {
      id: "bs_checklist",
      number: "07",
      title: "Interactive Brian Shannon AVWAP & MTFA Pre-Trade Checklist",
      shortTitle: "7. Pre-Trade Checklist",
      icon: "✅",
      summary: "Verify all 10 non-negotiable AlphaTrends rules (Stage 2 structure, Rising 5-Day SMA, AVWAP confluence, Right-Side Higher Low, and structural stop sizing) before entering."
    },
    {
      id: "bs_calculator",
      number: "08",
      title: "Interactive AVWAP Position Sizing, Pinch Risk & Scaling Calculator",
      shortTitle: "8. AVWAP Risk Calculator",
      icon: "🧮",
      summary: "Calculate exact share sizing from your Right-Side Higher Low or AVWAP Pinch stop, verify 5-Day SMA alignment, and generate your 1/3 scaling and Higher Low trailing plan."
    }
  ]
};
