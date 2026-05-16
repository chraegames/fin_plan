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
        padding: '32px 40px 64px',
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
