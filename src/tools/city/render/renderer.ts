// The three.js scene. Only this module and its render/* siblings touch three;
// it is loaded with a dynamic import() so the initial page stays small.

import * as THREE from 'three';
import { N, type Rect, type Theme3 } from '../types';
import { CameraRig } from './camera';
import { HeightField } from './heightfield';
import { DARK_PALETTE, LIGHT_PALETTE, type ScenePalette } from './palette';
import { groundPoint, pickTile, type Ray } from './picking';
import { buildTerrainChunks, createTerrainMaterial, type TerrainUniforms } from './terrain';

export interface TerrainData {
  seed: number;
  height: Float32Array;
  sea: number;
  water: Uint8Array;
}

export class CityRenderer {
  readonly rig = new CameraRig();
  readonly hf: HeightField;
  readonly overlay: Uint8Array;
  private readonly gl: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly overlayTex: THREE.DataTexture;
  private readonly terrainMat: THREE.ShaderMaterial;
  private readonly waterMat: THREE.MeshBasicMaterial;
  private readonly terrainMeshes: THREE.Mesh[];
  private readonly ray = new THREE.Vector3();
  private readonly eyeV = new THREE.Vector3();
  private palette: ScenePalette = LIGHT_PALETTE;
  private overlayDirty = true;
  private needsRender = true;
  private lastTime = 0;
  private width = 1;
  private height = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, terrain: TerrainData) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 900);
    this.hf = new HeightField(terrain.height, terrain.sea);

    this.overlay = new Uint8Array(N * N * 4);
    this.overlayTex = new THREE.DataTexture(this.overlay, N, N, THREE.RGBAFormat);
    this.overlayTex.magFilter = THREE.NearestFilter;
    this.overlayTex.minFilter = THREE.NearestFilter;
    this.overlayTex.colorSpace = THREE.SRGBColorSpace;
    this.overlayTex.needsUpdate = true;

    this.terrainMat = createTerrainMaterial(this.overlayTex);
    this.terrainMeshes = buildTerrainChunks(this.hf, terrain.seed, this.terrainMat);
    for (const m of this.terrainMeshes) this.scene.add(m);

    this.waterMat = new THREE.MeshBasicMaterial({ color: this.palette.water, transparent: true, opacity: this.palette.waterOpacity, depthWrite: false });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(N + 40, N + 40), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(N / 2, -0.02, N / 2);
    water.renderOrder = 1;
    this.scene.add(water);

    this.hemi = new THREE.HemisphereLight(this.palette.hemiSky, this.palette.hemiGround, this.palette.hemiIntensity);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(this.palette.sun, this.palette.sunIntensity);
    this.sun.position.set(-45, 80, 35);
    this.scene.add(this.sun);
    this.scene.fog = new THREE.Fog(this.palette.fog, this.palette.fogNear, this.palette.fogFar);
    this.setTheme('light');
    this.rig.setPose({ tx: N / 2, tz: N / 2 }, true);
  }

  get uniforms(): TerrainUniforms {
    return this.terrainMat.uniforms as unknown as TerrainUniforms;
  }

  setTheme(theme: Theme3): void {
    this.palette = theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
    const p = this.palette;
    this.scene.background = new THREE.Color(p.background);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(p.fog);
    fog.near = p.fogNear;
    fog.far = p.fogFar;
    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.sun.color.set(p.sun);
    this.sun.intensity = p.sunIntensity;
    this.waterMat.color.set(p.water);
    this.waterMat.opacity = p.waterOpacity;
    this.needsRender = true;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.gl.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  }

  /** Highlight a rectangle of tiles (or none). */
  setCursor(rect: Rect | null, ok = true): void {
    const u = this.uniforms;
    if (!rect) u.cursor.value.set(-1, -1, -1, -1);
    else u.cursor.value.set(Math.min(rect.x0, rect.x1), Math.min(rect.y0, rect.y1), Math.max(rect.x0, rect.x1) + 1, Math.max(rect.y0, rect.y1) + 1);
    u.cursorColor.value.set(ok ? 0xffffff : 0xff3b30);
    this.needsRender = true;
  }

  /** Call after writing into `overlay`. */
  markOverlayDirty(): void {
    this.overlayDirty = true;
    this.needsRender = true;
  }

  invalidate(): void {
    this.needsRender = true;
  }

  private rayFromNdc(nx: number, ny: number): Ray {
    this.ray.set(nx, ny, 0.5).unproject(this.camera);
    const o = this.camera.position;
    this.ray.sub(o).normalize();
    return { ox: o.x, oy: o.y, oz: o.z, dx: this.ray.x, dy: this.ray.y, dz: this.ray.z };
  }

  private heightAt = (x: number, z: number): number => Math.max(0, this.hf.at(x, z));

  pick(nx: number, ny: number) {
    return pickTile(this.rayFromNdc(nx, ny), this.targetY(), this.heightAt);
  }

  ground(nx: number, ny: number) {
    return groundPoint(this.rayFromNdc(nx, ny), this.targetY(), this.heightAt);
  }

  private targetY(): number {
    return Math.max(0, this.hf.at(this.rig.cur.tx, this.rig.cur.tz));
  }

  /** Advance animation and render if anything changed. Returns true if a frame was drawn. */
  frame(now: number): boolean {
    if (this.disposed) return false;
    const dt = this.lastTime ? Math.min(0.1, (now - this.lastTime) / 1000) : 0.016;
    this.lastTime = now;
    const moving = this.rig.update(dt);
    if (moving) this.needsRender = true;
    if (!this.needsRender) return false;
    this.needsRender = false;

    const ty = this.targetY();
    const e = this.rig.eye(ty);
    this.eyeV.set(e.x, Math.max(e.y, this.heightAt(e.x, e.z) + 1.2), e.z);
    this.camera.position.copy(this.eyeV);
    this.camera.lookAt(this.rig.cur.tx, ty, this.rig.cur.tz);
    this.uniforms.gridStrength.value = Math.min(1, Math.max(0, (60 - this.rig.cur.dist) / 35));
    if (this.overlayDirty) {
      this.overlayTex.needsUpdate = true;
      this.overlayDirty = false;
    }
    this.gl.render(this.scene, this.camera);
    return true;
  }

  dispose(): void {
    this.disposed = true;
    for (const m of this.terrainMeshes) m.geometry.dispose();
    this.terrainMat.dispose();
    this.waterMat.dispose();
    this.overlayTex.dispose();
    this.gl.dispose();
  }
}
