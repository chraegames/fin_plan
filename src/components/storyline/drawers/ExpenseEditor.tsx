import { useState } from 'react';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { TextInput } from '../../primitives/Input';
import { PeriodRow } from './PeriodRow';
import type { ExpenseItem, ExpenseFrequency } from '../../../models/types';
import { generateId } from '../../../engine/defaults';

interface ExpenseEditorProps {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
  startYear: number;
  endYear: number;
}

export function ExpenseEditor({ items, onChange, startYear, endYear }: ExpenseEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(items.map(i => i.id)));

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const update = (index: number, updates: Partial<ExpenseItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...updates } : it)));

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  const add = () => {
    const id = generateId();
    setExpandedIds(prev => new Set(prev).add(id));
    onChange([
      ...items,
      {
        id,
        name: 'New expense',
        frequency: 'monthly',
        applyInflation: true,
        periods: [{ startYear, endYear, amount: 0 }],
      },
    ]);
  };

  return (
    <>
      {items.map((item, i) => {
        const open = expandedIds.has(item.id);
        return (
          <article
            key={item.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <header
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: open ? '1px solid var(--border-soft)' : 'none',
              }}
            >
              <button
                onClick={() => toggle(item.id)}
                aria-label={open ? 'Collapse' : 'Expand'}
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-muted)',
                }}
              >
                <Icon name={open ? 'chevron' : 'caret'} size={12} />
              </button>
              {open ? (
                <TextInput
                  value={item.name}
                  onChange={v => update(i, { name: v })}
                  style={{ flex: 1, height: 30 }}
                />
              ) : (
                <span
                  style={{ flex: 1, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}
                  onClick={() => toggle(item.id)}
                >
                  {item.name}
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {item.frequency === 'monthly' ? '/mo' : '/yr'}
              </span>
              <button
                onClick={() => remove(i)}
                aria-label="Remove expense"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  color: 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </header>

            {open && (
              <div
                style={{
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Toggle
                    label="Monthly"
                    active={item.frequency === 'monthly'}
                    onClick={() => update(i, { frequency: 'monthly' as ExpenseFrequency })}
                  />
                  <Toggle
                    label="Annual"
                    active={item.frequency === 'annual'}
                    onClick={() => update(i, { frequency: 'annual' as ExpenseFrequency })}
                  />
                  <PillSwitch
                    on={item.applyInflation !== false}
                    onChange={v => update(i, { applyInflation: v })}
                    label="Apply inflation"
                  />
                </div>

                {item.periods.map((p, pi) => (
                  <PeriodRow
                    key={pi}
                    period={p}
                    onChange={next =>
                      update(i, {
                        periods: item.periods.map((pp, ppi) => (ppi === pi ? next : pp)),
                      })
                    }
                    onRemove={
                      item.periods.length > 1
                        ? () =>
                            update(i, {
                              periods: item.periods.filter((_, ppi) => ppi !== pi),
                            })
                        : undefined
                    }
                    minYear={startYear}
                    maxYear={endYear}
                    suffix={item.frequency === 'monthly' ? '/mo' : '/yr'}
                  />
                ))}

                <button
                  onClick={() => {
                    const last = item.periods[item.periods.length - 1];
                    update(i, {
                      periods: [
                        ...item.periods,
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
                    fontWeight: 500,
                  }}
                >
                  <Icon name="plus" size={12} /> Add period
                </button>
              </div>
            )}
          </article>
        );
      })}

      <Button variant="soft" size="md" onClick={add} leading={<Icon name="plus" />}>
        Add expense
      </Button>
    </>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 26,
        padding: '0 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        background: active ? 'var(--accent-tint)' : 'transparent',
        color: active ? 'var(--accent-ink)' : 'var(--ink-3)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      }}
    >
      {label}
    </button>
  );
}

function PillSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--ink-2)',
        background: 'transparent',
      }}
    >
      <span
        style={{
          width: 28,
          height: 16,
          borderRadius: 99,
          background: on ? 'var(--accent)' : 'var(--surface-3)',
          position: 'relative',
          transition: 'background-color 120ms ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 14 : 2,
            width: 12,
            height: 12,
            borderRadius: 99,
            background: 'oklch(0.995 0.005 80)',
            transition: 'left 120ms ease',
          }}
        />
      </span>
      {label}
    </button>
  );
}
