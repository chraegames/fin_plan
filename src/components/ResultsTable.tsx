import { useState, useRef, useCallback, useEffect } from 'react';
import type { YearResult, SimulationResult, NamedAmount } from '../models/types';
import { formatDollars as $ } from '../utils/format';

interface TooltipState {
  items: NamedAmount[];
  x: number;
  y: number;
}

function useBreakdownTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const show = useCallback((e: React.MouseEvent, items: NamedAmount[]) => {
    if (items.length === 0) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ items, x: rect.right, y: rect.bottom + 2 });
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setTooltip(null), 50);
  }, []);

  return { tooltip, show, hide };
}

interface Props {
  results: SimulationResult;
  onCashFlowClick: (yearResult: YearResult) => void;
  penaltyCutoff: number;
}

export default function ResultsTable({ results, onCashFlowClick, penaltyCutoff }: Props) {
  const { tooltip, show, hide } = useBreakdownTooltip();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide p-4 pb-2">Year-by-Year Detail</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ fontFamily: '"Tabular Nums", ui-monospace, SFMono-Regular, Menlo, monospace', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            {/* Group headers */}
            <tr className="bg-gray-900">
              <th rowSpan={2} className="text-left px-3 py-1.5 font-medium text-gray-400 sticky left-0 bg-gray-900 border-b border-gray-700"></th>
              <th colSpan={2} className="text-center px-3 pt-2 pb-0.5 font-semibold text-emerald-400 border-b-0 border-l border-gray-700">
                Money In
              </th>
              <th colSpan={2} className="text-center px-3 pt-2 pb-0.5 font-semibold text-rose-400 border-b-0 border-l border-gray-700">
                Money Out
              </th>
              <th rowSpan={2} className="text-right px-3 py-1.5 font-medium text-gray-400 border-b border-gray-700 border-l border-gray-700">
                Cash Flow
              </th>
              <th colSpan={5} className="text-center px-3 pt-2 pb-0.5 font-semibold text-blue-400 border-b-0 border-l border-gray-700">
                Balances
              </th>
            </tr>
            {/* Sub headers */}
            <tr className="bg-gray-900 border-b border-gray-700">
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 border-l border-gray-700">Income</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">Withdrawals</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 border-l border-gray-700">Expenses</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">Tax</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 border-l border-gray-700">Cash</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">Brokerage</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">Roth</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">IRA</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400">Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.year} className={`group/row ${r.year === penaltyCutoff - 1 ? 'border-b-2 border-amber-500' : 'border-b border-gray-700'}`}>
                {/* Year */}
                <td className="px-3 py-1.5 font-medium text-gray-300 sticky left-0 bg-gray-800 group-hover/row:bg-gray-700">{r.year}</td>

                {/* Money In */}
                <td
                  className="text-right px-3 py-1.5 text-emerald-400 bg-emerald-900/20 group-hover/row:bg-gray-700 border-l border-gray-700 cursor-default"
                  onMouseEnter={e => show(e, r.incomeBreakdown)}
                  onMouseLeave={hide}
                >
                  {$(r.totalIncome)}
                </td>
                <td
                  className="text-right px-3 py-1.5 text-emerald-400 bg-emerald-900/20 group-hover/row:bg-gray-700 cursor-default"
                  onMouseEnter={e => show(e, r.withdrawalBreakdown)}
                  onMouseLeave={hide}
                >
                  {$(r.withdrawalsBrokerage + r.withdrawalsRoth + r.withdrawalsIra)}
                </td>

                {/* Money Out */}
                <td
                  className="text-right px-3 py-1.5 text-rose-400 bg-rose-900/20 group-hover/row:bg-gray-700 border-l border-gray-700 cursor-default"
                  onMouseEnter={e => show(e, r.expenseBreakdown)}
                  onMouseLeave={hide}
                >
                  {$(r.totalExpenses)}
                </td>
                <td className="text-right px-3 py-1.5 text-rose-400 bg-rose-900/20 group-hover/row:bg-gray-700">{$(r.totalTax)}</td>

                {/* Cash Flow */}
                <td
                  className={`text-right px-3 py-1.5 font-semibold cursor-pointer underline decoration-dotted underline-offset-2 hover:opacity-70 border-l border-gray-700 group-hover/row:bg-gray-700 ${r.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  onClick={() => onCashFlowClick(r)}
                  title="Click to adjust withdrawals"
                >
                  {$(r.netCashFlow)}
                </td>

                {/* Balances */}
                <td className={`text-right px-3 py-1.5 bg-blue-900/20 group-hover/row:bg-gray-700 border-l border-gray-700 ${r.endingCash >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {$(r.endingCash)}
                </td>
                <td className={`text-right px-3 py-1.5 bg-blue-900/20 group-hover/row:bg-gray-700 ${r.brokerageBalance > 0 ? 'text-blue-400' : 'text-red-400 font-semibold'}`}>
                  {$(r.brokerageBalance)}
                </td>
                <td className={`text-right px-3 py-1.5 bg-blue-900/20 group-hover/row:bg-gray-700 ${r.rothBalance > 0 ? 'text-blue-400' : 'text-red-400 font-semibold'}`}>
                  {$(r.rothBalance)}
                </td>
                <td className={`text-right px-3 py-1.5 bg-blue-900/20 group-hover/row:bg-gray-700 ${r.iraBalance > 0 ? 'text-blue-400' : 'text-red-400 font-semibold'}`}>
                  {$(r.iraBalance)}
                </td>
                <td className="text-right px-3 py-1.5 font-semibold text-blue-300 bg-blue-900/20 group-hover/row:bg-gray-700">{$(r.totalNetWorth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-700 text-white text-xs rounded shadow-lg px-3 py-2 whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-100%)' }}
        >
          {tooltip.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-gray-300">{item.name}</span>
              <span>{$(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
