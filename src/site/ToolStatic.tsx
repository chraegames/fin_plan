// PURE no-JS fallback prerendered into a tool page's #root. The tool's own
// createRoot().render() replaces it on mount (never hydrated). Gives crawlers
// and no-JS visitors the tool's name + description instead of an empty div.

import { SITE_NAME, type SiteEntry } from './manifest';
import { ToolAbout } from './ToolAbout';
import { accentFor } from './accent';

export function ToolStatic({ entry }: { entry: SiteEntry }) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'clamp(40px, 8vw, 80px) var(--page-pad-x) var(--page-pad-bot)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        ...accentFor(entry.category),
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
        {SITE_NAME}
      </a>
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
        {entry.name}
      </h1>
      <p style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>
        {entry.description}
      </p>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>
        This tool needs JavaScript to run. Nothing is sent to a server — it works entirely in your
        browser.
      </p>
      <ToolAbout entry={entry} />
    </div>
  );
}
