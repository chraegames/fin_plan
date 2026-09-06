// Building lots: medium-density zones grow 2×2 lots and high-density 3×3 when
// the space is free; every tile of a lot keeps its own per-tile fields (level,
// wealth, pop…) so the rest of the simulation stays per tile. lotOrigin points
// at the top-left tile, lotSize is the side length (1 for a single lot).

import { N, type CityState } from '../types';
import { idx, xOf, yOf } from './grid';

const tmp: number[] = [];

/** Indices of the tiles in the lot that contains tile i (i itself when unbuilt). */
export function lotTiles(s: CityState, i: number, out: number[] = tmp): number[] {
  out.length = 0;
  if (!s.level[i]) {
    out.push(i);
    return out;
  }
  const o = s.lotOrigin[i];
  const k = s.lotSize[o] || 1;
  const ox = xOf(o);
  const oy = yOf(o);
  for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) out.push(idx(ox + dx, oy + dy));
  return out;
}

/** Preferred lot side for a density. */
export function lotSideFor(density: number): number {
  return density === 3 ? 3 : density === 2 ? 2 : 1;
}

function blockFree(s: CityState, x: number, y: number, k: number, zone: number, density: number): boolean {
  if (x + k > N || y + k > N) return false;
  for (let dy = 0; dy < k; dy++) {
    for (let dx = 0; dx < k; dx++) {
      const j = idx(x + dx, y + dy);
      if (s.zone[j] !== zone || s.density[j] !== density || s.level[j] || s.road[j] || s.plop[j] || s.water[j] || !s.roadAccess[j] || s.onFire[j]) return false;
    }
  }
  return true;
}

/**
 * Claim the largest lot (k×k, k ≤ preferred side) whose top-left is tile i.
 * Writes lotOrigin/lotSize for every claimed tile and returns k (0 = none).
 */
export function claimLot(s: CityState, i: number): number {
  const x = xOf(i);
  const y = yOf(i);
  const zone = s.zone[i];
  const density = s.density[i];
  for (let k = lotSideFor(density); k >= 1; k--) {
    if (!blockFree(s, x, y, k, zone, density)) continue;
    for (let dy = 0; dy < k; dy++) {
      for (let dx = 0; dx < k; dx++) {
        const j = idx(x + dx, y + dy);
        s.lotOrigin[j] = i;
        s.lotSize[j] = k;
      }
    }
    return k;
  }
  return 0;
}
