// Sudoku game state + reducer. Pure (no React); the App wires it to useReducer
// and persists every change under SUDOKU_KEY.

import { SUDOKU_KEY, safeSetItem } from '../../utils/persistence';
import {
  DIFFICULTIES,
  PEERS,
  generate,
  isSolved,
  type Difficulty,
  type Grid,
} from './sudoku';

export type Status = 'playing' | 'won';

interface Snapshot {
  cells: Grid;
  notes: number[];
}

export interface GameState {
  difficulty: Difficulty;
  seed: number;
  puzzle: Grid;
  solution: Grid;
  /** Current board: givens + user entries (0 = empty). */
  cells: Grid;
  /** Pencil marks as a bitmask per cell (bit d = digit d). */
  notes: number[];
  selected: number | null;
  /** Digit-first entry: the pad digit that tapping a cell will place (null = cell-first). */
  activeDigit: number | null;
  notesMode: boolean;
  /** Undo stack, oldest first. */
  history: Snapshot[];
  /** Seconds on the clock. */
  elapsed: number;
  status: Status;
  hintsUsed: number;
}

export type GameAction =
  | { type: 'newGame'; difficulty: Difficulty; seed: number }
  | { type: 'select'; index: number | null }
  | { type: 'move'; dr: number; dc: number }
  | { type: 'input'; digit: number }
  | { type: 'pickDigit'; digit: number }
  | { type: 'erase' }
  | { type: 'toggleNotesMode' }
  | { type: 'undo' }
  | { type: 'hint' }
  | { type: 'tick' }
  | { type: 'restart' };

export const HISTORY_MAX = 200;

export function newGame(difficulty: Difficulty, seed: number): GameState {
  const { puzzle, solution } = generate(difficulty, seed);
  return {
    difficulty,
    seed,
    puzzle,
    solution,
    cells: [...puzzle],
    notes: new Array(81).fill(0),
    selected: null,
    activeDigit: null,
    notesMode: false,
    history: [],
    elapsed: 0,
    status: 'playing',
    hintsUsed: 0,
  };
}

export function isGiven(state: GameState, i: number): boolean {
  return state.puzzle[i] !== 0;
}

function pushHistory(state: GameState): Snapshot[] {
  const next = [...state.history, { cells: state.cells, notes: state.notes }];
  return next.length > HISTORY_MAX ? next.slice(next.length - HISTORY_MAX) : next;
}

/** Place (or toggle) digit `d` in cell `i`, honouring notes mode. */
function applyDigit(state: GameState, i: number, d: number): GameState {
  if (state.status !== 'playing' || isGiven(state, i) || d < 1 || d > 9) return state;

  if (state.notesMode) {
    if (state.cells[i] !== 0) return state;
    const notes = [...state.notes];
    notes[i] ^= 1 << d;
    return { ...state, notes, history: pushHistory(state) };
  }

  const cells = [...state.cells];
  const notes = [...state.notes];
  if (cells[i] === d) {
    cells[i] = 0; // tapping the same digit again clears it
  } else {
    cells[i] = d;
    notes[i] = 0;
    for (const p of PEERS[i]) notes[p] &= ~(1 << d); // auto-erase matching pencil marks
  }
  return finish(state, cells, notes);
}

function finish(state: GameState, cells: Grid, notes: number[]): GameState {
  const won = isSolved(cells);
  return {
    ...state,
    cells,
    notes,
    history: pushHistory(state),
    status: won ? 'won' : 'playing',
    selected: won ? null : state.selected,
    activeDigit: won ? null : state.activeDigit,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'newGame':
      return newGame(action.difficulty, action.seed);

    case 'restart':
      return { ...newGame(state.difficulty, state.seed), elapsed: 0 };

    case 'select': {
      const i = action.index;
      const next = state.selected === i ? state : { ...state, selected: i };
      if (i != null && state.activeDigit != null) return applyDigit(next, i, state.activeDigit);
      return next;
    }

    case 'move': {
      const from = state.selected ?? 0;
      const r = Math.min(8, Math.max(0, Math.floor(from / 9) + action.dr));
      const c = Math.min(8, Math.max(0, (from % 9) + action.dc));
      return { ...state, selected: r * 9 + c };
    }

    case 'toggleNotesMode':
      return { ...state, notesMode: !state.notesMode };

    case 'tick':
      return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state;

    case 'input': {
      const i = state.selected;
      if (i == null) return state;
      return applyDigit(state, i, action.digit);
    }

    case 'pickDigit': {
      // Tapping the pad: enter the digit into the selected cell (cell-first)
      // and make it sticky so further cell taps paint it (digit-first).
      // Tapping the active digit again releases it.
      const d = action.digit;
      if (state.activeDigit === d) return { ...state, activeDigit: null };
      const next = state.selected != null ? applyDigit(state, state.selected, d) : state;
      return { ...next, activeDigit: d };
    }

    case 'erase': {
      const i = state.selected;
      if (i == null || state.status !== 'playing' || isGiven(state, i)) return state;
      if (state.cells[i] === 0 && state.notes[i] === 0) return state;
      const cells = [...state.cells];
      const notes = [...state.notes];
      cells[i] = 0;
      notes[i] = 0;
      return finish(state, cells, notes);
    }

    case 'hint': {
      if (state.status !== 'playing') return state;
      // Prefer the selected cell if it's wrong/empty; otherwise the first such cell.
      let i = state.selected;
      if (i == null || isGiven(state, i) || state.cells[i] === state.solution[i]) {
        i = state.cells.findIndex((v, k) => v !== state.solution[k]);
        if (i === -1) return state;
      }
      const cells = [...state.cells];
      const notes = [...state.notes];
      const d = state.solution[i];
      cells[i] = d;
      notes[i] = 0;
      for (const p of PEERS[i]) notes[p] &= ~(1 << d);
      return { ...finish(state, cells, notes), selected: i, hintsUsed: state.hintsUsed + 1 };
    }

    case 'undo': {
      if (state.history.length === 0 || state.status !== 'playing') return state;
      const prev = state.history[state.history.length - 1];
      return { ...state, cells: prev.cells, notes: prev.notes, history: state.history.slice(0, -1) };
    }
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────

interface SavedGame {
  v: 1;
  difficulty: Difficulty;
  seed: number;
  puzzle: Grid;
  solution: Grid;
  cells: Grid;
  notes: number[];
  elapsed: number;
  status: Status;
  hintsUsed: number;
}

function isGrid(x: unknown): x is Grid {
  return Array.isArray(x) && x.length === 81 && x.every(v => Number.isInteger(v) && v >= 0 && v <= 9);
}

function isNotes(x: unknown): x is number[] {
  return Array.isArray(x) && x.length === 81 && x.every(v => Number.isInteger(v) && v >= 0 && v < 1024);
}

export function parseSavedGame(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SavedGame>;
    if (
      o.v !== 1 ||
      !DIFFICULTIES.includes(o.difficulty as Difficulty) ||
      typeof o.seed !== 'number' ||
      !isGrid(o.puzzle) ||
      !isGrid(o.solution) ||
      !isGrid(o.cells) ||
      !isNotes(o.notes)
    ) {
      return null;
    }
    // Givens must be preserved in the saved board.
    for (let i = 0; i < 81; i++) if (o.puzzle[i] !== 0 && o.cells[i] !== o.puzzle[i]) return null;
    return {
      difficulty: o.difficulty as Difficulty,
      seed: o.seed,
      puzzle: o.puzzle,
      solution: o.solution,
      cells: o.cells,
      notes: o.notes,
      selected: null,
      activeDigit: null,
      notesMode: false,
      history: [],
      elapsed: typeof o.elapsed === 'number' && o.elapsed >= 0 ? Math.floor(o.elapsed) : 0,
      status: o.status === 'won' || isSolved(o.cells) ? 'won' : 'playing',
      hintsUsed: typeof o.hintsUsed === 'number' ? o.hintsUsed : 0,
    };
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  try {
    return parseSavedGame(localStorage.getItem(SUDOKU_KEY));
  } catch {
    return null;
  }
}

export function serializeGame(state: GameState): string {
  const saved: SavedGame = {
    v: 1,
    difficulty: state.difficulty,
    seed: state.seed,
    puzzle: state.puzzle,
    solution: state.solution,
    cells: state.cells,
    notes: state.notes,
    elapsed: state.elapsed,
    status: state.status,
    hintsUsed: state.hintsUsed,
  };
  return JSON.stringify(saved);
}

export function saveGame(state: GameState): boolean {
  return safeSetItem(SUDOKU_KEY, serializeGame(state));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** A fresh seed: time-based with some entropy so rapid "New game" taps differ. */
export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
