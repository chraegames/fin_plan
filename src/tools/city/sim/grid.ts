// Grid helpers shared by every system. All allocation-free; the BFS helpers
// take their queue from the caller (CityState.queue) so ticks never allocate.

import { CHUNK, CHUNKS_PER_SIDE, N, T, type Rect, type XY } from '../types';

export const idx = (x: number, y: number): number => y * N + x;
export const xOf = (i: number): number => i % N;
export const yOf = (i: number): number => (i / N) | 0;
export const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < N;
export const chunkOf = (i: number): number => (yOf(i) >> 4) * CHUNKS_PER_SIDE + (xOf(i) >> 4);
export const chunkOfXY = (x: number, y: number): number => (y / CHUNK | 0) * CHUNKS_PER_SIDE + (x / CHUNK | 0);

/** 4-neighbour offsets as index deltas, valid only after the bounds checks below. */
export const DX4 = [1, 0, -1, 0] as const;
export const DY4 = [0, 1, 0, -1] as const;

/** Neighbour index in direction d (0=E,1=S,2=W,3=N) or -1 when off the map. */
export function nbr(i: number, d: number): number {
  const x = xOf(i) + DX4[d];
  const y = yOf(i) + DY4[d];
  return inBounds(x, y) ? idx(x, y) : -1;
}

export function clampRect(r: Rect): Rect {
  const x0 = Math.max(0, Math.min(r.x0, r.x1));
  const x1 = Math.min(N - 1, Math.max(r.x0, r.x1));
  const y0 = Math.max(0, Math.min(r.y0, r.y1));
  const y1 = Math.min(N - 1, Math.max(r.y0, r.y1));
  return { x0, y0, x1, y1 };
}

/** Tiles of an L-shaped path: horizontal from `from` then vertical to `to`. No duplicates. */
export function lineTiles(from: XY, to: XY, out: number[] = []): number[] {
  out.length = 0;
  const sx = Math.sign(to.x - from.x);
  for (let x = from.x; x !== to.x; x += sx) out.push(idx(x, from.y));
  const sy = Math.sign(to.y - from.y);
  for (let y = from.y; y !== to.y; y += sy) out.push(idx(to.x, y));
  out.push(idx(to.x, to.y));
  return out;
}

/**
 * Multi-source BFS distance transform over 4-neighbours. `dist` receives
 * min(distance, cap) with `cap` for unreachable tiles. Sources are tiles
 * where `isSource(i)` is true. `passable` may restrict where the wave travels.
 */
export function distanceTransform(
  dist: Uint8Array,
  queue: Int32Array,
  isSource: (i: number) => boolean,
  cap: number,
  passable?: (i: number) => boolean,
): void {
  dist.fill(cap);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < T; i++) {
    if (isSource(i)) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = dist[i] + 1;
    if (d >= cap) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n < 0 || dist[n] <= d) continue;
      if (passable && !passable(n)) continue;
      dist[n] = d;
      queue[tail++] = n;
    }
  }
}

/** Chebyshev (square) distance transform, used for water coverage. */
export function squareDistance(dist: Uint8Array, queue: Int32Array, isSource: (i: number) => boolean, cap: number): void {
  dist.fill(cap);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < T; i++) {
    if (isSource(i)) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = dist[i] + 1;
    if (d >= cap) continue;
    const x = xOf(i);
    const y = yOf(i);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const n = idx(nx, ny);
        if (dist[n] <= d) continue;
        dist[n] = d;
        queue[tail++] = n;
      }
    }
  }
}

/** Box blur (radius r) of a Float32 field into `out`, using `tmp` as scratch. */
export function boxBlur(src: Float32Array, out: Float32Array, tmp: Float32Array, r: number): void {
  const w = 2 * r + 1;
  for (let y = 0; y < N; y++) {
    let acc = 0;
    const row = y * N;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(N - 1, Math.max(0, x))];
    for (let x = 0; x < N; x++) {
      tmp[row + x] = acc / w;
      const add = Math.min(N - 1, x + r + 1);
      const sub = Math.max(0, x - r);
      acc += src[row + add] - src[row + sub];
    }
  }
  for (let x = 0; x < N; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(N - 1, Math.max(0, y)) * N + x];
    for (let y = 0; y < N; y++) {
      out[y * N + x] = acc / w;
      const add = Math.min(N - 1, y + r + 1);
      const sub = Math.max(0, y - r);
      acc += tmp[add * N + x] - tmp[sub * N + x];
    }
  }
}
