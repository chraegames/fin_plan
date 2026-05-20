import type { CSSProperties, ReactNode } from 'react';

interface PageProps {
  children: ReactNode;
  maxWidth?: number;
  gap?: number;
  style?: CSSProperties;
}

export function Page({ children, maxWidth = 1280, gap = 56, style }: PageProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: '0 auto',
        padding: 'var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot)',
        display: 'flex',
        flexDirection: 'column',
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
