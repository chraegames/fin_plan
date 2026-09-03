// Floor carvers. A layout is walls + rooms + the single openings that make a
// room (or a subtree of rooms) a "wing" the generator can lock or guard.
//
// The workhorse is a BSP split whose wall lines each get exactly one gap, so
// the room adjacency graph is a tree and every gap is a chokepoint. Extra
// openings (archetype-dependent) add cycles and reduce the wing count.

import { floodOpen } from './path';
import { IDX, N, W, H, XY, neighbours, type Rng } from './layoutTypes';
import { int, chance, pick, shuffle } from './rng';

export type Archetype = 'rooms' | 'halls' | 'maze' | 'cavern' | 'spiral' | 'arena' | 'ring';

export interface Room {
  id: number;
  x0: number;
  y0: number;
  x1: number; // inclusive
  y1: number;
  tiles: number[];
}

export interface Gap {
  /** Tile index of the opening (a floor tile inside a wall line). */
  at: number;
  /** Room ids on either side. */
  a: number;
  b: number;
}

export interface Layout {
  archetype: Archetype;
  walls: boolean[];
  rooms: Room[];
  gaps: Gap[];
}

export const ARCHETYPES: Archetype[] = ['rooms', 'halls', 'maze', 'cavern', 'spiral', 'ring'];

function emptyWalls(): boolean[] {
  return new Array<boolean>(N).fill(false);
}

function rect(x0: number, y0: number, x1: number, y1: number): number[] {
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(IDX(x, y));
  return out;
}

/** BSP with one gap per wall line. minSize = smallest room side allowed. */
function bsp(rng: Rng, minSize: number, maxRooms: number): Layout {
  const walls = emptyWalls();
  const rooms: Room[] = [];
  const gaps: Gap[] = [];
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const queue: Box[] = [{ x0: 0, y0: 0, x1: W - 1, y1: H - 1 }];
  const finalBoxes: Box[] = [];
  while (queue.length) {
    const box = queue.shift()!;
    const w = box.x1 - box.x0 + 1;
    const h = box.y1 - box.y0 + 1;
    // Candidate split lines. A line must not run into an existing gap on the
    // box's boundary (that would seal the gap on both sides and strand it).
    const gapAt = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && gaps.some(g => g.at === IDX(x, y));
    const xs: number[] = [];
    for (let x = box.x0 + minSize; x <= box.x1 - minSize; x++) if (!gapAt(x, box.y0 - 1) && !gapAt(x, box.y1 + 1)) xs.push(x);
    const ys: number[] = [];
    for (let y = box.y0 + minSize; y <= box.y1 - minSize; y++) if (!gapAt(box.x0 - 1, y) && !gapAt(box.x1 + 1, y)) ys.push(y);
    const canX = xs.length > 0;
    const canY = ys.length > 0;
    if ((!canX && !canY) || finalBoxes.length + queue.length + 1 >= maxRooms) {
      finalBoxes.push(box);
      continue;
    }
    const splitX = canX && (!canY || (w > h ? true : w === h ? chance(rng, 0.5) : false));
    if (splitX) {
      const sx = pick(rng, xs);
      for (let y = box.y0; y <= box.y1; y++) walls[IDX(sx, y)] = true;
      const gy = int(rng, box.y0, box.y1);
      walls[IDX(sx, gy)] = false;
      queue.push({ x0: box.x0, y0: box.y0, x1: sx - 1, y1: box.y1 }, { x0: sx + 1, y0: box.y0, x1: box.x1, y1: box.y1 });
      gaps.push({ at: IDX(sx, gy), a: -1, b: -1 });
    } else {
      const sy = pick(rng, ys);
      for (let x = box.x0; x <= box.x1; x++) walls[IDX(x, sy)] = true;
      const gx = int(rng, box.x0, box.x1);
      walls[IDX(gx, sy)] = false;
      queue.push({ x0: box.x0, y0: box.y0, x1: box.x1, y1: sy - 1 }, { x0: box.x0, y0: sy + 1, x1: box.x1, y1: box.y1 });
      gaps.push({ at: IDX(gx, sy), a: -1, b: -1 });
    }
  }
  finalBoxes.forEach((b, id) => rooms.push({ id, ...b, tiles: rect(b.x0, b.y0, b.x1, b.y1) }));
  // A gap in a wall line may have been overwritten by a later perpendicular wall
  // line; re-open it and drop gaps that no longer separate two rooms.
  const roomAt = (i: number): number => {
    const { x, y } = XY(i);
    const r = rooms.find(rm => x >= rm.x0 && x <= rm.x1 && y >= rm.y0 && y <= rm.y1);
    return r ? r.id : -1;
  };
  const fixed: Gap[] = [];
  for (const g of gaps) {
    walls[g.at] = false;
    const sides = neighbours(g.at).map(roomAt).filter(r => r >= 0);
    const uniq = [...new Set(sides)];
    if (uniq.length === 2) fixed.push({ at: g.at, a: uniq[0], b: uniq[1] });
    else if (uniq.length > 2) {
      // Gap at a junction: keep the first two, the layout is still connected.
      fixed.push({ at: g.at, a: uniq[0], b: uniq[1] });
    }
  }
  return { archetype: 'rooms', walls, rooms, gaps: fixed };
}

/** Punch extra openings between adjacent rooms to create cycles. */
function addOpenings(rng: Rng, lay: Layout, count: number): void {
  const candidates: { at: number; a: number; b: number }[] = [];
  for (let i = 0; i < N; i++) {
    if (!lay.walls[i]) continue;
    const { x, y } = XY(i);
    const roomOf = (xx: number, yy: number) => {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return -1;
      const j = IDX(xx, yy);
      if (lay.walls[j]) return -1;
      const r = lay.rooms.find(rm => xx >= rm.x0 && xx <= rm.x1 && yy >= rm.y0 && yy <= rm.y1);
      return r ? r.id : -1;
    };
    const l = roomOf(x - 1, y), r = roomOf(x + 1, y), u = roomOf(x, y - 1), d = roomOf(x, y + 1);
    if (l >= 0 && r >= 0 && l !== r) candidates.push({ at: i, a: l, b: r });
    else if (u >= 0 && d >= 0 && u !== d) candidates.push({ at: i, a: u, b: d });
  }
  shuffle(rng, candidates);
  let made = 0;
  for (const c of candidates) {
    if (made >= count) break;
    if (lay.gaps.some(g => (g.a === c.a && g.b === c.b) || (g.a === c.b && g.b === c.a))) continue;
    lay.walls[c.at] = false;
    lay.gaps.push(c);
    made++;
  }
}

function cavern(rng: Rng): Layout {
  // Cellular automata, then keep the largest component and treat it as one room.
  let open = new Array<boolean>(N).fill(false);
  for (let i = 0; i < N; i++) open[i] = chance(rng, 0.62);
  for (let it = 0; it < 3; it++) {
    const next = open.slice();
    for (let i = 0; i < N; i++) {
      const { x, y } = XY(i);
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) n += 0; // edges count as open (map is bounded anyway)
          else if (open[IDX(xx, yy)]) n++;
        }
      next[i] = open[i] ? n >= 3 : n >= 5;
    }
    open = next;
  }
  // Largest component.
  let bestSeen: boolean[] | null = null;
  let bestCount = 0;
  const visited = new Array<boolean>(N).fill(false);
  for (let i = 0; i < N; i++) {
    if (!open[i] || visited[i]) continue;
    const seen = floodOpen(open, i);
    let c = 0;
    for (let j = 0; j < N; j++) if (seen[j]) { visited[j] = true; c++; }
    if (c > bestCount) { bestCount = c; bestSeen = seen; }
  }
  const walls = emptyWalls();
  const tiles: number[] = [];
  for (let i = 0; i < N; i++) {
    walls[i] = !(bestSeen && bestSeen[i]);
    if (!walls[i]) tiles.push(i);
  }
  return { archetype: 'cavern', walls, rooms: [{ id: 0, x0: 0, y0: 0, x1: W - 1, y1: H - 1, tiles }], gaps: [] };
}

function spiral(rng: Rng): Layout {
  // Concentric wall rings with one gap each, alternating sides → a spiral corridor of rooms.
  const walls = emptyWalls();
  const rooms: Room[] = [];
  const gaps: Gap[] = [];
  let id = 0;
  // ring at inset 1 (x=1..9), inset 3 (x=3..7)
  const insets = [1, 3];
  const prevTiles: number[] = [];
  for (const k of insets) {
    for (let x = k; x <= W - 1 - k; x++) { walls[IDX(x, k)] = true; walls[IDX(x, H - 1 - k)] = true; }
    for (let y = k; y <= H - 1 - k; y++) { walls[IDX(k, y)] = true; walls[IDX(W - 1 - k, y)] = true; }
  }
  // gaps
  const side = int(rng, 0, 3);
  const g1 = side === 0 ? IDX(int(rng, 2, 8), 1) : side === 1 ? IDX(9, int(rng, 2, 8)) : side === 2 ? IDX(int(rng, 2, 8), 9) : IDX(1, int(rng, 2, 8));
  const side2 = (side + 2) % 4;
  const g2 = side2 === 0 ? IDX(int(rng, 4, 6), 3) : side2 === 1 ? IDX(7, int(rng, 4, 6)) : side2 === 2 ? IDX(int(rng, 4, 6), 7) : IDX(3, int(rng, 4, 6));
  walls[g1] = false;
  walls[g2] = false;
  const ringTiles = (outer: number, inner: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < N; i++) {
      const { x, y } = XY(i);
      const d = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (d >= outer && d < inner && !walls[i]) out.push(i);
    }
    return out;
  };
  const outerRoom = { id: id++, x0: 0, y0: 0, x1: W - 1, y1: H - 1, tiles: ringTiles(0, 1) };
  const midRoom = { id: id++, x0: 2, y0: 2, x1: W - 3, y1: H - 3, tiles: ringTiles(2, 3) };
  const centre = { id: id++, x0: 4, y0: 4, x1: W - 5, y1: H - 5, tiles: rect(4, 4, 6, 6) };
  rooms.push(outerRoom, midRoom, centre);
  gaps.push({ at: g1, a: outerRoom.id, b: midRoom.id }, { at: g2, a: midRoom.id, b: centre.id });
  void prevTiles;
  return { archetype: 'spiral', walls, rooms, gaps };
}

function ring(rng: Rng): Layout {
  // A solid centre block with a corridor ring and four corner rooms behind walls with one gap each.
  const walls = emptyWalls();
  for (const i of rect(4, 4, 6, 6)) walls[i] = true;
  // corner rooms 3x3 at (0..2,0..2) etc. separated by wall lines at x=3 / y=3 …
  const corners = [
    { x0: 0, y0: 0, x1: 2, y1: 2 },
    { x0: 8, y0: 0, x1: 10, y1: 2 },
    { x0: 0, y0: 8, x1: 2, y1: 10 },
    { x0: 8, y0: 8, x1: 10, y1: 10 },
  ];
  const rooms: Room[] = [];
  const gaps: Gap[] = [];
  const ringTiles: number[] = [];
  corners.forEach((c, k) => {
    // wall the two inner sides
    const vx = c.x0 === 0 ? 3 : 7;
    const hy = c.y0 === 0 ? 3 : 7;
    for (let y = c.y0; y <= c.y1; y++) walls[IDX(vx, y)] = true;
    for (let x = c.x0; x <= c.x1; x++) walls[IDX(x, hy)] = true;
    const gapOnV = chance(rng, 0.5);
    const g = gapOnV ? IDX(vx, int(rng, c.y0, c.y1)) : IDX(int(rng, c.x0, c.x1), hy);
    walls[g] = false;
    rooms.push({ id: k, ...c, tiles: rect(c.x0, c.y0, c.x1, c.y1) });
    gaps.push({ at: g, a: k, b: 4 });
  });
  for (let i = 0; i < N; i++) {
    if (walls[i]) continue;
    const inCorner = rooms.some(r => r.tiles.includes(i));
    if (!inCorner) ringTiles.push(i);
  }
  rooms.push({ id: 4, x0: 0, y0: 0, x1: W - 1, y1: H - 1, tiles: ringTiles });
  return { archetype: 'ring', walls, rooms, gaps };
}

function arena(rng: Rng): Layout {
  // Open floor with a few pillars; one room.
  const walls = emptyWalls();
  const pillars = int(rng, 4, 8);
  for (let k = 0; k < pillars; k++) {
    const x = int(rng, 1, W - 2);
    const y = int(rng, 1, H - 2);
    if ((x + y) % 2 === 0) walls[IDX(x, y)] = true;
  }
  const tiles: number[] = [];
  for (let i = 0; i < N; i++) if (!walls[i]) tiles.push(i);
  return { archetype: 'arena', walls, rooms: [{ id: 0, x0: 0, y0: 0, x1: W - 1, y1: H - 1, tiles }], gaps: [] };
}

export function carve(rng: Rng, archetype: Archetype): Layout {
  switch (archetype) {
    case 'rooms': {
      const lay = bsp(rng, 2, int(rng, 6, 9));
      lay.archetype = 'rooms';
      addOpenings(rng, lay, int(rng, 0, 2));
      return lay;
    }
    case 'halls': {
      const lay = bsp(rng, 3, int(rng, 3, 5));
      lay.archetype = 'halls';
      addOpenings(rng, lay, int(rng, 0, 1));
      return lay;
    }
    case 'maze': {
      const lay = bsp(rng, 2, 12);
      lay.archetype = 'maze';
      addOpenings(rng, lay, int(rng, 1, 3));
      return lay;
    }
    case 'cavern':
      return cavern(rng);
    case 'spiral':
      return spiral(rng);
    case 'ring':
      return ring(rng);
    case 'arena':
      return arena(rng);
  }
}

/** Mirror a layout left↔right (loop 5 "Mirror Realm"). */
export function mirrorLayout(lay: Layout): Layout {
  const mx = (i: number) => {
    const { x, y } = XY(i);
    return IDX(W - 1 - x, y);
  };
  const walls = emptyWalls();
  for (let i = 0; i < N; i++) walls[mx(i)] = lay.walls[i];
  return {
    archetype: lay.archetype,
    walls,
    rooms: lay.rooms.map(r => ({ ...r, x0: W - 1 - r.x1, x1: W - 1 - r.x0, tiles: r.tiles.map(mx) })),
    gaps: lay.gaps.map(g => ({ ...g, at: mx(g.at) })),
  };
}

/** Room adjacency as a tree/graph over gaps; returns the room ids reachable from `root` without crossing `blocked` gaps. */
export function roomsBehind(lay: Layout, root: number, blocked: Set<number>): Set<number> {
  const seen = new Set<number>([root]);
  const q = [root];
  while (q.length) {
    const r = q.shift()!;
    for (const g of lay.gaps) {
      if (blocked.has(g.at)) continue;
      const other = g.a === r ? g.b : g.b === r ? g.a : -1;
      if (other >= 0 && !seen.has(other)) {
        seen.add(other);
        q.push(other);
      }
    }
  }
  return seen;
}

/**
 * Wing candidates: for each gap, the set of rooms cut off from `homeRoom`
 * when that gap is blocked (only when the gap is a true bridge).
 */
export function wingCandidates(lay: Layout, homeRoom: number): { gap: Gap; rooms: number[]; tiles: number[] }[] {
  const out: { gap: Gap; rooms: number[]; tiles: number[] }[] = [];
  const all = roomsBehind(lay, homeRoom, new Set());
  for (const g of lay.gaps) {
    const withBlock = roomsBehind(lay, homeRoom, new Set([g.at]));
    if (withBlock.size === all.size) continue; // not a bridge
    const cut = [...all].filter(r => !withBlock.has(r));
    const tiles = cut.flatMap(r => lay.rooms[r].tiles);
    out.push({ gap: g, rooms: cut, tiles });
  }
  return out;
}

export function roomOfTile(lay: Layout, i: number): number {
  const { x, y } = XY(i);
  for (const r of lay.rooms) {
    if (r.tiles.includes(i)) return r.id;
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && !lay.walls[i] && r.tiles.length === 0) return r.id;
  }
  return -1;
}

export function randomArchetype(rng: Rng, basement: boolean): Archetype {
  if (basement) return pick(rng, ['cavern', 'cavern', 'rooms', 'maze'] as Archetype[]);
  return pick(rng, ['rooms', 'rooms', 'halls', 'maze', 'spiral', 'ring'] as Archetype[]);
}
