import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderRootForPath, buildSitemap, normalizePath } from './scripts/prerender'
import { buildHeadTags } from './scripts/head'
import { byPath, livePages } from './src/site/manifest'

// Everything page-shaped derives from src/site/manifest.ts:
//   - build inputs: one <path>/index.html per live page
//   - transformIndexHtml: inject <head> tags (title/canonical/OG/JSON-LD) in dev
//     and build, plus the prerendered markup into <div id="root"> at build time
//     (replaced on mount by createRoot — never hydrated)
//   - closeBundle: emit dist/sitemap.xml
function sitePages(): Plugin {
  return {
    name: 'site-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const entry = byPath(normalizePath(ctx.path))
        if (!entry) return html
        const tags = buildHeadTags(entry)
        if (ctx.server) return { html, tags }
        const markup = renderRootForPath(ctx.path)
        if (!markup) return { html, tags }
        const slot = '<div id="root"></div>'
        if (!html.includes(slot)) {
          throw new Error(`${ctx.path}: expected the literal ${slot} for prerender injection`)
        }
        return { html: html.replace(slot, `<div id="root">${markup}</div>`), tags }
      },
    },
    closeBundle() {
      writeFileSync(resolve(__dirname, 'dist/sitemap.xml'), buildSitemap())
    },
  }
}

const input = Object.fromEntries(
  livePages().map(p => [
    p.slug === '' ? 'hub' : p.slug.replace(/\//g, '_'),
    resolve(__dirname, p.path.slice(1), 'index.html'),
  ]),
)

export default defineConfig({
  plugins: [react(), sitePages()],
  build: { rollupOptions: { input } },
})
