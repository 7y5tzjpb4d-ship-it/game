// 巨大な数を「仮数 × 10^指数」で表すクラス。
// 仮数 m は 1 <= |m| < 10（0 のときは m = 0, e = 0）。
// 指数 e も JS の number なので、およそ 10^(10^308) まで扱える。
export class Big {
  constructor(m = 0, e = 0) {
    this.m = m;
    this.e = e;
    this.normalize();
  }

  static from(x) {
    if (x instanceof Big) return x;
    if (typeof x === 'number') return new Big(x, 0);
    if (typeof x === 'string') {
      const [mant, exp] = x.toLowerCase().split('e');
      return new Big(Number(mant), exp === undefined ? 0 : Number(exp));
    }
    if (x && typeof x === 'object' && 'm' in x && 'e' in x) return new Big(x.m, x.e);
    return new Big(0, 0);
  }

  static fromLog10(l) {
    if (l === -Infinity) return new Big(0, 0);
    const e = Math.floor(l);
    return new Big(10 ** (l - e), e);
  }

  normalize() {
    if (!Number.isFinite(this.m) || !Number.isFinite(this.e)) {
      // 壊れた値は 0 に倒す（セーブ破損などへの保険）
      if (Number.isNaN(this.m) || Number.isNaN(this.e)) {
        this.m = 0;
        this.e = 0;
        return this;
      }
    }
    if (this.m === 0) {
      this.e = 0;
      return this;
    }
    if (!Number.isInteger(this.e)) {
      const frac = this.e - Math.floor(this.e);
      this.m *= 10 ** frac;
      this.e = Math.floor(this.e);
    }
    const k = Math.floor(Math.log10(Math.abs(this.m)));
    if (k !== 0) {
      this.m /= 10 ** k;
      this.e += k;
    }
    // 浮動小数点の誤差で 10 ちょうどになった場合の補正
    if (Math.abs(this.m) >= 10) {
      this.m /= 10;
      this.e += 1;
    }
    return this;
  }

  isZero() {
    return this.m === 0;
  }

  sign() {
    return Math.sign(this.m);
  }

  add(other) {
    const b = Big.from(other);
    if (this.m === 0) return b;
    if (b.m === 0) return this;
    const [big, small] = this.e >= b.e ? [this, b] : [b, this];
    const diff = big.e - small.e;
    if (diff > 17) return big;
    return new Big(big.m + small.m * 10 ** -diff, big.e);
  }

  sub(other) {
    const b = Big.from(other);
    return this.add(new Big(-b.m, b.e));
  }

  mul(other) {
    const b = Big.from(other);
    return new Big(this.m * b.m, this.e + b.e);
  }

  div(other) {
    const b = Big.from(other);
    if (b.m === 0) return new Big(0, 0);
    return new Big(this.m / b.m, this.e - b.e);
  }

  log10() {
    if (this.m <= 0) return -Infinity;
    return this.e + Math.log10(this.m);
  }

  pow(n) {
    if (this.m === 0) return n === 0 ? new Big(1, 0) : new Big(0, 0);
    return Big.fromLog10(this.log10() * n);
  }

  cmp(other) {
    const b = Big.from(other);
    const sa = Math.sign(this.m);
    const sb = Math.sign(b.m);
    if (sa !== sb) return sa > sb ? 1 : -1;
    if (sa === 0) return 0;
    if (this.e !== b.e) return (this.e > b.e ? 1 : -1) * sa;
    if (this.m === b.m) return 0;
    return this.m > b.m ? 1 : -1;
  }

  gte(o) { return this.cmp(o) >= 0; }
  gt(o) { return this.cmp(o) > 0; }
  lte(o) { return this.cmp(o) <= 0; }
  lt(o) { return this.cmp(o) < 0; }

  max(o) {
    const b = Big.from(o);
    return this.gte(b) ? this : b;
  }

  floor() {
    if (this.e >= 16) return this;
    return new Big(Math.floor(this.toNumber()), 0);
  }

  toNumber() {
    if (this.e > 308) return this.m > 0 ? Infinity : -Infinity;
    if (this.e < -324) return 0;
    return this.m * 10 ** this.e;
  }

  toJSON() {
    return { m: this.m, e: this.e };
  }
}

export const ZERO = new Big(0, 0);
export const ONE = new Big(1, 0);

// 表示用。小さい数はそのまま、100 万以上は指数表記
export function format(x, decimals = 0) {
  const b = Big.from(x);
  if (b.m === 0) return '0';
  if (b.m < 0) return `-${format(new Big(-b.m, b.e), decimals)}`;
  if (b.e < 6) {
    const n = b.toNumber();
    const d = n < 1000 ? decimals : 0;
    return n.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  let m = Math.floor(b.m * 100) / 100;
  if (b.e >= 1e6) {
    // 指数そのものが大きいときは指数も指数表記にする
    return `${m.toFixed(2)}e${format(b.e)}`;
  }
  return `${m.toFixed(2)}e${b.e.toLocaleString('ja-JP')}`;
}
