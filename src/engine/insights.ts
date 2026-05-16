import type { SimulationResult, PlanInput } from '../models/types';
import type { IconName } from '../components/primitives/Icon';

export type InsightTone = 'positive' | 'negative' | 'caution' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: IconName;
  title: string;
  detail: string;
  meta: string;
}

export function generateInsights(plan: PlanInput, result: SimulationResult): Insight[] {
  if (plan.expenses.length === 0 || result.length === 0) return [];

  const insights: Insight[] = [];

  const brokerageDepleted = result.find(y => y.brokerageBalance < 1 && y.year > plan.startYear);
  if (brokerageDepleted) {
    insights.push({
      id: 'brokerage-depleted',
      tone: 'caution',
      icon: 'trend-down',
      title: `Brokerage runs out in ${brokerageDepleted.year}`,
      detail: `After ${brokerageDepleted.year - plan.startYear} years of drawdown the taxable account is exhausted.`,
      meta: 'Try: reduce living costs or delay travel.',
    });
  }

  const totalDepleted = result.find(y => y.totalNetWorth < 1);
  if (totalDepleted) {
    insights.push({
      id: 'plan-depletes',
      tone: 'negative',
      icon: 'warning',
      title: `Plan depletes in ${totalDepleted.year}`,
      detail: `Net worth falls below zero — at this rate, savings won't sustain the planned spending.`,
      meta: 'Try: cut expenses or extend the income horizon.',
    });
  }

  const cashGaps = result.filter(y => y.endingCash < plan.targetCash * 0.95);
  if (cashGaps.length > 0 && plan.targetCash > 0) {
    const targetK = Math.round(plan.targetCash / 1000);
    insights.push({
      id: 'cash-gap',
      tone: 'caution',
      icon: 'warning',
      title: `Cash dips below your $${targetK}K target`,
      detail: `First in ${cashGaps[0].year}${cashGaps.length > 1 ? `, and ${cashGaps.length - 1} more time${cashGaps.length > 2 ? 's' : ''}` : ''}. Cuts close to your buffer.`,
      meta: `Try: raise target cash to $${Math.round((plan.targetCash * 1.5) / 1000)}K.`,
    });
  }

  const penaltyYear = plan.birthYear + 60;
  const irasUsedBeforePenalty = result.some(
    y => y.year < penaltyYear && (y.withdrawalsIra > 0 || y.withdrawalsRoth > 0),
  );
  if (!irasUsedBeforePenalty && penaltyYear >= plan.startYear && penaltyYear <= plan.endYear) {
    insights.push({
      id: 'penalty-free',
      tone: 'positive',
      icon: 'check',
      title: `You stay penalty-free after ${penaltyYear}`,
      detail: `By the time IRA withdrawals begin, you've aged past 59½ — no 10% early-withdrawal hit.`,
      meta: 'Roth left for last is paying off.',
    });
  }

  const totalTax = result.reduce((s, y) => s + y.totalTax, 0);
  const totalCashInflow = result.reduce(
    (s, y) =>
      s +
      y.totalIncome +
      y.withdrawalsBrokerage +
      y.withdrawalsIra +
      y.withdrawalsRoth,
    0,
  );
  if (totalCashInflow > 0) {
    const effectiveRate = totalTax / totalCashInflow;
    insights.push({
      id: 'effective-tax',
      tone: 'neutral',
      icon: 'info',
      title: `Effective tax rate is ${(effectiveRate * 100).toFixed(0)}%`,
      detail: `$${(totalTax / 1000).toFixed(0)}K in federal tax across $${(totalCashInflow / 1e6).toFixed(1)}M of withdrawals + income.`,
      meta: 'Roth conversions could reduce this further.',
    });
  }

  const order: Record<InsightTone, number> = {
    caution: 0,
    negative: 1,
    positive: 2,
    neutral: 3,
  };
  return insights.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4);
}
