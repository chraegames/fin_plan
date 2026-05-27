import { describe, it, expect } from 'vitest';
import { resolveAmount, resolveIncomeAndExpenses } from './resolve';
import type { ActualsData, PlanInput } from '../models/types';

function basePlanInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2026,
    endYear: 2065,
    birthYear: 1985,
    startingCash: 0,
    brokerageBalance: 0,
    brokerageBasis: 0,
    rothBalance: 0,
    iraBalance: 0,
    returnRate: 0.07,
    inflationRate: 0.03,
    targetCash: 100_000,
    incomes: [],
    expenses: [],
    withdrawals: [],
    ...overrides,
  };
}

describe('resolveAmount', () => {
  it('returns 0 when no period covers the year', () => {
    expect(
      resolveAmount([{ startYear: 2030, endYear: 2035, amount: 1000 }], 2025),
    ).toBe(0);
    expect(
      resolveAmount([{ startYear: 2030, endYear: 2035, amount: 1000 }], 2036),
    ).toBe(0);
  });

  it('includes both endpoints (inclusive on each side)', () => {
    const periods = [{ startYear: 2030, endYear: 2035, amount: 500 }];
    expect(resolveAmount(periods, 2030)).toBe(500);
    expect(resolveAmount(periods, 2032)).toBe(500);
    expect(resolveAmount(periods, 2035)).toBe(500);
  });

  it('returns 0 for an empty period list', () => {
    expect(resolveAmount([], 2030)).toBe(0);
  });

  it('sums overlapping periods (intentional double-count)', () => {
    const periods = [
      { startYear: 2030, endYear: 2040, amount: 1000 },
      { startYear: 2035, endYear: 2045, amount: 500 },
    ];
    // 2030–2034: 1000 only
    expect(resolveAmount(periods, 2034)).toBe(1000);
    // 2035–2040: both apply, summed
    expect(resolveAmount(periods, 2037)).toBe(1500);
    // 2041–2045: 500 only
    expect(resolveAmount(periods, 2043)).toBe(500);
  });
});

describe('resolveIncomeAndExpenses — income', () => {
  it('sums taxable and non-taxable income and isolates taxable', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'salary',
          name: 'Salary',
          type: 'taxable',
          periods: [{ startYear: 2026, endYear: 2030, amount: 100_000 }],
        },
        {
          id: 'gift',
          name: 'Gift',
          type: 'non-taxable',
          periods: [{ startYear: 2026, endYear: 2030, amount: 20_000 }],
        },
      ],
    });

    const r = resolveIncomeAndExpenses(input, 2027);

    expect(r.totalIncome).toBe(120_000);
    expect(r.taxableIncome).toBe(100_000);
    expect(r.incomeBreakdown.find(b => b.name === 'Salary')?.amount).toBe(100_000);
    expect(r.incomeBreakdown.find(b => b.name === 'Gift')?.amount).toBe(20_000);
  });

  it('lets actuals override the projected income for matching id+year', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'salary',
          name: 'Salary',
          type: 'taxable',
          periods: [{ startYear: 2026, endYear: 2030, amount: 100_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      incomes: { salary: { 2027: 88_000 } },
      expenses: {},
      withdrawals: {},
    };

    const r2026 = resolveIncomeAndExpenses(input, 2026, actuals);
    expect(r2026.totalIncome).toBe(100_000); // no override → projection

    const r2027 = resolveIncomeAndExpenses(input, 2027, actuals);
    expect(r2027.totalIncome).toBe(88_000); // override applied
    expect(r2027.taxableIncome).toBe(88_000);
  });

  it('omits zero-amount income entries from the breakdown', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'starts-later',
          name: 'Pension',
          type: 'taxable',
          periods: [{ startYear: 2050, endYear: 2065, amount: 30_000 }],
        },
      ],
    });

    const r = resolveIncomeAndExpenses(input, 2027);

    expect(r.totalIncome).toBe(0);
    expect(r.incomeBreakdown).toEqual([]);
  });
});

describe('resolveIncomeAndExpenses — annual expenses', () => {
  it('applies inflation when applyInflation !== false', () => {
    const input = basePlanInput({
      startYear: 2026,
      inflationRate: 0.03,
      expenses: [
        {
          id: 'travel',
          name: 'Travel',
          frequency: 'annual',
          applyInflation: true,
          periods: [{ startYear: 2026, endYear: 2030, amount: 10_000 }],
        },
      ],
    });

    // Year 0: multiplier = 1.
    expect(resolveIncomeAndExpenses(input, 2026).totalExpenses).toBe(10_000);
    // Year 2: multiplier = 1.03^2 → round(10_000 * 1.0609) = 10_609.
    expect(resolveIncomeAndExpenses(input, 2028).totalExpenses).toBe(10_609);
  });

  it('skips inflation when applyInflation === false', () => {
    const input = basePlanInput({
      startYear: 2026,
      inflationRate: 0.03,
      expenses: [
        {
          id: 'mortgage',
          name: 'Mortgage',
          frequency: 'annual',
          applyInflation: false,
          periods: [{ startYear: 2026, endYear: 2045, amount: 24_000 }],
        },
      ],
    });

    expect(resolveIncomeAndExpenses(input, 2030).totalExpenses).toBe(24_000);
    expect(resolveIncomeAndExpenses(input, 2040).totalExpenses).toBe(24_000);
  });
});

describe('resolveIncomeAndExpenses — monthly expenses', () => {
  it('multiplies monthly amount by 12 then inflates', () => {
    const input = basePlanInput({
      startYear: 2026,
      inflationRate: 0.03,
      expenses: [
        {
          id: 'living',
          name: 'Living',
          frequency: 'monthly',
          applyInflation: true,
          periods: [{ startYear: 2026, endYear: 2065, amount: 3_000 }],
        },
      ],
    });

    // Year 0: 3000 * 12 = 36_000.
    expect(resolveIncomeAndExpenses(input, 2026).totalExpenses).toBe(36_000);
    // Year 1: round(36000 * 1.03) = 37_080.
    expect(resolveIncomeAndExpenses(input, 2027).totalExpenses).toBe(37_080);
  });

  it('fills missing months with the projected monthly amount when any month has an actual', () => {
    const input = basePlanInput({
      startYear: 2026,
      inflationRate: 0, // no inflation → projectedMonthly = 3000 flat
      expenses: [
        {
          id: 'living',
          name: 'Living',
          frequency: 'monthly',
          applyInflation: true,
          periods: [{ startYear: 2026, endYear: 2065, amount: 3_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      incomes: {},
      expenses: {
        // Two months entered, others (10 months) fall back to projection.
        living: {
          [2027 * 100 + 0]: 2_800,
          [2027 * 100 + 1]: 3_200,
        },
      },
      withdrawals: {},
    };

    const r = resolveIncomeAndExpenses(input, 2027, actuals);
    // Entered: 2800 + 3200 = 6000. Projected fill: 10 * 3000 = 30_000.
    expect(r.totalExpenses).toBe(36_000);
  });

  it('returns the pure projection when actuals have an entry for the id but no months', () => {
    const input = basePlanInput({
      startYear: 2026,
      inflationRate: 0,
      expenses: [
        {
          id: 'living',
          name: 'Living',
          frequency: 'monthly',
          applyInflation: true,
          periods: [{ startYear: 2026, endYear: 2065, amount: 3_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      incomes: {},
      // Key exists with empty year map — no month has an entry for 2027.
      expenses: { living: {} },
      withdrawals: {},
    };

    expect(resolveIncomeAndExpenses(input, 2027, actuals).totalExpenses).toBe(
      36_000,
    );
  });
});
