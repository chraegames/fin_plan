import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  HUB,
  PAGES,
  SITE_ORIGIN,
  absoluteUrl,
  breadcrumbs,
  byPath,
  livePages,
  pathFor,
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
  });
});
