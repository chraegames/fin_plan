// Federal tax constants — 2026 Married Filing Jointly schedule, per IRS
// Rev. Proc. 2025-32 (One Big Beautiful Bill amendments applied). These
// are illustrative-only: the model ignores filing status, state/local
// tax, NIIT, AMT, Medicare IRMAA, and a long list of other real-world
// adjustments. See AboutModal for the full disclaimer.
//
// TODO(filing-status): support Single / HoH / MFS schedules instead of
// hard-coding MFJ. Today's defaults make tax estimates roughly correct
// only for joint filers.
export const STANDARD_DEDUCTION = 32200;

// Tuples are [bracket width, marginal rate]. Top thresholds (MFJ 2026):
// 10%→24,800, 12%→100,800, 22%→211,400, 24%→403,550, 32%→512,450,
// 35%→768,700, 37% above.
export const INCOME_BRACKETS: readonly [number, number][] = [
  [24800, 0.10],
  [100800 - 24800, 0.12],
  [211400 - 100800, 0.22],
  [403550 - 211400, 0.24],
  [512450 - 403550, 0.32],
  [768700 - 512450, 0.35],
  [Infinity, 0.37],
];

// LTCG brackets (MFJ 2026): 0%→98,900, 15%→613,700, 20% above.
export const CAPITAL_GAINS_BRACKETS: readonly [number, number][] = [
  [98900, 0.00],
  [613700 - 98900, 0.15],
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
