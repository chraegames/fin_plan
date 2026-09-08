// City-wide totals in one pass over the tiles.

import { CHANGE, T, ZONE, type CityState } from '../types';
import { tileCapacity } from './buildings';

export function recomputeTotals(s: CityState): void {
  const t = s.totals;
  let population = 0;
  let jobs = 0;
  let jobsFilled = 0;
  let eduSum = 0;
  let healthSum = 0;
  let wealthSum = 0;
  let happySum = 0;
  let buildings = 0;
  let abandoned = 0;
  let pollSum = 0;
  let crimeSum = 0;
  let built = 0;
  let fires = 0;
  let zonedR = 0;
  let zonedC = 0;
  let zonedI = 0;
  for (let i = 0; i < T; i++) {
    if (s.onFire[i]) fires++;
    const z = s.zone[i];
    if (z && s.roadAccess[i]) {
      if (z === ZONE.R) zonedR++;
      else if (z === ZONE.C) zonedC++;
      else zonedI++;
    }
    if (!s.level[i]) continue;
    buildings++;
    built++;
    pollSum += s.pollution[i];
    crimeSum += s.crime[i];
    if (s.abandoned[i]) {
      abandoned++;
      continue;
    }
    if (z === ZONE.R) {
      const p = s.pop[i];
      population += p;
      eduSum += p * s.edu[i];
      healthSum += p * s.health[i];
      wealthSum += p * s.wealth[i];
      happySum += p * Math.min(100, Math.max(0, ((s.desirability[i] - 60) / 150) * 100));
    } else {
      if (s.powered[i]) jobs += tileCapacity(s, i);
      jobsFilled += s.jobs[i];
    }
  }
  t.population = population;
  t.jobs = jobs;
  t.jobsFilled = jobsFilled;
  t.cityEdu = population ? eduSum / population : 0;
  t.cityHealth = population ? healthSum / population : 0;
  t.avgWealth = population ? wealthSum / population : 1;
  t.happiness = population ? happySum / population : 0;
  t.buildings = buildings;
  t.abandoned = abandoned;
  t.meanPollution = built ? pollSum / built : 0;
  t.meanCrime = built ? crimeSum / built : 0;
  t.fires = fires;
  t.zonedR = zonedR;
  t.zonedC = zonedC;
  t.zonedI = zonedI;
  s.flags.anyFire = fires > 0;
  s.changed |= CHANGE.HUD;
}
