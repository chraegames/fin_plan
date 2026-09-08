// The City data model. Everything the simulation, the renderer and the UI
// share is typed here; no module under sim/ may import React, the DOM or
// three. Numeric "enums" are `as const` objects (erasableSyntaxOnly bans
// TS enums) so they can live in typed arrays.

export const N = 128;
export const T = N * N;
export const CHUNK = 16;
export const CHUNKS_PER_SIDE = N / CHUNK;
export const CHUNKS = CHUNKS_PER_SIDE * CHUNKS_PER_SIDE;

export const ZONE = { NONE: 0, R: 1, C: 2, I: 3 } as const;
export type ZoneId = (typeof ZONE)[keyof typeof ZONE];
export type ZoneKind = 1 | 2 | 3;
export type Density = 1 | 2 | 3;
export type Wealth = 1 | 2 | 3;
export type Level = 1 | 2 | 3;

export const PLOP = {
  NONE: 0,
  COAL: 1,
  GAS: 2,
  WIND: 3,
  SOLAR: 4,
  LINE: 5,
  PUMP: 6,
  TOWER: 7,
  FIRE: 8,
  POLICE: 9,
  CLINIC: 10,
  HOSPITAL: 11,
  SCHOOL: 12,
  HIGH: 13,
  UNI: 14,
  PARK_S: 15,
  PARK_L: 16,
  // added in the progression update (ids are stable: they are saved)
  PIPE: 17,
  NUCLEAR: 18,
  HYDRO: 19,
  TREATMENT: 20,
  LANDFILL: 21,
  INCINERATOR: 22,
  RECYCLING: 23,
  BUS: 24,
  FIRE_HQ: 25,
  POLICE_HQ: 26,
  LIBRARY: 27,
  CITY_HALL: 28,
  STADIUM: 29,
  LANDMARK: 30,
  PLAZA: 31,
} as const;
export type PlopId = (typeof PLOP)[keyof typeof PLOP];
export const PLOP_MAX = 31;

/** Funding slots (index into CityState.funding). */
export const SERVICE = { POWER: 0, WATER: 1, ROADS: 2, FIRE: 3, POLICE: 4, HEALTH: 5, EDUCATION: 6, GARBAGE: 7, TRANSIT: 8, CIVIC: 9 } as const;
export type ServiceId = (typeof SERVICE)[keyof typeof SERVICE];
export const SERVICE_COUNT = 10;
/** Funding slots older saves carried (they are padded to SERVICE_COUNT on load). */
export const LEGACY_SERVICE_COUNT = 7;

export const OVERLAYS = [
  'none',
  'power',
  'water',
  'garbage',
  'traffic',
  'transit',
  'pollution',
  'landValue',
  'crime',
  'fireRisk',
  'fireCover',
  'policeCover',
  'education',
  'health',
  'desirability',
] as const;
export type OverlayKind = (typeof OVERLAYS)[number];

/** Bits of CityState.problems (one byte per building lot origin). */
export const PROBLEM = {
  NO_POWER: 1,
  NO_WATER: 2,
  NO_ROAD: 4,
  NO_JOBS: 8, // residents cannot reach work
  NO_WORKERS: 16, // C/I short of staff
  NO_CUSTOMERS: 32, // commerce without shoppers nearby
  GARBAGE: 64,
  BLIGHT: 128, // crime or pollution heavy enough to drive people away
} as const;
export type ProblemBit = (typeof PROBLEM)[keyof typeof PROBLEM];

/** City ordinances (bits of CityState.policies). */
export const POLICY = {
  RECYCLING: 1,
  WATCH: 2,
  CLEAN_AIR: 4,
  SMOKE_DETECTORS: 8,
  FREE_TRANSIT: 16,
  TOURISM: 32,
  WATER_SAVING: 64,
  TAX_HOLIDAY: 128,
} as const;
export type PolicyBit = (typeof POLICY)[keyof typeof POLICY];

export interface XY {
  x: number;
  y: number;
}
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Totals {
  population: number;
  jobs: number;
  jobsFilled: number;
  employed: number;
  unemployment: number; // 0..1
  cityEdu: number; // 0..100 pop-weighted
  cityHealth: number; // 0..100
  avgWealth: number; // 1..3 pop-weighted over R
  buildings: number;
  abandoned: number;
  roadTiles: number;
  powerSupply: number;
  powerDemand: number;
  waterSupply: number;
  waterDemand: number;
  garbageSupply: number; // collection capacity per month
  garbageDemand: number; // garbage produced per month
  garbageUncollected: number; // share of buildings without collection, 0..1
  meanPollution: number;
  meanCrime: number;
  fires: number;
  zonedR: number; // zoned tiles (built or not) with road access
  zonedC: number;
  zonedI: number;
  happiness: number; // 0..100 pop-weighted residential satisfaction
  problems: number; // lots with at least one problem
}

export interface Ledger {
  month: number;
  incomeR: number;
  incomeC: number;
  incomeI: number;
  expenses: number[]; // SERVICE_COUNT entries
  loanCost: number;
  policyCost: number;
  net: number;
}

export interface Loan {
  id: number;
  principal: number;
  balance: number;
  monthsLeft: number;
}

export type AdvisorLevel = 'info' | 'warn' | 'bad';
export interface AdvisorMsg {
  id: string;
  level: AdvisorLevel;
  text: string;
  /** Optional data view the message is about (the UI offers to open it). */
  overlay?: OverlayKind;
}

/** A one-off event for the HUD (milestone reached, disaster, …). */
export interface Notice {
  id: number;
  kind: 'milestone' | 'event';
  title: string;
  text: string;
  /** Plop ids unlocked by a milestone notice. */
  unlocks?: number[];
  reward?: number;
}

/** One monthly sample of the city's curves (HUD graphs). */
export interface HistoryPoint {
  month: number;
  population: number;
  funds: number;
  jobs: number;
  happiness: number;
}
export const HISTORY_MAX = 360; // 30 years

export interface CityFlags {
  netDirty: boolean;
  waterDirty: boolean;
  serviceDirty: boolean;
  distDirty: boolean; // park/water distance transforms
  anyFire: boolean;
}

/**
 * The whole city. Per-tile layers are flat typed arrays indexed by
 * `y * N + x`. Layers marked "saved" persist; everything else is derived by
 * the simulation and rebuilt after a load.
 */
export interface CityState {
  seed: number;
  tick: number;
  rngState: number;
  // terrain — regenerated from `seed`, never saved
  height: Float32Array; // 0..1, sea level in `sea`
  sea: number;
  water: Uint8Array; // 1 = water tile
  slope: Uint8Array; // 0..255 corner spread, buildable when <= SLOPE_MAX
  // saved layers
  zone: Uint8Array; // ZONE
  density: Uint8Array; // 1..3 on zoned tiles
  road: Uint8Array; // 0 none, 1 street, 2 avenue
  level: Uint8Array; // 0 = no building, 1..3
  wealth: Uint8Array; // 1..3 when level > 0
  abandoned: Uint8Array;
  age: Uint16Array; // months since built
  plop: Uint8Array; // PLOP on every tile the plop covers
  plopOrigin: Uint16Array; // tile index of the plop's top-left, valid where plop != 0
  pop: Uint16Array;
  jobs: Uint16Array;
  onFire: Uint8Array; // intensity 0..255 (saved so a fire survives reload)
  lotOrigin: Uint16Array; // top-left tile of the building lot (valid where level > 0)
  lotSize: Uint8Array; // side of the lot, 1..3
  // derived per-tile layers
  powered: Uint8Array;
  watered: Uint8Array;
  powerComp: Int32Array;
  waterComp: Int32Array;
  roadAccess: Uint8Array; // 0 none, 1 = road tile, 2..4 = one to three tiles from a road
  extAccess: Uint8Array; // 1 when the nearest road reaches the map edge
  landValue: Uint8Array;
  pollution: Uint8Array;
  waterPollution: Uint8Array;
  crime: Uint8Array;
  fireRisk: Uint8Array;
  fireCover: Uint8Array;
  policeCover: Uint8Array;
  healthCover: Uint8Array;
  eduCover: Uint8Array;
  garbageCover: Uint8Array; // collection reach, 255 = fully served
  transitCover: Uint8Array; // bus reach along roads
  civicBoost: Uint8Array; // land value / desirability lift from civic buildings
  edu: Uint8Array;
  health: Uint8Array;
  traffic: Uint8Array; // 128 = at capacity
  commute: Uint8Array; // R tiles: trip cost, 255 = no job reachable
  desirability: Uint8Array;
  problems: Uint8Array; // PROBLEM bits on lot origins
  parkDist: Uint8Array;
  waterDist: Uint8Array;
  burnTicks: Uint8Array; // ticks a tile has been at full blaze
  // scratch (never saved, never sent)
  scratchA: Float32Array;
  scratchB: Float32Array;
  scratchC: Float32Array;
  queue: Int32Array;
  // scalars
  funds: number;
  taxes: Float32Array; // [R, C, I] percent
  funding: Float32Array; // SERVICE_COUNT, 0..1.5
  demand: Float32Array; // 9 bars: R$,R$$,R$$$,C$,C$$,C$$$,I$,I$$,I$$$ in -100..100
  totals: Totals;
  ledger: Ledger[];
  loans: Loan[];
  nextLoanId: number;
  monthsInRed: number;
  externalConnected: boolean;
  /** Highest milestone reached (index into MILESTONES); never goes down. */
  milestone: number;
  peakPop: number;
  policies: number; // POLICY bits
  history: HistoryPoint[];
  flags: CityFlags;
  dirtyChunks: Uint8Array; // CHUNKS entries
  changed: number; // CHANGE_* bitmask since the last snapshot
  messages: AdvisorMsg[];
  results: ActionResult[]; // action results since the last snapshot
  notices: Notice[]; // events since the last snapshot
  nextNoticeId: number;
  tornado: Tornado | null; // transient, not saved
}

export interface Tornado {
  x: number;
  y: number;
  dx: number;
  dy: number;
  ticksLeft: number;
}

/** Bits of CityState.changed. */
export const CHANGE = {
  GEOMETRY: 1, // buildings / roads / plops changed (dirtyChunks says where)
  UTILITY: 2, // powered / watered / garbage
  SOCIAL: 4, // crime, fire risk, coverage, edu, health, problems
  ENV: 8, // pollution, land value, desirability
  TRAFFIC: 16,
  FIRE: 32,
  HUD: 64,
  TERRAIN: 128,
  QUAKE: 256, // an earthquake happened since the last snapshot (renderer shakes)
} as const;

// ─── Player intent ────────────────────────────────────────────────────

export type Tool =
  | { kind: 'inspect' }
  | { kind: 'zone'; zone: ZoneKind; density: Density }
  | { kind: 'dezone' }
  | { kind: 'road' }
  | { kind: 'avenue' }
  | { kind: 'line' }
  | { kind: 'pipe' }
  | { kind: 'bulldoze' }
  | { kind: 'plop'; plop: PlopId }
  | { kind: 'disaster'; disaster: DisasterKind };

export type DisasterKind = 'fire' | 'tornado' | 'quake';

export type Action =
  | { type: 'zone'; zone: ZoneKind; density: Density; rect: Rect }
  | { type: 'dezone'; rect: Rect }
  | { type: 'bulldoze'; rect: Rect }
  | { type: 'road'; from: XY; to: XY; avenue?: boolean }
  | { type: 'line'; from: XY; to: XY }
  | { type: 'pipe'; from: XY; to: XY }
  | { type: 'plop'; plop: PlopId; at: XY }
  | { type: 'setTax'; zone: ZoneKind; rate: number }
  | { type: 'setFunding'; service: ServiceId; level: number }
  | { type: 'setPolicy'; policy: number; on: boolean }
  | { type: 'loan'; amount: number }
  | { type: 'repay'; id: number }
  | { type: 'disaster'; kind: DisasterKind; at: XY }
  | { type: 'grant'; amount: number }; // debug panel only

export type ActionFail = 'funds' | 'terrain' | 'occupied' | 'bounds' | 'noop' | 'locked' | 'water';

export interface ActionResult {
  id: number;
  ok: boolean;
  cost: number;
  reason?: ActionFail;
}

// ─── What the UI sees ─────────────────────────────────────────────────

export interface HudStats {
  tick: number;
  funds: number;
  lastMonthNet: number;
  demand: number[];
  taxes: number[];
  funding: number[];
  totals: Totals;
  ledger: Ledger[];
  loans: Loan[];
  externalConnected: boolean;
  brownout: boolean;
  waterShort: boolean;
  garbageShort: boolean;
  milestone: number;
  peakPop: number;
  policies: number;
  history: HistoryPoint[];
  tornado: { x: number; y: number } | null;
}

export const SPEEDS = [0, 1, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];

export type Theme3 = 'light' | 'dark';
