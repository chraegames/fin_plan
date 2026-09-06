// Residents' education and health drift toward what their neighbourhood offers.

import { TUNING } from '../constants';
import { CHANGE, T, ZONE, type CityState } from '../types';

export function updatePeople(s: CityState): void {
  for (let i = 0; i < T; i++) {
    if (!s.level[i] || s.zone[i] !== ZONE.R || s.abandoned[i]) {
      s.edu[i] = 0;
      s.health[i] = 0;
      continue;
    }
    const eduTarget = (100 * s.eduCover[i]) / 255;
    const healthTarget = ((100 * s.healthCover[i]) / 255) * (1 - (0.5 * s.pollution[i]) / 255);
    s.edu[i] = Math.round(s.edu[i] + (eduTarget - s.edu[i]) * TUNING.eduEma);
    s.health[i] = Math.round(s.health[i] + (healthTarget - s.health[i]) * TUNING.healthEma);
  }
  s.changed |= CHANGE.SOCIAL;
}
