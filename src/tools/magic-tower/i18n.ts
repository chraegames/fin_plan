// Bilingual labels (English + 中文) for every game entity the UI names.

import type { Ability, ItemKind, KeyColor, NpcKind } from './types';

export const ABILITY_LABEL: Record<Ability, { en: string; zh: string; desc: string }> = {
  first: { en: 'First strike', zh: '先攻', desc: 'Attacks before you do: one extra hit.' },
  magic: { en: 'Magic attack', zh: '魔攻', desc: 'Ignores your DEF (shield still helps).' },
  sturdy: { en: 'Sturdy', zh: '坚固', desc: 'Takes only 1 damage per hit.' },
  hit2: { en: 'Double hit', zh: '2连击', desc: 'Attacks twice per turn.' },
  hit3: { en: 'Triple hit', zh: '3连击', desc: 'Attacks three times per turn.' },
  vamp: { en: 'Vampire', zh: '吸血', desc: 'Drains a share of your current HP before the fight.' },
  armorBreak: { en: 'Armour break', zh: '破甲', desc: 'Deals 90% of your DEF as damage before the fight.' },
  counter: { en: 'Counter', zh: '反击', desc: 'Adds 10% of your ATK to every hit.' },
  mimic: { en: 'Mimic', zh: '模仿', desc: 'Its ATK and DEF equal yours.' },
  zone: { en: 'Zone', zh: '领域', desc: 'Costs HP for every step onto a tile next to it.' },
  fixed: { en: 'Fixed damage', zh: '固伤', desc: 'Deals flat damage before the fight.' },
  invincible: { en: 'Invincible', zh: '无敌', desc: 'Cannot be fought without the Cross.' },
  selfDestruct: { en: 'Self-destruct', zh: '自爆', desc: 'Leaves you at 1 HP.' },
  aura: { en: 'Aura', zh: '光环', desc: 'Buffs every other monster on the floor while alive.' },
  support: { en: 'Support', zh: '支援', desc: 'Strengthens adjacent monsters’ hits.' },
  purify: { en: 'Purify', zh: '净化', desc: 'Deals 3× your shield as damage before the fight.' },
};

export const ITEM_LABEL: Record<ItemKind, { en: string; zh: string }> = {
  redPotion: { en: 'Red potion', zh: '红药水' },
  bluePotion: { en: 'Blue potion', zh: '蓝药水' },
  holyWater: { en: 'Holy water', zh: '圣水' },
  atkGem: { en: 'Red gem', zh: '红宝石' },
  defGem: { en: 'Blue gem', zh: '蓝宝石' },
  yKey: { en: 'Yellow key', zh: '黄钥匙' },
  bKey: { en: 'Blue key', zh: '蓝钥匙' },
  rKey: { en: 'Red key', zh: '红钥匙' },
  stone: { en: 'Breach Stone', zh: '穿层石' },
  teleporter: { en: 'Floor teleporter', zh: '楼层传送器' },
  cross: { en: 'Cross', zh: '十字架' },
  bomb: { en: 'Bomb', zh: '炸弹' },
  pickaxe: { en: 'Pickaxe', zh: '铁镐' },
  sword: { en: 'Sword', zh: '宝剑' },
  shield: { en: 'Shield', zh: '盾牌' },
  shieldAmulet: { en: 'Warding amulet', zh: '护身符' },
};

export const KEY_LABEL: Record<KeyColor, { en: string; zh: string }> = {
  y: { en: 'Yellow', zh: '黄' },
  b: { en: 'Blue', zh: '蓝' },
  r: { en: 'Red', zh: '红' },
};

export const NPC_LABEL: Record<NpcKind, { en: string; zh: string }> = {
  shop: { en: 'Shop', zh: '商店' },
  sage: { en: 'Sage', zh: '老人' },
  locksmith: { en: 'Locksmith', zh: '锁匠' },
  tradePost: { en: 'Trade post', zh: '交易所' },
};

export const bi = (x: { en: string; zh: string }) => `${x.en} ${x.zh}`;
