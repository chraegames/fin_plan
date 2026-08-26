// /tv-guide/brands/ — PURE view. One tab per brand; static mode stacks them
// with anchors (#brand-<id>).

import { BRANDS, SPEC_SHEET_TIP } from '../data';
import { brandAnchor, guidePage } from '../pages';
import { Tabs } from '../components/Tabs';
import { BrandCard, Callout } from '../components/Bits';
import { H2, P } from '../../../site/Prose';
import { eyebrow, h1, lede } from '../components/ui';

interface BrandsViewProps {
  activeBrand?: string;
  onSelect?: (id: string) => void;
}

export function BrandsView({ activeBrand, onSelect }: BrandsViewProps) {
  const tabs = BRANDS.map(b => ({
    id: brandAnchor(b.id),
    heading: b.name,
    label: b.name,
    panel: <BrandCard brand={b} />,
  }));
  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={eyebrow}>Chapter 2</div>
        <h1 style={h1}>Brand names decoded</h1>
        <p style={lede}>
          Manufacturers rarely put the technology on the box. They put a name on it — and the same name can mean different things in different years. Here is what each
          brand's names have meant, mapped to the real panel technology.
        </p>
      </header>

      <Callout tone="info">{SPEC_SHEET_TIP}</Callout>

      <section className="tvg-section" aria-label="Brands">
        <Tabs id="brand" label="Brand" tabs={tabs} active={activeBrand ? brandAnchor(activeBrand) : undefined} onSelect={onSelect ? id => onSelect(id.replace(/^brand-/, '')) : undefined} />
      </section>

      <section className="tvg-section" aria-labelledby="same-tech">
        <H2 id="same-tech">Same technology, different names</H2>
        <P>
          The clearest example is the newest one: Samsung's <b>Micro RGB</b>, Sony's <b>True RGB</b>, LG's <b>Micro RGB evo</b> and Hisense's and TCL's <b>RGB Mini-LED</b> are
          all LCDs with a red-green-blue backlight. A step down, Samsung's <b>Neo QLED</b>, LG's <b>QNED evo Mini-LED</b>, TCL's <b>QM series</b>, Hisense's <b>ULED X</b>, Sony's
          <b> Bravia 7 / 9</b> and Roku's <b>Pro</b> are all mini-LED with quantum dots. The{' '}
          <a href={guidePage('decoder').path} style={{ color: 'var(--accent-ink)' }}>
            decoder
          </a>{' '}
          lets you go the other way — pick a technology and see every name for it.
        </P>
      </section>
    </>
  );
}
