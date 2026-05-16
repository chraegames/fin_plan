import { useState } from 'react';
import type { YearResult, WithdrawalSchedule, AccountType } from '../models/types';
import { generateId } from '../engine/defaults';
import { formatDollars as $ } from '../utils/format';
import NumericInput from './NumericInput';

interface Props {
  yearResult: YearResult;
  withdrawals: WithdrawalSchedule[];
  onClose: () => void;
  onUpdateWithdrawals: (withdrawals: WithdrawalSchedule[]) => void;
  penaltyCutoff: number;
  startYear: number;
  endYear: number;
}

export default function CashFlowModal({ yearResult: r, withdrawals, onClose, onUpdateWithdrawals, penaltyCutoff, startYear, endYear }: Props) {
  const [localWithdrawals, setLocalWithdrawals] = useState<WithdrawalSchedule[]>(withdrawals);
  const year = r.year;

  const updatePeriod = (wdId: string, periodIdx: number, field: 'startYear' | 'endYear' | 'amount', value: number) => {
    setLocalWithdrawals(prev => prev.map(wd => {
      if (wd.id !== wdId) return wd;
      const newPeriods = wd.periods.map((p, i) => i === periodIdx ? { ...p, [field]: value } : p);
      return { ...wd, periods: newPeriods };
    }));
  };

  const addPeriodToSchedule = (wdId: string) => {
    setLocalWithdrawals(prev => prev.map(wd => {
      if (wd.id !== wdId) return wd;
      const lastEnd = wd.periods.length > 0 ? wd.periods[wd.periods.length - 1].endYear : year - 1;
      return { ...wd, periods: [...wd.periods, { startYear: Math.min(lastEnd + 1, endYear), endYear, amount: 0 }] };
    }));
  };

  const removePeriodFromSchedule = (wdId: string, periodIdx: number) => {
    setLocalWithdrawals(prev => prev.map(wd => {
      if (wd.id !== wdId) return wd;
      return { ...wd, periods: wd.periods.filter((_, i) => i !== periodIdx) };
    }));
  };

  const addWithdrawal = (accountType: AccountType) => {
    setLocalWithdrawals(prev => [...prev, {
      id: generateId(),
      accountType,
      periods: [{ startYear: year, endYear, amount: 0 }],
    }]);
  };

  const removeWithdrawal = (wdId: string) => {
    setLocalWithdrawals(prev => prev.filter(wd => wd.id !== wdId));
  };

  const handleSave = () => {
    onUpdateWithdrawals(localWithdrawals);
    onClose();
  };

  const hasBrokerage = localWithdrawals.some(wd => wd.accountType === 'brokerage');
  const hasRoth = localWithdrawals.some(wd => wd.accountType === 'roth');
  const hasIra = localWithdrawals.some(wd => wd.accountType === 'ira');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-100">Cash Flow — {year}</h3>
            {year < penaltyCutoff && (
              <p className="text-xs text-amber-400 mt-0.5">Early withdrawal penalty applies</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>

        {/* Cash Flow Breakdown */}
        <div className="px-5 py-3 bg-gray-900 border-b border-gray-700 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Income</span>
            <span className="text-gray-300">{$(r.totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expenses</span>
            <span className="text-gray-300">-{$(r.totalExpenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Tax</span>
            <span className="text-gray-300">-{$(r.totalTax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Withdrawals</span>
            <span className="text-gray-300">{$(r.withdrawalsBrokerage + r.withdrawalsRoth + r.withdrawalsIra)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-600 font-semibold">
            <span className="text-gray-300">Net Cash Flow</span>
            <span className={r.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>{$(r.netCashFlow)}</span>
          </div>
        </div>

        {/* Withdrawals Editor */}
        <div className="px-5 py-4 space-y-4 max-h-80 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Withdrawals</div>

          {localWithdrawals.length === 0 && (
            <p className="text-xs text-gray-500">No withdrawals configured.</p>
          )}

          {localWithdrawals.map(schedule => (
            <div key={schedule.id} className="bg-gray-700 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-300 capitalize">{schedule.accountType}</span>
                </div>
                <button
                  onClick={() => removeWithdrawal(schedule.id)}
                  className="text-red-400 hover:text-red-300 text-sm px-1"
                  title="Remove withdrawal"
                >
                  &times;
                </button>
              </div>
              {schedule.periods.map((p, pi) => (
                <div key={pi} className="flex items-center gap-2 text-sm">
                  <NumericInput
                    value={p.startYear}
                    onChange={v => updatePeriod(schedule.id, pi, 'startYear', v)}
                    min={String(startYear)}
                    max={String(endYear)}
                    className="w-20 border border-gray-600 rounded px-1 py-1 text-sm text-center bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <span className="text-gray-500">&ndash;</span>
                  <NumericInput
                    value={p.endYear}
                    onChange={v => updatePeriod(schedule.id, pi, 'endYear', v)}
                    min={String(startYear)}
                    max={String(endYear)}
                    className="w-20 border border-gray-600 rounded px-1 py-1 text-sm text-center bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <span className="text-gray-500">$</span>
                  <NumericInput
                    value={p.amount}
                    onChange={v => updatePeriod(schedule.id, pi, 'amount', v)}
                    className="w-24 border border-gray-600 rounded px-2 py-1 bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <span className="text-xs text-gray-500">/yr</span>
                  {schedule.periods.length > 1 && (
                    <button
                      onClick={() => removePeriodFromSchedule(schedule.id, pi)}
                      className="text-red-400 hover:text-red-300 text-xs px-1"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPeriodToSchedule(schedule.id)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add period
              </button>
            </div>
          ))}

          {(!hasBrokerage || !hasRoth || !hasIra) && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Add withdrawal from:</div>
              <div className="flex flex-wrap gap-2">
                {!hasBrokerage && (
                  <button
                    onClick={() => addWithdrawal('brokerage')}
                    className="text-xs bg-blue-900/30 text-blue-400 hover:bg-blue-800/40 px-2 py-1 rounded"
                  >
                    + Brokerage
                  </button>
                )}
                {!hasRoth && (
                  <button
                    onClick={() => addWithdrawal('roth')}
                    className="text-xs bg-blue-900/30 text-blue-400 hover:bg-blue-800/40 px-2 py-1 rounded"
                  >
                    + Roth
                  </button>
                )}
                {!hasIra && (
                  <button
                    onClick={() => addWithdrawal('ira')}
                    className="text-xs bg-blue-900/30 text-blue-400 hover:bg-blue-800/40 px-2 py-1 rounded"
                  >
                    + IRA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
