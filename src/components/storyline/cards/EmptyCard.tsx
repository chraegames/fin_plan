import { Button } from '../../primitives/Button';
import { Icon, type IconName } from '../../primitives/Icon';

interface EmptyCardProps {
  eyebrow: string;
  title: string;
  description: string;
  examples?: string[];
  icon?: IconName;
  highlight?: boolean;
  locked?: boolean;
  subdued?: boolean;
  ctaLabel?: string;
  onAdd?: () => void;
}

export function EmptyCard({
  eyebrow,
  title,
  description,
  examples = [],
  icon,
  highlight,
  locked,
  subdued,
  ctaLabel,
  onAdd,
}: EmptyCardProps) {
  return (
    <article
      style={{
        background: highlight
          ? 'var(--accent-tint)'
          : subdued
            ? 'var(--surface-2)'
            : 'var(--surface)',
        border: `1px ${highlight ? 'solid' : 'dashed'} ${
          highlight ? 'oklch(0.84 0.06 40)' : 'var(--border-strong)'
        }`,
        borderRadius: 14,
        padding: 18,
        boxShadow: highlight ? 'var(--shadow-card)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: locked ? 0.78 : 1,
        position: 'relative',
      }}
    >
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {locked && (
            <span
              style={{
                fontSize: 9.5,
                padding: '2px 6px',
                background: 'var(--surface-3)',
                color: 'var(--ink-muted)',
                borderRadius: 99,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Waiting on expenses
            </span>
          )}
          {icon && (
            <span
              style={{
                marginLeft: 'auto',
                color: highlight ? 'var(--accent)' : 'var(--ink-muted)',
              }}
            >
              <Icon name={icon} size={14} />
            </span>
          )}
        </div>
        <h3
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            color: 'var(--ink)',
          }}
        >
          {title}
        </h3>
      </header>

      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{description}</p>

      {examples.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {examples.map(e => (
            <span
              key={e}
              style={{
                fontSize: 11,
                color: 'var(--ink-3)',
                padding: '3px 8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      <Button
        variant={highlight ? 'primary' : 'outline'}
        size="md"
        disabled={locked}
        onClick={onAdd}
        leading={<Icon name="plus" />}
        style={{
          marginTop: 'auto',
          justifyContent: 'center',
          height: 36,
          width: '100%',
        }}
      >
        {ctaLabel ?? (highlight ? 'Add your first expense' : `Add ${eyebrow.toLowerCase()}`)}
      </Button>
    </article>
  );
}
