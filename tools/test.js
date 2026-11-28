// 数値処理とゲームロジックの簡単なテスト。使い方: node tools/test.js
import assert from 'node:assert/strict';
import { Big, format } from '../src/big.js';
import {
  newGame, serialize, deserialize, tierCost, bulkCost, maxAffordable, buyTier, buyToMilestone, tick,
  canCarry, carry, digitsOnCarry, buyUpgrade, divisorCount, isPrime, milestonesPassed, nextMilestone,
  buyBest, buyToPrime, primeAtMost, perfectPassed, tierMult,
  buyRepeatable, level, repeatableCost, canExpand, digitsLog, nextDigitAt,
  startProof, abandonProof, completeProof, proofGoalReached, proven, proofUnlocked, tierProduction,
  isTierUnlocked, upgradeState, provenCount,
  expand, expandGain, buyFactory, factoryCost, buyIntegerUpgrade, negCountLog, countPerSec,
} from '../src/logic.js';
import { REPEATABLES, PROOFS, UPGRADES } from '../src/data.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`ok  ${name}`); };
const close = (a, b, rel = 1e-9) => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-12, `${a} != ${b}`);

test('Big の四則演算', () => {
  close(new Big(3).add(4).toNumber(), 7);
  close(new Big(3).sub(4).toNumber(), -1);
  close(new Big(3).mul(4).toNumber(), 12);
  close(new Big(3).div(4).toNumber(), 0.75);
  close(Big.from('1e400').mul('1e400').log10(), 800);
  close(Big.from('1e400').add('1e400').log10(), 400 + Math.log10(2));
  assert.equal(Big.from('1e400').add(1).cmp('1e400'), 0);
  close(new Big(2).pow(10).toNumber(), 1024);
});

test('Big の比較', () => {
  assert.ok(Big.from('1e10').gt('9e9'));
  assert.ok(Big.from(-5).lt(1));
  assert.ok(Big.from(0).lt('1e-5'));
  assert.ok(Big.from('-1e10').lt('-1e9'));
});

test('format', () => {
  assert.equal(format(0), '0');
  assert.equal(format(1234), '1,234');
  assert.equal(format(1.5, 1), '1.5');
  assert.equal(format(1234567), '1.23e6');
  assert.equal(format(Big.from('5e1234567')), '5.00e1.23e6');
});

test('約数の個数と素数', () => {
  assert.deepEqual([1, 2, 6, 12, 13, 60, 360, 720720].map(divisorCount), [1, 2, 4, 6, 2, 12, 24, 240]);
  assert.deepEqual([1, 2, 3, 4, 97, 91].map(isPrime), [false, true, true, false, true, false]);
});

test('節目（高度合成数）', () => {
  assert.equal(milestonesPassed(11), 0);
  assert.equal(milestonesPassed(12), 1);
  assert.equal(milestonesPassed(60), 5);
  assert.equal(nextMilestone(60), 120);
});

test('maxAffordable は買える最大数で、1 個多いと買えない', () => {
  for (const e of [10, 55, 1e4, 1e9, 1e30, 1e300]) {
    const s = newGame();
    s.count = Big.from(e);
    const { n, cost } = maxAffordable(s, 0);
    assert.ok(cost.lte(s.count), `e=${e}`);
    if (n < 200) {
      let sum = new Big(0);
      for (let k = 0; k < n; k++) sum = sum.add(tierCost(0, k));
      close(sum.log10(), cost.log10(), 1e-6);
      assert.ok(sum.add(tierCost(0, n)).gt(s.count));
    }
  }
});

test('購入と生産', () => {
  const s = newGame();
  assert.equal(buyTier(s, 0, 'one'), 1);
  assert.ok(s.count.isZero());
  tick(s, 1);
  close(s.count.toNumber(), 1);
  assert.equal(buyTier(s, 1, 'one'), 0, '刻み目はまだ買えない');
});

test('節目までまとめ買い', () => {
  const s = newGame();
  s.count = Big.from(1e6);
  assert.equal(buyToMilestone(s, 0), 12);
  assert.equal(s.tiers[0].bought, 12);
  close(s.count.toNumber(), 1e6 - bulkCost(0, 0, 12).toNumber(), 1e-9);
});

test('繰り上がりと強化', () => {
  const s = newGame();
  s.runTotal = Big.from('1e21');
  assert.ok(canCarry(s));
  assert.equal(digitsOnCarry(s).toNumber(), 5);
  carry(s);
  assert.equal(s.digits.toNumber(), 5);
  assert.equal(s.carries, 1);
  assert.equal(s.tiers[0].bought, 0);
  assert.ok(buyUpgrade(s, 'memory'));
  assert.ok(!buyUpgrade(s, 'memory'), '二重購入できない');
  assert.ok(!buyUpgrade(s, 'autoCount2'), '前提が足りない');
  assert.equal(s.digits.toNumber(), 2);
});

test('手を開いて：繰り上がり後に指 10 本で始まる', () => {
  const s = newGame();
  s.upgrades.openHands = true;
  s.runTotal = Big.from('1e15'); carry(s);
  assert.equal(s.tiers[0].bought, 10);
});

test('素数の小道具', () => {
  assert.equal(primeAtMost(100), 97);
  assert.equal(primeAtMost(1), 0);
  assert.deepEqual([0, 6, 27, 28, 500].map(perfectPassed), [0, 1, 1, 2, 3]);
});

test('自動購入の買い止め方', () => {
  const s = newGame();
  s.count = Big.from(1e6);
  const maxN = maxAffordable(s, 0).n;
  // 買える範囲でいちばん大きい高度合成数・素数で止まる
  assert.equal(buyBest(s, 0, 'milestone'), [60, 48, 36, 24, 12].find((h) => h <= maxN));
  const t = newGame();
  t.count = Big.from(1e6);
  assert.equal(buyBest(t, 0, 'prime'), primeAtMost(maxN));
  assert.ok(isPrime(t.tiers[0].bought));
  const u = newGame();
  u.count = Big.from(1e6);
  assert.equal(buyToPrime(u, 0), 2);
});

test('完全数は通過するたびに倍率', () => {
  const s = newGame();
  s.upgrades.perfect = true;
  s.tiers[2].bought = 30;
  s.tiers[2].count = Big.from(1);
  const withPerfect = tierMult(s, 2).toNumber();
  s.upgrades.perfect = false;
  close(withPerfect / tierMult(s, 2).toNumber(), 36);
});

test('セーブの往復', () => {
  const s = newGame();
  s.count = Big.from('1.5e123');
  s.tiers[2].bought = 7;
  s.upgrades.divisor = true;
  const t = deserialize(serialize(s));
  assert.equal(t.count.cmp(s.count), 0);
  assert.equal(t.tiers[2].bought, 7);
  assert.ok(t.upgrades.divisor);
});

test('繰り返し強化：買うたびに値段が上がり、効果が重なる', () => {
  const s = newGame();
  s.upgrades.placeValue = true;
  s.digits = Big.from(1000);
  const r = REPEATABLES.find((x) => x.id === 'digitDouble');
  assert.ok(buyRepeatable(s, 'digitDouble'));
  assert.ok(buyRepeatable(s, 'digitDouble'));
  assert.equal(level(s, 'digitDouble'), 2);
  close(s.digits.toNumber(), 1000 - r.baseCost - r.baseCost * r.growth);
  assert.ok(repeatableCost(r, 2).gt(repeatableCost(r, 1)));
  s.runTotal = Big.from('1e15');
  close(10 ** digitsLog(s), 4); // 1 × 2 × 2
  assert.ok(!buyRepeatable(s, 'countTriple'), '前提（約数の力）がない');
});

test('拡張は所持している桁で判定する', () => {
  const s = newGame();
  s.digitsTotal = Big.from('1e400');
  s.digits = Big.from('1e300');
  assert.ok(!canExpand(s));
  s.digits = Big.from('1.8e308');
  assert.ok(canExpand(s));
});

test('記数法の強化で桁が巨大になっても計算できる', () => {
  const s = newGame();
  Object.assign(s.upgrades, { sexagesimal: true, exponent: true, scientific: true, arrow: true });
  s.runTotal = Big.from('1e3000');
  const g = digitsOnCarry(s);
  assert.ok(g.log10() > 300 && Number.isFinite(g.log10()));
  assert.equal(nextDigitAt(s), null, '獲得量が大きいときは「次の +1」を出さない');
  const t = newGame();
  t.runTotal = Big.from('1e15');
  assert.ok(nextDigitAt(t).gt('1e15'));
});

test('セーブの往復（繰り返し強化）', () => {
  const s = newGame();
  s.levels.countTriple = 7;
  const t = deserialize(serialize(s));
  assert.equal(level(t, 'countTriple'), 7);
  assert.equal(t.bestRate, -Infinity);
});

test('自動繰り上がり：時間・倍率・効率（安全装置つき）', () => {
  const make = (mode) => {
    const s = newGame();
    s.upgrades.autoCarry = true;
    s.autoCarryMode = mode;
    s.runTotal = Big.from('1e20');
    return s;
  };
  // 時間：60 秒たつまでは繰り上がらない
  const a = make('time');
  a.runTime = 30;
  assert.equal(tick(a, 0.01), 0);
  a.runTime = 61;
  assert.equal(tick(a, 0.01), 1);
  // 倍率：得られる桁（1e20 で約 3）≥ 所持 × 10 なら繰り上がる
  const b = make('amount');
  b.digits = Big.from(1);
  assert.equal(tick(b, 0.01), 0);
  b.autoCarryAmount = 2;
  assert.equal(tick(b, 0.01), 1);
  // 効率：効率が上がり続けていても、安全装置の時間で繰り上がる
  const c = make('rate');
  c.runTime = 10;
  assert.equal(tick(c, 0.01), 0, '最初の判定では繰り上がらない');
  c.bestRate = -Infinity;
  c.runTime = 10 + 60;
  assert.equal(tick(c, 0.01), 1);
});

test('素数モードの自動購入は 0 個からでも始められる', () => {
  const s = newGame();
  s.count = Big.from(10);
  assert.equal(buyBest(s, 0, 'prime'), 1);
});

test('証明：対数を取ると 1 つ目から順に挑戦できる', () => {
  const s = newGame();
  assert.ok(!startProof(s, 'primeTheorem'), '対数がないと挑戦できない');
  s.upgrades.logarithm = true;
  assert.ok(proofUnlocked(s, PROOFS[0].id));
  assert.ok(!proofUnlocked(s, PROOFS[1].id), '2 つ目は 1 つ目を完成させるまで開かない');
  s.count = Big.from('1e50');
  assert.ok(startProof(s, PROOFS[0].id));
  assert.ok(s.count.lt('1e10'), '開始すると周がリセットされる');
  assert.ok(!startProof(s, PROOFS[0].id), '証明中は別の証明を始められない');
  assert.equal(carry(s).toNumber(), 0, '証明中は繰り上がれない');
  assert.ok(abandonProof(s));
  assert.equal(s.proof, null);
});

test('証明：目標に届くと完成し、定理と桁がもらえる', () => {
  const s = newGame();
  s.upgrades.logarithm = true;
  const p = PROOFS[0];
  startProof(s, p.id);
  s.runTotal = Big.fromLog10(p.goal);
  assert.ok(proofGoalReached(s));
  const before = s.digits;
  assert.ok(completeProof(s));
  assert.ok(proven(s, p.id));
  assert.ok(s.digits.gt(before), '通常の繰り上がりと同じだけ桁がもらえる');
  assert.ok(proofUnlocked(s, PROOFS[1].id));
  assert.equal(provenCount(s), 1);
});

test('証明の制約が効く', () => {
  const s = newGame();
  s.upgrades.logarithm = true;
  s.tiers[0] = { count: Big.from(10), bought: 4 };
  assert.ok(tierProduction(s, 0).gt(0));
  s.proof = 'primeTheorem';
  assert.ok(tierProduction(s, 0).isZero(), '購入数 4 は素数でないので止まる');
  s.tiers[0].bought = 5;
  assert.ok(tierProduction(s, 0).gt(0));
  s.proof = 'fewTools';
  s.tiers[3].bought = 1;
  assert.ok(!isTierUnlocked(s, 4), '少ない道具では 5 段目以降を使えない');
});

test('証明の数で開く強化', () => {
  const s = newGame();
  Object.assign(s.upgrades, { logarithm: true });
  s.digits = Big.from('1e70');
  const rec = UPGRADES.find((u) => u.id === 'recurrence');
  assert.equal(upgradeState(s, rec), 'locked');
  for (const p of PROOFS.slice(0, rec.proofs)) s.proofs[p.id] = true;
  assert.equal(upgradeState(s, rec), 'affordable');
});

test('拡張：第 1 層がリセットされ、整数がもらえる（証明は残る）', () => {
  const s = newGame();
  s.digits = Big.from('1e300');
  assert.ok(expandGain(s).isZero(), '1.8e308 未満では拡張できない');
  s.digits = Big.from('2e308');
  s.digitsTotal = Big.from('1e400');
  s.upgrades.logarithm = true;
  s.levels.countTriple = 50;
  s.proofs.primeTheorem = true;
  const g = expand(s);
  assert.equal(g.toNumber(), 1);
  assert.equal(s.integers.toNumber(), 1);
  assert.equal(s.expansions, 1);
  assert.ok(s.digits.isZero() && s.digitsTotal.isZero());
  assert.deepEqual(s.upgrades, {});
  assert.equal(level(s, 'countTriple'), 0);
  assert.ok(proven(s, 'primeTheorem'), '証明は残る');
});

test('拡張中の証明は先に終える必要がある', () => {
  const s = newGame();
  s.digits = Big.from('2e308');
  s.proof = 'primeTheorem';
  assert.ok(expand(s).isZero());
});

test('基礎の継承：拡張後に基本の強化を持って始まる', () => {
  const s = newGame();
  s.integers = Big.from(5);
  assert.ok(buyIntegerUpgrade(s, 'startBasics'));
  s.digits = Big.from('2e308');
  expand(s);
  assert.ok(s.upgrades.tenFingers && s.upgrades.sexagesimal);
  assert.ok(!s.upgrades.exponent, '記数法の進化は含まない');
});

test('負の数の工場：エネルギーが貯まり、数の生産が上がる', () => {
  const s = newGame();
  s.integers = Big.from(100);
  assert.ok(buyFactory(s, 0));
  assert.ok(!buyFactory(s, 2), '前の段がないと買えない');
  assert.ok(factoryCost(0, 1).gt(factoryCost(0, 0)));
  s.tiers[0] = { count: Big.from(1), bought: 1 };
  const before = countPerSec(s).toNumber();
  for (let k = 0; k < 100; k++) tick(s, 0.1);
  assert.ok(s.negEnergy.gt(9));
  assert.ok(negCountLog(s) > 0);
  assert.ok(countPerSec(s).toNumber() > before * 10);
});

test('自動拡張', () => {
  const s = newGame();
  s.integerUpgrades.autoExpand = true;
  s.digits = Big.from('2e308');
  for (let k = 0; k < 5; k++) tick(s, 0.1);
  assert.equal(s.expansions, 1);
});

test('セーブの往復（第 2 層）', () => {
  const s = newGame();
  s.integers = Big.from('1.5e12');
  s.expansions = 4;
  s.factory[1] = { count: Big.from(30), bought: 7 };
  s.negEnergy = Big.from('3e40');
  s.integerUpgrades.factoryBoost = true;
  const t = deserialize(serialize(s));
  assert.equal(t.integers.cmp(s.integers), 0);
  assert.equal(t.expansions, 4);
  assert.equal(t.factory[1].bought, 7);
  assert.equal(t.negEnergy.cmp(s.negEnergy), 0);
  assert.ok(t.integerUpgrades.factoryBoost);
});

console.log(`\n${passed} 件成功`);
