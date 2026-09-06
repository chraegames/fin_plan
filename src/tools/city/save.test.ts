import { describe, expect, it } from 'vitest';
import { TICKS_PER_MONTH } from './constants';
import { decodeSave, encodeSave, GEN_VERSION, parseSaveFile, rleDecode, rleEncode, SAVED_U16, SAVED_U8 } from './save';
import { findSite, townActions } from './sim/scenario';
import { createCityState } from './sim/state';
import { applyActions, primeDerived, tick } from './sim/tick';
import { T } from './types';

describe('save', () => {
  it('rle round-trips and rejects bad lengths', () => {
    const a = new Uint8Array(T);
    for (let i = 0; i < T; i++) a[i] = i % 700 < 300 ? 3 : (i >> 4) & 7;
    const enc = rleEncode(a);
    expect(rleDecode(enc, T)).toEqual(a);
    expect(rleDecode(enc, T - 1)).toBeNull();
    expect(rleDecode(enc.subarray(0, 10), T)).toBeNull();
  });

  it('round-trips a scripted city and stays small', () => {
    const s = createCityState(5);
    const site = findSite(s, 45, 31)!;
    let id = 1;
    applyActions(s, townActions(site).map(action => ({ id: id++, action })));
    primeDerived(s);
    for (let k = 0; k < TICKS_PER_MONTH * 8; k++) tick(s);
    s.loans.push({ id: 1, principal: 10000, balance: 9000, monthsLeft: 100 });
    const file = encodeSave(s);
    const raw = JSON.stringify(file);
    expect(raw.length).toBeLessThan(300_000);
    const parsed = parseSaveFile(raw);
    expect(parsed).not.toBeNull();
    const t = decodeSave(parsed!)!;
    for (const k of SAVED_U8) expect(t[k]).toEqual(s[k]);
    for (const k of SAVED_U16) expect(t[k]).toEqual(s[k]);
    expect(t.tick).toBe(s.tick);
    expect(t.funds).toBe(s.funds);
    expect(t.rngState).toBe(s.rngState);
    expect(t.loans).toEqual(s.loans);
    expect(t.ledger).toEqual(s.ledger);
    expect(t.sea).toBe(s.sea);
    // simulation continues identically from the restored state
    primeDerived(t);
    primeDerived(s);
    for (let k = 0; k < TICKS_PER_MONTH; k++) {
      tick(t);
      tick(s);
    }
    expect(t.level).toEqual(s.level);
    expect(t.funds).toBe(s.funds);
  });

  it('rejects malformed input', () => {
    expect(parseSaveFile(null)).toBeNull();
    expect(parseSaveFile('nope')).toBeNull();
    expect(parseSaveFile('{}')).toBeNull();
    const s = createCityState(2);
    const good = encodeSave(s);
    expect(parseSaveFile(JSON.stringify({ ...good, gen: GEN_VERSION + 1 }))).toBeNull();
    expect(parseSaveFile(JSON.stringify({ ...good, taxes: [1, 2] }))).toBeNull();
    expect(parseSaveFile(JSON.stringify({ ...good, layers: { ...good.layers, zone: 5 } }))).toBeNull();
    const bad = parseSaveFile(JSON.stringify({ ...good, layers: { ...good.layers, zone: 'AAAA' } }));
    expect(bad).not.toBeNull();
    expect(decodeSave(bad!)).toBeNull();
  });
});
