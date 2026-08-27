import { describe, it, expect } from 'vitest';
import { ANTI_FLASH_STYLE, THEME_BOOT_SCRIPT, buildHeadTags } from './head';
import { HUB, SITE_ORIGIN, byPath } from '../src/site/manifest';
import { THEME_KEY } from '../src/utils/persistence';

function find(tags: ReturnType<typeof buildHeadTags>, pred: (t: (typeof tags)[number]) => boolean) {
  return tags.filter(pred);
}

describe('buildHeadTags', () => {
  it('emits canonical + og:url equal to SITE_ORIGIN + path', () => {
    const entry = byPath('/fire-planner/how-it-works/')!;
    const tags = buildHeadTags(entry);
    const canonical = find(tags, t => t.tag === 'link' && t.attrs?.rel === 'canonical')[0];
    expect(canonical.attrs?.href).toBe(`${SITE_ORIGIN}/fire-planner/how-it-works/`);
    const ogUrl = find(tags, t => t.attrs?.property === 'og:url')[0];
    expect(ogUrl.attrs?.content).toBe(`${SITE_ORIGIN}/fire-planner/how-it-works/`);
    expect(find(tags, t => t.tag === 'title')[0].children).toBe(entry.title);
  });

  it('hub has WebSite + Organization + ItemList but no BreadcrumbList; content pages get a three-level trail', () => {
    const hubLd = find(buildHeadTags(HUB), t => t.attrs?.type === 'application/ld+json').map(t =>
      JSON.parse(t.children!),
    );
    expect(hubLd.map(b => b['@type']).sort()).toEqual(['ItemList', 'Organization', 'WebSite']);
    const list = hubLd.find(b => b['@type'] === 'ItemList');
    expect(list.itemListElement.map((i: { name: string }) => i.name)).toContain('Sudoku');
    expect(list.itemListElement[0].url).toBe(`${SITE_ORIGIN}/fire-planner/`);

    const ld = find(
      buildHeadTags(byPath('/fire-planner/how-it-works/')!),
      t => t.attrs?.type === 'application/ld+json',
    );
    expect(ld).toHaveLength(1);
    const crumbs = JSON.parse(ld[0].children!);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Chrae Lab',
      'FIRE Planner',
      'How it works',
    ]);
    expect(crumbs.itemListElement[2].item).toBe(`${SITE_ORIGIN}/fire-planner/how-it-works/`);
  });

  it('FIRE home carries breadcrumb + WebApplication + FAQPage and the verification metas', () => {
    const tags = buildHeadTags(byPath('/fire-planner/')!);
    const types = find(tags, t => t.attrs?.type === 'application/ld+json').map(
      t => JSON.parse(t.children!)['@type'],
    );
    expect(types).toEqual(['BreadcrumbList', 'WebApplication', 'FAQPage']);
    expect(find(tags, t => t.attrs?.name === 'google-site-verification')).toHaveLength(1);
  });

  it('prepends the theme boot script, keyed on the shared THEME_KEY', () => {
    const tags = buildHeadTags(HUB);
    expect(tags[0].injectTo).toBe('head-prepend');
    expect(tags[0].children).toBe(THEME_BOOT_SCRIPT);
    expect(THEME_BOOT_SCRIPT).toContain(`'${THEME_KEY}'`);
    // first-paint backgrounds must equal --bg in tokens.css (light / dark)
    expect(ANTI_FLASH_STYLE).toContain('#FAF9F6');
    expect(ANTI_FLASH_STYLE).toContain('#0F1113');
    expect(tags.some(t => t.tag === 'style' && t.children === ANTI_FLASH_STYLE)).toBe(true);
  });

  it('tool pages derive WebApplication + FAQPage from their About copy', () => {
    const entry = byPath('/sudoku/')!;
    const blocks = find(buildHeadTags(entry), t => t.attrs?.type === 'application/ld+json').map(t =>
      JSON.parse(t.children!),
    );
    expect(blocks.map(b => b['@type'])).toEqual(['BreadcrumbList', 'WebApplication', 'FAQPage']);
    expect(blocks[1].applicationCategory).toBe('GameApplication');
    expect(blocks[1].url).toBe(`${SITE_ORIGIN}/sudoku/`);
    expect(blocks[2].mainEntity.map((q: { name: string }) => q.name)).toEqual(entry.about!.faq.map(f => f.q));
    expect(blocks[2].mainEntity[0].acceptedAnswer.text).toBe(entry.about!.faq[0].a);
  });

  it('TV guide: the parent app derives WebApplication + FAQPage; chapters carry a dated Article', () => {
    const app = buildHeadTags(byPath('/tv-guide/')!);
    expect(find(app, t => t.attrs?.type === 'application/ld+json').map(t => JSON.parse(t.children!)['@type'])).toEqual([
      'BreadcrumbList',
      'WebApplication',
      'FAQPage',
    ]);
    const tech = byPath('/tv-guide/technologies/')!;
    const blocks = find(buildHeadTags(tech), t => t.attrs?.type === 'application/ld+json').map(t => JSON.parse(t.children!));
    expect(blocks.map(b => b['@type'])).toEqual(['BreadcrumbList', 'Article']);
    expect(blocks[0].itemListElement.map((i: { name: string }) => i.name)).toEqual(['Chrae Lab', 'TV buying guide', 'TV technologies explained']);
    expect(blocks[1].dateModified).toBe(tech.updated);
    expect(blocks[1].url).toBe(`${SITE_ORIGIN}/tv-guide/technologies/`);
    expect(find(buildHeadTags(tech), t => t.attrs?.property === 'og:type')[0].attrs?.content).toBe('article');
    const decoder = find(buildHeadTags(byPath('/tv-guide/decoder/')!), t => t.attrs?.type === 'application/ld+json');
    expect(decoder).toHaveLength(1);
  });
});
