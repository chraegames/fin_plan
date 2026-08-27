// Shared style entry: fonts + design tokens + element resets. Imported by every
// page entry (FIRE app, hub, each tool, and the CSS-only content pages) so all
// surfaces share one look.
//
// Fonts are self-hosted (no Google Fonts request — the site promises nothing is
// sent to a server): Space Grotesk for display + body, Newsreader (with its
// true italic, used for the accent clause in page h1s) and IBM Plex Mono
// 400/500 for eyebrows, labels, captions and numerics.
import '@fontsource-variable/space-grotesk/index.css';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './tokens.css';
import './base.css';
