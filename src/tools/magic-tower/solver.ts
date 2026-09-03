// Staged zone solver. Inside a floor the state space is small (≤ ~16
// blockers), so it is searched exhaustively with dominance pruning (same
// masks ⇒ keep the highest HP). The best few exit states are carried to the
// next floor. Keys found later can be brought back to an earlier floor via a
// "return and open" macro, which is how backtrack puzzles are solved.

import { cloneHero } from './curves';
import type { Action, Hero, Tower } from './types';
import { ZoneSim } from './zonesim';

export interface SolveOptions {
  /** Exit states carried per floor. */
  seeds?: number;
  /** Max dominance-unique states explored per floor per seed. */
  maxStates?: number;
}

export interface SolveResult {
  ok: boolean;
  line: Action[];
  heroOut: Hero;
  slack: number;
  expansions: number;
  /** Deepest floor index reached when not ok. */
  reachedFloor: number;
}

/** Value of a state for ranking: HP plus what stats/keys are worth later. */
export function score(sim: ZoneSim): number {
  const h = sim.hero;
  return h.hp + 200 * h.atk + 250 * h.def + 40 * h.keys.y + 80 * h.keys.b + 120 * h.keys.r + 0.5 * h.gold + 60 * h.stones + (h.holyWater ? 0.8 * (h.atk + 2 * h.def) : 0);
}

interface FloorSearch {
  /** All dominance-unique states reached (staying on the seed's floor, plus return macros). */
  states: ZoneSim[];
  expansions: number;
}

/**
 * Exhaustive search from `seed` over actions that keep the hero on its
 * floor, plus "return and open" macros to earlier floors. Returns every
 * non-dominated state.
 */
function searchFloor(seed: ZoneSim, maxStates: number, counter: { n: number }): FloorSearch {
  const fi = seed.fi;
  const best = new Map<string, number>();
  const out: ZoneSim[] = [];
  // Best-first: a sorted open list (small), highest score last so pop() is O(1).
  const open: { s: ZoneSim; v: number }[] = [{ s: seed, v: score(seed) }];
  best.set(seed.key(), seed.hero.hp);
  const push = (s: ZoneSim) => {
    const v = score(s);
    let lo = 0, hi = open.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (open[mid].v < v) lo = mid + 1;
      else hi = mid;
    }
    open.splice(lo, 0, { s, v });
  };
  while (open.length && out.length < maxStates) {
    const sim = open.pop()!.s;
    out.push(sim);
    const opts = sim.options();
    for (const o of opts) {
      const a = o.action;
      // Stay on this floor; stairs are handled by the caller.
      if (a.t === 'stairs') continue;
      counter.n++;
      const c = sim.clone();
      if (!c.apply(a)) continue;
      if (c.fi !== fi) {
        // Breach / hole into a neighbouring floor: collect there and come straight back.
        if (!returnVia(c, fi)) continue;
      }
      const k = c.key();
      const prev = best.get(k);
      if (prev != null && prev >= c.hero.hp) continue;
      best.set(k, c.hero.hp);
      push(c);
    }
  }
  return { states: out, expansions: counter.n };
}

/** After a breach/hole moved the sim to another floor: take what is free there and come back through the hole. */
function returnVia(c: ZoneSim, fi: number): boolean {
  c.autoTake();
  const back = c.options().find(o => o.action.t === 'hole' && o.action.to === c.floors[fi].n);
  if (!back) return false;
  return c.apply(back.action) && c.fi === fi;
}

/**
 * Walk back to floor j, open the door at `at`, grab what becomes reachable
 * (fighting cheap guards inside greedily), then walk forward to the
 * original floor. Returns null if any step is impossible.
 */
function returnAndOpen(sim: ZoneSim, j: number, at: number, counter: { n: number }): ZoneSim | null {
  const origin = sim.fi;
  const c = sim.clone();
  while (c.fi > j) {
    const back = c.options().find(o => o.action.t === 'stairs' && o.action.to === c.floors[c.fi - 1].n);
    if (!back || !c.apply(back.action)) return null;
  }
  const door = c.options().find(o => o.action.t === 'door' && o.action.at === at);
  if (!door || !c.apply(door.action)) return null;
  // Greedy sweep inside: fight anything affordable whose reward is positive, cheapest first.
  for (let k = 0; k < 12; k++) {
    counter.n++;
    const fights = c.options().filter(o => o.action.t === 'fight' && o.value * 3 + 50 > o.cost).sort((a, b) => a.cost - b.cost);
    if (!fights.length || !c.apply(fights[0].action)) break;
  }
  while (c.fi < origin) {
    const fwd = c.options().find(o => o.action.t === 'stairs' && o.action.to === c.floors[c.fi + 1].n);
    if (!fwd || !c.apply(fwd.action)) return null;
  }
  return c;
}

export function solveZone(tower: Tower, zone: number, heroIn: Hero, opts: SolveOptions = {}): SolveResult {
  const seedsN = opts.seeds ?? 2;
  const maxStates = opts.maxStates ?? 60;
  const counter = { n: 0 };
  let seeds: ZoneSim[] = [new ZoneSim(tower, zone, cloneHero(heroIn))];
  const last = seeds[0].floors.length - 1;
  let deepest = seeds[0];
  for (let fi = 0; fi <= last; fi++) {
    const exits: ZoneSim[] = [];
    const seen = new Map<string, number>();
    for (const seed of seeds) {
      const { states } = searchFloor(seed, maxStates, counter);
      for (const s of states) {
        if (fi === last) {
          if (s.done()) exits.push(s);
          continue;
        }
        const fwd = s.options().find(o => o.action.t === 'stairs' && o.action.to === s.floors[fi + 1].n);
        if (!fwd) continue;
        const c = s.clone();
        if (!c.apply(fwd.action)) continue;
        const k = c.key();
        const prev = seen.get(k);
        if (prev != null && prev >= c.hero.hp) continue;
        seen.set(k, c.hero.hp);
        exits.push(c);
      }
      if (seed.fi > deepest.fi || (seed.fi === deepest.fi && seed.hero.hp > deepest.hero.hp)) deepest = seed;
    }
    if (!exits.length) {
      // Tight caps can miss the only way through a hard floor: retry this floor with a much wider search.
      let widened = false;
      for (const seed of seeds) {
        const { states } = searchFloor(seed, maxStates * 8, counter);
        for (const s of states) {
          if (fi === last) {
            if (s.done()) { exits.push(s); widened = true; }
            continue;
          }
          const fwd = s.options().find(o => o.action.t === 'stairs' && o.action.to === s.floors[fi + 1].n);
          if (!fwd) continue;
          const c = s.clone();
          if (!c.apply(fwd.action)) continue;
          const k = c.key();
          const prev = seen.get(k);
          if (prev != null && prev >= c.hero.hp) continue;
          seen.set(k, c.hero.hp);
          exits.push(c);
          widened = true;
        }
      }
      if (!widened) return { ok: false, line: deepest.line, heroOut: deepest.hero, slack: 0, expansions: counter.n, reachedFloor: fi };
    }
    exits.sort((a, b) => score(b) - score(a));
    // Return macros from the best exits: an earlier floor's closed door we now hold a key for.
    if (fi > 0) {
      const extra: ZoneSim[] = [];
      for (const s of exits.slice(0, seedsN)) {
        for (let j = 0; j < s.fi; j++) {
          const g = s.floors[j];
          for (const key in g.doors) {
            const at = Number(key);
            if (s.isOpened(j, at) || s.hero.keys[g.doors[at]] <= 0) continue;
            counter.n++;
            const c = returnAndOpen(s, j, at, counter);
            if (!c) continue;
            const k = c.key();
            const prev = seen.get(k);
            if (prev != null && prev >= c.hero.hp) continue;
            seen.set(k, c.hero.hp);
            extra.push(c);
          }
        }
      }
      if (extra.length) {
        exits.push(...extra);
        exits.sort((a, b) => score(b) - score(a));
      }
    }
    if (fi === last) {
      const bestS = exits[0];
      return { ok: true, line: bestS.line, heroOut: bestS.hero, slack: bestS.hero.hp / Math.max(1, ZoneSim.zoneHealing(tower, zone)), expansions: counter.n, reachedFloor: last };
    }
    // Diverse seeds: best by score, plus best by raw HP and by stats if different.
    const pickSet = new Set<ZoneSim>(exits.slice(0, seedsN));
    const byHp = exits.slice().sort((a, b) => b.hero.hp - a.hero.hp)[0];
    const byStat = exits.slice().sort((a, b) => b.hero.atk + b.hero.def - (a.hero.atk + a.hero.def))[0];
    pickSet.add(byHp);
    pickSet.add(byStat);
    seeds = [...pickSet];
  }
  return { ok: false, line: deepest.line, heroOut: deepest.hero, slack: 0, expansions: counter.n, reachedFloor: deepest.fi };
}
