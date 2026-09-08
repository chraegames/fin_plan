// Milestones: population tiers that unlock buildings and pay a grant, in the
// spirit of Cities: Skylines' milestone ladder. `milestone` only ever rises,
// so a shrinking city keeps what it earned.

import { CHANGE, PLOP, type CityState, type Density } from '../types';

export interface Milestone {
  name: string;
  /** Population needed (peak population, so a dip never locks anything again). */
  pop: number;
  reward: number;
  unlocks: number[];
  /** Zone density unlocked at this tier (1..3). */
  density: Density;
  /** Loans, policies … */
  features: string[];
}

export const MILESTONES: readonly Milestone[] = [
  {
    name: 'Outpost',
    pop: 0,
    reward: 0,
    unlocks: [PLOP.WIND, PLOP.COAL, PLOP.LINE, PLOP.PUMP, PLOP.TOWER, PLOP.PIPE, PLOP.PARK_S, PLOP.LANDFILL],
    density: 1,
    features: [],
  },
  { name: 'Hamlet', pop: 400, reward: 6000, unlocks: [PLOP.FIRE, PLOP.POLICE, PLOP.CLINIC, PLOP.SCHOOL], density: 1, features: ['Loans'] },
  { name: 'Village', pop: 1200, reward: 10000, unlocks: [PLOP.GAS, PLOP.PARK_L, PLOP.PLAZA, PLOP.HIGH], density: 2, features: ['Medium density zones'] },
  { name: 'Town', pop: 3000, reward: 18000, unlocks: [PLOP.CITY_HALL, PLOP.INCINERATOR, PLOP.BUS, PLOP.SOLAR], density: 2, features: ['Policies', 'Avenues'] },
  { name: 'Small city', pop: 7000, reward: 30000, unlocks: [PLOP.HOSPITAL, PLOP.LIBRARY, PLOP.FIRE_HQ, PLOP.POLICE_HQ, PLOP.TREATMENT], density: 3, features: ['High density zones'] },
  { name: 'City', pop: 15000, reward: 50000, unlocks: [PLOP.UNI, PLOP.HYDRO, PLOP.RECYCLING, PLOP.STADIUM], density: 3, features: [] },
  { name: 'Big city', pop: 30000, reward: 90000, unlocks: [PLOP.NUCLEAR], density: 3, features: [] },
  { name: 'Metropolis', pop: 60000, reward: 160000, unlocks: [PLOP.LANDMARK], density: 3, features: [] },
  { name: 'Megalopolis', pop: 100000, reward: 300000, unlocks: [], density: 3, features: [] },
];

const UNLOCK_TIER: number[] = [];
for (let m = 0; m < MILESTONES.length; m++) for (const p of MILESTONES[m].unlocks) UNLOCK_TIER[p] = m;

/** Milestone index at which a plop becomes available (0 = from the start). */
export function unlockTier(plop: number): number {
  return UNLOCK_TIER[plop] ?? 0;
}

export function isUnlocked(s: CityState, plop: number): boolean {
  return s.milestone >= unlockTier(plop);
}

export function densityTier(density: number): number {
  for (let m = 0; m < MILESTONES.length; m++) if (MILESTONES[m].density >= density) return m;
  return MILESTONES.length - 1;
}

export function densityUnlocked(s: CityState, density: number): boolean {
  return s.milestone >= densityTier(density);
}

export const AVENUE_TIER = 3;
export const POLICY_TIER = 3;
export const LOAN_TIER = 1;

/** Monthly: raise the milestone when the peak population crosses the next threshold. */
export function checkMilestones(s: CityState): void {
  const pop = s.totals.population;
  if (pop > s.peakPop) s.peakPop = pop;
  while (s.milestone + 1 < MILESTONES.length && s.peakPop >= MILESTONES[s.milestone + 1].pop) {
    s.milestone++;
    const m = MILESTONES[s.milestone];
    s.funds += m.reward;
    s.notices.push({
      id: s.nextNoticeId++,
      kind: 'milestone',
      title: `${m.name}!`,
      text: `${m.name} reached with ${m.pop.toLocaleString('en-US')} residents.`,
      unlocks: m.unlocks.slice(),
      reward: m.reward,
    });
    s.changed |= CHANGE.HUD;
  }
}
