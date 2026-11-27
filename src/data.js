// ゲームの数値設計。バランス調整は基本的にこのファイルだけで行う。

// アイコンの \uFE0E は、スマホで絵文字にならず文字として表示させるための指定
// 第 1 章：細胞。上の段が 1 つ下の段を毎秒生産する（1 段目はエネルギーを生産）
export const TIERS = [
  { id: 'molecule', name: '分子', icon: '⚛\uFE0E', baseCost: 10, growth: 1.15 },
  { id: 'cell', name: '細胞', icon: '◉\uFE0E', baseCost: 100, growth: 1.2 },
  { id: 'tissue', name: '組織', icon: '▦\uFE0E', baseCost: 2e3, growth: 1.25 },
  { id: 'organ', name: '器官', icon: '♥\uFE0E', baseCost: 1e5, growth: 1.3 },
  { id: 'organism', name: '個体', icon: '✦\uFE0E', baseCost: 1e7, growth: 1.35 },
  { id: 'colony', name: '群れ', icon: '❖\uFE0E', baseCost: 3e9, growth: 1.4 },
  { id: 'ecosystem', name: '生態系', icon: '✺\uFE0E', baseCost: 1e12, growth: 1.45 },
];

// 1 個あたりの基本生産量（毎秒）。1 段目はエネルギー、2 段目以降は 1 つ下の段を生む
export const ENERGY_RATE = 1;
export const CHAIN_RATE = 0.1;

// 「適応」ボーナス：同じ段を一定数買うたびに、その段の生産が倍増する
// 25 個、50 個、以降 100 個ごと
export const ADAPT_FACTOR = 3;
export const ADAPT_FACTOR_UPGRADED = 4;
export function adaptCount(bought) {
  return (bought >= 25 ? 1 : 0) + (bought >= 50 ? 1 : 0) + Math.floor(bought / 100);
}
export function nextAdaptAt(bought) {
  if (bought < 25) return 25;
  if (bought < 50) return 50;
  return (Math.floor(bought / 100) + 1) * 100;
}

// 進化（1 段目のリセット）
export const START_ENERGY = 10;
export const EVOLVE_LOG10 = 15; // エネルギー 1e15 で進化できる
export const GENE_EXPONENT_DIVISOR = 3; // 1e15 → 1, 1e18 → 10, 1e21 → 100
export const GENE_BONUS_EXPONENT = 0.5; // 全生産 ×(1 + 累計遺伝子)^0.5

// 遺伝子で買う永続強化（突然変異の系統樹）
export const UPGRADES = [
  {
    id: 'mitosis', name: '高速分裂', cost: 1, requires: [],
    desc: '分子のエネルギー生産 ×5',
  },
  {
    id: 'memory', name: '細胞記憶', cost: 1, requires: [],
    desc: '進化後、エネルギー 1,000 から始まる',
  },
  {
    id: 'symbiosis', name: '共生', cost: 3, requires: ['mitosis'],
    desc: 'すべての段の生産 ×2',
  },
  {
    id: 'reflex', name: '反射', cost: 3, requires: ['memory'],
    desc: '分子・細胞・組織を自動で購入する',
  },
  {
    id: 'adaptation', name: '適応力', cost: 8, requires: ['symbiosis'],
    desc: '適応ボーナスが ×3 から ×4 になる',
  },
  {
    id: 'instinct', name: '本能', cost: 10, requires: ['reflex'],
    desc: '器官・個体・群れ・生態系も自動で購入する',
  },
  {
    id: 'diversity', name: '多様性', cost: 30, requires: ['adaptation'],
    desc: '1 個以上持っている段の数 1 つにつき、全生産 ×1.3',
  },
  {
    id: 'drift', name: '遺伝的浮動', cost: 60, requires: ['adaptation', 'instinct'],
    desc: '進化で得られる遺伝子 ×2',
  },
];

export const MEMORY_START_ENERGY = 1e3;
export const MITOSIS_MULT = 5;
export const SYMBIOSIS_MULT = 2;
export const DIVERSITY_MULT = 1.3;
export const DRIFT_MULT = 2;

// オフライン進行の上限（秒）
export const OFFLINE_CAP_SEC = 24 * 60 * 60;
