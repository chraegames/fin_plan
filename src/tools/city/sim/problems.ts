// Problem flags: one byte per building lot saying what is wrong with it, so
// the renderer can hang an icon over it and the inspector can explain it.
// Runs after desirability in the staggered tick.

import { TUNING } from '../constants';
import { CHANGE, PROBLEM, T, ZONE, type CityState } from '../types';
import { tileCapacity } from './buildings';
import { customers } from './desirability';

export function computeProblems(s: CityState): void {
  const t = s.totals;
  const workforce = t.population * TUNING.workforceRate;
  const laborFactor = t.jobs > 0 ? Math.min(1, (workforce + 200) / t.jobs) : 1;
  const garbageMatters = t.population >= 150;
  let count = 0;
  for (let i = 0; i < T; i++) {
    let bits = 0;
    if (s.level[i] && !s.abandoned[i] && (s.lotSize[i] <= 1 || s.lotOrigin[i] === i) && !s.onFire[i]) {
      const z = s.zone[i];
      if (!s.powered[i]) bits |= PROBLEM.NO_POWER;
      if (!s.watered[i] && (s.density[i] > 1 || s.wealth[i] > 1)) bits |= PROBLEM.NO_WATER;
      if (!s.roadAccess[i]) bits |= PROBLEM.NO_ROAD;
      if (z === ZONE.R) {
        if (s.commute[i] === 255 && s.pop[i] > 0 && s.age[i] > 0) bits |= PROBLEM.NO_JOBS;
        if (s.crime[i] > 140 || s.pollution[i] > 120) bits |= PROBLEM.BLIGHT;
      } else {
        const cap = tileCapacity(s, i);
        if (laborFactor < 0.8 && s.jobs[i] < cap * 0.6) bits |= PROBLEM.NO_WORKERS;
        if (z === ZONE.C && customers[i] < 0.12) bits |= PROBLEM.NO_CUSTOMERS;
        if (s.crime[i] > 170 || (z === ZONE.C && s.pollution[i] > 170)) bits |= PROBLEM.BLIGHT;
      }
      if (garbageMatters && s.garbageCover[i] < 128) bits |= PROBLEM.GARBAGE;
      if (bits) count++;
    }
    s.problems[i] = bits;
  }
  t.problems = count;
  s.changed |= CHANGE.SOCIAL | CHANGE.HUD;
}
