import { useState } from 'react';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { ListItemCard, Toggle } from './ListItemCard';
import { PeriodList } from './PeriodList';
import type { IncomeItem, IncomeType } from '../../../models/types';
import { generateId } from '../../../engine/defaults';

interface IncomeEditorProps {
  items: IncomeItem[];
  onChange: (items: IncomeItem[]) => void;
  startYear: number;
  endYear: number;
}

export function IncomeEditor({ items, onChange, startYear, endYear }: IncomeEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(items.map(i => i.id)));

  const toggle = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const update = (index: number, updates: Partial<IncomeItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...updates } : it)));

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () => {
    const id = generateId();
    setExpandedIds(prev => new Set(prev).add(id));
    onChange([
      ...items,
      {
        id,
        name: 'New income',
        type: 'taxable',
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
            badge={item.type === 'taxable' ? 'Taxable' : 'Non-taxable'}
            badgeColor={item.type === 'taxable' ? 'var(--caution)' : 'var(--positive)'}
            open={open}
            onToggle={() => toggle(item.id)}
            onNameChange={v => update(i, { name: v })}
            onRemove={() => remove(i)}
            removeLabel="Remove income"
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <Toggle
                label="Taxable"
                active={item.type === 'taxable'}
                onClick={() => update(i, { type: 'taxable' as IncomeType })}
              />
              <Toggle
                label="Non-taxable"
                active={item.type === 'non-taxable'}
                onClick={() => update(i, { type: 'non-taxable' as IncomeType })}
              />
            </div>
            <PeriodList
              periods={item.periods}
              onChange={periods => update(i, { periods })}
              minYear={startYear}
              maxYear={endYear}
              suffix="/yr"
            />
          </ListItemCard>
        );
      })}

      <Button variant="soft" size="md" onClick={add} leading={<Icon name="plus" />}>
        Add income source
      </Button>
    </>
  );
}
