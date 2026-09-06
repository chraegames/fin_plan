import { describe, expect, it } from 'vitest';
import { groundPoint, pickTile } from './picking';

const flat = () => 0;
const slope = (x: number) => x * 0.05;

describe('pickTile', () => {
  it('a vertical ray picks the tile under it', () => {
    const t = pickTile({ ox: 10.5, oy: 50, oz: 20.5, dx: 0, dy: -1, dz: 0 }, 0, flat);
    expect(t).toEqual({ x: 10, y: 20 });
  });

  it('an oblique ray on a slope converges', () => {
    // From above and to the west, looking east-down: on flat ground it would hit x=40; the slope raises the ground so the hit moves closer.
    const r = { ox: 0, oy: 20, oz: 5.5, dx: 0.894, dy: -0.447, dz: 0 };
    const t = pickTile(r, 0, slope);
    expect(t).not.toBeNull();
    expect(t!.y).toBe(5);
    expect(t!.x).toBeLessThan(40);
    expect(t!.x).toBeGreaterThan(30);
    const p = groundPoint(r, 0, slope)!;
    // y along the ray at the hit equals the ground height there
    const ty = (p.x - r.ox) / r.dx;
    expect(Math.abs(r.oy + r.dy * ty - slope(p.x))).toBeLessThan(0.5);
  });

  it('a ray leaving the map returns null', () => {
    expect(pickTile({ ox: -5, oy: 10, oz: -5, dx: -0.7, dy: -0.7, dz: 0 }, 0, flat)).toBeNull();
    expect(pickTile({ ox: 5, oy: 10, oz: 5, dx: 0, dy: 1, dz: 0 }, 0, flat)).toBeNull();
  });
});
