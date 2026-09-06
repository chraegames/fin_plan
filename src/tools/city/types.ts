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
} as const;
export type PlopId = (typeof PLOP)[keyof typeof PLOP];

/** Funding slots (index into CityState.funding). */
export const SERVICE = { POWER: 0, WATER: 1, ROADS: 2, FIRE: 3, POLICE: 4, HEALTH: 5, EDUCATION: 6 } as const;
export type ServiceId = (typeof SERVICE)[keyof typeof SERVICE];
export const SERVICE_COUNT = 7;

export const OVERLAYS = [
  'none',
  'power',
  'water',
  'traffic',
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
  meanPollution: number;
  meanCrime: number;
  fires: number;
}

export interface Ledger {
  month: number;
  incomeR: number;
  incomeC: number;
  incomeI: number;
  expenses: number[]; // SERVICE_COUNT entries
  loanCost: number;
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
}

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
  road: Uint8Array; // 0/1
  level: Uint8Array; // 0 = no building, 1..3
  wealth: Uint8Array; // 1..3 when level > 0
  abandoned: Uint8Array;
  age: Uint16Array; // months since built
  plop: Uint8Array; // PLOP on every tile the plop covers
  plopOrigin: Uint16Array; // tile index of the plop's top-left, valid where plop != 0
  pop: Uint16Array;
  jobs: Uint16Array;
  onFire: Uint8Array; // intensity 0..255 (saved so a fire survives reload)
  // derived per-tile layers
  powered: Uint8Array;
  watered: Uint8Array;
  powerComp: Int32Array;
  waterComp: Int32Array;
  roadAccess: Uint8Array; // 0 none, else distance 1..3 to a road
  landValue: Uint8Array;
  pollution: Uint8Array;
  waterPollution: Uint8Array;
  crime: Uint8Array;
  fireRisk: Uint8Array;
  fireCover: Uint8Array;
  policeCover: Uint8Array;
  healthCover: Uint8Array;
  eduCover: Uint8Array;
  edu: Uint8Array;
  health: Uint8Array;
  traffic: Uint8Array; // 128 = at capacity
  commute: Uint8Array; // R tiles: trip cost, 255 = no job reachable
  desirability: Uint8Array;
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
  flags: CityFlags;
  dirtyChunks: Uint8Array; // CHUNKS entries
  changed: number; // CHANGE_* bitmask since the last snapshot
  messages: AdvisorMsg[];
  results: ActionResult[]; // action results since the last snapshot
}

/** Bits of CityState.changed. */
export const CHANGE = {
  GEOMETRY: 1, // buildings / roads / plops changed (dirtyChunks says where)
  UTILITY: 2, // powered / watered
  SOCIAL: 4, // crime, fire risk, coverage, edu, health
  ENV: 8, // pollution, land value, desirability
  TRAFFIC: 16,
  FIRE: 32,
  HUD: 64,
  TERRAIN: 128,
} as const;

// ─── Player intent ────────────────────────────────────────────────────

export type Tool =
  | { kind: 'inspect' }
  | { kind: 'zone'; zone: ZoneKind; density: Density }
  | { kind: 'dezone' }
  | { kind: 'road' }
  | { kind: 'line' }
  | { kind: 'bulldoze' }
  | { kind: 'plop'; plop: PlopId }
  | { kind: 'fire' };

export type Action =
  | { type: 'zone'; zone: ZoneKind; density: Density; rect: Rect }
  | { type: 'dezone'; rect: Rect }
  | { type: 'bulldoze'; rect: Rect }
  | { type: 'road'; from: XY; to: XY }
  | { type: 'line'; from: XY; to: XY }
  | { type: 'plop'; plop: PlopId; at: XY }
  | { type: 'setTax'; zone: ZoneKind; rate: number }
  | { type: 'setFunding'; service: ServiceId; level: number }
  | { type: 'loan'; amount: number }
  | { type: 'repay'; id: number }
  | { type: 'disaster'; kind: 'fire'; at: XY };

export type ActionFail = 'funds' | 'terrain' | 'occupied' | 'bounds' | 'noop';

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
}

export const SPEEDS = [0, 1, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];

export type Theme3 = 'light' | 'dark';
