export interface TimePeriodValue {
  startYear: number;
  endYear: number;
  amount: number;
}

export type ExpenseFrequency = 'monthly' | 'annual';

export interface ExpenseItem {
  id: string;
  name: string;
  frequency: ExpenseFrequency;
  periods: TimePeriodValue[];
}

export type IncomeType = 'taxable' | 'non-taxable';

export interface IncomeItem {
  id: string;
  name: string;
  type: IncomeType;
  periods: TimePeriodValue[];
}

export type AccountType = 'brokerage' | 'retirement';

export interface WithdrawalSchedule {
  id: string;
  accountType: AccountType;
  periods: TimePeriodValue[];
}

export interface ScenarioPlan {
  id: string;
  name: string;
  input: PlanInput;
}

export interface PlanInput {
  startingCash: number;
  brokerageBalance: number;
  retirementBalance: number;
  returnRate: number;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  inflationRate: number;
  targetCash: number;
  withdrawals: WithdrawalSchedule[];
}

export interface NamedAmount {
  name: string;
  amount: number;
}

export interface YearResult {
  year: number;
  totalIncome: number;
  taxableIncome: number;
  incomeBreakdown: NamedAmount[];
  totalExpenses: number;
  expenseBreakdown: NamedAmount[];
  withdrawalsBrokerage: number;
  withdrawalsRetirement: number;
  withdrawalBreakdown: NamedAmount[];
  incomeTax: number;
  capitalGainsTax: number;
  earlyWithdrawalPenalty: number;
  totalTax: number;
  netCashFlow: number;
  endingCash: number;
  brokerageBalance: number;
  retirementBalance: number;
  totalInvestments: number;
  totalNetWorth: number;
}

export type SimulationResult = YearResult[];
