import { Application } from 'pixi.js';
import { computeLayout, Layout } from './core/layout.js';
import { setPaintResolution } from './art/paint.js';
import { buildUiTextures } from './art/uiArt.js';
import { Game } from './game.js';
import { Audio } from './systems/audio.js';
import { Save } from './systems/save.js';

async function waitForFonts(timeoutMs = 2500) {
  if (!document.fonts?.load) return;
  const load = Promise.all([
    document.fonts.load('700 32px Fredoka'),
    document.fonts.load('600 32px Fredoka'),
  ]).catch(() => {});
  await Promise.race([load, new Promise((r) => setTimeout(r, timeoutMs))]);
}

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#bfe6ff',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2.5),
    powerPreference: 'high-performance',
  });
  document.body.appendChild(app.canvas);

  await waitForFonts();
  computeLayout(app.screen.width, app.screen.height);
  // Paint textures at roughly the final on-screen pixel density.
  setPaintResolution(Math.min(3, Math.max(1.25, Layout.scale * app.renderer.resolution)));
  buildUiTextures();

  const game = new Game(app);
  window.__game = game; // handy for debugging from the console

  let resizeQueued = false;
  const onResize = () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      app.resize();
      game.resize();
    });
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // Browsers only allow audio after a user gesture.
  const unlockAudio = () => {
    Audio.unlock();
    Audio.startMusic();
  };
  window.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: false });

  // Interruptions (calls, app switch, tab hidden): pause the run and silence audio.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
      Audio.suspend();
      Save.save();
    } else {
      Audio.resume();
    }
  });
  window.addEventListener('pagehide', () => Save.save());

  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.classList.add('hide');
    setTimeout(() => bootEl.remove(), 500);
  }
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('boot');
  if (el) el.querySelector('p').textContent = 'Could not start the game: ' + err.message;
});
