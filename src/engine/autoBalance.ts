import type { PlanInput, WithdrawalSchedule, TimePeriodValue } from '../models/types';
import { resolveIncomeAndExpenses } from './resolve';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import { generateId } from './defaults';
import { START_YEAR, END_YEAR, EARLY_WITHDRAWAL_PENALTY_CUTOFF, EARLY_WITHDRAWAL_PENALTY_RATE } from './constants';

const ROUND_GRANULARITY = 10000;

interface YearWithdrawal {
  year: number;
  brokerage: number;
  retirement: number;
}

function computeTaxOnBrokerage(amount: number, taxableIncome: number): number {
  return calculateCapitalGainsTax(amount, taxableIncome);
}

function computeTaxOnRetirement(amount: number, taxableIncome: number, year: number): number {
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
 * This is the amount you can withdraw each year such that the account
 * never depletes over the remaining years, given its return rate.
 *
 * Uses the annuity formula: payment = balance * r / (1 - (1+r)^-n)
 * where r = return rate, n = remaining years.
 * We apply a safety factor to keep a buffer.
 */
function sustainableWithdrawal(balance: number, returnRate: number, remainingYears: number): number {
  if (balance <= 0 || remainingYears <= 0) return 0;
  if (returnRate <= 0) return balance / remainingYears * 0.8;

  const r = returnRate;
  const n = remainingYears;
  // Annuity payment that would exactly deplete the account over n years
  const maxAnnuity = balance * r / (1 - Math.pow(1 + r, -n));
  // Use 80% of that to maintain a healthy balance throughout
  return maxAnnuity * 0.8;
}

export function autoBalance(input: PlanInput, targetCash: number): WithdrawalSchedule[] {
  const yearlyWithdrawals: YearWithdrawal[] = [];

  let currentCash = input.startingCash;
  let brokerageBalance = input.brokerageBalance;
  let retirementBalance = input.retirementBalance;

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
    let retirementWd = 0;

    if (deficit > 0) {
      // Compute sustainable limits for each account
      const brokerageSustainable = sustainableWithdrawal(
        brokerageBalance, input.returnRate, remainingYears,
      );
      const retirementSustainable = sustainableWithdrawal(
        retirementBalance, input.returnRate, remainingYears,
      );

      // Split deficit proportionally based on account balances so both
      // accounts drain at a similar rate relative to their size.
      const brokerageMaxGross = Math.min(brokerageSustainable, brokerageBalance * 0.95);
      const retirementMaxGross = Math.min(retirementSustainable, retirementBalance * 0.95);

      const totalBalance = brokerageBalance + retirementBalance;
      const brokerageShare = totalBalance > 0 ? brokerageBalance / totalBalance : 0.5;
      const retirementShare = 1 - brokerageShare;

      // Allocate deficit proportionally by account balance
      const brokerageDeficit = deficit * brokerageShare;
      const retirementDeficit = deficit * retirementShare;

      brokerageWd = solveGross(
        brokerageDeficit,
        gross => computeTaxOnBrokerage(gross, taxableIncome),
        brokerageMaxGross,
      );

      const brokerageTax = computeTaxOnBrokerage(brokerageWd, taxableIncome);
      const netFromBrokerage = brokerageWd - brokerageTax;

      // Retirement gets its share plus any shortfall brokerage couldn't cover
      const brokerageShortfall = brokerageDeficit - netFromBrokerage;
      const retirementNeeded = retirementDeficit + brokerageShortfall;

      retirementWd = solveGross(
        retirementNeeded,
        gross => computeTaxOnRetirement(gross, taxableIncome, year)
          + (calculateCapitalGainsTax(brokerageWd, taxableIncome + gross) - calculateCapitalGainsTax(brokerageWd, taxableIncome)),
        retirementMaxGross,
      );

      // If retirement also couldn't fully cover, try giving remainder back to brokerage
      const retirementTax = computeTaxOnRetirement(retirementWd, taxableIncome, year);
      const netFromRetirement = retirementWd - retirementTax;
      let remainingDeficit = deficit - netFromBrokerage - netFromRetirement;

      if (remainingDeficit > 0) {
        const extraBrokerage = solveGross(
          remainingDeficit,
          gross => computeTaxOnBrokerage(brokerageWd + gross, taxableIncome) - computeTaxOnBrokerage(brokerageWd, taxableIncome),
          brokerageMaxGross - brokerageWd,
        );
        brokerageWd += extraBrokerage;
      }

      // If sustainable limits were too conservative, relax to hard balance limits
      // and try again to prevent cash from dropping below target.
      const netAfterFirst = (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome))
        + (retirementWd - computeTaxOnRetirement(retirementWd, taxableIncome, year));
      remainingDeficit = deficit - netAfterFirst;

      if (remainingDeficit > 0) {
        const brokerageHardMax = brokerageBalance * 0.95;
        const retirementHardMax = retirementBalance * 0.95;

        if (brokerageWd < brokerageHardMax) {
          const extraBrokerage = solveGross(
            remainingDeficit,
            gross => computeTaxOnBrokerage(brokerageWd + gross, taxableIncome + retirementWd) - computeTaxOnBrokerage(brokerageWd, taxableIncome + retirementWd),
            brokerageHardMax - brokerageWd,
          );
          brokerageWd += extraBrokerage;

          const netNow = (brokerageWd - computeTaxOnBrokerage(brokerageWd, taxableIncome))
            + (retirementWd - computeTaxOnRetirement(retirementWd, taxableIncome, year));
          remainingDeficit = deficit - netNow;
        }

        if (remainingDeficit > 0 && retirementWd < retirementHardMax) {
          const extraRetirement = solveGross(
            remainingDeficit,
            gross => computeTaxOnRetirement(retirementWd + gross, taxableIncome, year) - computeTaxOnRetirement(retirementWd, taxableIncome, year)
              + (calculateCapitalGainsTax(brokerageWd, taxableIncome + retirementWd + gross) - calculateCapitalGainsTax(brokerageWd, taxableIncome + retirementWd)),
            retirementHardMax - retirementWd,
          );
          retirementWd += extraRetirement;
        }
      }
    }

    // Round withdrawals to the same granularity consolidate will use,
    // so our internal simulation matches the actual simulation output.
    brokerageWd = Math.round(brokerageWd / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    retirementWd = Math.round(retirementWd / ROUND_GRANULARITY) * ROUND_GRANULARITY;

    yearlyWithdrawals.push({ year, brokerage: brokerageWd, retirement: retirementWd });

    // Apply the year with rounded withdrawals
    brokerageBalance = Math.max(0, brokerageBalance - brokerageWd);
    brokerageBalance *= (1 + input.returnRate);

    retirementBalance = Math.max(0, retirementBalance - retirementWd);
    retirementBalance *= (1 + input.returnRate);

    // Full tax with withdrawals
    const totalTaxableOrdinary = taxableIncome + retirementWd;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(brokerageWd, totalTaxableOrdinary);
    const penalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF ? retirementWd * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    const totalTax = incomeTax + capitalGainsTax + penalty;

    currentCash += totalIncome - totalExpenses - totalTax + brokerageWd + retirementWd;
  }

  // Consolidate into WithdrawalSchedule objects
  const brokerageSchedule = consolidate(
    yearlyWithdrawals.map(y => ({ year: y.year, amount: y.brokerage })),
  );
  const retirementSchedule = consolidate(
    yearlyWithdrawals.map(y => ({ year: y.year, amount: y.retirement })),
  );

  const result: WithdrawalSchedule[] = [];
  if (brokerageSchedule.length > 0) {
    result.push({ id: generateId(), accountType: 'brokerage', periods: brokerageSchedule });
  }
  if (retirementSchedule.length > 0) {
    result.push({ id: generateId(), accountType: 'retirement', periods: retirementSchedule });
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
