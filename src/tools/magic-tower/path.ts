// Reachability and pathing on one floor. Shared by the generator, the
// solver, the validator and the game so "where can I walk" has one answer.

import { DX, DY, IDX, N, T, XY, inBounds, neighbours, type Floor, type MonsterInst } from './types';

/** What the caller knows about the floor's mutable state. */
export interface FloorState {
  isKilled(i: number): boolean;
  isOpened(i: number): boolean;
  isTaken(i: number): boolean;
  isHole(i: number): boolean;
  isDug(i: number): boolean;
}

export const EMPTY_STATE: FloorState = {
  isKilled: () => false,
  isOpened: () => false,
  isTaken: () => false,
  isHole: () => false,
  isDug: () => false,
};

/** Terrain the hero may stand on (ignoring monsters/doors). */
export function standable(floor: Floor, st: FloorState, i: number): boolean {
  const b = floor.base[i];
  if (st.isHole(i)) return true;
  if (b === T.Wall || b === T.VaultWall) return st.isDug(i);
  return true;
}

/** Fully passable right now: standable, no living monster, no closed door, no NPC. */
export function passable(floor: Floor, st: FloorState, i: number): boolean {
  if (!standable(floor, st, i)) return false;
  if (floor.mons[i] && !st.isKilled(i)) return false;
  if (floor.doors[i] && !st.isOpened(i)) return false;
  if (floor.npcs[i]) return false;
  return true;
}

/** Living 领域 monsters' per-step cost for each tile (0 when none). */
export function zoneCosts(floor: Floor, st: FloorState): number[] | null {
  let any = false;
  const cost = new Array<number>(N).fill(0);
  for (const k in floor.mons) {
    const i = Number(k);
    const m: MonsterInst = floor.mons[i];
    if (!m.zoneDmg || st.isKilled(i)) continue;
    any = true;
    for (const n of neighbours(i)) cost[n] += m.zoneDmg;
  }
  return any ? cost : null;
}

export interface Reach {
  /** HP cost to reach each tile (Infinity = unreachable). `from` costs 0. */
  cost: number[];
  /** Step count (BFS on the cheapest-cost tree; used for tie-breaks and UI). */
  steps: number[];
  /** Previous tile on the cheapest path (−1 for the origin / unreachable). */
  prev: number[];
}

/**
 * Cheapest-HP reach from `from` over passable tiles. Without zone monsters it
 * is a plain BFS; with them a small Dijkstra (121 tiles).
 */
export function reach(floor: Floor, st: FloorState, from: number): Reach {
  const cost = new Array<number>(N).fill(Infinity);
  const steps = new Array<number>(N).fill(Infinity);
  const prev = new Array<number>(N).fill(-1);
  const zc = zoneCosts(floor, st);
  cost[from] = 0;
  steps[from] = 0;
  if (!zc) {
    const q = [from];
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      const { x, y } = XY(i);
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (!inBounds(nx, ny)) continue;
        const j = IDX(nx, ny);
        if (cost[j] !== Infinity || !passable(floor, st, j)) continue;
        cost[j] = 0;
        steps[j] = steps[i] + 1;
        prev[j] = i;
        q.push(j);
      }
    }
    return { cost, steps, prev };
  }
  // Dijkstra with (cost, steps) lexicographic priority; N is tiny so a linear scan is fine.
  const done = new Array<boolean>(N).fill(false);
  for (;;) {
    let best = -1;
    for (let i = 0; i < N; i++) {
      if (done[i] || cost[i] === Infinity) continue;
      if (best === -1 || cost[i] < cost[best] || (cost[i] === cost[best] && steps[i] < steps[best])) best = i;
    }
    if (best === -1) break;
    done[best] = true;
    const { x, y } = XY(best);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inBounds(nx, ny)) continue;
      const j = IDX(nx, ny);
      if (done[j] || !passable(floor, st, j)) continue;
      const c = cost[best] + zc[j];
      const s = steps[best] + 1;
      if (c < cost[j] || (c === cost[j] && s < steps[j])) {
        cost[j] = c;
        steps[j] = s;
        prev[j] = best;
      }
    }
  }
  return { cost, steps, prev };
}

/** Tile sequence from the origin of `r` to `to` (inclusive of `to`, exclusive of the origin). */
export function pathTo(r: Reach, to: number): number[] {
  if (r.cost[to] === Infinity) return [];
  const out: number[] = [];
  let i = to;
  while (i !== -1 && r.prev[i] !== -1) {
    out.push(i);
    i = r.prev[i];
  }
  return out.reverse();
}

/** Blocked tiles (monster / door / NPC) orthogonally adjacent to a reachable tile, with the cheapest approach cost. */
export function frontier(floor: Floor, st: FloorState, r: Reach): { at: number; approachCost: number; via: number }[] {
  const out: { at: number; approachCost: number; via: number }[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < N; i++) {
    if (r.cost[i] === Infinity) continue;
    for (const j of neighbours(i)) {
      if (seen.has(j) || r.cost[j] !== Infinity) continue;
      const blockedByMon = floor.mons[j] && !st.isKilled(j);
      const blockedByDoor = floor.doors[j] && !st.isOpened(j);
      const npc = !!floor.npcs[j];
      if (!(blockedByMon || blockedByDoor || npc) || !standable(floor, st, j)) continue;
      seen.add(j);
      out.push({ at: j, approachCost: r.cost[i], via: i });
    }
  }
  return out;
}

/** Connected (4-neighbour) check on a boolean open-mask, from `from`. */
export function floodOpen(open: boolean[], from: number): boolean[] {
  const seen = new Array<boolean>(N).fill(false);
  if (!open[from]) return seen;
  const q = [from];
  seen[from] = true;
  for (let h = 0; h < q.length; h++) {
    for (const j of neighbours(q[h])) {
      if (!seen[j] && open[j]) {
        seen[j] = true;
        q.push(j);
      }
    }
  }
  return seen;
}
