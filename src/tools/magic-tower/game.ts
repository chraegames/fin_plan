// Game reducer. The real rules. ZoneSim (solver) is a model of these rules;
// the validator replays design ledgers through *this* reducer so the two can
// never silently disagree.

import { applyFight, canWin, getDamageInfo, getPhasedDamage, type FightCtx } from './combat';
import { KEY_GOLD, START_HERO, cloneHero, locksmithPrice, shopAtk, shopDef, shopHp, shopPrice } from './curves';
import { afterKill, applyItem, drinkHolyWater, spendKey } from './items';
import { floorDir, hatchSource, loopDef } from './loops';
import { monsterDef } from './monsters';
import { ITEM_LABEL, bi } from './i18n';
import { draftPerks } from './perks';
import { frontier, pathTo, reach, standable, zoneCosts, type FloorState } from './path';
import {
  DX, DY, FLOORS, GEN_VERSION, IDX, T, XY, inBounds, isBossFloor, neighbours, zoneOf,
  type Dir, type Floor, type FloorDiff, type KeyColor, type PerkId, type Run, type Snapshot, type Tower,
} from './types';

export interface GameState {
  run: Run;
  tower: Tower;
  /** NPC the hero is standing next to and just bumped (UI opens a panel); null otherwise. */
  npcOpen: number | null;
  /** Transient message for the UI (latest). */
  toast: string | null;
}

export type GameAction =
  | { type: 'newRun'; seed: number; loop: number; tower: Tower }
  | { type: 'move'; dir: Dir }
  | { type: 'walkPath'; path: number[] }
  | { type: 'breach'; dir: 'up' | 'down' }
  | { type: 'teleport'; floor: number }
  | { type: 'shop'; what: 'atk' | 'def' | 'hp' }
  | { type: 'locksmith'; color: KeyColor }
  | { type: 'closeNpc' }
  | { type: 'holyWater' }
  | { type: 'bomb'; dir: Dir }
  | { type: 'pickaxe'; dir: Dir }
  | { type: 'pickPerk'; id: PerkId }
  | { type: 'undo' }
  | { type: 'load'; run: Run; tower: Tower }
  | { type: 'setTower'; tower: Tower }
  | { type: 'useTile' }
  | { type: 'tick' };

export const UNDO_MAX = 10;

export function emptyDiff(): FloorDiff {
  return { taken: [], killed: [], opened: [], holes: [], dug: [] };
}

export function diffOf(run: Run, n: number): FloorDiff {
  return run.diffs[n] ?? emptyDiff();
}

export function floorState(run: Run, n: number): FloorState {
  const d = diffOf(run, n);
  return {
    isKilled: i => d.killed.includes(i),
    isOpened: i => d.opened.includes(i),
    isTaken: i => d.taken.includes(i),
    isHole: i => d.holes.includes(i),
    isDug: i => d.dug.includes(i),
  };
}

export function newRun(seed: number, loop: number): Run {
  const hero = cloneHero(START_HERO);
  return {
    v: 1,
    seed,
    loop,
    genVersion: GEN_VERSION,
    hero,
    floor: 1,
    pos: 0,
    facing: 2,
    diffs: {},
    visited: [1],
    pendingDraft: null,
    history: [],
    log: [],
    steps: 0,
    status: 'playing',
    bossesDown: -1,
  };
}

export function initialState(seed: number, loop: number, tower: Tower): GameState {
  const run = newRun(seed, loop);
  run.pos = tower.floors[0].entry;
  return { run, tower, npcOpen: null, toast: null };
}

function withDiff(run: Run, n: number, f: (d: FloorDiff) => void): Run {
  const d = { ...diffOf(run, n) };
  d.taken = d.taken.slice();
  d.killed = d.killed.slice();
  d.opened = d.opened.slice();
  d.holes = d.holes.slice();
  d.dug = d.dug.slice();
  f(d);
  return { ...run, diffs: { ...run.diffs, [n]: d } };
}

function snapshot(run: Run): Snapshot {
  return { hero: cloneHero(run.hero), floor: run.floor, pos: run.pos, diffs: run.diffs };
}

function pushHistory(run: Run): Run {
  const history = [...run.history, snapshot(run)];
  return { ...run, history: history.length > UNDO_MAX ? history.slice(history.length - UNDO_MAX) : history };
}

function log(run: Run, msg: string): Run {
  const l = [...run.log, msg];
  return { ...run, log: l.length > 60 ? l.slice(l.length - 60) : l };
}

export function fightCtx(tower: Tower, run: Run, n: number, at: number): FightCtx {
  const f = tower.floors[n - 1];
  const st = floorState(run, n);
  let auraPct = 0;
  let supporters = 0;
  for (const k in f.mons) {
    const i = Number(k);
    if (i === at || st.isKilled(i)) continue;
    if (f.mons[i].abilities.includes('aura')) auraPct += f.mons[i].auraPct ?? 0.2;
  }
  for (const j of neighbours(at)) {
    const m = f.mons[j];
    if (m && !st.isKilled(j) && m.abilities.includes('support')) supporters++;
  }
  return { auraPct: auraPct || undefined, supporters: supporters || undefined };
}

/** Damage the hero would take fighting the monster at `at` on the current floor (null = impossible). */
export function previewDamage(state: GameState, at: number): number | null {
  const f = currentFloor(state);
  const m = f.mons[at];
  if (!m || floorState(state.run, f.n).isKilled(at)) return null;
  const ctx = fightCtx(state.tower, state.run, f.n, at);
  return m.phases ? getPhasedDamage(state.run.hero, m, ctx) : getDamageInfo(state.run.hero, m, ctx).damage;
}

export function currentFloor(state: GameState): Floor {
  return state.tower.floors[state.run.floor - 1];
}

/** Perk draft offered after the boss of `zone`. */
export function draftFor(run: Run, zone: number): PerkId[] {
  return draftPerks(run.seed, run.loop, zone, run.hero.perks);
}

// ─── Physical floor neighbours (for breaching) ───────────────────────────

export function floorAbove(tower: Tower, n: number): number | null {
  const topo = loopDef(tower.loop).topology;
  const d = floorDir(topo, n);
  if (d === 1) {
    if (n >= FLOORS) return null;
    return floorDir(topo, n + 1) === 1 ? n + 1 : null;
  }
  if (hatchSource(topo, n) != null) return null;
  return n - 1;
}

export function floorBelow(tower: Tower, n: number): number | null {
  const topo = loopDef(tower.loop).topology;
  const d = floorDir(topo, n);
  if (d === 1) {
    if (n <= 1) return null;
    return floorDir(topo, n - 1) === 1 ? n - 1 : null;
  }
  if (n >= FLOORS) return null;
  return floorDir(topo, n + 1) === -1 ? n + 1 : null;
}

/** Is the aligned tile on floor `to` a legal breach landing? */
export function hollowAt(tower: Tower, run: Run, to: number, at: number): boolean {
  const g = tower.floors[to - 1];
  if (!g) return false;
  const st = floorState(run, to);
  if (st.isHole(at)) return false; // already a hole: walk through it instead
  const b = g.base[at];
  if (b === T.VaultWall) return g.vaults.includes(at);
  if (b !== T.Floor && b !== T.Hatch) return false;
  if (g.mons[at] && !st.isKilled(at)) return false;
  if (g.doors[at] && !st.isOpened(at)) return false;
  if (g.npcs[at]) return false;
  return true;
}

export function breachTarget(state: GameState, dir: 'up' | 'down'): number | null {
  const { tower, run } = state;
  const f = currentFloor(state);
  if (dir === 'down' && f.hatch && f.hatch.at === run.pos) return f.hatch.to;
  if (run.pos === f.entry || run.pos === f.exit) return null; // no breaching from the stairs
  const to = dir === 'up' ? floorAbove(tower, f.n) : floorBelow(tower, f.n);
  if (to == null) return null;
  if (dir === 'up' && isBossFloor(f.n) && run.bossesDown < zoneOf(f.n)) return null; // sealed ceiling
  if (!hollowAt(tower, run, to, run.pos)) return null;
  return to;
}

// ─── Stepping ───────────────────────────────────────────────────────────

interface StepResult {
  run: Run;
  ok: boolean;
  npcOpen?: number;
  toast?: string;
}

function arrive(run: Run, tower: Tower, n: number, pos: number): Run {
  const visited = run.visited.includes(n) ? run.visited : [...run.visited, n];
  void tower;
  return { ...run, floor: n, pos, visited };
}

function pickUp(run: Run, f: Floor, at: number): Run {
  const it = f.items[at];
  if (!it || diffOf(run, f.n).taken.includes(at)) return run;
  const flags = loopDef(run.loop).flags;
  let r = { ...run, hero: applyItem(run.hero, it, flags.potionMult) };
  r = withDiff(r, f.n, d => d.taken.push(at));
  return log(r, `Picked up ${bi(ITEM_LABEL[it.kind])}${it.value && it.kind !== 'stone' ? ` +${it.value}` : ''}`);
}

/**
 * Try to step from the hero's tile onto adjacent tile `to`. Stairs and holes
 * only trigger a floor change when the step is deliberate (`final`): a manual
 * move, or the last tile of a planned route — walking *through* them is fine.
 */
function step(state: GameState, to: number, final = true): StepResult {
  let { run } = state;
  const { tower } = state;
  const f = currentFloor(state);
  const st = floorState(run, f.n);
  if (run.status !== 'playing' || run.pendingDraft) return { run, ok: false };
  if (!neighbours(run.pos).includes(to)) return { run, ok: false };
  if (!standable(f, st, to)) return { run, ok: false };

  const zc = zoneCosts(f, st);
  const stepCost = zc ? zc[to] : 0;
  if (stepCost >= run.hero.hp) return { run, ok: false, toast: 'That step would kill you.' };

  // Monster
  const m = f.mons[to];
  if (m && !st.isKilled(to)) {
    const ctx = fightCtx(tower, run, f.n, to);
    if (!canWin(run.hero, m, ctx)) {
      const info = getDamageInfo(run.hero, m, ctx);
      return { run, ok: false, toast: info.damage == null ? `${monsterDef(m.id).en} cannot be hurt yet.` : `${monsterDef(m.id).en} would deal ${info.damage} — too much.` };
    }
    const before = run.hero.hp;
    let hero = afterKill(applyFight(run.hero, m, ctx));
    run = { ...run, hero };
    run = withDiff(run, f.n, d => d.killed.push(to));
    run = log(run, `Defeated ${monsterDef(m.id).en} ${monsterDef(m.id).zh} (−${before - hero.hp + (hero.hp - before > 0 ? 0 : 0)} HP, +${m.gold} gold, +${m.exp} exp)`);
    if (m.boss) {
      const zone = zoneOf(f.n);
      run = { ...run, bossesDown: Math.max(run.bossesDown, zone) };
      if (loopDef(run.loop).flags.keyToGold) {
        const k = run.hero.keys;
        const gold = k.y * KEY_GOLD.y + k.b * KEY_GOLD.b + k.r * KEY_GOLD.r;
        hero = { ...run.hero, gold: run.hero.gold + gold, keys: { y: 0, b: 0, r: 0 } };
        run = log({ ...run, hero }, `The chains take your keys: +${gold} gold.`);
      }
      if (m.boss === 'final') {
        run = { ...run, status: 'won' };
        return { run, ok: true, toast: 'The tower is yours.' };
      }
      const draft = draftFor(run, zone);
      if (draft.length) run = { ...run, pendingDraft: draft };
    }
    return { run, ok: true };
  }

  // Door
  const door = f.doors[to];
  if (door && !st.isOpened(to)) {
    const h = spendKey(run.hero, door);
    if (!h) return { run, ok: false, toast: 'Locked. You need a key.' };
    run = withDiff({ ...run, hero: h }, f.n, d => d.opened.push(to));
    return { run, ok: true };
  }

  // NPC
  const npc = f.npcs[to];
  if (npc) return { run, ok: true, npcOpen: to };

  // Walk
  run = { ...run, pos: to, hero: stepCost ? { ...run.hero, hp: run.hero.hp - stepCost } : run.hero, steps: run.steps + 1 };
  run = pickUp(run, f, to);

  // Stairs / holes (deliberate steps only).
  if (!final) return { run, ok: true };
  return traverse(run, tower, f, to);
}

/** Travel through the stairs / hole at `to` (the hero is standing on it). */
function traverse(run: Run, tower: Tower, f: Floor, to: number): StepResult {
  const st = floorState(run, f.n);
  const b = f.base[to];
  if (st.isHole(to)) {
    // Two-way passage: the matching hole is on the physically adjacent floor.
    const up = floorAbove(tower, f.n);
    const down = floorBelow(tower, f.n);
    const hatchTo = f.hatch && f.hatch.at === to ? f.hatch.to : null;
    const src = hatchSource(loopDef(tower.loop).topology, f.n);
    const cands = [up, down, hatchTo, src].filter((x): x is number => x != null);
    const dest = cands.find(x => diffOf(run, x).holes.includes(to));
    if (dest != null && tower.floors[dest - 1]) {
      run = arrive(run, tower, dest, to);
      run = pickUp(run, tower.floors[dest - 1], to);
      return { run, ok: true };
    }
    return { run, ok: true };
  }
  if (to === f.exit && (b === T.StairUp || b === T.StairDown)) {
    if (isBossFloor(f.n) && run.bossesDown < zoneOf(f.n)) return { run, ok: true, toast: 'The stairs are sealed while the boss lives.' };
    if (f.n >= FLOORS) return { run, ok: true };
    const next = tower.floors[f.n];
    if (!next) return { run, ok: true, toast: 'The tower is still shifting above…' };
    // Hatch-entered floors are not connected by stairs.
    if (hatchSource(loopDef(tower.loop).topology, next.n) != null) return { run, ok: true, toast: 'A false summit. The way on is below.' };
    run = arrive(run, tower, next.n, next.entry);
    return { run, ok: true };
  }
  if (to === f.entry && f.n > 1 && (b === T.StairUp || b === T.StairDown) && hatchSource(loopDef(tower.loop).topology, f.n) == null) {
    const prev = tower.floors[f.n - 2];
    run = arrive(run, tower, prev.n, prev.exit);
    return { run, ok: true };
  }
  return { run, ok: true };
}

/**
 * A route to `target` on the current floor: the tiles to step through, ending
 * on `target` itself (which may be a monster/door/NPC — the last step is the
 * interaction). Empty when unreachable.
 */
export function planRoute(state: GameState, target: number): number[] {
  const f = currentFloor(state);
  const st = floorState(state.run, f.n);
  const r = reach(f, st, state.run.pos);
  if (r.cost[target] !== Infinity) return pathTo(r, target);
  const fr = frontier(f, st, r).find(x => x.at === target);
  if (!fr) return [];
  return [...pathTo(r, fr.via), target];
}

function dirTo(from: number, to: number): Dir {
  const a = XY(from), b = XY(to);
  if (b.y < a.y) return 0;
  if (b.x > a.x) return 1;
  if (b.y > a.y) return 2;
  return 3;
}

// ─── Reducer ────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'newRun':
      return initialState(action.seed, action.loop, action.tower);
    case 'load':
      return { run: action.run, tower: action.tower, npcOpen: null, toast: null };
    case 'tick':
      return state;
    case 'setTower':
      return { ...state, tower: action.tower };
    case 'useTile': {
      const { run } = state;
      if (run.status !== 'playing' || run.pendingDraft) return state;
      const f = currentFloor(state);
      const res = traverse(pushHistory(run), state.tower, f, run.pos);
      if (res.run.floor === run.floor) return { ...state, toast: res.toast ?? state.toast };
      return { ...state, run: res.run, toast: res.toast ?? null, npcOpen: null };
    }
    case 'closeNpc':
      return { ...state, npcOpen: null };
    case 'move': {
      const { x, y } = XY(state.run.pos);
      const nx = x + DX[action.dir], ny = y + DY[action.dir];
      if (!inBounds(nx, ny)) return { ...state, run: { ...state.run, facing: action.dir } };
      const before = pushHistory(state.run);
      const res = step({ ...state, run: before }, IDX(nx, ny));
      if (!res.ok) return { ...state, run: { ...state.run, facing: action.dir }, toast: res.toast ?? state.toast, npcOpen: null };
      return { ...state, run: { ...res.run, facing: action.dir }, npcOpen: res.npcOpen ?? null, toast: res.toast ?? null };
    }
    case 'walkPath': {
      let cur: GameState = { ...state, run: pushHistory(state.run), npcOpen: null };
      const startFloor = cur.run.floor;
      for (let k = 0; k < action.path.length; k++) {
        const t = action.path[k];
        if (cur.run.floor !== startFloor) break;
        const facing = dirTo(cur.run.pos, t);
        const res = step(cur, t, k === action.path.length - 1);
        if (!res.ok) return { ...cur, run: { ...cur.run, facing }, toast: res.toast ?? cur.toast };
        cur = { ...cur, run: { ...res.run, facing }, npcOpen: res.npcOpen ?? null, toast: res.toast ?? null };
        if (cur.run.status !== 'playing' || cur.run.pendingDraft || cur.npcOpen != null) break;
      }
      return cur;
    }
    case 'breach': {
      const { run } = state;
      if (run.status !== 'playing' || run.hero.stones <= 0) return { ...state, toast: 'No Breach Stone.' };
      const to = breachTarget(state, action.dir);
      if (to == null) return { ...state, toast: action.dir === 'up' ? 'Solid ceiling here.' : 'Solid floor here.' };
      const f = currentFloor(state);
      let r = pushHistory(run);
      r = { ...r, hero: { ...r.hero, stones: r.hero.stones - 1 } };
      r = withDiff(r, f.n, d => d.holes.push(r.pos));
      r = withDiff(r, to, d => d.holes.push(r.pos));
      r = arrive(r, state.tower, to, r.pos);
      r = pickUp(r, state.tower.floors[to - 1], r.pos);
      r = log(r, `Breached ${action.dir} into ${state.tower.floors[to - 1].label}.`);
      return { ...state, run: r, npcOpen: null, toast: null };
    }
    case 'teleport': {
      const { run, tower } = state;
      if (run.status !== 'playing' || !run.hero.teleporter || !run.visited.includes(action.floor) || action.floor === run.floor) return state;
      const g = tower.floors[action.floor - 1];
      const r = arrive(pushHistory(run), tower, g.n, g.entry);
      return { ...state, run: r, npcOpen: null, toast: null };
    }
    case 'shop': {
      const { run } = state;
      const at = state.npcOpen;
      const f = currentFloor(state);
      const npc = at != null ? f.npcs[at] : null;
      if (!npc || (npc.kind !== 'shop' && npc.kind !== 'tradePost')) return state;
      const n = run.hero.shopBuys + 1;
      let price = shopPrice(n, npc.tier);
      if (run.hero.perks.includes('merchant')) price = Math.round(price * 0.75);
      if (run.hero.gold < price) return { ...state, toast: `Not enough gold (${price}).` };
      const h = { ...run.hero, gold: run.hero.gold - price, shopBuys: n };
      if (action.what === 'atk') h.atk += shopAtk(npc.tier);
      else if (action.what === 'def') h.def += shopDef(npc.tier);
      else h.hp += shopHp(npc.tier);
      return { ...state, run: log({ ...pushHistory(run), hero: h }, `Bought ${action.what.toUpperCase()} for ${price} gold.`), toast: null };
    }
    case 'locksmith': {
      const { run } = state;
      const at = state.npcOpen;
      const f = currentFloor(state);
      const npc = at != null ? f.npcs[at] : null;
      if (!npc || npc.kind !== 'locksmith') return state;
      const n = run.hero.locksmithBuys + 1;
      const price = locksmithPrice(n, npc.tier) * (action.color === 'y' ? 1 : action.color === 'b' ? 2 : 4);
      if (run.hero.gold < price) return { ...state, toast: `Not enough gold (${price}).` };
      const keys = { ...run.hero.keys, [action.color]: run.hero.keys[action.color] + 1 };
      const h = { ...run.hero, gold: run.hero.gold - price, locksmithBuys: n, keys };
      return { ...state, run: { ...pushHistory(run), hero: h }, toast: null };
    }
    case 'holyWater': {
      const { run } = state;
      if (run.hero.holyWater <= 0) return state;
      const r = { ...pushHistory(run), hero: drinkHolyWater(run.hero) };
      return { ...state, run: log(r, `Holy water: +${r.hero.hp - run.hero.hp} HP.`), toast: null };
    }
    case 'bomb': {
      const { run } = state;
      if (run.hero.bombs <= 0) return { ...state, toast: 'No bombs.' };
      const { x, y } = XY(run.pos);
      const nx = x + DX[action.dir], ny = y + DY[action.dir];
      if (!inBounds(nx, ny)) return state;
      const t = IDX(nx, ny);
      const f = currentFloor(state);
      const m = f.mons[t];
      if (!m || m.boss || diffOf(run, f.n).killed.includes(t)) return { ...state, toast: 'Nothing to bomb there.' };
      let r = { ...pushHistory(run), hero: { ...run.hero, bombs: run.hero.bombs - 1 } };
      r = withDiff(r, f.n, d => d.killed.push(t));
      return { ...state, run: log(r, `Bombed ${monsterDef(m.id).en}.`), toast: null };
    }
    case 'pickaxe': {
      const { run } = state;
      if (run.hero.pickaxes <= 0) return { ...state, toast: 'No pickaxe.' };
      const { x, y } = XY(run.pos);
      const nx = x + DX[action.dir], ny = y + DY[action.dir];
      if (!inBounds(nx, ny)) return state;
      const t = IDX(nx, ny);
      const f = currentFloor(state);
      if (f.base[t] !== T.Wall || diffOf(run, f.n).dug.includes(t)) return { ...state, toast: 'Only plain walls can be dug.' };
      let r = { ...pushHistory(run), hero: { ...run.hero, pickaxes: run.hero.pickaxes - 1 } };
      r = withDiff(r, f.n, d => d.dug.push(t));
      return { ...state, run: r, toast: null };
    }
    case 'pickPerk': {
      const { run } = state;
      if (!run.pendingDraft || !run.pendingDraft.includes(action.id)) return state;
      const hero = { ...run.hero, perks: [...run.hero.perks, action.id] };
      return { ...state, run: log({ ...run, hero, pendingDraft: null }, `Blessing chosen: ${action.id}.`), toast: null };
    }
    case 'undo': {
      const { run } = state;
      if (!run.history.length || run.status !== 'playing') return state;
      const s = run.history[run.history.length - 1];
      return { ...state, run: { ...run, hero: s.hero, floor: s.floor, pos: s.pos, diffs: s.diffs, history: run.history.slice(0, -1), pendingDraft: null }, npcOpen: null, toast: null };
    }
  }
}

/** Every tile index of the current floor that is standable now (for the UI's route preview). */
export function walkable(state: GameState): boolean[] {
  const f = currentFloor(state);
  const st = floorState(state.run, f.n);
  return f.base.map((_, i) => standable(f, st, i));
}
