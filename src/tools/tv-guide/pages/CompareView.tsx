// /tv-guide/compare/ — PURE view. Live: pick up to four technologies. Static:
// the default trio plus the full matrix.

import { ATTRIBUTES, TECHNOLOGIES, TECH_BY_ID, type TechId } from '../data';
import { DEFAULT_COMPARE, MAX_COMPARE } from '../logic';
import { techHref } from '../pages';
import { CompareTable, TechChip } from '../components/Bits';
import { H2, P } from '../../../site/Prose';
import { eyebrow, h1, lede, small } from '../components/ui';

interface CompareViewProps {
  selected: TechId[];
  onToggle?: (id: TechId) => void;
}

export function CompareView({ selected, onToggle }: CompareViewProps) {
  const live = Boolean(onToggle);
  const full = selected.length >= MAX_COMPARE;
  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={eyebrow}>Chapter 4</div>
        <h1 style={h1}>Compare technologies</h1>
        <p style={lede}>
          Relative ratings for a typical example of each technology — not a specific model. Use them to understand the trade-offs, then let reviews of current models settle
          the details.
        </p>
      </header>

      <section className="tvg-section" aria-label="Comparison">
        {live && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              Pick up to {MAX_COMPARE} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({selected.length} selected)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TECHNOLOGIES.map(t => {
                const on = selected.includes(t.id);
                return (
                  <button key={t.id} type="button" className="tvg-pill" aria-pressed={on} disabled={!on && full} onClick={() => onToggle!(t.id)}>
                    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: t.family === 'oled' ? 'var(--tvg-oled)' : 'var(--tvg-lcd)' }} />
                    {t.shortName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {selected.length === 0 ? (
          <p style={small}>Pick at least one technology.</p>
        ) : (
          <CompareTable techIds={selected} />
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13.5 }}>
          {selected.map(id => (
            <a key={id} href={techHref(id)} style={{ color: 'var(--accent-ink)' }}>
              How {TECH_BY_ID[id].shortName} works →
            </a>
          ))}
        </div>
      </section>

      {!live && (
        <section className="tvg-section" aria-labelledby="full-matrix">
          <H2 id="full-matrix">All {TECHNOLOGIES.length} technologies</H2>
          <CompareTable techIds={TECHNOLOGIES.map(t => t.id)} caption="Every technology in this guide, rated 1–5. Scroll sideways for the full table." />
        </section>
      )}

      <section className="tvg-section" aria-labelledby="attributes">
        <H2 id="attributes">What the rows mean</H2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px 24px' }}>
          {ATTRIBUTES.map(a => (
            <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <dt style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 }}>
                {a.label}
                {!a.higherIsBetter && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> · lower is better</span>}
              </dt>
              <dd style={{ ...small, margin: 0 }}>{a.blurb}</dd>
            </div>
          ))}
        </dl>
        <P>
          A rating is a starting point, not a verdict. Within one technology, models differ a lot — a mini-LED with a few hundred zones and one with thousands are both "Mini-LED".
          Compare the technology here, then the model in reviews.
        </P>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
          Default set:
          {DEFAULT_COMPARE.map(id => (
            <TechChip key={id} techId={id} />
          ))}
        </div>
      </section>
    </>
  );
}
