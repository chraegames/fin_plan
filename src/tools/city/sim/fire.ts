// Fire risk, monthly ignition, tick-by-tick spread and extinguishing.

import { TUNING, plopDef } from '../constants';
import { CHANGE, PLOP, POLICY, T, ZONE, type CityState } from '../types';
import { demolish } from './growth';
import { nbr } from './grid';
import { removePlop } from './actions';
import { hasPolicy } from './policies';
import { markDirty, nextRandom } from './state';

const flammable = (s: CityState, i: number): boolean => s.level[i] > 0 || (s.plop[i] !== PLOP.NONE && s.plop[i] !== PLOP.LINE && s.plop[i] !== PLOP.PIPE);
const PLOP_RISK: Record<number, number> = { [PLOP.COAL]: 50, [PLOP.GAS]: 35, [PLOP.NUCLEAR]: 30, [PLOP.INCINERATOR]: 40, [PLOP.LANDFILL]: 25 };

export function computeFireRisk(s: CityState): void {
  for (let i = 0; i < T; i++) {
    if (!flammable(s, i)) {
      s.fireRisk[i] = 0;
      continue;
    }
    let risk: number;
    if (s.level[i]) {
      const z = s.zone[i];
      const base = z === ZONE.R ? TUNING.fireBaseR : z === ZONE.C ? TUNING.fireBaseC : TUNING.fireBaseI[s.wealth[i]];
      risk = base * TUNING.fireDensity[s.density[i]] * (1 + s.age[i] / TUNING.fireAgeMonths) + (s.abandoned[i] ? TUNING.fireAbandoned : 0);
    } else {
      risk = PLOP_RISK[s.plop[i]] ?? 15;
    }
    if (hasPolicy(s, POLICY.SMOKE_DETECTORS)) risk *= 0.7;
    risk -= TUNING.fireCoverEffect * s.fireCover[i];
    s.fireRisk[i] = Math.max(0, Math.min(255, Math.round(risk)));
  }
  s.changed |= CHANGE.SOCIAL;
}

/** Monthly roll: a few risky tiles catch fire. */
export function igniteMonthly(s: CityState): void {
  for (let i = 0; i < T; i++) {
    if (s.onFire[i] || !s.fireRisk[i]) continue;
    if (nextRandom(s) < (s.fireRisk[i] / 255) * TUNING.igniteRate) startFire(s, i);
  }
}

export function startFire(s: CityState, i: number): void {
  if (!flammable(s, i) || s.onFire[i]) return;
  s.onFire[i] = TUNING.igniteIntensity;
  s.burnTicks[i] = 0;
  s.flags.anyFire = true;
  s.changed |= CHANGE.FIRE;
}

/** Every tick while anything burns. */
export function spreadFire(s: CityState): void {
  let any = false;
  for (let i = 0; i < T; i++) {
    const f = s.onFire[i];
    if (!f) continue;
    any = true;
    // spread first, using this tick's intensity
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || s.onFire[n] || !flammable(s, n)) continue;
      if (nextRandom(s) < TUNING.spreadRate * (0.25 + s.fireRisk[n] / 255) * (f / 255 + 0.3)) startFire(s, n);
    }
    // extinguish?
    if (nextRandom(s) < TUNING.extinguishBase + TUNING.extinguishCover * (s.fireCover[i] / 255)) {
      s.onFire[i] = 0;
      s.burnTicks[i] = 0;
      s.changed |= CHANGE.FIRE;
      continue;
    }
    const nf = Math.min(255, f + TUNING.spreadStep);
    s.onFire[i] = nf;
    if (nf === 255) {
      s.burnTicks[i]++;
      if (s.burnTicks[i] >= TUNING.burnDownTicks) {
        if (s.level[i]) demolish(s, i);
        else if (s.plop[i]) removePlop(s, i);
        s.onFire[i] = 0;
        s.burnTicks[i] = 0;
        markDirty(s, i);
      }
    }
  }
  s.flags.anyFire = any;
  if (any) s.changed |= CHANGE.FIRE;
}

export { plopDef };
