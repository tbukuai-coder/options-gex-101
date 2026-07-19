# Roadmap — options-gex-101

Prioritized backlog. Items are ordered by (impact on the site's teaching mission) ×
(feasibility with the current zero-dependency, snapshot-data architecture).
Done so far: Guide (11 sections — theta, vega/IV-crush and vanna/charm added
2026-07-19, plus Volmageddon & COVID cards in "In the wild"), Playground, Strategies
lab (9 recipes on real chains), Time machine (single + multi-leg on real history,
earnings-season playbook).

## 1 · Real GEX dashboard from real chains ⭐ the namesake feature

The Guide's §6 GEX chart uses *synthetic* open interest. The Cboe delayed-quotes API
already returns `open_interest`, `gamma`, `iv`, and `volume` per contract (verified
2026-07-19), so `refresh_data.py` can add OI to `data.js` at negligible size cost and a
new **📊 GEX today** tab (or a "real data" toggle on §6) can show the actual dealer
gamma map for NVDA/TSLA/AAPL/MSFT/AMD/SPY: GEX by strike, net total, estimated gamma
flip, call/put walls — computed with the same naive positioning convention the Guide
teaches. Bridges the course to the real dashboards it name-checks (SpotGamma etc.).
- Data: add `oi` (and maybe `volume`) per row in `data.js`; bump but keep the
  `==DATA-START==` marker contract; sanity-check totals in `refresh_data.py`.
- Keep the synthetic chart in §6 (it's controllable — the slider story still teaches
  best); link the two.

## 2 · Model IV crush honestly in the Time machine

Premiums get a +35% markup on earnings scenarios, but the reveal path reprices legs at
that same inflated vol for the whole holding period — so long-straddle P/L is
overstated right after the report (the playbook's "IV crush" note deserves a model
that actually crushes). Change: after the entry/report day, decay sigma back to the
unmarked realized-vol estimate (e.g. drop the markup entirely on day 1, or over 2–3
days). Small change in `renderTimeMachine`'s path loop; disclose in the caveat box.

## 3 · IV smile / skew chart from the real chains

`data.js` already has per-strike IV. A small chart (Playground, or a Guide subsection
after §8 GEX) plotting IV vs strike for a chosen ticker/expiry shows put skew in real
data — and connects it to the GEX story (the market pays up for crash protection;
dealers are short those puts). Zero new data needed. Pairs naturally with the new §6
vega section.

## 4 · Strategy comparison overlay in the lab

"Compare with…" second-strategy selector that draws its at-expiry P/L as a dashed
series on the same chart (same center/width where applicable). The butterfly-vs-iron-
butterfly and straddle-vs-strangle comparisons are the classic teaching pairs; the
tryit copy already tells users to flip back and forth — show both at once instead.

## 5 · Time machine scoreboard

localStorage running tally (like brain-trainer bests): reveals played, hit rate, total
P/L, best/worst trade, per-strategy breakdown. Turns "deal a few of each — the lesson
is in the distribution" into an actual measured distribution.

## 6 · Shareable position links

Hash-encode tab + position (ticker/expiry/strategy/strikes/side), like
portfolio-backtest's `#p=` links. Lets the user send "look at this butterfly" URLs.
Cheap: all state is already in small plain objects (`pg`, `st`, `tm`).

## 7 · Quiz mode (stretch)

A ~10-question check ("dealers short gamma means hedging goes __ the move?", read a
GEX chart, pick the breakeven) gating a "course complete" badge — same step-player
spirit as learn-korean, but one static array of questions, no engine needed.

## Non-goals (for now)

- Live quotes in the browser — Cboe is not CORS-enabled; the committed-snapshot
  architecture stays.
- Historical option chains for the Time machine — no free archive exists; BS
  estimation with disclosed markup remains the approach.
- American-exercise / early-assignment modeling, margin, multi-expiry (calendar/
  diagonal) strategies — real but beyond the teaching scope; calendars would also
  break the single-expiry leg model in both the lab and the Time machine.
