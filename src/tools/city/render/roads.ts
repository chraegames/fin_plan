// Road pieces: a 4-neighbour mask picks one of six atlas tiles and a rotation.
// Pure; the atlas itself is painted in roadAtlas.ts.

import type { GeometryBuilder, RGB } from './geometryBuilder';

export const PIECES = 6; // isolated, end, straight, corner, tee, cross
export const MASK_E = 1;
export const MASK_S = 2;
export const MASK_W = 4;
export const MASK_N = 8;

/** Atlas piece index and clockwise quarter-turns for a connection mask. Canonical orientations: end opens N, straight N-S, corner N+E, tee N+E+S. */
export function roadPiece(mask: number): { piece: number; rot: number } {
  const bits = (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
  if (bits === 0) return { piece: 0, rot: 0 };
  if (bits === 4) return { piece: 5, rot: 0 };
  // rotate mask by r quarter-turns clockwise: N→E→S→W
  const rotate = (m: number, r: number): number => {
    let out = m;
    for (let k = 0; k < r; k++) out = ((out & MASK_N ? MASK_E : 0) | (out & MASK_E ? MASK_S : 0) | (out & MASK_S ? MASK_W : 0) | (out & MASK_W ? MASK_N : 0));
    return out;
  };
  const canon = bits === 1 ? MASK_N : bits === 3 ? MASK_N | MASK_E | MASK_S : mask === (MASK_N | MASK_S) || mask === (MASK_E | MASK_W) ? MASK_N | MASK_S : MASK_N | MASK_E;
  const piece = bits === 1 ? 1 : bits === 3 ? 4 : canon === (MASK_N | MASK_S) ? 2 : 3;
  for (let r = 0; r < 4; r++) if (rotate(canon, r) === mask) return { piece, rot: r };
  return { piece: 0, rot: 0 };
}

const WHITE: RGB = [1, 1, 1];

/** Emit a road quad for tile (x, y) with corner heights [nw, ne, sw, se]; row 0 = street, row 1 = avenue. */
export function emitRoad(b: GeometryBuilder, x: number, y: number, mask: number, corners: readonly number[], row = 0): void {
  const { piece, rot } = roadPiece(mask);
  const u0 = piece / PIECES;
  const u1 = (piece + 1) / PIECES;
  const v1 = 1 - row / 2;
  const v0 = v1 - 0.5;
  // uv corners in canonical orientation: nw, sw, se, ne (matches ground() vertex order)
  let uv = [u0, v1, u0, v0, u1, v0, u1, v1];
  for (let r = 0; r < rot; r++) uv = [uv[6], uv[7], uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]];
  const lift = 0.03;
  b.ground(x, y, corners[0] + lift, corners[1] + lift, corners[2] + lift, corners[3] + lift, WHITE, uv);
}
