import { paint, rgba, mix, seeded, softEllipse, specular, eggPath } from './paint.js';

export const BG_W = 1200;
export const FAR_H = 300;
export const MID_H = 360; // headroom so the tallest canopies and their soft shadows aren't clipped
export const GROUND_H = 340; // tall enough to reach the bottom edge on long phones
export const GROUND_LIP = 46; // grass rises this far above the feet line
export const GROUND_TOP = 32; // transparent headroom in the ground texture for blades and the soft edge shadow

export const THEME_PALETTES = {
  meadow: {
    sky: ['#6ec1f2', '#a8dcff', '#e4f5ff', '#fff7e2'],
    sun: '#fff1b8',
    cloud: 0xffffff,
    hills: ['#c4e6d4', '#a9dcb0', '#90cf8c'],
    foliage: ['#86d47d', '#5cb85f', '#3f9a4a'],
    blossom: ['#ffc4dc', '#ffffff', '#ffd9ea', '#ffb0cf'],
    trunk: '#a77a57',
    fence: '#ffffff',
    grass: ['#9be37a', '#6cc653', '#4aa83e', '#3c8f35'],
    flowers: ['#ffffff', '#ffe066', '#ff9fc4', '#c9a8ff', '#8fd3ff'],
    tree: 'blossom',
  },
  forest: {
    sky: ['#7ccfc2', '#aee6d8', '#e4fbf0', '#f8fff2'],
    sun: '#f4ffd0',
    cloud: 0xf2fff9,
    hills: ['#b4dec9', '#8fcaa9', '#6cb88c'],
    foliage: ['#5cbf7f', '#3fa466', '#2c8551'],
    blossom: ['#c8ffd9', '#fff7a8', '#b9f0ff'],
    trunk: '#8b6347',
    fence: null,
    grass: ['#86d779', '#59bb5c', '#3d9b4b', '#2f7f40'],
    flowers: ['#fff7a8', '#c9f2ff', '#ffd1f0', '#ffffff'],
    tree: 'round',
    mushrooms: true,
  },
  candy: {
    sky: ['#f5a8d4', '#fbc8e6', '#fff0f8', '#fffaf0'],
    sun: '#fff6d8',
    cloud: 0xfff4fb,
    hills: ['#f6d4ef', '#e7c6f6', '#d4b8f4'],
    foliage: ['#ffa6d2', '#f582bd', '#e3639f'],
    blossom: ['#ffffff', '#c2ecff', '#fff3a6'],
    trunk: '#ffffff',
    fence: '#ffffff',
    grass: ['#b0f2d4', '#86e0bb', '#62c9a0', '#4bb08a'],
    flowers: ['#ff8fc0', '#ffe066', '#8fd3ff', '#c9a8ff', '#ffffff'],
    tree: 'lollipop',
  },
  sunset: {
    sky: ['#8f86d6', '#d39ac4', '#f9b9a0', '#ffe2a8'],
    sun: '#fff0b0',
    cloud: 0xffe6e0,
    hills: ['#d9a7c2', '#c491b6', '#a982ad'],
    foliage: ['#93c06a', '#74a957', '#5a8f47'],
    blossom: ['#ffd1a8', '#fff0c9', '#ffb3b3'],
    trunk: '#875846',
    fence: '#fff3e6',
    grass: ['#b4d466', '#8fbe4f', '#70a542', '#5a8c38'],
    flowers: ['#ffffff', '#ffd166', '#ff9f9f', '#f3b0ff'],
    tree: 'blossom',
  },
};

export function paintSky(theme) {
  const p = THEME_PALETTES[theme];
  return paint(4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, p.sky[0]);
    g.addColorStop(0.35, p.sky[1]);
    g.addColorStop(0.75, p.sky[2]);
    g.addColorStop(1, p.sky[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  }, 1);
}

export function paintSun(theme) {
  const p = THEME_PALETTES[theme];
  return paint(260, 260, (ctx) => {
    softEllipse(ctx, 130, 130, 128, 128, p.sun, 0.55);
    softEllipse(ctx, 130, 130, 64, 64, '#ffffff', 0.6);
    ctx.beginPath();
    ctx.arc(130, 130, 34, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(122, 122, 2, 130, 130, 36);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, p.sun);
    ctx.fillStyle = g;
    ctx.fill();
  }, 1);
}

export function paintRays() {
  return paint(400, 400, (ctx) => {
    ctx.translate(200, 200);
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      const g = ctx.createLinearGradient(0, 0, 200, 0);
      g.addColorStop(0, 'rgba(255,255,240,0.35)');
      g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(200, -18);
      ctx.lineTo(200, 18);
      ctx.closePath();
      ctx.fill();
    }
  }, 1);
}

export function paintCloud(seed) {
  const rnd = seeded(seed);
  const w = 220;
  const h = 110;
  const pad = 24; // room for the soft shadow so it never ends in a hard edge
  return paint(w + pad * 2, h + pad * 2, (ctx) => {
    ctx.translate(pad, pad);
    const puffs = [];
    const n = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = 40 + t * (w - 80);
      const r = 22 + Math.sin(t * Math.PI) * 22 + rnd() * 8;
      puffs.push([x, h - 26 - r * 0.55, r]);
    }
    const drawPuffs = () => {
      ctx.beginPath();
      for (const [x, y, r] of puffs) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.moveTo(30, h - 26);
      ctx.roundRect ? ctx.roundRect(28, h - 46, w - 56, 26, 13) : ctx.rect(28, h - 46, w - 56, 26);
    };
    ctx.save();
    ctx.shadowColor = 'rgba(120,150,200,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    drawPuffs();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    drawPuffs();
    ctx.save();
    ctx.clip();
    const g = ctx.createLinearGradient(0, 10, 0, h - 20);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.6, 'rgba(225,235,250,0.4)');
    g.addColorStop(1, 'rgba(190,205,235,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    for (const [x, y, r] of puffs) softEllipse(ctx, x - r * 0.25, y - r * 0.35, r * 0.6, r * 0.45, '#ffffff', 0.9);
    ctx.restore();
  }, 1.5);
}

function hillBand(ctx, w, baseY, amp, freq, phase, color, top) {
  ctx.beginPath();
  ctx.moveTo(0, FAR_H);
  for (let x = 0; x <= w; x += 8) {
    const y = baseY - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.3 + phase * 1.7));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, FAR_H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, baseY - amp, 0, FAR_H);
  g.addColorStop(0, top);
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fill();
}

export function paintFar(theme) {
  const p = THEME_PALETTES[theme];
  const rnd = seeded(theme.length * 97);
  return paint(BG_W, FAR_H, (ctx, w) => {
    hillBand(ctx, w, 150, 50, 0.006, 1.2, p.hills[0], mix(p.hills[0], '#ffffff', 0.45));
    // Tiny distant trees on the far ridge.
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w;
      const y = 150 - 50 * (0.6 * Math.sin(x * 0.006 + 1.2) + 0.4 * Math.sin(x * 0.0138 + 2.04)) + 8;
      ctx.fillStyle = rgba(mix(p.hills[1], '#3a6a5a', 0.25), 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    hillBand(ctx, w, 200, 42, 0.0085, 4.0, p.hills[1], mix(p.hills[1], '#ffffff', 0.35));
    hillBand(ctx, w, 250, 34, 0.011, 2.2, p.hills[2], mix(p.hills[2], '#ffffff', 0.3));
    // Atmospheric haze toward the horizon, applied only on top of the hills (source-atop)
    // so the transparent sky part of the layer never gets a visible band.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const haze = ctx.createLinearGradient(0, 80, 0, FAR_H);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, FAR_H);
    ctx.restore();
  }, 1.25);
}

// ---------- mid layer props ----------

function canopy(ctx, x, y, r, p, rnd) {
  const blobs = [[0, 0, 1], [-0.6, 0.25, 0.7], [0.6, 0.25, 0.72], [-0.3, -0.45, 0.68], [0.35, -0.4, 0.66], [0, 0.4, 0.75]];
  ctx.save();
  ctx.shadowColor = 'rgba(40,80,40,0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * r, y + by * r, br * r, 0, Math.PI * 2);
    ctx.fillStyle = p.foliage[1];
    ctx.fill();
  }
  ctx.restore();
  for (const [bx, by, br] of blobs) {
    const cx = x + bx * r;
    const cy = y + by * r;
    const g = ctx.createRadialGradient(cx - br * r * 0.4, cy - br * r * 0.45, 2, cx, cy, br * r);
    g.addColorStop(0, mix(p.foliage[0], '#ffffff', 0.25));
    g.addColorStop(0.6, p.foliage[0]);
    g.addColorStop(1, p.foliage[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, br * r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.tree === 'blossom' || p.tree === 'round') {
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * 1.1;
      const bx = x + Math.cos(a) * d;
      const by = y + Math.sin(a) * d * 0.85;
      ctx.fillStyle = p.blossom[i % p.blossom.length];
      ctx.globalAlpha = p.tree === 'round' ? 0.75 : 0.95;
      ctx.beginPath();
      ctx.arc(bx, by, 2.6 + rnd() * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function tree(ctx, x, groundY, h, r, p, rnd) {
  const trunkW = r * 0.28;
  const g = ctx.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
  g.addColorStop(0, mix(p.trunk, '#ffffff', 0.2));
  g.addColorStop(1, mix(p.trunk, '#000000', 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - trunkW * 0.7, groundY);
  ctx.quadraticCurveTo(x - trunkW * 0.4, groundY - h * 0.5, x - trunkW * 0.35, groundY - h + r * 0.4);
  ctx.lineTo(x + trunkW * 0.35, groundY - h + r * 0.4);
  ctx.quadraticCurveTo(x + trunkW * 0.4, groundY - h * 0.5, x + trunkW * 0.7, groundY);
  ctx.closePath();
  ctx.fill();
  canopy(ctx, x, groundY - h, r, p, rnd);
}

function lollipop(ctx, x, groundY, h, r, p) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, groundY - h, 8, h);
  ctx.strokeStyle = '#ff8fbf';
  ctx.lineWidth = 3;
  for (let y = groundY - h; y < groundY; y += 14) {
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 8);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(160,60,120,0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.arc(x, groundY - h, r, 0, Math.PI * 2);
  ctx.fillStyle = p.foliage[0];
  ctx.fill();
  ctx.restore();
  const cols = [p.foliage[0], '#ffffff', p.blossom[1], '#ffffff'];
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, groundY - h, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = cols[i % cols.length];
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const rr = (a / (Math.PI * 4)) * r;
      const px = x + Math.cos(a + i * 0.6) * rr;
      const py = groundY - h + Math.sin(a + i * 0.6) * rr;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, groundY - h, r, 0, Math.PI * 2);
  shadeAround(ctx, x, groundY - h, r);
  specular(ctx, x - r * 0.4, groundY - h - r * 0.45, r * 0.3, r * 0.18, -0.6, 0.7);
}

function shadeAround(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.25)');
  g.addColorStop(0.7, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(120,40,90,0.3)');
  ctx.fillStyle = g;
  ctx.fill();
}

function bush(ctx, x, y, w, p, rnd) {
  const h = w * 0.55;
  const blobs = [[-0.3, 0.1, 0.42], [0.05, -0.15, 0.5], [0.35, 0.08, 0.4]];
  ctx.save();
  ctx.shadowColor = 'rgba(30,70,30,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * w, y - h * 0.5 + by * h, br * w * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = p.foliage[1];
    ctx.fill();
  }
  ctx.restore();
  for (const [bx, by, br] of blobs) {
    const cx = x + bx * w;
    const cy = y - h * 0.5 + by * h;
    const rr = br * w * 0.6;
    const g = ctx.createRadialGradient(cx - rr * 0.4, cy - rr * 0.5, 1, cx, cy, rr);
    g.addColorStop(0, mix(p.foliage[0], '#ffffff', 0.3));
    g.addColorStop(0.6, p.foliage[0]);
    g.addColorStop(1, p.foliage[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = p.flowers[Math.floor(rnd() * p.flowers.length)];
    ctx.beginPath();
    ctx.arc(x + (rnd() - 0.5) * w * 0.8, y - h * (0.2 + rnd() * 0.6), 2.5 + rnd() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function nestedEgg(ctx, x, y, color, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  softEllipse(ctx, 0, 11, 13, 4, '#2d5a1e', 0.4);
  eggPath(ctx, 0, 0, 18, 23);
  const g = ctx.createRadialGradient(-4, -6, 1, 0, 0, 14);
  g.addColorStop(0, mix(color, '#ffffff', 0.6));
  g.addColorStop(1, mix(color, '#000000', 0.12));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.quadraticCurveTo(0, 3, 9, 0);
  ctx.stroke();
  specular(ctx, -3, -5, 3, 4, -0.4, 0.8);
  ctx.restore();
}

function fence(ctx, w, y, color, candy) {
  for (let x = 6; x < w; x += 30) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, mix(color, '#9aa8b8', 0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 44);
    ctx.lineTo(x + 8, y - 54);
    ctx.lineTo(x + 16, y - 44);
    ctx.lineTo(x + 16, y);
    ctx.closePath();
    ctx.fill();
    if (candy) {
      ctx.strokeStyle = '#ff8fbf';
      ctx.lineWidth = 3;
      for (let yy = y - 44; yy < y; yy += 12) {
        ctx.beginPath();
        ctx.moveTo(x, yy + 8);
        ctx.lineTo(x + 16, yy);
        ctx.stroke();
      }
    }
  }
  for (const yy of [y - 34, y - 14]) {
    ctx.fillStyle = mix(color, '#9aa8b8', 0.2);
    ctx.fillRect(0, yy, w, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, yy, w, 1.5);
  }
}

function mushroom(ctx, x, y, s) {
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 5 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - 17 * s, 14 * s, 9 * s, 0, Math.PI, 0);
  const g = ctx.createRadialGradient(x - 4 * s, y - 22 * s, 1, x, y - 17 * s, 14 * s);
  g.addColorStop(0, '#ff9a9a');
  g.addColorStop(1, '#e0455a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[-6, -20, 2.4], [3, -23, 2], [8, -18, 1.8]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintMid(theme) {
  const p = THEME_PALETTES[theme];
  const rnd = seeded(theme.length * 131 + 7);
  return paint(BG_W, MID_H, (ctx, w, h) => {
    const gy = h - 6;
    if (p.fence) fence(ctx, w, gy - 8, p.fence, theme === 'candy');
    // Trees kept toward the sides so the centre of the sky stays open.
    const treeSpots = [[150, 230, 66], [300, 180, 54], [420, 120, 40], [780, 130, 42], [900, 190, 56], [1060, 236, 68]];
    for (const [x, th, r] of treeSpots) {
      if (p.tree === 'lollipop') lollipop(ctx, x, gy, th * 0.9, r * 0.75, p);
      else tree(ctx, x, gy, th, r, p, rnd);
    }
    const bushSpots = [80, 230, 370, 500, 650, 720, 850, 980, 1130];
    for (const x of bushSpots) bush(ctx, x + rnd() * 20, gy + 4, 70 + rnd() * 40, p, rnd);
    if (p.mushrooms) for (const x of [190, 460, 700, 960]) mushroom(ctx, x, gy + 2, 1 + rnd() * 0.4);
    const eggCols = ['#ffb3d0', '#8ab8ff', '#ffe580', '#9cebcb', '#d2b8ff'];
    for (const [i, x] of [250, 545, 690, 1010, 120].entries()) nestedEgg(ctx, x, gy - 8, eggCols[i], (rnd() - 0.5) * 0.6);
    // Slight haze so the mid layer sits behind the gameplay (only over painted props).
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const haze = ctx.createLinearGradient(0, 0, 0, h);
    haze.addColorStop(0, 'rgba(255,255,255,0.12)');
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }, 1.25);
}

export function paintGround(theme) {
  const p = THEME_PALETTES[theme];
  const rnd = seeded(theme.length * 17 + 3);
  return paint(BG_W, GROUND_H, (ctx, w, h) => {
    const top = GROUND_TOP;
    ctx.save();
    ctx.shadowColor = 'rgba(30,70,20,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = -2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, top + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.051) * 3);
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, p.grass[0]);
    g.addColorStop(0.18, p.grass[1]);
    g.addColorStop(0.55, p.grass[2]);
    g.addColorStop(1, p.grass[3]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // Grass blades along the lip.
    for (let x = 0; x < w; x += 5) {
      const bh = 8 + rnd() * 14;
      const y = top + 6 + Math.sin(x * 0.02) * 4;
      ctx.strokeStyle = rnd() > 0.5 ? mix(p.grass[0], '#ffffff', 0.2) : p.grass[1];
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.quadraticCurveTo(x + 2, y - bh * 0.5, x + (rnd() - 0.5) * 8, y - bh);
      ctx.stroke();
    }
    // Clover and tufts.
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w;
      const y = top + 30 + rnd() * (h - 60);
      ctx.fillStyle = rgba(mix(p.grass[2], '#ffffff', 0.25), 0.55);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Little flowers.
    for (let i = 0; i < 60; i++) {
      const x = rnd() * w;
      const y = top + 14 + rnd() * (h - 40) * (rnd() * 0.7 + 0.1);
      const c = p.flowers[Math.floor(rnd() * p.flowers.length)];
      const r = 2.6 + rnd() * 2;
      ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb627';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Soft light falloff toward the bottom, only over the grass itself (source-atop) so the
    // transparent strip above the blades never gets a visible edge.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const shade = ctx.createLinearGradient(0, top, 0, h);
    shade.addColorStop(0, 'rgba(255,255,220,0.18)');
    shade.addColorStop(0.3, 'rgba(255,255,220,0)');
    shade.addColorStop(1, 'rgba(20,50,20,0.18)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }, 1.25);
}

export function paintPetal() {
  return paint(16, 12, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.quadraticCurveTo(8, -2, 14, 6);
    ctx.quadraticCurveTo(8, 12, 2, 6);
    const g = ctx.createLinearGradient(0, 0, 16, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ffc2da');
    ctx.fillStyle = g;
    ctx.fill();
  });
}

export function paintFirefly() {
  return paint(24, 24, (ctx) => {
    softEllipse(ctx, 12, 12, 11, 11, '#f6ffb0', 0.8);
    softEllipse(ctx, 12, 12, 3, 3, '#ffffff', 1);
  });
}
