// Build-time prerendering for SEO. Renders the marketing/content components to
// static HTML strings so crawlers and no-JS visitors get real content on the
// first byte. Used by the inline prerender plugin in vite.config.ts.
//
// PURE Node context: only imports component trees that are themselves free of
// hooks/CSS imports/browser APIs (IntroContent + the ContentLayout pages), plus
// react-dom/server (already a dependency). Do not import the app shell here.

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { IntroContent } from '../src/components/storyline/IntroContent';
import { CONTENT_PAGES } from '../src/pages/routes';
import { CONTENT_ROUTES, HOME_ROUTE, SITE_ORIGIN } from '../src/pages/routeMeta';

/** Normalize a transformIndexHtml ctx.path (e.g. "/coast-fire-calculator/index.html") to a route key like "/coast-fire-calculator". "" means home. */
function normalizePath(path: string): string {
  return path.replace(/index\.html$/, '').replace(/\/+$/, '');
}

/**
 * Returns the static markup to inject into a page's #root, or '' when the path
 * isn't a known prerender target (the plugin then leaves the HTML untouched).
 */
export function renderRootForPath(path: string): string {
  const key = normalizePath(path);
  if (key === '') return renderToStaticMarkup(createElement(IntroContent));
  const route = CONTENT_PAGES.find(r => normalizePath(r.path) === key);
  if (!route) return '';
  return renderToStaticMarkup(createElement(route.Component));
}

/** Generates a sitemap.xml covering the home page + every content route. */
export function buildSitemap(lastmod = new Date().toISOString().slice(0, 10)): string {
  const paths = [HOME_ROUTE.path, ...CONTENT_ROUTES.map(r => r.path)];
  const urls = paths
    .map(p => {
      const priority = p === HOME_ROUTE.path ? '1.0' : '0.8';
      return [
        '  <url>',
        `    <loc>${SITE_ORIGIN}${p}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '    <changefreq>monthly</changefreq>',
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
