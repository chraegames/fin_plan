import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { MoneyInput } from '../../primitives/Input';
import { PeriodRow } from './PeriodRow';
import { EARLY_WITHDRAWAL_PENALTY_RATE } from '../../../engine/constants';
import type { AccountType, WithdrawalSchedule } from '../../../models/types';

interface WithdrawalEditorProps {
  items: WithdrawalSchedule[];
  onChange: (items: WithdrawalSchedule[]) => void;
  targetCash: number;
  onTargetCashChange: (v: number) => void;
  onAutoBalance: (targetCash: number) => void;
  penaltyCutoff: number;
  startYear: number;
  endYear: number;
}

const ACCOUNT_LABELS: Record<AccountType, { label: string; color: string }> = {
  brokerage: { label: 'Brokerage', color: 'var(--chart-brokerage)' },
  roth: { label: 'Roth', color: 'var(--chart-roth)' },
  ira: { label: 'Traditional IRA', color: 'var(--chart-ira)' },
};

export function WithdrawalEditor({
  items,
  onChange,
  targetCash,
  onTargetCashChange,
  onAutoBalance,
  penaltyCutoff,
  startYear,
  endYear,
}: WithdrawalEditorProps) {
  const update = (id: string, updates: Partial<WithdrawalSchedule>) =>
    onChange(items.map(it => (it.id === id ? { ...it, ...updates } : it)));

  return (
    <>
      <article
        style={{
          background: 'var(--accent-tint)',
          border: '1px solid oklch(0.84 0.06 40)',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--accent-ink)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <Icon name="sparkle" size={12} /> Auto-balance
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.4,
          }}
        >
          Replace withdrawals with a tax-efficient schedule that keeps cash near your target.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Target cash</span>
          <MoneyInput value={targetCash} onChange={onTargetCashChange} width={140} />
          <Button
            variant="primary"
            size="md"
            onClick={() => onAutoBalance(targetCash)}
            leading={<Icon name="sparkle" />}
          >
            Re-generate
          </Button>
        </div>
      </article>

      {(['brokerage', 'roth', 'ira'] as AccountType[]).map(acct => {
        const schedule = items.find(w => w.accountType === acct);
        if (!schedule) return null;
        const { label, color } = ACCOUNT_LABELS[acct];
        const showPenaltyNote = acct === 'ira' || acct === 'roth';
        return (
          <article
            key={acct}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-card)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: 99, background: color }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
            </div>
            {showPenaltyNote && (
              <div
                style={{
                  fontSize: 11.5,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--caution-soft)',
                  color: 'oklch(0.45 0.11 70)',
                }}
              >
                {EARLY_WITHDRAWAL_PENALTY_RATE * 100}% early-withdrawal penalty before {penaltyCutoff}
              </div>
            )}
            {schedule.periods.map((p, pi) => (
              <PeriodRow
                key={pi}
                period={p}
                onChange={next =>
                  update(schedule.id, {
                    periods: schedule.periods.map((pp, ppi) => (ppi === pi ? next : pp)),
                  })
                }
                onRemove={
                  schedule.periods.length > 1
                    ? () =>
                        update(schedule.id, {
                          periods: schedule.periods.filter((_, ppi) => ppi !== pi),
                        })
                    : undefined
                }
                minYear={startYear}
                maxYear={endYear}
                suffix="/yr"
              />
            ))}
            <button
              onClick={() => {
                const last = schedule.periods[schedule.periods.length - 1];
                update(schedule.id, {
                  periods: [
                    ...schedule.periods,
                    { startYear: Math.min(last.endYear + 1, endYear), endYear, amount: 0 },
                  ],
                });
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
              }}
            >
              <Icon name="plus" size={12} /> Add period
            </button>
          </article>
        );
      })}
    </>
  );
}
