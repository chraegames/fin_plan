// Number curves for the generator. Everything here is a function of the
// floor (1..99) and the loop (1..10); nothing depends on the hero.

import { ZONE_SIZE, type Hero } from './types';

export const START_HERO: Hero = {
  hp: 1000,
  atk: 10,
  def: 10,
  gold: 0,
  exp: 0,
  level: 1,
  keys: { y: 1, b: 0, r: 0 },
  stones: 0,
  shield: 0,
  cross: false,
  teleporter: false,
  bombs: 0,
  pickaxes: 0,
  holyWater: 0,
  perks: [],
  yellowDoors: 0,
  shopBuys: 0,
  sageBuys: 0,
  locksmithBuys: 0,
};

export function cloneHero(h: Hero): Hero {
  return { ...h, keys: { ...h.keys }, perks: [...h.perks] };
}

/** Reference hero power the monster curve is built against. */
export const atkRef = (f: number) => 10 + 4 * f + 0.06 * f * f;
export const defRef = (f: number) => 10 + 4.5 * f + 0.06 * f * f;
export const hpRef = (f: number) => 1000 + 120 * f + 3 * f * f;

/** Monster stat multiplier per loop (mild; slack, not numbers, sets difficulty). */
export const loopMult = (loop: number) => Math.pow(1.08, loop - 1);

/** Healing budget placed on a floor. */
export const healingBudget = (f: number, loop: number) => Math.round((150 + 14 * f + 0.08 * f * f) * (1 + 0.05 * (loop - 1)));

export const redPotion = (f: number, loop: number) => Math.round(40 * (1 + Math.floor(f / 10)) * (1 + 0.05 * (loop - 1)));
export const bluePotion = (f: number, loop: number) => redPotion(f, loop) * 3;
export const gemValue = (f: number) => 2 + Math.floor(f / 12);
export const equipValue = (f: number) => 8 + Math.floor(f / 6);

/** Target slack (HP left ÷ zone healing) for the intended line, by zone. */
export function slackTarget(zone: number, loop: number): number {
  let s = zone <= 2 ? 0.3 : zone <= 5 ? 0.18 : 0.1;
  if (loop === 10) s -= 0.04;
  return Math.max(0.05, s);
}
export const SLACK_FLOOR = 0.02;

/** EXP needed to reach level L+1 from level L. */
export const expForLevel = (L: number) => 20 * L * (L + 1);
export const levelHp = (L: number) => 100 + 10 * L;
export const levelStat = (L: number) => 1 + Math.floor(L / 4);

/** Apply pending level-ups (returns a new hero). */
export function applyLevelUps(h: Hero): Hero {
  let { exp, level, hp, atk, def } = h;
  while (exp >= expForLevel(level)) {
    exp -= expForLevel(level);
    level += 1;
    hp += levelHp(level);
    atk += levelStat(level);
    def += levelStat(level);
  }
  if (level === h.level) return h;
  return { ...h, exp, level, hp, atk, def };
}

/** Shop: n-th purchase price (n from 1) scaled by zone tier (1..10). */
export const shopPrice = (n: number, tier: number) => (10 * n * (n - 1) + 20) * tier;
export const shopAtk = (tier: number) => 2 * tier;
export const shopDef = (tier: number) => 4 * tier;
export const shopHp = (tier: number) => 200 * tier;
/** Sage: EXP price for +ATK / +DEF, scaled by tier. */
export const sagePrice = (n: number, tier: number) => (30 + 30 * n) * tier;
export const sageAtk = (tier: number) => 3 * tier;
export const sageDef = (tier: number) => 5 * tier;
export const locksmithPrice = (n: number, tier: number) => (40 + 40 * n) * tier;

export const zoneTier = (zone: number) => zone + 1;

/** Monster counts per floor (inclusive range). */
export function monsterCount(f: number): [number, number] {
  return [6 + Math.floor(f / 15), 10 + Math.floor(f / 12)];
}

/** Key conversion to gold at boss floors (loop 4 "Chains"). */
export const KEY_GOLD = { y: 5, b: 10, r: 20 } as const;

export function floorsOfZone(zone: number): number[] {
  const out: number[] = [];
  const start = zone * ZONE_SIZE + 1;
  const end = zone === 9 ? 99 : start + ZONE_SIZE - 1;
  for (let f = start; f <= end; f++) out.push(f);
  return out;
}
