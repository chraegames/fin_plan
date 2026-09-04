// Monster manual rows: every living monster kind on the floor with its cost
// and the cheapest stat change that would lower it.

import { getDamageInfo, getPhasedDamage } from './combat';
import { diffOf, fightCtx, type GameState } from './game';
import type { MonsterInst } from './types';

export interface ManualRow {
  at: number;
  m: MonsterInst;
  count: number;
  /** HP the fight costs; null = cannot fight. */
  damage: number | null;
  /** Fraction of current HP (for colouring). */
  ratio: number;
  /** Next ATK value that lowers the damage, and the damage at that ATK. */
  atkNext: { atk: number; damage: number } | null;
  defNext: { def: number; damage: number } | null;
  /** When the fight is impossible: the ATK that makes it possible. */
  atkNeeded: number | null;
}

export function manualRows(state: GameState): ManualRow[] {
  const f = state.tower.floors[state.run.floor - 1];
  const d = diffOf(state.run, f.n);
  const h = state.run.hero;
  const groups = new Map<string, ManualRow>();
  for (const k of Object.keys(f.mons).map(Number)) {
    if (d.killed.includes(k)) continue;
    const m = f.mons[k];
    const key = `${m.id}|${m.hp}|${m.atk}|${m.def}|${m.abilities.join()}|${m.elite ? 1 : 0}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    const ctx = fightCtx(state.tower, state.run, f.n, k);
    const info = getDamageInfo(h, m, ctx);
    const damage = m.phases ? getPhasedDamage(h, m, ctx) : info.damage;
    let atkNext: ManualRow['atkNext'] = null;
    let defNext: ManualRow['defNext'] = null;
    let atkNeeded: number | null = null;
    if (damage == null) atkNeeded = info.breakAtk;
    else {
      if (info.breakAtk != null) {
        const d2 = getDamageInfo({ ...h, atk: info.breakAtk }, m, ctx).damage;
        if (d2 != null) atkNext = { atk: info.breakAtk, damage: d2 };
      }
      if (info.breakDef != null) {
        const d2 = getDamageInfo({ ...h, def: info.breakDef }, m, ctx).damage;
        if (d2 != null) defNext = { def: info.breakDef, damage: d2 };
      }
    }
    groups.set(key, { at: k, m, count: 1, damage, ratio: damage == null ? Infinity : damage / Math.max(1, h.hp), atkNext, defNext, atkNeeded });
  }
  return [...groups.values()].sort((a, b) => (a.damage ?? Infinity) - (b.damage ?? Infinity));
}
