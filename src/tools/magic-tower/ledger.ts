// Route preview: dry-run a route through the reducer and describe it.

import { diffOf, gameReducer, type GameState } from './game';
import { itemName, keyName, monsterName, msg, t, type Lang } from './strings';

export interface LedgerPreview {
  target: number;
  path: number[];
  after: GameState;
  complete: boolean;
  lines: { text: string; kind: 'neg' | 'pos' | 'note' }[];
}

export function previewRoute(state: GameState, target: number, path: number[], lang: Lang): LedgerPreview {
  const after = gameReducer(state, { type: 'walkPath', path });
  const f = state.tower.floors[state.run.floor - 1];
  const before = diffOf(state.run, f.n);
  const d = diffOf(after.run, f.n);
  const lines: LedgerPreview['lines'] = [];
  for (const k of d.killed) {
    if (before.killed.includes(k)) continue;
    const m = f.mons[k];
    lines.push({ text: `${t(lang, 'fight')} ${monsterName(m.id, lang)} (+${m.gold} ${t(lang, 'gold')}, +${m.exp} ${t(lang, 'exp')})`, kind: 'neg' });
  }
  for (const k of d.opened) if (!before.opened.includes(k)) lines.push({ text: `${t(lang, 'open')} ${keyName(f.doors[k], lang)} ${t(lang, 'door')} (−1 ${t(lang, 'key')})`, kind: 'note' });
  for (const k of d.taken) {
    if (before.taken.includes(k)) continue;
    const it = f.items[k];
    lines.push({ text: `${t(lang, 'take')} ${itemName(it.kind, lang)}${it.value && it.kind !== 'stone' ? ` +${it.value}` : ''}`, kind: 'pos' });
  }
  const complete = after.run.floor !== state.run.floor || after.run.pos === target || (path.length > 1 && after.run.pos === path[path.length - 2]) || d.killed.length > before.killed.length || d.opened.length > before.opened.length || after.npcOpen != null;
  if (!complete && after.toast) lines.push({ text: msg(after.toast, lang), kind: 'neg' });
  return { target, path, after, complete, lines };
}
