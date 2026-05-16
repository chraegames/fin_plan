import { useMemo, useState } from 'react';
import type { SimulationResult, YearResult } from '../models/types';
import { formatDollars as $ } from '../utils/format';
import ResultsChart from './ResultsChart';
import ResultsTable from './ResultsTable';

interface Props {
  results: SimulationResult | null;
  onCashFlowClick: (yearResult: YearResult) => void;
  penaltyCutoff: number;
  inflationRate: number;
  startYear: number;
}

function deflateResults(results: SimulationResult, inflationRate: number, startYear: number): SimulationResult {
  return results.map(r => {
    const factor = Math.pow(1 + inflationRate, r.year - startYear);
    const d = (v: number) => v / factor;
    return {
      ...r,
      totalIncome: d(r.totalIncome),
      taxableIncome: d(r.taxableIncome),
      incomeBreakdown: r.incomeBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      totalExpenses: d(r.totalExpenses),
      expenseBreakdown: r.expenseBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      withdrawalsBrokerage: d(r.withdrawalsBrokerage),
      withdrawalsRoth: d(r.withdrawalsRoth),
      withdrawalsIra: d(r.withdrawalsIra),
      withdrawalBreakdown: r.withdrawalBreakdown.map(b => ({ ...b, amount: d(b.amount) })),
      incomeTax: d(r.incomeTax),
      capitalGainsTax: d(r.capitalGainsTax),
      earlyWithdrawalPenalty: d(r.earlyWithdrawalPenalty),
      totalTax: d(r.totalTax),
      netCashFlow: d(r.netCashFlow),
      endingCash: d(r.endingCash),
      brokerageBalance: d(r.brokerageBalance),
      rothBalance: d(r.rothBalance),
      iraBalance: d(r.iraBalance),
      totalInvestments: d(r.totalInvestments),
      totalNetWorth: d(r.totalNetWorth),
    };
  });
}

export default function ResultsPanel({ results, onCashFlowClick, penaltyCutoff, inflationRate, startYear }: Props) {
  const [realDollars, setRealDollars] = useState(false);

  const displayResults = useMemo(() => {
    if (!results) return null;
    return realDollars ? deflateResults(results, inflationRate, startYear) : results;
  }, [results, realDollars, inflationRate, startYear]);

  const summary = useMemo(() => {
    if (!displayResults || displayResults.length === 0) return null;
    const last = displayResults[displayResults.length - 1];
    let totalTaxPaid = 0;
    let peakNetWorth = -Infinity;
    for (const r of displayResults) {
      totalTaxPaid += r.totalTax;
      if (r.totalNetWorth > peakNetWorth) peakNetWorth = r.totalNetWorth;
    }
    return { last, totalTaxPaid, peakNetWorth };
  }, [displayResults]);

  if (!summary || !displayResults) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Add income, expenses, and starting balances to see your projection.
      </div>
    );
  }

  const { last, totalTaxPaid, peakNetWorth } = summary;
  const yearSpan = displayResults[displayResults.length - 1].year - displayResults[0].year + 1;

  return (
    <div className="space-y-4">
      {/* Toggle row */}
      <div className="flex items-center justify-end gap-2 text-xs">
        <span className="text-gray-400">Show values in</span>
        <button
          onClick={() => setRealDollars(false)}
          className={`px-2 py-1 rounded transition-colors ${!realDollars ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
        >
          Nominal $
        </button>
        <button
          onClick={() => setRealDollars(true)}
          className={`px-2 py-1 rounded transition-colors ${realDollars ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
          title={`Adjust for ${(inflationRate * 100).toFixed(1)}% annual inflation so dollars across years are comparable.`}
        >
          Today's $
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-gray-400 mb-1">Final Net Worth</div>
          <div className="text-lg font-semibold text-blue-400">{$(last.totalNetWorth)}</div>
          <div className="text-xs text-gray-500">{last.year}</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-gray-400 mb-1">Peak Net Worth</div>
          <div className="text-lg font-semibold text-green-400">{$(peakNetWorth)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-gray-400 mb-1">Final Cash</div>
          <div className={`text-lg font-semibold ${last.endingCash >= 0 ? 'text-gray-300' : 'text-red-400'}`}>
            {$(last.endingCash)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-gray-400 mb-1">Total Taxes Paid</div>
          <div className="text-lg font-semibold text-gray-300">{$(totalTaxPaid)}</div>
          <div className="text-xs text-gray-500">over {yearSpan} years</div>
        </div>
      </div>

      <ResultsChart results={displayResults} />
      <ResultsTable results={displayResults} onCashFlowClick={onCashFlowClick} penaltyCutoff={penaltyCutoff} />
    </div>
  );
}
