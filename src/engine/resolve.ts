import type { PlanInput, TimePeriodValue, NamedAmount } from '../models/types';
import { START_YEAR } from './constants';

export function resolveAmount(periods: TimePeriodValue[], year: number): number {
  let total = 0;
  for (const p of periods) {
    if (year >= p.startYear && year <= p.endYear) {
      total += p.amount;
    }
  }
  return total;
}

export interface ResolvedYear {
  totalIncome: number;
  taxableIncome: number;
  incomeBreakdown: NamedAmount[];
  totalExpenses: number;
  expenseBreakdown: NamedAmount[];
}

export function resolveIncomeAndExpenses(input: PlanInput, year: number): ResolvedYear {
  let totalIncome = 0;
  let taxableIncome = 0;
  const incomeBreakdown: NamedAmount[] = [];

  for (const inc of input.incomes) {
    const annual = resolveAmount(inc.periods, year);
    if (annual > 0) incomeBreakdown.push({ name: inc.name, amount: annual });
    totalIncome += annual;
    if (inc.type === 'taxable') {
      taxableIncome += annual;
    }
  }

  const inflationMultiplier = Math.pow(1 + input.inflationRate, year - START_YEAR);
  let totalExpenses = 0;
  const expenseBreakdown: NamedAmount[] = [];
  for (const exp of input.expenses) {
    const amount = resolveAmount(exp.periods, year);
    const base = exp.frequency === 'monthly' ? amount * 12 : amount;
    const annual = Math.round(base * inflationMultiplier);
    if (annual > 0) expenseBreakdown.push({ name: exp.name, amount: annual });
    totalExpenses += annual;
  }

  return { totalIncome, taxableIncome, incomeBreakdown, totalExpenses, expenseBreakdown };
}
