// Building growth, occupancy, upgrades, wealth shifts and abandonment. Runs
// over a quarter of the tiles per tick (slice = tick % 4) so each tile is
// visited six times a month.

import { TUNING } from '../constants';
import { CHANGE, T, ZONE, type CityState } from '../types';
import { capacityOf, demandIndex, tileCapacity } from './buildings';
import { markDirty, nextRandom } from './state';
import { consumeDemand } from './zones';

export function growthPass(s: CityState, slice: number): void {
  const { zone, level, wealth, abandoned, desirability, landValue, demand } = s;
  // jobs can only be filled by the workforce that exists
  const workforce = s.totals.population * TUNING.workforceRate;
  const laborFactor = s.totals.jobs > 0 ? Math.min(1, (workforce + 200) / s.totals.jobs) : 1;
  for (let i = slice; i < T; i += 4) {
    const z = zone[i];
    if (!z || s.water[i] || s.onFire[i]) continue;
    const desir = desirability[i];
    if (!level[i]) {
      // empty zoned lot: pick the richest tier that wants to come and can
      let w = 0;
      for (let cand = 3; cand >= 1; cand--) {
        if (demand[demandIndex(z, cand)] > 0 && desir >= TUNING.wealthMinDesir[cand] && landValue[i] >= TUNING.wealthMinLandValue[cand]) {
          w = cand;
          break;
        }
      }
      if (!w) continue;
      const d = demand[demandIndex(z, w)];
      const p = TUNING.buildRate * (d / 100) * (desir / 255) * TUNING.densityBuildMult[s.density[i]];
      if (nextRandom(s) < p) {
        level[i] = 1;
        wealth[i] = w;
        abandoned[i] = 0;
        s.age[i] = 0;
        const cap = capacityOf(z, s.density[i], 1, w);
        const start = Math.max(1, Math.round(cap * 0.2));
        if (z === ZONE.R) s.pop[i] = start;
        else s.jobs[i] = start;
        consumeDemand(s, z, w, cap);
        markDirty(s, i);
        s.flags.netDirty = true;
      }
      continue;
    }
    const w = wealth[i];
    const dk = demandIndex(z, w);
    const d = demand[dk];
    if (abandoned[i]) {
      if (desir >= TUNING.wealthMinDesir[w] && d > 0) {
        if (nextRandom(s) < TUNING.recoverRate) {
          abandoned[i] = 0;
          markDirty(s, i);
        }
      } else if (nextRandom(s) < TUNING.demolishRate) {
        demolish(s, i);
      }
      continue;
    }
    // occupancy drifts toward the demand-scaled capacity
    const cap = tileCapacity(s, i);
    const target = Math.round(cap * (d > 0 ? 1 : Math.max(0.3, 1 + d / 100)) * (z === ZONE.R ? 1 : laborFactor));
    const occ = z === ZONE.R ? s.pop : s.jobs;
    const gap = target - occ[i];
    if (gap !== 0) {
      const step = Math.sign(gap) * Math.max(1, Math.floor(Math.abs(gap) * TUNING.occupancyStep));
      occ[i] = Math.max(0, Math.min(cap, occ[i] + step));
      s.changed |= CHANGE.HUD;
    }
    // abandonment
    if (!s.powered[i]) {
      if (nextRandom(s) < TUNING.unpoweredAbandon) {
        abandon(s, i);
        continue;
      }
    }
    if (desir < TUNING.abandonDesir || d < -60 || (z === ZONE.R && s.commute[i] === 255 && nextRandom(s) < 0.5)) {
      if (nextRandom(s) < TUNING.abandonRate) {
        abandon(s, i);
        continue;
      }
    }
    // upgrade in level
    const lv = level[i];
    if (lv < 3 && desir > TUNING.upgradeDesir[lv] && d > 15 && s.age[i] > TUNING.upgradeMinAgeMonths && nextRandom(s) < TUNING.upgradeRate) {
      level[i] = lv + 1;
      consumeDemand(s, z, w, tileCapacity(s, i) - cap);
      markDirty(s, i);
      continue;
    }
    // wealth up: rebuild at level 1 of the next tier
    if (w < 3 && desir >= TUNING.wealthMinDesir[w + 1] && landValue[i] >= TUNING.wealthMinLandValue[w + 1] && demand[demandIndex(z, w + 1)] > 0 && nextRandom(s) < TUNING.wealthUpRate) {
      wealth[i] = w + 1;
      s.age[i] = 0;
      const ncap = tileCapacity(s, i);
      occ[i] = Math.min(occ[i], ncap);
      consumeDemand(s, z, w + 1, ncap);
      markDirty(s, i);
      continue;
    }
    // wealth down
    if (w > 1 && desir < TUNING.wealthMinDesir[w] - 25 && nextRandom(s) < TUNING.wealthDownRate) {
      wealth[i] = w - 1;
      occ[i] = Math.min(occ[i], tileCapacity(s, i));
      markDirty(s, i);
    }
  }
}

function abandon(s: CityState, i: number): void {
  s.abandoned[i] = 1;
  s.pop[i] = 0;
  s.jobs[i] = 0;
  markDirty(s, i);
  s.changed |= CHANGE.HUD;
}

export function demolish(s: CityState, i: number): void {
  s.level[i] = 0;
  s.wealth[i] = 0;
  s.abandoned[i] = 0;
  s.age[i] = 0;
  s.pop[i] = 0;
  s.jobs[i] = 0;
  s.onFire[i] = 0;
  s.burnTicks[i] = 0;
  markDirty(s, i);
  s.flags.netDirty = true;
  s.changed |= CHANGE.HUD;
}

/** Monthly: buildings age. */
export function ageBuildings(s: CityState): void {
  for (let i = 0; i < T; i++) if (s.level[i] && s.age[i] < 65535) s.age[i]++;
}
