// Road network analysis: which tiles have road access, and which roads reach
// the edge of the map (the external connection that industry and commuters use).

import { CHANGE, N, T, type CityState } from '../types';
import { distanceTransform, nbr, xOf, yOf } from './grid';

const ACCESS_RANGE = 3; // tiles from a road a lot may sit

export function isEdge(i: number): boolean {
  const x = xOf(i);
  const y = yOf(i);
  return x === 0 || y === 0 || x === N - 1 || y === N - 1;
}

/** Recompute roadAccess, extAccess and externalConnected from the road layer. */
export function analyseRoads(s: CityState): void {
  const { road, roadAccess, extAccess, queue } = s;
  // road distance, capped at ACCESS_RANGE + 1 (unreachable)
  distanceTransform(roadAccess, queue, i => road[i] === 1, ACCESS_RANGE + 1);
  let roadTiles = 0;
  for (let i = 0; i < T; i++) {
    roadAccess[i] = roadAccess[i] > ACCESS_RANGE ? 0 : roadAccess[i] + 1;
    if (road[i]) roadTiles++;
  }
  // roads reachable from an edge road tile
  const reach = extAccess;
  reach.fill(0);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < T; i++) {
    if (road[i] && isEdge(i)) {
      reach[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n >= 0 && road[n] && !reach[n]) {
        reach[n] = 1;
        queue[tail++] = n;
      }
    }
  }
  s.externalConnected = tail > 0;
  // spread ext access to lots within range (reuse the queue BFS with a passable-any wave)
  const ext = s.scratchC; // scratch as a Uint8-ish marker: 1 = reached
  ext.fill(0);
  head = 0;
  tail = 0;
  for (let i = 0; i < T; i++) {
    if (reach[i]) {
      ext[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = ext[i] + 1;
    if (d > ACCESS_RANGE + 1) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n >= 0 && ext[n] === 0 && !road[n]) {
        ext[n] = d;
        queue[tail++] = n;
      }
    }
  }
  for (let i = 0; i < T; i++) extAccess[i] = ext[i] > 0 ? 1 : 0;
  s.totals.roadTiles = roadTiles;
  s.changed |= CHANGE.HUD;
}
