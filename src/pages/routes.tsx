// Binds each content route's metadata to its React component. Imported by the
// build-time prerender plugin (scripts/prerender.tsx) to render markup per page.
// Kept separate from routeMeta.ts so ContentLayout can read the metadata for
// cross-links without pulling in the page components (avoids an import cycle).

import type { ComponentType } from 'react';
import { CONTENT_ROUTES, type RouteMeta } from './routeMeta';
import { CoastFireContent } from './coast-fire-calculator/Content';
import { FourPercentContent } from './4-percent-rule/Content';
import { WithdrawalStrategyContent } from './retirement-withdrawal-strategy/Content';
import { HowItWorksContent } from './how-it-works/Content';

export interface ContentRoute extends RouteMeta {
  Component: ComponentType;
}

const COMPONENTS: Record<string, ComponentType> = {
  'coast-fire-calculator': CoastFireContent,
  '4-percent-rule': FourPercentContent,
  'retirement-withdrawal-strategy': WithdrawalStrategyContent,
  'how-it-works': HowItWorksContent,
};

export const CONTENT_PAGES: ContentRoute[] = CONTENT_ROUTES.map(meta => ({
  ...meta,
  Component: COMPONENTS[meta.slug],
}));
