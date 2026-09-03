import { describe, expect, it } from 'vitest';
import { applyFight, canWin, getDamageInfo, getPhasedDamage } from './combat';
import { START_HERO } from './curves';
import type { Ability, Hero, MonsterInst } from './types';

function mon(hp: number, atk: number, def: number, abilities: Ability[] = [], extra: Partial<MonsterInst> = {}): MonsterInst {
  return { id: 'slime', hp, atk, def, gold: 1, exp: 1, abilities, role: 'trash', ...extra };
}
const hero: Hero = { ...START_HERO, hp: 1000, atk: 30, def: 20 };

describe('getDamageInfo — base formula', () => {
  it('rounds = ceil(hp/dmg), damage = (rounds-1)*hit', () => {
    // dmg 30-5=25 → ceil(100/25)=4 turns; hit 50-20=30 → 3*30 = 90
    const d = getDamageInfo(hero, mon(100, 50, 5));
    expect(d).toMatchObject({ damage: 90, turns: 4, perDamage: 25, heroPerDamage: 30, initDamage: 0 });
  });
  it('cannot fight when ATK <= mDEF and reports the ATK that makes it possible', () => {
    const d = getDamageInfo(hero, mon(100, 50, 30));
    expect(d.damage).toBeNull();
    expect(d.breakAtk).toBe(31);
  });
  it('breakpoints: next ATK / DEF that lowers damage', () => {
    // 100 hp, dmg 25 → 4 turns. ATK 34 → dmg 34-5=29 → ceil(100/29)=4; ATK 39 → 34 → 3 turns.
    const d = getDamageInfo(hero, mon(100, 50, 5));
    expect(d.breakAtk).toBe(39);
    expect(d.breakDef).toBe(21);
  });
  it('one-shot kills cost nothing', () => {
    expect(getDamageInfo(hero, mon(20, 50, 5)).damage).toBe(0);
  });
});

describe('abilities', () => {
  it('first strike 先攻 adds one monster hit; Vanguard cancels it', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['first'])).damage).toBe(120);
    expect(getDamageInfo({ ...hero, perks: ['vanguard'] }, mon(100, 50, 5, ['first'])).damage).toBe(90);
  });
  it('magic 魔攻 ignores DEF; Warding keeps half; shield reduces it', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['magic'])).damage).toBe(150);
    expect(getDamageInfo({ ...hero, perks: ['warding'] }, mon(100, 50, 5, ['magic'])).damage).toBe(120);
    expect(getDamageInfo({ ...hero, shield: 10 }, mon(100, 50, 5, ['magic'])).damage).toBe(120);
  });
  it('sturdy 坚固 takes 1 per hit (2 with Anvil), needs ATK > mDEF', () => {
    const d = getDamageInfo(hero, mon(10, 50, 5, ['sturdy']));
    expect(d.turns).toBe(10);
    expect(d.damage).toBe(9 * 30);
    expect(getDamageInfo({ ...hero, perks: ['anvil'] }, mon(10, 50, 5, ['sturdy'])).turns).toBe(5);
    expect(getDamageInfo(hero, mon(10, 50, 30, ['sturdy'])).damage).toBeNull();
    // ATK cannot lower a sturdy fight's damage: only DEF can.
    expect(d.breakAtk).toBeNull();
    expect(d.breakDef).toBe(21);
  });
  it('multi-hit multiplies the hit', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['hit2'])).damage).toBe(180);
    expect(getDamageInfo(hero, mon(100, 50, 5, ['hit3'])).damage).toBe(270);
  });
  it('vampire 吸血 drains a fraction of current HP first', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['vamp'], { vampPct: 0.25 })).initDamage).toBe(250);
    expect(getDamageInfo(hero, mon(100, 50, 5, ['vamp'], { vampPct: 0.25 })).damage).toBe(340);
  });
  it('armor break 破甲 = 90% of hero DEF; counter 反击 = 10% ATK per turn', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['armorBreak'])).initDamage).toBe(18);
    expect(getDamageInfo(hero, mon(100, 50, 5, ['counter'])).heroPerDamage).toBe(33);
  });
  it('mimic copies the hero', () => {
    const d = getDamageInfo(hero, mon(100, 1, 1, ['mimic']));
    expect(d.monAtk).toBe(30);
    expect(d.monDef).toBe(20);
    // dmg 10 → 10 turns; hit 30-20=10 → 90
    expect(d.damage).toBe(90);
  });
  it('purify 净化 = 3× shield; fixed 固伤 is flat', () => {
    expect(getDamageInfo({ ...hero, shield: 7 }, mon(100, 50, 5, ['purify'])).initDamage).toBe(21);
    expect(getDamageInfo(hero, mon(100, 50, 5, ['fixed'], { fixedDmg: 123 })).initDamage).toBe(123);
  });
  it('self-destruct leaves 1 HP; invincible needs the cross', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5, ['selfDestruct'])).damage).toBe(999);
    expect(getDamageInfo(hero, mon(100, 50, 5, ['invincible'])).damage).toBeNull();
    expect(getDamageInfo({ ...hero, cross: true }, mon(100, 50, 5, ['invincible'])).damage).toBe(90);
  });
  it('aura and support scale the monster', () => {
    expect(getDamageInfo(hero, mon(100, 50, 5), { auraPct: 0.2 }).monAtk).toBe(60);
    expect(getDamageInfo(hero, mon(100, 50, 5), { supporters: 2 }).heroPerDamage).toBe(45);
  });
  it('executioner: fights ending within 2 turns cost nothing', () => {
    expect(getDamageInfo({ ...hero, perks: ['executioner'] }, mon(50, 50, 5)).damage).toBe(0);
    expect(getDamageInfo({ ...hero, perks: ['executioner'] }, mon(100, 50, 5)).damage).toBe(90);
  });
});

describe('fight resolution', () => {
  it('canWin requires damage < hp', () => {
    expect(canWin({ ...hero, hp: 91 }, mon(100, 50, 5))).toBe(true);
    expect(canWin({ ...hero, hp: 90 }, mon(100, 50, 5))).toBe(false);
  });
  it('applyFight subtracts damage and adds rewards (Scholar +30% EXP, Leech heals)', () => {
    const m = mon(100, 50, 5, [], { gold: 10, exp: 10 });
    expect(applyFight(hero, m)).toMatchObject({ hp: 910, gold: 10, exp: 10 });
    expect(applyFight({ ...hero, perks: ['scholar'] }, m).exp).toBe(13);
    expect(applyFight({ ...hero, perks: ['leech'] }, m).hp).toBe(915);
  });
  it('phased bosses are fought back to back without healing', () => {
    const boss = mon(100, 50, 5, [], { phases: [mon(100, 50, 5, ['first'])] });
    expect(getPhasedDamage(hero, boss)).toBe(90 + 120);
    expect(getPhasedDamage({ ...hero, hp: 200 }, boss)).toBeNull();
  });
});
