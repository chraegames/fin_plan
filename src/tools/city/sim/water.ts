// Water: pipes run under every road and from pumps and towers. Pipe tiles
// form components; a component's supply covers tiles within a square radius
// of its pipes, shrinking when demand exceeds supply.

import { TUNING, plopDef } from '../constants';
import { CHANGE, PLOP, SERVICE, T, type CityState } from '../types';
import { waterDemandOf } from './buildings';
import { effectiveFunding } from './budget';
import { idx, inBounds, nbr, xOf, yOf } from './grid';

const isPipe = (s: CityState, i: number): boolean => s.road[i] > 0 || s.plop[i] === PLOP.PUMP || s.plop[i] === PLOP.TOWER;

function find(parent: Int32Array, i: number): number {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

function nearWater(s: CityState, i: number): boolean {
  const x = xOf(i);
  const y = yOf(i);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inBounds(x + dx, y + dy) && s.water[idx(x + dx, y + dy)]) return true;
  return false;
}

export function pumpOutput(s: CityState, i: number): number {
  const def = plopDef(s.plop[i]);
  if (!def || def.kind !== 'water' || s.plopOrigin[i] !== i || s.onFire[i]) return 0;
  let out = def.capacity;
  if (def.id === PLOP.PUMP) out *= (nearWater(s, i) ? 1 : TUNING.pumpFar) * (1 - s.waterPollution[i] / 255 / 2);
  return out * Math.min(1, effectiveFunding(s, SERVICE.WATER));
}

/** Rebuild the pipe components and the watered[] coverage. */
export function rebuildWaterNetwork(s: CityState): void {
  const parent = s.waterComp;
  for (let i = 0; i < T; i++) parent[i] = isPipe(s, i) ? i : -1;
  for (let i = 0; i < T; i++) {
    if (parent[i] < 0) continue;
    for (const d of [0, 1]) {
      const n = nbr(i, d);
      if (n >= 0 && parent[n] >= 0) {
        const ra = find(parent, i);
        const rb = find(parent, n);
        if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
      }
    }
  }
  for (let i = 0; i < T; i++) if (parent[i] >= 0) parent[i] = find(parent, i);
  s.flags.waterDirty = false;
  coverWater(s);
}

/** Coverage pass: square-radius BFS from pipes, then demand vs supply per component. */
export function coverWater(s: CityState): void {
  const R = TUNING.waterRadius;
  const dist = s.scratchA; // distance to nearest pipe (cap R+1)
  const comp = s.scratchB; // component root of that pipe
  const queue = s.queue;
  dist.fill(R + 1);
  comp.fill(-1);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < T; i++) {
    if (s.waterComp[i] >= 0) {
      dist[i] = 0;
      comp[i] = s.waterComp[i];
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = dist[i] + 1;
    if (d > R) continue;
    const x = xOf(i);
    const y = yOf(i);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const n = idx(nx, ny);
        if (dist[n] <= d) continue;
        dist[n] = d;
        comp[n] = comp[i];
        queue[tail++] = n;
      }
    }
  }
  const supply = s.scratchC;
  supply.fill(0);
  const demand = new Map<number, number>();
  let totalSupply = 0;
  let totalDemand = 0;
  for (let i = 0; i < T; i++) {
    const c = comp[i];
    if (c < 0) continue;
    const out = pumpOutput(s, i);
    if (out) {
      supply[c] += out;
      totalSupply += out;
    }
    const d = waterDemandOf(s, i);
    if (d) {
      demand.set(c, (demand.get(c) ?? 0) + d);
      totalDemand += d;
    }
  }
  let changed = false;
  for (let i = 0; i < T; i++) {
    const c = comp[i];
    let w = 0;
    if (c >= 0 && supply[c] > 0) {
      const dem = demand.get(c) ?? 0;
      const radius = dem <= supply[c] ? R : Math.floor((R * supply[c]) / dem);
      w = dist[i] <= radius ? 1 : 0;
    }
    if (s.watered[i] !== w) {
      s.watered[i] = w;
      changed = true;
    }
  }
  s.totals.waterSupply = totalSupply;
  s.totals.waterDemand = totalDemand;
  if (changed) s.changed |= CHANGE.UTILITY;
  s.changed |= CHANGE.HUD;
}
