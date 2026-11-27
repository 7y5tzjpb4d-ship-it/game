// ゲームのルール。画面（DOM）には依存しないので、シミュレーションからも使える。
import { Big, ZERO } from './big.js';
import {
  TIERS, ENERGY_RATE, CHAIN_RATE,
  ADAPT_FACTOR, ADAPT_FACTOR_UPGRADED, adaptCount,
  START_ENERGY, EVOLVE_LOG10, GENE_EXPONENT_DIVISOR, GENE_BONUS_EXPONENT,
  UPGRADES, MEMORY_START_ENERGY, MITOSIS_MULT, SYMBIOSIS_MULT, DIVERSITY_MULT, DRIFT_MULT,
} from './data.js';

export const SAVE_VERSION = 1;

export function newRun(state) {
  state.energy = new Big(state.upgrades?.memory ? MEMORY_START_ENERGY : START_ENERGY, 0);
  state.tiers = TIERS.map(() => ({ count: ZERO, bought: 0 }));
  state.runTime = 0;
  return state;
}

export function newGame() {
  const state = {
    version: SAVE_VERSION,
    genes: ZERO,
    genesTotal: ZERO,
    evolutions: 0,
    upgrades: {},
    auto: true,
    buyMode: 'one',
    playTime: 0,
    lastSaved: Date.now(),
  };
  return newRun(state);
}

// ---------- セーブデータ ----------

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  const raw = JSON.parse(text);
  const state = newGame();
  if (!raw || typeof raw !== 'object') return state;
  state.energy = Big.from(raw.energy);
  state.genes = Big.from(raw.genes);
  state.genesTotal = Big.from(raw.genesTotal);
  state.evolutions = Number(raw.evolutions) || 0;
  state.upgrades = {};
  for (const u of UPGRADES) if (raw.upgrades?.[u.id]) state.upgrades[u.id] = true;
  state.auto = raw.auto !== false;
  state.buyMode = raw.buyMode === 'max' ? 'max' : 'one';
  state.playTime = Number(raw.playTime) || 0;
  state.runTime = Number(raw.runTime) || 0;
  state.lastSaved = Number(raw.lastSaved) || Date.now();
  state.tiers = TIERS.map((_, i) => ({
    count: Big.from(raw.tiers?.[i]?.count),
    bought: Number(raw.tiers?.[i]?.bought) || 0,
  }));
  return state;
}

// ---------- 倍率 ----------

export function has(state, id) {
  return !!state.upgrades[id];
}

// 累計遺伝子による全生産ボーナス：(1 + 累計)^指数
export function geneBonus(state) {
  return state.genesTotal.add(1).pow(GENE_BONUS_EXPONENT);
}

export function ownedTierCount(state) {
  return state.tiers.filter((t) => t.count.gt(0)).length;
}

export function globalMult(state) {
  let mult = geneBonus(state);
  if (has(state, 'symbiosis')) mult = mult.mul(SYMBIOSIS_MULT);
  if (has(state, 'diversity')) mult = mult.mul(DIVERSITY_MULT ** ownedTierCount(state));
  return mult;
}

export function adaptFactor(state) {
  return has(state, 'adaptation') ? ADAPT_FACTOR_UPGRADED : ADAPT_FACTOR;
}

export function adaptMult(state, i) {
  return Big.fromLog10(adaptCount(state.tiers[i].bought) * Math.log10(adaptFactor(state)));
}

export function tierMult(state, i) {
  let mult = globalMult(state).mul(adaptMult(state, i));
  if (i === 0 && has(state, 'mitosis')) mult = mult.mul(MITOSIS_MULT);
  return mult;
}

// 段 i が毎秒生み出す量（段 0 ならエネルギー、それ以外は段 i-1）
export function tierProduction(state, i) {
  return state.tiers[i].count.mul(tierMult(state, i)).mul(i === 0 ? ENERGY_RATE : CHAIN_RATE);
}

export function energyPerSec(state) {
  return tierProduction(state, 0);
}

// ---------- 購入 ----------

export function tierCost(i, bought) {
  const t = TIERS[i];
  return Big.fromLog10(Math.log10(t.baseCost) + bought * Math.log10(t.growth));
}

export function isTierUnlocked(state, i) {
  return i === 0 || state.tiers[i - 1].bought > 0 || state.tiers[i].bought > 0;
}

// 今のエネルギーで最大何個買えるか、その合計コスト
export function maxAffordable(state, i) {
  const t = TIERS[i];
  const c0 = tierCost(i, state.tiers[i].bought);
  if (state.energy.lt(c0)) return { n: 0, cost: ZERO };
  const r = t.growth;
  const lr = Math.log10(r);
  // 等比数列の和 c0 (r^n - 1) / (r - 1) <= E を n について解く
  const x = state.energy.mul(r - 1).div(c0);
  const lx = x.log10();
  const l1 = lx > 15 ? lx : Math.log10(1 + x.toNumber());
  let n = Math.max(1, Math.floor(l1 / lr));
  const totalCost = (k) => {
    const kl = k * lr;
    // r^k - 1。k が大きければ -1 は無視できる
    const lnum = kl > 15 ? kl : Math.log10(Math.expm1(kl * Math.LN10));
    return Big.fromLog10(c0.log10() + lnum - Math.log10(r - 1));
  };
  let cost = totalCost(n);
  while (n > 1 && cost.gt(state.energy)) {
    n -= 1;
    cost = totalCost(n);
  }
  if (cost.gt(state.energy)) return { n: 0, cost: ZERO };
  return { n, cost };
}

export function buyTier(state, i, mode = state.buyMode) {
  if (!isTierUnlocked(state, i)) return 0;
  let n;
  let cost;
  if (mode === 'max') {
    ({ n, cost } = maxAffordable(state, i));
  } else {
    cost = tierCost(i, state.tiers[i].bought);
    n = state.energy.gte(cost) ? 1 : 0;
  }
  if (n <= 0) return 0;
  state.energy = state.energy.sub(cost).max(ZERO);
  const tier = state.tiers[i];
  tier.count = tier.count.add(n);
  tier.bought += n;
  return n;
}

export function autoBuyAllowed(state, i) {
  if (!state.auto) return false;
  if (i <= 2) return has(state, 'reflex');
  return has(state, 'instinct');
}

export function hasAnyAuto(state) {
  return has(state, 'reflex') || has(state, 'instinct');
}

function autoBuy(state) {
  // 上の段から順に買えるだけ買う
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (autoBuyAllowed(state, i)) buyTier(state, i, 'max');
  }
}

// ---------- 時間経過 ----------

export function tick(state, dt) {
  const prods = TIERS.map((_, i) => tierProduction(state, i));
  state.energy = state.energy.add(prods[0].mul(dt));
  for (let i = 1; i < TIERS.length; i++) {
    if (prods[i].isZero()) continue;
    state.tiers[i - 1].count = state.tiers[i - 1].count.add(prods[i].mul(dt));
  }
  state.playTime += dt;
  state.runTime += dt;
  autoBuy(state);
}

// まとまった時間をまとめて進める（オフライン進行用）
export function advance(state, seconds, maxSteps = 2000) {
  if (seconds <= 0) return;
  const steps = Math.min(maxSteps, Math.max(1, Math.ceil(seconds / 0.05)));
  const dt = seconds / steps;
  for (let s = 0; s < steps; s++) tick(state, dt);
}

// ---------- 進化（1 段目のリセット） ----------

export function canEvolve(state) {
  return state.energy.log10() >= EVOLVE_LOG10;
}

export function genesOnEvolve(state) {
  if (!canEvolve(state)) return ZERO;
  let g = Big.fromLog10((state.energy.log10() - EVOLVE_LOG10) / GENE_EXPONENT_DIVISOR).floor();
  if (has(state, 'drift')) g = g.mul(DRIFT_MULT);
  return g;
}

// 次の遺伝子 +1 に必要なエネルギー
export function nextGeneAt(state) {
  const g = genesOnEvolve(state).div(has(state, 'drift') ? DRIFT_MULT : 1);
  const target = g.add(1);
  return Big.fromLog10(EVOLVE_LOG10 + target.log10() * GENE_EXPONENT_DIVISOR);
}

export function evolve(state) {
  const gain = genesOnEvolve(state);
  if (gain.isZero()) return ZERO;
  state.genes = state.genes.add(gain);
  state.genesTotal = state.genesTotal.add(gain);
  state.evolutions += 1;
  newRun(state);
  return gain;
}

// ---------- 遺伝子の強化 ----------

export function upgradeState(state, u) {
  if (has(state, u.id)) return 'owned';
  if (!u.requires.every((id) => has(state, id))) return 'locked';
  if (state.genes.gte(u.cost)) return 'affordable';
  return 'expensive';
}

export function buyUpgrade(state, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || upgradeState(state, u) !== 'affordable') return false;
  state.genes = state.genes.sub(u.cost).max(ZERO);
  state.upgrades[id] = true;
  return true;
}
