import { PercentInput, YearInput } from '../../primitives/Input';
import type { PlanInput } from '../../../models/types';
import { MIN_YEAR, MAX_YEAR, earlyWithdrawalCutoff } from '../../../engine/constants';

interface ReturnsEditorProps {
  input: PlanInput;
  onChange: (updates: Partial<PlanInput>) => void;
}

export function ReturnsEditor({ input, onChange }: ReturnsEditorProps) {
  const cutoff = earlyWithdrawalCutoff(input.birthYear);
  const horizon = input.endYear - input.startYear + 1;
  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-card)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <Row
        label="Annual return"
        hint="Applied to brokerage, Roth, and IRA balances every year"
        control={
          <PercentInput
            value={input.returnRate}
            onChange={v => onChange({ returnRate: v })}
            width="100%"
          />
        }
      />
      <Row
        label="Inflation"
        hint="Applied to expenses with the inflation flag enabled"
        control={
          <PercentInput
            value={input.inflationRate}
            onChange={v => onChange({ inflationRate: v })}
            width="100%"
          />
        }
      />
      <Row
        label="Birth year"
        hint={`Penalty-free withdrawals begin ${cutoff}`}
        control={
          <YearInput
            value={input.birthYear}
            onChange={v => onChange({ birthYear: v })}
            min={MIN_YEAR - 100}
            max={MAX_YEAR}
            width="100%"
          />
        }
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 16px 90px',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink)' }}>Projection horizon</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
            {horizon > 0 ? `${horizon} years` : 'invalid range'}
          </div>
        </div>
        <YearInput
          value={input.startYear}
          onChange={v => onChange({ startYear: v, endYear: Math.max(v, input.endYear) })}
          min={MIN_YEAR}
          max={MAX_YEAR}
        />
        <span style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>—</span>
        <YearInput
          value={input.endYear}
          onChange={v => onChange({ endYear: Math.max(input.startYear, v) })}
          min={MIN_YEAR}
          max={MAX_YEAR}
        />
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{hint}</div>
      </div>
      {control}
    </div>
  );
}
