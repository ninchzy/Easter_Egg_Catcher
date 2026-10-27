import { Container, Sprite, Text } from 'pixi.js';
import { Pool } from '../core/pool.js';
import { Tex } from '../art/uiArt.js';
import { FONT } from '../art/paint.js';
import { Save } from './save.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Pooled particles, floating score text and confetti. */
export class Effects {
  constructor() {
    this.view = new Container();
    this.back = new Container(); // behind eggs (e.g. ground puffs)
    this.front = new Container();
    this.texts = new Container();
    this.view.addChild(this.front, this.texts);

    this.particles = new Pool(
      () => {
        const s = new Sprite(Tex.dot);
        s.anchor.set(0.5);
        return { s, vx: 0, vy: 0, g: 0, life: 0, max: 1, spin: 0, s0: 1, s1: 0, drag: 0, flutter: 0, a0: 1, t: 0 };
      },
      (p) => p.s.removeFromParent(),
    );

    this.floaters = new Pool(
      () => {
        const t = new Text({
          text: '',
          style: {
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: '700',
            fill: 0xffffff,
            stroke: { color: 0x7a3f8f, width: 6, join: 'round' },
            dropShadow: { color: 0x5a2a6a, alpha: 0.35, blur: 2, distance: 3, angle: Math.PI / 2 },
          },
        });
        t.anchor.set(0.5);
        return { t, vy: 0, life: 0, max: 1, base: 1 };
      },
      (f) => f.t.removeFromParent(),
    );
  }

  get fxScale() { return Save.settings.reducedFx ? 0.35 : 1; }

  emit(x, y, o) {
    const count = Math.max(1, Math.round((o.count ?? 8) * (o.noReduce ? 1 : this.fxScale)));
    for (let i = 0; i < count; i++) {
      const p = this.particles.get();
      const s = p.s;
      s.texture = o.texture || Tex.dot;
      s.tint = o.colors ? pick(o.colors) : 0xffffff;
      s.blendMode = o.add ? 'add' : 'normal';
      const a = rand(o.angle?.[0] ?? 0, o.angle?.[1] ?? Math.PI * 2);
      const sp = rand(o.speed?.[0] ?? 60, o.speed?.[1] ?? 220);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.g = o.gravity ?? 300;
      p.max = rand(o.life?.[0] ?? 0.4, o.life?.[1] ?? 0.8);
      p.life = p.max;
      p.spin = rand(-1, 1) * (o.spin ?? 4);
      p.s0 = rand(o.scale?.[0] ?? 0.6, o.scale?.[1] ?? 1.2);
      p.s1 = o.endScale ?? 0;
      p.drag = o.drag ?? 1.5;
      p.flutter = o.flutter ?? 0;
      p.a0 = o.alpha ?? 1;
      p.t = Math.random() * 10;
      s.position.set(x + rand(-1, 1) * (o.spread ?? 0), y + rand(-1, 1) * (o.spreadY ?? o.spread ?? 0));
      s.rotation = Math.random() * Math.PI * 2;
      s.scale.set(p.s0);
      s.alpha = p.a0;
      (o.layer === 'back' ? this.back : this.front).addChild(s);
    }
  }

  // ---------- presets ----------

  catchBurst(x, y, style, big = false, eggColor = null) {
    // Soft glow flash in the egg's colour right at the basket opening.
    this.emit(x, y, {
      count: 1,
      noReduce: true,
      texture: Tex.glow,
      colors: [eggColor ?? style.colors[0]],
      speed: [0, 0],
      gravity: 0,
      life: [0.32, 0.32],
      scale: big ? [1.2, 1.2] : [0.85, 0.85],
      endScale: 1.6,
      alpha: big ? 0.85 : 0.7,
      add: true,
      spin: 0,
    });
    this.emit(x, y, {
      count: big ? 30 : 16,
      texture: Tex[style.texture] || Tex.sparkle,
      colors: style.colors,
      speed: big ? [170, 440] : [120, 300],
      angle: [-Math.PI * 0.97, -Math.PI * 0.03],
      gravity: 300,
      life: [0.5, 0.95],
      scale: big ? [1.1, 1.9] : [0.8, 1.45],
      spread: 22,
    });
    this.ringPulse(x, y, eggColor ?? style.colors[0], big ? 3.2 : 2.4);
  }

  goldenBurst(x, y) {
    this.emit(x, y, {
      count: 28,
      texture: Tex.sparkle,
      colors: [0xfff3a6, 0xffd43b, 0xffffff, 0xffc078],
      speed: [140, 420],
      gravity: 200,
      life: [0.6, 1.1],
      scale: [0.7, 1.5],
      add: true,
    });
    this.emit(x, y, { count: 8, texture: Tex.glow, colors: [0xffe066], speed: [10, 40], gravity: 0, life: [0.35, 0.5], scale: [0.5, 0.7], endScale: 1.4, add: true, alpha: 0.6, noReduce: true });
    this.ringPulse(x, y, 0xffe066);
  }

  ringPulse(x, y, color, grow = 3.2) {
    this.emit(x, y, { count: 1, texture: Tex.ring, colors: [color], speed: [0, 0], gravity: 0, life: [0.4, 0.4], scale: [0.45, 0.45], endScale: grow, spin: 0, noReduce: true });
  }

  shellBurst(x, y, color) {
    this.emit(x, y, {
      count: 9,
      texture: Tex.shard,
      colors: [color, 0xffffff],
      speed: [90, 230],
      angle: [-Math.PI * 0.92, -Math.PI * 0.08],
      gravity: 900,
      life: [0.4, 0.7],
      scale: [0.7, 1.2],
      endScale: 0.4,
      spin: 10,
      layer: 'back',
    });
    this.dustPuff(x, y, 0xffffff);
  }

  dustPuff(x, y, color = 0xd9c7a8) {
    this.emit(x, y, { count: 6, texture: Tex.dot, colors: [color], speed: [30, 90], angle: [-Math.PI, 0], gravity: -20, life: [0.35, 0.6], scale: [1.2, 2], endScale: 2.6, alpha: 0.6, layer: 'back' });
  }

  mudSplat(x, y) {
    this.emit(x, y, { count: 14, texture: Tex.dot, colors: [0x6e4e33, 0x8a6643, 0x5a3b22], speed: [100, 300], angle: [-Math.PI * 0.95, -Math.PI * 0.05], gravity: 900, life: [0.4, 0.7], scale: [0.8, 1.6], endScale: 0.5 });
  }

  trail(x, y, style) {
    this.emit(x, y, { count: 1, texture: Tex[style.texture] || Tex.sparkle, colors: style.colors, speed: [5, 30], angle: [-Math.PI, 0], gravity: -40, life: [0.3, 0.55], scale: [0.35, 0.6], spread: 30, spreadY: 6 });
  }

  confetti(W, top, count = 70) {
    const colors = [0xff8fb8, 0xffd43b, 0x74c0fc, 0x8ce99a, 0xb197fc, 0xffa94d, 0xffffff];
    for (let i = 0; i < count * this.fxScale; i++) {
      this.emit(Math.random() * W, top - Math.random() * 60, {
        count: 1,
        noReduce: true,
        texture: Math.random() < 0.25 ? Tex.star : Tex.confetti,
        colors,
        speed: [20, 120],
        angle: [Math.PI * 0.3, Math.PI * 0.7],
        gravity: 140,
        life: [2.2, 3.4],
        scale: [0.7, 1.2],
        endScale: 0.6,
        spin: 6,
        drag: 0.6,
        flutter: 70,
      });
    }
  }

  floatText(x, y, text, color = 0xffffff, size = 30, stroke = 0x7a3f8f) {
    const f = this.floaters.get();
    f.t.text = text;
    f.t.style.fill = color;
    f.t.style.fontSize = size;
    f.t.style.stroke = { color: stroke, width: Math.max(4, size * 0.2), join: 'round' };
    f.t.position.set(x, y);
    f.t.alpha = 1;
    f.t.scale.set(0.3);
    f.vy = -70;
    f.max = 0.95;
    f.life = f.max;
    this.texts.addChild(f.t);
  }

  update(dt) {
    const parts = this.particles.active;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.release(p);
        continue;
      }
      p.t += dt;
      const k = 1 - p.life / p.max;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.g * dt;
      const s = p.s;
      s.x += (p.vx + (p.flutter ? Math.sin(p.t * 5) * p.flutter : 0)) * dt;
      s.y += p.vy * dt;
      s.rotation += p.spin * dt;
      const sc = p.s0 + (p.s1 * p.s0 - p.s0) * k;
      s.scale.set(sc, p.flutter ? sc * Math.abs(Math.cos(p.t * 6)) + 0.1 : sc);
      s.alpha = p.a0 * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
    }
    const fl = this.floaters.active;
    for (let i = fl.length - 1; i >= 0; i--) {
      const f = fl[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.floaters.release(f);
        continue;
      }
      const k = 1 - f.life / f.max;
      f.vy *= Math.exp(-2.5 * dt);
      f.t.y += f.vy * dt;
      const pop = k < 0.15 ? 0.3 + (k / 0.15) * 0.85 : k < 0.25 ? 1.15 - ((k - 0.15) / 0.1) * 0.15 : 1;
      f.t.scale.set(pop);
      f.t.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    }
  }

  clear() {
    this.particles.releaseAll();
    this.floaters.releaseAll();
  }
}
