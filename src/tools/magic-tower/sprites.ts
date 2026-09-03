// Pixel art. Every sprite is 16×16, drawn as rows of characters; each
// character maps to a colour in the sprite's palette ('.' = transparent).
// Monsters share body templates with different palettes; bosses add a crown.
// Rasterised once into an atlas (see buildAtlas) and drawn at 2× (32 px).

export const TILE = 16;

export interface Sprite {
  rows: string[];
  pal: Record<string, string>;
}

const O = '#14121c'; // outline

// ─── Templates ──────────────────────────────────────────────────────────

const slimeRows = [
  '................',
  '................',
  '................',
  '......oooo......',
  '....oobbbboo....',
  '...obbhbbbbbo...',
  '..obbhhbbbbbbo..',
  '..obbbbbbbbbbo..',
  '.obbewbbbbewbbo.',
  '.obbwwbbbbwwbbo.',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  '..obbbbbbbbbbo..',
  '...oobbbbbboo...',
  '.....oooooo.....',
  '................',
];
const batRows = [
  '................',
  '................',
  '..oo........oo..',
  '.owwo......owwo.',
  '.owwwo....owwwo.',
  '.owwwwooooowwwo.',
  '..owwwbbbbwwwo..',
  '..owwbebbebwwo..',
  '...owbbbbbbwo...',
  '...owbtbbtbwo...',
  '....obbbbbbo....',
  '.....obbbbo.....',
  '......oooo......',
  '......o..o......',
  '................',
  '................',
];
const humanoidRows = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '....ohhhhhho....',
  '....osseesso....',
  '....ossssssoo...',
  '.....oossoo.w...',
  '...oobbbbboowo..',
  '..obbbbbbbbbowo.',
  '..obsbbbbbbsbwo.',
  '..oobbbbbbboowo.',
  '....obbbbbo..o..',
  '....ollollo.....',
  '....ollollo.....',
  '...oooooooo.....',
  '................',
];
const robedRows = [
  '................',
  '......oooo......',
  '.....ohhhhho....',
  '....ohhhhhhho...',
  '....ohsseeshho..',
  '.....ossssso.w..',
  '......ossso..w..',
  '....oobbbbbooww.',
  '...obbbbbbbbbow.',
  '...obbbbbbbbbow.',
  '..obbbbbbbbbbbo.',
  '..obbbbbbbbbbbo.',
  '..obbbbbbbbbbbo.',
  '..obbbbbbbbbbbo.',
  '..oooooooooooo..',
  '................',
];
const golemRows = [
  '................',
  '....oooooooo....',
  '...obbbbbbbbo...',
  '..obbhbbbbhbbo..',
  '..obbbeebbeebo..',
  '..obbbbbbbbbbo..',
  '.oobbbbbbbbbboo.',
  'obbobbbbbbbbobbo',
  'obbobbbbbbbbobbo',
  'obbobbbbbbbbobbo',
  '.ooobbbbbbbbooo.',
  '...obbbbbbbbo...',
  '...obbboobbbo...',
  '...obbbo.obbbo..',
  '...oooo...oooo..',
  '................',
];
const ghostRows = [
  '................',
  '......oooo......',
  '....oobbbboo....',
  '...obbbbbbbbo...',
  '..obbebbbbebbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obbobbobbobo..',
  '..oo.oo.oo.oo...',
  '................',
  '................',
  '................',
];
const beastRows = [
  '................',
  '..oo........oo..',
  '.ohho......ohho.',
  '..oohooooooohoo.',
  '...ohhhhhhhho...',
  '...ohsseessho...',
  '...ohssssssho...',
  '....ossooss.w...',
  '...oobbbbboowo..',
  '..obbbbbbbbbowo.',
  '..obsbbbbbbsbwo.',
  '..oobbbbbbbooo..',
  '....obbbbbo.....',
  '....ollollo.....',
  '...oooooooo.....',
  '................',
];
const dragonRows = [
  '................',
  '.......oooo.....',
  '......ohhhho....',
  '.....ohheeho....',
  '....ohhhhhhhoo..',
  '...ohbbhhhhoooo.',
  '..obbbbbhhhooo..',
  '.obwbbbbbbhho...',
  '.obwwbbbbbbbbo..',
  '.obwwwbbbbbbbbo.',
  '..obwwbbbbbbbbo.',
  '...obbbbobbbbo..',
  '....obbo.obbo...',
  '....oooo.oooo...',
  '................',
  '................',
];
const CROWN = ['......c.c.c.....', '......ccccc.....'];

function withCrown(rows: string[]): string[] {
  const out = rows.slice();
  out[0] = CROWN[0];
  out[1] = CROWN[1].replace(/\./g, (_ch, i: number) => (rows[1][i] === '.' ? '.' : rows[1][i]));
  return out;
}

function sprite(rows: string[], pal: Record<string, string>): Sprite {
  return { rows, pal: { o: O, ...pal } };
}

// ─── Terrain ────────────────────────────────────────────────────────────

const FLOOR_ROWS = [
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'aaaaaaaabaaaaaaa',
  'bbbbbbbbbbbbbbbb',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'aaaaaaaaaaaaaaab',
  'bbbbbbbbbbbbbbbb',
];
const WALL_ROWS = [
  'mmmmmmmmmmmmmmmm',
  'mhhhhhhhmhhhhhhh',
  'mbbbbbbbmbbbbbbb',
  'mbbbbbbbmbbbbbbb',
  'mddddddddmdddddd',
  'mmmmmmmmmmmmmmmm',
  'hhhmhhhhhhhmhhhh',
  'bbbmbbbbbbbmbbbb',
  'bbbmbbbbbbbmbbbb',
  'dddmdddddddmdddd',
  'mmmmmmmmmmmmmmmm',
  'mhhhhhhhmhhhhhhh',
  'mbbbbbbbmbbbbbbb',
  'mbbbbbbbmbbbbbbb',
  'mddddddddmdddddd',
  'mmmmmmmmmmmmmmmm',
];
const STAIR_UP_ROWS = [
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaoooooa',
  'aaaaaaaaaaobbbba',
  'aaaaaaaaaaobbbba',
  'aaaaaaaoooobbbba',
  'aaaaaaaobbbbbbba',
  'aaaaaaaobbbbbbba',
  'aaaaoooobbbbbbba',
  'aaaaobbbbbbbbbba',
  'aaaaobbbbbbbbbba',
  'aoooobbbbbbbbbba',
  'aobbbbbbbbbbbbba',
  'aobbbbbbbbbbbbba',
  'aooooooooooooooa',
  'aaaaaaaaaaaaaaaa',
];
const STAIR_DOWN_ROWS = STAIR_UP_ROWS.map(r => r.split('').reverse().join(''));
const HOLE_ROWS = [
  'aaaaaaaaaaaaaaaa',
  'aaaaaoooooaaaaaa',
  'aaaooddddddooaaa',
  'aaoddddddddddoaa',
  'aoddddbddddddoaa',
  'aoddddddddddddoa',
  'aodddddddddddoaa',
  'aoddddddddbdddoa',
  'aaoddddddddddoaa',
  'aaodddddddddoaaa',
  'aaaoodddddooaaaa',
  'aaaaaoooooaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
];
const HATCH_ROWS = [
  'aaaaaaaaaaaaaaaa',
  'aooooooooooooooa',
  'aobbbbbbbbbbbboa',
  'aobmmmmmmmmmmboa',
  'aobmbbbbbbbbmboa',
  'aobmbbbccbbbmboa',
  'aobmbbcccccbmboa',
  'aobmbbccbccbmboa',
  'aobmbbcccccbmboa',
  'aobmbbbccbbbmboa',
  'aobmbbbbbbbbmboa',
  'aobmmmmmmmmmmboa',
  'aobbbbbbbbbbbboa',
  'aooooooooooooooa',
  'aaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaa',
];
const VAULT_ROWS = [
  'mmmmmmmmmmmmmmmm',
  'mggggggggggggggm',
  'mgddddddddddddgm',
  'mgdggggggggggdgm',
  'mgdgddddddddgdgm',
  'mgdgdggggggdgdgm',
  'mgdgdgddddgdgdgm',
  'mgdgdgdggdgdgdgm',
  'mgdgdgdggdgdgdgm',
  'mgdgdgddddgdgdgm',
  'mgdgdggggggdgdgm',
  'mgdgddddddddgdgm',
  'mgdggggggggggdgm',
  'mgddddddddddddgm',
  'mggggggggggggggm',
  'mmmmmmmmmmmmmmmm',
];
const DOOR_ROWS = [
  'aaaaaaaaaaaaaaaa',
  'aaooooooooooooaa',
  'aoddddddddddddoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbooobbbdoa',
  'aodbbbbokobbbdoa',
  'aodbbbbooobbbdoa',
  'aodbbbbbkbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aodbbbbbbbbbbdoa',
  'aoddddddddddddoa',
  'aooooooooooooooa',
];

// ─── Items ──────────────────────────────────────────────────────────────

const POTION_ROWS = [
  '................',
  '......oooo......',
  '......occo......',
  '......occo......',
  '.....oooooo.....',
  '....obbbbbbo....',
  '...obbbbbbbbo...',
  '...obbbbhbbbo...',
  '...obbbbbbbbo...',
  '...obbbbbbbbo...',
  '...obbbbbbbbo...',
  '...obbbbbbbbo...',
  '....obbbbbbo....',
  '.....oooooo.....',
  '................',
  '................',
];
const GEM_ROWS = [
  '................',
  '................',
  '.......oo.......',
  '......ohho......',
  '.....ohhhho.....',
  '....ohhbbhho....',
  '...ohhbbbbhho...',
  '..ohhbbbbbbhho..',
  '..obbbbbbbbbbo..',
  '...obbbbbbbbo...',
  '....obbbbbbo....',
  '.....obbbbo.....',
  '......obbo......',
  '.......oo.......',
  '................',
  '................',
];
const KEY_ROWS = [
  '................',
  '................',
  '....oooo........',
  '...okkkko.......',
  '..okko.kko......',
  '..okk...kko.....',
  '..okko.kkkko....',
  '...okkkkkokko...',
  '....oooo.okko...',
  '..........okko..',
  '...........okko.',
  '...........okkko',
  '............ooo.',
  '................',
  '................',
  '................',
];
const STONE_ROWS = [
  '................',
  '................',
  '......oooo......',
  '....oobhhboo....',
  '...obbhhhhbbo...',
  '..obbbhhhhbbbo..',
  '..obbbbhhbbbbo..',
  '..obbbbbbbbbbo..',
  '..oddbbbbbbddo..',
  '..oddddbbdddd o.',
  '...odddddddd o..',
  '....oodddddoo...',
  '......oooo......',
  '................',
  '................',
  '................',
].map(r => r.replace(/ /g, 'o'));
const CROSS_ROWS = [
  '................',
  '......oooo......',
  '......occo......',
  '......occo......',
  '...ooooccoooo...',
  '...occccccccco..',
  '...occccccccco..',
  '...ooooccoooo...',
  '......occo......',
  '......occo......',
  '......occo......',
  '......occo......',
  '......occo......',
  '......oooo......',
  '................',
  '................',
];
const TELEPORTER_ROWS = [
  '................',
  '.....oooooo.....',
  '....obbbbbbo....',
  '...obccccccbo...',
  '..obccdddddccbo.',
  '..obcdddddddcbo.',
  '..obcddhhhddcbo.',
  '..obcddhhhddcbo.',
  '..obcddhhhddcbo.',
  '..obcdddddddcbo.',
  '..obccdddddccbo.',
  '...obccccccbo...',
  '....obbbbbbo....',
  '.....oooooo.....',
  '................',
  '................',
];
const BOMB_ROWS = [
  '................',
  '..........cc....',
  '.........cc.....',
  '........oo......',
  '......oobboo....',
  '.....obbbbbbo...',
  '....obbhbbbbbo..',
  '....obhbbbbbbo..',
  '....obbbbbbbbo..',
  '....obbbbbbbbo..',
  '....obbbbbbbbo..',
  '.....obbbbbbo...',
  '......oobboo....',
  '........oo......',
  '................',
  '................',
];
const PICKAXE_ROWS = [
  '................',
  '....ooooooooo...',
  '...ohhhhhhhhho..',
  '..ohhooohhooho..',
  '..oho..ohho.oo..',
  '..oo...obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '.......obbo.....',
  '........oo......',
  '................',
  '................',
];
const SWORD_ROWS = [
  '................',
  '...........oo...',
  '..........ohho..',
  '.........ohhho..',
  '........ohhho...',
  '.......ohhho....',
  '......ohhho.....',
  '.....ohhho......',
  '..o.ohhho.......',
  '..ooohho........',
  '...ocoo.........',
  '..occo..........',
  '.occo...........',
  '.oco............',
  '..o.............',
  '................',
];
const SHIELD_ROWS = [
  '................',
  '...oooooooooo...',
  '..obbbbbbbbbbo..',
  '..obbbbhhbbbbo..',
  '..obbbbhhbbbbo..',
  '..obhhhhhhhhbo..',
  '..obhhhhhhhhbo..',
  '..obbbbhhbbbbo..',
  '...obbbhhbbbo...',
  '...obbbbbbbbo...',
  '....obbbbbbo....',
  '.....obbbbo.....',
  '......obbo......',
  '.......oo.......',
  '................',
  '................',
];
const AMULET_ROWS = [
  '................',
  '.....oo..oo.....',
  '....occoocco....',
  '....occ..cco....',
  '....occ..cco....',
  '.....occcco.....',
  '......oooo......',
  '.....obbbbo.....',
  '....obbhhbbo....',
  '....obhhhhbo....',
  '....obhhhhbo....',
  '....obbhhbbo....',
  '.....obbbbo.....',
  '......oooo......',
  '................',
  '................',
];
const HOLYWATER_ROWS = POTION_ROWS.map(r => r.replace(/h/g, 'x'));

// ─── Hero ───────────────────────────────────────────────────────────────

const HERO_DOWN = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohsseessho...',
  '...ohsssssssho..',
  '....osssmsso....',
  '.....oosooo.....',
  '...oobbbbboo....',
  '..obcbbbbbcbo...',
  '..obsbbbbbbsbo..',
  '..oobbbbbbboo...',
  '....obbbbbo.....',
  '....ollollo.....',
  '....ollollo.....',
  '...oooooooo.....',
];
const HERO_UP = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '...ohhhhhhhho...',
  '....ohhhhhho....',
  '.....oosooo.....',
  '...oobbbbboo....',
  '..obcbbbbbcbo...',
  '..obsbbbbbbsbo..',
  '..oobbbbbbboo...',
  '....obbbbbo.....',
  '....ollollo.....',
  '....ollollo.....',
  '...oooooooo.....',
];
const HERO_RIGHT = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '...ohhhsseeo....',
  '...ohhssssso....',
  '....ohsssso.....',
  '.....oosoo......',
  '....oobbbboo....',
  '...obbbbbbbcbo..',
  '...obbbbbbbbso..',
  '...oobbbbbboo...',
  '....obbbbbo.....',
  '....ollollo.....',
  '....ollollo.....',
  '...oooooooo.....',
];
const HERO_LEFT = HERO_RIGHT.map(r => r.split('').reverse().join(''));
const HERO_PAL = { h: '#5a3a22', s: '#f2c9a0', e: '#2b2b40', m: '#c47a5a', b: '#3b6fd6', c: '#e0e6ff', l: '#4a3a5a' };

// ─── NPCs ───────────────────────────────────────────────────────────────

const SHOP_ROWS = [
  '................',
  '.oooooooooooooo.',
  '.occccccccccccco',
  '.occbbccbbccbbco',
  '.oooooooooooooo.',
  '..obbbbbbbbbbbo.',
  '..obhhhbbbbhhbo.',
  '..obhhhbbbbhhbo.',
  '..obbbbbbbbbbbo.',
  '..obbbbboobbbbo.',
  '..obbbbboobbbbo.',
  '..obbbbboobbbbo.',
  '..obbbbboobbbbo.',
  '..oooooooooooo..',
  '................',
  '................',
];

// ─── Registry ───────────────────────────────────────────────────────────

const FLOOR_PAL = { a: '#5e6070', b: '#4e505f' };
const CAVE_FLOOR_PAL = { a: '#5a4e48', b: '#4a403b' };
const WALL_PAL = { m: '#222a45', h: '#5c6f9c', b: '#3f5080', d: '#2c3a63' };
const CAVE_WALL_PAL = { m: '#2a1f1a', h: '#6e5648', b: '#4d3b31', d: '#3a2c25' };

export const SPRITES: Record<string, Sprite> = {
  floor: sprite(FLOOR_ROWS, FLOOR_PAL),
  floorCave: sprite(FLOOR_ROWS, CAVE_FLOOR_PAL),
  wall: sprite(WALL_ROWS, WALL_PAL),
  wallCave: sprite(WALL_ROWS, CAVE_WALL_PAL),
  vaultWall: sprite(VAULT_ROWS, { m: '#2b2540', g: '#7a6aa8', d: '#4c3f75' }),
  stairUp: sprite(STAIR_UP_ROWS, { a: '#5e6070', b: '#9a8e7a' }),
  stairDown: sprite(STAIR_DOWN_ROWS, { a: '#5e6070', b: '#6e6454' }),
  hole: sprite(HOLE_ROWS, { a: '#5e6070', d: '#1a1520', b: '#3a3040' }),
  hatch: sprite(HATCH_ROWS, { a: '#5e6070', b: '#7d6a4a', m: '#4d3f2a', c: '#d8b45a' }),
  doorY: sprite(DOOR_ROWS, { a: '#5e6070', d: '#6a4a2a', b: '#c9962f', k: '#3a2a10' }),
  doorB: sprite(DOOR_ROWS, { a: '#5e6070', d: '#2a3a6a', b: '#3f78d6', k: '#10203a' }),
  doorR: sprite(DOOR_ROWS, { a: '#5e6070', d: '#6a2a2a', b: '#d64a3f', k: '#3a1010' }),
  redPotion: sprite(POTION_ROWS, { c: '#c9b28a', b: '#e0433a', h: '#ff9a94' }),
  bluePotion: sprite(POTION_ROWS, { c: '#c9b28a', b: '#3f78d6', h: '#a8ccff' }),
  holyWater: sprite(HOLYWATER_ROWS, { c: '#e6d48a', b: '#f4f0d8', x: '#fff9c0' }),
  atkGem: sprite(GEM_ROWS, { h: '#ff9a94', b: '#d6332a' }),
  defGem: sprite(GEM_ROWS, { h: '#a8ccff', b: '#2f66c4' }),
  yKey: sprite(KEY_ROWS, { k: '#e0b23a' }),
  bKey: sprite(KEY_ROWS, { k: '#4f8ae6' }),
  rKey: sprite(KEY_ROWS, { k: '#e0483a' }),
  stone: sprite(STONE_ROWS, { b: '#8f7cc4', h: '#e6dcff', d: '#5a4a8a' }),
  teleporter: sprite(TELEPORTER_ROWS, { b: '#8a7a5a', c: '#e0c060', d: '#2a3a6a', h: '#a8ccff' }),
  cross: sprite(CROSS_ROWS, { c: '#e6c860' }),
  bomb: sprite(BOMB_ROWS, { b: '#2b2b34', h: '#6a6a78', c: '#ffb020' }),
  pickaxe: sprite(PICKAXE_ROWS, { h: '#b8bcc8', b: '#8a5a2a' }),
  sword: sprite(SWORD_ROWS, { h: '#dfe6f0', c: '#c9962f' }),
  shield: sprite(SHIELD_ROWS, { b: '#4a5a8a', h: '#e0c060' }),
  shieldAmulet: sprite(AMULET_ROWS, { c: '#c9962f', b: '#3a3a5a', h: '#7ad0ff' }),
  npcShop: sprite(SHOP_ROWS, { c: '#d64a3f', b: '#c9a26a', h: '#6fa8dc' }),
  npcSage: sprite(robedRows, { h: '#e6e6e6', s: '#f2c9a0', e: '#2b2b40', b: '#7a6a5a', w: '#8a5a2a' }),
  npcLocksmith: sprite(humanoidRows, { h: '#6a4a2a', s: '#f2c9a0', e: '#2b2b40', b: '#5a5a6a', l: '#3a3a4a', w: '#e0b23a' }),
  npcTradePost: sprite(SHOP_ROWS, { c: '#3f78d6', b: '#c9a26a', h: '#e0b23a' }),
  heroDown: sprite(HERO_DOWN, HERO_PAL),
  heroUp: sprite(HERO_UP, HERO_PAL),
  heroRight: sprite(HERO_RIGHT, HERO_PAL),
  heroLeft: sprite(HERO_LEFT, HERO_PAL),

  // monsters
  slimeGreen: sprite(slimeRows, { b: '#4fbf4a', h: '#9cf59a', e: '#ffffff', w: '#1a3a1a' }),
  slimeRed: sprite(slimeRows, { b: '#d64a3f', h: '#ff9a94', e: '#ffffff', w: '#3a1010' }),
  slimeBig: sprite(slimeRows, { b: '#2f8fd6', h: '#a8e0ff', e: '#ffffff', w: '#102a4a' }),
  bat: sprite(batRows, { w: '#5a4a7a', b: '#3a2a5a', e: '#ffd040', t: '#ffffff' }),
  batBig: sprite(batRows, { w: '#8a2a4a', b: '#5a1a3a', e: '#ffd040', t: '#ffffff' }),
  skeleton: sprite(humanoidRows, { h: '#e8e8e0', s: '#e8e8e0', e: '#202020', b: '#d8d8d0', l: '#d8d8d0', w: '#8a8a80' }),
  skeletonSoldier: sprite(humanoidRows, { h: '#8a8a95', s: '#e8e8e0', e: '#202020', b: '#6a6a7a', l: '#d8d8d0', w: '#c0c0c8' }),
  mage: sprite(robedRows, { h: '#5a3a8a', s: '#f2c9a0', e: '#2b2b40', b: '#7a4ac4', w: '#e0b23a' }),
  mageHigh: sprite(robedRows, { h: '#2a1a4a', s: '#f2c9a0', e: '#ff4040', b: '#3a2a7a', w: '#7ad0ff' }),
  orc: sprite(beastRows, { h: '#3a6a2a', s: '#6fb04a', e: '#ffd040', b: '#7a5a3a', l: '#4a3a2a', w: '#b0b0b8' }),
  orcWarrior: sprite(beastRows, { h: '#2a4a1a', s: '#5a9a3a', e: '#ffd040', b: '#5a5a6a', l: '#3a3a4a', w: '#e0e0e8' }),
  guard: sprite(humanoidRows, { h: '#8a8aa0', s: '#f2c9a0', e: '#2b2b40', b: '#6a6a8a', l: '#4a4a6a', w: '#d0d0d8' }),
  knight: sprite(humanoidRows, { h: '#c0c4d0', s: '#c0c4d0', e: '#2b2b40', b: '#8a90a8', l: '#5a6078', w: '#e0e4f0' }),
  knightDark: sprite(humanoidRows, { h: '#3a3a4a', s: '#3a3a4a', e: '#ff4040', b: '#2a2a3a', l: '#1a1a2a', w: '#8a3a4a' }),
  golem: sprite(golemRows, { b: '#8a8a80', h: '#b0b0a8', e: '#ffd040' }),
  gargoyle: sprite(golemRows, { b: '#5a5a70', h: '#8a8aa0', e: '#ff7040' }),
  ghost: sprite(ghostRows, { b: '#c8d8f0', e: '#2a3a5a' }),
  wraith: sprite(ghostRows, { b: '#5a4a8a', e: '#ff4040' }),
  vampire: sprite(humanoidRows, { h: '#1a1a2a', s: '#e8e0f0', e: '#ff4040', b: '#3a1a2a', l: '#1a1a2a', w: '#8a2a3a' }),
  warlock: sprite(robedRows, { h: '#4a1a1a', s: '#d8c0b0', e: '#ff8040', b: '#6a1a2a', w: '#ffb020' }),
  minotaur: sprite(beastRows, { h: '#d8d0b0', s: '#8a5a3a', e: '#ffd040', b: '#5a3a2a', l: '#3a2a1a', w: '#8a8a90' }),
  dragonling: sprite(dragonRows, { h: '#4fbf4a', b: '#2f8f3a', e: '#ffd040', w: '#9cf59a' }),
  lich: sprite(robedRows, { h: '#e8e8e0', s: '#e8e8e0', e: '#40e0ff', b: '#2a2a3a', w: '#40e0ff' }),
  demon: sprite(beastRows, { h: '#3a1a1a', s: '#c43a2a', e: '#ffd040', b: '#5a1a1a', l: '#3a1010', w: '#ff8040' }),
  titan: sprite(golemRows, { b: '#6a5a8a', h: '#a090c8', e: '#ffffff' }),

  // bosses (crowned)
  bossSkeleton: sprite(withCrown(humanoidRows), { c: '#e0b23a', h: '#e8e8e0', s: '#e8e8e0', e: '#ff4040', b: '#8a2a2a', l: '#d8d8d0', w: '#c0c0c8' }),
  bossBat: sprite(withCrown(batRows), { c: '#e0b23a', w: '#3a1a4a', b: '#2a1a3a', e: '#ff4040', t: '#ffffff' }),
  bossOrc: sprite(withCrown(beastRows), { c: '#e0b23a', h: '#2a4a1a', s: '#4a8a2a', e: '#ff4040', b: '#8a3a2a', l: '#4a2a1a', w: '#e0e0e8' }),
  bossMage: sprite(withCrown(robedRows), { c: '#e0b23a', h: '#1a0a3a', s: '#f2c9a0', e: '#40e0ff', b: '#4a1a8a', w: '#ffffff' }),
  bossVampire: sprite(withCrown(humanoidRows), { c: '#e0b23a', h: '#0a0a1a', s: '#f0e8ff', e: '#ff4040', b: '#5a0a2a', l: '#1a1a2a', w: '#c42a3a' }),
  bossGolem: sprite(withCrown(golemRows), { c: '#e0b23a', b: '#6a6a60', h: '#c0c0b0', e: '#ff4040' }),
  bossKnight: sprite(withCrown(humanoidRows), { c: '#e0b23a', h: '#1a1a2a', s: '#1a1a2a', e: '#ff4040', b: '#3a3a5a', l: '#2a2a3a', w: '#e04040' }),
  bossLich: sprite(withCrown(robedRows), { c: '#e0b23a', h: '#d8d8d0', s: '#d8d8d0', e: '#40ff80', b: '#1a1a2a', w: '#40ff80' }),
  bossDragon: sprite(withCrown(dragonRows), { c: '#e0b23a', h: '#c43a2a', b: '#8a1a1a', e: '#ffd040', w: '#ff9a60' }),
  bossSovereign: sprite(withCrown(humanoidRows), { c: '#ffffff', h: '#e0b23a', s: '#f2c9a0', e: '#ffffff', b: '#6a2ab0', l: '#2a1a4a', w: '#ffd040' }),
};

export const SPRITE_KEYS = Object.keys(SPRITES);

export interface Atlas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  scale: number;
  /** Sprite key → column index; every sprite sits at (col * TILE * scale, 0). */
  index: Map<string, number>;
}

/** Rasterise every sprite into one row of an atlas canvas at `scale` px per pixel. */
export function buildAtlas(scale: number): Atlas {
  const keys = SPRITE_KEYS;
  const w = keys.length * TILE * scale;
  const h = TILE * scale;
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const index = new Map<string, number>();
  keys.forEach((k, col) => {
    index.set(k, col);
    const s = SPRITES[k];
    const ox = col * TILE * scale;
    for (let y = 0; y < TILE; y++) {
      const row = s.rows[y] ?? '';
      for (let x = 0; x < TILE; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        const c = s.pal[ch];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * scale, y * scale, scale, scale);
      }
    }
  });
  return { canvas, scale, index };
}

/** Every sprite has 16 rows of 16 characters, and every non-'.' character is in its palette. */
export function spriteProblems(): string[] {
  const out: string[] = [];
  for (const k of SPRITE_KEYS) {
    const s = SPRITES[k];
    if (s.rows.length !== TILE) out.push(`${k}: ${s.rows.length} rows`);
    s.rows.forEach((r, y) => {
      if (r.length !== TILE) out.push(`${k}: row ${y} has ${r.length} chars`);
      for (const ch of r) if (ch !== '.' && !s.pal[ch]) out.push(`${k}: row ${y} char '${ch}' not in palette`);
    });
  }
  return out;
}
