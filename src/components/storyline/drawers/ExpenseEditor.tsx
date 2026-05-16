import { useState } from 'react';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { ListItemCard, Toggle } from './ListItemCard';
import { PeriodList } from './PeriodList';
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
          <ListItemCard
            key={item.id}
            name={item.name}
            badge={item.frequency === 'monthly' ? '/mo' : '/yr'}
            open={open}
            onToggle={() => toggle(item.id)}
            onNameChange={v => update(i, { name: v })}
            onRemove={() => remove(i)}
            removeLabel="Remove expense"
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
            <PeriodList
              periods={item.periods}
              onChange={periods => update(i, { periods })}
              minYear={startYear}
              maxYear={endYear}
              suffix={item.frequency === 'monthly' ? '/mo' : '/yr'}
            />
          </ListItemCard>
        );
      })}

      <Button variant="soft" size="md" onClick={add} leading={<Icon name="plus" />}>
        Add expense
      </Button>
    </>
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
            background: 'var(--surface)',
            transition: 'left 120ms ease',
          }}
        />
      </span>
      {label}
    </button>
  );
}
