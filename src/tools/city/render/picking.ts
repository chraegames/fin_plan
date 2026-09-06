// Ray → tile picking against the heightfield. Pure math so it is testable
// without three: the renderer builds the ray from the camera and passes it in.

import { N, type XY } from '../types';

export interface Ray {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

/** Intersect the ray with the horizontal plane y = h; null when parallel or behind. */
function hitPlane(r: Ray, h: number): { x: number; z: number } | null {
  if (Math.abs(r.dy) < 1e-6) return null;
  const t = (h - r.oy) / r.dy;
  if (t <= 0) return null;
  return { x: r.ox + r.dx * t, z: r.oz + r.dz * t };
}

/**
 * Pick the tile under a ray. Starts on the plane at `h0` (the terrain height
 * under the camera target), then refines against the real height at the hit
 * point twice — enough for gently rolling terrain. Returns null when the ray
 * leaves the map.
 */
export function pickTile(r: Ray, h0: number, heightAt: (x: number, z: number) => number): XY | null {
  let p = hitPlane(r, h0);
  if (!p) return null;
  for (let k = 0; k < 3; k++) {
    const h = heightAt(p.x, p.z);
    const q = hitPlane(r, h);
    if (!q) break;
    p = q;
  }
  const x = Math.floor(p.x);
  const y = Math.floor(p.z);
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { x, y };
}

/** The ground point (world x, z) under a ray, unclamped; used by zoom-to-cursor. */
export function groundPoint(r: Ray, h0: number, heightAt: (x: number, z: number) => number): { x: number; z: number } | null {
  let p = hitPlane(r, h0);
  if (!p) return null;
  for (let k = 0; k < 2; k++) {
    const q = hitPlane(r, heightAt(p.x, p.z));
    if (!q) break;
    p = q;
  }
  return p;
}
