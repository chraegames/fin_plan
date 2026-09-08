// City ordinances: toggles with a monthly cost and one clear effect each.
// Effects are read by the systems (crime, fire, pollution, garbage, traffic,
// demand, budget); this file only defines them.

import { POLICY } from '../types';
import type { CityState } from '../types';

export interface PolicyDef {
  bit: number;
  key: string;
  name: string;
  desc: string;
  /** Monthly cost: fixed part plus a per-resident part. */
  fixed: number;
  perPop: number;
}

export const POLICIES: readonly PolicyDef[] = [
  { bit: POLICY.RECYCLING, key: 'recycling', name: 'Recycling programme', desc: 'Households sort their rubbish: 25% less garbage to collect.', fixed: 100, perPop: 0.02 },
  { bit: POLICY.WATCH, key: 'watch', name: 'Neighbourhood watch', desc: 'Residents look out for each other: crime down 15% everywhere.', fixed: 50, perPop: 0.03 },
  { bit: POLICY.CLEAN_AIR, key: 'cleanAir', name: 'Clean air act', desc: 'Industry filters its smoke: 35% less industrial pollution, but dirty industry is less keen to come.', fixed: 200, perPop: 0 },
  { bit: POLICY.SMOKE_DETECTORS, key: 'smoke', name: 'Smoke detectors', desc: 'Every building gets one: fires start 30% less often.', fixed: 50, perPop: 0.02 },
  { bit: POLICY.FREE_TRANSIT, key: 'freeTransit', name: 'Free public transit', desc: 'Buses reach further and take more cars off the road. Costs the fare box.', fixed: 300, perPop: 0.05 },
  { bit: POLICY.TOURISM, key: 'tourism', name: 'Tourism promotion', desc: 'Advertise the city: more commercial demand, a little more traffic.', fixed: 400, perPop: 0.01 },
  { bit: POLICY.WATER_SAVING, key: 'waterSaving', name: 'Water conservation', desc: 'Low-flow fixtures: buildings use 20% less water.', fixed: 100, perPop: 0.015 },
  { bit: POLICY.TAX_HOLIDAY, key: 'taxHoliday', name: 'Business tax holiday', desc: 'Commercial and industrial demand up, but their tax income drops by a quarter.', fixed: 0, perPop: 0 },
];

export const hasPolicy = (s: CityState, bit: number): boolean => (s.policies & bit) !== 0;

export function policyCost(s: CityState): number {
  let sum = 0;
  for (const p of POLICIES) if (hasPolicy(s, p.bit)) sum += p.fixed + p.perPop * s.totals.population;
  return sum;
}
