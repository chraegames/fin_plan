// /tv-guide/technologies/ — PURE view. One tab per technology; static mode
// renders every panel stacked with anchors (#tech-<id>).

import { FAMILIES, TECHNOLOGIES, type LayerId, type TechId, type Technology } from '../data';
import { namesForTech } from '../logic';
import { brandHref, techAnchor } from '../pages';
import { Tabs } from '../components/Tabs';
import { LayerStack } from '../components/LayerStack';
import { ZoneGrid } from '../components/ZoneGrid';
import { RgbBacklight } from '../components/RgbBacklight';
import { Callout, ProsCons, RatingsRow, StatusChip } from '../components/Bits';
import { H2, P } from '../../../site/Prose';
import { eyebrow, familyChipClass, h1, lede, small, FAMILY_LABEL } from '../components/ui';

interface TechnologiesViewProps {
  activeTech?: TechId;
  onSelect?: (id: TechId) => void;
  highlight?: LayerId;
  onHighlight?: (id: LayerId | undefined) => void;
  /** Static mode: no interactive highlight. */
  interactive: boolean;
}

function Demo({ t }: { t: Technology }) {
  if (t.demo === 'zones') {
    const few = t.id === 'direct-led';
    return (
      <div className="tvg-cols">
        <ZoneGrid
          idPrefix={`${t.id}-z1`}
          cols={few ? 6 : 10}
          rows={few ? 4 : 6}
          mode="zones"
          title={few ? 'A few dimming zones' : 'Fewer zones'}
          caption="Each zone can only dim as a block, so the backlight spills around the bright object — that glow is blooming."
        />
        <ZoneGrid
          idPrefix={`${t.id}-z2`}
          cols={few ? 10 : 32}
          rows={few ? 6 : 18}
          mode="zones"
          title={few ? 'More zones' : 'Many small zones'}
          caption="Smaller zones follow the picture more tightly. The halo shrinks but never fully disappears on an LCD."
        />
      </div>
    );
  }
  if (t.demo === 'pixels') {
    return (
      <div className="tvg-cols">
        <ZoneGrid idPrefix={`${t.id}-p1`} cols={32} rows={18} mode="zones" title="Mini-LED for comparison" caption="Even a dense backlight lights a patch around the object." />
        <ZoneGrid idPrefix={`${t.id}-p2`} cols={1} rows={1} mode="pixels" title="OLED: per-pixel light" caption="Only the object's own pixels are on. Everything else is switched off — true black, no halo." />
      </div>
    );
  }
  if (t.demo === 'rgb') return <RgbBacklight idPrefix={`${t.id}-rgb`} />;
  return null;
}

function TechPanel({ t, highlight, onHighlight, interactive }: { t: Technology; highlight?: LayerId; onHighlight?: (id: LayerId | undefined) => void; interactive: boolean }) {
  const names = namesForTech(t.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className={familyChipClass(t.family)}>{FAMILY_LABEL[t.family]} family</span>
          <StatusChip techId={t.id} />
          {t.aka.length > 0 && <span style={{ ...small, fontSize: 12.5 }}>Also called: {t.aka.join(', ')}</span>}
        </div>
        <P>{t.summary}</P>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrow}>Inside the panel</div>
        <LayerStack
          layers={t.layers}
          idPrefix={`ls-${t.id}`}
          highlight={highlight}
          onHighlight={onHighlight}
          caption={
            interactive
              ? 'Light travels from the bottom layer to your eyes at the top. Tap a layer to see what it does.'
              : 'Light travels from the bottom layer to your eyes at the top. The colour of the rays changes as each layer does its job.'
          }
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={eyebrow}>How it works</div>
        <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          {t.howItWorks.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      {t.demo !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={eyebrow}>{t.demo === 'rgb' ? 'Why colour at the source matters' : t.demo === 'pixels' ? 'Why there is no halo' : 'Dimming zones and blooming'}</div>
          <Demo t={t} />
        </div>
      )}

      <ProsCons pros={t.pros} cons={t.cons} />

      {t.watchOut && <Callout>{t.watchOut}</Callout>}

      <div className="tvg-cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={eyebrow}>Best for</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            {t.bestFor.map(b => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={eyebrow}>Names to look for</div>
          {names.length === 0 ? (
            <p style={small}>No current brand uses a special name for this — it is usually just "LED TV".</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.5 }}>
              {names.map(({ brand, names: ns }) => (
                <li key={brand.id}>
                  <a href={brandHref(brand.id)} style={{ color: 'var(--accent-ink)', fontWeight: 600, textDecoration: 'none' }}>
                    {brand.name}
                  </a>
                  <span style={{ color: 'var(--ink-2)' }}> — {ns.map(n => n.name).join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrow}>At a glance</div>
        <RatingsRow techId={t.id} />
      </div>
    </div>
  );
}

export function TechnologiesView({ activeTech, onSelect, highlight, onHighlight, interactive }: TechnologiesViewProps) {
  const tabs = TECHNOLOGIES.map(t => ({
    id: techAnchor(t.id),
    heading: t.name,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: t.family === 'oled' ? 'var(--tvg-oled)' : 'var(--tvg-lcd)' }} />
        {t.shortName}
      </span>
    ),
    panel: <TechPanel t={t} highlight={activeTech === t.id ? highlight : undefined} onHighlight={onHighlight} interactive={interactive} />,
  }));
  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={eyebrow}>Chapter 1</div>
        <h1 style={h1}>TV technologies explained</h1>
        <p style={lede}>
          Every panel type sold in the current line-ups, from edge-lit LED to four-stack Tandem OLED. Each one shows where the light comes from, how the colour is made, and
          what that means in a real living room.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {FAMILIES.map(f => (
            <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)' }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: f.id === 'oled' ? 'var(--tvg-oled)' : 'var(--tvg-lcd)' }} />
              {f.name}
            </span>
          ))}
        </div>
      </header>

      <section className="tvg-section" aria-label="Technologies">
        <Tabs id="tech" label="Technology" tabs={tabs} active={activeTech ? techAnchor(activeTech) : undefined} onSelect={onSelect ? id => onSelect(id.replace(/^tech-/, '') as TechId) : undefined} />
      </section>

      <section className="tvg-section" aria-labelledby="not-covered">
        <H2 id="not-covered">Not covered (on purpose)</H2>
        <P>
          <b>Micro-LED</b> — a screen made entirely of microscopic self-emitting LEDs, still a wall-sized luxury product rather than a living-room TV. Not to be confused with
          Micro RGB, which is an LCD. <b>Plasma</b> and <b>CCFL-backlit LCD</b> — no longer made. Names like <b>4K, 8K, HDR, 120 Hz</b> describe resolution, signal and refresh
          rate, not the panel; any of the technologies above can carry them.
        </P>
      </section>
    </>
  );
}
