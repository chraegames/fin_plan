import { describe, expect, it } from 'vitest';
import { breachTarget, gameReducer, initialState, planRoute, walkable, type GameState } from './game';
import { N, T, type Floor, type Tower, type MonsterInst, type TileBase } from './types';
import { START_HERO } from './curves';

/** Hand-built two-floor tower fragment (floors 1..2; zones unused by the reducer). */
function floor(n: number, walls: number[] = []): Floor {
  const base: TileBase[] = new Array(N).fill(T.Floor);
  for (const w of walls) base[w] = T.Wall;
  return { n, label: `F${n}`, zone: 0, archetype: 'test', base, entry: 0, exit: 120, mons: {}, items: {}, doors: {}, npcs: {}, wings: [], vaults: [], dir: 1 };
}
function mon(hp: number, atk: number, def: number, extra: Partial<MonsterInst> = {}): MonsterInst {
  return { id: 'greenSlime', hp, atk, def, gold: 3, exp: 4, abilities: [], role: 'trash', ...extra };
}
function tower(floors: Floor[]): Tower {
  const all: Floor[] = [];
  for (let n = 1; n <= 99; n++) all.push(floors.find(f => f.n === n) ?? floor(n));
  all[0].base[all[0].exit] = T.StairUp;
  all[1].base[all[1].entry] = T.StairDown;
  all[1].base[all[1].exit] = T.StairUp;
  return { seed: 1, loop: 1, genVersion: 1, floors: all, zones: [], healing: new Array(99).fill(0) };
}
function start(t: Tower): GameState {
  const s = initialState(1, 1, t);
  s.run.hero = { ...START_HERO, hp: 100, atk: 20, def: 10 };
  return s;
}

describe('reducer', () => {
  it('walks, picks up items and refuses walls', () => {
    const f1 = floor(1, [2]);
    f1.items[1] = { kind: 'redPotion', value: 50 };
    let s = start(tower([f1]));
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.pos).toBe(1);
    expect(s.run.hero.hp).toBe(150);
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.pos).toBe(1); // wall
    expect(walkable(s)[2]).toBe(false);
  });
  it('fights only winnable monsters and applies rewards', () => {
    const f1 = floor(1);
    f1.mons[1] = mon(40, 30, 5); // dmg 15 → 3 turns, hit 20 → 40 damage
    f1.mons[11] = mon(400, 300, 5); // lethal
    let s = start(tower([f1]));
    s = gameReducer(s, { type: 'move', dir: 2 });
    expect(s.run.pos).toBe(0);
    expect(s.toast?.k).toBe('tooStrong');
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.hero.hp).toBe(60);
    expect(s.run.hero.gold).toBe(3);
    expect(s.run.diffs[1].killed).toEqual([1]);
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.pos).toBe(1);
  });
  it('doors consume keys; undo restores', () => {
    const f1 = floor(1);
    f1.doors[1] = 'y';
    f1.doors[11] = 'b';
    let s = start(tower([f1]));
    s = gameReducer(s, { type: 'move', dir: 2 });
    expect(s.run.pos).toBe(0);
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.hero.keys.y).toBe(0);
    expect(s.run.diffs[1].opened).toEqual([1]);
    s = gameReducer(s, { type: 'undo' });
    expect(s.run.hero.keys.y).toBe(1);
    expect(s.run.diffs[1]).toBeUndefined();
  });
  it('stairs move between floors and land on the aligned stairs', () => {
    const f1 = floor(1);
    f1.exit = 1;
    const f2 = floor(2);
    f2.entry = 1;
    f2.exit = 5;
    let s = start(tower([f1, f2]));
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.floor).toBe(2);
    expect(s.run.pos).toBe(1);
    expect(s.run.visited).toEqual([1, 2]);
    s = gameReducer(s, { type: 'move', dir: 3 });
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.floor).toBe(1);
  });
  it('breach makes a two-way hole and refuses solid landings', () => {
    const f1 = floor(1);
    const f2 = floor(2, [3]);
    f2.items[2] = { kind: 'atkGem', value: 5 };
    let s = start(tower([f1, f2]));
    s.run.hero.stones = 2;
    s = gameReducer(s, { type: 'move', dir: 1 });
    s = gameReducer(s, { type: 'move', dir: 1 });
    s = gameReducer(s, { type: 'move', dir: 1 }); // pos 3
    expect(breachTarget(s, 'up')).toBeNull(); // wall above
    s = gameReducer(s, { type: 'move', dir: 3 }); // pos 2
    expect(breachTarget(s, 'up')).toBe(2);
    s = gameReducer(s, { type: 'breach', dir: 'up' });
    expect(s.run.floor).toBe(2);
    expect(s.run.hero.stones).toBe(1);
    expect(s.run.hero.atk).toBe(25); // gem under the landing
    expect(s.run.diffs[1].holes).toEqual([2]);
    expect(s.run.diffs[2].holes).toEqual([2]);
    // Walk off and back onto the hole: returns to floor 1.
    s = gameReducer(s, { type: 'move', dir: 2 });
    s = gameReducer(s, { type: 'move', dir: 0 });
    expect(s.run.floor).toBe(1);
    expect(s.run.pos).toBe(2);
  });
  it('planRoute reaches a monster through the last step', () => {
    const f1 = floor(1);
    f1.mons[5] = mon(10, 1, 1);
    const s = start(tower([f1]));
    const p = planRoute(s, 5);
    expect(p[p.length - 1]).toBe(5);
    expect(p.length).toBe(5);
    const s2 = gameReducer(s, { type: 'walkPath', path: p });
    expect(s2.run.diffs[1].killed).toEqual([5]);
    expect(s2.run.pos).toBe(4);
  });
  it('boss kill seals nothing after, offers a perk draft, and blocks the exit before', () => {
    const f10 = floor(10);
    f10.exit = 2;
    f10.mons[1] = mon(10, 1, 1, { boss: 'zone' });
    f10.items[3] = { kind: 'stone', value: 1, bossDrop: true };
    const t = tower([f10]);
    t.floors[9].base[2] = T.StairUp;
    let s = start(t);
    s.run.floor = 10;
    s.run.pos = 0;
    s = gameReducer(s, { type: 'move', dir: 2 });
    s = gameReducer(s, { type: 'move', dir: 1 });
    s = gameReducer(s, { type: 'move', dir: 1 });
    s = gameReducer(s, { type: 'move', dir: 0 }); // onto exit at 2 from 12
    expect(s.run.floor).toBe(10); // sealed
    s = gameReducer(s, { type: 'move', dir: 3 }); // pos 1: fight boss
    expect(s.run.pendingDraft?.length).toBe(3);
    expect(s.run.bossesDown).toBe(0);
    s = gameReducer(s, { type: 'move', dir: 1 }); // blocked while draft pending
    expect(s.run.pos).toBe(2);
    s = gameReducer(s, { type: 'pickPerk', id: s.run.pendingDraft![0] });
    expect(s.run.hero.perks.length).toBe(1);
    s = gameReducer(s, { type: 'move', dir: 3 });
    s = gameReducer(s, { type: 'move', dir: 1 });
    expect(s.run.floor).toBe(11);
  });
});
