// Indexable copy for a tool page: About + features, FAQ, and a "More tools"
// nav. PURE (no hooks, no browser APIs, no CSS imports) — rendered both into
// the build-time ToolStatic fallback and below the live tool in ToolShell, so
// crawlers see the same text whether or not they execute JavaScript. The FAQ
// text must match the FAQPage JSON-LD (scripts/head.ts derives both from
// entry.about).

import type { CSSProperties } from 'react';
import { HUB, relatedTools, type SiteEntry } from './manifest';

// Section-label pattern (mono uppercase + rule), matching the hub / guide headers.
const h2: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontWeight: 500,
  fontSize: 12.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  margin: 0,
  paddingBottom: 12,
  borderBottom: '1px solid var(--border)',
};

const h3: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  fontSize: 15,
  color: 'var(--ink)',
  margin: 0,
};

const p: CSSProperties = { margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)' };

const link: CSSProperties = {
  color: 'var(--accent-ink)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

export function ToolAbout({ entry }: { entry: SiteEntry }) {
  const about = entry.about;
  const related = relatedTools(entry);
  return (
    <div
      style={{
        paddingTop: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {about && (
        <section aria-labelledby="tool-about" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 id="tool-about" style={h2}>
            About {entry.name}
          </h2>
          <p style={p}>{about.intro}</p>
          <ul style={{ ...p, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {about.features.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {about && about.faq.length > 0 && (
        <section aria-labelledby="tool-faq" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 id="tool-faq" style={h2}>
            Frequently asked questions
          </h2>
          {about.faq.map(({ q, a }) => (
            <div key={q} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 style={h3}>{q}</h3>
              <p style={p}>{a}</p>
            </div>
          ))}
        </section>
      )}

      <nav aria-label="More tools" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={h2}>More from {HUB.name}</div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 22px',
            fontSize: 15,
          }}
        >
          {related.map(t => (
            <li key={t.slug}>
              <a href={t.path} style={link}>
                {t.name}
              </a>
            </li>
          ))}
          <li>
            <a href={HUB.path} style={link}>
              All tools
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
