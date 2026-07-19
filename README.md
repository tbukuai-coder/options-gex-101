# Options, Gamma & GEX — a visual guide for beginners

A single-file, zero-dependency HTML explainer that builds up — from nothing — how stock
options work and how option **dealer hedging** feeds back into the stock market itself:
delta, gamma, **GEX (gamma exposure)**, the gamma flip, gamma squeezes, OPEX pinning,
and the 0DTE era.

## Run it

Open `index.html` in any browser. No server, no build step, no network — all math
(Black–Scholes with r = 0) runs inline in vanilla JavaScript.

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
