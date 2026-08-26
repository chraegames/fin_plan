// Live (client) root for every guide page. Same GuideShell as the prerender,
// plus the hooked theme toggle and the stateful page wrappers.

import { isLocalHost } from '../../utils/env';
import { GuideShell } from './components/GuideShell';
import { ThemeToggle } from './components/ThemeToggle.client';
import { entryFor, type GuidePageId } from './pages';
import { BrandsLive, CompareLive, DecoderLive, OverviewLive, TechnologiesLive } from './pages/Live';

export default function GuideApp({ page }: { page: GuidePageId }) {
  const local = isLocalHost();
  return (
    <GuideShell page={page} entry={entryFor(page)} themeToggle={<ThemeToggle />} local={local}>
      {page === 'overview' && <OverviewLive />}
      {page === 'technologies' && <TechnologiesLive />}
      {page === 'brands' && <BrandsLive />}
      {page === 'decoder' && <DecoderLive />}
      {page === 'compare' && <CompareLive />}
    </GuideShell>
  );
}
