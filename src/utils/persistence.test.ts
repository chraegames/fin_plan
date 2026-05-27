import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanActuals, migratePlans } from './persistence';
import { earlyWithdrawalCutoff } from '../engine/constants';
import type { ActualsData, PlanInput, Scenario } from '../models/types';

/**
 * Build a minimal "current-shape" plan input. Tests that exercise legacy
 * shapes intentionally cast to drop required fields.
 */
function basePlanInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2026,
    endYear: 2065,
    birthYear: 1985,
    startingCash: 10_000,
    brokerageBalance: 100_000,
    brokerageBasis: 100_000,
    rothBalance: 50_000,
    iraBalance: 50_000,
    returnRate: 0.07,
    inflationRate: 0.03,
    targetCash: 100_000,
    incomes: [],
    expenses: [],
    withdrawals: [],
    ...overrides,
  };
}

function baseActuals(): ActualsData {
  return {
    incomes: {},
    expenses: {},
    withdrawals: { brokerage: {}, roth: {}, ira: {} },
    endingBalances: { brokerage: {}, roth: {}, ira: {} },
    endingCash: {},
  };
}

describe('migratePlans', () => {
  it('backfills missing scalar fields with sensible defaults', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      // Cast: pretend the persisted input never had these fields.
      input: {
        startingCash: 0,
        brokerageBalance: 0,
        rothBalance: 0,
        iraBalance: 0,
        incomes: [],
        expenses: [],
        withdrawals: [],
      } as unknown as PlanInput,
      actuals: undefined as unknown as ActualsData,
    };

    migratePlans([plan]);

    expect(plan.input.inflationRate).toBe(0.03);
    expect(plan.input.targetCash).toBe(200_000);
    expect(plan.input.startYear).toBe(2026);
    expect(plan.input.endYear).toBe(2065);
    expect(plan.input.birthYear).toBe(1985);
    expect(plan.input.brokerageBasis).toBe(0);
    expect(plan.input.returnRate).toBe(0.07);
    // actuals is rebuilt with empty per-bucket maps.
    expect(plan.actuals).toBeDefined();
    expect(plan.actuals.withdrawals.brokerage).toEqual({});
    expect(plan.actuals.endingBalances?.brokerage).toEqual({});
    expect(plan.actuals.endingCash).toEqual({});
    // Pre-existing plans become touched so the user skips Welcome.
    expect(plan.touched).toBe(true);
  });

  it('renames brokerageReturnRate → returnRate and deletes the legacy key', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: { ...basePlanInput(), brokerageReturnRate: 0.09 } as unknown as PlanInput,
      actuals: baseActuals(),
    };
    // Force the migration path by removing the modern key.
    delete (plan.input as Partial<PlanInput>).returnRate;

    migratePlans([plan]);

    expect(plan.input.returnRate).toBe(0.09);
    expect((plan.input as unknown as Record<string, unknown>).brokerageReturnRate).toBeUndefined();
  });

  it('falls back to retirementReturnRate when brokerageReturnRate is absent', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: { ...basePlanInput(), retirementReturnRate: 0.05 } as unknown as PlanInput,
      actuals: baseActuals(),
    };
    delete (plan.input as Partial<PlanInput>).returnRate;

    migratePlans([plan]);

    expect(plan.input.returnRate).toBe(0.05);
    expect((plan.input as unknown as Record<string, unknown>).retirementReturnRate).toBeUndefined();
  });

  it('splits retirementBalance 50/50 into rothBalance + iraBalance', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: {
        ...basePlanInput(),
        retirementBalance: 100_001,
      } as unknown as PlanInput,
      actuals: baseActuals(),
    };
    delete (plan.input as Partial<PlanInput>).rothBalance;
    delete (plan.input as Partial<PlanInput>).iraBalance;

    migratePlans([plan]);

    expect(plan.input.rothBalance).toBe(50_001); // round(100001 / 2) = 50001
    expect(plan.input.iraBalance).toBe(50_000);
    expect((plan.input as unknown as Record<string, unknown>).retirementBalance).toBeUndefined();
  });

  it('renames legacy withdrawal accountType "retirement" → "ira"', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: {
        ...basePlanInput(),
        withdrawals: [
          {
            id: 'w-old',
            accountType: 'retirement' as unknown as 'ira',
            periods: [{ startYear: 2030, endYear: 2040, amount: 20_000 }],
          },
        ],
      },
      actuals: baseActuals(),
    };

    migratePlans([plan]);

    const renamed = plan.input.withdrawals.find(w => w.id === 'w-old');
    expect(renamed?.accountType).toBe('ira');
  });

  it('inserts default withdrawal schedules for every missing account type', () => {
    const birthYear = 1985;
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput({ birthYear, startYear: 2026, endYear: 2065, withdrawals: [] }),
      actuals: baseActuals(),
    };

    migratePlans([plan]);

    const accountTypes = plan.input.withdrawals.map(w => w.accountType).sort();
    expect(accountTypes).toEqual(['brokerage', 'ira', 'roth']);

    const expectedStart = Math.max(2026, earlyWithdrawalCutoff(birthYear));
    for (const w of plan.input.withdrawals) {
      expect(w.periods[0].startYear).toBe(expectedStart);
      expect(w.periods[0].endYear).toBe(2065);
      expect(w.periods[0].amount).toBe(0);
    }
  });

  it('does not duplicate withdrawal schedules that already exist', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput({
        withdrawals: [
          {
            id: 'w-bro',
            accountType: 'brokerage',
            periods: [{ startYear: 2030, endYear: 2040, amount: 10_000 }],
          },
        ],
      }),
      actuals: baseActuals(),
    };

    migratePlans([plan]);

    expect(plan.input.withdrawals.filter(w => w.accountType === 'brokerage')).toHaveLength(1);
    expect(plan.input.withdrawals.filter(w => w.accountType === 'roth')).toHaveLength(1);
    expect(plan.input.withdrawals.filter(w => w.accountType === 'ira')).toHaveLength(1);
  });

  it('migrates old per-schedule-ID withdrawal actuals into per-account buckets', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput({
        withdrawals: [
          {
            id: 'sched-bro',
            accountType: 'brokerage',
            periods: [{ startYear: 2030, endYear: 2030, amount: 0 }],
          },
          {
            id: 'sched-ira-a',
            accountType: 'ira',
            periods: [{ startYear: 2030, endYear: 2030, amount: 0 }],
          },
          {
            id: 'sched-ira-b',
            accountType: 'ira',
            periods: [{ startYear: 2030, endYear: 2030, amount: 0 }],
          },
        ],
      }),
      actuals: {
        incomes: {},
        expenses: {},
        // Old shape: keyed by schedule ID, not account type.
        withdrawals: {
          'sched-bro': { 2030: 5_000 },
          'sched-ira-a': { 2030: 3_000 },
          'sched-ira-b': { 2030: 2_000 },
        } as unknown as ActualsData['withdrawals'],
        endingBalances: { brokerage: {}, roth: {}, ira: {} },
        endingCash: {},
      },
    };

    migratePlans([plan]);

    expect(plan.actuals.withdrawals.brokerage?.[2030]).toBe(5_000);
    // Two ira schedules with the same target year are summed.
    expect(plan.actuals.withdrawals.ira?.[2030]).toBe(5_000);
    expect(plan.actuals.withdrawals.roth?.[2030] ?? 0).toBe(0);
  });

  it('marks plans missing `touched` as touched (skip Welcome on next load)', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput(),
      actuals: baseActuals(),
    };

    migratePlans([plan]);

    expect(plan.touched).toBe(true);
  });

  it('does not flip touched: false (a fresh start should stay on Welcome)', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Default',
      input: basePlanInput(),
      actuals: baseActuals(),
      touched: false,
    };

    migratePlans([plan]);

    expect(plan.touched).toBe(false);
  });

  it('is idempotent: running twice yields the same shape', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput({ withdrawals: [] }),
      actuals: baseActuals(),
    };

    migratePlans([plan]);
    const after1 = JSON.parse(JSON.stringify(plan));
    migratePlans([plan]);
    expect(plan).toEqual(after1);
  });

  it('backfills applyInflation: true on legacy expenses without the flag', () => {
    const plan: Scenario = {
      id: 'p1',
      name: 'Legacy',
      input: basePlanInput({
        expenses: [
          {
            id: 'e1',
            name: 'Old expense',
            frequency: 'monthly',
            // Legacy: no applyInflation field at all.
            periods: [{ startYear: 2026, endYear: 2065, amount: 1000 }],
          } as unknown as PlanInput['expenses'][number],
        ],
      }),
      actuals: baseActuals(),
    };

    migratePlans([plan]);

    expect(plan.input.expenses[0].applyInflation).toBe(true);
  });
});

describe('cleanActuals', () => {
  // Most filters compare actuals years against `new Date().getFullYear()`.
  // Pin it so the test isn't sensitive to wall-clock time.
  const FROZEN_NOW = new Date('2030-06-15T00:00:00Z');
  beforeEach(() => vi.useFakeTimers().setSystemTime(FROZEN_NOW));
  afterEach(() => vi.useRealTimers());

  it('drops actuals for income IDs no longer in input', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'kept',
          name: 'Salary',
          type: 'taxable',
          periods: [{ startYear: 2026, endYear: 2030, amount: 100_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      ...baseActuals(),
      incomes: {
        kept: { 2026: 95_000 },
        gone: { 2026: 50_000 },
      },
    };

    const cleaned = cleanActuals(input, actuals);

    expect(cleaned.incomes.kept).toEqual({ 2026: 95_000 });
    expect(cleaned.incomes.gone).toBeUndefined();
  });

  it('drops actuals for years outside the matching income period', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'inc',
          name: 'Salary',
          type: 'taxable',
          periods: [{ startYear: 2026, endYear: 2028, amount: 100_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      ...baseActuals(),
      incomes: {
        inc: { 2025: 90_000, 2027: 95_000, 2029: 110_000 },
      },
    };

    const cleaned = cleanActuals(input, actuals);

    expect(cleaned.incomes.inc).toEqual({ 2027: 95_000 });
  });

  it('decodes monthly expense keys (year*100+month) when filtering by period', () => {
    const input = basePlanInput({
      expenses: [
        {
          id: 'exp',
          name: 'Living',
          frequency: 'monthly',
          applyInflation: true,
          periods: [{ startYear: 2027, endYear: 2028, amount: 1000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      ...baseActuals(),
      expenses: {
        exp: {
          [2026 * 100 + 5]: 800, // outside period: dropped
          [2027 * 100 + 0]: 950, // inside: kept
          [2028 * 100 + 11]: 1100, // inside: kept
          [2029 * 100 + 3]: 1200, // outside: dropped
        },
      },
    };

    const cleaned = cleanActuals(input, actuals);

    expect(cleaned.expenses.exp).toEqual({
      [2027 * 100 + 0]: 950,
      [2028 * 100 + 11]: 1100,
    });
  });

  it('clips withdrawal/endingBalance/endingCash actuals to [startYear, currentYear]', () => {
    const input = basePlanInput({ startYear: 2028, endYear: 2040 });
    const actuals: ActualsData = {
      incomes: {},
      expenses: {},
      withdrawals: {
        brokerage: { 2027: 1_000, 2029: 5_000, 2031: 7_000 },
        ira: { 2030: 3_000 },
      },
      endingBalances: {
        brokerage: { 2027: 90_000, 2029: 100_000, 2031: 80_000 },
      },
      endingCash: { 2027: 10_000, 2029: 20_000, 2031: 30_000 },
    };

    // FROZEN_NOW = 2030, startYear = 2028 → keep 2029, 2030; drop 2027, 2031.
    const cleaned = cleanActuals(input, actuals);

    expect(cleaned.withdrawals.brokerage).toEqual({ 2029: 5_000 });
    expect(cleaned.withdrawals.ira).toEqual({ 2030: 3_000 });
    expect(cleaned.endingBalances?.brokerage).toEqual({ 2029: 100_000 });
    expect(cleaned.endingCash).toEqual({ 2029: 20_000 });
  });

  it('omits empty per-item maps from the cleaned result', () => {
    const input = basePlanInput({
      incomes: [
        {
          id: 'inc',
          name: 'Salary',
          type: 'taxable',
          periods: [{ startYear: 2026, endYear: 2028, amount: 100_000 }],
        },
      ],
    });
    const actuals: ActualsData = {
      ...baseActuals(),
      // All entries fall outside the income period and should be removed,
      // leaving no key in the result at all.
      incomes: { inc: { 2050: 999 } },
    };

    const cleaned = cleanActuals(input, actuals);

    expect(cleaned.incomes.inc).toBeUndefined();
  });
});
