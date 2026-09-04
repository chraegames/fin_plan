// Tower generator. Structure first (layout → wings/pockets/vaults → item and
// placeholder monster placement), then a scripted walk of the zone's intended
// line over ZoneSim during which every monster on the line is back-solved
// from the hero's stats *at that moment* and the target cost. Survival of the
// intended line is therefore true by construction; the solver and the naive
// policies (run by the caller) measure how hard and how non-obvious it is.

import { getDamageInfo, type FightCtx } from './combat';
import {
  START_HERO, bluePotion, cloneHero, equipValue, gemValue, healingBudget, monsterCount, redPotion, slackTarget, zoneTier,
} from './curves';
import { carve, mirrorLayout, randomArchetype, wingCandidates, type Layout } from './layout';
import { floorDir, floorLabel, hatchSource, loopDef, type LoopDef } from './loops';
import { BOSSES, candidates, monsterDef, tierOfFloor } from './monsters';
import { EMPTY_STATE, floodOpen, reach } from './path';
import { chance, createRng, hashSeed, int, pick, shuffle, type Rng } from './rng';
import {
  FLOORS, GEN_VERSION, N, T, XY, IDX, ZONES, inBounds, neighbours, zoneOf,
  type Ability, type Floor, type Hero, type Item, type KeyColor, type MonsterInst, type MonsterRole, type PerkId, type TemplateInstance, type Tower, type ZoneInfo, type TileBase,
} from './types';
import { ZoneSim } from './zonesim';
import { solveZone } from './solver';
import { holyWaterHeal, potionHeal } from './items';
import { draftPerks } from './perks';
import { replayZone } from './validate';
import { floorsOfZone } from './curves';

// ─── Plans (structure pass output) ──────────────────────────────────────

interface Unit {
  /** Tile of the lock (guard monster or door). */
  lock: number;
  kind: 'guard' | 'door';
  color?: KeyColor;
  /** Item tiles inside (for bookkeeping / templates). */
  contents: number[];
  /** Units nested inside this one (pockets inside a wing). */
  inner: Unit[];
  critical: boolean;
  /** For door units whose key is placed on a later floor (zone-relative index). */
  backtrackKeyFloor?: number;
  /** Cost weight relative to a plain line monster. */
  weight: number;
  /** Template tag for the generator's own bookkeeping. */
  tag?: 'gate' | 'justEnough' | 'sturdy' | 'magic' | 'boss';
}

interface FloorPlan {
  n: number;
  units: Unit[];
  /** Monsters not on the line (traps / optional EXP). */
  loose: number[];
  heroAtEntry?: Hero;
}

export interface GenOptions {
  onProgress?: (zone: number) => void;
  /** Max attempts per zone before giving up. */
  maxAttempts?: number;
}

export class GenerationError extends Error {}

/** Last reason a zone build/walk was abandoned (debugging aid for tests). */
export const genDebug = { reasons: [] as string[], calib: [] as string[] };
function fail(why: string): null {
  genDebug.reasons.push(why);
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function emptyFloor(n: number, loop: LoopDef, archetype: string, walls: boolean[]): Floor {
  const base: TileBase[] = walls.map(w => (w ? T.Wall : T.Floor));
  return {
    n,
    label: floorLabel(loop.topology, n),
    zone: zoneOf(n),
    archetype,
    base,
    entry: -1,
    exit: -1,
    mons: {},
    items: {},
    doors: {},
    npcs: {},
    wings: [],
    vaults: [],
    dir: floorDir(loop.topology, n),
  };
}

function openMask(f: Floor): boolean[] {
  return f.base.map(b => b !== T.Wall && b !== T.VaultWall);
}

/** Tiles reachable from `from` crossing no monsters/doors/npcs (current structure). */
function openRegion(f: Floor, from: number): boolean[] {
  const r = reach(f, EMPTY_STATE, from);
  return r.cost.map(c => c !== Infinity);
}

/** Would removing tile `i` disconnect the open tiles? */
function isChokepoint(f: Floor, i: number): boolean {
  const open = openMask(f);
  if (!open[i]) return false;
  open[i] = false;
  let from = -1;
  for (let j = 0; j < N; j++) if (open[j]) { from = j; break; }
  if (from < 0) return false;
  const seen = floodOpen(open, from);
  for (let j = 0; j < N; j++) if (open[j] && !seen[j]) return true;
  return false;
}

/** Dig wall neighbours of `i` until it is no longer a chokepoint (stairs must never split a floor). */
function unchoke(f: Floor, i: number): void {
  for (let k = 0; k < 4 && isChokepoint(f, i); k++) {
    const walls = neighbours(i).filter(j => f.base[j] === T.Wall);
    if (!walls.length) break;
    // Prefer the wall whose opening reconnects the most tiles.
    let best = walls[0];
    let bestCount = -1;
    for (const w of walls) {
      f.base[w] = T.Floor;
      const open = openMask(f);
      open[i] = false;
      const seen = floodOpen(open, w);
      const count = seen.filter(Boolean).length;
      f.base[w] = T.Wall;
      if (count > bestCount) { bestCount = count; best = w; }
    }
    f.base[best] = T.Floor;
  }
}

function isFree(f: Floor, i: number): boolean {
  return f.base[i] === T.Floor && !f.mons[i] && !f.items[i] && !f.doors[i] && !f.npcs[i] && i !== f.entry && i !== f.exit;
}

function abilitiesFor(rng: Rng, id: string, loop: LoopDef, onLine: boolean, hero: Hero, extra = 0): Ability[] {
  const def = monsterDef(id);
  const allowed = new Set(loop.abilities);
  const banned = new Set<Ability>(onLine ? ['invincible', 'selfDestruct'] : []);
  if (onLine && hero.atk <= hero.def + 10) banned.add('mimic');
  const pool = def.affinity.filter(a => allowed.has(a) && !banned.has(a));
  const out: Ability[] = [];
  for (const a of pool) if (chance(rng, 0.55)) out.push(a);
  if (extra > 0) {
    const more = shuffle(rng, loop.abilities.filter(a => !out.includes(a) && !banned.has(a) && a !== 'aura'));
    for (let k = 0; k < extra && k < more.length; k++) out.push(more[k]);
  }
  if (out.includes('hit3')) return out.filter(a => a !== 'hit2');
  return out;
}

function placeholder(rng: Rng, f: number, role: MonsterRole, loop: LoopDef, onLine: boolean, hero: Hero, elite: boolean): MonsterInst {
  const def = pick(rng, candidates(f, role));
  const abilities = abilitiesFor(rng, def.id, loop, onLine, hero, elite ? int(rng, 1, loop.flags.eliteAffixes) : 0);
  return { id: def.id, hp: 0, atk: 0, def: 0, gold: 0, exp: 0, abilities, role, elite: elite || undefined };
}

/**
 * Back-solve a monster's HP/ATK/DEF so that fighting it now costs ≈ target HP.
 * Mutates `m`. Always leaves the fight winnable with `hero.hp - target > 0`.
 */
export function statMonster(rng: Rng, m: MonsterInst, hero: Hero, target: number, f: number, loopMultV: number, ctx: FightCtx = {}): void {
  const has = (a: Ability) => m.abilities.includes(a);
  const reserve = Math.max(40, Math.floor(hero.hp * 0.05));
  target = Math.max(0, Math.min(target, hero.hp - reserve));
  // Rounds by role.
  let r = m.role === 'trash' ? int(rng, 2, 4) : m.role === 'hpWall' ? int(rng, 6, 10) : m.role === 'atkWall' ? int(rng, 2, 3) : m.role === 'burst' ? int(rng, 2, 3) : int(rng, 6, 10);
  if (has('sturdy')) r = Math.min(r, Math.max(2, Math.floor(target / Math.max(1, hero.def / 4 + 1))));
  // Damage per hero hit: atkWall keeps mDEF just under ATK (a breakpoint gate);
  // bosses sit at 60–75% of ATK so a weaker hero can still fight, at a price.
  let d: number;
  if (has('sturdy')) d = 1;
  else if (m.role === 'atkWall') d = int(rng, 1, Math.max(1, Math.floor(hero.atk * 0.12)));
  else if (m.role === 'boss') d = Math.max(1, Math.floor(hero.atk * (0.25 + rng() * 0.15)));
  else d = Math.max(1, Math.floor(hero.atk * (0.3 + rng() * 0.45)));
  if (has('mimic')) d = Math.max(1, hero.atk - hero.def);
  m.def = has('mimic') ? hero.def : has('sturdy') ? Math.max(0, hero.atk - int(rng, 1, 3)) : Math.max(0, hero.atk - d);
  m.hp = has('sturdy') ? r : Math.max(1, d * r - int(rng, 0, Math.max(0, d - 1)));
  // Pre-battle damage share.
  let init = 0;
  if (has('vamp')) {
    m.vampPct = Math.min(0.3, Math.max(0.05, Math.round((target * 0.4) / Math.max(1, hero.hp) * 100) / 100));
    init += Math.floor(hero.hp * m.vampPct);
  }
  if (has('armorBreak')) init += Math.floor(0.9 * hero.def);
  if (has('fixed')) {
    m.fixedDmg = Math.max(10, Math.floor(target * 0.3));
    init += m.fixedDmg;
  }
  if (has('purify')) init += 3 * hero.shield;
  if (has('zone')) m.zoneDmg = Math.max(5, Math.floor(target * 0.08));
  if (has('aura')) m.auraPct = 0.2;
  // Hits the monster lands.
  const monsterTurns = r - 1 + (has('first') ? 1 : 0);
  const mult = has('hit3') ? 3 : has('hit2') ? 2 : 1;
  const effDef = has('magic') ? Math.max(0, 0 - hero.shield) : hero.def;
  let hit = monsterTurns > 0 ? Math.max(0, target - init) / monsterTurns : 0;
  hit = Math.max(0, hit - (has('counter') ? Math.floor(0.1 * hero.atk) : 0)) / mult;
  m.atk = has('mimic') ? hero.atk : Math.max(1, Math.round(effDef + hit));
  if (has('magic')) m.atk = Math.max(1, Math.round(hit + hero.shield));
  // Rewards from cost + floor; elites triple.
  const scale = m.elite ? 3 : 1;
  m.gold = Math.round((target / 12 + 2 + f / 4) * scale);
  m.exp = Math.round((target / 15 + 1 + f / 5) * scale);
  // Loop multiplier only makes the monster tougher against *other* heroes: keep
  // the intended cost by applying it to HP/DEF (rounds up) and re-checking.
  void loopMultV;
  // Verify and nudge so the fight is winnable and not above target.
  for (let k = 0; k < 12; k++) {
    const info = getDamageInfo(hero, m, ctx);
    if (info.damage == null) {
      m.def = Math.max(0, m.def - Math.max(1, Math.ceil(hero.atk * 0.1)));
      if (m.def === 0 && hero.atk <= 0) break;
      continue;
    }
    if (info.damage > target && info.damage >= hero.hp - reserve) {
      // too strong: lower its ATK (or HP for sturdy)
      if (has('sturdy') || has('mimic')) m.hp = Math.max(1, Math.floor(m.hp * 0.8));
      else m.atk = Math.max(1, Math.floor(m.atk * 0.9));
      continue;
    }
    break;
  }
}

// ─── Structure pass ─────────────────────────────────────────────────────

interface StructureCtx {
  rng: Rng;
  loop: LoopDef;
  tower: Tower;
  zone: number;
  hero: Hero; // hero at zone entry (for ability gating)
}

/** Carve a wall-free straight pocket of `len` tiles from `from` in direction dir (returns tiles or null). */
function carvePocket(f: Floor, mouth: number, len: number): number[] | null {
  const { x, y } = XY(mouth);
  const dirs = shuffleDirs(x, y);
  for (const [dx, dy] of dirs) {
    const tiles: number[] = [];
    let ok = true;
    for (let k = 1; k <= len; k++) {
      const nx = x + dx * k, ny = y + dy * k;
      if (!inBounds(nx, ny)) { ok = false; break; }
      const i = IDX(nx, ny);
      if (!isFree(f, i)) { ok = false; break; }
      tiles.push(i);
    }
    if (!ok) continue;
    // Wall off every neighbour of the pocket tiles except the chain itself and the mouth.
    const chain = new Set([mouth, ...tiles]);
    const toWall: number[] = [];
    for (const t of tiles) for (const n of neighbours(t)) if (!chain.has(n)) toWall.push(n);
    if (toWall.some(n => !isFree(f, n) && f.base[n] !== T.Wall)) continue;
    const backup = toWall.map(n => f.base[n]);
    for (const n of toWall) f.base[n] = T.Wall;
    // Connectivity of the rest must hold.
    const open = openMask(f);
    const seen = floodOpen(open, f.entry);
    let connected = true;
    for (let i = 0; i < N; i++) if (open[i] && !seen[i]) { connected = false; break; }
    if (!connected) {
      toWall.forEach((n, k) => (f.base[n] = backup[k]));
      continue;
    }
    return tiles;
  }
  return null;
}

function shuffleDirs(x: number, y: number): [number, number][] {
  const d: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // deterministic order by position parity so the rng stream isn't consumed here
  const k = (x + y) % 4;
  return [...d.slice(k), ...d.slice(0, k)];
}

function farTiles(f: Floor, from: number, minSteps: number): number[] {
  const r = reach(f, EMPTY_STATE, from);
  const out: number[] = [];
  let best = 0;
  for (let i = 0; i < N; i++) if (r.steps[i] !== Infinity) best = Math.max(best, r.steps[i]);
  const th = Math.min(minSteps, Math.max(4, best - 2));
  for (let i = 0; i < N; i++) if (r.steps[i] !== Infinity && r.steps[i] >= th && i !== from) out.push(i);
  return out;
}

function tryVault(ctx: StructureCtx, f: Floor, prev: Floor | null): boolean {
  if (!prev) return false;
  const spots: number[] = [];
  for (let y = 1; y < 10; y++)
    for (let x = 1; x < 10; x++) {
      const c = IDX(x, y);
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const i = IDX(x + dx, y + dy);
          if (!isFree(f, i)) { ok = false; break; }
        }
      if (!ok) continue;
      // aligned tile on the previous floor must be plain open floor, not a vault / door / npc / stairs
      if (prev.base[c] !== T.Floor || prev.doors[c] || prev.npcs[c] || prev.vaults.includes(c) || prev.mons[c]) continue;
      spots.push(c);
    }
  shuffle(ctx.rng, spots);
  for (const c of spots) {
    const { x, y } = XY(c);
    const ring: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ring.push(IDX(x + dx, y + dy));
    const backup = ring.map(i => f.base[i]);
    for (const i of ring) f.base[i] = T.VaultWall;
    const open = openMask(f);
    open[c] = false;
    const seen = floodOpen(open, f.entry);
    let connected = true;
    for (let i = 0; i < N; i++) if (open[i] && !seen[i]) { connected = false; break; }
    if (!connected || !seen[f.exit]) {
      ring.forEach((i, k) => (f.base[i] = backup[k]));
      continue;
    }
    f.base[c] = T.VaultWall;
    f.vaults.push(c);
    return true;
  }
  return false;
}

function vaultItem(ctx: StructureCtx, f: number): Item {
  const flags = ctx.loop.flags;
  const roll = ctx.rng();
  if (flags.cross && ctx.zone === 0 && !ctx.tower.floors.some(x => x && Object.values(x.items).some(it => it.kind === 'cross'))) return { kind: 'cross', value: 0, vault: true };
  if (flags.equipment && roll < 0.35) return { kind: chance(ctx.rng, 0.5) ? 'sword' : 'shield', value: equipValue(f), vault: true };
  if (roll < 0.5) return { kind: 'stone', value: 1, vault: true };
  if (roll < 0.7) return { kind: 'rKey', value: 0, vault: true };
  return { kind: chance(ctx.rng, 0.5) ? 'atkGem' : 'defGem', value: gemValue(f) * 3, vault: true };
}

/** Build one floor's structure: returns the floor and its plan. */
function buildFloor(ctx: StructureCtx, n: number, prev: Floor | null, entryAt: number | null, mirrorOf: Layout | null): { floor: Floor; plan: FloorPlan; layout: Layout } {
  const { rng, loop } = ctx;
  const boss = n % 10 === 0 || n === FLOORS;
  const basement = floorDir(loop.topology, n) === -1;
  const archetype = boss ? 'arena' : randomArchetype(rng, basement);
  const layout = mirrorOf ? mirrorLayout(mirrorOf) : carve(rng, archetype);
  const f = emptyFloor(n, loop, layout.archetype, layout.walls);

  // Entry: aligned with the previous exit (or hatch); carve if it landed in a wall.
  let entry = entryAt ?? IDX(int(rng, 0, 10), 10);
  if (f.base[entry] === T.Wall) f.base[entry] = T.Floor;
  f.entry = entry;
  // Make sure the entry is connected to the largest open area.
  {
    const open = openMask(f);
    let seen = floodOpen(open, entry);
    let count = seen.filter(Boolean).length;
    if (count < 40) {
      // dig towards the centre until connected to enough tiles
      const { x, y } = XY(entry);
      let cx = x, cy = y;
      for (let k = 0; k < 12 && count < 40; k++) {
        cx += Math.sign(5 - cx);
        cy += Math.sign(5 - cy);
        const i = IDX(cx, cy);
        f.base[i] = T.Floor;
        seen = floodOpen(openMask(f), entry);
        count = seen.filter(Boolean).length;
      }
    }
    // isolate stray pockets: wall off open tiles not reachable from entry
    const open2 = openMask(f);
    const seen2 = floodOpen(open2, entry);
    for (let i = 0; i < N; i++) if (open2[i] && !seen2[i]) f.base[i] = T.Wall;
  }
  entry = f.entry;
  unchoke(f, entry);

  // Exit: far from the entry.
  const far = farTiles(f, entry, boss ? 8 : 10).filter(i => !isChokepoint(f, i));
  if (far.length === 0) throw new GenerationError('no exit candidates');
  f.exit = pick(rng, far);
  f.base[f.exit] = f.dir === 1 ? T.StairUp : T.StairDown;
  f.base[entry] = n === 1 ? T.Floor : f.dir === 1 ? T.StairDown : T.StairUp;
  if (entryAt != null && prev && prev.hatch && prev.hatch.at === entryAt) f.base[entry] = T.Floor;

  const plan: FloorPlan = { n, units: [], loose: [] };
  const tier = tierOfFloor(n);
  void tier;

  if (boss) {
    buildBossFloor(ctx, f, plan);
    return { floor: f, plan, layout };
  }

  // Wings from bridge gaps (rooms cut off from the entry's room).
  const homeRoom = layout.rooms.find(r => r.tiles.includes(entry))?.id ?? layout.rooms[0].id;
  let wings = wingCandidates(layout, homeRoom).filter(w => !w.tiles.includes(entry) && w.tiles.length >= 3 && w.tiles.length <= 30 && f.base[w.gap.at] === T.Floor);
  // Prefer smaller wings; keep at most 3, non-nested (drop wings that contain another wing's gap).
  wings.sort((a, b) => a.tiles.length - b.tiles.length);
  const chosen: typeof wings = [];
  for (const w of wings) {
    if (chosen.length >= 3) break;
    if (chosen.some(c => c.tiles.includes(w.gap.at) || w.tiles.includes(c.gap.at))) continue;
    chosen.push(w);
  }
  wings = chosen;

  const critical = wings.filter(w => w.tiles.includes(f.exit));
  const optional = wings.filter(w => !w.tiles.includes(f.exit));

  // Vault (from zone 1, ~40% of floors).
  if (ctx.zone >= 1 && chance(rng, 0.4)) {
    if (tryVault(ctx, f, prev)) f.items[f.vaults[0]] = vaultItem(ctx, n);
  }

  // Doors/guards on wings.
  const zoneFloors = floorsOfZone(ctx.zone);
  const zi = zoneFloors.indexOf(n);
  for (const w of critical) {
    const useDoor = chance(rng, 0.45);
    if (useDoor) {
      f.doors[w.gap.at] = 'y';
      plan.units.push({ lock: w.gap.at, kind: 'door', color: 'y', contents: [], inner: [], critical: true, weight: 1 });
    } else {
      f.mons[w.gap.at] = placeholder(rng, n, pick(rng, ['trash', 'hpWall', 'burst'] as MonsterRole[]), loop, true, ctx.hero, false);
      plan.units.push({ lock: w.gap.at, kind: 'guard', contents: [], inner: [], critical: true, weight: 2.5 });
    }
    f.wings.push({ tiles: w.tiles, lock: w.gap.at, lockKind: useDoor ? 'door' : 'guard' });
  }
  for (const w of optional) {
    const roll = rng();
    if (roll < 0.35) {
      f.mons[w.gap.at] = placeholder(rng, n, pick(rng, ['hpWall', 'atkWall', 'burst'] as MonsterRole[]), loop, true, ctx.hero, loop.flags.elites && chance(rng, 0.25));
      plan.units.push({ lock: w.gap.at, kind: 'guard', contents: [], inner: [], critical: false, weight: 1.4 });
      f.wings.push({ tiles: w.tiles, lock: w.gap.at, lockKind: 'guard' });
    } else if (roll < 0.75) {
      f.doors[w.gap.at] = 'y';
      plan.units.push({ lock: w.gap.at, kind: 'door', color: 'y', contents: [], inner: [], critical: false, weight: 1 });
      f.wings.push({ tiles: w.tiles, lock: w.gap.at, lockKind: 'door' });
    } else {
      // Blue/red door: key comes from a later floor of the zone (backtrack) when possible.
      const color: KeyColor = ctx.zone >= 1 && chance(rng, 0.3) ? 'r' : 'b';
      f.doors[w.gap.at] = color;
      const later = zi + int(rng, 1, 2);
      const unit: Unit = { lock: w.gap.at, kind: 'door', color, contents: [], inner: [], critical: false, weight: 1 };
      if (later < zoneFloors.length - 1) unit.backtrackKeyFloor = later;
      plan.units.push(unit);
      f.wings.push({ tiles: w.tiles, lock: w.gap.at, lockKind: 'door' });
    }
  }

  // Items. Budget: healing on the floor; gems; keys.
  const budget = healingBudget(n, loop.n);
  const red = redPotion(n, loop.n);
  const blue = bluePotion(n, loop.n);
  const items: Item[] = [];
  let placedHeal = 0;
  while (placedHeal + red <= budget) {
    if (budget - placedHeal >= blue && chance(rng, 0.35)) { items.push({ kind: 'bluePotion', value: blue }); placedHeal += blue; }
    else { items.push({ kind: 'redPotion', value: red }); placedHeal += red; }
    if (items.length > 7) break;
  }
  const gv = gemValue(n);
  items.push({ kind: 'atkGem', value: gv }, { kind: 'defGem', value: gv });
  if (n % 3 === 0) items.push({ kind: 'defGem', value: gv });
  if (loop.flags.holyWater && chance(rng, 0.3)) items.push({ kind: 'holyWater', value: 0 });
  // Keys: yellow keys ≥ yellow doors on the critical path + some spare.
  const yDoors = Object.values(f.doors).filter(c => c === 'y').length;
  const critYDoors = plan.units.filter(u => u.critical && u.kind === 'door').length;
  const yKeys = Math.max(critYDoors, Math.min(yDoors, critYDoors + (chance(rng, 0.6) ? 1 : 0))) + (chance(rng, 0.35) ? 1 : 0);
  for (let k = 0; k < yKeys; k++) items.push({ kind: 'yKey', value: 0 });
  if (zi % 3 === 1 && chance(rng, 0.7)) items.push({ kind: 'bKey', value: 0 });
  if (loop.flags.pickaxe && chance(rng, 0.12)) items.push({ kind: 'pickaxe', value: 0 });
  if (loop.flags.bombs && chance(rng, 0.12)) items.push({ kind: 'bomb', value: 0 });
  if (loop.flags.shieldAmulet && chance(rng, 0.1)) items.push({ kind: 'shieldAmulet', value: 2 + Math.floor(n / 10) });

  // Placement: the critical keys go in the open region, gems mostly behind
  // guards (pockets) or inside wings, potions mostly open.
  const region = openRegion(f, entry); // before any locks are placed the region is everything; locks now exist
  const openTiles: number[] = [];
  for (let i = 0; i < N; i++) if (region[i] && isFree(f, i)) openTiles.push(i);
  shuffle(rng, openTiles);
  const wingTiles = (w: { tiles: number[] }) => shuffle(rng, w.tiles.filter(i => isFree(f, i)));
  const critKeys = items.filter(i => i.kind === 'yKey').slice(0, Math.max(critYDoors, 1));
  const rest = items.filter(i => !critKeys.includes(i));
  for (const k of critKeys) {
    const t = openTiles.pop();
    if (t == null) break;
    f.items[t] = k;
  }
  // Pockets: gems get a guard in front of them (breakpoint gate material).
  const gemItems = rest.filter(i => i.kind === 'atkGem' || i.kind === 'defGem');
  const others = rest.filter(i => !gemItems.includes(i));
  let pockets = 0;
  for (const g of gemItems) {
    let placed = false;
    if (pockets < 3 && chance(rng, 0.7)) {
      // find a mouth tile in the open region with a free straight pocket behind it
      for (let tries = 0; tries < 8 && !placed; tries++) {
        const mouth = openTiles[int(rng, 0, Math.max(0, openTiles.length - 1))];
        if (mouth == null || !isFree(f, mouth)) continue;
        const tiles = carvePocket(f, mouth, 1);
        if (!tiles) continue;
        const guardRole: MonsterRole = pick(rng, ['trash', 'hpWall', 'atkWall', 'burst']);
        f.mons[mouth] = placeholder(rng, n, guardRole, loop, true, ctx.hero, loop.flags.elites && chance(rng, 0.15));
        f.items[tiles[0]] = g;
        plan.units.push({ lock: mouth, kind: 'guard', contents: [tiles[0]], inner: [], critical: false, weight: 1, tag: 'gate' });
        openTiles.splice(openTiles.indexOf(mouth), 1);
        pockets++;
        placed = true;
      }
    }
    if (!placed) {
      // inside a wing if any, else open
      const w = f.wings.length ? pick(rng, f.wings) : null;
      const cand = w ? wingTiles(w) : [];
      const t = cand.length ? cand[0] : openTiles.pop();
      if (t != null) f.items[t] = g;
    }
  }
  // Wing contents: potions / keys / holy water.
  for (const it of others) {
    const putInWing = f.wings.length > 0 && (it.kind === 'bluePotion' || it.kind === 'bKey' || it.kind === 'holyWater' || chance(rng, 0.5));
    let t: number | undefined;
    if (putInWing) {
      const w = pick(rng, f.wings);
      const cand = wingTiles(w);
      t = cand[0];
    }
    if (t == null) t = openTiles.pop();
    if (t != null) f.items[t] = it;
  }
  // Record wing contents in units.
  for (const u of plan.units) {
    const w = f.wings.find(x => x.lock === u.lock);
    if (w) u.contents = w.tiles.filter(i => !!f.items[i]);
  }

  // Loose monsters (traps / optional EXP) in the open region. Invariant: a
  // loose monster is never a chokepoint — with all loose monsters treated as
  // walls, every non-wall tile must stay connected to the entry.
  const [lo, hi] = monsterCount(n);
  const want = int(rng, lo, hi) - Object.keys(f.mons).length;
  const remaining = openTiles.filter(i => isFree(f, i));
  const looseOk = (): boolean => {
    const open = openMask(f);
    for (const t of plan.loose) open[t] = false;
    const seen = floodOpen(open, entry);
    for (let i = 0; i < N; i++) if (open[i] && !seen[i]) return false;
    return true;
  };
  for (let k = 0; k < want && remaining.length; ) {
    const t = remaining.pop()!;
    if (!isFree(f, t)) continue;
    const m = placeholder(rng, n, pick(rng, ['trash', 'trash', 'hpWall', 'burst', 'atkWall'] as MonsterRole[]), loop, false, ctx.hero, loop.flags.elites && chance(rng, 0.1));
    f.mons[t] = m;
    plan.loose.push(t);
    if (!looseOk()) {
      delete f.mons[t];
      plan.loose.pop();
      continue;
    }
    k++;
  }

  // Shop every ~7 floors on a free open tile that doesn't block.
  if ((n % 7 === 3 || n % 7 === 6) && !loop.flags.tradePost) {
    const t = openTiles.find(i => isFree(f, i) && neighbours(i).filter(j => f.base[j] === T.Floor).length >= 3);
    if (t != null) f.npcs[t] = { kind: 'shop', tier: zoneTier(ctx.zone) };
  }

  // Order of units on the line: gates (gem pockets) first, then optional wings, critical last.
  const gates = plan.units.filter(u => u.tag === 'gate');
  const opt = plan.units.filter(u => !u.critical && u.tag !== 'gate');
  const crit = plan.units.filter(u => u.critical);
  plan.units = [...shuffle(rng, gates), ...shuffle(rng, opt), ...crit];
  return { floor: f, plan, layout };
}

function buildBossFloor(ctx: StructureCtx, f: Floor, plan: FloorPlan): void {
  const { rng, loop } = ctx;
  const n = f.n;
  const final = n === FLOORS;
  // Exit pocket: exit + 2 drop tiles + mouth (boss) — carve a straight line ending at the exit.
  const { x, y } = XY(f.exit);
  let made = false;
  for (const [dx, dy] of shuffleDirs(x, y)) {
    const chain: number[] = [];
    let ok = true;
    for (let k = 1; k <= 3; k++) {
      const nx = x + dx * k, ny = y + dy * k;
      if (!inBounds(nx, ny)) { ok = false; break; }
      const i = IDX(nx, ny);
      if (i === f.entry) { ok = false; break; }
      chain.push(i);
    }
    if (!ok) continue;
    const all = new Set([f.exit, ...chain]);
    const backup = f.base.slice();
    for (const t of chain) f.base[t] = T.Floor;
    for (const t of [f.exit, chain[0], chain[1]]) for (const nb of neighbours(t)) if (!all.has(nb)) f.base[nb] = T.Wall;
    const open = openMask(f);
    const seen = floodOpen(open, f.entry);
    let connected = true;
    for (let i = 0; i < N; i++) if (open[i] && !seen[i]) { connected = false; break; }
    if (!connected) { f.base = backup; continue; }
    // boss at the mouth (chain[2]), drops on chain[1] and chain[0]
    const bossDef = BOSSES[Math.min(BOSSES.length - 1, ctx.zone)];
    const abilities = abilitiesFor(rng, bossDef.id, loop, true, ctx.hero, 0);
    const m: MonsterInst = { id: bossDef.id, hp: 0, atk: 0, def: 0, gold: 0, exp: 0, abilities, role: 'boss', boss: final ? 'final' : 'zone' };
    f.mons[chain[2]] = m;
    f.items[chain[1]] = { kind: 'stone', value: 1, bossDrop: true };
    if (ctx.zone === 0) f.items[chain[0]] = { kind: 'teleporter', value: 0 };
    else f.items[chain[0]] = { kind: chance(rng, 0.5) ? 'atkGem' : 'defGem', value: gemValue(n) * 2 };
    plan.units.push({ lock: chain[2], kind: 'guard', contents: [chain[0], chain[1]], inner: [], critical: true, weight: 0, tag: 'boss' });
    made = true;
    break;
  }
  if (!made) throw new GenerationError('boss pocket');
  // Pre-boss area: a couple of potions and one or two guards of pockets.
  const region = openRegion(f, f.entry);
  const openTiles: number[] = [];
  for (let i = 0; i < N; i++) if (region[i] && isFree(f, i)) openTiles.push(i);
  shuffle(rng, openTiles);
  const budget = healingBudget(n, loop.n);
  const blue = bluePotion(n, loop.n);
  let placed = 0;
  while (placed + blue <= budget && openTiles.length) {
    f.items[openTiles.pop()!] = { kind: 'bluePotion', value: blue };
    placed += blue;
  }
  f.items[openTiles.pop()!] = { kind: 'yKey', value: 0 };
  const guards = int(rng, 1, 2);
  for (let k = 0; k < guards && openTiles.length; k++) {
    const t = openTiles.pop()!;
    f.mons[t] = placeholder(rng, n, pick(rng, ['hpWall', 'burst', 'atkWall'] as MonsterRole[]), loop, false, ctx.hero, false);
    plan.loose.push(t);
  }
}

// ─── Zone generation ────────────────────────────────────────────────────

interface ZoneBuild {
  floors: Floor[];
  plans: FloorPlan[];
  info: ZoneInfo;
}

function buildZone(seed: number, loop: LoopDef, tower: Tower, zone: number, heroIn: Hero, attempt: number): ZoneBuild {
  const rng = createRng(hashSeed(seed, loop.n, zone, attempt, 0x5a));
  const ctx: StructureCtx = { rng, loop, tower, zone, hero: heroIn };
  const fl = floorsOfZone(zone);
  const floors: Floor[] = [];
  const plans: FloorPlan[] = [];
  let prev: Floor | null = zone > 0 ? tower.floors[fl[0] - 2] : null;
  let mirrorSrc: Layout | null = null;
  for (let k = 0; k < fl.length; k++) {
    const n = fl[k];
    const hs = hatchSource(loop.topology, n);
    let entryAt: number | null = null;
    if (hs != null) {
      const src = tower.floors[hs - 1] ?? floors.find(x => x.n === hs)!;
      if (!src.hatch) throw new GenerationError(`floor ${hs} has no hatch`);
      entryAt = src.hatch.at;
    } else if (prev) {
      entryAt = prev.exit;
    }
    const useMirror = loop.flags.mirror && n % 2 === 0 && mirrorSrc && n % 10 !== 0;
    const { floor, plan, layout } = buildFloor(ctx, n, prev, entryAt, useMirror ? mirrorSrc : null);
    mirrorSrc = layout;
    floors.push(floor);
    plans.push(plan);
    prev = floor;
    tower.floors[n - 1] = floor; // visible to later floors (vault alignment)
  }
  // Hatches: the floor that leads into a basement gets a sealed hatch on an open tile.
  for (const f of floors) {
    const target = loop.topology === 'hollow' && f.n === 1 ? 51 : loop.topology === 'fold' && f.n === 40 ? 41 : null;
    if (target == null) continue;
    const region = openRegion(f, f.entry);
    const cand: number[] = [];
    for (let i = 0; i < N; i++) if (region[i] && isFree(f, i) && !isChokepoint(f, i)) cand.push(i);
    if (!cand.length) throw new GenerationError('no hatch tile');
    const at = pick(rng, cand);
    f.base[at] = T.Hatch;
    f.hatch = { at, to: target };
  }
  // Backtrack keys: put the key for a deferred door on the later floor's open region.
  const backtracks: ZoneInfo['backtracks'] = [];
  for (let k = 0; k < floors.length; k++) {
    for (const u of plans[k].units) {
      if (u.kind !== 'door' || u.backtrackKeyFloor == null || !u.color) continue;
      const g = floors[u.backtrackKeyFloor];
      const region = openRegion(g, g.entry);
      const cand: number[] = [];
      for (let i = 0; i < N; i++) if (region[i] && isFree(g, i)) cand.push(i);
      if (!cand.length) { u.backtrackKeyFloor = undefined; continue; }
      const at = pick(rng, cand);
      g.items[at] = { kind: u.color === 'b' ? 'bKey' : 'rKey', value: 0 };
      backtracks.push({ keyFloor: g.n, keyAt: at, wingFloor: floors[k].n, door: u.lock });
    }
  }
  // Healing per floor, as the calibration hero would receive it (perks included).
  for (const f of floors) {
    let h = 0;
    for (const k in f.items) {
      const it = f.items[k];
      if (it.kind === 'redPotion' || it.kind === 'bluePotion') h += potionHeal(heroIn, it.value, loop.flags.potionMult);
      else if (it.kind === 'holyWater') h += holyWaterHeal(heroIn);
    }
    tower.healing[f.n - 1] = h;
  }
  const info: ZoneInfo = { zone, floors: fl, line: [], lineSlack: 0, heroOut: heroIn, templates: [], perks: [...heroIn.perks], backtracks };
  tower.zones[zone] = info;
  return { floors, plans, info };
}

/**
 * Walk the intended line on a ZoneSim, statting each placeholder monster as
 * the line reaches it. Returns the sim (line + hero) or null if the script
 * could not be followed (structure bug → caller re-rolls).
 */
function walkLine(rng: Rng, loop: LoopDef, tower: Tower, zone: number, heroIn: Hero, plans: FloorPlan[]): ZoneSim | null {
  const sim = new ZoneSim(tower, zone, cloneHero(heroIn));
  const s = slackTarget(zone, loop.n);
  const deferred: { fi: number; unit: Unit }[] = [];
  const zoneHeal = ZoneSim.zoneHealing(tower, zone);
  let justEnoughDone = false;

  const doUnit = (fi: number, u: Unit): boolean => {
    if (sim.fi !== fi) return false;
    const f = sim.floor;
    sim.autoTake();
    const opts = sim.options();
    if (u.kind === 'door') {
      const o = opts.find(x => x.action.t === 'door' && x.action.at === u.lock);
      if (!o) {
        // no key: convert to a guard so the line stays sound (only if not a backtrack door)
        if (u.backtrackKeyFloor != null && u.backtrackKeyFloor > fi) return false;
        delete f.doors[u.lock];
        const w = f.wings.find(x => x.lock === u.lock);
        if (w) w.lockKind = 'guard';
        f.mons[u.lock] = placeholder(rng, f.n, 'trash', loop, true, sim.hero, false);
        ZoneSim.refreshOrds(f);
        u.kind = 'guard';
        return doUnit(fi, u);
      }
      return sim.apply(o.action);
    }
    const m = f.mons[u.lock];
    if (!m || sim.isKilled(fi, u.lock)) return true;
    const fr = opts.find(x => x.action.t === 'fight' && x.action.at === u.lock);
    // Not in the frontier yet? (e.g. behind another unit) — try anyway via reach check.
    const r = sim.reach();
    const adjacent = neighbours(u.lock).some(j => r.cost[j] !== Infinity);
    if (!adjacent) return false;
    // Target cost.
    const budget = tower.healing[f.n - 1];
    const lineMonsters = plans[fi].units.filter(x => x.kind === 'guard').reduce((a, x) => a + x.weight, 0) || 1;
    let target = ((1 - s) * budget * u.weight) / lineMonsters;
    if (u.tag === 'boss') {
      const remain = Math.max(60, Math.round(s * zoneHeal));
      target = sim.hero.hp - remain;
    } else if (!justEnoughDone && u.tag === 'gate' && fi >= 2 && chance(rng, 0.5)) {
      target = sim.hero.hp - Math.max(30, Math.floor(sim.hero.hp * 0.06));
      u.tag = 'justEnough';
      justEnoughDone = true;
    }
    statMonster(rng, m, sim.hero, target, f.n, 1, sim.fightCtx(u.lock));
    void fr;
    const o2 = sim.options().find(x => x.action.t === 'fight' && x.action.at === u.lock);
    if (!o2) return false;
    return sim.apply(o2.action);
  };

  for (let fi = 0; fi < sim.floors.length; fi++) {
    if (sim.fi !== fi) return fail(`fi mismatch ${sim.fi} vs ${fi}`);
    plans[fi].heroAtEntry = cloneHero(sim.hero);
    sim.autoTake();
    // Shop: spend on DEF before fighting (part of the intended line).
    const shopAll = () => {
      for (let k = 0; k < 20; k++) {
        const o = sim.options().find(x => x.action.t === 'shop' && x.action.what === 'def');
        if (!o || !sim.apply(o.action)) break;
      }
    };
    shopAll();
    for (const u of plans[fi].units) {
      if (u.kind === 'door' && u.backtrackKeyFloor != null && u.backtrackKeyFloor > fi) {
        // maybe we already hold a spare key
        const o = sim.options().find(x => x.action.t === 'door' && x.action.at === u.lock);
        if (o && sim.apply(o.action)) continue;
        deferred.push({ fi, unit: u });
        continue;
      }
      if (!doUnit(fi, u)) {
        // Unreachable unit (blocked by a loose monster or nesting): drop it from the line.
        if (u.critical) return fail(`critical unit unreachable floor ${sim.floor.n} lock ${u.lock} kind ${u.kind}`);
      }
    }
    // Holy water: drink when carried (after gems) to keep HP high for the next floor.
    while (sim.hero.holyWater > 0) {
      const o = sim.options().find(x => x.action.t === 'holyWater');
      if (!o || !sim.apply(o.action)) break;
    }
    // Deferred doors whose key floor is this floor: go back, open, return.
    const ready = deferred.filter(d => d.unit.backtrackKeyFloor === fi);
    for (const d of ready) {
      deferred.splice(deferred.indexOf(d), 1);
      if (sim.hero.keys[d.unit.color!] <= 0) continue;
      // walk back
      let ok = true;
      while (sim.fi > d.fi) {
        const o = sim.options().find(x => x.action.t === 'stairs' && x.action.to === sim.floors[sim.fi - 1].n);
        if (!o || !sim.apply(o.action)) { ok = false; break; }
      }
      if (!ok) return fail('walk back failed');
      doUnit(d.fi, d.unit);
      while (sim.fi < fi) {
        const o = sim.options().find(x => x.action.t === 'stairs' && x.action.to === sim.floors[sim.fi + 1].n);
        if (!o || !sim.apply(o.action)) return fail('walk forward failed');
      }
    }
    if (fi < sim.floors.length - 1) {
      const o = sim.options().find(x => x.action.t === 'stairs' && x.action.to === sim.floors[fi + 1].n);
      if (!o || !sim.apply(o.action)) return fail(`stairs forward unavailable on floor ${sim.floor.n} (exit reachable? ${sim.reach().cost[sim.floor.exit] !== Infinity})`);
    }
  }
  if (!sim.done()) return fail(`not done at end: fi ${sim.fi} bossDead ${sim.bossDead()}`);
  return sim;
}

/** Stat the monsters the line never fought (traps / optional EXP). */
function statLoose(rng: Rng, tower: Tower, zone: number, plans: FloorPlan[]): void {
  const info = tower.zones[zone];
  for (let k = 0; k < plans.length; k++) {
    const f = tower.floors[info.floors[k] - 1];
    const hero = plans[k].heroAtEntry!;
    const budget = tower.healing[f.n - 1];
    for (const key in f.mons) {
      const at = Number(key);
      const m = f.mons[at];
      if (m.hp > 0) continue; // already statted on the line
      const trap = plans[k].loose.includes(at);
      const target = trap ? budget * (0.18 + rng() * 0.22) : budget * 0.1;
      statMonster(rng, m, hero, target, f.n, 1);
      if (trap) {
        // Traps reward less than they cost.
        m.gold = Math.max(1, Math.round(m.gold * 0.6));
        m.exp = Math.max(1, Math.round(m.exp * 0.8));
      }
    }
  }
}

// ─── Templates (post-hoc detection on the finished zone) ────────────────

export function detectTemplates(tower: Tower, zone: number): TemplateInstance[] {
  const info = tower.zones[zone];
  const out: TemplateInstance[] = [];
  const sim = new ZoneSim(tower, zone, heroForZone(tower, zone, info.perks));
  let gemBefore = false;
  let lastGemAtk = 0;
  let prevLevel = sim.hero.level;
  let hwGems = 0;
  for (const a of info.line) {
    const f = tower.floors[a.floor - 1];
    if (a.t === 'take') {
      const it = f.items[a.at];
      if (it && it.kind === 'atkGem') { gemBefore = true; lastGemAtk = it.value; }
      if (it && (it.kind === 'atkGem' || it.kind === 'defGem')) hwGems++;
    }
    if (a.t === 'fight') {
      const m = f.mons[a.at];
      const before = cloneHero(sim.hero);
      const dNow = getDamageInfo(before, m).damage;
      if (gemBefore && dNow != null) {
        const dWithout = getDamageInfo({ ...before, atk: before.atk - lastGemAtk }, m).damage;
        if (dWithout == null || dWithout - dNow >= 0.4 * Math.max(1, dWithout)) {
          if (!out.some(t => t.id === 'breakpointGate')) out.push({ id: 'breakpointGate', zone, refs: [{ floor: f.n, at: a.at }], params: { atk: before.atk, saved: (dWithout ?? Infinity) - dNow } });
        }
      }
      if (dNow != null && before.hp - dNow <= Math.max(30, before.hp * 0.08) && !m.boss) {
        if (!out.some(t => t.id === 'justEnough')) out.push({ id: 'justEnough', zone, refs: [{ floor: f.n, at: a.at }], params: { hpBefore: before.hp, damage: dNow } });
      }
      if (sim.hero.level > prevLevel && !out.some(t => t.id === 'levelUpTiming')) {
        // A level-up right before this fight made it cheaper.
        const lvlBefore = { ...before, level: prevLevel, atk: before.atk - 1, def: before.def - 1 };
        const dOld = getDamageInfo(lvlBefore, m).damage;
        if (dNow != null && (dOld == null || dOld > dNow)) out.push({ id: 'levelUpTiming', zone, refs: [{ floor: f.n, at: a.at }], params: { level: sim.hero.level } });
      }
      prevLevel = sim.hero.level;
    }
    if (a.t === 'holyWater' && hwGems > 0 && !out.some(t => t.id === 'holyWaterTiming')) {
      out.push({ id: 'holyWaterTiming', zone, refs: [{ floor: a.floor, at: 0 }], params: { gems: hwGems } });
    }
    if (a.t === 'breach' && !out.some(t => t.id === 'vaultTradeoff')) out.push({ id: 'vaultTradeoff', zone, refs: [{ floor: a.floor, at: a.at }], params: {} });
    if (a.t === 'door') {
      const bt = info.backtracks.find(b => b.wingFloor === a.floor && b.door === a.at);
      if (bt && !out.some(t => t.id === 'backtrackKey')) out.push({ id: 'backtrackKey', zone, refs: [{ floor: a.floor, at: a.at }, { floor: bt.keyFloor, at: bt.keyAt }], params: {} });
    }
    if (a.t === 'take' && sim.isTaken(sim.floors.findIndex(x => x.n === a.floor), a.at)) continue;
    if (!sim.apply(a)) break;
    prevLevel = sim.hero.level;
  }
  for (const n of info.floors) {
    const f = tower.floors[n - 1];
    const mons = Object.values(f.mons);
    if (mons.some(m => m.abilities.includes('sturdy')) && mons.some(m => m.abilities.includes('magic')) && !out.some(t => t.id === 'sturdyVsMagic')) {
      out.push({ id: 'sturdyVsMagic', zone, refs: [{ floor: n, at: 0 }], params: {} });
    }
    const yDoors = Object.keys(f.doors).filter(k => f.doors[Number(k)] === 'y').length;
    const yKeys = Object.values(f.items).filter(i => i.kind === 'yKey').length;
    if (yDoors >= 2 && yKeys < yDoors && !out.some(t => t.id === 'keyChoice')) out.push({ id: 'keyChoice', zone, refs: [{ floor: n, at: 0 }], params: { doors: yDoors, keys: yKeys } });
  }
  return out;
}

/**
 * Expert calibration: the collector line proves the zone is solvable, but a
 * smart player orders fights better and arrives at the boss with more HP.
 * Run the solver, then re-tune the boss against the solver's own state at the
 * boss so the stored proof line is the expert line and its slack is exact.
 */
function calibrateToExpert(rng: Rng, loop: LoopDef, tower: Tower, zone: number, heroIn: Hero, info: ZoneInfo): void {
  const expert = solveZone(tower, zone, heroIn);
  if (!expert.ok) { genDebug.calib.push(`z${zone}: solver failed @${expert.reachedFloor}`); return; }
  const bossIdx = expert.line.findIndex(a => a.t === 'fight' && !!tower.floors[a.floor - 1].mons[a.at]?.boss);
  if (bossIdx < 0) return;
  const bossAct = expert.line[bossIdx] as { floor: number; at: number };
  const boss = tower.floors[bossAct.floor - 1].mons[bossAct.at];
  const backup: MonsterInst = { ...boss, abilities: [...boss.abilities] };
  const replay = new ZoneSim(tower, zone, cloneHero(heroIn));
  for (let k = 0; k < bossIdx; k++) {
    const a = expert.line[k];
    if (a.t === 'take' && replay.isTaken(replay.floors.findIndex(x => x.n === a.floor), a.at)) continue;
    if (!replay.apply(a)) return;
  }
  replay.autoTake();
  const s = slackTarget(zone, loop.n);
  const remain = Math.max(60, Math.round(s * ZoneSim.zoneHealing(tower, zone)));
  statMonster(rng, boss, replay.hero, replay.hero.hp - remain, bossAct.floor, 1);
  // Replay the rest of the expert line against the re-tuned boss.
  let ok = true;
  for (let k = bossIdx; k < expert.line.length; k++) {
    const a = expert.line[k];
    if (a.t === 'take' && replay.isTaken(replay.floors.findIndex(x => x.n === a.floor), a.at)) continue;
    if (!replay.apply(a)) { ok = false; break; }
  }
  if (!ok || !replay.done()) {
    Object.assign(boss, backup);
    genDebug.calib.push(`z${zone}: replay after re-stat failed`);
    return;
  }
  genDebug.calib.push(`z${zone}: ok`);
  info.line = replay.line.slice();
  info.heroOut = cloneHero(replay.hero);
  info.lineSlack = replay.hero.hp / Math.max(1, ZoneSim.zoneHealing(tower, zone));
}

// ─── Public API ─────────────────────────────────────────────────────────

export interface ZoneGenResult {
  ok: boolean;
  attempts: number;
}

/** Generate one zone into `tower` (floors + zone info); returns the intended-line hero at exit. */
export function generateZone(seed: number, loop: LoopDef, tower: Tower, zone: number, heroIn: Hero, maxAttempts = 24): { hero: Hero; attempts: number } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let build: ZoneBuild;
    try {
      build = buildZone(seed, loop, tower, zone, heroIn, attempt);
    } catch (e) {
      if (e instanceof GenerationError) { genDebug.reasons.push(`build: ${e.message}`); continue; }
      throw e;
    }
    const rng = createRng(hashSeed(seed, loop.n, zone, attempt, 0x11));
    const sim = walkLine(rng, loop, tower, zone, heroIn, build.plans);
    if (!sim) continue;
    statLoose(rng, tower, zone, build.plans);
    const info = build.info;
    info.line = sim.line.slice();
    info.heroOut = cloneHero(sim.hero);
    info.lineSlack = sim.hero.hp / Math.max(1, ZoneSim.zoneHealing(tower, zone));
    calibrateToExpert(rng, loop, tower, zone, heroIn, info);
    // Acceptance: the stored line must replay through the real game rules.
    const rep = replayZone(tower, zone, heroIn);
    if (!rep.ok) {
      genDebug.reasons.push(`reducer replay: ${rep.error}`);
      continue;
    }
    info.templates = detectTemplates(tower, zone);
    return { hero: info.heroOut, attempts: attempt + 1 };
  }
  throw new GenerationError(`zone ${zone} could not be generated for seed ${seed} loop ${loop.n}`);
}

export interface TowerGenOptions extends GenOptions {
  /** Perk chosen after each zone boss (index = zone whose boss was beaten); default: the first offered. */
  perks?: (offered: PerkId[], zone: number) => PerkId | null;
}

/** An empty tower shell; zones are added by generateZone. */
export function emptyTower(seed: number, loopN: number): Tower {
  return { seed, loop: loopN, genVersion: GEN_VERSION, floors: new Array(FLOORS), zones: new Array(ZONES), healing: new Array(FLOORS).fill(0) };
}

export function hasZone(tower: Tower, zone: number): boolean {
  return !!tower.zones[zone];
}

/** Hero the next zone is calibrated for: the previous zone's line hero plus the drafted perk. */
export function heroForZone(tower: Tower, zone: number, perks: PerkId[]): Hero {
  const base = zone === 0 ? cloneHero(START_HERO) : cloneHero(tower.zones[zone - 1].heroOut);
  // A hatch-entered zone costs the stone spent breaching the hatch.
  const first = floorsOfZone(zone)[0];
  const stones = hatchSource(loopDef(tower.loop).topology, first) != null ? Math.max(0, base.stones - 1) : base.stones;
  return { ...base, stones, perks: [...perks] };
}

/** Generate every zone up front (tests, CLI). Perks are drafted as in the game. */
export function generateTower(seed: number, loopN: number, opts: TowerGenOptions = {}): Tower {
  const loop = loopDef(loopN);
  const tower = emptyTower(seed, loopN);
  let perks: PerkId[] = [];
  for (let z = 0; z < ZONES; z++) {
    const heroIn = heroForZone(tower, z, perks);
    generateZone(seed, loop, tower, z, heroIn, opts.maxAttempts ?? 24);
    opts.onProgress?.(z);
    if (z < ZONES - 1) {
      const offered = draftPerks(seed, loopN, z, perks);
      const pick = opts.perks ? opts.perks(offered, z) : offered[0] ?? null;
      if (pick) perks = [...perks, pick];
    }
  }
  return tower;
}
