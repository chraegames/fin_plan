// Growable vertex buffers with box / prism / cylinder / quad primitives.
// Pure (no three): returns plain typed arrays that chunks.ts wraps.

export interface Built {
  position: Float32Array;
  normal: Float32Array;
  color: Float32Array;
  uv: Float32Array;
  count: number;
}

export type RGB = readonly [number, number, number];

export class GeometryBuilder {
  private pos: Float32Array;
  private nrm: Float32Array;
  private col: Float32Array;
  private uv: Float32Array;
  private n = 0; // vertices

  constructor(capacity = 4096) {
    this.pos = new Float32Array(capacity * 3);
    this.nrm = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.uv = new Float32Array(capacity * 2);
  }

  reset(): void {
    this.n = 0;
  }

  get vertexCount(): number {
    return this.n;
  }

  private ensure(extra: number): void {
    const need = this.n + extra;
    if (need * 3 <= this.pos.length) return;
    let cap = this.pos.length / 3;
    while (cap < need) cap *= 2;
    const grow = <T extends Float32Array>(a: T, per: number): T => {
      const b = new Float32Array(cap * per) as T;
      b.set(a);
      return b;
    };
    this.pos = grow(this.pos, 3);
    this.nrm = grow(this.nrm, 3);
    this.col = grow(this.col, 3);
    this.uv = grow(this.uv, 2);
  }

  /** One triangle (counter-clockwise seen from outside). */
  tri(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, c: RGB, uvs: readonly number[]): void {
    this.ensure(3);
    const p = this.pos;
    const nr = this.nrm;
    const co = this.col;
    const u = this.uv;
    let i = this.n;
    const write = (x: number, y: number, z: number, uu: number, vv: number) => {
      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;
      nr[i * 3] = nx;
      nr[i * 3 + 1] = ny;
      nr[i * 3 + 2] = nz;
      co[i * 3] = c[0];
      co[i * 3 + 1] = c[1];
      co[i * 3 + 2] = c[2];
      u[i * 2] = uu;
      u[i * 2 + 1] = vv;
      i++;
    };
    write(ax, ay, az, uvs[0], uvs[1]);
    write(bx, by, bz, uvs[2], uvs[3]);
    write(cx, cy, cz, uvs[4], uvs[5]);
    this.n = i;
  }

  /** Quad a,b,c,d counter-clockwise; uv per corner. */
  quad(
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
    d: readonly number[],
    nx: number,
    ny: number,
    nz: number,
    color: RGB,
    uvA = 0,
    uvB = 0,
    uvC = 0,
    uvD = 0,
    uvE = 0,
    uvF = 0,
    uvG = 0,
    uvH = 0,
  ): void {
    this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], nx, ny, nz, color, [uvA, uvB, uvC, uvD, uvE, uvF]);
    this.tri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], nx, ny, nz, color, [uvA, uvB, uvE, uvF, uvG, uvH]);
  }

  /**
   * Axis-aligned box. `windows` tiles the window texture on the four walls
   * (u = horizontal repeats per unit, v = floors); the top and bottom sample
   * the blank corner of the texture.
   */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, wall: RGB, roof: RGB = wall, windows = 0, floors = 0, floorH = 0): void {
    const w = x1 - x0;
    const d = z1 - z0;
    const h = y1 - y0;
    const uW = windows ? w * windows : 0;
    const uD = windows ? d * windows : 0;
    const v = windows ? (floorH > 0 ? h / floorH : floors) : 0;
    // south (+z)
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, wall, 0, 0, uW, 0, uW, v, 0, v);
    // north (-z)
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, wall, 0, 0, uW, 0, uW, v, 0, v);
    // east (+x)
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, wall, 0, 0, uD, 0, uD, v, 0, v);
    // west (-x)
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, wall, 0, 0, uD, 0, uD, v, 0, v);
    // top
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, roof);
  }

  /** Gable roof over [x0,x1]×[z0,z1] from y0 (eaves) to y1 (ridge); ridge along x when `alongX`. */
  gable(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, alongX: boolean, color: RGB): void {
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    const h = y1 - y0;
    if (alongX) {
      const len = Math.hypot(h, (z1 - z0) / 2);
      const ny = (z1 - z0) / 2 / len;
      const nz = h / len;
      // south slope
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, mz], [x0, y1, mz], 0, ny, nz, color);
      // north slope
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, mz], [x1, y1, mz], 0, ny, -nz, color);
      // gable ends
      this.tri(x1, y0, z1, x1, y0, z0, x1, y1, mz, 1, 0, 0, color, [0, 0, 0, 0, 0, 0]);
      this.tri(x0, y0, z0, x0, y0, z1, x0, y1, mz, -1, 0, 0, color, [0, 0, 0, 0, 0, 0]);
    } else {
      const len = Math.hypot(h, (x1 - x0) / 2);
      const ny = (x1 - x0) / 2 / len;
      const nx = h / len;
      this.quad([x1, y0, z1], [x1, y0, z0], [mx, y1, z0], [mx, y1, z1], nx, ny, 0, color);
      this.quad([x0, y0, z0], [x0, y0, z1], [mx, y1, z1], [mx, y1, z0], -nx, ny, 0, color);
      this.tri(x0, y0, z1, x1, y0, z1, mx, y1, z1, 0, 0, 1, color, [0, 0, 0, 0, 0, 0]);
      this.tri(x1, y0, z0, x0, y0, z0, mx, y1, z0, 0, 0, -1, color, [0, 0, 0, 0, 0, 0]);
    }
  }

  /** Vertical cylinder (n sides) centred at cx,cz. */
  cylinder(cx: number, y0: number, cz: number, r: number, y1: number, sides: number, color: RGB, top: RGB = color): void {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * r;
      const z0 = cz + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r;
      const z1 = cz + Math.sin(a1) * r;
      const am = (a0 + a1) / 2;
      const nx = Math.cos(am);
      const nz = Math.sin(am);
      this.quad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], nx, 0, nz, color);
      this.tri(cx, y1, cz, x0, y1, z0, x1, y1, z1, 0, 1, 0, top, [0, 0, 0, 0, 0, 0]);
    }
  }

  /** Cone (tree crown etc.). */
  cone(cx: number, y0: number, cz: number, r: number, y1: number, sides: number, color: RGB): void {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * r;
      const z0 = cz + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r;
      const z1 = cz + Math.sin(a1) * r;
      const am = (a0 + a1) / 2;
      const h = y1 - y0;
      const len = Math.hypot(h, r);
      this.tri(x1, y0, z1, x0, y0, z0, cx, y1, cz, (Math.cos(am) * h) / len, r / len, (Math.sin(am) * h) / len, color, [0, 0, 0, 0, 0, 0]);
    }
  }

  /** Flat quad with explicit corner heights (roads, park ground). Corners: nw, ne, sw, se in world xz. */
  ground(x: number, z: number, nw: number, ne: number, sw: number, se: number, color: RGB, uv: readonly number[]): void {
    // ccw seen from above: nw, sw, se, ne
    this.quad([x, nw, z], [x, sw, z + 1], [x + 1, se, z + 1], [x + 1, ne, z], 0, 1, 0, color, uv[0], uv[1], uv[2], uv[3], uv[4], uv[5], uv[6], uv[7]);
  }

  build(): Built {
    const n = this.n;
    return {
      position: this.pos.slice(0, n * 3),
      normal: this.nrm.slice(0, n * 3),
      color: this.col.slice(0, n * 3),
      uv: this.uv.slice(0, n * 2),
      count: n,
    };
  }
}
