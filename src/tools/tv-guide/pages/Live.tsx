// Hooked wrappers around the pure views — the only place in the guide that
// owns state. Client-only (never imported by the prerender tree).

import { useEffect, useState } from 'react';
import { track } from '../../../utils/analytics';
import { TECHNOLOGIES, BRANDS, type LayerId, type TechId } from '../data';
import { DEFAULT_COMPARE, MAX_COMPARE, type ChooserAnswers } from '../logic';
import { OverviewView } from './OverviewView';
import { TechnologiesView } from './TechnologiesView';
import { BrandsView } from './BrandsView';
import { DecoderView, type DecoderDirection } from './DecoderView';
import { CompareView } from './CompareView';

function fromHash(prefix: string, valid: string[], fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith(prefix)) {
    const id = h.slice(prefix.length);
    if (valid.includes(id)) return id;
  }
  return fallback;
}

function useHashSync(prefix: string, valid: string[], fallback: string): [string, (id: string) => void] {
  const [active, setActive] = useState(() => fromHash(prefix, valid, fallback));
  useEffect(() => {
    const onHash = () => setActive(fromHash(prefix, valid, fallback));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [prefix, valid, fallback]);
  const select = (id: string) => {
    setActive(id);
    window.history.replaceState(null, '', `#${prefix}${id}`);
  };
  return [active, select];
}

const TECH_IDS = TECHNOLOGIES.map(t => t.id);
const BRAND_IDS = BRANDS.map(b => b.id);

export function OverviewLive() {
  const [answers, setAnswers] = useState<Partial<ChooserAnswers>>({});
  // Functional update so rapid taps never overwrite each other; the analytics
  // ping lives in an effect (an updater must stay pure — StrictMode runs it twice).
  const onAnswer = (patch: Partial<ChooserAnswers>) => setAnswers(prev => ({ ...prev, ...patch }));
  const { room, use, budget } = answers;
  useEffect(() => {
    if (room && use && budget) track('tv_guide_chooser', { room, use, budget });
  }, [room, use, budget]);
  return <OverviewView chooser={{ answers, onAnswer }} />;
}

export function TechnologiesLive() {
  const [active, select] = useHashSync('tech-', TECH_IDS, TECH_IDS[0]);
  const [highlight, setHighlight] = useState<LayerId | undefined>(undefined);
  return (
    <TechnologiesView
      interactive
      activeTech={active as TechId}
      onSelect={id => {
        select(id);
        setHighlight(undefined);
        track('tv_guide_tab', { page: 'technologies', tab: id });
      }}
      highlight={highlight}
      onHighlight={setHighlight}
    />
  );
}

export function BrandsLive() {
  const [active, select] = useHashSync('brand-', BRAND_IDS, BRAND_IDS[0]);
  return (
    <BrandsView
      activeBrand={active}
      onSelect={id => {
        select(id);
        track('tv_guide_tab', { page: 'brands', tab: id });
      }}
    />
  );
}

export function DecoderLive() {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<DecoderDirection>('name');
  const [techId, setTechId] = useState<TechId>('mini-led');
  return (
    <DecoderView
      query={query}
      direction={direction}
      techId={techId}
      onQuery={q => {
        setQuery(q);
        if (q.trim().length === 2) track('tv_guide_decode');
      }}
      onDirection={setDirection}
      onTech={setTechId}
    />
  );
}

export function CompareLive() {
  const [selected, setSelected] = useState<TechId[]>(DEFAULT_COMPARE);
  const onToggle = (id: TechId) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      track('tv_guide_compare', { tech: id });
      return [...prev, id];
    });
  };
  return <CompareView selected={selected} onToggle={onToggle} />;
}
