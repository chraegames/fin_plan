// Maps each manifest path to the PURE component prerendered into its #root at
// build time. Everything imported here must be free of hooks, browser APIs and
// CSS imports — it runs under Node via react-dom/server (scripts/prerender.tsx).
//
// Client-rendered pages (FIRE app, tools) still get a static placeholder so
// crawlers and no-JS visitors see real content; their createRoot().render()
// replaces it on mount — never hydrated.

import type { ComponentType } from 'react';
import { PAGES, type SiteEntry } from './manifest';
import { ToolStatic } from './ToolStatic';
import { Landing } from '../hub/Landing';
import { IntroContent } from '../components/storyline/IntroContent';
import { CoastFireContent } from '../pages/coast-fire-calculator/Content';
import { FourPercentContent } from '../pages/4-percent-rule/Content';
import { WithdrawalStrategyContent } from '../pages/retirement-withdrawal-strategy/Content';
import { HowItWorksContent } from '../pages/how-it-works/Content';

const BY_SLUG: Record<string, ComponentType> = {
  '': Landing,
  'fire-planner': IntroContent,
  'fire-planner/coast-fire-calculator': CoastFireContent,
  'fire-planner/4-percent-rule': FourPercentContent,
  'fire-planner/retirement-withdrawal-strategy': WithdrawalStrategyContent,
  'fire-planner/how-it-works': HowItWorksContent,
};

export interface PrerenderPage {
  entry: SiteEntry;
  Component: ComponentType;
}

export const PRERENDER_PAGES: PrerenderPage[] = PAGES.filter(p => p.status === 'live').map(entry => ({
  entry,
  Component: BY_SLUG[entry.slug] ?? (() => <ToolStatic entry={entry} />),
}));
