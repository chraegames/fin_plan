// Shapes for placed buildings (plants, stations, schools, parks, pylons).
// Emitted once per plop at its origin tile.

import { plopDef } from '../constants';
import { PLOP } from '../types';
import type { GeometryBuilder, RGB } from './geometryBuilder';
import { emitTree } from './props';

const CONCRETE: RGB = [0.62, 0.6, 0.58];
const DARK: RGB = [0.28, 0.28, 0.3];
const STEEL: RGB = [0.55, 0.57, 0.6];
const WHITE: RGB = [0.92, 0.92, 0.9];
const RED: RGB = [0.75, 0.2, 0.18];
const BLUE: RGB = [0.22, 0.34, 0.62];
const BEIGE: RGB = [0.82, 0.76, 0.62];
const GRASS: RGB = [0.36, 0.58, 0.28];
const PANEL: RGB = [0.12, 0.18, 0.36];
const TANK: RGB = [0.7, 0.72, 0.76];

/**
 * Emit the plop whose origin is tile (x, y). `base` is the top of the
 * foundation (max corner height over the footprint), `low` the min corner.
 * `linkE` / `linkS` say whether a power line continues east / south.
 */
export function emitPlop(b: GeometryBuilder, plop: number, x: number, y: number, base: number, low: number, variant: number, linkE: boolean, linkS: boolean, tint: RGB | null): void {
  const def = plopDef(plop);
  if (!def) return;
  const s = def.size;
  const c = (rgb: RGB): RGB => tint ?? rgb;
  // slab foundation
  if (def.id !== PLOP.LINE) b.box(x + 0.02, low - 0.05, y + 0.02, x + s - 0.02, base + 0.02, y + s - 0.02, CONCRETE, c(CONCRETE));
  const y0 = base + 0.02;
  switch (def.id) {
    case PLOP.COAL:
      b.box(x + 0.15, y0, y + 0.15, x + 1.85, y0 + 0.7, y + 1.4, c(DARK), c(DARK));
      b.cylinder(x + 0.5, y0, y + 1.65, 0.16, y0 + 1.6, 8, c([0.4, 0.38, 0.36]));
      b.cylinder(x + 1.2, y0, y + 1.65, 0.16, y0 + 1.5, 8, c([0.4, 0.38, 0.36]));
      break;
    case PLOP.GAS:
      b.box(x + 0.15, y0, y + 0.15, x + 1.1, y0 + 0.55, y + 1.85, c(STEEL), c(STEEL));
      b.cylinder(x + 1.5, y0, y + 0.55, 0.32, y0 + 0.5, 10, c(TANK));
      b.cylinder(x + 1.5, y0, y + 1.4, 0.32, y0 + 0.5, 10, c(TANK));
      break;
    case PLOP.WIND:
      b.cylinder(x + 0.5, y0, y + 0.5, 0.05, y0 + 1.6, 6, c(WHITE));
      b.box(x + 0.42, y0 + 1.55, y + 0.44, x + 0.58, y0 + 1.7, y + 0.62, c(WHITE), c(WHITE));
      break;
    case PLOP.SOLAR:
      for (let r = 0; r < 4; r++) {
        const zz = y + 0.15 + r * 0.45;
        b.box(x + 0.1, y0 + 0.08, zz, x + 1.9, y0 + 0.14, zz + 0.3, c(PANEL), c(PANEL));
      }
      break;
    case PLOP.LINE: {
      const px = x + 0.5;
      const pz = y + 0.5;
      b.box(px - 0.04, base - 0.05, pz - 0.04, px + 0.04, base + 0.9, pz + 0.04, c(STEEL), c(STEEL));
      b.box(px - 0.22, base + 0.78, pz - 0.03, px + 0.22, base + 0.84, pz + 0.03, c(STEEL), c(STEEL));
      b.box(px - 0.03, base + 0.78, pz - 0.22, px + 0.03, base + 0.84, pz + 0.22, c(STEEL), c(STEEL));
      const wire: RGB = [0.2, 0.2, 0.22];
      if (linkE) b.box(px, base + 0.8, pz - 0.012, px + 1, base + 0.815, pz + 0.012, c(wire), c(wire));
      if (linkS) b.box(px - 0.012, base + 0.8, pz, px + 0.012, base + 0.815, pz + 1, c(wire), c(wire));
      break;
    }
    case PLOP.PUMP:
      b.box(x + 0.2, y0, y + 0.3, x + 0.8, y0 + 0.35, y + 0.8, c(BLUE), c(STEEL));
      b.cylinder(x + 0.5, y0, y + 0.18, 0.08, y0 + 0.5, 6, c(STEEL));
      break;
    case PLOP.TOWER:
      for (const [lx, lz] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) b.box(x + lx - 0.03, y0, y + lz - 0.03, x + lx + 0.03, y0 + 0.9, y + lz + 0.03, c(STEEL), c(STEEL));
      b.cylinder(x + 0.5, y0 + 0.9, y + 0.5, 0.36, y0 + 1.4, 10, c(TANK), c(STEEL));
      break;
    case PLOP.FIRE:
      b.box(x + 0.1, y0, y + 0.1, x + 0.9, y0 + 0.5, y + 0.9, c(RED), c(DARK), 3, 0, 0.3);
      b.box(x + 0.68, y0 + 0.5, y + 0.68, x + 0.88, y0 + 1.1, y + 0.88, c(RED), c(DARK));
      break;
    case PLOP.POLICE:
      b.box(x + 0.1, y0, y + 0.1, x + 0.9, y0 + 0.6, y + 0.9, c(BLUE), c(DARK), 3, 0, 0.3);
      break;
    case PLOP.CLINIC:
      b.box(x + 0.1, y0, y + 0.1, x + 0.9, y0 + 0.6, y + 0.9, c(WHITE), c([0.85, 0.85, 0.85]), 3, 0, 0.3);
      b.box(x + 0.42, y0 + 0.6, y + 0.3, x + 0.58, y0 + 0.66, y + 0.7, c(RED), c(RED));
      b.box(x + 0.3, y0 + 0.6, y + 0.42, x + 0.7, y0 + 0.66, y + 0.58, c(RED), c(RED));
      break;
    case PLOP.HOSPITAL:
      b.box(x + 0.15, y0, y + 0.15, x + 1.85, y0 + 1.2, y + 1.0, c(WHITE), c([0.85, 0.85, 0.85]), 3, 0, 0.3);
      b.box(x + 0.15, y0, y + 1.0, x + 1.0, y0 + 0.6, y + 1.85, c(WHITE), c([0.85, 0.85, 0.85]), 3, 0, 0.3);
      b.box(x + 0.9, y0 + 1.2, y + 0.45, x + 1.1, y0 + 1.27, y + 0.75, c(RED), c(RED));
      b.box(x + 0.8, y0 + 1.2, y + 0.55, x + 1.2, y0 + 1.27, y + 0.65, c(RED), c(RED));
      break;
    case PLOP.SCHOOL:
      b.box(x + 0.1, y0, y + 0.1, x + 0.9, y0 + 0.45, y + 0.6, c(BEIGE), c([0.5, 0.35, 0.3]), 3, 0, 0.3);
      b.box(x + 0.15, y0 + 0.001, y + 0.62, x + 0.85, y0 + 0.02, y + 0.9, c(GRASS), c(GRASS));
      break;
    case PLOP.HIGH:
      b.box(x + 0.1, y0, y + 0.1, x + 1.9, y0 + 0.65, y + 0.8, c(BEIGE), c([0.5, 0.35, 0.3]), 3, 0, 0.3);
      b.box(x + 0.1, y0, y + 0.8, x + 0.6, y0 + 0.65, y + 1.9, c(BEIGE), c([0.5, 0.35, 0.3]), 3, 0, 0.3);
      b.box(x + 0.7, y0 + 0.001, y + 0.9, x + 1.9, y0 + 0.02, y + 1.9, c(GRASS), c(GRASS));
      break;
    case PLOP.UNI:
      b.box(x + 0.1, y0, y + 0.1, x + 2.9, y0 + 0.9, y + 0.9, c(BEIGE), c([0.45, 0.4, 0.38]), 3, 0, 0.3);
      b.box(x + 0.1, y0, y + 0.9, x + 0.8, y0 + 0.75, y + 2.9, c(BEIGE), c([0.45, 0.4, 0.38]), 3, 0, 0.3);
      b.box(x + 2.2, y0, y + 0.9, x + 2.9, y0 + 0.75, y + 2.9, c(BEIGE), c([0.45, 0.4, 0.38]), 3, 0, 0.3);
      b.cylinder(x + 1.5, y0 + 0.9, y + 0.5, 0.25, y0 + 1.3, 10, c(WHITE), c([0.4, 0.5, 0.45]));
      b.box(x + 0.9, y0 + 0.001, y + 1.0, x + 2.1, y0 + 0.02, y + 2.9, c(GRASS), c(GRASS));
      emitTree(b, x + 1.5, y0 + 0.02, y + 2.0, 0.35, variant);
      break;
    case PLOP.PARK_S:
      b.box(x + 0.05, y0 - 0.005, y + 0.05, x + 0.95, y0 + 0.02, y + 0.95, c(GRASS), c(GRASS));
      emitTree(b, x + 0.3, y0 + 0.02, y + 0.35, 0.3, variant);
      emitTree(b, x + 0.7, y0 + 0.02, y + 0.7, 0.26, variant + 1);
      break;
    case PLOP.PARK_L:
      b.box(x + 0.05, y0 - 0.005, y + 0.05, x + 1.95, y0 + 0.02, y + 1.95, c(GRASS), c(GRASS));
      b.box(x + 0.85, y0 + 0.02, y + 0.85, x + 1.15, y0 + 0.05, y + 1.15, c([0.5, 0.6, 0.75]), c([0.5, 0.6, 0.75]));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        emitTree(b, x + 1 + Math.cos(a) * 0.65, y0 + 0.02, y + 1 + Math.sin(a) * 0.65, 0.3, variant + k);
      }
      break;
  }
}
