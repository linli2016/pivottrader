# PivotTrader: Screen Setup Criteria & Guidelines

This document details the quantitative rules, market rationale, and technical criteria for all active screen setups in **PivotTrader**.

---

## Overview of Screen Setups

PivotTrader supports multiple setup overlays designed to identify superperformance stock patterns derived from legendary market wizard strategies (Mark Minervini, Nicolas Darvas, William O'Neil):

| Setup Name | Core Rationale / Focus | Key Technical Criteria |
| :--- | :--- | :--- |
| **Stage 2 Trend Baseline** | Institutional mark-up phase | Price > SMA50 > SMA150 > SMA200, SMA200 trending up |
| **Volatility Contraction Pattern (VCP)** | Supply drying up via contracting swings | Sequential wave contractions (D₁ > D₂ > D₃), final contraction $\le 10\%$, RS Rank $\ge 70$ |
| **Power Play (High Tight Flag)** | High-velocity momentum expansion | $\ge 100\%$ run-up within 8 weeks, drawdown $\le 25\%$, consolidation $\ge 12$ days |
| **IPO Base** | Primary base in young public companies | Listing age 10–350 days, distance from ATH $\le 25\%$, base depth $\le 35\%$ |
| **Darvas Box** | Box consolidation in confirmed uptrends | 3-day unbreached Box Top & Bottom, Box Width $\le 25\%$ |
| **New Leaders (Market Low Turn)** | Market correction turnover & leadership | 52-week high list / proximity ($\le 25\%$), strong surge off market lows ($\ge 20\%$), least corrected |

---

## 1. Stage 2 Trend Template (Mark Minervini Baseline)

### Rationale
History shows that virtually all superperformance stocks undergo their major price advances during **Stage 2 (Mark-Up Phase)**. Screening for Stage 2 ensures capital is only allocated to stocks with strong institutional sponsorship.

### Quantitative Criteria
1. **Price Above Moving Averages**: Current Stock Price > 50-day SMA, 150-day SMA, and 200-day SMA.
2. **Moving Average Alignment**: 50-day SMA > 150-day SMA > 200-day SMA.
3. **200-Day SMA Trend**: 200-day SMA must be trending upward for at least 1 month (22 trading days).
4. **52-Week High Proximity**: Stock price within 25% of its 52-week high (closer to high is preferred).
5. **Distance Above 52-Week Low**: Stock price at least 30% above its 52-week low.
6. **Relative Strength Rank**: Dynamic RS Percentile Rank $\ge 70$ (top 30% of market momentum).

---

## 2. Volatility Contraction Pattern (VCP Setup)

### Rationale
Developed by Mark Minervini, the VCP reflects a structural drying-up of supply. As weaker hands sell out during successive pullbacks, price volatility narrows progressively until little supply remains to resist price advances.

### Quantitative Criteria
1. **52-Week High Proximity**: Current price must be within $15\%$ of its 52-week high ($\frac{\text{High}_{52w} - \text{Close}}{\text{High}_{52w}} \le 15.0\%$).
2. **Contraction Waves from 52-Week High**: At least 2 contraction waves ($T_1, T_2 \dots$) occurring from the 52-week high point ($P_0$) to the current date.
3. **Sequential Narrowing**: Price contractions narrow sequentially (e.g., $T_1: 20\% \rightarrow T_2: 10\% \rightarrow T_3: 5\%$) with final contraction $\le 12\%$.
4. **Overhead Resistance**: Current price is not extended more than $5\%$ above the pattern's base peak resistance level.
5. **Fundamentals & RS**: QoQ EPS Growth $\ge 20\%$ (optional filter) and RS Percentile Rank $\ge 70$.

---

## 3. Power Play (High Tight Flag)

### Rationale
The Power Play is the most explosive setup in momentum investing. It occurs when a stock experiences a sudden, massive burst of buying interest followed by a shallow, high-level consolidation.

### Quantitative Criteria
1. **Explosive Price Expansion**: Price moves up $\ge 100\%$ within a 40-day (8-week) window, usually from relative dormancy.
2. **Shallow High-Level Drawdown**: Correction from 30-day peak high does NOT exceed $25\%$ (ideally $10\text{--}20\%$).
3. **Consolidation Duration**: At least 12 trading days elapsed since peak high to establish proper flag handle.
4. **Volume Contraction**: Volume drops significantly below 50-day average volume during consolidation ($\le 0.5\text{--}0.6\text{x}$ SMA).
5. **Moving Average Waiver**: Stage 150-day / 200-day SMA requirements are waived due to short-term velocity.

---

## 4. IPO Base Setup

### Rationale
Young companies emerging from their initial public offering (IPO) have no long-term overhead resistance and often become superperformance leaders during market upturns.

### Quantitative Criteria
1. **Listing Age**: IPO trading history between 10 days and 350 trading days.
2. **Proximity to All-Time High**: Distance from IPO all-time high $\le 25\%$.
3. **Base Depth Bounded**: Maximum correction depth from ATH $\le 35\%$.
4. **Modified Trend Baseline**: Price $\ge 50$-day SMA (150d/200d SMA rules waived due to insufficient price history).

---

## 5. Darvas Box Setup

### Rationale
Formulated by Nicolas Darvas, a Darvas Box identifies stocks consolidating in well-defined rectangular price boxes after a strong advance, setting up a pivot breakout.

### Quantitative Criteria
1. **Box Top Formation**: A 3-day local high where subsequent 3 days fail to breach that high.
2. **Box Bottom Formation**: A 3-day local floor following Box Top where subsequent 3 days fail to undercut that low.
3. **Box Width Constraint**: Box height $\frac{\text{Top} - \text{Bottom}}{\text{Top}} \le 25\%$.
4. **Price Boundary Integrity**: Current price remains within box boundaries ($[ \text{Bottom} \times 0.98, \text{Top} \times 1.08 ]$).
5. **Phase 2 Context**: Enforces Stage 2 Trend Template baseline.

---

## 6. New Leaders Setup (Market Correction & Turn Leadership)

### Rationale
Historical market analysis proves that **over 96% of superperformance stocks emerge from bear markets or general market corrections**. During market declines, true leaders demonstrate extreme price resilience by resisting sell-offs, trading near 52-week highs, and surging first off market lows.

### What to Look for Off Market Lows
1. **52-Week High List Proximity**: Stocks hitting the 52-week high list or trading within $25\%$ of a 52-week high (the closer to a new high, the stronger the leadership).
2. **Resilient Correction (Least Corrected)**: Stocks that corrected the least percentage amount during the general market's declining period.
3. **Powerful Surge off Lows**: Stocks surging sharply in price off recent market lows (largest percentage movers off market trough).
4. **Base-Building Context**: Stocks base-building and consolidating within the context of a confirmed long-term uptrend (Stage 2 / Trend Template).
5. **Proliferation of Setups**: Emerging through proper pivot buy points out of bases (VCP, Darvas Box, or High-Tight Flags).
6. **Relative Strength Leadership**: Top RS Percentile Ranks ($\ge 80\text{--}95$) or RS Ranks hitting new 52-week highs relative to the broader market.

### Quantitative Screener Parameters
- **`dist_from_52w_high`**: Distance from 52-week high $\le 25.0\%$ (default slider).
- **`surge_off_low_pct`**: Rebound gain off 60-day low $\ge 20.0\%$ (default slider).
- **`minNewLeadersRsFilter`**: Leader RS Rank $\ge 80$.
- **`enableNewLeaders52wHigh`**: Optional flag requiring stock to touch/hit new 52-week high.
- **`enableNewLeadersBase`**: Enforces Stage 2 trend alignment and pattern setup context.
