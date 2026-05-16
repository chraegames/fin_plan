import type { TimePeriodValue } from '../models/types';
import { START_YEAR, END_YEAR } from '../engine/constants';
import NumericInput from './NumericInput';

interface Props {
  periods: TimePeriodValue[];
  onChange: (periods: TimePeriodValue[]) => void;
  amountLabel?: string;
}

export default function TimePeriodEditor({ periods, onChange, amountLabel = 'Amount' }: Props) {
  const update = (index: number, field: keyof TimePeriodValue, value: number) => {
    const next = periods.map((p, i) => i === index ? { ...p, [field]: value } : p);
    onChange(next);
  };

  const addPeriod = () => {
    const lastEnd = periods.length > 0 ? periods[periods.length - 1].endYear : START_YEAR - 1;
    onChange([...periods, { startYear: lastEnd + 1, endYear: END_YEAR, amount: 0 }]);
  };

  const removePeriod = (index: number) => {
    onChange(periods.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {periods.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <NumericInput
            value={p.startYear}
            onChange={v => update(i, 'startYear', v)}
            min={String(START_YEAR)}
            max={String(END_YEAR)}
            className="w-20 border border-gray-600 rounded px-1 py-1 text-sm text-center bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-500">&ndash;</span>
          <NumericInput
            value={p.endYear}
            onChange={v => update(i, 'endYear', v)}
            min={String(START_YEAR)}
            max={String(END_YEAR)}
            className="w-20 border border-gray-600 rounded px-1 py-1 text-sm text-center bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-500">$</span>
          <NumericInput
            value={p.amount}
            onChange={v => update(i, 'amount', v)}
            className="w-24 border border-gray-600 rounded px-2 py-1 bg-gray-600 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder={amountLabel}
          />
          {periods.length > 1 && (
            <button
              onClick={() => removePeriod(i)}
              className="text-red-400 hover:text-red-300 text-xs px-1"
              title="Remove period"
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addPeriod}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        + Add period
      </button>
    </div>
  );
}
