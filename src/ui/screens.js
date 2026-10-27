import { Container, Sprite, Graphics, Rectangle } from 'pixi.js';
import { Layout } from '../core/layout.js';
import { Tweens, Ease } from '../core/tween.js';
import { Tex, pillTexture, buttonTexture } from '../art/uiArt.js';
import { THEME_PALETTES } from '../art/sceneArt.js';
import { bunnyTextures } from '../art/bunnyArt.js';
import { Button, Slider, Toggle, Panel, label, bodyText, fitText, icon, dimmer, INK } from './components.js';
import { Save } from '../systems/save.js';
import { Audio } from '../systems/audio.js';
import { COSMETICS, EFFECT_STYLES, EGG_TYPES, COLLECTIBLE_IDS } from '../config.js';

function popIn(obj, delay = 0) {
  obj.scale.set(0.6);
  obj.alpha = 0;
  Tweens.ui.to(obj, { 'scale.x': 1, 'scale.y': 1, alpha: 1 }, 0.35, { ease: Ease.outBack, delay });
}

class Screen extends Container {
  constructor() {
    super();
    this.visible = false;
  }

  open(data) {
    this.visible = true;
    this.build?.(data);
    this.layout();
  }

  close() {
    this.visible = false;
  }

  layout() {}
}

// ---------------------------------------------------------------- menu

export class MenuScreen extends Screen {
  constructor(app) {
    super();
    this.app = app;
    this.title = new Sprite(Tex.title);
    this.title.anchor.set(0.5);
    this.best = new Container();
    this.bestBg = new Sprite(pillTexture(250, 52, '#ffffff', 0.8));
    this.bestBg.anchor.set(0.5);
    this.bestIcon = icon('trophy', 40, 0xf7b733);
    this.bestIcon.x = -94;
    this.bestText = label('Best 0', 24, 0xffffff, { stroke: 0xd9578f, strokeW: 6 });
    this.bestText.x = 14;
    this.best.addChild(this.bestBg, this.bestIcon, this.bestText);

    this.play = new Button({ w: 300, h: 104, color: 'pink', text: 'PLAY', icon: 'play', fontSize: 46, onClick: () => app.startGame('levels', this.level) });
    this.levelPick = new Container();
    this.levelText = label('Level 1', 24, 0xffffff, { stroke: 0x8a5bb8, strokeW: 6 });
    this.prevLvl = new Button({ w: 56, h: 56, color: 'white', icon: 'left', textColor: INK, onClick: () => this.pickLevel(-1) });
    this.nextLvl = new Button({ w: 56, h: 56, color: 'white', icon: 'right', textColor: INK, onClick: () => this.pickLevel(1) });
    this.prevLvl.x = -110;
    this.nextLvl.x = 110;
    this.levelPick.addChild(this.prevLvl, this.levelText, this.nextLvl);

    this.endless = new Button({ w: 210, h: 76, color: 'blue', text: 'Endless', fontSize: 28, onClick: () => app.startGame('endless') });
    this.timed = new Button({ w: 210, h: 76, color: 'yellow', text: 'Time Rush', fontSize: 28, onClick: () => app.startGame('timed') });

    this.settingsBtn = new Button({ w: 84, h: 84, color: 'white', icon: 'gear', textColor: INK, onClick: () => app.openSettings() });
    this.wardrobeBtn = new Button({ w: 84, h: 84, color: 'white', icon: 'shirt', textColor: INK, onClick: () => app.openWardrobe() });
    this.settingsLbl = label('Settings', 18, 0xffffff, { stroke: 0x4a8a3a, strokeW: 5 });
    this.wardrobeLbl = label('Wardrobe', 18, 0xffffff, { stroke: 0x4a8a3a, strokeW: 5 });

    this.addChild(this.title, this.best, this.play, this.levelPick, this.endless, this.timed,
      this.settingsBtn, this.wardrobeBtn, this.settingsLbl, this.wardrobeLbl);
    this.t = 0;
    this.level = 1;
  }

  build() {
    const b = Save.data.best;
    this.bestText.text = `Best ${Math.max(b.levels, b.endless, b.timed).toLocaleString()}`;
    this.level = Math.max(1, Save.stats.maxLevel);
    this.pickLevel(0);
    [this.title, this.best, this.play, this.levelPick, this.endless, this.timed].forEach((o, i) => popIn(o, i * 0.06));
  }

  pickLevel(d) {
    this.level = Math.max(1, Math.min(Save.stats.maxLevel, this.level + d));
    this.levelText.text = `Level ${this.level}`;
    this.prevLvl.alpha = this.level > 1 ? 1 : 0.35;
    this.nextLvl.alpha = this.level < Save.stats.maxLevel ? 1 : 0.35;
    this.levelPick.visible = Save.stats.maxLevel > 1;
  }

  layout() {
    const { cx, safeTop, groundY, fieldL, fieldR } = Layout;
    const titleY = safeTop + 140;
    this.title.position.set(cx, titleY);
    this.best.position.set(cx, titleY + 138);
    const bunnyTop = groundY - 250;
    const top = titleY + 180;
    const span = Math.max(0, bunnyTop - top - 250);
    this.play.position.set(cx, top + 50 + span * 0.3);
    this.levelPick.position.set(cx, this.play.y + 84);
    const modesY = this.levelPick.y + (Save.stats.maxLevel > 1 ? 74 : 20);
    this.endless.position.set(cx - 112, modesY);
    this.timed.position.set(cx + 112, modesY);
    const left = Math.max(fieldL, 0) + 62;
    const right = Math.min(fieldR, Layout.W) - 62;
    this.wardrobeBtn.position.set(left, groundY - 30);
    this.settingsBtn.position.set(right, groundY - 30);
    this.wardrobeLbl.position.set(left, groundY + 26);
    this.settingsLbl.position.set(right, groundY + 26);
  }

  update(dt) {
    this.t += dt;
    this.title.rotation = Math.sin(this.t * 1.3) * 0.015;
    this.title.y = Layout.safeTop + 140 + Math.sin(this.t * 1.8) * 4;
    const pulse = 1 + Math.sin(this.t * 3.2) * 0.025;
    if (this.play.alpha >= 1) this.play.scale.set(pulse);
  }
}

// ---------------------------------------------------------------- settings

export class SettingsScreen extends Screen {
  constructor(app) {
    super();
    this.app = app;
    this.dim = dimmer(0.35);
    this.panel = new Panel(470, 640, 'Settings');
    this.addChild(this.dim, this.panel);
    const p = this.panel;
    const row = (text, y) => {
      const t = bodyText(text, 24);
      t.anchor.set(0, 0.5);
      t.position.set(-190, y);
      p.addChild(t);
      return t;
    };

    row('Controls', -228);
    this.dragBtn = new Button({ w: 170, h: 64, color: 'pink', text: 'Drag', fontSize: 24, onClick: () => this.setControl('drag') });
    this.btnBtn = new Button({ w: 170, h: 64, color: 'cream', text: 'Buttons', fontSize: 24, textColor: INK, onClick: () => this.setControl('buttons') });
    this.dragBtn.position.set(-92, -170);
    this.btnBtn.position.set(92, -170);
    this.controlHint = bodyText('', 17, 0x9a6aaa, 400);
    this.controlHint.y = -120;
    p.addChild(this.dragBtn, this.btnBtn, this.controlHint);

    row('Music', -68);
    this.music = new Slider({ w: 220, value: Save.settings.music, onChange: (v) => this.setVol('music', v) });
    this.music.position.set(-30, -68);
    row('Sounds', 0);
    this.sfx = new Slider({ w: 220, value: Save.settings.sfx, onChange: (v) => this.setVol('sfx', v) });
    this.sfx.position.set(-30, 0);
    row('Mute all', 72);
    this.mute = new Toggle({ value: Save.settings.muted, onChange: (v) => { Save.settings.muted = v; Audio.applyVolumes(); Save.saveSoon(); } });
    this.mute.position.set(100, 72);
    row('Reduced effects', 142);
    this.reduced = new Toggle({ value: Save.settings.reducedFx, onChange: (v) => { Save.settings.reducedFx = v; Save.saveSoon(); } });
    this.reduced.position.set(100, 142);
    p.addChild(this.music, this.sfx, this.mute, this.reduced);

    this.done = new Button({ w: 220, h: 76, color: 'green', text: 'Done', icon: 'check', fontSize: 30, onClick: () => app.closeSettings() });
    this.done.y = 248;
    p.addChild(this.done);
  }

  build() {
    this.setControl(Save.settings.control, true);
    this.music.value = Save.settings.music;
    this.sfx.value = Save.settings.sfx;
    this.music.redraw();
    this.sfx.redraw();
    this.mute.value = Save.settings.muted;
    this.mute.redraw();
    this.reduced.value = Save.settings.reducedFx;
    this.reduced.redraw();
    popIn(this.panel);
  }

  setControl(c, silent = false) {
    Save.settings.control = c;
    this.dragBtn.setColor(c === 'drag' ? 'pink' : 'cream');
    this.btnBtn.setColor(c === 'buttons' ? 'pink' : 'cream');
    this.dragBtn.text.style.fill = c === 'drag' ? 0xffffff : INK;
    this.btnBtn.text.style.fill = c === 'buttons' ? 0xffffff : INK;
    this.controlHint.text = c === 'drag' ? 'Slide your finger anywhere to move the bunny' : 'Hold the arrows at the bottom corners';
    if (!silent) {
      Save.saveSoon();
      this.app.onControlChanged();
    }
  }

  setVol(key, v) {
    Save.settings[key] = v;
    Audio.applyVolumes();
    Save.saveSoon();
  }

  layout() {
    this.dim.width = Layout.W;
    this.dim.height = Layout.H;
    this.panel.position.set(Layout.cx, Layout.safeTop + Math.max(380, Layout.H * 0.46));
  }
}

// ---------------------------------------------------------------- wardrobe

const TABS = [
  ['fur', 'Fur'], ['outfit', 'Outfit'], ['basket', 'Basket'], ['effect', 'Effect'], ['scene', 'Scene'], ['eggs', 'Eggs'],
];

export class WardrobeScreen extends Screen {
  constructor(app) {
    super();
    this.app = app;
    this.tab = 'fur';
    this.panelHolder = new Container();
    this.addChild(this.panelHolder);
  }

  build() {
    this.rebuild();
    popIn(this.panel);
  }

  rebuild() {
    this.panelHolder.removeChildren().forEach((c) => c.destroy({ children: true }));
    const W = Math.min(Layout.W - 24, 516);
    const H = Math.max(470, Math.min(600, Layout.groundY - 290 - Layout.safeTop - 60));
    this.pw = W;
    this.ph = H;
    const panel = new Panel(W, H, 'Wardrobe');
    this.panel = panel;
    this.panelHolder.addChild(panel);

    const tabW = (W - 50) / TABS.length;
    TABS.forEach(([id, name], i) => {
      const b = new Button({ w: tabW - 6, h: 52, color: this.tab === id ? 'lavender' : 'cream', text: name, fontSize: 18,
        textColor: this.tab === id ? 0xffffff : INK, onClick: () => { this.tab = id; this.rebuild(); this.layout(); } });
      b.position.set(-W / 2 + 25 + tabW * (i + 0.5), -H / 2 + 74);
      panel.addChild(b);
    });

    const gridTop = -H / 2 + 124;
    if (this.tab === 'eggs') this.buildEggs(panel, W, gridTop);
    else this.buildItems(panel, W, gridTop);

    const close = new Button({ w: 200, h: 70, color: 'green', text: 'Done', icon: 'check', fontSize: 28, onClick: () => this.app.closeWardrobe() });
    close.y = H / 2 - 54;
    panel.addChild(close);
  }

  buildItems(panel, W, top) {
    const items = COSMETICS[this.tab];
    const cols = 2;
    const cw = (W - 60) / cols;
    const ch = Math.min(96, (this.ph - 124 - 110) / Math.ceil(items.length / cols) - 8);
    items.forEach((item, i) => {
      const unlocked = Save.isUnlocked(item.id);
      const equipped = Save.equipped[this.tab] === item.id;
      const card = new Container();
      const bg = new Graphics();
      bg.roundRect(-cw / 2 + 4, -ch / 2, cw - 8, ch, 20).fill({ color: equipped ? 0xffe3f0 : 0xffffff, alpha: unlocked ? 1 : 0.6 });
      bg.roundRect(-cw / 2 + 4, -ch / 2, cw - 8, ch, 20).stroke({ width: equipped ? 4 : 2, color: equipped ? 0xff7fb2 : 0xead8f0 });
      card.addChild(bg);
      const sw = this.swatch(item.id);
      sw.position.set(-cw / 2 + 50, 0);
      if (!unlocked) sw.alpha = 0.35;
      card.addChild(sw);
      const name = bodyText(item.name, 22, unlocked ? INK : 0xa08aa8);
      fitText(name, cw - 92 - 14); // card width minus swatch and right padding
      name.anchor.set(0, 0.5);
      name.position.set(-cw / 2 + 92, unlocked ? -10 : -16);
      card.addChild(name);
      const sub = bodyText(unlocked ? (equipped ? 'Equipped' : 'Tap to wear') : item.req.text, 15, unlocked ? (equipped ? 0xe85d95 : 0x9a8aa8) : 0xb07a9a, cw - 104);
      sub.anchor.set(0, 0.5);
      sub.style.align = 'left';
      sub.position.set(-cw / 2 + 92, unlocked ? 16 : 14);
      card.addChild(sub);
      if (!unlocked) {
        // Lock badge sits on the swatch so the name keeps the full text width.
        const lock = icon('lock', 26, 0xb59ac0);
        lock.position.set(-cw / 2 + 72, ch / 2 - 22);
        card.addChild(lock);
      }
      card.position.set(-W / 2 + 30 + cw * (i % cols + 0.5), top + Math.floor(i / cols) * (ch + 10) + ch / 2);
      card.eventMode = 'static';
      card.cursor = unlocked ? 'pointer' : 'default';
      card.hitArea = new Rectangle(-cw / 2, -ch / 2, cw, ch);
      card.on('pointertap', () => {
        if (!unlocked) {
          Audio.click();
          return;
        }
        Save.equipped[this.tab] = item.id;
        Save.save();
        Audio.unlockJingle();
        this.app.applyCosmetics();
        this.rebuild();
        this.layout();
      });
      panel.addChild(card);
    });
  }

  buildEggs(panel, W, top) {
    const cols = 4;
    const cw = (W - 60) / cols;
    const ch = Math.min(108, (this.ph - 124 - 120) / Math.ceil(COLLECTIBLE_IDS.length / cols) - 6);
    const eggTex = this.app.eggTextures;
    COLLECTIBLE_IDS.forEach((id, i) => {
      const count = Save.data.collection[id] || 0;
      const card = new Container();
      const bg = new Graphics();
      bg.roundRect(-cw / 2 + 4, -ch / 2, cw - 8, ch, 18).fill({ color: 0xffffff, alpha: count ? 1 : 0.55 });
      card.addChild(bg);
      const egg = new Sprite(eggTex[id]);
      egg.anchor.set(0.5);
      const sc = Math.min(0.8, (ch - 40) / egg.height);
      egg.scale.set(sc);
      egg.y = -10;
      if (!count) egg.tint = 0x6a5a7a;
      if (!count) egg.alpha = 0.35;
      card.addChild(egg);
      const t = bodyText(count ? `x${count}` : '?', 17, count ? INK : 0xa08aa8);
      t.y = ch / 2 - 16;
      card.addChild(t);
      card.position.set(-W / 2 + 30 + cw * (i % cols + 0.5), top + Math.floor(i / cols) * (ch + 8) + ch / 2);
      card.eventMode = 'static';
      card.on('pointertap', () => {
        Audio.click();
        this.app.toast(count ? `${EGG_TYPES[id].name}: caught ${count}` : 'Not discovered yet');
      });
      panel.addChild(card);
    });
    const found = COLLECTIBLE_IDS.filter((id) => Save.data.collection[id] > 0).length;
    const t = bodyText(`Discovered ${found} / ${COLLECTIBLE_IDS.length}`, 20, 0x9a6aaa);
    t.y = this.ph / 2 - 112;
    panel.addChild(t);
  }

  swatch(id) {
    const c = new Container();
    if (this.tab === 'fur') {
      const t = bunnyTextures(id, 'wicker');
      const head = new Sprite(t.head);
      head.anchor.set(0.5);
      head.scale.set(0.42);
      c.addChild(head);
    } else if (this.tab === 'outfit') {
      const t = bunnyTextures(Save.equipped.fur, 'wicker');
      const tex = { bow: t.bow, crown: t.crown, bowtie: t.bowtie }[id];
      if (tex) {
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.scale.set(Math.min(1, 70 / tex.width));
        c.addChild(s);
      } else {
        c.addChild(icon('close', 34, 0xc8b0d0));
      }
    } else if (this.tab === 'basket') {
      const t = bunnyTextures(Save.equipped.fur, id);
      const s = new Sprite(t.basketFront);
      s.anchor.set(0.5);
      s.scale.set(0.4);
      c.addChild(s);
    } else if (this.tab === 'effect') {
      const st = EFFECT_STYLES[id];
      st.colors.slice(0, 4).forEach((col, k) => {
        const s = new Sprite(Tex[st.texture]);
        s.anchor.set(0.5);
        s.tint = col;
        s.scale.set(k === 0 ? 1.4 : 0.9);
        s.position.set([0, -18, 18, 0][k], [0, -10, -6, 16][k]);
        c.addChild(s);
      });
    } else if (this.tab === 'scene') {
      const p = THEME_PALETTES[id];
      const g = new Graphics();
      g.roundRect(-30, -30, 60, 60, 14).fill(parseInt(p.sky[1].slice(1), 16));
      g.roundRect(-30, -2, 60, 32, 14).fill(parseInt(p.grass[1].slice(1), 16));
      g.rect(-30, -2, 60, 14).fill(parseInt(p.grass[1].slice(1), 16));
      g.circle(14, -16, 7).fill(parseInt(p.sun.slice(1), 16));
      g.circle(-12, -6, 9).fill(parseInt(p.foliage[0].slice(1), 16));
      c.addChild(g);
    }
    return c;
  }

  layout() {
    if (!this.panel) return;
    this.panel.position.set(Layout.cx, Layout.safeTop + 56 + this.ph / 2);
  }
}

// ---------------------------------------------------------------- pause

export class PauseScreen extends Screen {
  constructor(app) {
    super();
    this.dim = dimmer(0.4);
    this.panel = new Panel(420, 520, 'Paused');
    this.addChild(this.dim, this.panel);
    const btns = [
      ['Resume', 'green', 'play', () => app.resume()],
      ['Restart', 'yellow', 'restart', () => app.restart()],
      ['Sound', 'blue', 'sound', () => app.openSettings()],
      ['Main Menu', 'pink', 'home', () => app.toMenu()],
    ];
    btns.forEach(([text, color, ic, fn], i) => {
      const b = new Button({ w: 300, h: 80, color, text, icon: ic, fontSize: 30, onClick: fn });
      b.y = -150 + i * 100;
      this.panel.addChild(b);
    });
  }

  build() {
    popIn(this.panel);
  }

  layout() {
    this.dim.width = Layout.W;
    this.dim.height = Layout.H;
    this.panel.position.set(Layout.cx, Layout.safeTop + Math.max(330, Layout.H * 0.42));
  }
}

// ---------------------------------------------------------------- results

function statRow(panel, y, name, value, w) {
  const n = bodyText(name, 22, 0x9a6aaa);
  n.anchor.set(0, 0.5);
  n.position.set(-w / 2 + 50, y);
  const v = bodyText(value, 24, INK);
  v.anchor.set(1, 0.5);
  v.position.set(w / 2 - 50, y);
  const line = new Graphics();
  line.moveTo(-w / 2 + 50, y + 20).lineTo(w / 2 - 50, y + 20).stroke({ width: 2, color: 0xf0dff0 });
  panel.addChild(line, n, v);
}

function rewardList(panel, y, unlocked, w) {
  if (!unlocked.length) return 0;
  const t = label(unlocked.length === 1 ? 'New reward!' : 'New rewards!', 22, 0xffffff, { stroke: 0xf08c00, strokeW: 6 });
  t.y = y;
  panel.addChild(t);
  const names = unlocked.slice(0, 3).map((u) => `${u.name} ${u.cat === 'fur' ? 'fur' : u.cat === 'scene' ? 'scene' : u.cat}`).join(' · ');
  const n = bodyText(names, 18, INK, w - 60);
  n.y = y + 30;
  panel.addChild(n);
  return 60;
}

export class GameOverScreen extends Screen {
  constructor(app) {
    super();
    this.app = app;
    this.holder = new Container();
    this.addChild(this.holder);
  }

  build(d) {
    this.holder.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = Math.min(470, Layout.W - 30);
    const extra = d.unlocked.length ? 60 : 0;
    const h = 560 + extra;
    this.h = h;
    const panel = new Panel(w, h, d.mode === 'timed' ? "Time's Up!" : 'Game Over');
    this.panel = panel;
    this.holder.addChild(panel);
    let y = -h / 2 + 76;
    const scoreCap = bodyText('Final score', 20, 0x9a6aaa);
    scoreCap.y = y;
    const score = label(d.score.toLocaleString(), 64, 0xffffff, { stroke: 0xd9578f, strokeW: 10 });
    score.y = y + 52;
    panel.addChild(scoreCap, score);
    if (d.newBest) {
      const badge = new Sprite(buttonTexture(150, 42, 'yellow'));
      badge.anchor.set(0.5);
      badge.position.set(w / 2 - 92, y + 12);
      badge.rotation = 0.12;
      const bt = label('NEW BEST!', 20, 0xffffff, { stroke: 0xc98a12, strokeW: 5 });
      bt.position.set(badge.x, badge.y - 4);
      bt.rotation = 0.12;
      panel.addChild(badge, bt);
      Tweens.ui.to(bt.scale, { x: 1.12, y: 1.12 }, 0.5, { ease: Ease.inOutSine });
    }
    y += 120;
    statRow(panel, y, 'Best score', d.best.toLocaleString(), w);
    statRow(panel, y + 50, 'Eggs collected', String(d.eggs), w);
    statRow(panel, y + 100, 'Best combo', String(d.bestCombo), w);
    statRow(panel, y + 150, d.mode === 'levels' ? 'Level reached' : 'Golden eggs', d.mode === 'levels' ? String(d.level) : String(d.golden), w);
    y += 200;
    y += rewardList(panel, y, d.unlocked, w);
    const again = new Button({ w: 196, h: 80, color: 'green', text: 'Again', icon: 'restart', fontSize: 30, onClick: () => this.app.restart() });
    const menu = new Button({ w: 196, h: 80, color: 'pink', text: 'Menu', icon: 'home', fontSize: 30, onClick: () => this.app.toMenu() });
    again.position.set(-104, h / 2 - 66);
    menu.position.set(104, h / 2 - 66);
    panel.addChild(again, menu);
    popIn(panel);
  }

  layout() {
    if (!this.panel) return;
    const maxY = Layout.groundY - 230 - this.h / 2;
    this.panel.position.set(Layout.cx, Math.max(Layout.safeTop + 20 + this.h / 2, Math.min(maxY, Layout.H * 0.4)));
  }
}

export class LevelCompleteScreen extends Screen {
  constructor(app) {
    super();
    this.app = app;
    this.holder = new Container();
    this.addChild(this.holder);
  }

  build(d) {
    this.holder.removeChildren().forEach((c) => c.destroy({ children: true }));
    const w = Math.min(470, Layout.W - 30);
    const extra = d.unlocked.length ? 60 : 0;
    const h = 500 + extra;
    this.h = h;
    const panel = new Panel(w, h, `Level ${d.level} Clear!`);
    this.panel = panel;
    this.holder.addChild(panel);
    let y = -h / 2 + 90;
    for (let i = 0; i < 3; i++) {
      const s = new Sprite(Tex.star);
      s.anchor.set(0.5);
      s.tint = i < d.stars ? 0xffc93c : 0xe6d8ea;
      s.position.set((i - 1) * 78, y + (i === 1 ? -10 : 6));
      s.scale.set(0);
      Tweens.ui.to(s.scale, { x: i === 1 ? 2.6 : 2.1, y: i === 1 ? 2.6 : 2.1 }, 0.45, { ease: Ease.outBack, delay: 0.25 + i * 0.18 });
      if (i < d.stars) Tweens.ui.wait(0.25 + i * 0.18, () => Audio.comboUp(i));
      panel.addChild(s);
    }
    y += 76;
    statRow(panel, y, 'Score', d.score.toLocaleString(), w);
    statRow(panel, y + 50, 'Level bonus', `+${d.bonus}`, w);
    statRow(panel, y + 100, d.perfect ? 'Perfect catch!' : 'Lives left', d.perfect ? `+${d.perfectBonus}` : String(d.lives), w);
    y += 150;
    const reward = label(d.reward, 22, 0xffffff, { stroke: 0xd9578f, strokeW: 6 });
    reward.y = y;
    panel.addChild(reward);
    y += 46;
    y += rewardList(panel, y, d.unlocked, w);
    const next = new Button({ w: 280, h: 84, color: 'green', text: 'Continue', icon: 'play', fontSize: 32, onClick: () => this.app.nextLevel() });
    next.y = h / 2 - 68;
    panel.addChild(next);
    popIn(panel);
  }

  layout() {
    if (!this.panel) return;
    const maxY = Layout.groundY - 230 - this.h / 2;
    this.panel.position.set(Layout.cx, Math.max(Layout.safeTop + 20 + this.h / 2, Math.min(maxY, Layout.H * 0.4)));
  }
}

// ---------------------------------------------------------------- banners & toasts

export class Banner extends Container {
  constructor() {
    super();
    this.main = label('', 64, 0xffffff, { stroke: 0xd9578f, strokeW: 12 });
    this.sub = label('', 26, 0xffffff, { stroke: 0x8a5bb8, strokeW: 7, wrap: 460 });
    this.sub.y = 62;
    this.addChild(this.main, this.sub);
    this.visible = false;
  }

  show(main, sub = '', duration = 2) {
    Tweens.ui.kill(this);
    Tweens.ui.kill(this.scale);
    this.main.text = main;
    this.sub.text = sub;
    this.visible = true;
    this.alpha = 0;
    this.scale.set(0.5);
    this.position.set(Layout.cx, Layout.safeTop + Math.max(280, Layout.H * 0.3));
    Tweens.ui.to(this.scale, { x: 1, y: 1 }, 0.45, { ease: Ease.outBack });
    Tweens.ui.to(this, { alpha: 1 }, 0.2);
    Tweens.ui.to(this, { alpha: 0 }, 0.35, { delay: duration, onComplete: () => { this.visible = false; } });
  }
}

export class Toasts extends Container {
  constructor() {
    super();
    this.queue = [];
    this.busy = false;
  }

  push(text) {
    this.queue.push(text);
    if (!this.busy) this.next();
  }

  next() {
    const text = this.queue.shift();
    if (!text) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const c = new Container();
    const t = label(text, 22, 0xffffff, { stroke: 0x8a5bb8, strokeW: 6 });
    const bg = new Sprite(pillTexture(Math.max(260, t.width + 60), 54, '#b892ff', 0.92));
    bg.anchor.set(0.5);
    c.addChild(bg, t);
    c.position.set(Layout.cx, Layout.safeTop - 60);
    this.addChild(c);
    const y = Layout.safeTop + 160;
    Tweens.ui.to(c, { y }, 0.4, { ease: Ease.outBack });
    Tweens.ui.to(c, { alpha: 0, y: y - 30 }, 0.35, {
      delay: 2.2,
      onComplete: () => {
        c.destroy({ children: true });
        this.next();
      },
    });
  }
}
