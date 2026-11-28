// バランス確認用のシミュレーション。
// 「上の段から買えるだけ買い（約数の力を取ったら節目で買い止め）、自動繰り上がり（効率モード）と
// 同じ判定で繰り上がり、桁は安い強化から使う」プレイヤーを想定する。
// 対数を取ったあとは、次の証明に挑戦する（10 分で届かなければあきらめ、
// 通常の周を 2 回はさんで再挑戦）。
// 拡張したあとは、整数を安い順に（整数の強化・工場）使い（利息を取ったあとは所持の 10% まで）、SIM_EXPANSIONS 回（初期値 1）拡張するまで続ける。
// 使い方: node tools/sim.js [最大繰り上がり回数] [-v]
// 環境変数 SIM_MODE=max|milestone|prime で自動購入の買い止め方を固定できる
// 環境変数 SIM_PROBE=1 で、対数を取った時点から各証明を 15 分ずつ試し、届いた合計の桁数を表示する
import {
  newGame, tick, buyBest, has, canCarry, carry, digitsLog, digitsOnCarry, buyUpgrade, upgradeState,
  buyRepeatable, repeatableState, repeatableCost, level, canExpand, startProof, abandonProof,
  completeProof, proofGoalReached, proven, proofsAvailable, inProof, serialize, deserialize,
  expand, expandGain, buyFactory, factoryCost, factoryUnlocked, buyIntegerUpgrade, integerUpgradeState,
  canReachLayer3, negCountLog, buyFactoryMax, interestRate, buyIntegerRepeatable, integerRepeatableCost, intLevel, expandNegExponent,
} from '../src/logic.js';
import { TIERS, UPGRADES, REPEATABLES, PROOFS, EXPAND_DIGITS, FACTORY, INTEGER_UPGRADES, INTEGER_REPEATABLES } from '../src/data.js';
import { Big, format } from '../src/big.js';

const maxRuns = Number(process.argv[2] || 3000);
const verbose = process.argv.includes('-v');
const DT = 0.5;
const PROOF_TIMEOUT = Number(process.env.SIM_PROOF_TIMEOUT_MIN || 10) * 60;
const fmtT = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`;
};

// 一番安い買えるもの（強化・繰り返し強化）を 1 つ買う
function buyCheapest(state) {
  const options = [];
  for (const u of UPGRADES) if (upgradeState(state, u) === 'affordable') options.push({ cost: Big.from(u.cost), buy: () => buyUpgrade(state, u.id), name: u.name });
  for (const r of REPEATABLES) if (repeatableState(state, r) === 'affordable') options.push({ cost: repeatableCost(r, level(state, r.id), state), buy: () => buyRepeatable(state, r.id), name: null });
  if (!options.length) return null;
  options.sort((a, b) => a.cost.cmp(b.cost));
  options[0].buy();
  return options[0].name ?? '';
}

function buyMode(state) {
  if (process.env.SIM_MODE) return process.env.SIM_MODE;
  if (inProof(state, 'primeTheorem')) return 'prime';
  return has(state, 'divisor') ? 'milestone' : 'max';
}

// 1 周を遊ぶ。戻り値は経過秒数。証明中は目標に届くか timeout で終わる
function playRun(state, timeout = 6 * 3600) {
  const carriesBefore = state.carries;
  let t = 0;
  let bestRate = -Infinity;
  let readyAt = null;
  while (t < timeout && state.carries === carriesBefore) {
    const mode = buyMode(state);
    for (let i = TIERS.length - 1; i >= 0; i--) buyBest(state, i, mode);
    tick(state, DT);
    t += DT;
    if (state.proof) {
      if (proofGoalReached(state)) break;
      continue;
    }
    if (canCarry(state)) {
      const rate = digitsLog(state) - Math.log10(t);
      bestRate = Math.max(bestRate, rate);
      if (rate < bestRate + Math.log10(0.9)) break;
      if (readyAt === null) readyAt = t;
      if (t >= readyAt + Math.max(readyAt * 2, 60)) break;
    }
  }
  return t;
}

if (process.env.SIM_PROBE) {
  // 対数を取るところまで進めてから、各証明を 15 分ずつ試す
  const state = newGame();
  let total = 0;
  while (!has(state, 'logarithm')) {
    total += playRun(state);
    if (state.carries === state.carries) carry(state);
    while (buyCheapest(state) !== null);
  }
  console.log(`対数を取った時点：${fmtT(total)}、通常の周で届く合計の桁数の目安を測る`);
  const base = serialize(state);
  const probe = (id) => {
    const s = deserialize(base);
    s.autoCarry = false;
    if (id) startProof(s, id);
    else s.runTotal = s.count; // 通常の周
    const marks = {};
    let t = 0;
    for (const minutes of [1, 3, 5, 10, 15]) {
      if (id) s.proofs = {}; // 目標に届いて終わらないよう、到達判定は見ない
      while (t < minutes * 60) {
        const mode = id === 'primeTheorem' ? 'prime' : 'milestone';
        for (let i = TIERS.length - 1; i >= 0; i--) buyBest(s, i, mode);
        tick(s, DT);
        t += DT;
      }
      marks[minutes] = s.runTotal.log10().toFixed(0);
    }
    return marks;
  };
  console.log(`通常の周      : ${JSON.stringify(probe(null))}`);
  for (const p of PROOFS) console.log(`${p.name.padEnd(8, '　')}: ${JSON.stringify(probe(p.id))}`);
  process.exit(0);
}

const state = newGame();
const targetExpansions = Number(process.env.SIM_EXPANSIONS || 1);
let expansionsSeen = 0;
let lastExpandAt = 0;
// 整数を安い順に使う（整数の強化と工場）
function spendIntegers() {
  const bought = [];
  for (;;) {
    let best = null;
    for (const u of INTEGER_UPGRADES) {
      if (integerUpgradeState(state, u) === 'affordable' && (!best || Big.from(u.cost).lt(best.cost))) best = { cost: Big.from(u.cost), buy: () => buyIntegerUpgrade(state, u.id), name: u.name };
    }
    for (const r of INTEGER_REPEATABLES) {
      const c = integerRepeatableCost(r, intLevel(state, r.id));
      const budget = interestRate(state) > 0 ? state.integers.mul(0.1) : state.integers;
      if (budget.gte(c) && (!best || c.lt(best.cost))) best = { cost: c, buy: () => buyIntegerRepeatable(state, r.id), name: null };
    }
    if (!best) break;
    best.buy();
    if (best.name) bought.push(best.name);
  }
  // 残りは工場を上の段から最大まで買う。利息があるときは所持の 10% だけ使い、残りは貯めて利息で増やす
  const keep = interestRate(state) > 0 ? state.integers.mul(0.9) : Big.from(0);
  state.integers = state.integers.sub(keep);
  for (let i = FACTORY.length - 1; i >= 0; i--) buyFactoryMax(state, i);
  for (let i = FACTORY.length - 1; i >= 0; i--) buyFactoryMax(state, i);
  state.integers = state.integers.add(keep);
  return bought;
}
function reportExpansion(r, gain) {
  const bought = spendIntegers();
  const fac = state.factory.map((f) => f.bought).join('/');
  console.log(`拡張 ${String(state.expansions).padStart(3)} 回目：${fmtT(total).padStart(9)}（前回から ${fmtT(total - lastExpandAt)}）整数 +${format(gain)}  所持 ${format(state.integers)}  工場 ${fac} 倍化${intLevel(state, 'factoryDouble')}${bought.length ? `  強化: ${bought.join('、')}` : ''}${canReachLayer3(state) ? '  ★第 3 層' : ''}`);
  lastExpandAt = total;
}
let total = 0;
let lastPrint = -1;
let retryAfter = 0;
const proofTimes = {};
for (let r = 0; r < maxRuns; r++) {
  // 証明に挑戦するか
  let attempting = null;
  if (proofsAvailable(state) && state.carries >= retryAfter) {
    // 次の証明（並び順で最初の未完成のもの）に挑戦する
    attempting = PROOFS.find((p) => !proven(state, p.id)) ?? null;
    if (attempting) startProof(state, attempting.id);
  }
  const t = playRun(state, attempting ? PROOF_TIMEOUT : 6 * 3600);
  total += t;
  let gain = state.lastGain;
  let note = '';
  if (attempting) {
    if (proofGoalReached(state)) {
      gain = digitsOnCarry(state);
      completeProof(state);
      proofTimes[attempting.name] = t;
      note = `  証明完成: ${attempting.name}（${fmtT(t)}）`;
    } else {
      note = `  証明断念: ${attempting.name}（合計 1e${state.runTotal.log10().toFixed(0)} / 1e${attempting.goal}）`;
      abandonProof(state);
      retryAfter = state.carries + 2;
      gain = Big.from(0);
    }
  } else if (!state.proof && state.lastGain === gain && digitsOnCarry(state).gt(0)) {
    gain = digitsOnCarry(state);
    carry(state);
  }
  if (state.expansions > expansionsSeen) {
    // ゲームの自動拡張が起きた
    expansionsSeen = state.expansions;
    reportExpansion(r, state.lastExpandGain);
    if (state.expansions >= targetExpansions) process.exit(0);
  }
  if (canExpand(state)) {
    if (state.expansions === 0) {
      console.log(note);
      console.log(`証明にかかった時間：${JSON.stringify(Object.fromEntries(Object.entries(proofTimes).map(([k, v]) => [k, fmtT(v)])))}`);
    }
    const g = expand(state);
    expansionsSeen = state.expansions;
    reportExpansion(r, g);
    if (state.expansions >= targetExpansions) process.exit(0);
    continue;
  }
  const bought = [];
  let name;
  while ((name = buyCheapest(state)) !== null) if (name) bought.push(name);
  const lg = Math.floor(gain.log10());
  if (verbose || bought.length || note || lg > lastPrint) {
    lastPrint = Math.max(lastPrint, lg);
    const lv = REPEATABLES.map((x) => `${x.name}${level(state, x.id)}`).join(' ');
    console.log(`${String(r + 1).padStart(4)} 周目 ${fmtT(total).padStart(9)}  1 周 ${fmtT(t).padStart(8)}  桁 +${format(gain).padEnd(10)} [${lv}]${bought.length ? `  強化: ${bought.join('、')}` : ''}${note}`);
  }
}
console.log(`\n拡張に届かず（${fmtT(total)}、所持桁 ${format(state.digits)} / ${EXPAND_DIGITS}）`);
