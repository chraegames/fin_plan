import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';

interface StepCardProps {
  num: number;
  title: string;
  sub: string;
  done?: boolean;
  cta?: string;
  primary?: boolean;
  onClick?: () => void;
}

export function StepCard({ num, title, sub, done, cta, primary, onClick }: StepCardProps) {
  return (
    <article
      style={{
        background: primary
          ? 'var(--accent-tint)'
          : done
            ? 'var(--positive-tint)'
            : 'var(--surface)',
        border: `1px solid ${
          primary ? 'var(--accent)' : done ? 'var(--positive)' : 'var(--border)'
        }`,
        borderRadius: 14,
        padding: 18,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 99,
            background: done
              ? 'var(--positive)'
              : primary
                ? 'var(--accent)'
                : 'var(--surface-2)',
            color: done ? '#FFFFFF' : primary ? 'var(--accent-contrast)' : 'var(--ink-3)',
            border: done || primary ? 'none' : '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {done ? <Icon name="check" size={11} /> : num}
        </span>
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            flex: 1,
            color: done ? 'var(--ink-2)' : 'var(--ink)',
          }}
        >
          {title}
        </h4>
      </header>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{sub}</p>
      {cta && (
        <Button
          variant={primary ? 'primary' : 'soft'}
          size="md"
          onClick={onClick}
          trailing={<Icon name="arrow" size={12} />}
          style={{ marginTop: 'auto', justifyContent: 'flex-start', alignSelf: 'flex-start' }}
        >
          {cta}
        </Button>
      )}
      {done && !cta && (
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--positive)',
            fontWeight: 500,
            marginTop: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="check" size={12} /> Complete
        </span>
      )}
    </article>
  );
}
