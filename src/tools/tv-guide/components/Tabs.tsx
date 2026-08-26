// Accessible tab strip, pure (no hooks). Two modes:
//   • live   — `onSelect` given: a real tablist; only the active panel renders.
//   • static — no `onSelect`: the strip becomes an anchor list and EVERY panel
//              renders stacked with its own heading and id, so the prerendered
//              page carries all the content and works without JavaScript.

import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Plain-text heading used in static mode. */
  heading: string;
  panel: ReactNode;
}

interface TabsProps {
  /** Prefix for element ids — must be unique on the page. */
  id: string;
  label: string;
  tabs: TabItem[];
  active?: string;
  onSelect?: (id: string) => void;
}

function tabButtonId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}

export function Tabs({ id, label, tabs, active, onSelect }: TabsProps) {
  if (!onSelect) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <nav className="tvg-tabs" aria-label={label}>
          {tabs.map(t => (
            <a key={t.id} className="tvg-tab" href={`#${t.id}`}>
              {t.label}
            </a>
          ))}
        </nav>
        {tabs.map(t => (
          <section key={t.id} id={t.id} aria-labelledby={`${t.id}-title`} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3
              id={`${t.id}-title`}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 'clamp(20px, 3.2vw, 26px)',
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {t.heading}
            </h3>
            {t.panel}
          </section>
        ))}
      </div>
    );
  }

  const current = tabs.find(t => t.id === active) ?? tabs[0];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = tabs[next].id;
    onSelect(target);
    // Roving focus without refs: the button exists in the DOM by id.
    document.getElementById(tabButtonId(id, target))?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="tvg-tabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              className="tvg-tab"
              role="tab"
              id={tabButtonId(id, t.id)}
              aria-selected={selected}
              aria-controls={t.id}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(t.id)}
              onKeyDown={e => onKey(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <section
        key={current.id}
        id={current.id}
        role="tabpanel"
        aria-labelledby={tabButtonId(id, current.id)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {current.panel}
      </section>
    </div>
  );
}
