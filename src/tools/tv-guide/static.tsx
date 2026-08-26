// Build-time page for each guide URL: GuideShell + the pure view in static
// (expanded, no-handlers) mode. The ONLY guide file prerenderPages.tsx imports —
// everything reachable from here must stay hook-free and browser-API-free.

import { GuideShell } from './components/GuideShell';
import { OverviewView } from './pages/OverviewView';
import { TechnologiesView } from './pages/TechnologiesView';
import { BrandsView } from './pages/BrandsView';
import { DecoderView } from './pages/DecoderView';
import { CompareView } from './pages/CompareView';
import { DEFAULT_COMPARE } from './logic';
import { entryFor, type GuidePageId } from './pages';

export function GuideStaticPage({ page }: { page: GuidePageId }) {
  return (
    <GuideShell page={page} entry={entryFor(page)}>
      {page === 'overview' && <OverviewView />}
      {page === 'technologies' && <TechnologiesView interactive={false} />}
      {page === 'brands' && <BrandsView />}
      {page === 'decoder' && <DecoderView query="" direction="name" techId="mini-led" />}
      {page === 'compare' && <CompareView selected={DEFAULT_COMPARE} />}
    </GuideShell>
  );
}
