// Scripted town layouts (pure): used by the headless harness, the tests and
// the localhost debug hook. Produces Action lists, never touches state.

import { SLOPE_MAX } from '../constants';
import { N, PLOP, type Action, type Density } from '../types';
import { idx } from './grid';

export interface Ground {
  water: Uint8Array;
  slope: Uint8Array;
}

export interface Layout {
  x0: number;
  y0: number;
  w: number;
  h: number;
  edge: 'N' | 'S' | 'W' | 'E';
}

const ok = (g: Ground, i: number): boolean => g.water[i] === 0 && g.slope[i] <= SLOPE_MAX;

/** Find a mostly-buildable rectangle touching one map edge. */
export function findSite(g: Ground, w: number, h: number): Layout | null {
  let best: Layout | null = null;
  let bestScore = 0;
  const tryRect = (x0: number, y0: number, edge: Layout['edge']) => {
    let n = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (ok(g, idx(x, y))) n++;
    const score = n / (w * h);
    if (score > bestScore) {
      bestScore = score;
      best = { x0, y0, w, h, edge };
    }
  };
  for (let x0 = 0; x0 + w <= N; x0 += 4) {
    tryRect(x0, 0, 'N');
    tryRect(x0, N - h, 'S');
  }
  for (let y0 = 0; y0 + h <= N; y0 += 4) {
    tryRect(0, y0, 'W');
    tryRect(N - w, y0, 'E');
  }
  return bestScore > 0.9 ? best : null;
}

/** Roads every 5 rows and 9 columns; R west third, C middle, I east; coal plant, pump, two towers. */
export function townActions(L: Layout, density: Density = 1): Action[] {
  const out: Action[] = [];
  const { x0, y0, w, h } = L;
  for (let y = y0; y < y0 + h; y += 5) out.push({ type: 'road', from: { x: x0, y }, to: { x: x0 + w - 1, y } });
  for (let x = x0; x < x0 + w; x += 9) out.push({ type: 'road', from: { x, y: y0 }, to: { x, y: y0 + h - 1 } });
  const third = Math.floor(w / 3);
  for (let y = y0; y < y0 + h; y++) {
    if ((y - y0) % 5 === 0) continue;
    out.push({ type: 'zone', zone: 1, density, rect: { x0, y0: y, x1: x0 + third - 1, y1: y } });
    out.push({ type: 'zone', zone: 2, density, rect: { x0: x0 + third, y0: y, x1: x0 + 2 * third - 1, y1: y } });
    out.push({ type: 'zone', zone: 3, density, rect: { x0: x0 + 2 * third, y0: y, x1: x0 + w - 1, y1: y } });
  }
  const px = x0 + w - 8;
  const py = y0 + 1;
  out.push({ type: 'bulldoze', rect: { x0: px, y0: py, x1: px + 2, y1: py + 2 } });
  out.push({ type: 'plop', plop: PLOP.COAL, at: { x: px, y: py } });
  out.push({ type: 'plop', plop: PLOP.PUMP, at: { x: px + 2, y: py } });
  out.push({ type: 'bulldoze', rect: { x0: px, y0: py + 3, x1: px + 1, y1: py + 3 } });
  out.push({ type: 'plop', plop: PLOP.TOWER, at: { x: px, y: py + 3 } });
  out.push({ type: 'plop', plop: PLOP.TOWER, at: { x: px + 1, y: py + 3 } });
  return out;
}

/** Services in the middle of town. */
export function serviceActions(L: Layout): Action[] {
  const out: Action[] = [];
  const cx = L.x0 + Math.floor(L.w / 2);
  const cy = L.y0 + 6;
  const spots: [number, number][] = [[cx - 3, cy], [cx - 1, cy], [cx + 1, cy], [cx + 3, cy]];
  const plops = [PLOP.FIRE, PLOP.POLICE, PLOP.SCHOOL, PLOP.CLINIC];
  spots.forEach(([x, y], k) => {
    out.push({ type: 'bulldoze', rect: { x0: x, y0: y, x1: x, y1: y } });
    out.push({ type: 'plop', plop: plops[k], at: { x, y } });
  });
  return out;
}

/** Rezone the residential third to a higher density. */
export function densifyActions(L: Layout, density: Density): Action[] {
  const out: Action[] = [];
  const third = Math.floor(L.w / 3);
  for (let y = L.y0; y < L.y0 + L.h; y++) {
    if ((y - L.y0) % 5 === 0) continue;
    out.push({ type: 'zone', zone: 1, density, rect: { x0: L.x0, y0: y, x1: L.x0 + third - 1, y1: y } });
  }
  return out;
}
