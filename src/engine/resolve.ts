import type { PlanInput, TimePeriodValue, NamedAmount, ActualsData } from '../models/types';
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

export function resolveIncomeAndExpenses(input: PlanInput, year: number, actuals?: ActualsData): ResolvedYear {
  let totalIncome = 0;
  let taxableIncome = 0;
  const incomeBreakdown: NamedAmount[] = [];

  for (const inc of input.incomes) {
    const actual = actuals?.incomes[inc.id]?.[year];
    const annual = actual != null ? actual : resolveAmount(inc.periods, year);
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
    // For monthly expenses, actuals are stored as year*100+month keys
    let actual: number | undefined;
    if (exp.frequency === 'monthly' && actuals?.expenses[exp.id]) {
      let monthTotal = 0;
      let hasAny = false;
      for (let m = 0; m < 12; m++) {
        const v = actuals.expenses[exp.id][year * 100 + m];
        if (v != null) { hasAny = true; monthTotal += v; }
      }
      if (hasAny) actual = monthTotal;
    } else {
      actual = actuals?.expenses[exp.id]?.[year];
    }
    let annual: number;
    if (actual != null) {
      // For monthly: monthTotal is already the annual sum; for annual: use as-is
      annual = actual;
    } else {
      const amount = resolveAmount(exp.periods, year);
      const base = exp.frequency === 'monthly' ? amount * 12 : amount;
      annual = Math.round(base * inflationMultiplier);
    }
    if (annual > 0) expenseBreakdown.push({ name: exp.name, amount: annual });
    totalExpenses += annual;
  }

  return { totalIncome, taxableIncome, incomeBreakdown, totalExpenses, expenseBreakdown };
}
