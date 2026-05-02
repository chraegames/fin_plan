import { useState } from 'react';
import type { PlanInput, ActualsData, AccountType, SimulationResult } from '../models/types';
import { resolveAmount } from '../engine/resolve';
import { START_YEAR } from '../engine/constants';
import { formatDollars as $ } from '../utils/format';

interface Props {
  input: PlanInput;
  actuals: ActualsData;
  results: SimulationResult;
  onActualsChange: (actuals: ActualsData) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCOUNT_ROWS = [
  ['brokerage', 'Brokerage'],
  ['roth', 'Roth'],
  ['ira', 'IRA'],
] as const;

function ActualInput({ value, projected, onChange, widthClass = 'w-24' }: {
  value: number | undefined;
  projected: string;
  onChange: (v: number | undefined) => void;
  widthClass?: string;
}) {
  const [raw, setRaw] = useState(value != null ? String(value) : '');
  // Derived-state sync: adopt the parent's value during render when it
  // changes, instead of running an effect after render.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setRaw(value != null ? String(value) : '');
  }

  return (
    <input
      type="number"
      value={raw}
      placeholder={projected}
      className={`${widthClass} bg-gray-900 text-sm rounded px-2 py-1 border text-right
        ${value != null ? 'text-gray-100 border-blue-600' : 'text-gray-500 border-gray-700'}
        focus:border-blue-500 focus:outline-none`}
      onFocus={e => e.target.select()}
      onChange={e => {
        const text = e.target.value;
        setRaw(text);
        if (text === '') {
          onChange(undefined);
        } else {
          const n = Number(text);
          if (!isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => setRaw(value != null ? String(value) : '')}
    />
  );
}

function getYearsForItem(periods: { startYear: number; endYear: number }[]): number[] {
  const years: number[] = [];
  for (let y = START_YEAR; y <= CURRENT_YEAR; y++) {
    if (periods.some(p => y >= p.startYear && y <= p.endYear)) {
      years.push(y);
    }
  }
  return years;
}

export default function ActualsPanel({ input, actuals, results, onActualsChange }: Props) {
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);

  const updateActual = (
    category: 'incomes' | 'expenses',
    itemId: string,
    year: number,
    value: number | undefined,
  ) => {
    const catData = { ...actuals[category] };
    if (value != null) {
      catData[itemId] = { ...catData[itemId], [year]: value };
    } else {
      if (catData[itemId]) {
        const yearData = { ...catData[itemId] };
        delete yearData[year];
        if (Object.keys(yearData).length === 0) {
          delete catData[itemId];
        } else {
          catData[itemId] = yearData;
        }
      }
    }
    onActualsChange({ ...actuals, [category]: catData });
  };

  const updateWithdrawalActual = (
    acctType: AccountType,
    year: number,
    value: number | undefined,
  ) => {
    const wdData = { ...actuals.withdrawals };
    if (value != null) {
      wdData[acctType] = { ...wdData[acctType], [year]: value };
    } else {
      if (wdData[acctType]) {
        const yearData = { ...wdData[acctType] };
        delete yearData[year];
        if (Object.keys(yearData).length === 0) {
          delete wdData[acctType];
        } else {
          wdData[acctType] = yearData;
        }
      }
    }
    onActualsChange({ ...actuals, withdrawals: wdData });
  };

  const updateEndingBalanceActual = (
    acctType: AccountType,
    year: number,
    value: number | undefined,
  ) => {
    const ebData = { ...(actuals.endingBalances ?? {}) };
    if (value != null) {
      ebData[acctType] = { ...ebData[acctType], [year]: value };
    } else {
      if (ebData[acctType]) {
        const yearData = { ...ebData[acctType] };
        delete yearData[year];
        if (Object.keys(yearData).length === 0) {
          delete ebData[acctType];
        } else {
          ebData[acctType] = yearData;
        }
      }
    }
    onActualsChange({ ...actuals, endingBalances: ebData });
  };

  const updateEndingCashActual = (year: number, value: number | undefined) => {
    const cashData = { ...(actuals.endingCash ?? {}) };
    if (value != null) {
      cashData[year] = value;
    } else {
      delete cashData[year];
    }
    onActualsChange({ ...actuals, endingCash: cashData });
  };

  const updateMonthlyActual = (
    itemId: string,
    year: number,
    monthIndex: number,
    value: number | undefined,
  ) => {
    const key = year * 100 + monthIndex;
    updateActual('expenses', itemId, key, value);
  };

  const getMonthlyActual = (itemId: string, year: number, monthIndex: number): number | undefined => {
    const key = year * 100 + monthIndex;
    return actuals.expenses[itemId]?.[key];
  };

  const getMonthlyTotal = (itemId: string, year: number): number | undefined => {
    let hasAny = false;
    let total = 0;
    for (let m = 0; m < 12; m++) {
      const v = getMonthlyActual(itemId, year, m);
      if (v != null) {
        hasAny = true;
        total += v;
      }
    }
    return hasAny ? total : undefined;
  };

  const noActualsYears = CURRENT_YEAR < START_YEAR;

  if (noActualsYears) {
    return (
      <div className="max-w-[120rem] mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center text-gray-400">
          Actuals tracking will be available starting in {START_YEAR}.
        </div>
      </div>
    );
  }

  const years: number[] = [];
  for (let y = START_YEAR; y <= CURRENT_YEAR; y++) years.push(y);

  const projectedCashEnd = results.find(r => r.year === activeYear)?.endingCash ?? 0;
  const projectedAcctEnd = (acctType: AccountType): number => {
    const balanceKey = `${acctType}Balance` as 'brokerageBalance' | 'rothBalance' | 'iraBalance';
    return results.find(r => r.year === activeYear)?.[balanceKey] ?? 0;
  };
  const projectedWithdrawal = (acctType: AccountType): number =>
    input.withdrawals
      .filter(wd => wd.accountType === acctType)
      .reduce((sum, wd) => sum + resolveAmount(wd.periods, activeYear), 0);

  const incomesForYear = input.incomes.filter(inc => getYearsForItem(inc.periods).includes(activeYear));
  const expensesForYear = input.expenses.filter(exp => getYearsForItem(exp.periods).includes(activeYear));

  // 14 columns total: Item (1) + months (12) + Total (1).
  const TOTAL_COLS = 14;

  return (
    <div className="max-w-[120rem] mx-auto px-4 py-6">
      <p className="text-sm text-gray-400 mb-4">
        Enter actual amounts for the selected year. Empty cells use the projected value. Blue borders indicate entered actuals.
      </p>
      <div className="flex gap-4">
        {/* Year sidebar */}
        <nav className="flex flex-col shrink-0 self-start sticky top-20">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={`text-sm font-medium px-3 py-2 border-l-2 transition-colors text-left ${
                y === activeYear
                  ? 'text-blue-400 border-blue-400 bg-gray-800/60'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
              }`}
            >
              {y}
            </button>
          ))}
        </nav>

        {/* Right pane */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Year-end balances */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-cyan-400 mb-1">Year-End Balances ({activeYear})</h3>
            <p className="text-xs text-gray-500 mb-3">
              Overrides the simulated end-of-year value. Propagates forward as next year's starting value.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Cash</span>
                <ActualInput
                  value={actuals.endingCash?.[activeYear]}
                  projected={$(projectedCashEnd)}
                  onChange={v => updateEndingCashActual(activeYear, v)}
                />
              </div>
              {ACCOUNT_ROWS.map(([acctType, label]) => (
                <div key={acctType} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">{label}</span>
                  <ActualInput
                    value={actuals.endingBalances?.[acctType]?.[activeYear]}
                    projected={$(projectedAcctEnd(acctType))}
                    onChange={v => updateEndingBalanceActual(acctType, activeYear, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-x-auto">
            <table className="text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left font-normal pr-4 pb-2 min-w-[10rem]">Item</th>
                  {MONTH_LABELS.map(m => (
                    <th key={m} className="font-normal px-1 pb-2 text-center">{m}</th>
                  ))}
                  <th className="font-normal pl-3 pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* INCOME */}
                {incomesForYear.length > 0 && (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="pt-2 pb-1 text-xs font-semibold text-emerald-400">Income</td>
                  </tr>
                )}
                {incomesForYear.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-800/40">
                    <td className="pr-4 py-1 text-gray-200">
                      {inc.name}
                      <span className="text-gray-500 text-xs ml-1">({inc.type})</span>
                    </td>
                    <td colSpan={12} className="py-1 text-center text-xs text-gray-700">—</td>
                    <td className="pl-3 py-1">
                      <ActualInput
                        value={actuals.incomes[inc.id]?.[activeYear]}
                        projected={$(resolveAmount(inc.periods, activeYear))}
                        onChange={v => updateActual('incomes', inc.id, activeYear, v)}
                      />
                    </td>
                  </tr>
                ))}

                {/* EXPENSES */}
                {expensesForYear.length > 0 && (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="pt-3 pb-1 text-xs font-semibold text-rose-400">Expenses</td>
                  </tr>
                )}
                {expensesForYear.map(exp => {
                  const projected = resolveAmount(exp.periods, activeYear);
                  if (exp.frequency === 'monthly') {
                    const total = getMonthlyTotal(exp.id, activeYear);
                    const projectedTotal = projected * 12;
                    return (
                      <tr key={exp.id} className="hover:bg-gray-800/40">
                        <td className="pr-4 py-1 text-gray-200">
                          {exp.name}
                          <span className="text-gray-500 text-xs ml-1">(monthly)</span>
                        </td>
                        {MONTH_LABELS.map((_, mi) => (
                          <td key={mi} className="px-1 py-1">
                            <ActualInput
                              value={getMonthlyActual(exp.id, activeYear, mi)}
                              projected={$(projected)}
                              onChange={v => updateMonthlyActual(exp.id, activeYear, mi, v)}
                              widthClass="w-20"
                            />
                          </td>
                        ))}
                        <td className="pl-3 py-1 text-right text-xs whitespace-nowrap">
                          {total != null ? (
                            <span className="text-gray-200">{$(total)}</span>
                          ) : (
                            <span className="text-gray-600">{$(projectedTotal)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={exp.id} className="hover:bg-gray-800/40">
                      <td className="pr-4 py-1 text-gray-200">
                        {exp.name}
                        <span className="text-gray-500 text-xs ml-1">(annual)</span>
                      </td>
                      <td colSpan={12} className="py-1 text-center text-xs text-gray-700">—</td>
                      <td className="pl-3 py-1">
                        <ActualInput
                          value={actuals.expenses[exp.id]?.[activeYear]}
                          projected={$(projected)}
                          onChange={v => updateActual('expenses', exp.id, activeYear, v)}
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* WITHDRAWALS */}
                <tr>
                  <td colSpan={TOTAL_COLS} className="pt-3 pb-1 text-xs font-semibold text-amber-400">Withdrawals</td>
                </tr>
                {ACCOUNT_ROWS.map(([acctType, label]) => (
                  <tr key={acctType} className="hover:bg-gray-800/40">
                    <td className="pr-4 py-1 text-gray-200">{label}</td>
                    <td colSpan={12} className="py-1 text-center text-xs text-gray-700">—</td>
                    <td className="pl-3 py-1">
                      <ActualInput
                        value={actuals.withdrawals[acctType]?.[activeYear]}
                        projected={$(projectedWithdrawal(acctType))}
                        onChange={v => updateWithdrawalActual(acctType, activeYear, v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
