/* Smoke-test options-gex-101 inline script with a stub DOM, then verify
   the Strategy-lab math against independent calculations. */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = require("path").join(__dirname, "..");

class FakeEl {
  constructor(tag) {
    this.tag = tag; this.children = []; this.dataset = {}; this.style = {};
    this._text = ""; this.innerHTML = ""; this.hidden = false;
    this.disabled = false; this.value = ""; this.attrs = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.className = "";
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = v; if (v === "") this.children = []; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { this.children.push(...cs); }
  addEventListener() {}
  removeEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 300 }; }
  get clientWidth() { return 600; }
  get offsetWidth() { return 100; }
}
const byId = new Map();
const document = {
  getElementById: id => { if (!byId.has(id)) byId.set(id, new FakeEl("div-" + id)); return byId.get(id); },
  createElement: t => new FakeEl(t),
  createElementNS: (ns, t) => new FakeEl(t),
  querySelectorAll: () => [],
  querySelector: sel => { if (!byId.has("q:" + sel)) byId.set("q:" + sel, new FakeEl(sel)); return byId.get("q:" + sel); },
  documentElement: new FakeEl("html"),
  body: new FakeEl("body")
};
const sandbox = {
  document,
  window: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "#123456" }),
  location: { hash: "" },
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
  console, Math, Date, JSON, Map, Set, Array, Object, Number, String, Infinity, NaN,
  isFinite, parseFloat, parseInt, RangeError
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const data = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");
const hist = fs.readFileSync(path.join(ROOT, "hist.js"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/* html sanity: tab button + main + wiring present exactly once */
for (const needle of ['data-tab="strategies"', 'id="tab-strategies"', '"#strategies": "strategies"']) {
  const n = html.split(needle).length - 1;
  if (n !== 1) throw new Error(`expected exactly 1 of ${needle}, got ${n}`);
}
/* guide sections s1..s13 each exist exactly once, TOC links each id, no stale § refs */
for (let i = 1; i <= 13; i++) {
  const nSec = html.split(`<section id="s${i}">`).length - 1;
  if (nSec !== 1) throw new Error(`expected exactly 1 section s${i}, got ${nSec}`);
  if (!html.includes(`href="#s${i}"`)) throw new Error(`no link to #s${i}`);
  const num = html.split(`<span class="num">${i}</span>`).length - 1;
  if (num !== 1) throw new Error(`expected exactly 1 heading number ${i}, got ${num}`);
}
for (const stale of ["§7", "section 6", "section 9’s", "section 10’s", "from §9", "from §10",
                     "(§9)", "regime from §7"]) {
  if (html.includes(stale)) throw new Error("stale ref: " + stale);
}

const TESTS = `
;(function () {
  const t = id => document.getElementById(id).textContent;
  const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
  const approx = (a, b, tol, msg) => assert(Math.abs(a - b) <= (tol || 1e-6),
    msg + " (got " + a + ", want " + b + ")");

  /* ---- §5 theta & §6 vega (rendered at load) ---- */
  const p$ = id => +t(id).replace(/[−$]/g, "") * (t(id).startsWith("−") ? -1 : 1);
  const v60 = p$("thetaV60"), v30 = p$("thetaV30"), v7 = p$("thetaV7");
  approx(v60, bs(100, 100, 60 / 365, 0.25).call, 0.006, "theta 60d tile = BS ATM call");
  approx(v30 / v60, Math.sqrt(30 / 60), 0.01, "ATM time value follows sqrt(T): 30d/60d");
  approx(v7 / v60, Math.sqrt(7 / 60), 0.01, "ATM time value follows sqrt(T): 7d/60d");
  const costWant = bs(100, 100, 14 / 365, 0.60).call + bs(100, 100, 14 / 365, 0.60).put;
  approx(p$("vegaCost"), costWant, 0.006, "vega straddle cost tile");
  const flatGot = p$("vegaFlat");
  const afterFlat = bs(100, 100, 13 / 365, 0.35).call + bs(100, 100, 13 / 365, 0.35).put;
  approx(flatGot, afterFlat - costWant, 0.011, "vega flat-open P/L tile");
  assert(flatGot < 0, "IV crush costs money on a flat open");
  assert(t("vegaFlatNote").includes("% gone"), "flat note quantifies the crush: " + t("vegaFlatNote"));
  const moveGot = +t("vegaMove").replace(/[±%]/g, "");
  const afterAt = S => bs(S, 100, 13 / 365, 0.35).call + bs(S, 100, 13 / 365, 0.35).put;
  approx(afterAt(100 + moveGot), costWant, costWant * 0.02, "breakeven-move tile is consistent");
  assert(moveGot > 2 && moveGot < 15, "required move is mid-single-digit-ish: " + t("vegaMove"));

  /* ---- data.js format: 7-field rows, bid ≤ mid ≤ ask, integer OI ---- */
  let nRows = 0;
  for (const tk of Object.keys(CHAIN_DATA.tickers)) {
    for (const exp of Object.keys(CHAIN_DATA.tickers[tk].expiries)) {
      const ch = CHAIN_DATA.tickers[tk].expiries[exp];
      for (const side of ["C", "P"]) for (const r of ch[side]) {
        nRows++;
        assert(r.length === 7, "row has 7 fields: " + tk + " " + exp + " " + JSON.stringify(r));
        assert(r[4] <= r[1] + 0.006 && r[1] <= r[5] + 0.006, "bid<=mid<=ask: " + JSON.stringify(r));
        assert(Number.isInteger(r[6]) && r[6] >= 0, "OI is a non-negative int: " + r[6]);
      }
    }
  }
  assert(nRows > 1000, "plenty of rows: " + nRows);

  /* ---- §9 chain table + §10 smile/term (rendered at load) ---- */
  const tbl = document.getElementById("chainTable");
  assert(tbl.children.length === 2, "chain table has thead+tbody");
  const nBody = tbl.children[1].children.length;
  assert(nBody >= 9 && nBody <= 13, "chain shows ~13 rows around ATM, got " + nBody);
  assert(tbl.children[1].children.some(tr => tr.className === "atm"), "ATM row highlighted");
  assert(t("chainSub").includes("NVDA"), "chain sub names the ticker");
  assert(t("smileSub").includes("expiry"), "smile sub set");
  assert(t("termSub").includes("ATM"), "term sub set");
  /* SPY put skew is structural: ~10%-down IV > ~10%-up IV on the ~30d expiry */
  {
    const spy = CHAIN_DATA.tickers.SPY, s0 = spy.spot;
    const exps2 = Object.keys(spy.expiries).sort((a, b) =>
      Math.abs(pgDte(a) - 30) - Math.abs(pgDte(b) - 30));
    const ch2 = spy.expiries[exps2[0]];
    const near = (rows2, target) => rows2.reduce((a, r) =>
      Math.abs(r[0] - target) < Math.abs(a[0] - target) ? r : a, rows2[0]);
    const ivDown = near(ch2.P, s0 * 0.9)[2], ivUp = near(ch2.C, s0 * 1.1)[2];
    assert(ivDown > ivUp, "SPY skew: 10%-down put IV (" + ivDown + ") > 10%-up call IV (" + ivUp + ")");
  }

  /* ---- §11 vanna & charm (rendered at load: spot 100, drop 10 pts) ---- */
  const pInt = id => +t(id).replace(/[−+,]/g, "") * (t(id).startsWith("−") ? -1 : 1);
  const shortAt = (S, T2, iv) => -bs(S, 95, T2, iv).deltaPut * 1000;
  approx(pInt("vannaNow"), shortAt(100, 30 / 365, 0.30), 1, "vanna hedge-now tile");
  approx(pInt("vannaBuy"), shortAt(100, 30 / 365, 0.30) - shortAt(100, 30 / 365, 0.20), 1.5,
    "vanna buy-back tile = hedge delta between IVs");
  assert(pInt("vannaBuy") > 0, "OTM put + IV drop = dealer buy-back");
  approx(pInt("charmBuy"), shortAt(100, 30 / 365, 0.30) - shortAt(100, 23 / 365, 0.30), 1.5,
    "charm tile = 7 quiet days of delta decay");
  assert(pInt("charmBuy") > 0, "OTM put + time passing = dealer buy-back");
  assert(t("vannaBuyNote").includes("bought back"), "vanna note: " + t("vannaBuyNote"));
  vannaState.spot = 90; renderVanna();       // below the $95 strike the flows flip
  assert(pInt("vannaBuy") < 0 && pInt("charmBuy") < 0, "ITM put: vanna & charm flip to selling");
  assert(t("vannaBuyNote").includes("flips"), "flip note shown: " + t("vannaBuyNote"));
  vannaState.spot = 100; renderVanna();

  /* ---- default state: NVDA call butterfly, w = 2, expiry ≈ 30d ---- */
  assert(st.strat === "butterfly", "default strategy is butterfly");
  const spot = CHAIN_DATA.tickers.NVDA.spot;
  const ch = CHAIN_DATA.tickers.NVDA.expiries[st.exp];
  const cMap = new Map(ch.C.map(r => [r[0], r]));
  const pMap = new Map(ch.P.map(r => [r[0], r]));
  const Ks = ch.C.map(r => r[0]).filter(k => pMap.has(k));
  const atm = Ks.reduce((a, b) => Math.abs(b - spot) < Math.abs(a - spot) ? b : a, Ks[0]);
  assert(st.K === atm, "butterfly centres at the money: " + st.K + " vs " + atm);
  const ci = Ks.indexOf(st.K), w = st.w;
  const kLo = Ks[ci - w], kMid = Ks[ci], kHi = Ks[ci + w];
  const c = K => cMap.get(K)[1];
  const debit = (c(kLo) + c(kHi) - 2 * c(kMid)) * 100;
  assert(debit > 0, "butterfly is a net debit");

  renderStrategies();
  assert(t("stCostNote").startsWith("net debit"), "cost note says debit: " + t("stCostNote"));
  assert(t("stStatus").includes("Call butterfly on NVDA"), "status line: " + t("stStatus"));

  /* breakevens: kLo + debit/100 and kHi − debit/100 */
  const beWant = [kLo + debit / 100, kHi - debit / 100];
  const beGot = t("stBE").split(" / ").map(s => +s.replace("$", ""));
  assert(beGot.length === 2, "two breakevens, got: " + t("stBE"));
  approx(beGot[0], beWant[0], 0.006, "lower breakeven");
  approx(beGot[1], beWant[1], 0.006, "upper breakeven");
  assert(t("stBENote") === "profit between them", "BE note: " + t("stBENote"));

  /* max win at middle strike = (kMid − kLo)*100 − debit; max loss = debit */
  const winWant = (kMid - kLo) * 100 - debit;
  assert(t("stMaxWinNote").includes("$" + kMid), "max-win note names middle strike: " + t("stMaxWinNote"));
  assert(t("stMaxWin") !== "Unlimited", "butterfly win is capped");
  assert(t("stMaxLossNote").includes("$" + kLo) && t("stMaxLossNote").includes("$" + kHi),
    "max-loss note names both wings: " + t("stMaxLossNote"));
  const parse$ = s => { const m = s.match(/([0-9.]+)(K|M|B)?/);
    return +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1); };
  approx(parse$(t("stMaxWin")), winWant, winWant * 0.01 + 1, "butterfly max win");
  approx(parse$(t("stMaxLoss")), debit, debit * 0.01 + 1, "butterfly max loss = debit");
  assert(t("stGammaNote").includes("short gamma") || t("stGammaNote").includes("gamma-neutral"),
    "ATM butterfly gamma note sane: " + t("stGammaNote"));
  /* nearer expiry the same fly must read short gamma */
  const exps = Object.keys(CHAIN_DATA.tickers.NVDA.expiries).sort();
  const saveExp = st.exp;
  st.exp = exps[0]; st.K = null; stFillCenterWidth(); renderStrategies();
  assert(t("stGammaNote").includes("short gamma"),
    "near-dated butterfly is short gamma: " + t("stGammaNote") + " exp " + st.exp);
  st.exp = saveExp; st.K = null; stFillCenterWidth(); renderStrategies();
  assert(document.getElementById("stLegs").children.length === 3, "butterfly shows 3 leg chips");

  /* ---- run every strategy on every ticker/expiry: no throws, sane tiles ---- */
  const strats = Object.keys(STRATEGIES);
  for (const tk of Object.keys(CHAIN_DATA.tickers)) {
    stSetTicker(tk);
    for (const exp of Object.keys(CHAIN_DATA.tickers[tk].expiries)) {
      st.exp = exp;
      for (const key of strats) {
        st.strat = key; st.K = null;
        stFillCenterWidth();
        renderStrategies();
        assert(t("stCost") !== "—" || t("stStatus").includes("Not enough"),
          key + " " + tk + " " + exp + " rendered");
      }
    }
  }

  /* ---- targeted expectations on NVDA default expiry ---- */
  stSetTicker("NVDA");
  const run = key => { st.strat = key; st.K = null; stFillCenterWidth(); renderStrategies(); };

  run("iron-condor");
  assert(t("stCostNote").startsWith("net credit"), "iron condor collects a credit");
  assert(t("stGammaNote").includes("short gamma"), "iron condor is short gamma");
  assert(document.getElementById("stLegs").children.length === 4, "condor has 4 legs");

  run("straddle");
  assert(t("stMaxWin") !== "Unlimited" ? false : true, "straddle max win unlimited");
  assert(t("stGammaNote").includes("long gamma"), "straddle is long gamma");
  assert(document.getElementById("stWidth").disabled, "straddle width select disabled");

  run("bull-call");
  assert(t("stMaxWin") !== "Unlimited" && t("stMaxLoss") !== "Unlimited", "bull call is capped both ways");
  assert(t("stShares").startsWith("+"), "bull call is net long");

  run("bear-put");
  assert(t("stShares").startsWith("−"), "bear put is net short");

  run("covered-call");
  assert(document.getElementById("stLegs").children.length === 2, "covered call = shares + short call");
  assert(t("stMaxWin") !== "Unlimited", "covered call upside is capped");
  assert(t("stCostNote").startsWith("net debit"), "covered call costs money up front (shares)");

  run("protective-put");
  assert(t("stMaxWin") === "Unlimited", "protective put keeps unlimited upside");
  assert(t("stMaxLoss") !== "Unlimited", "protective put loss is floored");

  run("iron-butterfly");
  assert(t("stCostNote").startsWith("net credit"), "iron butterfly collects a credit");

  console.log("ALL STRATEGY-LAB TESTS PASSED");

  /* ================= Time machine strategies ================= */

  /* ladder produces strictly increasing, distinct strikes at any price */
  for (const spot of [4, 7, 12, 24, 26, 60, 99, 101, 180, 249, 251, 600]) {
    tm.money = 0;
    for (const w of TM_WIDTHS) {
      const Kof = tmLadder(spot, w);
      const ks = [-2, -1, 0, 1, 2].map(Kof);
      for (let i = 1; i < ks.length; i++) {
        assert(ks[i] > ks[i - 1], "ladder strictly increasing at spot " + spot + " w " + w +
          ": " + ks.join(","));
      }
    }
  }

  /* fix a deterministic scenario */
  tm.tk = "NVDA"; tm.mode = "random"; tm.entryIdx = 300; tm.money = 0; tm.w = 5;
  tm.expOff = 21; tm.n = 1; tm.revealed = false; tm.done = false; tm.prog = 0;
  const spotTm = HIST_DATA.tickers.NVDA.closes[300];

  /* single option unchanged: buy call BE = K + prem */
  tm.strat = "single"; tm.type = "call"; tm.side = "buy";
  tmSyncControls(); tmFillSelects(); renderTimeMachine();
  assert(!document.getElementById("tmTypeCtl").hidden, "single shows type ctl");
  assert(document.getElementById("tmWidthCtl").hidden, "single hides width ctl");
  assert(t("tmPremLabel") === "Estimated premium", "single premium label");
  const premS = +t("tmPrem").replace("$", "");
  const kS = tmRoundStrike(spotTm);
  approx(+t("tmBE").replace("$", ""), kS + premS, 0.006, "single call BE = K + prem");

  /* butterfly: debit, twin breakevens at wings ± debit */
  tm.strat = "butterfly"; tmSyncControls(); tmFillSelects(); renderTimeMachine();
  assert(document.getElementById("tmTypeCtl").hidden, "multi hides type ctl");
  assert(!document.getElementById("tmWidthCtl").hidden, "butterfly shows width ctl");
  assert(t("tmPremLabel") === "Estimated net cost", "multi cost label");
  assert(t("tmPremNote").startsWith("net debit"), "tm butterfly is a debit: " + t("tmPremNote"));
  {
    const sig = tmSigma();
    const TyrTm = (new Date(HIST_DATA.dates[321]) - new Date(HIST_DATA.dates[300])) / 86400e3 / 365;
    const legsTm = tmBuildLegs(spotTm, sig, TyrTm);
    assert(legsTm.length === 3, "tm butterfly has 3 legs");
    const debitTm = legsTm.reduce((a, l) => a + l.qty * l.prem, 0);
    assert(debitTm > 0, "tm butterfly debit positive");
    const kLo2 = Math.min(...legsTm.map(l => l.K)), kHi2 = Math.max(...legsTm.map(l => l.K));
    const beTm = t("tmBE").split(" / ").map(s => +s.replace("$", ""));
    assert(beTm.length === 2, "tm butterfly has two BEs: " + t("tmBE"));
    approx(beTm[0], kLo2 + debitTm, 0.006, "tm fly lower BE");
    approx(beTm[1], kHi2 - debitTm, 0.006, "tm fly upper BE");
    assert(t("tmBENote") === "profit between them", "tm fly BE note: " + t("tmBENote"));
  }

  /* max profit / loss tiles: butterfly is capped both ways, loss = debit */
  assert(t("tmMaxWin") !== "Unlimited" && t("tmMaxLoss") !== "Unlimited",
    "tm butterfly capped both ways");
  {
    const sig2 = tmSigma();
    const Tyr2 = (new Date(HIST_DATA.dates[321]) - new Date(HIST_DATA.dates[300])) / 86400e3 / 365;
    const legs2 = tmBuildLegs(spotTm, sig2, Tyr2);
    const debit2 = legs2.reduce((a, l) => a + l.qty * l.prem, 0) * 100;
    approx(parse$(t("tmMaxLoss")), debit2, debit2 * 0.01 + 1, "tm butterfly max loss = debit");
  }
  /* single long call: max loss = premium, max win unlimited */
  tm.strat = "single"; tm.type = "call"; tm.side = "buy";
  tmSyncControls(); tmFillSelects(); renderTimeMachine();
  assert(t("tmMaxWin") === "Unlimited", "long call max win unlimited");
  approx(parse$(t("tmMaxLoss")), +t("tmPrem").replace("$", "") * 100, 1, "long call max loss = premium");
  /* short call: unlimited loss */
  tm.side = "sell"; renderTimeMachine();
  assert(t("tmMaxLoss") === "Unlimited", "short call max loss unlimited");
  tm.side = "buy"; tm.strat = "butterfly"; tmSyncControls(); tmFillSelects(); renderTimeMachine();

  /* reveal: verdict names the strategy, P/L path finite */
  tm.revealed = true; tm.prog = tm.expOff; tm.done = true;
  renderTimeMachine();
  assert(t("tmVerdict").includes("call butterfly"), "verdict names strategy: " + t("tmVerdict"));
  assert(/made|lost/.test(t("tmVerdict")), "verdict has an outcome");
  assert(t("tmPL") !== "—" && isFinite(+t("tmPL").replace(/[−+$,]/g, "")), "tm P/L finite: " + t("tmPL"));
  assert(!document.getElementById("tmExitCtl").hidden, "exit slider shown after reveal");
  assert(+document.getElementById("tmExit").max === tm.expOff, "exit slider spans to expiry");
  assert(t("tmPLNote") === "held to expiry", "default exit = expiry");

  /* sell early: P/L tile must equal an independent BS mark-to-market */
  tm.strat = "single"; tm.type = "call"; tm.side = "buy";
  tmSyncControls(); tmFillSelects();
  tm.exit = 5; renderTimeMachine();
  {
    const parsePL = s => +s.replace(/[+$,]/g, "").replace("−", "-");
    const sig3 = tmSigma();
    const ds3 = HIST_DATA.dates, e3 = tm.entryIdx, xI = e3 + tm.expOff;
    const Tyr3 = (new Date(ds3[xI]) - new Date(ds3[e3])) / 86400e3 / 365;
    const leg3 = tmBuildLegs(spotTm, sig3, Tyr3)[0];
    const mtm = j => {
      const Trem = (new Date(ds3[xI]) - new Date(ds3[e3 + j])) / 86400e3 / 365;
      return (bs(HIST_DATA.tickers.NVDA.closes[e3 + j], leg3.K, Math.max(0, Trem), sig3).call - leg3.prem) * 100;
    };
    approx(parsePL(t("tmPL")), mtm(5), 1, "early-exit P/L = BS mark-to-market on day 5");
    assert(t("tmPLNote").includes("sold early"), "early-exit note: " + t("tmPLNote"));
    assert(t("tmVerdict").includes("your exit"), "verdict reflects early exit");
    let best = 0;
    for (let j = 0; j <= tm.expOff; j++) if (mtm(j) > mtm(best)) best = j;
    approx(parsePL(t("tmPeak")), mtm(best), 1, "best-exit tile = path maximum");
  }
  tm.exit = null; tm.strat = "butterfly"; tmSyncControls(); tmFillSelects(); renderTimeMachine();

  /* every strategy renders + reveals on several scenarios and widths */
  for (const idx of [180, 300, 700, HIST_DATA.dates.length - 70]) {
    tm.entryIdx = idx;
    for (const key of ["single", ...Object.keys(TM_STRATS)]) {
      tm.strat = key;
      for (const w of [2.5, 10]) {
        tm.w = w;
        tm.revealed = false; tm.done = false; tm.prog = 0;
        tmSyncControls(); tmFillSelects(); renderTimeMachine();
        tm.revealed = true; tm.prog = tm.expOff; tm.done = true;
        renderTimeMachine();
        assert(isFinite(+t("tmPL").replace(/[−+$,K.M]/g, "")), key + " idx " + idx + " w " + w + " P/L renders");
      }
    }
  }

  /* iron condor collects a credit; straddle hides width */
  tm.entryIdx = 300; tm.strat = "iron-condor"; tm.w = 5;
  tm.revealed = false; tm.done = false; tmSyncControls(); tmFillSelects(); renderTimeMachine();
  assert(t("tmPremNote").startsWith("net credit"), "tm condor is a credit: " + t("tmPremNote"));
  tm.strat = "straddle"; tmSyncControls(); tmFillSelects(); renderTimeMachine();
  assert(document.getElementById("tmWidthCtl").hidden, "straddle hides width ctl");
  assert(t("tmBE").split(" / ").length === 2, "straddle two BEs");

  console.log("ALL TIME-MACHINE TESTS PASSED");

  /* ================= Earnings playbook cases ================= */
  for (const key of Object.keys(TM_CASES)) {
    const c = TM_CASES[key];
    tmLoadCase(key);
    assert(tm.mode === "earnings", key + " forces earnings mode");
    assert(tm.strat === c.strat && tm.expOff === c.expOff && tm.w === c.w && tm.n === 1 &&
      tm.money === (c.money || 0), key + " applies its preset");
    if (c.type) assert(tm.type === c.type && tm.side === c.side, key + " sets type/side");
    assert(!document.getElementById("tmCaseNote").hidden, key + " shows its note");
    assert(document.getElementById("tmCaseNote").innerHTML.length > 100, key + " note has content");
    assert(!document.getElementById("tmCaseNote").innerHTML.includes("undefined"), key + " note clean");
    assert(t("tmStatus").includes("earnings report date"), key + " deals an earnings date: " + t("tmStatus"));
    assert(!tm.revealed, key + " starts unrevealed");
    tm.revealed = true; tm.prog = tm.expOff; tm.done = true;
    renderTimeMachine();
    assert(isFinite(+t("tmPL").replace(/[−+$,K.M]/g, "")), key + " reveals a finite P/L");
  }
  assert(Object.keys(TM_CASES).length === 9, "nine playbook cases");
  /* dip buyer is a single-option preset: sell an OTM put, single controls shown */
  tmLoadCase("dip-buyer");
  assert(tm.strat === "single" && tm.type === "put" && tm.side === "sell" && tm.money === -5,
    "dip buyer = short 5%-OTM put");
  assert(!document.getElementById("tmTypeCtl").hidden && document.getElementById("tmWidthCtl").hidden,
    "dip buyer shows single-option controls");
  assert(t("tmPremNote").includes("collect"), "dip buyer collects premium: " + t("tmPremNote"));
  tmLoadCase("pin-seller");
  assert(document.getElementById("tmTypeCtl").hidden, "multi case re-hides type ctl after single case");
  assert(t("tmPremNote").startsWith("net credit"), "iron butterfly case is a credit");
  tmLoadCase("cheap-vol");
  assert(t("tmBE").split(" / ").length === 2, "strangle case has two breakevens");
  tmLoadCase("bear");
  assert(t("tmPremNote").startsWith("net debit"), "bear put spread case is a debit");
  /* SPY has no earnings → case falls back to NVDA */
  tm.tk = "SPY";
  tmLoadCase("vol-buyer");
  assert(tm.tk === "NVDA", "SPY falls back to NVDA for earnings cases");
  /* deviating from a case hides the note */
  tmClearCase();
  assert(document.getElementById("tmCaseNote").hidden, "clearing a case hides the note");

  console.log("ALL PLAYBOOK TESTS PASSED");
})();
`;

vm.runInContext(data + "\n" + hist + "\n" + script + "\n" + TESTS, sandbox, { filename: "inline.js" });
console.log("smoke test complete");
