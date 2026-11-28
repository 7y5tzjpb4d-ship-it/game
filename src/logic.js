// ゲームのルール。画面（DOM）には依存しないので、シミュレーションからも使える。
import { Big, ZERO } from './big.js';
import {
  TIERS, COUNT_RATE, CHAIN_RATE,
  HCN, MILESTONE_FACTOR, MILESTONE_FACTOR_UPGRADED,
  START_COUNT, CARRY_LOG10, DIGIT_STEP, DIGIT_POWER, DIGIT_BONUS_EXPONENT,
  UPGRADES, MEMORY_START_COUNT, TEN_FINGERS_MULT, DECIMAL_MULT_PER_DIGIT,
  PRIME_MULT, DIVISOR_EXPONENT, PERFECT_NUMBERS, PERFECT_MULT, SEXAGESIMAL_MULT,
  START_FINGERS, PLACE_VALUE_MULT, EXPAND_DIGITS,
  REPEATABLES, EXPONENT_DIVISOR, SCIENTIFIC_DIVISOR, BONUS_EXPONENT_WEIGHT, BONUS_EXPONENT_POWER, BONUS_EXPONENT_LOG,
  ARROW_POWER, COUNT_TRIPLE_MULT, DIGIT_DOUBLE_MULT,
  PROOFS, PRIME_MULT_PROVEN, DIVISOR_EXPONENT_PROVEN, FEW_TOOLS_REWARD_MULT, NAIVE_GROWTH,
  PERFECT_MULT_PROVEN, PERFECT_QUEST_POWER, FORGET_DIGITS_BONUS, RECURRENCE_MULT,
  GOOGOL_LOG_PER_PROOF, FEW_TOOLS_LIMIT, REPEATABLE_SOFTCAP_LEVEL, REPEATABLE_SOFTCAP_LEVEL_GOOGOL, REPEATABLE_SOFTCAP_STEEPNESS,
  EXPAND_LOG10, EXPAND_GAIN_DIVISOR, EXPAND_NEG_EXPONENT, EXPAND_MIN_GAIN, BASIC_UPGRADES, FACTORY, FACTORY_ENERGY_RATE, FACTORY_CHAIN_RATE,
  NEG_COUNT_EXPONENT, NEG_DIGIT_EXPONENT, INTEGER_UPGRADES, FACTORY_BOOST_MULT, EXPAND_BOOST_MULT,
  SOFTCAP_SHIFT, LAYER3_INTEGERS,
} from './data.js';

export const SAVE_VERSION = 1;
export const BUY_MODES = ['one', 'milestone', 'prime', 'max'];
export const AUTO_MODES = ['max', 'milestone', 'prime'];
export const AUTO_CARRY_MODES = ['rate', 'amount', 'time'];
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
  state.bestRate = -Infinity; // 桁の獲得効率の最高値（log10）
  state.readyTime = null; // この周で繰り上がれるようになった時刻
  return state;
}

export function newGame() {
  const state = {
    version: SAVE_VERSION,
    // 第 2 層（拡張してもリセットされない）
    integers: ZERO,
    integersTotal: ZERO,
    expansions: 0,
    integerUpgrades: {},
    factory: FACTORY.map(() => ({ count: ZERO, bought: 0 })),
    negEnergy: ZERO,
    autoExpand: true,
    autoDigitUpgrades: true,
    // 第 1 層
    digits: ZERO,
    digitsTotal: ZERO,
    carries: 0,
    lastGain: ZERO,
    upgrades: {},
    levels: {},
    proof: null,
    proofs: {},
    auto: true,
    autoMode: 'max',
    autoCarry: true,
    autoCarryMode: 'rate',
    autoCarryAmount: 10,
    autoCarryTime: 60,
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
  state.proof = PROOFS.some((p) => p.id === raw.proof) ? raw.proof : null;
  state.proofs = {};
  for (const p of PROOFS) if (raw.proofs?.[p.id]) state.proofs[p.id] = true;
  state.levels = {};
  for (const r of REPEATABLES) state.levels[r.id] = Math.max(0, Math.floor(Number(raw.levels?.[r.id]) || 0));
  state.auto = raw.auto !== false;
  state.autoMode = AUTO_MODES.includes(raw.autoMode) ? raw.autoMode : 'max';
  state.autoCarry = raw.autoCarry !== false;
  state.autoCarryMode = AUTO_CARRY_MODES.includes(raw.autoCarryMode) ? raw.autoCarryMode : 'rate';
  state.autoCarryAmount = Number(raw.autoCarryAmount) > 0 ? Number(raw.autoCarryAmount) : 10;
  state.autoCarryTime = Number(raw.autoCarryTime) > 0 ? Number(raw.autoCarryTime) : 60;
  state.buyMode = BUY_MODES.includes(raw.buyMode) ? raw.buyMode : 'one';
  state.playTime = Number(raw.playTime) || 0;
  state.runTime = Number(raw.runTime) || 0;
  state.bestRate = Number.isFinite(raw.bestRate) ? raw.bestRate : -Infinity;
  state.readyTime = Number.isFinite(raw.readyTime) ? raw.readyTime : null;
  state.lastSaved = Number(raw.lastSaved) || Date.now();
  state.integers = Big.from(raw.integers);
  state.integersTotal = Big.from(raw.integersTotal);
  state.expansions = Number(raw.expansions) || 0;
  state.integerUpgrades = {};
  for (const u of INTEGER_UPGRADES) if (raw.integerUpgrades?.[u.id]) state.integerUpgrades[u.id] = true;
  state.factory = FACTORY.map((_, i) => ({
    count: Big.from(raw.factory?.[i]?.count),
    bought: Number(raw.factory?.[i]?.bought) || 0,
  }));
  state.negEnergy = Big.from(raw.negEnergy);
  state.autoExpand = raw.autoExpand !== false;
  state.autoDigitUpgrades = raw.autoDigitUpgrades !== false;
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

// ---------- 証明 ----------

export function proven(state, id) {
  return !!state.proofs?.[id];
}

export function provenCount(state) {
  return PROOFS.filter((p) => proven(state, p.id)).length;
}

export function inProof(state, id) {
  return state.proof === id;
}

export function proofsAvailable(state) {
  return has(state, 'logarithm');
}

export function activeProof(state) {
  return PROOFS.find((p) => p.id === state.proof) ?? null;
}

export function proofGoalReached(state) {
  const p = activeProof(state);
  return !!p && state.runTotal.log10() >= p.goal;
}

// 証明は並び順に 1 つずつ開く（前の証明を完成させると次が挑戦できる）
export function proofUnlocked(state, id) {
  const i = PROOFS.findIndex((p) => p.id === id);
  return proofsAvailable(state) && i >= 0 && PROOFS.slice(0, i).every((p) => proven(state, p.id));
}

// 証明を始める：今の周をリセットして制約付きの周にする（桁はもらえない）
export function startProof(state, id) {
  if (state.proof || proven(state, id) || !proofUnlocked(state, id)) return false;
  state.proof = id;
  newRun(state);
  return true;
}

// 証明をやめる：今の周をリセットして通常に戻る（桁はもらえない）
export function abandonProof(state) {
  if (!state.proof) return false;
  state.proof = null;
  newRun(state);
  return true;
}

// 証明を完成させる：定理を得て、通常の繰り上がりと同じだけ桁ももらう
export function completeProof(state) {
  if (!proofGoalReached(state)) return false;
  state.proofs[state.proof] = true;
  state.proof = null;
  carry(state);
  return true;
}

export function level(state, id) {
  return state.levels?.[id] || 0;
}

export function digitBonusExponent(state) {
  let e = DIGIT_BONUS_EXPONENT;
  if (has(state, 'logarithm')) e = BONUS_EXPONENT_LOG;
  else if (has(state, 'power')) e = BONUS_EXPONENT_POWER;
  else if (has(state, 'weight')) e = BONUS_EXPONENT_WEIGHT;
  if (proven(state, 'forgetDigits')) e += FORGET_DIGITS_BONUS;
  return e;
}

// 累計の桁による「数」の生産ボーナス：(1 + 累計)^指数
export function digitBonus(state) {
  if (inProof(state, 'forgetDigits')) return new Big(1, 0);
  return state.digitsTotal.add(1).pow(digitBonusExponent(state));
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
  mult = mult.mul(Big.fromLog10(negCountLog(state)));
  const triple = inProof(state, 'naive') ? 0 : level(state, 'countTriple');
  if (triple > 0) mult = mult.mul(Big.fromLog10(triple * Math.log10(COUNT_TRIPLE_MULT)));
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
  if (inProof(state, 'divisorStudy')) return new Big(1, 0);
  return Big.fromLog10(milestonesPassed(state.tiers[i].bought) * Math.log10(milestoneFactor(state)));
}

// 購入数にまつわる整数論ボーナス（約数・素数・完全数）
export function numberTheoryMult(state, i) {
  const b = state.tiers[i].bought;
  let m = 1;
  if (b <= 0) return m;
  if (has(state, 'divisor')) m *= divisorCount(b) ** (proven(state, 'divisorStudy') ? DIVISOR_EXPONENT_PROVEN : DIVISOR_EXPONENT);
  if (has(state, 'prime') && isPrime(b)) m *= proven(state, 'primeTheorem') ? PRIME_MULT_PROVEN : PRIME_MULT;
  if (has(state, 'perfect')) m *= (proven(state, 'perfectQuest') ? PERFECT_MULT_PROVEN : PERFECT_MULT) ** perfectPassed(b);
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
  if (i >= FEW_TOOLS_LIMIT && proven(state, 'fewTools')) mult = mult.mul(FEW_TOOLS_REWARD_MULT);
  return mult;
}

// 段 i が毎秒生み出す量（段 0 なら「数」、それ以外は段 i-1）
export function tierProduction(state, i) {
  if (inProof(state, 'primeTheorem') && !isPrime(state.tiers[i].bought)) return ZERO;
  if (inProof(state, 'fewTools') && i >= FEW_TOOLS_LIMIT) return ZERO;
  const p = state.tiers[i].count.mul(tierMult(state, i)).mul(i === 0 ? COUNT_RATE : CHAIN_RATE);
  if (i === 0 && inProof(state, 'perfectQuest')) return p.pow(PERFECT_QUEST_POWER);
  return p;
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
  if (inProof(state, 'fewTools') && i >= FEW_TOOLS_LIMIT) return false;
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
    // 素数（2 以上）に届かないうちは 1 個だけ買って始める
    target = limit >= 2 ? primeAtMost(limit) : limit;
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

// 繰り上がりで得られる桁の log10（切り捨て前）。届いていなければ -Infinity
// 大きな値を扱うので、すべて log10 で計算する
export function digitsLog(state, l = state.runTotal.log10()) {
  if (l < CARRY_LOG10) return -Infinity;
  const over = l - CARRY_LOG10;
  let lg = DIGIT_POWER * Math.log10(1 + over / DIGIT_STEP);
  if (has(state, 'sexagesimal')) lg += Math.log10(SEXAGESIMAL_MULT);
  if (!inProof(state, 'naive')) lg += level(state, 'digitDouble') * Math.log10(has(state, 'recurrence') ? RECURRENCE_MULT : DIGIT_DOUBLE_MULT);
  if (has(state, 'exponent')) lg += over / (has(state, 'scientific') ? SCIENTIFIC_DIVISOR : EXPONENT_DIVISOR);
  if (has(state, 'googol')) lg += provenCount(state) * GOOGOL_LOG_PER_PROOF;
  lg += negDigitLog(state);
  if (has(state, 'arrow') && lg > 0) lg *= ARROW_POWER;
  return lg;
}

// 切り捨て前の獲得量（効率の判定用）
export function digitsContinuous(state) {
  return Big.fromLog10(digitsLog(state));
}

export function digitsOnCarry(state) {
  return Big.fromLog10(digitsLog(state)).floor();
}

// 次の +1 桁に必要な「この周で数えた合計」。獲得量が大きくて意味がなければ null
export function nextDigitAt(state) {
  const l = state.runTotal.log10();
  const lg = digitsLog(state, l);
  if (lg > 9) return null;
  const target = Math.log10(Math.floor(10 ** lg) + 1);
  // digitsLog は L について単調増加なので二分探索
  let lo = Math.max(l, CARRY_LOG10);
  let hi = lo + 1;
  while (digitsLog(state, hi) < target) hi += hi - CARRY_LOG10 + 1;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (digitsLog(state, mid) >= target) hi = mid;
    else lo = mid;
  }
  return Big.fromLog10(hi);
}

export function carry(state) {
  if (state.proof) return ZERO; // 証明中は completeProof か abandonProof で抜ける
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

// 1 秒あたりの桁の獲得効率の log10（今繰り上がった場合）。切り捨て前の値で比べる
export function carryRateLog(state) {
  if (state.runTime <= 0) return -Infinity;
  return digitsLog(state) - Math.log10(state.runTime);
}

// 効率が今回の最高値の 90% を下回ったら自動で繰り上がる
const AUTO_CARRY_RATE_DROP = 0.9;
// 効率モードの安全装置：効率が上がり続けても、繰り上がれるようになってから
// その時間の 2 倍（最低 60 秒）たったら繰り上がる
const AUTO_CARRY_RATE_GUARD_FACTOR = 2;
const AUTO_CARRY_RATE_GUARD_MIN = 60;

export function autoCarryGuardTime(state) {
  if (state.readyTime === null) return null;
  return state.readyTime + Math.max(state.readyTime * AUTO_CARRY_RATE_GUARD_FACTOR, AUTO_CARRY_RATE_GUARD_MIN);
}

function shouldAutoCarry(state) {
  if (!canCarry(state)) return false;
  if (state.readyTime === null) state.readyTime = state.runTime;
  if (!autoCarryAvailable(state) || !state.autoCarry || state.proof) return false;
  if (state.autoCarryMode === 'time') return state.runTime >= state.autoCarryTime;
  if (state.autoCarryMode === 'amount') {
    // 得られる桁 ≥ 所持している桁 × 指定の倍率（所持が 1 未満なら 1 として扱う）
    return digitsLog(state) >= Math.max(0, state.digits.log10()) + Math.log10(state.autoCarryAmount);
  }
  const rate = carryRateLog(state);
  if (rate > state.bestRate) state.bestRate = rate;
  if (rate < state.bestRate + Math.log10(AUTO_CARRY_RATE_DROP)) return true;
  return state.runTime >= autoCarryGuardTime(state);
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
  tickFactory(state, dt);
  state.playTime += dt;
  state.runTime += dt;
  // 自動購入は 0.2 秒ごと（素数探しなどの計算を毎フレームしないため）
  state.autoBuyTimer = (state.autoBuyTimer || 0) + dt;
  if (state.autoBuyTimer >= AUTO_BUY_INTERVAL) {
    state.autoBuyTimer = 0;
    autoBuy(state);
    autoBuyDigitUpgrades(state);
    if (hasInt(state, 'autoExpand') && state.autoExpand && canExpand(state) && !state.proof) {
      state.lastExpandGain = expand(state);
      return 0;
    }
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
  return state.digits.gte(EXPAND_DIGITS);
}

// ---------- 桁の強化 ----------

export function upgradeState(state, u) {
  if (has(state, u.id)) return 'owned';
  if (!u.requires.every((id) => has(state, id))) return 'locked';
  if (u.proofs && provenCount(state) < u.proofs) return 'locked';
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

// ---------- 繰り返し買える強化 ----------

export function repeatableGrowth(state, r) {
  return proven(state, 'naive') ? NAIVE_GROWTH[r.id] ?? r.growth : r.growth;
}

export function repeatableCost(r, lv, state = null) {
  const growth = state ? repeatableGrowth(state, r) : r.growth;
  let cap = state && has(state, 'googol') ? REPEATABLE_SOFTCAP_LEVEL_GOOGOL : REPEATABLE_SOFTCAP_LEVEL;
  if (state && hasInt(state, 'softcapShift')) cap += SOFTCAP_SHIFT;
  const over = Math.max(0, lv - cap);
  return Big.fromLog10(Math.log10(r.baseCost) + lv * Math.log10(growth) + over * over * REPEATABLE_SOFTCAP_STEEPNESS);
}

export function repeatableState(state, r) {
  if (!r.requires.every((id) => has(state, id))) return 'locked';
  return state.digits.gte(repeatableCost(r, level(state, r.id), state)) ? 'affordable' : 'expensive';
}

export function buyRepeatable(state, id) {
  const r = REPEATABLES.find((x) => x.id === id);
  if (!r || repeatableState(state, r) !== 'affordable') return false;
  state.digits = state.digits.sub(repeatableCost(r, level(state, id), state)).max(ZERO);
  state.levels[id] = level(state, id) + 1;
  return true;
}

// ================= 第 2 層：整数 =================

export function hasInt(state, id) {
  return !!state.integerUpgrades?.[id];
}

// 第 1 層の進行をリセットする（拡張時）。証明は「定理の記憶」があれば残る
export function resetLayer1(state) {
  state.digits = ZERO;
  state.digitsTotal = ZERO;
  state.lastGain = ZERO;
  state.upgrades = {};
  if (hasInt(state, 'startBasics')) for (const id of BASIC_UPGRADES) state.upgrades[id] = true;
  state.levels = {};
  if (!hasInt(state, 'keepProofs')) state.proofs = {};
  state.proof = null;
  newRun(state);
}

export function expandGain(state) {
  if (!canExpand(state)) return ZERO;
  const lg = Math.max(0, (state.digits.log10() - EXPAND_LOG10) / EXPAND_GAIN_DIVISOR)
    + EXPAND_NEG_EXPONENT * state.negEnergy.add(1).log10();
  let g = Big.fromLog10(lg).floor().max(EXPAND_MIN_GAIN);
  if (hasInt(state, 'expandBoost')) g = g.mul(EXPAND_BOOST_MULT);
  return g;
}

export function expand(state) {
  if (state.proof) return ZERO;
  const gain = expandGain(state);
  if (gain.isZero()) return ZERO;
  state.integers = state.integers.add(gain);
  state.integersTotal = state.integersTotal.add(gain);
  state.expansions += 1;
  resetLayer1(state);
  return gain;
}

export function layer2Visible(state) {
  return state.expansions > 0 || canExpand(state);
}

export function canReachLayer3(state) {
  return state.integers.gte(LAYER3_INTEGERS);
}

// ---------- 負の数の工場 ----------

export function factoryCost(i, bought) {
  const f = FACTORY[i];
  return Big.fromLog10(Math.log10(f.baseCost) + bought * Math.log10(f.growth));
}

export function factoryUnlocked(state, i) {
  return i === 0 || state.factory[i - 1].bought > 0 || state.factory[i].bought > 0;
}

export function buyFactory(state, i) {
  if (!factoryUnlocked(state, i)) return false;
  const f = state.factory[i];
  const cost = factoryCost(i, f.bought);
  if (state.integers.lt(cost)) return false;
  state.integers = state.integers.sub(cost).max(ZERO);
  f.count = f.count.add(1);
  f.bought += 1;
  return true;
}

export function factoryMult(state) {
  return hasInt(state, 'factoryBoost') ? FACTORY_BOOST_MULT : 1;
}

// 工場の段 i が毎秒生み出す量（段 0 は負のエネルギー、それ以外は段 i-1）
export function factoryProduction(state, i) {
  const rate = i === 0 ? FACTORY_ENERGY_RATE : FACTORY_CHAIN_RATE;
  return state.factory[i].count.mul(rate * factoryMult(state));
}

function tickFactory(state, dt) {
  const prods = FACTORY.map((_, i) => factoryProduction(state, i));
  if (!prods[0].isZero()) state.negEnergy = state.negEnergy.add(prods[0].mul(dt));
  for (let i = 1; i < FACTORY.length; i++) {
    if (prods[i].isZero()) continue;
    state.factory[i - 1].count = state.factory[i - 1].count.add(prods[i].mul(dt));
  }
}

// 負のエネルギーによる倍率（log10）
export function negCountLog(state) {
  return NEG_COUNT_EXPONENT * state.negEnergy.add(1).log10();
}

export function negDigitLog(state) {
  return NEG_DIGIT_EXPONENT * state.negEnergy.add(1).log10();
}

// ---------- 整数の強化 ----------

export function integerUpgradeState(state, u) {
  if (hasInt(state, u.id)) return 'owned';
  return state.integers.gte(u.cost) ? 'affordable' : 'expensive';
}

export function buyIntegerUpgrade(state, id) {
  const u = INTEGER_UPGRADES.find((x) => x.id === id);
  if (!u || integerUpgradeState(state, u) !== 'affordable') return false;
  state.integers = state.integers.sub(u.cost).max(ZERO);
  state.integerUpgrades[id] = true;
  return true;
}

// 自動の公理：桁の強化と繰り返し強化を安い順に買う
export function autoBuyDigitUpgrades(state, maxBuys = 50) {
  if (!hasInt(state, 'autoDigitUpgrades') || !state.autoDigitUpgrades) return 0;
  let n = 0;
  while (n < maxBuys) {
    let best = null;
    for (const u of UPGRADES) {
      if (upgradeState(state, u) !== 'affordable') continue;
      const c = Big.from(u.cost);
      if (!best || c.lt(best.cost)) best = { cost: c, buy: () => buyUpgrade(state, u.id) };
    }
    for (const r of REPEATABLES) {
      if (repeatableState(state, r) !== 'affordable') continue;
      const c = repeatableCost(r, level(state, r.id), state);
      if (!best || c.lt(best.cost)) best = { cost: c, buy: () => buyRepeatable(state, r.id) };
    }
    if (!best) break;
    best.buy();
    n++;
  }
  return n;
}
