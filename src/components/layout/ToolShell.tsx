// Shared chrome for every Chrae Lab tool page: sticky header with the hub
// crumb + tool name + theme toggle, a centred content column, and a footer.
// Tools render <ToolShell entry={byPath('/calculator/')!}>…</ToolShell>.

import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { isLocalHost } from '../../utils/env';
import { SITE_NAME, type SiteEntry } from '../../site/manifest';

interface ToolShellProps {
  entry: SiteEntry;
  children: ReactNode;
  /** Extra controls rendered left of the theme toggle. */
  rightSlot?: ReactNode;
  maxWidth?: number;
}

export function ToolShell({ entry, children, rightSlot, maxWidth = 760 }: ToolShellProps) {
  const { theme, toggle } = useTheme();
  const isMobile = useIsMobile();
  const local = isLocalHost();

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(12px, 3vw, 32px)',
          height: 56,
          background: local ? '#f59e0b' : 'var(--bg)',
          borderBottom: local ? '1px solid #b45309' : '1px solid var(--border-soft)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <a
            href="/"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: local ? '#1c1917' : 'var(--accent-ink)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {SITE_NAME}
          </a>
          <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>/</span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 17,
              letterSpacing: '-0.015em',
              color: local ? '#1c1917' : 'var(--ink)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.name}
          </h1>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {rightSlot}
          <Button
            variant="ghost"
            size="md"
            onClick={toggle}
            leading={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            aria-label="Toggle theme"
          />
        </div>
      </header>

      <main
        style={{
          width: '100%',
          maxWidth,
          margin: '0 auto',
          padding: isMobile
            ? '16px var(--page-pad-x) var(--page-pad-bot)'
            : 'var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot)',
          boxSizing: 'border-box',
          flex: 1,
        }}
      >
        {children}
      </main>

      <footer
        style={{
          maxWidth,
          width: '100%',
          margin: '0 auto',
          padding: '0 var(--page-pad-x) 28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 18px',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--ink-muted)',
        }}
      >
        <a href="/" style={{ color: 'inherit' }}>
          ← All {SITE_NAME} tools
        </a>
        <span>Runs entirely in your browser.</span>
      </footer>
    </div>
  );
}
