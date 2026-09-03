import { describe, expect, it } from 'vitest';
import { generateTower } from './floorgen';
import { validateTower } from './validate';
import { FLOORS } from './types';

const SLOW = !!(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.MT_SLOW;

describe('generated towers', () => {
  it('is deterministic for a seed and loop', () => {
    const a = generateTower(4242, 1);
    const b = generateTower(4242, 1);
    expect(JSON.stringify(a.floors[0])).toBe(JSON.stringify(b.floors[0]));
    expect(JSON.stringify(a.zones[3].line)).toBe(JSON.stringify(b.zones[3].line));
  }, 120000);

  it('loop 1: structure holds and the stored line replays through the reducer', () => {
    const tower = generateTower(31337, 1);
    expect(tower.floors.length).toBe(FLOORS);
    const rep = validateTower(tower, { policies: false });
    expect(rep.structural).toEqual([]);
    expect(rep.zones.every(z => z.replayOk)).toBe(true);
    for (const z of rep.zones) expect(z.templates.length).toBeGreaterThanOrEqual(1);
  }, 120000);

  it('loop 3 (hollow): floor 1 has a hatch aligned with B1 and the summit boss drops a stone', () => {
    const tower = generateTower(2024, 3);
    const f1 = tower.floors[0];
    expect(f1.hatch?.to).toBe(51);
    expect(tower.floors[50].entry).toBe(f1.hatch!.at);
    expect(tower.floors[50].dir).toBe(-1);
    expect(tower.floors[50].label).toBe('B1');
    const summit = tower.floors[49];
    expect(Object.values(summit.items).some(i => i.kind === 'stone' && i.bossDrop)).toBe(true);
    const rep = validateTower(tower, { policies: false });
    expect(rep.structural).toEqual([]);
    expect(rep.zones.every(z => z.replayOk)).toBe(true);
  }, 120000);

  it.skipIf(!SLOW)('sweep: every loop validates across seeds', () => {
    for (let loop = 1; loop <= 10; loop++) {
      for (let k = 0; k < 3; k++) {
        const tower = generateTower(5000 + k, loop);
        const rep = validateTower(tower);
        expect(rep.structural, `loop ${loop} seed ${5000 + k}`).toEqual([]);
        expect(rep.zones.every(z => z.replayOk), `loop ${loop} seed ${5000 + k} replay ${rep.zones.find(z => !z.replayOk)?.replayError}`).toBe(true);
        for (const z of rep.zones) expect(z.lineSlack).toBeGreaterThanOrEqual(0.02);
      }
    }
  }, 1200000);
});
