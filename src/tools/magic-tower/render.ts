// Canvas rendering of one floor. Pure drawing (no React): the Canvas
// component owns the element and calls drawFloor on every state change.

import { diffOf, type GameState } from './game';
import { monsterDef } from './monsters';
import { T, W, H, XY, type Floor, type Run } from './types';
import { TILE, type Atlas } from './sprites';

export const CELL = TILE * 2; // 32 px logical

export interface Fx {
  /** Floating numbers: tile index → text + age (ms). */
  floats: { at: number; text: string; color: string; born: number }[];
  /** Tiles to highlight (route preview). */
  route: number[];
  /** Hovered tile (or -1). */
  hover: number;
  /** Breach-exposed tiles to mark faintly. */
  hollow: { up: boolean; down: boolean };
}

function blit(ctx: CanvasRenderingContext2D, atlas: Atlas, key: string, x: number, y: number): void {
  const col = atlas.index.get(key);
  if (col == null) return;
  const s = TILE * atlas.scale;
  ctx.drawImage(atlas.canvas as CanvasImageSource, col * s, 0, s, s, x * CELL, y * CELL, CELL, CELL);
}

function itemSprite(kind: string): string {
  return kind;
}

export function drawFloor(ctx: CanvasRenderingContext2D, atlas: Atlas, state: GameState, fx: Fx, now: number): void {
  const { run, tower } = state;
  const f: Floor = tower.floors[run.floor - 1];
  const d = diffOf(run, f.n);
  const cave = f.archetype === 'cavern' || f.dir === -1;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W * CELL, H * CELL);
  for (let i = 0; i < W * H; i++) {
    const { x, y } = XY(i);
    const b = f.base[i];
    const dug = d.dug.includes(i);
    const hole = d.holes.includes(i);
    if (hole) blit(ctx, atlas, 'hole', x, y);
    else if (b === T.Wall && !dug) blit(ctx, atlas, cave ? 'wallCave' : 'wall', x, y);
    else if (b === T.VaultWall && !f.vaults.includes(i)) blit(ctx, atlas, 'vaultWall', x, y);
    else if (b === T.VaultWall) blit(ctx, atlas, 'vaultWall', x, y);
    else {
      blit(ctx, atlas, cave ? 'floorCave' : 'floor', x, y);
      if (b === T.StairUp) blit(ctx, atlas, 'stairUp', x, y);
      else if (b === T.StairDown) blit(ctx, atlas, 'stairDown', x, y);
      else if (b === T.Hatch) blit(ctx, atlas, 'hatch', x, y);
    }
    const door = f.doors[i];
    if (door && !d.opened.includes(i)) blit(ctx, atlas, door === 'y' ? 'doorY' : door === 'b' ? 'doorB' : 'doorR', x, y);
    const it = f.items[i];
    if (it && !d.taken.includes(i) && (!it.vault || hole)) blit(ctx, atlas, itemSprite(it.kind), x, y);
    const npc = f.npcs[i];
    if (npc) blit(ctx, atlas, npc.kind === 'shop' ? 'npcShop' : npc.kind === 'sage' ? 'npcSage' : npc.kind === 'locksmith' ? 'npcLocksmith' : 'npcTradePost', x, y);
    const m = f.mons[i];
    if (m && !d.killed.includes(i)) {
      blit(ctx, atlas, monsterDef(m.id).sprite, x, y);
      if (m.elite) {
        ctx.fillStyle = '#ffd040';
        ctx.fillRect(x * CELL + CELL - 8, y * CELL + 2, 6, 6);
      }
    }
  }
  // Route preview.
  if (fx.route.length) {
    ctx.fillStyle = 'rgba(255, 230, 120, 0.28)';
    for (const i of fx.route) {
      const { x, y } = XY(i);
      ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
    }
  }
  if (fx.hover >= 0) {
    const { x, y } = XY(fx.hover);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }
  // Hero.
  {
    const { x, y } = XY(run.pos);
    const key = run.facing === 0 ? 'heroUp' : run.facing === 1 ? 'heroRight' : run.facing === 2 ? 'heroDown' : 'heroLeft';
    blit(ctx, atlas, key, x, y);
  }
  // Floating numbers.
  ctx.font = 'bold 13px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  for (const fl of fx.floats) {
    const age = now - fl.born;
    if (age > 900) continue;
    const { x, y } = XY(fl.at);
    ctx.globalAlpha = 1 - age / 900;
    ctx.fillStyle = '#000';
    ctx.fillText(fl.text, x * CELL + CELL / 2 + 1, y * CELL + 12 - age / 40 + 1);
    ctx.fillStyle = fl.color;
    ctx.fillText(fl.text, x * CELL + CELL / 2, y * CELL + 12 - age / 40);
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

export function runLabel(run: Run, floor: Floor): string {
  void run;
  return floor.label;
}
