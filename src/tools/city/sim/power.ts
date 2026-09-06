// Power: conductive tiles (anything zoned, built, plopped or a road) form
// components by union-find; each component's plants must cover its demand or
// it browns out — a stable, deterministic fraction of tiles goes dark.

import { plopDef } from '../constants';
import { hashSeed } from '../rng';
import { CHANGE, SERVICE, T, type CityState } from '../types';
import { powerDemandOf } from './buildings';
import { effectiveFunding } from './budget';
import { nbr } from './grid';

const conductive = (s: CityState, i: number): boolean => !!(s.zone[i] || s.level[i] || s.plop[i] || s.road[i]);

function find(parent: Int32Array, i: number): number {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

/** Rebuild powerComp (root tile index per tile, -1 for non-conductive). */
export function rebuildPowerNetwork(s: CityState): void {
  const parent = s.powerComp;
  for (let i = 0; i < T; i++) parent[i] = conductive(s, i) ? i : -1;
  for (let i = 0; i < T; i++) {
    if (parent[i] < 0) continue;
    const e = nbr(i, 0);
    const so = nbr(i, 1);
    if (e >= 0 && parent[e] >= 0) union(parent, i, e);
    if (so >= 0 && parent[so] >= 0) union(parent, i, so);
  }
  for (let i = 0; i < T; i++) if (parent[i] >= 0) parent[i] = find(parent, i);
  s.flags.netDirty = false;
}

function union(parent: Int32Array, a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra !== rb) parent[ra < rb ? rb : ra] = ra < rb ? ra : rb;
}

/** Plant output on tile i (origin tiles only). */
export function plantOutput(s: CityState, i: number): number {
  const def = plopDef(s.plop[i]);
  if (!def || def.kind !== 'power' || s.plopOrigin[i] !== i || s.onFire[i]) return 0;
  let out = def.capacity;
  if (def.key === 'wind') out *= 0.6 + Math.max(0, s.height[i] - s.sea) * 2;
  return out * Math.min(1, effectiveFunding(s, SERVICE.POWER));
}

/** Balance supply vs demand per component and write powered[]. */
export function balancePower(s: CityState): void {
  const supply = s.scratchA;
  const demand = s.scratchB;
  supply.fill(0);
  demand.fill(0);
  let totalSupply = 0;
  let totalDemand = 0;
  for (let i = 0; i < T; i++) {
    const c = s.powerComp[i];
    if (c < 0) continue;
    const out = plantOutput(s, i);
    if (out) {
      supply[c] += out;
      totalSupply += out;
    }
    const d = powerDemandOf(s, i);
    if (d) {
      demand[c] += d;
      totalDemand += d;
    }
  }
  let changed = false;
  for (let i = 0; i < T; i++) {
    const c = s.powerComp[i];
    let p = 0;
    if (c >= 0 && supply[c] > 0) {
      if (demand[c] <= supply[c]) p = 1;
      else p = hashSeed(s.seed, i) / 4294967296 < supply[c] / demand[c] ? 1 : 0;
    }
    if (s.powered[i] !== p) {
      s.powered[i] = p;
      changed = true;
    }
  }
  s.totals.powerSupply = totalSupply;
  s.totals.powerDemand = totalDemand;
  if (changed) s.changed |= CHANGE.UTILITY;
  s.changed |= CHANGE.HUD;
}
