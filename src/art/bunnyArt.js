import { paint, rgba, mix, shadeBlob, softEllipse, specular, starPath, heartPath } from './paint.js';
import { FUR_PALETTES, BASKET_PALETTES } from '../config.js';

// Bunny parts are painted separately so the rig can animate them (squash, lean, ear physics).
// Coordinates in comments are "painted units" relative to the feet (0, 0).

function fluffyEllipse(ctx, cx, cy, rx, ry, bumps = 22, amount = 0.035, skip = null) {
  ctx.beginPath();
  const steps = bumps * 6;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const fluff = skip && skip(a) ? 0 : Math.abs(Math.sin((a * bumps) / 2)) * amount;
    const x = cx + Math.cos(a) * rx * (1 + fluff);
    const y = cy + Math.sin(a) * ry * (1 + fluff);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function furStrokes(ctx, cx, cy, rx, ry, color, count, seed = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  for (let i = 0; i < count; i++) {
    const a = ((i * 137.5 + seed * 31) % 360) * (Math.PI / 180);
    const d = 0.55 + ((i * 53) % 40) / 100;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    ctx.stroke();
  }
}

// Each part texture has extra padding around it so its soft shadow fades out fully.
export const PART_ANCHORS = {
  body: [0.5, 118.4 / 136],
  head: [0.5, 0.5],
  ear: [0.5, 0.913],
  foot: [0.5, 0.702],
  paw: [0.5, 0.475],
  basketFront: [95 / 190, 30 / 120],
};

function paintBody(p) {
  return paint(140, 136, (ctx) => {
    ctx.translate(8, 8);
    const cx = 62;
    const cy = 60;
    ctx.save();
    ctx.shadowColor = rgba(p.deep, 0.35);
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    fluffyEllipse(ctx, cx, cy, 52, 50, 18, 0.04);
    ctx.fillStyle = p.base;
    ctx.fill();
    ctx.restore();
    fluffyEllipse(ctx, cx, cy, 52, 50, 18, 0.04);
    shadeBlob(ctx, cx, cy, 52, 50, { light: p.light, shade: p.deep, lightA: 0.7, shadeA: 0.45 });
    // Belly patch.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 32, 34, 0, 0, Math.PI * 2);
    const bg = ctx.createRadialGradient(cx - 6, cy, 2, cx, cy + 10, 36);
    bg.addColorStop(0, p.belly);
    bg.addColorStop(0.75, rgba(p.belly, 0.85));
    bg.addColorStop(1, rgba(p.belly, 0));
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();
    furStrokes(ctx, cx, cy, 50, 48, rgba(p.shade, 0.35), 26, 3);
  });
}

function paintHead(p) {
  // Head centre ends up in the middle of the 176x160 texture.
  return paint(176, 160, (ctx) => {
    ctx.translate(10, 8);
    const cx = 78;
    const cy = 72;
    ctx.save();
    ctx.shadowColor = rgba(p.deep, 0.35);
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    // Fluff only on the cheeks and crown for a chubby silhouette.
    fluffyEllipse(ctx, cx, cy, 66, 57, 26, 0.045, (a) => a > 0.6 && a < 2.5);
    ctx.fillStyle = p.base;
    ctx.fill();
    ctx.restore();
    fluffyEllipse(ctx, cx, cy, 66, 57, 26, 0.045, (a) => a > 0.6 && a < 2.5);
    shadeBlob(ctx, cx, cy, 66, 57, { light: p.light, shade: p.deep, lightA: 0.75, shadeA: 0.42 });
    // Muzzle: a lighter puff around the nose and mouth.
    softEllipse(ctx, cx, cy + 22, 30, 20, p.belly, 0.95);
    softEllipse(ctx, cx - 14, cy + 22, 16, 13, p.light, 0.6);
    softEllipse(ctx, cx + 14, cy + 22, 16, 13, p.light, 0.6);
    // Crown tuft.
    ctx.fillStyle = p.base;
    for (const [x, y, r] of [[-8, -56, 8], [2, -59, 9], [11, -55, 7]]) {
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    softEllipse(ctx, cx - 2, cy - 58, 9, 5, p.light, 0.8);
    furStrokes(ctx, cx, cy, 64, 54, rgba(p.shade, 0.3), 34, 7);
    specular(ctx, cx - 30, cy - 30, 18, 10, -0.6, 0.35);
  });
}

function paintEar(p, flip) {
  // 44x110 ear (plus padding), base at bottom centre.
  return paint(56, 120, (ctx) => {
    ctx.translate(6, 4);
    ctx.save();
    if (flip) {
      ctx.translate(44, 0);
      ctx.scale(-1, 1);
    }
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(22, 108);
      ctx.bezierCurveTo(4, 96, 2, 40, 12, 14);
      ctx.bezierCurveTo(16, 3, 30, 2, 34, 14);
      ctx.bezierCurveTo(42, 40, 40, 96, 22, 108);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = rgba(p.deep, 0.3);
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    outline();
    ctx.fillStyle = p.base;
    ctx.fill();
    ctx.restore();
    outline();
    const g = ctx.createLinearGradient(4, 0, 40, 0);
    g.addColorStop(0, rgba(p.light, 0.75));
    g.addColorStop(0.5, rgba(p.base, 0));
    g.addColorStop(1, rgba(p.deep, 0.4));
    ctx.fillStyle = g;
    ctx.fill();
    // Inner ear.
    ctx.beginPath();
    ctx.moveTo(22, 96);
    ctx.bezierCurveTo(12, 84, 11, 40, 17, 20);
    ctx.bezierCurveTo(20, 12, 26, 12, 28, 20);
    ctx.bezierCurveTo(33, 40, 32, 84, 22, 96);
    ctx.closePath();
    const ig = ctx.createLinearGradient(0, 14, 0, 100);
    ig.addColorStop(0, mix(p.inner, '#ffffff', 0.25));
    ig.addColorStop(1, mix(p.inner, '#c2547a', 0.25));
    ctx.fillStyle = ig;
    ctx.fill();
    softEllipse(ctx, 20, 46, 4, 18, '#ffffff', 0.45);
    ctx.restore();
  });
}

function paintFoot(p) {
  return paint(62, 42, (ctx) => {
    ctx.translate(5, 4);
    ctx.save();
    ctx.shadowColor = rgba(p.deep, 0.35);
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.ellipse(26, 17, 23, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.base;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(26, 17, 23, 13, 0, 0, Math.PI * 2);
    shadeBlob(ctx, 26, 17, 23, 13, { light: p.light, shade: p.deep, lightA: 0.7, shadeA: 0.35 });
    ctx.strokeStyle = rgba(p.deep, 0.45);
    ctx.lineWidth = 1.4;
    for (const x of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(26 + x, 24);
      ctx.lineTo(26 + x * 0.9, 28.5);
      ctx.stroke();
    }
  });
}

function paintPaw(p) {
  return paint(46, 40, (ctx) => {
    ctx.translate(5, 4);
    ctx.save();
    ctx.shadowColor = rgba(p.deep, 0.4);
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.ellipse(18, 15, 14, 11.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.base;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(18, 15, 14, 11.5, 0, 0, Math.PI * 2);
    shadeBlob(ctx, 18, 15, 14, 11.5, { light: p.light, shade: p.deep, lightA: 0.7, shadeA: 0.3 });
    ctx.strokeStyle = rgba(p.deep, 0.4);
    ctx.lineWidth = 1.2;
    for (const x of [-4, 4]) {
      ctx.beginPath();
      ctx.moveTo(18 + x, 20);
      ctx.lineTo(18 + x, 24.5);
      ctx.stroke();
    }
  });
}

function paintTail(p) {
  return paint(44, 44, (ctx) => {
    fluffyEllipse(ctx, 22, 22, 17, 16, 12, 0.12);
    ctx.fillStyle = p.light;
    ctx.fill();
    fluffyEllipse(ctx, 22, 22, 17, 16, 12, 0.12);
    shadeBlob(ctx, 22, 22, 17, 16, { light: '#ffffff', shade: p.deep, lightA: 0.8, shadeA: 0.3 });
  });
}

function paintEye(sparkle) {
  return paint(30, 36, (ctx) => {
    const cx = 15;
    const cy = 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 15, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - 2, cy - 4, 1, cx, cy, 16);
    if (sparkle) {
      g.addColorStop(0, '#6a3fb0');
      g.addColorStop(0.6, '#3a1c6e');
      g.addColorStop(1, '#1d0d3a');
    } else {
      g.addColorStop(0, '#4a3446');
      g.addColorStop(0.6, '#24151f');
      g.addColorStop(1, '#120a10');
    }
    ctx.fillStyle = g;
    ctx.fill();
    // Iris glow at the bottom.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12, 15, 0, 0, Math.PI * 2);
    ctx.clip();
    softEllipse(ctx, cx, cy + 10, 10, 6, sparkle ? '#ff8fe0' : '#9a6a8a', 0.8);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    if (sparkle) {
      starPath(ctx, cx + 3, cy - 5, 7, 0.32, 4, 0);
      ctx.fill();
      starPath(ctx, cx - 4, cy + 6, 3.5, 0.32, 4, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx + 3.5, cy - 6, 4.6, 5.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 4, cy + 6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function paintNose(p) {
  return paint(20, 16, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.quadraticCurveTo(10, 1, 16, 4);
    ctx.quadraticCurveTo(15, 9, 10, 12);
    ctx.quadraticCurveTo(5, 9, 4, 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 2, 0, 12);
    g.addColorStop(0, mix(p.inner, '#ffffff', 0.15));
    g.addColorStop(1, mix(p.inner, '#b83c6a', 0.35));
    ctx.fillStyle = g;
    ctx.fill();
    specular(ctx, 8.5, 4.5, 2.6, 1.5, 0, 0.9);
  });
}

function paintCheek(p) {
  return paint(30, 18, (ctx) => softEllipse(ctx, 15, 9, 14, 8, p.inner, 0.55));
}

function paintShadow() {
  return paint(150, 34, (ctx) => softEllipse(ctx, 75, 17, 72, 15, '#2f5a1e', 0.42));
}

// ---------- basket ----------

const RIM_RX = 84;
const RIM_RY = 22;

/** Back of the basket: handle and dark interior. Texture origin: rim centre at (95, 120). */
function paintBasketBack(b) {
  return paint(190, 150, (ctx) => {
    const cx = 95;
    const cy = 120;
    // Handle (tilted slightly back so it doesn't hide the face).
    const handle = (w, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(cx - 74, cy - 2);
      ctx.bezierCurveTo(cx - 70, cy - 58, cx + 70, cy - 58, cx + 74, cy - 2);
      ctx.stroke();
    };
    handle(12, b.dark);
    handle(8, b.base);
    handle(3, b.light);
    ctx.strokeStyle = rgba(b.dark, 0.7);
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const mt = 1 - t;
      const x = mt ** 3 * (cx - 74) + 3 * mt * mt * t * (cx - 70) + 3 * mt * t * t * (cx + 70) + t ** 3 * (cx + 74);
      const y = mt ** 3 * (cy - 2) + 3 * mt * mt * t * (cy - 58) + 3 * mt * t * t * (cy - 58) + t ** 3 * (cy - 2);
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.stroke();
    }
    if (b.ribbon) {
      ctx.strokeStyle = rgba(b.ribbon, 0.85);
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 7]);
      handle(3, rgba(b.ribbon, 0.85));
      ctx.setLineDash([]);
    }
    // Interior.
    ctx.beginPath();
    ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy + 8, 4, cx, cy, RIM_RX);
    g.addColorStop(0, mix(b.inner, '#000000', 0.35));
    g.addColorStop(0.7, b.inner);
    g.addColorStop(1, b.dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(b.base, 0.35);
    ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + i * 2, RIM_RX - 6, RIM_RY - 6 + i, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Back rim (upper half of the ellipse).
    ctx.lineWidth = 10;
    ctx.strokeStyle = b.dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = b.base;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(b.light, 0.8);
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, RIM_RX, RIM_RY, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  });
}

/** Woven front wall + front rim. Texture origin: rim centre at (95, 30). */
function paintBasketFront(b) {
  return paint(190, 120, (ctx) => {
    const cx = 95;
    const cy = 30;
    const bottom = cy + 70;
    const wall = () => {
      ctx.beginPath();
      ctx.moveTo(cx - RIM_RX, cy);
      ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, Math.PI, 0, true);
      ctx.bezierCurveTo(cx + RIM_RX - 2, cy + 40, cx + 70, bottom, cx + 48, bottom);
      ctx.lineTo(cx - 48, bottom);
      ctx.bezierCurveTo(cx - 70, bottom, cx - RIM_RX + 2, cy + 40, cx - RIM_RX, cy);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = 'rgba(70,40,10,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    wall();
    ctx.fillStyle = b.base;
    ctx.fill();
    ctx.restore();

    ctx.save();
    wall();
    ctx.clip();
    // Cylindrical shading.
    const g = ctx.createLinearGradient(cx - RIM_RX, 0, cx + RIM_RX, 0);
    g.addColorStop(0, b.dark);
    g.addColorStop(0.32, b.light);
    g.addColorStop(0.55, b.base);
    g.addColorStop(1, b.dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 190, 112);
    // Weave: offset rows of rounded reeds that follow the curvature.
    for (let row = 0; row < 8; row++) {
      const y = cy + 12 + row * 8.5;
      const offset = row % 2 ? 9 : 0;
      for (let x = -RIM_RX - 10 + offset; x < RIM_RX + 10; x += 18) {
        const curve = (1 - (x / RIM_RX) ** 2) * 14;
        const yy = y + curve * (1 - row / 10);
        ctx.beginPath();
        ctx.ellipse(cx + x, yy, 8, 3.4, 0, 0, Math.PI * 2);
        const rg = ctx.createLinearGradient(0, yy - 3.4, 0, yy + 3.4);
        rg.addColorStop(0, rgba(b.light, 0.9));
        rg.addColorStop(1, rgba(b.dark, 0.55));
        ctx.fillStyle = rg;
        ctx.fill();
      }
    }
    // Vertical stakes.
    ctx.strokeStyle = rgba(b.dark, 0.45);
    ctx.lineWidth = 1.5;
    for (let x = -RIM_RX + 9; x < RIM_RX; x += 18) {
      ctx.beginPath();
      ctx.moveTo(cx + x, cy + 4);
      ctx.lineTo(cx + x * 0.72, bottom);
      ctx.stroke();
    }
    // Ambient occlusion at the bottom.
    const ao = ctx.createLinearGradient(0, cy + 30, 0, bottom);
    ao.addColorStop(0, 'rgba(60,30,10,0)');
    ao.addColorStop(1, 'rgba(60,30,10,0.4)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, 0, 190, 112);
    if (b.ribbon) {
      ctx.fillStyle = b.ribbon;
      ctx.beginPath();
      ctx.moveTo(cx - RIM_RX, cy + 26);
      ctx.quadraticCurveTo(cx, cy + 52, cx + RIM_RX, cy + 26);
      ctx.lineTo(cx + RIM_RX, cy + 36);
      ctx.quadraticCurveTo(cx, cy + 62, cx - RIM_RX, cy + 36);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(cx - RIM_RX, cy + 27);
      ctx.quadraticCurveTo(cx, cy + 53, cx + RIM_RX, cy + 27);
      ctx.lineTo(cx + RIM_RX, cy + 29);
      ctx.quadraticCurveTo(cx, cy + 55, cx - RIM_RX, cy + 29);
      ctx.fill();
    }
    ctx.restore();

    // Front rim: braided lower half of the ellipse.
    ctx.lineWidth = 12;
    ctx.strokeStyle = b.dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, RIM_RX, RIM_RY, 0, 0, Math.PI);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = b.base;
    ctx.stroke();
    ctx.strokeStyle = rgba(b.light, 0.95);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, RIM_RX, RIM_RY, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.strokeStyle = rgba(b.dark, 0.6);
    ctx.lineWidth = 1.3;
    for (let i = 1; i < 24; i++) {
      const a = (i / 24) * Math.PI;
      const x = cx + Math.cos(a) * RIM_RX;
      const y = cy + Math.sin(a) * RIM_RY;
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y - 3.5);
      ctx.lineTo(x + 2.5, y + 3.5);
      ctx.stroke();
    }
    if (b.ribbon) {
      // Bow at the front.
      const bx = cx;
      const by = cy + RIM_RY + 28;
      ctx.fillStyle = mix(b.ribbon, '#000000', 0.12);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + s * 18, by - 14, bx + s * 20, by);
        ctx.quadraticCurveTo(bx + s * 18, by + 12, bx, by);
        ctx.fill();
      }
      ctx.fillStyle = b.ribbon;
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
      specular(ctx, bx - 8, by - 4, 5, 3, -0.3, 0.6);
    }
    specular(ctx, cx - 44, cy + 14, 14, 4, -0.15, 0.55);
  });
}

// ---------- outfits ----------

function paintBow() {
  return paint(56, 36, (ctx) => {
    const cx = 28;
    const cy = 18;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.bezierCurveTo(cx + s * 10, cy - 18, cx + s * 28, cy - 14, cx + s * 25, cy);
      ctx.bezierCurveTo(cx + s * 28, cy + 14, cx + s * 10, cy + 18, cx, cy);
      const g = ctx.createLinearGradient(cx, cy - 14, cx, cy + 14);
      g.addColorStop(0, '#ff9cc2');
      g.addColorStop(1, '#e0558c');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y] of [[12, -6], [18, 3], [9, 6]]) {
        ctx.beginPath();
        ctx.arc(cx + s * x, cy + y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f06a9e';
    ctx.fill();
    specular(ctx, cx - 9, cy - 6, 6, 3, -0.4, 0.7);
  });
}

function paintCrown() {
  return paint(150, 48, (ctx) => {
    const cols = ['#ff9fc4', '#fff27a', '#b9a3ff', '#ffffff', '#8fd3ff', '#ffb38a'];
    ctx.strokeStyle = '#6fbf5a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 40);
    ctx.quadraticCurveTo(75, 0, 142, 40);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 75 + t * t * 142;
      const y = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 0 + t * t * 40;
      if (i % 2) {
        ctx.fillStyle = '#7fd06a';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 6, 3, -0.5 + t, 0, Math.PI * 2);
        ctx.fill();
      }
      const r = 8.5;
      ctx.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb627';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      specular(ctx, x - 3, y - 3, 4, 2.4, -0.4, 0.7);
    }
  });
}

function paintBowtie() {
  return paint(52, 30, (ctx) => {
    const cx = 26;
    const cy = 15;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + s * 22, cy - 11);
      ctx.quadraticCurveTo(cx + s * 26, cy, cx + s * 22, cy + 11);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, cy - 11, 0, cy + 11);
      g.addColorStop(0, '#7cc4ff');
      g.addColorStop(1, '#3f86d6');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [x, y] of [[9, -3], [16, 4], [17, -6]]) {
        ctx.beginPath();
        ctx.arc(cx + s * x, cy + y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2f73c0';
    ctx.fill();
  });
}

function paintSweat() {
  return paint(16, 22, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.quadraticCurveTo(15, 12, 13, 15);
    ctx.arc(8, 15, 5, 0, Math.PI);
    ctx.quadraticCurveTo(1, 12, 8, 2);
    const g = ctx.createLinearGradient(0, 2, 0, 20);
    g.addColorStop(0, '#e6f7ff');
    g.addColorStop(1, '#7cc8f5');
    ctx.fillStyle = g;
    ctx.fill();
    specular(ctx, 6.5, 13, 2, 3, 0, 0.9);
  });
}

function paintMiniHeart() {
  return paint(22, 20, (ctx) => {
    heartPath(ctx, 11, 11, 18);
    ctx.fillStyle = '#ff7aa8';
    ctx.fill();
    specular(ctx, 7, 7, 3, 2, -0.5, 0.8);
  });
}

const furCache = new Map();
const basketCache = new Map();
let shared = null;

export function bunnyTextures(furId, basketId) {
  if (!shared) {
    shared = {
      eye: paintEye(false),
      eyeSparkle: paintEye(true),
      shadow: paintShadow(),
      bow: paintBow(),
      crown: paintCrown(),
      bowtie: paintBowtie(),
      sweat: paintSweat(),
      miniHeart: paintMiniHeart(),
    };
  }
  if (!furCache.has(furId)) {
    const p = FUR_PALETTES[furId] || FUR_PALETTES.cream;
    furCache.set(furId, {
      palette: p,
      body: paintBody(p),
      head: paintHead(p),
      earL: paintEar(p, false),
      earR: paintEar(p, true),
      foot: paintFoot(p),
      paw: paintPaw(p),
      tail: paintTail(p),
      nose: paintNose(p),
      cheek: paintCheek(p),
    });
  }
  if (!basketCache.has(basketId)) {
    const b = BASKET_PALETTES[basketId] || BASKET_PALETTES.wicker;
    basketCache.set(basketId, { basketBack: paintBasketBack(b), basketFront: paintBasketFront(b) });
  }
  return { ...shared, ...furCache.get(furId), ...basketCache.get(basketId) };
}
