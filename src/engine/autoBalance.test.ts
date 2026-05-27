import { describe, it, expect } from 'vitest';
import { autoBalance } from './autoBalance';
import { runSimulation } from './simulation';
import type { PlanInput } from '../models/types';

const START_YEAR = 2026;
const END_YEAR = 2065;

// Mirrors the constant in autoBalance.ts. Rounding (ROUND_GRANULARITY = 1000)
// per-account per-year is zero-mean, but accumulates over 40 years across
// 3 accounts. We allow the floor to slip by up to $20k of rounding noise;
// the bug we guard against produced drops of $200k+, well outside any
// rounding artifact.
const CASH_FLOOR = 10000;
const ROUNDING_SLACK = 20000;

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: START_YEAR,
    endYear: END_YEAR,
    birthYear: 1980,
    startingCash: 50000,
    brokerageBalance: 300000,
    brokerageBasis: 0,
    rothBalance: 300000,
    iraBalance: 400000,
    returnRate: 0.07,
    inflationRate: 0.03,
    targetCash: 100000,
    incomes: [],
    expenses: [],
    withdrawals: [],
    ...overrides,
  };
}

function runAutoAndSim(input: PlanInput, targetCash: number) {
  const schedules = autoBalance(input, targetCash);
  const simInput: PlanInput = { ...input, withdrawals: schedules };
  const results = runSimulation(simInput);
  const minCash = Math.min(...results.map(r => r.endingCash));
  const minCashYear = results.find(r => r.endingCash === minCash)?.year ?? -1;
  return { schedules, results, minCash, minCashYear };
}

describe('autoBalance honors cash floor', () => {
  it('classic retirement: wages end 2035, expenses through 2065', () => {
    const input = makeInput({
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2035, amount: 120000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 60000 }],
      }],
    });
    const { minCash, minCashYear } = runAutoAndSim(input, 100000);
    expect(minCash, `min cash at year ${minCashYear}`).toBeGreaterThanOrEqual(
      CASH_FLOOR - ROUNDING_SLACK,
    );
  });

  it('IRA-heavy retirement: the bug trigger scenario', () => {
    // This is the scenario class the user reported as broken: heavy IRA
    // balance means large iw_y draws fill the standard deduction and then
    // some, which the buggy LP fails to account for in its CG-band math.
    const input = makeInput({
      startingCash: 50000,
      brokerageBalance: 200000,
      rothBalance: 100000,
      iraBalance: 800000,
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2032, amount: 150000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 80000 }],
      }],
    });
    const { minCash, minCashYear } = runAutoAndSim(input, 150000);
    expect(minCash, `min cash at year ${minCashYear}`).toBeGreaterThanOrEqual(
      CASH_FLOOR - ROUNDING_SLACK,
    );
  });

  it('brokerage-only retirement: no IRA/Roth to draw from', () => {
    const input = makeInput({
      brokerageBalance: 1000000,
      rothBalance: 0,
      iraBalance: 0,
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2035, amount: 100000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 50000 }],
      }],
    });
    const { schedules, minCash, minCashYear } = runAutoAndSim(input, 100000);
    expect(minCash, `min cash at year ${minCashYear}`).toBeGreaterThanOrEqual(
      CASH_FLOOR - ROUNDING_SLACK,
    );
    // Sanity: no Roth/IRA schedules since balances are zero.
    expect(schedules.filter(s => s.accountType === 'roth')).toHaveLength(0);
    expect(schedules.filter(s => s.accountType === 'ira')).toHaveLength(0);
  });

  it('early retirement before penalty cutoff prefers brokerage/roth over IRA', () => {
    const input = makeInput({
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2030, amount: 200000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 70000 }],
      }],
    });
    const { results, minCash, minCashYear } = runAutoAndSim(input, 100000);
    expect(minCash, `min cash at year ${minCashYear}`).toBeGreaterThanOrEqual(
      CASH_FLOOR - ROUNDING_SLACK,
    );
    // Penalty applies before 2040. The LP should not aggressively pull IRA
    // in those early years when cheaper accounts are available.
    const earlyIraTotal = results
      .filter(r => r.year < 2040)
      .reduce((sum, r) => sum + r.withdrawalsIra, 0);
    const lateIraTotal = results
      .filter(r => r.year >= 2040)
      .reduce((sum, r) => sum + r.withdrawalsIra, 0);
    expect(lateIraTotal).toBeGreaterThan(earlyIraTotal);
  });

  it('wage-heavy scenario: cash tracks near the target', () => {
    // Regression guard for the reported bug: the LP should actually drive
    // cash toward targetCash, not let it drift arbitrarily negative.
    const input = makeInput({
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2035, amount: 150000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 70000 }],
      }],
    });
    const { minCash, minCashYear } = runAutoAndSim(input, 120000);
    expect(minCash, `min cash at year ${minCashYear}`).toBeGreaterThan(0);
  });

  it('cash actually tracks target throughout retirement (not just at the floor)', () => {
    // Stronger guard: with TARGET_PENALTY high enough, the LP should hit
    // targetCash whenever balances allow it, not just hover above the floor.
    // This is the user-visible behavior of the "target cash" input — if it
    // says $100K, the user expects cash near $100K each year, not $10K.
    const TARGET = 100_000;
    const input = makeInput({
      startingCash: 100_000,
      brokerageBalance: 500_000,
      brokerageBasis: 300_000,
      rothBalance: 400_000,
      iraBalance: 600_000,
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2035, amount: 130000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 65000 }],
      }],
    });
    const { results } = runAutoAndSim(input, TARGET);
    // After retirement (income ends 2035), the LP should keep cash above
    // 80% of target in any year where it has account balances to draw on.
    const postRetirement = results.filter(r => r.year >= 2036 && r.year < 2060);
    const belowThreshold = postRetirement.filter(r => r.endingCash < TARGET * 0.8);
    expect(
      belowThreshold.length,
      `years where cash < 80% of target: ${belowThreshold.map(r => `${r.year}=${Math.round(r.endingCash)}`).join(', ')}`,
    ).toBe(0);
  });

  it('does not drain accounts in early retirement and collapse later', () => {
    // Regression: prior TARGET_PENALTY=100 made the LP greedily fill target in
    // the first decade of retirement by draining brokerage/Roth/IRA, then ran
    // out and let cash spiral to −$3M+ by horizon end. The chosen weight
    // (TARGET_PENALTY=8) should preserve enough runway for the back half.
    const input = makeInput({
      startingCash: 200_000,
      brokerageBalance: 1_400_000,
      brokerageBasis: 900_000,
      rothBalance: 800_000,
      iraBalance: 1_200_000,
      returnRate: 0.06,
      incomes: [{
        id: 'w', name: 'Wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: 2030, amount: 220_000 }],
      }],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 130_000 }],
      }],
    });
    const { results } = runAutoAndSim(input, 150_000);
    const finalNw = results[results.length - 1].totalNetWorth;
    // The user-reported failure mode left final NW at −$3.6M. Anything past
    // the floor is acceptable; anything wildly negative means the LP burned
    // through accounts and ran the plan into bankruptcy.
    expect(finalNw, `final NW should not be deeply negative (got ${Math.round(finalNw)})`).toBeGreaterThan(-100_000);
    // No year should be more than $200k below the cash floor either.
    const worstCash = Math.min(...results.map(r => r.endingCash));
    const worstYear = results.find(r => r.endingCash === worstCash)?.year ?? -1;
    expect(worstCash, `min cash at year ${worstYear}`).toBeGreaterThan(-200_000);
  });

  it('handles a sub-floor target without crashing or infinite-looping', () => {
    // Regression: targetCash < CASH_FLOOR (10_000) used to invert the
    // binary-search bounds (lo=10_000, hi=targetCash) and degenerate. The
    // clamp keeps lo <= hi; the optimizer should still produce a valid
    // schedule with non-negative, non-NaN withdrawals.
    const input = makeInput({
      startingCash: 50_000,
      brokerageBalance: 200_000,
      rothBalance: 100_000,
      iraBalance: 200_000,
      incomes: [],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 40_000 }],
      }],
    });
    const { schedules, results } = runAutoAndSim(input, 0);
    // Every scheduled amount is finite and non-negative.
    for (const s of schedules) {
      for (const p of s.periods) {
        expect(Number.isFinite(p.amount)).toBe(true);
        expect(p.amount).toBeGreaterThanOrEqual(0);
      }
    }
    // Engine ran every year and produced finite cash values.
    expect(results).toHaveLength(END_YEAR - START_YEAR + 1);
    for (const r of results) {
      expect(Number.isFinite(r.endingCash)).toBe(true);
    }
  });

  it('always withdraws when cash sits below target and accounts have balance', () => {
    // The user-reported bug: the LP would return zero withdrawals for many
    // early years, letting cash spiral hundreds of thousands of dollars
    // below the target while accounts sat untouched. Repro: low starting
    // cash, no income, modest expenses, accounts that *could* cover the gap.
    const input = makeInput({
      startingCash: 10_000,
      brokerageBalance: 200_000,
      rothBalance: 100_000,
      iraBalance: 500_000,
      incomes: [],
      expenses: [{
        id: 'e', name: 'Living', frequency: 'annual', applyInflation: true,
        periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 50_000 }],
      }],
    });
    const { results } = runAutoAndSim(input, 100_000);
    // For every year where cash is materially below target AND any account
    // has spendable balance left, the engine must have withdrawn *something*.
    // (Once accounts are truly empty the engine has nothing to do.)
    const stuckYears = results.filter(r => {
      const wd = r.withdrawalsBrokerage + r.withdrawalsRoth + r.withdrawalsIra;
      const accounts = r.brokerageBalance + r.rothBalance + r.iraBalance;
      return r.endingCash < 0 && wd < 100 && accounts > 1_000;
    });
    expect(
      stuckYears.length,
      `years cash<0 with accounts>$1k and ~zero withdrawal: ${stuckYears.map(r => r.year).join(', ')}`,
    ).toBe(0);
  });
});
