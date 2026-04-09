import type { PlanInput, ActualsData, NamedAmount, SimulationResult } from '../models/types';
import { resolveAmount, resolveIncomeAndExpenses } from './resolve';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import { START_YEAR, END_YEAR, EARLY_WITHDRAWAL_PENALTY_CUTOFF, EARLY_WITHDRAWAL_PENALTY_RATE } from './constants';

export function runSimulation(input: PlanInput, actuals?: ActualsData): SimulationResult {
  const results: SimulationResult = [];

  let currentCash = input.startingCash;
  let brokerageBalance = input.brokerageBalance;
  let retirementBalance = input.retirementBalance;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const { totalIncome, taxableIncome, incomeBreakdown, totalExpenses, expenseBreakdown } =
      resolveIncomeAndExpenses(input, year, actuals);

    // Resolve withdrawals
    let withdrawalsBrokerage = 0;
    let withdrawalsRetirement = 0;
    const withdrawalBreakdown: NamedAmount[] = [];

    for (const wd of input.withdrawals) {
      const actual = actuals?.withdrawals[wd.id]?.[year];
      const amount = actual != null ? actual : resolveAmount(wd.periods, year);
      if (amount <= 0) continue;
      if (wd.accountType === 'brokerage') {
        withdrawalsBrokerage += amount;
      } else {
        withdrawalsRetirement += amount;
      }
    }
    if (withdrawalsBrokerage > 0) withdrawalBreakdown.push({ name: 'Brokerage', amount: withdrawalsBrokerage });
    if (withdrawalsRetirement > 0) withdrawalBreakdown.push({ name: 'Retirement', amount: withdrawalsRetirement });

    // Calculate investment growth
    brokerageBalance = Math.max(0, brokerageBalance - withdrawalsBrokerage);
    brokerageBalance *= (1 + input.returnRate);

    retirementBalance = Math.max(0, retirementBalance - withdrawalsRetirement);
    retirementBalance *= (1 + input.returnRate);

    // Calculate taxes
    const totalTaxableOrdinary = taxableIncome + withdrawalsRetirement;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(withdrawalsBrokerage, totalTaxableOrdinary);

    const earlyWithdrawalPenalty = year < EARLY_WITHDRAWAL_PENALTY_CUTOFF
      ? withdrawalsRetirement * EARLY_WITHDRAWAL_PENALTY_RATE
      : 0;

    const totalTax = incomeTax + capitalGainsTax + earlyWithdrawalPenalty;

    // Net cash flow
    const netCashFlow = totalIncome
      - totalExpenses
      - totalTax
      + withdrawalsBrokerage
      + withdrawalsRetirement;

    currentCash += netCashFlow;

    const totalInvestments = brokerageBalance + retirementBalance;
    const totalNetWorth = currentCash + totalInvestments;

    results.push({
      year,
      totalIncome,
      taxableIncome,
      incomeBreakdown,
      totalExpenses,
      expenseBreakdown,
      withdrawalsBrokerage,
      withdrawalsRetirement,
      withdrawalBreakdown,
      incomeTax,
      capitalGainsTax,
      earlyWithdrawalPenalty,
      totalTax,
      netCashFlow,
      endingCash: currentCash,
      brokerageBalance,
      retirementBalance,
      totalInvestments,
      totalNetWorth,
    });
  }

  return results;
}
