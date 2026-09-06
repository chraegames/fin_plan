// Air pollution diffuses over the whole map; water pollution only across water.

import { TUNING, plopDef } from '../constants';
import { CHANGE, T, ZONE, type CityState } from '../types';
import { emissionOf } from './buildings';
import { nbr } from './grid';

export function pollutionStep(s: CityState): void {
  const D = TUNING.airDiffusion;
  const p = s.scratchA;
  const emit = s.scratchB;
  for (let i = 0; i < T; i++) {
    p[i] = s.pollution[i];
    emit[i] = emissionOf(s, i) + TUNING.trafficEmission * (s.traffic[i] / 255) + (s.onFire[i] ? TUNING.fireEmission : 0);
  }
  // plants pollute over their footprint
  for (let i = 0; i < T; i++) {
    const def = s.plop[i] ? plopDef(s.plop[i]) : undefined;
    if (def?.emission) emit[i] += def.emission / (def.size * def.size);
    if (def?.kind === 'park') emit[i] -= TUNING.parkAbsorb;
  }
  for (let i = 0; i < T; i++) {
    let sum = 0;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0) {
        sum += p[j];
        n++;
      }
    }
    const v = (1 - TUNING.airDecay) * ((1 - D * n) * p[i] + D * sum) + emit[i];
    s.pollution[i] = Math.max(0, Math.min(255, Math.round(v)));
  }
  waterPollutionStep(s);
  s.changed |= CHANGE.ENV;
}

function waterPollutionStep(s: CityState): void {
  const D = TUNING.waterDiffusion;
  const p = s.scratchA;
  const emit = s.scratchB;
  emit.fill(0);
  for (let i = 0; i < T; i++) {
    p[i] = s.waterPollution[i];
    if (s.water[i]) continue;
    let e = 0;
    if (s.level[i] && s.zone[i] === ZONE.I && !s.abandoned[i]) e = [0, 10, 5, 0][s.wealth[i]];
    else if (s.road[i]) e = 2 * (s.traffic[i] / 255);
    if (!e) continue;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0 && s.water[j]) emit[j] += e;
    }
  }
  for (let i = 0; i < T; i++) {
    if (!s.water[i]) {
      s.waterPollution[i] = 0;
      continue;
    }
    let sum = 0;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0 && s.water[j]) {
        sum += p[j];
        n++;
      }
    }
    const v = (1 - TUNING.waterDecay) * ((1 - D * n) * p[i] + D * sum) + emit[i];
    s.waterPollution[i] = Math.max(0, Math.min(255, Math.round(v)));
  }
  // pumps sit on land next to water: let them read the adjacent water's pollution
  for (let i = 0; i < T; i++) {
    if (!s.plop[i] || s.plopOrigin[i] !== i) continue;
    let best = 0;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0 && s.water[j]) best = Math.max(best, s.waterPollution[j]);
    }
    if (!s.water[i]) s.waterPollution[i] = best;
  }
}
