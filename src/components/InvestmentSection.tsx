import type { PlanInput } from '../models/types';
import NumericInput from './NumericInput';
import { earlyWithdrawalCutoff } from '../engine/constants';

interface Props {
  input: PlanInput;
  onChange: (updates: Partial<PlanInput>) => void;
}

export default function InvestmentSection({ input, onChange }: Props) {
  const cutoff = earlyWithdrawalCutoff(input.birthYear);
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">About You &amp; Starting Balances</h3>
      <div className="space-y-3">
        {/* Birth Year */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Birth year</span>
          <NumericInput
            value={input.birthYear}
            onChange={v => onChange({ birthYear: v })}
            className="w-24 border border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-500">10% early-withdrawal penalty ends in {cutoff}</span>
        </div>

        <div className="border-t border-gray-700" />

        {/* Cash */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Cash</span>
          <span className="text-gray-500 text-sm">$</span>
          <NumericInput
            value={input.startingCash}
            onChange={v => onChange({ startingCash: v })}
            className="flex-1 border border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="border-t border-gray-700" />

        {/* Brokerage */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Brokerage</span>
          <span className="text-gray-500 text-sm">$</span>
          <NumericInput
            value={input.brokerageBalance}
            onChange={v => onChange({ brokerageBalance: v })}
            className="flex-1 border border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-24 shrink-0 pl-3">Cost basis</span>
          <span className="text-gray-500 text-xs">$</span>
          <NumericInput
            value={input.brokerageBasis}
            onChange={v => onChange({ brokerageBasis: v })}
            className="flex-1 border border-gray-600 rounded px-2 py-1 text-xs bg-gray-700 text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-500" title="What you originally paid; the rest is unrealized gain taxed when sold.">?</span>
        </div>

        {/* Roth */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Roth</span>
          <span className="text-gray-500 text-sm">$</span>
          <NumericInput
            value={input.rothBalance}
            onChange={v => onChange({ rothBalance: v })}
            className="flex-1 border border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* IRA */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">IRA</span>
          <span className="text-gray-500 text-sm">$</span>
          <NumericInput
            value={input.iraBalance}
            onChange={v => onChange({ iraBalance: v })}
            className="flex-1 border border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="border-t border-gray-700" />

        {/* Return */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Return</span>
          <NumericInput
            value={Math.round(input.returnRate * 1000) / 10}
            onChange={v => onChange({ returnRate: v / 100 })}
            step="0.1"
            className="w-16 border border-gray-600 rounded px-2 py-1 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-500 text-xs">%</span>
        </div>

        {/* Inflation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-24 shrink-0">Inflation</span>
          <NumericInput
            value={Math.round(input.inflationRate * 1000) / 10}
            onChange={v => onChange({ inflationRate: v / 100 })}
            step="0.1"
            className="w-16 border border-gray-600 rounded px-2 py-1 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-500 text-xs">%</span>
        </div>
      </div>
    </div>
  );
}
