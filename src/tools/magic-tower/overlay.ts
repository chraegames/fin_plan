// Number overlays drawn on tiles: what a fight costs, what a pickup gives.

import { getDamageInfo, getPhasedDamage } from './combat';
import { diffOf, fightCtx, type GameState } from './game';
import { holyWaterHeal, potionHeal } from './items';
import { loopDef } from './loops';

export interface Overlay {
  text: string;
  color: string;
}

export const OVERLAY_COLORS = {
  free: '#7ee787', // no HP lost
  cheap: '#e6f0a0', // < 15% of HP
  mid: '#ffd166', // < 40%
  heavy: '#ff9f43', // < 100%
  lethal: '#ff5c5c',
  impossible: '#ff5c5c',
  heal: '#7ee787',
  atk: '#ff8a80',
  def: '#8ab4ff',
} as const;

export function overlaysFor(state: GameState): Map<number, Overlay> {
  const out = new Map<number, Overlay>();
  const f = state.tower.floors[state.run.floor - 1];
  const d = diffOf(state.run, f.n);
  const h = state.run.hero;
  const flags = loopDef(state.run.loop).flags;
  for (const k of Object.keys(f.mons).map(Number)) {
    if (d.killed.includes(k)) continue;
    const m = f.mons[k];
    const ctx = fightCtx(state.tower, state.run, f.n, k);
    const dmg = m.phases ? getPhasedDamage(h, m, ctx) : getDamageInfo(h, m, ctx).damage;
    if (dmg == null) out.set(k, { text: '???', color: OVERLAY_COLORS.impossible });
    else if (dmg >= h.hp) out.set(k, { text: String(dmg), color: OVERLAY_COLORS.lethal });
    else if (dmg === 0) out.set(k, { text: '0', color: OVERLAY_COLORS.free });
    else {
      const r = dmg / h.hp;
      out.set(k, { text: String(dmg), color: r < 0.15 ? OVERLAY_COLORS.cheap : r < 0.4 ? OVERLAY_COLORS.mid : OVERLAY_COLORS.heavy });
    }
  }
  for (const k of Object.keys(f.items).map(Number)) {
    if (d.taken.includes(k)) continue;
    const it = f.items[k];
    if (it.vault && !d.holes.includes(k)) continue;
    switch (it.kind) {
      case 'redPotion':
      case 'bluePotion':
        out.set(k, { text: `+${potionHeal(h, it.value, flags.potionMult)}`, color: OVERLAY_COLORS.heal });
        break;
      case 'holyWater':
        out.set(k, { text: `+${holyWaterHeal(h)}`, color: OVERLAY_COLORS.heal });
        break;
      case 'atkGem':
      case 'sword':
        out.set(k, { text: `+${it.value + (it.kind === 'atkGem' && h.perks.includes('edge') ? 1 : 0)}`, color: OVERLAY_COLORS.atk });
        break;
      case 'defGem':
      case 'shield':
        out.set(k, { text: `+${it.value + (it.kind === 'defGem' && h.perks.includes('bulwark') ? 1 : 0)}`, color: OVERLAY_COLORS.def });
        break;
      case 'shieldAmulet':
        out.set(k, { text: `+${it.value}`, color: OVERLAY_COLORS.def });
        break;
      default:
        break;
    }
  }
  return out;
}
