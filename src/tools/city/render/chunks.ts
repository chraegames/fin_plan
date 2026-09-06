// ChunkManager: one buildings mesh and one road mesh per 16×16 chunk, rebuilt
// from snapshot layers when the chunk is dirty (a few per frame at most).

import * as THREE from 'three';
import { plopDef } from '../constants';
import { hashSeed } from '../rng';
import { smoothNoise } from '../sim/terrain';
import { CHUNK, CHUNKS, CHUNKS_PER_SIDE, N, PLOP } from '../types';
import type { SnapshotLayers } from '../protocol';
import { ABANDONED, BURNING, buildingSpec, emitBuilding } from './buildings';
import { GeometryBuilder, type Built } from './geometryBuilder';
import type { HeightField } from './heightfield';
import { emitPlop } from './plops';
import { emitTree } from './props';
import { emitRoad, MASK_E, MASK_N, MASK_S, MASK_W } from './roads';

const SLOPE_TREE_LIMIT = 0.5;

export class ChunkManager {
  readonly group = new THREE.Group();
  private readonly buildMeshes: THREE.Mesh[] = [];
  private readonly roadMeshes: THREE.Mesh[] = [];
  private readonly dirty = new Uint8Array(CHUNKS).fill(1);
  private readonly builder = new GeometryBuilder(16384);
  private readonly roadBuilder = new GeometryBuilder(2048);
  private readonly corners = [0, 0, 0, 0];
  private layers: SnapshotLayers | null = null;
  private readonly hf: HeightField;
  private readonly seed: number;
  private readonly water: Uint8Array;
  private readonly slope: Uint8Array;

  constructor(hf: HeightField, seed: number, water: Uint8Array, slope: Uint8Array, buildMat: THREE.Material, roadMat: THREE.Material) {
    this.hf = hf;
    this.seed = seed;
    this.water = water;
    this.slope = slope;
    for (let c = 0; c < CHUNKS; c++) {
      const bm = new THREE.Mesh(new THREE.BufferGeometry(), buildMat);
      const rm = new THREE.Mesh(new THREE.BufferGeometry(), roadMat);
      bm.matrixAutoUpdate = false;
      rm.matrixAutoUpdate = false;
      bm.frustumCulled = true;
      rm.frustumCulled = true;
      this.buildMeshes.push(bm);
      this.roadMeshes.push(rm);
      this.group.add(bm, rm);
    }
  }

  /** Keep the latest layers (views into the live snapshot buffer) and mark chunks. */
  setLayers(layers: SnapshotLayers, dirtyChunks: Uint8Array): void {
    this.layers = layers;
    for (let c = 0; c < CHUNKS; c++) if (dirtyChunks[c]) this.dirty[c] = 1;
  }

  /** Copy the layers we need so the snapshot buffer can be recycled. */
  detachLayers(): void {
    if (!this.layers) return;
    const L = this.layers;
    const copy = <A extends Uint8Array | Uint16Array>(a: A): A => a.slice() as A;
    this.layers = {
      ...L,
      zone: copy(L.zone),
      density: copy(L.density),
      road: copy(L.road),
      level: copy(L.level),
      wealth: copy(L.wealth),
      abandoned: copy(L.abandoned),
      plop: copy(L.plop),
      plopOrigin: copy(L.plopOrigin),
      onFire: copy(L.onFire),
    };
  }

  hasDirty(): boolean {
    for (let c = 0; c < CHUNKS; c++) if (this.dirty[c]) return true;
    return false;
  }

  /** Rebuild up to `max` dirty chunks; returns how many were rebuilt. */
  update(max: number): number {
    if (!this.layers) return 0;
    let n = 0;
    for (let c = 0; c < CHUNKS && n < max; c++) {
      if (!this.dirty[c]) continue;
      this.rebuild(c);
      this.dirty[c] = 0;
      n++;
    }
    return n;
  }

  private rebuild(c: number): void {
    const L = this.layers!;
    const b = this.builder;
    const rb = this.roadBuilder;
    b.reset();
    rb.reset();
    const cx = (c % CHUNKS_PER_SIDE) * CHUNK;
    const cy = Math.floor(c / CHUNKS_PER_SIDE) * CHUNK;
    const corners = this.corners;
    for (let y = cy; y < cy + CHUNK; y++) {
      for (let x = cx; x < cx + CHUNK; x++) {
        const i = y * N + x;
        if (this.water[i]) continue;
        this.hf.tileCorners(x, y, corners);
        if (L.road[i]) {
          let mask = 0;
          if (x + 1 < N && L.road[i + 1]) mask |= MASK_E;
          if (y + 1 < N && L.road[i + N]) mask |= MASK_S;
          if (x > 0 && L.road[i - 1]) mask |= MASK_W;
          if (y > 0 && L.road[i - N]) mask |= MASK_N;
          emitRoad(rb, x, y, mask, corners, L.road[i] === 2 ? 1 : 0);
          continue;
        }
        const fire = L.onFire[i] > 0;
        if (L.plop[i]) {
          if (L.plopOrigin[i] !== i) continue;
          const def = plopDef(L.plop[i]);
          if (!def) continue;
          let base = -Infinity;
          let low = Infinity;
          for (let dy = 0; dy < def.size; dy++) {
            for (let dx = 0; dx < def.size; dx++) {
              const cc = [0, 0, 0, 0];
              this.hf.tileCorners(x + dx, y + dy, cc);
              base = Math.max(base, cc[0], cc[1], cc[2], cc[3]);
              low = Math.min(low, cc[0], cc[1], cc[2], cc[3]);
            }
          }
          const linkE = x + 1 < N && (L.plop[i + 1] === PLOP.LINE || (L.plop[i + 1] !== 0 && plopDef(L.plop[i + 1])?.kind === 'power'));
          const linkS = y + 1 < N && (L.plop[i + N] === PLOP.LINE || (L.plop[i + N] !== 0 && plopDef(L.plop[i + N])?.kind === 'power'));
          emitPlop(b, L.plop[i], x, y, base, low, hashSeed(this.seed, i) & 0xff, linkE, linkS, fire ? BURNING : null);
          continue;
        }
        if (L.level[i]) {
          const spec = buildingSpec(L.zone[i], L.density[i], L.wealth[i], L.level[i], hashSeed(this.seed, i) & 0xff);
          emitBuilding(b, x, y, spec, corners, fire ? BURNING : L.abandoned[i] ? ABANDONED : null);
          continue;
        }
        if (!L.zone[i] && this.slope[i] / 255 < SLOPE_TREE_LIMIT) {
          // decorative woodland on untouched land
          const n = smoothNoise(this.seed ^ 0x77, x * 0.11, y * 0.11);
          if (n > 0.56) {
            const h = hashSeed(this.seed, i, 3);
            const ox = 0.25 + ((h & 0xff) / 255) * 0.5;
            const oz = 0.25 + (((h >> 8) & 0xff) / 255) * 0.5;
            const base = this.hf.at(x + ox, y + oz);
            emitTree(b, x + ox, base, y + oz, 0.34 + (((h >> 16) & 0xff) / 255) * 0.18, h >> 24);
          }
        }
      }
    }
    this.apply(this.buildMeshes[c], b.build(), true);
    this.apply(this.roadMeshes[c], rb.build(), false);
  }

  private apply(mesh: THREE.Mesh, built: Built, normals: boolean): void {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(built.position, 3));
    if (normals) geo.setAttribute('normal', new THREE.BufferAttribute(built.normal, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(built.color, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(built.uv, 2));
    if (built.count > 0) geo.computeBoundingSphere();
    mesh.geometry.dispose();
    mesh.geometry = geo;
    mesh.visible = built.count > 0;
  }

  dispose(): void {
    for (const m of this.buildMeshes) m.geometry.dispose();
    for (const m of this.roadMeshes) m.geometry.dispose();
  }
}
