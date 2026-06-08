import { describe, it, expect } from 'vitest';
import { renderRootForPath, buildSitemap } from '../../scripts/prerender';
import { CONTENT_ROUTES, HOME_ROUTE, SITE_ORIGIN } from './routeMeta';

describe('renderRootForPath', () => {
  it('prerenders the home hero + all three "what this is" sections', () => {
    const html = renderRootForPath('/index.html');
    expect(html).toContain('Plan your retirement');
    expect(html).toContain('What you can do');
    expect(html).toContain('How it works');
    expect(html).toContain('Your data');
  });

  it('prerenders each content route with its heading', () => {
    expect(renderRootForPath('/coast-fire-calculator/index.html')).toContain(
      'Coast FIRE calculator',
    );
    expect(renderRootForPath('/4-percent-rule/index.html')).toContain('4% rule');
    expect(renderRootForPath('/retirement-withdrawal-strategy/index.html')).toContain(
      'withdrawal strategy',
    );
    expect(renderRootForPath('/how-it-works/index.html')).toContain(
      'How FIRE Planner works',
    );
  });

  it('cross-links to sibling content pages but not to itself', () => {
    const html = renderRootForPath('/coast-fire-calculator/index.html');
    expect(html).toContain('href="/4-percent-rule/"');
    // current page should not appear in its own "Related" links
    expect(html).not.toContain('href="/coast-fire-calculator/"');
  });

  it('returns empty string for unknown paths (plugin leaves HTML untouched)', () => {
    expect(renderRootForPath('/does-not-exist/index.html')).toBe('');
  });
});

describe('buildSitemap', () => {
  it('includes the home page and every content route as absolute URLs', () => {
    const xml = buildSitemap('2026-01-01');
    expect(xml).toContain(`<loc>${SITE_ORIGIN}${HOME_ROUTE.path}</loc>`);
    for (const route of CONTENT_ROUTES) {
      expect(xml).toContain(`<loc>${SITE_ORIGIN}${route.path}</loc>`);
    }
    expect(xml).toContain('<lastmod>2026-01-01</lastmod>');
  });
});
