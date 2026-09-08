// RCI demand: nine bars (three zone types × three wealth tiers), −100..100,
// recomputed monthly and consumed by every building that grows.

import { TUNING, plopDef } from '../constants';
import { CHANGE, POLICY, T, ZONE, type CityState } from '../types';
import { demandIndex, tileCapacity } from './buildings';
import { hasPolicy } from './policies';
import { EXTERNAL_BASE_JOBS } from './traffic';

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const bar = (v: number): number => Math.min(100, Math.max(-100, v));

export function computeDemand(s: CityState): void {
  const t = s.totals;
  const pop = t.population;
  const workforce = pop * TUNING.workforceRate;
  const cJobs = jobsOf(s, ZONE.C);
  const iJobs = jobsOf(s, ZONE.I);
  // powered, non-abandoned C+I capacity, plus the jobs out of town that an edge road reaches
  const jobsOpen = t.jobs + (s.externalConnected ? EXTERNAL_BASE_JOBS : 0);

  let demR = (100 * (jobsOpen - workforce)) / Math.max(workforce, 200) + TUNING.newCityBoost * Math.max(0, 1 - pop / TUNING.newCityPop);
  let demC = (100 * (pop * TUNING.cPerPop + iJobs * TUNING.cPerIndustry - cJobs)) / Math.max(cJobs, 100);
  let demI = (100 * (workforce * TUNING.iPerWorker - iJobs)) / Math.max(iJobs, 100) + (s.externalConnected ? TUNING.extIndustryBonus : TUNING.extIndustryPenalty);

  // taxes: neutral at TUNING.taxNeutral
  demR -= (s.taxes[0] - TUNING.taxNeutral) * TUNING.taxSlope;
  demC -= (s.taxes[1] - TUNING.taxNeutral) * TUNING.taxSlope;
  demI -= (s.taxes[2] - TUNING.taxNeutral) * TUNING.taxSlope;

  // attractions and ordinances
  demC += TUNING.tourismDemand * countAttractions(s);
  if (hasPolicy(s, POLICY.TOURISM)) demC += 10;
  if (hasPolicy(s, POLICY.TAX_HOLIDAY)) {
    demC += 15;
    demI += 15;
  }

  // utility caps on the positive side
  const brownout = t.powerDemand > t.powerSupply && t.powerDemand > 0;
  const waterShort = t.waterDemand > t.waterSupply * 1.25 && t.waterDemand > 0;
  let cap = 1;
  if (brownout) cap *= TUNING.capBrownout;
  if (waterShort) cap *= TUNING.capWaterShort;
  if (t.garbageUncollected > 0.3) cap *= TUNING.capGarbage;
  if (demR > 0) demR *= cap;
  if (demC > 0) demC *= cap;
  if (demI > 0) demI *= cap;

  const edu = t.cityEdu;
  const health = t.cityHealth;
  const w = t.avgWealth;
  const split: number[][] = [
    [],
    [1, clamp(edu / 45), clamp((edu - 40) / 50) * clamp(health / 50)],
    [1, clamp(w - 1), clamp(w - 1.8)],
    [1 - clamp((edu - 50) / 60) * 0.6, clamp(edu / 40), clamp((edu - 55) / 45)],
  ];
  const base = [0, demR, demC, demI];
  for (let z = 1; z <= 3; z++) {
    for (let wl = 1; wl <= 3; wl++) {
      const f = split[z][wl - 1];
      const b = base[z];
      // a wealth tier the city can't attract is pushed negative, not just zero
      s.demand[demandIndex(z, wl)] = bar(b > 0 ? b * f : b) - (f <= 0 ? 30 : 0);
    }
  }
  if (hasPolicy(s, POLICY.CLEAN_AIR)) s.demand[demandIndex(ZONE.I, 1)] = bar(s.demand[demandIndex(ZONE.I, 1)] - 20);
  s.changed |= CHANGE.HUD;
}

/** Stadiums and landmarks draw visitors. */
function countAttractions(s: CityState): number {
  let n = 0;
  for (let i = 0; i < T; i++) {
    if (!s.plop[i] || s.plopOrigin[i] !== i) continue;
    const def = plopDef(s.plop[i]);
    if (def && (def.key === 'stadium' || def.key === 'landmark')) n++;
  }
  return n;
}

/** Job capacity of one zone kind (non-abandoned buildings). */
function jobsOf(s: CityState, zone: number): number {
  let sum = 0;
  const { level, abandoned, zone: zl } = s;
  for (let i = 0; i < level.length; i++) {
    if (level[i] && !abandoned[i] && zl[i] === zone) sum += tileCapacity(s, i);
  }
  return sum;
}

/** A building of `capacity` grew: eat its share of the demand bar. */
export function consumeDemand(s: CityState, zone: number, wealth: number, capacity: number): void {
  const k = demandIndex(zone, wealth);
  s.demand[k] = Math.max(-100, s.demand[k] - (capacity / TUNING.demandCapNorm) * 100);
}
