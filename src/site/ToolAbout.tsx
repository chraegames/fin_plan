// Indexable copy for a tool page: About + features, FAQ, and a "More tools"
// nav. PURE (no hooks, no browser APIs, no CSS imports) — rendered both into
// the build-time ToolStatic fallback and below the live tool in ToolShell, so
// crawlers see the same text whether or not they execute JavaScript. The FAQ
// text must match the FAQPage JSON-LD (scripts/head.ts derives both from
// entry.about).

import type { CSSProperties } from 'react';
import { HUB, relatedTools, type SiteEntry } from './manifest';

const h2: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  fontSize: 'clamp(20px, 3.5vw, 24px)',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  color: 'var(--ink)',
  margin: 0,
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
        borderTop: '1px solid var(--border-soft)',
        paddingTop: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {about && (
        <section aria-labelledby="tool-about" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          More from {HUB.name}
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 18px',
            fontSize: 14,
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
