import { EGG_TYPES, SPECIAL_WEIGHTS, difficulty, contentForTier } from '../config.js';
import { EggSystem } from '../entities/eggs.js';

const rand = (a, b) => a + Math.random() * (b - a);

function weighted(items) {
  let total = 0;
  for (const [, w] of items) total += w;
  let r = Math.random() * total;
  for (const [id, w] of items) {
    r -= w;
    if (r <= 0) return id;
  }
  return items[items.length - 1][0];
}

/**
 * Decides what falls, where and when. Difficulty comes from a continuous `tier` value; every
 * placement is checked against eggs already in the air so a reachable path always exists.
 */
export class Spawner {
  constructor(eggs) {
    this.eggs = eggs;
    this.reset();
  }

  reset() {
    this.timer = 1.4;
    this.pending = [];
    this.specialCooldown = 5;
    this.elapsed = 0;
    this.lastType = null;
  }

  update(dt, ctx) {
    const { tier, timeScale } = ctx;
    const d = difficulty(tier);
    const content = contentForTier(tier);
    const sdt = dt * timeScale;
    this.elapsed += sdt;
    this.specialCooldown -= sdt;

    // Release eggs queued by a pattern.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.delay -= sdt;
      if (p.delay <= 0) {
        this.eggs.spawn(p.type, p.x, ctx.spawnY, d);
        this.pending.splice(i, 1);
      }
    }
    if (this.pending.length) return;

    this.timer -= sdt;
    if (this.timer > 0) return;
    const falling = this.eggs.countWhere(() => true);
    if (falling >= d.maxEggs) {
      this.timer = 0.15;
      return;
    }

    const patterns = content.patterns.filter((p) => p !== 'single');
    if (patterns.length && Math.random() < d.patternChance && falling <= Math.max(1, d.maxEggs - 3)) {
      const dur = this.spawnPattern(patterns[(Math.random() * patterns.length) | 0], d, content, ctx, tier);
      this.timer = dur + d.spawnInterval * rand(0.9, 1.2);
      return;
    }

    this.spawnSingle(d, content, ctx);
    this.timer = d.spawnInterval * rand(0.8, 1.2);
  }

  pickStandard(content) {
    const items = content.eggs.map((id) => [id, EGG_TYPES[id].kind === 'rare' ? 0.45 : 1]);
    let id = weighted(items);
    if (id === this.lastType && items.length > 1) id = weighted(items); // light anti-repeat
    this.lastType = id;
    return id;
  }

  spawnSingle(d, content, ctx) {
    let type;
    const hazardsOnScreen = this.eggs.countWhere((e) => e.hazard);
    if (content.hazards.length && Math.random() < d.hazardChance && hazardsOnScreen < (ctx.tier > 7 ? 2 : 1)) {
      type = content.hazards[(Math.random() * content.hazards.length) | 0];
    } else if (content.specials.length && this.specialCooldown <= 0 && Math.random() < d.specialChance) {
      type = weighted(content.specials.map((id) => [id, SPECIAL_WEIGHTS[id] || 1]));
      this.specialCooldown = 4.5;
    } else {
      type = this.pickStandard(content);
    }
    const def = EGG_TYPES[type];
    const ff = def.fallFactor || 1;
    const margin = 30 * (def.scale || 1);
    const lo = ctx.fieldL + margin;
    const hi = ctx.fieldR - margin;
    const tNew = EggSystem.timeToReach(ctx.spawnY, d.startFall * ff, d.gravity * ff, d.maxFall * ff, ctx.rimY);
    const x = def.kind === 'hazard' ? this.hazardX(tNew, lo, hi, ctx) : this.fairX(tNew, lo, hi, ctx);
    this.eggs.spawn(type, x, ctx.spawnY, d);
  }

  /** Choose x so that the new egg is reachable from every egg that lands around the same time. */
  fairX(tNew, lo, hi, ctx) {
    const speed = Math.min(ctx.bunnySpeed, 720) * 0.72;
    for (const e of this.eggs.active) {
      if (e.state !== 'fall' || e.hazard) continue;
      const te = EggSystem.timeToReach(e.y, e.vy, e.gravity, e.maxFall, ctx.rimY);
      const allowed = speed * Math.abs(tNew - te) + ctx.halfW * 0.8;
      const lo2 = Math.max(lo, e.x - allowed);
      const hi2 = Math.min(hi, e.x + allowed);
      if (lo2 <= hi2) {
        lo = lo2;
        hi = hi2;
      }
    }
    return rand(lo, hi);
  }

  /** Hazards go where they're least likely to block a collectible landing at the same time. */
  hazardX(tNew, lo, hi, ctx) {
    let best = rand(lo, hi);
    let bestScore = -Infinity;
    for (let i = 0; i < 8; i++) {
      const x = rand(lo, hi);
      let score = 1000;
      for (const e of this.eggs.active) {
        if (e.state !== 'fall' || e.hazard) continue;
        const te = EggSystem.timeToReach(e.y, e.vy, e.gravity, e.maxFall, ctx.rimY);
        if (Math.abs(te - tNew) < 0.9) score = Math.min(score, Math.abs(x - e.x));
      }
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    return best;
  }

  /** Queue a little formation of matching eggs. Returns its duration in seconds. */
  spawnPattern(name, d, content, ctx, tier) {
    const type = this.pickStandard(content);
    const tight = 1 - Math.min(0.3, tier * 0.03);
    const W = ctx.fieldR - ctx.fieldL - 60;
    const steps = [];
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (name === 'stack') {
      for (let i = 0; i < 3; i++) steps.push({ delay: i * 0.34 * tight, dx: 0 });
    } else if (name === 'sweep') {
      for (let i = 0; i < 4; i++) steps.push({ delay: i * 0.32 * tight, dx: dir * i * 64 });
    } else if (name === 'zigzag') {
      for (let i = 0; i < 5; i++) steps.push({ delay: i * 0.36 * tight, dx: i % 2 ? 58 : -58 });
    } else if (name === 'rain') {
      for (let i = 0; i < 6; i++) steps.push({ delay: i * 0.42 * tight, dx: dir * (i * W) / 6 });
    }
    const minDx = Math.min(...steps.map((s) => s.dx));
    const maxDx = Math.max(...steps.map((s) => s.dx));
    const lo = ctx.fieldL + 30 - minDx;
    const hi = ctx.fieldR - 30 - maxDx;
    const tNew = EggSystem.timeToReach(ctx.spawnY, d.startFall, d.gravity, d.maxFall, ctx.rimY);
    const base = lo <= hi ? this.fairX(tNew, lo, hi, ctx) : (ctx.fieldL + ctx.fieldR) / 2 - (minDx + maxDx) / 2;
    for (const s of steps) this.pending.push({ delay: s.delay, x: base + s.dx, type });
    return steps[steps.length - 1].delay;
  }
}
