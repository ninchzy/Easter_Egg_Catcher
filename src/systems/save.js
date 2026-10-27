import { COSMETICS, COLLECTIBLE_IDS } from '../config.js';

const KEY = 'easterEggCatcher.save.v1';

function defaults() {
  return {
    settings: {
      control: 'drag', // 'drag' | 'buttons'
      music: 0.7,
      sfx: 0.9,
      muted: false,
      reducedFx: false,
    },
    best: { levels: 0, endless: 0, timed: 0 },
    stats: {
      totalEggs: 0,
      golden: 0,
      bestCombo: 0,
      maxLevel: 1,
      games: 0,
      bestScore: 0,
      bestEndless: 0,
      bestTimed: 0,
    },
    collection: Object.fromEntries(COLLECTIBLE_IDS.map((id) => [id, 0])),
    unlocked: Object.values(COSMETICS).flat().filter((c) => !c.req).map((c) => c.id),
    equipped: { fur: 'cream', outfit: 'none', basket: 'wicker', effect: 'sparkle', scene: 'meadow' },
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in saved)) continue;
    const b = base[k];
    const s = saved[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, s);
    else if (typeof s === typeof b) base[k] = s;
  }
  return base;
}

class SaveData {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(defaults(), JSON.parse(raw));
    } catch {
      // Private mode or blocked storage: play on with defaults.
    }
    this._timer = 0;
  }

  get settings() { return this.data.settings; }
  get stats() { return this.data.stats; }
  get equipped() { return this.data.equipped; }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  // Coalesce frequent writes (e.g. dragging a volume slider).
  saveSoon() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.save(), 300);
  }

  isUnlocked(id) { return this.data.unlocked.includes(id); }

  /** Checks every cosmetic requirement against the stats; returns the newly unlocked items. */
  checkUnlocks() {
    const fresh = [];
    for (const [cat, items] of Object.entries(COSMETICS)) {
      for (const item of items) {
        if (!item.req || this.isUnlocked(item.id)) continue;
        if ((this.data.stats[item.req.stat] ?? 0) >= item.req.value) {
          this.data.unlocked.push(item.id);
          fresh.push({ ...item, cat });
        }
      }
    }
    if (fresh.length) this.save();
    return fresh;
  }

  bumpStat(name, value) {
    if (value > (this.data.stats[name] ?? 0)) this.data.stats[name] = value;
  }
}

export const Save = new SaveData();
