// One simulation tick: the fixed order in which systems run, with the
// expensive ones staggered across the 24 ticks of a month.

import { TICKS_PER_MONTH } from '../constants';
import type { Action, CityState } from '../types';
import { applyAction } from './actions';
import { advise } from './advisor';
import { monthlyBudget } from './budget';
import { computeCrime } from './crime';
import { computeDesirability } from './desirability';
import { computeFireRisk, igniteMonthly, spreadFire } from './fire';
import { ageBuildings, growthPass } from './growth';
import { computeLandValue } from './landvalue';
import { updatePeople } from './people';
import { pollutionStep } from './pollution';
import { balancePower, rebuildPowerNetwork } from './power';
import { analyseRoads } from './roads';
import { computeCoverage } from './services';
import { recomputeTotals } from './stats';
import { assignTraffic } from './traffic';
import { coverWater, rebuildWaterNetwork } from './water';
import { computeDemand } from './zones';

/** Apply queued player actions; results are appended to state.results. */
export function applyActions(s: CityState, actions: { id: number; action: Action }[]): void {
  for (const { id, action } of actions) s.results.push(applyAction(s, action, id));
}

/** Derived layers after a load or a fresh start (before the first tick). */
export function primeDerived(s: CityState): void {
  analyseRoads(s);
  rebuildPowerNetwork(s);
  balancePower(s);
  rebuildWaterNetwork(s);
  recomputeTotals(s);
  computeCoverage(s);
  computeLandValue(s);
  computeCrime(s);
  computeFireRisk(s);
  computeDesirability(s);
  computeDemand(s);
  advise(s);
}

export function tick(s: CityState): void {
  const k = s.tick;
  if (s.flags.netDirty) {
    analyseRoads(s);
    rebuildPowerNetwork(s);
    balancePower(s);
  }
  if (s.flags.waterDirty) rebuildWaterNetwork(s);
  if (s.flags.anyFire) spreadFire(s);
  growthPass(s, k % 4);
  if (k % 4 === 0) {
    balancePower(s);
    coverWater(s);
  }
  switch (k % 6) {
    case 1:
      recomputeTotals(s);
      computeCrime(s);
      computeFireRisk(s);
      break;
    case 2:
      pollutionStep(s);
      break;
    case 3:
      computeLandValue(s);
      break;
    case 4:
      computeDesirability(s);
      break;
  }
  if (k % 12 === 5 && (s.flags.serviceDirty || k % TICKS_PER_MONTH === 5)) computeCoverage(s);
  if (k % TICKS_PER_MONTH === 11) assignTraffic(s);
  if (k % TICKS_PER_MONTH === 0 && k > 0) {
    ageBuildings(s);
    recomputeTotals(s);
    updatePeople(s);
    computeDemand(s);
    monthlyBudget(s);
    igniteMonthly(s);
    advise(s);
  }
  s.tick = k + 1;
}
