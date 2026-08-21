import { describe, it, expect } from 'vitest';
import {
  CLUE_TARGET,
  DIFFICULTIES,
  PEERS,
  countSolutions,
  createRng,
  digitCounts,
  findConflicts,
  generate,
  generateSolution,
  isSolved,
  parseGrid,
  solve,
} from './sudoku';

// Classic "easy" puzzle from Project Euler #96 with a known unique solution.
const PUZZLE = parseGrid(
  '003020600' + '900305001' + '001806400' + '008102900' + '700000008' + '006708200' +
    '002609500' + '800203009' + '005010300',
);
const SOLUTION = parseGrid(
  '483921657' + '967345821' + '251876493' + '548132976' + '729564138' + '136798245' +
    '372689514' + '814253769' + '695417382',
);

describe('peers', () => {
  it('every cell has 20 peers and never includes itself', () => {
    for (let i = 0; i < 81; i++) {
      expect(PEERS[i]).toHaveLength(20);
      expect(PEERS[i]).not.toContain(i);
    }
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const c = createRng(43);
    expect(c()).not.toBe(createRng(42)());
  });
});

describe('solve', () => {
  it('solves a known puzzle', () => {
    expect(solve(PUZZLE)).toEqual(SOLUTION);
  });

  it('does not mutate its input', () => {
    const copy = [...PUZZLE];
    solve(PUZZLE);
    expect(PUZZLE).toEqual(copy);
  });

  it('returns null for a contradictory grid', () => {
    const bad = [...PUZZLE];
    bad[0] = 4;
    bad[1] = 4; // two 4s in the same row
    expect(solve(bad)).toBeNull();
  });

  it('counts solutions with a cap', () => {
    expect(countSolutions(PUZZLE, 2)).toBe(1);
    const empty = new Array(81).fill(0);
    expect(countSolutions(empty, 3)).toBe(3);
  });
});

describe('generate', () => {
  it('full grids are valid', () => {
    const g = generateSolution(createRng(1));
    expect(isSolved(g)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    expect(generate('easy', 7)).toEqual(generate('easy', 7));
    expect(generate('easy', 7).puzzle).not.toEqual(generate('easy', 8).puzzle);
  });

  for (const d of DIFFICULTIES) {
    it(`${d}: unique solution, clue count near target`, () => {
      const { puzzle, solution } = generate(d, 123);
      expect(isSolved(solution)).toBe(true);
      // every clue agrees with the solution
      for (let i = 0; i < 81; i++) if (puzzle[i]) expect(puzzle[i]).toBe(solution[i]);
      expect(countSolutions(puzzle, 2)).toBe(1);
      expect(solve(puzzle)).toEqual(solution);
      const clues = puzzle.filter(v => v !== 0).length;
      expect(clues).toBeGreaterThanOrEqual(CLUE_TARGET[d]);
      expect(clues).toBeLessThanOrEqual(CLUE_TARGET[d] + 6);
    });
  }

  it('harder difficulties have fewer clues', () => {
    const n = (d: 'easy' | 'expert') => generate(d, 5).puzzle.filter(Boolean).length;
    expect(n('expert')).toBeLessThan(n('easy'));
  });
});

describe('board queries', () => {
  it('findConflicts flags both cells of a duplicate pair', () => {
    const g = new Array(81).fill(0);
    g[0] = 5;
    g[8] = 5; // same row
    g[40] = 5; // unrelated (centre cell shares nothing with 0 or 8)
    expect([...findConflicts(g)].sort()).toEqual([0, 8]);
  });

  it('isSolved needs a full, conflict-free grid', () => {
    expect(isSolved(SOLUTION)).toBe(true);
    expect(isSolved(PUZZLE)).toBe(false);
    const broken = [...SOLUTION];
    broken[0] = broken[1];
    expect(isSolved(broken)).toBe(false);
  });

  it('digitCounts tallies placed digits', () => {
    const c = digitCounts(SOLUTION);
    for (let d = 1; d <= 9; d++) expect(c[d]).toBe(9);
    expect(digitCounts(PUZZLE)[0]).toBe(81 - 32);
  });

  it('parseGrid rejects wrong lengths', () => {
    expect(() => parseGrid('123')).toThrow();
  });
});
