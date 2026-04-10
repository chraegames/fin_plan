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

interface Allocation {
  brokerage: number;
  roth: number;
  ira: number;
}

type AccountKey = 'brokerage' | 'roth' | 'ira';

/**
 * Total *additional* tax incurred by the given withdrawals, on top of the
 * baseline income tax already owed on `taxableIncome` alone.
 *
 * - Roth: only the early withdrawal penalty (no income tax)
 * - IRA: marginal ordinary income tax + early withdrawal penalty
 * - Brokerage: capital gains tax (gains stack on top of total ordinary income)
 */
function computeTotalTax(wd: Allocation, taxableIncome: number, year: number): number {
  const totalOrdinary = taxableIncome + wd.ira;
  const incomeTaxDelta = calculateIncomeTax(totalOrdinary) - calculateIncomeTax(taxableIncome);
  const capGainsTax = calculateCapitalGainsTax(wd.brokerage, totalOrdinary);
  const penalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF
    ? (wd.roth + wd.ira) * EARLY_WITHDRAWAL_PENALTY_RATE
    : 0;
  return incomeTaxDelta + capGainsTax + penalty;
}

function computeNet(wd: Allocation, taxableIncome: number, year: number): number {
  return wd.brokerage + wd.roth + wd.ira - computeTotalTax(wd, taxableIncome, year);
}

/**
 * Greedily allocate withdrawals to minimize total tax for a given net amount.
 *
 * At each step, evaluates the effective tax rate of adding a chunk to each
 * account given the current state, then picks the cheapest. Ties are broken
 * by remaining capacity (largest first), which keeps account drawdowns
 * balanced and preserves smaller accounts.
 *
 * Because tax functions are piecewise linear, this greedy strategy fills the
 * cheapest brackets first across all accounts simultaneously (e.g. 0% LTCG,
 * standard deduction, then 10% income, etc.) and is near-optimal in practice.
 */
function solveOptimalAllocation(
  netNeeded: number,
  taxableIncome: number,
  year: number,
  caps: Allocation,
): Allocation {
  const wd: Allocation = { brokerage: 0, roth: 0, ira: 0 };
  if (netNeeded <= 0) return wd;

  // Adaptive chunk size: ~200 chunks per allocation, with a floor and ceiling.
  const chunkSize = Math.max(100, Math.min(10000, Math.ceil(netNeeded / 200 / 100) * 100));

  const accounts: AccountKey[] = ['brokerage', 'roth', 'ira'];
  let safety = 0;

  while (computeNet(wd, taxableIncome, year) < netNeeded - 1) {
    if (++safety > 20000) break;

    const baseTax = computeTotalTax(wd, taxableIncome, year);
    const remainingNet = netNeeded - computeNet(wd, taxableIncome, year);

    let best: { acc: AccountKey; add: number; rate: number; remaining: number } | null = null;

    for (const acc of accounts) {
      const remaining = caps[acc] - wd[acc];
      if (remaining <= 0) continue;
      const add = Math.min(chunkSize, remaining);

      const trial: Allocation = { ...wd };
      trial[acc] += add;
      const newTax = computeTotalTax(trial, taxableIncome, year);
      const taxDelta = newTax - baseTax;
      // effective tax rate of this chunk; lower is better
      const rate = taxDelta / add;

      if (best === null
        || rate < best.rate - 1e-6
        || (Math.abs(rate - best.rate) < 1e-6 && remaining > best.remaining)) {
        best = { acc, add, rate, remaining };
      }
    }

    if (best === null) break;

    // Don't overshoot — if a smaller add covers the remaining need, use that.
    const netPerGross = 1 - best.rate;
    let finalAdd = best.add;
    if (netPerGross > 0.01) {
      const grossNeeded = Math.ceil(remainingNet / netPerGross);
      finalAdd = Math.max(1, Math.min(best.add, grossNeeded));
    }

    wd[best.acc] += finalAdd;
  }

  return wd;
}

/**
 * Maximum constant annual withdrawal that exactly depletes `balance` over
 * `remainingYears`, given annual `returnRate`.
 *
 * Uses the **annuity-due** formula (payments at the start of each period)
 * because the simulation withdraws before applying growth. With this cap,
 * pulling exactly `annuityCap()` every year leaves the balance at zero in
 * year `remainingYears`. No safety factor — it's mathematically exact.
 *
 * Recomputed each year on the *current* balance: years where we withdraw
 * less than the cap (or skip entirely) leave a higher balance, which raises
 * the cap for all future years. This is the forward-looking projection that
 * makes the per-year greedy globally aware — surplus years naturally fund
 * later deficits via compounded growth on the unused portion.
 */
function annuityCap(balance: number, returnRate: number, remainingYears: number): number {
  if (balance <= 0 || remainingYears <= 0) return 0;
  if (returnRate <= 0) return balance / remainingYears;
  const r = returnRate;
  const n = remainingYears;
  // annuity-due = ordinary-annuity / (1 + r)
  return balance * r / ((1 + r) * (1 - Math.pow(1 + r, -n)));
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

    // Baseline cash flow without any withdrawals
    const baseIncomeTax = calculateIncomeTax(taxableIncome);
    const baseCashFlow = totalIncome - totalExpenses - baseIncomeTax;
    const projectedCash = currentCash + baseCashFlow;
    const deficit = targetCash - projectedCash;

    let wd: Allocation = { brokerage: 0, roth: 0, ira: 0 };

    if (deficit > 0) {
      // Cap each account at the annuity-due that depletes it exactly by
      // END_YEAR. We never breach this cap — if the user's target is
      // mathematically infeasible (sum of caps < deficit), this year will
      // under-deliver rather than draining an account prematurely.
      const caps: Allocation = {
        brokerage: annuityCap(brokerageBalance, input.returnRate, remainingYears),
        roth: annuityCap(rothBalance, input.returnRate, remainingYears),
        ira: annuityCap(iraBalance, input.returnRate, remainingYears),
      };
      wd = solveOptimalAllocation(deficit, taxableIncome, year, caps);
    }

    // Round to granularity used by consolidation, so internal sim matches
    wd.brokerage = Math.round(wd.brokerage / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    wd.roth = Math.round(wd.roth / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    wd.ira = Math.round(wd.ira / ROUND_GRANULARITY) * ROUND_GRANULARITY;

    // Defensive clamp: rounding shouldn't push us above the current balance
    wd.brokerage = Math.max(0, Math.min(wd.brokerage, brokerageBalance));
    wd.roth = Math.max(0, Math.min(wd.roth, rothBalance));
    wd.ira = Math.max(0, Math.min(wd.ira, iraBalance));

    yearlyWithdrawals.push({ year, brokerage: wd.brokerage, roth: wd.roth, ira: wd.ira });

    // Apply withdrawals + growth
    brokerageBalance = Math.max(0, brokerageBalance - wd.brokerage);
    brokerageBalance *= (1 + input.returnRate);
    rothBalance = Math.max(0, rothBalance - wd.roth);
    rothBalance *= (1 + input.returnRate);
    iraBalance = Math.max(0, iraBalance - wd.ira);
    iraBalance *= (1 + input.returnRate);

    // Cash bookkeeping (full tax = baseline + additional from withdrawals)
    const totalTax = baseIncomeTax + computeTotalTax(wd, taxableIncome, year);
    currentCash += totalIncome - totalExpenses - totalTax + wd.brokerage + wd.roth + wd.ira;
  }

  // Consolidate into WithdrawalSchedule objects
  const brokerageSchedule = consolidate(yearlyWithdrawals.map(y => ({ year: y.year, amount: y.brokerage })));
  const rothSchedule = consolidate(yearlyWithdrawals.map(y => ({ year: y.year, amount: y.roth })));
  const iraSchedule = consolidate(yearlyWithdrawals.map(y => ({ year: y.year, amount: y.ira })));

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
