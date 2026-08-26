// The guide's page registry: which manifest entries make up the tool and in
// what nav order. Pure — imported by the static and live shells alike.

import { PAGES, pathFor, type SiteEntry } from '../../site/manifest';

export type GuidePageId = 'overview' | 'technologies' | 'brands' | 'decoder' | 'compare';

export interface GuidePage {
  id: GuidePageId;
  slug: string;
  path: string;
  navLabel: string;
}

export const GUIDE_SLUG = 'tv-guide';
export const GUIDE_HOME = pathFor(GUIDE_SLUG);

export const GUIDE_PAGES: GuidePage[] = [
  { id: 'overview', slug: GUIDE_SLUG, path: GUIDE_HOME, navLabel: 'Overview' },
  { id: 'technologies', slug: `${GUIDE_SLUG}/technologies`, path: pathFor(`${GUIDE_SLUG}/technologies`), navLabel: 'Technologies' },
  { id: 'brands', slug: `${GUIDE_SLUG}/brands`, path: pathFor(`${GUIDE_SLUG}/brands`), navLabel: 'Brand names' },
  { id: 'decoder', slug: `${GUIDE_SLUG}/decoder`, path: pathFor(`${GUIDE_SLUG}/decoder`), navLabel: 'Decoder' },
  { id: 'compare', slug: `${GUIDE_SLUG}/compare`, path: pathFor(`${GUIDE_SLUG}/compare`), navLabel: 'Compare' },
];

export function guidePage(id: GuidePageId): GuidePage {
  return GUIDE_PAGES.find(p => p.id === id)!;
}

export function entryFor(id: GuidePageId): SiteEntry {
  const slug = guidePage(id).slug;
  return PAGES.find(p => p.slug === slug)!;
}

export const GUIDE_ENTRY = entryFor('overview');

/** Anchor id used for a technology's section on the Technologies page. */
export function techAnchor(techId: string): string {
  return `tech-${techId}`;
}

export function techHref(techId: string): string {
  return `${guidePage('technologies').path}#${techAnchor(techId)}`;
}

export function brandAnchor(brandId: string): string {
  return `brand-${brandId}`;
}

export function brandHref(brandId: string): string {
  return `${guidePage('brands').path}#${brandAnchor(brandId)}`;
}
