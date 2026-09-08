// First-city checklist steps, derived from the HUD stats (pure).

import type { HudStats } from '../types';

export interface Step {
  key: string;
  text: string;
  done: boolean;
}

/** First-city checklist; each step ticks itself off from the HUD stats. */
export function onboardingSteps(hud: HudStats): Step[] {
  const t = hud.totals;
  return [
    { key: 'road', text: 'Draw a street that reaches the map edge (Roads → Street)', done: hud.externalConnected },
    { key: 'zoneR', text: 'Zone residential land within 3 tiles of the road', done: t.zonedR >= 6 },
    { key: 'zoneCI', text: 'Zone some commercial and industrial land too', done: t.zonedC >= 3 && t.zonedI >= 3 },
    { key: 'power', text: 'Place a power plant touching the zones or the road', done: t.powerSupply > 0 },
    { key: 'water', text: 'Place a water pump or tower next to a road', done: t.waterSupply > 0 },
    { key: 'grow', text: 'Wait for the first 100 residents', done: t.population >= 100 },
    { key: 'garbage', text: 'Add a landfill on a road before rubbish piles up', done: t.garbageSupply > 0 },
  ];
}

