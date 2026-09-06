// Procedural building shapes. buildingSpec() is pure data (tested);
// emitBuilding() pushes it into a GeometryBuilder at a tile.

import { ZONE } from '../types';
import type { GeometryBuilder, RGB } from './geometryBuilder';

export interface BoxPart {
  kind: 'box';
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  h0: number;
  h1: number;
  color: RGB;
  roof: RGB;
  windows: boolean;
}
export interface GablePart {
  kind: 'gable';
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  h0: number;
  h1: number;
  alongX: boolean;
  color: RGB;
}
export interface CylPart {
  kind: 'cyl';
  cx: number;
  cz: number;
  r: number;
  h0: number;
  h1: number;
  color: RGB;
}
export type Part = BoxPart | GablePart | CylPart;

export interface BuildingSpec {
  parts: Part[];
  floorH: number;
  height: number;
}

// wall colours [zone][wealth][variant%3]
const WALLS: RGB[][][] = [
  [],
  [
    [],
    [
      [0.78, 0.7, 0.56],
      [0.72, 0.66, 0.58],
      [0.8, 0.74, 0.62],
    ],
    [
      [0.86, 0.82, 0.72],
      [0.8, 0.78, 0.7],
      [0.88, 0.85, 0.78],
    ],
    [
      [0.93, 0.92, 0.88],
      [0.9, 0.9, 0.86],
      [0.86, 0.88, 0.9],
    ],
  ],
  [
    [],
    [
      [0.66, 0.66, 0.7],
      [0.7, 0.66, 0.62],
      [0.62, 0.64, 0.68],
    ],
    [
      [0.62, 0.68, 0.78],
      [0.7, 0.72, 0.78],
      [0.58, 0.64, 0.74],
    ],
    [
      [0.55, 0.68, 0.84],
      [0.6, 0.7, 0.86],
      [0.5, 0.62, 0.8],
    ],
  ],
  [
    [],
    [
      [0.5, 0.42, 0.36],
      [0.55, 0.45, 0.38],
      [0.46, 0.4, 0.36],
    ],
    [
      [0.6, 0.6, 0.6],
      [0.56, 0.58, 0.6],
      [0.64, 0.62, 0.58],
    ],
    [
      [0.88, 0.9, 0.94],
      [0.82, 0.88, 0.94],
      [0.9, 0.92, 0.92],
    ],
  ],
];
const ROOFS: RGB[] = [
  [0, 0, 0],
  [0.42, 0.3, 0.26],
  [0.38, 0.38, 0.4],
  [0.3, 0.32, 0.36],
];
export const ABANDONED: RGB = [0.45, 0.44, 0.42];
export const BURNING: RGB = [0.95, 0.45, 0.15];

const FLOORS: number[][][] = [
  [],
  [[], [0, 1, 2, 2], [0, 3, 4, 6], [0, 8, 12, 18]],
  [[], [0, 1, 1, 2], [0, 3, 5, 7], [0, 10, 16, 24]],
  [[], [0, 1, 1, 2], [0, 2, 3, 3], [0, 3, 4, 5]],
];

export function buildingSpec(zone: number, density: number, wealth: number, level: number, variant: number): BuildingSpec {
  const parts: Part[] = [];
  const floorH = 0.3 * [0, 1, 1.05, 1.15][wealth];
  const v = variant & 0xff;
  const jitter = ((v >> 4) / 15 - 0.5) * 0.08;
  const inset = Math.max(0.04, [0, 0.22, 0.12, 0.06][density] + jitter);
  let floors = FLOORS[zone][density][level];
  if (wealth === 3 && density === 3 && v & 1) floors += 2;
  const wall = WALLS[zone][wealth][v % 3];
  const roof = ROOFS[wealth];
  const x0 = inset;
  const z0 = inset;
  const x1 = 1 - inset;
  const z1 = 1 - inset;
  let height = floors * floorH;
  const box = (ax: number, az: number, bx: number, bz: number, h0: number, h1: number, color: RGB = wall, rf: RGB = roof, windows = true): void => {
    parts.push({ kind: 'box', x0: ax, z0: az, x1: bx, z1: bz, h0, h1, color, roof: rf, windows });
  };
  if (zone === ZONE.R) {
    if (density === 1) {
      const h = floors * floorH;
      box(x0, z0, x1, z1, 0, h);
      parts.push({ kind: 'gable', x0: x0 - 0.02, z0: z0 - 0.02, x1: x1 + 0.02, z1: z1 + 0.02, h0: h, h1: h + 0.22, alongX: !!(v & 2), color: roof });
      height = h + 0.22;
    } else if (density === 2) {
      box(x0, z0, x1, z1, 0, height);
      box(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, height, height + 0.06, roof, roof, false);
      height += 0.06;
    } else {
      const setback = Math.round(floors * 0.6) * floorH;
      box(x0, z0, x1, z1, 0, setback);
      const i2 = inset + 0.1;
      box(i2, i2, 1 - i2, 1 - i2, setback, height);
    }
  } else if (zone === ZONE.C) {
    if (density === 1) {
      box(x0, z0, x1, z1, 0, height);
      // awning strip
      box(x0 - 0.03, z1 - 0.02, x1 + 0.03, z1 + 0.08, floorH * 0.7, floorH * 0.78, [0.8, 0.3, 0.25], [0.8, 0.3, 0.25], false);
    } else if (density === 2) {
      box(x0, z0, x1, z1, 0, height);
      box(0.35, 0.35, 0.65, 0.65, height, height + 0.12, [0.5, 0.5, 0.52], [0.5, 0.5, 0.52], false);
      height += 0.12;
    } else {
      const t1 = Math.round(floors * 0.45) * floorH;
      const t2 = Math.round(floors * 0.8) * floorH;
      box(x0, z0, x1, z1, 0, t1);
      box(x0 + 0.06, z0 + 0.06, x1 - 0.06, z1 - 0.06, t1, t2);
      box(x0 + 0.14, z0 + 0.14, x1 - 0.14, z1 - 0.14, t2, height);
      if (wealth === 3) {
        box(0.44, 0.44, 0.56, 0.56, height, height + 0.25, roof, roof, false);
        height += 0.25;
      }
    }
  } else {
    // industry: sheds
    const shedH = floors * floorH * 0.9;
    if (density === 1) {
      box(x0, 0.2, x1, 0.8, 0, shedH, wall, roof);
      if (wealth === 1) parts.push({ kind: 'cyl', cx: x1 - 0.08, cz: 0.3, r: 0.045, h0: 0, h1: shedH + 0.5, color: [0.35, 0.33, 0.32] });
      height = wealth === 1 ? shedH + 0.5 : shedH;
    } else if (density === 2) {
      box(x0, z0, x1, 0.48, 0, shedH, wall, roof);
      box(x0, 0.52, x1, z1, 0, shedH * 0.8, wall, roof);
      if (wealth === 1) parts.push({ kind: 'cyl', cx: x1 - 0.08, cz: z0 + 0.1, r: 0.05, h0: 0, h1: shedH + 0.7, color: [0.35, 0.33, 0.32] });
      height = shedH + (wealth === 1 ? 0.7 : 0);
    } else {
      box(x0, 0.4, x1, z1, 0, shedH, wall, roof);
      box(x0, z0, 0.55, 0.36, 0, floors * floorH * 1.6, wall, roof);
      if (wealth === 1) parts.push({ kind: 'cyl', cx: x1 - 0.1, cz: 0.5, r: 0.06, h0: 0, h1: shedH + 0.9, color: [0.35, 0.33, 0.32] });
      height = Math.max(floors * floorH * 1.6, shedH + 0.9);
    }
  }
  return { parts, floorH, height };
}

/** Push a building at tile (x, y) whose corner heights are [nw, ne, sw, se]. */
export function emitBuilding(b: GeometryBuilder, x: number, y: number, spec: BuildingSpec, corners: readonly number[], tint: RGB | null): void {
  const base = Math.max(corners[0], corners[1], corners[2], corners[3]);
  const low = Math.min(corners[0], corners[1], corners[2], corners[3]);
  const foundation: RGB = [0.42, 0.4, 0.38];
  if (base - low > 0.01) {
    // foundation under the whole footprint of the first box
    const p0 = spec.parts.find(p => p.kind === 'box') as BoxPart | undefined;
    if (p0) b.box(x + p0.x0, low - 0.05, y + p0.z0, x + p0.x1, base + 0.001, y + p0.z1, foundation, foundation);
  }
  for (const p of spec.parts) {
    const color = tint ?? p.color;
    if (p.kind === 'box') {
      const shade: RGB = [color[0] * 0.92, color[1] * 0.92, color[2] * 0.92];
      b.box(x + p.x0, base + p.h0, y + p.z0, x + p.x1, base + p.h1, y + p.z1, color, tint ?? p.roof, p.windows && !tint ? 3 : 0, 0, spec.floorH);
      void shade;
    } else if (p.kind === 'gable') {
      b.gable(x + p.x0, base + p.h0, y + p.z0, x + p.x1, base + p.h1, y + p.z1, p.alongX, tint ?? p.color);
    } else {
      b.cylinder(x + p.cx, base + p.h0, y + p.cz, p.r, base + p.h1, 6, tint ?? p.color);
    }
  }
}
