// Building growth, occupancy, upgrades, wealth shifts and abandonment. Runs
// over a quarter of the tiles per tick (slice = tick % 4) so each tile is
// visited six times a month.

import { TUNING } from '../constants';
import { CHANGE, T, ZONE, type CityState } from '../types';
import { capacityOf, demandIndex, tileCapacity } from './buildings';
import { claimLot, lotTiles } from './lots';
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
        const k = claimLot(s, i);
        if (!k) continue;
        const cap = capacityOf(z, s.density[i], 1, w);
        const start = Math.max(1, Math.round(cap * 0.2));
        level[i] = 1; // so lotTiles() expands from the origin
        for (const j of lotTiles(s, i)) {
          level[j] = 1;
          wealth[j] = w;
          abandoned[j] = 0;
          s.age[j] = 0;
          if (z === ZONE.R) s.pop[j] = start;
          else s.jobs[j] = start;
          markDirty(s, j);
        }
        consumeDemand(s, z, w, cap * k * k);
        s.flags.netDirty = true;
      }
      continue;
    }
    // multi-tile lots decide as one: only the origin tile runs the rules below
    const isOrigin = s.lotOrigin[i] === i || s.lotSize[i] <= 1;
    const w = wealth[i];
    const dk = demandIndex(z, w);
    const d = demand[dk];
    if (abandoned[i]) {
      if (!isOrigin) continue;
      if (desir >= TUNING.wealthMinDesir[w] && d > 0) {
        if (nextRandom(s) < TUNING.recoverRate) {
          for (const j of lotTiles(s, i)) {
            abandoned[j] = 0;
            markDirty(s, j);
          }
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
    if (!isOrigin) continue;
    const lot = lotTiles(s, i).slice();
    const lotN = lot.length;
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
      for (const j of lot) {
        level[j] = lv + 1;
        markDirty(s, j);
      }
      consumeDemand(s, z, w, (tileCapacity(s, i) - cap) * lotN);
      continue;
    }
    // wealth up: the next tier moves in
    if (w < 3 && desir >= TUNING.wealthMinDesir[w + 1] && landValue[i] >= TUNING.wealthMinLandValue[w + 1] && demand[demandIndex(z, w + 1)] > 0 && nextRandom(s) < TUNING.wealthUpRate) {
      for (const j of lot) {
        wealth[j] = w + 1;
        s.age[j] = 0;
        occ[j] = Math.min(occ[j], tileCapacity(s, j));
        markDirty(s, j);
      }
      consumeDemand(s, z, w + 1, tileCapacity(s, i) * lotN);
      continue;
    }
    // wealth down
    if (w > 1 && desir < TUNING.wealthMinDesir[w] - 25 && nextRandom(s) < TUNING.wealthDownRate) {
      for (const j of lot) {
        wealth[j] = w - 1;
        occ[j] = Math.min(occ[j], tileCapacity(s, j));
        markDirty(s, j);
      }
    }
  }
}

/** Abandon the whole lot that contains tile i. */
function abandon(s: CityState, i: number): void {
  for (const j of lotTiles(s, i)) {
    s.abandoned[j] = 1;
    s.pop[j] = 0;
    s.jobs[j] = 0;
    markDirty(s, j);
  }
  s.changed |= CHANGE.HUD;
}

/** Demolish the whole lot that contains tile i (the zone stays). */
export function demolish(s: CityState, i: number): void {
  for (const j of lotTiles(s, i)) {
    s.level[j] = 0;
    s.wealth[j] = 0;
    s.abandoned[j] = 0;
    s.age[j] = 0;
    s.pop[j] = 0;
    s.jobs[j] = 0;
    s.onFire[j] = 0;
    s.burnTicks[j] = 0;
    s.lotOrigin[j] = 0;
    s.lotSize[j] = 0;
    markDirty(s, j);
  }
  s.flags.netDirty = true;
  s.changed |= CHANGE.HUD;
}

/** Monthly: buildings age. */
export function ageBuildings(s: CityState): void {
  for (let i = 0; i < T; i++) if (s.level[i] && s.age[i] < 65535) s.age[i]++;
}
