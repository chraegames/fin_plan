import { Icon } from '../../primitives/Icon';
import type { TimePeriodValue } from '../../../models/types';
import { PeriodRow } from './PeriodRow';

interface PeriodListProps {
  periods: TimePeriodValue[];
  onChange: (periods: TimePeriodValue[]) => void;
  minYear: number;
  maxYear: number;
  suffix?: string;
}

/**
 * The "one or more time periods" widget used by every per-item editor.
 * Renders each period as a PeriodRow plus a dashed "Add period" button
 * that appends a new period starting the year after the last one ends.
 */
export function PeriodList({ periods, onChange, minYear, maxYear, suffix }: PeriodListProps) {
  return (
    <>
      {periods.map((p, pi) => (
        <PeriodRow
          key={pi}
          period={p}
          onChange={next =>
            onChange(periods.map((pp, ppi) => (ppi === pi ? next : pp)))
          }
          onRemove={
            periods.length > 1
              ? () => onChange(periods.filter((_, ppi) => ppi !== pi))
              : undefined
          }
          minYear={minYear}
          maxYear={maxYear}
          suffix={suffix}
        />
      ))}
      <button
        onClick={() => {
          const last = periods[periods.length - 1];
          onChange([
            ...periods,
            {
              startYear: last ? Math.min(last.endYear + 1, maxYear) : minYear,
              endYear: maxYear,
              amount: 0,
            },
          ]);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 30,
          fontSize: 12,
          background: 'transparent',
          border: '1px dashed var(--border-strong)',
          borderRadius: 8,
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        <Icon name="plus" size={12} /> Add period
      </button>
    </>
  );
}
