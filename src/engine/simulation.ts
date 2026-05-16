import type { PlanInput, ActualsData, NamedAmount, SimulationResult } from '../models/types';
import { resolveAmount, resolveIncomeAndExpenses } from './resolve';
import { calculateIncomeTax, calculateCapitalGainsTax } from './tax';
import { EARLY_WITHDRAWAL_PENALTY_RATE, earlyWithdrawalCutoff } from './constants';

export function runSimulation(input: PlanInput, actuals?: ActualsData): SimulationResult {
  const results: SimulationResult = [];
  const penaltyCutoff = earlyWithdrawalCutoff(input.birthYear);

  let currentCash = input.startingCash;
  let brokerageBalance = input.brokerageBalance;
  let brokerageBasis = Math.min(input.brokerageBasis, input.brokerageBalance);
  let rothBalance = input.rothBalance;
  let iraBalance = input.iraBalance;

  for (let year = input.startYear; year <= input.endYear; year++) {
    const { totalIncome, taxableIncome, incomeBreakdown, totalExpenses, expenseBreakdown } =
      resolveIncomeAndExpenses(input, year, actuals);

    // Resolve scheduled withdrawals (actuals override schedule for that year).
    // We immediately cap each scheduled amount to the available balance and
    // use the *applied* values everywhere downstream — otherwise an
    // over-scheduled $1M withdrawal from a $100k account would inflate cash
    // flow by the full $1M while only $100k actually left the account.
    let scheduledBrokerage = 0;
    let scheduledRoth = 0;
    let scheduledIra = 0;
    for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
      const actual = actuals?.withdrawals[acctType]?.[year];
      const amount = actual != null
        ? actual
        : input.withdrawals
            .filter(wd => wd.accountType === acctType)
            .reduce((sum, wd) => sum + resolveAmount(wd.periods, year), 0);
      if (acctType === 'brokerage') scheduledBrokerage = amount;
      else if (acctType === 'roth') scheduledRoth = amount;
      else scheduledIra = amount;
    }

    const withdrawalsBrokerage = Math.max(0, Math.min(scheduledBrokerage, brokerageBalance));
    const withdrawalsRoth = Math.max(0, Math.min(scheduledRoth, rothBalance));
    const withdrawalsIra = Math.max(0, Math.min(scheduledIra, iraBalance));

    const withdrawalBreakdown: NamedAmount[] = [];
    if (withdrawalsBrokerage > 0) withdrawalBreakdown.push({ name: 'Brokerage', amount: withdrawalsBrokerage });
    if (withdrawalsRoth > 0) withdrawalBreakdown.push({ name: 'Roth', amount: withdrawalsRoth });
    if (withdrawalsIra > 0) withdrawalBreakdown.push({ name: 'IRA', amount: withdrawalsIra });

    // Brokerage: split each withdrawal into basis (return of capital, untaxed)
    // and gain (LTCG). Basis depletes proportionally to the withdrawn fraction.
    const basisFraction = brokerageBalance > 0 ? brokerageBasis / brokerageBalance : 0;
    const basisOfWithdrawal = withdrawalsBrokerage * basisFraction;
    const gainOfWithdrawal = withdrawalsBrokerage - basisOfWithdrawal;
    brokerageBasis = Math.max(0, brokerageBasis - basisOfWithdrawal);
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
    if (actualBrokerEnd != null) {
      brokerageBalance = actualBrokerEnd;
      if (brokerageBasis > brokerageBalance) brokerageBasis = brokerageBalance;
    }
    const actualRothEnd = actuals?.endingBalances?.roth?.[year];
    if (actualRothEnd != null) rothBalance = actualRothEnd;
    const actualIraEnd = actuals?.endingBalances?.ira?.[year];
    if (actualIraEnd != null) iraBalance = actualIraEnd;

    // Calculate taxes
    // IRA withdrawals are taxed as ordinary income; Roth withdrawals are tax-free
    const totalTaxableOrdinary = taxableIncome + withdrawalsIra;
    const incomeTax = calculateIncomeTax(totalTaxableOrdinary);
    const capitalGainsTax = calculateCapitalGainsTax(gainOfWithdrawal, totalTaxableOrdinary);

    // Early withdrawal penalty applies to both Roth and IRA before cutoff
    const earlyWithdrawalPenalty = year < penaltyCutoff
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

    const actualCashEnd = actuals?.endingCash?.[year];
    if (actualCashEnd != null) currentCash = actualCashEnd;

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
