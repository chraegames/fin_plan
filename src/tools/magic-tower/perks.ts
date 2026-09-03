// Perk catalogue. Every perk is a monotone bonus (never a penalty) so the
// generator can prove a tower without perks and any draft only helps.

import { createRng, hashSeed, shuffle } from './rng';
import type { PerkId } from './types';

export interface PerkDef {
  id: PerkId;
  en: string;
  zh: string;
  desc: string;
  /** First loop whose draft pool contains the perk. */
  fromLoop: number;
}

export const PERKS: Record<PerkId, PerkDef> = {
  vigor: { id: 'vigor', en: 'Vigor', zh: '活力', desc: 'Potions heal 25% more.', fromLoop: 1 },
  vanguard: { id: 'vanguard', en: 'Vanguard', zh: '先手', desc: 'Immune to first strike 先攻.', fromLoop: 1 },
  bulwark: { id: 'bulwark', en: 'Bulwark', zh: '壁垒', desc: 'DEF gems give +1 more.', fromLoop: 1 },
  edge: { id: 'edge', en: 'Edge', zh: '锋刃', desc: 'ATK gems give +1 more.', fromLoop: 1 },
  scholar: { id: 'scholar', en: 'Scholar', zh: '学者', desc: 'EXP from kills +30%.', fromLoop: 1 },
  merchant: { id: 'merchant', en: 'Merchant', zh: '商贾', desc: 'Shop prices −25%.', fromLoop: 1 },
  mason: { id: 'mason', en: 'Mason', zh: '石匠', desc: 'Each zone boss drops one extra Breach Stone.', fromLoop: 1 },
  keysmith: { id: 'keysmith', en: 'Keysmith', zh: '锁匠', desc: 'Every 4th yellow door refunds its key.', fromLoop: 1 },
  warding: { id: 'warding', en: 'Warding', zh: '结界', desc: 'Magic attack 魔攻 only ignores half your DEF.', fromLoop: 2 },
  anvil: { id: 'anvil', en: 'Anvil', zh: '铁砧', desc: 'Sturdy 坚固 monsters take 2 per hit.', fromLoop: 2 },
  leech: { id: 'leech', en: 'Leech', zh: '反噬', desc: 'Heal 5% of a killed monster’s HP.', fromLoop: 3 },
  executioner: { id: 'executioner', en: 'Executioner', zh: '处刑', desc: 'Fights that end within 2 turns cost no HP.', fromLoop: 5 },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

export function perkPool(loop: number): PerkId[] {
  return PERK_IDS.filter(id => PERKS[id].fromLoop <= loop);
}

/** Three perks offered after the boss of `zone`, deterministic per run and independent of play. */
export function draftPerks(seed: number, loop: number, zone: number, owned: PerkId[]): PerkId[] {
  const pool = perkPool(loop).filter(p => !owned.includes(p));
  const rng = createRng(hashSeed(seed, loop, zone, 0x9e));
  return shuffle(rng, pool.slice()).slice(0, 3);
}

export function perkLabel(id: PerkId): string {
  const p = PERKS[id];
  return `${p.en} ${p.zh}`;
}
