import { Container, Sprite, Graphics } from 'pixi.js';
import { bunnyTextures, PART_ANCHORS } from '../art/bunnyArt.js';
import { PLAYER, EGG_TYPES } from '../config.js';

const NECK_Y = -118;
const RIM_Y = PLAYER.rimOffsetY;
const EYE_X = 23;
const EYE_Y = -50;
const PILE_SLOTS = [
  [-30, -4, -0.3], [4, -8, 0.15], [36, -3, 0.4], [-56, 0, -0.5], [60, 0, 0.55],
  [-14, -17, -0.15], [20, -18, 0.25], [-40, -13, -0.4], [46, -13, 0.4], [2, -27, 0],
];
const INK = 0x5c3349;

/** A damped spring on a single value; underdamped springs give natural squash & follow-through. */
class Spring {
  constructor(k, d, v = 0) {
    this.k = k;
    this.d = d;
    this.x = v;
    this.v = 0;
    this.target = v;
  }

  step(dt) {
    this.v += ((this.target - this.x) * this.k - this.v * this.d) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

export class Bunny extends Container {
  constructor(textures) {
    super();
    this.eggTex = textures;
    this.scale.set(PLAYER.scale);

    this.shadow = new Sprite();
    this.shadow.anchor.set(0.5);
    this.shadow.y = -2;
    this.rig = new Container();
    this.addChild(this.shadow, this.rig);

    this.tail = new Sprite();
    this.tail.anchor.set(0.5);
    this.tail.position.set(46, -34);
    this.footL = new Sprite();
    this.footR = new Sprite();
    for (const f of [this.footL, this.footR]) f.anchor.set(...PART_ANCHORS.foot);
    this.footR.scale.x = -1;
    this.body = new Sprite();
    this.body.anchor.set(...PART_ANCHORS.body);
    this.body.y = -6;

    this.headPivot = new Container();
    this.headPivot.y = NECK_Y;
    this.earL = new Container();
    this.earR = new Container();
    this.earLS = new Sprite();
    this.earRS = new Sprite();
    this.earLS.anchor.set(...PART_ANCHORS.ear);
    this.earRS.anchor.set(...PART_ANCHORS.ear);
    this.earL.addChild(this.earLS);
    this.earR.addChild(this.earRS);
    this.earL.position.set(-27, -92);
    this.earR.position.set(27, -92);
    this.bow = new Sprite();
    this.bow.anchor.set(0.5);
    this.bow.position.set(-4, -12);
    this.bow.rotation = -0.3;
    this.earR.addChild(this.bow);

    this.head = new Sprite();
    this.head.anchor.set(...PART_ANCHORS.head);
    this.head.y = -44;
    this.crown = new Sprite();
    this.crown.anchor.set(0.5, 0.7);
    this.crown.y = -92;

    this.face = new Container();
    this.cheekL = new Sprite();
    this.cheekR = new Sprite();
    this.cheekL.anchor.set(0.5);
    this.cheekR.anchor.set(0.5);
    this.cheekL.position.set(-40, -28);
    this.cheekR.position.set(40, -28);
    this.eyeL = new Sprite();
    this.eyeR = new Sprite();
    this.eyeL.anchor.set(0.5);
    this.eyeR.anchor.set(0.5);
    this.eyeL.position.set(-EYE_X, EYE_Y);
    this.eyeR.position.set(EYE_X, EYE_Y);
    this.nose = new Sprite();
    this.nose.anchor.set(0.5);
    this.nose.position.set(0, -31);
    this.faceGfx = new Graphics();
    this.sweat = new Sprite();
    this.sweat.anchor.set(0.5);
    this.sweat.position.set(52, -70);
    this.face.addChild(this.cheekL, this.cheekR, this.eyeL, this.eyeR, this.nose, this.faceGfx, this.sweat);
    this.headPivot.addChild(this.earL, this.earR, this.head, this.crown, this.face);

    this.bowtie = new Sprite();
    this.bowtie.anchor.set(0.5);
    this.bowtie.y = -104;

    this.basket = new Container();
    this.basket.y = RIM_Y;
    this.basketBack = new Sprite();
    this.basketBack.anchor.set(95 / 190, 120 / 150);
    this.pile = new Container();
    this.basketFront = new Sprite();
    this.basketFront.anchor.set(...PART_ANCHORS.basketFront);
    this.pawL = new Sprite();
    this.pawR = new Sprite();
    this.pawL.anchor.set(...PART_ANCHORS.paw);
    this.pawR.anchor.set(...PART_ANCHORS.paw);
    this.pawL.position.set(-64, -4);
    this.pawR.position.set(64, -4);
    this.pawR.scale.x = -1;
    this.basket.addChild(this.basketBack, this.pile, this.basketFront, this.pawL, this.pawR);

    this.rig.addChild(this.tail, this.footL, this.footR, this.body, this.headPivot, this.bowtie, this.basket);

    this.pileSprites = PILE_SLOTS.map(([x, y, r]) => {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.position.set(x, y);
      s.rotation = r;
      s.visible = false;
      this.pile.addChild(s);
      return s;
    });
    this.pileCount = 0;

    // Animation state.
    this.t = Math.random() * 10;
    this.squash = new Spring(260, 14);
    this.lean = new Spring(120, 16);
    this.earSpringL = new Spring(90, 7);
    this.earSpringR = new Spring(90, 7);
    this.headTilt = new Spring(80, 12);
    this.basketBounce = new Spring(400, 16);
    this.hopY = 0;
    this.hopV = 0;
    this.walkPhase = 0;
    this.lastStep = 0;
    this.blinkTimer = 2;
    this.blinking = 0;
    this.expr = null;
    this.tempExpr = null;
    this.tempTimer = 0;
    this.mode = 'normal'; // normal | effort | tired | victory
    this.victoryTimer = 0;
    this.shake = 0;
    this.wideFactor = 1;
    this.prevVx = 0;
  }

  setLook(fur, outfit, basket) {
    const t = bunnyTextures(fur, basket);
    this.tex = t;
    this.shadow.texture = t.shadow;
    this.tail.texture = t.tail;
    this.footL.texture = t.foot;
    this.footR.texture = t.foot;
    this.body.texture = t.body;
    this.earLS.texture = t.earL;
    this.earRS.texture = t.earR;
    this.head.texture = t.head;
    this.cheekL.texture = t.cheek;
    this.cheekR.texture = t.cheek;
    this.nose.texture = t.nose;
    this.sweat.texture = t.sweat;
    this.basketBack.texture = t.basketBack;
    this.basketFront.texture = t.basketFront;
    this.pawL.texture = t.paw;
    this.pawR.texture = t.paw;
    this.bow.texture = t.bow;
    this.crown.texture = t.crown;
    this.bowtie.texture = t.bowtie;
    this.bow.visible = outfit === 'bow';
    this.crown.visible = outfit === 'crown';
    this.bowtie.visible = outfit === 'bowtie';
    this.expr = null; // force redraw
    this.applyExpression();
  }

  // ---------- gameplay hooks ----------

  /** Basket rim centre in parent (world) coordinates. */
  rimWorld() {
    const s = this.scale.y;
    return { x: this.x + this.rig.x * s, y: this.y + (RIM_Y + this.hopY + this.basketBounce.x) * s };
  }

  catchHalfWidth() {
    return PLAYER.catchHalfWidth * this.scale.x * this.wideFactor;
  }

  setWide(factor) {
    this.wideFactor = factor;
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'victory') this.victoryTimer = 0;
  }

  react(kind) {
    switch (kind) {
      case 'catch':
        this.squash.v -= 2.8;
        this.basketBounce.v += 130;
        if (this.hopY === 0) this.hopV = -150;
        this.earKick(3);
        this.setTemp('happy', 0.38);
        break;
      case 'special':
        this.squash.v -= 3.2;
        this.basketBounce.v += 130;
        this.hopV = -330;
        this.earKick(6);
        this.setTemp('excited', 1.0);
        break;
      case 'miss':
        this.squash.v += 1.4;
        this.earKick(-3);
        this.setTemp('oops', 0.7);
        break;
      case 'hurt':
        this.squash.v += 2.6;
        this.shake = 0.4;
        this.earKick(-5);
        this.setTemp('hurt', 0.8);
        break;
      case 'combo':
        this.setTemp('excited', 0.6);
        break;
      default:
        break;
    }
  }

  earKick(amount) {
    this.earSpringL.v -= amount;
    this.earSpringR.v += amount;
  }

  setTemp(name, seconds) {
    this.tempExpr = name;
    this.tempTimer = seconds;
  }

  // ---------- basket pile ----------

  setPile(count, types = null) {
    const n = Math.max(0, Math.min(PILE_SLOTS.length, count));
    for (let i = 0; i < PILE_SLOTS.length; i++) {
      const s = this.pileSprites[i];
      const vis = i < n;
      if (vis && (!s.visible || types)) {
        const type = (types && types[i]) || s.eggType || 'blueDots';
        s.eggType = type;
        s.texture = this.eggTex[type];
        s.scale.set(0.62 / (EGG_TYPES[type]?.scale || 1));
      }
      s.visible = vis;
    }
    this.pileCount = n;
  }

  pushPile(type) {
    if (this.pileCount >= PILE_SLOTS.length) return;
    const s = this.pileSprites[this.pileCount];
    s.eggType = type;
    s.texture = this.eggTex[type];
    s.scale.set(0.62 / (EGG_TYPES[type]?.scale || 1));
    s.visible = true;
    s.dropY = -26;
    this.pileCount++;
  }

  pileCapacity() { return PILE_SLOTS.length; }

  // ---------- animation ----------

  update(dt, vx = 0) {
    this.t += dt;
    const t = this.t;
    const speed = Math.abs(vx);
    const ax = Math.max(-8000, Math.min(8000, (vx - this.prevVx) / Math.max(dt, 1e-4)));
    this.prevVx = vx;

    if (this.tempTimer > 0) {
      this.tempTimer -= dt;
      if (this.tempTimer <= 0) this.tempExpr = null;
    }

    // Victory: repeated happy jumps.
    if (this.mode === 'victory') {
      this.victoryTimer -= dt;
      if (this.hopY >= 0 && this.victoryTimer <= 0) {
        this.hopV = -460;
        this.squash.v += 2;
        this.earKick(5);
        this.victoryTimer = 0.15;
      }
    }

    // Hop (simple ballistic arc) with landing squash.
    if (this.hopV !== 0 || this.hopY < 0) {
      this.hopV += 2200 * dt;
      this.hopY += this.hopV * dt;
      if (this.hopY >= 0) {
        const impact = this.hopV;
        this.hopY = 0;
        this.hopV = 0;
        this.squash.v += Math.min(4, impact / 150);
        this.earKick(-impact / 120);
      }
    }

    // Walk bounce while moving.
    let walkLift = 0;
    if (speed > 50 && this.mode !== 'tired') {
      this.walkPhase += dt * (8 + speed * 0.012);
      walkLift = Math.abs(Math.sin(this.walkPhase)) * Math.min(1, speed / 400) * 7;
      const step = Math.floor(this.walkPhase / Math.PI);
      if (step !== this.lastStep) {
        this.lastStep = step;
        this.earKick(1.2);
        this.squash.v += 0.6;
      }
    }

    // Squash and stretch: positive = squashed.
    const baseSquash = this.mode === 'tired' ? 0.07 : this.currentExpr() === 'effort' ? 0.035 : 0;
    this.squash.target = baseSquash;
    const s = this.squash.step(dt);
    const breathe = Math.sin(t * 2.4) * 0.012;
    const stretchFromHop = Math.min(0.12, Math.max(-0.08, -this.hopV / 3000));
    const sy = 1 - s + breathe + stretchFromHop;
    const sx = 1 + s * 0.7 - stretchFromHop * 0.5;
    this.rig.scale.set(sx, sy);

    // Lean into movement, with a small idle weight shift.
    this.lean.target = Math.max(-0.2, Math.min(0.2, vx / 3200));
    const idle = speed < 30 && this.mode === 'normal';
    let shakeX = 0;
    if (this.shake > 0) {
      this.shake -= dt;
      shakeX = Math.sin(t * 60) * 5 * (this.shake / 0.4);
    }
    this.rig.rotation = this.lean.step(dt) + (idle ? Math.sin(t * 0.9) * 0.015 : 0);
    this.rig.x = (idle ? Math.sin(t * 0.9) * 2 : 0) + shakeX;
    this.rig.y = this.hopY - walkLift;

    // Feet alternate while walking and dangle while airborne.
    const air = Math.min(1, -this.hopY / 60);
    const fl = speed > 50 ? Math.max(0, Math.sin(this.walkPhase)) * 5 : 0;
    const fr = speed > 50 ? Math.max(0, -Math.sin(this.walkPhase)) * 5 : 0;
    this.footL.position.set(-26 - air * 4, -2 - fl + walkLift + air * 6);
    this.footR.position.set(26 + air * 4, -2 - fr + walkLift + air * 6);
    this.footL.rotation = -air * 0.3;
    this.footR.rotation = air * 0.3;

    // Head: bob, follow-through tilt, look down when the basket is nearly full.
    const expr = this.currentExpr();
    const lookDown = expr === 'effort' ? 0.06 : this.mode === 'tired' ? 0.1 : 0;
    this.headTilt.target = -this.lean.x * 0.6 + (idle ? Math.sin(t * 0.6) * 0.04 : 0);
    this.headPivot.rotation = this.headTilt.step(dt);
    this.headPivot.y = NECK_Y + Math.sin(t * 2.4 + 0.6) * 1.2 + lookDown * 60 + s * 30;
    this.face.y = lookDown * 40;

    // Ears: springs pushed by acceleration, hops and steps (secondary motion).
    const droop = this.mode === 'tired' ? 1.15 : expr === 'oops' || expr === 'hurt' ? 0.45 : 0;
    const wiggle = idle && Math.sin(t * 0.7) > 0.96 ? Math.sin(t * 30) * 0.15 : 0;
    this.earSpringL.target = -0.16 - droop + wiggle;
    this.earSpringR.target = 0.24 + droop * 1.1 - wiggle * 0.5;
    this.earSpringL.v += -ax * 0.00035;
    this.earSpringR.v += -ax * 0.00035;
    this.earL.rotation = this.earSpringL.step(dt);
    this.earR.rotation = this.earSpringR.step(dt);

    // Tail wags with movement.
    this.tail.rotation = Math.sin(t * 6) * 0.1 * Math.min(1, speed / 200);
    this.tail.x = 46 - this.lean.x * 40;

    // Basket bounce + paws.
    this.basketBounce.target = 0;
    const bb = this.basketBounce.step(dt);
    this.basket.y = RIM_Y + bb * 0.12;
    const bs = PLAYER.basketScale;
    this.basket.scale.set(bs * this.wideFactor * (1 + bb * 0.0006), bs * (1 - bb * 0.0004));

    for (const p of this.pileSprites) {
      if (p.dropY) {
        p.dropY *= Math.exp(-dt * 14);
        if (Math.abs(p.dropY) < 0.3) p.dropY = 0;
        p.y = PILE_SLOTS[this.pileSprites.indexOf(p)][1] + p.dropY;
      }
    }

    // Shadow stays on the ground and shrinks while hopping.
    const sh = 1 - Math.min(0.5, -this.hopY / 260);
    this.shadow.scale.set(sh * this.wideFactor, sh);
    this.shadow.alpha = 0.9 * sh;
    this.shadow.x = this.rig.x;

    // Blink.
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = 0.13;
      this.blinkTimer = 1.8 + Math.random() * 3.2;
      if (Math.random() < 0.2) this.blinkTimer = 0.25; // occasional double blink
    }
    if (this.blinking > 0) this.blinking -= dt;

    this.applyExpression();
    const eyeScaleY = this.blinking > 0 ? 0.12 : 1;
    const eyeBase = expr === 'oops' || expr === 'hurt' ? 1.12 : expr === 'excited' ? 1.12 : 1;
    const sparkle = expr === 'excited' ? 1 + Math.sin(t * 18) * 0.05 : 1;
    this.eyeL.scale.set(eyeBase * sparkle, eyeBase * eyeScaleY * sparkle);
    this.eyeR.scale.set(eyeBase * sparkle, eyeBase * eyeScaleY * sparkle);
    this.sweat.y = -70 + Math.sin(t * 5) * 2;
  }

  currentExpr() {
    if (this.tempExpr) return this.tempExpr;
    if (this.mode === 'tired') return 'tired';
    if (this.mode === 'victory') return 'excited';
    if (this.mode === 'effort') return 'effort';
    return 'normal';
  }

  applyExpression() {
    const expr = this.currentExpr();
    if (expr === this.expr || !this.tex) return;
    this.expr = expr;
    const g = this.faceGfx;
    g.clear();
    const eyesOpen = expr === 'normal' || expr === 'excited' || expr === 'oops' || expr === 'tired';
    this.eyeL.visible = eyesOpen;
    this.eyeR.visible = eyesOpen;
    this.eyeL.texture = expr === 'excited' ? this.tex.eyeSparkle : this.tex.eye;
    this.eyeR.texture = this.eyeL.texture;
    this.sweat.visible = expr === 'effort';
    this.cheekL.alpha = this.cheekR.alpha = expr === 'happy' || expr === 'excited' ? 1 : 0.7;

    const stroke = { width: 3.4, color: INK, cap: 'round', join: 'round' };
    const fur = parseInt(this.tex.palette.base.slice(1), 16);
    const deep = parseInt(this.tex.palette.deep.slice(1), 16);

    // Eyes that aren't sprites.
    if (expr === 'happy' || expr === 'victory') {
      for (const sx of [-1, 1]) {
        g.moveTo(sx * EYE_X - 10, EYE_Y + 4).quadraticCurveTo(sx * EYE_X, EYE_Y - 10, sx * EYE_X + 10, EYE_Y + 4).stroke({ ...stroke, width: 4.2 });
      }
    } else if (expr === 'effort' || expr === 'hurt') {
      g.moveTo(-EYE_X - 9, EYE_Y - 7).lineTo(-EYE_X + 7, EYE_Y).lineTo(-EYE_X - 9, EYE_Y + 7).stroke({ ...stroke, width: 4 });
      g.moveTo(EYE_X + 9, EYE_Y - 7).lineTo(EYE_X - 7, EYE_Y).lineTo(EYE_X + 9, EYE_Y + 7).stroke({ ...stroke, width: 4 });
    }
    if (expr === 'tired') {
      for (const sx of [-1, 1]) {
        g.ellipse(sx * EYE_X, EYE_Y - 9, 15, 11).fill(fur);
        g.moveTo(sx * EYE_X - 12, EYE_Y - 2).quadraticCurveTo(sx * EYE_X, EYE_Y + 2, sx * EYE_X + 12, EYE_Y - 2).stroke({ ...stroke, width: 2.6 });
      }
    }
    // Brows.
    if (expr === 'oops' || expr === 'tired' || expr === 'hurt') {
      g.moveTo(-EYE_X - 10, EYE_Y - 20).lineTo(-EYE_X + 6, EYE_Y - 25).stroke({ width: 3, color: deep, cap: 'round' });
      g.moveTo(EYE_X + 10, EYE_Y - 20).lineTo(EYE_X - 6, EYE_Y - 25).stroke({ width: 3, color: deep, cap: 'round' });
    } else if (expr === 'effort') {
      g.moveTo(-EYE_X - 10, EYE_Y - 22).lineTo(-EYE_X + 7, EYE_Y - 18).stroke({ width: 3, color: deep, cap: 'round' });
      g.moveTo(EYE_X + 10, EYE_Y - 22).lineTo(EYE_X - 7, EYE_Y - 18).stroke({ width: 3, color: deep, cap: 'round' });
    }

    // Mouth.
    const my = -24;
    if (expr === 'happy' || expr === 'excited' || expr === 'victory') {
      const w = expr === 'excited' ? 11 : 9;
      g.moveTo(-w, my).quadraticCurveTo(0, my + (expr === 'excited' ? 20 : 15), w, my).closePath().fill(0x8a2f55);
      g.ellipse(0, my + (expr === 'excited' ? 9 : 7), w * 0.5, 3.5).fill(0xff8fae);
      g.moveTo(-w, my).quadraticCurveTo(0, my + (expr === 'excited' ? 20 : 15), w, my).closePath().stroke({ ...stroke, width: 2.4 });
    } else if (expr === 'oops' || expr === 'hurt') {
      g.ellipse(0, my + 6, 5, 6.5).fill(0x8a2f55);
      g.ellipse(0, my + 6, 5, 6.5).stroke({ ...stroke, width: 2.2 });
    } else if (expr === 'tired') {
      g.moveTo(-7, my + 8).quadraticCurveTo(0, my + 2, 7, my + 8).stroke({ ...stroke, width: 2.8 });
    } else if (expr === 'effort') {
      g.moveTo(-9, my + 5).quadraticCurveTo(-5, my + 1, -2, my + 5).quadraticCurveTo(2, my + 9, 5, my + 5).quadraticCurveTo(7, my + 2, 9, my + 4).stroke({ ...stroke, width: 2.6 });
    } else {
      g.moveTo(0, my - 4).lineTo(0, my).stroke({ ...stroke, width: 2.4 });
      g.moveTo(-8, my - 1).quadraticCurveTo(-4, my + 6, 0, my).stroke({ ...stroke, width: 2.6 });
      g.moveTo(0, my).quadraticCurveTo(4, my + 6, 8, my - 1).stroke({ ...stroke, width: 2.6 });
    }
  }
}
