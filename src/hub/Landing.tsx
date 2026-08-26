// The Chrae Lab landing page. PURE: no hooks, no browser APIs — it is rendered
// to a static string at build time and shipped without React. The only
// behaviour on the page (theme toggle) is wired up by src/hub/main.ts.

import type { CSSProperties } from 'react';
import { CATEGORIES, HUB, SITE_NAME, contentPages, liveTools, toolsIn, type SiteEntry } from '../site/manifest';

const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '18px 20px 20px',
  borderRadius: 'var(--radius-xl)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
  color: 'inherit',
  textDecoration: 'none',
  minHeight: 120,
};

function ToolCard({ entry }: { entry: SiteEntry }) {
  return (
    <a href={entry.path} className="hub-card" style={card}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {entry.name}
      </span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-3)' }}>{entry.tagline}</span>
    </a>
  );
}

/** Live content pages grouped under their parent app, in manifest order. */
function guideGroups(): { parent: SiteEntry; pages: SiteEntry[] }[] {
  return liveTools()
    .map(parent => ({ parent, pages: contentPages().filter(g => g.area === parent.slug) }))
    .filter(g => g.pages.length > 0);
}

export function Landing() {
  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: 'var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot)',
        display: 'flex',
        flexDirection: 'column',
        gap: 44,
      }}
    >
      <style>{`
        .hub-card{transition:transform .15s ease,box-shadow .15s ease}
        .hub-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-pop)}
        .hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .hub-sun,.hub-moon{display:block}
        :root[data-theme=dark] .hub-sun{display:none}
        :root:not([data-theme=dark]) .hub-moon{display:none}
      `}</style>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 'clamp(16px, 5vw, 48px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 11,
              color: 'var(--accent-ink)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {SITE_NAME}
          </span>
          <button
            type="button"
            data-theme-toggle
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            style={{
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink-2)',
              cursor: 'pointer',
            }}
          >
            <svg className="hub-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg className="hub-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 'clamp(34px, 7vw, 60px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: 'var(--ink)',
            margin: 0,
            maxWidth: 720,
          }}
        >
          {HUB.tagline}
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', color: 'var(--ink-3)', lineHeight: 1.55, margin: 0, maxWidth: 560 }}>
          Free, private, no accounts — everything stays on your device.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 640 }}>
          {SITE_NAME} is a collection of free online tools: a retirement (FIRE) planner, a unit converter, a
          scientific calculator, a to-do list, Sudoku puzzles, a bingo number caller and a TV buying guide. Each one runs entirely in your browser —
          no sign-up, no ads, and nothing sent to a server.
        </p>
      </header>

      {CATEGORIES.filter(cat => toolsIn(cat.id).length > 0).map(cat => {
        const tools = toolsIn(cat.id);
        return (
          <section key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(22px, 4vw, 28px)',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: 0,
                }}
              >
                {cat.name}
              </h2>
              <p style={{ fontSize: 14.5, color: 'var(--ink-3)', margin: 0 }}>{cat.blurb}</p>
            </div>
            <div className="hub-grid">
              {tools.map(t => (
                <ToolCard key={t.slug} entry={t} />
              ))}
            </div>
          </section>
        );
      })}

      <section aria-labelledby="hub-guides" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2
            id="hub-guides"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: 'clamp(22px, 4vw, 28px)',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Guides
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--ink-3)', margin: 0 }}>
            Short reads that go with the tools — no app needed.
          </p>
        </div>
        {guideGroups().map(({ parent, pages }) => (
          <div key={parent.slug} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
              <a href={parent.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                {parent.name}
              </a>
            </h3>
            <div className="hub-grid">
              {pages.map(g => (
                <a key={g.slug} href={g.path} className="hub-card" style={card}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      letterSpacing: '-0.02em',
                      color: 'var(--ink)',
                    }}
                  >
                    {g.name}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-3)' }}>{g.tagline}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--border-soft)',
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <nav aria-label="All tools">
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 18px',
              fontSize: 13,
            }}
          >
            {liveTools().map(t => (
              <li key={t.slug}>
                <a href={t.path} style={{ color: 'var(--ink-2)' }}>
                  {t.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 18px',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-muted)',
          }}
        >
        <span>{SITE_NAME}</span>
        <span>Educational tools — not financial advice.</span>
        <span>Analytics are cookie-less and self-hosted.</span>
        </div>
      </footer>
    </div>
  );
}
