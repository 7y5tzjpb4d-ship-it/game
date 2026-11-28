// 数値処理とゲームロジックの簡単なテスト。使い方: node tools/test.js
import assert from 'node:assert/strict';
import { Big, format } from '../src/big.js';
import {
  newGame, serialize, deserialize, tierCost, bulkCost, maxAffordable, buyTier, buyToMilestone, tick,
  canCarry, carry, digitsOnCarry, buyUpgrade, divisorCount, isPrime, milestonesPassed, nextMilestone,
  buyBest, buyToPrime, primeAtMost, perfectPassed, tierMult,
} from '../src/logic.js';

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

console.log(`\n${passed} 件成功`);
