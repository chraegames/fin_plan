import { describe, expect, it } from 'vitest';
import { buildHud, packSnapshot, SNAPSHOT_BYTES, SNAPSHOT_LAYERS, viewSnapshot } from './protocol';
import { createCityState } from './sim/state';
import { T } from './types';

describe('snapshot protocol', () => {
  it('round-trips every layer through one buffer', () => {
    const s = createCityState(11);
    for (const [name] of SNAPSHOT_LAYERS) {
      const a = s[name] as Uint8Array;
      for (let i = 0; i < T; i += 97) a[i] = (i * 7) & (a instanceof Uint16Array ? 0xffff : 0xff);
    }
    const buf = new ArrayBuffer(SNAPSHOT_BYTES);
    packSnapshot(s, buf);
    const v = viewSnapshot(buf);
    for (const [name] of SNAPSHOT_LAYERS) expect(Array.from(v[name] as Uint8Array)).toEqual(Array.from(s[name] as Uint8Array));
  });

  it('keeps 16-bit layers aligned', () => {
    let off = 0;
    for (const [, bytes] of SNAPSHOT_LAYERS) {
      if (bytes === 2) expect(off % 2).toBe(0);
      off += bytes * T;
    }
    expect(off).toBe(SNAPSHOT_BYTES);
  });

  it('builds a HUD with copies, not references', () => {
    const s = createCityState(1);
    const h = buildHud(s);
    h.demand[0] = 99;
    h.taxes[1] = 99;
    expect(s.demand[0]).toBe(0);
    expect(s.taxes[1]).not.toBe(99);
  });
});
