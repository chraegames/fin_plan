// The ten playthroughs. Each loop adds abilities, a rule change and (for a
// few) a different topology; monster numbers only rise mildly (curves.ts).

import type { Ability, TemplateId } from './types';

export type Topology = 'up' | 'hollow' | 'fold';

export interface LoopDef {
  n: number;
  en: string;
  zh: string;
  blurb: string;
  topology: Topology;
  /** Abilities the generator may use (cumulative). */
  abilities: Ability[];
  templates: TemplateId[];
  flags: {
    elites: boolean;
    eliteAffixes: number; // max extra abilities per elite
    holyWater: boolean;
    keyToGold: boolean; // unused keys → gold at every boss floor
    locksmith: boolean;
    pickaxe: boolean;
    mirror: boolean; // paired floors share a mirrored layout
    equipment: boolean; // sword/shield in vaults
    bombs: boolean;
    tradePost: boolean; // shops replaced by trade posts
    shieldAmulet: boolean;
    twoPerks: boolean;
    cross: boolean;
    potionMult: number;
    bossPhases: number; // final boss phases
  };
}

const base = {
  elites: false,
  eliteAffixes: 0,
  holyWater: false,
  keyToGold: false,
  locksmith: false,
  pickaxe: false,
  mirror: false,
  equipment: false,
  bombs: false,
  tradePost: false,
  shieldAmulet: false,
  twoPerks: false,
  cross: false,
  potionMult: 1,
  bossPhases: 3,
};

export const LOOPS: LoopDef[] = [
  {
    n: 1, en: 'The First Tower', zh: '初塔', topology: 'up',
    blurb: 'The classic climb. Learn the numbers.',
    abilities: ['first', 'hit2'],
    templates: ['breakpointGate', 'keyChoice', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base },
  },
  {
    n: 2, en: 'Arcane Tide', zh: '魔潮', topology: 'up',
    blurb: 'Magic ignores your armour; sturdy shells ignore your sword. Elites appear.',
    abilities: ['first', 'hit2', 'magic', 'sturdy'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 1, holyWater: true },
  },
  {
    n: 3, en: 'The Hollow Tower', zh: '空心塔', topology: 'hollow',
    blurb: 'Fifty floors up to a false summit. The crown is below.',
    abilities: ['first', 'hit2', 'magic', 'sturdy', 'vamp'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 1, holyWater: true },
  },
  {
    n: 4, en: 'Chains', zh: '锁链', topology: 'up',
    blurb: 'Keys you carry past a boss turn to gold. A locksmith sells more — for a price.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 1, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true },
  },
  {
    n: 5, en: 'Mirror Realm', zh: '镜界', topology: 'up',
    blurb: 'Floors come in mirrored pairs. Mimics wear your own numbers.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 2, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, mirror: true, equipment: true },
  },
  {
    n: 6, en: 'Backlash', zh: '反噬', topology: 'up',
    blurb: 'Your own strength is turned against you. Shops become trade posts.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone', 'counter', 'selfDestruct'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 2, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, equipment: true, bombs: true, tradePost: true },
  },
  {
    n: 7, en: 'Sentinels', zh: '哨兵', topology: 'up',
    blurb: 'Corridors bleed. Walk wide, or walk fast.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone', 'counter', 'selfDestruct', 'purify'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 2, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, equipment: true, bombs: true, shieldAmulet: true },
  },
  {
    n: 8, en: 'Choir', zh: '唱诗', topology: 'up',
    blurb: 'Auras and supporters: kill order is everything. Two blessings per boss.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone', 'counter', 'selfDestruct', 'purify', 'aura', 'support'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 2, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, equipment: true, bombs: true, shieldAmulet: true, twoPerks: true },
  },
  {
    n: 9, en: 'Relics', zh: '圣物', topology: 'up',
    blurb: 'Some things cannot be killed without the cross. Potions are thin.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone', 'counter', 'selfDestruct', 'purify', 'aura', 'support', 'invincible', 'fixed'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 2, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, equipment: true, bombs: true, shieldAmulet: true, twoPerks: true, cross: true, potionMult: 0.8 },
  },
  {
    n: 10, en: 'The Last Tower', zh: '终塔', topology: 'fold',
    blurb: 'Everything at once, and a fold in the middle of the climb.',
    abilities: ['first', 'hit2', 'hit3', 'magic', 'sturdy', 'vamp', 'armorBreak', 'mimic', 'zone', 'counter', 'selfDestruct', 'purify', 'aura', 'support', 'invincible', 'fixed'],
    templates: ['breakpointGate', 'sturdyVsMagic', 'keyChoice', 'holyWaterTiming', 'levelUpTiming', 'justEnough', 'vaultTradeoff', 'backtrackKey'],
    flags: { ...base, elites: true, eliteAffixes: 3, holyWater: true, keyToGold: true, locksmith: true, pickaxe: true, equipment: true, bombs: true, shieldAmulet: true, twoPerks: true, cross: true, potionMult: 0.8, bossPhases: 4 },
  },
];

export function loopDef(n: number): LoopDef {
  const d = LOOPS[n - 1];
  if (!d) throw new Error(`Unknown loop ${n}`);
  return d;
}

export function loopLabel(n: number): string {
  const d = loopDef(n);
  return `${d.en} ${d.zh}`;
}

/**
 * Progress direction per floor: +1 = the exit is the up-stairs, −1 = down.
 * 'hollow': floors 1–50 climb, 51–99 are basements B1..B49 descending.
 * 'fold': floors 41–50 are basements of floor 40 (descend), then climb again.
 */
export function floorDir(topology: Topology, floor: number): 1 | -1 {
  if (topology === 'hollow') return floor <= 50 ? 1 : -1;
  if (topology === 'fold') return floor >= 41 && floor <= 50 ? -1 : 1;
  return 1;
}

/** Display label for a floor under a topology. */
export function floorLabel(topology: Topology, floor: number): string {
  if (topology === 'hollow' && floor > 50) return `B${floor - 50}`;
  if (topology === 'fold' && floor >= 41 && floor <= 50) return `B${floor - 40}`;
  return `F${floor}`;
}

/** The floor whose exit leads into `floor` via a breach hatch (not stairs), if any. */
export function hatchSource(topology: Topology, floor: number): number | null {
  if (topology === 'hollow' && floor === 51) return 1;
  if (topology === 'fold' && floor === 41) return 40;
  return null;
}
