import type { PlanInput, WithdrawalSchedule, TimePeriodValue } from '../models/types';
import { resolveIncomeAndExpenses } from './resolve';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import { generateId } from './defaults';
import { START_YEAR, END_YEAR, EARLY_WITHDRAWAL_PENALTY_CUTOFF, EARLY_WITHDRAWAL_PENALTY_RATE } from './constants';

const ROUND_GRANULARITY = 10000;

interface YearWithdrawal {
  year: number;
  brokerage: number;
  roth: number;
  ira: number;
}

function computeTaxOnBrokerage(amount: number, taxableIncome: number): number {
  return calculateCapitalGainsTax(amount, taxableIncome);
}

function computeTaxOnRoth(amount: number, year: number): number {
  // Roth withdrawals are tax-free, but early withdrawal penalty applies
  return year < EARLY_WITHDRAWAL_PENALTY_CUTOFF ? amount * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
}

function computeTaxOnIra(amount: number, taxableIncome: number, year: number): number {
  const marginalIncomeTax = calculateIncomeTax(taxableIncome + amount) - calculateIncomeTax(taxableIncome);
  const penalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF ? amount * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
  return marginalIncomeTax + penalty;
}

function solveGross(
  netNeeded: number,
  taxFn: (gross: number) => number,
  maxAmount: number,
): number {
  if (netNeeded <= 0) return 0;

  let guess = netNeeded;
  for (let i = 0; i < 10; i++) {
    guess = Math.min(guess, maxAmount);
    const tax = taxFn(guess);
    const net = guess - tax;
    const error = netNeeded - net;
    if (Math.abs(error) < 1) break;
    guess += error;
  }
  return Math.min(Math.max(0, Math.round(guess)), maxAmount);
}

/**
 * Compute the maximum sustainable annual withdrawal from an account.
 * Uses the annuity formula with an 80% safety factor.
 */
function sustainableWithdrawal(balance: number, returnRate: number, remainingYears: number): number {
  if (balance <= 0 || remainingYears <= 0) return 0;
  if (returnRate <= 0) return balance / remainingYears * 0.8;

  const r = returnRate;
  const n = remainingYears;
  const maxAnnuity = balance * r / (1 - Math.pow(1 + r, -n));
  return maxAnnuity * 0.8;
}

export function autoBalance(input: PlanInput, targetCash: number): WithdrawalSchedule[] {
  const yearlyWithdrawals: YearWithdrawal[] = [];

  let currentCash = input.startingCash;
  let brokerageBalance = input.brokerageBalance;
  let rothBalance = input.rothBalance;
  let iraBalance = input.iraBalance;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const remainingYears = END_YEAR - year + 1;

    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year);

    // Baseline tax (no withdrawals)
    const baseIncomeTax = calculateIncomeTax(taxableIncome);
    const baseCashFlow = totalIncome - totalExpenses - baseIncomeTax;

    // Projected cash without withdrawals
    const projectedCash = currentCash + baseCashFlow;
    const deficit = targetCash - projectedCash;

    let brokerageWd = 0;
    let rothWd = 0;
    let iraWd = 0;

    if (deficit > 0) {
      // Sustainable limits
      const brokerageSustainable = sustainableWithdrawal(brokerageBalance, input.returnRate, remainingYears);
      const rothSustainable = sustainableWithdrawal(rothBalance, input.returnRate, remainingYears);
      const iraSustainable = sustainableWithdrawal(iraBalance, input.returnRate, remainingYears);

      const brokerageMaxGross = Math.min(brokerageSustainable, brokerageBalance * 0.95);
      const rothMaxGross = Math.min(rothSustainable, rothBalance * 0.95);
      const iraMaxGross = Math.min(iraSustainable, iraBalance * 0.95);

      // Proportional split by account balance
      const totalBalance = brokerageBalance + rothBalance + iraBalance;
      const brokerageShare = totalBalance > 0 ? brokerageBalance / totalBalance : 1 / 3;
      const rothShare = totalBalance > 0 ? rothBalance / totalBalance : 1 / 3;
      const iraShare = totalBalance > 0 ? iraBalance / totalBalance : 1 / 3;

      const brokerageDeficit = deficit * brokerageShare;
      const rothDeficit = deficit * rothShare;
      const iraDeficit = deficit * iraShare;

      // Phase 1: Allocate proportionally
      // Roth first (tax-free, best deal)
      rothWd = solveGross(
        rothDeficit,
        gross => computeTaxOnRoth(gross, year),
        rothMaxGross,
      );
      const rothTax = computeTaxOnRoth(rothWd, year);
      const netFromRoth = rothWd - rothTax;

      // Brokerage (capital gains tax)
      brokerageWd = solveGross(
        brokerageDeficit,
        gross => computeTaxOnBrokerage(gross, taxableIncome),
        brokerageMaxGross,
      );
      const brokerageTax = computeTaxOnBrokerage(brokerageWd, taxableIncome);
      const netFromBrokerage = brokerageWd - brokerageTax;

      // IRA gets its share plus any shortfalls from roth/brokerage
      const rothShortfall = rothDeficit - netFromRoth;
      const brokerageShortfall = brokerageDeficit - netFromBrokerage;
      const iraNeeded = iraDeficit + rothShortfall + brokerageShortfall;

      iraWd = solveGross(
        iraNeeded,
        gross => computeTaxOnIra(gross, taxableIncome, year)
          + (calculateCapitalGainsTax(brokerageWd, taxableIncome + gross) - calculateCapitalGainsTax(brokerageWd, taxableIncome)),
        iraMaxGross,
      );

      // Phase 2: If IRA also couldn't cover, give remainder to roth (tax-free)
      const iraTax = computeTaxOnIra(iraWd, taxableIncome, year);
      const netFromIra = iraWd - iraTax;
      let remainingDeficit = deficit - netFromRoth - netFromBrokerage - netFromIra;

      if (remainingDeficit > 0) {
        const extraRoth = solveGross(
          remainingDeficit,
          gross => computeTaxOnRoth(rothWd + gross, year) - computeTaxOnRoth(rothWd, year),
          rothMaxGross - rothWd,
        );
        rothWd += extraRoth;
      }

      // Phase 3: Then try extra brokerage
      const netAfterPhase2 = (rothWd - computeTaxOnRoth(rothWd, year))
        + (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome))
        + (iraWd - computeTaxOnIra(iraWd, taxableIncome, year));
      remainingDeficit = deficit - netAfterPhase2;

      if (remainingDeficit > 0) {
        const extraBrokerage = solveGross(
          remainingDeficit,
          gross => computeTaxOnBrokerage(brokerageWd + gross, taxableIncome) - computeTaxOnBrokerage(brokerageWd, taxableIncome),
          brokerageMaxGross - brokerageWd,
        );
        brokerageWd += extraBrokerage;
      }

      // Phase 4: Relax to hard balance limits if still short
      const netAfterPhase3 = (rothWd - computeTaxOnRoth(rothWd, year))
        + (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome + iraWd))
        + (iraWd - computeTaxOnIra(iraWd, taxableIncome, year));
      remainingDeficit = deficit - netAfterPhase3;

      if (remainingDeficit > 0) {
        const rothHardMax = rothBalance * 0.95;
        const brokerageHardMax = brokerageBalance * 0.95;
        const iraHardMax = iraBalance * 0.95;

        // Extra roth first (tax-free)
        if (rothWd < rothHardMax) {
          const extraRoth = solveGross(
            remainingDeficit,
            gross => computeTaxOnRoth(rothWd + gross, year) - computeTaxOnRoth(rothWd, year),
            rothHardMax - rothWd,
          );
          rothWd += extraRoth;

          const netNow = (rothWd - computeTaxOnRoth(rothWd, year))
            + (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome + iraWd))
            + (iraWd - computeTaxOnIra(iraWd, taxableIncome, year));
          remainingDeficit = deficit - netNow;
        }

        if (remainingDeficit > 0 && brokerageWd < brokerageHardMax) {
          const extraBrokerage = solveGross(
            remainingDeficit,
            gross => computeTaxOnBrokerage(brokerageWd + gross, taxableIncome + iraWd) - computeTaxOnBrokerage(brokerageWd, taxableIncome + iraWd),
            brokerageHardMax - brokerageWd,
          );
          brokerageWd += extraBrokerage;

          const netNow = (rothWd - computeTaxOnRoth(rothWd, year))
            + (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome + iraWd))
            + (iraWd - computeTaxOnIra(iraWd, taxableIncome, year));
          remainingDeficit = deficit - netNow;
        }

        if (remainingDeficit > 0 && iraWd < iraHardMax) {
          const extraIra = solveGross(
            remainingDeficit,
            gross => computeTaxOnIra(iraWd + gross, taxableIncome, year) - computeTaxOnIra(iraWd, taxableIncome, year)
              + (calculateCapitalGainsTax(brokerageWd, taxableIncome + iraWd + gross) - calculateCapitalGainsTax(brokerageWd, taxableIncome + iraWd)),
            iraHardMax - iraWd,
          );
          iraWd += extraIra;
        }
      }
    }

    // Round withdrawals
    brokerageWd = Math.round(brokerageWd / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    rothWd = Math.round(rothWd / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    iraWd = Math.round(iraWd / ROUND_GRANULARITY) * ROUND_GRANULARITY;

    yearlyWithdrawals.push({ year, brokerage: brokerageWd, roth: rothWd, ira: iraWd });

    // Apply the year with rounded withdrawals
    brokerageBalance = Math.max(0, brokerageBalance - brokerageWd);
    brokerageBalance *= (1 + input.returnRate);

    rothBalance = Math.max(0, rothBalance - rothWd);
    rothBalance *= (1 + input.returnRate);

    iraBalance = Math.max(0, iraBalance - iraWd);
    iraBalance *= (1 + input.returnRate);

    // Full tax with withdrawals
    const totalTaxableOrdinary = taxableIncome + iraWd;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(brokerageWd, totalTaxableOrdinary);
    const penalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF ? (rothWd + iraWd) * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    const totalTax = incomeTax + capitalGainsTax + penalty;

    currentCash += totalIncome - totalExpenses - totalTax + brokerageWd + rothWd + iraWd;
  }

  // Consolidate into WithdrawalSchedule objects
  const brokerageSchedule = consolidate(
    yearlyWithdrawals.map(y => ({ year: y.year, amount: y.brokerage })),
  );
  const rothSchedule = consolidate(
    yearlyWithdrawals.map(y => ({ year: y.year, amount: y.roth })),
  );
  const iraSchedule = consolidate(
    yearlyWithdrawals.map(y => ({ year: y.year, amount: y.ira })),
  );

  const result: WithdrawalSchedule[] = [];
  if (brokerageSchedule.length > 0) {
    result.push({ id: generateId(), accountType: 'brokerage', periods: brokerageSchedule });
  }
  if (rothSchedule.length > 0) {
    result.push({ id: generateId(), accountType: 'roth', periods: rothSchedule });
  }
  if (iraSchedule.length > 0) {
    result.push({ id: generateId(), accountType: 'ira', periods: iraSchedule });
  }
  return result;
}

function consolidate(entries: { year: number; amount: number }[]): TimePeriodValue[] {
  const periods: TimePeriodValue[] = [];
  for (const entry of entries) {
    const amount = Math.round(entry.amount / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    if (amount === 0) continue;
    const last = periods[periods.length - 1];
    if (last && last.amount === amount && last.endYear === entry.year - 1) {
      last.endYear = entry.year;
    } else {
      periods.push({ startYear: entry.year, endYear: entry.year, amount });
    }
  }
  return periods;
}
