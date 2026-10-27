// All balancing values live here so the game can be tuned without touching systems code.

export const DESIGN = {
  width: 540, // logical design width (portrait 9:16 composition)
  height: 960,
  minHeight: 860, // the world is scaled so at least this much height is visible
  maxFieldWidth: 620, // eggs never spawn outside this centred column on wide screens
  groundOffset: 128, // distance from the bottom edge to the bunny's feet
};

export const PLAYER = {
  scale: 0.86, // bunny sprite scale (art is painted at 1.0)
  dragMaxSpeed: 1700, // px/s while following a finger
  dragSmoothing: 0.055, // seconds; lower = snappier
  buttonMaxSpeed: 640, // px/s when holding an arrow button / key
  buttonAccel: 4200,
  buttonDecel: 6000,
  basketScale: 0.92, // basket size relative to the bunny art
  catchHalfWidth: 60, // half-width of the basket opening in painted units (scaled by PLAYER.scale)
  rimOffsetY: -70, // basket rim position above the feet in painted units
};

export const SCORE = {
  standard: 10,
  rare: 25,
  golden: 100,
  rainbow: 50,
  star: 30,
  giant: 40,
  mystery: 20,
  basketBonus: 50, // endless/timed: bonus when the basket fills up
  levelClearBonus: 100, // per level number
  perfectBonus: 250, // no lives lost during a level
};

export const COMBO = {
  catchesPerStep: 5, // every 5 consecutive catches the multiplier goes up by one
  maxMultiplier: 5,
  graceMs: 650, // after a miss, a catch within this window saves the combo
};

export const LIVES = { start: 5, max: 5 };

export const POWERUPS = {
  rainbowMultiplier: { factor: 2, duration: 8 },
  slowTime: { factor: 0.5, duration: 6 },
  magnet: { duration: 7, pull: 520, range: 230 },
  wideBasket: { factor: 1.45, duration: 8 },
};

// Egg catalogue. `kind`: standard | rare | special | hazard.
export const EGG_TYPES = {
  blueDots: { kind: 'standard', name: 'Polka Sky', points: SCORE.standard },
  pinkStripes: { kind: 'standard', name: 'Candy Stripe', points: SCORE.standard },
  yellowFlowers: { kind: 'standard', name: 'Buttercup', points: SCORE.standard },
  mintZigzag: { kind: 'standard', name: 'Mint Zigzag', points: SCORE.standard },
  lavenderHearts: { kind: 'standard', name: 'Lavender Love', points: SCORE.standard },
  pastelBands: { kind: 'rare', name: 'Pastel Rainbow', points: SCORE.rare },
  golden: { kind: 'special', name: 'Golden Egg', points: SCORE.golden },
  rainbow: { kind: 'special', name: 'Prism Egg', points: SCORE.rainbow },
  star: { kind: 'special', name: 'Star Egg', points: SCORE.star },
  giant: { kind: 'special', name: 'Giant Egg', points: SCORE.giant, scale: 1.45, fallFactor: 0.72 },
  mystery: { kind: 'special', name: 'Mystery Egg', points: SCORE.mystery },
  mud: { kind: 'hazard', name: 'Muddy Egg' },
  twig: { kind: 'hazard', name: 'Twig' },
};

export const COLLECTIBLE_IDS = Object.keys(EGG_TYPES).filter((k) => EGG_TYPES[k].kind !== 'hazard');

// Content is introduced one step at a time. `tier` is the difficulty value at which it appears;
// level N plays at tier (N - 1), endless mode climbs tiers over time.
export const INTRODUCTIONS = [
  { tier: 0, eggs: ['blueDots', 'pinkStripes'] },
  { tier: 1, eggs: ['yellowFlowers'], specials: ['golden'], banner: 'Golden eggs are worth 100!' },
  { tier: 2, eggs: ['mintZigzag'], specials: ['star'], patterns: ['stack'], banner: 'Star eggs slow down time' },
  { tier: 3, eggs: ['lavenderHearts', 'pastelBands'], specials: ['rainbow'], patterns: ['sweep'], banner: 'Prism eggs double your points' },
  { tier: 4, specials: ['giant'], hazards: ['mud'], banner: 'Avoid the muddy eggs!' },
  { tier: 5, specials: ['mystery'], patterns: ['zigzag'], banner: 'Mystery eggs hold a surprise' },
  { tier: 6, hazards: ['twig'], patterns: ['rain'], banner: 'Watch out for twigs!' },
];

export const SPECIAL_WEIGHTS = { golden: 3, star: 2, rainbow: 2, giant: 3, mystery: 2 };

// Difficulty curve as a function of tier (continuous). Kept gentle and capped.
export function difficulty(tier) {
  const t = Math.max(0, tier);
  return {
    gravity: Math.min(520, 210 + 34 * t), // px/s^2
    maxFall: Math.min(640, 230 + 40 * t), // terminal velocity px/s
    startFall: 40 + 6 * t,
    spawnInterval: Math.max(0.5, 1.45 - 0.115 * t), // seconds between spawn events
    maxEggs: Math.min(9, 2 + Math.floor(t * 0.85)),
    specialChance: t < 1 ? 0 : Math.min(0.13, 0.06 + 0.012 * t),
    hazardChance: t < 4 ? 0 : Math.min(0.15, 0.06 + 0.018 * (t - 4)),
    patternChance: Math.min(0.4, 0.12 + 0.04 * t),
  };
}

export function contentForTier(tier) {
  const out = { eggs: [], specials: [], hazards: [], patterns: ['single'] };
  for (const step of INTRODUCTIONS) {
    if (tier + 1e-6 < step.tier) continue;
    if (step.eggs) out.eggs.push(...step.eggs);
    if (step.specials) out.specials.push(...step.specials);
    if (step.hazards) out.hazards.push(...step.hazards);
    if (step.patterns) out.patterns.push(...step.patterns);
  }
  return out;
}

export const THEMES = ['meadow', 'forest', 'candy', 'sunset'];
export const THEME_NAMES = {
  meadow: 'Flower Meadow',
  forest: 'Enchanted Forest',
  candy: 'Candy Garden',
  sunset: 'Sunset Field',
};

export function levelConfig(n) {
  const tier = n - 1; // whole tiers so each level introduces exactly one new step
  return {
    number: n,
    tier,
    tierRamp: 0.6, // extra tier gained gradually across the level
    target: Math.min(70, 12 + n * 5),
    theme: THEMES[Math.floor((n - 1) / 2) % THEMES.length],
  };
}

export const ENDLESS = {
  secondsPerTier: 22,
  maxTier: 12,
  basketCapacity: 20,
  themeEverySeconds: 75,
};

export const TIMED = { duration: 60, startTier: 1.5, secondsPerTier: 12 };

// Cosmetics. `req` is checked against the saved stats; missing req = unlocked from the start.
export const COSMETICS = {
  fur: [
    { id: 'cream', name: 'Cream' },
    { id: 'snow', name: 'Snow', req: { stat: 'totalEggs', value: 100, text: 'Catch 100 eggs' } },
    { id: 'cocoa', name: 'Cocoa', req: { stat: 'maxLevel', value: 3, text: 'Reach level 3' } },
    { id: 'blush', name: 'Blush', req: { stat: 'golden', value: 8, text: 'Catch 8 golden eggs' } },
    { id: 'lilac', name: 'Lilac', req: { stat: 'bestCombo', value: 25, text: 'Reach a 25 combo' } },
    { id: 'cloud', name: 'Cloud', req: { stat: 'games', value: 10, text: 'Play 10 games' } },
  ],
  outfit: [
    { id: 'none', name: 'None' },
    { id: 'bow', name: 'Ear Bow', req: { stat: 'maxLevel', value: 2, text: 'Reach level 2' } },
    { id: 'crown', name: 'Flower Crown', req: { stat: 'bestScore', value: 1500, text: 'Score 1,500 in one game' } },
    { id: 'bowtie', name: 'Bow Tie', req: { stat: 'totalEggs', value: 300, text: 'Catch 300 eggs' } },
  ],
  basket: [
    { id: 'wicker', name: 'Wicker' },
    { id: 'pastel', name: 'Pastel', req: { stat: 'bestEndless', value: 1200, text: 'Score 1,200 in Endless' } },
    { id: 'ribbon', name: 'Ribbon', req: { stat: 'maxLevel', value: 5, text: 'Reach level 5' } },
    { id: 'gold', name: 'Golden', req: { stat: 'golden', value: 25, text: 'Catch 25 golden eggs' } },
  ],
  effect: [
    { id: 'sparkle', name: 'Sparkles' },
    { id: 'hearts', name: 'Hearts', req: { stat: 'bestCombo', value: 15, text: 'Reach a 15 combo' } },
    { id: 'stars', name: 'Stars', req: { stat: 'maxLevel', value: 4, text: 'Reach level 4' } },
    { id: 'rainbow', name: 'Rainbow', req: { stat: 'bestTimed', value: 800, text: 'Score 800 in Time Rush' } },
  ],
  scene: [
    { id: 'meadow', name: 'Meadow' },
    { id: 'forest', name: 'Forest', req: { stat: 'maxLevel', value: 3, text: 'Reach level 3' } },
    { id: 'candy', name: 'Candy', req: { stat: 'maxLevel', value: 5, text: 'Reach level 5' } },
    { id: 'sunset', name: 'Sunset', req: { stat: 'maxLevel', value: 7, text: 'Reach level 7' } },
  ],
};

export const FUR_PALETTES = {
  cream: { base: '#fff4e6', light: '#ffffff', shade: '#e8cfb2', deep: '#c9a786', belly: '#fffcf6', inner: '#ffb3c6' },
  snow: { base: '#f7f9ff', light: '#ffffff', shade: '#d5dcec', deep: '#aeb8cf', belly: '#ffffff', inner: '#ffc2d4' },
  cocoa: { base: '#c08f69', light: '#e0b892', shade: '#946646', deep: '#6e4a31', belly: '#f4dcc2', inner: '#f3a3b5' },
  blush: { base: '#ffdbe7', light: '#fff4f8', shade: '#f0b0c6', deep: '#d68aa4', belly: '#fff3f7', inner: '#ff98b8' },
  lilac: { base: '#e7dcff', light: '#f8f4ff', shade: '#c3afe9', deep: '#9c86cc', belly: '#f7f2ff', inner: '#ffb0d0' },
  cloud: { base: '#dcdfe8', light: '#f4f6fb', shade: '#b0b5c6', deep: '#868ca1', belly: '#f3f4f8', inner: '#ffb3c6' },
};

export const BASKET_PALETTES = {
  wicker: { light: '#f0c27e', base: '#cf9450', dark: '#8f5d2c', inner: '#6b4320', ribbon: null },
  pastel: { light: '#ffe0ef', base: '#f7b6d2', dark: '#c77fa3', inner: '#9c5f7e', ribbon: '#b9e8ff' },
  ribbon: { light: '#f0c27e', base: '#cf9450', dark: '#8f5d2c', inner: '#6b4320', ribbon: '#ff8fb8' },
  gold: { light: '#fff1a8', base: '#f2c544', dark: '#b8860b', inner: '#8a6410', ribbon: '#ffffff' },
};

export const EFFECT_STYLES = {
  sparkle: { texture: 'sparkle', colors: [0xffffff, 0xfff3a6, 0xffd1ea, 0xc9f0ff] },
  hearts: { texture: 'heart', colors: [0xff7fa8, 0xffb3cb, 0xff5c8d] },
  stars: { texture: 'star', colors: [0xffe066, 0xfff2b0, 0xffc94d] },
  rainbow: { texture: 'sparkle', colors: [0xff8a8a, 0xffc078, 0xfff07a, 0x8ce99a, 0x74c0fc, 0xb197fc] },
};
