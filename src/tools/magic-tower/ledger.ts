// Route preview: dry-run a route through the reducer and describe it.

import { diffOf, gameReducer, type GameState } from './game';
import { ITEM_LABEL, bi } from './i18n';
import { monsterDef } from './monsters';

export interface LedgerPreview {
  target: number;
  path: number[];
  after: GameState;
  complete: boolean;
  lines: { text: string; kind: 'neg' | 'pos' | 'note' }[];
}

/** Dry-run a route through the reducer and describe what would happen. */
export function previewRoute(state: GameState, target: number, path: number[]): LedgerPreview {
  const after = gameReducer(state, { type: 'walkPath', path });
  const f = state.tower.floors[state.run.floor - 1];
  const before = diffOf(state.run, f.n);
  const d = diffOf(after.run, f.n);
  const lines: LedgerPreview['lines'] = [];
  for (const k of d.killed) {
    if (before.killed.includes(k)) continue;
    const m = f.mons[k];
    lines.push({ text: `Fight ${monsterDef(m.id).en} ${monsterDef(m.id).zh} (+${m.gold}g +${m.exp}xp)`, kind: 'neg' });
  }
  for (const k of d.opened) if (!before.opened.includes(k)) lines.push({ text: `Open ${f.doors[k] === 'y' ? 'yellow' : f.doors[k] === 'b' ? 'blue' : 'red'} door (−1 key)`, kind: 'note' });
  for (const k of d.taken) {
    if (before.taken.includes(k)) continue;
    const it = f.items[k];
    lines.push({ text: `Take ${bi(ITEM_LABEL[it.kind])}${it.value && it.kind !== 'stone' ? ` +${it.value}` : ''}`, kind: 'pos' });
  }
  const complete = after.run.floor !== state.run.floor || after.run.pos === target || (path.length > 0 && after.run.pos === path[path.length - 2]) || d.killed.length > before.killed.length || d.opened.length > before.opened.length || after.npcOpen != null;
  if (!complete && after.toast) lines.push({ text: after.toast, kind: 'neg' });
  return { target, path, after, complete, lines };
}

