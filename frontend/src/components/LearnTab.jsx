import React, { useState, useMemo } from 'react';
import { marked } from 'marked';

// KovaView / MichaelZTrading Complete Trading System Data
const CONTENT = {
  en: {
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
  },
  zh: {
    hero: {
      badge: "KOVAVIEW · 交易体系教程",
      title: "单周 +40% 背后的交易体系",
      subtitle: "六年交易心法与实操体系压缩为一套不可商榷的执行清单",
      author: "作者：Michael (@MichaelZTrading / @kovainvest)",
      description: "选股不是玄学，是层层过滤。四大维度缺一不可。告别靠感觉交易，从选股、建仓、加仓到卖出的完整闭环执行体系。",
      tags: ["CAN SLIM", "Minervini VCP", "口袋支点", "倒金字塔加仓 50/30/20", "硬止损 7-8%", "最多 5 只持仓"]
    },
    chapters: [
      {
        id: "preface",
        number: "00",
        title: "前言：写给六年前的自己",
        shortTitle: "前言",
        icon: "🧭",
        summary: "两个月回撤40%后的觉醒：从懂得一堆零散概念，到形成从开盘到收盘的完整执行清单。",
        body: `
### 曾经的惨痛教训
那会儿两个月我的账户回撤超过 40%。问题不在于理论学得不够——Minervini、O'Neil、Weinstein 的书翻烂了好几本。

问题在于，我懂的是**一堆零散的概念，而不是一套从开盘到收盘的完整流程**。

- 每次进场全凭当下的感觉；
- 亏损死扛，稍有盈利就仓皇跑路；
- 自选池塞得满满当当，看哪个都觉得“差不多能买”；
- 大盘转弱时还在逆势加仓，自我安慰“这个标的和市场不一样”。

### 解决之道：把认知固化为不可商榷的清单
后来我做的一件事，就是把所有学到的东西，强行塞进一张**没有商量余地的执行清单**。从那之后，我的资金曲线才真正开始向上走出形态。

> *“读完这套体系不会让你明天就暴富。但它能让你从此彻底告别凭感觉交易。”*
`
      },
      {
        id: "selection",
        number: "01",
        title: "第一章：选股四大维度，缺一不可",
        shortTitle: "1. 选股四维",
        icon: "🎯",
        summary: "基本面、技术面、机构持仓、大盘环境四大维度同时达标，才具备进入备选池的资格。",
        matrix: [
          {
            dimension: "1. 基本面 (公司在真金白银增长)",
            badge: "CAN SLIM (C 与 A)",
            points: [
              "单季 EPS 同比增速 ≥ 25%，越高越好，近两个季度环比加速更优。",
              "年度 EPS 保持稳健增长，营收同比增速 ≥ 20%。",
              "警惕信号：若 EPS 增速连续两个季度从 30% 跌落至 10%，即便股价还没跌也是明确的危险警报。基本面是后视镜，市场才是先行指标。"
            ]
          },
          {
            dimension: "2. 技术面 (健康强劲的图表)",
            badge: "形态健康度",
            points: [
              "RS 相对强度评级 ≥ 80，最好 ≥ 90（全市场前 10% 强势股）。",
              "股价运行在 50 日均线上方。",
              "10 日均线运行在 20 日均线上方（快线趋势多头排列）。",
              "距离 52 周新高在 15%–20% 以内（彻底剔除处于阴跌通道的弱势票）。"
            ]
          },
          {
            dimension: "3. 机构持仓 (聪明钱正在大口吸筹)",
            badge: "13F 真实加仓",
            points: [
              "近几个季度持有该股的基金数量持续增加。",
              "知名长线长青基金（如富达 Fidelity、资本集团 Capital Group、骏利 Janus）在 13F 报表中大笔建仓，价值远胜分析师报告。"
            ]
          },
          {
            dimension: "4. 大盘环境 (CAN SLIM 中的 M)",
            badge: "大盘多空信号灯",
            points: [
              "大盘处于确认上升趋势（Confirmed Uptrend），无连续堆积的分布日（Distribution Days）。",
              "75% 的个股跟随大盘方向运行。在熊市中，即便是完美的形态胜率也仅约 30%；在牛市中，平庸的形态都能轻松获利。"
            ]
          }
        ],
        body: `
### 散户最常犯的错误
只看基本面而忽略技术面，或者只看图表而完全不看业绩。基本面好但形态稀烂的公司比比皆是，业绩垃圾但短期股价爆炒的也不少——**我们寻找的是两者完美重合的极少数精英标的**。

只有四个维度全部打勾，才有资格进入候选池。缺一个就坚决放弃，市场上从不缺股票。
`,
        pivotTraderLink: {
          tab: "candidates",
          label: "在 PivotTrader 中运行 Leaders 领涨股筛选",
          hint: "一键调出 RS≥90、>50 EMA 且 10>20 EMA 多头排列的核心标的"
        }
      },
      {
        id: "screening",
        number: "02",
        title: "第二章：选股落地——扫描器参数与三轮复盘筛选",
        shortTitle: "2. 筛选漏斗",
        icon: "🔬",
        summary: "每周运行硬指标初筛（50-80只），经三轮图表精筛，浓缩出最终的 10-15 只核心关注名单。",
        screenerRules: [
          { rule: "股价下限", val: "≥ $10.00", desc: "过滤低价仙股与投机垃圾股" },
          { rule: "20日平均振幅 (ADR20)", val: "≥ 4.0%", desc: "确保日内具有足够的波动力度与盈亏比空间" },
          { rule: "相对强度 (RS Rating)", val: "≥ 90", desc: "只做全市场最前 10% 的超级领涨股" },
          { rule: "中线趋势支撑", val: "股价 > 50 EMA", desc: "确保在机构中期平均成本线之上运行" },
          { rule: "快线趋势协同", val: "10 EMA > 20 EMA", desc: "短期动能保持多头排列" },
          { rule: "距52周低点涨幅", val: "≥ 70%", desc: "确认该股已走出底部，处于强劲的第二阶段主升通道" }
        ],
        passes: [
          {
            step: "第一轮 · 粗筛剔除",
            count: "50-80只 → 约30只",
            desc: "剔除形态杂乱难看、近期大幅破位跳水、或已完成大幅拉升进入竭尽阶段的标的。"
          },
          {
            step: "第二轮 · 形态定型",
            count: "约30只 → 约15只",
            desc: "重点标记具有清晰健康底部的标的：杯柄形态 (Cup with Handle)、平底通道 (Flat Base) 或波动收缩形态 (VCP)。"
          },
          {
            step: "第三轮 · 临门一脚",
            count: "约15只 → 10-15只聚焦名单",
            desc: "锁定 10 EMA 刚刚金叉 20 EMA、或者底部形态即将完成最终收缩收口的关键标的，列入核心 Watchlist。"
          }
        ],
        body: `
### 候选股票 vs 交易指令
扫描器的使命是缩小视野，而不是直接帮你买股票。真正的功夫在自选池建立之后。

每天开盘前要做的事情极度简单：
1. 观察核心自选池里的这 10-15 只股票今天是否给出标准形态（Setup）。
2. **如果没有，管住手，继续等待明天的信号**。

> *“在这行最大的进步，就是学会在没有 Setup 的日子里耐心地‘坐在自己的双手上’。扫描器找的是候选人，Setup 才是行动指令，切勿混为一谈。”*
`
      },
      {
        id: "entry",
        number: "03",
        title: "第三章：买入时机——VCP 为核，口袋支点为辅",
        shortTitle: "3. 买入触发",
        icon: "⚡",
        summary: "最高胜率的买点发生在供应彻底枯竭的那一刻。三大收缩同时发生，即是点火信号。",
        vcpDetails: [
          {
            name: "价格收缩 (Price Contraction)",
            icon: "📉",
            desc: "每次回撤幅度逐级收窄。例如：第一波回撤 25–35% → 第二波 15–20% → 最后一波仅 5–10%。"
          },
          {
            name: "成交量收缩 (Volume Contraction)",
            icon: "🔇",
            desc: "收缩末期成交量显著低于 50 日均量，甚至出现连续极度缩量的死寂日 (FU Day)，表明浮动筹码已被彻底洗净。"
          },
          {
            name: "波动幅度收缩 (Volatility Contraction)",
            icon: "📐",
            desc: "日内振幅不断收窄，连续 3–5 天收盘价变动小于 1%，K 线紧密粘合在一起形成紧凑平台。"
          }
        ],
        body: `
### 支点 (Pivot Point)：扳机价格
- **定义：** 整理形态末期价格平台的最高点。
- **触发价格：** 实际操作中以 **支点价格 + $0.10** 作为突破点火信号。
- **买入两大硬性条件（必须同时满足）：**
  1. 价格强势突破支点；
  2. 突破日成交量高出 50 日均量 **40%–50% 以上**。无量突破多为假突破。
- **买入安全区：** 支点至其上方 **5% 以内**。超过 5% 严禁追高！追高会大幅压缩止损空间，直接摧毁盈亏比。

---

### 口袋支点 (Pocket Pivot)：形态完成前的提前入场点
当股票形态尚未完全成形，但盘面异动极度强劲时，口袋支点提供了更早的先发买点。
- **定义：** 上涨日成交量，大于**过去 10 个交易日中任意一天的最大下跌成交量**。
- **盘口语言：** 盘中买盘瞬间压倒了过去两周的所有抛压，代表机构主力正在悄无声息地暴力抢筹。

#### 实战经典案例：$RKLB
> *“我在 $RKLB 抓到的那轮波澜壮阔的主升浪，并不是在日线大突破当天买入的，而是在底部收缩末期的口袋支点当天。当时日线还没完全走完杯柄，但小周期成交量已经彻底压过了过去两周的任意阴线。等日线突破再买的人，成本比我高了将近 8%。”*
`
      },
      {
        id: "stoploss",
        number: "04",
        title: "第四章：止损纪律——保住本金的生命线",
        shortTitle: "4. 止损生命线",
        icon: "🛡️",
        summary: "不会割肉的人在这个市场活不过三年。7-8% 是绝对不可逾越的天花板，实际止损必须更紧。",
        stopLevels: [
          { name: "硬性绝对天花板", dist: "7% - 8%", desc: "若较买入价跌达 7%–8%，无条件立即平仓出局。这是被 CAN SLIM 数十年实战验证的铁律。" },
          { name: "跌破支点止损", dist: "1% - 3%", desc: "买点在支点附近，跌回支点下方意味着本次突破已经失败，立刻离场。" },
          { name: "跌破买入日低点", dist: "2% - 3%", desc: "跌破买入日最低价下方 2–3%，短线波段交易最灵敏的止损位。" },
          { name: "21 EMA 动态止损", dist: "趋势跌破", desc: "强势领涨股多沿 21 EMA 上行，跌破表明主升动能出现松动。" },
          { name: "ATR 波动率止损", dist: "2× ATR", desc: "以 2 倍真实波动幅度作为缓冲空间，自动适应标的自身的波动特性。" }
        ],
        body: `
### 绝大多数人忽视的时间止损 (Time Stop)
如果买入后 **2–3 周内毫无进展**，股价始终在买入成本线附近磨磨唧唧，**直接平仓走人**。
- 一只真正优质的突破股，买入后 1–5 天内就应该拉开利润垫。
- 长期横盘磨时间，不仅消耗心态，更严重占用了资金的机会成本。时间也是一种止损！

### 震荡洗盘 (Shakeout) vs 真正破位 (Breakdown)
- **真正破位：** 放巨量跌破支点，收盘稳居支点下方，随后重心持续下移 → 坚决不碰。
- **洗盘动作：** 极度缩量，日内短暂刺穿支点但尾盘快速收复回升。若被洗出局后股价重新站上支点，**允许自己认错重新买回**。绝不要让毫无意义的自尊心阻碍客观交易。
`
      },
      {
        id: "adding",
        number: "05",
        title: "第五章：倒金字塔加仓——只对赢家下重注",
        shortTitle: "5. 金字塔加仓",
        icon: "🔺",
        summary: "绝不在亏损仓位上摊平成本。只在盈利验证正确的方向上，按 50% / 30% / 20% 倒金字塔式加仓。",
        pyramid: [
          { tranche: "第一笔 (底仓)", size: "50% 额度", trigger: "突破支点当天", desc: "在支点突破且放量确认时，建仓该标的预定资金的 50%。" },
          { tranche: "第二笔 (浮盈加仓)", size: "30% 额度", trigger: "上涨 2%–3% 后", desc: "在初战告捷、价格进一步拉开安全垫时追加 30%。" },
          { tranche: "第三笔 (终局加仓)", size: "20% 额度", trigger: "再涨 2%–5% 或口袋支点", desc: "在趋势顺畅推进或下一个口袋支点形成时打入最后 20%。" }
        ],
        body: `
### 单票仓位上限与原则
- **单票仓位上限 25%：** 无论你对某只股票有多大的把握，单票仓位绝不超过总资产的 25%。永远给未知的意外留足容错空间。
- **越加越小原则：** 加仓位置越高，金额必须越小，防止因抬高整体持仓成本而在轻微回调中被打翻。

### 加仓三不原则：
1. **绝不在亏损持仓上加仓。** 错了就是错了，补仓只会让亏损成倍放大，这是散户爆仓的第一元凶。
2. **绝不在超过支点 5% 之后加仓。** 追高买入会严重压缩止损空间，使得盈亏比不再划算。
3. **绝不在大盘转弱时加仓。** 大盘环境恶化时，即便手中最强的牛股也应开始收缩防线。
`
      },
      {
        id: "selling",
        number: "06",
        title: "第六章：卖出体系——进攻性与防御性卖出",
        shortTitle: "6. 卖出策略",
        icon: "💰",
        summary: "止损保护本金，卖出保护利润。进攻性锁定暴利，防御性在趋势破位时果断结案。",
        offensive: [
          {
            name: "8周 20% 锁仓法则",
            rule: "突破后 3 周内暴涨 ≥ 20%",
            action: "这是超级黑马起爆的标志性信号！强制持仓至少 8 周，绝不因微小利润过早下车，让利润充分奔跑。"
          },
          {
            name: "高潮竭尽式拉升 (Climax Run)",
            rule: "2–3周内急拉 25%–30%+",
            action: "连续出现大实体阳线、日内振幅暴增、伴随巨大成交量的向上跳空缺口（如 $MU、$SNDK 历史走势）。果断止盈 50%，剩余仓位以 10 EMA 跟踪止损。"
          },
          {
            name: "高位滞涨放量 (Churning)",
            rule: "放出天量但价格原地踏步",
            action: "连续数日巨量成交但股价滞涨或收于日内低点，主力机构正在暗中大规模派发筹码，应果断减仓或清仓。"
          }
        ],
        defensive: [
          {
            name: "放量跌破 50 日均线",
            rule: "大阴线放量跌破 50 SMA / 10周均线",
            action: "CAN SLIM 体系中最重要的防守卖出警报，机构长期防线崩溃，必须立即清仓。"
          },
          {
            name: "跌破主升趋势线",
            rule: "下破过去数个重要低点连线",
            action: "上升通道结构瓦解，清仓或将止损位收紧至成本线。"
          },
          {
            name: "大盘分布日密集堆积",
            rule: "4–5 周内出现 5 个以上放量下跌分布日",
            action: "聪明钱正在撤离整个市场，大幅提高现金比例。"
          },
          {
            name: "财报巨量向下跳空",
            rule: "财报公布后跳空暴跌并击穿 50 EMA",
            action: "这是机构主力的绝对判决，开盘第一时间市价清仓，绝不抱有任何反弹幻想。"
          }
        ],
        body: `
### 卖出最难的是“知行合一”
每个人在卖出时都会犹豫：“要是卖了它又涨怎么办？再等等看一天吧……” 结果眼睁睁看着浮盈化为乌有，甚至深套成巨亏。

> *“一旦卖出信号被触发，当下立即挂单离场——绝不要给自己任何第二猜测的机会。如果事后证明卖错了，坦然接受。长期来看，严守规则的人最终通赢，频频破例的人必定淘汰。”*
`
      },
      {
        id: "sizing_mindset",
        number: "07",
        title: "第七章：仓位控制与交易心理——活到下一个牛市的关键",
        shortTitle: "7. 仓位与心态",
        icon: "🧠",
        summary: "技术决定你能赚多少，仓位和心理决定你能否活下去。牛市重拳出击，弱势空仓观望。",
        rules: [
          {
            title: "牛市基调",
            badge: "绿灯行情",
            desc: "大盘站上 50 EMA 且无分布日扎堆。可持有 4–5 只核心领涨股，单票仓位不超过 25%。"
          },
          {
            title: "弱势 / 调整市基调",
            badge: "黄灯 / 红灯行情",
            desc: "大盘跌破 50 EMA 或分布日达到 5 天以上。总仓位降至 30% 以下，仅保留 1–2 只最强个股或完全持币空仓。"
          },
          {
            title: "同时持仓上限 5 只",
            badge: "精力聚焦",
            desc: "少于 3 只风险过度集中，超过 5 只要么精力跟不上，要么对每一只股票的止损与加仓点含糊不清。"
          },
          {
            title: "遭遇连败时的硬性熔断规则",
            badge: "心态保护开关",
            desc: "连续止损 3 次：立即将单笔交易仓位缩减 50%；连续止损 5 次：强制停盘休息整整 1 周，只做复盘，绝不买卖任何一股。"
          }
        ],
        body: `
### 顶尖交易员最核心的心态习惯
**学会在没有任何确定性信号的周度里，安心享受无所事事。**

一年之中，真正符合高质量 VCP 和口袋支点的确定性大机会其实并不多。绝大部分时间里，你的工作不是频繁进出，而是**耐心等待**。

一个一天 24 小时死死盯着屏幕、每一根 5 分钟 K 线都想做一把的人，永远不可能练就这套系统。
`
      },
      {
        id: "journal",
        number: "08",
        title: "第八章：交易日志——最廉价的顶级导师",
        shortTitle: "8. 交易日志",
        icon: "📓",
        summary: "详细记录每笔交易的六个维度，六个月即可清除绝大部分重复犯下的愚蠢错误。",
        fields: [
          "1. 买入理由 (为何选它：属于 VCP 还是口袋支点？有无催化剂？)",
          "2. 进场时的大盘多空环境与分布日状态",
          "3. 初始止损位设定与单笔美元风险计算",
          "4. 倒金字塔加仓计划与触发价",
          "5. 结案详情：最终盈亏金额与卖出触发逻辑",
          "6. 赛后复盘：如果重来一次，哪一步做对了？哪一步可以做得更从容？"
        ],
        body: `
### 属于你自己的实战数据
坚持认真记录半年交易日志，你会惊讶地发现自己总是在相同的地方重复跌倒。这比阅读上百本经典交易书籍更有用，因为**这是你自己拿真金白银换来的个人数据**。

> *“翻看我最初的交易日志，重复犯相同低级错误的频率从最初的一周一次，降到了后来的几个月一次。这个差距，就是这套系统和交易日志沉淀出来的无价壁垒。”*
`
      },
      {
        id: "checklist",
        number: "09",
        title: "实战行动指南：交互式开盘前执行清单",
        shortTitle: "9. 实战清单",
        icon: "✅",
        summary: "在开盘或提交委托单前，逐条核对 10 个关键要素，彻底消灭冲动感性交易。",
        body: "在向市场提交买入订单之前，逐项勾选以下检查项，确保你的每一笔操作都 100% 严守 KovaView 规则。"
      },
      {
        id: "calculator",
        number: "10",
        title: "实战计算工具：倒金字塔仓位与风险测算器",
        shortTitle: "10. 仓位计算器",
        icon: "🧮",
        summary: "输入账户净值、单笔风险比例、买入价与止损价，实时计算总股数及 50/30/20 金字塔挂单计划。",
        body: "严禁凭感觉下单。利用该计算器将你的单笔总风险严格控制在账户总值的 0.5%–1.0% 以内。"
      }
    ]
  }
};

export default function LearnTab({ setActiveTab, onSelectSetup }) {
  const [lang, setLang] = useState('en');
  const [activeChapterId, setActiveChapterId] = useState('selection');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcRiskPct, setCalcRiskPct] = useState(0.75); // 0.75%
  const [calcEntryPrice, setCalcEntryPrice] = useState(50.0);
  const [calcStopPrice, setCalcStopPrice] = useState(47.0);

  // Interactive Checklist State
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

  const t = CONTENT[lang];

  // Calculator calculations
  const calcResults = useMemo(() => {
    const equity = parseFloat(calcEquity) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntryPrice) || 0;
    const stop = parseFloat(calcStopPrice) || 0;

    const stopDistance = entry > 0 ? entry - stop : 0;
    const stopPct = entry > 0 ? (stopDistance / entry) * 100 : 0;
    const totalRiskDollars = (equity * (riskPct / 100));

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

  // Checklist score
  const checklistScore = useMemo(() => {
    const keys = Object.keys(checklistItems);
    const completed = keys.filter(k => checklistItems[k]).length;
    return {
      completed,
      total: keys.length,
      pct: Math.round((completed / keys.length) * 100)
    };
  }, [checklistItems]);

  const toggleChecklist = (key) => {
    setChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return t.chapters;
    const q = searchQuery.toLowerCase();
    return t.chapters.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.shortTitle.toLowerCase().includes(q)
    );
  }, [t.chapters, searchQuery]);

  const activeChapter = useMemo(() => {
    return t.chapters.find(c => c.id === activeChapterId) || t.chapters[1];
  }, [t.chapters, activeChapterId]);

  return (
    <div className="learn-page-container">
      {/* Header / Hero Section */}
      <div className="glass-card learn-hero-card">
        <div className="learn-hero-header">
          <div className="learn-hero-badge-group">
            <span className="badge badge-emerald">{t.hero.badge}</span>
            <span className="badge badge-outline">{t.hero.author}</span>
          </div>
          <div className="learn-lang-switch">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => setLang('zh')}
            >
              中文
            </button>
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
              <span className="learn-toc-title">
                {lang === 'en' ? 'Chapters Navigation' : '章节目录导航'}
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                {t.chapters.length} {lang === 'en' ? 'Topics' : '讲'}
              </span>
            </div>

            <div className="learn-search-box">
              <input
                type="text"
                className="learn-search-input"
                placeholder={lang === 'en' ? 'Search curriculum...' : '搜索章节与规则...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="learn-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <nav className="learn-toc-nav">
              {filteredChapters.map((ch) => (
                <button
                  key={ch.id}
                  className={`learn-toc-item ${activeChapterId === ch.id ? 'active' : ''}`}
                  onClick={() => setActiveChapterId(ch.id)}
                >
                  <div className="learn-toc-item-left">
                    <span className="learn-toc-num">{ch.number}</span>
                    <span className="learn-toc-icon">{ch.icon}</span>
                    <span className="learn-toc-text">{ch.shortTitle}</span>
                  </div>
                  {activeChapterId === ch.id && (
                    <span className="learn-toc-active-dot">●</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="learn-quick-actions">
              <div className="learn-quick-title">
                {lang === 'en' ? 'PIVOTTRADER LAUNCHPAD' : 'PIVOTTRADER 快捷联动'}
              </div>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                onClick={() => {
                  if (onSelectSetup) onSelectSetup('momentum');
                  if (setActiveTab) setActiveTab('candidates');
                }}
              >
                🎯 {lang === 'en' ? 'Run Leaders Screener' : '一键运行领涨股筛选'}
              </button>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ marginBottom: '8px', justifyContent: 'flex-start' }}
                onClick={() => setActiveTab && setActiveTab('market-monitor')}
              >
                📈 {lang === 'en' ? 'Check Market Regime' : '查看大盘多空状态'}
              </button>
              <button
                className="btn btn-secondary btn-sm full-width"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setActiveTab && setActiveTab('model-book')}
              >
                📚 {lang === 'en' ? 'Model Book Historicals' : '经典牛股图谱库'}
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
                <span className="learn-chapter-icon-large">{activeChapter.icon}</span>
              </div>
              <h2 className="learn-chapter-title">{activeChapter.title}</h2>
              <p className="learn-chapter-summary">{activeChapter.summary}</p>
            </div>

            {/* Special Section: Four Dimensions Matrix (Chapter 1) */}
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

            {/* Special Section: Screener Rules & 3-Pass Review (Chapter 2) */}
            {activeChapter.screenerRules && (
              <div className="learn-rules-container">
                <h3 className="section-subheading">
                  {lang === 'en' ? 'Weekly Screener Criteria (QuantConnect Backtested)' : '每周全量扫描硬指标 (经数百次回测验证)'}
                </h3>
                <div className="learn-rules-table-wrapper">
                  <table className="learn-table">
                    <thead>
                      <tr>
                        <th>{lang === 'en' ? 'Rule Dimension' : '规则维度'}</th>
                        <th>{lang === 'en' ? 'Threshold Parameter' : '门槛阈值'}</th>
                        <th>{lang === 'en' ? 'Rationale & Objective' : '设计原理与作用'}</th>
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

                <h3 className="section-subheading" style={{ marginTop: '24px' }}>
                  {lang === 'en' ? 'Three Rounds of Chart Review' : '三轮人工图表过滤漏斗'}
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

            {/* Special Section: VCP 3 Contractions (Chapter 3) */}
            {activeChapter.vcpDetails && (
              <div className="learn-vcp-container">
                <div className="learn-callout-box">
                  <div className="learn-callout-icon">💡</div>
                  <div>
                    <strong>{lang === 'en' ? 'True VCP Definition:' : '真正的 VCP 灵魂所在：'}</strong>{' '}
                    {lang === 'en'
                      ? 'Many traders mistakenly think VCP is just price contraction. A genuine, high win-rate VCP requires ALL THREE contractions simultaneously.'
                      : '多数人以为 VCP 只是价格收敛，这只看到了皮毛。真正高胜率的 VCP 必须是价格、成交量与波动率三大收缩同时发生。'}
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

            {/* Special Section: Stop Loss Levels (Chapter 4) */}
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

            {/* Special Section: Pyramid Tranches (Chapter 5) */}
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
                        📍 {lang === 'en' ? 'Trigger Point:' : '触发时机：'} <strong>{pyr.trigger}</strong>
                      </div>
                      <p className="learn-pyramid-desc">{pyr.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Section: Offensive & Defensive Selling (Chapter 6) */}
            {activeChapter.offensive && (
              <div className="learn-selling-container">
                <h3 className="section-subheading" style={{ color: '#34d399' }}>
                  🟢 {lang === 'en' ? 'Offensive Selling (Protecting Big Profits)' : '进攻性卖出 (守住暴利)'}
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

                <h3 className="section-subheading" style={{ color: '#f43f5e', marginTop: '24px' }}>
                  🔴 {lang === 'en' ? 'Defensive Selling (Capital Preservation)' : '防御性卖出 (保住本金)'}
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
              </div>
            )}

            {/* Special Section: Position Sizing & Mindset (Chapter 7) */}
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

            {/* Special Section: Trading Journal Logging Fields (Chapter 8) */}
            {activeChapter.fields && (
              <div className="learn-journal-container">
                <div className="learn-journal-card">
                  <h4 style={{ marginBottom: '12px', color: '#38bdf8' }}>
                    📋 {lang === 'en' ? 'Mandatory Journal Entry Fields:' : '每笔交易必记六大字段：'}
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

            {/* Special Chapter 9: Interactive Pre-Flight Checklist */}
            {activeChapter.id === 'checklist' && (
              <div className="learn-interactive-checklist-pane">
                <div className="checklist-score-banner">
                  <div className="score-summary">
                    <span className="score-title">
                      {lang === 'en' ? 'Execution Compliance Score' : '执行达标合规率'}
                    </span>
                    <div className="score-number">
                      {checklistScore.pct}%{' '}
                      <span className="score-sub">({checklistScore.completed}/{checklistScore.total} checks)</span>
                    </div>
                  </div>
                  <div className="score-status">
                    {checklistScore.pct === 100 ? (
                      <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ✓ {lang === 'en' ? 'Ready to Execute' : '100% 达标，准予下单'}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '14px', padding: '6px 14px' }}>
                        ⚠ {lang === 'en' ? 'Incomplete Rules' : '规则未完全满足，切勿急躁'}
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
                        {lang === 'en' ? '1. Market Environment Filter (Confirmed Uptrend)' : '1. 大盘环境确认处于健康上升通道'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Major indices above 50-day EMA without cluster of distribution days.'
                          : '标普500/纳指处于50EMA上方，近一个月无5天以上放量分布日。'}
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
                        {lang === 'en' ? '2. Fundamentals Quality (EPS YoY ≥ 25%)' : '2. 基本面强劲（EPS同比增速 ≥ 25%）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Sustained revenue growth (20%+) with no EPS deceleration.'
                          : '单季营收同比增速超20%，未出现连续两个季度的增速减缓。'}
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
                        {lang === 'en' ? '3. RS Relative Strength (Rank ≥ 80, Ideally ≥ 90)' : '3. 相对强度达标（RS ≥ 80，优选 ≥ 90）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Top decile performer. Never trade low RS stocks.'
                          : '属于全市场最前10%的强势领涨个股，绝不做低RS滞涨票。'}
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
                        {lang === 'en' ? '4. Technical Trend Health (10 EMA > 20 EMA > 50 SMA)' : '4. 均线多头排列（10 EMA > 20 EMA > 50 SMA）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Within 15–20% of 52-week high, >70% above 52-week low.'
                          : '距离52周新高在15-20%以内，较52周低点涨幅超70%。'}
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
                        {lang === 'en' ? '5. Clean Base Pattern (VCP / Cup with Handle / Low Cheat)' : '5. 具备干净清晰的底部收敛（VCP/杯柄/低位欺骗）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Clear progressive volatility contractions with tightening daily candles.'
                          : '每次回调幅度逐级缩小，整理末端K线紧密贴合。'}
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
                        {lang === 'en' ? '6. Volume Dry-Up (VDU) Before Breakout' : '6. 突破前出现明显地量（Volume Dry-Up）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Volume significantly below 50-day average, signaling exhausted supply.'
                          : '成交量明显低于50日均线，出现死寂日（FU Day）证明浮筹洗净。'}
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
                        {lang === 'en' ? '7. Hard Stop Defined (Distance ≤ 7–8%)' : '7. 止损位严格预先锚定（止损距离 ≤ 7-8%）'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Stop anchored below pivot or entry low. If >8%, sizing must be scaled down.'
                          : '锚定在支点或进场日低点下方。若止损距离过宽必须缩减仓位。'}
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
                        {lang === 'en' ? '8. Single Position ≤ 25% of Portfolio' : '8. 单票最大仓位不超过总资金 25%'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Strict capital cap regardless of subjective confidence.'
                          : '无论对个股有多自信，坚决不突破 25% 仓位硬红线。'}
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
                        {lang === 'en' ? '9. Total Concurrent Positions ≤ 5' : '9. 全账户持仓标的不得超过 5 只'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Concentration allows close management of exits and risk.'
                          : '持仓过多会导致无法严格盯防每一只标的的止损与加仓。'}
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
                        {lang === 'en' ? '10. Pre-Trade Journal Plan Recorded' : '10. 已将进场理由与止损加仓计划录入日志'}
                      </span>
                      <span className="checklist-item-desc">
                        {lang === 'en'
                          ? 'Document reason, trigger, and stop before pulling the trigger.'
                          : '在下单前记录为什么买入、止损在哪里，坚决拒绝凭一时兴起交易。'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Special Chapter 10: Interactive Position & Pyramid Calculator */}
            {activeChapter.id === 'calculator' && (
              <div className="learn-calculator-pane">
                <div className="calc-inputs-grid">
                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Total Account Equity ($)' : '账户总资金 ($)'}</label>
                    <input
                      type="number"
                      className="calc-input"
                      value={calcEquity}
                      onChange={(e) => setCalcEquity(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Risk Per Trade (%)' : '单笔最大风险容忍 (%)'}</label>
                    <input
                      type="number"
                      step="0.05"
                      className="calc-input"
                      value={calcRiskPct}
                      onChange={(e) => setCalcRiskPct(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Recommended: 0.5% – 1.0%' : '推荐范围：0.5% – 1.0%'}</span>
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Entry / Pivot Price ($)' : '预定买入 / 支点价 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={calcEntryPrice}
                      onChange={(e) => setCalcEntryPrice(e.target.value)}
                    />
                  </div>

                  <div className="calc-input-group">
                    <label>{lang === 'en' ? 'Stop-Loss Price ($)' : '硬止损触发价 ($)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      className="calc-input"
                      value={calcStopPrice}
                      onChange={(e) => setCalcStopPrice(e.target.value)}
                    />
                    <span className="calc-hint">{lang === 'en' ? 'Below pivot or entry low' : '锚定支点下方或低点'}</span>
                  </div>
                </div>

                {/* Risk Warning Banners */}
                {calcResults.isStopTooWide && (
                  <div className="calc-alert-banner alert-danger">
                    ⚠️ {lang === 'en'
                      ? `Stop distance is ${calcResults.stopPct.toFixed(1)}%, exceeding the hard 7–8% ceiling! Tighten stop or skip setup.`
                      : `止损距离达到 ${calcResults.stopPct.toFixed(1)}%，已超过 7–8% 的硬性上限！请收紧止损位或放弃该形态。`}
                  </div>
                )}

                {calcResults.isPositionTooLarge && (
                  <div className="calc-alert-banner alert-warning">
                    ⚠️ {lang === 'en'
                      ? `Position size is ${calcResults.positionPctOfEquity.toFixed(1)}% of account, exceeding the 25% single-stock cap!`
                      : `计算仓位占总资金 ${calcResults.positionPctOfEquity.toFixed(1)}%，超过了 25% 单票持仓上限！需缩减规模。`}
                  </div>
                )}

                {/* Calculated Metrics Grid */}
                <div className="calc-metrics-grid">
                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Dollar Risk' : '单笔总美元风险'}</span>
                    <span className="calc-metric-value" style={{ color: '#f43f5e' }}>
                      ${calcResults.totalRiskDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">{calcRiskPct}% {lang === 'en' ? 'of equity' : '总资产占比'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Stop-Loss Distance' : '止损距离幅度'}</span>
                    <span className={`calc-metric-value ${calcResults.isStopTooWide ? 'text-danger' : 'text-emerald'}`}>
                      {calcResults.stopPct.toFixed(2)}%
                    </span>
                    <span className="calc-metric-sub">-${calcResults.stopDistance.toFixed(2)} / share</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Shares to Buy' : '建议买入总股数'}</span>
                    <span className="calc-metric-value text-emerald">
                      {calcResults.totalShares.toLocaleString()}
                    </span>
                    <span className="calc-metric-sub">{lang === 'en' ? 'Max shares allowed' : '上限允许股数'}</span>
                  </div>

                  <div className="calc-metric-card">
                    <span className="calc-metric-label">{lang === 'en' ? 'Total Position Value' : '持仓总资金规模'}</span>
                    <span className={`calc-metric-value ${calcResults.isPositionTooLarge ? 'text-warning' : 'text-primary'}`}>
                      ${calcResults.totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="calc-metric-sub">
                      {calcResults.positionPctOfEquity.toFixed(1)}% {lang === 'en' ? 'of equity' : '总资金占比'}
                    </span>
                  </div>
                </div>

                {/* 50 / 30 / 20 Pyramid Scaling Plan */}
                <h3 className="section-subheading" style={{ marginTop: '28px' }}>
                  🔺 {lang === 'en' ? 'Recommended 50% / 30% / 20% Pyramid Scaling Orders' : '倒金字塔加仓挂单计划 (50% / 30% / 20%)'}
                </h3>
                <div className="pyramid-orders-grid">
                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-emerald">TRANCHE 1 (50%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'At Breakout' : '突破支点买入'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche1Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${parseFloat(calcEntryPrice).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche1Shares * parseFloat(calcEntryPrice)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-warning">TRANCHE 2 (30%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'After +2.5%' : '涨幅达 +2.5%'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche2Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${calcResults.addPrice1.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche2Shares * calcResults.addPrice1).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="pyramid-order-card">
                    <div className="order-header">
                      <span className="badge badge-outline">TRANCHE 3 (20%)</span>
                      <span className="order-trigger-badge">{lang === 'en' ? 'After +5.0%' : '涨幅达 +5.0%'}</span>
                    </div>
                    <div className="order-main">
                      <div className="order-shares">
                        {calcResults.tranche3Shares.toLocaleString()} <span className="shares-label">{lang === 'en' ? 'Shares' : '股'}</span>
                      </div>
                      <div className="order-price">
                        {lang === 'en' ? 'Price:' : '价格：'} <strong>${calcResults.addPrice2.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="order-footer">
                      {lang === 'en' ? 'Cost:' : '占用金额：'} ${(calcResults.tranche3Shares * calcResults.addPrice2).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                    if (onSelectSetup) onSelectSetup('momentum');
                    if (setActiveTab) setActiveTab(activeChapter.pivotTraderLink.tab);
                  }}
                >
                  🚀 {lang === 'en' ? 'Launch Tool' : '立即启动'}
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
  );
}

