// The ONE place damage is computed. Classic 魔塔 formula with the mota-js
// ability conventions; perks hook in here so the solver and the game agree.

import type { Ability, DamageInfo, Hero, MonsterInst } from './types';

export interface FightCtx {
  /** Aura 光环 bonus (fraction) from living aura carriers on the floor. */
  auraPct?: number;
  /** Number of living 支援 monsters orthogonally adjacent to the target. */
  supporters?: number;
}

export const ARMOR_BREAK = 0.9;
export const COUNTER = 0.1;
export const PURIFY = 3;
export const SUPPORT_PCT = 0.25;

function has(m: MonsterInst, a: Ability): boolean {
  return m.abilities.includes(a);
}

function core(hero: Hero, m: MonsterInst, ctx: FightCtx, atk: number, def: number): Omit<DamageInfo, 'breakAtk' | 'breakDef'> {
  const perks = hero.perks;
  let monAtk = m.atk;
  let monDef = m.def;
  const monHp = m.hp;
  if (ctx.auraPct) {
    monAtk = Math.round(monAtk * (1 + ctx.auraPct));
    monDef = Math.round(monDef * (1 + ctx.auraPct));
  }
  if (has(m, 'mimic')) {
    monAtk = atk;
    monDef = def;
  }
  if (has(m, 'invincible') && !hero.cross) {
    return { damage: null, turns: 0, perDamage: 0, heroPerDamage: 0, initDamage: 0, monHp, monAtk, monDef };
  }
  let perDamage: number;
  if (has(m, 'sturdy')) {
    perDamage = atk > monDef ? (perks.includes('anvil') ? 2 : 1) : 0;
  } else {
    perDamage = Math.max(0, atk - monDef);
  }
  if (perDamage <= 0) {
    return { damage: null, turns: 0, perDamage: 0, heroPerDamage: 0, initDamage: 0, monHp, monAtk, monDef };
  }
  const turns = Math.ceil(monHp / perDamage);

  let effDef = def;
  if (has(m, 'magic')) effDef = perks.includes('warding') ? Math.floor(def / 2) : 0;
  let hit = Math.max(0, monAtk - effDef);
  if (has(m, 'magic')) hit = Math.max(0, hit - hero.shield);
  if (has(m, 'hit3')) hit *= 3;
  else if (has(m, 'hit2')) hit *= 2;
  if (has(m, 'counter')) hit += Math.floor(COUNTER * atk);
  if (ctx.supporters) hit = Math.round(hit * (1 + SUPPORT_PCT * ctx.supporters));

  let initDamage = 0;
  if (has(m, 'vamp')) initDamage += Math.floor(hero.hp * (m.vampPct ?? 0.2));
  if (has(m, 'armorBreak')) initDamage += Math.floor(ARMOR_BREAK * def);
  if (has(m, 'purify')) initDamage += PURIFY * hero.shield;
  if (has(m, 'fixed')) initDamage += m.fixedDmg ?? 0;

  let monsterTurns = turns - 1;
  if (has(m, 'first') && !perks.includes('vanguard')) monsterTurns += 1;
  let damage = initDamage + monsterTurns * hit;
  if (perks.includes('executioner') && turns <= 2) damage = initDamage;
  if (has(m, 'selfDestruct')) damage = Math.max(damage, hero.hp - 1);
  return { damage, turns, perDamage, heroPerDamage: hit, initDamage, monHp, monAtk, monDef };
}

/** Full damage info incl. the next ATK / DEF that would lower the damage. */
export function getDamageInfo(hero: Hero, m: MonsterInst, ctx: FightCtx = {}): DamageInfo {
  const base = core(hero, m, ctx, hero.atk, hero.def);
  let breakAtk: number | null = null;
  let breakDef: number | null = null;
  if (base.damage != null && base.damage > 0 && !has(m, 'selfDestruct')) {
    const limA = base.monDef + base.monHp + 1;
    for (let a = hero.atk + 1; a <= limA; a++) {
      const d = core(hero, m, ctx, a, hero.def).damage;
      if (d != null && d < base.damage) {
        breakAtk = a;
        break;
      }
    }
    const limD = base.monAtk + 1;
    for (let d = hero.def + 1; d <= limD; d++) {
      const r = core(hero, m, ctx, hero.atk, d).damage;
      if (r != null && r < base.damage) {
        breakDef = d;
        break;
      }
    }
  } else if (base.damage == null && !has(m, 'invincible')) {
    // Impossible fight: the ATK breakpoint is the first ATK that makes it possible.
    const limA = base.monDef + base.monHp + 1;
    for (let a = hero.atk + 1; a <= limA; a++) {
      if (core(hero, m, ctx, a, hero.def).damage != null) {
        breakAtk = a;
        break;
      }
    }
  }
  return { ...base, breakAtk, breakDef };
}

/** Damage for a phased (final) boss: phases fought back to back, no healing. */
export function getPhasedDamage(hero: Hero, m: MonsterInst, ctx: FightCtx = {}): number | null {
  let hp = hero.hp;
  let total = 0;
  const blocks = [m, ...(m.phases ?? [])];
  for (const b of blocks) {
    const d = getDamageInfo({ ...hero, hp }, b, ctx).damage;
    if (d == null || d >= hp) return null;
    hp -= d;
    total += d;
  }
  return total;
}

/** Can the hero fight this monster and survive? */
export function canWin(hero: Hero, m: MonsterInst, ctx: FightCtx = {}): boolean {
  const d = m.phases ? getPhasedDamage(hero, m, ctx) : getDamageInfo(hero, m, ctx).damage;
  return d != null && d < hero.hp;
}

/** Fight and return the resulting hero (caller checks canWin first). */
export function applyFight(hero: Hero, m: MonsterInst, ctx: FightCtx = {}): Hero {
  const d = m.phases ? getPhasedDamage(hero, m, ctx) : getDamageInfo(hero, m, ctx).damage;
  if (d == null) return hero;
  const blocks = [m, ...(m.phases ?? [])];
  let gold = 0;
  let exp = 0;
  let totalHp = 0;
  for (const b of blocks) {
    gold += b.gold;
    exp += b.exp;
    totalHp += b.hp;
  }
  if (hero.perks.includes('scholar')) exp = Math.round(exp * 1.3);
  let hp = hero.hp - d;
  if (hero.perks.includes('leech')) hp += Math.floor(totalHp * 0.05);
  return { ...hero, hp, gold: hero.gold + gold, exp: hero.exp + exp };
}
