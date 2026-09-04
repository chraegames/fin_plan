// Save files: the run (seed + diffs) and the meta (unlocks, codex, records).
// The tower itself is never saved — it is regenerated from (seed, loop).

import { MAGIC_TOWER_KEY, MAGIC_TOWER_META_KEY, safeSetItem } from '../../utils/persistence';
import { PERKS } from './perks';
import { FLOORS, GEN_VERSION, N, type FloorDiff, type Hero, type Meta, type PerkId, type Run } from './types';

export type SlotId = 'auto' | 's1' | 's2' | 's3';
export const SLOTS: SlotId[] = ['auto', 's1', 's2', 's3'];

export interface SavedSlot {
  run: Run;
  savedAt: number;
}

interface SaveFile {
  v: 1;
  slots: Partial<Record<SlotId, SavedSlot>>;
}

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function validHero(h: unknown): h is Hero {
  if (!h || typeof h !== 'object') return false;
  const o = h as Record<string, unknown>;
  const keys = o.keys as Record<string, unknown> | undefined;
  if (!keys || !isInt(keys.y) || !isInt(keys.b) || !isInt(keys.r)) return false;
  for (const k of ['hp', 'atk', 'def', 'gold', 'exp', 'level', 'stones', 'shield', 'bombs', 'pickaxes', 'holyWater', 'yellowDoors', 'shopBuys', 'sageBuys', 'locksmithBuys']) {
    if (!isNum(o[k])) return false;
  }
  if (typeof o.cross !== 'boolean' || typeof o.teleporter !== 'boolean') return false;
  if (!Array.isArray(o.perks) || !o.perks.every(p => typeof p === 'string' && p in PERKS)) return false;
  return true;
}

function validDiff(d: unknown): d is FloorDiff {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  for (const k of ['taken', 'killed', 'opened', 'holes', 'dug']) {
    const a = o[k];
    if (!Array.isArray(a) || !a.every(i => isInt(i) && i >= 0 && i < N)) return false;
  }
  return true;
}

export function validRun(r: unknown): r is Run {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (o.v !== 1 || o.genVersion !== GEN_VERSION) return false;
  if (!isInt(o.seed) || !isInt(o.loop) || o.loop < 1 || o.loop > 10) return false;
  if (!isInt(o.floor) || o.floor < 1 || o.floor > FLOORS || !isInt(o.pos) || o.pos < 0 || o.pos >= N) return false;
  if (!validHero(o.hero)) return false;
  if (!o.diffs || typeof o.diffs !== 'object') return false;
  for (const k in o.diffs as Record<string, unknown>) {
    const n = Number(k);
    if (!isInt(n) || n < 1 || n > FLOORS || !validDiff((o.diffs as Record<string, unknown>)[k])) return false;
  }
  if (!Array.isArray(o.visited) || !o.visited.every(isInt)) return false;
  if (o.status !== 'playing' && o.status !== 'dead' && o.status !== 'won') return false;
  if (o.pendingDraft != null && (!Array.isArray(o.pendingDraft) || !o.pendingDraft.every(p => typeof p === 'string' && p in PERKS))) return false;
  return true;
}

/** Strip transient fields before saving (history is not saved). */
export function serializable(run: Run): Run {
  return { ...run, history: [], pendingDraft: run.pendingDraft as PerkId[] | null };
}

export function parseSaveFile(raw: string | null): SaveFile {
  const empty: SaveFile = { v: 1, slots: {} };
  if (!raw) return empty;
  try {
    const o = JSON.parse(raw) as Partial<SaveFile>;
    if (o.v !== 1 || !o.slots || typeof o.slots !== 'object') return empty;
    const slots: SaveFile['slots'] = {};
    for (const id of SLOTS) {
      const s = o.slots[id];
      if (s && validRun(s.run) && isNum(s.savedAt)) slots[id] = { run: { ...s.run, history: [], log: Array.isArray(s.run.log) ? s.run.log.filter(l => l && typeof l === 'object' && typeof (l as { k?: unknown }).k === 'string') : [] }, savedAt: s.savedAt };
    }
    return { v: 1, slots };
  } catch {
    return empty;
  }
}

export function loadSlots(): SaveFile['slots'] {
  try {
    return parseSaveFile(localStorage.getItem(MAGIC_TOWER_KEY)).slots;
  } catch {
    return {};
  }
}

export function saveSlot(id: SlotId, run: Run): boolean {
  const slots = loadSlots();
  slots[id] = { run: serializable(run), savedAt: Date.now() };
  return safeSetItem(MAGIC_TOWER_KEY, JSON.stringify({ v: 1, slots } satisfies SaveFile));
}

export function deleteSlot(id: SlotId): boolean {
  const slots = loadSlots();
  delete slots[id];
  return safeSetItem(MAGIC_TOWER_KEY, JSON.stringify({ v: 1, slots } satisfies SaveFile));
}

// ─── Meta ───────────────────────────────────────────────────────────────

export function emptyMeta(): Meta {
  return { v: 1, unlockedLoop: 1, codex: {}, records: {} };
}

export function parseMeta(raw: string | null): Meta {
  if (!raw) return emptyMeta();
  try {
    const o = JSON.parse(raw) as Partial<Meta>;
    if (o.v !== 1 || !isInt(o.unlockedLoop)) return emptyMeta();
    return {
      v: 1,
      unlockedLoop: Math.min(10, Math.max(1, o.unlockedLoop)),
      codex: o.codex && typeof o.codex === 'object' ? o.codex : {},
      records: o.records && typeof o.records === 'object' ? o.records : {},
    };
  } catch {
    return emptyMeta();
  }
}

export function loadMeta(): Meta {
  try {
    return parseMeta(localStorage.getItem(MAGIC_TOWER_META_KEY));
  } catch {
    return emptyMeta();
  }
}

export function saveMeta(meta: Meta): boolean {
  return safeSetItem(MAGIC_TOWER_META_KEY, JSON.stringify(meta));
}
