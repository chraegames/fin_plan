import { describe, expect, it } from 'vitest';
import { PLOP, T } from '../types';
import { idx } from './grid';
import { balancePower, rebuildPowerNetwork } from './power';
import { act, countWhere, flatState, prime } from './testUtil';
import { rebuildWaterNetwork } from './water';

function town(s = flatState()) {
  act(s, { type: 'road', from: { x: 0, y: 20 }, to: { x: 40, y: 20 } });
  act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 0, y0: 21, x1: 40, y1: 23 } });
  return s;
}

describe('power', () => {
  it('a plant powers everything conductively connected to it', () => {
    const s = town();
    act(s, { type: 'plop', plop: PLOP.COAL, at: { x: 41, y: 19 } });
    // put buildings on the zoned tiles so there is demand
    for (let x = 0; x <= 40; x++) {
      const i = idx(x, 22);
      s.level[i] = 1;
      s.wealth[i] = 1;
      s.pop[i] = 6;
    }
    prime(s);
    expect(s.powered[idx(0, 22)]).toBe(1);
    expect(s.powered[idx(40, 21)]).toBe(1);
    // a separate zoned island is dark
    act(s, { type: 'zone', zone: 1, density: 1, rect: { x0: 60, y0: 60, x1: 62, y1: 62 } });
    rebuildPowerNetwork(s);
    balancePower(s);
    expect(s.powered[idx(61, 61)]).toBe(0);
    // link it with a power line and it lights up
    act(s, { type: 'line', from: { x: 40, y: 24 }, to: { x: 61, y: 59 } });
    rebuildPowerNetwork(s);
    balancePower(s);
    expect(s.powered[idx(61, 61)]).toBe(1);
  });

  it('brownout powers a stable fraction of tiles when demand exceeds supply', () => {
    const s = town();
    act(s, { type: 'plop', plop: PLOP.WIND, at: { x: 41, y: 19 } });
    for (let x = 0; x <= 40; x++) {
      for (let y = 21; y <= 23; y++) {
        const i = idx(x, y);
        s.level[i] = 3;
        s.wealth[i] = 1;
        s.pop[i] = 16;
        s.density[i] = 3;
      }
    }
    prime(s);
    expect(s.totals.powerDemand).toBeGreaterThan(s.totals.powerSupply);
    const lit = countWhere(s.powered, v => v === 1);
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(123);
    const before = Array.from(s.powered);
    balancePower(s);
    expect(Array.from(s.powered)).toEqual(before);
    let poweredDemand = 0;
    for (let i = 0; i < T; i++) if (s.powered[i] && s.level[i]) poweredDemand += 220 * 0.5;
    expect(poweredDemand).toBeLessThanOrEqual(s.totals.powerSupply * 1.6); // hash sampling is approximate
  });
});

describe('water', () => {
  it('coverage follows the pipes and shrinks under shortage', () => {
    const s = town();
    act(s, { type: 'plop', plop: PLOP.TOWER, at: { x: 5, y: 19 } });
    prime(s);
    expect(s.watered[idx(20, 23)]).toBe(1);
    expect(s.watered[idx(20, 26)]).toBe(1); // 6 tiles from the road
    expect(s.watered[idx(20, 27)]).toBe(0);
    expect(s.watered[idx(80, 80)]).toBe(0);
    // heavy demand: high-density towers everywhere on the zone
    for (let x = 0; x <= 40; x++) {
      for (let y = 21; y <= 23; y++) {
        const i = idx(x, y);
        s.level[i] = 3;
        s.wealth[i] = 1;
        s.density[i] = 3;
      }
    }
    rebuildWaterNetwork(s);
    expect(s.totals.waterDemand).toBeGreaterThan(s.totals.waterSupply);
    expect(s.watered[idx(20, 26)]).toBe(0);
  });
});
