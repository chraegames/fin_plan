// Paints the terrain overlay texture: zone tints plus the selected data view.
// Pure so it can be tested; the renderer uploads the result.

import { T, ZONE, type OverlayKind } from '../types';
import type { SnapshotLayers } from '../protocol';

const ZONE_RGB: number[][] = [
  [0, 0, 0],
  [70, 190, 90],
  [70, 120, 230],
  [230, 190, 60],
];

/** viridis-like ramp, low → high */
const RAMP: number[][] = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];
const HEAT: number[][] = [
  [255, 255, 255],
  [255, 200, 90],
  [230, 90, 40],
  [140, 10, 30],
];

function ramp(stops: number[][], t: number, out: number[]): void {
  const k = Math.min(stops.length - 1.0001, Math.max(0, t) * (stops.length - 1));
  const i = Math.floor(k);
  const f = k - i;
  const a = stops[i];
  const b = stops[i + 1];
  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;
}

const tmp = [0, 0, 0];

/** Write RGBA for every tile into `out` (T*4). */
export function buildOverlayRGBA(kind: OverlayKind, L: SnapshotLayers, water: Uint8Array, out: Uint8Array): void {
  for (let i = 0; i < T; i++) {
    const o = i * 4;
    const z = L.zone[i];
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    if (z) {
      const c = ZONE_RGB[z];
      r = c[0];
      g = c[1];
      b = c[2];
      a = L.level[i] ? 0.1 : 0.32;
    }
    if (kind !== 'none' && !water[i]) {
      let v = -1;
      let good = true; // higher is better?
      let binary = false;
      switch (kind) {
        case 'power':
          binary = true;
          v = L.zone[i] || L.level[i] || L.plop[i] ? (L.powered[i] ? 1 : 0) : -1;
          break;
        case 'water':
          binary = true;
          v = L.zone[i] || L.level[i] || L.plop[i] ? (L.watered[i] ? 1 : 0) : -1;
          break;
        case 'garbage':
          binary = true;
          v = L.level[i] && !L.abandoned[i] ? (L.garbageCover[i] >= 128 ? 1 : 0) : -1;
          break;
        case 'transit':
          v = L.road[i] || L.level[i] ? L.transitCover[i] / 255 : -1;
          break;
        case 'traffic':
          v = L.road[i] ? L.traffic[i] / 255 : -1;
          good = false;
          break;
        case 'pollution':
          v = Math.min(1, L.pollution[i] / 128);
          good = false;
          break;
        case 'landValue':
          v = L.landValue[i] / 255;
          break;
        case 'crime':
          v = Math.min(1, L.crime[i] / 160);
          good = false;
          break;
        case 'fireRisk':
          v = Math.min(1, L.fireRisk[i] / 160);
          good = false;
          break;
        case 'fireCover':
          v = L.fireCover[i] / 255;
          break;
        case 'policeCover':
          v = L.policeCover[i] / 255;
          break;
        case 'education':
          v = L.eduCover[i] / 255;
          break;
        case 'health':
          v = L.healthCover[i] / 255;
          break;
        case 'desirability':
          v = z ? L.desirability[i] / 255 : -1;
          break;
      }
      if (v >= 0) {
        if (binary) {
          if (v > 0) {
            tmp[0] = 60;
            tmp[1] = 200;
            tmp[2] = 120;
          } else {
            tmp[0] = 230;
            tmp[1] = 40;
            tmp[2] = 40;
          }
          a = 0.55;
        } else {
          ramp(good ? RAMP : HEAT, v, tmp);
          a = kind === 'pollution' || kind === 'crime' || kind === 'fireRisk' ? 0.15 + 0.6 * v : 0.5;
          if (kind === 'traffic') a = 0.25 + 0.6 * v;
        }
        r = tmp[0];
        g = tmp[1];
        b = tmp[2];
      }
    }
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = Math.round(a * 255);
  }
}

export const isBinaryOverlay = (k: OverlayKind): boolean => k === 'power' || k === 'water' || k === 'garbage';
export { ZONE };
