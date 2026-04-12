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
  applyInflation: boolean;
  periods: TimePeriodValue[];
}

export type IncomeType = 'taxable' | 'non-taxable';

export interface IncomeItem {
  id: string;
  name: string;
  type: IncomeType;
  periods: TimePeriodValue[];
}

export type AccountType = 'brokerage' | 'roth' | 'ira';

export interface WithdrawalSchedule {
  id: string;
  accountType: AccountType;
  periods: TimePeriodValue[];
}

export interface ActualsData {
  incomes: Record<string, Record<number, number>>;
  expenses: Record<string, Record<number, number>>;
  withdrawals: Partial<Record<AccountType, Record<number, number>>>;
}

export interface ScenarioPlan {
  id: string;
  name: string;
  input: PlanInput;
  actuals: ActualsData;
}

export interface PlanInput {
  startingCash: number;
  brokerageBalance: number;
  rothBalance: number;
  iraBalance: number;
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
  withdrawalsRoth: number;
  withdrawalsIra: number;
  withdrawalBreakdown: NamedAmount[];
  incomeTax: number;
  capitalGainsTax: number;
  earlyWithdrawalPenalty: number;
  totalTax: number;
  netCashFlow: number;
  endingCash: number;
  brokerageBalance: number;
  rothBalance: number;
  iraBalance: number;
  totalInvestments: number;
  totalNetWorth: number;
}

export type SimulationResult = YearResult[];

export interface Profile {
  id: string;
  name: string;
  plans: ScenarioPlan[];
  activePlanId: string;
}

export interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string;
}
