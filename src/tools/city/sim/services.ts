// Service coverage: each station reaches out along roads (range scaled by
// funding), lots inherit the coverage of their nearest reached road tile, and
// capacity-limited services fade when they serve more people than they can.

import { TUNING, plopDef } from '../constants';
import { CHANGE, PLOP, SERVICE, T, type CityState } from '../types';
import { effectiveFunding } from './budget';
import { idx, inBounds, nbr, xOf, yOf } from './grid';

const schoolCover = new Uint8Array(T);
const highCover = new Uint8Array(T);
const uniCover = new Uint8Array(T);
const clinicCover = new Uint8Array(T);
const hospitalCover = new Uint8Array(T);
const reachDist = new Float32Array(T).fill(-1); // -1 = untouched
const touched = new Int32Array(T);

const LAYER_FOR: Partial<Record<number, Uint8Array>> = {};

function serviceOf(plop: number): number {
  switch (plop) {
    case PLOP.FIRE:
      return SERVICE.FIRE;
    case PLOP.POLICE:
      return SERVICE.POLICE;
    case PLOP.CLINIC:
    case PLOP.HOSPITAL:
      return SERVICE.HEALTH;
    default:
      return SERVICE.EDUCATION;
  }
}

/** Recompute fireCover, policeCover, healthCover and eduCover. */
export function computeCoverage(s: CityState): void {
  LAYER_FOR[PLOP.FIRE] = s.fireCover;
  LAYER_FOR[PLOP.POLICE] = s.policeCover;
  LAYER_FOR[PLOP.CLINIC] = clinicCover;
  LAYER_FOR[PLOP.HOSPITAL] = hospitalCover;
  LAYER_FOR[PLOP.SCHOOL] = schoolCover;
  LAYER_FOR[PLOP.HIGH] = highCover;
  LAYER_FOR[PLOP.UNI] = uniCover;
  s.fireCover.fill(0);
  s.policeCover.fill(0);
  clinicCover.fill(0);
  hospitalCover.fill(0);
  schoolCover.fill(0);
  highCover.fill(0);
  uniCover.fill(0);
  for (let i = 0; i < T; i++) {
    const p = s.plop[i];
    if (!p || s.plopOrigin[i] !== i || s.onFire[i]) continue;
    const layer = LAYER_FOR[p];
    if (!layer) continue;
    coverFrom(s, i, p, layer);
  }
  for (let i = 0; i < T; i++) {
    s.healthCover[i] = Math.max(clinicCover[i], hospitalCover[i]);
    s.eduCover[i] = Math.min(255, Math.round(0.55 * schoolCover[i] + 0.5 * highCover[i] + 0.3 * uniCover[i]));
  }
  s.flags.serviceDirty = false;
  s.changed |= CHANGE.SOCIAL;
}

function coverFrom(s: CityState, origin: number, plop: number, layer: Uint8Array): void {
  const def = plopDef(plop)!;
  const service = serviceOf(plop);
  const funding = effectiveFunding(s, service);
  if (funding <= 0) return;
  const range = TUNING.serviceRange[plop] * Math.sqrt(funding);
  const capacity = (TUNING.serviceCapacity[plop] ?? 0) * funding;
  const queue = s.queue;
  let head = 0;
  let tail = 0;
  let nTouched = 0;
  // seeds: road tiles adjacent to the footprint
  const ox = xOf(origin);
  const oy = yOf(origin);
  for (let dy = -1; dy <= def.size; dy++) {
    for (let dx = -1; dx <= def.size; dx++) {
      const inside = dx >= 0 && dy >= 0 && dx < def.size && dy < def.size;
      if (inside) continue;
      const x = ox + dx;
      const y = oy + dy;
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (s.road[i] && reachDist[i] < 0) {
        reachDist[i] = 0;
        touched[nTouched++] = i;
        queue[tail++] = i;
      }
    }
  }
  // wave 1: along roads
  while (head < tail) {
    const i = queue[head++];
    const d = reachDist[i] + 1;
    if (d > range) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || !s.road[n] || reachDist[n] >= 0) continue;
      reachDist[n] = d;
      touched[nTouched++] = n;
      queue[tail++] = n;
    }
  }
  // wave 2: lots within 3 tiles of a reached road inherit its distance
  const roadEnd = tail;
  const lotStart = nTouched;
  head = 0;
  // enqueue roads again as sources (their reachDist is set); lots take the road's distance
  const lotDist = s.scratchC; // steps from road, lots only
  while (head < roadEnd) {
    const i = queue[head++];
    lotDist[i] = 0;
  }
  head = 0;
  let servedPop = 0;
  while (head < tail) {
    const i = queue[head++];
    const step = lotDist[i] + 1;
    if (step > 3) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || s.road[n] || reachDist[n] >= 0) continue;
      reachDist[n] = reachDist[i];
      lotDist[n] = step;
      touched[nTouched++] = n;
      queue[tail++] = n;
      servedPop += s.pop[n];
    }
  }
  const share = TUNING.serviceServedShare[plop] ?? 1;
  const capFactor = capacity > 0 ? Math.min(1, capacity / Math.max(1, servedPop * share)) : 1;
  for (let k = 0; k < nTouched; k++) {
    const i = touched[k];
    const d = reachDist[i];
    const cov = Math.round(255 * Math.max(0, 1 - d / range) * capFactor);
    if (k >= lotStart || s.road[i]) if (cov > layer[i]) layer[i] = cov;
    reachDist[i] = -1;
  }
}
