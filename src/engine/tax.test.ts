import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, calculateCapitalGainsTax, STANDARD_DEDUCTION } from './tax';

describe('calculateIncomeTax', () => {
  it('returns 0 for income below standard deduction', () => {
    expect(calculateIncomeTax(0)).toBe(0);
    expect(calculateIncomeTax(STANDARD_DEDUCTION)).toBe(0);
    expect(calculateIncomeTax(STANDARD_DEDUCTION - 1000)).toBe(0);
  });

  it('taxes the first bracket (10%) entirely', () => {
    // 23200 of taxable income fills bracket 0 exactly
    expect(calculateIncomeTax(STANDARD_DEDUCTION + 23200)).toBeCloseTo(2320, 2);
  });

  it('taxes across the 10% → 12% boundary', () => {
    // 94300 of taxable fills bracket 0 (23200) + bracket 1 (71100)
    expect(calculateIncomeTax(STANDARD_DEDUCTION + 94300)).toBeCloseTo(
      23200 * 0.10 + 71100 * 0.12,
      2,
    );
  });

  it('taxes a partial amount inside the 12% bracket', () => {
    // 50000 of taxable: 23200 @ 10% + 26800 @ 12%
    expect(calculateIncomeTax(STANDARD_DEDUCTION + 50000)).toBeCloseTo(
      23200 * 0.10 + 26800 * 0.12,
      2,
    );
  });

  it('taxes into the 22% bracket', () => {
    // 150000 of taxable: 23200@10 + 71100@12 + 55700@22
    expect(calculateIncomeTax(STANDARD_DEDUCTION + 150000)).toBeCloseTo(
      23200 * 0.10 + 71100 * 0.12 + 55700 * 0.22,
      2,
    );
  });
});

describe('calculateCapitalGainsTax', () => {
  it('returns 0 for zero gains regardless of ordinary income', () => {
    expect(calculateCapitalGainsTax(0, 0)).toBe(0);
    expect(calculateCapitalGainsTax(0, 500000)).toBe(0);
  });

  it('taxes gains at 0% when ordinary income is only the standard deduction', () => {
    // baseIncome = 0, full 0% band available
    expect(calculateCapitalGainsTax(50000, STANDARD_DEDUCTION)).toBe(0);
  });

  it('taxes gains at 0% when ord + gains fit under 94050', () => {
    // ord above STD = 60000, gains = 30000 → 90000 total, all in 0% band
    expect(calculateCapitalGainsTax(30000, STANDARD_DEDUCTION + 60000)).toBe(0);
  });

  it('taxes gains entirely at 15% when ord fills the 0% band', () => {
    // ord above STD = 100000 > 94050 → 0% band fully consumed, gains all at 15%
    expect(calculateCapitalGainsTax(50000, STANDARD_DEDUCTION + 100000)).toBeCloseTo(
      50000 * 0.15,
      2,
    );
  });

  it('splits gains across the 0% and 15% bands', () => {
    // ord above STD = 70000 → 0% band has 24050 room
    // 50000 of gains: 24050 @ 0% + 25950 @ 15%
    expect(calculateCapitalGainsTax(50000, STANDARD_DEDUCTION + 70000)).toBeCloseTo(
      25950 * 0.15,
      2,
    );
  });

  it('taxes into the 20% band on very large gains', () => {
    // ord above STD = 0, gains = 700000
    // 0% band: 94050 @ 0
    // 15% band: 489700 @ 15
    // 20% band: 700000 - 94050 - 489700 = 116250 @ 20
    expect(calculateCapitalGainsTax(700000, STANDARD_DEDUCTION)).toBeCloseTo(
      489700 * 0.15 + 116250 * 0.20,
      2,
    );
  });
});
