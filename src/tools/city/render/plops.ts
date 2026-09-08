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
const PAVING: RGB = [0.74, 0.7, 0.64];
const STONE: RGB = [0.86, 0.84, 0.78];
const GOLD: RGB = [0.85, 0.7, 0.3];
const GLASS: RGB = [0.55, 0.7, 0.85];
const RUBBISH: RGB = [0.5, 0.46, 0.36];
const GREEN: RGB = [0.3, 0.62, 0.36];
const NAVY: RGB = [0.18, 0.26, 0.5];
const YELLOW: RGB = [0.93, 0.78, 0.25];
const BINS: RGB[] = [
  [0.2, 0.5, 0.8],
  [0.85, 0.75, 0.2],
  [0.3, 0.6, 0.35],
];

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
  if (def.id !== PLOP.LINE && def.id !== PLOP.PIPE) b.box(x + 0.02, low - 0.05, y + 0.02, x + s - 0.02, base + 0.02, y + s - 0.02, CONCRETE, c(CONCRETE));
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
    case PLOP.PIPE: {
      // a shallow blue channel with joints so the buried pipe reads on the ground
      const px = x + 0.5;
      const pz = y + 0.5;
      const pipe: RGB = [0.3, 0.55, 0.8];
      b.box(px - 0.1, base - 0.02, pz - 0.1, px + 0.1, base + 0.06, pz + 0.1, c(pipe), c(pipe));
      if (linkE) b.box(px, base - 0.02, pz - 0.05, px + 1, base + 0.04, pz + 0.05, c(pipe), c(pipe));
      if (linkS) b.box(px - 0.05, base - 0.02, pz, px + 0.05, base + 0.04, pz + 1, c(pipe), c(pipe));
      break;
    }
    case PLOP.HYDRO:
      b.box(x + 0.1, y0, y + 0.1, x + 1.9, y0 + 0.9, y + 0.7, c(CONCRETE), c(STEEL));
      b.box(x + 0.1, y0, y + 0.7, x + 1.9, y0 + 0.45, y + 1.9, c([0.5, 0.52, 0.55]), c(STEEL));
      for (let k = 0; k < 3; k++) b.box(x + 0.35 + k * 0.5, y0 + 0.45, y + 0.9, x + 0.65 + k * 0.5, y0 + 0.6, y + 1.7, c(GLASS), c(GLASS));
      break;
    case PLOP.NUCLEAR:
      b.box(x + 0.15, y0, y + 1.6, x + 2.85, y0 + 0.7, y + 2.85, c(STEEL), c(STEEL), 3, 0, 0.35);
      b.cylinder(x + 0.8, y0, y + 0.8, 0.55, y0 + 1.4, 12, c(WHITE), c([0.6, 0.62, 0.66]));
      b.cylinder(x + 2.2, y0, y + 0.8, 0.55, y0 + 1.4, 12, c(WHITE), c([0.6, 0.62, 0.66]));
      b.cylinder(x + 1.5, y0, y + 1.55, 0.3, y0 + 0.9, 10, c([0.75, 0.75, 0.78]));
      break;
    case PLOP.TREATMENT:
      b.box(x + 0.1, y0, y + 0.1, x + 0.9, y0 + 0.5, y + 1.9, c(BLUE), c(STEEL), 3, 0, 0.3);
      b.cylinder(x + 1.4, y0, y + 0.55, 0.4, y0 + 0.2, 12, c([0.35, 0.6, 0.8]), c([0.3, 0.55, 0.78]));
      b.cylinder(x + 1.4, y0, y + 1.45, 0.4, y0 + 0.2, 12, c([0.35, 0.6, 0.8]), c([0.3, 0.55, 0.78]));
      break;
    case PLOP.LANDFILL:
      b.box(x + 0.05, y0, y + 0.05, x + 2.95, y0 + 0.03, y + 2.95, c([0.55, 0.5, 0.4]), c([0.55, 0.5, 0.4]));
      b.cone(x + 1.0, y0, y + 1.0, 0.8, y0 + 0.55, 7, c(RUBBISH));
      b.cone(x + 2.1, y0, y + 1.9, 0.7, y0 + 0.45, 7, c([0.46, 0.44, 0.34]));
      b.cone(x + 1.0, y0, y + 2.2, 0.5, y0 + 0.3, 6, c(RUBBISH));
      b.box(x + 2.3, y0, y + 0.2, x + 2.8, y0 + 0.25, y + 0.6, c(YELLOW), c(DARK));
      break;
    case PLOP.INCINERATOR:
      b.box(x + 0.15, y0, y + 0.15, x + 1.85, y0 + 0.8, y + 1.4, c([0.45, 0.42, 0.4]), c(DARK));
      b.cylinder(x + 1.5, y0, y + 1.65, 0.14, y0 + 1.9, 8, c([0.55, 0.55, 0.58]));
      b.box(x + 0.2, y0, y + 1.5, x + 1.0, y0 + 0.35, y + 1.85, c(GREEN), c(DARK));
      break;
    case PLOP.RECYCLING:
      b.box(x + 0.15, y0, y + 0.15, x + 1.85, y0 + 0.55, y + 1.1, c(GREEN), c([0.2, 0.4, 0.25]), 3, 0, 0.3);
      for (let k = 0; k < 3; k++) b.box(x + 0.25 + k * 0.55, y0, y + 1.3, x + 0.65 + k * 0.55, y0 + 0.3, y + 1.8, c(BINS[k]), c(DARK));
      break;
    case PLOP.BUS:
      b.box(x + 0.1, y0, y + 0.1, x + 1.9, y0 + 0.5, y + 0.9, c(STEEL), c(DARK), 3, 0, 0.3);
      b.box(x + 0.1, y0 - 0.001, y + 0.95, x + 1.9, y0 + 0.01, y + 1.9, c(PAVING), c(PAVING));
      b.box(x + 0.2, y0 + 0.01, y + 1.05, x + 0.9, y0 + 0.28, y + 1.35, c(YELLOW), c(YELLOW));
      b.box(x + 1.1, y0 + 0.01, y + 1.45, x + 1.8, y0 + 0.28, y + 1.75, c(YELLOW), c(YELLOW));
      break;
    case PLOP.FIRE_HQ:
      b.box(x + 0.1, y0, y + 0.1, x + 1.9, y0 + 0.7, y + 1.3, c(RED), c(DARK), 3, 0, 0.3);
      b.box(x + 0.1, y0, y + 1.3, x + 1.0, y0 + 0.45, y + 1.9, c(RED), c(DARK));
      b.box(x + 1.5, y0 + 0.7, y + 0.9, x + 1.85, y0 + 1.5, y + 1.25, c(RED), c(DARK));
      break;
    case PLOP.POLICE_HQ:
      b.box(x + 0.1, y0, y + 0.1, x + 1.9, y0 + 0.9, y + 1.1, c(NAVY), c(DARK), 3, 0, 0.3);
      b.box(x + 0.3, y0, y + 1.1, x + 1.7, y0 + 0.5, y + 1.9, c(NAVY), c(DARK), 3, 0, 0.3);
      b.box(x + 0.8, y0 + 0.9, y + 0.5, x + 1.2, y0 + 1.15, y + 0.75, c(WHITE), c(WHITE));
      break;
    case PLOP.LIBRARY:
      b.box(x + 0.15, y0, y + 0.3, x + 1.85, y0 + 0.75, y + 1.7, c(STONE), c([0.5, 0.45, 0.4]), 3, 0, 0.35);
      for (let k = 0; k < 4; k++) b.cylinder(x + 0.35 + k * 0.43, y0, y + 0.2, 0.05, y0 + 0.75, 6, c(WHITE));
      b.gable(x + 0.1, y0 + 0.75, y + 0.1, x + 1.9, y0 + 1.0, y + 1.8, true, c([0.5, 0.45, 0.4]));
      break;
    case PLOP.CITY_HALL:
      b.box(x + 0.15, y0, y + 0.3, x + 1.85, y0 + 0.8, y + 1.85, c(STONE), c([0.55, 0.5, 0.45]), 3, 0, 0.4);
      for (let k = 0; k < 5; k++) b.cylinder(x + 0.3 + k * 0.35, y0, y + 0.2, 0.045, y0 + 0.8, 6, c(WHITE));
      b.cylinder(x + 1.0, y0 + 0.8, y + 1.05, 0.4, y0 + 1.0, 12, c(STONE));
      b.cone(x + 1.0, y0 + 1.0, y + 1.05, 0.42, y0 + 1.45, 12, c([0.35, 0.6, 0.55]));
      b.cylinder(x + 1.0, y0 + 1.45, y + 1.05, 0.03, y0 + 1.75, 5, c(GOLD));
      break;
    case PLOP.STADIUM:
      b.cylinder(x + 1.5, y0, y + 1.5, 1.42, y0 + 0.9, 20, c(CONCRETE), c([0.55, 0.55, 0.58]));
      b.cylinder(x + 1.5, y0 + 0.02, y + 1.5, 1.0, y0 + 0.92, 20, c(GRASS), c(GRASS));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        b.cylinder(x + 1.5 + Math.cos(a) * 1.3, y0 + 0.9, y + 1.5 + Math.sin(a) * 1.3, 0.05, y0 + 1.9, 5, c(STEEL));
        b.box(x + 1.5 + Math.cos(a) * 1.3 - 0.12, y0 + 1.8, y + 1.5 + Math.sin(a) * 1.3 - 0.12, x + 1.5 + Math.cos(a) * 1.3 + 0.12, y0 + 1.95, y + 1.5 + Math.sin(a) * 1.3 + 0.12, c(WHITE), c(WHITE));
      }
      break;
    case PLOP.LANDMARK:
      b.box(x + 0.2, y0, y + 0.2, x + 1.8, y0 + 0.5, y + 1.8, c(STONE), c(STONE));
      b.box(x + 0.5, y0 + 0.5, y + 0.5, x + 1.5, y0 + 3.2, y + 1.5, c(GLASS), c(STEEL), 3, 0, 0.32);
      b.box(x + 0.65, y0 + 3.2, y + 0.65, x + 1.35, y0 + 4.2, y + 1.35, c(GLASS), c(STEEL), 3, 0, 0.32);
      b.cone(x + 1.0, y0 + 4.2, y + 1.0, 0.36, y0 + 5.2, 8, c(STEEL));
      b.cylinder(x + 1.0, y0 + 5.2, y + 1.0, 0.03, y0 + 5.9, 5, c(GOLD));
      break;
    case PLOP.PLAZA:
      b.box(x + 0.05, y0 - 0.005, y + 0.05, x + 0.95, y0 + 0.02, y + 0.95, c(PAVING), c(PAVING));
      b.cylinder(x + 0.5, y0 + 0.02, y + 0.5, 0.2, y0 + 0.08, 10, c([0.5, 0.6, 0.75]));
      b.cylinder(x + 0.5, y0 + 0.08, y + 0.5, 0.06, y0 + 0.35, 6, c(STONE));
      emitTree(b, x + 0.18, y0 + 0.02, y + 0.18, 0.2, variant);
      emitTree(b, x + 0.82, y0 + 0.02, y + 0.82, 0.2, variant + 2);
      break;
  }
}
