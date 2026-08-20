// Build-time prerendering for SEO. Renders each page's pure component to a
// static HTML string so crawlers and no-JS visitors get real content on the
// first byte. Used by the sitePages() plugin in vite.config.ts.
//
// PURE Node context: only imports component trees that are themselves free of
// hooks/CSS imports/browser APIs (see src/site/prerenderPages.tsx), plus
// react-dom/server. Do not import the app shell here.

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PRERENDER_PAGES } from '../src/site/prerenderPages';
import { SITE_ORIGIN, livePages } from '../src/site/manifest';

/** Normalize a transformIndexHtml ctx.path ("/fire-planner/index.html", "/index.html") to a manifest path ("/fire-planner/", "/"). */
export function normalizePath(path: string): string {
  const dir = path.replace(/index\.html$/, '');
  return dir.endsWith('/') ? dir : `${dir}/`;
}

/**
 * Returns the static markup to inject into a page's #root, or '' when the path
 * isn't a known prerender target (the plugin then leaves the HTML untouched).
 */
export function renderRootForPath(path: string): string {
  const key = normalizePath(path);
  const page = PRERENDER_PAGES.find(p => p.entry.path === key);
  if (!page) return '';
  return renderToStaticMarkup(createElement(page.Component));
}

const PRIORITY = { hub: '1.0', app: '0.9', content: '0.8' } as const;

/** Generates a sitemap.xml covering every live page. */
export function buildSitemap(lastmod = new Date().toISOString().slice(0, 10)): string {
  const urls = livePages()
    .map(p =>
      [
        '  <url>',
        `    <loc>${SITE_ORIGIN}${p.path}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '    <changefreq>monthly</changefreq>',
        `    <priority>${PRIORITY[p.kind]}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
