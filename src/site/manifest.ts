// Site-wide page manifest — the single source of truth for every URL the site
// serves: the hub landing page, each tool ("app"), and each static content page.
//
// Pure data (no React, no browser APIs) so it can be consumed from the Vite
// config / prerender plugin (Node), the pure prerendered components, and the
// client apps alike without import cycles.
//
// Adding a tool = add an entry here (status 'soon' until it ships), create
// <path>/index.html + src/tools/<slug>/main.tsx, and map the path in
// src/site/prerenderPages.tsx. Vite inputs, <head> tags, sitemap, landing-page
// cards and breadcrumbs all derive from this file.

export const SITE_ORIGIN = 'https://chraegames.cloud';
export const SITE_NAME = 'Chrae Lab';

export type CategoryId = 'finance' | 'utilities' | 'productivity' | 'games';

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'finance',
    name: 'Finance',
    blurb: 'Plan long horizons with numbers that stay on your device.',
  },
  {
    id: 'utilities',
    name: 'Utilities',
    blurb: 'Everyday converters and calculators, no ads in the way.',
  },
  {
    id: 'productivity',
    name: 'Productivity',
    blurb: 'Small tools for keeping track of things.',
  },
  {
    id: 'games',
    name: 'Games',
    blurb: 'Quick browser games for a short break.',
  },
];

export type PageKind = 'hub' | 'app' | 'content';
export type PageStatus = 'live' | 'soon';

export interface SiteEntry {
  /** Path-derived id without slashes: '', 'fire-planner', 'fire-planner/how-it-works'. */
  slug: string;
  /** Absolute path with trailing slash: '/', '/fire-planner/', … */
  path: string;
  kind: PageKind;
  status: PageStatus;
  /** Short human name — breadcrumbs, landing cards, tool headers. */
  name: string;
  /** One-line card subtitle. */
  tagline: string;
  /** <title> */
  title: string;
  /** <meta name="description"> */
  description: string;
  /** Apps only: which landing-page section the card belongs to. */
  category?: CategoryId;
  /** Content pages only: slug of the parent app; scopes "Related" links + breadcrumbs. */
  area?: string;
  /** Content pages only: short label for "Related" links. */
  label?: string;
  ogType?: 'website' | 'article';
  /** Extra JSON-LD blocks (BreadcrumbList is generated automatically). */
  jsonLd?: object[];
  /** Search-engine verification metas, by meta name. */
  verification?: Record<string, string>;
}

const FIRE_DESCRIPTION =
  'Free, private, browser-only retirement planner. Model income, expenses, investments, taxes, and withdrawals. No signup — your data stays on your device.';

const SEARCH_VERIFICATION = {
  'google-site-verification': '_YvK_tmQTsoqwLulyMDeviiu-Zo8t3r3k8td2_n4gr4',
  'msvalidate.01': '61A673581896A67618A278792FCC5D0C',
};

export const PAGES: SiteEntry[] = [
  {
    slug: '',
    path: '/',
    kind: 'hub',
    status: 'live',
    name: SITE_NAME,
    tagline: 'Small tools that run in your browser.',
    title: 'Chrae Lab — free tools that run in your browser',
    description:
      'Small, free, private tools that run entirely in your browser: a retirement planner, unit converter, calculator, to-do list and more. No accounts, no tracking.',
    verification: SEARCH_VERIFICATION,
  },
  {
    slug: 'fire-planner',
    path: '/fire-planner/',
    kind: 'app',
    status: 'live',
    category: 'finance',
    name: 'FIRE Planner',
    tagline: 'Model your retirement year by year — income, taxes, withdrawals.',
    title: 'FIRE Planner — Plan your retirement in your browser. Free & private',
    description: FIRE_DESCRIPTION,
    verification: SEARCH_VERIFICATION,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FIRE Planner',
        url: `${SITE_ORIGIN}/fire-planner/`,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: FIRE_DESCRIPTION,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What can I do with FIRE Planner?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Project income, expenses, investment growth, illustrative federal taxes, and withdrawals across a configurable horizon. Compare scenarios side-by-side, record actuals year by year as life happens, and let an optimizer pick a tax-efficient withdrawal schedule.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does FIRE Planner work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: "Everything runs in your browser — the simulation, the optimizer, the charts. There is no server-side computation. Plans persist in your browser's localStorage so they're here when you come back.",
            },
          },
          {
            '@type': 'Question',
            name: 'What happens to my data?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No account, no server, no tracking of personal information. Export and import plans as JSON files you control. Clearing your browser data erases everything — nothing is kept anywhere else.',
            },
          },
        ],
      },
    ],
  },
  {
    slug: 'fire-planner/coast-fire-calculator',
    path: '/fire-planner/coast-fire-calculator/',
    kind: 'content',
    status: 'live',
    area: 'fire-planner',
    name: 'Coast FIRE calculator',
    label: 'Coast FIRE calculator',
    tagline: 'Model your Coast FIRE number.',
    title: 'Coast FIRE calculator — model your number in your browser',
    description:
      'Work out your Coast FIRE number — the amount that grows into a full retirement nest egg without further contributions — and model it free in your browser.',
    ogType: 'article',
  },
  {
    slug: 'fire-planner/4-percent-rule',
    path: '/fire-planner/4-percent-rule/',
    kind: 'content',
    status: 'live',
    area: 'fire-planner',
    name: '4% rule',
    label: '4% rule explained',
    tagline: 'Safe withdrawal rates, explained.',
    title: 'The 4% rule and safe withdrawal rates, explained',
    description:
      'What the 4% rule is, where it comes from, and where it breaks down — then model your own safe withdrawal rate year by year in a free browser-based planner.',
    ogType: 'article',
  },
  {
    slug: 'fire-planner/retirement-withdrawal-strategy',
    path: '/fire-planner/retirement-withdrawal-strategy/',
    kind: 'content',
    status: 'live',
    area: 'fire-planner',
    name: 'Withdrawal strategy',
    label: 'Withdrawal strategy',
    tagline: 'Tax-efficient drawdown order.',
    title: 'Tax-efficient retirement withdrawal strategy',
    description:
      'How withdrawal order across brokerage, Roth, and IRA accounts changes the tax you pay — and how an optimizer can pick a tax-efficient drawdown schedule for you.',
    ogType: 'article',
  },
  {
    slug: 'fire-planner/how-it-works',
    path: '/fire-planner/how-it-works/',
    kind: 'content',
    status: 'live',
    area: 'fire-planner',
    name: 'How it works',
    label: 'How it works',
    tagline: 'Methodology and limits.',
    title: 'How FIRE Planner works — methodology and limits',
    description:
      'What FIRE Planner models, the tax assumptions it uses (2026 MFJ, illustrative), and what it deliberately leaves out. An honest look under the hood.',
    ogType: 'article',
  },
  {
    slug: 'unit-converter',
    path: '/unit-converter/',
    kind: 'app',
    status: 'live',
    category: 'utilities',
    name: 'Unit converter',
    tagline: 'Length, weight, volume, area, speed and temperature.',
    title: 'Unit converter — length, weight, temperature and more',
    description:
      'Convert between metric and imperial units for length, weight, volume, area, speed and temperature. Free, instant, and runs entirely in your browser.',
  },
  {
    slug: 'calculator',
    path: '/calculator/',
    kind: 'app',
    status: 'live',
    category: 'utilities',
    name: 'Calculator',
    tagline: 'Basic and scientific, with keyboard input and history.',
    title: 'Calculator — basic and scientific, in your browser',
    description:
      'A free online calculator with scientific functions, keyboard input and a history of your recent calculations. No ads, no signup.',
  },
  {
    slug: 'currency-converter',
    path: '/currency-converter/',
    kind: 'app',
    status: 'soon',
    category: 'utilities',
    name: 'Currency converter',
    tagline: 'Convert between currencies.',
    title: 'Currency converter',
    description: 'Convert between currencies in your browser.',
  },
  {
    slug: 'world-clock',
    path: '/world-clock/',
    kind: 'app',
    status: 'soon',
    category: 'utilities',
    name: 'World clock',
    tagline: 'Compare times across cities and time zones.',
    title: 'World clock and time zone converter',
    description: 'Compare the current time across cities and time zones in your browser.',
  },
  {
    slug: 'todo',
    path: '/todo/',
    kind: 'app',
    status: 'live',
    category: 'productivity',
    name: 'To-do list',
    tagline: 'Simple lists with due dates, saved on your device.',
    title: 'To-do list — simple, private, saved in your browser',
    description:
      'A free to-do list with multiple lists and due dates. Everything is stored in your browser — no account, no sync, no tracking.',
  },
];

export const HUB = PAGES[0];

export function livePages(): SiteEntry[] {
  return PAGES.filter(p => p.status === 'live');
}

export function toolsIn(category: CategoryId): SiteEntry[] {
  return PAGES.filter(p => p.kind === 'app' && p.category === category);
}

export function byPath(path: string): SiteEntry | undefined {
  return PAGES.find(p => p.path === path);
}

/** Resolves a slug to its path; throws at build/test time on a typo. */
export function pathFor(slug: string): string {
  const entry = PAGES.find(p => p.slug === slug);
  if (!entry) throw new Error(`Unknown page slug: ${slug}`);
  return entry.path;
}

/** Hub → parent app (content pages) → the page itself. */
export function breadcrumbs(entry: SiteEntry): SiteEntry[] {
  const trail: SiteEntry[] = [HUB];
  if (entry.area) {
    const parent = PAGES.find(p => p.slug === entry.area);
    if (parent) trail.push(parent);
  }
  if (entry.kind !== 'hub') trail.push(entry);
  return trail;
}

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}
