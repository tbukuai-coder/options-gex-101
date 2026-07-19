# Options, Gamma & GEX — a visual guide for beginners

A zero-dependency HTML explainer that builds up — from nothing — how stock
options work and how option **dealer hedging** feeds back into the stock market itself:
delta, gamma, **GEX (gamma exposure)**, the gamma flip, gamma squeezes, OPEX pinning,
and the 0DTE era. Four tabs:

- **📖 Guide** — the eight-section interactive course (all data synthetic).
- **🧪 Playground** — build a real position from real (delayed) option chains: pick
  NVDA / TSLA / AAPL / MSFT / AMD / SPY, a listed expiry and strike, buy or sell a
  call or put, and see total P/L vs. stock price — both "if it jumps there today"
  (Black–Scholes re-pricing at the option's listed IV) and at expiry — plus breakeven,
  max profit/loss, share-equivalent delta, and a what-if price slider.
- **🦋 Strategies** — multi-leg strategy lab on the same real chains: nine recipes
  (call butterfly, iron butterfly, iron condor, bull call / bear put spread, straddle,
  strangle, covered call, protective put) built from listed strikes with a centre-strike
  and wing-width picker. Shows the legs, net debit/credit, breakevens, max profit/loss
  with where-it-happens notes, net delta ("acts like N shares"), net gamma with a
  long/short-gamma reading, and the P/L-today vs. at-expiry chart. Each strategy carries
  a "why & when" explainer plus a gamma-lens note tying it back to the Guide (butterflies
  as OPEX-pin bets, condor sellers as squeeze casualties, covered-call/protective-put
  customers as the naive GEX model's assumed flow).
- **⏳ Time machine** — a game on real history: jump to a random past trading day or a
  real past **earnings report date** (e.g. one of NVDA's actual reports), see only the
  price chart up to that day, build a trade — a single option (call/put × buy/sell ×
  strike ±10%) or any of the nine multi-leg strategies from the Strategies tab
  (butterfly, iron condor, straddle, …; legs priced on a synthetic strike ladder with a
  % wing-width picker) — pick an expiry (2 weeks–3 months), then reveal: the true price
  path animates forward and your P/L is scored (with a same-money-in-shares comparison).
  After the reveal you can flip the position to see what a different trade would have
  done on the same day. An **earnings-season playbook** offers five one-click sample
  cases — vol buyer (straddle), vol seller (iron condor), directional bull (call
  spread), nervous holder (protective put), income collector (covered call) — each
  dealing a real past earnings date pre-configured with the trade and a what-to-watch
  note (IV crush, tail risk of selling vol, capped-vs-pricey directional bets).

## Run it

Open `index.html` in any browser (works over `file://` — the chain snapshot loads via
`<script src="data.js">`, no fetch). No server, no build step; all math (Black–Scholes
with r = 0) runs inline in vanilla JavaScript.

## Real data (`data.js`)

`data.js` holds real **delayed Cboe quotes** (`cdn.cboe.com` delayed-quotes API):
per ticker, the expiries nearest 7/30/60/120/240 DTE and strikes within ±30% of spot,
each as `[strike, mid, iv, delta]`. Regenerate with:

```bash
python3 refresh_data.py   # stdlib only, no pip installs
```

A GitHub Action (`.github/workflows/refresh-data.yml`) reruns this on weekday evenings
(US close) and commits when the data changes; the script aborts non-zero on any sanity
failure so a broken snapshot never lands. The Cboe API is not CORS-enabled, which is
why the page uses a committed snapshot instead of fetching live in the browser.

## Historical data (`hist.js`)

`hist.js` feeds the Time-machine tab: ~6 years of split/dividend-adjusted daily closes
on one shared trading calendar, plus each stock's real past earnings-report dates.
Regenerate (rarely needed — history doesn't go stale) with:

```bash
python3 build_history.py   # needs yfinance
```

Since there is no free archive of historical *option* prices, the Time machine
estimates premiums with Black–Scholes from trailing 3-month realized volatility
(+35% markup on earnings scenarios) — disclosed in the UI.

## What's inside

| § | Section | Interactive piece |
|---|---------|-------------------|
| 1 | What is an option? | Payoff-at-expiry chart: call/put × buy/sell, strike + premium sliders, breakeven marker |
| 2 | Price before expiry | Black–Scholes value vs. intrinsic; IV + DTE sliders (see theta melt the curve onto the kink) |
| 3 | Delta | Call/put delta curves; DTE slider steepens them into a step |
| 4 | Gamma | Gamma vs. spot at 30/7/1 DTE — the 0DTE spike |
| 5 | Dealers & delta hedging | Flow diagram + hedge-ladder chart with "if price moves $2, dealer must trade N shares" tiles |
| 6 | GEX | Diverging bar chart of dealer gamma by strike (synthetic OI, naive long-calls/short-puts convention), spot slider, net view, gamma-flip estimate, data table |
| 7 | Market regimes | Seeded simulation: identical shocks through positive-GEX (dampened) vs. negative-GEX (amplified) hedging feedback, with realized-vol tiles |
| 8 | In the wild | GameStop gamma squeeze, OPEX pinning, 0DTE, where GEX dashboards live |
| — | Glossary + caveats | Every term used, plus an honest list of the model's simplifications |
| 🧪 | Playground tab | Real-chain position builder: ticker/expiry/strike selectors, buy/sell × call/put, contracts, P/L-today + P/L-at-expiry chart, what-if slider |
| 🦋 | Strategies tab | Multi-leg strategy lab: 9 recipes on real chains, leg chips, debit/credit, breakevens, max P/L, net delta/gamma tiles, per-strategy explainers |

## Implementation notes

- All charts are hand-rolled SVG: 2px lines, hairline grids, crosshair + tooltip on line
  charts, per-bar tooltips on the GEX chart, keyboard navigation (arrow keys on a focused
  chart), and a table view for the GEX data.
- Light/dark theme: follows the OS by default, toggle in the header (persisted to
  `localStorage`). Charts re-render with theme-appropriate palette steps.
- The regime simulator uses a seeded PRNG (mulberry32 + Box–Muller) so "New random
  shocks" is reproducible within a session; the toy model is
  `r⁺ = shock/(1+k)` (long-gamma dealers absorb) vs. `r⁻ = shock·(1+k) + k·r⁻₋₁`
  (short-gamma dealers chase), identical shock sequence for both.
- GEX per strike = Black–Scholes gamma × OI × 100 × S² × 1%, calls positive / puts
  negative under the standard naive dealer-positioning assumption. Open interest is a
  fixed synthetic distribution (calls clustered above spot, puts below).

Educational only — synthetic data, simplified models, not investment advice.
