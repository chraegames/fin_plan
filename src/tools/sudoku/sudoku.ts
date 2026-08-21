// Pure Sudoku engine — no React, no DOM. A grid is a flat array of 81 digits
// (0 = empty), row-major. Generation is deterministic for a given seed so a
// puzzle can be reproduced from its seed + difficulty.

export type Grid = number[];
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Target number of given clues per difficulty (removal stops once reached). */
export const CLUE_TARGET: Record<Difficulty, number> = {
  easy: 40,
  medium: 34,
  hard: 28,
  expert: 24,
};

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** Indices sharing a row, column or box with `i` (excluding `i`). */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j === i) continue;
    if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) out.push(j);
  }
  return out;
});

// ─── RNG ─────────────────────────────────────────────────────────────────

/** mulberry32 — small, fast, seedable; returns [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Solver ──────────────────────────────────────────────────────────────

/** Bitmask of digits (bit d = digit d) that may legally go in `i` right now. */
function candidateMask(grid: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << grid[p];
  return ~used & 0b1111111110;
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

/**
 * Backtracking search with most-constrained-cell ordering. Counts solutions
 * up to `limit`; the first solution found is copied into `out` when given.
 */
function search(grid: Grid, limit: number, out: Grid | null, rng?: () => number): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const mask = candidateMask(grid, i);
    const n = popcount(mask);
    if (n === 0) return 0;
    if (n < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = n;
      if (n === 1) break;
    }
  }
  if (best === -1) {
    if (out) for (let i = 0; i < 81; i++) out[i] = grid[i];
    return 1;
  }

  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
  if (rng) shuffle(digits, rng);

  let count = 0;
  for (const d of digits) {
    grid[best] = d;
    count += search(grid, limit - count, out && count === 0 ? out : null, rng);
    if (count >= limit) break;
  }
  grid[best] = 0;
  return count;
}

/** Number of solutions, capped at `limit` (default 2 — enough to test uniqueness). */
export function countSolutions(grid: Grid, limit = 2): number {
  return search([...grid], limit, null);
}

/** First solution, or null if unsolvable. Does not mutate the input. */
export function solve(grid: Grid): Grid | null {
  const out: Grid = new Array(81).fill(0);
  return search([...grid], 1, out) === 1 ? out : null;
}

// ─── Generator ───────────────────────────────────────────────────────────

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
}

/** A complete random valid grid. */
export function generateSolution(rng: () => number): Grid {
  const out: Grid = new Array(81).fill(0);
  search(new Array(81).fill(0), 1, out, rng);
  return out;
}

/**
 * Builds a puzzle with a unique solution by removing clues from a full grid
 * in random order until the difficulty's clue target is reached (or no more
 * cells can be removed without losing uniqueness).
 */
export function generate(difficulty: Difficulty, seed: number): Puzzle {
  const rng = createRng(seed);
  const solution = generateSolution(rng);
  const puzzle = [...solution];
  const target = CLUE_TARGET[difficulty];
  let clues = 81;
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  for (const i of order) {
    if (clues <= target) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = v;
  }
  return { puzzle, solution };
}

// ─── Board queries ───────────────────────────────────────────────────────

/** Indices whose digit clashes with a peer holding the same digit. */
export function findConflicts(grid: Grid): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (v === 0) continue;
    for (const p of PEERS[i]) {
      if (grid[p] === v) {
        out.add(i);
        break;
      }
    }
  }
  return out;
}

/** True when every cell is filled and there are no conflicts. */
export function isSolved(grid: Grid): boolean {
  return grid.every(v => v >= 1 && v <= 9) && findConflicts(grid).size === 0;
}

/** How many of each digit 1–9 are placed (index 0 unused). */
export function digitCounts(grid: Grid): number[] {
  const counts = new Array(10).fill(0);
  for (const v of grid) counts[v]++;
  return counts;
}

/** Parse an 81-char string ('.' or '0' = empty). Throws on bad input. */
export function parseGrid(s: string): Grid {
  const clean = s.replace(/[^0-9.]/g, '');
  if (clean.length !== 81) throw new Error(`Expected 81 cells, got ${clean.length}`);
  return Array.from(clean, ch => (ch === '.' ? 0 : Number(ch)));
}
