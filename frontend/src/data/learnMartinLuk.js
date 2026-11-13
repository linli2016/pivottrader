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
    description: "Capital preservation over prediction. A mathematical masterclass in turning a 20%–25% win rate into quadruple-digit compounding. Master compressed micro-stops (≤1.2%–2.0%), the math of exponential R-multiples, 9 & 21 EMA pullback confluences, Anchored VWAP (AVWAP) institutional support shelves, Undercut & Reclaim shakeout snipes, and equity-curve-driven risk modulation.",
    tags: [
      "+283% (2024) & +969% (2025) USIC",
      "Stop-Loss Compression",
      "Exponential R-Multiples",
      "9 & 21 EMA Pullbacks",
      "Anchored VWAP (AVWAP)",
      "Undercut & Reclaim",
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

By rebuilding his methodology around **micro-stop precision (1.0%–2.0%)**, **Anchored VWAP confluence**, and **orderly pullback timing**, he achieved verified, audited world-class milestones in the prestigious **U.S. Investing Championship (USIC)**:
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
            "When institutions accumulate an entire theme (e.g. AI power, cybersecurity, biotech, nuclear energy, space tech), the tailwind lifts all leaders."
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
      title: "Technical Arsenal: The Moving Average Stack & Anchored VWAP",
      shortTitle: "2. Technical Arsenal",
      icon: "📊",
      summary: "Deconstructing Luk's multi-timeframe chart template: why the 9 & 21 EMA ribbon, 50 EMA, 200 SMA, 1-Hour EMA, and Anchored VWAP define institutional cost bases.",
      indicators: [
        {
          name: "1. 9-Day Exponential Moving Average (9 EMA)",
          users: "Fast Momentum Guide",
          desc: "Measures immediate short-term momentum and price velocity on the daily and hourly charts.",
          bullets: [
            "In high-powered momentum runners, price hugs the rising 9 EMA without violating it for days.",
            "A shallow pullback that touches the rising 9 EMA and prints a reversal wick is the earliest low-risk entry opportunity.",
            "Trailing rule: aggressive partial positions or fast climax runners are trailed on a daily close below the 9 EMA."
          ]
        },
        {
          name: "2. 21-Day Exponential Moving Average (21 EMA)",
          users: "Core Swing Trendline",
          desc: "The primary intermediate trend guardrail and core swing trailing line.",
          bullets: [
            "Acts as major dynamic support during multi-week consolidations and orderly base digestion.",
            "Represents the core trailing stop: remaining runner position (65%–75%) is held as long as daily candles close above the rising 21 EMA.",
            "Slope is mandatory: only buy pullbacks when the 21 EMA is curled upward and trading above the 50 EMA."
          ]
        },
        {
          name: "3. 50-Day Exponential Moving Average (50 EMA) & 200-Day SMA",
          users: "Structural & Macro Trend Filters",
          desc: "Medium and long-term institutional trend filters.",
          bullets: [
            "50 EMA: Defines the deeper structural boundary of Stage 2 uptrends. A healthy leader should never stay below its 50 EMA for more than a few days.",
            "200 SMA: Macro regime gatekeeper. Only long trades are taken in stocks trading comfortably above their rising 200 SMA.",
            "A stock breaking below a declining 50 EMA or 200 SMA on volume is instantly disqualified from long watchlists."
          ]
        },
        {
          name: "4. 1-Hour Chart EMA (1H 9/21 EMA)",
          users: "Intraday Bridge & Timing",
          desc: "Connects the daily swing structure to intraday 1-minute and 5-minute execution.",
          bullets: [
            "When the daily chart is pulling back, look for the 1-Hour chart to test its own 21 EMA or hourly VWAP.",
            "Pullbacks that form a tight shelf on the 1-hour chart give an early, micro-risk entry before the daily candle even finishes.",
            "Helps avoid being shaken out by morning intraday wicks when the 1-hour trend remains firmly intact."
          ]
        },
        {
          name: "5. Anchored VWAP (AVWAP)",
          users: "Institutional Cost Basis",
          desc: "Calculates the Volume Weighted Average Price anchored to significant market catalysts and turns.",
          bullets: [
            "Anchor #1 (Breakout Day): Measures average price paid by institutional participants driving the new stage of the move.",
            "Anchor #2 (Episodic Pivot / Earnings Gap): The definitive cost basis of catalyst-driven institutional accumulation.",
            "Anchor #3 (Recent Swing High / Low): Gauges who is trapped and where overhead supply transforms into support.",
            "Confluence Power: When AVWAP converges with the rising 9 or 21 EMA, it creates an impenetrable institutional defense line."
          ]
        }
      ],
      body: `
### The Power of Indicator Confluence: The 3-Way "Handshake"
Martin Luk avoids cluttering his screen with oscillators, MACD, or RSI. He relies strictly on **price action, volume, moving averages, and Anchored VWAP**.

When an impulsive leader pulls back, the highest-probability entry occurs where multiple independent technical levels converge at the exact same price zone:

\`\`\`
Price Advance ↗
              \\
               \\   Orderly Pullback on Drying Volume
                \\
═════════════════●═══════════════════  ← Rising Daily 9 EMA
                 |
-----------------●-------------------  ← Anchored VWAP (from Breakout / EP Gap)
                 |
─────────────────●───────────────────  ← Prior Resistance Shelf (Now Support)
                 |
~~~~~~~~~~~~~~~~~●~~~~~~~~~~~~~~~~~~~  ← Rising Daily 21 EMA
\`\`\`

#### Why Anchored VWAP Is an Unfair Advantage
Standard moving averages weight only time and price. **Anchored VWAP incorporates institutional share volume**. 

When a stock gaps up on massive volume after earnings or an explosive catalyst, the Anchored VWAP from that gap session represents the **exact average price paid by all institutional buyers** since the catalyst occurred. 

When the stock pulls back to that line days or weeks later:
1. Institutions actively protect their cost basis, bidding up the shares before their positions turn red.
2. Short sellers who were trapped on the gap use the retest to cover their underwater positions.
3. Astute swing traders identify the confluence and enter with a razor-thin stop (1.0%–1.5%), unlocking asymmetric +10R to +30R upside.
`
    },
    {
      id: "ml_setups",
      number: "03",
      title: "The 6 Signature Setups: Pullbacks, Undercuts, Inside Days & EP Shelves",
      shortTitle: "3. Signature Setups",
      icon: "🎯",
      summary: "Mastering Martin Luk's complete USIC Championship playbook: the 9/21 EMA Handshake Pullback, the Undercut & Reclaim, Inside Day Compressions, Episodic Pivot Shelves, Oversold Panics, and Short-Side EMA Rejections.",
      patterns: [
        {
          num: "ML-01",
          name: "The 'Handshake' Confluence Pullback",
          headline: "9/21 EMA & Breakout AVWAP Retest with Drying Volume",
          badge: "Primary Bread & Butter",
          sentiment: "bullish",
          patternType: "ema_avwap_pullback",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "Instead of chasing extended breakouts where stops must be wide, wait for the first orderly pullback to test the rising 9 or 21 EMA and the Breakout Anchored VWAP.",
            "The volume must dry up dramatically as price pulls back into the confluence zone. This proves sellers are exhausted and institutions are quietly accumulating shares.",
            "Enter intraday as soon as the stock prints a reversal wick off the EMA/AVWAP or reclaims the 5-minute session VWAP with a tight stop right under the pivot low."
          ],
          specs: "Explosive prior run (+30% to +60%+), followed by a 3 to 7-day pullback into rising 9/21 EMA & Breakout AVWAP",
          pivot: "Intraday reversal candle / 5m ORH reclaim off the EMA/AVWAP support confluence",
          volume: "Severe volume drying (VDU) on pullback; surging volume on the reversal bounce",
          rule: "Stop placed directly below the pullback pivot low (1.0%–2.0% risk). Trim 25%–35% at +3R to +5R and trail remainder on 21 EMA."
        },
        {
          num: "ML-02",
          name: "The Undercut & Reclaim ('Shakeout Snipe')",
          headline: "Trapping Breakout Faders & Algorithmic Shakeouts for Explosive R",
          badge: "2024–2025 Evolution",
          sentiment: "bullish",
          patternType: "undercut_reclaim",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "In modern algorithmic markets, obvious support levels and moving averages get undercut deliberately to flush retail stop-loss orders.",
            "When a leading stock briefly undercuts its rising 21 EMA or prior swing low and immediately snaps back above it with strong volume, it creates an enormous short squeeze and trapped-seller rally.",
            "This setup allows the absolute tightest stop possible (1.0%–1.5%) placed just below the shakeout flush low, generating massive R-multiples upon recovery."
          ],
          specs: "Stock briefly dips below prior swing low or 21 EMA for 1 to 2 sessions, followed by an aggressive intraday volume reclaim",
          pivot: "Intraday reclaim of the undercut level or break above the 1-hour / 5m candle high",
          volume: "High volume on the undercut flush, followed by surging buy volume on the recovery candle",
          rule: "Stop placed 1 tick below the undercut low of the day. If price falls back below the undercut level, exit instantly."
        },
        {
          num: "ML-03",
          name: "Inside Day Compression ('Early Coiling Entry')",
          headline: "Pre-Breakout Volatility Pinch Right at the Rising 9 EMA",
          badge: "Volatility Spring",
          sentiment: "bullish",
          patternType: "inside_day_compression",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "After an impulsive leg up, the stock forms 1 or 2 consecutive Inside Days (Day 2 High < Day 1 High and Day 2 Low > Day 1 Low).",
            "This compresses daily trading volatility to a fine point right at or slightly above the rising 9 EMA, signaling an impending explosive expansion.",
            "By buying the breakout of the Inside Day High rather than waiting for the larger all-time-high pivot, you enter early with a micro-stop under the Inside Day Low."
          ],
          specs: "1 to 2 consecutive Inside Days formed directly on top of the rising 9 EMA after an impulsive advance",
          pivot: "Break above the Inside Day High (IDH) on expanding morning opening volume",
          volume: "Sharp volume contraction during the inside day; 2x–3x projected volume on the IDH trigger",
          rule: "Stop placed at the Inside Day Low (IDL) or morning Low of Day (typically 1.0%–1.8% risk). Move stop to breakeven after +2R."
        },
        {
          num: "ML-04",
          name: "Episodic Pivot (EP) — Day-1 & 2–5 Day Shelf",
          headline: "Trading Institutional Catalyst Gaps on High ADR% Leaders",
          badge: "Catalyst Engine",
          sentiment: "bullish",
          patternType: "episodic_pivot",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "Episodic Pivots represent structural shifts: monster earnings beats, major guidance raises, or transformative contract/regulatory approvals.",
            "Day 1 Execution: If the stock opens with high volume and tight pre-market range, buy the 1-minute or 5-minute Opening Range High (ORH) with stop at the morning low.",
            "Day 2–5 Secondary Shelf: If Day 1 is too wide or volatile to achieve a tight stop, wait for 2 to 5 days of horizontal coiling along the Earnings AVWAP. Enter when the shelf breaks out."
          ],
          specs: "High ADR% leader (ADR ≥ 5%) gapping up +8% to +25%+ on huge volume (>3x–10x average)",
          pivot: "Day 1: 1m or 5m ORH trigger. Day 2–5: Breakout above the horizontal consolidation shelf",
          volume: "Massive institutional accumulation volume (>300%–1000% of 50-day average)",
          rule: "Stop placed at Day 1 morning low or shelf low. Never let a stop exceed 50% of the stock's 20-day ADR."
        },
        {
          num: "ML-05",
          name: "Oversold Extreme / 3-Day Panic Reversal",
          headline: "Mean-Reversion Snap-Back on Overstretched Momentum Leaders",
          badge: "Mean Reversion",
          sentiment: "bullish",
          patternType: "oversold_panic_bounce",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "In volatile bull markets, top momentum leaders occasionally suffer severe 3-day panic flushes or gap-downs due to broad market sell-offs.",
            "When a fundamentally sound market leader is stretched far below its 1-hour and 9 EMA, selling pressure becomes mathematically exhausted.",
            "Luk monitors the 1-minute and 5-minute chart for an intraday capitulation spike, waiting for an intraday double bottom or 5m ORH reclaim to snipe a quick +5R to +10R bounce back to the 9/21 EMA."
          ],
          specs: "Leading stock drops 3 consecutive sessions, trading significantly below its rising 50 EMA or anchored AVWAP",
          pivot: "Intraday 5m ORH reclaim or higher-low reversal wick during morning panic flush",
          volume: "Climactic panic selling volume followed by sudden buying surge on the reclaim candle",
          rule: "Stop placed directly beneath the panic low of the day. Take fast profits (50%+) into the first snap-back test of the 9 EMA."
        },
        {
          num: "ML-06",
          name: "Short-Side Playbook: Weak Bounce into Declining 9/21 EMA",
          headline: "Capitalizing on Broken High-Flyers in Market Corrections",
          badge: "Short Strategy",
          sentiment: "bearish",
          patternType: "weak_ema_short_bounce",
          quoteHeader: "Martin Luk's USIC Championship Playbook",
          originalText: [
            "While Martin Luk is predominantly long, in bear markets or severe corrections, he selectively shorts broken parabolic leaders that have violated their 21 EMA.",
            "When a broken stock attempts a weak, low-volume bounce into its declining 9 EMA or 21 EMA and stalls out, sellers resume aggressive control.",
            "Short entry is taken as price prints an upper rejection wick at the declining EMA and breaks below the prior hour's low, risking ≤ 2.0%."
          ],
          specs: "Former momentum leader trading below a downward-sloping 9 and 21 EMA making a feeble, low-volume counter-trend bounce",
          pivot: "Breakdown below the 1-hour consolidation low or loss of the daily session VWAP",
          volume: "Weak, drying volume on the bounce upward; expanding volume as price rejects downward",
          rule: "Stop placed 1 tick above the bounce rejection high. Cover into heavy capitulation flushes or tests of the 200 SMA."
        }
      ],
      matrix: [
        {
          dimension: "Setup 1: The 9/21 EMA & AVWAP Retest",
          badge: "Primary Bread & Butter",
          points: [
            "Prior Move: Explosive impulsive rally (+30% to +60%+) out of a clean Stage 2 base.",
            "The Retest: 3 to 7 sessions of quiet pullback on declining, dry volume (VDU).",
            "Support Test: Price gently kisses the rising 9 EMA or 21 EMA and the Breakout AVWAP.",
            "Entry: Intraday reversal wick off the EMA/AVWAP or 5m session VWAP reclaim.",
            "Stop Loss: Directly beneath the pullback pivot low (1.0% to 2.0% risk)."
          ]
        },
        {
          dimension: "Setup 2: The Undercut & Reclaim ('Shakeout Snipe')",
          badge: "2024–2025 Evolution",
          points: [
            "Pattern: Stock briefly dips below a prior swing low or 21 EMA to flush stops.",
            "Reclaim: Within 1 to 2 sessions, aggressive buyers step in and push price back above the level.",
            "Significance: Traps short sellers and eliminates weak hands, creating high-velocity upside.",
            "Entry: Reclaim of the undercut support level on heavy intraday volume.",
            "Stop Loss: 1 tick below the flush low (often < 1.5% risk)."
          ]
        },
        {
          dimension: "Setup 3: Inside Day Compression Breakout",
          badge: "Volatility Spring",
          points: [
            "Pattern: 1 or 2 consecutive Inside Days (Day 2 High < Day 1 High and Day 2 Low > Day 1 Low).",
            "Significance: Daily volatility contracts tightly against the rising 9 EMA.",
            "Early Entry: Buy on breakout above the Inside Day High (IDH) before the major pivot.",
            "Stop Loss: Placed at Inside Day Low (IDL) or morning LoD (risk ≤ 1.5%)."
          ]
        },
        {
          dimension: "Setup 4: Episodic Pivot (EP) 2–5 Day Shelf",
          badge: "Catalyst Engine",
          points: [
            "Catalyst: Monster 10%+ earnings or guidance gap-up on huge institutional volume.",
            "The Shelf: Stock digests the gap in a tight 2%–4% range along the Earnings AVWAP.",
            "Secondary Entry: Buy breakout of the shelf resistance with stop at shelf low.",
            "Advantage: Bypasses Day-1 opening volatility while capturing the multi-week continuation."
          ]
        }
      ],
      body: `
### The Paradigm Shift: Why Martin Luk Evolved from Breakouts to Pullbacks & Undercuts

During his early career and initial 2021 drawdown, Luk attempted to buy traditional horizontal breakouts (buying at 52-week highs or base breakout points). In the choppy, algorithmic markets of 2024 and 2025, he discovered a critical flaw:

| Feature | Conventional Breakout Buying | Martin Luk Pullback & Undercut Reclaim |
| :--- | :--- | :--- |
| **Crowdedness** | Highly crowded; target of institutional algorithms | Stealthy; entered while retail traders are fearful |
| **Stop Distance** | Typically 4.0% to 7.0% below the base rim | **Ultra-tight: 1.0% to 2.0% below intraday pivot** |
| **Whipsaw Risk** | High (false breakouts, opening morning gap fades) | Low (entered *after* the shakeout has completed) |
| **R-Multiple Potential** | +3R to +5R on a standard swing move | **+10R to +30R on the exact same price move!** |
| **Day-1 Feedback** | Frequent opening chop and midday reversals | Immediate resolution (holds EMA/AVWAP or cuts quickly) |

---

### Setup 1: Anatomical Breakdown of the 9/21 EMA & AVWAP Retest

\`\`\`
       Peak High
          /\\
         /  \\   Quiet Orderly Pullback (Volume Dries Up)
        /    \\
       /      \\
Breakout       ● ← ENTRY POINT: Reversal Wick off Confluence
 Pivot        / \\   (9/21 EMA + Breakout AVWAP + Prior Base Rim)
    ─────────+   \\── STOP LOSS: Ultra-Tight (1.0% - 2.0%)
\`\`\`

#### Verification Checklist for Setup 1:
1. **Prior Thrust:** Stock must have demonstrated true market leadership (+30% to +60%+ impulsive thrust over the preceding 2 to 6 weeks).
2. **Volume Drying Up (VDU):** Pullback candles must exhibit declining daily volume. Selling must be orderly and unforced.
3. **No Structural Damage:** Pullback should not retrace more than 38% to 50% of the prior leg and must respect the rising 21 EMA.
4. **Intraday Confirmation:** Do not blindly buy a falling knife. Wait for the stock to touch the confluence zone and confirm buyers via a 5-minute ORH or session VWAP reclaim.

---

### Setup 2: Anatomical Breakdown of the Undercut & Reclaim ("Shakeout Snipe")

\`\`\`
Prior Swing Low / Support Level
──────────────┬───────────────────────────────● ← BUY TRIGGER (Reclaim with Volume)
              │       Undercut Shakeout      /
              │       (Flushes Retail Stops)/
              └───────────────▼────────────┘
                              ▲
                       STOP LOSS (< 1.5%)
\`\`\`

#### Execution Rules for the Undercut & Reclaim:
1. **The Trap:** The stock dips 0.5%–2% below a prominent swing low, horizontal shelf, or the rising 21 EMA. Stop-loss orders from breakout buyers are triggered.
2. **The Absorption:** Instead of plunging, buyers step in aggressively. Volume spikes as institutions absorb the sell orders.
3. **The Trigger:** As soon as price climbs back *above* the broken support level, Luk hits the buy button.
4. **The Stop:** Placed 1 tick below the lowest point of the flush. Because the shakeout is already finished, if price re-breaks the low, the thesis is immediately invalidated.

---

### Real USIC Championship Case Studies

#### 1. GME (+54R Episodic Pivot — May 2024)
- **Context:** Roaring Kitty returned to social media, triggering an unprecedented speculative volume surge.
- **Luk's Execution:** Instead of chasing options or buying blindly, Luk waited for the Day-1 market open. He observed massive liquidity turnover and identified a tight 1-minute and 5-minute opening range.
- **Risk Management:** He executed with a compressed **1.5% stop** at the morning low.
- **Outcome:** The stock exploded upwards for multiple consecutive sessions. By scaling out into strength (+5R, +10R, +25R) and letting the final runner ride, the trade generated **over +54R** on a single campaign.

#### 2. IONQ (+25R Handshake Confluence & 21 EMA Trend — Autumn 2024)
- **Context:** Quantum computing emerged as an institutional theme cluster alongside RGTI and QBTS.
- **Luk's Execution:** After an initial +50% thrust, IONQ pulled back quietly for 4 days into its rising 21 EMA and Breakout AVWAP. Daily volume contracted to the lowest level in a month.
- **Risk Management:** Luk sniped the 5m session VWAP reclaim with a **1.4% stop**.
- **Outcome:** IONQ resumed its advance, never closing below the daily 21 EMA for over 3 weeks. Luk trimmed 30% at +4R, raised the stop to breakeven, and trailed the core runner to lock in **+25R**.

#### 3. RKLB & PLTR (Institutional 21 EMA Surfing)
- Both names served as core compounding pillars during Luk's 2025 +969.8% USIC championship run.
- By continuously recycling profits: buying 9/21 EMA pullbacks and inside day compressions, trimming at +3R to +5R, and trailing the remainder along the 21 EMA, Luk multiplied his equity curve with virtually zero overnight catastrophic risk.
`
    },
    {
      id: "ml_execution",
      number: "04",
      title: "Precision Execution: Intraday Timing, Micro-Stops & The Half-ADR Rule",
      shortTitle: "4. Precision Execution",
      icon: "⚡",
      summary: "Executing with razor-sharp precision: 1-minute and 5-minute Opening Range Highs (ORH), intraday AVWAP reclaims, and the non-negotiable Half-ADR (≤50% ADR) stop limit.",
      indicators: [
        {
          name: "1-Minute & 5-Minute Opening Range High (1m / 5m ORH)",
          users: "Primary Intraday Trigger",
          desc: "High of the first 1-minute or 5-minute bar (9:30–9:35 AM EST).",
          bullets: [
            "Filters early opening spread volatility while capturing rapid institutional demand.",
            "Enter immediately as price crosses the 5m high with projected volume surging above average.",
            "Stop loss is placed at the 5-minute Low of the Day (LoD), locking in a 1.0%–1.8% initial risk."
          ]
        },
        {
          name: "Intraday Session VWAP Reclaim",
          users: "Pullback Confirmation",
          desc: "Timing entries on the 5-minute intraday chart as price reclaims the daily session VWAP.",
          bullets: [
            "If a stock opens soft and dips below session VWAP, wait for buyers to push it back above.",
            "Enter on the 5-minute candle close back above session VWAP with stop at the morning low.",
            "Confirms that sellers have exhausted intraday supply and institutional buyers have resumed control."
          ]
        },
        {
          name: "The Half-ADR (≤ 50% ADR) Stop Rule",
          users: "Non-Negotiable Risk Limit",
          desc: "The absolute dollar distance from entry to stop-loss must never exceed 50% of the stock's 20-day ADR.",
          bullets: [
            "Stop Distance = Entry Price − Stop Price",
            "Stop Distance % of ADR = (Stop Distance ÷ Daily ADR ($)) × 100 ≤ 50%",
            "If the required structural stop exceeds 50% of ADR, the trade is rejected—wait for tighter consolidation or pass."
          ]
        },
        {
          name: "The 'Day-1 Validation' Phenomenon",
          users: "Fast Failure Principle",
          desc: "Great momentum trades work almost immediately; bad trades linger and chop.",
          bullets: [
            "Over 80% of Luk's losing trades stop out within the first 15 to 90 minutes of entry.",
            "If a trade does not demonstrate profit cushion or upside momentum by midday on Day 1, risk is elevated.",
            "Never widen a stop or hold a failing trade overnight hoping for an opening miracle."
          ]
        }
      ],
      body: `
### The Half-ADR Rule: Mathematical Validation
Why is the **≤ 50% ADR rule** critical to Martin Luk's world-record performance?

Let's look at the statistics:
- If your stop is **1.0x ADR (100% of ADR)**, normal random daily volatility will stop you out 50% of the time, and reaching a **+3R** gain requires an extreme **3.0x ADR** move that occurs in less than 5% of trading days.
- If your stop is **≤ 0.33x to 0.50x ADR**, reaching a **+3R** gain requires only a normal **1.0x to 1.5x ADR** expansion!

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
          desc: "Raise the stop-loss on the remaining 65%–75% position to your exact entry price (breakeven). The trade is now mathematically risk-free ('Free Roll')."
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
Managing winning trades is where outsized returns are forged. Martin Luk separates his position into two distinct components:
1. **The Tactical Tranche (25%–35%)**: Sold into the first multi-day push at **+3R to +5R** to bank profits.
2. **The Core Runner (65%–75%)**: Held to capture multi-week institutional trend expansion along the rising 21 EMA.

\`\`\`
Entry: Risk = 1R (Stop ≤ 1.2%–2.0%)
  ↓
Day 2 to 4: Explosive thrust higher (+3R to +5R)
  → SELL 25% to 35% to lock in profit cushion!
  → Move stop on remainder to Breakeven ($0 Risk).
  ↓
Day 5+: Full trend surfing mode
  → Trail with the rising 21-day EMA (or 9 EMA for climax runners).
  → Exit remaining shares ONLY on the first daily close below 21 EMA.
\`\`\`

---

#### The Psychology of the Breakeven Stop
Once a trade hits **+3R** and you trim 30% while raising your stop to breakeven, **the worst possible outcome is a guaranteed winning trade**. 

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
