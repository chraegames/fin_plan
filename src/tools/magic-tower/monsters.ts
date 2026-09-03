// Monster catalogue: names, sprite ids, tier and ability affinities. Stats
// are never stored here — the generator back-solves them per instance.

import type { Ability, MonsterRole } from './types';

export interface MonsterDef {
  id: string;
  en: string;
  zh: string;
  /** 1..5 → floors 1–20, 21–40, 41–60, 61–80, 81–99. */
  tier: number;
  /** Preferred roles (generator picks a monster whose roles include the wanted role). */
  roles: MonsterRole[];
  /** Abilities this monster naturally carries (subject to the loop's unlocked set). */
  affinity: Ability[];
  /** Sprite key in sprites.ts. */
  sprite: string;
}

export const MONSTERS: MonsterDef[] = [
  { id: 'greenSlime', en: 'Green Slime', zh: '绿史莱姆', tier: 1, roles: ['trash', 'hpWall'], affinity: [], sprite: 'slimeGreen' },
  { id: 'redSlime', en: 'Red Slime', zh: '红史莱姆', tier: 1, roles: ['trash', 'hpWall'], affinity: [], sprite: 'slimeRed' },
  { id: 'bat', en: 'Bat', zh: '小蝙蝠', tier: 1, roles: ['burst', 'trash'], affinity: ['first'], sprite: 'bat' },
  { id: 'skeleton', en: 'Skeleton', zh: '骷髅人', tier: 1, roles: ['trash', 'atkWall'], affinity: [], sprite: 'skeleton' },
  { id: 'apprentice', en: 'Apprentice', zh: '初级法师', tier: 1, roles: ['burst', 'trash'], affinity: ['magic'], sprite: 'mage' },
  { id: 'bigSlime', en: 'Big Slime', zh: '大史莱姆', tier: 2, roles: ['hpWall'], affinity: ['sturdy'], sprite: 'slimeBig' },
  { id: 'bigBat', en: 'Big Bat', zh: '大蝙蝠', tier: 2, roles: ['burst'], affinity: ['first', 'hit2'], sprite: 'batBig' },
  { id: 'skeletonSoldier', en: 'Skeleton Soldier', zh: '骷髅士兵', tier: 2, roles: ['trash', 'atkWall'], affinity: [], sprite: 'skeletonSoldier' },
  { id: 'orc', en: 'Orc', zh: '兽人', tier: 2, roles: ['hpWall', 'trash'], affinity: ['hit2'], sprite: 'orc' },
  { id: 'guard', en: 'Guard', zh: '初级卫兵', tier: 2, roles: ['atkWall'], affinity: ['sturdy'], sprite: 'guard' },
  { id: 'mage', en: 'Mage', zh: '高级法师', tier: 2, roles: ['burst'], affinity: ['magic', 'counter'], sprite: 'mageHigh' },
  { id: 'orcWarrior', en: 'Orc Warrior', zh: '兽人武士', tier: 3, roles: ['hpWall', 'burst'], affinity: ['hit2', 'armorBreak'], sprite: 'orcWarrior' },
  { id: 'golem', en: 'Stone Golem', zh: '石头人', tier: 3, roles: ['atkWall'], affinity: ['sturdy', 'fixed'], sprite: 'golem' },
  { id: 'ghost', en: 'Ghost', zh: '幽灵', tier: 3, roles: ['burst', 'trash'], affinity: ['magic', 'zone'], sprite: 'ghost' },
  { id: 'vampire', en: 'Vampire', zh: '吸血鬼', tier: 3, roles: ['burst', 'hpWall'], affinity: ['vamp', 'first'], sprite: 'vampire' },
  { id: 'knight', en: 'Knight', zh: '骑士', tier: 3, roles: ['atkWall', 'trash'], affinity: ['counter'], sprite: 'knight' },
  { id: 'darkKnight', en: 'Dark Knight', zh: '黑骑士', tier: 4, roles: ['atkWall', 'burst'], affinity: ['counter', 'armorBreak'], sprite: 'knightDark' },
  { id: 'wraith', en: 'Wraith', zh: '怨灵', tier: 4, roles: ['burst'], affinity: ['magic', 'vamp', 'zone'], sprite: 'wraith' },
  { id: 'warlock', en: 'Warlock', zh: '魔法师', tier: 4, roles: ['burst', 'trash'], affinity: ['magic', 'aura', 'purify'], sprite: 'warlock' },
  { id: 'minotaur', en: 'Minotaur', zh: '牛头人', tier: 4, roles: ['hpWall'], affinity: ['hit3', 'first'], sprite: 'minotaur' },
  { id: 'gargoyle', en: 'Gargoyle', zh: '石像鬼', tier: 4, roles: ['atkWall', 'hpWall'], affinity: ['sturdy', 'support'], sprite: 'gargoyle' },
  { id: 'dragonling', en: 'Dragonling', zh: '幼龙', tier: 5, roles: ['hpWall', 'burst'], affinity: ['hit2', 'fixed'], sprite: 'dragonling' },
  { id: 'lich', en: 'Lich', zh: '巫妖', tier: 5, roles: ['burst'], affinity: ['magic', 'aura', 'invincible'], sprite: 'lich' },
  { id: 'demon', en: 'Demon', zh: '恶魔', tier: 5, roles: ['atkWall', 'burst'], affinity: ['counter', 'mimic', 'selfDestruct'], sprite: 'demon' },
  { id: 'titan', en: 'Titan', zh: '泰坦', tier: 5, roles: ['hpWall', 'atkWall'], affinity: ['sturdy', 'hit2', 'support'], sprite: 'titan' },
];

export const BOSSES: MonsterDef[] = [
  { id: 'skeletonCaptain', en: 'Skeleton Captain', zh: '骷髅队长', tier: 1, roles: ['boss'], affinity: ['first'], sprite: 'bossSkeleton' },
  { id: 'batQueen', en: 'Bat Queen', zh: '蝠后', tier: 1, roles: ['boss'], affinity: ['first', 'hit2'], sprite: 'bossBat' },
  { id: 'orcChief', en: 'Orc Chieftain', zh: '兽人酋长', tier: 2, roles: ['boss'], affinity: ['hit2', 'armorBreak'], sprite: 'bossOrc' },
  { id: 'archmage', en: 'Archmage', zh: '大法师', tier: 2, roles: ['boss'], affinity: ['magic', 'counter'], sprite: 'bossMage' },
  { id: 'vampireLord', en: 'Vampire Lord', zh: '吸血鬼王', tier: 3, roles: ['boss'], affinity: ['vamp', 'first'], sprite: 'bossVampire' },
  { id: 'golemKing', en: 'Golem King', zh: '魔像王', tier: 3, roles: ['boss'], affinity: ['sturdy', 'fixed'], sprite: 'bossGolem' },
  { id: 'deathKnight', en: 'Death Knight', zh: '死亡骑士', tier: 4, roles: ['boss'], affinity: ['counter', 'armorBreak', 'hit2'], sprite: 'bossKnight' },
  { id: 'shadowLich', en: 'Shadow Lich', zh: '暗影巫妖', tier: 4, roles: ['boss'], affinity: ['magic', 'aura', 'purify'], sprite: 'bossLich' },
  { id: 'elderDragon', en: 'Elder Dragon', zh: '远古巨龙', tier: 5, roles: ['boss'], affinity: ['hit3', 'fixed', 'first'], sprite: 'bossDragon' },
  { id: 'towerSovereign', en: 'Tower Sovereign', zh: '塔主', tier: 5, roles: ['boss'], affinity: ['mimic', 'counter', 'magic', 'sturdy'], sprite: 'bossSovereign' },
];

const BY_ID = new Map<string, MonsterDef>([...MONSTERS, ...BOSSES].map(m => [m.id, m]));

export function monsterDef(id: string): MonsterDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown monster ${id}`);
  return d;
}

export function tierOfFloor(f: number): number {
  return Math.min(5, 1 + Math.floor((f - 1) / 20));
}

/** Candidates for a role at a floor: this tier and the one below. */
export function candidates(f: number, role: MonsterRole): MonsterDef[] {
  const tier = tierOfFloor(f);
  const out = MONSTERS.filter(m => (m.tier === tier || m.tier === tier - 1) && m.roles.includes(role));
  return out.length ? out : MONSTERS.filter(m => m.roles.includes(role));
}

export function monsterLabel(id: string): string {
  const d = monsterDef(id);
  return `${d.en} ${d.zh}`;
}
