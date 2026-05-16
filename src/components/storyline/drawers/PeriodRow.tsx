import { Icon } from '../../primitives/Icon';
import { MoneyInput, YearInput } from '../../primitives/Input';
import type { TimePeriodValue } from '../../../models/types';

interface PeriodRowProps {
  period: TimePeriodValue;
  onChange: (next: TimePeriodValue) => void;
  onRemove?: () => void;
  minYear: number;
  maxYear: number;
  suffix?: string;
}

export function PeriodRow({
  period,
  onChange,
  onRemove,
  minYear,
  maxYear,
  suffix,
}: PeriodRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 16px 90px 1fr auto',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <YearInput
        value={period.startYear}
        onChange={v => onChange({ ...period, startYear: v, endYear: Math.max(v, period.endYear) })}
        min={minYear}
        max={maxYear}
      />
      <span style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>—</span>
      <YearInput
        value={period.endYear}
        onChange={v => onChange({ ...period, endYear: Math.max(period.startYear, v) })}
        min={minYear}
        max={maxYear}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MoneyInput
          value={period.amount}
          onChange={v => onChange({ ...period, amount: v })}
          width="100%"
        />
        {suffix && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{suffix}</span>
        )}
      </div>
      {onRemove ? (
        <button
          onClick={onRemove}
          aria-label="Remove period"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            color: 'var(--ink-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={12} />
        </button>
      ) : (
        <span style={{ width: 24 }} />
      )}
    </div>
  );
}
