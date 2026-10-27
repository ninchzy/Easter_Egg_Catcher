import { paint, rgba, mix, softEllipse, specular, starPath, heartPath, roundRectPath, eggPath, FONT } from './paint.js';

// ---------- particles / fx (white so they can be tinted) ----------

export function paintGlow() {
  return paint(128, 128, (ctx) => softEllipse(ctx, 64, 64, 64, 64, '#ffffff', 1), 1);
}

export function paintDot() {
  return paint(16, 16, (ctx) => {
    softEllipse(ctx, 8, 8, 8, 8, '#ffffff', 1);
    softEllipse(ctx, 8, 8, 4, 4, '#ffffff', 1);
  });
}

export function paintSparkle() {
  return paint(32, 32, (ctx) => {
    softEllipse(ctx, 16, 16, 10, 10, '#ffffff', 0.6);
    starPath(ctx, 16, 16, 15, 0.18, 4, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

export function paintStar() {
  return paint(28, 28, (ctx) => {
    starPath(ctx, 14, 14, 13, 0.48);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

export function paintHeartFx() {
  return paint(26, 24, (ctx) => {
    heartPath(ctx, 13, 13, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

export function paintConfetti() {
  return paint(12, 18, (ctx) => {
    roundRectPath(ctx, 1, 1, 10, 16, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

export function paintShard() {
  return paint(16, 14, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 12);
    ctx.lineTo(8, 1);
    ctx.lineTo(11, 7);
    ctx.lineTo(15, 4);
    ctx.lineTo(13, 13);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
}

export function paintRing() {
  return paint(96, 96, (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
}

// ---------- HUD ----------

export function paintHudHeart(full) {
  return paint(46, 44, (ctx) => {
    ctx.translate(5, 4);
    ctx.save();
    ctx.shadowColor = 'rgba(120,30,70,0.35)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    heartPath(ctx, 18, 18, 30);
    ctx.fillStyle = full ? '#ff6b9d' : 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
    heartPath(ctx, 18, 18, 30);
    if (full) {
      const g = ctx.createRadialGradient(12, 10, 1, 18, 18, 18);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(150,20,70,0.35)');
      ctx.fillStyle = g;
      ctx.fill();
      specular(ctx, 11, 11, 4.5, 3, -0.6, 0.9);
    } else {
      ctx.strokeStyle = 'rgba(200,120,160,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

export function paintEggIcon() {
  return paint(22, 28, (ctx) => {
    eggPath(ctx, 11, 14, 18, 24);
    const g = ctx.createRadialGradient(7, 8, 1, 11, 14, 14);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(1, '#f5b83a');
    ctx.fillStyle = g;
    ctx.fill();
    specular(ctx, 7, 8, 3, 4, -0.4, 0.9);
  });
}

// ---------- buttons & panels ----------

export const BUTTON_COLORS = {
  pink: ['#ffa3c7', '#f06a9f', '#c94a7e'],
  green: ['#9be88a', '#55c25a', '#3a9442'],
  blue: ['#9ad4ff', '#4ea6ee', '#2f7ac0'],
  yellow: ['#ffe08a', '#f7b733', '#c98a12'],
  lavender: ['#d6c2ff', '#9d7cf0', '#7356c4'],
  cream: ['#fffaf2', '#f3e2cb', '#cdb08e'],
  white: ['#ffffff', '#eef4ff', '#b9c6dc'],
};

const btnCache = new Map();

/** Dimensional pill button: glossy top, darker lip at the bottom, soft drop shadow. */
export function buttonTexture(w, h, color = 'pink', pressed = false) {
  const key = `${w}x${h}:${color}:${pressed}`;
  if (btnCache.has(key)) return btnCache.get(key);
  const [light, mid, dark] = BUTTON_COLORS[color];
  const lip = pressed ? 2 : 7;
  const pad = 20;
  const r = Math.min(h / 2, 30);
  const tex = paint(w + pad * 2, h + pad * 2, (ctx) => {
    const x = pad;
    const y = pad + (pressed ? 5 : 0);
    const bh = h - 5;
    if (!pressed) {
      ctx.save();
      ctx.shadowColor = 'rgba(80,40,90,0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      roundRectPath(ctx, x, y + lip, w, bh - lip + 2, r);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.restore();
    }
    roundRectPath(ctx, x, y + lip, w, bh - lip + 2, r);
    ctx.fillStyle = dark;
    ctx.fill();
    roundRectPath(ctx, x, y, w, bh - lip + 2, r);
    const g = ctx.createLinearGradient(0, y, 0, y + bh - lip);
    g.addColorStop(0, light);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, mix(mid, dark, 0.35));
    ctx.fillStyle = g;
    ctx.fill();
    // Glossy top band.
    ctx.save();
    roundRectPath(ctx, x, y, w, bh - lip + 2, r);
    ctx.clip();
    roundRectPath(ctx, x + 8, y + 4, w - 16, (bh - lip) * 0.42, r * 0.7);
    const gl = ctx.createLinearGradient(0, y + 4, 0, y + 4 + (bh - lip) * 0.42);
    gl.addColorStop(0, 'rgba(255,255,255,0.65)');
    gl.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = gl;
    ctx.fill();
    ctx.restore();
    roundRectPath(ctx, x + 1, y + 1, w - 2, bh - lip, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  btnCache.set(key, tex);
  return tex;
}

export function roundButtonTexture(d, color = 'white', pressed = false) {
  return buttonTexture(d, d, color, pressed);
}

const panelCache = new Map();

export function panelTexture(w, h, tint = '#fffaf3') {
  const key = `${w}x${h}:${tint}`;
  if (panelCache.has(key)) return panelCache.get(key);
  const pad = 48;
  const tex = paint(w + pad * 2, h + pad * 2, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(90,50,110,0.32)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    roundRectPath(ctx, pad, pad, w, h, 34);
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.restore();
    roundRectPath(ctx, pad, pad, w, h, 34);
    const g = ctx.createLinearGradient(0, pad, 0, pad + h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, mix(tint, '#f0dcc6', 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    roundRectPath(ctx, pad + 8, pad + 8, w - 16, h - 16, 26);
    ctx.strokeStyle = 'rgba(240,170,200,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
    roundRectPath(ctx, pad + 1.5, pad + 1.5, w - 3, h - 3, 33);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  panelCache.set(key, tex);
  return tex;
}

export const PILL_PAD = 16;

export function pillTexture(w, h, color = '#ffffff', alpha = 0.78) {
  const p = PILL_PAD;
  return paint(w + p * 2, h + p * 2, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(70,50,110,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    roundRectPath(ctx, p, p, w, h, h / 2);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
    ctx.restore();
    roundRectPath(ctx, p + 1, p + 1, w - 2, h - 2, h / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

export function barTexture(w, h, fill) {
  return paint(w, h, (ctx) => {
    roundRectPath(ctx, 0, 0, w, h, h / 2);
    if (fill) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffd1e6');
      g.addColorStop(0.5, '#ff7fb2');
      g.addColorStop(1, '#e85d95');
      ctx.fillStyle = g;
      ctx.fill();
      roundRectPath(ctx, 3, 2, w - 6, h * 0.38, h * 0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(120,80,140,0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

export function paintTitle() {
  const w = 560;
  const h = 290;
  return paint(w, h, (ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const line = (text, y, size, colors) => {
      ctx.font = `700 ${size}px ${FONT}`;
      ctx.lineJoin = 'round';
      // Soft glow: draw the letters far off-canvas and shift only their shadow back, so we get
      // a feathered halo with no solid edge.
      const off = 4000;
      ctx.save();
      ctx.shadowColor = 'rgba(120,60,150,0.38)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = off;
      ctx.shadowOffsetY = 6;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = size * 0.2;
      ctx.strokeText(text, w / 2 - off, y);
      ctx.restore();
      // Slim outline + white rim.
      ctx.strokeStyle = 'rgba(138,91,184,0.85)';
      ctx.lineWidth = size * 0.21;
      ctx.strokeText(text, w / 2, y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size * 0.15;
      ctx.strokeText(text, w / 2, y);
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillText(text, w / 2, y);
      // Glossy highlight on the upper half of the letters. Drawn as text (not a rect with
      // source-atop) so it only touches the glyphs and never the neighbouring line's glow.
      const gl = ctx.createLinearGradient(0, y - size / 2, 0, y);
      gl.addColorStop(0, 'rgba(255,255,255,0.55)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillText(text, w / 2, y);
    };
    line('Easter Egg', 102, 76, ['#ffd1e8', '#ff7fb6', '#f25c9b']);
    line('Catcher', 188, 86, ['#fff3a6', '#ffc94d', '#ff9f43']);
    // Little decorative eggs.
    const egg = (x, y, rot, c1, c2) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.shadowColor = 'rgba(110,50,120,0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      eggPath(ctx, 0, 0, 30, 38);
      const g = ctx.createRadialGradient(-6, -9, 1, 0, 0, 22);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.quadraticCurveTo(0, 7, 14, 2);
      ctx.stroke();
      specular(ctx, -6, -8, 4, 6, -0.4, 0.9);
      ctx.restore();
    };
    egg(70, 90, -0.4, '#d9f1ff', '#6fb3f0');
    egg(492, 180, 0.35, '#e9ffd9', '#7fd08a');
  });
}

// ---------- registry ----------

export const Tex = {};

export function buildUiTextures() {
  Object.assign(Tex, {
    glow: paintGlow(),
    dot: paintDot(),
    sparkle: paintSparkle(),
    star: paintStar(),
    heart: paintHeartFx(),
    confetti: paintConfetti(),
    shard: paintShard(),
    ring: paintRing(),
    hudHeart: paintHudHeart(true),
    hudHeartEmpty: paintHudHeart(false),
    eggIcon: paintEggIcon(),
    title: paintTitle(),
  });
}
