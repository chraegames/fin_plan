// Every tunable of the simulation in one place. Balancing edits should be
// one-file diffs here; the systems under sim/ read these and never carry
// their own magic numbers.

import { PLOP, SERVICE, type PlopId, type ServiceId } from './types';

export const TICKS_PER_MONTH = 24;
/** Ticks per second at speeds 0..3. */
export const TICK_RATES = [0, 8, 16, 32] as const;
/** Max ticks a single worker wake-up may run (keeps a stalled tab from spiralling). */
export const MAX_TICKS_PER_STEP = 6;
export const START_FUNDS = 50_000;
export const START_YEAR = 2000;

/** Corner spread (0..255 of the 0..1 heightfield) above which a tile can't be built on. */
export const SLOPE_MAX = 26;
export const HEIGHT_SCALE = 9;

export const TUNING = {
  // ── demand ──
  workforceRate: 0.55,
  /** Commercial jobs wanted per resident, and per industrial job. */
  cPerPop: 0.3,
  cPerIndustry: 0.15,
  /** Industrial jobs wanted per worker. */
  iPerWorker: 0.55,
  newCityBoost: 45,
  newCityPop: 3000,
  taxNeutral: 9,
  taxSlope: 7,
  extIndustryBonus: 25,
  extIndustryPenalty: -40,
  capNoPlant: 0.15,
  capBrownout: 0.5,
  capWaterShort: 0.6,
  /** A building of this capacity consumes 100 demand points. */
  demandCapNorm: 2500,
  // ── desirability ──
  unpoweredMult: 0.35,
  unwateredLow: 0.9,
  unwateredDense: 0.6,
  // ── growth ──
  wealthMinDesir: [0, 60, 125, 170],
  wealthMinLandValue: [0, 0, 80, 140],
  upgradeDesir: [0, 118, 150, 999],
  abandonDesir: 50,
  buildRate: 0.08,
  densityBuildMult: [0, 1, 0.8, 0.6],
  occupancyStep: 0.12,
  unpoweredAbandon: 0.04,
  abandonRate: 0.03,
  upgradeRate: 0.02,
  upgradeMinAgeMonths: 3,
  wealthUpRate: 0.01,
  wealthDownRate: 0.02,
  recoverRate: 0.05,
  demolishRate: 0.01,
  // ── land value ──
  lvBase: 50,
  lvHeight: 70,
  lvWater: 45,
  lvPark: 35,
  lvPollution: 0.4,
  lvCrime: 0.45,
  lvTraffic: 0.25,
  lvAbandoned: 25,
  lvEma: 0.4,
  // ── pollution ──
  airDiffusion: 0.18,
  airDecay: 0.12,
  trafficEmission: 6,
  /** Air pollution absorbed per park tile per step. */
  parkAbsorb: 6,
  fireEmission: 30,
  waterDiffusion: 0.22,
  waterDecay: 0.04,
  // ── crime ──
  crimeCapNorm: 200,
  crimeDensity: [0, 1, 1.15, 1.3],
  crimeWealth: [0, 1.3, 1.0, 0.7],
  crimePolice: 1.1,
  crimeEdu: 0.2,
  crimeLandValue: 0.1,
  crimeEma: 0.3,
  // ── fire ──
  fireBaseR: 20,
  fireBaseC: 30,
  fireBaseI: [0, 60, 40, 25],
  fireDensity: [0, 1, 1.2, 1.4],
  fireAgeMonths: 960,
  fireAbandoned: 40,
  fireCoal: 50,
  fireCoverEffect: 0.8,
  igniteRate: 0.0004,
  igniteIntensity: 40,
  spreadStep: 25,
  spreadRate: 0.05,
  extinguishBase: 0.02,
  extinguishCover: 0.2,
  burnDownTicks: 6,
  // ── utilities ──
  waterRadius: 6,
  pumpFar: 0.3,
  // ── services ──
  serviceRange: { [PLOP.FIRE]: 14, [PLOP.POLICE]: 12, [PLOP.CLINIC]: 10, [PLOP.HOSPITAL]: 20, [PLOP.SCHOOL]: 14, [PLOP.HIGH]: 18, [PLOP.UNI]: 28 } as Record<number, number>,
  serviceCapacity: { [PLOP.CLINIC]: 400, [PLOP.HOSPITAL]: 2500, [PLOP.SCHOOL]: 600, [PLOP.HIGH]: 1200, [PLOP.UNI]: 4000 } as Record<number, number>,
  /** Share of the population a service actually serves (pupils, patients). */
  serviceServedShare: { [PLOP.CLINIC]: 0.25, [PLOP.HOSPITAL]: 0.25, [PLOP.SCHOOL]: 0.15, [PLOP.HIGH]: 0.12, [PLOP.UNI]: 0.08 } as Record<number, number>,
  eduEma: 0.1,
  healthEma: 0.1,
  // ── traffic ──
  linkCapacity: 900,
  /** Capacity multiplier of an avenue link (both tiles must be avenue). */
  avenueCapacity: 2.5,
  avenueUpkeep: 2,
  congestionK: 1.2,
  msaIterations: 3,
  maxDijkstraPops: 1500,
  externalJobShare: 0.15,
  originBlock: 4,
  // ── budget ──
  taxR: 0.25,
  taxC: 0.45,
  taxI: 0.35,
  wealthTaxMult: [0, 1, 1.9, 3.4],
  roadUpkeep: 0.6,
  loanMonths: 120,
  loanApr: 0.05,
  loanSizes: [10_000, 25_000],
  redMonthsBeforeCuts: 3,
};

/** Numeric TUNING keys that the debug panel may override at runtime. */
export const TUNABLE_KEYS = [
  'buildRate',
  'occupancyStep',
  'abandonRate',
  'upgradeRate',
  'abandonDesir',
  'newCityBoost',
  'taxSlope',
  'workforceRate',
  'cPerPop',
  'iPerWorker',
  'demandCapNorm',
  'airDiffusion',
  'airDecay',
  'parkAbsorb',
  'crimeCapNorm',
  'crimePolice',
  'igniteRate',
  'spreadRate',
  'linkCapacity',
  'congestionK',
  'lvPollution',
  'lvCrime',
  'taxR',
  'taxC',
  'taxI',
  'waterRadius',
] as const;
export type TunableKey = (typeof TUNABLE_KEYS)[number];

/** Apply runtime overrides (debug panel). Unknown keys and non-finite values are ignored. */
export function applyTuning(overrides: Partial<Record<TunableKey, number>>): void {
  const t = TUNING as unknown as Record<string, unknown>;
  for (const k of TUNABLE_KEYS) {
    const v = overrides[k];
    if (typeof v === 'number' && Number.isFinite(v)) t[k] = v;
  }
}

// ─── Buildings ─────────────────────────────────────────────────────────

/** capacity[zone][density][level] — pop for R, jobs for C/I. */
export const CAPACITY: readonly (readonly (readonly number[])[])[] = [
  [],
  [[], [0, 6, 10, 16], [0, 24, 40, 60], [0, 80, 140, 220]],
  [[], [0, 4, 8, 12], [0, 20, 40, 70], [0, 80, 160, 300]],
  [[], [0, 8, 14, 20], [0, 30, 50, 80], [0, 70, 110, 160]],
];
/** Residential capacity multiplier by wealth (richer households are smaller). */
export const WEALTH_POP_MULT = [0, 1, 0.8, 0.6] as const;
export const POWER_PER_CAPITA = [0, 0.5, 1.0, 3.0] as const;
export const WATER_PER_CAPITA = [0, 0.6, 0.8, 2.0] as const;
/** Air pollution per level by industrial wealth; commercial emits 1 per level. */
export const INDUSTRY_EMISSION = [0, 8, 5, 1.5] as const;
export const WATER_EMISSION_I = [0, 10, 5, 0] as const;

// ─── Plops ─────────────────────────────────────────────────────────────

export type PlopKind = 'power' | 'line' | 'water' | 'fire' | 'police' | 'health' | 'education' | 'park';

export interface PlopDef {
  id: PlopId;
  key: string;
  name: string;
  kind: PlopKind;
  size: 1 | 2 | 3;
  cost: number;
  monthly: number;
  service: ServiceId | -1;
  /** Power plant output, pump/tower water output, or 0. */
  capacity: number;
  emission: number;
  /** Needs an adjacent road tile to do anything (services). */
  needsRoad: boolean;
}

const P = (
  id: PlopId,
  key: string,
  name: string,
  kind: PlopKind,
  size: 1 | 2 | 3,
  cost: number,
  monthly: number,
  service: ServiceId | -1,
  capacity = 0,
  emission = 0,
  needsRoad = false,
): PlopDef => ({ id, key, name, kind, size, cost, monthly, service, capacity, emission, needsRoad });

export const PLOPS: readonly PlopDef[] = [
  P(PLOP.COAL, 'coal', 'Coal power plant', 'power', 2, 3000, 400, SERVICE.POWER, 6000, 45),
  P(PLOP.GAS, 'gas', 'Gas power plant', 'power', 2, 4000, 450, SERVICE.POWER, 3500, 24),
  P(PLOP.WIND, 'wind', 'Wind turbine', 'power', 1, 500, 40, SERVICE.POWER, 250, 0),
  P(PLOP.SOLAR, 'solar', 'Solar farm', 'power', 2, 1500, 60, SERVICE.POWER, 400, 0),
  P(PLOP.LINE, 'line', 'Power line', 'line', 1, 5, 0.1, SERVICE.POWER),
  P(PLOP.PUMP, 'pump', 'Water pump', 'water', 1, 400, 60, SERVICE.WATER, 2400),
  P(PLOP.TOWER, 'tower', 'Water tower', 'water', 1, 800, 90, SERVICE.WATER, 1200),
  P(PLOP.FIRE, 'fire', 'Fire station', 'fire', 1, 500, 200, SERVICE.FIRE, 0, 0, true),
  P(PLOP.POLICE, 'police', 'Police station', 'police', 1, 500, 200, SERVICE.POLICE, 0, 0, true),
  P(PLOP.CLINIC, 'clinic', 'Clinic', 'health', 1, 400, 150, SERVICE.HEALTH, 400, 0, true),
  P(PLOP.HOSPITAL, 'hospital', 'Hospital', 'health', 2, 2500, 600, SERVICE.HEALTH, 2500, 0, true),
  P(PLOP.SCHOOL, 'school', 'Elementary school', 'education', 1, 600, 160, SERVICE.EDUCATION, 600, 0, true),
  P(PLOP.HIGH, 'high', 'High school', 'education', 2, 1500, 350, SERVICE.EDUCATION, 1200, 0, true),
  P(PLOP.UNI, 'uni', 'University', 'education', 3, 6000, 900, SERVICE.EDUCATION, 4000, 0, true),
  P(PLOP.PARK_S, 'park', 'Small park', 'park', 1, 100, 15, -1),
  P(PLOP.PARK_L, 'parkL', 'Large park', 'park', 2, 600, 50, -1),
];

const PLOP_BY_ID: PlopDef[] = [];
for (const p of PLOPS) PLOP_BY_ID[p.id] = p;
export function plopDef(id: number): PlopDef | undefined {
  return PLOP_BY_ID[id];
}

export const COST = {
  road: 10,
  avenue: 30,
  zone: 2,
  bulldoze: 1,
} as const;

export const SERVICE_NAMES = ['Power', 'Water', 'Roads', 'Fire', 'Police', 'Health', 'Education'] as const;
export const ZONE_NAMES = ['', 'Residential', 'Commercial', 'Industrial'] as const;
export const DENSITY_NAMES = ['', 'Low', 'Medium', 'High'] as const;
export const WEALTH_SYMBOL = ['', '$', '$$', '$$$'] as const;
