// The guide's chrome, shared by the prerendered (build-time) and live trees.
// PURE: no hooks, no browser APIs, no CSS imports. The live app passes a
// hooked <ThemeToggle/> through `themeToggle`; the static tree passes nothing.

import type { ReactNode } from 'react';
import { HUB, SITE_NAME, breadcrumbs, relatedTools, type SiteEntry } from '../../../site/manifest';
import { ToolAbout } from '../../../site/ToolAbout';
import { GUIDE_ENTRY, GUIDE_PAGES, type GuidePageId } from '../pages';
import { GUIDE_STYLES } from './styles';
import { crumb } from './ui';
import { UpdatedBadge } from './UpdatedBadge';
import { linkStyle } from '../../../site/proseStyles';
import { accentFor } from '../../../site/accent';

interface GuideShellProps {
  page: GuidePageId;
  entry: SiteEntry;
  children: ReactNode;
  themeToggle?: ReactNode;
  /** Amber header on localhost (mirrors ToolShell). */
  local?: boolean;
}

export function GuideShell({ page, entry, children, themeToggle, local = false }: GuideShellProps) {
  const trail = breadcrumbs(entry);
  const related = relatedTools(GUIDE_ENTRY);
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', ...accentFor(GUIDE_ENTRY.category) }}>
      <style>{GUIDE_STYLES}</style>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 clamp(12px, 3vw, 32px)',
          height: 56,
          background: local ? '#f59e0b' : 'var(--bg)',
          borderBottom: local ? '1px solid #b45309' : '1px solid var(--border-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            const label = c.kind === 'hub' ? SITE_NAME : c.label ?? c.name;
            return (
              <span key={c.slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {i > 0 && <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>/</span>}
                {last ? (
                  <span
                    aria-current="page"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 500,
                      fontSize: 16,
                      letterSpacing: '-0.015em',
                      color: local ? '#1c1917' : 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {label}
                  </span>
                ) : (
                  <a href={c.path} style={{ ...crumb, color: local ? '#1c1917' : 'var(--accent-ink)' }}>
                    {label}
                  </a>
                )}
              </span>
            );
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>{themeToggle}</div>
      </header>

      <div className="tvg-wrap" style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <nav className="tvg-nav" aria-label="TV buying guide sections">
            {GUIDE_PAGES.map(p => (
              <a key={p.id} href={p.path} aria-current={p.id === page ? 'page' : undefined}>
                {p.navLabel}
              </a>
            ))}
          </nav>
          <UpdatedBadge />
        </div>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>{children}</main>

        <div style={{ marginTop: 12 }}>
          {page === 'overview' ? (
            <ToolAbout entry={entry} />
          ) : (
            <nav
              aria-label="More tools"
              style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                More from {HUB.name}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 14 }}>
                <li>
                  <a href={GUIDE_ENTRY.path} style={linkStyle}>
                    {GUIDE_ENTRY.name} overview
                  </a>
                </li>
                {related.map(t => (
                  <li key={t.slug}>
                    <a href={t.path} style={linkStyle}>
                      {t.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={HUB.path} style={linkStyle}>
                    All tools
                  </a>
                </li>
              </ul>
            </nav>
          )}
        </div>

        <footer
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
          <span>Independent and not affiliated with any manufacturer. No models, specifications or prices — only how the technologies work.</span>
        </footer>
      </div>
    </div>
  );
}
