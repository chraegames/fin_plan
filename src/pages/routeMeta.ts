// Route manifest for the static SEO content pages — the single source of truth
// for paths, titles, and descriptions. Pure data (no React imports) so it can be
// consumed by both ContentLayout (sibling links) and the Vite prerender/sitemap
// plugin without an import cycle.
//
// Adding a content page = add an entry here, a Content component + index.html
// (see src/pages/<slug>/), and an input in vite.config.ts. The sitemap and
// cross-links pick it up automatically.

export const SITE_ORIGIN = 'https://fireplan.chraegames.cloud';

export interface RouteMeta {
  /** URL slug, no slashes, e.g. "coast-fire-calculator". */
  slug: string;
  /** Absolute path with trailing slash, e.g. "/coast-fire-calculator/". */
  path: string;
  /** <title> + H1-ish headline. */
  title: string;
  /** <meta name="description"> — also used as the lede on the page. */
  description: string;
  /** Short label used in cross-page "Related" links. */
  label: string;
}

export const CONTENT_ROUTES: RouteMeta[] = [
  {
    slug: 'coast-fire-calculator',
    path: '/coast-fire-calculator/',
    title: 'Coast FIRE calculator — model your number in your browser',
    description:
      'Work out your Coast FIRE number — the amount that grows into a full retirement nest egg without further contributions — and model it free in your browser.',
    label: 'Coast FIRE calculator',
  },
  {
    slug: '4-percent-rule',
    path: '/4-percent-rule/',
    title: 'The 4% rule and safe withdrawal rates, explained',
    description:
      'What the 4% rule is, where it comes from, and where it breaks down — then model your own safe withdrawal rate year by year in a free browser-based planner.',
    label: '4% rule explained',
  },
  {
    slug: 'retirement-withdrawal-strategy',
    path: '/retirement-withdrawal-strategy/',
    title: 'Tax-efficient retirement withdrawal strategy',
    description:
      'How withdrawal order across brokerage, Roth, and IRA accounts changes the tax you pay — and how an optimizer can pick a tax-efficient drawdown schedule for you.',
    label: 'Withdrawal strategy',
  },
  {
    slug: 'how-it-works',
    path: '/how-it-works/',
    title: 'How FIRE Planner works — methodology and limits',
    description:
      'What FIRE Planner models, the tax assumptions it uses (2026 MFJ, illustrative), and what it deliberately leaves out. An honest look under the hood.',
    label: 'How it works',
  },
];

export const HOME_ROUTE = {
  path: '/',
  title: 'FIRE Planner',
} as const;
