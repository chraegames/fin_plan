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
  capBrownout: 0.5,
  capWaterShort: 0.6,
  capGarbage: 0.7,
  /** A building of this capacity consumes 100 demand points. */
  demandCapNorm: 2500,
  // ── desirability ──
  unpoweredMult: 0.35,
  unwateredLow: 0.9,
  unwateredDense: 0.6,
  /** Desirability lost on a lot with no rubbish collection. */
  garbagePenalty: 45,
  transitBonus: 20,
  civicBonus: 40,
  // ── growth ──
  wealthMinDesir: [0, 60, 120, 165],
  wealthMinLandValue: [0, 0, 75, 130],
  upgradeDesir: [0, 115, 145, 999],
  abandonDesir: 50,
  buildRate: 0.08,
  densityBuildMult: [0, 1, 0.8, 0.6],
  occupancyStep: 0.12,
  unpoweredAbandon: 0.04,
  abandonRate: 0.03,
  upgradeRate: 0.02,
  /** Demand a building's own tier must show before it grows a level. */
  upgradeMinDemand: 5,
  upgradeMinAgeMonths: 3,
  wealthUpRate: 0.012,
  wealthDownRate: 0.02,
  recoverRate: 0.05,
  demolishRate: 0.01,
  // ── land value ──
  lvBase: 50,
  lvHeight: 70,
  lvWater: 45,
  lvPark: 35,
  lvCivic: 50,
  lvPollution: 0.4,
  lvCrime: 0.45,
  lvTraffic: 0.25,
  lvAbandoned: 25,
  lvGarbage: 30,
  lvEma: 0.4,
  // ── pollution ──
  airDiffusion: 0.18,
  airDecay: 0.12,
  trafficEmission: 6,
  /** Air pollution absorbed per park tile per step. */
  parkAbsorb: 6,
  fireEmission: 30,
  /** Extra emission on a lot whose rubbish is not collected. */
  garbageEmission: 3,
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
  /** Rubbish per resident / per job per month. */
  garbagePerPop: 1,
  garbagePerJob: 0.6,
  // ── services ──
  serviceRange: {
    [PLOP.FIRE]: 18,
    [PLOP.FIRE_HQ]: 30,
    [PLOP.POLICE]: 16,
    [PLOP.POLICE_HQ]: 28,
    [PLOP.CLINIC]: 12,
    [PLOP.HOSPITAL]: 24,
    [PLOP.SCHOOL]: 16,
    [PLOP.HIGH]: 22,
    [PLOP.UNI]: 32,
    [PLOP.LIBRARY]: 18,
    [PLOP.LANDFILL]: 48,
    [PLOP.INCINERATOR]: 60,
    [PLOP.RECYCLING]: 48,
    [PLOP.BUS]: 22,
    [PLOP.CITY_HALL]: 14,
    [PLOP.STADIUM]: 18,
    [PLOP.LANDMARK]: 26,
  } as Record<number, number>,
  serviceCapacity: {
    [PLOP.CLINIC]: 500,
    [PLOP.HOSPITAL]: 4000,
    [PLOP.SCHOOL]: 900,
    [PLOP.HIGH]: 2200,
    [PLOP.UNI]: 6000,
    [PLOP.LIBRARY]: 3000,
  } as Record<number, number>,
  /** Share of the population a service actually serves (pupils, patients). */
  serviceServedShare: {
    [PLOP.CLINIC]: 0.25,
    [PLOP.HOSPITAL]: 0.25,
    [PLOP.SCHOOL]: 0.15,
    [PLOP.HIGH]: 0.12,
    [PLOP.UNI]: 0.08,
    [PLOP.LIBRARY]: 0.2,
  } as Record<number, number>,
  /** Civic buildings: land value / desirability lift at the building (fades with distance). */
  civicStrength: { [PLOP.CITY_HALL]: 150, [PLOP.STADIUM]: 170, [PLOP.LANDMARK]: 255, [PLOP.LIBRARY]: 90 } as Record<number, number>,
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
  /** Share of car trips a bus-covered block puts on the bus instead. */
  transitTripCut: 0.35,
  // ── budget ──
  taxR: 0.38,
  taxC: 0.55,
  taxI: 0.45,
  wealthTaxMult: [0, 1, 1.5, 2.2],
  roadUpkeep: 0.5,
  loanMonths: 120,
  loanApr: 0.05,
  loanSizes: [10_000, 25_000, 50_000],
  redMonthsBeforeCuts: 3,
  /** Tourism from a stadium / landmark: commercial demand bonus per civic building. */
  tourismDemand: 12,
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
  'garbagePerPop',
  'garbagePenalty',
  'civicBonus',
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

export type PlopKind = 'power' | 'line' | 'pipe' | 'water' | 'fire' | 'police' | 'health' | 'education' | 'park' | 'garbage' | 'transit' | 'civic';

export interface PlopDef {
  id: PlopId;
  key: string;
  name: string;
  kind: PlopKind;
  size: 1 | 2 | 3;
  cost: number;
  monthly: number;
  service: ServiceId | -1;
  /** Power plant output, pump/tower water output, garbage capacity, school/clinic capacity, or 0. */
  capacity: number;
  emission: number;
  /** Needs an adjacent road tile to do anything (services). */
  needsRoad: boolean;
  /** Must touch a water tile (hydro, treatment). */
  needsWater: boolean;
  /** Electricity a non-power plop produces (incinerator). */
  power: number;
  /** One line for the toolbar info card. */
  desc: string;
}

interface PlopOpts {
  capacity?: number;
  emission?: number;
  needsRoad?: boolean;
  needsWater?: boolean;
  power?: number;
}

const P = (id: PlopId, key: string, name: string, kind: PlopKind, size: 1 | 2 | 3, cost: number, monthly: number, service: ServiceId | -1, desc: string, o: PlopOpts = {}): PlopDef => ({
  id,
  key,
  name,
  kind,
  size,
  cost,
  monthly,
  service,
  capacity: o.capacity ?? 0,
  emission: o.emission ?? 0,
  needsRoad: o.needsRoad ?? false,
  needsWater: o.needsWater ?? false,
  power: o.power ?? 0,
  desc,
});

export const PLOPS: readonly PlopDef[] = [
  // power
  P(PLOP.WIND, 'wind', 'Wind turbine', 'power', 1, 500, 40, SERVICE.POWER, 'Cheap, clean and small. Makes more on high ground.', { capacity: 250 }),
  P(PLOP.COAL, 'coal', 'Coal power plant', 'power', 2, 3000, 350, SERVICE.POWER, 'The workhorse. Lots of power, lots of smoke — keep it away from homes.', { capacity: 6000, emission: 45 }),
  P(PLOP.GAS, 'gas', 'Gas power plant', 'power', 2, 5000, 500, SERVICE.POWER, 'Cleaner than coal for a little more money.', { capacity: 5000, emission: 18 }),
  P(PLOP.SOLAR, 'solar', 'Solar farm', 'power', 2, 2500, 70, SERVICE.POWER, 'No pollution, low upkeep, modest output.', { capacity: 900 }),
  P(PLOP.HYDRO, 'hydro', 'Hydro plant', 'power', 2, 8000, 300, SERVICE.POWER, 'Clean power from the water. Must be built on the shore.', { capacity: 5000, needsWater: true }),
  P(PLOP.NUCLEAR, 'nuclear', 'Nuclear plant', 'power', 3, 25000, 1800, SERVICE.POWER, 'Enormous clean output. Expensive, and it must never burn.', { capacity: 24000 }),
  P(PLOP.LINE, 'line', 'Power line', 'line', 1, 5, 0.1, SERVICE.POWER, 'Carries power across empty land. Roads and buildings already conduct.'),
  // water
  P(PLOP.PUMP, 'pump', 'Water pump', 'water', 1, 400, 60, SERVICE.WATER, 'Pumps most next to a river or lake; a third as much inland.', { capacity: 2400 }),
  P(PLOP.TOWER, 'tower', 'Water tower', 'water', 1, 800, 70, SERVICE.WATER, 'Works anywhere. Smaller supply than a shore pump.', { capacity: 1200 }),
  P(PLOP.TREATMENT, 'treatment', 'Treatment plant', 'water', 2, 3500, 260, SERVICE.WATER, 'A big shore plant that cleans what it pumps, so pollution does not cut its supply.', { capacity: 6000, needsWater: true }),
  P(PLOP.PIPE, 'pipe', 'Water pipe', 'pipe', 1, 3, 0.05, SERVICE.WATER, 'Carries water across empty land. Every road already has a pipe under it.'),
  // garbage
  P(PLOP.LANDFILL, 'landfill', 'Landfill', 'garbage', 3, 600, 60, SERVICE.GARBAGE, 'Cheap dumping ground. Smelly: land value drops around it.', { capacity: 5000, emission: 12, needsRoad: true }),
  P(PLOP.INCINERATOR, 'incinerator', 'Incinerator', 'garbage', 2, 5000, 450, SERVICE.GARBAGE, 'Burns rubbish and makes a little power. Smoky.', { capacity: 9000, emission: 28, power: 1200, needsRoad: true }),
  P(PLOP.RECYCLING, 'recycling', 'Recycling centre', 'garbage', 2, 3000, 280, SERVICE.GARBAGE, 'Clean collection with a smaller capacity.', { capacity: 4000, emission: 2, needsRoad: true }),
  // safety
  P(PLOP.FIRE, 'fire', 'Fire station', 'fire', 1, 500, 150, SERVICE.FIRE, 'Covers the roads around it. Fires are put out faster and start less.', { needsRoad: true }),
  P(PLOP.FIRE_HQ, 'fireHq', 'Fire headquarters', 'fire', 2, 2500, 500, SERVICE.FIRE, 'Reaches much further than a station.', { needsRoad: true }),
  P(PLOP.POLICE, 'police', 'Police station', 'police', 1, 500, 150, SERVICE.POLICE, 'Cuts crime along the roads around it.', { needsRoad: true }),
  P(PLOP.POLICE_HQ, 'policeHq', 'Police headquarters', 'police', 2, 2500, 500, SERVICE.POLICE, 'A precinct with the reach of several stations.', { needsRoad: true }),
  // health
  P(PLOP.CLINIC, 'clinic', 'Clinic', 'health', 1, 400, 120, SERVICE.HEALTH, 'Basic care for a few hundred patients.', { capacity: 500, needsRoad: true }),
  P(PLOP.HOSPITAL, 'hospital', 'Hospital', 'health', 2, 2500, 600, SERVICE.HEALTH, 'Care for thousands; healthier residents live in nicer homes.', { capacity: 4000, needsRoad: true }),
  // education
  P(PLOP.SCHOOL, 'school', 'Elementary school', 'education', 1, 600, 140, SERVICE.EDUCATION, 'The first step: educated residents want better jobs and homes.', { capacity: 900, needsRoad: true }),
  P(PLOP.HIGH, 'high', 'High school', 'education', 2, 1500, 350, SERVICE.EDUCATION, 'Lifts education further and attracts cleaner industry.', { capacity: 2200, needsRoad: true }),
  P(PLOP.LIBRARY, 'library', 'Library', 'education', 2, 1800, 220, SERVICE.EDUCATION, 'A civic anchor: education and land value around it.', { capacity: 3000, needsRoad: true }),
  P(PLOP.UNI, 'uni', 'University', 'education', 3, 6000, 900, SERVICE.EDUCATION, 'Top education. Unlocks high-tech industry and wealthy residents.', { capacity: 6000, needsRoad: true }),
  // parks
  P(PLOP.PARK_S, 'park', 'Small park', 'park', 1, 100, 15, SERVICE.CIVIC, 'Raises land value nearby and soaks up a little pollution.'),
  P(PLOP.PARK_L, 'parkL', 'Large park', 'park', 2, 600, 50, SERVICE.CIVIC, 'A bigger lift to land value and cleaner air.'),
  P(PLOP.PLAZA, 'plaza', 'Plaza', 'park', 1, 250, 30, SERVICE.CIVIC, 'A paved square: land value for dense blocks and shoppers for shops.'),
  // transit
  P(PLOP.BUS, 'bus', 'Bus depot', 'transit', 2, 2500, 300, SERVICE.TRANSIT, 'Buses take a third of the cars off the roads it reaches.', { needsRoad: true }),
  // civic
  P(PLOP.CITY_HALL, 'cityHall', 'City hall', 'civic', 2, 5000, 300, SERVICE.CIVIC, 'Pride of the town: land value and desirability around it.', { needsRoad: true }),
  P(PLOP.STADIUM, 'stadium', 'Stadium', 'civic', 3, 12000, 900, SERVICE.CIVIC, 'Draws crowds: commercial demand and land value, but also traffic.', { needsRoad: true, emission: 4 }),
  P(PLOP.LANDMARK, 'landmark', 'Landmark tower', 'civic', 2, 30000, 1200, SERVICE.CIVIC, 'A skyline icon that lifts the whole district.', { needsRoad: true }),
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

export const SERVICE_NAMES = ['Power', 'Water', 'Roads', 'Fire', 'Police', 'Health', 'Education', 'Garbage', 'Transit', 'Parks & civic'] as const;
export const ZONE_NAMES = ['', 'Residential', 'Commercial', 'Industrial'] as const;
export const DENSITY_NAMES = ['', 'Low', 'Medium', 'High'] as const;
export const WEALTH_SYMBOL = ['', '$', '$$', '$$$'] as const;
