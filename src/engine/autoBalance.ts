import solver from 'javascript-lp-solver';
import type { PlanInput, WithdrawalSchedule, TimePeriodValue } from '../models/types';
import { resolveIncomeAndExpenses } from './resolve';
import { generateId } from './defaults';
import {
  START_YEAR,
  END_YEAR,
  EARLY_WITHDRAWAL_PENALTY_CUTOFF,
  EARLY_WITHDRAWAL_PENALTY_RATE,
} from './constants';

const ROUND_GRANULARITY = 10000;
const CASH_FLOOR = 10000;

// Tax bracket constants — must mirror src/engine/tax.ts. Duplicated rather
// than imported because tax.ts keeps them module-private.
const STANDARD_DEDUCTION = 29200;

// Bracket widths: top bracket capped at $10M (well above any realistic
// withdrawal). Don't use 1e9+ — javascript-lp-solver's simplex is sensitive
// to wide coefficient ranges and produces spurious infeasibility for
// well-conditioned problems when "infinity" coefficients are present.
const ORD_BRACKETS: { width: number; rate: number }[] = [
  { width: 23200, rate: 0.10 },
  { width: 94300 - 23200, rate: 0.12 },
  { width: 201050 - 94300, rate: 0.22 },
  { width: 383900 - 201050, rate: 0.24 },
  { width: 487450 - 383900, rate: 0.32 },
  { width: 731200 - 487450, rate: 0.35 },
  { width: 10_000_000, rate: 0.37 },
];

const CG_BANDS: { cumulative: number; rate: number }[] = [
  { cumulative: 94050, rate: 0.00 },
  { cumulative: 583750, rate: 0.15 },
  { cumulative: 10_000_000, rate: 0.20 },
];

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
export function autoBalance(input: PlanInput, targetCash: number): WithdrawalSchedule[] {
  const Y = END_YEAR - START_YEAR + 1;
  const r = input.returnRate;

  // --- Pre-compute baseline per-year data ---
  type YD = { income: number; expenses: number; taxable: number; penalty: boolean };
  const yd: YD[] = [];
  for (let y = 0; y < Y; y++) {
    const year = START_YEAR + y;
    const { totalIncome, taxableIncome, totalExpenses } = resolveIncomeAndExpenses(input, year);
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
  const cashConst: number[] = [input.startingCash];
  for (let y = 0; y < Y; y++) {
    cashConst.push(cashConst[y] + yd[y].income - yd[y].expenses);
  }

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
      constraints[c] = { max: input.brokerageBalance * Math.pow(1 + r, y) };
      for (let k = 0; k <= y; k++) addTerm(`bw_${k}`, c, Math.pow(1 + r, y - k));
    }
    {
      const c = `roth_cap_${y}`;
      constraints[c] = { max: input.rothBalance * Math.pow(1 + r, y) };
      for (let k = 0; k <= y; k++) addTerm(`rw_${k}`, c, Math.pow(1 + r, y - k));
    }
    {
      const c = `ira_cap_${y}`;
      constraints[c] = { max: input.iraBalance * Math.pow(1 + r, y) };
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
    // non-linear / requires MILP. Instead we approximate: precompute the
    // cg band caps using only the *baseline* ordinary income (taxable_y -
    // STD), ignoring how iw_y might further consume cg band room. This is
    // exactly correct in the most common cases:
    //   - Retirement (taxable=0, iw fills std deduction): full 0% band.
    //   - Wage years (taxable >> 0): little/no 0% band, cg pays 15%+.
    // The only inaccuracy: in retirement years where iw_y exceeds the std
    // deduction by enough to spill into the cg-0% range AND the user is
    // also realizing gains. This is bounded and rare in practice.
    const baselineOrd = Math.max(0, yd[y].taxable - STANDARD_DEDUCTION);
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
    // Genuinely infeasible (shouldn't happen since floor/target are soft).
    // Return empty schedules so the simulation runs with no withdrawals
    // rather than throwing.
    return [];
  }

  // --- Extract, round, clamp, simulate forward to track real balances ---
  const yearly: YearWithdrawal[] = [];
  let brkBal = input.brokerageBalance;
  let rothBal = input.rothBalance;
  let iraBal = input.iraBalance;
  for (let y = 0; y < Y; y++) {
    let bw = (result[`bw_${y}`] as number) ?? 0;
    let rw = (result[`rw_${y}`] as number) ?? 0;
    let iw = (result[`iw_${y}`] as number) ?? 0;

    bw = Math.round(bw / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    rw = Math.round(rw / ROUND_GRANULARITY) * ROUND_GRANULARITY;
    iw = Math.round(iw / ROUND_GRANULARITY) * ROUND_GRANULARITY;

    bw = Math.max(0, Math.min(bw, brkBal));
    rw = Math.max(0, Math.min(rw, rothBal));
    iw = Math.max(0, Math.min(iw, iraBal));

    yearly.push({ year: START_YEAR + y, brokerage: bw, roth: rw, ira: iw });

    brkBal = (brkBal - bw) * (1 + r);
    rothBal = (rothBal - rw) * (1 + r);
    iraBal = (iraBal - iw) * (1 + r);
  }

  // --- Consolidate into schedule objects ---
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
