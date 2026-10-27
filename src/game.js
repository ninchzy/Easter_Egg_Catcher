import { Container, Graphics, Rectangle, Circle } from 'pixi.js';
import { Layout, computeLayout } from './core/layout.js';
import { Tweens } from './core/tween.js';
import {
  PLAYER, SCORE, COMBO, LIVES, POWERUPS, INTRODUCTIONS, ENDLESS, TIMED, THEMES, EFFECT_STYLES, levelConfig,
} from './config.js';
import { paintAllEggs, EGG_BASE_COLORS } from './art/eggArt.js';
import { Tex } from './art/uiArt.js';
import { Background } from './systems/background.js';
import { Effects } from './systems/effects.js';
import { Spawner } from './systems/spawner.js';
import { Save } from './systems/save.js';
import { Audio } from './systems/audio.js';
import { EggSystem } from './entities/eggs.js';
import { Bunny } from './entities/bunny.js';
import { Hud } from './ui/hud.js';
import { icon } from './ui/components.js';
import {
  MenuScreen, SettingsScreen, WardrobeScreen, PauseScreen, GameOverScreen, LevelCompleteScreen, Banner, Toasts,
} from './ui/screens.js';

const POINT_COLORS = {
  standard: [0xffffff, 0xd9578f],
  rare: [0xf3e8ff, 0x8a5bb8],
  special: [0xfff3a6, 0xe07b00],
};

const SPARKLE_TINT = { golden: [0xfff3a6, 0xffd43b], star: [0xc9d4ff, 0xffe45c], mystery: [0xe8c8ff, 0xc08cff], rainbow: [0xff8a8a, 0x74c0fc, 0x8ce99a, 0xfff07a] };

const MYSTERY_REWARDS = [
  { id: 'points', text: '+150 points!' },
  { id: 'life', text: 'Extra life!' },
  { id: 'mult', text: 'Double points!' },
  { id: 'slow', text: 'Slow time!' },
  { id: 'magnet', text: 'Egg magnet!' },
  { id: 'wide', text: 'Big basket!' },
];

/** Owns the scene graph and runs the game: input, rules, scoring, progression and screen flow. */
export class Game {
  constructor(app) {
    this.app = app;
    this.root = new Container();
    app.stage.addChild(this.root);
    app.stage.eventMode = 'static';

    this.eggTextures = paintAllEggs();
    this.bg = new Background();
    this.eggs = new EggSystem(this.eggTextures);
    this.fx = new Effects();
    this.bunny = new Bunny(this.eggTextures);
    this.spawner = new Spawner(this.eggs);

    this.world = new Container();
    this.world.addChild(this.bg.view, this.eggs.shadowLayer, this.fx.back, this.bunny, this.eggs.layer, this.fx.view);

    this.keys = { left: false, right: false };
    this.held = { left: new Set(), right: new Set() };
    this.tintOverlay = new Graphics();
    this.flash = new Graphics();
    this.flash.alpha = 0;
    this.controls = this.buildArrowControls();
    this.hud = new Hud({ onPause: () => this.pause() });
    this.banner = new Banner();
    this.toasts = new Toasts();

    this.menu = new MenuScreen(this);
    this.settings = new SettingsScreen(this);
    this.wardrobe = new WardrobeScreen(this);
    this.pauseScreen = new PauseScreen(this);
    this.gameOverScreen = new GameOverScreen(this);
    this.levelScreen = new LevelCompleteScreen(this);
    this.screens = [this.menu, this.wardrobe, this.levelScreen, this.gameOverScreen, this.pauseScreen, this.settings];

    this.root.addChild(this.world, this.tintOverlay, this.flash, this.controls, this.hud, this.banner, this.menu, this.wardrobe,
      this.levelScreen, this.gameOverScreen, this.pauseScreen, this.settings, this.toasts);

    this.phase = 'menu';
    this.mode = 'menu';
    this.paused = false;
    this.bx = Layout.cx;
    this.bvx = 0;
    this.targetX = this.bx;
    this.drag = null;
    this.power = {};
    this.shake = 0;
    this.trailTimer = 0;

    this.bindInput();
    this.applyCosmetics();
    this.resize();
    this.toMenu(true);

    app.ticker.add((ticker) => this.tick(ticker));
  }

  // ------------------------------------------------------------------ setup

  buildArrowControls() {
    const c = new Container();
    const make = (dir) => {
      const b = new Container();
      const g = new Graphics();
      g.circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.32 });
      g.circle(0, 0, 58).stroke({ width: 4, color: 0xffffff, alpha: 0.7 });
      g.circle(0, -4, 46).fill({ color: 0xffffff, alpha: 0.18 });
      const ic = icon(dir, 70, 0xffffff);
      ic.alpha = 0.95;
      b.addChild(g, ic);
      b.eventMode = 'static';
      b.hitArea = new Circle(0, 0, 76);
      const set = this.held[dir];
      const down = (e) => {
        set.add(e.pointerId);
        b.scale.set(0.92);
        b.alpha = 1;
      };
      const up = (e) => {
        set.delete(e.pointerId);
        if (!set.size) {
          b.scale.set(1);
          b.alpha = 0.85;
        }
      };
      b.on('pointerdown', down);
      b.on('pointerup', up);
      b.on('pointerupoutside', up);
      b.on('pointercancel', up);
      b.alpha = 0.85;
      return b;
    };
    this.leftBtn = make('left');
    this.rightBtn = make('right');
    c.addChild(this.leftBtn, this.rightBtn);
    return c;
  }

  bindInput() {
    const stage = this.app.stage;
    stage.on('pointerdown', (e) => {
      if (e.target !== stage) return; // a UI element handled it
      if (Save.settings.control !== 'drag' || this.paused) return;
      if (this.phase !== 'play' && this.phase !== 'intro') return;
      const p = this.root.toLocal(e.global);
      this.drag = { id: e.pointerId, startX: p.x, bunnyX: this.bx };
      this.targetX = this.bx;
    });
    stage.on('globalpointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const p = this.root.toLocal(e.global);
      this.targetX = this.drag.bunnyX + (p.x - this.drag.startX) * 1.15;
      // Re-anchor when the finger pushes past a wall so reversing feels immediate.
      const [lo, hi] = this.bounds();
      if (this.targetX < lo || this.targetX > hi) {
        this.targetX = Math.max(lo, Math.min(hi, this.targetX));
        this.drag.startX = p.x;
        this.drag.bunnyX = this.targetX;
      }
    });
    const end = (e) => {
      if (this.drag && e.pointerId === this.drag.id) this.drag = null;
    };
    stage.on('pointerup', end);
    stage.on('pointerupoutside', end);

    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code]) {
        this.keys[keyMap[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.paused && !this.settings.visible) this.resume();
        else this.pause();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (keyMap[e.code]) this.keys[keyMap[e.code]] = false;
    });
    window.addEventListener('blur', () => {
      this.keys.left = this.keys.right = false;
      this.held.left.clear();
      this.held.right.clear();
      this.drag = null;
    });
  }

  resize() {
    computeLayout(this.app.screen.width, this.app.screen.height);
    this.root.scale.set(Layout.scale);
    this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    const { W, H, groundY } = Layout;
    this.bg.resize();
    this.bunny.y = groundY;
    const [lo, hi] = this.bounds();
    this.bx = Math.max(lo, Math.min(hi, this.bx));
    this.bunny.x = this.bx;
    this.flash.clear().rect(0, 0, W, H).fill(0xffffff);
    this.tintOverlay.clear().rect(0, 0, W, H).fill(0xb8a8ff);
    this.tintOverlay.alpha = 0;
    const by = H - 70 - Layout.safeBottom * 0.6;
    this.leftBtn.position.set(Math.max(Layout.fieldL, 0) + 78, by);
    this.rightBtn.position.set(Math.min(Layout.fieldR, W) - 78, by);
    this.hud.layout();
    for (const s of this.screens) if (s.visible) s.layout();
  }

  bounds() {
    const half = 66 * this.bunny.wideFactor;
    return [Layout.fieldL + half, Layout.fieldR - half];
  }

  applyCosmetics() {
    const eq = Save.equipped;
    this.bunny.setLook(eq.fur, eq.outfit, eq.basket);
    this.effectStyle = EFFECT_STYLES[eq.effect] || EFFECT_STYLES.sparkle;
    if (this.phase === 'menu') this.bg.setTheme(eq.scene);
  }

  onControlChanged() {
    this.updateControlsVisibility();
  }

  updateControlsVisibility() {
    const inGame = this.phase === 'play' || this.phase === 'intro';
    this.controls.visible = inGame && Save.settings.control === 'buttons';
  }

  // ------------------------------------------------------------------ flow

  closeAll() {
    for (const s of this.screens) s.close();
  }

  toMenu(instant = false) {
    this.closeAll();
    Tweens.game.clear();
    this.paused = false;
    Audio.setDuck(1);
    Audio.setEnergetic(false);
    this.phase = 'menu';
    this.mode = 'menu';
    this.eggs.clear();
    this.fx.clear();
    this.spawner.reset();
    this.clearPowerups();
    this.bunny.setMode('normal');
    this.bunny.setPile(0);
    this.bx = this.targetX = Layout.cx;
    this.bvx = 0;
    this.hud.visible = false;
    this.banner.visible = false;
    this.bg.setTheme(Save.equipped.scene, instant);
    this.updateControlsVisibility();
    this.menu.open();
  }

  startGame(mode, level = 1) {
    Audio.unlock();
    Audio.startMusic();
    this.closeAll();
    Tweens.game.clear();
    this.mode = mode;
    this.startLevel = level;
    this.level = level;
    this.paused = false;
    Audio.setDuck(1);
    this.score = 0;
    this.lives = LIVES.start;
    this.combo = 0;
    this.bestCombo = 0;
    this.eggsCaught = 0;
    this.goldenCaught = 0;
    this.comboBreak = 0;
    this.elapsed = 0;
    this.basketCount = 0;
    this.runUnlocks = [];
    this.lastIntroTier = -1;
    this.themeIndex = 0;
    this.drag = null;
    this.eggs.clear();
    this.fx.clear();
    this.clearPowerups();
    this.bunny.setMode('normal');
    this.bunny.setPile(0);
    this.hud.visible = true;
    this.hud.setScore(0, true);
    this.hud.setMultiplier(1);
    this.hud.setLives(this.lives);
    this.hud.heartRow.visible = mode !== 'timed';
    Save.stats.games++;
    Save.save();

    if (mode === 'levels') {
      this.beginLevel(level);
    } else if (mode === 'endless') {
      this.bg.setTheme(Save.equipped.scene);
      this.themeIndex = Math.max(0, THEMES.indexOf(Save.equipped.scene));
      this.hud.setLevelLabel('ENDLESS');
      this.updateProgressHud();
      this.intro('Endless', this.firstTimeHint() || 'How long can you last?');
    } else {
      this.bg.setTheme(Save.equipped.scene);
      this.timeLeft = TIMED.duration;
      this.hud.setLevelLabel('TIME RUSH');
      this.updateProgressHud();
      this.intro('Time Rush', 'Catch as many as you can in 60s!');
    }
  }

  firstTimeHint() {
    if (Save.stats.games > 1) return '';
    return Save.settings.control === 'drag' ? 'Slide your finger to move!' : 'Hold the arrows to move!';
  }

  beginLevel(n) {
    this.level = n;
    this.levelCfg = levelConfig(n);
    this.levelEggs = 0;
    this.livesLostThisLevel = 0;
    this.spawner.reset();
    this.bunny.setMode('normal');
    this.bunny.setPile(0);
    this.bg.setTheme(this.levelCfg.theme);
    this.hud.setLevelLabel(`LEVEL ${n}`);
    this.updateProgressHud();
    const step = INTRODUCTIONS.find((s) => s.tier === this.levelCfg.tier && s.banner);
    const sub = n === 1 ? this.firstTimeHint() || `Catch ${this.levelCfg.target} eggs!` : step ? step.banner : `Catch ${this.levelCfg.target} eggs!`;
    Audio.setEnergetic(n >= 6);
    this.intro(`Level ${n}`, sub);
  }

  intro(title, sub) {
    this.phase = 'intro';
    this.updateControlsVisibility();
    this.banner.show(title, sub, 1.6);
    Tweens.game.wait(1.9, () => {
      if (this.phase === 'intro') this.phase = 'play';
    });
  }

  nextLevel() {
    this.closeAll();
    Tweens.game.clear();
    this.beginLevel(this.level + 1);
  }

  restart() {
    this.closeAll();
    Tweens.game.clear();
    this.startGame(this.mode, this.mode === 'levels' ? this.startLevel : 1);
  }

  pause() {
    if (this.paused || (this.phase !== 'play' && this.phase !== 'intro')) return;
    this.paused = true;
    this.drag = null;
    Audio.setDuck(0.35);
    this.pauseScreen.open();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    Audio.setDuck(1);
    this.pauseScreen.close();
    this.settings.close();
  }

  openSettings() {
    this.settings.open();
  }

  closeSettings() {
    this.settings.close();
    Save.save();
    this.updateControlsVisibility();
  }

  openWardrobe() {
    this.menu.close();
    this.wardrobe.open();
  }

  closeWardrobe() {
    this.wardrobe.close();
    this.menu.open();
  }

  toast(text) {
    this.toasts.push(text);
  }

  // ------------------------------------------------------------------ rules

  comboMultiplier() {
    return Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.combo / COMBO.catchesPerStep));
  }

  scoreFactor() {
    return this.power.mult ? POWERUPS.rainbowMultiplier.factor : 1;
  }

  currentTier() {
    if (this.mode === 'levels') {
      return this.levelCfg.tier + this.levelCfg.tierRamp * Math.min(1, this.levelEggs / this.levelCfg.target);
    }
    if (this.mode === 'endless') return Math.min(ENDLESS.maxTier, this.elapsed / ENDLESS.secondsPerTier);
    return TIMED.startTier + this.elapsed / TIMED.secondsPerTier;
  }

  addScore(pts) {
    this.score += pts;
    this.hud.setScore(this.score);
  }

  onCatch(e) {
    const rim = this.bunny.rimWorld();
    if (e.hazard) {
      this.combo = 0;
      this.comboBreak = 0;
      this.hud.setMultiplier(this.scoreFactor());
      this.bunny.react('hurt');
      this.fx.mudSplat(e.x, rim.y);
      this.fx.floatText(e.x, rim.y - 50, e.type === 'twig' ? 'Bonk!' : 'Splat!', 0xffe0c0, 30, 0x6e4e33);
      Audio.splat();
      if (this.mode !== 'timed') this.loseLife();
      this.addShake(6);
      return;
    }

    if (this.comboBreak > 0) {
      this.comboBreak = 0;
      if (this.combo >= COMBO.catchesPerStep) this.fx.floatText(rim.x, rim.y - 110, 'Saved!', 0xc9f2ff, 22, 0x2f7ac0);
    }
    const prevMult = this.comboMultiplier();
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    Save.bumpStat('bestCombo', this.combo);
    const mult = this.comboMultiplier();
    const factor = this.scoreFactor();
    const pts = e.def.points * mult * factor;
    this.addScore(pts);
    this.eggsCaught++;
    Save.stats.totalEggs++;
    Save.data.collection[e.type] = (Save.data.collection[e.type] || 0) + 1;

    const [fill, stroke] = POINT_COLORS[e.kind] || POINT_COLORS.standard;
    this.fx.floatText(e.x, rim.y - 48, `+${pts}`, fill, e.kind === 'special' ? 44 : 36, stroke);
    if (mult > prevMult) {
      this.fx.floatText(rim.x, rim.y - 95, `COMBO x${mult}`, 0xfff3a6, 34, 0xe07b00);
      Audio.comboUp(mult);
      this.bunny.react('combo');
    }
    this.hud.setMultiplier(mult * factor);

    const special = e.kind === 'special';
    this.fx.catchBurst(e.x, rim.y - 6, this.effectStyle, special || e.kind === 'rare', EGG_BASE_COLORS[e.type]);
    this.bunny.react(special ? 'special' : 'catch');

    switch (e.type) {
      case 'golden':
        this.goldenCaught++;
        Save.stats.golden++;
        this.fx.goldenBurst(e.x, rim.y - 10);
        Audio.golden();
        this.flashScreen(0xfff0a0, 0.35);
        this.addShake(5);
        break;
      case 'rainbow':
        this.activatePower('mult');
        this.fx.floatText(Layout.cx, Layout.H * 0.4, 'DOUBLE POINTS!', 0xffffff, 40, 0x9775fa);
        Audio.powerUp();
        this.flashScreen(0xffd6f5, 0.25);
        break;
      case 'star':
        this.activatePower('slow');
        this.fx.floatText(Layout.cx, Layout.H * 0.4, 'SLOW TIME!', 0xffffff, 40, 0x4b5bd6);
        Audio.powerUp();
        break;
      case 'mystery':
        this.mysteryReward(rim);
        break;
      case 'giant':
        Audio.rare();
        this.addShake(3);
        break;
      default:
        if (e.kind === 'rare') Audio.rare();
        else Audio.catch(this.combo);
    }

    if (this.mode === 'levels') {
      this.levelEggs++;
      this.updateProgressHud();
      if (this.levelEggs >= this.levelCfg.target && this.phase === 'play') this.completeLevel();
    } else {
      this.basketCount++;
      if (this.basketCount >= ENDLESS.basketCapacity) {
        this.basketCount = 0;
        const bonus = SCORE.basketBonus * factor;
        this.addScore(bonus);
        Tweens.game.wait(0.2, () => {
          this.bunny.setPile(0);
          this.fx.catchBurst(rim.x, rim.y, { texture: 'sparkle', colors: [0xffffff, 0xfff3a6] }, true);
          this.fx.floatText(rim.x, rim.y - 140, `Basket full! +${bonus}`, 0xffffff, 28, 0xd9578f);
          Audio.rare();
        });
      }
      this.updateProgressHud();
    }

    if (this.eggsCaught % 10 === 0) this.checkUnlocks();
  }

  onCaught(e) {
    // The egg finished its little drop into the basket: show it in the pile.
    const frac = this.mode === 'levels' ? this.levelEggs / this.levelCfg.target : this.basketCount / ENDLESS.basketCapacity;
    const want = Math.ceil(frac * this.bunny.pileCapacity());
    while (this.bunny.pileCount < want) this.bunny.pushPile(e.type);
    if (this.phase === 'play') this.bunny.setMode(frac >= 0.8 ? 'effort' : 'normal');
  }

  onLand(e) {
    const y = Layout.groundY - 8;
    if (e.hazard) {
      this.fx.dustPuff(e.x, y, 0xb08a62);
      return;
    }
    this.fx.shellBurst(e.x, y, EGG_BASE_COLORS[e.type] || 0xffffff);
    if (this.phase !== 'play') return;
    if (e.kind === 'special') {
      this.fx.floatText(e.x, y - 40, 'Missed!', 0xffffff, 22, 0x9a6aaa);
      return;
    }
    Audio.miss();
    this.bunny.react('miss');
    if (this.combo > 0 && this.comboBreak <= 0) this.comboBreak = COMBO.graceMs / 1000;
    if (this.mode !== 'timed') this.loseLife();
  }

  loseLife() {
    if (this.phase !== 'play') return;
    this.lives--;
    this.livesLostThisLevel = (this.livesLostThisLevel || 0) + 1;
    this.hud.setLives(this.lives, true);
    if (this.lives <= 0) this.gameOver();
  }

  mysteryReward(rim) {
    let options = MYSTERY_REWARDS;
    if (this.lives >= LIVES.max || this.mode === 'timed') options = options.filter((o) => o.id !== 'life');
    const r = options[(Math.random() * options.length) | 0];
    this.fx.floatText(Layout.cx, Layout.H * 0.4, r.text, 0xffffff, 38, 0x8a3fc9);
    this.fx.catchBurst(rim.x, rim.y, { texture: 'star', colors: [0xe8c8ff, 0xc08cff, 0xffffff] }, true);
    Audio.powerUp();
    if (r.id === 'points') this.addScore(150 * this.scoreFactor());
    else if (r.id === 'life') {
      this.lives = Math.min(LIVES.max, this.lives + 1);
      this.hud.setLives(this.lives);
    } else this.activatePower(r.id);
  }

  activatePower(id) {
    const dur = { mult: POWERUPS.rainbowMultiplier.duration, slow: POWERUPS.slowTime.duration, magnet: POWERUPS.magnet.duration, wide: POWERUPS.wideBasket.duration }[id];
    this.power[id] = Math.max(this.power[id] || 0, dur);
    this.powerDur = this.powerDur || {};
    this.powerDur[id] = dur;
    this.hud.setMultiplier(this.comboMultiplier() * this.scoreFactor());
  }

  clearPowerups() {
    this.power = {};
    this.bunny.setWide(1);
    this.tintOverlay.alpha = 0;
    this.hud.setChips([]);
  }

  updatePowerups(dt) {
    const chips = [];
    const meta = {
      mult: ['x2 POINTS', 0xb197fc],
      slow: ['SLOW', 0x748ffc],
      magnet: ['MAGNET', 0xff8787],
      wide: ['BIG BASKET', 0xffa94d],
    };
    for (const id of Object.keys(this.power)) {
      this.power[id] -= dt;
      if (this.power[id] <= 0) {
        delete this.power[id];
        if (id === 'mult') this.hud.setMultiplier(this.comboMultiplier());
        continue;
      }
      chips.push({ id, text: meta[id][0], color: meta[id][1], frac: this.power[id] / this.powerDur[id] });
    }
    this.hud.setChips(chips);
    const wideTarget = this.power.wide ? POWERUPS.wideBasket.factor : 1;
    this.bunny.setWide(this.bunny.wideFactor + (wideTarget - this.bunny.wideFactor) * Math.min(1, dt * 8));
    const tintTarget = this.power.slow ? 0.1 : 0;
    this.tintOverlay.alpha += (tintTarget - this.tintOverlay.alpha) * Math.min(1, dt * 4);
  }

  updateProgressHud() {
    if (this.mode === 'levels') {
      this.hud.setProgress(this.levelEggs / this.levelCfg.target, `${this.levelEggs}/${this.levelCfg.target}`);
    } else if (this.mode === 'endless') {
      this.hud.setProgress(this.basketCount / ENDLESS.basketCapacity, `Basket ${this.basketCount}/${ENDLESS.basketCapacity}`);
    } else {
      const t = Math.max(0, Math.ceil(this.timeLeft));
      this.hud.setProgress(this.timeLeft / TIMED.duration, `0:${String(t).padStart(2, '0')}`);
    }
  }

  completeLevel() {
    this.phase = 'clear';
    this.drag = null;
    this.updateControlsVisibility();
    this.eggs.popAll((e) => this.fx.catchBurst(e.x, e.y, this.effectStyle, false));
    this.clearPowerups();
    this.bunny.setMode('victory');
    this.fx.confetti(Layout.W, Layout.safeTop);
    Audio.fanfare();
    this.addShake(4);

    const perfect = this.livesLostThisLevel === 0;
    const bonus = SCORE.levelClearBonus * this.level;
    const perfectBonus = perfect ? SCORE.perfectBonus : 0;
    this.addScore(bonus + perfectBonus);
    let reward;
    if (this.lives < LIVES.max) {
      this.lives++;
      this.hud.setLives(this.lives);
      reward = 'Reward: +1 heart';
    } else {
      this.addScore(100);
      reward = 'Reward: +100 points';
    }
    Save.bumpStat('maxLevel', this.level + 1);
    Save.data.best.levels = Math.max(Save.data.best.levels, this.score);
    Save.bumpStat('bestScore', this.score);
    const unlocked = this.checkUnlocks(false);
    Save.save();
    const stars = this.livesLostThisLevel === 0 ? 3 : this.livesLostThisLevel <= 2 ? 2 : 1;
    Tweens.game.wait(1.5, () => {
      this.levelScreen.open({ level: this.level, score: this.score, bonus, perfect, perfectBonus, lives: this.lives, reward, unlocked, stars });
    });
  }

  gameOver() {
    if (this.phase === 'over') return;
    const timeUp = this.mode === 'timed';
    this.phase = 'over';
    this.drag = null;
    this.updateControlsVisibility();
    this.eggs.popAll();
    this.clearPowerups();
    this.hud.setMultiplier(1);
    this.bunny.setMode(timeUp ? 'victory' : 'tired');
    if (timeUp) {
      Audio.fanfare();
      this.fx.confetti(Layout.W, Layout.safeTop, 40);
    } else Audio.gameOver();

    const best = Save.data.best;
    const key = this.mode;
    const newBest = this.score > best[key] && this.score > 0;
    best[key] = Math.max(best[key], this.score);
    Save.bumpStat('bestScore', this.score);
    if (key === 'endless') Save.bumpStat('bestEndless', this.score);
    if (key === 'timed') Save.bumpStat('bestTimed', this.score);
    const unlocked = this.checkUnlocks(false);
    Save.save();
    Tweens.game.wait(1.6, () => {
      this.gameOverScreen.open({
        mode: this.mode, score: this.score, best: best[key], newBest, eggs: this.eggsCaught, bestCombo: this.bestCombo,
        level: this.level || 1, golden: this.goldenCaught, unlocked: this.runUnlocks.length ? this.runUnlocks : unlocked,
      });
    });
  }

  /** `announce` shows toasts; results panels pass false because they list new rewards themselves. */
  checkUnlocks(announce = true) {
    const fresh = Save.checkUnlocks();
    for (const u of fresh) {
      this.runUnlocks.push(u);
      if (announce) this.toast(`Unlocked: ${u.name}!`);
    }
    if (fresh.length) Audio.unlockJingle();
    return fresh;
  }

  // ------------------------------------------------------------------ fx helpers

  flashScreen(color, alpha) {
    if (Save.settings.reducedFx) alpha *= 0.4;
    this.flash.tint = color;
    this.flash.alpha = alpha;
    Tweens.ui.kill(this.flash);
    Tweens.ui.to(this.flash, { alpha: 0 }, 0.45);
  }

  addShake(amount) {
    if (!Save.settings.reducedFx) this.shake = Math.max(this.shake, amount);
  }

  // ------------------------------------------------------------------ loop

  tick(ticker) {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    Tweens.ui.update(dt);
    if (!this.paused) {
      Tweens.game.update(dt);
      this.update(dt);
    }
    this.hud.update(dt);
    if (this.menu.visible) this.menu.update(dt);
  }

  updateMovement(dt) {
    const [lo, hi] = this.bounds();
    const canMove = this.phase === 'play' || this.phase === 'intro';
    const dir = canMove
      ? (this.keys.right || this.held.right.size ? 1 : 0) - (this.keys.left || this.held.left.size ? 1 : 0)
      : 0;
    if (this.phase === 'menu') {
      this.bx += (Layout.cx - this.bx) * Math.min(1, dt * 4);
      this.bvx = 0;
    } else if (this.drag && canMove && dir === 0) {
      this.targetX = Math.max(lo, Math.min(hi, this.targetX));
      const desired = Math.max(-PLAYER.dragMaxSpeed, Math.min(PLAYER.dragMaxSpeed, (this.targetX - this.bx) / PLAYER.dragSmoothing));
      this.bvx += (desired - this.bvx) * Math.min(1, dt * 30);
      this.bx += this.bvx * dt;
    } else {
      if (dir !== 0) {
        const accel = Math.sign(this.bvx) === -dir ? PLAYER.buttonDecel : PLAYER.buttonAccel;
        this.bvx += dir * accel * dt;
        this.bvx = Math.max(-PLAYER.buttonMaxSpeed, Math.min(PLAYER.buttonMaxSpeed, this.bvx));
      } else {
        const dec = PLAYER.buttonDecel * dt;
        this.bvx = Math.abs(this.bvx) <= dec ? 0 : this.bvx - Math.sign(this.bvx) * dec;
      }
      this.bx += this.bvx * dt;
      this.targetX = this.bx;
    }
    if (this.bx < lo) {
      this.bx = lo;
      if (this.bvx < 0) this.bvx = 0;
    } else if (this.bx > hi) {
      this.bx = hi;
      if (this.bvx > 0) this.bvx = 0;
    }
    this.bunny.x = this.bx;
  }

  update(dt) {
    this.bg.update(dt);
    this.updateMovement(dt);
    this.bunny.update(dt, this.bvx);
    const fieldW = Layout.fieldR - Layout.fieldL;
    this.bg.setParallax((this.bx - Layout.cx) / fieldW);

    const playing = this.phase === 'play';
    if (playing) {
      this.elapsed += dt;
      this.updatePowerups(dt);
      if (this.comboBreak > 0) {
        this.comboBreak -= dt;
        if (this.comboBreak <= 0) {
          const rim = this.bunny.rimWorld();
          if (this.combo >= COMBO.catchesPerStep) this.fx.floatText(rim.x, rim.y - 100, 'Combo lost', 0xffffff, 22, 0x9a6aaa);
          this.combo = 0;
          this.hud.setMultiplier(this.scoreFactor());
        }
      }
      if (this.mode === 'timed') {
        this.timeLeft -= dt;
        this.updateProgressHud();
        if (this.timeLeft <= 0) {
          this.gameOver();
          return;
        }
      }
      if (this.mode === 'endless') this.updateEndlessStage();
    }

    const tier = this.phase === 'menu' ? 0 : this.currentTier();
    const rim = this.bunny.rimWorld();
    const timeScale = this.power.slow ? POWERUPS.slowTime.factor : 1;
    if (playing) {
      this.spawner.update(dt, {
        tier,
        timeScale,
        spawnY: -50,
        rimY: rim.y,
        fieldL: Layout.fieldL,
        fieldR: Layout.fieldR,
        halfW: this.bunny.catchHalfWidth(),
        bunnySpeed: Save.settings.control === 'drag' ? PLAYER.dragMaxSpeed : PLAYER.buttonMaxSpeed,
      });
    }

    this.eggs.update(dt, {
      timeScale,
      rim,
      halfW: this.bunny.catchHalfWidth(),
      groundY: Layout.groundY - 6,
      magnet: this.power.magnet ? POWERUPS.magnet : null,
      onCatch: (e) => this.onCatch(e),
      onCaught: (e) => this.onCaught(e),
      onLand: (e) => this.onLand(e),
      onSparkle: (e) => {
        if (Save.settings.reducedFx) return;
        this.fx.emit(e.x, e.y, { count: 1, texture: Tex.sparkle, colors: SPARKLE_TINT[e.type], speed: [5, 30], gravity: 20, life: [0.4, 0.7], scale: [0.4, 0.8], spread: 18, add: true });
      },
    });

    // Cosmetic trail behind the basket while moving fast.
    if (playing && Math.abs(this.bvx) > 320) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.045;
        this.fx.trail(rim.x - Math.sign(this.bvx) * 40, rim.y + 20, this.effectStyle);
      }
    }

    this.fx.update(dt);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 30);
      this.world.position.set((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    } else {
      this.world.position.set(0, 0);
    }
  }

  updateEndlessStage() {
    const tier = this.currentTier();
    const t = Math.floor(tier);
    if (t > this.lastIntroTier) {
      this.lastIntroTier = t;
      const step = INTRODUCTIONS.find((s) => s.tier === t && s.banner);
      if (step && t > 0) this.banner.show('New!', step.banner, 1.6);
      Audio.setEnergetic(t >= 6);
    }
    const idx = (Math.max(0, THEMES.indexOf(Save.equipped.scene)) + Math.floor(this.elapsed / ENDLESS.themeEverySeconds)) % THEMES.length;
    if (idx !== this.themeIndex) {
      this.themeIndex = idx;
      this.bg.setTheme(THEMES[idx]);
    }
  }
}
