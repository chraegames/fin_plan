// Allocation of a CityState and the few mutators every system shares.

import { START_FUNDS, TUNING } from '../constants';
import { CHANGE, CHUNKS, SERVICE_COUNT, T, type CityState, type Totals } from '../types';
import { chunkOf } from './grid';
import { generateTerrain } from './terrain';

export function emptyTotals(): Totals {
  return {
    population: 0,
    jobs: 0,
    jobsFilled: 0,
    employed: 0,
    unemployment: 0,
    cityEdu: 0,
    cityHealth: 0,
    avgWealth: 1,
    buildings: 0,
    abandoned: 0,
    roadTiles: 0,
    powerSupply: 0,
    powerDemand: 0,
    waterSupply: 0,
    waterDemand: 0,
    meanPollution: 0,
    meanCrime: 0,
    fires: 0,
  };
}

export function createCityState(seed: number): CityState {
  const terrain = generateTerrain(seed);
  const u8 = () => new Uint8Array(T);
  const u16 = () => new Uint16Array(T);
  const funding = new Float32Array(SERVICE_COUNT).fill(1);
  const taxes = new Float32Array([TUNING.taxNeutral, TUNING.taxNeutral, TUNING.taxNeutral]);
  const state: CityState = {
    seed,
    tick: 0,
    rngState: seed >>> 0,
    height: terrain.height,
    sea: terrain.sea,
    water: terrain.water,
    slope: terrain.slope,
    zone: u8(),
    density: u8(),
    road: u8(),
    level: u8(),
    wealth: u8(),
    abandoned: u8(),
    age: u16(),
    plop: u8(),
    plopOrigin: u16(),
    pop: u16(),
    jobs: u16(),
    onFire: u8(),
    powered: u8(),
    watered: u8(),
    powerComp: new Int32Array(T),
    waterComp: new Int32Array(T),
    roadAccess: u8(),
    extAccess: u8(),
    landValue: u8(),
    pollution: u8(),
    waterPollution: u8(),
    crime: u8(),
    fireRisk: u8(),
    fireCover: u8(),
    policeCover: u8(),
    healthCover: u8(),
    eduCover: u8(),
    edu: u8(),
    health: u8(),
    traffic: u8(),
    commute: u8(),
    desirability: u8(),
    parkDist: u8(),
    waterDist: u8(),
    burnTicks: u8(),
    scratchA: new Float32Array(T),
    scratchB: new Float32Array(T),
    scratchC: new Float32Array(T),
    queue: new Int32Array(T),
    funds: START_FUNDS,
    taxes,
    funding,
    demand: new Float32Array(9),
    totals: emptyTotals(),
    ledger: [],
    loans: [],
    nextLoanId: 1,
    monthsInRed: 0,
    externalConnected: false,
    flags: { netDirty: true, waterDirty: true, serviceDirty: true, distDirty: true, anyFire: false },
    dirtyChunks: new Uint8Array(CHUNKS).fill(1),
    changed: CHANGE.TERRAIN | CHANGE.GEOMETRY | CHANGE.HUD,
    messages: [],
    results: [],
    tornado: null,
  };
  state.commute.fill(255);
  return state;
}

/** Mark the chunk holding tile i as needing a geometry rebuild. */
export function markDirty(state: CityState, i: number): void {
  state.dirtyChunks[chunkOf(i)] = 1;
  state.changed |= CHANGE.GEOMETRY;
}

/** Next random number in [0, 1) from the state's own generator (mulberry32). */
export function nextRandom(state: CityState): number {
  let a = (state.rngState + 0x6d2b79f5) >>> 0;
  state.rngState = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  a = (t ^ (t >>> 14)) >>> 0;
  return a / 4294967296;
}
