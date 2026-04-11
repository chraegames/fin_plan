import { describe, it, expect } from 'vitest';
import { autoBalance } from './autoBalance';
import { runSimulation } from './simulation';
import type { PlanInput } from '../models/types';
import { START_YEAR, END_YEAR } from './constants';

// Mirrors the constant in autoBalance.ts. Rounding (ROUND_GRANULARITY = 1000)
// per-account per-year is zero-mean, but accumulates over 40 years across
// 3 accounts. We allow the floor to slip by up to $20k of rounding noise;
// the bug we guard against produced drops of $200k+, well outside any
// rounding artifact.
const CASH_FLOOR = 10000;
const ROUNDING_SLACK = 20000;

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startingCash: 50000,
    brokerageBalance: 300000,
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
});
