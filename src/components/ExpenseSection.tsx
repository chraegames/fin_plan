import { useState } from 'react';
import type { ExpenseItem, ExpenseFrequency } from '../models/types';
import { generateId } from '../engine/defaults';
import { START_YEAR, END_YEAR } from '../engine/constants';
import TimePeriodEditor from './TimePeriodEditor';

interface Props {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
}

export default function ExpenseSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateItem = (index: number, updates: Partial<ExpenseItem>) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const addItem = () => {
    const id = generateId();
    setExpanded(prev => new Set(prev).add(id));
    onChange([...items, {
      id,
      name: 'New Expense',
      frequency: 'monthly',
      applyInflation: true,
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 0 }],
    }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wide">Expenses</h3>
        <button onClick={addItem} className="text-xs bg-rose-900/30 text-rose-400 hover:bg-rose-800/40 px-2 py-1 rounded">
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <button
            onClick={addItem}
            className="w-full text-xs text-gray-500 hover:text-rose-400 border border-dashed border-gray-700 hover:border-rose-700 rounded px-3 py-3 transition-colors"
          >
            No expenses yet &mdash; add housing, living costs, healthcare, or other.
          </button>
        )}
        {items.map((item, i) => {
          const isOpen = expanded.has(item.id);
          return (
            <div key={item.id} className="bg-gray-700 rounded-lg p-3 space-y-2">
              {isOpen ? (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(item.id)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9660;</button>
                    <input
                      value={item.name}
                      onChange={e => updateItem(i, { name: e.target.value })}
                      className="flex-1 border border-gray-600 rounded px-2 py-1 text-sm bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    <select
                      value={item.frequency}
                      onChange={e => updateItem(i, { frequency: e.target.value as ExpenseFrequency })}
                      className="border border-gray-600 rounded px-2 py-1 text-sm bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-300 text-sm px-1"
                    >
                      &times;
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.applyInflation !== false}
                      onChange={e => updateItem(i, { applyInflation: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-600 text-rose-500 focus:ring-rose-400 focus:ring-offset-0"
                    />
                    Apply inflation
                  </label>
                  <div className="text-xs text-gray-500 mb-1">
                    {item.frequency === 'monthly' ? 'Monthly' : 'Annual'} amount per period:
                  </div>
                  <TimePeriodEditor
                    periods={item.periods}
                    onChange={periods => updateItem(i, { periods })}
                    amountLabel={item.frequency === 'monthly' ? '/mo' : '/yr'}
                  />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(item.id)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">&#9654;</button>
                  <span className="text-sm text-gray-300 cursor-pointer flex-1" onClick={() => toggle(item.id)}>{item.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
