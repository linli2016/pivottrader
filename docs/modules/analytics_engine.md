# Module Design: Quantitative Analytics & Pattern Engine

[<- Back to Master Architecture](../architecture.md) | [Requirements](../requirements.md)

---

## 1. Overview & Purpose

The **Quantitative Analytics & Pattern Engine** is the mathematical core of PivotTrader. It computes technical indicators, cross-sectional Relative Strength percentiles, chart pattern detections (Minervini VCP, High-Tight Flag Power Plays, Low Cheats), dynamic expression filtering, and aggregate market regime breadth metrics.

---

## 2. Component Structure

```
application/engine/
├── momentum.py         # Vectorized SQL technical indicators & RS percentile rankings
├── expression.py       # Safe AST-based dynamic screening formula parser & compiler
├── fundamental.py      # Fundamental metrics: EPS/Sales QoQ acceleration & growth
├── market_pulse.py     # Stockbee Market Monitor breadth & distribution day counter
├── market_regime.py    # Macro trend state detection (Uptrend, Pullback, Correction)
└── setups/
    ├── vcp.py                  # Mark Minervini Volatility Contraction Pattern detector
    ├── power_play.py           # High-Tight Flag explosive momentum detector
    ├── low_cheat.py            # Shakeout recovery & early base entry recognizer
    ├── breakout.py             # Consolidation breakout & EMA surfing detector
    ├── episodic_pivot.py       # High-volume earnings gap-up detector
    └── parabolic_extension.py  # Climax run-up & mean-reversion detector
```

---

## 3. Mathematical Formulas & Algorithmic Logic

### 3.1 Relative Strength (RS) Composite Score & Rank
Calculates a multi-quarter weighted momentum score per stock:

$$\text{RS Score} = 0.4 \times \text{Ret}_{63d} + 0.2 \times \text{Ret}_{126d} + 0.2 \times \text{Ret}_{189d} + 0.2 \times \text{Ret}_{252d}$$

The daily **RS Rank** is computed across all active US equities on date $T$:
$$\text{RS Rank} = \left\lceil \frac{\text{Rank}(\text{RS Score})}{N} \times 99 \right\rceil \in [1, 99]$$

* **RS Blue Dot**: Triggered when a stock's RS Score achieves a new 52-week high before price itself reaches a 52-week high ([`tests/test_rs_blue_dot.py`](../../tests/test_rs_blue_dot.py)).

### 3.2 Minervini Volatility Contraction Pattern (VCP)
A Minervini VCP reflects progressive institutional supply absorption:
1. **Swing Extraction**: Local price extremes (highs and lows) are identified over the consolidation base ($20 \text{ to } 260$ trading bars).
2. **Contraction Sequence**: Consecutive pullbacks ($D_1, D_2, \dots, D_n$) must satisfy $D_k < D_{k-1}$ (e.g. $24\% \rightarrow 12\% \rightarrow 5\%$).
3. **Pivot Tightness**: The final contraction must narrow to $\le 10\%$ (ideally $\le 6\%$).
4. **Volume Drying**: Volume during the final contraction must contract below the 50-day average.

```
       Peak 1
        /\           Peak 2
       /  \   D1      /\
      /    \  24%    /  \   D2
     /      \       /    \  12%    Peak 3
    /        \     /      \         /\   D3
   /          \   /        \       /  \  5%  ==> PIVOT BREAKOUT
               \_/          \_____/    \_/
             Trough 1      Trough 2  Trough 3
```

### 3.3 Power Play (High-Tight Flag)
Identifies explosive velocity setups:
* $\text{Runup} \ge 100\%$ within $\le 40$ trading sessions ($\le 8$ weeks).
* Base consolidation depth $\le 25\%$ (strictly $< 35\%$).
* Consolidation length $\ge 10$ trading bars near peak.

### 3.4 Low Cheat Pattern
* Base consolidation length $\ge 20$ bars.
* A shakeout undercuts prior support followed by an immediate recovery reclaiming the 10 EMA / 50 SMA in the lower or middle third of the base ([`tests/test_low_cheat.py`](../../tests/test_low_cheat.py)).

---

## 4. Dynamic Expression Engine (`expression.py`)

PivotTrader features a safe domain-specific formula builder:
* **AST Parsing**: Parses user strings (e.g., `close > sma_50 AND rs_rank >= 80`) using Python's standard `ast` module.
* **Allowlist Enforcement**: Strictly prohibits function calls, attribute access, or SQL keywords (`DROP`, `DELETE`, `EXECUTE`) to prevent SQL injection.
* **DuckDB SQL Generation**: Transpiles valid AST trees directly into high-speed DuckDB SQL WHERE clauses.
* Verified by extensive unit tests in [`tests/test_expression.py`](../../tests/test_expression.py).

---

## 5. Temporal Integrity & Lookahead Bias Prevention

> [!CAUTION]
> **Zero Lookahead Rule**: In quantitative trading systems, using future data invalidates all edge.
> All window functions must use explicit boundaries:
> `ROWS BETWEEN N PRECEDING AND CURRENT ROW`
> Never use `LEAD()` or unbounded following windows in screener calculations.

---

## 6. Related Modules & Documentation

* [Storage & Database Engine Module](storage_database.md) - DuckDB tables where calculations execute.
* [Backend Services Module](backend_services.md) - Exposes setup results to REST endpoints.
* [System Requirements](../requirements.md) - Algorithmic specifications and criteria.

