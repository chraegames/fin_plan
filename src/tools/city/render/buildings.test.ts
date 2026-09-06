import { describe, expect, it } from 'vitest';
import { buildingSpec } from './buildings';
import { roadPiece, MASK_E, MASK_N, MASK_S, MASK_W } from './roads';

describe('buildingSpec', () => {
  it('is deterministic in its inputs', () => {
    const a = buildingSpec(1, 2, 2, 3, 77);
    const b = buildingSpec(1, 2, 2, 3, 77);
    expect(a).toEqual(b);
  });
  it('stays inside the tile and grows with level', () => {
    for (let zone = 1; zone <= 3; zone++) {
      for (let density = 1; density <= 3; density++) {
        for (let wealth = 1; wealth <= 3; wealth++) {
          let last = 0;
          for (let level = 1; level <= 3; level++) {
            const s = buildingSpec(zone, density, wealth, level, 5);
            expect(s.parts.length).toBeGreaterThan(0);
            for (const p of s.parts) {
              if (p.kind === 'cyl') {
                expect(p.cx - p.r).toBeGreaterThanOrEqual(-0.01);
                expect(p.cx + p.r).toBeLessThanOrEqual(1.01);
              } else {
                expect(p.x0).toBeGreaterThanOrEqual(-0.05);
                expect(p.x1).toBeLessThanOrEqual(1.1);
                expect(p.z0).toBeGreaterThanOrEqual(-0.05);
                expect(p.z1).toBeLessThanOrEqual(1.1);
              }
            }
            expect(s.height).toBeGreaterThanOrEqual(last);
            last = s.height;
          }
        }
      }
    }
  });
});

describe('roadPiece', () => {
  it('maps every mask to a piece and a rotation that reproduces it', () => {
    const rot = (m: number, r: number) => {
      let out = m;
      for (let k = 0; k < r; k++) out = (out & MASK_N ? MASK_E : 0) | (out & MASK_E ? MASK_S : 0) | (out & MASK_S ? MASK_W : 0) | (out & MASK_W ? MASK_N : 0);
      return out;
    };
    const canon = [0, MASK_N, MASK_N | MASK_S, MASK_N | MASK_E, MASK_N | MASK_E | MASK_S, 15];
    for (let mask = 0; mask < 16; mask++) {
      const { piece, rot: r } = roadPiece(mask);
      expect(rot(canon[piece], r)).toBe(mask);
    }
    expect(roadPiece(MASK_E | MASK_W)).toEqual({ piece: 2, rot: 1 });
  });
});
