// Small props emitted straight into the chunk geometry: trees.

import type { GeometryBuilder, RGB } from './geometryBuilder';

const TRUNK: RGB = [0.4, 0.3, 0.2];
const CROWNS: RGB[] = [
  [0.22, 0.45, 0.2],
  [0.28, 0.52, 0.22],
  [0.2, 0.4, 0.24],
  [0.34, 0.5, 0.2],
];

export function emitTree(b: GeometryBuilder, x: number, y: number, z: number, size: number, variant: number): void {
  const crown = CROWNS[variant & 3];
  const h = size * 1.6;
  b.cylinder(x, y, z, size * 0.12, y + h * 0.35, 5, TRUNK);
  if (variant & 4) {
    b.cone(x, y + h * 0.25, z, size * 0.62, y + h, 6, crown);
  } else {
    b.cone(x, y + h * 0.3, z, size * 0.66, y + h * 0.78, 6, crown);
    b.cone(x, y + h * 0.55, z, size * 0.48, y + h * 1.05, 6, crown);
  }
}

const FENCE: RGB = [0.85, 0.55, 0.2];
const SAND: RGB = [0.72, 0.64, 0.5];
const FRAME: RGB = [0.6, 0.6, 0.62];
const CRANE: RGB = [0.9, 0.7, 0.15];

/** A building site: cleared ground, fence posts, a steel frame and (on big lots) a crane. */
export function emitConstruction(b: GeometryBuilder, x: number, y: number, k: number, corners: readonly number[], variant: number): void {
  const base = Math.max(corners[0], corners[1], corners[2], corners[3]);
  const low = Math.min(corners[0], corners[1], corners[2], corners[3]);
  b.box(x + 0.04, low - 0.05, y + 0.04, x + k - 0.04, base + 0.02, y + k - 0.04, SAND, SAND);
  const y0 = base + 0.02;
  // fence posts around the edge
  const step = 0.5;
  for (let t = 0.1; t < k; t += step) {
    b.box(x + t, y0, y + 0.05, x + t + 0.06, y0 + 0.2, y + 0.11, FENCE, FENCE);
    b.box(x + t, y0, y + k - 0.11, x + t + 0.06, y0 + 0.2, y + k - 0.05, FENCE, FENCE);
    b.box(x + 0.05, y0, y + t, x + 0.11, y0 + 0.2, y + t + 0.06, FENCE, FENCE);
    b.box(x + k - 0.11, y0, y + t, x + k - 0.05, y0 + 0.2, y + t + 0.06, FENCE, FENCE);
  }
  // steel frame: columns and one deck
  const inset = 0.22;
  const h = 0.35 + 0.12 * k;
  for (const [cx, cz] of [
    [inset, inset],
    [k - inset, inset],
    [inset, k - inset],
    [k - inset, k - inset],
  ]) {
    b.box(x + cx - 0.03, y0, y + cz - 0.03, x + cx + 0.03, y0 + h, y + cz + 0.03, FRAME, FRAME);
  }
  b.box(x + inset - 0.03, y0 + h - 0.04, y + inset - 0.03, x + k - inset + 0.03, y0 + h, y + k - inset + 0.03, FRAME, FRAME);
  if (k >= 2) {
    const cx = x + k - 0.35;
    const cz = y + 0.35;
    b.box(cx - 0.04, y0, cz - 0.04, cx + 0.04, y0 + 1.2 + 0.3 * k, cz + 0.04, CRANE, CRANE);
    const arm = 0.8 + 0.3 * k;
    if (variant & 1) b.box(cx - arm, y0 + 1.15 + 0.3 * k, cz - 0.03, cx + 0.25, y0 + 1.2 + 0.3 * k, cz + 0.03, CRANE, CRANE);
    else b.box(cx - 0.03, y0 + 1.15 + 0.3 * k, cz - 0.25, cx + 0.03, y0 + 1.2 + 0.3 * k, cz + arm, CRANE, CRANE);
  }
}
