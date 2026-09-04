// Canvas rendering of one floor. Pure drawing (no React). The canvas backing
// store matches the displayed size × devicePixelRatio, so sprites are scaled
// crisply and the number overlays stay sharp at any board size.

import { diffOf, type GameState } from './game';
import { monsterDef } from './monsters';
import type { Overlay } from './overlay';
import { T, W, H, XY } from './types';
import { TILE, type Atlas } from './sprites';

export interface Fx {
  /** Floating numbers: tile index → text + age (ms). */
  floats: { at: number; text: string; color: string; born: number }[];
  /** Tiles to highlight (route preview). */
  route: number[];
  /** Hovered tile (or -1). */
  hover: number;
  overlays: Map<number, Overlay>;
}

function blit(ctx: CanvasRenderingContext2D, atlas: Atlas, key: string, x: number, y: number, cell: number): void {
  const col = atlas.index.get(key);
  if (col == null) return;
  const s = TILE * atlas.scale;
  ctx.drawImage(atlas.canvas as CanvasImageSource, col * s, 0, s, s, Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell));
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number, align: CanvasTextAlign): void {
  ctx.font = `700 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size / 4);
  ctx.strokeStyle = 'rgba(8, 8, 12, 0.95)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawFloor(ctx: CanvasRenderingContext2D, atlas: Atlas, state: GameState, fx: Fx, now: number, cell: number): void {
  const { run, tower } = state;
  const f = tower.floors[run.floor - 1];
  const d = diffOf(run, f.n);
  const cave = f.archetype === 'cavern' || f.dir === -1;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W * cell, H * cell);
  for (let i = 0; i < W * H; i++) {
    const { x, y } = XY(i);
    const b = f.base[i];
    const dug = d.dug.includes(i);
    const hole = d.holes.includes(i);
    if (hole) blit(ctx, atlas, 'hole', x, y, cell);
    else if (b === T.Wall && !dug) blit(ctx, atlas, cave ? 'wallCave' : 'wall', x, y, cell);
    else if (b === T.VaultWall) blit(ctx, atlas, 'vaultWall', x, y, cell);
    else {
      blit(ctx, atlas, cave ? 'floorCave' : 'floor', x, y, cell);
      if (b === T.StairUp) blit(ctx, atlas, 'stairUp', x, y, cell);
      else if (b === T.StairDown) blit(ctx, atlas, 'stairDown', x, y, cell);
      else if (b === T.Hatch) blit(ctx, atlas, 'hatch', x, y, cell);
    }
    const door = f.doors[i];
    if (door && !d.opened.includes(i)) blit(ctx, atlas, door === 'y' ? 'doorY' : door === 'b' ? 'doorB' : 'doorR', x, y, cell);
    const it = f.items[i];
    if (it && !d.taken.includes(i) && (!it.vault || hole)) blit(ctx, atlas, it.kind, x, y, cell);
    const npc = f.npcs[i];
    if (npc) blit(ctx, atlas, npc.kind === 'shop' ? 'npcShop' : npc.kind === 'sage' ? 'npcSage' : npc.kind === 'locksmith' ? 'npcLocksmith' : 'npcTradePost', x, y, cell);
    const m = f.mons[i];
    if (m && !d.killed.includes(i)) {
      blit(ctx, atlas, monsterDef(m.id).sprite, x, y, cell);
      if (m.elite) {
        ctx.fillStyle = '#ffd040';
        const s = Math.max(3, cell * 0.14);
        ctx.fillRect(x * cell + cell - s - 2, y * cell + 2, s, s);
      }
    }
  }
  // Route preview.
  if (fx.route.length) {
    ctx.fillStyle = 'rgba(255, 230, 120, 0.26)';
    const pad = Math.max(2, cell * 0.12);
    for (const i of fx.route) {
      const { x, y } = XY(i);
      ctx.fillRect(x * cell + pad, y * cell + pad, cell - 2 * pad, cell - 2 * pad);
    }
  }
  // Number overlays (damage / gains) — bottom edge of the tile.
  const size = Math.max(9, Math.round(cell * 0.28));
  for (const [i, o] of fx.overlays) {
    const { x, y } = XY(i);
    label(ctx, o.text, x * cell + cell / 2, y * cell + cell - Math.max(2, cell * 0.06), o.color, size, 'center');
  }
  if (fx.hover >= 0) {
    const { x, y } = XY(fx.hover);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(2, cell * 0.06);
    ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }
  // Hero.
  {
    const { x, y } = XY(run.pos);
    const key = run.facing === 0 ? 'heroUp' : run.facing === 1 ? 'heroRight' : run.facing === 2 ? 'heroDown' : 'heroLeft';
    blit(ctx, atlas, key, x, y, cell);
  }
  // Floating numbers.
  const fsize = Math.max(11, Math.round(cell * 0.34));
  for (const fl of fx.floats) {
    const age = now - fl.born;
    if (age > 900) continue;
    const { x, y } = XY(fl.at);
    ctx.globalAlpha = 1 - age / 900;
    label(ctx, fl.text, x * cell + cell / 2, y * cell + cell * 0.4 - (age / 900) * cell * 0.6, fl.color, fsize, 'center');
    ctx.globalAlpha = 1;
  }
}

/** Tile index under a pointer position on the canvas element. */
export function tileAt(el: HTMLCanvasElement, clientX: number, clientY: number): number {
  const r = el.getBoundingClientRect();
  const x = Math.floor(((clientX - r.left) / r.width) * W);
  const y = Math.floor(((clientY - r.top) / r.height) * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return -1;
  return y * W + x;
}
