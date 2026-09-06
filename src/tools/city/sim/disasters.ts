// Disasters the mayor can trigger: fire (see fire.ts), a wandering tornado
// and an instant earthquake. All damage goes through the same demolish path
// growth and fire use, so chunks and networks are flagged correctly.

import { PLOP, T, type CityState, type XY } from '../types';
import { CHANGE } from '../types';
import { removePlop } from './actions';
import { startFire } from './fire';
import { idx, inBounds } from './grid';
import { demolish } from './growth';
import { markDirty, nextRandom } from './state';

const TORNADO_TICKS = 40;

function wreck(s: CityState, i: number, fireChance: number): void {
  if (s.level[i]) {
    demolish(s, i);
    if (nextRandom(s) < fireChance) {
      // the rubble may catch: re-ignite a neighbour instead since this tile is now empty
      const n = i + (nextRandom(s) < 0.5 ? 1 : -1);
      if (n >= 0 && n < T) startFire(s, n);
    }
  } else if (s.plop[i] && s.plop[i] !== PLOP.LINE) {
    removePlop(s, i);
  } else if (s.plop[i] === PLOP.LINE) {
    s.plop[i] = PLOP.NONE;
    s.plopOrigin[i] = 0;
    s.flags.netDirty = true;
    markDirty(s, i);
  }
}

export function startTornado(s: CityState, at: XY): void {
  const a = nextRandom(s) * Math.PI * 2;
  s.tornado = { x: at.x, y: at.y, dx: Math.cos(a), dy: Math.sin(a), ticksLeft: TORNADO_TICKS };
  s.changed |= CHANGE.HUD;
}

/** Every tick while a tornado is alive: wander one tile, wreck what it touches. */
export function stepTornado(s: CityState): void {
  const t = s.tornado;
  if (!t) return;
  // wander
  const turn = (nextRandom(s) - 0.5) * 0.9;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const ndx = t.dx * cos - t.dy * sin;
  const ndy = t.dx * sin + t.dy * cos;
  t.dx = ndx;
  t.dy = ndy;
  t.x += t.dx;
  t.y += t.dy;
  t.ticksLeft--;
  const cx = Math.round(t.x);
  const cy = Math.round(t.y);
  if (!inBounds(cx, cy) || t.ticksLeft <= 0) {
    s.tornado = null;
    s.changed |= CHANGE.HUD;
    return;
  }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(x, y)) continue;
      const p = dx === 0 && dy === 0 ? 0.9 : 0.35;
      if (nextRandom(s) < p) wreck(s, idx(x, y), 0.05);
    }
  }
  s.changed |= CHANGE.HUD;
}

/** Instant quake: damage falls off with distance from the epicentre; fires break out. */
export function earthquake(s: CityState, at: XY, radius = 9): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = at.x + dx;
      const y = at.y + dy;
      if (!inBounds(x, y)) continue;
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const p = 0.75 * (1 - d / radius);
      const i = idx(x, y);
      if (nextRandom(s) < p) wreck(s, i, 0.15);
      else if (s.level[i] && nextRandom(s) < p * 0.3) startFire(s, i);
    }
  }
  s.changed |= CHANGE.QUAKE | CHANGE.HUD;
}
