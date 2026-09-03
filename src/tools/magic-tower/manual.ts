// Monster manual rows: every living monster on the floor with its cost.

import { getDamageInfo, getPhasedDamage } from './combat';
import { diffOf, fightCtx, type GameState } from './game';
import type { MonsterInst } from './types';

export interface ManualRow {
  at: number;
  m: MonsterInst;
  damage: number | null;
  breakAtk: number | null;
  breakDef: number | null;
}

export function manualRows(state: GameState): ManualRow[] {
  const f = state.tower.floors[state.run.floor - 1];
  const d = diffOf(state.run, f.n);
  const rows: ManualRow[] = [];
  for (const k of Object.keys(f.mons).map(Number)) {
    if (d.killed.includes(k)) continue;
    const m = f.mons[k];
    const ctx = fightCtx(state.tower, state.run, f.n, k);
    const info = getDamageInfo(state.run.hero, m, ctx);
    const damage = m.phases ? getPhasedDamage(state.run.hero, m, ctx) : info.damage;
    rows.push({ at: k, m, damage, breakAtk: info.breakAtk, breakDef: info.breakDef });
  }
  // Group identical monsters (same id + stats) to keep the list short.
  const seen = new Map<string, ManualRow>();
  for (const r of rows) {
    const key = `${r.m.id}|${r.m.hp}|${r.m.atk}|${r.m.def}|${r.m.abilities.join()}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return [...seen.values()].sort((a, b) => (a.damage ?? Infinity) - (b.damage ?? Infinity));
}

