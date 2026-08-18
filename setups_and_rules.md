# 📈 PivotTrader - Trading Setups & Execution Rules

Welcome to your central reference playbook for technical setups, screening criteria, risk management, and trading rules.

---

## 🎯 Core Technical Setups

### 1. High Relative Strength (RS Rank)
* **Objective:** Identify institutional market leaders showing outperformance relative to the S&P 500 / NASDAQ index.
* **Criteria:**
  - RS Percentile Rank $\ge 70$ (ideal market leaders $\ge 90$).
  - Price above 50-day, 150-day, and 200-day Simple Moving Averages (Stage 2 Uptrend).
  - 200 SMA trending upward for at least 1 month.

### 2. High Tight Flag / Power Play
* **Objective:** Capture explosive momentum continuations after a rapid price surge.
* **Criteria:**
  - **Runup:** Price surge of $\ge 100\%$ within the past 8 weeks ($40\text{--}60$ calendar days).
  - **Consolidation Depth:** Pullback from peak is tight ($\le 25\%$).
  - **Volume:** Volume contracts significantly as price tightens near the peak.
  - **Entry:** Breakout above the high of the tight consolidation range on expanding volume.

### 3. Volatility Contraction Pattern (VCP)
* **Objective:** Buy low-risk pivot entry points as supply dries up across contraction cycles (Mark Minervini setup).
* **Criteria:**
  - 2 to 4 successive price contractions (e.g. $25\% \rightarrow 12\% \rightarrow 6\%$).
  - Each trough is shallower than the previous one.
  - Volume dries up dramatically on the final contraction (Pivot Area).
  - **Trigger:** Breakout through the pivot line with volume expansion.

### 4. Kristjan Qullamaggie Breakout (HTF / MA Surfing)
* **Objective:** Trade momentum continuation out of tight consolidations riding the 10 EMA / 20 EMA.
* **Criteria:**
  - **1M Return:** Stock has surged $\ge 20\text{--}50\%+$ over the past month.
  - **Moving Average Support:** Price stays above 10 EMA or 20 EMA during consolidation.
  - **Range Contraction:** Highs become flat while lows higher (ascending triangle/flag).
  - **Entry:** Opening Range Breakout (ORB) on the 1-min or 5-min chart when price breaks the consolidation line.
  - **Stop-Loss:** Low of the breakout day or low of the consolidation range.

### 5. Episodic Pivot (EP)
* **Objective:** Capitalize on major institutional re-valuations driven by unexpected fundamental catalysts.
* **Criteria:**
  - **Catalyst:** Blowout earnings report, major guidance raise, FDA approval, or transformative contract.
  - **Gap Size:** Gap up of $\ge 10\%$ at market open.
  - **Relative Volume:** Heavy opening volume ($\ge 2.5\times \text{ to } 5\times$ 50-day average volume).
  - **Action:** Buy near the open or on first 5-minute ORB if price holds above the opening print.

### 6. IPO Base
* **Objective:** Catch early institutional accumulation in high-growth newly public companies.
* **Criteria:**
  - **Age:** IPO date within the last 350 trading days.
  - **Base Depth:** First major base depth $\le 35\%$.
  - **Proximity:** Consolidation within $15\%$ of All-Time Highs (ATH).

### 7. Darvas Box Setup
* **Objective:** Trade mechanical breakouts from top-boundary price boxes near 52-week highs (Nicolas Darvas).
* **Criteria:**
  - Stock reaches a new 52-week high, establishing the **Box Top**.
  - Price bounces for 3 consecutive days without exceeding the Box Top, establishing the **Box Bottom**.
  - **Trigger:** Buy when price breaks 1 tick above the Box Top on high volume.

### 8. Parabolic Climax (Short / Long)
* **Objective:** Fade overextended vertical moves or catch panic reversal bounces.
* **Criteria:**
  - **Extension:** Price has run up $\ge 40\text{--}100\%$ in under 10 trading days.
  - **Distancing:** Price is extended $> 18\%$ above its 10 EMA.
  - **Reversal Trigger:** First high-volume red day or breakdown below previous day's low.

---

## 🛡️ Risk Management & Execution Rules

1. **Maximum Risk Per Trade:**
   - Never risk more than **0.5% to 1.0%** of total portfolio equity on any single trade.

2. **Stop-Loss Discipline:**
   - Always place a hard or mental stop-loss at the pivot low or 10 EMA immediately upon entry.
   - Max allowable stop loss distance: **5% - 7%**. If the pivot requires a wider stop, size down.

3. **Position Sizing Formula:**
   $$\text{Position Size (Shares)} = \frac{\text{Account Equity} \times \text{Risk \%}}{\text{Entry Price} - \text{Stop Loss Price}}$$

4. **Profit Taking & Trailing Stops:**
   - **Partial Gains:** Lock in $1/3$ position at $+3R$ to $+5R$ gain.
   - **Trailing:** Trail remaining position along the 10 EMA (for fast momentum) or 20 EMA (for core trend).
   - Exit full position if price closes below the 20 EMA on heavy volume.

5. **Market Trend Environment Filter:**
   - **Green Light:** Market Monitor 10/20-day SMA ratio positive, S&P 500 above 21 EMA. Full size allowed.
   - **Yellow Light:** Distribution days accumulating, market below 21 EMA. Cut size to 50%.
   - **Red Light:** S&P 500 below 50 SMA and 200 SMA. Cash is king — no new breakout trades.

---

## 📝 Trader Notes & Review Checklist

- [ ] Is the overall market environment favorable?
- [ ] Is the stock in a Stage 2 uptrend with high RS Rank?
- [ ] Is there a clear, tight pivot level with drying volume?
- [ ] Is my risk defined before placing the order?
- [ ] Did I record the trade entry rationale in my journal?
