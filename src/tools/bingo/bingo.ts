// Bingo caller — pure game logic (no React, no DOM). The App wires the
// reducer to useReducer and persists every change under BINGO_KEY.
//
// This is a caller's utility for real-life bingo: it draws numbers, one at a
// time, uniformly at random from the balls still in the cage, and keeps the
// ordered record of what has been called. It does not generate cards.

import { BINGO_KEY, safeSetItem } from '../../utils/persistence';

// ─── Variants ───────────────────────────────────────────────────────────

export type VariantId = 75 | 90 | 30;

export interface Variant {
  id: VariantId;
  /** Highest ball number; balls run 1..total. */
  total: number;
  /** Column letters shown before each number (US style). Empty for 90-ball. */
  letters: string[];
  /** Numbers per column / flashboard row. */
  perColumn: number;
  name: string;
  blurb: string;
}

export const VARIANTS: Record<VariantId, Variant> = {
  75: {
    id: 75,
    total: 75,
    letters: ['B', 'I', 'N', 'G', 'O'],
    perColumn: 15,
    name: '75-ball',
    blurb: 'Classic B-I-N-G-O, 1–75',
  },
  90: {
    id: 90,
    total: 90,
    letters: [],
    perColumn: 10,
    name: '90-ball',
    blurb: 'UK / housie, 1–90',
  },
  30: {
    id: 30,
    total: 30,
    letters: ['B', 'I', 'N'],
    perColumn: 10,
    name: '30-ball',
    blurb: 'Speed bingo, 1–30',
  },
};

export const VARIANT_IDS: VariantId[] = [75, 90, 30];
export const DEFAULT_VARIANT: VariantId = 75;

export function isVariantId(x: unknown): x is VariantId {
  return x === 75 || x === 90 || x === 30;
}

/** Zero-based column index (B=0, I=1, …) of a ball. */
export function columnOf(n: number, variant: Variant): number {
  return Math.floor((n - 1) / variant.perColumn);
}

/** The letter called with a ball ('B' for 12 in 75-ball); '' for letterless variants. */
export function letterFor(n: number, variant: Variant): string {
  return variant.letters[columnOf(n, variant)] ?? '';
}

/** Traditional spoken/written form: "B-12", or "12" when there are no letters. */
export function formatCall(n: number, variant: Variant): string {
  const letter = letterFor(n, variant);
  return letter ? `${letter}-${n}` : String(n);
}

/** Text for speech synthesis: letters are read out one by one ("B, 12"). */
export function speechFor(n: number, variant: Variant): string {
  const letter = letterFor(n, variant);
  return letter ? `${letter}, ${n}` : String(n);
}

/** Rows of the flashboard: one row per letter/column, `perColumn` numbers each. */
export function boardRows(variant: Variant): { letter: string; numbers: number[] }[] {
  const rows: { letter: string; numbers: number[] }[] = [];
  for (let start = 1; start <= variant.total; start += variant.perColumn) {
    const numbers: number[] = [];
    for (let n = start; n < start + variant.perColumn && n <= variant.total; n++) numbers.push(n);
    rows.push({ letter: letterFor(start, variant), numbers });
  }
  return rows;
}

// ─── Randomness ─────────────────────────────────────────────────────────

/** Returns a uniform integer in [0, maxExclusive). */
export type RandomInt = (maxExclusive: number) => number;

/**
 * Cryptographically secure uniform integer using rejection sampling, so no
 * modulo bias creeps in (Math.random is used only if WebCrypto is missing).
 */
export const secureRandomInt: RandomInt = maxExclusive => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new RangeError('maxExclusive must be a positive integer');
  if (maxExclusive === 1) return 0;
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    return Math.floor(Math.random() * maxExclusive);
  }
  return uniformFrom(() => cryptoObj.getRandomValues(new Uint32Array(1))[0], maxExclusive);
};

/** Rejection sampling over a 32-bit source. Exported so tests can feed a fake source. */
export function uniformFrom(next32: () => number, maxExclusive: number): number {
  const range = 0x100000000; // 2^32
  const limit = range - (range % maxExclusive);
  let x = next32();
  while (x >= limit) x = next32();
  return x % maxExclusive;
}

// ─── State + reducer ────────────────────────────────────────────────────

export interface GameState {
  variant: VariantId;
  /** Calls in the order they were made. */
  drawn: number[];
  /** Epoch ms when the game was created (for the "started" label). */
  startedAt: number;
}

export type GameAction =
  | { type: 'newGame'; variant: VariantId; now: number }
  | { type: 'draw'; random?: RandomInt }
  | { type: 'undo' };

export function newGame(variant: VariantId, now: number): GameState {
  return { variant, drawn: [], startedAt: now };
}

export function variantOf(state: GameState): Variant {
  return VARIANTS[state.variant];
}

/** Balls still in the cage, ascending. */
export function remaining(state: GameState): number[] {
  const called = new Set(state.drawn);
  const out: number[] = [];
  for (let n = 1; n <= variantOf(state).total; n++) if (!called.has(n)) out.push(n);
  return out;
}

export function isFinished(state: GameState): boolean {
  return state.drawn.length >= variantOf(state).total;
}

export function lastCall(state: GameState): number | null {
  return state.drawn.length ? state.drawn[state.drawn.length - 1] : null;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'newGame':
      return newGame(action.variant, action.now);
    case 'draw': {
      const left = remaining(state);
      if (left.length === 0) return state;
      const pick = left[(action.random ?? secureRandomInt)(left.length)];
      return { ...state, drawn: [...state.drawn, pick] };
    }
    case 'undo':
      if (state.drawn.length === 0) return state;
      return { ...state, drawn: state.drawn.slice(0, -1) };
  }
}

// ─── Settings (caller preferences, persisted with the game) ─────────────

export const AUTO_INTERVALS = [5, 8, 10, 15, 20, 30] as const;
export type AutoInterval = (typeof AUTO_INTERVALS)[number];

export interface Settings {
  /** Seconds between automatic draws. */
  autoSeconds: AutoInterval;
  /** Read each call aloud with speech synthesis. */
  voice: boolean;
}

export const DEFAULT_SETTINGS: Settings = { autoSeconds: 10, voice: false };

// ─── Persistence ────────────────────────────────────────────────────────

interface SavedGame {
  v: 1;
  variant: VariantId;
  drawn: number[];
  startedAt: number;
  settings: Settings;
}

export interface Saved {
  game: GameState;
  settings: Settings;
}

function isDrawn(x: unknown, total: number): x is number[] {
  if (!Array.isArray(x) || x.length > total) return false;
  const seen = new Set<number>();
  for (const n of x) {
    if (!Number.isInteger(n) || n < 1 || n > total || seen.has(n)) return false;
    seen.add(n);
  }
  return true;
}

export function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SavedGame>;
    if (o.v !== 1 || !isVariantId(o.variant) || !isDrawn(o.drawn, VARIANTS[o.variant].total)) return null;
    const s = (o.settings ?? {}) as Partial<Settings>;
    return {
      game: {
        variant: o.variant,
        drawn: o.drawn,
        startedAt: typeof o.startedAt === 'number' && Number.isFinite(o.startedAt) ? o.startedAt : 0,
      },
      settings: {
        autoSeconds: (AUTO_INTERVALS as readonly number[]).includes(s.autoSeconds as number)
          ? (s.autoSeconds as AutoInterval)
          : DEFAULT_SETTINGS.autoSeconds,
        voice: s.voice === true,
      },
    };
  } catch {
    return null;
  }
}

export function loadSaved(): Saved | null {
  try {
    return parseSaved(localStorage.getItem(BINGO_KEY));
  } catch {
    return null;
  }
}

export function serialize(game: GameState, settings: Settings): string {
  const saved: SavedGame = { v: 1, variant: game.variant, drawn: game.drawn, startedAt: game.startedAt, settings };
  return JSON.stringify(saved);
}

export function save(game: GameState, settings: Settings): boolean {
  return safeSetItem(BINGO_KEY, serialize(game, settings));
}
