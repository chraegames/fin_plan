// /tv-guide/ — PURE view. With `chooser` handlers it renders the interactive
// "help me choose"; without them (prerender / no-JS) it renders the same
// questions as prose plus the rule-of-thumb matrix.

import { FAMILIES, GUIDE_YEAR, TECHNOLOGIES, TECH_BY_ID, type Family, type TechId } from '../data';
import {
  CHOOSER_OPTIONS,
  namesForTech,
  recommend,
  ruleOfThumb,
  techsInFamily,
  type Budget,
  type ChooserAnswers,
  type Room,
  type Use,
} from '../logic';
import { GUIDE_PAGES, brandHref, guidePage, techHref } from '../pages';
import { Changelog } from '../components/Changelog';
import { LayerStack } from '../components/LayerStack';
import { Callout, StatusChip, TechChip } from '../components/Bits';
import { H2, P } from '../../../site/Prose';
import { cardTitle, eyebrow, h1, lede, small } from '../components/ui';

export interface ChooserProps {
  answers: Partial<ChooserAnswers>;
  onAnswer: (patch: Partial<ChooserAnswers>) => void;
}

interface OverviewViewProps {
  chooser?: ChooserProps;
}

const FAMILY_STACK: Record<Family, TechId> = { lcd: 'mini-led', oled: 'w-oled' };

const QUICK_PICKS: { title: string; who: string; techs: TechId[]; note: string }[] = [
  { title: 'Budget & casual', who: 'A spare room, a kitchen, a TV that is rarely the centre of attention.', techs: ['direct-led'], note: 'Any direct-lit LED from a platform brand does the job; skip edge-lit unless it is for a garage.' },
  { title: 'Everyday value', who: 'The main TV for most households.', techs: ['qled'], note: 'A QLED with full-array local dimming is the sweet spot — make sure the spec sheet says local dimming.' },
  { title: 'Bright rooms', who: 'Big windows, daytime sport, an open-plan space.', techs: ['mini-led'], note: 'Mini-LED brightness beats OLED in sunlight, and there is no burn-in to think about.' },
  { title: 'Cinematic & dark rooms', who: 'Film nights, curtains drawn, gaming.', techs: ['w-oled', 'qd-oled'], note: 'Perfect blacks and instant motion. QD-OLED adds colour punch; W-OLED comes in more sizes.' },
  { title: 'Cutting edge', who: 'Enthusiasts who want the newest panel.', techs: ['rgb-mini-led', 'sqd-mini-led', 'tandem-oled'], note: 'All three arrived in the last year or so. Wait for independent reviews before paying flagship money.' },
];

function FamilyCard({ family }: { family: Family }) {
  const f = FAMILIES.find(x => x.id === family)!;
  const techs = techsInFamily(family);
  return (
    <div className="tvg-card" style={{ gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`tvg-chip tvg-chip-${family}`}>{family === 'lcd' ? 'LCD' : 'OLED'}</span>
        <h3 style={cardTitle}>{f.name}</h3>
      </div>
      <LayerStack layers={TECH_BY_ID[FAMILY_STACK[family]].layers} idPrefix={`ov-${family}`} compact />
      <p style={{ ...small, color: 'var(--ink-2)', fontSize: 14.5 }}>{f.blurb}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {techs.map((t, i) => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>→</span>}
            <TechChip techId={t.id} />
          </span>
        ))}
      </div>
      <p style={small}>Older → newer. Every name on a box belongs to one of these.</p>
    </div>
  );
}

function OptionPills<T extends string>({
  name,
  options,
  value,
  onPick,
}: {
  name: string;
  options: { id: T; label: string; hint: string }[];
  value?: T;
  onPick: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <button key={o.id} type="button" className="tvg-pill" role="radio" aria-checked={value === o.id} onClick={() => onPick(o.id)} title={o.hint}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChooserLive({ answers, onAnswer }: ChooserProps) {
  const complete = answers.room && answers.use && answers.budget;
  const rec = complete ? recommend(answers as ChooserAnswers) : null;
  const primary = rec ? TECH_BY_ID[rec.primary] : null;
  return (
    <div className="tvg-cols tvg-cols-wide">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>1. How bright is the room when you watch?</div>
          <OptionPills<Room> name="Room brightness" options={CHOOSER_OPTIONS.room} value={answers.room} onPick={room => onAnswer({ room })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>2. What is on most of the time?</div>
          <OptionPills<Use> name="Main use" options={CHOOSER_OPTIONS.use} value={answers.use} onPick={use => onAnswer({ use })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>3. Budget tier</div>
          <OptionPills<Budget> name="Budget" options={CHOOSER_OPTIONS.budget} value={answers.budget} onPick={budget => onAnswer({ budget })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={Boolean(answers.staticContent)} onChange={e => onAnswer({ staticContent: e.target.checked })} style={{ marginTop: 3 }} />
          <span>Static content stays on screen for hours a day (news tickers, a PC desktop, dashboards)</span>
        </label>
      </div>
      <div className="tvg-card" style={{ gap: 12, minHeight: 200 }} aria-live="polite">
        {!rec || !primary ? (
          <>
            <div style={eyebrow}>Your pick</div>
            <p style={{ ...small, fontSize: 14.5 }}>Answer the three questions and a recommended technology appears here — with the names to look for on the shelf.</p>
          </>
        ) : (
          <>
            <div style={eyebrow}>Your pick</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ ...cardTitle, fontSize: 24 }}>{primary.name}</h3>
              <StatusChip techId={primary.id} />
            </div>
            <p style={{ ...small, fontSize: 14.5, color: 'var(--ink-2)' }}>{primary.summary}</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {rec.reasons.map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {rec.alternatives.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)' }}>
                Also worth a look:
                {rec.alternatives.map(id => (
                  <TechChip key={id} techId={id} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Names to look for</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rec.lookFor.map(({ brand, name }) => (
                  <li key={`${brand.id}-${name.name}`}>
                    <a className="tvg-pill" href={brandHref(brand.id)} style={{ height: 26, fontSize: 12.5 }}>
                      <span style={{ color: 'var(--ink-3)' }}>{brand.name}</span> {name.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <a href={techHref(primary.id)} style={{ fontSize: 13.5, color: 'var(--accent-ink)' }}>
              Read how {primary.shortName} works →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function ChooserStatic() {
  const rows = ruleOfThumb();
  const labelForUse = (u: Use) => CHOOSER_OPTIONS.use.find(o => o.id === u)!.label;
  const roomLabel = (r: Room) => CHOOSER_OPTIONS.room.find(o => o.id === r)!.label;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <P>
        Three questions decide most of it: how bright the room is when you watch ({CHOOSER_OPTIONS.room.map(o => o.label.toLowerCase()).join(', ')}), what is on most of the time (
        {CHOOSER_OPTIONS.use.map(o => o.label.toLowerCase()).join(', ')}) and your budget tier. Turn on JavaScript for the interactive version; the rule of thumb for a mid-range budget is:
      </P>
      <div className="tvg-table-wrap">
        <table className="tvg-table">
          <caption>Recommended technology by room and use, mid-range budget.</caption>
          <thead>
            <tr>
              <th scope="col">Room</th>
              {CHOOSER_OPTIONS.use.map(u => (
                <th key={u.id} scope="col">
                  {u.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHOOSER_OPTIONS.room.map(r => (
              <tr key={r.id}>
                <th scope="row" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {roomLabel(r.id)}
                </th>
                {CHOOSER_OPTIONS.use.map(u => {
                  const row = rows.find(x => x.room === r.id && x.use === u.id)!;
                  return (
                    <td key={u.id}>
                      <TechChip techId={row.tech} />
                      <span className="visually-hidden">
                        {' '}
                        for {labelForUse(u.id)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OverviewView({ chooser }: OverviewViewProps) {
  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={eyebrow}>TV buying guide · {GUIDE_YEAR} edition</div>
        <h1 style={h1}>Every TV is one of two things. The rest is branding.</h1>
        <p style={lede}>
          Neo QLED, QNED, ULED, Bravia, Micro RGB, True RGB, SQD — the names multiply every year, but underneath there are still just two kinds of panel: an LCD with a
          backlight, or an OLED that lights itself. This guide explains each variation with diagrams, decodes what every brand calls it, and helps you pick the kind that suits
          your room. No models, no prices — just how it works.
        </p>
      </header>

      <section className="tvg-section" aria-labelledby="two-families">
        <H2 id="two-families">The two families</H2>
        <div className="tvg-cols">
          <FamilyCard family="lcd" />
          <FamilyCard family="oled" />
        </div>
        <Callout tone="info">
          <b>The one rule that survives all the marketing:</b> QLED, Mini-LED, RGB and "Micro RGB" are all LCDs — they differ in the backlight and colour layer. OLED, QD-OLED and
          Tandem OLED are all OLEDs — they differ in how the pixel makes colour and how bright it gets.{' '}
          <a href={guidePage('technologies').path} style={{ color: 'var(--accent-ink)' }}>
            See every layer →
          </a>
        </Callout>
      </section>

      <section className="tvg-section" aria-labelledby="choose">
        <H2 id="choose">Help me choose</H2>
        {chooser ? <ChooserLive {...chooser} /> : <ChooserStatic />}
      </section>

      <section className="tvg-section" aria-labelledby="quick-picks">
        <H2 id="quick-picks">Quick picks by situation</H2>
        <div className="tvg-cards">
          {QUICK_PICKS.map(q => (
            <div key={q.title} className="tvg-card">
              <h3 style={cardTitle}>{q.title}</h3>
              <p style={small}>{q.who}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.techs.map(id => (
                  <TechChip key={id} techId={id} />
                ))}
              </div>
              <p style={{ ...small, color: 'var(--ink-2)' }}>{q.note}</p>
              <p style={{ ...small, fontSize: 12.5 }}>
                Names to look for:{' '}
                {q.techs
                  .flatMap(id => namesForTech(id))
                  .slice(0, 4)
                  .map(({ brand, names }) => `${brand.name} ${names[0].name}`)
                  .join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="tvg-section" aria-labelledby="chapters">
        <H2 id="chapters">Read the guide</H2>
        <div className="tvg-cards">
          {GUIDE_PAGES.filter(p => p.id !== 'overview').map(p => {
            const blurb: Record<string, string> = {
              technologies: `All ${TECHNOLOGIES.length} panel types, layer by layer, with animated diagrams, strengths, trade-offs and what each is best for.`,
              brands: 'Brand by brand: what each marketing name means and which technology is inside.',
              decoder: 'Type any name and see the real technology — or pick a technology and see what every brand calls it.',
              compare: 'Put up to four technologies side by side on blacks, brightness, colour, angles, burn-in, halo, motion and price tier.',
            };
            return (
              <a key={p.id} href={p.path} className="tvg-card">
                <span style={eyebrow}>Chapter</span>
                <span style={cardTitle}>{p.navLabel}</span>
                <span style={small}>{blurb[p.id]}</span>
              </a>
            );
          })}
        </div>
      </section>

      <Changelog />
    </>
  );
}
