import { Container, Sprite, Graphics } from 'pixi.js';
import { Layout } from '../core/layout.js';
import { Tweens, Ease } from '../core/tween.js';
import { Tex, pillTexture, barTexture, PILL_PAD } from '../art/uiArt.js';
import { label, Button, INK } from './components.js';
import { LIVES } from '../config.js';

const BAR_W = 176;
const BAR_H = 18;

/** Top-of-screen readout: score, level + objective progress, lives, active power-ups, pause. */
export class Hud extends Container {
  constructor({ onPause }) {
    super();
    this.scorePill = new Sprite(pillTexture(176, 70));
    this.scorePill.anchor.set(0, 0);
    this.scoreCaption = label('SCORE', 15, 0x9a6aaa, { stroke: null, shadow: false });
    this.scoreText = label('0', 34, 0xffffff, { stroke: 0xd9578f, strokeW: 7 });
    this.multBadge = label('x2', 22, 0xffffff, { stroke: 0xf08c00, strokeW: 6 });
    this.multBadge.visible = false;

    this.levelPill = new Sprite(pillTexture(206, 70));
    this.levelText = label('LEVEL 1', 22, 0xffffff, { stroke: 0x8a5bb8, strokeW: 6 });
    this.barBg = new Sprite(barTexture(BAR_W, BAR_H, false));
    this.barFill = new Sprite(barTexture(BAR_W, BAR_H, true));
    this.barMask = new Graphics();
    this.barFill.mask = this.barMask;
    this.barIcon = new Sprite(Tex.eggIcon);
    this.barIcon.anchor.set(0.5);
    this.progressText = label('0/10', 15, INK, { stroke: 0xffffff, strokeW: 4, shadow: false });

    this.pauseBtn = new Button({ w: 72, h: 72, color: 'white', icon: 'pause', textColor: INK, onClick: onPause });

    this.hearts = [];
    this.heartRow = new Container();
    for (let i = 0; i < LIVES.max; i++) {
      const h = new Sprite(Tex.hudHeart);
      h.anchor.set(0.5);
      h.x = i * 34;
      this.hearts.push(h);
      this.heartRow.addChild(h);
    }

    this.chips = new Container();

    this.addChild(this.scorePill, this.scoreCaption, this.scoreText, this.multBadge, this.levelPill, this.barBg, this.barFill, this.barMask,
      this.barIcon, this.levelText, this.progressText, this.pauseBtn, this.heartRow, this.chips);

    this.displayScore = 0;
    this.targetScore = 0;
    this.lives = LIVES.start;
    this.progress = 0;
    this.shownProgress = 0;
    this.layout();
  }

  layout() {
    const top = Layout.safeTop + 12;
    const left = Math.max(Layout.fieldL, 0) + 12;
    const right = Math.min(Layout.fieldR, Layout.W) - 12;
    const mid = (left + right) / 2;

    this.scorePill.position.set(left - PILL_PAD, top - PILL_PAD);
    this.scoreCaption.position.set(left + 88, top + 14);
    this.scoreText.position.set(left + 88, top + 41);
    this.multBadge.position.set(left + 168, top + 6);

    const lx = Math.max(left + 186, mid - 56);
    this.levelPill.position.set(lx - PILL_PAD, top - PILL_PAD);
    const lc = lx + 103;
    this.levelText.position.set(lc, top + 16);
    this.barBg.position.set(lc - BAR_W / 2 + 6, top + 36);
    this.barFill.position.copyFrom(this.barBg.position);
    this.barIcon.position.set(this.barBg.x - 4, top + 45);
    this.progressText.position.set(lc + 6, top + 45);
    this.barLeft = this.barBg.x;
    this.barTop = this.barBg.y;
    this.drawBar();

    this.pauseBtn.position.set(right - 36, top + 34);
    this.heartRow.position.set(left + 18, top + 92);
    this.chips.position.set(right - 4, top + 92);
  }

  setLevelLabel(text) {
    this.levelText.text = text;
  }

  setProgress(frac, text) {
    this.progress = Math.max(0, Math.min(1, frac));
    this.progressText.text = text;
  }

  setScore(n, instant = false) {
    this.targetScore = n;
    if (instant) {
      this.displayScore = n;
      this.scoreText.text = String(n);
    } else {
      Tweens.ui.kill(this.scoreText.scale);
      this.scoreText.scale.set(1.25);
      Tweens.ui.to(this.scoreText.scale, { x: 1, y: 1 }, 0.3, { ease: Ease.outBack });
    }
  }

  setMultiplier(m) {
    const show = m > 1;
    if (show) this.multBadge.text = `x${m}`;
    if (show && !this.multBadge.visible) {
      this.multBadge.scale.set(0.2);
      Tweens.ui.to(this.multBadge.scale, { x: 1, y: 1 }, 0.35, { ease: Ease.outBack });
    }
    this.multBadge.visible = show;
  }

  setLives(n, animateLoss = false) {
    const prev = this.lives;
    this.lives = n;
    this.hearts.forEach((h, i) => {
      h.texture = i < n ? Tex.hudHeart : Tex.hudHeartEmpty;
      if (animateLoss && i >= n && i < prev) {
        h.scale.set(1.6);
        Tweens.ui.to(h.scale, { x: 1, y: 1 }, 0.4, { ease: Ease.outBack });
      } else if (i < n && i >= prev) {
        h.scale.set(0.3);
        Tweens.ui.to(h.scale, { x: 1, y: 1 }, 0.4, { ease: Ease.outBack });
      }
    });
  }

  /** chips: [{ id, text, color, frac }] */
  setChips(chips) {
    const key = chips.map((c) => c.id).join(',');
    if (key !== this.chipKey) {
      this.chipKey = key;
      this.chips.removeChildren().forEach((c) => c.destroy({ children: true }));
      chips.forEach((c, i) => {
        const chip = new Container();
        chip.bar = new Graphics();
        const bg = new Graphics();
        bg.roundRect(-104, -18, 104, 36, 18).fill({ color: c.color, alpha: 0.9 });
        bg.roundRect(-100, -15, 96, 10, 5).fill({ color: 0xffffff, alpha: 0.35 });
        const t = label(c.text, 17, 0xffffff, { stroke: 0x4a2a5a, strokeW: 4, shadow: false });
        t.position.set(-52, -2);
        chip.addChild(bg, chip.bar, t);
        chip.x = -i * 112;
        chip.id = c.id;
        this.chips.addChild(chip);
      });
    }
    chips.forEach((c, i) => {
      const chip = this.chips.children[i];
      chip.bar.clear();
      chip.bar.roundRect(-96, 9, 88 * Math.max(0, c.frac), 5, 2.5).fill({ color: 0xffffff, alpha: 0.9 });
    });
  }

  drawBar() {
    const w = Math.max(0, BAR_W * this.shownProgress);
    this.barMask.clear();
    if (w > 0) this.barMask.rect(this.barLeft, this.barTop, w, BAR_H).fill(0xffffff);
    this.barFill.visible = w > 0.5;
  }

  update(dt) {
    if (this.displayScore !== this.targetScore) {
      const diff = this.targetScore - this.displayScore;
      const step = Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 12)));
      this.displayScore += Math.sign(diff) * Math.min(Math.abs(diff), step);
      this.scoreText.text = String(this.displayScore);
    }
    if (Math.abs(this.shownProgress - this.progress) > 0.001) {
      this.shownProgress += (this.progress - this.shownProgress) * Math.min(1, dt * 10);
      this.drawBar();
    }
    if (this.multBadge.visible) this.multBadge.rotation = Math.sin(performance.now() / 180) * 0.12;
    // Last heart gently pulses as a warning.
    if (this.lives === 1) this.hearts[0].scale.set(1 + Math.sin(performance.now() / 140) * 0.1);
  }
}
