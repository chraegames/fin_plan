import { describe, it, expect } from 'vitest';
import { renderRootForPath, buildSitemap, normalizePath } from '../../scripts/prerender';
import { CONTENT_ROUTES, FIRE_HOME_PATH, SITE_ORIGIN } from './routeMeta';
import { CATEGORIES, HUB, PAGES, byPath, contentPages, livePages, liveTools } from '../site/manifest';
import { ATTRIBUTES, BRANDS, GUIDE_REVIEWED, TECHNOLOGIES } from '../tools/tv-guide/data';
import { GUIDE_PAGES } from '../tools/tv-guide/pages';

describe('normalizePath', () => {
  it('maps dev and build ctx.path forms to manifest paths', () => {
    expect(normalizePath('/index.html')).toBe('/');
    expect(normalizePath('/fire-planner/index.html')).toBe('/fire-planner/');
    expect(normalizePath('fire-planner/how-it-works/index.html')).toBe('fire-planner/how-it-works/');
  });
});

describe('renderRootForPath', () => {
  it('prerenders the hub landing with every category and tool name', () => {
    const html = renderRootForPath('/index.html');
    // the closing clause of the tagline is wrapped in <em>, so compare text-only
    expect(html.replace(/<[^>]+>/g, '')).toContain(HUB.tagline);
    for (const c of CATEGORIES) expect(html).toContain(c.name);
    // header nav anchors to every populated category section + the guides band
    for (const c of CATEGORIES) expect(html).toContain(`href="#${c.id}"`);
    expect(html).toContain('href="#guides"');
    expect(html).toContain('id="guides"');
    // every live tool card carries a two-digit index, 01..N
    for (let i = 1; i <= liveTools().length; i++) expect(html).toContain(`>${String(i).padStart(2, '0')}<`);
    // every live tool is a link; nothing unlinked / "coming soon" is shown
    for (const p of liveTools()) expect(html).toContain(`href="${p.path}"`);
    expect(html).toContain(`href="${FIRE_HOME_PATH}"`);
    expect(html).not.toContain('Coming soon');
    // Guides section + footer nav link every content page and every live tool
    for (const g of contentPages()) expect(html).toContain(`href="${g.path}"`);
    expect(html).toContain('Guides');
    expect(html).toContain('collection of free online tools');
  });

  it('prerenders tool pages with About, FAQ text and links to sibling tools', () => {
    const entry = byPath('/sudoku/')!;
    const html = renderRootForPath('/sudoku/index.html');
    expect(html).toContain('About Sudoku');
    for (const f of entry.about!.faq) expect(html).toContain(f.q);
    expect(html).toContain('href="/calculator/"');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/sudoku/"');
  });

  it('prerenders the bingo caller with its About copy and same-category sibling first', () => {
    const entry = byPath('/bingo/')!;
    const html = renderRootForPath('/bingo/index.html');
    expect(html).toContain('About Bingo caller');
    for (const f of entry.about!.faq) expect(html).toContain(f.q);
    expect(html.indexOf('href="/sudoku/"')).toBeLessThan(html.indexOf('href="/calculator/"'));
    expect(html).not.toContain('href="/bingo/"');
  });

  it('prerenders the FIRE hero + all three "what this is" sections', () => {
    const html = renderRootForPath('/fire-planner/index.html');
    expect(html).toContain('Plan your retirement');
    expect(html).toContain('What you can do');
    expect(html).toContain('How it works');
    expect(html).toContain('Your data');
  });

  it('prerenders each content route with its heading', () => {
    expect(renderRootForPath('/fire-planner/coast-fire-calculator/index.html')).toContain(
      'Coast FIRE calculator',
    );
    expect(renderRootForPath('/fire-planner/4-percent-rule/index.html')).toContain('4% rule');
    expect(renderRootForPath('/fire-planner/retirement-withdrawal-strategy/index.html')).toContain(
      'withdrawal strategy',
    );
    expect(renderRootForPath('/fire-planner/how-it-works/index.html')).toContain(
      'How FIRE Planner works',
    );
  });

  it('content pages cross-link siblings (not themselves) and crumb back to the hub', () => {
    const html = renderRootForPath('/fire-planner/coast-fire-calculator/index.html');
    expect(html).toContain('href="/fire-planner/4-percent-rule/"');
    expect(html).not.toContain('href="/fire-planner/coast-fire-calculator/"');
    expect(html).toContain('href="/"');
    expect(html).toContain(`href="${FIRE_HOME_PATH}"`);
    // every link stays inside the site; none point at the old root-level slugs
    for (const r of CONTENT_ROUTES) expect(html).not.toContain(`href="/${r.slug}/"`);
  });

  it('hub groups guides under their parent app (FIRE and the TV guide)', () => {
    const html = renderRootForPath('/index.html');
    expect(html).toContain('TV buying guide');
    expect(html.indexOf('href="/tv-guide/technologies/"')).toBeGreaterThan(html.indexOf('Guides'));
    expect(html).toContain('href="/fire-planner/how-it-works/"');
  });

  it('prerenders the TV guide overview with the chooser fallback, chapters, changelog and About copy', () => {
    const entry = byPath('/tv-guide/')!;
    const html = renderRootForPath('/tv-guide/index.html');
    expect(html).toContain('Every TV is one of two things');
    expect(html).toContain('Help me choose');
    for (const p of GUIDE_PAGES) expect(html).toContain(`href="${p.path}"`);
    expect(html).toMatch(new RegExp(`<time[^>]*datetime="${GUIDE_REVIEWED}"`, 'i'));
    expect(html).toContain('id="changelog"');
    expect(html).toContain('About TV buying guide');
    for (const f of entry.about!.faq) expect(html).toContain(f.q);
    expect(html).toContain('href="/unit-converter/"');
    expect(html).toContain('@keyframes tvg-');
    expect(html).not.toContain('import.meta');
  });

  it('prerenders every technology (with anchors, diagrams and prose) on the technologies chapter', () => {
    const html = renderRootForPath('/tv-guide/technologies/index.html');
    for (const t of TECHNOLOGIES) {
      expect(html).toContain(`id="tech-${t.id}"`);
      expect(html).toContain(`href="#tech-${t.id}"`);
      expect(html).toContain(t.name);
      for (const pro of t.pros) expect(html).toContain(pro.replace(/'/g, '&#x27;'));
    }
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(TECHNOLOGIES.length);
    expect(html).toContain('href="/tv-guide/"');
    expect(html).toContain('href="/"');
    // the section nav marks the current chapter rather than omitting it
    expect(html).toMatch(/href="\/tv-guide\/technologies\/" aria-current="page"/);
  });

  it('prerenders every brand name with its official link and technology chips', () => {
    const html = renderRootForPath('/tv-guide/brands/index.html');
    for (const b of BRANDS) {
      expect(html).toContain(`id="brand-${b.id}"`);
      expect(html).toContain(`href="${b.officialUrl}"`);
      for (const n of b.names) expect(html).toContain(n.name.replace(/'/g, '&#x27;'));
    }
    expect(html).toContain('rel="noopener nofollow"');
    expect(html).toContain('href="/tv-guide/technologies/#tech-mini-led"');
  });

  it('prerenders the decoder as full two-way tables and the compare page as the full matrix', () => {
    const decoder = renderRootForPath('/tv-guide/decoder/index.html');
    for (const b of BRANDS) for (const n of b.names) expect(decoder).toContain(n.name.replace(/'/g, '&#x27;'));
    expect(decoder).toContain('Every technology and its names');
    expect(decoder).not.toContain('<input');
    const compare = renderRootForPath('/tv-guide/compare/index.html');
    for (const a of ATTRIBUTES) expect(compare).toContain(a.label.replace(/&/g, '&amp;'));
    for (const t of TECHNOLOGIES) expect(compare).toContain(`>${t.shortName}<`);
    expect(compare).toContain('<table');
  });

  it('returns empty string for unknown paths (plugin leaves HTML untouched)', () => {
    expect(renderRootForPath('/does-not-exist/index.html')).toBe('');
  });
});

describe('buildSitemap', () => {
  it('lists every live page as an absolute URL and nothing else', () => {
    const xml = buildSitemap('2026-01-01');
    for (const p of livePages()) expect(xml).toContain(`<loc>${SITE_ORIGIN}${p.path}</loc>`);
    for (const p of PAGES.filter(p => p.status === 'soon')) {
      expect(xml).not.toContain(`<loc>${SITE_ORIGIN}${p.path}</loc>`);
    }
    // per-page `updated` wins over the build date
    expect(xml).toContain('<lastmod>2026-08-21</lastmod>');
    expect(xml).not.toContain('<lastmod>2026-01-01</lastmod>');
    expect(xml).not.toContain('fireplan.chraegames.cloud');
  });
});
