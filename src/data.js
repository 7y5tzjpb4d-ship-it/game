// ゲームの数値設計。バランス調整は基本的にこのファイルだけで行う。
// 第 1 層：自然数

// 数える道具。上の段が 1 つ下の段を毎秒生産する（1 段目は「数」を生む）
// アイコンはローマ数字（環境によって絵文字にならない文字を使う）
export const TIERS = [
  { id: 'finger', name: '指', icon: 'Ⅰ', baseCost: 10, growth: 1.15 },
  { id: 'tally', name: '刻み目', icon: 'Ⅱ', baseCost: 100, growth: 1.2 },
  { id: 'pebble', name: '小石', icon: 'Ⅲ', baseCost: 2e3, growth: 1.25 },
  { id: 'cord', name: '結び縄', icon: 'Ⅳ', baseCost: 1e5, growth: 1.3 },
  { id: 'tablet', name: '粘土板', icon: 'Ⅴ', baseCost: 1e7, growth: 1.35 },
  { id: 'rods', name: '算木', icon: 'Ⅵ', baseCost: 3e9, growth: 1.4 },
  { id: 'abacus', name: 'そろばん', icon: 'Ⅶ', baseCost: 1e12, growth: 1.45 },
];

// 1 個あたりの基本生産量（毎秒）。1 段目は「数」、2 段目以降は 1 つ下の段を生む
export const COUNT_RATE = 1;
export const CHAIN_RATE = 0.1;

// 節目：購入数が高度合成数（それより小さいどの数よりも約数が多い数）に届くたびに ×2
// 小さすぎる 1〜6 は除き、12 から使う
export const HCN = [
  12, 24, 36, 48, 60, 120, 180, 240, 360, 720, 840, 1260, 1680, 2520, 5040, 7560,
  10080, 15120, 20160, 25200, 27720, 45360, 50400, 55440, 83160, 110880, 166320,
  221760, 277200, 332640, 498960, 554400, 665280, 720720,
];
export const MILESTONE_FACTOR = 2;
export const MILESTONE_FACTOR_UPGRADED = 3;

// 繰り上がり（第 1 層のリセット）
export const START_COUNT = 10;
export const CARRY_LOG10 = 15; // 数 1e15 で繰り上がりできる
// 得られる桁 = floor((1 + (L - 15) / STEP)^POWER)。L はこの周で数えた合計の log10
// 例（STEP 3, POWER 1.5）：1e15 → 1, 1e18 → 2, 1e21 → 5, 1e27 → 11, 1e33 → 19
export const DIGIT_STEP = 3;
export const DIGIT_POWER = 1.5;
export const DIGIT_BONUS_EXPONENT = 0.5; // 数の生産 ×(1 + 累計の桁)^0.5

// 桁で買う永続強化
export const UPGRADES = [
  {
    id: 'tenFingers', name: '十本の指', cost: 2, requires: [],
    desc: '指の生産 ×5',
  },
  {
    id: 'memory', name: '暗記', cost: 3, requires: [],
    desc: '繰り上がり後、数 1,000 から始まる',
  },
  {
    id: 'divisor', name: '約数の力', cost: 5, requires: ['tenFingers'],
    desc: '各段の生産 ×(購入数の約数の個数)^0.25。約数の多い数で買い止めると強い',
  },
  {
    id: 'autoCount', name: '自動計数', cost: 8, requires: ['memory'],
    desc: '指・刻み目・小石を自動で購入する',
  },
  {
    id: 'decimal', name: '十進法', cost: 12, requires: ['divisor'],
    desc: '数の桁数 1 つにつき、数の生産 ×1.05',
  },
  {
    id: 'prime', name: '素数の輝き', cost: 15, requires: ['divisor'],
    desc: '購入数が素数の段は生産 ×2。約数の力とは相反する',
  },
  {
    id: 'autoCount2', name: '自動計数Ⅱ', cost: 25, requires: ['autoCount'],
    desc: '結び縄から上の段も自動で購入する',
  },
  {
    id: 'hcn', name: '高度合成数', cost: 35, requires: ['decimal'],
    desc: '節目のボーナスが ×2 から ×3 になる',
  },
  {
    id: 'perfect', name: '完全数', cost: 50, requires: ['prime'],
    desc: '購入数が完全数（6, 28, 496, 8128）の段は生産 ×6',
  },
  {
    id: 'sexagesimal', name: '六十進法', cost: 80, requires: ['hcn', 'autoCount2'],
    desc: '繰り上がりで得られる桁 ×2',
  },
];

export const MEMORY_START_COUNT = 1e3;
export const TEN_FINGERS_MULT = 5;
export const DECIMAL_MULT_PER_DIGIT = 1.05;
export const DIVISOR_EXPONENT = 0.25;
export const PRIME_MULT = 2;
export const PERFECT_NUMBERS = [6, 28, 496, 8128, 33550336];
export const PERFECT_MULT = 6;
export const SEXAGESIMAL_MULT = 2;

// 繰り上がり回数の節目
export const CARRY_MILESTONES = [
  { at: 1, id: 'upgrades', name: '零の発見', desc: '桁で強化を買えるようになる' },
  { at: 2, id: 'startFingers', name: '手を開いて', desc: '繰り上がり後、指を 10 本持って始まる' },
  { at: 3, id: 'boost', name: '位取り', desc: '数の生産 ×2' },
  { at: 5, id: 'autoCarry', name: '自動繰り上がり', desc: '桁の獲得効率が落ち始めたら、自動で繰り上がる（ON/OFF 可）' },
  { at: 10, id: 'negative', name: '負の数の気配', desc: '第 2 層「整数」への入口（準備中）' },
];
export const START_FINGERS = 10;
export const PLACE_VALUE_MULT = 2;

// オフライン進行の上限（秒）
export const OFFLINE_CAP_SEC = 24 * 60 * 60;
