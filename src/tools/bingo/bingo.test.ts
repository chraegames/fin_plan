import { describe, it, expect } from 'vitest';
import {
  AUTO_INTERVALS,
  VARIANTS,
  VARIANT_IDS,
  boardRows,
  columnOf,
  formatCall,
  gameReducer,
  isFinished,
  lastCall,
  letterFor,
  newGame,
  parseSaved,
  remaining,
  secureRandomInt,
  serialize,
  speechFor,
  uniformFrom,
  type GameState,
} from './bingo';

const V75 = VARIANTS[75];
const V90 = VARIANTS[90];
const V30 = VARIANTS[30];

describe('letter mapping', () => {
  it('maps 75-ball numbers to the traditional B-I-N-G-O columns', () => {
    const expected: [number, string][] = [
      [1, 'B'], [15, 'B'], [16, 'I'], [30, 'I'], [31, 'N'], [45, 'N'], [46, 'G'], [60, 'G'], [61, 'O'], [75, 'O'],
    ];
    for (const [n, letter] of expected) expect(letterFor(n, V75), String(n)).toBe(letter);
  });

  it('30-ball speed bingo uses B-I-N in tens; 90-ball has no letters', () => {
    expect(letterFor(10, V30)).toBe('B');
    expect(letterFor(11, V30)).toBe('I');
    expect(letterFor(30, V30)).toBe('N');
    expect(letterFor(1, V90)).toBe('');
    expect(letterFor(90, V90)).toBe('');
    expect(columnOf(90, V90)).toBe(8);
  });

  it('formats calls the way a caller says them', () => {
    expect(formatCall(12, V75)).toBe('B-12');
    expect(formatCall(75, V75)).toBe('O-75');
    expect(formatCall(42, V90)).toBe('42');
    expect(speechFor(12, V75)).toBe('B, 12');
    expect(speechFor(42, V90)).toBe('42');
  });

  it('boardRows covers every number exactly once, one row per column letter', () => {
    for (const id of VARIANT_IDS) {
      const v = VARIANTS[id];
      const rows = boardRows(v);
      const all = rows.flatMap(r => r.numbers);
      expect(all).toEqual(Array.from({ length: v.total }, (_, i) => i + 1));
      if (v.letters.length) expect(rows.map(r => r.letter)).toEqual(v.letters);
      else expect(rows.every(r => r.letter === '')).toBe(true);
    }
    expect(boardRows(V75)[2].numbers).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]);
  });
});

describe('randomness', () => {
  it('uniformFrom rejects values above the unbiased limit and then reduces modulo', () => {
    // range 2^32; for max=3 the limit is 2^32 - 1 (since 2^32 % 3 === 1), so
    // the very top value must be rejected.
    const feed = [0xffffffff, 7];
    let i = 0;
    expect(uniformFrom(() => feed[i++], 3)).toBe(7 % 3);
    expect(i).toBe(2);
  });

  it('secureRandomInt stays in range and covers every outcome', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 2000; k++) {
      const x = secureRandomInt(5);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(5);
      seen.add(x);
    }
    expect(seen.size).toBe(5);
    expect(secureRandomInt(1)).toBe(0);
    expect(() => secureRandomInt(0)).toThrow(RangeError);
  });
});

describe('gameReducer', () => {
  const fresh = () => newGame(75, 1_000);

  it('newGame has nothing drawn and everything remaining', () => {
    const s = fresh();
    expect(s.drawn).toEqual([]);
    expect(remaining(s)).toHaveLength(75);
    expect(lastCall(s)).toBeNull();
    expect(isFinished(s)).toBe(false);
  });

  it('draw picks from the remaining balls only and records the order', () => {
    let s = fresh();
    // A deterministic "random" that always takes the first remaining ball.
    const first = () => 0;
    s = gameReducer(s, { type: 'draw', random: first });
    s = gameReducer(s, { type: 'draw', random: first });
    expect(s.drawn).toEqual([1, 2]);
    expect(remaining(s)[0]).toBe(3);
    // and the last remaining ball
    s = gameReducer(s, { type: 'draw', random: n => n - 1 });
    expect(lastCall(s)).toBe(75);
  });

  it('drawing every ball produces each number exactly once, then stops', () => {
    let s = fresh();
    for (let k = 0; k < 75; k++) s = gameReducer(s, { type: 'draw' });
    expect(isFinished(s)).toBe(true);
    expect([...s.drawn].sort((a, b) => a - b)).toEqual(Array.from({ length: 75 }, (_, i) => i + 1));
    const after = gameReducer(s, { type: 'draw' });
    expect(after).toBe(s);
  });

  it('undo removes only the last call; no-op on an empty game', () => {
    let s = fresh();
    expect(gameReducer(s, { type: 'undo' })).toBe(s);
    s = gameReducer(s, { type: 'draw', random: () => 4 });
    s = gameReducer(s, { type: 'draw', random: () => 4 });
    expect(s.drawn).toEqual([5, 6]);
    s = gameReducer(s, { type: 'undo' });
    expect(s.drawn).toEqual([5]);
    expect(remaining(s)).toContain(6);
  });

  it('newGame switches variant and clears the record', () => {
    let s = gameReducer(fresh(), { type: 'draw' });
    s = gameReducer(s, { type: 'newGame', variant: 90, now: 2_000 });
    expect(s).toEqual<GameState>({ variant: 90, drawn: [], startedAt: 2_000 });
    expect(remaining(s)).toHaveLength(90);
  });
});

describe('persistence', () => {
  it('round-trips game + settings', () => {
    let s = newGame(30, 5_000);
    s = gameReducer(s, { type: 'draw', random: () => 2 });
    const settings = { autoSeconds: 15 as const, voice: true };
    const back = parseSaved(serialize(s, settings));
    expect(back).toEqual({ game: s, settings });
  });

  it('falls back to defaults for missing/invalid settings', () => {
    const back = parseSaved(JSON.stringify({ v: 1, variant: 75, drawn: [3], startedAt: 'x', settings: { autoSeconds: 7, voice: 'yes' } }))!;
    expect(back.game.startedAt).toBe(0);
    expect(back.settings).toEqual({ autoSeconds: 10, voice: false });
    expect(AUTO_INTERVALS).toContain(back.settings.autoSeconds);
  });

  it('rejects malformed or tampered payloads', () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved('nope')).toBeNull();
    expect(parseSaved('{"v":2,"variant":75,"drawn":[]}')).toBeNull();
    expect(parseSaved('{"v":1,"variant":50,"drawn":[]}')).toBeNull();
    expect(parseSaved('{"v":1,"variant":75,"drawn":[1,1]}')).toBeNull(); // duplicate
    expect(parseSaved('{"v":1,"variant":75,"drawn":[76]}')).toBeNull(); // out of range
    expect(parseSaved('{"v":1,"variant":30,"drawn":[31]}')).toBeNull(); // out of range for variant
    expect(parseSaved('{"v":1,"variant":75,"drawn":[1.5]}')).toBeNull();
  });
});
