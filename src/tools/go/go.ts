// Go — pure rules (no React, no DOM, no network). Both players run this
// same module and validate every move locally, so no side is the authority.
//
// Rules implemented: captures, no suicide, simple ko (you may not immediately
// retake a single stone that just captured a single stone), pass, two
// consecutive passes end the game, area scoring with komi. Dead stones are
// not marked — players are told to capture them before passing.

import { GO_KEY, safeSetItem } from '../../utils/persistence';

export type Color = 1 | 2; // 1 = black, 2 = white
export type Stone = 0 | Color;
export type BoardSize = 9 | 13 | 19;

export const BOARD_SIZES: BoardSize[] = [9, 13, 19];
export const DEFAULT_SIZE: BoardSize = 9;
export const KOMI = 7.5;
export const BLACK: Color = 1;
export const WHITE: Color = 2;

export function isBoardSize(x: unknown): x is BoardSize {
  return x === 9 || x === 13 || x === 19;
}

export function opponent(c: Color): Color {
  return c === BLACK ? WHITE : BLACK;
}

export function colorName(c: Color): string {
  return c === BLACK ? 'Black' : 'White';
}

export type GameResult =
  | { kind: 'score'; black: number; white: number; komi: number; winner: Color; margin: number }
  | { kind: 'resign'; winner: Color }
  | { kind: 'abandon'; winner: Color };

export interface GameState {
  size: BoardSize;
  /** Row-major, index = y * size + x, y = 0 is the top row. */
  board: Stone[];
  turn: Color;
  /** Stones captured by black ([0]) and by white ([1]). */
  captures: [number, number];
  /** Index of the last stone played; null at the start or after a pass. */
  lastMove: number | null;
  consecutivePasses: number;
  /** Point that may not be played this turn because of simple ko. */
  koPoint: number | null;
  /** Number of moves (plays + passes) made so far. */
  moveNumber: number;
  status: 'playing' | 'ended';
  result: GameResult | null;
}

export type MoveReason = 'occupied' | 'suicide' | 'ko' | 'ended' | 'offBoard';
export type MoveResult = { ok: true; state: GameState } | { ok: false; reason: MoveReason };

export function newGame(size: BoardSize): GameState {
  return {
    size,
    board: new Array<Stone>(size * size).fill(0),
    turn: BLACK,
    captures: [0, 0],
    lastMove: null,
    consecutivePasses: 0,
    koPoint: null,
    moveNumber: 0,
    status: 'playing',
    result: null,
  };
}

export function toXY(idx: number, size: number): { x: number; y: number } {
  return { x: idx % size, y: Math.floor(idx / size) };
}

export function toIndex(x: number, y: number, size: number): number {
  return y * size + x;
}

const COLUMN_LETTERS = 'ABCDEFGHJKLMNOPQRST'; // no "I", as on real boards

/** Traditional coordinate: columns A–T (skipping I) left to right, rows 1..size bottom to top. */
export function toCoord(idx: number, size: number): string {
  const { x, y } = toXY(idx, size);
  return `${COLUMN_LETTERS[x]}${size - y}`;
}

export function neighbors(idx: number, size: number): number[] {
  const { x, y } = toXY(idx, size);
  const out: number[] = [];
  if (x > 0) out.push(idx - 1);
  if (x < size - 1) out.push(idx + 1);
  if (y > 0) out.push(idx - size);
  if (y < size - 1) out.push(idx + size);
  return out;
}

export interface Group {
  color: Color;
  stones: number[];
  liberties: Set<number>;
}

/** The connected group containing `idx` (must hold a stone) and its liberties. */
export function groupAt(board: readonly Stone[], size: number, idx: number): Group | null {
  const color = board[idx];
  if (!color) return null;
  const seen = new Set<number>([idx]);
  const stack = [idx];
  const stones: number[] = [];
  const liberties = new Set<number>();
  while (stack.length) {
    const p = stack.pop()!;
    stones.push(p);
    for (const n of neighbors(p, size)) {
      const s = board[n];
      if (s === 0) liberties.add(n);
      else if (s === color && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return { color, stones, liberties };
}

export function playMove(state: GameState, idx: number): MoveResult {
  if (state.status !== 'playing') return { ok: false, reason: 'ended' };
  const { size } = state;
  if (!Number.isInteger(idx) || idx < 0 || idx >= size * size) return { ok: false, reason: 'offBoard' };
  if (state.board[idx] !== 0) return { ok: false, reason: 'occupied' };
  if (idx === state.koPoint) return { ok: false, reason: 'ko' };

  const me = state.turn;
  const them = opponent(me);
  const board = state.board.slice();
  board[idx] = me;

  // Remove opponent groups left without liberties.
  let captured = 0;
  const capturedPoints: number[] = [];
  for (const n of neighbors(idx, size)) {
    if (board[n] !== them) continue;
    const g = groupAt(board, size, n);
    if (g && g.liberties.size === 0) {
      for (const s of g.stones) {
        board[s] = 0;
        capturedPoints.push(s);
      }
      captured += g.stones.length;
    }
  }

  const mine = groupAt(board, size, idx)!;
  if (mine.liberties.size === 0) return { ok: false, reason: 'suicide' };

  // Simple ko: a single stone that captured exactly one stone and now has
  // exactly one liberty (the point it captured) may not be retaken at once.
  const koPoint = captured === 1 && mine.stones.length === 1 && mine.liberties.size === 1 ? capturedPoints[0] : null;

  const captures: [number, number] = [state.captures[0], state.captures[1]];
  captures[me - 1] += captured;

  return {
    ok: true,
    state: {
      ...state,
      board,
      turn: them,
      captures,
      lastMove: idx,
      consecutivePasses: 0,
      koPoint,
      moveNumber: state.moveNumber + 1,
    },
  };
}

export function pass(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  const passes = state.consecutivePasses + 1;
  const next: GameState = {
    ...state,
    turn: opponent(state.turn),
    lastMove: null,
    consecutivePasses: passes,
    koPoint: null,
    moveNumber: state.moveNumber + 1,
  };
  if (passes >= 2) {
    const s = score(next);
    return { ...next, status: 'ended', result: { kind: 'score', ...s } };
  }
  return next;
}

export function resign(state: GameState, loser: Color): GameState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'ended', result: { kind: 'resign', winner: opponent(loser) } };
}

/** The opponent disconnected: the remaining player is recorded as the winner. */
export function abandon(state: GameState, leaver: Color): GameState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'ended', result: { kind: 'abandon', winner: opponent(leaver) } };
}

export interface Score {
  black: number;
  white: number;
  komi: number;
  winner: Color;
  margin: number;
}

/**
 * Area scoring: stones on the board plus empty regions bordered by one
 * colour only. Regions touching both colours (or nothing) are neutral.
 */
export function score(state: GameState): Score {
  const { board, size } = state;
  const counts: [number, number] = [0, 0];
  const seen = new Uint8Array(board.length);
  for (let i = 0; i < board.length; i++) {
    const s = board[i];
    if (s !== 0) {
      counts[s - 1]++;
      continue;
    }
    if (seen[i]) continue;
    // Flood-fill this empty region and note which colours border it.
    const region: number[] = [];
    const stack = [i];
    seen[i] = 1;
    let touchesBlack = false;
    let touchesWhite = false;
    while (stack.length) {
      const p = stack.pop()!;
      region.push(p);
      for (const n of neighbors(p, size)) {
        const t = board[n];
        if (t === BLACK) touchesBlack = true;
        else if (t === WHITE) touchesWhite = true;
        else if (!seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (touchesBlack && !touchesWhite) counts[0] += region.length;
    else if (touchesWhite && !touchesBlack) counts[1] += region.length;
  }
  const black = counts[0];
  const white = counts[1];
  const diff = black - (white + KOMI);
  return { black, white, komi: KOMI, winner: diff > 0 ? BLACK : WHITE, margin: Math.abs(diff) };
}

export function describeResult(result: GameResult): string {
  const w = colorName(result.winner);
  switch (result.kind) {
    case 'score':
      return `${w} wins by ${result.margin} (${result.black} to ${result.white} + ${result.komi} komi)`;
    case 'resign':
      return `${w} wins by resignation`;
    case 'abandon':
      return `${w} wins — opponent left`;
  }
}

/** Hoshi (star) points for the three supported sizes. */
export function starPoints(size: BoardSize): number[] {
  const edge = size === 9 ? 2 : 3;
  const mid = (size - 1) / 2;
  const coords = [edge, mid, size - 1 - edge];
  const out: number[] = [];
  for (const y of coords) for (const x of coords) out.push(toIndex(x, y, size));
  return out;
}

// ─── Persistence (preferred board size only) ────────────────────────────

interface SavedPrefs {
  v: 1;
  size: BoardSize;
}

export function parsePrefs(raw: string | null): BoardSize | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SavedPrefs>;
    return o.v === 1 && isBoardSize(o.size) ? o.size : null;
  } catch {
    return null;
  }
}

export function loadPreferredSize(): BoardSize {
  try {
    return parsePrefs(localStorage.getItem(GO_KEY)) ?? DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}

export function savePreferredSize(size: BoardSize): boolean {
  const saved: SavedPrefs = { v: 1, size };
  return safeSetItem(GO_KEY, JSON.stringify(saved));
}
