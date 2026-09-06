import { describe, expect, it } from 'vitest';
import { N } from '../types';
import { idx } from './grid';
import { analyseRoads } from './roads';
import { act, flatState } from './testUtil';

describe('road analysis', () => {
  it('road access reaches three tiles from a road, not four', () => {
    const s = flatState();
    act(s, { type: 'road', from: { x: 10, y: 10 }, to: { x: 30, y: 10 } });
    analyseRoads(s);
    expect(s.roadAccess[idx(20, 10)]).toBe(1);
    expect(s.roadAccess[idx(20, 11)]).toBe(2);
    expect(s.roadAccess[idx(20, 13)]).toBe(4);
    expect(s.roadAccess[idx(20, 14)]).toBe(0);
    expect(s.totals.roadTiles).toBe(21);
  });

  it('external connection needs a road that reaches the map edge', () => {
    const s = flatState();
    act(s, { type: 'road', from: { x: 10, y: 10 }, to: { x: 30, y: 10 } });
    analyseRoads(s);
    expect(s.externalConnected).toBe(false);
    expect(s.extAccess[idx(20, 11)]).toBe(0);
    act(s, { type: 'road', from: { x: 30, y: 10 }, to: { x: N - 1, y: 10 } });
    analyseRoads(s);
    expect(s.externalConnected).toBe(true);
    expect(s.extAccess[idx(20, 11)]).toBe(1);
    // an island road elsewhere stays disconnected
    act(s, { type: 'road', from: { x: 50, y: 50 }, to: { x: 60, y: 50 } });
    analyseRoads(s);
    expect(s.extAccess[idx(55, 51)]).toBe(0);
    expect(s.extAccess[idx(55, 11)]).toBe(1);
  });
});
