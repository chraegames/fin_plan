import type { PlanInput, ActualsData, WithdrawalSchedule, TimePeriodValue } from '../models/types';
import { resolveIncomeAndExpenses } from './resolve';
import { generateId } from './defaults';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import {
  EARLY_WITHDRAWAL_PENALTY_RATE,
  earlyWithdrawalCutoff,
} from './constants';

const ROUND_GRANULARITY = 1000;
const CASH_FLOOR = 10000;
// Per-year cash slip tolerated by the binary search when judging a target
// "sustainable". Has to be ≥ the worst-case rounding noise from quantizing
// each year's three withdrawals to ROUND_GRANULARITY.
const FLOOR_SLACK = 4 * ROUND_GRANULARITY;

interface YearWithdrawal {
  year: number;
  brokerage: number;
  roth: number;
  ira: number;
}

interface State {
  cash: number;
  brkBal: number;
  brkBasis: number;
  rothBal: number;
  iraBal: number;
}

/**
 * Auto-balance produces a withdrawal schedule that drives end-of-year cash
 * toward `targetCash` (or, when the user's target is unsustainable, the
 * highest cash level the accounts can support) while picking a tax-efficient
 * mix of accounts each year.
 *
 * Algorithm:
 *   1. Forward-simulate using a *proportional* greedy: each year withdraw
 *      enough net cash to hit the running target, splitting the gross draw
 *      across brokerage/Roth/IRA in proportion to their balances. Proportional
 *      drawdown is what keeps any single account from being exhausted
 *      prematurely (a tax-priority greedy will gladly burn brokerage in
 *      pre-cutoff years, then face decades of IRA-only withdrawals at peak
 *      ordinary brackets).
 *   2. If the user's target leaves no year's cash below the floor, use it.
 *      Otherwise binary-search the largest sustainable target in [floor,
 *      userTarget] and use that.
 *
 * Note: this used to be a multi-year LP. In principle the LP could plan
 * bracket-filling across decades. In practice javascript-lp-solver returned
 * blatantly suboptimal solutions on 40-year horizons (leaving billions of
 * dollars of slack penalty unminimized rather than withdrawing). The greedy
 * is simpler and reliably honors the cash target.
 */
export function autoBalance(input: PlanInput, targetCash: number, actuals?: ActualsData): WithdrawalSchedule[] {
  const penaltyCutoff = earlyWithdrawalCutoff(input.birthYear);

  // --- Determine frozen boundary ---
  // Any year with non-zero actual withdrawal data is frozen.
  // The boundary is the last such year — all years up to and including it are frozen.
  let frozenThrough = input.startYear - 1;
  if (actuals) {
    for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
      const yearMap = actuals.withdrawals[acctType];
      if (!yearMap) continue;
      for (const [yearStr, val] of Object.entries(yearMap)) {
        if (val !== 0) frozenThrough = Math.max(frozenThrough, Number(yearStr));
      }
    }
  }
  const frozenYears = frozenThrough >= input.startYear ? frozenThrough - input.startYear + 1 : 0;

  // --- Simulate through frozen years to get post-frozen state ---
  const { state: postFrozen, yearly: frozenYearly } =
    simulateFrozen(input, actuals, frozenYears, penaltyCutoff);

  const Y = input.endYear - input.startYear + 1 - frozenYears;
  if (Y <= 0) return buildSchedules(frozenYearly);

  // --- Try the user's target. If sustainable, done. ---
  const first = simulateGreedy(input, actuals, postFrozen, frozenYears, Y, penaltyCutoff, targetCash);
  if (first.minCash >= CASH_FLOOR - FLOOR_SLACK) {
    return buildSchedules([...frozenYearly, ...first.yearly]);
  }

  // --- User's target overshoots the plan's sustainability. Binary-search
  // the highest target in [floor, userTarget] that keeps cash at the floor.
  // Clamp the bounds so a sub-floor target (e.g. $0) doesn't invert the
  // range; behavior is unchanged when targetCash >= CASH_FLOOR. ---
  let lo = Math.min(CASH_FLOOR, targetCash);
  let hi = Math.max(CASH_FLOOR, targetCash);
  // Even the floor may be unsustainable; if so, just use the user's target
  // and let cash dip — the greedy will still withdraw maximally each year.
  const atFloor = simulateGreedy(input, actuals, postFrozen, frozenYears, Y, penaltyCutoff, lo);
  if (atFloor.minCash < CASH_FLOOR - FLOOR_SLACK) {
    return buildSchedules([...frozenYearly, ...atFloor.yearly]);
  }
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const sim = simulateGreedy(input, actuals, postFrozen, frozenYears, Y, penaltyCutoff, mid);
    if (sim.minCash >= CASH_FLOOR - FLOOR_SLACK) lo = mid;
    else hi = mid;
    if (hi - lo < 100) break;
  }
  const finalSim = simulateGreedy(input, actuals, postFrozen, frozenYears, Y, penaltyCutoff, lo);
  return buildSchedules([...frozenYearly, ...finalSim.yearly]);
}

function simulateFrozen(
  input: PlanInput,
  actuals: ActualsData | undefined,
  frozenYears: number,
  penaltyCutoff: number,
): { state: State; yearly: YearWithdrawal[] } {
  const r = input.returnRate;
  const state: State = {
    cash: input.startingCash,
    brkBal: input.brokerageBalance,
    brkBasis: Math.min(input.brokerageBasis, input.brokerageBalance),
    rothBal: input.rothBalance,
    iraBal: input.iraBalance,
  };
  const yearly: YearWithdrawal[] = [];

  for (let fy = 0; fy < frozenYears; fy++) {
    const year = input.startYear + fy;
    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year, actuals);

    const bw = actuals?.withdrawals.brokerage?.[year] ?? 0;
    const rw = actuals?.withdrawals.roth?.[year] ?? 0;
    const iw = actuals?.withdrawals.ira?.[year] ?? 0;
    yearly.push({ year, brokerage: bw, roth: rw, ira: iw });

    const bwApplied = Math.min(bw, state.brkBal);
    const basisFrac = state.brkBal > 0 ? state.brkBasis / state.brkBal : 0;
    const bwBasis = bwApplied * basisFrac;
    const bwGain = bwApplied - bwBasis;

    const totalOrd = taxableIncome + iw;
    const incTax = calculateIncomeTax(totalOrd);
    const cgTax = calculateCapitalGainsTax(bwGain, totalOrd);
    const penalty = year < penaltyCutoff ? (rw + iw) * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    const totalTax = incTax + cgTax + penalty;

    state.brkBasis = Math.max(0, state.brkBasis - bwBasis);
    state.brkBal = Math.max(0, state.brkBal - bw) * (1 + r);
    state.rothBal = Math.max(0, state.rothBal - rw) * (1 + r);
    state.iraBal = Math.max(0, state.iraBal - iw) * (1 + r);
    state.cash += totalIncome - totalExpenses - totalTax + bw + rw + iw;

    // Honor actual year-end balances if the user has recorded them.
    const actualBrkEnd = actuals?.endingBalances?.brokerage?.[year];
    if (actualBrkEnd != null) {
      state.brkBal = actualBrkEnd;
      if (state.brkBasis > state.brkBal) state.brkBasis = state.brkBal;
    }
    const actualRothEnd = actuals?.endingBalances?.roth?.[year];
    if (actualRothEnd != null) state.rothBal = actualRothEnd;
    const actualIraEnd = actuals?.endingBalances?.ira?.[year];
    if (actualIraEnd != null) state.iraBal = actualIraEnd;
    const actualCashEnd = actuals?.endingCash?.[year];
    if (actualCashEnd != null) state.cash = actualCashEnd;
  }
  return { state, yearly };
}

/**
 * Forward-simulate the LP horizon with target `targetCash`. Returns the
 * yearly withdrawals (rounded to ROUND_GRANULARITY) and the minimum
 * end-of-year cash seen along the way.
 */
function simulateGreedy(
  input: PlanInput,
  actuals: ActualsData | undefined,
  initial: State,
  frozenYears: number,
  Y: number,
  penaltyCutoff: number,
  targetCash: number,
): { yearly: YearWithdrawal[]; minCash: number } {
  const r = input.returnRate;
  let { cash, brkBal, brkBasis, rothBal, iraBal } = initial;
  const yearly: YearWithdrawal[] = [];
  let minCash = cash;

  for (let y = 0; y < Y; y++) {
    const year = input.startYear + frozenYears + y;
    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year, actuals);
    const preCutoff = year < penaltyCutoff;

    // Cash if we make zero withdrawals this year (ordinary tax on income
    // alone is still owed, so it lands in the baseline).
    const baselineTax = calculateIncomeTax(taxableIncome);
    const baselineCash = cash + totalIncome - totalExpenses - baselineTax;
    const needed = Math.max(0, targetCash - baselineCash);

    let bw = 0, rw = 0, iw = 0;
    if (needed > 0) {
      const a = allocateWithdrawal(needed, brkBal, brkBasis, rothBal, iraBal, taxableIncome, preCutoff);
      bw = a.bw; rw = a.rw; iw = a.iw;
    }

    // Round to the schedule's granularity and re-clamp. If the raw value is
    // positive but rounds to 0 *and* the balance is also smaller than the
    // granularity (so rounding the balance gives 0 too), drain the account —
    // otherwise tiny end-of-life remainders never get withdrawn and cash
    // crashes while a few hundred dollars sit untouched in each account.
    const snap = (raw: number, bal: number) => {
      const rounded = Math.round(raw / ROUND_GRANULARITY) * ROUND_GRANULARITY;
      const clamped = Math.max(0, Math.min(bal, rounded));
      if (clamped === 0 && raw > 0 && bal > 0) return bal;
      return clamped;
    };
    bw = snap(bw, brkBal);
    rw = snap(rw, rothBal);
    iw = snap(iw, iraBal);

    yearly.push({ year, brokerage: bw, roth: rw, ira: iw });

    // Advance state — must mirror simulation.ts exactly.
    const basisFrac = brkBal > 0 ? brkBasis / brkBal : 0;
    const bwBasis = bw * basisFrac;
    const bwGain = bw - bwBasis;
    const totalOrd = taxableIncome + iw;
    const incTax = calculateIncomeTax(totalOrd);
    const cgTax = calculateCapitalGainsTax(bwGain, totalOrd);
    const penalty = preCutoff ? (rw + iw) * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    const totalTax = incTax + cgTax + penalty;

    brkBasis = Math.max(0, brkBasis - bwBasis);
    brkBal = Math.max(0, brkBal - bw) * (1 + r);
    rothBal = Math.max(0, rothBal - rw) * (1 + r);
    iraBal = Math.max(0, iraBal - iw) * (1 + r);
    cash += totalIncome - totalExpenses - totalTax + bw + rw + iw;

    if (cash < minCash) minCash = cash;
  }
  return { yearly, minCash };
}

/**
 * Solve for a (bw, rw, iw) mix whose **net cash** (gross withdrawals minus
 * the marginal tax/penalty they trigger) equals `needed`.
 *
 * Strategy: pull from each account in proportion to its remaining balance.
 * The proportional split preserves runway across accounts so none is
 * exhausted prematurely. Net cash from a given gross G is non-linear
 * (ordinary brackets stack, LTCG stacks on ord, penalty is flat), so we
 * binary-search G to find the smallest gross whose net ≥ needed.
 */
function allocateWithdrawal(
  needed: number,
  brkBal: number,
  brkBasis: number,
  rothBal: number,
  iraBal: number,
  taxableIncome: number,
  preCutoff: boolean,
): { bw: number; rw: number; iw: number } {
  const total = brkBal + rothBal + iraBal;
  if (total <= 0) return { bw: 0, rw: 0, iw: 0 };

  const gainFrac = brkBal > 0
    ? Math.max(0, Math.min(1, 1 - brkBasis / brkBal))
    : 0;
  const baselineTax = calculateIncomeTax(taxableIncome);

  const netFromGross = (G: number) => {
    const bw = (G * brkBal) / total;
    const rw = (G * rothBal) / total;
    const iw = (G * iraBal) / total;
    const totalOrd = taxableIncome + iw;
    const incTax = calculateIncomeTax(totalOrd) - baselineTax;
    const cgTax = calculateCapitalGainsTax(bw * gainFrac, totalOrd);
    const penalty = preCutoff ? (rw + iw) * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    return G - incTax - cgTax - penalty;
  };

  if (netFromGross(total) <= needed) {
    return { bw: brkBal, rw: rothBal, iw: iraBal };
  }

  let lo = 0;
  let hi = total;
  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    if (netFromGross(mid) < needed) lo = mid;
    else hi = mid;
    if (hi - lo < 0.5) break;
  }
  const G = hi;
  return {
    bw: (G * brkBal) / total,
    rw: (G * rothBal) / total,
    iw: (G * iraBal) / total,
  };
}

function buildSchedules(yearly: YearWithdrawal[]): WithdrawalSchedule[] {
  const brokerageSchedule = consolidate(yearly.map(y => ({ year: y.year, amount: y.brokerage })));
  const rothSchedule = consolidate(yearly.map(y => ({ year: y.year, amount: y.roth })));
  const iraSchedule = consolidate(yearly.map(y => ({ year: y.year, amount: y.ira })));

  const out: WithdrawalSchedule[] = [];
  if (brokerageSchedule.length > 0) {
    out.push({ id: generateId(), accountType: 'brokerage', periods: brokerageSchedule });
  }
  if (rothSchedule.length > 0) {
    out.push({ id: generateId(), accountType: 'roth', periods: rothSchedule });
  }
  if (iraSchedule.length > 0) {
    out.push({ id: generateId(), accountType: 'ira', periods: iraSchedule });
  }
  return out;
}

function consolidate(entries: { year: number; amount: number }[]): TimePeriodValue[] {
  const periods: TimePeriodValue[] = [];
  for (const { year, amount } of entries) {
    if (amount === 0) continue;
    const last = periods[periods.length - 1];
    if (last && last.amount === amount && last.endYear === year - 1) {
      last.endYear = year;
    } else {
      periods.push({ startYear: year, endYear: year, amount });
    }
  }
  return periods;
}
