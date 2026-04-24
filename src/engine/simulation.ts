import type { PlanInput, ActualsData, NamedAmount, SimulationResult } from '../models/types';
import { resolveAmount, resolveIncomeAndExpenses } from './resolve';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import { START_YEAR, END_YEAR, EARLY_WITHDRAWAL_PENALTY_CUTOFF, EARLY_WITHDRAWAL_PENALTY_RATE } from './constants';

export function runSimulation(input: PlanInput, actuals?: ActualsData): SimulationResult {
  const results: SimulationResult = [];

  let currentCash = input.startingCash;
  let brokerageBalance = input.brokerageBalance;
  let rothBalance = input.rothBalance;
  let iraBalance = input.iraBalance;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const { totalIncome, taxableIncome, incomeBreakdown, totalExpenses, expenseBreakdown } =
      resolveIncomeAndExpenses(input, year, actuals);

    // Resolve withdrawals — actuals are keyed by account type
    let withdrawalsBrokerage = 0;
    let withdrawalsRoth = 0;
    let withdrawalsIra = 0;
    const withdrawalBreakdown: NamedAmount[] = [];

    for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
      const actual = actuals?.withdrawals[acctType]?.[year];
      let amount: number;
      if (actual != null) {
        amount = actual;
      } else {
        amount = input.withdrawals
          .filter(wd => wd.accountType === acctType)
          .reduce((sum, wd) => sum + resolveAmount(wd.periods, year), 0);
      }
      if (acctType === 'brokerage') withdrawalsBrokerage = amount;
      else if (acctType === 'roth') withdrawalsRoth = amount;
      else withdrawalsIra = amount;
    }
    if (withdrawalsBrokerage > 0) withdrawalBreakdown.push({ name: 'Brokerage', amount: withdrawalsBrokerage });
    if (withdrawalsRoth > 0) withdrawalBreakdown.push({ name: 'Roth', amount: withdrawalsRoth });
    if (withdrawalsIra > 0) withdrawalBreakdown.push({ name: 'IRA', amount: withdrawalsIra });

    // Calculate investment growth
    brokerageBalance = Math.max(0, brokerageBalance - withdrawalsBrokerage);
    brokerageBalance *= (1 + input.returnRate);

    rothBalance = Math.max(0, rothBalance - withdrawalsRoth);
    rothBalance *= (1 + input.returnRate);

    iraBalance = Math.max(0, iraBalance - withdrawalsIra);
    iraBalance *= (1 + input.returnRate);

    // Override year-end balances with actuals if present. The overridden value
    // persists across loop iterations, so it naturally becomes next year's
    // starting balance.
    const actualBrokerEnd = actuals?.endingBalances?.brokerage?.[year];
    if (actualBrokerEnd != null) brokerageBalance = actualBrokerEnd;
    const actualRothEnd = actuals?.endingBalances?.roth?.[year];
    if (actualRothEnd != null) rothBalance = actualRothEnd;
    const actualIraEnd = actuals?.endingBalances?.ira?.[year];
    if (actualIraEnd != null) iraBalance = actualIraEnd;

    // Calculate taxes
    // IRA withdrawals are taxed as ordinary income; Roth withdrawals are tax-free
    const totalTaxableOrdinary = taxableIncome + withdrawalsIra;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(withdrawalsBrokerage, totalTaxableOrdinary);

    // Early withdrawal penalty applies to both Roth and IRA before cutoff
    const earlyWithdrawalPenalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF
      ? (withdrawalsRoth + withdrawalsIra) * EARLY_WITHDRAWAL_PENALTY_RATE
      : 0;

    const totalTax = incomeTax + capitalGainsTax + earlyWithdrawalPenalty;

    // Net cash flow
    const netCashFlow = totalIncome
      - totalExpenses
      - totalTax
      + withdrawalsBrokerage
      + withdrawalsRoth
      + withdrawalsIra;

    currentCash += netCashFlow;

    const totalInvestments = brokerageBalance + rothBalance + iraBalance;
    const totalNetWorth = currentCash + totalInvestments;

    results.push({
      year,
      totalIncome,
      taxableIncome,
      incomeBreakdown,
      totalExpenses,
      expenseBreakdown,
      withdrawalsBrokerage,
      withdrawalsRoth,
      withdrawalsIra,
      withdrawalBreakdown,
      incomeTax,
      capitalGainsTax,
      earlyWithdrawalPenalty,
      totalTax,
      netCashFlow,
      endingCash: currentCash,
      brokerageBalance,
      rothBalance,
      iraBalance,
      totalInvestments,
      totalNetWorth,
    });
  }

  return results;
}
