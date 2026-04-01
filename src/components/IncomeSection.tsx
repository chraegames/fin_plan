import { useState } from 'react';
import type { IncomeItem, IncomeType } from '../models/types';
import { generateId } from '../engine/defaults';
import { START_YEAR, END_YEAR } from '../engine/constants';
import TimePeriodEditor from './TimePeriodEditor';

interface Props {
  items: IncomeItem[];
  onChange: (items: IncomeItem[]) => void;
}

export default function IncomeSection({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateItem = (index: number, updates: Partial<IncomeItem>) => {
    onChange(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const addItem = () => {
    const id = generateId();
    setExpanded(prev => new Set(prev).add(id));
    onChange([...items, {
      id,
      name: 'New Income',
      type: 'taxable',
      periods: [{ startYear: START_YEAR, endYear: END_YEAR, amount: 0 }],
    }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Income</h3>
        <button onClick={addItem} className="text-xs bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40 px-2 py-1 rounded">
          + Add
        </button>
      </div>
      <div className="space-y-3">
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
                      className="flex-1 border border-gray-600 rounded px-2 py-1 text-sm bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <select
                      value={item.type}
                      onChange={e => updateItem(i, { type: e.target.value as IncomeType })}
                      className="border border-gray-600 rounded px-2 py-1 text-sm bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="taxable">Taxable</option>
                      <option value="non-taxable">Non-taxable</option>
                    </select>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-300 text-sm px-1"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Annual amount per period:</div>
                  <TimePeriodEditor
                    periods={item.periods}
                    onChange={periods => updateItem(i, { periods })}
                    amountLabel="/yr"
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
