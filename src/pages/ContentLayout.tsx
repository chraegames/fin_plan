// Shared layout + prose primitives for the static SEO content pages.
//
// PURE: no hooks, no browser APIs, inline styles + CSS variables only — so the
// whole tree renders to a static string in the Vite build (Node) context. The
// pages are content-only; they do NOT mount the React app or recharts.

import type { CSSProperties, ReactNode } from 'react';
import { CONTENT_ROUTES, FIRE_HOME_PATH } from './routeMeta';
import { SITE_NAME } from '../site/manifest';

export { H2, P, UL, LI, A } from '../site/Prose';
import { linkStyle } from '../site/proseStyles';

const crumbStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--accent-ink)',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};

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
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="/" style={crumbStyle}>
          {SITE_NAME}
        </a>
        <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>/</span>
        <a href={FIRE_HOME_PATH} style={crumbStyle}>
          FIRE Planner
        </a>
      </nav>

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
          href={FIRE_HOME_PATH}
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
            color: 'var(--accent-contrast)',
            border: '1px solid var(--accent)',
            textDecoration: 'none',
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
