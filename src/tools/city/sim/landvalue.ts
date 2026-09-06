// Land value: terrain and water views, parks, then the drag of pollution,
// crime, traffic and blight; smoothed in space and time.

import { TUNING } from '../constants';
import { CHANGE, PLOP, T, ZONE, type CityState } from '../types';
import { boxBlur, distanceTransform, nbr } from './grid';

const wealthSum = new Float32Array(T);
const wealthCnt = new Float32Array(T);
const tmp1 = new Float32Array(T);
const tmp2 = new Float32Array(T);

const isPark = (s: CityState, i: number): boolean => s.plop[i] === PLOP.PARK_S || s.plop[i] === PLOP.PARK_L;

/** Distance-to-water and distance-to-park transforms (when parks/water changed). */
export function updateDistances(s: CityState): void {
  distanceTransform(s.waterDist, s.queue, i => s.water[i] === 1, 15);
  distanceTransform(s.parkDist, s.queue, i => isPark(s, i), 15);
  s.flags.distDirty = false;
}

export function computeLandValue(s: CityState): void {
  if (s.flags.distDirty) updateDistances(s);
  const c = (v: number) => v / 255;
  for (let i = 0; i < T; i++) {
    const r = s.level[i] && s.zone[i] === ZONE.R && !s.abandoned[i];
    wealthSum[i] = r ? s.wealth[i] : 0;
    wealthCnt[i] = r ? 1 : 0;
  }
  boxBlur(wealthSum, tmp1, tmp2, 3);
  boxBlur(wealthCnt, wealthSum, tmp2, 3); // wealthSum now holds the blurred count
  const v = s.scratchA;
  for (let i = 0; i < T; i++) {
    const h = Math.max(0, s.height[i] - s.sea);
    const base = TUNING.lvBase + TUNING.lvHeight * h * 1.6 + TUNING.lvWater * Math.max(0, 1 - s.waterDist[i] / 7) + TUNING.lvPark * Math.max(0, 1 - s.parkDist[i] / 5);
    const avgW = wealthSum[i] > 0.002 ? tmp1[i] / wealthSum[i] : 1;
    let abandonedN = 0;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0 && s.abandoned[j]) abandonedN++;
    }
    v[i] =
      base -
      TUNING.lvPollution * s.pollution[i] -
      TUNING.lvCrime * s.crime[i] -
      TUNING.lvTraffic * s.traffic[i] +
      10 * (avgW - 1) +
      12 * c(s.eduCover[i]) +
      10 * c(s.healthCover[i]) -
      (TUNING.lvAbandoned * abandonedN) / 4;
  }
  for (let i = 0; i < T; i++) {
    let sum = 0;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const j = nbr(i, k);
      if (j >= 0) {
        sum += v[j];
        n++;
      }
    }
    const target = 0.75 * v[i] + (0.25 * sum) / Math.max(1, n);
    const lv = (1 - TUNING.lvEma) * s.landValue[i] + TUNING.lvEma * target;
    s.landValue[i] = Math.max(0, Math.min(255, Math.round(lv)));
  }
  s.changed |= CHANGE.ENV;
}
