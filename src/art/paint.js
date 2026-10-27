import { Texture, CanvasSource } from 'pixi.js';

// Low-level painting helpers: every sprite in the game is painted once onto a canvas with
// gradients, highlights and soft shadows, then uploaded as a texture. Textures carry their
// resolution so sprites keep logical (world-unit) sizes.

let RES = 2;
export function setPaintResolution(r) { RES = r; }
export function getPaintResolution() { return RES; }

export const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

export function paint(w, h, draw, res = RES) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * res));
  c.height = Math.max(1, Math.ceil(h * res));
  // Create the source *before* drawing: CanvasSource may resize the canvas (float rounding of
  // width * resolution), and resizing a canvas wipes its pixels.
  const source = new CanvasSource({ resource: c, resolution: res });
  const ctx = c.getContext('2d');
  ctx.scale(c.width / w, c.height / h);
  scaleShadows(ctx, c.width / w);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx, w, h);
  return new Texture({ source });
}

/**
 * Canvas shadow blur/offsets are in device pixels and ignore the transform, so at high paint
 * resolutions shadows come out tight and hard-edged. Make them use logical units like everything else.
 */
function scaleShadows(ctx, k) {
  const proto = Object.getPrototypeOf(ctx);
  for (const prop of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY']) {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d?.set) continue;
    Object.defineProperty(ctx, prop, {
      configurable: true,
      get: () => d.get.call(ctx) / k,
      set: (v) => d.set.call(ctx, v * k),
    });
  }
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(h1, h2, t) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (Math.round(f(5) * 255) << 16) | (Math.round(f(3) * 255) << 8) | Math.round(f(1) * 255);
}

// ---------- shapes ----------

export function eggPath(ctx, cx, cy, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.bezierCurveTo(cx + hw * 0.76, cy - hh, cx + hw, cy - hh * 0.18, cx + hw, cy + hh * 0.22);
  ctx.bezierCurveTo(cx + hw, cy + hh * 0.74, cx + hw * 0.58, cy + hh, cx, cy + hh);
  ctx.bezierCurveTo(cx - hw * 0.58, cy + hh, cx - hw, cy + hh * 0.74, cx - hw, cy + hh * 0.22);
  ctx.bezierCurveTo(cx - hw, cy - hh * 0.18, cx - hw * 0.76, cy - hh, cx, cy - hh);
  ctx.closePath();
}

export function starPath(ctx, cx, cy, r, inner = 0.45, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.62, cy, cx - s * 0.5, cy - s * 0.52, cx, cy - s * 0.22);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.52, cx + s * 0.62, cy, cx, cy + s * 0.42);
  ctx.closePath();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Radial "toy" shading for a round blob: highlight top-left, warm shade bottom-right. */
export function shadeBlob(ctx, cx, cy, rx, ry, { light = '#ffffff', shade = '#000000', lightA = 0.55, shadeA = 0.3 } = {}) {
  const r = Math.max(rx, ry);
  const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, r * 0.05, cx, cy, r * 1.05);
  g.addColorStop(0, rgba(light, lightA));
  g.addColorStop(0.45, rgba(light, 0));
  g.addColorStop(0.78, rgba(shade, shadeA * 0.35));
  g.addColorStop(1, rgba(shade, shadeA));
  ctx.fillStyle = g;
  ctx.fill();
}

export function softEllipse(ctx, cx, cy, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function specular(ctx, cx, cy, rx, ry, rot = -0.5, alpha = 0.9) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
