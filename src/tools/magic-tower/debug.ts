// Text rendering of a floor for tests and logs.

import { monsterDef } from './monsters';
import { T, W, H, IDX, type Floor } from './types';

export function dumpFloor(f: Floor): string {
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const i = IDX(x, y);
      const b = f.base[i];
      let ch = '.';
      if (b === T.Wall) ch = '#';
      else if (b === T.VaultWall) ch = '%';
      else if (b === T.StairUp) ch = '>';
      else if (b === T.StairDown) ch = '<';
      else if (b === T.Hatch) ch = 'H';
      if (f.mons[i]) ch = f.mons[i].boss ? 'B' : f.mons[i].elite ? 'E' : 'm';
      else if (f.doors[i]) ch = f.doors[i] === 'y' ? 'Y' : f.doors[i] === 'b' ? 'U' : 'R';
      else if (f.npcs[i]) ch = '$';
      else if (f.items[i]) {
        const k = f.items[i].kind;
        ch = k === 'redPotion' ? 'p' : k === 'bluePotion' ? 'P' : k === 'atkGem' ? 'a' : k === 'defGem' ? 'd' : k === 'yKey' ? 'y' : k === 'bKey' ? 'u' : k === 'rKey' ? 'r' : k === 'stone' ? 'S' : k === 'holyWater' ? 'w' : 'i';
      }
      if (i === f.entry) ch = '@';
      row += ch;
    }
    rows.push(row);
  }
  const mons = Object.keys(f.mons)
    .map(Number)
    .map(i => {
      const m = f.mons[i];
      return `  ${i}(${i % W},${Math.floor(i / W)}) ${monsterDef(m.id).en}${m.elite ? '*' : ''} hp${m.hp} a${m.atk} d${m.def} g${m.gold} x${m.exp} [${m.abilities.join(',')}] ${m.role}`;
    });
  return `${f.label} (${f.archetype}) entry ${f.entry} exit ${f.exit}\n${rows.join('\n')}\n${mons.join('\n')}`;
}
