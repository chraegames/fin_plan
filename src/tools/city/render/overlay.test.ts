import { describe, expect, it } from 'vitest';
import { SNAPSHOT_BYTES, viewSnapshot } from '../protocol';
import { T } from '../types';
import { buildOverlayRGBA } from './overlay';

describe('overlay', () => {
  it('tints zoned tiles and leaves empty land transparent', () => {
    const L = viewSnapshot(new ArrayBuffer(SNAPSHOT_BYTES));
    const water = new Uint8Array(T);
    L.zone[5] = 1;
    L.zone[6] = 2;
    L.level[6] = 1;
    const out = new Uint8Array(T * 4);
    buildOverlayRGBA('none', L, water, out);
    expect(out[3]).toBe(0);
    expect(out[5 * 4 + 3]).toBeGreaterThan(out[6 * 4 + 3]);
    expect(out[5 * 4 + 1]).toBeGreaterThan(out[5 * 4]); // green for residential
    expect(out[6 * 4 + 2]).toBeGreaterThan(out[6 * 4]); // blue for commercial
  });

  it('utility views paint unpowered zoned tiles red and powered ones green', () => {
    const L = viewSnapshot(new ArrayBuffer(SNAPSHOT_BYTES));
    const water = new Uint8Array(T);
    L.zone[1] = 1;
    L.zone[2] = 1;
    L.powered[2] = 1;
    const out = new Uint8Array(T * 4);
    buildOverlayRGBA('power', L, water, out);
    expect(out[1 * 4]).toBeGreaterThan(out[1 * 4 + 1]);
    expect(out[2 * 4 + 1]).toBeGreaterThan(out[2 * 4]);
    expect(out[0 * 4 + 3]).toBe(0);
  });
});
