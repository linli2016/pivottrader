In **KovaView**, the horizontal bars along the right side of the stock chart represent the **Options Open Interest (OI) / Gamma Exposure (GEX) Profile by Strike Price**.

Unlike a standard volume profile (which tracks shares traded at each price), these bars plot institutional options market positioning across strike prices.

---

### Key Components

#### 1. The Horizontal Bars (Strike Concentrations)
* **Teal / Green Bars:** Represent **Call Open Interest** (or positive call gamma). These are clustered primarily at strikes above the current market price ($501.61).
* **Red / Maroon Bars:** Represent **Put Open Interest** (or put gamma). These are clustered primarily at strikes below the current price.
* **Discrete Levels:** Notice that the bars sit at specific, evenly spaced strike intervals (e.g., \$490, \$500, \$510, \$520, \$530, etc.) rather than forming a continuous gradient.

---

#### 2. Key Options Levels Highlighted
* **CALL WALL (Cyan line & thick teal bar, ~$520–$530):**
  * **What it is:** The strike price with the **highest concentration of net Call Open Interest**.
  * **Trading Impact:** Acts as major **overhead resistance**. Because market makers who sold these calls hedge dynamically by selling underlying shares as price rallies toward this strike, it creates mechanical selling pressure that frequently caps or stalls price momentum.
* **PUT WALL (Pink / Coral line, ~$440):**
  * **What it is:** The strike price with the **highest concentration of net Put Open Interest**.
  * **Trading Impact:** Acts as a major **structural floor / support level**. Market makers hedging their short puts buy shares as the price drops near this zone, dampening volatility and providing price support.

---

### How Traders Use This in KovaView
1. **Expected Trading Range:** The price corridor between the **Put Wall** and **Call Wall** defines the dealer-implied trading range for the active options expiration cycle.
2. **Breakout Clearance:** In KovaView's momentum and VCP (Volatility Contraction Pattern) framework, traders check these bars to ensure a stock has enough upside headroom before hitting the heavy friction of the Call Wall.
3. **Gamma Squeeze Alert:** If the stock breaks forcefully through the Call Wall on heavy volume, dealers may flip to aggressive buyers to hedge their short deltas, triggering a momentum acceleration (gamma squeeze).