// Shared layout + prose primitives for the static SEO content pages.
//
// PURE: no hooks, no browser APIs, inline styles + CSS variables only — so the
// whole tree renders to a static string in the Vite build (Node) context. The
// pages are content-only; they do NOT mount the React app or recharts.

import type { CSSProperties, ReactNode } from 'react';
import { CONTENT_ROUTES } from './routeMeta';

const proseColor = 'var(--ink-2)';

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
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

const linkStyle: CSSProperties = {
  color: 'var(--accent-ink)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} style={linkStyle}>
      {children}
    </a>
  );
}

interface ContentLayoutProps {
  /** Current page slug, excluded from the "Related" cross-links. */
  slug: string;
  title: ReactNode;
  lede: ReactNode;
  children: ReactNode;
}

export function ContentLayout({ slug, title, lede, children }: ContentLayoutProps) {
  const related = CONTENT_ROUTES.filter(r => r.slug !== slug);
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        paddingTop: 'clamp(40px, 8vw, 80px)',
      }}
    >
      <a
        href="/"
        style={{
          fontSize: 11,
          color: 'var(--accent-ink)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        FIRE Planner
      </a>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 'clamp(30px, 6vw, 52px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 'clamp(15px, 2.4vw, 18px)',
            color: 'var(--ink-3)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {lede}
        </p>
      </header>

      <div>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            height: 42,
            padding: '0 20px',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'oklch(0.995 0.005 80)',
            border: '1px solid var(--accent-2)',
            textDecoration: 'none',
            boxShadow:
              '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 1px 2px oklch(0.20 0.04 260 / 0.18)',
          }}
        >
          Open the planner →
        </a>
      </div>

      <article style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </article>

      <nav
        style={{
          borderTop: '1px solid var(--border-soft)',
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
        aria-label="Related guides"
      >
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Related
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {related.map(r => (
            <li key={r.slug} style={{ margin: 0 }}>
              <a href={r.path} style={linkStyle}>
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--ink-muted)',
          margin: 0,
        }}
      >
        Educational tool — not financial advice.
      </p>
    </div>
  );
}
