import { describe, it, expect } from 'vitest';
import { THEME_BOOT_SCRIPT, buildHeadTags } from './head';
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

  it('hub has no BreadcrumbList; content pages get a three-level trail', () => {
    const hubLd = find(buildHeadTags(HUB), t => t.attrs?.type === 'application/ld+json');
    expect(hubLd).toHaveLength(0);

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
  });
});
