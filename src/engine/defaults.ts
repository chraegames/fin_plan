import type { PlanInput, ActualsData } from '../models/types';
import { START_YEAR, END_YEAR } from './constants';

export const defaultInput: PlanInput = {
  startingCash: 50000,
  brokerageBalance: 100000,
  rothBalance: 100000,
  iraBalance: 100000,
  returnRate: 0.07,
  incomes: [
    {
      id: 'inc-1',
      name: 'Wages',
      type: 'taxable',
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 120000 }],
    },
  ],
  inflationRate: 0.03,
  targetCash: 200000,
  expenses: [
    {
      id: 'exp-1',
      name: 'Living Cost',
      frequency: 'monthly',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 3000 }],
    },
    {
      id: 'exp-2',
      name: 'Mortgage',
      frequency: 'monthly',
      applyInflation: false,
      periods: [{ startYear: START_YEAR, endYear: 2055, amount: 2500 }],
    },
    {
      id: 'exp-3',
      name: 'Health Insurance',
      frequency: 'monthly',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 500 }],
    },
    {
      id: 'exp-4',
      name: 'Travel',
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
};

let nextId = 100;
export function generateId(): string {
  return `item-${nextId++}`;
}
