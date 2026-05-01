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

function ActualInput({ value, projected, onChange }: {
  value: number | undefined;
  projected: string;
  onChange: (v: number | undefined) => void;
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
      className={`w-24 bg-gray-900 text-sm rounded px-2 py-1 border text-right
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
    // Store monthly actuals as year.01, year.02, etc. encoded in a single number
    // Actually, let's store monthly data as: year -> 12-element concept
    // We'll encode 12 months into the record using year * 100 + month as key
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

  return (
    <div className="max-w-[120rem] mx-auto px-4 py-6 space-y-6">
      <p className="text-sm text-gray-400">
        Enter actual amounts for past/current years. Empty cells use the projected value. Blue borders indicate entered actuals.
      </p>

      {/* Income Section */}
      {input.incomes.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-emerald-400 mb-4">Income</h3>
          <div className="space-y-4">
            {input.incomes.map(inc => {
              const years = getYearsForItem(inc.periods);
              if (years.length === 0) return null;
              return (
                <div key={inc.id}>
                  <div className="text-sm text-gray-200 mb-2">{inc.name} <span className="text-gray-500 text-xs">({inc.type})</span></div>
                  <div className="flex flex-wrap gap-2">
                    {years.map(year => (
                      <div key={year} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{year}</span>
                        <ActualInput
                          value={actuals.incomes[inc.id]?.[year]}
                          projected={$(resolveAmount(inc.periods, year))}
                          onChange={v => updateActual('incomes', inc.id, year, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses Section */}
      {input.expenses.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-rose-400 mb-4">Expenses</h3>
          <div className="space-y-4">
            {input.expenses.map(exp => {
              const years = getYearsForItem(exp.periods);
              if (years.length === 0) return null;
              const isMonthly = exp.frequency === 'monthly';
              return (
                <div key={exp.id}>
                  <div className="text-sm text-gray-200 mb-2">
                    {exp.name}
                    <span className="text-gray-500 text-xs ml-1">({exp.frequency})</span>
                  </div>
                  {isMonthly ? (
                    <div className="space-y-3">
                      {years.map(year => {
                        const projectedMonthly = resolveAmount(exp.periods, year);
                        const monthlyTotal = getMonthlyTotal(exp.id, year);
                        return (
                          <div key={year}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-400 w-10">{year}</span>
                              {monthlyTotal != null && (
                                <span className="text-xs text-gray-500">
                                  Total: {$(monthlyTotal)}/yr (projected: {$(projectedMonthly * 12)}/yr)
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-6 gap-1 ml-10">
                              {MONTH_LABELS.map((label, mi) => (
                                <div key={mi} className="flex flex-col items-center gap-0.5">
                                  <span className="text-[10px] text-gray-600">{label}</span>
                                  <ActualInput
                                    value={getMonthlyActual(exp.id, year, mi)}
                                    projected={$(projectedMonthly)}
                                    onChange={v => updateMonthlyActual(exp.id, year, mi, v)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {years.map(year => (
                        <div key={year} className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-500">{year}</span>
                          <ActualInput
                            value={actuals.expenses[exp.id]?.[year]}
                            projected={$(resolveAmount(exp.periods, year))}
                            onChange={v => updateActual('expenses', exp.id, year, v)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Withdrawals Section — always show all 3 account types */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-amber-400 mb-4">Withdrawals</h3>
        <div className="space-y-4">
          {([['brokerage', 'Brokerage'], ['roth', 'Roth'], ['ira', 'IRA']] as const).map(([acctType, label]) => {
            const allYears: number[] = [];
            for (let y = START_YEAR; y <= CURRENT_YEAR; y++) allYears.push(y);
            if (allYears.length === 0) return null;
            const projectedForYear = (year: number) =>
              input.withdrawals
                .filter(wd => wd.accountType === acctType)
                .reduce((sum, wd) => sum + resolveAmount(wd.periods, year), 0);
            return (
              <div key={acctType}>
                <div className="text-sm text-gray-200 mb-2">{label}</div>
                <div className="flex flex-wrap gap-2">
                  {allYears.map(year => (
                    <div key={year} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{year}</span>
                      <ActualInput
                        value={actuals.withdrawals[acctType]?.[year]}
                        projected={$(projectedForYear(year))}
                        onChange={v => updateWithdrawalActual(acctType, year, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Balance Section — year-end cash override */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-cyan-400 mb-1">Cash Balance (Year-End)</h3>
        <p className="text-xs text-gray-500 mb-4">
          Overrides the simulated end-of-year cash. Propagates forward as next year's starting cash.
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).map(year => {
            const projected = results.find(r => r.year === year)?.endingCash ?? 0;
            return (
              <div key={year} className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{year}</span>
                <ActualInput
                  value={actuals.endingCash?.[year]}
                  projected={$(projected)}
                  onChange={v => updateEndingCashActual(year, v)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment Balances Section — year-end balance per account */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-cyan-400 mb-1">Investment Balances (Year-End)</h3>
        <p className="text-xs text-gray-500 mb-4">
          Overrides the simulated end-of-year balance. Propagates forward as next year's starting balance.
        </p>
        <div className="space-y-4">
          {([['brokerage', 'Brokerage'], ['roth', 'Roth'], ['ira', 'IRA']] as const).map(([acctType, label]) => {
            const allYears: number[] = [];
            for (let y = START_YEAR; y <= CURRENT_YEAR; y++) allYears.push(y);
            if (allYears.length === 0) return null;
            const balanceKey = `${acctType}Balance` as 'brokerageBalance' | 'rothBalance' | 'iraBalance';
            const projectedForYear = (year: number) => {
              const yr = results.find(r => r.year === year);
              return yr ? yr[balanceKey] : 0;
            };
            return (
              <div key={acctType}>
                <div className="text-sm text-gray-200 mb-2">{label}</div>
                <div className="flex flex-wrap gap-2">
                  {allYears.map(year => (
                    <div key={year} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{year}</span>
                      <ActualInput
                        value={actuals.endingBalances?.[acctType]?.[year]}
                        projected={$(projectedForYear(year))}
                        onChange={v => updateEndingBalanceActual(acctType, year, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
