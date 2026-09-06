import { describe, expect, it } from 'vitest';
import { TICKS_PER_MONTH } from '../constants';
import { SNAPSHOT_LAYERS } from '../protocol';
import { PLOP, T, type Action, type CityState } from '../types';
import { createCityState } from './state';
import { densifyActions, findSite, serviceActions, townActions } from './scenario';
import { applyActions, primeDerived, tick } from './tick';

function scripted(seed: number, months: number): CityState {
  const s = createCityState(seed);
  const site = findSite(s, 45, 31)!;
  expect(site).toBeTruthy();
  let id = 1;
  const apply = (as: Action[]) => applyActions(s, as.map(action => ({ id: id++, action })));
  apply(townActions(site));
  primeDerived(s);
  for (let m = 0; m < months; m++) {
    if (m === 6) apply(serviceActions(site));
    if (m === 12) apply(densifyActions(site, 2));
    if (m === 9) apply([{ type: 'disaster', kind: 'fire', at: { x: site.x0 + 2, y: site.y0 + 2 } }]);
    for (let k = 0; k < TICKS_PER_MONTH; k++) tick(s);
  }
  return s;
}

describe('tick', () => {
  it('is deterministic: same seed and actions give byte-identical layers', () => {
    const a = scripted(7, 20);
    const b = scripted(7, 20);
    for (const [name] of SNAPSHOT_LAYERS) expect(Array.from(a[name] as Uint8Array)).toEqual(Array.from(b[name] as Uint8Array));
    expect(a.funds).toBe(b.funds);
    expect(a.rngState).toBe(b.rngState);
    expect(Array.from(a.demand)).toEqual(Array.from(b.demand));
  }, 30_000);

  it('produces no NaN or infinities and keeps every layer in range', () => {
    const s = scripted(3, 18);
    expect(Number.isFinite(s.funds)).toBe(true);
    for (const d of s.demand) expect(Number.isFinite(d)).toBe(true);
    for (const v of Object.values(s.totals)) expect(Number.isFinite(v)).toBe(true);
    for (let i = 0; i < T; i++) {
      expect(s.level[i]).toBeLessThanOrEqual(3);
      expect(s.wealth[i]).toBeLessThanOrEqual(3);
      if (s.level[i]) expect(s.wealth[i]).toBeGreaterThan(0);
      if (!s.level[i]) {
        expect(s.pop[i]).toBe(0);
        expect(s.jobs[i]).toBe(0);
      }
      if (s.plop[i]) expect(s.plop[i]).toBeLessThanOrEqual(PLOP.PARK_L);
    }
    expect(s.totals.population).toBeGreaterThan(500);
    expect(s.ledger.length).toBeLessThanOrEqual(12);
    expect(s.ledger.length).toBeGreaterThan(0);
  }, 30_000);
});
