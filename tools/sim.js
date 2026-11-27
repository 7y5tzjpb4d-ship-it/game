// バランス確認用のシミュレーション。
// 「上の段から買えるだけ買う」プレイヤーを想定し、節目に届くまでの時間を表示する。
// 使い方: node tools/sim.js [進化回数]
import { newGame, tick, buyTier, canEvolve, evolve, genesOnEvolve, buyUpgrade, upgradeState, energyPerSec } from '../src/logic.js';
import { TIERS, UPGRADES } from '../src/data.js';
import { format } from '../src/big.js';

const runs = Number(process.argv[2] || 4);
const DT = 0.5;
const fmtT = (s) => `${Math.floor(s / 60)}分${String(Math.floor(s % 60)).padStart(2, '0')}秒`;

const state = newGame();
for (let r = 0; r < runs; r++) {
  const seen = new Set();
  let t = 0;
  // 進化できるようになったら、遺伝子が 1 回分の目安量に達するまで少し粘ってから進化
  let evolveReadyAt = null;
  while (t < 6 * 3600) {
    for (let i = TIERS.length - 1; i >= 0; i--) buyTier(state, i, 'max');
    tick(state, DT);
    t += DT;
    state.tiers.forEach((tier, i) => {
      if (tier.bought > 0 && !seen.has(i)) {
        seen.add(i);
        console.log(`  ${fmtT(t)}  ${TIERS[i].name} 解放  (エネルギー/秒 ${format(energyPerSec(state))})`);
      }
    });
    if (canEvolve(state)) {
      if (evolveReadyAt === null) evolveReadyAt = t;
      // 進化可能になってから、その時点までにかかった時間の 20% だけ追加で粘る
      if (t - evolveReadyAt >= evolveReadyAt * 0.2) break;
    }
  }
  const gain = genesOnEvolve(state);
  console.log(`進化 ${r + 1} 回目: ${fmtT(t)} で エネルギー ${format(state.energy)} → 遺伝子 +${format(gain)}`);
  evolve(state);
  // 安い順に買えるだけ強化を買う
  let bought = true;
  while (bought) {
    bought = false;
    for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
      if (upgradeState(state, u) === 'affordable') {
        buyUpgrade(state, u.id);
        console.log(`  強化: ${u.name}`);
        bought = true;
      }
    }
  }
}
