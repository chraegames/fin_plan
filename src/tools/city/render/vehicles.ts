// Sampled traffic: a few hundred instanced cars distributed over road tiles in
// proportion to link load, driving along connected tiles. Purely cosmetic.

import * as THREE from 'three';
import { hashSeed } from '../rng';
import { N, T } from '../types';
import type { SnapshotLayers } from '../protocol';
import type { HeightField } from './heightfield';

interface Car {
  tile: number;
  dir: number; // 0 E, 1 S, 2 W, 3 N
  t: number; // 0..1 along the tile
  color: number;
}

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const COLORS = [0xd8d8d8, 0x2b2b2b, 0xb03030, 0x3050a0, 0xe0c040, 0x888888, 0xf5f5f5, 0x406040];

export class VehicleField {
  readonly mesh: THREE.InstancedMesh;
  private readonly cars: Car[] = [];
  private readonly capacity: number;
  private road: Uint8Array = new Uint8Array(T);
  private traffic: Uint8Array = new Uint8Array(T);
  private readonly hf: HeightField;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(0.16, 0.1, 0.3);
  private readonly axis = new THREE.Vector3(0, 1, 0);
  private rng = 1;
  private placed = false;

  constructor(hf: HeightField, capacity: number) {
    this.hf = hf;
    this.capacity = capacity;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  private rand(): number {
    this.rng = hashSeed(this.rng, 0x5bd1e995);
    return this.rng / 4294967296;
  }

  /** Redistribute cars over the road network by traffic weight. */
  resample(L: SnapshotLayers): void {
    this.road = L.road.slice();
    this.traffic = L.traffic.slice();
    // cars only where the monthly assignment put trips: about one car per
    // tile at full load, none on an unused road
    let total = 0;
    for (let i = 0; i < T; i++) if (this.road[i]) total += this.traffic[i];
    this.cars.length = 0;
    const want = Math.min(this.capacity, Math.round((total / 128) * 1.1));
    if (total === 0 || want === 0) {
      this.mesh.count = 0;
      return;
    }
    // largest-remainder allocation over road tiles
    let acc = 0;
    let placed = 0;
    for (let i = 0; i < T && placed < want; i++) {
      if (!this.road[i] || !this.traffic[i]) continue;
      acc += (this.traffic[i] / total) * want;
      while (acc >= 1 && placed < want) {
        acc -= 1;
        const dir = this.pickDir(i, -1);
        if (dir < 0) break;
        this.cars.push({ tile: i, dir, t: this.rand(), color: COLORS[(this.rand() * COLORS.length) | 0] });
        placed++;
      }
    }
    this.mesh.count = this.cars.length;
    for (let k = 0; k < this.cars.length; k++) this.mesh.setColorAt(k, new THREE.Color(this.cars[k].color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.placed = false;
  }

  /** A random direction from tile i that leads onto a road, avoiding U-turns when possible. */
  private pickDir(i: number, from: number): number {
    const x = i % N;
    const y = (i / N) | 0;
    const opts: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      if (!this.road[ny * N + nx]) continue;
      if (from >= 0 && d === (from + 2) % 4) continue;
      opts.push(d);
    }
    if (!opts.length) return from >= 0 ? (from + 2) % 4 : -1;
    return opts[(this.rand() * opts.length) | 0];
  }

  /** Advance cars; `speed` 0 freezes them. */
  update(dt: number, speed: number): boolean {
    if (!this.cars.length) return false;
    if (speed === 0 && this.placed) return false;
    this.placed = true;
    const rate = speed === 0 ? 0 : 0.9 * Math.min(2, speed);
    for (let k = 0; k < this.cars.length; k++) {
      const c = this.cars[k];
      const load = this.traffic[c.tile] / 255;
      c.t += dt * rate * (1 - 0.7 * load);
      while (c.t >= 1) {
        c.t -= 1;
        const x = c.tile % N;
        const y = (c.tile / N) | 0;
        const nx = x + DX[c.dir];
        const ny = y + DY[c.dir];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || !this.road[ny * N + nx]) {
          c.dir = (c.dir + 2) % 4;
          continue;
        }
        c.tile = ny * N + nx;
        c.dir = this.pickDir(c.tile, c.dir);
      }
      const x = c.tile % N;
      const y = (c.tile / N) | 0;
      // right-hand lane offset
      const ox = 0.5 + DX[c.dir] * (c.t - 0.5) - DY[c.dir] * 0.18;
      const oz = 0.5 + DY[c.dir] * (c.t - 0.5) + DX[c.dir] * 0.18;
      const wx = x + ox;
      const wz = y + oz;
      this.p.set(wx, this.hf.at(wx, wz) + 0.04, wz);
      this.q.setFromAxisAngle(this.axis, -c.dir * (Math.PI / 2) + Math.PI / 2);
      this.m.compose(this.p, this.q, this.s);
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
