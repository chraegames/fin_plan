// Garbage: every building produces rubbish each month; collection facilities
// reach along the roads (like services) and serve what their capacity allows.
// Uncollected lots lose desirability and land value and emit pollution.

import { TUNING, plopDef } from '../constants';
import { CHANGE, POLICY, SERVICE, T, ZONE, type CityState } from '../types';
import { effectiveFunding } from './budget';
import { hasPolicy } from './policies';
import { coverAlongRoads } from './reach';

/** Rubbish a lot produces per month. */
export function garbageOf(s: CityState, i: number): number {
  if (!s.level[i] || s.abandoned[i]) return 0;
  const base = s.zone[i] === ZONE.R ? s.pop[i] * TUNING.garbagePerPop : s.jobs[i] * TUNING.garbagePerJob;
  return hasPolicy(s, POLICY.RECYCLING) ? base * 0.75 : base;
}

/** Recompute garbageCover and the garbage totals. */
export function computeGarbage(s: CityState): void {
  s.garbageCover.fill(0);
  const funding = effectiveFunding(s, SERVICE.GARBAGE);
  let supply = 0;
  let demand = 0;
  for (let i = 0; i < T; i++) demand += garbageOf(s, i);
  // each facility: reach along roads, then scale by what it can actually take
  for (let i = 0; i < T; i++) {
    const def = s.plop[i] ? plopDef(s.plop[i]) : undefined;
    if (!def || def.kind !== 'garbage' || s.plopOrigin[i] !== i || s.onFire[i] || funding <= 0) continue;
    const capacity = def.capacity * funding;
    supply += capacity;
    coverAlongRoads(s, i, def.size, TUNING.serviceRange[def.id] * Math.sqrt(funding), (tiles, n) => {
      let load = 0;
      for (let k = 0; k < n; k++) load += garbageOf(s, tiles[k]);
      // facilities share the load: each adds its slice, so two half-size plants serve a district in full
      const f = Math.min(1, capacity / Math.max(1, load));
      const v = Math.round(255 * f);
      for (let k = 0; k < n; k++) {
        const j = tiles[k];
        s.garbageCover[j] = Math.min(255, s.garbageCover[j] + v);
      }
    });
  }
  let lots = 0;
  let uncollected = 0;
  for (let i = 0; i < T; i++) {
    if (!s.level[i] || s.abandoned[i] || (s.lotSize[i] > 1 && s.lotOrigin[i] !== i)) continue;
    lots++;
    if (s.garbageCover[i] < 128) uncollected++;
  }
  s.totals.garbageSupply = supply;
  s.totals.garbageDemand = demand;
  s.totals.garbageUncollected = lots ? uncollected / lots : 0;
  s.changed |= CHANGE.UTILITY | CHANGE.HUD;
}
