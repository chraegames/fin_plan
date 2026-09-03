import { describe, expect, it } from 'vitest';
import { emptyMeta, parseMeta, parseSaveFile, serializable, validRun } from './save';
import { newRun } from './game';
import { GEN_VERSION } from './types';

describe('save files', () => {
  it('round-trips a run through a save file', () => {
    const run = newRun(42, 2);
    run.diffs[3] = { taken: [1, 2], killed: [5], opened: [], holes: [7], dug: [] };
    const raw = JSON.stringify({ v: 1, slots: { s1: { run: serializable(run), savedAt: 123 } } });
    const file = parseSaveFile(raw);
    expect(file.slots.s1?.run.seed).toBe(42);
    expect(file.slots.s1?.run.diffs[3].holes).toEqual([7]);
    expect(file.slots.s1?.run.history).toEqual([]);
  });
  it('rejects malformed runs and generator-version mismatches', () => {
    const run = newRun(1, 1);
    expect(validRun(run)).toBe(true);
    expect(validRun({ ...run, genVersion: GEN_VERSION + 1 })).toBe(false);
    expect(validRun({ ...run, hero: { ...run.hero, hp: 'x' } })).toBe(false);
    expect(validRun({ ...run, diffs: { 3: { taken: [999], killed: [], opened: [], holes: [], dug: [] } } })).toBe(false);
    expect(validRun({ ...run, hero: { ...run.hero, perks: ['nope'] } })).toBe(false);
    expect(parseSaveFile('not json').slots).toEqual({});
    expect(parseSaveFile(JSON.stringify({ v: 1, slots: { s1: { run: { v: 1 }, savedAt: 1 } } })).slots.s1).toBeUndefined();
  });
  it('meta falls back to defaults', () => {
    expect(parseMeta(null)).toEqual(emptyMeta());
    expect(parseMeta(JSON.stringify({ v: 1, unlockedLoop: 99 })).unlockedLoop).toBe(10);
    expect(parseMeta('{').unlockedLoop).toBe(1);
  });
});
