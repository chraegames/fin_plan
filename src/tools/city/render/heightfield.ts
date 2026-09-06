// World-space heightfield: corner heights in world units with bilinear
// sampling. Pure math (no three) so picking can be unit-tested.

import { HEIGHT_SCALE } from '../constants';
import { cornerHeight } from '../sim/terrain';
import { N } from '../types';

export class HeightField {
  /** (N+1)² corner heights in world units, sea level = 0. */
  readonly corners: Float32Array;
  constructor(height: Float32Array, sea: number) {
    this.corners = new Float32Array((N + 1) * (N + 1));
    for (let cy = 0; cy <= N; cy++) {
      for (let cx = 0; cx <= N; cx++) {
        this.corners[cy * (N + 1) + cx] = (cornerHeight(height, cx, cy) - sea) * HEIGHT_SCALE;
      }
    }
  }

  corner(cx: number, cy: number): number {
    return this.corners[cy * (N + 1) + cx];
  }

  /** Bilinear height at world (x, z); clamps to the map edge. */
  at(x: number, z: number): number {
    const fx = Math.min(N - 1e-6, Math.max(0, x));
    const fz = Math.min(N - 1e-6, Math.max(0, z));
    const cx = Math.floor(fx);
    const cz = Math.floor(fz);
    const tx = fx - cx;
    const tz = fz - cz;
    const a = this.corner(cx, cz);
    const b = this.corner(cx + 1, cz);
    const c = this.corner(cx, cz + 1);
    const d = this.corner(cx + 1, cz + 1);
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  /** The four corner heights of tile (x, y) as [nw, ne, sw, se]. */
  tileCorners(x: number, y: number, out: number[]): number[] {
    out[0] = this.corner(x, y);
    out[1] = this.corner(x + 1, y);
    out[2] = this.corner(x, y + 1);
    out[3] = this.corner(x + 1, y + 1);
    return out;
  }
}
