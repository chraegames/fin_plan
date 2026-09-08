// SimHost: owns the CityState, runs ticks on a clock, applies actions and
// emits snapshots. Used by the worker and by the inline fallback alike.

import { applyTuning, MAX_TICKS_PER_STEP, TICK_RATES } from '../constants';
import { buildHud, packSnapshot, SNAPSHOT_BYTES, type MainToWorker, type WorkerToMain } from '../protocol';
import { decodeSave, encodeSave } from '../save';
import { type Action, type CityState, type Speed } from '../types';
import { createCityState } from './state';
import { applyActions, primeDerived, tick } from './tick';

const SNAPSHOT_INTERVAL_MS = 100;
const POOL = 3;

export class SimHost {
  state: CityState | null = null;
  speed: Speed = 0;
  private acc = 0;
  private lastStep = 0;
  private lastSnapshot = 0;
  private pool: ArrayBuffer[] = [];
  private pending: { id: number; action: Action }[] = [];
  private wantSnapshot = false;
  private readonly post: (msg: WorkerToMain, transfer?: Transferable[]) => void;

  constructor(post: (msg: WorkerToMain, transfer?: Transferable[]) => void) {
    this.post = post;
  }

  handle(msg: MainToWorker): void {
    switch (msg.type) {
      case 'init': {
        const s = (msg.save && decodeSave(msg.save)) || createCityState(msg.seed);
        primeDerived(s);
        s.changed = 0xff;
        s.dirtyChunks.fill(1);
        this.state = s;
        this.pool = [];
        for (let k = 0; k < POOL; k++) this.pool.push(new ArrayBuffer(SNAPSHOT_BYTES));
        this.post({ type: 'terrain', seed: s.seed, height: s.height.slice(), sea: s.sea, water: s.water.slice(), slope: s.slope.slice() });
        this.wantSnapshot = true;
        this.flush(true);
        return;
      }
      case 'actions':
        this.pending.push(...msg.actions);
        if (this.state && this.speed === 0) {
          applyActions(this.state, this.pending);
          this.pending.length = 0;
          this.wantSnapshot = true;
          this.flush(true);
        }
        return;
      case 'speed':
        this.speed = msg.speed;
        this.acc = 0;
        return;
      case 'recycle':
        if (msg.buf.byteLength === SNAPSHOT_BYTES && this.pool.length < POOL) this.pool.push(msg.buf);
        if (this.wantSnapshot) this.flush(true);
        return;
      case 'requestSave':
        if (this.state) this.post({ type: 'save', id: msg.id, file: encodeSave(this.state) });
        return;
      case 'requestSnapshot':
        this.wantSnapshot = true;
        this.flush(true);
        return;
      case 'tuning':
        applyTuning(msg.overrides);
        return;
      case 'fastForward':
        if (this.state) {
          applyActions(this.state, this.pending);
          this.pending.length = 0;
          for (let k = 0; k < msg.ticks; k++) tick(this.state);
          this.wantSnapshot = true;
          this.flush(true);
        }
        return;
    }
  }

  /** Advance the clock; call every ~20 ms. */
  step(now: number): void {
    const s = this.state;
    if (!s) return;
    const dt = this.lastStep ? Math.min(0.25, (now - this.lastStep) / 1000) : 0;
    this.lastStep = now;
    const rate = TICK_RATES[this.speed];
    if (rate > 0) {
      this.acc += dt * rate;
      let n = 0;
      while (this.acc >= 1 && n < MAX_TICKS_PER_STEP) {
        if (this.pending.length) {
          applyActions(s, this.pending);
          this.pending.length = 0;
        }
        tick(s);
        this.acc -= 1;
        n++;
      }
      if (this.acc > MAX_TICKS_PER_STEP) this.acc = 0;
      if (n > 0) this.wantSnapshot = true;
    }
    this.flush(false, now);
  }

  private flush(force: boolean, now = this.lastStep): void {
    const s = this.state;
    if (!s || !this.wantSnapshot) return;
    if (!force && now - this.lastSnapshot < SNAPSHOT_INTERVAL_MS) return;
    const buf = this.pool.pop();
    if (!buf) return; // main thread still holds every buffer; try again later
    packSnapshot(s, buf);
    const dirty = s.dirtyChunks.slice();
    const msg: WorkerToMain = {
      type: 'snapshot',
      buf,
      tick: s.tick,
      hud: buildHud(s),
      dirtyChunks: dirty,
      changed: s.changed,
      messages: s.messages.slice(),
      notices: s.notices.splice(0),
      results: s.results.splice(0),
    };
    s.dirtyChunks.fill(0);
    s.changed = 0;
    this.post(msg, [buf]);
    this.wantSnapshot = false;
    this.lastSnapshot = now;
  }
}
