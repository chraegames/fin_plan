// Seeded terrain: value-noise fBm, a sea level chosen by percentile (so the
// water fraction is predictable), one river, and land guaranteed on every
// edge so an external road connection is always possible.

import { SLOPE_MAX } from '../constants';
import { createRng, hashSeed } from '../rng';
import { N, T } from '../types';
import { idx, inBounds } from './grid';

export interface Terrain {
  height: Float32Array; // 0..1
  sea: number;
  water: Uint8Array;
  slope: Uint8Array;
}

const WATER_FRACTION = 0.18;

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Lattice value noise with a seeded hash — no lookup tables to allocate. */
function valueNoise(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const h = (ix: number, iy: number) => hashSeed(seed, ix + 1000, iy + 1000) / 4294967296;
  const a = h(x0, y0);
  const b = h(x0 + 1, y0);
  const c = h(x0, y0 + 1);
  const d = h(x0 + 1, y0 + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Low-frequency seeded noise in 0..1 for cosmetic variation (rendering). */
export function smoothNoise(seed: number, x: number, y: number): number {
  return fbm(seed ^ 0x9e37, x, y, 3, 2.1, 0.5);
}

function fbm(seed: number, x: number, y: number, octaves: number, lacunarity: number, gain: number): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(seed + o * 7919, x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

export function generateTerrain(seed: number): Terrain {
  const height = new Float32Array(T);
  const rng = createRng(hashSeed(seed, 0x7e44a1));
  const base = 2.6 + rng() * 1.2; // cycles across the map
  const ox = rng() * 100;
  const oy = rng() * 100;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = ox + (x / N) * base;
      const ny = oy + (y / N) * base;
      let h = fbm(seed, nx, ny, 5, 2.05, 0.48);
      // flatten the middle band so most land is buildable, keep hills high
      h = 0.5 + (h - 0.5) * 1.35;
      height[idx(x, y)] = h;
    }
  }
  normalize(height);

  // River: a wandering band from one edge to the opposite one.
  carveRiver(height, seed);

  // Sea level by percentile → predictable water fraction.
  const sorted = Float32Array.from(height).sort();
  let sea = sorted[Math.floor(T * WATER_FRACTION)];
  sea = Math.max(0.05, Math.min(0.6, sea));

  ensureEdgeLand(height, sea);
  const water = new Uint8Array(T);
  for (let i = 0; i < T; i++) water[i] = height[i] < sea ? 1 : 0;
  const slope = computeSlope(height);
  return { height, sea, water, slope };
}

function normalize(h: Float32Array): void {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < T; i++) {
    if (h[i] < lo) lo = h[i];
    if (h[i] > hi) hi = h[i];
  }
  const span = hi - lo || 1;
  for (let i = 0; i < T; i++) h[i] = (h[i] - lo) / span;
}

function carveRiver(h: Float32Array, seed: number): void {
  const rng = createRng(hashSeed(seed, 0x51be3));
  const vertical = rng() < 0.5;
  const phase = rng() * Math.PI * 2;
  const amp = 12 + rng() * 14;
  const centre = N * (0.3 + rng() * 0.4);
  const width = 2.2 + rng() * 1.6;
  for (let t = 0; t < N; t++) {
    const wobble = Math.sin(phase + (t / N) * Math.PI * 2.2) * amp + Math.sin(phase * 2 + (t / N) * Math.PI * 7) * 3;
    const c = centre + wobble;
    for (let k = -8; k <= 8; k++) {
      const p = Math.round(c) + k;
      if (p < 0 || p >= N) continue;
      const x = vertical ? p : t;
      const y = vertical ? t : p;
      const d = Math.abs(p - c);
      const i = idx(x, y);
      if (d < width) h[i] = Math.min(h[i], 0.02 + d * 0.01);
      else if (d < width + 5) {
        const f = (d - width) / 5;
        h[i] = Math.min(h[i], 0.02 + width * 0.01 + f * f * 0.5);
      }
    }
  }
}

/** Guarantee a few buildable tiles on each map edge (roads must reach the border). */
function ensureEdgeLand(h: Float32Array, sea: number): void {
  const edges: [number, number][][] = [[], [], [], []];
  for (let k = 0; k < N; k++) {
    edges[0].push([k, 0]);
    edges[1].push([k, N - 1]);
    edges[2].push([0, k]);
    edges[3].push([N - 1, k]);
  }
  for (const edge of edges) {
    let land = 0;
    for (const [x, y] of edge) if (h[idx(x, y)] >= sea) land++;
    if (land >= 12) continue;
    // raise a 12-tile stretch in the middle of the edge and a 6-deep apron behind it
    const mid = N >> 1;
    for (let k = mid - 6; k < mid + 6; k++) {
      const [ex, ey] = edge[k];
      for (let depth = 0; depth < 6; depth++) {
        const x = ex === 0 ? depth : ex === N - 1 ? ex - depth : ex;
        const y = ey === 0 ? depth : ey === N - 1 ? ey - depth : ey;
        if (!inBounds(x, y)) continue;
        const i = idx(x, y);
        if (h[i] < sea + 0.03) h[i] = sea + 0.03;
      }
    }
  }
}

/** Height at a tile corner (cx, cy in 0..N): mean of the tiles sharing it. */
export function cornerHeight(h: Float32Array, cx: number, cy: number): number {
  let sum = 0;
  let n = 0;
  for (let dy = -1; dy <= 0; dy++) {
    for (let dx = -1; dx <= 0; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(x, y)) continue;
      sum += h[idx(x, y)];
      n++;
    }
  }
  return sum / n;
}

function computeSlope(h: Float32Array): Uint8Array {
  const slope = new Uint8Array(T);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const a = cornerHeight(h, x, y);
      const b = cornerHeight(h, x + 1, y);
      const c = cornerHeight(h, x, y + 1);
      const d = cornerHeight(h, x + 1, y + 1);
      const spread = Math.max(a, b, c, d) - Math.min(a, b, c, d);
      slope[idx(x, y)] = Math.min(255, Math.round(spread * 255));
    }
  }
  return slope;
}

export const buildable = (t: { water: Uint8Array; slope: Uint8Array }, i: number): boolean => t.water[i] === 0 && t.slope[i] <= SLOPE_MAX;
