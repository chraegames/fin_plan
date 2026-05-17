import type { ReactNode } from 'react';

interface InputGroupProps {
  label: string;
  children: ReactNode;
}

export function InputGroup({ label, children }: InputGroupProps) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--ink-muted)',
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}
