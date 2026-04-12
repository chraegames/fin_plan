import solver from 'javascript-lp-solver';
import type { PlanInput, ActualsData, WithdrawalSchedule, TimePeriodValue } from '../models/types';
import { resolveIncomeAndExpenses } from './resolve';
import { generateId } from './defaults';
import { STANDARD_DEDUCTION, INCOME_BRACKETS, CAPITAL_GAINS_BRACKETS, calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import {
  START_YEAR,
  END_YEAR,
  EARLY_WITHDRAWAL_PENALTY_CUTOFF,
  EARLY_WITHDRAWAL_PENALTY_RATE,
} from './constants';

const ROUND_GRANULARITY = 1000;
const CASH_FLOOR = 10000;

// LP coefficients must be finite. tax.ts encodes the top bracket as Infinity;
// clamp to $10M here — well above any realistic withdrawal, but tight enough
// that the simplex stays well-conditioned. (1e9+ produces spurious infeasibility
// in javascript-lp-solver for otherwise-well-conditioned problems.)
const LP_BRACKET_CAP = 10_000_000;

const ORD_BRACKETS: { width: number; rate: number }[] = INCOME_BRACKETS.map(([width, rate]) => ({
  width: isFinite(width) ? width : LP_BRACKET_CAP,
  rate,
}));

// Convert tax.ts's width-form LTCG brackets into cumulative form for stacking logic.
// The infinite top band is clamped so its cumulative cap = LP_BRACKET_CAP.
const CG_BANDS: { cumulative: number; rate: number }[] = (() => {
  const out: { cumulative: number; rate: number }[] = [];
  let cum = 0;
  for (const [width, rate] of CAPITAL_GAINS_BRACKETS) {
    cum = isFinite(width) ? cum + width : LP_BRACKET_CAP;
    out.push({ cumulative: cum, rate });
  }
  return out;
})();

// Soft-constraint weights in the NW objective.
//   FLOOR_PENALTY: how much ending NW the LP will sacrifice per $1 of cash
//     dropping below CASH_FLOOR. Set very high so the floor is effectively
//     hard except when truly infeasible.
//   TARGET_PENALTY: how much NW per $1 of cash falling below targetCash.
//     A value around 3-5 means the LP fills the target whenever the future
//     growth penalty of the necessary withdrawal is less than this — i.e.,
//     in later years it tracks target, in early years it lets cash drift
//     up toward target via accumulated income surplus.
const FLOOR_PENALTY = 1000;
const TARGET_PENALTY = 3;

// "Embedded tax" multipliers on ending account balances. A dollar left in
// an account at horizon end isn't worth a full dollar of net worth — it
// still has tax debt that must be paid when eventually withdrawn:
//   - IRA: ordinary income tax on full balance (~12-22%, use 18%)
//   - Brokerage: LTCG on accumulated gain (~10-15% effective, use 12%)
//   - Roth: no tax, fully usable
//   - Cash: also fully usable
// Without these multipliers the LP happily compounds the IRA into a huge
// untouched surplus — pre-tax it "looks like" net worth, but in reality
// it's a tax bomb. With them, the LP balances drain across all 3 accounts
// according to true after-tax value, which is what the user actually owns.
const IRA_END_MULT = 0.82;
const BRK_END_MULT = 0.88;
const ROTH_END_MULT = 1.0;

interface YearWithdrawal {
  year: number;
  brokerage: number;
  roth: number;
  ira: number;
}

type YD = { income: number; expenses: number; taxable: number; penalty: boolean };

interface LpSolveResult {
  feasible: boolean;
  raw: Record<string, number>;
}

/**
 * Auto-balance solves for the withdrawal schedule that **maximizes ending
 * net worth** (cash + brokerage + Roth + IRA at year END_YEAR), subject to:
 *
 *   - hard floor: cash never drops below $10k (enforced via large slack penalty)
 *   - soft target: cash should hit `targetCash` (medium slack penalty)
 *   - balance non-negativity: each account's balance ≥ 0 at all times
 *   - tax computed exactly as src/engine/simulation.ts does it
 *
 * The problem is a linear program: ~600 variables, ~700 constraints,
 * solved by the javascript-lp-solver simplex in tens of milliseconds.
 *
 * Why LP and not greedy? A per-year greedy is myopic. It can't see that
 * filling the standard deduction with IRA dollars *today* is cheaper than
 * letting the IRA compound for 30 years and paying high marginal tax on
 * the forced withdrawal later. The LP optimizes over the full horizon, so
 * it correctly trades intra-year tax cost against multi-decade growth.
 */
export function autoBalance(input: PlanInput, targetCash: number, actuals?: ActualsData): WithdrawalSchedule[] {
  const r = input.returnRate;

  // --- Determine frozen boundary ---
  // Any year with non-zero actual withdrawal data is frozen.
  // The boundary is the last such year — all years up to and including it are frozen.
  let frozenThrough = START_YEAR - 1;
  if (actuals) {
    for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
      const yearMap = actuals.withdrawals[acctType];
      if (!yearMap) continue;
      for (const [yearStr, val] of Object.entries(yearMap)) {
        if (val !== 0) frozenThrough = Math.max(frozenThrough, Number(yearStr));
      }
    }
  }
  const frozenYears = frozenThrough >= START_YEAR ? frozenThrough - START_YEAR + 1 : 0;

  // --- Simulate through frozen years to get post-frozen balances ---
  let lpStartCash = input.startingCash;
  let lpBrkBal = input.brokerageBalance;
  let lpRothBal = input.rothBalance;
  let lpIraBal = input.iraBalance;

  const frozenYearly: YearWithdrawal[] = [];
  for (let fy = 0; fy < frozenYears; fy++) {
    const year = START_YEAR + fy;
    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year, actuals);

    const bw = actuals?.withdrawals.brokerage?.[year] ?? 0;
    const rw = actuals?.withdrawals.roth?.[year] ?? 0;
    const iw = actuals?.withdrawals.ira?.[year] ?? 0;

    frozenYearly.push({ year, brokerage: bw, roth: rw, ira: iw });

    const totalTaxableOrdinary = taxableIncome + iw;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(bw, totalTaxableOrdinary);
    const earlyPenalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF
      ? (rw + iw) * EARLY_WITHDRAWAL_PENALTY_RATE : 0;
    const totalTax = incomeTax + capitalGainsTax + earlyPenalty;

    lpBrkBal = Math.max(0, lpBrkBal - bw) * (1 + r);
    lpRothBal = Math.max(0, lpRothBal - rw) * (1 + r);
    lpIraBal = Math.max(0, lpIraBal - iw) * (1 + r);
    lpStartCash += totalIncome - totalExpenses - totalTax + bw + rw + iw;
  }

  // --- Pre-compute baseline per-year data (LP horizon only) ---
  const Y = END_YEAR - START_YEAR + 1 - frozenYears;
  if (Y <= 0) return buildSchedules(frozenYearly);

  const yd: YD[] = [];
  for (let y = 0; y < Y; y++) {
    const year = START_YEAR + frozenYears + y;
    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year, actuals);
    yd.push({
      income: totalIncome,
      expenses: totalExpenses,
      taxable: taxableIncome,
      penalty: year < EARLY_WITHDRAWAL_PENALTY_CUTOFF,
    });
  }

  // cashConst[y] = cash at end of year y-1 (= start of year y) IF there
  // were no withdrawals or taxes. The LP-side terms account for those.
  // cashConst[y+1] is used for the floor/target constraint at end of year y.
  const cashConst: number[] = [lpStartCash];
  for (let y = 0; y < Y; y++) {
    cashConst.push(cashConst[y] + yd[y].income - yd[y].expenses);
  }

  const lpBalances = { brokerage: lpBrkBal, roth: lpRothBal, ira: lpIraBal };

  // --- Monotone fixed-point iteration to honor capital-gains stacking ---
  const MAX_ITER = 8;
  const CONVERGENCE_TOL = 500;
  const assumedIw = new Array<number>(Y).fill(0);
  let lastFeasible: LpSolveResult | null = null;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const pass = solveOnce(input, targetCash, yd, cashConst, assumedIw, lpBalances);
    if (!pass.feasible) break;
    lastFeasible = pass;
    let maxDelta = 0;
    for (let y = 0; y < Y; y++) {
      const newIw = pass.raw[`iw_${y}`] ?? 0;
      if (newIw > assumedIw[y]) {
        maxDelta = Math.max(maxDelta, newIw - assumedIw[y]);
        assumedIw[y] = newIw;
      }
    }
    if (maxDelta < CONVERGENCE_TOL) break;
  }
  if (!lastFeasible) return buildSchedules(frozenYearly);
  const result = lastFeasible.raw;

  // --- Extract, round, clamp, simulate forward to track real balances ---
  const lpYearly: YearWithdrawal[] = [];
  let brkBal = lpBrkBal;
  let rothBal = lpRothBal;
  let iraBal = lpIraBal;
  for (let y = 0; y < Y; y++) {
    let bw = result[`bw_${y}`] ?? 0;
    let rw = result[`rw_${y}`] ?? 0;
    let iw = result[`iw_${y}`] ?? 0;

    bw = Math.round(bw / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    rw = Math.round(rw / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    iw = Math.round(iw / ROUND_GRANULARITY) * ROUND_GRANULARITY;

    bw = Math.max(0, Math.min(bw, brkBal));
    rw = Math.max(0, Math.min(rw, rothBal));
    iw = Math.max(0, Math.min(iw, iraBal));

    lpYearly.push({ year: START_YEAR + frozenYears + y, brokerage: bw, roth: rw, ira: iw });

    brkBal = (brkBal - bw) * (1 + r);
    rothBal = (rothBal - rw) * (1 + r);
    iraBal = (iraBal - iw) * (1 + r);
  }

  // --- Consolidate frozen + LP-optimized years into schedule objects ---
  return buildSchedules([...frozenYearly, ...lpYearly]);
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

/**
 * Build and solve the LP once, parameterized by `assumedIw[y]` — the value
 * used to tighten the cg band caps to account for IRA withdrawals stacking
 * under LTCG. Called iteratively by `autoBalance`: the outer loop feeds back
 * a monotone upper-bound of prior-iteration `iw_y` values until convergence.
 */
function solveOnce(
  input: PlanInput,
  targetCash: number,
  yd: YD[],
  cashConst: number[],
  assumedIw: number[],
  lpBalances: { brokerage: number; roth: number; ira: number },
): LpSolveResult {
  const Y = yd.length;
  const r = input.returnRate;

  // --- Build LP model in javascript-lp-solver JSON format ---
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {};

  const setObj = (name: string, coef: number) => {
    if (!variables[name]) variables[name] = {};
    variables[name].objective = (variables[name].objective ?? 0) + coef;
  };
  const addTerm = (varName: string, conName: string, coef: number) => {
    if (!variables[varName]) variables[varName] = {};
    variables[varName][conName] = (variables[varName][conName] ?? 0) + coef;
  };

  // Helper: add the "cash recursion at end of year y" linear expression
  // (sum_{k≤y} bw_k+rw_k+iw_k - tax_k) to a named constraint with a given
  // sign. Used by both floor_y and target_y constraints.
  const addCashTerms = (conName: string, throughYear: number) => {
    for (let k = 0; k <= throughYear; k++) {
      addTerm(`bw_${k}`, conName, 1);
      addTerm(`rw_${k}`, conName, 1);
      addTerm(`iw_${k}`, conName, 1);
      for (let i = 0; i < ORD_BRACKETS.length; i++) {
        addTerm(`ordb${i}_${k}`, conName, -ORD_BRACKETS[i].rate);
      }
      for (let j = 0; j < CG_BANDS.length; j++) {
        addTerm(`cgb${j}_${k}`, conName, -CG_BANDS[j].rate);
      }
      if (yd[k].penalty) {
        addTerm(`rw_${k}`, conName, -EARLY_WITHDRAWAL_PENALTY_RATE);
        addTerm(`iw_${k}`, conName, -EARLY_WITHDRAWAL_PENALTY_RATE);
      }
    }
  };

  for (let y = 0; y < Y; y++) {
    // === 1. Withdrawal capacity (cumulative non-negativity) ===
    // After year y's withdrawal: balance ≥ 0, i.e.
    //   sum_{k=0..y} wd_k * (1+r)^(y-k) ≤ B0 * (1+r)^y
    {
      const c = `brk_cap_${y}`;
      constraints[c] = { max: lpBalances.brokerage * Math.pow(1 + r, y) };
      for (let k = 0; k <= y; k++) addTerm(`bw_${k}`, c, Math.pow(1 + r, y - k));
    }
    {
      const c = `roth_cap_${y}`;
      constraints[c] = { max: lpBalances.roth * Math.pow(1 + r, y) };
      for (let k = 0; k <= y; k++) addTerm(`rw_${k}`, c, Math.pow(1 + r, y - k));
    }
    {
      const c = `ira_cap_${y}`;
      constraints[c] = { max: lpBalances.ira * Math.pow(1 + r, y) };
      for (let k = 0; k <= y; k++) addTerm(`iw_${k}`, c, Math.pow(1 + r, y - k));
    }

    // === 2. Ordinary income tax bracket fill ===
    // ord_y represents max(0, taxableIncome_y + iw_y - STANDARD_DEDUCTION).
    // The ≥ constraint plus the LP's tax-minimizing tendency makes it pick
    // the smallest feasible value (so equality holds when the RHS is positive).
    {
      const c = `ord_def_${y}`;
      constraints[c] = { min: yd[y].taxable - STANDARD_DEDUCTION };
      addTerm(`ord_${y}`, c, 1);
      addTerm(`iw_${y}`, c, -1);
    }
    // ord_y = sum of bracket fills
    {
      const c = `ord_sum_${y}`;
      constraints[c] = { equal: 0 };
      addTerm(`ord_${y}`, c, -1);
      for (let i = 0; i < ORD_BRACKETS.length; i++) addTerm(`ordb${i}_${y}`, c, 1);
    }
    // Per-bracket cap
    for (let i = 0; i < ORD_BRACKETS.length; i++) {
      const c = `ordb${i}_cap_${y}`;
      constraints[c] = { max: ORD_BRACKETS[i].width };
      addTerm(`ordb${i}_${y}`, c, 1);
    }

    // === 3. Capital gains bracket fill ===
    // LTCG stacks on top of ordinary income for bracket purposes. We need
    // to know how much room is left in each cg band after ord consumes it.
    //
    // Exact stacking with ord_y as a variable (which depends on iw_y) is
    // non-linear / requires MILP. Instead we precompute the cg band caps
    // using `taxable_y - STD + assumedIw[y]`, where assumedIw[y] is:
    //   - 0 on pass 1 (baseline), then
    //   - pass 1's iw_y on pass 2.
    // This two-pass fixed-point iteration converges in practice because
    // iw_y is shaped by the exact ordinary-tax and cash-floor constraints,
    // not the cg approximation; so iw_y barely moves between passes.
    const baselineOrd = Math.max(0, yd[y].taxable - STANDARD_DEDUCTION + assumedIw[y]);
    let ordRemaining = baselineOrd;
    for (let j = 0; j < CG_BANDS.length; j++) {
      const bandStart = j === 0 ? 0 : CG_BANDS[j - 1].cumulative;
      const bandWidth = CG_BANDS[j].cumulative - bandStart;
      const ordInBand = Math.min(ordRemaining, bandWidth);
      ordRemaining -= ordInBand;
      const cgRoom = bandWidth - ordInBand;
      const c = `cgb_cap_${j}_${y}`;
      constraints[c] = { max: cgRoom };
      addTerm(`cgb${j}_${y}`, c, 1);
    }
    // bw_y = sum of cg bracket fills
    {
      const c = `cg_sum_${y}`;
      constraints[c] = { equal: 0 };
      addTerm(`bw_${y}`, c, -1);
      for (let j = 0; j < CG_BANDS.length; j++) addTerm(`cgb${j}_${y}`, c, 1);
    }

    // === 4. Cash floor (hard via large penalty) ===
    // cashConst[y+1] + (LP cash terms through year y) + floor_slack_y ≥ CASH_FLOOR
    {
      const c = `floor_${y}`;
      constraints[c] = { min: CASH_FLOOR - cashConst[y + 1] };
      addTerm(`floor_slack_${y}`, c, 1);
      addCashTerms(c, y);
    }

    // === 5. Cash target (soft) ===
    {
      const c = `target_${y}`;
      constraints[c] = { min: targetCash - cashConst[y + 1] };
      addTerm(`target_slack_${y}`, c, 1);
      addCashTerms(c, y);
    }

    // Slack penalties go straight into the objective.
    setObj(`floor_slack_${y}`, -FLOOR_PENALTY);
    setObj(`target_slack_${y}`, -TARGET_PENALTY);
  }

  // === Objective: maximize ending true (post-tax) net worth ===
  // True NW = BRK_END_MULT * brk_end + ROTH_END_MULT * roth_end
  //         + IRA_END_MULT * ira_end + cash_end
  //
  //   brk_end  = B0_brk * (1+r)^Y - sum_{k<Y} bw_k * (1+r)^(Y-k)
  //   roth_end = B0_roth * (1+r)^Y - sum_{k<Y} rw_k * (1+r)^(Y-k)
  //   ira_end  = B0_ira * (1+r)^Y - sum_{k<Y} iw_k * (1+r)^(Y-k)
  //   cash_end = cashConst[Y] + sum_{k<Y} (bw_k + rw_k + iw_k - tax_k)
  //
  // Constants (mult * B0 * (1+r)^Y, cashConst[Y]) drop out of optimization.
  for (let k = 0; k < Y; k++) {
    const factor = Math.pow(1 + r, Y - k);
    // Account-end contributions: -mult * factor for the corresponding withdrawal.
    setObj(`bw_${k}`, -BRK_END_MULT * factor);
    setObj(`rw_${k}`, -ROTH_END_MULT * factor);
    setObj(`iw_${k}`, -IRA_END_MULT * factor);
    // Cash-end contributions: +1 per withdrawal dollar (cash multiplier = 1).
    setObj(`bw_${k}`, 1);
    setObj(`rw_${k}`, 1);
    setObj(`iw_${k}`, 1);
    // Cash-end: subtract income tax (per ord bracket).
    for (let i = 0; i < ORD_BRACKETS.length; i++) {
      setObj(`ordb${i}_${k}`, -ORD_BRACKETS[i].rate);
    }
    // Cash-end: subtract cap-gains tax (per cg band).
    for (let j = 0; j < CG_BANDS.length; j++) {
      setObj(`cgb${j}_${k}`, -CG_BANDS[j].rate);
    }
    // Cash-end: subtract early-withdrawal penalty for pre-cutoff years.
    if (yd[k].penalty) {
      setObj(`rw_${k}`, -EARLY_WITHDRAWAL_PENALTY_RATE);
      setObj(`iw_${k}`, -EARLY_WITHDRAWAL_PENALTY_RATE);
    }
  }

  // --- Solve ---
  const model = {
    optimize: 'objective',
    opType: 'max' as const,
    constraints,
    variables,
  };
  const result = solver.Solve(model) as {
    feasible: boolean;
    result: number;
    [key: string]: number | boolean | undefined;
  };

  if (!result || !result.feasible) {
    return { feasible: false, raw: {} };
  }

  const raw: Record<string, number> = {};
  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'number') raw[key] = val;
  }
  return { feasible: true, raw };
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
