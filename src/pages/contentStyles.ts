// CSS-only entry for the static content pages. Each content index.html references
// this module so Vite emits + injects the stylesheet <link> (and bundles the
// fonts) for that page. No React, no app logic — the page content is already in
// #root from the build-time prerender; this just styles it.
import '../styles/global';
