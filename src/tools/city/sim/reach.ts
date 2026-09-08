// Shared "reach along the roads" flood used by services, garbage, transit
// and civic buildings: seeds at the road tiles around a footprint, walks the
// road graph up to `range` steps, then lets lots within three tiles of a
// reached road inherit its distance.

import { T, type CityState } from '../types';
import { idx, inBounds, nbr, xOf, yOf } from './grid';

const reachDist = new Float32Array(T).fill(-1); // -1 = untouched
const touched = new Int32Array(T);
const lotStep = new Uint8Array(T);

/**
 * Flood from the plop at `origin` (footprint `size`). `visit(tiles, n, dist)` is called once
 * with every reached tile (roads and lots) and their road distance in `dist[tile]`.
 */
export function coverAlongRoads(s: CityState, origin: number, size: number, range: number, visit: (tiles: Int32Array, n: number, dist: Float32Array) => void): void {
  const queue = s.queue;
  let head = 0;
  let tail = 0;
  let nTouched = 0;
  const ox = xOf(origin);
  const oy = yOf(origin);
  for (let dy = -1; dy <= size; dy++) {
    for (let dx = -1; dx <= size; dx++) {
      if (dx >= 0 && dy >= 0 && dx < size && dy < size) continue;
      const x = ox + dx;
      const y = oy + dy;
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (s.road[i] && reachDist[i] < 0) {
        reachDist[i] = 0;
        touched[nTouched++] = i;
        queue[tail++] = i;
      }
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = reachDist[i] + 1;
    if (d > range) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || !s.road[n] || reachDist[n] >= 0) continue;
      reachDist[n] = d;
      touched[nTouched++] = n;
      queue[tail++] = n;
    }
  }
  // lots within three tiles of a reached road inherit its distance
  for (let k = 0; k < tail; k++) lotStep[queue[k]] = 0;
  head = 0;
  while (head < tail) {
    const i = queue[head++];
    const step = lotStep[i] + 1;
    if (step > 3) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || s.road[n] || reachDist[n] >= 0) continue;
      reachDist[n] = reachDist[i];
      lotStep[n] = step;
      touched[nTouched++] = n;
      queue[tail++] = n;
    }
  }
  visit(touched, nTouched, reachDist);
  for (let k = 0; k < nTouched; k++) reachDist[touched[k]] = -1;
}
