import type { ReactNode } from 'react';
import { Icon } from '../../primitives/Icon';
import { TextInput } from '../../primitives/Input';

interface ListItemCardProps {
  name: string;
  /** Optional small label shown in the collapsed header (e.g. "/mo",
   *  "Taxable"). */
  badge?: string;
  badgeColor?: string;
  open: boolean;
  onToggle: () => void;
  onNameChange: (next: string) => void;
  onRemove: () => void;
  removeLabel?: string;
  /** Body content, rendered only while the card is open. Editors fill
   *  this with their per-type controls (frequency, type toggles…) and
   *  the period list. */
  children?: ReactNode;
}

/**
 * Shared card chrome for Expense / Income / etc. list editors. Owns the
 * expand-collapse header, the editable name field, and the remove
 * button — every list editor renders one per item and supplies the
 * body via children.
 */
export function ListItemCard({
  name,
  badge,
  badgeColor,
  open,
  onToggle,
  onNameChange,
  onRemove,
  removeLabel = 'Remove',
  children,
}: ListItemCardProps) {
  return (
    <article
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
          onClick={onToggle}
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
            value={name}
            onChange={onNameChange}
            style={{ flex: 1, height: 30 }}
          />
        ) : (
          <span
            style={{ flex: 1, cursor: 'pointer', fontSize: 14, color: 'var(--ink)' }}
            onClick={onToggle}
          >
            {name}
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 11,
              color: badgeColor ?? 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 500,
            }}
          >
            {badge}
          </span>
        )}
        <button
          onClick={onRemove}
          aria-label={removeLabel}
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
          {children}
        </div>
      )}
    </article>
  );
}

interface ToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** Small pill toggle used inside list-item bodies for picking among
 *  mutually-exclusive options (frequency, taxable/non-taxable, etc.). */
export function Toggle({ label, active, onClick }: ToggleProps) {
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
