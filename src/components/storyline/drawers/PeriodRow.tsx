import { Icon } from '../../primitives/Icon';
import { MoneyInput, YearInput } from '../../primitives/Input';
import { useIsMobile } from '../../../hooks/useIsMobile';
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
  const isMobile = useIsMobile();

  // YearInput defaults to width: 90 — fine for the desktop fixed-column
  // grid, but needs to fill the 1fr cells in the mobile two-row layout.
  const yearWidth: number | string = isMobile ? '100%' : 90;
  const startYearInput = (
    <YearInput
      value={period.startYear}
      onChange={v => onChange({ ...period, startYear: v, endYear: Math.max(v, period.endYear) })}
      min={minYear}
      max={maxYear}
      width={yearWidth}
    />
  );
  const endYearInput = (
    <YearInput
      value={period.endYear}
      onChange={v => onChange({ ...period, endYear: Math.max(period.startYear, v) })}
      min={minYear}
      max={maxYear}
      width={yearWidth}
    />
  );
  const amountInput = (
    <MoneyInput
      value={period.amount}
      onChange={v => onChange({ ...period, amount: v })}
      width="100%"
    />
  );
  const suffixLabel = suffix && (
    <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{suffix}</span>
  );
  const removeButton = onRemove ? (
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
  );

  if (isMobile) {
    // Two-row layout: years on top, amount on its own row so the
    // MoneyInput has the full drawer width to display in.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 16px 1fr auto',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {startYearInput}
          <span style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>—</span>
          {endYearInput}
          {removeButton}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {amountInput}
          {suffixLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 16px 90px 1fr auto',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {startYearInput}
      <span style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>—</span>
      {endYearInput}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {amountInput}
        {suffixLabel}
      </div>
      {removeButton}
    </div>
  );
}
