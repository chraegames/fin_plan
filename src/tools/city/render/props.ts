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
