import { expect, it } from 'vitest';
import { spriteProblems, SPRITE_KEYS } from './sprites';
import { MONSTERS, BOSSES } from './monsters';

it('every sprite is well-formed', () => {
  expect(spriteProblems()).toEqual([]);
});
it('every monster and boss has a sprite', () => {
  for (const m of [...MONSTERS, ...BOSSES]) expect(SPRITE_KEYS).toContain(m.sprite);
});
