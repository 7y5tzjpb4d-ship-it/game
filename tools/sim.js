// バランス確認用のシミュレーション。
// 「上の段から買えるだけ買い、1 秒あたりの桁の獲得効率が落ち始めたら繰り上がる」
// プレイヤーを想定し、繰り上がりまでの時間と獲得量を表示する。
// 使い方: node tools/sim.js [繰り上がり回数] [-v]
import { newGame, tick, buyTier, canCarry, carry, digitsOnCarry, digitsContinuous, buyUpgrade, upgradeState, countPerSec } from '../src/logic.js';
import { TIERS, UPGRADES } from '../src/data.js';
import { format } from '../src/big.js';

const runs = Number(process.argv[2] || 5);
const verbose = process.argv.includes('-v');
const DT = 0.5;
const fmtT = (s) => `${Math.floor(s / 60)}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`;

const state = newGame();
let total = 0;
for (let r = 0; r < runs; r++) {
  const seen = new Set();
  const carriesBefore = state.carries;
  let t = 0;
  let readyAt = null;
  let bestRate = 0;
  while (t < 6 * 3600 && state.carries === carriesBefore) {
    for (let i = TIERS.length - 1; i >= 0; i--) buyTier(state, i, 'max');
    tick(state, DT);
    t += DT;
    if (verbose) {
      state.tiers.forEach((tier, i) => {
        if (tier.bought > 0 && !seen.has(i)) {
          seen.add(i);
          console.log(`    ${fmtT(t)}  ${TIERS[i].name} 解放  (数/秒 ${format(countPerSec(state))})`);
        }
      });
    }
    if (canCarry(state)) {
      if (readyAt === null) readyAt = t;
      // 1 秒あたりの獲得量（桁 / 経過時間）が最高値の 90% を下回ったら繰り上がる
      const rate = digitsContinuous(state).toNumber() / t;
      bestRate = Math.max(bestRate, rate);
      if (rate < bestRate * 0.9) break;
    }
  }
  total += t;
  let gain;
  if (state.carries === carriesBefore) {
    gain = digitsOnCarry(state);
    carry(state);
  } else {
    gain = state.lastGain;
  }
  const auto = state.carries === carriesBefore + 1 && readyAt === null ? '（自動）' : '';
  console.log(`繰り上がり ${String(r + 1).padStart(2)} 回目: ${fmtT(t).padStart(8)}  桁 +${format(gain)}${auto}  （累計 ${fmtT(total)}）`);
  let bought = true;
  while (bought) {
    bought = false;
    for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
      if (upgradeState(state, u) === 'affordable') {
        buyUpgrade(state, u.id);
        console.log(`    強化: ${u.name}`);
        bought = true;
      }
    }
  }
}
