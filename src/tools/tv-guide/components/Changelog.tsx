// Edition history — pure. Anchored so the UpdatedBadge can link to it.

import { CHANGELOG } from '../data';
import { H2, P } from '../../../site/Prose';

export function Changelog() {
  return (
    <section id="changelog" className="tvg-section" aria-labelledby="changelog-title">
      <H2 id="changelog-title">What changed</H2>
      <P>
        This guide is dated on purpose. New panel technologies arrive every year and brand names get reshuffled, so each
        revision is recorded here and the badge at the top of every page shows the last review date.
      </P>
      <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHANGELOG.map(c => (
          <li key={c.date} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 14.5, lineHeight: 1.55 }}>
            <time dateTime={c.date} style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-3)', paddingTop: 2 }}>
              {c.date}
            </time>
            <span style={{ color: 'var(--ink-2)' }}>{c.summary}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
