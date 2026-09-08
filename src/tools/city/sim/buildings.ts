// Building tables: what a tile of zone × density × wealth × level holds.

import { CAPACITY, INDUSTRY_EMISSION, POWER_PER_CAPITA, WATER_PER_CAPITA, WEALTH_POP_MULT } from '../constants';
import { POLICY, ZONE, type CityState } from '../types';
import { hasPolicy } from './policies';

export function capacityOf(zone: number, density: number, level: number, wealth: number): number {
  const base = CAPACITY[zone]?.[density]?.[level] ?? 0;
  return zone === ZONE.R ? Math.round(base * WEALTH_POP_MULT[wealth]) : base;
}

/** Capacity of the building on tile i (0 when empty). */
export function tileCapacity(s: CityState, i: number): number {
  if (!s.level[i]) return 0;
  return capacityOf(s.zone[i], s.density[i], s.level[i], s.wealth[i]);
}

/** Power a building on tile i draws (by capacity, so a half-empty tower still lights up). */
export function powerDemandOf(s: CityState, i: number): number {
  if (!s.level[i] || s.abandoned[i]) return 0;
  return tileCapacity(s, i) * POWER_PER_CAPITA[s.zone[i]];
}

export function waterDemandOf(s: CityState, i: number): number {
  if (!s.level[i] || s.abandoned[i]) return 0;
  return tileCapacity(s, i) * WATER_PER_CAPITA[s.zone[i]];
}

/** Air pollution a building emits per diffusion step. */
export function emissionOf(s: CityState, i: number): number {
  if (!s.level[i] || s.abandoned[i]) return 0;
  const z = s.zone[i];
  if (z === ZONE.I) return INDUSTRY_EMISSION[s.wealth[i]] * s.level[i] * (hasPolicy(s, POLICY.CLEAN_AIR) ? 0.65 : 1);
  if (z === ZONE.C) return s.level[i];
  return 0;
}

/** Index into CityState.demand for a zone kind and wealth tier. */
export const demandIndex = (zone: number, wealth: number): number => (zone - 1) * 3 + (wealth - 1);
