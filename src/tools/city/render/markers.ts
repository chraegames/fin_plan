// Problem markers: a billboard icon over every building lot that has a
// problem (no power, no water, …), drawn as one Points cloud sampling a
// canvas-painted atlas. Pure resampling logic lives in collectMarkers().

import * as THREE from 'three';
import { N, PROBLEM, T } from '../types';
import type { SnapshotLayers } from '../protocol';
import { buildingSpec } from './buildings';
import type { HeightField } from './heightfield';

/** Atlas order (also the priority order when a lot has several problems). */
export const MARKER_ORDER = [PROBLEM.NO_POWER, PROBLEM.NO_WATER, PROBLEM.NO_ROAD, PROBLEM.NO_JOBS, PROBLEM.NO_WORKERS, PROBLEM.NO_CUSTOMERS, PROBLEM.GARBAGE, PROBLEM.BLIGHT] as const;
export const MARKER_COLORS = ['#F2C230', '#4C9BD6', '#5B5F6B', '#E76C82', '#4F86E0', '#E6B23B', '#8C7A4B', '#B3261E'];

export interface MarkerSample {
  x: number;
  z: number;
  /** Building height above the ground at the lot centre. */
  h: number;
  icon: number;
}

/** Which icon a problem byte shows (the most urgent bit), or -1. */
export function markerIcon(bits: number): number {
  for (let k = 0; k < MARKER_ORDER.length; k++) if (bits & MARKER_ORDER[k]) return k;
  return -1;
}

/**
 * Pure: one marker per lot origin with a problem, capped. When a city has more
 * troubled lots than `dense`, the field is thinned (every 2nd, then 3rd lot in
 * a checker pattern) so clusters still read without carpeting the map.
 */
export function collectMarkers(L: SnapshotLayers, seedHash: (i: number) => number, cap: number, out: MarkerSample[] = [], dense = 160): MarkerSample[] {
  out.length = 0;
  let total = 0;
  for (let i = 0; i < T; i++) if (L.problems[i] && L.level[i] && !L.abandoned[i] && ((L.lotSize[i] || 1) <= 1 || L.lotOrigin[i] === i)) total++;
  const stride = total > dense * 2 ? 3 : total > dense ? 2 : 1;
  for (let i = 0; i < T && out.length < cap; i++) {
    const bits = L.problems[i];
    if (!bits || !L.level[i] || L.abandoned[i]) continue;
    const k = L.lotSize[i] || 1;
    if (k > 1 && L.lotOrigin[i] !== i) continue;
    if (stride > 1 && ((i % N) + ((i / N) | 0)) % stride !== 0) continue;
    const icon = markerIcon(bits);
    if (icon < 0) continue;
    const spec = buildingSpec(L.zone[i], L.density[i], L.wealth[i], L.level[i], seedHash(i) & 0xff, k);
    out.push({ x: (i % N) + k / 2, z: ((i / N) | 0) + k / 2, h: L.age[i] === 0 ? 0.6 : spec.height, icon });
  }
  return out;
}

const ICONS = 8;

/** Paint the icon atlas: rounded coloured badges with a bold white glyph each. */
export function createMarkerAtlas(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S * ICONS;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, S);
  for (let k = 0; k < ICONS; k++) {
    const ox = k * S;
    ctx.save();
    ctx.translate(ox, 0);
    // badge
    ctx.fillStyle = '#3A2A22';
    roundRect(ctx, 6, 6, S - 12, S - 12, 16);
    ctx.fill();
    ctx.fillStyle = MARKER_COLORS[k];
    roundRect(ctx, 9, 9, S - 18, S - 18, 13);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (k) {
      case 0: // lightning
        ctx.moveTo(36, 14);
        ctx.lineTo(24, 34);
        ctx.lineTo(33, 34);
        ctx.lineTo(28, 50);
        ctx.lineTo(41, 29);
        ctx.lineTo(32, 29);
        ctx.closePath();
        ctx.fill();
        break;
      case 1: // drop
        ctx.moveTo(32, 13);
        ctx.bezierCurveTo(32, 13, 18, 30, 18, 38);
        ctx.arc(32, 38, 14, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();
        break;
      case 2: // road with a bar
        ctx.moveTo(18, 50);
        ctx.lineTo(27, 16);
        ctx.lineTo(37, 16);
        ctx.lineTo(46, 50);
        ctx.stroke();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(32, 18);
        ctx.lineTo(32, 48);
        ctx.stroke();
        break;
      case 3: // briefcase
        roundRect(ctx, 15, 24, 34, 24, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(25, 24);
        ctx.lineTo(25, 17);
        ctx.lineTo(39, 17);
        ctx.lineTo(39, 24);
        ctx.stroke();
        ctx.fillStyle = MARKER_COLORS[k];
        ctx.fillRect(29, 32, 6, 5);
        break;
      case 4: // person
        ctx.arc(32, 21, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, 50);
        ctx.quadraticCurveTo(32, 26, 46, 50);
        ctx.closePath();
        ctx.fill();
        break;
      case 5: // shop cart
        ctx.moveTo(14, 18);
        ctx.lineTo(21, 18);
        ctx.lineTo(27, 40);
        ctx.lineTo(46, 40);
        ctx.lineTo(50, 24);
        ctx.lineTo(24, 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(30, 48, 3.5, 0, Math.PI * 2);
        ctx.arc(44, 48, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 6: // bin
        ctx.moveTo(19, 22);
        ctx.lineTo(45, 22);
        ctx.lineTo(42, 50);
        ctx.lineTo(22, 50);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(16, 15, 32, 5);
        ctx.fillRect(27, 11, 10, 5);
        break;
      default: // warning triangle
        ctx.moveTo(32, 13);
        ctx.lineTo(51, 48);
        ctx.lineTo(13, 48);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = MARKER_COLORS[k];
        ctx.fillRect(29, 24, 6, 13);
        ctx.fillRect(29, 40, 6, 5);
        break;
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const VERT = /* glsl */ `
attribute float icon;
attribute float phase;
uniform float time;
uniform float scale;
varying float vIcon;
void main() {
  vIcon = icon;
  vec3 p = position;
  p.y += 0.06 * sin(time * 3.0 + phase * 6.2831);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(scale / -mv.z, 12.0, 36.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D atlas;
uniform float icons;
varying float vIcon;
void main() {
  vec2 uv = vec2((gl_PointCoord.x + vIcon) / icons, 1.0 - gl_PointCoord.y);
  vec4 c = texture2D(atlas, uv);
  if (c.a < 0.2) discard;
  gl_FragColor = c;
}`;

export class ProblemMarkers {
  readonly points: THREE.Points;
  private readonly cap = 600;
  private readonly pos: THREE.BufferAttribute;
  private readonly icon: THREE.BufferAttribute;
  private readonly phase: THREE.BufferAttribute;
  private readonly mat: THREE.ShaderMaterial;
  private readonly hf: HeightField;
  private readonly samples: MarkerSample[] = [];
  private count = 0;
  enabled = true;

  constructor(hf: HeightField, atlas: THREE.Texture) {
    this.hf = hf;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(this.cap * 3), 3);
    this.icon = new THREE.BufferAttribute(new Float32Array(this.cap), 1);
    this.phase = new THREE.BufferAttribute(new Float32Array(this.cap), 1);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('icon', this.icon);
    geo.setAttribute('phase', this.phase);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: atlas }, icons: { value: ICONS }, time: { value: 0 }, scale: { value: 900 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    geo.setDrawRange(0, 0);
  }

  resample(L: SnapshotLayers, seedHash: (i: number) => number): void {
    collectMarkers(L, seedHash, this.cap, this.samples);
    const p = this.pos.array as Float32Array;
    const ic = this.icon.array as Float32Array;
    const ph = this.phase.array as Float32Array;
    let n = 0;
    for (const m of this.samples) {
      p[n * 3] = m.x;
      p[n * 3 + 1] = Math.max(0, this.hf.at(m.x, m.z)) + m.h + 0.55;
      p[n * 3 + 2] = m.z;
      ic[n] = m.icon;
      ph[n] = ((m.x * 7 + m.z * 13) % 10) / 10;
      n++;
    }
    this.count = n;
    this.pos.needsUpdate = true;
    this.icon.needsUpdate = true;
    this.phase.needsUpdate = true;
    this.points.geometry.setDrawRange(0, n);
    this.points.visible = this.enabled && n > 0;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.points.visible = on && this.count > 0;
  }

  /** Advance the bob; returns true when something is showing. */
  update(time: number): boolean {
    if (!this.points.visible) return false;
    (this.mat.uniforms.time as THREE.IUniform).value = time;
    return true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
