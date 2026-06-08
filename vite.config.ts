import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderRootForPath, buildSitemap } from './scripts/prerender'

// Build-time SEO prerender. Two jobs, both build-only:
//   1. transformIndexHtml — inject static marketing/content markup into each
//      page's empty <div id="root"> so crawlers / no-JS visitors get real HTML
//      on the first byte. On the home page App's createRoot render replaces it
//      on mount (no hydrateRoot, so no mismatch); content pages stay static.
//   2. closeBundle — emit dist/sitemap.xml from the route manifest so it never
//      goes stale (replaces the old hand-maintained public/sitemap.xml).
function seoPrerender(): Plugin {
  return {
    name: 'seo-prerender',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const markup = renderRootForPath(ctx.path)
      if (!markup) return html
      return html.replace(
        '<div id="root"></div>',
        `<div id="root">${markup}</div>`,
      )
    },
    closeBundle() {
      writeFileSync(resolve(__dirname, 'dist/sitemap.xml'), buildSitemap())
    },
  }
}

export default defineConfig({
  plugins: [react(), seoPrerender()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        coastFire: resolve(__dirname, 'coast-fire-calculator/index.html'),
        fourPercent: resolve(__dirname, '4-percent-rule/index.html'),
        withdrawalStrategy: resolve(__dirname, 'retirement-withdrawal-strategy/index.html'),
        howItWorks: resolve(__dirname, 'how-it-works/index.html'),
      },
    },
  },
})
