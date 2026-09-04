// Tower validation: structural invariants, the design ledger replayed
// through the real game reducer, naive-policy and template reports.

import { getDamageInfo } from './combat';
import { START_HERO, cloneHero, floorsOfZone } from './curves';
import { heroForZone } from './floorgen';
import { currentFloor, diffOf, gameReducer, initialState, planRoute, type GameState } from './game';
import { hatchSource, loopDef } from './loops';
import { EMPTY_STATE, reach } from './path';
import { POLICIES, runPolicy, type PolicyId } from './policies';
import { FLOORS, N, T, neighbours, type Action, type Hero, type KeyColor, type TemplateId, type Tower } from './types';
import { ZoneSim } from './zonesim';
import { msg } from './strings';

export interface ZoneReport {
  zone: number;
  lineSlack: number;
  replayOk: boolean;
  replayError?: string;
  heroOut: Hero;
  policies: Record<PolicyId, boolean>;
  policiesFailed: number;
  templates: TemplateId[];
  backtracks: number;
}

export interface TowerReport {
  seed: number;
  loop: number;
  structural: string[];
  zones: ZoneReport[];
  ok: boolean;
}

// ─── Structural ─────────────────────────────────────────────────────────

export function structuralErrors(tower: Tower): string[] {
  const errs: string[] = [];
  const loop = loopDef(tower.loop);
  if (tower.floors.length !== FLOORS) errs.push(`floors: ${tower.floors.length}`);
  for (let n = 1; n <= FLOORS; n++) {
    const f = tower.floors[n - 1];
    if (!f) { errs.push(`F${n} missing`); continue; }
    const tag = f.label;
    if (f.base.length !== N) errs.push(`${tag}: base length ${f.base.length}`);
    if (f.entry < 0 || f.entry >= N || f.exit < 0 || f.exit >= N || f.entry === f.exit) errs.push(`${tag}: bad stairs`);
    const r = reach(f, EMPTY_STATE, f.entry);
    // Entry↔exit connected ignoring monsters/doors (structure only).
    const open = f.base.map(b => b !== T.Wall && b !== T.VaultWall);
    const seen = new Array<boolean>(N).fill(false);
    const q = [f.entry];
    seen[f.entry] = true;
    for (let h = 0; h < q.length; h++) for (const j of neighbours(q[h])) if (open[j] && !seen[j]) { seen[j] = true; q.push(j); }
    if (!seen[f.exit]) errs.push(`${tag}: exit not connected to entry`);
    void r;
    // Alignment: next floor's entry equals this exit (stairs) unless hatch-entered.
    if (n < FLOORS) {
      const g = tower.floors[n];
      if (g && hatchSource(loop.topology, g.n) == null && g.entry !== f.exit) errs.push(`${tag}: exit ${f.exit} ≠ ${g.label} entry ${g.entry}`);
    }
    const hs = hatchSource(loop.topology, n);
    if (hs != null) {
      const src = tower.floors[hs - 1];
      if (!src.hatch || src.hatch.to !== n) errs.push(`${tag}: hatch source ${hs} has no hatch to it`);
      else if (src.hatch.at !== f.entry) errs.push(`${tag}: entry ${f.entry} not aligned with hatch ${src.hatch.at}`);
      else if (src.base[src.hatch.at] !== T.Hatch) errs.push(`F${hs}: hatch tile is not a hatch`);
    }
    // Boss floors carry a boss and a stone drop.
    const boss = n % 10 === 0 || n === FLOORS;
    const mons = Object.values(f.mons);
    if (boss && !mons.some(m => m.boss)) errs.push(`${tag}: no boss`);
    if (!boss && mons.some(m => m.boss)) errs.push(`${tag}: stray boss`);
    if (boss && !Object.values(f.items).some(it => it.kind === 'stone' && it.bossDrop)) errs.push(`${tag}: boss drops no stone`);
    // Abilities inside the loop's set; every monster statted.
    for (const m of mons) {
      for (const a of m.abilities) if (!loop.abilities.includes(a)) errs.push(`${tag}: ${m.id} has ${a} outside loop ${loop.n}`);
      if (m.hp <= 0 || m.atk <= 0) errs.push(`${tag}: ${m.id} unstatted`);
    }
    // Vaults: closed ring, one item, aligned tile on the previous floor is open floor.
    for (const v of f.vaults) {
      const { x, y } = { x: v % 11, y: Math.floor(v / 11) };
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const i = (y + dy) * 11 + (x + dx);
        if (f.base[i] !== T.VaultWall) errs.push(`${tag}: vault ${v} ring broken at ${i}`);
      }
      if (!f.items[v]) errs.push(`${tag}: vault ${v} empty`);
      const prev = tower.floors[n - 2];
      if (!prev || prev.base[v] !== T.Floor || prev.mons[v] || prev.doors[v]) errs.push(`${tag}: vault ${v} not breachable from below`);
    }
    // Doors have a key colour source somewhere in the zone or earlier.
    const colours = new Set<KeyColor>(Object.values(f.doors));
    for (const c of colours) {
      const kind = c === 'y' ? 'yKey' : c === 'b' ? 'bKey' : 'rKey';
      let found = false;
      for (let k = 1; k <= Math.min(FLOORS, n + 3) && !found; k++) {
        const g = tower.floors[k - 1];
        if (g && Object.values(g.items).some(it => it.kind === kind)) found = true;
      }
      if (c === 'y' && START_HERO.keys.y > 0) found = true;
      if (!found) errs.push(`${tag}: ${c} door with no ${kind} on floors 1–${n + 3}`);
    }
    if (Object.keys(f.mons).length + Object.keys(f.doors).length > 20) errs.push(`${tag}: too many blockers`);
  }
  return errs;
}

// ─── Ledger replay through the reducer ──────────────────────────────────

/** Walk onto `at` so that the final (deliberate) step lands on it; if already there, step off and back. */
function walkOnto(state: GameState, at: number): GameState | string {
  if (state.run.pos === at) return gameReducer(state, { type: 'useTile' });
  const path = planRoute(state, at);
  if (!path.length) return `${at}: unreachable`;
  return gameReducer(state, { type: 'walkPath', path });
}

function applyViaReducer(state: GameState, a: Action): GameState | string {
  if (state.run.status === 'won') return state; // nothing after the final boss matters
  const f = currentFloor(state);
  if (a.floor !== f.n) return `ledger on ${a.floor} but hero on ${f.n}`;
  switch (a.t) {
    case 'take':
    case 'fight':
    case 'door': {
      // A take of the tile we stand on is already done (landing on a vault item); never use the tile.
      if (a.t === 'take' && state.run.pos === a.at) return state;
      // Already picked up while walking past: still stand on it so positions stay aligned with the sim.
      const path = planRoute(state, a.at);
      if (!path.length) return `${a.t} ${a.at}: unreachable`;
      const next = gameReducer(state, { type: 'walkPath', path });
      const d = diffOf(next.run, f.n);
      const done = a.t === 'take' ? d.taken.includes(a.at) : a.t === 'fight' ? d.killed.includes(a.at) : d.opened.includes(a.at);
      if (!done) return `${a.t} ${a.at}: refused (${next.toast ? msg(next.toast, 'en') : 'no toast'})`;
      return next;
    }
    case 'stairs': {
      const target = a.to > f.n ? f.exit : f.entry;
      const next = walkOnto(state, target);
      if (typeof next === 'string') return `stairs to ${a.to}: ${next}`;
      if (next.run.floor !== a.to) return `stairs to ${a.to}: ended on ${next.run.floor} (${next.toast ? msg(next.toast, 'en') : ''})`;
      return next;
    }
    case 'hole': {
      const next = walkOnto(state, a.at);
      if (typeof next === 'string') return `hole ${a.at}: ${next}`;
      if (next.run.floor !== a.to) return `hole ${a.at}: ended on ${next.run.floor}`;
      return next;
    }
    case 'breach': {
      let cur = state;
      if (cur.run.pos !== a.at) {
        const path = planRoute(state, a.at);
        if (!path.length) return `breach ${a.at}: unreachable`;
        cur = gameReducer(state, { type: 'walkPath', path });
        if (cur.run.pos !== a.at) return `breach ${a.at}: could not stand there (${cur.toast ? msg(cur.toast, 'en') : ''})`;
      }
      const dir = a.to > f.n ? (f.dir === 1 ? 'up' : 'down') : f.dir === 1 ? 'down' : 'up';
      cur = gameReducer(cur, { type: 'breach', dir: f.hatch && f.hatch.at === a.at ? 'down' : dir });
      if (cur.run.floor !== a.to) return `breach ${a.at}: ended on ${cur.run.floor} (${cur.toast ? msg(cur.toast, 'en') : ''})`;
      return cur;
    }
    case 'holyWater':
      return gameReducer(state, { type: 'holyWater' });
    case 'shop': {
      const path = planRoute(state, a.at);
      if (!path.length) return `shop ${a.at}: unreachable`;
      let cur = gameReducer(state, { type: 'walkPath', path });
      if (cur.npcOpen !== a.at) return `shop ${a.at}: panel not open`;
      const gold = cur.run.hero.gold;
      cur = gameReducer(cur, { type: 'shop', what: a.what });
      if (cur.run.hero.gold === gold) return `shop: purchase refused`;
      return gameReducer(cur, { type: 'closeNpc' });
    }
    default:
      return `unsupported action ${(a as Action).t}`;
  }
}

/**
 * Replay one zone's line through the reducer from a synthetic run standing at
 * the zone's entry with `heroIn`. Used by the generator as an acceptance test
 * so every stored line is verified against the real rules, not the sim model.
 */
export function replayZone(tower: Tower, zone: number, heroIn: Hero): { ok: boolean; error?: string; hero: Hero } {
  const info = tower.zones[zone];
  const first = info.floors[0];
  let state = initialState(tower.seed, tower.loop, tower);
  const run = { ...state.run, hero: cloneHero(heroIn), floor: first, pos: tower.floors[first - 1].entry, visited: [first], bossesDown: zone - 1 };
  const hs = hatchSource(loopDef(tower.loop).topology, first);
  if (hs != null) {
    const at = tower.floors[hs - 1].hatch!.at;
    run.diffs = { [hs]: { taken: [], killed: [], opened: [], holes: [at], dug: [] }, [first]: { taken: [], killed: [], opened: [], holes: [at], dug: [] } };
  }
  state = { ...state, run };
  for (const a of info.line) {
    const r = applyViaReducer(state, a);
    if (typeof r === 'string') return { ok: false, error: r, hero: state.run.hero };
    state = r;
    if (state.run.status === 'won') break;
    if (state.run.pendingDraft) state = { ...state, run: { ...state.run, pendingDraft: null } };
  }
  const f = currentFloor(state);
  const bossDead = Object.keys(f.mons).map(Number).every(i => !f.mons[i].boss || diffOf(state.run, f.n).killed.includes(i));
  if (state.run.floor !== info.floors[info.floors.length - 1] || !bossDead) return { ok: false, error: `zone ${zone}: ended on ${state.run.floor}, boss dead ${bossDead}`, hero: state.run.hero };
  if (state.run.status !== 'won' && !planRoute(state, f.exit).length && state.run.pos !== f.exit) return { ok: false, error: `zone ${zone}: exit unreachable`, hero: state.run.hero };
  return { ok: true, hero: state.run.hero };
}

/** Replay all zones' lines from the start through the reducer. */
export function replayLedger(tower: Tower): { ok: boolean; error?: string; zoneHeroes: Hero[]; state: GameState } {
  let state = initialState(tower.seed, tower.loop, tower);
  const zoneHeroes: Hero[] = [];
  for (let z = 0; z < tower.zones.length; z++) {
    const info = tower.zones[z];
    for (const a of info.line) {
      const r = applyViaReducer(state, a);
      if (typeof r === 'string') return { ok: false, error: `zone ${z}: ${r}`, zoneHeroes, state };
      state = r;
      if (state.run.pendingDraft) {
        // Pick the perk the generator calibrated the next zone for.
        const want = tower.zones[z + 1]?.perks.find(p => !state.run.hero.perks.includes(p));
        const pick = want && state.run.pendingDraft.includes(want) ? want : state.run.pendingDraft[0];
        state = gameReducer(state, { type: 'pickPerk', id: pick });
      }
    }
    zoneHeroes.push(cloneHero(state.run.hero));
    // Between zones the ledger ends on the boss floor with the exit reachable; step onto it.
    if (z < tower.zones.length - 1) {
      const f = currentFloor(state);
      const path = planRoute(state, f.exit);
      if (!path.length) return { ok: false, error: `zone ${z}: exit unreachable after boss`, zoneHeroes, state };
      state = gameReducer(state, { type: 'walkPath', path });
      const first = floorsOfZone(z + 1)[0];
      if (state.run.floor !== first) {
        // Hatch-entered zone: teleport to the hatch floor and breach down.
        const hs = hatchSource(loopDef(tower.loop).topology, first);
        if (hs == null) return { ok: false, error: `zone ${z}: did not reach ${first} (on ${state.run.floor})`, zoneHeroes, state };
        state = gameReducer(state, { type: 'teleport', floor: hs });
        const src = tower.floors[hs - 1];
        const p2 = planRoute(state, src.hatch!.at);
        if (state.run.pos !== src.hatch!.at) {
          if (!p2.length) return { ok: false, error: `zone ${z}: hatch unreachable`, zoneHeroes, state };
          state = gameReducer(state, { type: 'walkPath', path: p2 });
        }
        state = gameReducer(state, { type: 'breach', dir: 'down' });
        if (state.run.floor !== first) return { ok: false, error: `zone ${z}: hatch breach failed (${state.toast ? msg(state.toast, 'en') : ''})`, zoneHeroes, state };
      }
    }
  }
  const ok = state.run.status === 'won';
  return { ok, error: ok ? undefined : `final status ${state.run.status}`, zoneHeroes, state };
}

// ─── Full report ────────────────────────────────────────────────────────

export function validateTower(tower: Tower, opts: { policies?: boolean } = {}): TowerReport {
  const structural = structuralErrors(tower);
  const replay = replayLedger(tower);
  const zones: ZoneReport[] = [];
  let hero = cloneHero(START_HERO);
  for (let z = 0; z < tower.zones.length; z++) {
    const info = tower.zones[z];
    const policies = {} as Record<PolicyId, boolean>;
    let failed = 0;
    if (opts.policies !== false) {
      for (const p of POLICIES) {
        const r = runPolicy(p, tower, z, hero);
        policies[p] = r.ok;
        if (!r.ok) failed++;
      }
    }
    zones.push({
      zone: z,
      lineSlack: info.lineSlack,
      replayOk: replay.ok || replay.zoneHeroes.length > z,
      replayError: replay.zoneHeroes.length > z ? undefined : replay.error,
      heroOut: info.heroOut,
      policies,
      policiesFailed: failed,
      templates: info.templates.map(t => t.id),
      backtracks: info.backtracks.length,
    });
    hero = info.heroOut;
  }
  return { seed: tower.seed, loop: tower.loop, structural, zones, ok: structural.length === 0 && replay.ok };
}

/** Sanity: the line the generator stored also replays on the sim model. */
export function replayOnSim(tower: Tower): boolean {
  for (let z = 0; z < tower.zones.length; z++) {
    const sim = new ZoneSim(tower, z, heroForZone(tower, z, tower.zones[z].perks));
    for (const a of tower.zones[z].line) {
      if (a.t === 'take' && sim.isTaken(sim.floors.findIndex(x => x.n === a.floor), a.at)) continue;
      if (!sim.apply(a)) return false;
    }
    if (!sim.done()) return false;
  }
  return true;
}

/** Damage table for a floor at a hero (debug/report helper). */
export function floorDamageTable(tower: Tower, n: number, hero: Hero): { at: number; id: string; damage: number | null }[] {
  const f = tower.floors[n - 1];
  return Object.keys(f.mons).map(Number).map(at => ({ at, id: f.mons[at].id, damage: getDamageInfo(hero, f.mons[at]).damage }));
}
