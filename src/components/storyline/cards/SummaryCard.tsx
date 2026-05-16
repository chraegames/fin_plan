import type { ReactNode } from 'react';
import { Icon } from '../../primitives/Icon';

export interface SummaryRow {
  label: string;
  value: string;
  meta?: string;
  color: string;
}

interface SummaryCardProps {
  eyebrow: string;
  title: string;
  sub?: string;
  rows?: SummaryRow[];
  add?: string;
  highlight?: boolean;
  cta?: ReactNode;
  children?: ReactNode;
  onEdit?: () => void;
  onAdd?: () => void;
}

export function SummaryCard({
  eyebrow,
  title,
  sub,
  rows = [],
  add,
  highlight,
  cta,
  children,
  onEdit,
  onAdd,
}: SummaryCardProps) {
  return (
    <article
      style={{
        background: highlight ? 'var(--accent-tint)' : 'var(--surface)',
        border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: 18,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: '-0.015em',
              marginTop: 4,
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
          )}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 9px',
              fontSize: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Icon name="edit" size={12} /> Edit
          </button>
        )}
      </header>

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  background: r.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: 'var(--ink-2)' }}>{r.label}</span>
              {r.meta && (
                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{r.meta}</span>
              )}
              <span
                className="num-mono"
                style={{ color: 'var(--ink)', fontSize: 12 }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {children}

      {add && (
        <button
          onClick={onAdd}
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
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <Icon name="plus" size={12} /> {add}
        </button>
      )}
      {cta && <div style={{ marginTop: 4 }}>{cta}</div>}
    </article>
  );
}
