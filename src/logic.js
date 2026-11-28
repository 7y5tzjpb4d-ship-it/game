// ゲームのルール。画面（DOM）には依存しないので、シミュレーションからも使える。
import { Big, ZERO } from './big.js';
import {
  TIERS, COUNT_RATE, CHAIN_RATE,
  HCN, MILESTONE_FACTOR, MILESTONE_FACTOR_UPGRADED,
  START_COUNT, CARRY_LOG10, DIGIT_STEP, DIGIT_POWER, DIGIT_BONUS_EXPONENT,
  UPGRADES, MEMORY_START_COUNT, TEN_FINGERS_MULT, DECIMAL_MULT_PER_DIGIT,
  PRIME_MULT, DIVISOR_EXPONENT, PERFECT_NUMBERS, PERFECT_MULT, SEXAGESIMAL_MULT,
  START_FINGERS, PLACE_VALUE_MULT, EXPAND_DIGITS,
} from './data.js';

export const SAVE_VERSION = 1;
export const BUY_MODES = ['one', 'milestone', 'prime', 'max'];
export const AUTO_MODES = ['max', 'milestone', 'prime'];
const AUTO_BUY_INTERVAL = 0.2;
const SMALL_HCN = [1, 2, 4, 6];

// ---------- 整数論の小道具 ----------

const divisorCache = new Map();
// 約数の個数
export function divisorCount(n) {
  if (n < 1) return 0;
  const cached = divisorCache.get(n);
  if (cached !== undefined) return cached;
  let count = 1;
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e++;
    }
    count *= e + 1;
  }
  if (m > 1) count *= 2;
  if (divisorCache.size > 5000) divisorCache.clear();
  divisorCache.set(n, count);
  return count;
}

export function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let p = 3; p * p <= n; p += 2) if (n % p === 0) return false;
  return true;
}

export function isPerfect(n) {
  return PERFECT_NUMBERS.includes(n);
}

// 購入数 n までに通過した完全数の数
export function perfectPassed(n) {
  return PERFECT_NUMBERS.filter((p) => p <= n).length;
}

// n 以下で最大の素数（なければ 0）
export function primeAtMost(n) {
  for (let k = Math.floor(n); k >= 2; k--) if (isPrime(k)) return k;
  return 0;
}

// n より大きい最小の素数
export function nextPrime(n) {
  let k = Math.floor(n) + 1;
  while (!isPrime(k)) k++;
  return k;
}

// ---------- 状態 ----------

export function newRun(state) {
  state.count = new Big(state.upgrades?.memory ? MEMORY_START_COUNT : START_COUNT, 0);
  state.tiers = TIERS.map(() => ({ count: ZERO, bought: 0 }));
  if (state.upgrades?.openHands) {
    state.tiers[0] = { count: new Big(START_FINGERS, 0), bought: START_FINGERS };
  }
  // この周で数えた合計（買い物では減らない）。繰り上がりの基準になる
  state.runTotal = state.count;
  state.runTime = 0;
  state.bestRate = 0;
  return state;
}

export function newGame() {
  const state = {
    version: SAVE_VERSION,
    digits: ZERO,
    digitsTotal: ZERO,
    carries: 0,
    lastGain: ZERO,
    upgrades: {},
    auto: true,
    autoMode: 'max',
    autoCarry: true,
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
  state.count = Big.from(raw.count);
  state.runTotal = raw.runTotal ? Big.from(raw.runTotal) : state.count;
  state.digits = Big.from(raw.digits);
  state.digitsTotal = Big.from(raw.digitsTotal);
  state.carries = Number(raw.carries) || 0;
  state.lastGain = Big.from(raw.lastGain);
  state.upgrades = {};
  for (const u of UPGRADES) if (raw.upgrades?.[u.id]) state.upgrades[u.id] = true;
  state.auto = raw.auto !== false;
  state.autoMode = AUTO_MODES.includes(raw.autoMode) ? raw.autoMode : 'max';
  state.autoCarry = raw.autoCarry !== false;
  state.buyMode = BUY_MODES.includes(raw.buyMode) ? raw.buyMode : 'one';
  state.playTime = Number(raw.playTime) || 0;
  state.runTime = Number(raw.runTime) || 0;
  state.bestRate = Number(raw.bestRate) || 0;
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

// 累計の桁による「数」の生産ボーナス：(1 + 累計)^指数
export function digitBonus(state) {
  return state.digitsTotal.add(1).pow(DIGIT_BONUS_EXPONENT);
}

// 「数」の桁数（10 進）
export function countDigits(state) {
  if (state.count.lt(1)) return 1;
  return Math.floor(state.count.log10()) + 1;
}

export function decimalMult(state) {
  if (!has(state, 'decimal')) return new Big(1, 0);
  return Big.fromLog10(countDigits(state) * Math.log10(DECIMAL_MULT_PER_DIGIT));
}

export function globalMult(state) {
  let mult = digitBonus(state).mul(decimalMult(state));
  if (has(state, 'placeValue')) mult = mult.mul(PLACE_VALUE_MULT);
  return mult;
}

export function milestoneFactor(state) {
  return has(state, 'hcn') ? MILESTONE_FACTOR_UPGRADED : MILESTONE_FACTOR;
}

// 購入数 b までに通過した節目（高度合成数）の数
export function milestonesPassed(bought) {
  let k = 0;
  while (k < HCN.length && HCN[k] <= bought) k++;
  return k;
}

export function nextMilestone(bought) {
  return HCN.find((h) => h > bought) ?? null;
}

export function milestoneMult(state, i) {
  return Big.fromLog10(milestonesPassed(state.tiers[i].bought) * Math.log10(milestoneFactor(state)));
}

// 購入数にまつわる整数論ボーナス（約数・素数・完全数）
export function numberTheoryMult(state, i) {
  const b = state.tiers[i].bought;
  let m = 1;
  if (b <= 0) return m;
  if (has(state, 'divisor')) m *= divisorCount(b) ** DIVISOR_EXPONENT;
  if (has(state, 'prime') && isPrime(b)) m *= PRIME_MULT;
  if (has(state, 'perfect')) m *= PERFECT_MULT ** perfectPassed(b);
  return m;
}

// 段 i の倍率。全体倍率（桁・十進法・位取り）は「数」を生む指にだけ掛ける。
// 全段に掛けると連鎖を通じて何乗にも効いてしまい、バランスが崩れるため
export function tierMult(state, i) {
  let mult = milestoneMult(state, i).mul(numberTheoryMult(state, i));
  if (i === 0) {
    mult = mult.mul(globalMult(state));
    if (has(state, 'tenFingers')) mult = mult.mul(TEN_FINGERS_MULT);
  }
  return mult;
}

// 段 i が毎秒生み出す量（段 0 なら「数」、それ以外は段 i-1）
export function tierProduction(state, i) {
  return state.tiers[i].count.mul(tierMult(state, i)).mul(i === 0 ? COUNT_RATE : CHAIN_RATE);
}

export function countPerSec(state) {
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

// k 個まとめて買うときの合計コスト（等比数列の和）
export function bulkCost(i, bought, k) {
  if (k <= 0) return ZERO;
  const r = TIERS[i].growth;
  const lr = Math.log10(r);
  const kl = k * lr;
  // r^k - 1。k が大きければ -1 は無視できる
  const lnum = kl > 15 ? kl : Math.log10(Math.expm1(kl * Math.LN10));
  return Big.fromLog10(tierCost(i, bought).log10() + lnum - Math.log10(r - 1));
}

// 今の「数」で最大何個買えるか、その合計コスト
export function maxAffordable(state, i) {
  const bought = state.tiers[i].bought;
  const c0 = tierCost(i, bought);
  if (state.count.lt(c0)) return { n: 0, cost: ZERO };
  const r = TIERS[i].growth;
  // 等比数列の和 c0 (r^n - 1) / (r - 1) <= N を n について解く
  const x = state.count.mul(r - 1).div(c0);
  const lx = x.log10();
  const l1 = lx > 15 ? lx : Math.log10(1 + x.toNumber());
  let n = Math.max(1, Math.floor(l1 / Math.log10(r)));
  let cost = bulkCost(i, bought, n);
  while (n > 1 && cost.gt(state.count)) {
    n -= 1;
    cost = bulkCost(i, bought, n);
  }
  if (cost.gt(state.count)) return { n: 0, cost: ZERO };
  return { n, cost };
}

function addBought(state, i, n, cost) {
  state.count = state.count.sub(cost).max(ZERO);
  const tier = state.tiers[i];
  tier.count = tier.count.add(n);
  tier.bought += n;
  return n;
}

export function buyTier(state, i, mode = state.buyMode) {
  if (!isTierUnlocked(state, i)) return 0;
  if (mode === 'max') {
    const { n, cost } = maxAffordable(state, i);
    return n > 0 ? addBought(state, i, n, cost) : 0;
  }
  const cost = tierCost(i, state.tiers[i].bought);
  return state.count.gte(cost) ? addBought(state, i, 1, cost) : 0;
}

// 購入数をちょうど target にする。買えなければ何もしない
function buyUpTo(state, i, target) {
  const bought = state.tiers[i].bought;
  const k = target - bought;
  if (k <= 0) return 0;
  const cost = bulkCost(i, bought, k);
  return state.count.gte(cost) ? addBought(state, i, k, cost) : 0;
}

// 次の節目（高度合成数）までまとめて買う
export function buyToMilestone(state, i) {
  if (!isTierUnlocked(state, i)) return 0;
  const target = nextMilestone(state.tiers[i].bought);
  return target === null ? 0 : buyUpTo(state, i, target);
}

// 次の素数までまとめて買う
export function buyToPrime(state, i) {
  if (!isTierUnlocked(state, i)) return 0;
  return buyUpTo(state, i, nextPrime(state.tiers[i].bought));
}

// 手動購入（購入モードに従う）
export function buyByMode(state, i, mode = state.buyMode) {
  if (mode === 'milestone') return buyToMilestone(state, i);
  if (mode === 'prime') return buyToPrime(state, i);
  return buyTier(state, i, mode);
}

// 買える範囲で、買い止め方に合ういちばん大きい購入数まで買う（自動購入用）
export function buyBest(state, i, mode) {
  if (mode === 'max') return buyTier(state, i, 'max');
  if (!isTierUnlocked(state, i)) return 0;
  const bought = state.tiers[i].bought;
  const { n } = maxAffordable(state, i);
  if (n <= 0) return 0;
  const limit = bought + n;
  let target;
  if (mode === 'milestone') {
    // 用意した高度合成数を超えたら最大まで買う
    // 買い止め先には 12 未満の高度合成数（1, 2, 4, 6）も含める
    target = limit > HCN[HCN.length - 1] ? limit : [...SMALL_HCN, ...HCN].reverse().find((h) => h <= limit) ?? 0;
  } else {
    target = primeAtMost(limit);
  }
  return target > bought ? buyUpTo(state, i, target) : 0;
}

export function autoBuyAllowed(state, i) {
  if (!state.auto) return false;
  if (i <= 2) return has(state, 'autoCount');
  return has(state, 'autoCount2');
}

export function hasAnyAuto(state) {
  return has(state, 'autoCount') || has(state, 'autoCount2');
}

function autoBuy(state) {
  // 上の段から順に買えるだけ買う
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (autoBuyAllowed(state, i)) buyBest(state, i, state.autoMode);
  }
}

// ---------- 繰り上がり（第 1 層のリセット） ----------

export function canCarry(state) {
  return state.runTotal.log10() >= CARRY_LOG10;
}

function rawDigits(state) {
  const l = state.runTotal.log10();
  if (l < CARRY_LOG10) return 0;
  let g = (1 + (l - CARRY_LOG10) / DIGIT_STEP) ** DIGIT_POWER;
  if (has(state, 'sexagesimal')) g *= SEXAGESIMAL_MULT;
  return g;
}

// 切り捨て前の獲得量（効率の判定用）
export function digitsContinuous(state) {
  return Big.from(rawDigits(state));
}

export function digitsOnCarry(state) {
  return Big.from(Math.floor(rawDigits(state)));
}

// 次の +1 桁に必要な「この周で数えた合計」
export function nextDigitAt(state) {
  const mult = has(state, 'sexagesimal') ? SEXAGESIMAL_MULT : 1;
  const target = (Math.floor(rawDigits(state)) + 1) / mult;
  return Big.fromLog10(CARRY_LOG10 + (target ** (1 / DIGIT_POWER) - 1) * DIGIT_STEP);
}

export function carry(state) {
  const gain = digitsOnCarry(state);
  if (gain.isZero()) return ZERO;
  state.digits = state.digits.add(gain);
  state.digitsTotal = state.digitsTotal.add(gain);
  state.carries += 1;
  state.lastGain = gain;
  newRun(state);
  return gain;
}

export function autoCarryAvailable(state) {
  return has(state, 'autoCarry');
}

// 1 秒あたりの桁の獲得効率（今繰り上がった場合）。切り捨て前の値で比べる
export function carryRate(state) {
  if (state.runTime <= 0) return 0;
  return digitsContinuous(state).toNumber() / state.runTime;
}

// 効率が今回の最高値の 90% を下回ったら自動で繰り上がる
const AUTO_CARRY_RATE_DROP = 0.9;

function shouldAutoCarry(state) {
  if (!autoCarryAvailable(state) || !state.autoCarry || !canCarry(state)) return false;
  const rate = carryRate(state);
  if (rate > state.bestRate) state.bestRate = rate;
  return rate < state.bestRate * AUTO_CARRY_RATE_DROP;
}

// ---------- 時間経過 ----------

// 戻り値：この間に自動で繰り上がった回数
export function tick(state, dt) {
  const prods = TIERS.map((_, i) => tierProduction(state, i));
  const gained = prods[0].mul(dt);
  state.count = state.count.add(gained);
  state.runTotal = state.runTotal.add(gained);
  for (let i = 1; i < TIERS.length; i++) {
    if (prods[i].isZero()) continue;
    state.tiers[i - 1].count = state.tiers[i - 1].count.add(prods[i].mul(dt));
  }
  state.playTime += dt;
  state.runTime += dt;
  // 自動購入は 0.2 秒ごと（素数探しなどの計算を毎フレームしないため）
  state.autoBuyTimer = (state.autoBuyTimer || 0) + dt;
  if (state.autoBuyTimer >= AUTO_BUY_INTERVAL) {
    state.autoBuyTimer = 0;
    autoBuy(state);
  }
  if (shouldAutoCarry(state)) {
    carry(state);
    return 1;
  }
  return 0;
}

// まとまった時間をまとめて進める（オフライン進行用）
export function advance(state, seconds, maxSteps = 2000) {
  if (seconds <= 0) return 0;
  const steps = Math.min(maxSteps, Math.max(1, Math.ceil(seconds / 0.05)));
  const dt = seconds / steps;
  let carries = 0;
  for (let s = 0; s < steps; s++) carries += tick(state, dt);
  return carries;
}

// ---------- 第 2 層への拡張 ----------

export function canExpand(state) {
  return state.digitsTotal.gte(EXPAND_DIGITS);
}

// ---------- 桁の強化 ----------

export function upgradeState(state, u) {
  if (has(state, u.id)) return 'owned';
  if (!u.requires.every((id) => has(state, id))) return 'locked';
  if (state.digits.gte(u.cost)) return 'affordable';
  return 'expensive';
}

export function buyUpgrade(state, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || upgradeState(state, u) !== 'affordable') return false;
  state.digits = state.digits.sub(u.cost).max(ZERO);
  state.upgrades[id] = true;
  return true;
}
