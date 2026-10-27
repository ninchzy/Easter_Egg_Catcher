import { Container, Sprite, Graphics } from 'pixi.js';
import { Layout } from '../core/layout.js';
import { Tweens } from '../core/tween.js';
import { Save } from './save.js';
import {
  THEME_PALETTES, BG_W, FAR_H, MID_H, GROUND_LIP, GROUND_TOP,
  paintSky, paintSun, paintRays, paintCloud, paintFar, paintMid, paintGround, paintPetal, paintFirefly,
} from '../art/sceneArt.js';

const themeCache = new Map();
let shared = null;

function themeTextures(theme) {
  if (!themeCache.has(theme)) {
    themeCache.set(theme, {
      sky: paintSky(theme),
      sun: paintSun(theme),
      far: paintFar(theme),
      mid: paintMid(theme),
      ground: paintGround(theme),
    });
  }
  return themeCache.get(theme);
}

const SUN_POS = {
  meadow: [0.8, 0.13, 1],
  forest: [0.24, 0.12, 0.9],
  candy: [0.2, 0.14, 0.9],
  sunset: [0.5, 0.5, 1.5],
};

/** Layered parallax diorama: sky, sun, clouds, far hills, birds, mid props, ground, ambient petals. */
export class Background {
  constructor() {
    if (!shared) {
      shared = {
        rays: paintRays(),
        clouds: [paintCloud(3), paintCloud(11), paintCloud(29)],
        petal: paintPetal(),
        firefly: paintFirefly(),
      };
    }
    this.view = new Container();
    this.skyLayer = new Container();
    this.sunLayer = new Container();
    this.cloudLayer = new Container();
    this.farLayer = new Container();
    this.birdLayer = new Container();
    this.midLayer = new Container();
    this.groundLayer = new Container();
    this.ambientLayer = new Container();
    this.view.addChild(this.skyLayer, this.sunLayer, this.cloudLayer, this.farLayer, this.birdLayer, this.midLayer, this.groundLayer, this.ambientLayer);

    this.rays = new Sprite(shared.rays);
    this.rays.anchor.set(0.5);
    this.rays.alpha = 0.5;
    this.theme = null;
    this.current = null; // { sky, sun, far, mid, ground }
    this.parallax = 0;
    this.time = 0;

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const c = new Sprite(shared.clouds[i % 3]);
      c.anchor.set(0.5);
      c.speed = 5 + Math.random() * 10;
      c.depth = 0.5 + Math.random() * 0.6;
      c.scale.set(c.depth * (0.9 + Math.random() * 0.3));
      c.alpha = 0.75 + c.depth * 0.2;
      c.baseY = Math.random();
      c.x = Math.random() * 1400;
      this.clouds.push(c);
      this.cloudLayer.addChild(c);
    }
    this.clouds.sort((a, b) => a.depth - b.depth).forEach((c) => this.cloudLayer.addChild(c));

    this.birds = [];
    this.birdTimer = 6;

    this.ambient = [];
    for (let i = 0; i < 10; i++) {
      const p = new Sprite(shared.petal);
      p.anchor.set(0.5);
      this.resetAmbient(p, true);
      this.ambient.push(p);
      this.ambientLayer.addChild(p);
    }
  }

  setTheme(theme, instant = false) {
    if (theme === this.theme) return;
    this.theme = theme;
    const tex = themeTextures(theme);
    const next = {
      sky: new Sprite(tex.sky),
      sun: new Sprite(tex.sun),
      far: new Sprite(tex.far),
      mid: new Sprite(tex.mid),
      ground: new Sprite(tex.ground),
    };
    next.sun.anchor.set(0.5);
    const prev = this.current;
    this.skyLayer.addChild(next.sky);
    this.sunLayer.addChild(next.sun);
    this.farLayer.addChild(next.far);
    this.midLayer.addChild(next.mid);
    this.groundLayer.addChild(next.ground);
    this.sunLayer.addChildAt(this.rays, 0);
    this.current = next;
    this.layoutTheme(next);

    const pal = THEME_PALETTES[theme];
    for (const c of this.clouds) c.tint = pal.cloud;
    const fire = theme === 'forest';
    for (const p of this.ambient) {
      p.texture = fire ? shared.firefly : shared.petal;
      p.blendMode = fire ? 'add' : 'normal';
      p.tint = theme === 'sunset' ? 0xffe0c8 : theme === 'candy' ? 0xffd6f0 : 0xffffff;
    }

    if (prev && !instant) {
      for (const s of Object.values(next)) s.alpha = 0;
      Tweens.ui.to({ k: 0 }, { k: 1 }, 1.2, {
        onUpdate: (k) => {
          for (const s of Object.values(next)) s.alpha = k;
        },
        onComplete: () => {
          for (const s of Object.values(prev)) s.destroy();
        },
      });
    } else if (prev) {
      for (const s of Object.values(prev)) s.destroy();
    }
  }

  layoutTheme(t) {
    const { W, H, groundY } = Layout;
    const sx = Math.max(1, W / BG_W);
    t.sky.width = W;
    t.sky.height = H;
    const [px, py, ps] = SUN_POS[this.theme];
    const sunY = this.theme === 'sunset' ? groundY - 300 : Layout.safeTop + H * py;
    t.sun.position.set(W * px, sunY);
    t.sun.scale.set(ps);
    this.rays.position.copyFrom(t.sun.position);
    this.rays.scale.set(ps * 1.4);
    t.far.scale.set(sx);
    t.far.position.set(W / 2 - (BG_W * sx) / 2, groundY - 34 - FAR_H * sx);
    t.mid.scale.set(sx);
    t.mid.position.set(W / 2 - (BG_W * sx) / 2, groundY - 18 - MID_H * sx);
    t.ground.scale.set(sx, 1);
    t.ground.position.set(W / 2 - (BG_W * sx) / 2, groundY - GROUND_LIP - GROUND_TOP);
  }

  resize() {
    if (this.current) this.layoutTheme(this.current);
    for (const c of this.clouds) c.y = this.cloudY(c);
  }

  cloudY(c) {
    const top = Layout.safeTop + 110;
    const bottom = Layout.groundY - 330;
    return top + c.baseY * Math.max(40, bottom - top);
  }

  resetAmbient(p, scatter) {
    const { W, H } = Layout;
    p.x = Math.random() * W;
    p.y = scatter ? Math.random() * H : -20;
    p.vy = 18 + Math.random() * 22;
    p.sway = 0.5 + Math.random() * 1.5;
    p.phase = Math.random() * Math.PI * 2;
    p.spin = (Math.random() - 0.5) * 2;
    p.scale.set(0.7 + Math.random() * 0.6);
    p.baseAlpha = 0.55 + Math.random() * 0.35;
  }

  spawnBirds() {
    const { W } = Layout;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const n = 2 + ((Math.random() * 2) | 0);
    const y = Layout.safeTop + 150 + Math.random() * 160;
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      g.moveTo(-9, 0).quadraticCurveTo(-4, -6, 0, 0).quadraticCurveTo(4, -6, 9, 0).stroke({ width: 2.4, color: 0x6a6f9a, alpha: 0.55, cap: 'round' });
      g.x = dir > 0 ? -30 - i * 26 : W + 30 + i * 26;
      g.y = y + i * 12 * (i % 2 ? 1 : -1);
      g.vx = dir * (55 + Math.random() * 10);
      g.phase = Math.random() * 6;
      this.birds.push(g);
      this.birdLayer.addChild(g);
    }
  }

  setParallax(nx) {
    this.parallax = nx;
  }

  update(dt) {
    this.time += dt;
    const { W, H } = Layout;
    const reduced = Save.settings.reducedFx;
    this.rays.rotation += dt * 0.04;
    this.rays.alpha = 0.35 + Math.sin(this.time * 0.6) * 0.1;

    const px = this.parallax;
    this.farLayer.x += (-px * 10 - this.farLayer.x) * Math.min(1, dt * 4);
    this.midLayer.x += (-px * 22 - this.midLayer.x) * Math.min(1, dt * 4);
    this.cloudLayer.x = -px * 6;

    for (const c of this.clouds) {
      c.x += c.speed * c.depth * dt;
      if (c.x - c.width / 2 > W + 60) c.x = -c.width / 2 - 40;
      c.y = this.cloudY(c) + Math.sin(this.time * 0.3 + c.baseY * 9) * 3;
    }

    if (!reduced) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.birdTimer = 14 + Math.random() * 16;
        this.spawnBirds();
      }
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.x += b.vx * dt;
      b.phase += dt * 9;
      b.scale.y = 0.4 + Math.abs(Math.sin(b.phase)) * 0.8;
      b.y += Math.sin(b.phase * 0.3) * dt * 6;
      if (b.x < -80 || b.x > W + 80) {
        b.destroy();
        this.birds.splice(i, 1);
      }
    }

    const fire = this.theme === 'forest';
    const visible = reduced ? 3 : this.ambient.length;
    for (let i = 0; i < this.ambient.length; i++) {
      const p = this.ambient[i];
      p.visible = i < visible;
      if (!p.visible) continue;
      p.phase += dt * p.sway;
      if (fire) {
        p.x += Math.sin(p.phase) * 14 * dt;
        p.y += Math.cos(p.phase * 0.7) * 10 * dt - 4 * dt;
        p.alpha = p.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(p.phase * 1.7)));
        if (p.y < Layout.safeTop + 100 || p.y > Layout.groundY) p.y = Layout.groundY - Math.random() * 300;
      } else {
        p.y += p.vy * dt;
        p.x += Math.sin(p.phase) * 22 * dt;
        p.rotation += p.spin * dt;
        p.alpha = p.baseAlpha;
        if (p.y > H + 20) this.resetAmbient(p, false);
      }
    }
  }
}
