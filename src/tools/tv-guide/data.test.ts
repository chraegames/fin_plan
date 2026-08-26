import { describe, it, expect } from 'vitest';
import {
  ATTRIBUTES,
  BRANDS,
  CHANGELOG,
  GUIDE_REVIEWED,
  GUIDE_YEAR,
  LAYERS,
  LAYER_BY_ID,
  TECHNOLOGIES,
  TECH_BY_ID,
  type AttributeId,
} from './data';
import { PAGES } from '../../site/manifest';

function allStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk({ LAYERS, TECHNOLOGIES, BRANDS, ATTRIBUTES, CHANGELOG });
  return out;
}

describe('tv-guide data', () => {
  it('has unique technology, layer and brand ids', () => {
    expect(new Set(TECHNOLOGIES.map(t => t.id)).size).toBe(TECHNOLOGIES.length);
    expect(new Set(LAYERS.map(l => l.id)).size).toBe(LAYERS.length);
    expect(new Set(BRANDS.map(b => b.id)).size).toBe(BRANDS.length);
    for (const b of BRANDS) expect(new Set(b.names.map(n => n.name)).size).toBe(b.names.length);
  });

  it('every technology has a complete stack, a light source, and enough copy', () => {
    const attrs = ATTRIBUTES.map(a => a.id);
    for (const t of TECHNOLOGIES) {
      expect(t.layers.length, t.id).toBeGreaterThanOrEqual(4);
      for (const l of t.layers) expect(LAYER_BY_ID[l], `${t.id}: ${l}`).toBeDefined();
      expect(t.layers.some(l => ['backlight', 'emitter'].includes(LAYER_BY_ID[l].tone)), t.id).toBe(true);
      expect(t.layers[t.layers.length - 1]).toMatch(/glass|encapsulation/);
      expect(t.howItWorks.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.pros.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.cons.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.bestFor.length, t.id).toBeGreaterThanOrEqual(1);
      for (const a of attrs as AttributeId[]) {
        expect(t.ratings[a], `${t.id}.${a}`).toBeGreaterThanOrEqual(1);
        expect(t.ratings[a], `${t.id}.${a}`).toBeLessThanOrEqual(5);
      }
      // OLED family: no backlight tones; LCD family: always has a liquid-crystal layer
      if (t.family === 'oled') expect(t.layers.some(l => LAYER_BY_ID[l].tone === 'backlight')).toBe(false);
      else expect(t.layers).toContain('lc-layer');
    }
    expect(TECH_BY_ID['w-oled'].ratings.burnIn).toBeGreaterThan(TECH_BY_ID['mini-led'].ratings.burnIn);
    expect(TECH_BY_ID['mini-led'].ratings.brightness).toBeGreaterThan(TECH_BY_ID['w-oled'].ratings.brightness);
  });

  it('brand names resolve to real technologies and every current technology has at least one brand name', () => {
    const referenced = new Set<string>();
    for (const b of BRANDS) {
      expect(b.officialUrl).toMatch(/^https:\/\/www\.[a-z]+\.com\/$/);
      expect(b.names.length).toBeGreaterThanOrEqual(2);
      for (const n of b.names) {
        expect(n.techIds.length, n.name).toBeGreaterThanOrEqual(1);
        for (const id of n.techIds) {
          expect(TECH_BY_ID[id], `${b.id}: ${n.name} → ${id}`).toBeDefined();
          referenced.add(id);
        }
        expect(n.note.length).toBeGreaterThan(10);
      }
    }
    for (const t of TECHNOLOGIES.filter(t => t.status !== 'legacy')) expect(referenced.has(t.id), t.id).toBe(true);
  });

  it('never mentions prices, screen sizes or brightness figures (no live product data)', () => {
    for (const s of allStrings()) {
      expect(s, s).not.toMatch(/\$\s?\d/);
      expect(s, s).not.toMatch(/\d{2}\s?(["”]|-inch|inch\b|in\b)/);
      expect(s, s).not.toMatch(/\bnits?\b/i);
    }
  });

  it('changelog is ISO-dated newest first and the manifest dates are in lockstep', () => {
    expect(CHANGELOG.length).toBeGreaterThanOrEqual(1);
    for (const c of CHANGELOG) expect(c.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (let i = 1; i < CHANGELOG.length; i++) expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    expect(GUIDE_REVIEWED).toBe(CHANGELOG[0].date);
    expect(GUIDE_YEAR).toBe(Number(GUIDE_REVIEWED.slice(0, 4)));
    const pages = PAGES.filter(p => p.slug === 'tv-guide' || p.slug.startsWith('tv-guide/'));
    expect(pages).toHaveLength(5);
    for (const p of pages) {
      expect(p.updated, p.slug).toBe(GUIDE_REVIEWED);
      for (const block of p.jsonLd ?? []) {
        const b = block as { '@type'?: string; dateModified?: string };
        if (b['@type'] === 'Article') expect(b.dateModified, p.slug).toBe(GUIDE_REVIEWED);
      }
    }
  });
});
