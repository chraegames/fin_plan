// Naive deterministic policies. A tower is only "non-obvious" if these fail
// where the intended line succeeds. Each policy sees exactly what a player
// sees (the whole floor) and follows one simple rule.

import { cloneHero } from './curves';
import { reach } from './path';
import type { Action, Hero, Tower } from './types';
import { ZoneSim, type SimOption } from './zonesim';

export type PolicyId = 'collectAll' | 'nearestFirst' | 'greedyValue' | 'atkFirst' | 'defFirst' | 'forwardOnly';
export const POLICIES: PolicyId[] = ['collectAll', 'nearestFirst', 'greedyValue', 'atkFirst', 'defFirst', 'forwardOnly'];

export interface PolicyResult {
  id: PolicyId;
  ok: boolean;
  hero: Hero;
  steps: number;
  reachedFloor: number;
  line: Action[];
}

/** What becomes reachable if the blocker at `at` were removed: item value and gem kinds. */
function peek(sim: ZoneSim, at: number): { value: number; atkGems: number; defGems: number } {
  const f = sim.floor;
  const st = sim.state();
  const st2 = { ...st, isKilled: (i: number) => i === at || st.isKilled(i), isOpened: (i: number) => i === at || st.isOpened(i) };
  const r0 = sim.reach();
  const r = reach(f, st2, sim.pos);
  let value = 0, atkGems = 0, defGems = 0;
  for (const k in f.items) {
    const i = Number(k);
    if (st.isTaken(i) || r.cost[i] === Infinity || r0.cost[i] !== Infinity) continue;
    const it = f.items[i];
    if (it.kind === 'atkGem') { atkGems++; value += it.value * 200; }
    else if (it.kind === 'defGem') { defGems++; value += it.value * 250; }
    else if (it.kind === 'redPotion' || it.kind === 'bluePotion') value += it.value;
    else if (it.kind.endsWith('Key')) value += 60;
    else value += 80;
  }
  if (r.cost[f.exit] !== Infinity && r0.cost[f.exit] === Infinity) value += 150;
  return { value, atkGems, defGems };
}

function choose(id: PolicyId, sim: ZoneSim, opts: SimOption[]): SimOption | null {
  const fights = opts.filter(o => o.action.t === 'fight' || o.action.t === 'door' || o.action.t === 'breach');
  const shop = opts.filter(o => o.action.t === 'shop');
  const fwd = opts.find(o => o.action.t === 'stairs' && o.action.to > sim.floor.n);
  const back = opts.find(o => o.action.t === 'stairs' && o.action.to < sim.floor.n);
  const hw = opts.find(o => o.action.t === 'holyWater' || (o.action.t === 'take'));
  const gain = (o: SimOption) => {
    if (o.action.t === 'fight' || o.action.t === 'door') {
      const p = peek(sim, o.action.at);
      let v = p.value + o.value * 3;
      if (id === 'atkFirst') v += p.atkGems * 200;
      if (id === 'defFirst') v += p.defGems * 200;
      return v;
    }
    return o.value * 10;
  };
  const shopPick = shop.find(o => o.action.t === 'shop' && o.action.what === (id === 'atkFirst' ? 'atk' : id === 'collectAll' ? 'hp' : 'def'));
  switch (id) {
    case 'collectAll': {
      if (shopPick) return shopPick;
      if (fights.length) return fights.slice().sort((a, b) => a.cost - b.cost)[0];
      if (hw && sim.hero.hp < 400) return hw;
      return fwd ?? null;
    }
    case 'nearestFirst': {
      if (fights.length) return fights.slice().sort((a, b) => a.cost - b.cost || gain(b) - gain(a))[0];
      if (shopPick) return shopPick;
      if (hw) return hw;
      return fwd ?? back ?? null;
    }
    case 'greedyValue':
    case 'atkFirst':
    case 'defFirst':
    case 'forwardOnly': {
      const scored = fights.map(o => ({ o, net: gain(o) - o.cost })).sort((a, b) => b.net - a.net);
      if (scored.length && scored[0].net > 0) return scored[0].o;
      if (shopPick) return shopPick;
      if (hw && sim.hero.hp < 300) return hw;
      if (fwd) return fwd;
      if (scored.length) return scored[0].o; // nothing else to do: take the least bad
      if (id !== 'forwardOnly' && back) return back;
      return null;
    }
  }
}

export function runPolicy(id: PolicyId, tower: Tower, zone: number, heroIn: Hero, maxSteps = 600): PolicyResult {
  const sim = new ZoneSim(tower, zone, cloneHero(heroIn));
  const visited = new Set<string>();
  let steps = 0;
  while (steps < maxSteps) {
    if (sim.done()) return { id, ok: true, hero: sim.hero, steps, reachedFloor: sim.fi, line: sim.line };
    const opts = sim.options();
    const pick = choose(id, sim, opts);
    if (!pick) break;
    const k = pick.action.t === 'stairs' ? `${sim.key()}>${pick.action.to}` : '';
    if (k) {
      if (visited.has(k)) break; // ping-pong between floors
      visited.add(k);
    }
    if (!sim.apply(pick.action)) break;
    steps++;
  }
  return { id, ok: sim.done(), hero: sim.hero, steps, reachedFloor: sim.fi, line: sim.line };
}
