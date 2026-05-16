import { describe, it, expect } from 'vitest';
import { runSimulation } from './simulation';
import type { PlanInput } from '../models/types';
import { earlyWithdrawalCutoff } from './constants';

const START_YEAR = 2026;
const END_YEAR = 2065;

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: START_YEAR,
    endYear: END_YEAR,
    birthYear: 1980,
    startingCash: 50000,
    brokerageBalance: 100000,
    brokerageBasis: 100000,
    rothBalance: 0,
    iraBalance: 0,
    returnRate: 0.07,
    inflationRate: 0.03,
    targetCash: 100000,
    incomes: [],
    expenses: [],
    withdrawals: [],
    ...overrides,
  };
}

describe('birthYear → early-withdrawal cutoff', () => {
  it('exposes the cutoff via the helper', () => {
    expect(earlyWithdrawalCutoff(1980)).toBe(2040);
    expect(earlyWithdrawalCutoff(1990)).toBe(2050);
    expect(earlyWithdrawalCutoff(1970)).toBe(2030);
  });

  it('applies penalty before cutoff and not after, scaling with birthYear', () => {
    const baseSchedule = {
      id: 'w', accountType: 'ira' as const,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 10000 }],
    };

    const young = makeInput({
      birthYear: 1990, iraBalance: 1_000_000,
      withdrawals: [baseSchedule],
    });
    const youngResults = runSimulation(young);
    // 1990 birth ⇒ cutoff 2050. 2049 should still have penalty.
    expect(youngResults.find(r => r.year === 2049)!.earlyWithdrawalPenalty).toBeGreaterThan(0);
    expect(youngResults.find(r => r.year === 2050)!.earlyWithdrawalPenalty).toBe(0);

    const old = makeInput({
      birthYear: 1970, iraBalance: 1_000_000,
      withdrawals: [baseSchedule],
    });
    const oldResults = runSimulation(old);
    // 1970 birth ⇒ cutoff 2030. By 2030, penalty should be gone.
    expect(oldResults.find(r => r.year === 2029)!.earlyWithdrawalPenalty).toBeGreaterThan(0);
    expect(oldResults.find(r => r.year === 2030)!.earlyWithdrawalPenalty).toBe(0);
  });
});

describe('brokerage cost basis', () => {
  it('charges no capital-gains tax when basis = balance (no embedded gains)', () => {
    // The withdrawal in year 1 is entirely return-of-capital because basis
    // covers the whole pre-growth balance. (After growth in subsequent years,
    // some fraction becomes gain.)
    const input = makeInput({
      birthYear: 1960, // past cutoff, no penalty noise
      brokerageBalance: 100000,
      brokerageBasis: 100000,
      withdrawals: [{
        id: 'w', accountType: 'brokerage',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 50000 }],
      }],
    });
    const results = runSimulation(input);
    const y0 = results.find(r => r.year === START_YEAR)!;
    expect(y0.capitalGainsTax).toBe(0);
  });

  it('charges full LTCG when basis = 0 (legacy behavior)', () => {
    const input = makeInput({
      birthYear: 1960,
      brokerageBalance: 100000,
      brokerageBasis: 0,
      // Force the withdrawal into the 15% LTCG bracket by giving substantial
      // ordinary income so the 0% band is fully consumed.
      incomes: [{
        id: 'i', name: 'wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 200000 }],
      }],
      withdrawals: [{
        id: 'w', accountType: 'brokerage',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 50000 }],
      }],
    });
    const results = runSimulation(input);
    const y0 = results.find(r => r.year === START_YEAR)!;
    // Full $50k withdrawal is treated as gain → 15% × $50k = $7,500
    expect(y0.capitalGainsTax).toBeCloseTo(7500, 2);
  });

  it('caps an over-scheduled withdrawal to the actual balance', () => {
    // Regression: previously, scheduling a $1M brokerage withdrawal from a
    // $100k balance would zero the balance correctly but report
    // withdrawalsBrokerage = $1M in YearResult — inflating cash flow by
    // ~$900k of phantom money.
    const input = makeInput({
      birthYear: 1960,
      startingCash: 0,
      brokerageBalance: 100000,
      brokerageBasis: 100000,
      withdrawals: [{
        id: 'w', accountType: 'brokerage',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 1_000_000 }],
      }],
    });
    const results = runSimulation(input);
    const y0 = results.find(r => r.year === START_YEAR)!;
    expect(y0.withdrawalsBrokerage).toBe(100000);
    // Cash should reflect only what was actually withdrawn (no income, no
    // expenses, no tax since basis covers the whole withdrawal).
    expect(y0.endingCash).toBeCloseTo(100000, 2);
  });

  it('splits a withdrawal proportionally when basis < balance', () => {
    // Year-0 balance $100k, basis $40k → gain fraction = 60%.
    // $50k withdrawal → $30k gain (taxable), $20k basis (untaxed).
    // Force into 15% LTCG band via large ordinary income.
    const input = makeInput({
      birthYear: 1960,
      brokerageBalance: 100000,
      brokerageBasis: 40000,
      incomes: [{
        id: 'i', name: 'wages', type: 'taxable',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 200000 }],
      }],
      withdrawals: [{
        id: 'w', accountType: 'brokerage',
        periods: [{ startYear: START_YEAR, endYear: START_YEAR, amount: 50000 }],
      }],
    });
    const results = runSimulation(input);
    const y0 = results.find(r => r.year === START_YEAR)!;
    // gain = $30k @ 15% = $4,500
    expect(y0.capitalGainsTax).toBeCloseTo(4500, 2);
  });
});
