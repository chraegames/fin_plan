// Crime: density and poverty raise it, police, schooling and land value lower it.

import { TUNING } from '../constants';
import { CHANGE, POLICY, T, type CityState } from '../types';
import { idx, inBounds, xOf, yOf } from './grid';
import { hasPolicy } from './policies';

export function abandonedAround(s: CityState, i: number): number {
  const x = xOf(i);
  const y = yOf(i);
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inBounds(x + dx, y + dy) && s.abandoned[idx(x + dx, y + dy)]) n++;
  return n;
}

export function computeCrime(s: CityState): void {
  const watch = hasPolicy(s, POLICY.WATCH) ? 0.85 : 1;
  for (let i = 0; i < T; i++) {
    if (!s.level[i]) {
      s.crime[i] = Math.round(s.crime[i] * 0.7);
      continue;
    }
    const load = ((s.pop[i] + s.jobs[i]) / TUNING.crimeCapNorm) * TUNING.crimeDensity[s.density[i]] * TUNING.crimeWealth[s.wealth[i]] * (1 + (0.5 * abandonedAround(s, i)) / 8);
    let raw = 255 * Math.min(1, load) - TUNING.crimePolice * s.policeCover[i] - TUNING.crimeEdu * s.eduCover[i] - TUNING.crimeLandValue * s.landValue[i];
    if (s.abandoned[i]) raw += 60;
    raw = Math.max(0, Math.min(255, raw * watch));
    s.crime[i] = Math.round(s.crime[i] * (1 - TUNING.crimeEma) + raw * TUNING.crimeEma);
  }
  s.changed |= CHANGE.SOCIAL;
}
