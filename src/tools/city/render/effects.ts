// Cosmetic effects: sky dome, fire sparks, wind-turbine blades, tornado funnel,
// earthquake shake. All generated; nothing here touches the simulation.

import * as THREE from 'three';
import { PLOP, T, N } from '../types';
import type { SnapshotLayers } from '../protocol';
import type { HeightField } from './heightfield';

/** A big inverted sphere with a vertical colour gradient in its vertex colours. */
export function createSkyDome(top: number, horizon: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(600, 24, 12);
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const a = new THREE.Color(top);
  const b = new THREE.Color(horizon);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 600; // -1..1
    const t = Math.pow(Math.max(0, Math.min(1, (y + 0.15) / 0.9)), 0.6);
    c.copy(b).lerp(a, t);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

const skyA = new THREE.Color();
const skyB = new THREE.Color();

export function recolorSkyDome(mesh: THREE.Mesh, top: number | THREE.Color, horizon: number | THREE.Color): void {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  const col = geo.getAttribute('color') as THREE.BufferAttribute;
  const a = skyA.set(top);
  const b = skyB.set(horizon);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 600;
    const t = Math.pow(Math.max(0, Math.min(1, (y + 0.15) / 0.9)), 0.6);
    c.copy(b).lerp(a, t);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/** Fire sparks: a Points cloud over burning tiles, re-seeded on every snapshot. */
export class FireSparks {
  readonly points: THREE.Points;
  private readonly cap = 1024;
  private readonly base = new Float32Array(this.cap * 3);
  private readonly phase = new Float32Array(this.cap);
  private readonly pos: THREE.BufferAttribute;
  private count = 0;
  private readonly hf: HeightField;

  constructor(hf: HeightField) {
    this.hf = hf;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(this.cap * 3), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    const col = new Float32Array(this.cap * 3);
    for (let i = 0; i < this.cap; i++) {
      const t = (i % 7) / 7;
      col[i * 3] = 1;
      col[i * 3 + 1] = 0.35 + t * 0.5;
      col[i * 3 + 2] = 0.05;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    geo.setDrawRange(0, 0);
  }

  resample(L: SnapshotLayers): void {
    let n = 0;
    for (let i = 0; i < T && n < this.cap; i++) {
      const f = L.onFire[i];
      if (!f) continue;
      const x = i % N;
      const z = (i / N) | 0;
      const k = 1 + Math.min(3, f >> 6);
      for (let j = 0; j < k * 2 && n < this.cap; j++) {
        const ox = 0.2 + ((i * 7 + j * 13) % 10) / 16;
        const oz = 0.2 + ((i * 5 + j * 11) % 10) / 16;
        this.base[n * 3] = x + ox;
        this.base[n * 3 + 1] = this.hf.at(x + ox, z + oz) + 0.3;
        this.base[n * 3 + 2] = z + oz;
        this.phase[n] = ((i + j * 31) % 97) / 97;
        n++;
      }
    }
    this.count = n;
    this.points.geometry.setDrawRange(0, n);
  }

  update(t: number): boolean {
    if (!this.count) return false;
    const a = this.pos.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      const p = (t * 0.8 + this.phase[i]) % 1;
      a[i * 3] = this.base[i * 3] + Math.sin((t + this.phase[i] * 9) * 6) * 0.06;
      a[i * 3 + 1] = this.base[i * 3 + 1] + p * 1.4;
      a[i * 3 + 2] = this.base[i * 3 + 2] + Math.cos((t + this.phase[i] * 7) * 5) * 0.06;
    }
    this.pos.needsUpdate = true;
    return true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

/** Three-blade rotors on every wind turbine, spun each frame. */
export class WindBlades {
  readonly mesh: THREE.InstancedMesh;
  private readonly hubs: THREE.Vector3[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly q2 = new THREE.Quaternion();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly hf: HeightField;

  constructor(hf: HeightField, capacity = 256) {
    this.hf = hf;
    const geo = new THREE.BufferGeometry();
    // three thin blades in the x/y plane
    const verts: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const L = 0.55;
      const w = 0.05;
      // quad from hub to tip
      const p = (r: number, off: number) => [ca * r - sa * off, sa * r + ca * off, 0];
      verts.push(...p(0.03, -w), ...p(L, -w * 0.4), ...p(L, w * 0.4), ...p(0.03, -w), ...p(L, w * 0.4), ...p(0.03, w));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  resample(L: SnapshotLayers): void {
    this.hubs.length = 0;
    for (let i = 0; i < T && this.hubs.length < this.mesh.count + 256; i++) {
      if (L.plop[i] !== PLOP.WIND || L.plopOrigin[i] !== i) continue;
      const x = (i % N) + 0.5;
      const z = ((i / N) | 0) + 0.5;
      // hub sits at the top of the pole (see plops.ts): base + 0.02 + 1.62
      this.hubs.push(new THREE.Vector3(x, Math.max(this.hf.at(x, z), 0) + 1.66, z + 0.06));
    }
    this.mesh.count = Math.min(this.hubs.length, 256);
  }

  update(t: number): boolean {
    if (!this.mesh.count) return false;
    for (let k = 0; k < this.mesh.count; k++) {
      const h = this.hubs[k];
      this.q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), t * 2.2 + k * 0.7);
      this.q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.4);
      this.q2.multiply(this.q);
      this.m.compose(h, this.q2, this.s);
      this.mesh.setMatrixAt(k, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** A spinning funnel of points that follows the tornado position from the HUD. */
export class TornadoFunnel {
  readonly points: THREE.Points;
  private readonly cap = 400;
  private readonly pos: THREE.BufferAttribute;
  private target: { x: number; y: number } | null = null;
  private readonly cur = new THREE.Vector2();
  private readonly hf: HeightField;

  constructor(hf: HeightField) {
    this.hf = hf;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(this.cap * 3), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    const mat = new THREE.PointsMaterial({ color: 0x6b6f7a, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  set(t: { x: number; y: number } | null): void {
    if (t && !this.target) this.cur.set(t.x + 0.5, t.y + 0.5);
    this.target = t;
    this.points.visible = !!t;
  }

  update(time: number, dt: number): boolean {
    if (!this.target) return false;
    this.cur.lerp(new THREE.Vector2(this.target.x + 0.5, this.target.y + 0.5), Math.min(1, dt * 4));
    const a = this.pos.array as Float32Array;
    const ground = Math.max(this.hf.at(this.cur.x, this.cur.y), 0);
    for (let i = 0; i < this.cap; i++) {
      const h = i / this.cap; // 0 bottom .. 1 top
      const r = 0.25 + h * h * 3.2;
      const ang = time * 9 + i * 0.7 + h * 12;
      a[i * 3] = this.cur.x + Math.cos(ang) * r + Math.sin(time * 3 + h * 5) * h;
      a[i * 3 + 1] = ground + h * 9;
      a[i * 3 + 2] = this.cur.y + Math.sin(ang) * r;
    }
    this.pos.needsUpdate = true;
    return true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

// ─── day / night ─────────────────────────────────────────────────────

export interface DayLook {
  /** 0 at night, 1 at full day. */
  daylight: number;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  /** Sun colour and direction (unit vector, y up). */
  sun: THREE.Color;
  sunDir: THREE.Vector3;
  /** Window glow strength 0..1. */
  glow: number;
}

interface SkyKey {
  t: number;
  top: number;
  horizon: number;
}

const NIGHT_TOP = 0x0a1026;
const NIGHT_HORIZON = 0x2a3352;
const DAWN_TOP = 0x5f86bd;
const DAWN_HORIZON = 0xf3a873;
const DUSK_TOP = 0x4a5a95;
const DUSK_HORIZON = 0xf08a5a;

const c1 = new THREE.Color();
const c2 = new THREE.Color();

/**
 * Compute the look for a time of day `t` in [0, 1) (0 = midnight, 0.5 = noon),
 * blending toward the theme's own day sky. Writes into `out`.
 */
export function dayLook(t: number, dayTop: number, dayHorizon: number, daySun: number, out: DayLook): DayLook {
  const keys: SkyKey[] = [
    { t: 0, top: NIGHT_TOP, horizon: NIGHT_HORIZON },
    { t: 0.2, top: NIGHT_TOP, horizon: NIGHT_HORIZON },
    { t: 0.27, top: DAWN_TOP, horizon: DAWN_HORIZON },
    { t: 0.36, top: dayTop, horizon: dayHorizon },
    { t: 0.66, top: dayTop, horizon: dayHorizon },
    { t: 0.75, top: DUSK_TOP, horizon: DUSK_HORIZON },
    { t: 0.82, top: NIGHT_TOP, horizon: NIGHT_HORIZON },
    { t: 1, top: NIGHT_TOP, horizon: NIGHT_HORIZON },
  ];
  let k = 0;
  while (k < keys.length - 2 && keys[k + 1].t <= t) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const f = smooth((t - a.t) / Math.max(1e-4, b.t - a.t));
  out.skyTop.copy(c1.set(a.top)).lerp(c2.set(b.top), f);
  out.skyHorizon.copy(c1.set(a.horizon)).lerp(c2.set(b.horizon), f);
  const daylight = smooth((t - 0.22) / 0.14) * (1 - smooth((t - 0.72) / 0.14));
  out.daylight = daylight;
  const ang = (t - 0.25) * Math.PI * 2; // sunrise at 0.25
  out.sunDir.set(-Math.cos(ang) * 0.7, Math.max(0.08, Math.sin(ang)), 0.45 + 0.2 * Math.cos(ang)).normalize();
  const warm = 1 - smooth((Math.sin(ang) - 0.05) / 0.35);
  out.sun.set(daySun).lerp(c1.set(0xff9a4a), warm * daylight);
  out.glow = 1 - smooth((t - 0.24) / 0.1) * (1 - smooth((t - 0.7) / 0.1));
  return out;
}

function smooth(x: number): number {
  const v = Math.min(1, Math.max(0, x));
  return v * v * (3 - 2 * v);
}
