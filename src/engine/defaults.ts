import type { PlanInput, ActualsData } from '../models/types';
import { START_YEAR, END_YEAR } from './constants';

export const defaultInput: PlanInput = {
  birthYear: 1985,
  startingCash: 25000,
  brokerageBalance: 50000,
  brokerageBasis: 50000,
  rothBalance: 30000,
  iraBalance: 50000,
  returnRate: 0.07,
  incomes: [
    {
      id: 'inc-1',
      name: 'Salary',
      type: 'taxable',
      periods: [{ startYear: START_YEAR, endYear: START_YEAR + 30, amount: 90000 }],
    },
  ],
  inflationRate: 0.03,
  targetCash: 100000,
  expenses: [
    {
      id: 'exp-1',
      name: 'Living expenses',
      frequency: 'monthly',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 3000 }],
    },
    {
      id: 'exp-2',
      name: 'Housing',
      frequency: 'monthly',
      applyInflation: false,
      periods: [{ startYear: START_YEAR, endYear: START_YEAR + 29, amount: 2000 }],
    },
    {
      id: 'exp-3',
      name: 'Health insurance',
      frequency: 'monthly',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 500 }],
    },
    {
      id: 'exp-4',
      name: 'Travel & discretionary',
      frequency: 'annual',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 5000 }],
    },
  ],
  withdrawals: [],
};

export const defaultActuals: ActualsData = {
  incomes: {},
  expenses: {},
  withdrawals: { brokerage: {}, roth: {}, ira: {} },
  endingBalances: { brokerage: {}, roth: {}, ira: {} },
  endingCash: {},
};

let nextId = 100;
export function generateId(): string {
  return `item-${nextId++}`;
}
