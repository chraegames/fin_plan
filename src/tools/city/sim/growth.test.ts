import { describe, expect, it } from 'vitest';
import { TICKS_PER_MONTH } from '../constants';
import { N, PLOP, T, ZONE } from '../types';
import { idx } from './grid';
import { act, countWhere, flatState, prime, run } from './testUtil';

function startedTown() {
  const s = flatState();
  act(s, { type: 'road', from: { x: 0, y: 40 }, to: { x: N - 1, y: 40 } });
  act(s, { type: 'road', from: { x: 40, y: 20 }, to: { x: 40, y: 60 } });
  act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 20, y0: 41, x1: 39, y1: 43 } });
  act(s, { type: 'zone', zone: 2, density: 1, rect: { x0: 41, y0: 41, x1: 50, y1: 43 } });
  act(s, { type: 'zone', zone: 3, density: 1, rect: { x0: 51, y0: 41, x1: 60, y1: 43 } });
  act(s, { type: 'plop', plop: PLOP.COAL, at: { x: 42, y: 38 } });
  act(s, { type: 'plop', plop: PLOP.TOWER, at: { x: 44, y: 38 } });
  prime(s);
  return s;
}

describe('growth', () => {
  it('a connected, powered, watered town grows within a few months', () => {
    const s = startedTown();
    run(s, TICKS_PER_MONTH * 6);
    const built = countWhere(s.level, v => v > 0);
    expect(built).toBeGreaterThan(20);
    expect(s.totals.population).toBeGreaterThan(50);
    for (let i = 0; i < T; i++) {
      if (!s.level[i]) continue;
      expect(s.wealth[i]).toBeGreaterThanOrEqual(1);
      expect(s.wealth[i]).toBeLessThanOrEqual(3);
    }
  });

  it('zones without a road never grow', () => {
    const s = flatState();
    act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 20, y0: 20, x1: 40, y1: 30 } });
    act(s, { type: 'plop', plop: PLOP.COAL, at: { x: 41, y: 20 } });
    prime(s);
    run(s, TICKS_PER_MONTH * 6);
    expect(countWhere(s.level, v => v > 0)).toBe(0);
  });

  it('an unpowered town stalls and abandons', () => {
    const s = startedTown();
    run(s, TICKS_PER_MONTH * 6);
    const before = countWhere(s.level, v => v > 0);
    act(s, { type: 'bulldoze', rect: { x0: 42, y0: 38, x1: 43, y1: 39 } });
    run(s, TICKS_PER_MONTH * 6);
    expect(s.totals.powerSupply).toBe(0);
    expect(countWhere(s.abandoned, v => v > 0)).toBeGreaterThan(before / 4);
  });

  it('occupancy never exceeds capacity and demand stays within bounds', () => {
    const s = startedTown();
    run(s, TICKS_PER_MONTH * 12);
    for (let i = 0; i < T; i++) {
      if (!s.level[i]) continue;
      const z = s.zone[i];
      expect(z === ZONE.R ? s.pop[i] : s.jobs[i]).toBeLessThanOrEqual(220);
    }
    for (const d of s.demand) {
      expect(d).toBeGreaterThanOrEqual(-130);
      expect(d).toBeLessThanOrEqual(100);
    }
    expect(s.roadAccess[idx(30, 44)]).toBe(0);
  });
});
