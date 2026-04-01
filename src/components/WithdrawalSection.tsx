import { useEffect, useState } from 'react';
import type { WithdrawalSchedule } from '../models/types';
import { generateId } from '../engine/defaults';
import { EARLY_WITHDRAWAL_PENALTY_CUTOFF, EARLY_WITHDRAWAL_PENALTY_RATE, END_YEAR } from '../engine/constants';
import TimePeriodEditor from './TimePeriodEditor';
import NumericInput from './NumericInput';

interface Props {
  items: WithdrawalSchedule[];
  onChange: (items: WithdrawalSchedule[]) => void;
  targetCash: number;
  onTargetCashChange: (value: number) => void;
  onAutoBalance: (targetCash: number) => void;
}

export default function WithdrawalSection({ items, onChange, targetCash, onTargetCashChange, onAutoBalance }: Props) {
  const [brokerageOpen, setBrokerageOpen] = useState(false);
  const [retirementOpen, setRetirementOpen] = useState(false);

  const brokerage = items.find(w => w.accountType === 'brokerage');
  const retirement = items.find(w => w.accountType === 'retirement');

  // Ensure both schedules exist — backfill missing ones on mount
  useEffect(() => {
    if (brokerage && retirement) return;
    const next = [...items];
    if (!brokerage) next.push({ id: generateId(), accountType: 'brokerage', periods: [{ startYear: EARLY_WITHDRAWAL_PENALTY_CUTOFF, endYear: END_YEAR, amount: 0 }] });
    if (!retirement) next.push({ id: generateId(), accountType: 'retirement', periods: [{ startYear: EARLY_WITHDRAWAL_PENALTY_CUTOFF, endYear: END_YEAR, amount: 0 }] });
    onChange(next);
  }, [brokerage, retirement]);

  const updateSchedule = (id: string, updates: Partial<WithdrawalSchedule>) => {
    onChange(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Don't render until both schedules exist
  if (!brokerage || !retirement) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">Withdrawals</h3>

      {/* Auto Balance */}
      <div className="bg-blue-900/30 rounded-lg p-2.5 mb-3 space-y-2">
        <div className="text-xs font-medium text-blue-400">Auto Balance</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-400">Target cash $</span>
          <NumericInput
            value={targetCash}
            onChange={onTargetCashChange}
            className="w-24 border border-blue-700 rounded px-2 py-1 text-sm bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={() => onAutoBalance(targetCash)}
            className="text-xs bg-blue-600 text-white hover:bg-blue-500 px-3 py-1 rounded whitespace-nowrap"
          >
            Generate
          </button>
        </div>
        <p className="text-xs text-blue-400">Replaces withdrawals in this scenario with an optimized schedule.</p>
      </div>

      <div className="space-y-3">
        {/* Brokerage */}
        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
          {brokerageOpen ? (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => setBrokerageOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9660;</button>
                <span className="text-sm font-medium text-gray-300">Brokerage</span>
              </div>
              <div className="text-xs text-gray-500 mb-1">Annual withdrawal per period:</div>
              <TimePeriodEditor
                periods={brokerage.periods}
                onChange={periods => updateSchedule(brokerage.id, { periods })}
                amountLabel="/yr"
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setBrokerageOpen(true)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9654;</button>
              <span className="text-sm text-gray-300 cursor-pointer" onClick={() => setBrokerageOpen(true)}>Brokerage</span>
            </div>
          )}
        </div>

        {/* Retirement */}
        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
          {retirementOpen ? (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => setRetirementOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9660;</button>
                <span className="text-sm font-medium text-gray-300">Retirement</span>
              </div>
              <div className="text-xs text-amber-400 bg-amber-900/30 rounded px-2 py-1">
                {EARLY_WITHDRAWAL_PENALTY_RATE * 100}% early withdrawal penalty applies before {EARLY_WITHDRAWAL_PENALTY_CUTOFF}
              </div>
              <div className="text-xs text-gray-500 mb-1">Annual withdrawal per period:</div>
              <TimePeriodEditor
                periods={retirement.periods}
                onChange={periods => updateSchedule(retirement.id, { periods })}
                amountLabel="/yr"
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setRetirementOpen(true)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9654;</button>
              <span className="text-sm text-gray-300 cursor-pointer" onClick={() => setRetirementOpen(true)}>Retirement</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
