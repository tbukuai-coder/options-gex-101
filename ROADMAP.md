# Roadmap — options-gex-101

Prioritized backlog. Items are ordered by (impact on the site's teaching mission) ×
(feasibility with the current zero-dependency, snapshot-data architecture).
Done so far: Guide (13 sections — theta, vega/IV-crush, vanna/charm, real-chain
reading and IV smile/term structure added 2026-07-19, plus Volmageddon & COVID cards
in "In the wild"; grouped TOC), Playground, Strategies lab (9 recipes on real chains),
Time machine (single + multi-leg on real history, 9-case earnings-season playbook,
max-P/L tiles, early-exit slider + best-exit tile).
`data.js` rows now carry `[strike, mid, iv, delta, bid, ask, oi]`.

## 1 · Real GEX dashboard from real chains ⭐ the namesake feature

A new **📊 GEX today** tab (or a "real data" toggle on §8) showing the actual dealer
gamma map for NVDA/TSLA/AAPL/MSFT/AMD/SPY: GEX by strike, net total, estimated gamma
flip, call/put walls — computed with the same naive positioning convention the Guide
teaches. Bridges the course to the real dashboards it name-checks (SpotGamma etc.).
- Data: DONE 2026-07-19 — `data.js` rows now carry `bid, ask, oi`; only the dashboard
  UI remains.
- Keep the synthetic chart in §8 (it's controllable — the slider story still teaches
  best); link the two.
- Stretch: summary tiles per ticker — put/call OI ratio, biggest call wall, biggest
  put wall; and vanna/charm exposure estimates (all computable from the row fields via
  the inline BS), completing the bridge to §11.

## 2 · Model IV crush honestly in the Time machine

Premiums get a +35% markup on earnings scenarios, but the reveal path reprices legs at
that same inflated vol for the whole holding period — so long-straddle P/L is
overstated right after the report (the playbook's "IV crush" note deserves a model
that actually crushes). Change: after the entry/report day, decay sigma back to the
unmarked realized-vol estimate (e.g. drop the markup entirely on day 1, or over 2–3
days). Small change in `renderTimeMachine`'s path loop; matters even more now that
the early-exit slider marks positions to market mid-path. Disclose in the caveat box.

## 3 · "Every earnings, this trade" — distribution backtest in the Time machine

The playbook keeps saying "the lesson is in the distribution — deal several reveals."
Make that one button: **▶ Run all history** takes the currently built trade (strategy,
moneyness, width, expiry) and replays it on *every* earnings date in `hist.js` for the
ticker (~20 dates), then shows a histogram of P/L outcomes, win rate, average, and
worst case — e.g. "the ATM straddle won 6 of 21 NVDA reports; average −38% on
premium." Cheap to compute (BS × ~20 scenarios), devastating as a lesson, and the
single best answer to "does buying earnings vol make money?". Reuses the leg engine
and, once #2 lands, inherits the honest IV-crush path.

## 4 · Strategy comparison overlay in the lab

"Compare with…" second-strategy selector that draws its at-expiry P/L as a dashed
series on the same chart (same center/width where applicable). The butterfly-vs-iron-
butterfly and straddle-vs-strangle comparisons are the classic teaching pairs; the
tryit copy already tells users to flip back and forth — show both at once instead.
Also worth a Time-machine variant: after a reveal, overlay a second strategy's P/L
path on the same days.

## 5 · IV what-if in the Playground and Strategies lab

Both tabs hold each leg's listed IV constant and say so in the caveats. Add an
"IV shift" slider (−30 to +30 points) next to the price what-if: the "today" curve
re-prices at shifted vol, and the tiles show P/L for the combined move. Finally makes
vega (§6) tangible on *real* positions — a bought straddle that loses money on a
+5% move once IV drops 15 points is the IV-crush lesson in the user's own trade.

## 6 · Time machine scoreboard & session journal

localStorage running tally (like brain-trainer bests): reveals played, hit rate, total
P/L, best/worst trade, per-strategy breakdown — now including whether the user sold
early or held. Stretch: a bankroll mode ("start with $10K, survive an earnings
season") that strings scenarios into a run with a final grade.

## 7 · "Is this vol high?" — realized-vol context tile

The Time machine quotes an entry sigma (e.g. "est. volatility 45%") with no way to
know if that's high or low for the stock. `hist.js` already has 6y of closes: compute
the rolling 3-month realized vol series once, then show the entry vol's **percentile**
("45% — higher than 82% of the past 6 years") in the scenario status. One tile, big
context gain; also the honest cousin of the "IV rank" number real traders quote.

## 8 · Shareable position links

Hash-encode tab + position (ticker/expiry/strategy/strikes/side), like
portfolio-backtest's `#p=` links. Lets the user send "look at this butterfly" URLs.
Cheap: all state is already in small plain objects (`pg`, `st`, `tm`, `cs`).

## 9 · 中文 language toggle (stretch, large)

A zh-CN translation toggle in the header, following the bilingual pattern of the
sibling learning apps. All copy lives in HTML/JS strings, so it means a string table
and a `lang` switch — mechanical but big (the Guide is long), and glossary terms need
care (delta/gamma stay Latin, but 认购/认沽, 行权价, 隐含波动率, 末日期权 for the
narrative). Worth it if the site's audience matches the flashcard apps'.

## 10 · Quiz mode (stretch)

A ~10-question check ("dealers short gamma means hedging goes __ the move?", read a
GEX chart, pick the breakeven) gating a "course complete" badge — same step-player
spirit as learn-korean, but one static array of questions, no engine needed.

## 11 · Printable one-page cheat sheet (small)

A print-styled section (or `@media print` view of the glossary): the four greeks in
one table, the two regimes, the GEX reading rules, the strategy quick-reference
(shape · bet · max loss). Users of the course will want exactly one page to keep.

## 12 · Chores

- Mobile polish: §9 chain table column priorities on narrow screens (hide OI first?),
  TOC pill wrapping, tile row overflow on 5-tile rows.
- Data-age banner: the Playground status warns when the snapshot is stale; surface the
  same warning in Strategies and Guide §9–10 (all read the same snapshot).
- Node smoke harness: DONE 2026-07-19 — committed as `tests/smoke.js` (stub-DOM run of
  the full inline script + math assertions for every tab; `node tests/smoke.js`).
  Remaining: run it in the refresh GitHub Action so a bad data format can never ship.

## Non-goals (for now)

- Live quotes in the browser — Cboe is not CORS-enabled; the committed-snapshot
  architecture stays.
- Historical option chains for the Time machine — no free archive exists; BS
  estimation with disclosed markup remains the approach.
- American-exercise / early-assignment modeling, margin, multi-expiry (calendar/
  diagonal) strategies — real but beyond the teaching scope; calendars would also
  break the single-expiry leg model in both the lab and the Time machine.
- Intraday / 0DTE simulation — daily closes are the finest data available here; the
  0DTE story stays qualitative (§4, §13).
