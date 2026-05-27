import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, calculateCapitalGainsTax, STANDARD_DEDUCTION } from './tax';

// 2026 MFJ schedule. Keeping the constants spelled out here (instead of
// importing from constants.ts) so the test fails loudly if a future
// edit shifts the brackets without updating the expected math.
const B10 = 24_800;
const B12_TOP = 100_800;
const CG_0_TOP = 98_900;
const CG_15_TOP = 613_700;

describe('calculateIncomeTax', () => {
  it('returns 0 for income below standard deduction', () => {
    expect(calculateIncomeTax(0)).toBe(0);
    expect(calculateIncomeTax(STANDARD_DEDUCTION)).toBe(0);
    expect(calculateIncomeTax(STANDARD_DEDUCTION - 1000)).toBe(0);
  });

  it('taxes the first bracket (10%) entirely', () => {
    // Top of the 10% bracket exactly fills bracket 0.
    expect(calculateIncomeTax(STANDARD_DEDUCTION + B10)).toBeCloseTo(B10 * 0.10, 2);
  });

  it('taxes across the 10% → 12% boundary', () => {
    // Taxable income reaching the top of the 12% bracket.
    const taxable = B12_TOP;
    const b12Width = B12_TOP - B10;
    expect(calculateIncomeTax(STANDARD_DEDUCTION + taxable)).toBeCloseTo(
      B10 * 0.10 + b12Width * 0.12,
      2,
    );
  });

  it('taxes a partial amount inside the 12% bracket', () => {
    // 50,000 of taxable: B10 @ 10% + (50,000 - B10) @ 12%.
    const taxable = 50_000;
    expect(calculateIncomeTax(STANDARD_DEDUCTION + taxable)).toBeCloseTo(
      B10 * 0.10 + (taxable - B10) * 0.12,
      2,
    );
  });

  it('taxes into the 22% bracket', () => {
    // 150,000 of taxable: full 10%, full 12%, partial 22%.
    const taxable = 150_000;
    const b12Width = B12_TOP - B10;
    expect(calculateIncomeTax(STANDARD_DEDUCTION + taxable)).toBeCloseTo(
      B10 * 0.10 + b12Width * 0.12 + (taxable - B12_TOP) * 0.22,
      2,
    );
  });
});

describe('calculateCapitalGainsTax', () => {
  it('returns 0 for zero gains regardless of ordinary income', () => {
    expect(calculateCapitalGainsTax(0, 0)).toBe(0);
    expect(calculateCapitalGainsTax(0, 500_000)).toBe(0);
  });

  it('taxes gains at 0% when ordinary income is only the standard deduction', () => {
    // baseIncome = 0, full 0% band available (CG_0_TOP).
    expect(calculateCapitalGainsTax(50_000, STANDARD_DEDUCTION)).toBe(0);
  });

  it('taxes gains at 0% when ord + gains fit under the 0% top', () => {
    // ord above STD = 60,000, gains = 30,000 → 90,000 total, still inside 0%.
    expect(calculateCapitalGainsTax(30_000, STANDARD_DEDUCTION + 60_000)).toBe(0);
  });

  it('taxes gains entirely at 15% when ord fills the 0% band', () => {
    // ord above STD = 100_000 > CG_0_TOP → all 50,000 of gains land in 15%.
    expect(calculateCapitalGainsTax(50_000, STANDARD_DEDUCTION + 100_000)).toBeCloseTo(
      50_000 * 0.15,
      2,
    );
  });

  it('splits gains across the 0% and 15% bands', () => {
    // ord above STD = 70_000 → 0% band has CG_0_TOP - 70_000 room.
    const ordAboveStd = 70_000;
    const room0 = CG_0_TOP - ordAboveStd;
    const gains = 50_000;
    const taxed15 = gains - room0;
    expect(
      calculateCapitalGainsTax(gains, STANDARD_DEDUCTION + ordAboveStd),
    ).toBeCloseTo(taxed15 * 0.15, 2);
  });

  it('taxes into the 20% band on very large gains', () => {
    // ord above STD = 0, gains span all three bands.
    const gains = 700_000;
    const b15Width = CG_15_TOP - CG_0_TOP;
    const taxed20 = gains - CG_0_TOP - b15Width;
    expect(calculateCapitalGainsTax(gains, STANDARD_DEDUCTION)).toBeCloseTo(
      b15Width * 0.15 + taxed20 * 0.20,
      2,
    );
  });
});
