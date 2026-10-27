// Minimal tween engine driven by the game ticker (respects pause because UI and game
// tweens live in separate groups).

export const Ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

function getPath(obj, key) {
  const dot = key.indexOf('.');
  if (dot < 0) return [obj, key];
  return [obj[key.slice(0, dot)], key.slice(dot + 1)];
}

export class TweenGroup {
  constructor() {
    this.list = [];
  }

  to(target, props, duration, { ease = Ease.outCubic, delay = 0, onComplete = null, onUpdate = null } = {}) {
    const tw = { target, props: [], duration: Math.max(0.0001, duration), t: -delay, ease, onComplete, onUpdate, dead: false };
    for (const [k, v] of Object.entries(props)) {
      const [o, key] = getPath(target, k);
      tw.props.push({ o, key, to: v, from: null });
    }
    this.list.push(tw);
    return tw;
  }

  wait(seconds, fn) {
    return this.to({}, {}, seconds, { onComplete: fn });
  }

  kill(target) {
    for (const tw of this.list) if (tw.target === target) tw.dead = true;
  }

  clear() {
    this.list.length = 0;
  }

  update(dt) {
    for (let i = 0; i < this.list.length; i++) {
      const tw = this.list[i];
      if (tw.dead) continue;
      tw.t += dt;
      if (tw.t < 0) continue;
      if (tw.props.length && tw.props[0].from === null) {
        for (const p of tw.props) p.from = p.o[p.key];
      }
      const k = Math.min(1, tw.t / tw.duration);
      const e = tw.ease(k);
      for (const p of tw.props) p.o[p.key] = p.from + (p.to - p.from) * e;
      if (tw.onUpdate) tw.onUpdate(k);
      if (k >= 1) {
        tw.dead = true;
        if (tw.onComplete) tw.onComplete();
      }
    }
    if (this.list.length > 64 || this.list.some((t) => t.dead)) this.list = this.list.filter((t) => !t.dead);
  }
}

/** Shared groups: `game` freezes while paused, `ui` always runs. */
export const Tweens = { game: new TweenGroup(), ui: new TweenGroup() };
