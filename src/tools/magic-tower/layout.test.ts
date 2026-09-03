import { describe, expect, it } from 'vitest';
import { ARCHETYPES, carve, mirrorLayout, wingCandidates } from './layout';
import { floodOpen } from './path';
import { createRng } from './rng';
import { N, W, XY } from './types';

describe('layouts', () => {
  for (const a of [...ARCHETYPES, 'arena' as const]) {
    it(`${a}: every open tile is connected and rooms cover the open tiles`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const lay = carve(createRng(seed * 7919 + a.length), a);
        const open = lay.walls.map(w => !w);
        const first = open.indexOf(true);
        const seen = floodOpen(open, first);
        for (let i = 0; i < N; i++) expect(seen[i]).toBe(open[i]);
        const covered = new Set([...lay.rooms.flatMap(r => r.tiles), ...lay.gaps.map(g => g.at)]);
        for (let i = 0; i < N; i++) if (open[i]) expect(covered.has(i)).toBe(true);
        expect(open.filter(Boolean).length).toBeGreaterThan(50);
      }
    });
  }
  it('rooms/halls/maze produce wing candidates behind bridge gaps', () => {
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const lay = carve(createRng(seed), 'rooms');
      const wings = wingCandidates(lay, lay.rooms[0].id);
      total += wings.length;
      for (const w of wings) {
        // Blocking the gap really disconnects the wing tiles from room 0.
        const open = lay.walls.map(x => !x);
        open[w.gap.at] = false;
        const seen = floodOpen(open, lay.rooms[0].tiles[0]);
        for (const t of w.tiles) expect(seen[t]).toBe(false);
      }
    }
    expect(total).toBeGreaterThan(20);
  });
  it('mirrorLayout flips x', () => {
    const lay = carve(createRng(3), 'rooms');
    const m = mirrorLayout(lay);
    for (let i = 0; i < N; i++) {
      const { x, y } = XY(i);
      expect(m.walls[y * W + (W - 1 - x)]).toBe(lay.walls[i]);
    }
  });
});
