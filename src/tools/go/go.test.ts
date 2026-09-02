import { describe, expect, it } from 'vitest';
import {
  BLACK,
  KOMI,
  WHITE,
  abandon,
  describeResult,
  groupAt,
  newGame,
  parsePrefs,
  pass,
  playMove,
  resign,
  score,
  starPoints,
  toCoord,
  toIndex,
  type BoardSize,
  type GameState,
  type Stone,
} from './go';

/** Build a position from rows of '.', 'X' (black), 'O' (white). Top row first. */
function position(rows: string[], turn = BLACK): GameState {
  const size = rows.length as BoardSize;
  const board: Stone[] = [];
  for (const row of rows) {
    if (row.length !== size) throw new Error('ragged board');
    for (const ch of row) board.push(ch === 'X' ? BLACK : ch === 'O' ? WHITE : 0);
  }
  return { ...newGame(size), board, turn };
}

function at(rows: string[], x: number, y: number): number {
  return toIndex(x, y, rows.length);
}

function must(r: ReturnType<typeof playMove>): GameState {
  if (!r.ok) throw new Error(`move rejected: ${r.reason}`);
  return r.state;
}

const EMPTY9 = Array(9).fill('.........');

describe('coordinates', () => {
  it('maps index to A1-style coordinates, skipping I, rows counted from the bottom', () => {
    expect(toCoord(0, 9)).toBe('A9');
    expect(toCoord(toIndex(8, 8, 9), 9)).toBe('J1');
    expect(toCoord(toIndex(3, 5, 9), 9)).toBe('D4');
    expect(toCoord(toIndex(18, 0, 19), 19)).toBe('T19');
  });

  it('places nine star points on every size', () => {
    expect(starPoints(9)).toContain(toIndex(4, 4, 9));
    expect(starPoints(9)).toContain(toIndex(2, 2, 9));
    expect(starPoints(19)).toContain(toIndex(3, 3, 19));
    expect(starPoints(19)).toContain(toIndex(9, 9, 19));
    expect(starPoints(13)).toHaveLength(9);
  });
});

describe('groups and liberties', () => {
  it('counts corner, edge and centre liberties', () => {
    const rows = ['X........', '.........', '....X....', '.........', 'X........', '.........', '.........', '.........', '.........'];
    const s = position(rows);
    expect(groupAt(s.board, 9, at(rows, 0, 0))!.liberties.size).toBe(2);
    expect(groupAt(s.board, 9, at(rows, 0, 4))!.liberties.size).toBe(3);
    expect(groupAt(s.board, 9, at(rows, 4, 2))!.liberties.size).toBe(4);
    expect(groupAt(s.board, 9, at(rows, 5, 5))).toBeNull();
  });

  it('joins connected stones into one group', () => {
    const rows = ['XX.......', 'X........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    const g = groupAt(position(rows).board, 9, 0)!;
    expect(g.stones).toHaveLength(3);
    expect(g.liberties.size).toBe(3);
  });
});

describe('playMove', () => {
  it('rejects occupied and off-board points and moves after the game ended', () => {
    const s = position(['X........', ...EMPTY9.slice(1)]);
    expect(playMove(s, 0)).toEqual({ ok: false, reason: 'occupied' });
    expect(playMove(s, -1)).toEqual({ ok: false, reason: 'offBoard' });
    expect(playMove(s, 81)).toEqual({ ok: false, reason: 'offBoard' });
    expect(playMove(resign(s, BLACK), 5)).toEqual({ ok: false, reason: 'ended' });
  });

  it('captures a single stone and credits the capturer', () => {
    const rows = ['.X.......', 'XOX......', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    const s = must(playMove(position(rows), at(rows, 1, 2)));
    expect(s.board[at(rows, 1, 1)]).toBe(0);
    expect(s.captures).toEqual([1, 0]);
    expect(s.turn).toBe(WHITE);
    expect(s.lastMove).toBe(at(rows, 1, 2));
    expect(s.moveNumber).toBe(1);
  });

  it('captures several groups at once', () => {
    const rows = ['O.OX.....', 'X.X......', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    // Black at (1,0) removes both white stones (each has (1,0) as its only liberty).
    const s = must(playMove(position(rows), at(rows, 1, 0)));
    expect(s.board[at(rows, 0, 0)]).toBe(0);
    expect(s.board[at(rows, 2, 0)]).toBe(0);
    expect(s.captures).toEqual([2, 0]);
  });

  it('rejects suicide', () => {
    const rows = ['.O.......', 'O.O......', '.O.......', '.........', '.........', '.........', '.........', '.........', '.........'];
    expect(playMove(position(rows), at(rows, 1, 1))).toEqual({ ok: false, reason: 'suicide' });
  });

  it('allows a move with no liberties when it captures', () => {
    // Black playing at (0,0) has no liberty of its own but captures the white stone at (1,0).
    const rows = ['.OX......', 'OX.......', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    const s = must(playMove(position(rows), at(rows, 0, 0)));
    expect(s.board[at(rows, 0, 0)]).toBe(BLACK);
    expect(s.board[at(rows, 1, 0)]).toBe(0);
    expect(s.captures).toEqual([1, 0]);
  });

  it('enforces simple ko, then allows the retake after a tempo', () => {
    const rows = ['.........', '.XO......', 'X.XO.....', '.XO......', '.........', '.........', '.........', '.........', '.........'];
    // Classic ko shape: black at (1,1),(0,2),(2,2),(1,3); white at (2,1),(3,2),(2,3).
    // The black stone at (2,2) has one liberty, (1,2).
    let s = position(rows, WHITE);
    s = must(playMove(s, at(rows, 1, 2))); // white captures the black stone at (2,2)
    expect(s.board[at(rows, 2, 2)]).toBe(0);
    expect(s.koPoint).toBe(at(rows, 2, 2));
    // Black may not retake immediately.
    expect(playMove(s, at(rows, 2, 2))).toEqual({ ok: false, reason: 'ko' });
    // Black plays elsewhere, white answers elsewhere, then black may retake.
    s = must(playMove(s, at(rows, 8, 8)));
    expect(s.koPoint).toBeNull();
    s = must(playMove(s, at(rows, 8, 7)));
    s = must(playMove(s, at(rows, 2, 2)));
    expect(s.board[at(rows, 1, 2)]).toBe(0);
    expect(s.captures).toEqual([1, 1]);
  });

  it('does not set a ko point when the capturing stone has more than one liberty', () => {
    const rows = ['.X.......', 'XOX......', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    const s = must(playMove(position(rows), at(rows, 1, 2)));
    expect(s.koPoint).toBeNull();
  });
});

describe('pass / resign / abandon', () => {
  it('two consecutive passes end the game with an area score', () => {
    let s = position(EMPTY9);
    s = pass(s);
    expect(s.status).toBe('playing');
    expect(s.consecutivePasses).toBe(1);
    expect(s.turn).toBe(WHITE);
    s = pass(s);
    expect(s.status).toBe('ended');
    expect(s.result?.kind).toBe('score');
    expect(s.moveNumber).toBe(2);
  });

  it('a move in between resets the pass count', () => {
    let s = pass(position(EMPTY9));
    s = must(playMove(s, 40));
    expect(s.consecutivePasses).toBe(0);
    s = pass(s);
    expect(s.status).toBe('playing');
  });

  it('resign and abandon award the other colour', () => {
    const s = position(EMPTY9);
    expect(resign(s, BLACK).result).toEqual({ kind: 'resign', winner: WHITE });
    expect(abandon(s, WHITE).result).toEqual({ kind: 'abandon', winner: BLACK });
    expect(resign(resign(s, BLACK), WHITE).result).toEqual({ kind: 'resign', winner: WHITE });
  });
});

describe('score', () => {
  it('gives white the empty board by komi', () => {
    const s = score(position(EMPTY9));
    expect(s).toEqual({ black: 0, white: 0, komi: KOMI, winner: WHITE, margin: KOMI });
  });

  it('counts stones plus territory bordered by one colour only', () => {
    // A wall down column 4: black owns columns 0-3 (36 points + 9 stones), white owns 5-8.
    const rows = Array(9).fill('....XO...');
    const s = score(position(rows));
    expect(s.black).toBe(9 + 36);
    expect(s.white).toBe(9 + 27);
    expect(s.winner).toBe(BLACK);
    expect(s.margin).toBe(45 - (36 + KOMI));
  });

  it('treats regions touching both colours as neutral', () => {
    const rows = ['X.O......', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........'];
    const s = score(position(rows));
    expect(s.black).toBe(1);
    expect(s.white).toBe(1);
  });

  it('describes results in plain words', () => {
    expect(describeResult({ kind: 'resign', winner: BLACK })).toBe('Black wins by resignation');
    expect(describeResult({ kind: 'abandon', winner: WHITE })).toBe('White wins — opponent left');
    expect(describeResult({ kind: 'score', black: 45, white: 36, komi: 7.5, winner: BLACK, margin: 1.5 })).toBe(
      'Black wins by 1.5 (45 to 36 + 7.5 komi)',
    );
  });
});

describe('preferences', () => {
  it('parses a valid size and rejects everything else', () => {
    expect(parsePrefs(JSON.stringify({ v: 1, size: 13 }))).toBe(13);
    expect(parsePrefs(JSON.stringify({ v: 1, size: 10 }))).toBeNull();
    expect(parsePrefs(JSON.stringify({ v: 2, size: 9 }))).toBeNull();
    expect(parsePrefs('nope')).toBeNull();
    expect(parsePrefs(null)).toBeNull();
  });
});
