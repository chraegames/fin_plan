export const STANDARD_DEDUCTION = 29200;

export const INCOME_BRACKETS: readonly [number, number][] = [
  [23200, 0.10],
  [94300 - 23200, 0.12],
  [201050 - 94300, 0.22],
  [383900 - 201050, 0.24],
  [487450 - 383900, 0.32],
  [731200 - 487450, 0.35],
  [Infinity, 0.37],
];

export const CAPITAL_GAINS_BRACKETS: readonly [number, number][] = [
  [94050, 0.00],
  [583750 - 94050, 0.15],
  [Infinity, 0.20],
];

export function calculateIncomeTax(grossTaxableIncome: number): number {
  const taxableIncome = Math.max(0, grossTaxableIncome - STANDARD_DEDUCTION);
  let tax = 0;
  let remaining = taxableIncome;

  for (const [width, rate] of INCOME_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, width);
    tax += taxable * rate;
    remaining -= taxable;
  }

  return tax;
}

export function calculateCapitalGainsTax(gains: number, ordinaryIncome: number): number {
  if (gains <= 0) return 0;

  // Capital gains stack on top of ordinary income for bracket purposes
  const baseIncome = Math.max(0, ordinaryIncome - STANDARD_DEDUCTION);
  let tax = 0;
  let consumed = 0;
  let gainsRemaining = gains;

  for (const [width, rate] of CAPITAL_GAINS_BRACKETS) {
    if (gainsRemaining <= 0) break;

    const bracketEnd = consumed + width;
    // How much of this bracket is already consumed by ordinary income
    const ordinaryInBracket = Math.max(0, Math.min(baseIncome - consumed, width));
    const spaceForGains = width - ordinaryInBracket;
    const gainsInBracket = Math.min(gainsRemaining, spaceForGains);

    tax += gainsInBracket * rate;
    gainsRemaining -= gainsInBracket;
    consumed = bracketEnd;
  }

  return tax;
}
