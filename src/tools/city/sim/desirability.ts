// Desirability per tile (0..255, 128 neutral) by zone type. This is the one
// number growth reads, so every other layer feeds into it here.

import { TUNING } from '../constants';
import { CHANGE, T, ZONE, type CityState } from '../types';
import { boxBlur } from './grid';

const c = (v: number): number => v / 255;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function computeDesirability(s: CityState): void {
  // customers for commercial: population within ~6 tiles
  const popF = s.scratchA;
  for (let i = 0; i < T; i++) popF[i] = s.pop[i];
  boxBlur(popF, s.scratchB, s.scratchC, 6);
  const popNear = s.scratchB; // mean pop per tile in a 13×13 window
  const ext = s.externalConnected;
  for (let i = 0; i < T; i++) {
    const z = s.zone[i];
    if (!z || s.water[i]) {
      s.desirability[i] = 0;
      continue;
    }
    if (!s.roadAccess[i]) {
      s.desirability[i] = 0;
      continue;
    }
    const lv = c(s.landValue[i]);
    const poll = c(s.pollution[i]);
    const crime = c(s.crime[i]);
    const traffic = c(s.traffic[i]);
    const fire = c(s.fireCover[i]);
    const police = c(s.policeCover[i]);
    let v: number;
    if (z === ZONE.R) {
      const commutePenalty = clamp01((s.commute[i] - 40) / 60);
      const parkBonus = clamp01(1 - s.parkDist[i] / 6);
      v =
        128 +
        60 * lv -
        90 * poll -
        70 * crime -
        35 * traffic -
        50 * commutePenalty +
        25 * fire +
        30 * police +
        35 * c(s.healthCover[i]) +
        35 * c(s.eduCover[i]) +
        30 * parkBonus;
    } else if (z === ZONE.C) {
      const customers = clamp01((popNear[i] * 169) / 400);
      v = 128 + 70 * lv + 45 * customers - 40 * crime - 20 * poll + 25 * police + 20 * fire - 30 * Math.max(0, traffic - 0.7);
    } else {
      const extB = s.extAccess[i] ? 20 : ext ? 0 : -40;
      v = 128 + 20 * lv - 45 * crime + 40 * fire - 40 * Math.max(0, traffic - 0.6) + extB;
    }
    const util = s.powered[i] ? 1 : TUNING.unpoweredMult;
    const wat = s.watered[i] ? 1 : s.density[i] > 1 ? TUNING.unwateredDense : TUNING.unwateredLow;
    s.desirability[i] = Math.max(0, Math.min(255, Math.round(v * util * wat)));
  }
  s.changed |= CHANGE.ENV;
}
