import { useMemo } from 'react';
import { MoneyInput, YearInput } from '../../primitives/Input';
import type { PlanInput } from '../../../models/types';
import { earlyWithdrawalCutoff, MIN_YEAR, MAX_YEAR } from '../../../engine/constants';
import { formatDollars } from '../../../utils/format';

interface BalancesEditorProps {
  input: PlanInput;
  onChange: (updates: Partial<PlanInput>) => void;
  /** When true, show a splitter UI with a "remaining" indicator. */
  splitterMode?: boolean;
  splitterTotal?: number;
}

const SWATCHES: Array<{
  key: 'startingCash' | 'brokerageBalance' | 'rothBalance' | 'iraBalance';
  label: string;
  color: string;
  hint?: string;
}> = [
  { key: 'startingCash', label: 'Cash', color: 'var(--chart-cash)', hint: 'Checking, HYSA, money market' },
  {
    key: 'brokerageBalance',
    label: 'Brokerage',
    color: 'var(--chart-brokerage)',
    hint: 'Taxable investment account',
  },
  { key: 'rothBalance', label: 'Roth IRA', color: 'var(--chart-roth)', hint: 'After-tax retirement' },
  { key: 'iraBalance', label: 'Traditional IRA', color: 'var(--chart-ira)', hint: 'Pre-tax retirement' },
];

export function BalancesEditor({
  input,
  onChange,
  splitterMode = false,
  splitterTotal,
}: BalancesEditorProps) {
  const cutoff = earlyWithdrawalCutoff(input.birthYear);
  const horizon = input.endYear - input.startYear + 1;

  const sum =
    input.startingCash + input.brokerageBalance + input.rothBalance + input.iraBalance;
  const remaining = splitterTotal != null ? splitterTotal - sum : 0;
  const remainingTone = useMemo<'positive' | 'caution' | 'negative'>(() => {
    if (Math.abs(remaining) < 1) return 'positive';
    if (remaining < 0) return 'negative';
    return 'caution';
  }, [remaining]);

  return (
    <>
      {splitterMode && splitterTotal != null && (
        <div
          style={{
            padding: '12px 14px',
            background:
              remainingTone === 'positive'
                ? 'var(--positive-tint)'
                : remainingTone === 'negative'
                  ? 'var(--negative-tint)'
                  : 'var(--caution-soft)',
            border: `1px solid ${
              remainingTone === 'positive'
                ? 'var(--positive)'
                : remainingTone === 'negative'
                  ? 'var(--negative)'
                  : 'var(--caution)'
            }`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--ink-2)' }}>
            Splitting <span className="num-mono">{formatDollars(splitterTotal)}</span>
          </span>
          <span
            className="num-mono"
            style={{
              color:
                remainingTone === 'positive'
                  ? 'var(--positive)'
                  : remainingTone === 'negative'
                    ? 'var(--negative)'
                    : 'var(--caution)',
              fontWeight: 600,
            }}
          >
            {remaining >= 0 ? '+' : ''}
            {formatDollars(remaining)} remaining
          </span>
        </div>
      )}

      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {SWATCHES.map(s => (
          <div
            key={s.key}
            style={{ display: 'grid', gridTemplateColumns: '16px 1fr 200px', gap: 12, alignItems: 'center' }}
          >
            <span
              style={{ width: 10, height: 10, borderRadius: 99, background: s.color, marginLeft: 3 }}
            />
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{s.label}</div>
              {s.hint && (
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{s.hint}</div>
              )}
            </div>
            <MoneyInput
              value={input[s.key]}
              onChange={v => onChange({ [s.key]: v } as Partial<PlanInput>)}
              width="100%"
            />
          </div>
        ))}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '16px 1fr 200px',
            gap: 12,
            alignItems: 'center',
            paddingTop: 8,
            borderTop: '1px dashed var(--border-soft)',
          }}
        >
          <span />
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Brokerage cost basis</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
              What you originally paid. Rest is unrealized gain (LTCG when sold).
            </div>
          </div>
          <MoneyInput
            value={input.brokerageBasis}
            onChange={v => onChange({ brokerageBasis: v })}
            width="100%"
          />
        </div>
      </section>

      {!splitterMode && (
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>Birth year</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
                Penalty-free withdrawals begin {cutoff}
              </div>
            </div>
            <YearInput
              value={input.birthYear}
              onChange={v => onChange({ birthYear: v })}
              min={MIN_YEAR - 100}
              max={MAX_YEAR}
              width="100%"
            />
          </div>
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
      )}
    </>
  );
}
