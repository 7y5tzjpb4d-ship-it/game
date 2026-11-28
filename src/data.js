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
    desc: '各段の生産 ×(購入数の約数の個数)^0.25。高度合成数で買い止めると強い',
  },
  {
    id: 'openHands', name: '手を開いて', cost: 6, requires: ['memory'],
    desc: '繰り上がり後、指を 10 本持って始まる',
  },
  {
    id: 'autoCount', name: '自動計数', cost: 8, requires: ['memory'],
    desc: '指・刻み目・小石を自動で購入する。買い止め方（最大・節目・素数）を選べる',
  },
  {
    id: 'placeValue', name: '位取り', cost: 10, requires: ['divisor'],
    desc: '数の生産 ×2',
  },
  {
    id: 'decimal', name: '十進法', cost: 12, requires: ['placeValue'],
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
    desc: '購入数が完全数（6, 28, 496, 8128）を通過するたびに、その段の生産 ×6',
  },
  {
    id: 'autoCarry', name: '自動繰り上がり', cost: 60, requires: ['autoCount2'],
    desc: '桁の獲得効率が落ち始めたら、自動で繰り上がる（ON/OFF 可）',
  },
  {
    id: 'sexagesimal', name: '六十進法', cost: 80, requires: ['hcn', 'autoCount2'],
    desc: '繰り上がりで得られる桁 ×2',
  },
  // ここから「記数法の進化」：桁の式そのものを強くしていく
  {
    id: 'exponent', name: '指数表記', cost: 1e3, requires: ['sexagesimal'],
    desc: '得られる桁 ×10^((L − 15) / 12)。L はこの周で数えた合計の log10。数えるほど桁が指数的に増える',
  },
  {
    id: 'weight', name: '桁の重み', cost: 1e6, requires: ['exponent'],
    desc: '累計の桁による数の生産ボーナスが ^0.5 から ^1 になる',
  },
  {
    id: 'scientific', name: '科学的記数法', cost: 1e15, requires: ['weight'],
    desc: '指数表記の式の「÷12」が「÷9」になる',
  },
  {
    id: 'power', name: '累乗', cost: 1e25, requires: ['scientific'],
    desc: '累計の桁による数の生産ボーナスが ^2 になる',
  },
  {
    id: 'logarithm', name: '対数', cost: 1e40, requires: ['power'],
    desc: '累計の桁による数の生産ボーナスが ^3 になる',
  },
  // ここから証明の数で開く（proofs: 必要な証明の数）
  {
    id: 'recurrence', name: '漸化式', cost: 1e60, requires: ['logarithm'], proofs: 3,
    desc: '繰り返し強化「倍の桁」の効果が ×2 から ×3 になる',
  },
  {
    id: 'googol', name: 'グーゴル', cost: 1e100, requires: ['recurrence'], proofs: 6,
    desc: '完成した証明 1 つにつき、得られる桁 ×1e5。繰り返し強化の値段が急に上がり始めるレベルが 80 から 160 になる',
  },
  {
    id: 'arrow', name: '矢印表記', cost: 1e200, requires: ['googol'], proofs: 6,
    desc: '得られる桁の指数部分 ×1.1（10^x 桁なら 10^(1.1x) 桁に）',
  },
];

// 証明：対数を取ると挑戦できる、制約付きの周。
// 開始すると今の周がリセットされ、この周で数えた合計が 10^goal に届くと完成。
// 並びは難しさの目安順（シミュレーションで調整）
// 完成すると定理（永続効果）が手に入り、通常の繰り上がりと同じだけ桁も得る
export const PROOFS = [
  {
    id: 'primeTheorem', name: '素数定理', goal: 150,
    rule: '購入数が素数でない段は生産しない',
    reward: '素数の輝きが ×2 から ×5 になる',
  },
  {
    id: 'perfectQuest', name: '完全数の探求', goal: 178,
    rule: '数の生産が ^0.75 になる',
    reward: '完全数の倍率が ×6 から ×28 になる',
  },
  {
    id: 'forgetDigits', name: '桁を忘れて', goal: 135,
    rule: '累計の桁による数の生産ボーナスがない',
    reward: '累計の桁による数の生産ボーナスの指数 +0.5',
  },
  {
    id: 'naive', name: '素朴な計算', goal: 280,
    rule: '繰り返し強化（三倍の数・倍の桁）の効果がない',
    reward: '繰り返し強化の値段の上がり方がゆるやかになる（×3 → ×2.8、×4 → ×3.6）',
  },
  {
    id: 'divisorStudy', name: '約数の研究', goal: 360,
    rule: '節目（高度合成数）のボーナスがない',
    reward: '約数の力が ^0.25 から ^0.4 になる',
  },
  {
    id: 'fewTools', name: '少ない道具', goal: 500,
    rule: '使える道具は指から結び縄までの 4 段だけ',
    reward: '粘土板・算木・そろばんの生産 ×1000',
  },
];
export const PRIME_MULT_PROVEN = 5;
export const DIVISOR_EXPONENT_PROVEN = 0.4;
export const FEW_TOOLS_REWARD_MULT = 1000;
export const NAIVE_GROWTH = { countTriple: 2.8, digitDouble: 3.6 };
export const PERFECT_MULT_PROVEN = 28;
export const PERFECT_QUEST_POWER = 0.75;
export const FORGET_DIGITS_BONUS = 0.5;
export const RECURRENCE_MULT = 3;
export const GOOGOL_LOG_PER_PROOF = 5;
export const FEW_TOOLS_LIMIT = 4;

// 何度でも買える強化。値段は baseCost × growth^(レベル)
export const REPEATABLES = [
  {
    id: 'countTriple', name: '三倍の数', requires: ['divisor'], baseCost: 10, growth: 3,
    desc: '数の生産 ×3',
  },
  {
    id: 'digitDouble', name: '倍の桁', requires: ['placeValue'], baseCost: 20, growth: 4,
    desc: '繰り上がりで得られる桁 ×2',
  },
];

export const MEMORY_START_COUNT = 1e3;
export const START_FINGERS = 10;
export const TEN_FINGERS_MULT = 5;
export const PLACE_VALUE_MULT = 2;
export const DECIMAL_MULT_PER_DIGIT = 1.05;
export const DIVISOR_EXPONENT = 0.25;
export const PRIME_MULT = 2;
export const PERFECT_NUMBERS = [6, 28, 496, 8128, 33550336];
export const PERFECT_MULT = 6;
export const SEXAGESIMAL_MULT = 2;
export const EXPONENT_DIVISOR = 12;
export const SCIENTIFIC_DIVISOR = 9;
export const BONUS_EXPONENT_WEIGHT = 1;
export const BONUS_EXPONENT_POWER = 2;
export const BONUS_EXPONENT_LOG = 2.5;
export const ARROW_POWER = 1.1;
// 繰り返し強化は SOFTCAP_LEVEL を超えると値段の上がり方が急になる：
// 値段の log10 に (レベル − SOFTCAP_LEVEL)^2 × SOFTCAP_STEEPNESS を足す
export const REPEATABLE_SOFTCAP_LEVEL = 80;
export const REPEATABLE_SOFTCAP_LEVEL_GOOGOL = 160;
export const REPEATABLE_SOFTCAP_STEEPNESS = 0.02;
export const COUNT_TRIPLE_MULT = 3;
export const DIGIT_DOUBLE_MULT = 2;

// 第 2 層「整数」への拡張に必要な所持桁（強化に使うと減る）
export const EXPAND_DIGITS = '1.8e308';

// ================= 第 2 層：整数 =================

// 拡張：所持している桁が EXPAND_DIGITS に届くと実行でき、第 1 層の進行をリセットして「整数」を得る。
// 証明の完成状態は拡張でリセットされる（整数の強化「定理の記憶」で残せる）。
// 得られる整数 = max(EXPAND_MIN_GAIN, 10^((log10(所持桁) − EXPAND_LOG10) / EXPAND_GAIN_DIVISOR) × (1 + 負のエネルギー)^EXPAND_NEG_EXPONENT)（切り捨て）
export const EXPAND_LOG10 = Math.log10(1.8e308);
export const EXPAND_GAIN_DIVISOR = 40;
export const EXPAND_MIN_GAIN = 1; // 1 回の拡張で最低これだけもらえる
export const EXPAND_NEG_EXPONENT = 0.45;

// 基礎の継承で、拡張後に最初から持っている強化（記数法の進化より前の 13 種）
export const BASIC_UPGRADES = [
  'tenFingers', 'memory', 'divisor', 'openHands', 'autoCount', 'placeValue', 'decimal',
  'prime', 'autoCount2', 'hcn', 'perfect', 'autoCarry', 'sexagesimal',
];

// 負の数の工場：整数で買う生産ライン。上の段が 1 つ下の段を、−1 は「負のエネルギー」を生む。
// 拡張してもリセットされない
export const FACTORY = [
  { id: 'neg1', name: '−1', baseCost: 1, growth: 1.5 },
  { id: 'neg10', name: '−10', baseCost: 5, growth: 1.8 },
  { id: 'neg100', name: '−100', baseCost: 50, growth: 2.2 },
  { id: 'neg1000', name: '−1000', baseCost: 1000, growth: 2.6 },
];
export const FACTORY_ENERGY_RATE = 1;
export const FACTORY_CHAIN_RATE = 0.05;
// 負のエネルギー E の効果：数の生産 ×(1 + E)^NEG_COUNT_EXPONENT、得られる桁 ×(1 + E)^NEG_DIGIT_EXPONENT
export const NEG_COUNT_EXPONENT = 2;
export const NEG_DIGIT_EXPONENT = 4;

// 整数で買う強化（1 回ずつ）
export const INTEGER_UPGRADES = [
  { id: 'startBasics', name: '基礎の継承', cost: 2, desc: '拡張後、記数法の進化より前の強化 13 種を持って始まる' },
  { id: 'autoDigitUpgrades', name: '自動の公理', cost: 3, desc: '桁の強化と繰り返し強化を、自動で安い順に買う（ON/OFF 可）' },
  { id: 'factoryBoost', name: '負の増幅', cost: 10, desc: '負の数の工場の生産 ×3' },
  { id: 'keepProofs', name: '定理の記憶', cost: 100, desc: '拡張しても証明の完成状態が残る' },
  { id: 'autoExpand', name: '自動拡張', cost: 25, desc: '拡張できるようになったら自動で拡張する（ON/OFF 可）' },
  { id: 'expandBoost', name: '拡張の効率', cost: 1000, desc: '拡張で得られる整数 ×2' },
  { id: 'softcapShift', name: '限界の突破', cost: 1e4, desc: '繰り返し強化の値段が急に上がり始めるレベル +40' },
];
export const FACTORY_BOOST_MULT = 3;
export const EXPAND_BOOST_MULT = 2;
export const SOFTCAP_SHIFT = 40;

// 第 3 層「有理数」への入口（未実装）：所持している整数がこの値に届く
export const LAYER3_INTEGERS = 1e6;

// オフライン進行の上限（秒）
export const OFFLINE_CAP_SEC = 24 * 60 * 60;
