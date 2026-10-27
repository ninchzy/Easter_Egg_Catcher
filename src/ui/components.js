import { Container, Sprite, Text, Graphics, Rectangle } from 'pixi.js';
import { buttonTexture, panelTexture, BUTTON_COLORS } from '../art/uiArt.js';
import { FONT } from '../art/paint.js';
import { Audio } from '../systems/audio.js';

export const INK = 0x6b3f7a;

export function label(text, size = 28, fill = 0xffffff, { stroke = INK, strokeW = null, shadow = true, weight = '700', align = 'center', wrap = 0 } = {}) {
  const style = {
    fontFamily: FONT,
    fontSize: size,
    fontWeight: weight,
    fill,
    align,
    wordWrap: wrap > 0,
    wordWrapWidth: wrap || 100,
    lineHeight: size * 1.15,
  };
  if (stroke !== null) style.stroke = { color: stroke, width: strokeW ?? Math.max(3, size * 0.18), join: 'round' };
  if (shadow) style.dropShadow = { color: 0x4a2050, alpha: 0.3, blur: 2, distance: Math.max(2, size * 0.08), angle: Math.PI / 2 };
  const t = new Text({ text, style });
  t.anchor.set(0.5);
  return t;
}

/** Shrinks a Text's font size until it fits `maxWidth` (keeps it crisp, unlike scaling). */
export function fitText(t, maxWidth, minSize = 12) {
  let size = t.style.fontSize;
  while (t.width > maxWidth && size > minSize) {
    size -= 1;
    t.style.fontSize = size;
  }
  return t;
}

/** Plain dark text for use on light panels. */
export function bodyText(text, size = 24, fill = INK, wrap = 0) {
  return label(text, size, fill, { stroke: null, shadow: false, weight: '600', wrap });
}

// ---------- icons ----------

export function drawIcon(g, name, s, color = 0xffffff) {
  const fill = { color };
  const line = { width: s * 0.13, color, cap: 'round', join: 'round' };
  switch (name) {
    case 'pause':
      g.roundRect(-s * 0.24, -s * 0.3, s * 0.17, s * 0.6, s * 0.06).fill(fill);
      g.roundRect(s * 0.07, -s * 0.3, s * 0.17, s * 0.6, s * 0.06).fill(fill);
      break;
    case 'play':
      g.poly([-s * 0.18, -s * 0.3, s * 0.32, 0, -s * 0.18, s * 0.3]).fill(fill).stroke({ ...line, width: s * 0.08 });
      break;
    case 'gear': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cx = Math.cos(a) * s * 0.3;
        const cy = Math.sin(a) * s * 0.3;
        g.circle(cx, cy, s * 0.1).fill(fill);
      }
      g.circle(0, 0, s * 0.3).fill(fill);
      g.circle(0, 0, s * 0.11).cut();
      break;
    }
    case 'home':
      g.poly([-s * 0.36, -s * 0.02, 0, -s * 0.34, s * 0.36, -s * 0.02]).stroke(line);
      g.roundRect(-s * 0.24, -s * 0.06, s * 0.48, s * 0.38, s * 0.06).fill(fill);
      g.roundRect(-s * 0.07, s * 0.1, s * 0.14, s * 0.22, s * 0.03).cut();
      break;
    case 'restart':
      g.arc(0, 0, s * 0.27, -Math.PI * 0.35, Math.PI * 1.45).stroke(line);
      g.poly([s * 0.1, -s * 0.42, s * 0.34, -s * 0.28, s * 0.1, -s * 0.1]).fill(fill);
      break;
    case 'close':
      g.moveTo(-s * 0.24, -s * 0.24).lineTo(s * 0.24, s * 0.24).stroke(line);
      g.moveTo(s * 0.24, -s * 0.24).lineTo(-s * 0.24, s * 0.24).stroke(line);
      break;
    case 'shirt':
      g.poly([
        -s * 0.14, -s * 0.32, -s * 0.38, -s * 0.18, -s * 0.28, s * 0.0, -s * 0.2, -s * 0.06, -s * 0.2, s * 0.32,
        s * 0.2, s * 0.32, s * 0.2, -s * 0.06, s * 0.28, s * 0.0, s * 0.38, -s * 0.18, s * 0.14, -s * 0.32,
        s * 0.07, -s * 0.24, -s * 0.07, -s * 0.24,
      ]).fill(fill).stroke({ ...line, width: s * 0.06 });
      break;
    case 'sound':
      g.poly([-s * 0.32, -s * 0.12, -s * 0.16, -s * 0.12, s * 0.04, -s * 0.3, s * 0.04, s * 0.3, -s * 0.16, s * 0.12, -s * 0.32, s * 0.12]).fill(fill);
      g.arc(s * 0.06, 0, s * 0.18, -0.9, 0.9).stroke({ ...line, width: s * 0.08 });
      g.arc(s * 0.06, 0, s * 0.32, -0.9, 0.9).stroke({ ...line, width: s * 0.08 });
      break;
    case 'left':
      g.poly([s * 0.16, -s * 0.3, -s * 0.22, 0, s * 0.16, s * 0.3]).fill(fill).stroke({ ...line, width: s * 0.12 });
      break;
    case 'right':
      g.poly([-s * 0.16, -s * 0.3, s * 0.22, 0, -s * 0.16, s * 0.3]).fill(fill).stroke({ ...line, width: s * 0.12 });
      break;
    case 'trophy':
      g.roundRect(-s * 0.22, -s * 0.3, s * 0.44, s * 0.32, s * 0.14).fill(fill);
      g.arc(-s * 0.22, -s * 0.16, s * 0.1, Math.PI * 0.5, Math.PI * 1.5).stroke({ ...line, width: s * 0.06 });
      g.arc(s * 0.22, -s * 0.16, s * 0.1, -Math.PI * 0.5, Math.PI * 0.5).stroke({ ...line, width: s * 0.06 });
      g.rect(-s * 0.05, 0, s * 0.1, s * 0.16).fill(fill);
      g.roundRect(-s * 0.18, s * 0.14, s * 0.36, s * 0.1, s * 0.03).fill(fill);
      break;
    case 'lock':
      g.arc(0, -s * 0.06, s * 0.15, Math.PI, 0).stroke({ ...line, width: s * 0.08 });
      g.roundRect(-s * 0.22, -s * 0.06, s * 0.44, s * 0.34, s * 0.06).fill(fill);
      break;
    case 'check':
      g.moveTo(-s * 0.24, 0).lineTo(-s * 0.06, s * 0.18).lineTo(s * 0.26, -s * 0.2).stroke(line);
      break;
    default:
      break;
  }
  return g;
}

export function icon(name, s, color = 0xffffff) {
  return drawIcon(new Graphics(), name, s, color);
}

// ---------- button ----------

export class Button extends Container {
  constructor({ w = 240, h = 84, color = 'pink', text = '', icon: iconName = null, fontSize = null, onClick = null, textColor = 0xffffff }) {
    super();
    this.w = w;
    this.h = h;
    this.color = color;
    this.onClick = onClick;
    this.bg = new Sprite(buttonTexture(w, h, color, false));
    this.bg.anchor.set(0.5);
    this.content = new Container();
    this.addChild(this.bg, this.content);
    const fs = fontSize ?? Math.round(h * 0.4);
    if (iconName) {
      this.iconG = icon(iconName, Math.min(w, h) * (text ? 0.5 : 0.62), textColor);
      this.content.addChild(this.iconG);
    }
    if (text) {
      const light = color === 'cream' || color === 'white';
      const dark = parseInt(BUTTON_COLORS[color][2].slice(1), 16);
      this.text = label(text, fs, textColor, { stroke: light ? null : dark, strokeW: fs * 0.12, shadow: !light });
      fitText(this.text, w - 20 - (this.iconG ? this.iconG.width + 12 : 0));
      this.content.addChild(this.text);
      if (this.iconG) {
        const total = this.iconG.width + 12 + this.text.width;
        this.iconG.x = -total / 2 + this.iconG.width / 2;
        this.text.x = this.iconG.x + this.iconG.width / 2 + 12 + this.text.width / 2;
      }
    }
    this.content.y = -5;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
    this.pressed = false;
    this.on('pointerdown', () => this.setPressed(true));
    this.on('pointerup', () => this.setPressed(false));
    this.on('pointerupoutside', () => this.setPressed(false));
    this.on('pointertap', () => {
      Audio.click();
      this.onClick?.();
    });
  }

  setPressed(p) {
    if (p === this.pressed) return;
    this.pressed = p;
    this.bg.texture = buttonTexture(this.w, this.h, this.color, p);
    this.content.y = p ? 2.5 : -5;
  }

  setColor(color) {
    this.color = color;
    this.bg.texture = buttonTexture(this.w, this.h, color, this.pressed);
  }
}

// ---------- slider ----------

export class Slider extends Container {
  constructor({ w = 300, value = 0.5, onChange }) {
    super();
    this.w = w;
    this.value = value;
    this.onChange = onChange;
    this.track = new Graphics();
    this.knob = new Sprite(buttonTexture(44, 44, 'pink'));
    this.knob.anchor.set(0.5, 0.56);
    this.addChild(this.track, this.knob);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-24, -30, w + 48, 60);
    this.dragging = false;
    this.on('pointerdown', (e) => {
      this.dragging = true;
      this.setFromGlobal(e.global);
    });
    this.on('globalpointermove', (e) => {
      if (this.dragging) this.setFromGlobal(e.global);
    });
    this.on('pointerup', () => this.end());
    this.on('pointerupoutside', () => this.end());
    this.redraw();
  }

  end() {
    if (this.dragging) Audio.click();
    this.dragging = false;
  }

  setFromGlobal(g) {
    const p = this.toLocal(g);
    this.value = Math.max(0, Math.min(1, p.x / this.w));
    this.redraw();
    this.onChange?.(this.value);
  }

  redraw() {
    const g = this.track;
    g.clear();
    g.roundRect(0, -9, this.w, 18, 9).fill({ color: 0x9a6aaa, alpha: 0.2 });
    g.roundRect(0, -9, Math.max(18, this.w * this.value), 18, 9).fill(0xff8fb8);
    g.roundRect(4, -6, Math.max(10, this.w * this.value - 8), 5, 3).fill({ color: 0xffffff, alpha: 0.5 });
    this.knob.x = this.w * this.value;
  }
}

// ---------- toggle ----------

export class Toggle extends Container {
  constructor({ value = false, onChange }) {
    super();
    this.value = value;
    this.onChange = onChange;
    this.g = new Graphics();
    this.knob = new Sprite(buttonTexture(44, 44, 'white'));
    this.knob.anchor.set(0.5, 0.56);
    this.addChild(this.g, this.knob);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-10, -30, 108, 60);
    this.on('pointertap', () => {
      this.value = !this.value;
      Audio.click();
      this.redraw();
      this.onChange?.(this.value);
    });
    this.redraw();
  }

  redraw() {
    this.g.clear();
    this.g.roundRect(0, -20, 88, 40, 20).fill(this.value ? 0x7fd67a : 0xd8c8dc);
    this.g.roundRect(6, -16, 76, 10, 5).fill({ color: 0xffffff, alpha: 0.35 });
    this.knob.x = this.value ? 66 : 22;
  }
}

// ---------- panel ----------

export class Panel extends Container {
  constructor(w, h, title = null) {
    super();
    this.w = w;
    this.h = h;
    this.bg = new Sprite(panelTexture(w, h));
    this.bg.anchor.set(0.5);
    this.addChild(this.bg);
    // Swallow taps so they don't reach the game below.
    this.eventMode = 'static';
    this.hitArea = new Rectangle(-w / 2, -h / 2, w, h);
    if (title) {
      this.ribbon = new Sprite(buttonTexture(Math.min(w - 60, title.length * 26 + 90), 74, 'pink'));
      this.ribbon.anchor.set(0.5);
      this.ribbon.y = -h / 2 + 4;
      this.title = label(title, 36, 0xffffff);
      this.title.y = -h / 2;
      this.addChild(this.ribbon, this.title);
    }
  }
}

/** Full-screen translucent blocker behind modal panels. */
export function dimmer(alpha = 0.35) {
  const g = new Graphics();
  g.rect(0, 0, 10, 10).fill({ color: 0x3b2150, alpha });
  g.eventMode = 'static';
  return g;
}
