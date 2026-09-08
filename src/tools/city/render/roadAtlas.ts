// Paints the 6-piece road atlas on a canvas: asphalt, kerbs, centre dashes.
// Piece order: isolated, end (opens N), straight (N-S), corner (N+E), tee (N+E+S), cross.

import * as THREE from 'three';
import { PIECES } from './roads';

export function createRoadAtlas(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S * PIECES;
  canvas.height = S * 2; // row 0 streets, row 1 avenues
  const ctx = canvas.getContext('2d')!;
  for (let row = 0; row < 2; row++) paintRow(ctx, S, row);
  const tex = new THREE.CanvasTexture(canvas);
  // sampled by a ShaderMaterial that writes straight to the framebuffer: no decode, no encode
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function paintRow(ctx: CanvasRenderingContext2D, S: number, row: number): void {
  const avenue = row === 1;
  const asphalt = avenue ? '#3e4045' : '#4a4c50';
  const kerb = avenue ? '#b5b1a4' : '#9a9a96';
  const dash = avenue ? '#e8c840' : '#d8d3b0';
  const oy = row * S;
  for (let p = 0; p < PIECES; p++) {
    const ox = p * S;
    ctx.save();
    ctx.translate(0, oy);
    ctx.fillStyle = asphalt;
    ctx.fillRect(ox, 0, S, S);
    const open = { n: false, e: false, s: false, w: false };
    if (p === 1) open.n = true;
    if (p === 2) open.n = open.s = true;
    if (p === 3) open.n = open.e = true;
    if (p === 4) open.n = open.e = open.s = true;
    if (p === 5) open.n = open.e = open.s = open.w = true;
    // kerbs on closed edges
    ctx.fillStyle = kerb;
    const k = 5;
    if (!open.n) ctx.fillRect(ox, 0, S, k);
    if (!open.s) ctx.fillRect(ox, S - k, S, k);
    if (!open.w) ctx.fillRect(ox, 0, k, S);
    if (!open.e) ctx.fillRect(ox + S - k, 0, k, S);
    // centre dashes along open directions
    ctx.fillStyle = dash;
    const c = S / 2;
    const dashLen = 7;
    const gap = 6;
    const drawDash = (dir: 'n' | 'e' | 's' | 'w') => {
      if (avenue) {
        // double solid centre line
        const y0 = dir === 'n' ? 0 : c;
        const x0 = dir === 'w' ? 0 : c;
        if (dir === 'n' || dir === 's') {
          ctx.fillRect(ox + c - 4, y0, 2, c);
          ctx.fillRect(ox + c + 2, y0, 2, c);
        } else {
          ctx.fillRect(ox + x0, c - 4, c, 2);
          ctx.fillRect(ox + x0, c + 2, c, 2);
        }
        return;
      }
      for (let t = 6; t < c - 4; t += dashLen + gap) {
        if (dir === 'n') ctx.fillRect(ox + c - 1.5, t, 3, dashLen);
        if (dir === 's') ctx.fillRect(ox + c - 1.5, S - t - dashLen, 3, dashLen);
        if (dir === 'w') ctx.fillRect(ox + t, c - 1.5, dashLen, 3);
        if (dir === 'e') ctx.fillRect(ox + S - t - dashLen, c - 1.5, dashLen, 3);
      }
    };
    if (p === 2) {
      drawDash('n');
      drawDash('s');
    } else if (p === 3) {
      drawDash('n');
      drawDash('e');
    } else if (p === 1) drawDash('n');
    if (p === 4 || p === 5) {
      // crosswalk stripes across open edges
      ctx.fillStyle = '#e6e6e0';
      const stripe = (edge: 'n' | 'e' | 's' | 'w') => {
        for (let t = 10; t < S - 10; t += 8) {
          if (edge === 'n') ctx.fillRect(ox + t, 6, 4, 8);
          if (edge === 's') ctx.fillRect(ox + t, S - 14, 4, 8);
          if (edge === 'w') ctx.fillRect(ox + 6, t, 8, 4);
          if (edge === 'e') ctx.fillRect(ox + S - 14, t, 8, 4);
        }
      };
      if (open.n) stripe('n');
      if (open.e) stripe('e');
      if (open.s) stripe('s');
      if (p === 5 && open.w) stripe('w');
    }
    ctx.restore();
  }
}

/** Window cell: white frame with a dark glass rectangle; corner texel is plain white. */
export function createWindowTexture(): THREE.CanvasTexture {
  const S = 32;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#20262e';
  ctx.fillRect(9, 9, 14, 16);
  ctx.fillStyle = '#5a7590';
  ctx.fillRect(11, 11, 5, 5);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Night windows for the emissive map: four cells (2×2) so neighbouring windows
 * differ — three lit in warm tones, one dark. Sampled with repeat 0.5 so each
 * cell lines up with one cell of the day texture.
 */
export function createWindowGlowTexture(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, S, S);
  const cells: [number, number, string][] = [
    [0, 0, '#ffd27a'],
    [32, 0, '#ffe9b0'],
    [0, 32, '#000000'],
    [32, 32, '#ffc860'],
  ];
  for (const [ox, oy, col] of cells) {
    ctx.fillStyle = col;
    ctx.fillRect(ox + 9, oy + 9, 14, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.5, 0.5);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
