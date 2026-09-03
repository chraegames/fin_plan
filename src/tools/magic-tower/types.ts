// Magic Tower 魔塔 — shared types. Pure data; no React, no DOM.
//
// A tower is generated once from (seed, loop) and never mutated; the run
// records what the hero changed on each floor as *diffs*. Everything the
// solver, the validator and the game reducer agree on lives here.

export const W = 11;
export const H = 11;
export const N = W * H;
export const FLOORS = 99;
export const ZONE_SIZE = 10;
export const ZONES = 10; // zones 0..9; zone 9 holds floors 91..99

/** Generator version stored in every save; a mismatch refuses the save. */
export const GEN_VERSION = 1;

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export type KeyColor = 'y' | 'b' | 'r';

/** Base terrain of a tile. Monsters/items/doors/NPCs are overlays keyed by index. */
export const T = {
  Floor: 0,
  Wall: 1,
  VaultWall: 2,
  StairUp: 3,
  StairDown: 4,
  /** Sealed hatch marker (inverted / fold loops): standable; breach from it enters the basement. */
  Hatch: 5,
} as const;
export type TileBase = (typeof T)[keyof typeof T];

export type Ability =
  | 'first' // 先攻
  | 'magic' // 魔攻
  | 'sturdy' // 坚固
  | 'hit2' // 2连击
  | 'hit3' // 3连击
  | 'vamp' // 吸血
  | 'armorBreak' // 破甲
  | 'counter' // 反击
  | 'mimic' // 模仿
  | 'zone' // 领域
  | 'fixed' // 固伤
  | 'invincible' // 无敌
  | 'selfDestruct' // 自爆
  | 'aura' // 光环
  | 'support' // 支援
  | 'purify'; // 净化

export const ALL_ABILITIES: Ability[] = [
  'first', 'magic', 'sturdy', 'hit2', 'hit3', 'vamp', 'armorBreak', 'counter', 'mimic',
  'zone', 'fixed', 'invincible', 'selfDestruct', 'aura', 'support', 'purify',
];

export type MonsterRole = 'trash' | 'hpWall' | 'atkWall' | 'burst' | 'boss';

export interface MonsterInst {
  /** Catalogue id (sprite + names). */
  id: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
  abilities: Ability[];
  role: MonsterRole;
  elite?: boolean;
  boss?: 'zone' | 'final';
  /** Final boss: phases fought back to back after this block. */
  phases?: MonsterInst[];
  /** 吸血: fraction of current HP drained before the fight. */
  vampPct?: number;
  /** 领域: HP lost per step onto a tile adjacent to this monster. */
  zoneDmg?: number;
  /** 固伤: flat pre-battle damage. */
  fixedDmg?: number;
  /** 光环: +% ATK/DEF to the other monsters on the floor while alive. */
  auraPct?: number;
}

export type ItemKind =
  | 'redPotion'
  | 'bluePotion'
  | 'holyWater'
  | 'atkGem'
  | 'defGem'
  | 'yKey'
  | 'bKey'
  | 'rKey'
  | 'stone'
  | 'teleporter'
  | 'cross'
  | 'bomb'
  | 'pickaxe'
  | 'sword'
  | 'shield'
  | 'shieldAmulet'; // magic shield (+shield stat)

export interface Item {
  kind: ItemKind;
  /** HP for potions, stat for gems/equipment, shield for amulet; 0 for keys/tools. */
  value: number;
  /** Placed inside a vault ring (breach-only). */
  vault?: boolean;
  /** Dropped by a zone boss (Mason perk doubles stones from these). */
  bossDrop?: boolean;
}

export type NpcKind = 'shop' | 'sage' | 'locksmith' | 'tradePost';
export interface Npc {
  kind: NpcKind;
  /** Zone tier used for prices/gains. */
  tier: number;
}

export interface Floor {
  n: number; // 1..99
  label: string; // 'F12' | 'B7'
  zone: number; // 0..9
  archetype: string;
  base: TileBase[]; // length N
  entry: number; // tile index of the stairs you arrive on
  exit: number; // tile index of the stairs that lead onward
  mons: Record<number, MonsterInst>;
  items: Record<number, Item>;
  doors: Record<number, KeyColor>;
  npcs: Record<number, Npc>;
  /** Wing interiors (tile indices) — used by the breach-exposure cap and tests. */
  wings: { tiles: number[]; lock: number; lockKind: 'door' | 'guard' }[];
  /** Vault ring centre indices. */
  vaults: number[];
  /** Direction of progress: +1 climbs (exit = up stairs), -1 descends. */
  dir: 1 | -1;
  /** A sealed hatch on this floor: breaching down from it (with a stone) enters floor `to`. */
  hatch?: { at: number; to: number };
}

export type PerkId =
  | 'vigor'
  | 'vanguard'
  | 'bulwark'
  | 'edge'
  | 'scholar'
  | 'merchant'
  | 'mason'
  | 'keysmith'
  | 'warding'
  | 'anvil'
  | 'leech'
  | 'executioner';

export interface Hero {
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
  level: number;
  keys: { y: number; b: number; r: number };
  stones: number;
  shield: number;
  cross: boolean;
  teleporter: boolean;
  bombs: number;
  pickaxes: number;
  holyWater: number;
  perks: PerkId[];
  /** Deterministic counters for perks (Keysmith) and shop pricing. */
  yellowDoors: number;
  shopBuys: number;
  sageBuys: number;
  locksmithBuys: number;
}

/** One step of a solution line. Tile-targeted actions; `floor` is 1-based. */
export type Action =
  | { t: 'fight'; floor: number; at: number }
  | { t: 'door'; floor: number; at: number }
  | { t: 'take'; floor: number; at: number }
  | { t: 'stairs'; floor: number; to: number }
  | { t: 'breach'; floor: number; at: number; to: number }
  | { t: 'hole'; floor: number; at: number; to: number }
  | { t: 'holyWater'; floor: number }
  | { t: 'shop'; floor: number; at: number; what: 'atk' | 'def' | 'hp' }
  | { t: 'sage'; floor: number; at: number; what: 'atk' | 'def' }
  | { t: 'locksmith'; floor: number; at: number; color: KeyColor };

export type TemplateId =
  | 'breakpointGate'
  | 'sturdyVsMagic'
  | 'keyChoice'
  | 'holyWaterTiming'
  | 'levelUpTiming'
  | 'justEnough'
  | 'vaultTradeoff'
  | 'backtrackKey';

export interface TemplateInstance {
  id: TemplateId;
  zone: number;
  /** Floor numbers + tile indices the template refers to (meaning depends on id). */
  refs: { floor: number; at: number }[];
  /** Numbers the check needs (e.g. gate ATK threshold). */
  params: Record<string, number>;
}

export interface ZoneInfo {
  zone: number;
  floors: number[]; // floor numbers in progress order
  /** Intended line built during generation (proof of solvability). */
  line: Action[];
  /** HP the intended line ends the zone with ÷ healing available in the zone. */
  lineSlack: number;
  /** Intended line's hero at zone exit. */
  heroOut: Hero;
  templates: TemplateInstance[];
  /** Perks the calibration hero held while this zone was generated. */
  perks: PerkId[];
  /** Floor n → keys placed on floor n that unlock a wing on an earlier floor. */
  backtracks: { keyFloor: number; keyAt: number; wingFloor: number; door: number }[];
}

export interface Tower {
  seed: number;
  loop: number;
  genVersion: number;
  /** Sparse: floors of zones not yet generated are undefined. */
  floors: Floor[]; // index n-1
  /** Sparse: zones are generated one at a time as the run advances. */
  zones: ZoneInfo[];
  /** Total healing placed per floor (for slack calculations). */
  healing: number[];
}

export interface FloorDiff {
  taken: number[];
  killed: number[];
  opened: number[];
  /** Tiles turned into holes (breach passages) on this floor. */
  holes: number[];
  /** Walls removed with a pickaxe. */
  dug: number[];
}

export interface Snapshot {
  hero: Hero;
  floor: number;
  pos: number;
  diffs: Record<number, FloorDiff>;
}

export interface Run {
  v: 1;
  seed: number;
  loop: number;
  genVersion: number;
  hero: Hero;
  floor: number; // 1..99
  pos: number;
  facing: Dir;
  diffs: Record<number, FloorDiff>;
  visited: number[];
  /** Perk ids offered after a boss; null when no draft is pending. */
  pendingDraft: PerkId[] | null;
  history: Snapshot[];
  log: string[];
  steps: number;
  status: 'playing' | 'dead' | 'won';
  /** Zone index of the last defeated zone boss (−1 none). */
  bossesDown: number;
}

export interface CodexEntry {
  id: string;
  abilities: Ability[];
  seen: number;
  killed: number;
  bestLoop: number;
}

export interface Meta {
  v: 1;
  unlockedLoop: number; // 1..10
  codex: Record<string, CodexEntry>;
  records: Record<number, { bestFloor: number; clears: number; bestSteps?: number }>;
}

export interface DamageInfo {
  /** Total HP lost, or null when the fight is impossible. */
  damage: number | null;
  turns: number;
  /** Damage the hero deals per turn. */
  perDamage: number;
  /** Damage the hero takes per monster turn (after abilities). */
  heroPerDamage: number;
  /** Pre-battle damage (吸血/破甲/净化/固伤). */
  initDamage: number;
  monHp: number;
  monAtk: number;
  monDef: number;
  /** Smallest ATK / DEF that lowers `damage`, or null if none within range. */
  breakAtk: number | null;
  breakDef: number | null;
}

export const XY = (i: number) => ({ x: i % W, y: Math.floor(i / W) });
export const IDX = (x: number, y: number) => y * W + x;
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

/** Orthogonal neighbours of a tile index. */
export function neighbours(i: number): number[] {
  const { x, y } = XY(i);
  const out: number[] = [];
  for (let d = 0; d < 4; d++) {
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (inBounds(nx, ny)) out.push(IDX(nx, ny));
  }
  return out;
}

export function zoneOf(floor: number): number {
  return Math.min(ZONES - 1, Math.floor((floor - 1) / ZONE_SIZE));
}

export function isBossFloor(floor: number): boolean {
  return floor % ZONE_SIZE === 0 || floor === FLOORS;
}
