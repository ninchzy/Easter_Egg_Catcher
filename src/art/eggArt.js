import { paint, eggPath, starPath, heartPath, rgba, specular, softEllipse, FONT } from './paint.js';

export const EGG_W = 46;
export const EGG_H = 58;
const PAD = 10;

// ---------- decorative patterns (drawn inside the egg clip) ----------

const dots = (color) => (ctx, cx, cy, w, h) => {
  const rows = [[-0.36, [0]], [-0.18, [-0.26, 0.26]], [0.02, [-0.4, 0, 0.4]], [0.22, [-0.24, 0.24]], [0.4, [-0.4, 0, 0.4]]];
  for (const [ry, xs] of rows) {
    for (const rx of xs) {
      const x = cx + rx * w;
      const y = cy + ry * h;
      ctx.fillStyle = rgba('#3a5fa8', 0.18);
      ctx.beginPath();
      ctx.arc(x + 0.6, y + 0.9, w * 0.074, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const stripes = (ctx, cx, cy, w, h) => {
  for (let i = 0; i < 6; i++) {
    const y = cy - h * 0.36 + i * h * 0.15;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx - w, y);
    ctx.quadraticCurveTo(cx, y + h * 0.07, cx + w, y);
    ctx.stroke();
    ctx.strokeStyle = rgba('#d9578f', 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - w, y + 4.2);
    ctx.quadraticCurveTo(cx, y + 4.2 + h * 0.07, cx + w, y + 4.2);
    ctx.stroke();
  }
};

function flower(ctx, x, y, r, petal, center) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.36, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

const flowers = (ctx, cx, cy, w, h) => {
  const spots = [[0, -0.3, 7], [-0.3, -0.05, 6], [0.3, -0.06, 6.5], [0, 0.16, 7.5], [-0.28, 0.33, 5.5], [0.3, 0.33, 6]];
  for (const [x, y, r] of spots) flower(ctx, cx + x * w, cy + y * h, r, '#ffffff', '#ff9f43');
  ctx.fillStyle = rgba('#8bc34a', 0.9);
  for (const [x, y] of [[-0.12, -0.17], [0.16, 0.05], [-0.1, 0.42], [0.14, 0.45]]) {
    ctx.beginPath();
    ctx.ellipse(cx + x * w, cy + y * h, 3.2, 1.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
};

const zigzag = (ctx, cx, cy, w, h) => {
  const band = (y, color, width, amp) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const x = cx - w * 0.6 + (i * w * 1.2) / 12;
      const yy = y + (i % 2 === 0 ? -amp : amp);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  };
  band(cy - h * 0.2, '#ffffff', 3.4, 4.5);
  band(cy - h * 0.2 + 7, rgba('#2b8a68', 0.45), 1.3, 3);
  band(cy + h * 0.14, '#ffffff', 3.4, 4.5);
  band(cy + h * 0.14 + 7, rgba('#2b8a68', 0.45), 1.3, 3);
  ctx.fillStyle = '#fffbe0';
  for (const x of [-0.25, 0, 0.25]) {
    ctx.beginPath();
    ctx.arc(cx + x * w, cy - h * 0.38 + Math.abs(x) * 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + x * w, cy + h * 0.36, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const hearts = (ctx, cx, cy, w, h) => {
  const spots = [[0, -0.32, 9, '#ffffff'], [-0.27, -0.1, 8, '#ff8fc2'], [0.27, -0.1, 8, '#ffffff'], [0, 0.1, 10, '#ff8fc2'],
    [-0.3, 0.3, 8, '#ffffff'], [0.3, 0.3, 8, '#ff8fc2'], [0, 0.42, 6, '#ffffff']];
  for (const [x, y, s, c] of spots) {
    heartPath(ctx, cx + x * w, cy + y * h, s);
    ctx.fillStyle = c;
    ctx.fill();
  }
};

const BAND_COLORS = ['#ffadc6', '#ffcf9e', '#fff09a', '#b5f0c4', '#a6d8ff', '#cfb8ff', '#ffadc6'];
const bands = (ctx, cx, cy, w, h) => {
  const n = BAND_COLORS.length;
  for (let i = 0; i < n; i++) {
    const y0 = cy - h / 2 + (i * h) / n - 2;
    ctx.fillStyle = BAND_COLORS[i];
    ctx.beginPath();
    ctx.moveTo(cx - w, y0);
    ctx.quadraticCurveTo(cx, y0 + h * 0.08, cx + w, y0);
    ctx.lineTo(cx + w, y0 + h / n + 6);
    ctx.quadraticCurveTo(cx, y0 + h / n + 6 + h * 0.08, cx - w, y0 + h / n + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - w, y0);
    ctx.quadraticCurveTo(cx, y0 + h * 0.08, cx + w, y0);
    ctx.stroke();
  }
};

const goldOrnament = (ctx, cx, cy, w, h) => {
  ctx.fillStyle = 'rgba(255,248,200,0.75)';
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h * 0.06);
  ctx.quadraticCurveTo(cx, cy + h * 0.02, cx + w, cy - h * 0.06);
  ctx.lineTo(cx + w, cy + h * 0.12);
  ctx.quadraticCurveTo(cx, cy + h * 0.2, cx - w, cy + h * 0.12);
  ctx.fill();
  ctx.fillStyle = '#d99a00';
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * w * 0.15;
    const y = cy + h * 0.035 + Math.abs(i) * -0.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + 3, y);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 3, y);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(200,130,0,0.55)';
  ctx.lineWidth = 1.2;
  for (const y of [-0.24, 0.32]) {
    ctx.beginPath();
    ctx.moveTo(cx - w, cy + y * h);
    ctx.quadraticCurveTo(cx, cy + y * h + h * 0.07, cx + w, cy + y * h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,230,0.9)';
  for (const [x, y] of [[-0.2, -0.36], [0.2, -0.36], [0, -0.4], [-0.25, 0.42], [0.25, 0.42]]) {
    ctx.beginPath();
    ctx.arc(cx + x * w, cy + y * h, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
};

const RAINBOW = ['#ff6b8a', '#ffa94d', '#ffe14d', '#69db7c', '#4dabf7', '#9775fa'];
const rainbowSwirl = (ctx, cx, cy, w, h) => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.55);
  const bw = w * 0.24;
  for (let i = -6; i <= 6; i++) {
    ctx.fillStyle = RAINBOW[(i + 60) % RAINBOW.length];
    ctx.fillRect(i * bw, -h, bw + 0.5, h * 2);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y, r] of [[-0.2, -0.2, 2.4], [0.22, 0.05, 2], [-0.05, 0.3, 2.2], [0.1, -0.36, 1.6]]) {
    starPath(ctx, cx + x * w, cy + y * h, r * 2.2, 0.35, 4, 0);
    ctx.fill();
  }
};

const starry = (ctx, cx, cy, w, h) => {
  const stars = [[0, -0.3, 7], [-0.28, -0.05, 5], [0.26, -0.02, 6], [-0.05, 0.18, 8], [0.28, 0.32, 5], [-0.3, 0.34, 4.5]];
  for (const [x, y, r] of stars) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,230,120,0.9)';
    ctx.shadowBlur = 5;
    starPath(ctx, cx + x * w, cy + y * h, r, 0.46);
    ctx.fillStyle = '#ffe45c';
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y] of [[-0.15, -0.38], [0.15, -0.15], [-0.32, 0.12], [0.1, 0.42], [0.34, 0.15], [-0.12, 0.4]]) {
    ctx.beginPath();
    ctx.arc(cx + x * w, cy + y * h, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const mysteryMarks = (ctx, cx, cy, w, h) => {
  const swirl = ctx.createRadialGradient(cx, cy + h * 0.05, 2, cx, cy, w * 0.7);
  swirl.addColorStop(0, 'rgba(255,200,255,0.55)');
  swirl.addColorStop(1, 'rgba(255,200,255,0)');
  ctx.fillStyle = swirl;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3ff';
  ctx.font = `700 ${Math.round(h * 0.46)}px ${FONT}`;
  ctx.fillText('?', cx, cy + h * 0.06);
  ctx.font = `700 ${Math.round(h * 0.18)}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,230,255,0.7)';
  ctx.fillText('?', cx - w * 0.3, cy - h * 0.26);
  ctx.fillText('?', cx + w * 0.3, cy + h * 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y] of [[0.28, -0.25], [-0.3, 0.22], [0.05, -0.4]]) {
    starPath(ctx, cx + x * w, cy + y * h, 3.4, 0.3, 4, 0);
    ctx.fill();
  }
};

const giantPattern = (ctx, cx, cy, w, h) => {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h * 0.1);
  ctx.quadraticCurveTo(cx, cy - h * 0.02, cx + w, cy - h * 0.1);
  ctx.lineTo(cx + w, cy + h * 0.12);
  ctx.quadraticCurveTo(cx, cy + h * 0.2, cx - w, cy + h * 0.12);
  ctx.fill();
  for (let i = -2; i <= 2; i++) flower(ctx, cx + i * w * 0.2, cy + h * 0.035 + Math.abs(i) * -1, 5.5, '#ff8fab', '#ffd43b');
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[-0.25, -0.3], [0.25, -0.3], [0, -0.4], [-0.3, 0.32], [0.3, 0.32], [0, 0.4]]) {
    ctx.beginPath();
    ctx.arc(cx + x * w, cy + y * h, w * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h * 0.2);
  ctx.quadraticCurveTo(cx, cy - h * 0.12, cx + w, cy - h * 0.2);
  ctx.moveTo(cx - w, cy + h * 0.22);
  ctx.quadraticCurveTo(cx, cy + h * 0.3, cx + w, cy + h * 0.22);
  ctx.stroke();
};

const mudPattern = (ctx, cx, cy, w, h) => {
  const blobs = [[-0.2, -0.2, 9, '#5a3b22'], [0.22, 0.05, 11, '#5f4027'], [-0.12, 0.3, 8, '#4f331d'], [0.15, -0.36, 6, '#6b4a2f'], [-0.3, 0.06, 6, '#b08a62']];
  for (const [x, y, r, c] of blobs) {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = r * (0.75 + 0.35 * Math.sin(i * 2.3 + x * 10));
      const px = cx + x * w + Math.cos(a) * rr;
      const py = cy + y * h + Math.sin(a) * rr * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
  }
  // Drips from the top.
  ctx.fillStyle = '#4a301b';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy - h * 0.5);
  for (let i = 0; i <= 6; i++) {
    const x = cx - w * 0.5 + (i * w) / 6;
    const d = [8, 14, 6, 18, 9, 12, 7][i];
    ctx.quadraticCurveTo(x - 2, cy - h * 0.34 + d, x + 3, cy - h * 0.36);
  }
  ctx.lineTo(cx + w * 0.5, cy - h * 0.5);
  ctx.fill();
};

const STYLES = {
  blueDots: { base: '#8ab8ff', dark: '#5a86df', shade: '#2f4f99', pattern: dots('#ffffff') },
  pinkStripes: { base: '#ffb3d0', dark: '#f07fae', shade: '#a33a6c', pattern: stripes },
  yellowFlowers: { base: '#ffe580', dark: '#f5bd3a', shade: '#9c6d05', pattern: flowers },
  mintZigzag: { base: '#9cebcb', dark: '#55c99c', shade: '#1f7a5a', pattern: zigzag },
  lavenderHearts: { base: '#d2b8ff', dark: '#a283f0', shade: '#523a9e', pattern: hearts },
  pastelBands: { base: '#ffffff', dark: '#e8d8ff', shade: '#6a5a9a', pattern: bands },
  golden: { base: '#ffe680', dark: '#e3a300', shade: '#7a4d00', pattern: goldOrnament, gloss: 1, rim: '#fff3b0' },
  rainbow: { base: '#ffffff', dark: '#ffffff', shade: '#5a3c8c', pattern: rainbowSwirl, gloss: 1 },
  star: { base: '#7a8cff', dark: '#3c3db8', shade: '#1a1760', pattern: starry, gloss: 1, rim: '#b8c4ff' },
  mystery: { base: '#c08cff', dark: '#6b37c9', shade: '#2a1060', pattern: mysteryMarks, gloss: 0.9, rim: '#f0d0ff' },
  giant: { base: '#ffbe98', dark: '#f58a6a', shade: '#9c3d26', pattern: giantPattern },
  mud: { base: '#a07a55', dark: '#6e4e33', shade: '#2d1a0c', pattern: mudPattern, gloss: 0.25 },
};

function paintEggShape(ctx, cx, cy, w, h, st) {
  // Soft cast shadow / separation from the sky.
  ctx.save();
  ctx.shadowColor = rgba(st.shade, 0.35);
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  eggPath(ctx, cx, cy, w, h);
  ctx.fillStyle = st.base;
  ctx.fill();
  ctx.restore();

  ctx.save();
  eggPath(ctx, cx, cy, w, h);
  ctx.clip();
  const base = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  base.addColorStop(0, st.base);
  base.addColorStop(1, st.dark);
  ctx.fillStyle = base;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
  st.pattern(ctx, cx, cy, w, h);

  // Form shading: light top-left, core shadow bottom-right, ambient occlusion on the edge.
  const g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.24, 1, cx + w * 0.05, cy + h * 0.05, h * 0.68);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.42, 'rgba(255,255,255,0)');
  g.addColorStop(0.78, rgba(st.shade, 0.16));
  g.addColorStop(1, rgba(st.shade, 0.42));
  ctx.fillStyle = g;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);

  // Reflected light along the lower right edge.
  softEllipse(ctx, cx + w * 0.3, cy + h * 0.32, w * 0.22, h * 0.16, st.rim || '#ffffff', 0.28);

  eggPath(ctx, cx, cy, w, h);
  ctx.strokeStyle = rgba(st.shade, 0.22);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  const gloss = st.gloss ?? 0.85;
  specular(ctx, cx - w * 0.19, cy - h * 0.22, w * 0.14, h * 0.17, -0.45, 0.85 * gloss);
  specular(ctx, cx - w * 0.07, cy - h * 0.36, w * 0.05, w * 0.04, 0, 0.9 * gloss);
}

export function paintEgg(type, scale = 1) {
  const st = STYLES[type];
  const w = EGG_W * scale;
  const h = EGG_H * scale;
  return paint(w + PAD * 2, h + PAD * 2, (ctx) => {
    if (scale !== 1) {
      ctx.translate(PAD, PAD);
      ctx.scale(scale, scale);
      paintEggShape(ctx, EGG_W / 2, EGG_H / 2, EGG_W, EGG_H, st);
    } else {
      paintEggShape(ctx, PAD + w / 2, PAD + h / 2, w, h, st);
    }
  });
}

export function paintTwig() {
  return paint(84, 40, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(60,30,10,0.35)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    const g = ctx.createLinearGradient(0, 12, 0, 28);
    g.addColorStop(0, '#b98a5e');
    g.addColorStop(1, '#6d4527');
    ctx.strokeStyle = g;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(8, 26);
    ctx.quadraticCurveTo(40, 16, 76, 20);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34, 21);
    ctx.quadraticCurveTo(42, 10, 50, 6);
    ctx.moveTo(56, 19);
    ctx.lineTo(62, 30);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,230,190,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 24);
    ctx.quadraticCurveTo(40, 14.5, 74, 18);
    ctx.stroke();
    const leaf = (x, y, a) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const lg = ctx.createLinearGradient(0, -5, 0, 5);
      lg.addColorStop(0, '#9be36d');
      lg.addColorStop(1, '#4e9a35');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(7, -7, 16, 0);
      ctx.quadraticCurveTo(7, 7, 0, 0);
      ctx.fill();
      ctx.restore();
    };
    leaf(50, 7, -0.5);
    leaf(76, 20, 0.2);
    leaf(20, 23, 2.6);
  });
}

export function paintEggShadow() {
  return paint(64, 20, (ctx) => softEllipse(ctx, 32, 10, 30, 9, '#3c4a1e', 0.45));
}

export function paintAllEggs() {
  const tex = {};
  for (const id of Object.keys(STYLES)) tex[id] = paintEgg(id, id === 'giant' ? 1.45 : 1);
  tex.twig = paintTwig();
  tex.shadow = paintEggShadow();
  return tex;
}

export const EGG_BASE_COLORS = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [k, parseInt(v.dark.slice(1), 16)]),
);
