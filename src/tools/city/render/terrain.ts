// Terrain: 64 chunk meshes sharing one ShaderMaterial that blends a data
// overlay texture, fades in a tile grid up close, and tints the cursor.
// Lighting is baked into vertex colours (a ShaderMaterial gets no lights).

import * as THREE from 'three';
import { smoothNoise } from '../sim/terrain';
import { CHUNK, CHUNKS_PER_SIDE, N } from '../types';
import type { HeightField } from './heightfield';
import { terrainColor } from './palette';

const VERT = /* glsl */ `
attribute vec3 tcolor;
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vColor = tcolor;
  vUv = uv;
  vWorld = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D overlayTex;
uniform float overlayMix;
uniform float gridStrength;
uniform vec4 cursor;
uniform vec4 cursor2;
uniform vec3 cursorColor;
uniform float cursorMix;
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  vec3 col = vColor;
  vec4 ov = texture2D(overlayTex, vUv);
  col = mix(col, ov.rgb, ov.a * overlayMix);
  vec2 f = abs(fract(vWorld.xz) - 0.5);
  float m = max(f.x, f.y);
  float w = fwidth(m) * 1.5;
  float line = smoothstep(0.485 - w, 0.485 + w, m);
  col *= 1.0 - line * gridStrength * 0.32;
  bool inA = vWorld.x >= cursor.x && vWorld.x < cursor.z && vWorld.z >= cursor.y && vWorld.z < cursor.w;
  bool inB = vWorld.x >= cursor2.x && vWorld.x < cursor2.z && vWorld.z >= cursor2.y && vWorld.z < cursor2.w;
  if (inA || inB) {
    col = mix(col, cursorColor, cursorMix);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

export interface TerrainUniforms {
  overlayTex: { value: THREE.Texture };
  overlayMix: { value: number };
  gridStrength: { value: number };
  cursor: { value: THREE.Vector4 };
  cursor2: { value: THREE.Vector4 };
  cursorColor: { value: THREE.Color };
  cursorMix: { value: number };
}

export function createTerrainMaterial(overlay: THREE.DataTexture): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    overlayTex: { value: null },
    overlayMix: { value: 1 },
    gridStrength: { value: 0 },
    cursor: { value: new THREE.Vector4(-1, -1, -1, -1) },
    cursor2: { value: new THREE.Vector4(-1, -1, -1, -1) },
    cursorColor: { value: new THREE.Color(0xffffff) },
    cursorMix: { value: 0.45 },
  }]) as TerrainUniforms & Record<string, THREE.IUniform>;
  uniforms.overlayTex.value = overlay;
  return new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
}

const SUN = new THREE.Vector3(-0.45, 0.8, 0.35).normalize();

/** Build the 64 terrain chunk meshes. Colour + baked shading per vertex. */
export function buildTerrainChunks(hf: HeightField, seed: number, material: THREE.Material): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const V = CHUNK + 1;
  const tmp = [0, 0, 0];
  const nrm = new THREE.Vector3();
  for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) {
    for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
      const pos = new Float32Array(V * V * 3);
      const col = new Float32Array(V * V * 3);
      const uv = new Float32Array(V * V * 2);
      let p = 0;
      for (let vz = 0; vz < V; vz++) {
        for (let vx = 0; vx < V; vx++) {
          const gx = cx * CHUNK + vx;
          const gz = cz * CHUNK + vz;
          const h = hf.corner(gx, gz);
          pos[p * 3] = gx;
          pos[p * 3 + 1] = h;
          pos[p * 3 + 2] = gz;
          uv[p * 2] = gx / N;
          uv[p * 2 + 1] = gz / N;
          // normal from neighbouring corners
          const hl = hf.corner(Math.max(0, gx - 1), gz);
          const hr = hf.corner(Math.min(N, gx + 1), gz);
          const hd = hf.corner(gx, Math.max(0, gz - 1));
          const hu = hf.corner(gx, Math.min(N, gz + 1));
          nrm.set(hl - hr, 2, hd - hu).normalize();
          const slope = Math.sqrt(nrm.x * nrm.x + nrm.z * nrm.z);
          const shade = 0.58 + 0.42 * Math.max(0, nrm.dot(SUN));
          const noise = smoothNoise(seed, gx * 0.09, gz * 0.09);
          terrainColor(h / 9, slope, noise, tmp);
          col[p * 3] = tmp[0] * shade;
          col[p * 3 + 1] = tmp[1] * shade;
          col[p * 3 + 2] = tmp[2] * shade;
          p++;
        }
      }
      const index = new Uint16Array(CHUNK * CHUNK * 6);
      let q = 0;
      for (let vz = 0; vz < CHUNK; vz++) {
        for (let vx = 0; vx < CHUNK; vx++) {
          const a = vz * V + vx;
          const b = a + 1;
          const c = a + V;
          const d = c + 1;
          index[q++] = a;
          index[q++] = c;
          index[q++] = b;
          index[q++] = b;
          index[q++] = c;
          index[q++] = d;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('tcolor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      meshes.push(mesh);
    }
  }
  return meshes;
}

const ROAD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vWorld = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const ROAD_FRAG = /* glsl */ `
uniform sampler2D atlas;
uniform sampler2D overlayTex;
uniform float overlayMix;
uniform float mapSize;
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  vec3 col = texture2D(atlas, vUv).rgb;
  vec4 ov = texture2D(overlayTex, vWorld.xz / mapSize);
  col = mix(col, ov.rgb, ov.a * overlayMix);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

/** Road material: atlas texture blended with the same overlay the terrain uses. */
export function createRoadMaterial(atlas: THREE.Texture, overlay: THREE.DataTexture): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { atlas: { value: null }, overlayTex: { value: null }, overlayMix: { value: 1 }, mapSize: { value: N } }]) as Record<string, THREE.IUniform>;
  uniforms.atlas.value = atlas;
  uniforms.overlayTex.value = overlay;
  return new THREE.ShaderMaterial({ uniforms, vertexShader: ROAD_VERT, fragmentShader: ROAD_FRAG, fog: true });
}
