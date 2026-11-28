// バランス確認用のシミュレーション。
// 「上の段から買えるだけ買い（約数の力を取ったら節目で買い止め）、桁の獲得効率が落ち始めたら
// 繰り上がり、桁は安い強化から順に使う」プレイヤーを想定する。
// 使い方: node tools/sim.js [最大繰り上がり回数] [-v]
import {
  newGame, tick, buyBest, has, canCarry, carry, digitsLog, digitsOnCarry, buyUpgrade, upgradeState,
  buyRepeatable, repeatableState, repeatableCost, level, canExpand,
} from '../src/logic.js';
import { TIERS, UPGRADES, REPEATABLES, EXPAND_DIGITS } from '../src/data.js';
import { Big, format } from '../src/big.js';

const maxRuns = Number(process.argv[2] || 2000);
const verbose = process.argv.includes('-v');
const DT = 0.5;
const fmtT = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`;
};

// 一番安い買えるもの（強化・繰り返し強化）を 1 つ買う
function buyCheapest(state) {
  const options = [];
  for (const u of UPGRADES) if (upgradeState(state, u) === 'affordable') options.push({ cost: Big.from(u.cost), buy: () => buyUpgrade(state, u.id), name: u.name });
  for (const r of REPEATABLES) if (repeatableState(state, r) === 'affordable') options.push({ cost: repeatableCost(r, level(state, r.id)), buy: () => buyRepeatable(state, r.id), name: null });
  if (!options.length) return null;
  options.sort((a, b) => a.cost.cmp(b.cost));
  options[0].buy();
  return options[0].name ?? '';
}

const state = newGame();
let total = 0;
let lastPrint = -1;
const maxTotal = Number(process.env.SIM_MAX_HOURS || 40) * 3600;
for (let r = 0; r < maxRuns && total < maxTotal; r++) {
  const carriesBefore = state.carries;
  let t = 0;
  let bestRate = -Infinity;
  while (t < 6 * 3600 && state.carries === carriesBefore) {
    const mode = has(state, 'divisor') ? 'milestone' : 'max';
    state.autoMode = mode;
    for (let i = TIERS.length - 1; i >= 0; i--) buyBest(state, i, mode);
    tick(state, DT);
    t += DT;
    if (canCarry(state)) {
      // 1 秒あたりの獲得量（log）が最高値の 90% を下回ったら繰り上がる
      const rate = digitsLog(state) - Math.log10(t);
      bestRate = Math.max(bestRate, rate);
      if (rate < bestRate + Math.log10(0.9)) break;
    }
  }
  total += t;
  let gain = state.lastGain;
  if (state.carries === carriesBefore) {
    gain = digitsOnCarry(state);
    carry(state);
  }
  if (canExpand(state)) {
    console.log(`\n拡張に到達：繰り上がり ${r + 1} 回、${fmtT(total)}（所持桁 ${format(state.digits)}）`);
    process.exit(0);
  }
  const bought = [];
  let name;
  while ((name = buyCheapest(state)) !== null) if (name) bought.push(name);
  const lg = Math.floor(gain.log10());
  if (verbose || bought.length || lg > lastPrint) {
    lastPrint = Math.max(lastPrint, lg);
    const lv = REPEATABLES.map((x) => `${x.name}${level(state, x.id)}`).join(' ');
    console.log(`${String(r + 1).padStart(4)} 回目 ${fmtT(total).padStart(9)}  1 周 ${fmtT(t).padStart(8)}  桁 +${format(gain).padEnd(10)} [${lv}]${bought.length ? `  強化: ${bought.join('、')}` : ''}`);
  }
}
console.log(`\n拡張に届かず（繰り上がり ${state.carries} 回）（${fmtT(total)}、所持桁 ${format(state.digits)} / ${EXPAND_DIGITS}）`);
