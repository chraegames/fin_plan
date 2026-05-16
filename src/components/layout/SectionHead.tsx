import type { ReactNode } from 'react';

interface SectionHeadProps {
  overline?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}

export function SectionHead({ overline, title, sub, right }: SectionHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 18,
        gap: 16,
      }}
    >
      <div>
        {overline && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {overline}
          </div>
        )}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: '-0.015em',
            color: 'var(--ink)',
          }}
        >
          {title}
        </h2>
        {sub && (
          <div
            style={{
              fontSize: 13.5,
              color: 'var(--ink-3)',
              marginTop: 4,
              maxWidth: 540,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
