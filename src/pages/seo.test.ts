import { describe, it, expect } from 'vitest';
import { renderRootForPath, buildSitemap, normalizePath } from '../../scripts/prerender';
import { CONTENT_ROUTES, FIRE_HOME_PATH, SITE_ORIGIN } from './routeMeta';
import { CATEGORIES, HUB, PAGES, byPath, contentPages, livePages } from '../site/manifest';

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
    expect(html).toContain(HUB.tagline);
    for (const c of CATEGORIES) expect(html).toContain(c.name);
    for (const p of PAGES.filter(p => p.kind === 'app')) expect(html).toContain(p.name);
    expect(html).toContain('Coming soon');
    // live tools are links, "soon" tools are not
    expect(html).toContain(`href="${FIRE_HOME_PATH}"`);
    expect(html).not.toContain('href="/currency-converter/"');
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
    expect(html).not.toContain('href="/currency-converter/"');
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
