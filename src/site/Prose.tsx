// Prose primitives shared by every prerendered content tree (FIRE guides via
// ContentLayout, the TV guide views). PURE: inline styles + CSS variables,
// no hooks, no browser APIs.

import type { ReactNode } from 'react';
import { linkStyle } from './proseStyles';

const proseColor = 'var(--ink-2)';

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 400,
        fontSize: 'clamp(22px, 4vw, 30px)',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        color: 'var(--ink)',
        margin: '8px 0 0',
      }}
    >
      {children}
    </h2>
  );
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 500,
        fontSize: 'clamp(18px, 3vw, 22px)',
        letterSpacing: '-0.015em',
        lineHeight: 1.25,
        color: 'var(--ink)',
        margin: 0,
      }}
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: proseColor }}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 15.5,
        lineHeight: 1.6,
        color: proseColor,
      }}
    >
      {children}
    </ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return <li style={{ margin: 0 }}>{children}</li>;
}

export function A({ href, children, rel }: { href: string; children: ReactNode; rel?: string }) {
  return (
    <a href={href} style={linkStyle} rel={rel}>
      {children}
    </a>
  );
}
