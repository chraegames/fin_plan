// Single-language UI strings. The game shows one language at a time; the
// toggle lives in the toolbar and is remembered per browser.

import { ABILITY_LABEL, ITEM_LABEL, KEY_LABEL, NPC_LABEL } from './i18n';
import { loopDef } from './loops';
import { monsterDef } from './monsters';
import { PERKS } from './perks';
import type { Ability, ItemKind, KeyColor, Msg, NpcKind, PerkId } from './types';

export type Lang = 'en' | 'zh';

const UI = {
  hp: ['HP', '生命'],
  atk: ['ATK', '攻击'],
  def: ['DEF', '防御'],
  gold: ['Gold', '金币'],
  exp: ['EXP', '经验'],
  level: ['Lv', '等级'],
  stones: ['Stones', '穿层石'],
  shield: ['Shield', '魔防'],
  ceiling: ['Ceiling', '天花板'],
  floorBelow: ['Floor', '地板'],
  hollow: ['hollow', '可穿'],
  solid: ['solid', '实心'],
  manual: ['Manual', '手册'],
  fly: ['Fly', '传送'],
  breachUp: ['Breach ▲', '向上穿层'],
  breachDown: ['Breach ▼', '向下穿层'],
  save: ['Save', '存档'],
  load: ['Load', '读档'],
  undo: ['Undo', '撤销'],
  help: ['Help', '帮助'],
  towers: ['Towers', '塔'],
  holyWater: ['Holy water', '圣水'],
  bomb: ['Bomb', '炸弹'],
  pickaxe: ['Pickaxe', '铁镐'],
  lang: ['中文', 'EN'],
  ledger: ['Route', '路线'],
  go: ['Go', '前往'],
  goPartial: ['Go as far as possible', '尽量前往'],
  cancel: ['Cancel', '取消'],
  walkSteps: ['Walk {n} steps.', '行走 {n} 步。'],
  fight: ['Fight', '战斗'],
  open: ['Open', '开门'],
  take: ['Take', '拾取'],
  door: ['door', '门'],
  key: ['key', '钥匙'],
  monsterManual: ['Monster manual', '怪物手册'],
  noMonsters: ['No monsters left on this floor.', '本层已无怪物。'],
  colMonster: ['Monster', '怪物'],
  colHp: ['HP', '生命'],
  colAtk: ['ATK', '攻击'],
  colDef: ['DEF', '防御'],
  colGold: ['Gold', '金币'],
  colExp: ['EXP', '经验'],
  colAbilities: ['Abilities', '特性'],
  colDamage: ['Damage to you', '你受伤害'],
  colNext: ['Cheaper with', '减伤条件'],
  cannotFight: ['cannot fight', '无法攻击'],
  lethal: ['lethal', '致命'],
  needAtk: ['needs ATK {n}', '需攻击 {n}'],
  withAtk: ['ATK {n} → {m}', '攻击 {n} → {m}'],
  withDef: ['DEF {n} → {m}', '防御 {n} → {m}'],
  none: ['—', '—'],
  count: ['×{n}', '×{n}'],
  elite: ['Elite', '精英'],
  boss: ['Boss', '首领'],
  chooseBlessing: ['Choose a blessing', '选择祝福'],
  blessingIntro: ['The boss is down. Take one blessing for the floors ahead — the tower ahead is built around whatever you choose.', '首领已倒下。选择一项祝福，接下来的楼层会围绕你的选择生成。'],
  chooseTower: ['Choose a tower', '选择魔塔'],
  towerIntro: ['Ten towers of 99 floors. Clear one to unlock the next; each adds new monsters, rules and puzzles. Nothing carries over but what you have learned.', '十座各 99 层的魔塔。通关一座解锁下一座；每座都会加入新的怪物、规则与谜题。除了经验，什么都不会带走。'],
  climb: ['Climb', '攀登'],
  locked: ['Locked', '未解锁'],
  bestFloor: ['best floor {n}', '最高 {n} 层'],
  cleared: ['cleared ×{n}', '通关 ×{n}'],
  saveGame: ['Save game', '存档'],
  loadGame: ['Load game', '读档'],
  savesIntro: ['Saves live in this browser only. The autosave slot is written after every move.', '存档仅保存在本浏览器。每步之后都会写入自动存档。'],
  autosave: ['Autosave', '自动存档'],
  slot: ['Slot {n}', '存档 {n}'],
  empty: ['Empty', '空'],
  overwrite: ['Overwrite', '覆盖'],
  delete: ['Delete', '删除'],
  floorN: ['floor {n}', '第 {n} 层'],
  teleporter: ['Floor teleporter', '楼层传送器'],
  teleporterIntro: ['Return to any floor you have visited. You arrive on its stairs.', '回到任意到过的楼层，落在楼梯上。'],
  breachTitle: ['Breach', '穿层'],
  breachIntro: ['Use a Breach Stone to punch through the ceiling or the floor. You land on the same square of the next floor; the hole stays open both ways.', '使用穿层石击穿天花板或地板。你会落在相邻楼层的同一格；洞口双向永久开放。'],
  ceilingBtn: ['Ceiling ▲', '天花板 ▲'],
  floorBtn: ['Floor ▼', '地板 ▼'],
  shopIntro: ['"Gold for strength. The price climbs with every purchase." You have {n} gold; the next purchase costs {m}.', '“金币换力量，每买一次价格上涨。” 你有 {n} 金币，下一次需要 {m}。'],
  locksmithIntro: ['"Keys cut while you wait." You have {n} gold.', '“立等可取。” 你有 {n} 金币。'],
  sageIntro: ['"Experience is the only coin I take." Next lesson costs {n} EXP.', '“我只收经验。” 下一课需要 {n} 经验。'],
  yellowKey: ['Yellow key', '黄钥匙'],
  blueKey: ['Blue key', '蓝钥匙'],
  redKey: ['Red key', '红钥匙'],
  building: ['Building the tower…', '正在生成魔塔……'],
  buildingZone: ['Zone {n} of {m} — laying floors, placing keys, proving the line.', '第 {n}/{m} 区 —— 铺设楼层、放置钥匙、验证通路。'],
  won: ['The tower is yours', '魔塔已被征服'],
  wonBody: ['{s} — cleared in {n} steps.', '{s} —— 用 {n} 步通关。'],
  nextOpen: ['The next tower is open.', '下一座塔已开启。'],
  nothingAbove: ['There is nothing above you.', '你的头顶再无一物。'],
  leaveTitle: ['Leave this run?', '离开本局？'],
  leaveSub: ['Your autosave stays; unsaved progress since it does not', '自动存档会保留；之后的进度不会'],
  leaveBody: ['Open the tower list? The current run is autosaved on this device.', '打开塔列表？当前进度已自动存档在本设备。'],
  openTowers: ['Open towers', '打开塔列表'],
  chooseToBegin: ['Choose a tower to begin.', '选择一座塔开始。'],
  howToPlay: ['How to play', '玩法说明'],
  help1: ['Every fight is arithmetic: you hit for ATK − monster DEF, it hits back for its ATK − your DEF, and the numbers on the map show exactly what each fight costs before you commit. Nothing is random.', '每场战斗都是算术：你每回合造成 攻击 − 怪物防御 的伤害，怪物反击 其攻击 − 你防御；地图上的数字就是这场战斗会让你损失的生命。没有任何随机。'],
  help2: ['Move with arrows / WASD, or click a tile to preview the route, then Go. Enter uses the stairs or hole under you.', '方向键 / WASD 移动，或点击格子预览路线后前往。回车使用脚下的楼梯或洞口。'],
  help3: ['B breaches the ceiling or floor with a Breach Stone (you land on the same square of the next floor; vaults have no door and can only be entered this way). F teleporter. M manual. Z undo (last 10 steps). S / L save and load. Esc closes.', 'B 用穿层石击穿天花板或地板（落在相邻楼层同一格；密室没有门，只能这样进入）。F 传送。M 手册。Z 撤销（最近 10 步）。S / L 存读档。Esc 关闭。'],
  help4: ['Every zone boss drops a stone and offers a blessing. Getting stuck is part of the genre — keep saves.', '每区首领都会掉落穿层石并提供祝福。卡关是魔塔的一部分——记得存档。'],
  chooseDir: ['Choose a direction for the {s}', '为{s}选择方向'],
  log: ['Log', '记录'],
  keysLabel: ['Keys', '钥匙'],
  items: ['Items', '道具'],
} as const;

export type UiKey = keyof typeof UI;

export function t(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  let s: string = UI[key][lang === 'en' ? 0 : 1];
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}

export const monsterName = (id: string, lang: Lang) => (lang === 'en' ? monsterDef(id).en : monsterDef(id).zh);
export const itemName = (k: ItemKind, lang: Lang) => ITEM_LABEL[k][lang];
export const abilityName = (a: Ability, lang: Lang) => ABILITY_LABEL[a][lang];
export const abilityDesc = (a: Ability, lang: Lang) => (lang === 'en' ? ABILITY_LABEL[a].desc : ABILITY_LABEL[a].descZh);
export const keyName = (c: KeyColor, lang: Lang) => KEY_LABEL[c][lang];
export const npcName = (k: NpcKind, lang: Lang) => NPC_LABEL[k][lang];
export const perkName = (id: PerkId, lang: Lang) => (lang === 'en' ? PERKS[id].en : PERKS[id].zh);
export const perkDesc = (id: PerkId, lang: Lang) => (lang === 'en' ? PERKS[id].desc : PERKS[id].descZh);
export const loopName = (n: number, lang: Lang) => (lang === 'en' ? loopDef(n).en : loopDef(n).zh);
export const loopBlurb = (n: number, lang: Lang) => (lang === 'en' ? loopDef(n).blurb : loopDef(n).blurbZh);

/** Render a reducer message (toast or log line). */
export function msg(m: Msg, lang: Lang): string {
  const en = lang === 'en';
  const mon = m.id ? monsterName(m.id, lang) : '';
  void mon;
  switch (m.k) {
    case 'tooStrong': return en ? `${mon} would deal ${m.n} — too much.` : `${mon} 会造成 ${m.n} 点伤害——太多了。`;
    case 'cannotHurt': return en ? `${mon} cannot be hurt yet.` : `目前无法伤到 ${mon}。`;
    case 'stepKill': return en ? 'That step would kill you.' : '这一步会要了你的命。';
    case 'locked': return en ? 'Locked. You need a key.' : '门锁着，需要钥匙。';
    case 'sealedBoss': return en ? 'The stairs are sealed while the boss lives.' : '首领未死，楼梯被封印。';
    case 'shifting': return en ? 'The tower is still shifting above…' : '上方的塔还在生成……';
    case 'falseSummit': return en ? 'A false summit. The way on is below.' : '这是假的塔顶。出路在下方。';
    case 'noStone': return en ? 'No Breach Stone.' : '没有穿层石。';
    case 'solidUp': return en ? 'Solid ceiling here.' : '这里的天花板是实心的。';
    case 'solidDown': return en ? 'Solid floor here.' : '这里的地板是实心的。';
    case 'notEnoughGold': return en ? `Not enough gold (${m.n}).` : `金币不足（需要 ${m.n}）。`;
    case 'nothingToBomb': return en ? 'Nothing to bomb there.' : '那里没有可炸的目标。';
    case 'onlyWalls': return en ? 'Only plain walls can be dug.' : '只能挖普通墙壁。';
    case 'noBombs': return en ? 'No bombs.' : '没有炸弹。';
    case 'noPickaxe': return en ? 'No pickaxe.' : '没有铁镐。';
    case 'yours': return en ? 'The tower is yours.' : '魔塔已被征服。';
    case 'pickup': {
      const name = itemName(m.s as ItemKind, lang);
      return en ? `Picked up ${name}${m.n ? ` +${m.n}` : ''}` : `获得 ${name}${m.n ? ` +${m.n}` : ''}`;
    }
    case 'defeated': return en ? `Defeated ${mon} (−${m.n} HP, +${m.m} gold, +${m.x} exp)` : `击败 ${mon}（−${m.n} 生命，+${m.m} 金币，+${m.x} 经验）`;
    case 'chains': return en ? `The chains take your keys: +${m.n} gold.` : `锁链收走了你的钥匙：+${m.n} 金币。`;
    case 'breached': return en ? `Breached ${m.n ? 'up' : 'down'} into ${m.s}.` : `${m.n ? '向上' : '向下'}穿层进入 ${m.s}。`;
    case 'bought': return en ? `Bought ${(m.s ?? '').toUpperCase()} for ${m.n} gold.` : `花 ${m.n} 金币购买了${m.s === 'atk' ? '攻击' : m.s === 'def' ? '防御' : '生命'}。`;
    case 'holy': return en ? `Holy water: +${m.n} HP.` : `圣水：+${m.n} 生命。`;
    case 'bombed': return en ? `Bombed ${mon}.` : `炸掉了 ${mon}。`;
    case 'blessing': return en ? `Blessing chosen: ${perkName(m.s as PerkId, lang)}.` : `选择了祝福：${perkName(m.s as PerkId, lang)}。`;
    default: return m.k;
  }
}
