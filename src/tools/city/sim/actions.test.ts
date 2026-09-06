import { describe, expect, it } from 'vitest';
import { COST, plopDef } from '../constants';
import { PLOP } from '../types';
import { idx, lineTiles } from './grid';
import { act, flatState } from './testUtil';

describe('actions', () => {
  it('zoning charges per tile and refuses when broke', () => {
    const s = flatState(1, 100);
    act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 10, y0: 10, x1: 14, y1: 10 } });
    expect(s.results[0].ok).toBe(true);
    expect(s.results[0].cost).toBe(5 * COST.zone);
    expect(s.funds).toBe(100 - 5 * COST.zone);
    act(s, { type: 'zone', zone: 2, density: 1, rect: { x0: 0, y0: 0, x1: 99, y1: 0 } });
    expect(s.results[1]).toMatchObject({ ok: false, reason: 'funds' });
    expect(s.zone[idx(0, 0)]).toBe(0);
  });

  it('nothing is built on water', () => {
    const s = flatState();
    s.water[idx(5, 5)] = 1;
    act(s, { type: 'road', from: { x: 5, y: 5 }, to: { x: 5, y: 5 } });
    expect(s.results[0]).toMatchObject({ ok: false, reason: 'terrain' });
    act(s, { type: 'plop', plop: PLOP.PUMP, at: { x: 5, y: 5 } });
    expect(s.results[1]).toMatchObject({ ok: false, reason: 'occupied' });
  });

  it('roads follow an L path with no duplicates and clear zoning', () => {
    const s = flatState();
    act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 0, y0: 0, x1: 10, y1: 10 } });
    act(s, { type: 'road', from: { x: 2, y: 3 }, to: { x: 8, y: 9 } });
    const tiles = lineTiles({ x: 2, y: 3 }, { x: 8, y: 9 });
    expect(new Set(tiles).size).toBe(tiles.length);
    expect(tiles.length).toBe(7 + 6);
    for (const i of tiles) {
      expect(s.road[i]).toBe(1);
      expect(s.zone[i]).toBe(0);
    }
    expect(s.results[1].cost).toBe(13 * COST.road);
    // building the same road again is a no-op
    act(s, { type: 'road', from: { x: 2, y: 3 }, to: { x: 8, y: 9 } });
    expect(s.results[2]).toMatchObject({ ok: false, reason: 'noop' });
  });

  it('avenues cost more, upgrade streets for the difference and raise capacity', () => {
    const s = flatState();
    act(s, { type: 'road', from: { x: 0, y: 5 }, to: { x: 9, y: 5 } });
    act(s, { type: 'road', from: { x: 0, y: 5 }, to: { x: 9, y: 5 }, avenue: true });
    expect(s.results[1]).toMatchObject({ ok: true, cost: 10 * (COST.avenue - COST.road) });
    expect(s.road[idx(4, 5)]).toBe(2);
    act(s, { type: 'road', from: { x: 0, y: 5 }, to: { x: 9, y: 5 } });
    expect(s.results[2]).toMatchObject({ ok: false, reason: 'noop' });
  });

  it('plops occupy their footprint and are removed whole by the bulldozer', () => {
    const s = flatState();
    const def = plopDef(PLOP.COAL)!;
    act(s, { type: 'plop', plop: PLOP.COAL, at: { x: 20, y: 20 } });
    expect(s.results[0]).toMatchObject({ ok: true, cost: def.cost });
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) expect(s.plop[idx(20 + dx, 20 + dy)]).toBe(PLOP.COAL);
    act(s, { type: 'plop', plop: PLOP.PUMP, at: { x: 21, y: 21 } });
    expect(s.results[1]).toMatchObject({ ok: false, reason: 'occupied' });
    act(s, { type: 'bulldoze', rect: { x0: 21, y0: 21, x1: 21, y1: 21 } });
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) expect(s.plop[idx(20 + dx, 20 + dy)]).toBe(0);
    expect(s.flags.netDirty).toBe(true);
  });

  it('bulldozing a building clears pop, jobs and the zone', () => {
    const s = flatState();
    const i = idx(3, 3);
    s.zone[i] = 1;
    s.density[i] = 1;
    s.level[i] = 2;
    s.wealth[i] = 1;
    s.pop[i] = 9;
    act(s, { type: 'bulldoze', rect: { x0: 3, y0: 3, x1: 3, y1: 3 } });
    expect(s.level[i]).toBe(0);
    expect(s.pop[i]).toBe(0);
    expect(s.zone[i]).toBe(0);
    expect(s.dirtyChunks[0]).toBe(1);
  });

  it('taxes and funding clamp; loans add funds and are limited to three', () => {
    const s = flatState(1, 0);
    act(s, { type: 'setTax', zone: 1, rate: 50 }, { type: 'setFunding', service: 3, level: 9 });
    expect(s.taxes[0]).toBe(20);
    expect(s.funding[3]).toBe(1.5);
    act(s, { type: 'loan', amount: 10_000 }, { type: 'loan', amount: 25_000 }, { type: 'loan', amount: 10_000 }, { type: 'loan', amount: 10_000 });
    expect(s.loans).toHaveLength(3);
    expect(s.funds).toBe(45_000);
    expect(s.results.at(-1)).toMatchObject({ ok: false, reason: 'noop' });
    act(s, { type: 'loan', amount: 12_345 });
    expect(s.results.at(-1)).toMatchObject({ ok: false });
  });
});
