import type { ActualsData } from '../../../models/types';
import { EmptyCard } from './EmptyCard';
import { SummaryCard, type SummaryRow } from './SummaryCard';

interface HistoryCardProps {
  actuals: ActualsData;
  onGoHistory: () => void;
}

export function HistoryCard({ actuals, onGoHistory }: HistoryCardProps) {
  const summary = summarizeActuals(actuals);

  if (summary.yearsRecorded === 0) {
    return (
      <EmptyCard
        eyebrow="History"
        title="Not started"
        description="Record what actually happened each past year. Real numbers replace your projection so next year's forecast starts from reality, not assumption."
        examples={['Year-end balances', 'Monthly expenses', 'Real withdrawals']}
        icon="calendar"
        ctaLabel="Add actuals"
        onAdd={onGoHistory}
      />
    );
  }

  const rows: SummaryRow[] = [];
  if (summary.endingBalanceCount > 0) {
    rows.push({
      label: 'Year-end balances',
      value: String(summary.endingBalanceCount),
      color: 'var(--positive)',
    });
  }
  if (summary.expenseCount > 0) {
    rows.push({
      label: 'Expense overrides',
      value: String(summary.expenseCount),
      color: 'var(--negative)',
    });
  }
  if (summary.incomeCount > 0) {
    rows.push({
      label: 'Income overrides',
      value: String(summary.incomeCount),
      color: 'var(--chart-roth)',
    });
  }
  if (summary.withdrawalCount > 0) {
    rows.push({
      label: 'Withdrawal overrides',
      value: String(summary.withdrawalCount),
      color: 'var(--accent)',
    });
  }

  const sub =
    summary.firstYear === summary.lastYear
      ? String(summary.firstYear)
      : `${summary.firstYear} → ${summary.lastYear}`;

  return (
    <SummaryCard
      eyebrow="History"
      title={`${summary.yearsRecorded} ${summary.yearsRecorded === 1 ? 'year' : 'years'} recorded`}
      sub={sub}
      rows={rows}
      onEdit={onGoHistory}
    />
  );
}

interface ActualsSummary {
  yearsRecorded: number;
  firstYear: number | null;
  lastYear: number | null;
  endingBalanceCount: number;
  expenseCount: number;
  incomeCount: number;
  withdrawalCount: number;
}

function summarizeActuals(actuals: ActualsData): ActualsSummary {
  const years = new Set<number>();
  let endingBalanceCount = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let withdrawalCount = 0;

  const collectYearKeys = (record: Record<number, unknown> | undefined) => {
    if (!record) return 0;
    let count = 0;
    for (const k of Object.keys(record)) {
      const num = Number(k);
      if (!Number.isFinite(num)) continue;
      // Monthly expense keys are year*100+month (e.g., 202503 for Mar 2025).
      const year = num > 9999 ? Math.floor(num / 100) : num;
      years.add(year);
      count += 1;
    }
    return count;
  };

  for (const id of Object.keys(actuals.incomes ?? {})) {
    incomeCount += collectYearKeys(actuals.incomes[id]);
  }
  for (const id of Object.keys(actuals.expenses ?? {})) {
    expenseCount += collectYearKeys(actuals.expenses[id]);
  }
  if (actuals.withdrawals) {
    for (const acct of Object.keys(actuals.withdrawals) as Array<keyof typeof actuals.withdrawals>) {
      withdrawalCount += collectYearKeys(actuals.withdrawals[acct]);
    }
  }
  if (actuals.endingBalances) {
    for (const acct of Object.keys(actuals.endingBalances) as Array<keyof typeof actuals.endingBalances>) {
      endingBalanceCount += collectYearKeys(actuals.endingBalances[acct]);
    }
  }
  endingBalanceCount += collectYearKeys(actuals.endingCash);

  const yearList = [...years].sort((a, b) => a - b);
  return {
    yearsRecorded: yearList.length,
    firstYear: yearList[0] ?? null,
    lastYear: yearList[yearList.length - 1] ?? null,
    endingBalanceCount,
    expenseCount,
    incomeCount,
    withdrawalCount,
  };
}
