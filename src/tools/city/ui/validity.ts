// Client-side placement checks so the cursor can turn red before an action is sent.

import { SLOPE_MAX, plopDef } from '../constants';
import type { SnapshotLayers } from '../protocol';
import { N, type Rect, type XY } from '../types';

export interface Ground {
  water: Uint8Array;
  slope: Uint8Array;
}

export function tileFree(L: SnapshotLayers, g: Ground, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const i = y * N + x;
  return g.water[i] === 0 && g.slope[i] <= SLOPE_MAX && !L.road[i] && !L.plop[i] && !L.level[i];
}

function touchesWater(g: Ground, at: XY, size: number): boolean {
  for (let y = at.y - 1; y <= at.y + size; y++) for (let x = at.x - 1; x <= at.x + size; x++) if (x >= 0 && y >= 0 && x < N && y < N && g.water[y * N + x]) return true;
  return false;
}

export function canPlopAt(L: SnapshotLayers, g: Ground, plop: number, at: XY): boolean {
  const def = plopDef(plop);
  if (!def) return false;
  for (let dy = 0; dy < def.size; dy++) for (let dx = 0; dx < def.size; dx++) if (!tileFree(L, g, at.x + dx, at.y + dy)) return false;
  if (def.needsWater && !touchesWater(g, at, def.size)) return false;
  return true;
}

export function plopRect(plop: number, at: XY): Rect {
  const size = plopDef(plop)?.size ?? 1;
  return { x0: at.x, y0: at.y, x1: at.x + size - 1, y1: at.y + size - 1 };
}
