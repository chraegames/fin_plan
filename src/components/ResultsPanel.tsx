import { useMemo } from 'react';
import type { SimulationResult, YearResult } from '../models/types';
import { formatDollars as $ } from '../utils/format';
import ResultsChart from './ResultsChart';
import ResultsTable from './ResultsTable';

interface Props {
  results: SimulationResult | null;
  onCashFlowClick: (yearResult: YearResult) => void;
}

export default function ResultsPanel({ results, onCashFlowClick }: Props) {
  const summary = useMemo(() => {
    if (!results || results.length === 0) return null;
    const last = results[results.length - 1];
    let totalTaxPaid = 0;
    let peakNetWorth = -Infinity;
    for (const r of results) {
      totalTaxPaid += r.totalTax;
      if (r.totalNetWorth > peakNetWorth) peakNetWorth = r.totalNetWorth;
    }
    return { last, totalTaxPaid, peakNetWorth };
  }, [results]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Click "Calculate" to run the simulation
      </div>
    );
  }

  const { last, totalTaxPaid, peakNetWorth } = summary;

  return (
    <div className="space-y-4">
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
          <div className="text-xs text-gray-500">over 40 years</div>
        </div>
      </div>

      <ResultsChart results={results!} />
      <ResultsTable results={results!} onCashFlowClick={onCashFlowClick} />
    </div>
  );
}
