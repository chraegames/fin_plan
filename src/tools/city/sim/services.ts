// Service coverage: each station reaches out along roads (range scaled by
// funding), lots inherit the coverage of their nearest reached road tile, and
// capacity-limited services fade when they serve more people than they can.
// Civic buildings lift a square around them instead (no road needed).

import { TUNING, plopDef } from '../constants';
import { CHANGE, PLOP, POLICY, SERVICE, T, type CityState } from '../types';
import { effectiveFunding } from './budget';
import { idx, inBounds, xOf, yOf } from './grid';
import { hasPolicy } from './policies';
import { coverAlongRoads } from './reach';

const schoolCover = new Uint8Array(T);
const highCover = new Uint8Array(T);
const uniCover = new Uint8Array(T);
const libraryCover = new Uint8Array(T);
const clinicCover = new Uint8Array(T);
const hospitalCover = new Uint8Array(T);

const LAYER_FOR: Partial<Record<number, Uint8Array>> = {};

function serviceOf(plop: number): number {
  switch (plop) {
    case PLOP.FIRE:
    case PLOP.FIRE_HQ:
      return SERVICE.FIRE;
    case PLOP.POLICE:
    case PLOP.POLICE_HQ:
      return SERVICE.POLICE;
    case PLOP.CLINIC:
    case PLOP.HOSPITAL:
      return SERVICE.HEALTH;
    case PLOP.BUS:
      return SERVICE.TRANSIT;
    default:
      return SERVICE.EDUCATION;
  }
}

/** Recompute fireCover, policeCover, healthCover, eduCover, transitCover and civicBoost. */
export function computeCoverage(s: CityState): void {
  LAYER_FOR[PLOP.FIRE] = s.fireCover;
  LAYER_FOR[PLOP.FIRE_HQ] = s.fireCover;
  LAYER_FOR[PLOP.POLICE] = s.policeCover;
  LAYER_FOR[PLOP.POLICE_HQ] = s.policeCover;
  LAYER_FOR[PLOP.CLINIC] = clinicCover;
  LAYER_FOR[PLOP.HOSPITAL] = hospitalCover;
  LAYER_FOR[PLOP.SCHOOL] = schoolCover;
  LAYER_FOR[PLOP.HIGH] = highCover;
  LAYER_FOR[PLOP.UNI] = uniCover;
  LAYER_FOR[PLOP.LIBRARY] = libraryCover;
  LAYER_FOR[PLOP.BUS] = s.transitCover;
  s.fireCover.fill(0);
  s.policeCover.fill(0);
  s.transitCover.fill(0);
  s.civicBoost.fill(0);
  clinicCover.fill(0);
  hospitalCover.fill(0);
  schoolCover.fill(0);
  highCover.fill(0);
  uniCover.fill(0);
  libraryCover.fill(0);
  for (let i = 0; i < T; i++) {
    const p = s.plop[i];
    if (!p || s.plopOrigin[i] !== i || s.onFire[i]) continue;
    const layer = LAYER_FOR[p];
    if (layer) coverFrom(s, i, p, layer);
    if (TUNING.civicStrength[p]) coverCivic(s, i, p);
  }
  for (let i = 0; i < T; i++) {
    s.healthCover[i] = Math.max(clinicCover[i], hospitalCover[i]);
    s.eduCover[i] = Math.min(255, Math.round(0.55 * schoolCover[i] + 0.5 * highCover[i] + 0.3 * uniCover[i] + 0.2 * libraryCover[i]));
  }
  s.flags.serviceDirty = false;
  s.changed |= CHANGE.SOCIAL;
}

function coverFrom(s: CityState, origin: number, plop: number, layer: Uint8Array): void {
  const def = plopDef(plop)!;
  const service = serviceOf(plop);
  const funding = effectiveFunding(s, service);
  if (funding <= 0) return;
  let range = TUNING.serviceRange[plop] * Math.sqrt(funding);
  if (plop === PLOP.BUS && hasPolicy(s, POLICY.FREE_TRANSIT)) range *= 1.3;
  const capacity = (TUNING.serviceCapacity[plop] ?? 0) * funding;
  const share = TUNING.serviceServedShare[plop] ?? 1;
  coverAlongRoads(s, origin, def.size, range, (tiles, n, dist) => {
    let servedPop = 0;
    for (let k = 0; k < n; k++) servedPop += s.pop[tiles[k]];
    const capFactor = capacity > 0 ? Math.min(1, capacity / Math.max(1, servedPop * share)) : 1;
    // stations stack: two half-full schools serve a block in full, two fire stations cover it twice as well
    for (let k = 0; k < n; k++) {
      const i = tiles[k];
      const cov = Math.round(255 * Math.max(0, 1 - dist[i] / range) * capFactor);
      layer[i] = Math.min(255, layer[i] + cov);
    }
  });
}

/** Civic lift in a square around the footprint, fading with Chebyshev distance. */
function coverCivic(s: CityState, origin: number, plop: number): void {
  const def = plopDef(plop)!;
  const range = TUNING.serviceRange[plop] ?? 12;
  const strength = TUNING.civicStrength[plop] * Math.min(1, effectiveFunding(s, SERVICE.CIVIC));
  const ox = xOf(origin);
  const oy = yOf(origin);
  for (let y = oy - range; y < oy + def.size + range; y++) {
    for (let x = ox - range; x < ox + def.size + range; x++) {
      if (!inBounds(x, y)) continue;
      const dx = Math.max(ox - x, 0, x - (ox + def.size - 1));
      const dy = Math.max(oy - y, 0, y - (oy + def.size - 1));
      const d = Math.max(dx, dy);
      const v = Math.round(strength * Math.max(0, 1 - d / range));
      const i = idx(x, y);
      if (v > s.civicBoost[i]) s.civicBoost[i] = v;
    }
  }
}
