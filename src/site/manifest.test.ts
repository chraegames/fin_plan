import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  HUB,
  PAGES,
  SITE_ORIGIN,
  absoluteUrl,
  breadcrumbs,
  byPath,
  contentPages,
  livePages,
  liveTools,
  pathFor,
  relatedTools,
  toolsIn,
} from './manifest';

describe('site manifest', () => {
  it('has well-formed, unique paths that agree with their slugs', () => {
    const seen = new Set<string>();
    for (const p of PAGES) {
      expect(p.path.startsWith('/')).toBe(true);
      expect(p.path.endsWith('/')).toBe(true);
      expect(p.path).toBe(p.slug === '' ? '/' : `/${p.slug}/`);
      expect(seen.has(p.path)).toBe(false);
      seen.add(p.path);
    }
  });

  it('has exactly one hub entry, first in the list', () => {
    expect(PAGES.filter(p => p.kind === 'hub')).toHaveLength(1);
    expect(HUB.kind).toBe('hub');
  });

  it('every app has a known category and every content page a known area', () => {
    const categoryIds = new Set(CATEGORIES.map(c => c.id));
    for (const p of PAGES) {
      if (p.kind === 'app') expect(categoryIds.has(p.category!)).toBe(true);
      if (p.kind === 'content') {
        const parent = PAGES.find(q => q.slug === p.area);
        expect(parent?.kind).toBe('app');
        expect(p.label).toBeTruthy();
      }
    }
  });

  it('helpers resolve as expected', () => {
    expect(pathFor('fire-planner')).toBe('/fire-planner/');
    expect(() => pathFor('nope')).toThrow();
    expect(byPath('/fire-planner/how-it-works/')?.area).toBe('fire-planner');
    expect(toolsIn('finance').map(p => p.slug)).toEqual(['fire-planner']);
    expect(livePages().every(p => p.status === 'live')).toBe(true);
    expect(absoluteUrl('/todo/')).toBe(`${SITE_ORIGIN}/todo/`);
  });

  it('breadcrumbs run hub → parent app → page', () => {
    expect(breadcrumbs(HUB).map(p => p.slug)).toEqual(['']);
    expect(breadcrumbs(byPath('/fire-planner/')!).map(p => p.slug)).toEqual(['', 'fire-planner']);
    expect(breadcrumbs(byPath('/fire-planner/how-it-works/')!).map(p => p.slug)).toEqual([
      '',
      'fire-planner',
      'fire-planner/how-it-works',
    ]);
    expect(breadcrumbs(byPath('/tv-guide/decoder/')!).map(p => p.name)).toEqual([
      'Chrae Lab',
      'TV buying guide',
      'TV name decoder',
    ]);
  });

  it('the TV guide is a utilities app whose chapters are content pages beneath it', () => {
    const guide = byPath('/tv-guide/')!;
    expect(guide.kind).toBe('app');
    expect(guide.category).toBe('utilities');
    expect(toolsIn('utilities').map(p => p.slug)).toContain('tv-guide');
    expect(relatedTools(guide).map(p => p.slug)).not.toContain('tv-guide');
    expect(relatedTools(guide)[0]).toBe(byPath('/unit-converter/'));
    for (const c of contentPages().filter(p => p.area === 'tv-guide')) {
      expect(c.path.startsWith('/tv-guide/')).toBe(true);
      expect(c.label).toBeTruthy();
    }
  });

  it('every live non-FIRE tool carries About copy with features + FAQs', () => {
    for (const p of liveTools().filter(p => p.slug !== 'fire-planner')) {
      expect(p.about, p.slug).toBeDefined();
      expect(p.about!.features.length).toBeGreaterThanOrEqual(3);
      expect(p.about!.faq.length).toBeGreaterThanOrEqual(3);
      expect(p.about!.intro.length).toBeGreaterThan(40);
      expect(p.about!.applicationCategory).toMatch(/Application$/);
    }
  });

  it('updated dates are ISO days and every live page has one', () => {
    for (const p of livePages()) expect(p.updated, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('liveTools / contentPages filter by kind and status', () => {
    expect(liveTools().every(p => p.kind === 'app' && p.status === 'live')).toBe(true);
    expect(liveTools().map(p => p.slug)).toContain('sudoku');
    expect(liveTools()).toEqual(PAGES.filter(p => p.kind === 'app'));
    expect(contentPages().every(p => p.kind === 'content')).toBe(true);
    expect(contentPages()).toHaveLength(8);
    expect(contentPages().filter(p => p.area === 'tv-guide').map(p => p.slug)).toEqual([
      'tv-guide/technologies',
      'tv-guide/brands',
      'tv-guide/decoder',
      'tv-guide/compare',
    ]);
    const rel = relatedTools(byPath('/calculator/')!).map(p => p.slug);
    expect(rel[0]).toBe('unit-converter'); // same category first
    expect(rel).not.toContain('calculator');
  });
});
