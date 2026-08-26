// /tv-guide/decoder/ — PURE view. Live mode: a search box (name → technology)
// and a technology picker (technology → every brand's name). Static mode: the
// complete two-way reference tables.

import { BRANDS, TECHNOLOGIES, TECH_BY_ID, type TechId } from '../data';
import { decode, namesForTech } from '../logic';
import { brandHref, techHref } from '../pages';
import { TechChip } from '../components/Bits';
import { H2, P } from '../../../site/Prose';
import { eyebrow, h1, lede, small } from '../components/ui';

export type DecoderDirection = 'name' | 'tech';

interface DecoderViewProps {
  query: string;
  direction: DecoderDirection;
  techId: TechId;
  onQuery?: (q: string) => void;
  onDirection?: (d: DecoderDirection) => void;
  onTech?: (id: TechId) => void;
}

function NameTable() {
  return (
    <div className="tvg-table-wrap">
      <table className="tvg-table">
        <caption>Every brand name in this guide and the technology behind it.</caption>
        <thead>
          <tr>
            <th scope="col">Brand</th>
            <th scope="col">Name</th>
            <th scope="col">Technology</th>
            <th scope="col" style={{ minWidth: 260 }}>
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {BRANDS.flatMap(b =>
            b.names.map(n => (
              <tr key={`${b.id}-${n.name}`}>
                <th scope="row" style={{ fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  <a href={brandHref(b.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {b.name}
                  </a>
                </th>
                <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{n.name}</td>
                <td>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {n.techIds.map(id => (
                      <TechChip key={id} techId={id} />
                    ))}
                  </span>
                </td>
                <td style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{n.note}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function TechTable({ only }: { only?: TechId }) {
  const list = only ? [TECH_BY_ID[only]] : TECHNOLOGIES;
  return (
    <div className="tvg-table-wrap">
      <table className="tvg-table">
        <caption>{only ? `What each brand calls ${TECH_BY_ID[only].name}.` : 'Every technology and what each brand calls it.'}</caption>
        <thead>
          <tr>
            {!only && <th scope="col">Technology</th>}
            <th scope="col">Brand</th>
            <th scope="col">Their name for it</th>
          </tr>
        </thead>
        <tbody>
          {list.flatMap(t => {
            const rows = namesForTech(t.id);
            if (rows.length === 0)
              return [
                <tr key={t.id}>
                  {!only && (
                    <th scope="row">
                      <TechChip techId={t.id} />
                    </th>
                  )}
                  <td colSpan={2} style={{ color: 'var(--ink-3)' }}>
                    No brand gives this a special name.
                  </td>
                </tr>,
              ];
            return rows.map(({ brand, names }, i) => (
              <tr key={`${t.id}-${brand.id}`}>
                {!only && (
                  <th scope="row" style={{ verticalAlign: 'top' }}>
                    {i === 0 ? <TechChip techId={t.id} /> : <span className="visually-hidden">{t.shortName}</span>}
                  </th>
                )}
                <td style={{ fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  <a href={brandHref(brand.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {brand.name}
                  </a>
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{names.map(n => n.name).join(' · ')}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function Results({ query }: { query: string }) {
  const hits = decode(query);
  if (query.trim().length < 2) return <p style={small}>Try "Neo QLED", "QNED", "Bravia 8", "ULED", "True RGB", "OLED evo" or "Quantum Pro".</p>;
  if (hits.length === 0)
    return (
      <p style={small}>
        Nothing matched "{query}". It may be a model number rather than a series name — look for the series name on the same page, or browse the full list below.
      </p>
    );
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
      {hits.slice(0, 12).map((h, i) => (
        <li key={`${h.kind}-${h.brand?.id ?? 'tech'}-${h.name}-${i}`} className="tvg-card" style={{ boxShadow: 'none', gap: 6 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {h.brand && (
              <a href={brandHref(h.brand.id)} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none' }}>
                {h.brand.name}
              </a>
            )}
            <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>{h.name}</span>
            <span style={{ color: 'var(--ink-muted)' }}>→</span>
            {h.techIds.map(id => (
              <TechChip key={id} techId={id} />
            ))}
          </div>
          <p style={{ ...small, color: 'var(--ink-2)' }}>{h.brandName ? h.brandName.note : TECH_BY_ID[h.techIds[0]].summary}</p>
        </li>
      ))}
    </ul>
  );
}

export function DecoderView({ query, direction, techId, onQuery, onDirection, onTech }: DecoderViewProps) {
  const live = Boolean(onQuery && onDirection && onTech);
  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={eyebrow}>Chapter 3</div>
        <h1 style={h1}>Name decoder</h1>
        <p style={lede}>
          Two ways in: type a name from a box or a website and see what is actually inside, or pick a technology and see what every brand calls it.
        </p>
      </header>

      {live ? (
        <section className="tvg-section" aria-label="Decoder">
          <div role="tablist" aria-label="Direction" className="tvg-tabs" style={{ alignSelf: 'flex-start' }}>
            <button type="button" role="tab" className="tvg-tab" aria-selected={direction === 'name'} onClick={() => onDirection!('name')}>
              Name → technology
            </button>
            <button type="button" role="tab" className="tvg-tab" aria-selected={direction === 'tech'} onClick={() => onDirection!('tech')}>
              Technology → names
            </button>
          </div>
          {direction === 'name' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Brand name</span>
                <input
                  type="search"
                  value={query}
                  onChange={e => onQuery!(e.target.value)}
                  placeholder="e.g. Neo QLED, QNED, Bravia 8 II, ULED X…"
                  autoComplete="off"
                  style={{
                    height: 44,
                    padding: '0 14px',
                    fontSize: 16,
                    fontFamily: 'var(--font-sans)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    maxWidth: 520,
                  }}
                />
              </label>
              <Results query={query} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div role="radiogroup" aria-label="Technology" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TECHNOLOGIES.map(t => (
                  <button key={t.id} type="button" role="radio" className="tvg-pill" aria-checked={techId === t.id} onClick={() => onTech!(t.id)}>
                    {t.shortName}
                  </button>
                ))}
              </div>
              <p style={{ ...small, color: 'var(--ink-2)' }}>
                {TECH_BY_ID[techId].summary}{' '}
                <a href={techHref(techId)} style={{ color: 'var(--accent-ink)' }}>
                  How it works →
                </a>
              </p>
              <TechTable only={techId} />
            </div>
          )}
        </section>
      ) : null}

      <section className="tvg-section" aria-labelledby="all-names">
        <H2 id="all-names">Every name, A to Z by brand</H2>
        <P>The full reference. Names describe series, so within one series a bigger or smaller size can occasionally use a different panel — the spec sheet has the final word.</P>
        <NameTable />
      </section>

      {!live && (
        <section className="tvg-section" aria-labelledby="by-tech">
          <H2 id="by-tech">Every technology and its names</H2>
          <TechTable />
        </section>
      )}
    </>
  );
}
