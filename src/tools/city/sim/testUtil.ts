// Helpers shared by the sim tests: a state on a flat, fully buildable map.

import { SERVICE_COUNT, T, type Action, type CityState } from '../types';
import { createCityState } from './state';
import { applyActions, primeDerived, tick } from './tick';

/** A state whose terrain is flattened: all land, no slope, so layouts are predictable. */
export function flatState(seed = 1, funds = 1_000_000): CityState {
  const s = createCityState(seed);
  s.height.fill(0.5);
  s.sea = 0.2;
  s.water.fill(0);
  s.slope.fill(0);
  s.funds = funds;
  s.funding.fill(1);
  void SERVICE_COUNT;
  return s;
}

let nextId = 1;
export function act(s: CityState, ...actions: Action[]): number[] {
  const ids = actions.map(() => nextId++);
  applyActions(
    s,
    actions.map((action, k) => ({ id: ids[k], action })),
  );
  return ids;
}

export function run(s: CityState, ticks: number): void {
  for (let k = 0; k < ticks; k++) tick(s);
}

export function prime(s: CityState): void {
  primeDerived(s);
}

export function countWhere(a: Uint8Array | Uint16Array, pred: (v: number) => boolean): number {
  let n = 0;
  for (let i = 0; i < T; i++) if (pred(a[i])) n++;
  return n;
}
