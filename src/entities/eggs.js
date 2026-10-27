import { Container, Sprite } from 'pixi.js';
import { Pool } from '../core/pool.js';
import { EGG_TYPES } from '../config.js';
import { EGG_H } from '../art/eggArt.js';
import { hsvToHex } from '../art/paint.js';
import { Tex } from '../art/uiArt.js';

const GLOW = {
  golden: { color: 0xffe066, alpha: 0.75, size: 1.5 },
  rainbow: { color: 0xffffff, alpha: 0.7, size: 1.55 },
  star: { color: 0x9fb4ff, alpha: 0.7, size: 1.45 },
  mystery: { color: 0xd08cff, alpha: 0.65, size: 1.6 },
  giant: { color: 0xffd0b8, alpha: 0.35, size: 1.3 },
};

class Egg {
  constructor() {
    this.view = new Container();
    this.glow = new Sprite(Tex.glow);
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.body = new Sprite();
    this.body.anchor.set(0.5);
    this.view.addChild(this.glow, this.body);
    this.shadow = new Sprite();
    this.shadow.anchor.set(0.5);
  }
}

/** Owns every falling object: pooling, gravity, wobble, basket collision and landing. */
export class EggSystem {
  constructor(eggTextures) {
    this.tex = eggTextures;
    this.layer = new Container();
    this.shadowLayer = new Container();
    this.time = 0;
    this.pool = new Pool(() => new Egg(), (e) => {
      e.view.removeFromParent();
      e.shadow.removeFromParent();
    });
  }

  get active() { return this.pool.active; }

  spawn(type, x, y, { gravity, maxFall, startFall }) {
    const def = EGG_TYPES[type];
    const e = this.pool.get();
    e.type = type;
    e.def = def;
    e.kind = def.kind;
    e.hazard = def.kind === 'hazard';
    e.state = 'fall';
    e.x = x;
    e.y = y;
    e.spawnY = y;
    e.vx = 0;
    e.vy = startFall * (def.fallFactor || 1);
    const ff = def.fallFactor || 1;
    e.gravity = gravity * ff;
    e.maxFall = maxFall * ff;
    e.phase = Math.random() * Math.PI * 2;
    e.wobbleAmp = type === 'twig' ? 0 : 0.14 + Math.random() * 0.08;
    e.spin = type === 'twig' ? (Math.random() < 0.5 ? -2.4 : 2.4) : 0;
    e.radius = (EGG_H / 2) * (def.scale || 1);
    e.sparkleTimer = 0;
    e.catchT = 0;
    e.body.texture = this.tex[type];
    e.body.tint = 0xffffff;
    e.body.rotation = 0;
    e.view.scale.set(1);
    e.view.alpha = 1;
    e.view.rotation = 0;
    const glow = GLOW[type];
    e.glow.visible = !!glow;
    if (glow) {
      e.glow.tint = glow.color;
      e.glow.alpha = glow.alpha;
      e.glowSize = (glow.size * e.radius * 2) / 128;
      e.glow.scale.set(e.glowSize);
    }
    e.shadow.texture = this.tex.shadow;
    e.shadow.alpha = 0;
    e.view.position.set(x, y);
    this.layer.addChild(e.view);
    this.shadowLayer.addChild(e.shadow);
    return e;
  }

  /** Seconds until an egg's centre reaches `targetY`, from its current state. */
  static timeToReach(y, vy, g, vmax, targetY) {
    const D = targetY - y;
    if (D <= 0) return 0;
    if (vy >= vmax) return D / vmax;
    const t1 = (vmax - vy) / g;
    const d1 = vy * t1 + 0.5 * g * t1 * t1;
    if (D <= d1) return (-vy + Math.sqrt(vy * vy + 2 * g * D)) / g;
    return t1 + (D - d1) / vmax;
  }

  /**
   * env: { timeScale, rim:{x,y}, halfW, groundY, magnet, onCatch(e), onCaught(e), onLand(e), onSparkle(e) }
   */
  update(dt, env) {
    this.time += dt;
    const edt = dt * env.timeScale;
    const list = this.pool.active;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.state === 'caught') {
        this.updateCaught(e, dt, env);
        continue;
      }
      if (e.state === 'pop') {
        e.catchT += dt;
        const k = e.catchT / 0.25;
        e.view.scale.set(1 + k * 0.4);
        e.view.alpha = 1 - k;
        if (k >= 1) this.pool.release(e);
        continue;
      }

      const prevY = e.y;
      e.vy = Math.min(e.vy + e.gravity * edt, e.maxFall);
      e.y += e.vy * edt;

      if (env.magnet && !e.hazard && e.y < env.rim.y) {
        const dx = env.rim.x - e.x;
        const adx = Math.abs(dx);
        if (adx < env.magnet.range) e.vx += Math.sign(dx) * env.magnet.pull * (1 - adx / env.magnet.range) * edt;
      }
      e.vx *= Math.exp(-3 * edt);
      e.x += e.vx * edt;

      // Wobble / spin.
      e.phase += edt * 3.2;
      e.view.rotation = e.spin ? e.view.rotation + e.spin * edt : Math.sin(e.phase) * e.wobbleAmp;
      e.view.position.set(e.x, e.y);

      if (e.glow.visible) {
        const pulse = 1 + Math.sin(this.time * 6 + e.phase) * 0.08;
        e.glow.scale.set(e.glowSize * pulse);
        if (e.type === 'rainbow') {
          const h = (this.time * 0.6 + e.phase) % 1;
          e.glow.tint = hsvToHex(h, 0.55, 1);
          e.body.tint = hsvToHex((h + 0.5) % 1, 0.18, 1);
        }
      }
      if (e.kind === 'special' && e.type !== 'giant') {
        e.sparkleTimer -= dt;
        if (e.sparkleTimer <= 0) {
          e.sparkleTimer = 0.12;
          env.onSparkle?.(e);
        }
      }

      // Ground shadow grows as the egg approaches: a gentle landing hint.
      const k = Math.max(0, Math.min(1, (e.y - e.spawnY) / (env.groundY - e.spawnY)));
      e.shadow.position.set(e.x, env.groundY - 4);
      e.shadow.scale.set((0.35 + 0.65 * k) * (e.def.scale || 1));
      e.shadow.alpha = 0.1 + 0.5 * k * k;

      // Catch test: the egg's centre must cross the rim line inside the opening (swept, so no
      // tunnelling at high speed), or the basket slides under it within a thin band below the rim.
      const dx = Math.abs(e.x - env.rim.x);
      const crossed = prevY < env.rim.y && e.y >= env.rim.y && dx <= env.halfW + e.radius * 0.3;
      const scooped = e.y >= env.rim.y && e.y <= env.rim.y + 16 && dx <= env.halfW * 0.85;
      if (crossed || scooped) {
        // Hazards bounce off with a pop instead of landing in the basket.
        e.state = e.hazard ? 'pop' : 'caught';
        e.catchT = 0;
        e.fromX = e.x;
        e.fromY = Math.min(e.y, env.rim.y);
        e.shadow.alpha = 0;
        env.onCatch(e);
        continue;
      }

      if (e.y + e.radius * 0.6 >= env.groundY) {
        env.onLand(e);
        this.pool.release(e);
      }
    }
  }

  updateCaught(e, dt, env) {
    e.catchT += dt;
    const k = Math.min(1, e.catchT / 0.16);
    const ease = k * k * (3 - 2 * k);
    const tx = env.rim.x;
    const ty = env.rim.y + 6;
    e.view.position.set(e.fromX + (tx - e.fromX) * ease, e.fromY + (ty - e.fromY) * ease);
    e.view.scale.set(1 - 0.5 * ease, 1 - 0.55 * ease);
    e.view.rotation *= 0.8;
    if (k >= 1) {
      if (!e.hazard) env.onCaught?.(e);
      this.pool.release(e);
    }
  }

  /** Remove everything still falling, with a soft pop (used on level clear / game over). */
  popAll(onPop) {
    for (const e of this.pool.active) {
      if (e.state !== 'fall') continue;
      onPop?.(e);
      e.state = 'pop';
      e.catchT = 0;
      e.shadow.alpha = 0;
    }
  }

  clear() {
    this.pool.releaseAll();
  }

  countWhere(fn) {
    let n = 0;
    for (const e of this.pool.active) if (e.state === 'fall' && fn(e)) n++;
    return n;
  }
}
