import { DESIGN } from '../config.js';

// World units: the design is 540 units wide; taller phones simply see more sky.

export const Layout = {
  scale: 1,
  W: DESIGN.width,
  H: DESIGN.height,
  cx: DESIGN.width / 2,
  fieldL: 0,
  fieldR: DESIGN.width,
  groundY: DESIGN.height - DESIGN.groundOffset,
  safeTop: 0,
  safeBottom: 0,
};

function readSafeArea() {
  const el = document.getElementById('safe-probe');
  if (!el) return { top: 0, bottom: 0 };
  const cs = getComputedStyle(el);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

export function computeLayout(screenW, screenH) {
  const safe = readSafeArea();
  const scale = Math.min(screenW / DESIGN.width, screenH / DESIGN.minHeight);
  const W = screenW / scale;
  const H = screenH / scale;
  const fieldW = Math.min(W, DESIGN.maxFieldWidth);
  Object.assign(Layout, {
    scale,
    W,
    H,
    cx: W / 2,
    fieldL: (W - fieldW) / 2,
    fieldR: (W + fieldW) / 2,
    safeTop: safe.top / scale,
    safeBottom: safe.bottom / scale,
  });
  Layout.groundY = H - DESIGN.groundOffset - Layout.safeBottom * 0.5;
  return Layout;
}
