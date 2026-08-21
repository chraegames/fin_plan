import { describe, it, expect } from 'vitest';
import { formatTime, gameReducer, newGame, parseSavedGame, serializeGame, type GameState } from './game';
import { PEERS } from './sudoku';

function firstEmpty(s: GameState): number {
  return s.cells.findIndex(v => v === 0);
}

function wrongDigit(s: GameState, i: number): number {
  return (s.solution[i] % 9) + 1;
}

describe('gameReducer', () => {
  const base = newGame('easy', 99);

  it('newGame starts from the puzzle with an empty undo stack', () => {
    expect(base.cells).toEqual(base.puzzle);
    expect(base.history).toHaveLength(0);
    expect(base.status).toBe('playing');
  });

  it('ignores input on givens and when nothing is selected', () => {
    expect(gameReducer(base, { type: 'input', digit: 5 })).toBe(base);
    const given = base.puzzle.findIndex(v => v !== 0);
    const sel = gameReducer(base, { type: 'select', index: given });
    expect(gameReducer(sel, { type: 'input', digit: 5 })).toBe(sel);
  });

  it('places a digit, pushes history, and undo restores it', () => {
    const i = firstEmpty(base);
    const sel = gameReducer(base, { type: 'select', index: i });
    const placed = gameReducer(sel, { type: 'input', digit: wrongDigit(sel, i) });
    expect(placed.cells[i]).toBe(wrongDigit(sel, i));
    expect(placed.history).toHaveLength(1);
    const undone = gameReducer(placed, { type: 'undo' });
    expect(undone.cells).toEqual(base.cells);
    expect(undone.history).toHaveLength(0);
  });

  it('entering the same digit again clears the cell', () => {
    const i = firstEmpty(base);
    const sel = gameReducer(base, { type: 'select', index: i });
    const d = wrongDigit(sel, i);
    const once = gameReducer(sel, { type: 'input', digit: d });
    const twice = gameReducer(once, { type: 'input', digit: d });
    expect(twice.cells[i]).toBe(0);
  });

  it('notes mode toggles pencil marks and a placed digit clears peer notes', () => {
    const i = firstEmpty(base);
    const peer = PEERS[i].find(p => base.cells[p] === 0)!;
    let s = gameReducer(base, { type: 'toggleNotesMode' });
    s = gameReducer(s, { type: 'select', index: peer });
    s = gameReducer(s, { type: 'input', digit: 3 });
    s = gameReducer(s, { type: 'input', digit: 4 });
    expect(s.notes[peer]).toBe((1 << 3) | (1 << 4));
    s = gameReducer(s, { type: 'input', digit: 4 });
    expect(s.notes[peer]).toBe(1 << 3);

    s = gameReducer(s, { type: 'toggleNotesMode' });
    s = gameReducer(s, { type: 'select', index: i });
    s = gameReducer(s, { type: 'input', digit: 3 });
    expect(s.cells[i]).toBe(3);
    expect(s.notes[peer]).toBe(0);
  });

  it('erase clears value and notes on a non-given cell', () => {
    const i = firstEmpty(base);
    let s = gameReducer(base, { type: 'select', index: i });
    s = gameReducer(s, { type: 'input', digit: 1 });
    s = gameReducer(s, { type: 'erase' });
    expect(s.cells[i]).toBe(0);
    expect(gameReducer(s, { type: 'erase' })).toBe(s);
  });

  it('move clamps to the board', () => {
    let s = gameReducer(base, { type: 'select', index: 0 });
    s = gameReducer(s, { type: 'move', dr: -1, dc: -1 });
    expect(s.selected).toBe(0);
    s = gameReducer(s, { type: 'move', dr: 0, dc: 9 });
    expect(s.selected).toBe(8);
    s = gameReducer(s, { type: 'move', dr: 1, dc: 0 });
    expect(s.selected).toBe(17);
  });

  it('hint fills the selected (or first wrong) cell from the solution', () => {
    const i = firstEmpty(base);
    let s = gameReducer(base, { type: 'select', index: i });
    s = gameReducer(s, { type: 'hint' });
    expect(s.cells[i]).toBe(base.solution[i]);
    expect(s.hintsUsed).toBe(1);
    // selected cell now correct → hint moves to another cell
    const s2 = gameReducer(s, { type: 'hint' });
    expect(s2.selected).not.toBe(i);
    expect(s2.cells[s2.selected!]).toBe(base.solution[s2.selected!]);
  });

  it('wins when the last correct digit is placed and then freezes', () => {
    let s = base;
    const empties = base.cells.map((v, k) => (v === 0 ? k : -1)).filter(k => k >= 0);
    for (const k of empties.slice(0, -1)) {
      s = gameReducer(s, { type: 'select', index: k });
      s = gameReducer(s, { type: 'input', digit: base.solution[k] });
    }
    expect(s.status).toBe('playing');
    const last = empties[empties.length - 1];
    s = gameReducer(s, { type: 'select', index: last });
    s = gameReducer(s, { type: 'input', digit: base.solution[last] });
    expect(s.status).toBe('won');
    expect(s.cells).toEqual(base.solution);
    expect(gameReducer(s, { type: 'tick' })).toBe(s);
    expect(gameReducer(s, { type: 'undo' })).toBe(s);
  });

  it('tick counts seconds and restart resets the same puzzle', () => {
    let s = gameReducer(base, { type: 'tick' });
    s = gameReducer(s, { type: 'tick' });
    expect(s.elapsed).toBe(2);
    s = gameReducer(s, { type: 'select', index: firstEmpty(s) });
    s = gameReducer(s, { type: 'input', digit: 1 });
    const r = gameReducer(s, { type: 'restart' });
    expect(r.puzzle).toEqual(base.puzzle);
    expect(r.cells).toEqual(base.puzzle);
    expect(r.elapsed).toBe(0);
  });
});

describe('persistence', () => {
  const base = newGame('medium', 7);

  it('round-trips through serialize/parse (without transient UI state)', () => {
    let s = gameReducer(base, { type: 'select', index: firstEmpty(base) });
    s = gameReducer(s, { type: 'input', digit: 2 });
    s = gameReducer(s, { type: 'tick' });
    const back = parseSavedGame(serializeGame(s))!;
    expect(back.cells).toEqual(s.cells);
    expect(back.puzzle).toEqual(s.puzzle);
    expect(back.elapsed).toBe(1);
    expect(back.selected).toBeNull();
    expect(back.history).toHaveLength(0);
  });

  it('rejects malformed or tampered payloads', () => {
    expect(parseSavedGame(null)).toBeNull();
    expect(parseSavedGame('not json')).toBeNull();
    expect(parseSavedGame('{"v":2}')).toBeNull();
    const tampered = JSON.parse(serializeGame(base));
    const given = base.puzzle.findIndex(v => v !== 0);
    tampered.cells[given] = 0;
    expect(parseSavedGame(JSON.stringify(tampered))).toBeNull();
  });

  it('recomputes won status from the board', () => {
    const o = JSON.parse(serializeGame(base));
    o.cells = base.solution;
    expect(parseSavedGame(JSON.stringify(o))!.status).toBe('won');
  });
});

describe('formatTime', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});
