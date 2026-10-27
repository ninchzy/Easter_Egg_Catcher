/** Simple object pool so eggs and particles are recycled instead of re-allocated every spawn. */
export class Pool {
  constructor(create, reset = null) {
    this.create = create;
    this.reset = reset;
    this.free = [];
    this.active = [];
  }

  get() {
    const obj = this.free.pop() || this.create();
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const i = this.active.indexOf(obj);
    if (i < 0) return;
    // Swap-remove: order of active objects doesn't matter.
    const last = this.active.pop();
    if (i < this.active.length) this.active[i] = last;
    if (this.reset) this.reset(obj);
    this.free.push(obj);
  }

  releaseAll() {
    while (this.active.length) this.release(this.active[this.active.length - 1]);
  }
}
