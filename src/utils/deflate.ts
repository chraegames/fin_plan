import type { SimulationResult } from '../models/types';

/** Adjust nominal-dollar simulation values to today's dollars by dividing by
 *  the cumulative inflation factor from the start year. */
export function deflateResults(
  results: SimulationResult,
  inflationRate: number,
  startYear: number,
): SimulationResult {
  return results.map(r => {
    const factor = Math.pow(1 + inflationRate, r.year - startYear);
    const d = (v: number) => v / factor;
    return {
      ...r,
      totalIncome: d(r.totalIncome),
      taxableIncome: d(r.taxableIncome),
      incomeBreakdown: r.incomeBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      totalExpenses: d(r.totalExpenses),
      expenseBreakdown: r.expenseBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      withdrawalsBrokerage: d(r.withdrawalsBrokerage),
      withdrawalsRoth: d(r.withdrawalsRoth),
      withdrawalsIra: d(r.withdrawalsIra),
      withdrawalBreakdown: r.withdrawalBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      incomeTax: d(r.incomeTax),
      capitalGainsTax: d(r.capitalGainsTax),
      earlyWithdrawalPenalty: d(r.earlyWithdrawalPenalty),
      totalTax: d(r.totalTax),
      netCashFlow: d(r.netCashFlow),
      endingCash: d(r.endingCash),
      brokerageBalance: d(r.brokerageBalance),
      rothBalance: d(r.rothBalance),
      iraBalance: d(r.iraBalance),
      totalInvestments: d(r.totalInvestments),
      totalNetWorth: d(r.totalNetWorth),
    };
  });
}
