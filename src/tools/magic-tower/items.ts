// Item effects on the hero. One implementation for the generator's line
// simulation, the solver and the game reducer.

import { applyLevelUps } from './curves';
import type { Hero, Item, KeyColor } from './types';

export const KEY_ITEM: Record<KeyColor, Item['kind']> = { y: 'yKey', b: 'bKey', r: 'rKey' };

export function potionHeal(h: Hero, value: number, potionMult: number): number {
  let v = value * potionMult;
  if (h.perks.includes('vigor')) v *= 1.25;
  return Math.round(v);
}

/** Scaling heal (the classic is 5·ATK + 10·DEF; our stat scale is higher, so ATK + 2·DEF). */
export function holyWaterHeal(h: Hero): number {
  return h.atk + 2 * h.def;
}

/** Apply a picked-up item. `potionMult` comes from the loop flags. */
export function applyItem(h: Hero, it: Item, potionMult = 1): Hero {
  switch (it.kind) {
    case 'redPotion':
    case 'bluePotion':
      return { ...h, hp: h.hp + potionHeal(h, it.value, potionMult) };
    case 'holyWater':
      return { ...h, holyWater: h.holyWater + 1 };
    case 'atkGem':
      return { ...h, atk: h.atk + it.value + (h.perks.includes('edge') ? 1 : 0) };
    case 'defGem':
      return { ...h, def: h.def + it.value + (h.perks.includes('bulwark') ? 1 : 0) };
    case 'sword':
      return { ...h, atk: h.atk + it.value };
    case 'shield':
      return { ...h, def: h.def + it.value };
    case 'shieldAmulet':
      return { ...h, shield: h.shield + it.value };
    case 'yKey':
      return { ...h, keys: { ...h.keys, y: h.keys.y + 1 } };
    case 'bKey':
      return { ...h, keys: { ...h.keys, b: h.keys.b + 1 } };
    case 'rKey':
      return { ...h, keys: { ...h.keys, r: h.keys.r + 1 } };
    case 'stone':
      return { ...h, stones: h.stones + 1 + (it.bossDrop && h.perks.includes('mason') ? 1 : 0) };
    case 'teleporter':
      return { ...h, teleporter: true };
    case 'cross':
      return { ...h, cross: true };
    case 'bomb':
      return { ...h, bombs: h.bombs + 1 };
    case 'pickaxe':
      return { ...h, pickaxes: h.pickaxes + 1 };
  }
}

/** Drink one holy water (scaling heal). */
export function drinkHolyWater(h: Hero): Hero {
  if (h.holyWater <= 0) return h;
  return { ...h, holyWater: h.holyWater - 1, hp: h.hp + holyWaterHeal(h) };
}

/** Open a door of `color`: returns the hero with the key spent (Keysmith refunds every 4th yellow), or null. */
export function spendKey(h: Hero, color: KeyColor): Hero | null {
  if (h.keys[color] <= 0) return null;
  const keys = { ...h.keys, [color]: h.keys[color] - 1 };
  let yellowDoors = h.yellowDoors;
  if (color === 'y') {
    yellowDoors += 1;
    if (h.perks.includes('keysmith') && yellowDoors % 4 === 0) keys.y += 1;
  }
  return { ...h, keys, yellowDoors };
}

export function afterKill(h: Hero): Hero {
  return applyLevelUps(h);
}
